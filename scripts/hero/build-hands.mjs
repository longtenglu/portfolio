#!/usr/bin/env node
// @ts-check
// Builds the density map the hero canvas draws the two hands from.
//
// Source: "File:Creation of Adam (Michelangelo) Detail.jpg" on Wikimedia
// Commons (public domain, PD-Art / PD-old-auto-expired):
// https://commons.wikimedia.org/wiki/File:Creation_of_Adam_(Michelangelo)_Detail.jpg
//
// The photo itself is never committed or shipped. This script decodes it with
// ffmpeg, area-averages a band across both hands onto a fine grid, keys out
// the plaster by warmth (red minus blue), and turns the lit skin into an ink
// density from 0 to 15. The site samples that grid into glyph cells at
// whatever size the screen needs.
//
// Usage:
//   npm run hero:hands -- /path/to/creation-of-adam-detail.jpg
//   npm run hero:hands -- /path/to/detail.jpg --preview   (prints an ASCII check)
//
// Writes src/data/hands.json. Requires ffmpeg on PATH.

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUT = path.join(ROOT, "src/data/hands.json");

// The detail file is 1400 x 1047. This band holds both hands and the gap;
// the arms run off the left and right edges, as they do in the fresco.
const CROP = { x: 0, y: 180, w: 1400, h: 440 };
// Four source pixels per sample keeps fingers and knuckles readable at
// desktop glyph sizes without making the map heavy.
const SAMPLE = 4;
// Adam's fingertip ends just left of this source x; God's starts just right.
const SPLIT_X = 668;
const LEVELS = 16;
// God's red cloak pokes in at the bottom right edge. It keys as skin, so mask
// it out (source pixels right of x and below y).
const CLOAK = { x: 1340, y: 430 };
// Connected shapes smaller than this many samples are dropped as noise.
const MIN_SHAPE = 120;

/** @param {number} v @param {number} [lo] @param {number} [hi] */
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/**
 * @param {string} src
 * @param {number} cols
 * @param {number} rows
 */
function decode(src, cols, rows) {
  const vf = `crop=${CROP.w}:${CROP.h}:${CROP.x}:${CROP.y},scale=${cols}:${rows}:flags=area`;
  const res = spawnSync(
    "ffmpeg",
    ["-loglevel", "error", "-i", src, "-vf", vf, "-pix_fmt", "rgb24", "-f", "rawvideo", "-"],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  if (res.status !== 0) throw new Error(`ffmpeg failed: ${res.stderr?.toString()}`);
  const raw = res.stdout;
  if (raw.length !== cols * rows * 3) throw new Error(`ffmpeg returned ${raw.length} bytes, expected ${cols * rows * 3}`);
  return raw;
}

/**
 * Box blur of a luminance grid.
 * @param {Float32Array} lum
 * @param {number} cols
 * @param {number} rows
 * @param {number} radius
 */
function blur(lum, cols, rows, radius) {
  const out = new Float32Array(lum.length);
  for (let y = 0; y < rows; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(rows - 1, y + radius);
    for (let x = 0; x < cols; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(cols - 1, x + radius);
      let total = 0;
      for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) total += lum[yy * cols + xx];
      out[y * cols + x] = total / ((y1 - y0 + 1) * (x1 - x0 + 1));
    }
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const src = args.find((a) => !a.startsWith("--"));
  const preview = args.includes("--preview");
  if (!src) {
    console.error("Pass the path to the Commons image. See the header of this file.");
    process.exit(1);
  }

  const cols = CROP.w / SAMPLE;
  const rows = CROP.h / SAMPLE;
  const split = Math.round((SPLIT_X - CROP.x) / SAMPLE);
  const raw = decode(src, cols, rows);

  const lum = new Float32Array(cols * rows);
  const warm = new Float32Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) {
    const r = raw[i * 3];
    const g = raw[i * 3 + 1];
    const b = raw[i * 3 + 2];
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    warm[i] = r - b;
  }
  const soft = blur(lum, cols, rows, 3);

  const density = new Uint8Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) {
    const sx = CROP.x + (i % cols) * SAMPLE;
    const sy = CROP.y + Math.floor(i / cols) * SAMPLE;
    if (sx >= CLOAK.x && sy >= CLOAK.y) continue;
    // Cream plaster sits under about 22 red-minus-blue; lit skin sits above 26.
    const skin = clamp((warm[i] - 22) / 5);
    if (skin <= 0) continue;
    // Ink follows the light, so the dark creases between fingers stay open
    // and the hand reads as fingers rather than a solid slab.
    const lit = clamp((lum[i] - 55) / 155);
    let value = skin * (0.08 + 0.92 * lit);
    // A small local-contrast term brings back knuckles, nails and the rim.
    value += Math.min(0.2, (Math.max(0, soft[i] - lum[i]) / 70) * 0.2);
    density[i] = Math.round(clamp(value) * (LEVELS - 1));
  }

  // Drop specks: a sample with almost no inked neighbours is plaster noise.
  const cleaned = density.slice();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!density[y * cols + x]) continue;
      let n = 0;
      for (let yy = Math.max(0, y - 1); yy <= Math.min(rows - 1, y + 1); yy++) {
        for (let xx = Math.max(0, x - 1); xx <= Math.min(cols - 1, x + 1); xx++) {
          if ((yy !== y || xx !== x) && density[yy * cols + xx] > 1) n++;
        }
      }
      if (n <= 2) cleaned[y * cols + x] = 0;
    }
  }

  // Keep only sizeable connected shapes: the two hands and arms. Warm spots
  // in the plaster would otherwise show up as stray glyphs.
  const label = new Int32Array(cols * rows).fill(-1);
  const sizes = [];
  for (let start = 0; start < cols * rows; start++) {
    if (!cleaned[start] || label[start] !== -1) continue;
    const id = sizes.length;
    const stack = [start];
    label[start] = id;
    let size = 0;
    while (stack.length) {
      const i = /** @type {number} */ (stack.pop());
      size++;
      const x = i % cols;
      const y = (i - x) / cols;
      for (let yy = Math.max(0, y - 1); yy <= Math.min(rows - 1, y + 1); yy++) {
        for (let xx = Math.max(0, x - 1); xx <= Math.min(cols - 1, x + 1); xx++) {
          const j = yy * cols + xx;
          if (cleaned[j] && label[j] === -1) {
            label[j] = id;
            stack.push(j);
          }
        }
      }
    }
    sizes.push(size);
  }
  for (let i = 0; i < cols * rows; i++) {
    if (cleaned[i] && sizes[label[i]] < MIN_SHAPE) cleaned[i] = 0;
  }

  // Fingertips: the inked sample nearest the split on each side.
  /** @type {[number, number]} */
  let leftTip = [0, 0];
  /** @type {[number, number]} */
  let rightTip = [cols - 1, 0];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (cleaned[y * cols + x] < 3) continue;
      if (x < split && x > leftTip[0]) leftTip = [x, y];
      if (x >= split && x < rightTip[0]) rightTip = [x, y];
    }
  }

  const hex = "0123456789abcdef";
  const lines = [];
  for (let y = 0; y < rows; y++) {
    let line = "";
    for (let x = 0; x < cols; x++) line += hex[cleaned[y * cols + x]];
    lines.push(line);
  }

  const data = {
    source: "File:Creation of Adam (Michelangelo) Detail.jpg, Wikimedia Commons, public domain",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Creation_of_Adam_(Michelangelo)_Detail.jpg",
    crop: CROP,
    sample: SAMPLE,
    cols,
    rows,
    split,
    levels: LEVELS,
    tips: { left: leftTip, right: rightTip },
    density: lines,
  };
  writeFileSync(OUT, `${JSON.stringify(data)}\n`);
  console.log(`Wrote ${path.relative(ROOT, OUT)}: ${cols} x ${rows} samples, split at ${split}, tips ${JSON.stringify(data.tips)}`);

  if (preview) {
    const ramp = " .:-=+*#%@";
    for (let y = 0; y < rows; y += 4) {
      let row = "";
      for (let x = 0; x < cols; x += 2) {
        const v = cleaned[y * cols + x];
        row += x === split ? "|" : ramp[Math.round((v / (LEVELS - 1)) * (ramp.length - 1))];
      }
      console.log(row);
    }
  }
}

main();
