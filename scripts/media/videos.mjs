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
 * @typedef {{ id: string, source: string, start: number, end: number, crop?: string }} ReelJob
 * @typedef {{ id: string, source: string, at?: number, crop?: string, size: [number, number] }} ImageJob
 */

/** @type {VideoJob[]} */
export const VIDEOS = [
  { id: "atp-promo", orientation: "landscape", poster: 9.5, preview: { start: 5.2, duration: 5.5 } },
  { id: "tax-is-networking", orientation: "portrait", poster: 2.6, preview: { start: 4.0, duration: 5.5 } },
  { id: "anniversary-dinner", orientation: "portrait", poster: 33.5, preview: { start: 31.0, duration: 5.5 } },
  { id: "china-trip", orientation: "portrait", poster: 7.0, preview: { start: 15.0, duration: 6.0 } },
  { id: "iivt-few-words", orientation: "portrait", poster: 9.5, preview: { start: 8.0, duration: 5.5 } },
  { id: "bear-amsterdam-pre", orientation: "portrait", poster: 16.5, preview: { start: 8.0, duration: 5.5 } },
  { id: "bear-amsterdam-during", orientation: "portrait", poster: 3.4, preview: { start: 40.5, duration: 5.5 } },
  { id: "bear-munich", orientation: "portrait", poster: 2.0, preview: { start: 0.5, duration: 5.5 } },
];

// The muted loop that plays in the gap between the hands. The anniversary
// recap is a vertical film, so the reel is a 16:9 crop of its middle band.
/** @type {ReelJob} */
export const HERO_REEL = {
  id: "hero-reel",
  source: "anniversary-dinner",
  start: 24,
  end: 37,
  crop: "1080:608:0:656",
};

// Still images for the site: the six-step production strip and the brochure
// spread. Video sources are sampled at `at`; image sources are used as they
// are. `crop` is width:height:x:y in the source.
/** @type {ImageJob[]} */
export const IMAGES = [
  { id: "proof-script", source: "atp-promo", at: 8, crop: "1440:1080:0:0", size: [800, 600] },
  { id: "proof-broll", source: "atp-promo", at: 55, crop: "1440:1080:0:0", size: [800, 600] },
  { id: "proof-motion", source: "tax-is-networking", at: 12.25, crop: "1080:810:0:300", size: [800, 600] },
  { id: "proof-captions", source: "atp-promo", at: 40, crop: "1440:1080:0:0", size: [800, 600] },
  { id: "proof-review", source: "iivt-review-sheet", crop: "1080:768:0:0", size: [800, 600] },
  { id: "proof-finish", source: "iivt-few-words", at: 32, crop: "1080:810:0:250", size: [800, 600] },
  { id: "brochure-spread", source: "brochure-spread", size: [1400, 990] },
];

// Output sizes. Landscape is capped at 1080p, portrait at 1080x1920.
export const SIZES = {
  landscape: { full: [1920, 1080], preview: [960, 540], poster: [1280, 720], reel: [1280, 720] },
  portrait: { full: [1080, 1920], preview: [540, 960], poster: [720, 1280] },
};

// Loudness target for every file with sound: integrated loudness within
// `tolerance` LU of `integrated`, true peak at or below `truePeakLimit` dBTP.
// `ceiling` is where the limiter starts; it moves down if AAC overshoots.
export const LOUDNESS = { integrated: -14, tolerance: 0.5, truePeakLimit: -1.5, ceiling: -2.5 };
