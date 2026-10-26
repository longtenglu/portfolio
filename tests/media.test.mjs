// @ts-check
// End-to-end checks for scripts/media/build-media.mjs. Each run executes the
// real command against a synthetic clip in a temporary project, so the checks
// observe the files and the manifest the pipeline actually produces.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const BUILD_SCRIPT = fileURLToPath(new URL("../scripts/media/build-media.mjs", import.meta.url));

/** @typedef {{ path: string, fingerprint: string | null, sha256: string, width?: number, url: string | null }} OutputFile */
/** @typedef {{ videos: Record<string, { full: OutputFile, preview: OutputFile, poster: OutputFile }>, reel: { video: OutputFile, poster: OutputFile } }} Manifest */
/** @typedef {{ poster: number, reelPoster: number, crop: string, full: [number, number] }} Settings */

/** @type {Settings} */
const BASE = { poster: 0.5, reelPoster: 0.7, crop: "240:135:120:67", full: [320, 180] };

/** @param {Settings} settings */
function jobsModule(settings) {
  return `export const VIDEOS = [
  { id: "clip", orientation: "landscape", crop: ${JSON.stringify(settings.crop)}, poster: ${settings.poster}, preview: { start: 0.2, duration: 1.0 } },
];

export const HERO_REEL = {
  id: "hero-reel",
  source: "clip",
  start: 0.2,
  end: 1.2,
  poster: ${settings.reelPoster},
  crop: ${JSON.stringify(settings.crop)},
};

export const SIZES = {
  landscape: { full: ${JSON.stringify(settings.full)}, preview: [160, 90], poster: [160, 90], reel: [160, 90] },
  portrait: { full: [180, 320], preview: [90, 160], poster: [90, 160] },
};

export const LOUDNESS = { integrated: -14, tolerance: 0.5, truePeakLimit: -1.5, ceiling: -2.5 };
`;
}

/** @param {string} root */
function readManifest(root) {
  return /** @type {Manifest} */ (JSON.parse(readFileSync(path.join(root, "src/data/media.json"), "utf8")));
}

/** @param {string} root */
function outputs(root) {
  const manifest = readManifest(root);
  return {
    full: manifest.videos.clip.full,
    preview: manifest.videos.clip.preview,
    poster: manifest.videos.clip.poster,
    reel: manifest.reel.video,
    reelPoster: manifest.reel.poster,
  };
}

/**
 * @param {string} root
 * @param {string[]} [args]
 */
function run(root, args = []) {
  return execFileSync(process.execPath, [path.join(root, "scripts/media/build-media.mjs"), ...args], {
    env: { ...process.env, MEDIA_DIR: path.join(root, "media"), MEDIA_SOURCES: path.join(root, "sources.json") },
    encoding: "utf8",
  });
}

/**
 * @param {string} root
 * @param {Record<string, OutputFile>} files
 */
function mtimes(root, files) {
  /** @type {Record<string, bigint>} */
  const result = {};
  for (const [name, file] of Object.entries(files)) {
    result[name] = statSync(path.join(root, "media", file.path), { bigint: true }).mtimeNs;
  }
  return result;
}

/** @param {string} root */
function addUrls(root) {
  const manifest = readManifest(root);
  /** @param {OutputFile} file */
  const add = (file) => {
    file.url = `https://example.test/${file.path}`;
  };
  for (const video of Object.values(manifest.videos)) {
    add(video.full);
    add(video.preview);
    add(video.poster);
  }
  add(manifest.reel.video);
  add(manifest.reel.poster);
  writeFileSync(path.join(root, "src/data/media.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

test("build-media re-encodes an output when its settings change", () => {
  const root = mkdtempSync(path.join(tmpdir(), "media-build-"));
  try {
    mkdirSync(path.join(root, "scripts/media"), { recursive: true });
    mkdirSync(path.join(root, "src/data"), { recursive: true });
    copyFileSync(BUILD_SCRIPT, path.join(root, "scripts/media/build-media.mjs"));
    const source = path.join(root, "source.mp4");
    execFileSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", "testsrc2=size=480x270:rate=24:duration=2.5",
      "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=2.5",
      "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-shortest", source,
    ]);
    writeFileSync(path.join(root, "sources.json"), JSON.stringify({ clip: source }));
    writeFileSync(path.join(root, "scripts/media/videos.mjs"), jobsModule(BASE));

    run(root);
    const first = outputs(root);
    for (const file of Object.values(first)) {
      assert.equal(typeof file.fingerprint, "string", `${file.path} records its settings`);
      assert.equal(file.url, null);
    }
    const firstMtimes = mtimes(root, first);

    addUrls(root);
    const secondLog = run(root);
    assert.doesNotMatch(secondLog, /full copy|hover preview|poster|loop/, "a matching fingerprint skips the encode");
    assert.deepEqual(mtimes(root, first), firstMtimes, "an unchanged build leaves every file alone");
    const second = outputs(root);
    assert.equal(second.full.url, "https://example.test/clip/clip.mp4");
    assert.equal(second.poster.url, "https://example.test/clip/clip-poster.avif");

    writeFileSync(path.join(root, "scripts/media/videos.mjs"), jobsModule({ ...BASE, poster: 0.9, reelPoster: 1.0 }));
    run(root);
    const retimed = outputs(root);
    assert.equal(retimed.full.sha256, first.full.sha256);
    assert.equal(retimed.preview.sha256, first.preview.sha256);
    assert.equal(retimed.reel.sha256, first.reel.sha256);
    assert.notEqual(retimed.poster.sha256, first.poster.sha256, "a new poster time re-encodes the poster");
    assert.notEqual(retimed.reelPoster.sha256, first.reelPoster.sha256, "a new poster time re-encodes the reel poster");
    assert.equal(retimed.poster.url, null, "changed bytes clear the hosted URL");
    assert.equal(retimed.reelPoster.url, null);
    assert.equal(retimed.full.url, "https://example.test/clip/clip.mp4");

    const croppedSettings = { ...BASE, poster: 0.9, reelPoster: 1.0, crop: "200:112:40:20" };
    writeFileSync(path.join(root, "scripts/media/videos.mjs"), jobsModule(croppedSettings));
    run(root, ["--only", "other"]);
    const skipped = outputs(root);
    assert.equal(skipped.preview.fingerprint, retimed.preview.fingerprint, "a skipped job keeps its old fingerprint");
    assert.deepEqual(mtimes(root, skipped), mtimes(root, retimed), "a skipped job reuses the files it has");

    run(root);
    const cropped = outputs(root);
    assert.equal(cropped.full.sha256, first.full.sha256);
    assert.notEqual(cropped.preview.sha256, retimed.preview.sha256, "a new crop re-encodes the preview");
    assert.notEqual(cropped.poster.sha256, retimed.poster.sha256, "a new crop re-encodes the poster");
    assert.notEqual(cropped.reel.sha256, retimed.reel.sha256, "a new crop re-encodes the reel");
    assert.notEqual(cropped.reelPoster.sha256, retimed.reelPoster.sha256, "a new crop re-encodes the reel poster");
    assert.equal(cropped.preview.url, null);
    assert.equal(cropped.reel.url, null);
    assert.equal(cropped.full.url, "https://example.test/clip/clip.mp4");

    writeFileSync(path.join(root, "scripts/media/videos.mjs"), jobsModule({ ...croppedSettings, full: [240, 136] }));
    run(root);
    const resized = outputs(root);
    assert.notEqual(resized.full.sha256, cropped.full.sha256, "a new output size re-encodes the full copy");
    assert.equal(resized.full.width, 240);
    assert.equal(resized.preview.sha256, cropped.preview.sha256);

    const beforeForce = mtimes(root, resized);
    run(root, ["--force"]);
    const forced = outputs(root);
    assert.equal(forced.full.fingerprint, resized.full.fingerprint);
    const forcedMtimes = mtimes(root, forced);
    for (const name of Object.keys(beforeForce)) {
      assert.notEqual(forcedMtimes[name], beforeForce[name], `--force re-encodes ${name}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
