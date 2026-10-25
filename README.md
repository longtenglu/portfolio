# portfolio

Longteng Lu's portfolio website: <https://longtenglu.vercel.app>

A static [Astro](https://astro.build) site in TypeScript. No server code, no
trackers, no analytics. The hero draws Michelangelo's two reaching hands in
code characters on a canvas, and the reel between the fingertips opens as you
scroll.

## Edit the words

Every word on the site lives in two files:

- `src/content/copy.ts`: the home page, the video cards, the terminal
- `src/content/resume.ts`: lines that only appear on the resume

After changing resume text, rebuild the PDF (see below).

## Local development

Needs Node 22.23.4 or newer, and ffmpeg for the media scripts.

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
npm test                # builds, then drives local Chrome over dist/ (set CHROME_PATH if needed)
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

Which videos, which seconds, and the poster frames are in
`scripts/media/videos.mjs`. The master file paths are not in the repo: list
them in a JSON file outside it (copy `scripts/media/sources.example.json`).

```sh
MEDIA_DIR=/path/to/media MEDIA_SOURCES=/path/to/media-sources.json npm run media:build
# rebuild only some outputs:
... npm run media:build -- --only atp-promo,hero-reel --force
```

It writes the files to `MEDIA_DIR` and the manifest the site reads to
`src/data/media.json`. A file keeps its hosted URL only while its bytes are
unchanged.

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
`robots.txt` disallows everything: the site is shared by link only.

## The resume

`/resume` is a printable page built from the same content files. The PDF at
`public/resume/Longteng-Lu-Resume.pdf` is printed from it with headless
Chrome:

```sh
npm run resume:pdf      # set CHROME_PATH if Chrome is not in the usual place
```

The resume is email-only: no phone number and no street address.

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
or script loads from a third-party server. The videos were produced at Tax
Academy of Singapore and are shown as work samples.
