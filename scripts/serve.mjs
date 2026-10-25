#!/usr/bin/env node
// @ts-check
// Serves the built site (dist/) the way Vercel will, plus /media/* from
// MEDIA_DIR so a local build can play the videos before they are uploaded.
//
//   npm run build && MEDIA_DIR=/path/to/media npm run preview
//
// PORT defaults to 4321. The global headers from vercel.json are applied, so
// the noindex header can be checked locally too.

import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveInside, sendFile } from "./lib/static.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = path.join(ROOT, "dist");
const PORT = Number(process.env.PORT ?? 4321);
const MEDIA = process.env.MEDIA_DIR ? path.resolve(process.env.MEDIA_DIR) : null;

/** @type {{ headers?: { source: string, headers: { key: string, value: string }[] }[] }} */
const vercel = JSON.parse(readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
/** @type {Record<string, string>} */
const headers = {};
for (const rule of vercel.headers ?? []) {
  if (rule.source === "/(.*)") for (const h of rule.headers) headers[h.key] = h.value;
}

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
async function handle(req, res) {
  const url = req.url ?? "/";
  if (MEDIA && url.startsWith("/media/")) {
    const file = resolveInside(MEDIA, url.slice("/media".length));
    if (file && (await sendFile(req, res, file, headers))) return;
  }
  const file = resolveInside(DIST, url);
  if (file) {
    // Same lookup order as a static host: exact file, then directory index.
    for (const candidate of [file, path.join(file, "index.html"), `${file}.html`]) {
      if (await sendFile(req, res, candidate, headers)) return;
    }
  }
  try {
    const body = await readFile(path.join(DIST, "404.html"));
    res.writeHead(404, { ...headers, "Content-Type": "text/html; charset=utf-8" }).end(body);
  } catch {
    res.writeHead(404, headers).end("Not found");
  }
}

createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error(err);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Serving dist/ on http://127.0.0.1:${PORT}${MEDIA ? ` with /media from ${MEDIA}` : ""}`);
});
