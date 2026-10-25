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
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveInside, sendFile } from "../lib/static.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DIST = path.join(ROOT, "dist");
const NAME = "Longteng-Lu-Resume.pdf";
const OUT = path.join(ROOT, "public", "resume", NAME);

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  const found = candidates.find((c) => c && existsSync(c));
  if (!found) throw new Error("Chrome not found. Set CHROME_PATH to a Chrome or Chromium binary.");
  return found;
}

function build() {
  const res = spawnSync("npx", ["astro", "build"], { cwd: ROOT, stdio: "inherit" });
  if (res.status !== 0) throw new Error("astro build failed");
}

/** @returns {Promise<{ port: number, close: () => void }>} */
function serve() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const file = resolveInside(DIST, req.url ?? "/");
      if (file) {
        for (const candidate of [file, path.join(file, "index.html")]) {
          if (await sendFile(req, res, candidate)) return;
        }
      }
      res.writeHead(404).end();
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ port, close: () => server.close() });
    });
  });
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
  const server = await serve();
  try {
    mkdirSync(path.dirname(OUT), { recursive: true });
    await print(chrome, `http://127.0.0.1:${server.port}/resume/`, OUT);
  } finally {
    server.close();
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
