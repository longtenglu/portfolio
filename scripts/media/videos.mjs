// @ts-check
// What the media pipeline makes for each video. Times are in seconds of the
// source file. Source file paths are NOT here: they live in a local JSON file
// outside the repo (see sources.example.json), so the repo never records where
// the masters sit on disk.

/**
 * @typedef {"landscape" | "portrait"} Orientation
 * @typedef {{
 *   id: string,
 *   orientation: Orientation,
 *   poster: number,
 *   preview: { start: number, duration: number },
 * }} VideoJob
 * @typedef {{ id: string, source: string, start: number, end: number }} ReelJob
 */

/** @type {VideoJob[]} */
export const VIDEOS = [
  { id: "atp-promo", orientation: "landscape", poster: 9.5, preview: { start: 5.2, duration: 5.5 } },
  { id: "tax-is-networking", orientation: "portrait", poster: 2.6, preview: { start: 4.0, duration: 5.5 } },
  { id: "anniversary-dinner", orientation: "portrait", poster: 33.5, preview: { start: 31.0, duration: 5.5 } },
  { id: "china-trip", orientation: "portrait", poster: 7.0, preview: { start: 15.0, duration: 6.0 } },
  { id: "iivt-few-words", orientation: "portrait", poster: 9.5, preview: { start: 8.0, duration: 5.5 } },
  { id: "bear-amsterdam-pre", orientation: "portrait", poster: 16.5, preview: { start: 8.0, duration: 5.5 } },
  { id: "bear-amsterdam-during", orientation: "portrait", poster: 47.6, preview: { start: 40.5, duration: 5.5 } },
  { id: "bear-munich", orientation: "portrait", poster: 2.0, preview: { start: 0.5, duration: 5.5 } },
];

// The muted loop that plays in the gap between the hands.
/** @type {ReelJob} */
export const HERO_REEL = { id: "hero-reel", source: "atp-promo", start: 5, end: 19 };

// Output sizes. Landscape is capped at 1080p, portrait at 1080x1920.
export const SIZES = {
  landscape: { full: [1920, 1080], preview: [960, 540], poster: [1280, 720], reel: [1280, 720] },
  portrait: { full: [1080, 1920], preview: [540, 960], poster: [720, 1280] },
};

// Loudness target for every file with sound: integrated loudness within
// `tolerance` LU of `integrated`, true peak at or below `truePeakLimit` dBTP.
// `ceiling` is where the limiter starts; it moves down if AAC overshoots.
export const LOUDNESS = { integrated: -14, tolerance: 0.5, truePeakLimit: -1.5, ceiling: -2.5 };
