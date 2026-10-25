#!/usr/bin/env node
// @ts-check
// Uploads the web copies listed in src/data/media.json to Vercel Blob and
// writes each returned URL back into the manifest. Commit the manifest
// afterwards: the deployed site plays media straight from those URLs.
//
//   BLOB_READ_WRITE_TOKEN=... MEDIA_DIR=/path/to/media npm run media:upload
//   ... npm run media:upload -- --dry-run      (list what would upload)
//
// Blob paths carry the first 12 characters of each file's SHA-256, so a
// re-encoded file gets a new URL (no stale caches) and an unchanged file is
// skipped. Files are checked against the manifest hash before upload.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { put } from "@vercel/blob";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const MANIFEST_PATH = path.join(ROOT, "src/data/media.json");
const PREFIX = "portfolio";
const MULTIPART_OVER = 20 * 1024 * 1024;
const YEAR = 365 * 24 * 60 * 60;

/** @typedef {{ path: string, sha256: string, bytes: number, url: string | null }} MediaFile */

/** @param {MediaFile} file */
function blobPath(file) {
  const ext = path.extname(file.path);
  const base = file.path.slice(0, -ext.length);
  return `${PREFIX}/${base}.${file.sha256.slice(0, 12)}${ext}`;
}

/** @param {string} file */
function contentType(file) {
  if (file.endsWith(".mp4")) return "video/mp4";
  if (file.endsWith(".avif")) return "image/avif";
  if (file.endsWith(".webp")) return "image/webp";
  throw new Error(`No content type for ${file}`);
}

/** @param {any} manifest @returns {MediaFile[]} */
function filesIn(manifest) {
  const files = [];
  for (const entry of Object.values(manifest.videos ?? {})) {
    const v = /** @type {any} */ (entry);
    files.push(v.full, v.preview, v.poster);
  }
  if (manifest.reel) files.push(manifest.reel.video, manifest.reel.poster);
  for (const file of Object.values(manifest.images ?? {})) files.push(/** @type {MediaFile} */ (file));
  return files.filter(Boolean);
}

/** @param {any} manifest */
function save(manifest) {
  const tmp = `${MANIFEST_PATH}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(manifest, null, 2)}\n`);
  renameSync(tmp, MANIFEST_PATH);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const mediaDir = process.env.MEDIA_DIR ? path.resolve(process.env.MEDIA_DIR) : null;
  if (!mediaDir) throw new Error("MEDIA_DIR is not set. See README.md, \"Media pipeline\".");
  if (!token && !dryRun) throw new Error("BLOB_READ_WRITE_TOKEN is not set. See README.md, \"Vercel Blob\".");

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const files = filesIn(manifest);
  let uploaded = 0;
  let skipped = 0;

  for (const file of files) {
    const target = blobPath(file);
    if (file.url && new URL(file.url).pathname.endsWith(target.slice(PREFIX.length))) {
      skipped++;
      continue;
    }
    const abs = path.join(mediaDir, file.path);
    if (!existsSync(abs)) throw new Error(`Missing ${abs}. Run npm run media:build first.`);
    const body = readFileSync(abs);
    const hash = createHash("sha256").update(body).digest("hex");
    if (hash !== file.sha256) {
      throw new Error(`${file.path} does not match the manifest. Re-run npm run media:build, then upload.`);
    }
    const mb = (file.bytes / 1024 / 1024).toFixed(1);
    if (dryRun) {
      console.log(`would upload ${file.path} (${mb} MB) -> ${target}`);
      continue;
    }
    console.log(`uploading ${file.path} (${mb} MB)`);
    const result = await put(target, body, {
      access: "public",
      token,
      contentType: contentType(file.path),
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: YEAR,
      multipart: file.bytes > MULTIPART_OVER,
    });
    file.url = result.url;
    // Save after every file so a stopped run keeps its progress.
    save(manifest);
    uploaded++;
  }

  console.log(dryRun ? `${files.length - skipped} file(s) to upload, ${skipped} already hosted` : `uploaded ${uploaded}, skipped ${skipped}`);
  if (!dryRun && uploaded) console.log("Commit src/data/media.json so the deployed site uses the hosted files.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
