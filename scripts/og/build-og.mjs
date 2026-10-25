#!/usr/bin/env node
// @ts-check
// Renders the share card (1200x630) from the built home page, so the unfurl
// in an application email or a message shows the name and the hands rather
// than a bare link. Run after a build:
//
//   npm run build && npm run og:image
//
// Writes public/og.png (the source of truth, committed) and dist/og.png for
// the current build. The header, strip, reel and metadata are hidden for the
// shot, and hosted media is blocked because the card is type and canvas only.

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { findChrome } from "../lib/chrome.mjs";
import { serveDir } from "../lib/static.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DIST = path.join(ROOT, "dist");
const OUT = path.join(ROOT, "public", "og.png");
const WIDTH = 1200;
const HEIGHT = 630;

if (!existsSync(path.join(DIST, "index.html"))) {
  console.error("dist/index.html is missing. Run npm run build first.");
  process.exit(1);
}

const server = await serveDir(DIST);
const browser = await chromium.launch({ executablePath: findChrome() });
try {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  await context.route(/blob\.vercel-storage\.com/, (route) => route.abort());
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.port}/`, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("[data-reel]")?.getAttribute("data-open") !== null);
  await page.addStyleTag({
    content: `
      .header, .strip, .hero__meta, .hero__reel, .hero__reel-caption, .skip-link {
        display: none !important;
      }
      .intro {
        height: 100vh !important;
        height: 100svh !important;
      }
      .intro__stage {
        position: relative !important;
        height: 100vh !important;
        height: 100svh !important;
        min-height: 0 !important;
      }
      .hero__copy {
        opacity: 1 !important;
        transform: none !important;
        padding-top: 64px !important;
      }
      /* The card carries the name and the claim; the role and availability
         lines live in the unfurl description instead. */
      .hero__role, .hero__available {
        display: none !important;
      }
    `,
  });
  await page.evaluate(() => document.fonts.ready);
  // The glyph field settles in over the first 1.7 seconds.
  await page.waitForTimeout(2200);
  await page.screenshot({ path: OUT, type: "png" });
  if (existsSync(DIST)) copyFileSync(OUT, path.join(DIST, "og.png"));
} finally {
  await browser.close();
  await server.close();
}

mkdirSync(path.dirname(OUT), { recursive: true });
console.log(`Wrote ${path.relative(ROOT, OUT)} (${WIDTH}x${HEIGHT})`);
