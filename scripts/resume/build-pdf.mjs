#!/usr/bin/env node
// @ts-check
// Prints the /resume page to public/resume/Longteng-Lu-Resume.pdf with
// headless Chrome, so the PDF always matches the page and never needs hand
// edits. Run it after changing src/content/resume.ts or copy.ts:
//
//   npm run resume:pdf
//
// It builds the site, serves dist/ on a free local port, prints the page with
// a throwaway Chrome profile, and copies the PDF into dist/ as well so the
// current build is complete. Set CHROME_PATH if Chrome is not in the usual
// place.

import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome } from "../lib/chrome.mjs";
import { serveDir } from "../lib/static.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DIST = path.join(ROOT, "dist");
const NAME = "Longteng-Lu-Resume.pdf";
const OUT = path.join(ROOT, "public", "resume", NAME);

function build() {
  const res = spawnSync("npx", ["astro", "build"], { cwd: ROOT, stdio: "inherit" });
  if (res.status !== 0) throw new Error("astro build failed");
}

/**
 * @param {string} chrome
 * @param {string} url
 * @param {string} out
 */
function print(chrome, url, out) {
  const profile = mkdtempSync(path.join(tmpdir(), "resume-chrome-"));
  return new Promise((resolve, reject) => {
    const child = spawn(
      chrome,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        `--user-data-dir=${profile}`,
        "--no-pdf-header-footer",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=8000",
        `--print-to-pdf=${out}`,
        url,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => {
      rmSync(profile, { recursive: true, force: true });
      if (code === 0 && existsSync(out)) resolve(undefined);
      else reject(new Error(`Chrome exited with ${code}\n${stderr.slice(-1500)}`));
    });
  });
}

/**
 * Rough page count straight from the PDF objects.
 * @param {string} file
 */
function pageCount(file) {
  const text = readFileSync(file, "latin1");
  return (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

async function main() {
  const chrome = findChrome();
  build();
  const server = await serveDir(DIST);
  try {
    mkdirSync(path.dirname(OUT), { recursive: true });
    await print(chrome, `http://127.0.0.1:${server.port}/resume/`, OUT);
  } finally {
    await server.close();
  }
  const distCopy = path.join(DIST, "resume", NAME);
  mkdirSync(path.dirname(distCopy), { recursive: true });
  copyFileSync(OUT, distCopy);
  const kb = Math.round(statSync(OUT).size / 1024);
  console.log(`Wrote ${path.relative(ROOT, OUT)} (${kb} KB, ${pageCount(OUT)} page(s))`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
