// Resolves media files from the manifest the media pipeline writes.
// After `npm run media:upload` each file carries its Vercel Blob URL; until
// then files are served locally from /media (see astro.config.mjs).

import manifest from "../data/media.json";

export type MediaFile = {
  path: string;
  url: string | null;
  width?: number;
  height?: number;
  duration?: number;
};

type VideoEntry = {
  orientation: string;
  full: MediaFile;
  preview: MediaFile;
  poster: MediaFile;
};

const videos = manifest.videos as Record<string, VideoEntry>;
// Older manifests have no images key until the media pipeline runs again.
const images =
  ((manifest as unknown as { images?: Record<string, MediaFile> }).images ?? {});

export function mediaUrl(file: MediaFile) {
  return file.url ?? `/media/${file.path}`;
}

export function getVideo(id: string) {
  const entry = videos[id];
  if (!entry) throw new Error(`No media for "${id}". Run npm run media:build.`);
  return {
    id,
    orientation: entry.orientation as "landscape" | "portrait",
    src: mediaUrl(entry.full),
    preview: mediaUrl(entry.preview),
    poster: mediaUrl(entry.poster),
    width: entry.full.width ?? 1080,
    height: entry.full.height ?? 1920,
    duration: entry.full.duration ?? 0,
  };
}

export function getReel() {
  const reel = manifest.reel as { video: MediaFile; poster: MediaFile } | null;
  if (!reel) throw new Error("No hero reel. Run npm run media:build.");
  return { src: mediaUrl(reel.video), poster: mediaUrl(reel.poster) };
}

/** A still from the media manifest: a production still or the brochure spread. */
export function getImage(id: string) {
  const file = images[id];
  if (!file) throw new Error(`No image for "${id}". Run npm run media:build.`);
  return {
    id,
    src: mediaUrl(file),
    width: file.width ?? 800,
    height: file.height ?? 600,
  };
}

/** 68.5 -> "1:09" */
export function formatDuration(seconds: number) {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** 68.5 -> "PT1M9S", for the <time> element. */
export function isoDuration(seconds: number) {
  const s = Math.round(seconds);
  return `PT${Math.floor(s / 60)}M${s % 60}S`;
}
