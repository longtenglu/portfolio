// @ts-check
// Tiny static file responder with HTTP range support, shared by the Astro dev
// server plugin (for /media), scripts/serve.mjs, the resume PDF script and the
// browser tests. Range support matters: browsers stream and seek video with
// range requests.

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

/** @type {Record<string, string>} */
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".ico": "image/x-icon",
};

/**
 * Resolves a URL path inside a root directory, refusing anything that would
 * escape it.
 * @param {string} root
 * @param {string} urlPath
 */
export function resolveInside(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const abs = path.resolve(root, `.${path.posix.normalize(`/${decoded}`)}`);
  return abs === root || abs.startsWith(root + path.sep) ? abs : null;
}

/**
 * Sends a file, honouring a single byte range. Returns false if the file does
 * not exist so the caller can fall through.
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} file
 * @param {Record<string, string>} [headers]
 */
export async function sendFile(req, res, file, headers = {}) {
  let info;
  try {
    info = await stat(file);
  } catch {
    return false;
  }
  if (!info.isFile()) return false;

  const type = TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
  const base = { "Content-Type": type, "Accept-Ranges": "bytes", ...headers };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");

  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : info.size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : info.size - 1;
    start = Math.max(0, start);
    end = Math.min(end, info.size - 1);
    if (start > end) {
      res.writeHead(416, { ...base, "Content-Range": `bytes */${info.size}` });
      res.end();
      return true;
    }
    res.writeHead(206, { ...base, "Content-Range": `bytes ${start}-${end}/${info.size}`, "Content-Length": end - start + 1 });
    if (req.method === "HEAD") res.end();
    else createReadStream(file, { start, end }).pipe(res);
    return true;
  }

  res.writeHead(200, { ...base, "Content-Length": info.size });
  if (req.method === "HEAD") res.end();
  else createReadStream(file).pipe(res);
  return true;
}

/**
 * Serves a built site directory on a free local port, the way a static host
 * does (exact file, then directory index). For scripts and tests.
 * @param {string} root
 * @returns {Promise<{ port: number, close: () => Promise<void> }>}
 */
export function serveDir(root) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const file = resolveInside(root, req.url ?? "/");
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
      resolve({
        port,
        close: () =>
          new Promise((done) => {
            server.closeAllConnections();
            server.close(() => done(undefined));
          }),
      });
    });
  });
}
