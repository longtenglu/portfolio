#!/usr/bin/env node
// @ts-check
// Makes web copies of the portfolio videos with ffmpeg and writes the media
// manifest the site reads (src/data/media.json).
//
// For every video in videos.mjs it makes:
//   - a full web copy: H.264 + AAC, faststart, loudness normalised to
//     -14 LUFS (within half a LU) with the true peak at or below -1.5 dBTP
//   - an AVIF poster
//   - a short muted hover preview
// plus the muted hero reel that plays between the hands.
//
// Usage:
//   MEDIA_DIR=/path/to/output MEDIA_SOURCES=/path/to/sources.json npm run media:build
//   ... npm run media:build -- --only anniversary-dinner,hero-reel --force
//
// An output is reused only when it exists and its recorded settings still
// match; --force rebuilds it anyway. Jobs run one at a time on purpose: one
// ffmpeg process is enough for a 16 GB machine. Nothing is written into the
// repo except the manifest.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HERO_REEL, LOUDNESS, SIZES, VIDEOS } from "./videos.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const MANIFEST_PATH = path.join(ROOT, "src/data/media.json");

/** @typedef {import("./videos.mjs").VideoJob} VideoJob */
/**
 * @typedef {{ path: string, fingerprint: string | null, bytes: number, sha256: string, url: string | null,
 *   width?: number, height?: number, duration?: number,
 *   loudness?: { integrated: number, truePeak: number } }} MediaFile
 * @typedef {{ orientation: string, full: MediaFile, preview: MediaFile, poster: MediaFile }} VideoEntry
 * @typedef {{ video: MediaFile, poster: MediaFile }} ReelEntry
 * @typedef {{ videos: Record<string, VideoEntry>, reel: ReelEntry | null }} Manifest
 */

function parseArgs() {
  const args = process.argv.slice(2);
  /** @type {Set<string> | null} */
  let only = null;
  let force = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--force") force = true;
    else if (arg === "--only") only = new Set((args[++i] ?? "").split(",").filter(Boolean));
    else if (arg.startsWith("--only=")) only = new Set(arg.slice(7).split(",").filter(Boolean));
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return { only, force };
}

/** @param {string} name */
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set. See README.md, "Media pipeline".`);
    process.exit(1);
  }
  return path.resolve(value);
}

/**
 * Runs a command and returns its stderr. Rejects on a non-zero exit.
 * @param {string} cmd
 * @param {string[]} args
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
      // SVT-AV1 writes its banner straight to stderr unless told otherwise.
      env: { ...process.env, SVT_LOG: "1" },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited with ${code}\n${stderr.slice(-2000)}`));
    });
  });
}

const FFMPEG = ["-hide_banner", "-nostdin", "-y"];

const FULL_ENCODE = { crf: 23, preset: "slow", maxrate: "5M", bufsize: "10M", profile: "high" };
const POSTER_ENCODE = { crf: 34, preset: "4" };
const PREVIEW_CRF = 27;
const REEL_CRF = 25;

/** @param {Record<string, unknown>} settings */
function fingerprint(settings) {
  return createHash("sha256").update(JSON.stringify(settings)).digest("hex").slice(0, 16);
}

/** @param {number} w @param {number} h */
function scaleFilter(w, h) {
  return `scale=w='min(${w},iw)':h='min(${h},ih)':force_original_aspect_ratio=decrease:flags=lanczos,scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1`;
}

/**
 * Measures integrated loudness and true peak of a finished file.
 * @param {string} file
 */
async function verifyLoudness(file) {
  const { stderr } = await run("ffmpeg", [
    ...FFMPEG, "-i", file, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-",
  ]);
  const summary = stderr.slice(stderr.lastIndexOf("Summary:"));
  const integrated = Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1]);
  const truePeak = Number(/True peak:\s+Peak:\s+(-?[\d.]+|-inf) dBFS/.exec(summary)?.[1]);
  if (!Number.isFinite(integrated) || !Number.isFinite(truePeak)) {
    throw new Error(`Could not read loudness of ${file}`);
  }
  return { integrated, truePeak };
}

/** @param {string} file */
async function probe(file) {
  const { stdout } = await run("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height:format=duration", "-of", "json", file,
  ]);
  /** @type {{ streams: { width: number, height: number }[], format: { duration?: string } }} */
  const info = JSON.parse(stdout);
  const duration = info.format.duration ? Math.round(Number(info.format.duration) * 100) / 100 : undefined;
  return { width: info.streams[0].width, height: info.streams[0].height, duration };
}

/** @param {string} file */
function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(file)
      .on("data", (d) => hash.update(d))
      .on("error", reject)
      .on("end", () => resolve(hash.digest("hex")));
  });
}

/**
 * Writes to a temporary name first so an interrupted job never leaves a
 * half-written file that a later run would mistake for a finished one.
 * @param {string} out
 * @param {(tmp: string) => Promise<void>} make
 */
async function produce(out, make) {
  await mkdir(path.dirname(out), { recursive: true });
  const ext = path.extname(out);
  const tmp = `${out.slice(0, -ext.length)}.partial${ext}`;
  await make(tmp);
  await rename(tmp, out);
}

/**
 * The audio chain: a fixed gain to reach the loudness target, then a limiter
 * running at 192 kHz so it catches inter-sample (true) peaks, then back to
 * 48 kHz for AAC.
 * @param {number} gain dB
 * @param {number} ceiling dBFS
 */
function audioChain(gain, ceiling) {
  const limit = Math.pow(10, ceiling / 20).toFixed(4);
  return `aresample=192000,volume=${gain.toFixed(2)}dB,alimiter=limit=${limit}:attack=1:release=60:level=false,aresample=48000`;
}

const AAC = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000"];

/**
 * Finds the gain and limiter ceiling for one source. Masters vary a lot
 * (some are 10 dB too quiet, some already clip), and AAC adds a little
 * overshoot of its own, so this measures real AAC output on a quick
 * audio-only pass and adjusts until both targets hold.
 * @param {string} src
 * @param {string} scratch
 */
async function planAudio(src, scratch) {
  const input = await verifyLoudness(src);
  let gain = LOUDNESS.integrated - input.integrated;
  let ceiling = LOUDNESS.ceiling;
  for (let attempt = 0; attempt < 6; attempt++) {
    await run("ffmpeg", [
      ...FFMPEG, "-loglevel", "error", "-i", src, "-map", "0:a:0", "-vn",
      "-af", audioChain(gain, ceiling), ...AAC, scratch,
    ]);
    const out = await verifyLoudness(scratch);
    const peakOk = out.truePeak <= LOUDNESS.truePeakLimit;
    const levelOk = Math.abs(out.integrated - LOUDNESS.integrated) <= LOUDNESS.tolerance;
    if (peakOk && levelOk) return { chain: audioChain(gain, ceiling), input, output: out };
    if (!peakOk) ceiling -= out.truePeak - LOUDNESS.truePeakLimit + 0.3;
    if (!levelOk) gain += LOUDNESS.integrated - out.integrated;
  }
  throw new Error(`Could not reach ${LOUDNESS.integrated} LUFS under ${LOUDNESS.truePeakLimit} dBTP for ${src}`);
}

/**
 * @param {string} src
 * @param {string} out
 * @param {[number, number]} size
 */
async function encodeFull(src, out, size) {
  await mkdir(path.dirname(out), { recursive: true });
  const scratch = `${out.slice(0, -4)}.audio-check.m4a`;
  const plan = await planAudio(src, scratch);
  await rm(scratch, { force: true });
  console.log(`  source ${plan.input.integrated} LUFS, ${plan.input.truePeak} dBTP`);
  await produce(out, (tmp) =>
    run("ffmpeg", [
      ...FFMPEG, "-loglevel", "error", "-i", src,
      "-map", "0:v:0", "-map", "0:a:0",
      "-vf", scaleFilter(size[0], size[1]),
      "-c:v", "libx264", "-preset", FULL_ENCODE.preset, "-crf", String(FULL_ENCODE.crf),
      "-maxrate", FULL_ENCODE.maxrate, "-bufsize", FULL_ENCODE.bufsize,
      "-profile:v", FULL_ENCODE.profile, "-pix_fmt", "yuv420p", "-force_key_frames", "expr:gte(t,n_forced*2)",
      "-af", plan.chain, ...AAC,
      "-movflags", "+faststart", tmp,
    ]).then(() => undefined),
  );
  const loudness = await verifyLoudness(out);
  if (loudness.truePeak > LOUDNESS.truePeakLimit) {
    throw new Error(`${out} came out at ${loudness.truePeak} dBTP, above ${LOUDNESS.truePeakLimit}`);
  }
  return loudness;
}

/**
 * A muted H.264 excerpt, used for hover previews and the hero reel.
 * @param {string} src
 * @param {string} out
 * @param {[number, number]} size
 * @param {number} start
 * @param {number} duration
 * @param {{ crf: number, fade?: boolean, crop?: string }} opts
 */
async function encodeExcerpt(src, out, size, start, duration, opts) {
  /** @type {string[]} */
  const filters = [];
  if (opts.crop) filters.push(`crop=${opts.crop}`);
  filters.push(scaleFilter(size[0], size[1]));
  if (opts.fade) {
    // Fade in and out of black so the loop seam reads as a cut on the dark page.
    filters.push(`fade=t=in:st=0:d=0.4,fade=t=out:st=${(duration - 0.4).toFixed(2)}:d=0.4`);
  }
  await produce(out, (tmp) =>
    run("ffmpeg", [
      ...FFMPEG, "-loglevel", "error", "-ss", String(start), "-t", String(duration), "-i", src,
      "-map", "0:v:0", "-an", "-vf", filters.join(","),
      "-c:v", "libx264", "-preset", "slow", "-crf", String(opts.crf),
      "-profile:v", "high", "-pix_fmt", "yuv420p", "-force_key_frames", "expr:gte(t,n_forced*2)",
      "-movflags", "+faststart", tmp,
    ]).then(() => undefined),
  );
}

/**
 * @param {string} src
 * @param {string} out
 * @param {[number, number]} size
 * @param {number} at
 * @param {string} [crop]
 */
async function encodePoster(src, out, size, at, crop) {
  const filters = crop ? `crop=${crop},` : "";
  await produce(out, (tmp) =>
    run("ffmpeg", [
      ...FFMPEG, "-loglevel", "error", "-ss", String(at), "-i", src, "-frames:v", "1",
      "-vf", `${filters}${scaleFilter(size[0], size[1])},format=yuv420p`,
      "-c:v", "libsvtav1", "-crf", String(POSTER_ENCODE.crf), "-preset", POSTER_ENCODE.preset, "-f", "avif", tmp,
    ]).then(() => undefined),
  );
}

/**
 * @param {string} mediaDir
 * @param {string} rel
 * @param {MediaFile | undefined} previous
 * @param {Partial<MediaFile> & { rebuilt?: boolean }} extra
 * @returns {Promise<MediaFile>}
 */
async function describe(mediaDir, rel, previous, extra = {}) {
  const abs = path.join(mediaDir, rel);
  const hashPromise = extra.sha256 ? Promise.resolve(extra.sha256) : sha256(abs);
  const [info, hash, st] = await Promise.all([probe(abs), hashPromise, stat(abs)]);
  const sameHash = previous?.sha256 === hash;
  const sameBytes = sameHash && previous?.bytes === st.size;
  const fingerprint = extra.rebuilt === true
    ? (extra.fingerprint ?? null)
    : sameBytes ? (previous?.fingerprint ?? null) : null;
  const loudness = extra.loudness ?? (sameHash ? previous?.loudness : undefined);
  // Fixed key order keeps manifest diffs readable between runs.
  return {
    path: rel,
    fingerprint,
    bytes: st.size,
    sha256: hash,
    width: info.width,
    height: info.height,
    ...(rel.endsWith(".mp4") && info.duration ? { duration: info.duration } : {}),
    ...(loudness ? { loudness } : {}),
    // Keep a hosted URL only while it still points at the same bytes.
    url: sameHash ? (previous?.url ?? null) : null,
  };
}

async function main() {
  const { only, force } = parseArgs();
  const mediaDir = requireEnv("MEDIA_DIR");
  const sourcesPath = requireEnv("MEDIA_SOURCES");
  /** @type {Record<string, string>} */
  const sources = JSON.parse(await readFile(sourcesPath, "utf8"));

  /** @type {Manifest} */
  const previous = existsSync(MANIFEST_PATH)
    ? JSON.parse(await readFile(MANIFEST_PATH, "utf8"))
    : { videos: {}, reel: null };

  /** @param {string} id */
  const sourceFor = (id) => {
    const src = sources[id];
    if (!src) throw new Error(`No source path for "${id}" in ${sourcesPath}`);
    if (!existsSync(src)) throw new Error(`Source for "${id}" not found: ${src}`);
    return src;
  };
  /** @param {string} id */
  const selected = (id) => !only || only.has(id);
  /** @type {Set<string>} */
  const rebuilt = new Set();
  /** @type {Map<string, string>} */
  const verifiedHashes = new Map();
  /**
   * @param {string} rel
   * @param {MediaFile | undefined} prevFile
   * @param {string} fp
   */
  const current = async (rel, prevFile, fp) => {
    if (!prevFile || prevFile.fingerprint !== fp) return false;
    const abs = path.join(mediaDir, rel);
    if (!existsSync(abs)) return false;
    const st = await stat(abs);
    if (st.size !== prevFile.bytes) return false;
    const hash = await sha256(abs);
    if (hash !== prevFile.sha256) return false;
    verifiedHashes.set(rel, hash);
    return true;
  };
  /**
   * @param {string} rel
   * @param {MediaFile | undefined} prevFile
   * @param {string} fp
   * @param {Partial<MediaFile>} [extra]
   */
  const describeOutput = (rel, prevFile, fp, extra = {}) =>
    describe(mediaDir, rel, prevFile, {
      fingerprint: fp,
      rebuilt: rebuilt.has(rel),
      ...(verifiedHashes.has(rel) ? { sha256: verifiedHashes.get(rel) } : {}),
      ...extra,
    });

  /** @type {Manifest} */
  const manifest = { videos: {}, reel: null };

  for (const job of VIDEOS) {
    const size = SIZES[job.orientation];
    const prev = previous.videos[job.id];
    const rel = {
      full: `${job.id}/${job.id}.mp4`,
      preview: `${job.id}/${job.id}-preview.mp4`,
      poster: `${job.id}/${job.id}-poster.avif`,
    };
    const fp = {
      full: fingerprint({ kind: "full", source: job.id, size: size.full, ...FULL_ENCODE, loudness: LOUDNESS }),
      preview: fingerprint({ kind: "preview", source: job.id, start: job.preview.start, duration: job.preview.duration, crop: job.crop ?? null, size: size.preview, crf: PREVIEW_CRF }),
      poster: fingerprint({ kind: "poster", source: job.id, at: job.poster, crop: job.crop ?? null, size: size.poster, ...POSTER_ENCODE }),
    };
    /** @type {{ integrated: number, truePeak: number } | undefined} */
    let loudness;
    if (selected(job.id)) {
      const src = sourceFor(job.id);
      if (force || !(await current(rel.full, prev?.full, fp.full))) {
        console.log(`${job.id}: full copy`);
        loudness = await encodeFull(src, path.join(mediaDir, rel.full), /** @type {[number, number]} */ (size.full));
        rebuilt.add(rel.full);
        console.log(`  ${loudness.integrated} LUFS, ${loudness.truePeak} dBTP`);
      }
      if (force || !(await current(rel.poster, prev?.poster, fp.poster))) {
        console.log(`${job.id}: poster`);
        await encodePoster(src, path.join(mediaDir, rel.poster), /** @type {[number, number]} */ (size.poster), job.poster, job.crop);
        rebuilt.add(rel.poster);
      }
      if (force || !(await current(rel.preview, prev?.preview, fp.preview))) {
        console.log(`${job.id}: hover preview`);
        await encodeExcerpt(src, path.join(mediaDir, rel.preview), /** @type {[number, number]} */ (size.preview),
          job.preview.start, job.preview.duration, { crf: PREVIEW_CRF, crop: job.crop });
        rebuilt.add(rel.preview);
      }
    }
    if (!existsSync(path.join(mediaDir, rel.full))) continue;
    const full = await describeOutput(rel.full, prev?.full, fp.full, loudness ? { loudness } : {});
    if (!full.loudness) full.loudness = await verifyLoudness(path.join(mediaDir, rel.full));
    manifest.videos[job.id] = {
      orientation: job.orientation,
      full,
      preview: await describeOutput(rel.preview, prev?.preview, fp.preview),
      poster: await describeOutput(rel.poster, prev?.poster, fp.poster),
    };
  }

  const reelRel = { video: `${HERO_REEL.id}/${HERO_REEL.id}.mp4`, poster: `${HERO_REEL.id}/${HERO_REEL.id}-poster.avif` };
  const reelSize = SIZES.landscape;
  const reelPosterAt = HERO_REEL.poster ?? HERO_REEL.start + 4.5;
  const reelFp = {
    video: fingerprint({ kind: "reel", source: HERO_REEL.source, start: HERO_REEL.start, duration: HERO_REEL.end - HERO_REEL.start, crop: HERO_REEL.crop ?? null, size: reelSize.reel, crf: REEL_CRF, fade: true }),
    poster: fingerprint({ kind: "poster", source: HERO_REEL.source, at: reelPosterAt, crop: HERO_REEL.crop ?? null, size: reelSize.reel, ...POSTER_ENCODE }),
  };
  if (selected(HERO_REEL.id)) {
    const src = sourceFor(HERO_REEL.source);
    if (force || !(await current(reelRel.video, previous.reel?.video, reelFp.video))) {
      console.log(`${HERO_REEL.id}: loop`);
      await encodeExcerpt(src, path.join(mediaDir, reelRel.video), /** @type {[number, number]} */ (reelSize.reel),
        HERO_REEL.start, HERO_REEL.end - HERO_REEL.start, { crf: REEL_CRF, fade: true, crop: HERO_REEL.crop });
      rebuilt.add(reelRel.video);
    }
    if (force || !(await current(reelRel.poster, previous.reel?.poster, reelFp.poster))) {
      console.log(`${HERO_REEL.id}: poster`);
      await encodePoster(src, path.join(mediaDir, reelRel.poster), /** @type {[number, number]} */ (reelSize.reel), reelPosterAt, HERO_REEL.crop);
      rebuilt.add(reelRel.poster);
    }
  }
  if (existsSync(path.join(mediaDir, reelRel.video))) {
    manifest.reel = {
      video: await describeOutput(reelRel.video, previous.reel?.video, reelFp.video),
      poster: await describeOutput(reelRel.poster, previous.reel?.poster, reelFp.poster),
    };
  }

  const tmp = `${MANIFEST_PATH}.tmp`;
  await writeFile(tmp, `${JSON.stringify(manifest, null, 2)}\n`);
  await rename(tmp, MANIFEST_PATH);
  console.log(`Wrote ${path.relative(ROOT, MANIFEST_PATH)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
