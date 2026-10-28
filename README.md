# portfolio

Longteng Lu's portfolio website: <https://longtenglu.vercel.app>

A static [Astro](https://astro.build) site in TypeScript. No server code, no
trackers, no analytics. The hero draws Michelangelo's two reaching hands in
code characters on a canvas, and the reel between the fingertips opens as you
scroll. The reel plays one of the Selected videos: `hero.reel.film` in
`src/content/copy.ts` names it, and `HERO_REEL` in `scripts/media/videos.mjs`
says which seconds of it, cropped to 16:9, loop in the gap.

## Edit the words

The copy for the home page and resume lives in two files:

- `src/content/copy.ts`: the home page, the video cards (each with one credit
  line), the "How a film gets made" steps, the terminal
- `src/content/resume.ts`: lines that only appear on the resume

After changing anything that appears on the resume, rebuild the PDF (see
below).

## Local development

Needs Node 22.23.4 or newer, ffmpeg for the media pipeline and its tests,
and Chrome or Chromium for the resume PDF, the share image, the icons and the
browser tests.

```sh
npm install
cp .env.example .env    # then fill in MEDIA_DIR and MEDIA_SOURCES
npm run dev             # http://localhost:4321
```

`npm run dev` serves `/media/*` from `MEDIA_DIR`, so the videos play locally
before they are uploaded. Run `export $(grep -v '^#' .env | xargs)` first, or
pass the variables inline.

Checks, browser tests and a production build:

```sh
npm run check           # astro check, plus type checks for scripts/ and tests/
npm test                # builds, checks the media pipeline, then drives local Chrome over dist/
                        # (set CHROME_PATH if needed)
npm run build           # static output in dist/
MEDIA_DIR=/path/to/media npm run preview   # serve dist/ like Vercel, with /media
```

## The hero hands

`src/data/hands.json` is a small density map, committed so the site never
ships the photo. To rebuild it, download the public-domain source,
[File:Creation of Adam (Michelangelo) Detail.jpg](https://commons.wikimedia.org/wiki/File:Creation_of_Adam_(Michelangelo)_Detail.jpg),
outside the repo and run:

```sh
npm run hero:hands -- /path/to/creation-of-adam-detail.jpg --preview
```

## Media pipeline

Videos never go in this repo. `scripts/media/build-media.mjs` makes web
copies from the masters with ffmpeg, one job at a time:

- full copies: H.264 + AAC, faststart, at most 1920x1080 (landscape) or
  1080x1920 (portrait), loudness normalised to -14 LUFS (within half a LU)
  with the true peak at or below -1.5 dBTP
- AVIF posters
- 4 to 6 second muted hover previews, plus the muted hero loop
- the six production stills for "How a film gets made": one 4:5 AVIF each,
  cut from a frame of a film (`at`, in seconds) or from an image

Which videos, which seconds, the crop each card or still shows, and the
poster frames are in `scripts/media/videos.mjs`. The crop matters: the
masters carry the workplace's logo bug on the frame and sometimes its name
on screen, so each card shows a cropped view with the poster and preview
picked from stretches where none of it is legible. The master file paths
are not in the repo: list them in a JSON file outside it (copy
`scripts/media/sources.example.json`).

```sh
MEDIA_DIR=/path/to/media MEDIA_SOURCES=/path/to/media-sources.json npm run media:build
# rebuild only some outputs:
... npm run media:build -- --only china-trip,hero-reel --force
```

It writes the files to `MEDIA_DIR` and the manifest the site reads to
`src/data/media.json`. Each output records a fingerprint of the settings that
made it: source, crop, the poster, preview and reel times, output size and
the encode settings. A later build re-encodes any selected output whose
fingerprint or recorded bytes do not match the manifest, so editing one of
those settings is enough. A still's fingerprint includes its source file's
bytes, so editing an image in place re-encodes it. An output whose manifest
entry has no fingerprint rebuilds once. `--force` rebuilds every selected
output. A file keeps its hosted URL only while its bytes are unchanged.

Outputs left out by `--only` are not rebuilt, but the manifest records the
bytes `MEDIA_DIR` actually holds for them. Before a partial build, make sure
`MEDIA_DIR` has the hosted files (download them from the URLs in the manifest
and check the sha256), or their entries will lose their URLs.

## Vercel Blob

Production media is served from Vercel Blob.

1. In the Vercel dashboard, open the project, go to Storage, create a Blob
   store and connect it to the project.
2. Copy the store's `BLOB_READ_WRITE_TOKEN` (Storage, the store, .env.local
   tab) into your local `.env`. Never commit it.
3. Upload and record the URLs:

   ```sh
   MEDIA_DIR=/path/to/media BLOB_READ_WRITE_TOKEN=... npm run media:upload -- --dry-run
   MEDIA_DIR=/path/to/media BLOB_READ_WRITE_TOKEN=... npm run media:upload
   ```

4. Commit `src/data/media.json` and push. The deployed site now plays from
   Blob.

Blob paths include part of each file's hash, so re-encoded files get fresh
URLs and unchanged files are skipped on later uploads.

## Deploy on Vercel

1. Sign in at [vercel.com](https://vercel.com) with GitHub, choose
   Add New, then Project, and import `longtenglu/portfolio`.
2. Vercel detects Astro. Keep the defaults (build `npm run build`, output
   `dist`), name the project `longtenglu` so the address is
   `longtenglu.vercel.app`, and deploy.
3. Every push to `main` deploys again. No Vercel CLI or GitHub Actions needed.

`vercel.json` adds an `X-Robots-Tag: noindex, nofollow` header to every
response. Each page also carries a `noindex, nofollow` meta tag, and
`robots.txt` disallows every crawler except the link-preview bots (LinkedIn,
Facebook, Twitter, Slack), so a shared link still gets its title and image:
the site is shared by link only.

## The resume

`/resume` is a printable page built from the same content files. The PDF at
`public/resume/Longteng-Lu-Resume.pdf` is printed from it with headless
Chrome:

```sh
npm run resume:pdf      # set CHROME_PATH if Chrome is not in the usual place
```

The resume is email-only: no phone number and no street address.

## The share image

`public/og.png` is the 1200x630 card shown when the site is shared in a
message or an application email. It is rendered from the built home page so
the name and the hands stay in step with the design:

```sh
npm run build
npm run og:image      # writes public/og.png and dist/og.png
```

Commit the new `public/og.png` with the change that altered the hero.

## The icons

`public/favicon.svg` is the source. The Apple touch icon and the `.ico` are
rendered from it with headless Chrome:

```sh
npm run icons         # writes public/apple-touch-icon.png and public/favicon.ico
```

## Hidden terminal

Press the backtick key (`` ` ``) anywhere on the home page, or use the button
in the footer. Commands: `help`, `whoami`, `projects`, `contact`, `clear`,
`exit`. Esc closes it.

## Licences

Code in this repo is the owner's. Third-party pieces:

| What | Licence | Source |
| --- | --- | --- |
| Archivo (variable, self-hosted) | SIL Open Font License 1.1 | [Omnibus-Type/Archivo](https://github.com/Omnibus-Type/Archivo), via `@fontsource-variable/archivo` |
| JetBrains Mono (variable, self-hosted) | SIL Open Font License 1.1 | [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono), via `@fontsource-variable/jetbrains-mono` |
| Lenis (smooth scroll) | MIT | [darkroomengineering/lenis](https://github.com/darkroomengineering/lenis) |
| The Creation of Adam, detail (Michelangelo, c. 1511) | Public domain (PD-Art, PD-old) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Creation_of_Adam_(Michelangelo)_Detail.jpg) |

Fonts are bundled from npm at build time and served from this site; no font
or script loads from a third-party server. The videos are shown as work
samples.
