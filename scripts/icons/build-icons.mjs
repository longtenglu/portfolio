#!/usr/bin/env node
// @ts-check
// Renders the fixed-size icons from public/favicon.svg with headless Chrome:
//
//   npm run icons
//
// Writes public/apple-touch-icon.png (180x180, square: iOS rounds the corners
// itself) and public/favicon.ico (32x32, a PNG inside the ICO container).
// favicon.svg draws {L} as paths, so none of this depends on an installed font.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { findChrome } from "../lib/chrome.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PUBLIC = path.join(ROOT, "public");
const svg = readFileSync(path.join(PUBLIC, "favicon.svg"), "utf8");

/**
 * @param {import("playwright-core").Browser} browser
 * @param {string} markup
 * @param {number} size
 */
async function render(browser, markup, size) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${markup}`,
  );
  const png = await page.screenshot({ type: "png", omitBackground: true });
  await page.close();
  return png;
}

/**
 * One 32x32 image stored as PNG inside an ICO file.
 * @param {Buffer} png
 */
function ico(png) {
  const head = Buffer.alloc(22);
  head.writeUInt16LE(0, 0); // reserved
  head.writeUInt16LE(1, 2); // type: icon
  head.writeUInt16LE(1, 4); // one image
  head.writeUInt8(32, 6); // width
  head.writeUInt8(32, 7); // height
  head.writeUInt16LE(1, 10); // colour planes
  head.writeUInt16LE(32, 12); // bits per pixel
  head.writeUInt32LE(png.length, 14);
  head.writeUInt32LE(22, 18); // image offset
  return Buffer.concat([head, png]);
}

const browser = await chromium.launch({ executablePath: findChrome() });
try {
  const touch = await render(browser, svg.replace(' rx="12"', ""), 180);
  writeFileSync(path.join(PUBLIC, "apple-touch-icon.png"), touch);
  const small = await render(browser, svg, 32);
  writeFileSync(path.join(PUBLIC, "favicon.ico"), ico(small));
} finally {
  await browser.close();
}
console.log("Wrote public/apple-touch-icon.png (180x180) and public/favicon.ico (32x32)");
