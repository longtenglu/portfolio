// @ts-check
// Finds a local Chrome or Chromium for the scripts that drive a browser
// (the resume PDF and the browser tests). Set CHROME_PATH to override.

import { existsSync } from "node:fs";

export function findChrome() {
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
