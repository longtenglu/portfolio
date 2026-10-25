// @ts-check
import path from "node:path";
import { defineConfig } from "astro/config";
import { resolveInside, sendFile } from "./scripts/lib/static.mjs";

/**
 * In local development, serve /media/* from MEDIA_DIR (the folder the media
 * pipeline writes to). Production media comes from Vercel Blob URLs in
 * src/data/media.json, so this never runs in a deployed build.
 * @returns {import("vite").Plugin}
 */
function localMedia() {
  return {
    name: "local-media",
    configureServer(server) {
      const dir = process.env.MEDIA_DIR;
      if (!dir) return;
      const root = path.resolve(dir);
      server.middlewares.use("/media", async (req, res, next) => {
        const file = resolveInside(root, req.url ?? "/");
        if (!file || !(await sendFile(req, res, file))) next();
      });
    },
  };
}

export default defineConfig({
  site: "https://longtenglu.vercel.app",
  output: "static",
  devToolbar: { enabled: false },
  vite: {
    plugins: [localMedia()],
  },
});
