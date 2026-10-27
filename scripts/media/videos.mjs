// @ts-check
// What the media pipeline makes: each video's web copies, the hero reel and
// the production stills. Times are in seconds of the source file. Source file
// paths are NOT here: they live in a local JSON file outside the repo (see
// sources.example.json), so the repo never records where the masters sit on
// disk.

/**
 * @typedef {"landscape" | "portrait"} Orientation
 * @typedef {{
 *   id: string,
 *   orientation: Orientation,
 *   poster: number,
 *   preview: { start: number, duration: number },
 *   crop?: string,
 * }} VideoJob
 * @typedef {{ id: string, source: string, start: number, end: number, poster?: number, crop?: string }} ReelJob
 * @typedef {{ id: string, source: string, at?: number, crop?: string }} StillJob
 */

// `crop` is the w:h:x:y view of the master that the card actually shows. The
// masters put the workplace's logo bug, and on-screen titles that name it, in
// the top or bottom band of the frame, so every card crops that band away.
// Poster times and preview windows are chosen from stretches where no
// workplace name is legible, rather than by what looks best.

/** @type {VideoJob[]} */
export const VIDEOS = [
  { id: "tax-is-networking", orientation: "portrait", crop: "945:1680:67:0", poster: 19.4, preview: { start: 3.0, duration: 5.5 } },
  { id: "china-trip", orientation: "portrait", crop: "954:1696:30:224", poster: 12.0, preview: { start: 46.0, duration: 5.5 } },
  { id: "iivt-few-words", orientation: "portrait", crop: "954:1696:63:224", poster: 10.0, preview: { start: 9.0, duration: 5.5 } },
  { id: "bear-amsterdam-pre", orientation: "portrait", crop: "945:1680:67:0", poster: 5.2, preview: { start: 1.5, duration: 5.5 } },
  { id: "bear-amsterdam-during", orientation: "portrait", crop: "918:1632:43:288", poster: 31.0, preview: { start: 29.0, duration: 5.5 } },
  { id: "bear-munich", orientation: "portrait", crop: "918:1632:81:288", poster: 25.0, preview: { start: 45.0, duration: 5.5 } },
];

// The muted loop that plays in the gap between the hands. The China trip
// recap is a vertical film, so the reel is a 16:9 band cut out of it: the
// plane wing, the code-built route map and the bridge drive. The band starts
// below the logo bug and ends above the location cards, and the window is
// chosen so no face or workplace name is in it.
/** @type {ReelJob} */
export const HERO_REEL = {
  id: "hero-reel",
  source: "china-trip",
  start: 0.5,
  end: 12.5,
  poster: 7.5,
  crop: "1080:608:0:360",
};

// Production stills for "How a film gets made": one frame or image per step,
// cropped to 4:5. `source` is a key in the sources file. A video source takes
// `at` (seconds); an image source is used as it is. Each crop keeps the logo
// bug, workplace names and faces out of the frame.
/** @type {StillJob[]} */
export const STILLS = [
  { id: "step-script", source: "step-script" },
  { id: "step-footage", source: "step-footage", crop: "682:853:299:0" },
  { id: "step-motion", source: "step-motion", crop: "1080:1350:0:380" },
  { id: "step-captions", source: "iivt-few-words", at: 16, crop: "864:1080:108:840" },
  { id: "step-review", source: "step-review" },
  { id: "step-edit", source: "step-edit" },
];

// Output sizes. Landscape is capped at 1080p, portrait at 1080x1920.
export const SIZES = {
  landscape: { full: [1920, 1080], preview: [960, 540], poster: [1280, 720], reel: [1280, 720] },
  portrait: { full: [1080, 1920], preview: [540, 960], poster: [720, 1280] },
  still: [720, 900],
};

// Loudness target for every file with sound: integrated loudness within
// `tolerance` LU of `integrated`, true peak at or below `truePeakLimit` dBTP.
// `ceiling` is where the limiter starts; it moves down if AAC overshoots.
export const LOUDNESS = { integrated: -14, tolerance: 0.5, truePeakLimit: -1.5, ceiling: -2.5 };
