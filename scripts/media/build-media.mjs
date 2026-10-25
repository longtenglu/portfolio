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
//   ... npm run media:build -- --only atp-promo,hero-reel --force
//
// Outputs that already exist are kept unless --force is passed, so a stopped
// run can resume. Jobs run one at a time on purpose: one ffmpeg process is
// enough for a 16 GB machine. Nothing is written into the repo except the
// manifest.

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
 * @typedef {{ path: string, bytes: number, sha256: string, url: string | null,
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
      "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-maxrate", "5M", "-bufsize", "10M",
      "-profile:v", "high", "-pix_fmt", "yuv420p", "-force_key_frames", "expr:gte(t,n_forced*2)",
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
 * @param {{ crf: number, fade?: boolean }} opts
 */
async function encodeExcerpt(src, out, size, start, duration, opts) {
  const filters = [scaleFilter(size[0], size[1])];
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
 */
async function encodePoster(src, out, size, at) {
  await produce(out, (tmp) =>
    run("ffmpeg", [
      ...FFMPEG, "-loglevel", "error", "-ss", String(at), "-i", src, "-frames:v", "1",
      "-vf", `${scaleFilter(size[0], size[1])},format=yuv420p`,
      "-c:v", "libsvtav1", "-crf", "34", "-preset", "4", "-f", "avif", tmp,
    ]).then(() => undefined),
  );
}

/**
 * @param {string} mediaDir
 * @param {string} rel
 * @param {MediaFile | undefined} previous
 * @param {Partial<MediaFile>} extra
 * @returns {Promise<MediaFile>}
 */
async function describe(mediaDir, rel, previous, extra = {}) {
  const abs = path.join(mediaDir, rel);
  const [info, hash, st] = await Promise.all([probe(abs), sha256(abs), stat(abs)]);
  const file = {
    path: rel,
    bytes: st.size,
    sha256: hash,
    width: info.width,
    height: info.height,
    ...(rel.endsWith(".mp4") && info.duration ? { duration: info.duration } : {}),
    ...extra,
    // Keep a hosted URL only while it still points at the same bytes.
    url: previous && previous.sha256 === hash ? previous.url : null,
  };
  if (!file.loudness && previous?.loudness && previous.sha256 === hash) file.loudness = previous.loudness;
  return file;
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
  /** @param {string} rel */
  const needs = (rel) => force || !existsSync(path.join(mediaDir, rel));

  /** @type {Manifest} */
  const manifest = { videos: {}, reel: null };

  for (const job of VIDEOS) {
    const size = SIZES[job.orientation];
    const rel = {
      full: `${job.id}/${job.id}.mp4`,
      preview: `${job.id}/${job.id}-preview.mp4`,
      poster: `${job.id}/${job.id}-poster.avif`,
    };
    /** @type {{ integrated: number, truePeak: number } | undefined} */
    let loudness;
    if (selected(job.id)) {
      const src = sourceFor(job.id);
      if (needs(rel.full)) {
        console.log(`${job.id}: full copy`);
        loudness = await encodeFull(src, path.join(mediaDir, rel.full), /** @type {[number, number]} */ (size.full));
        console.log(`  ${loudness.integrated} LUFS, ${loudness.truePeak} dBTP`);
      }
      if (needs(rel.poster)) {
        console.log(`${job.id}: poster`);
        await encodePoster(src, path.join(mediaDir, rel.poster), /** @type {[number, number]} */ (size.poster), job.poster);
      }
      if (needs(rel.preview)) {
        console.log(`${job.id}: hover preview`);
        await encodeExcerpt(src, path.join(mediaDir, rel.preview), /** @type {[number, number]} */ (size.preview),
          job.preview.start, job.preview.duration, { crf: 27 });
      }
    }
    if (!existsSync(path.join(mediaDir, rel.full))) continue;
    const prev = previous.videos[job.id];
    const full = await describe(mediaDir, rel.full, prev?.full, loudness ? { loudness } : {});
    if (!full.loudness) full.loudness = await verifyLoudness(path.join(mediaDir, rel.full));
    manifest.videos[job.id] = {
      orientation: job.orientation,
      full,
      preview: await describe(mediaDir, rel.preview, prev?.preview),
      poster: await describe(mediaDir, rel.poster, prev?.poster),
    };
  }

  const reelRel = { video: `${HERO_REEL.id}/${HERO_REEL.id}.mp4`, poster: `${HERO_REEL.id}/${HERO_REEL.id}-poster.avif` };
  if (selected(HERO_REEL.id)) {
    const src = sourceFor(HERO_REEL.source);
    const size = SIZES.landscape;
    if (needs(reelRel.video)) {
      console.log(`${HERO_REEL.id}: loop`);
      await encodeExcerpt(src, path.join(mediaDir, reelRel.video), /** @type {[number, number]} */ (size.reel),
        HERO_REEL.start, HERO_REEL.end - HERO_REEL.start, { crf: 25, fade: true });
    }
    if (needs(reelRel.poster)) {
      console.log(`${HERO_REEL.id}: poster`);
      await encodePoster(src, path.join(mediaDir, reelRel.poster), /** @type {[number, number]} */ (size.reel), HERO_REEL.start + 4.5);
    }
  }
  if (existsSync(path.join(mediaDir, reelRel.video))) {
    manifest.reel = {
      video: await describe(mediaDir, reelRel.video, previous.reel?.video),
      poster: await describe(mediaDir, reelRel.poster, previous.reel?.poster),
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
