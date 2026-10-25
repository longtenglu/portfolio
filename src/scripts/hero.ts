// The hero: Michelangelo's two reaching hands drawn in code characters on a
// canvas, with the video reel opening in the gap between the fingertips.
//
// The hands come from a density map built at dev time from the public-domain
// Commons photo (scripts/hero/build-hands.mjs). Each frame draws a few
// thousand glyphs from a pre-tinted atlas, every cell once, in its own place.
// The silhouette is traced with outline glyphs so the fingers read at a
// glance; the interior re-rolls and shimmers; glyphs near the cursor brighten
// and lean away. At rest the fingertips almost touch. As the page scrolls a
// spark between them widens, parting the hands, and opens into the reel.

import hands from "../data/hands.json";

const AMBER = [255, 176, 0] as const;
const HOT = [255, 236, 190] as const;
const FONT = '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, Menlo, monospace';

// Only these characters are used: / \ | < > { } ; = + - _ [ ] and digits.
const CHARS = "-_;=+[]<>|/\\{}01469";
const GROUPS = ["-_", "_;=+-", "[]<>|+", "/\\{}", "/\\|{}<>", "01469/\\|"].map((g) =>
  [...g].map((c) => CHARS.indexOf(c)),
);
const STROKES = [..."/\\|<>{}[];=+-_"].map((c) => CHARS.indexOf(c));
const STROKE_GROUP = GROUPS.length;
// Outline cells keep a fixed glyph that follows the edge direction.
const EDGE_GROUP = GROUPS.length + 1;
const EDGE = {
  vertical: CHARS.indexOf("|"),
  top: CHARS.indexOf("_"),
  bottom: CHARS.indexOf("-"),
  rising: CHARS.indexOf("/"),
  falling: CHARS.indexOf("\\"),
};

// Atlas rows: six resting brightness levels, then two hot levels used near
// the cursor.
const LEVEL_ALPHA = [0.22, 0.34, 0.48, 0.64, 0.82, 1];
const HOT_LEVELS = 2;
const LEVELS = LEVEL_ALPHA.length + HOT_LEVELS;
const THRESHOLD = 0.12;

type Options = {
  canvas: HTMLCanvasElement;
  /** The headline block and the meta row, which bound the free space on phones. */
  copy: HTMLElement | null;
  meta: HTMLElement | null;
  reel: HTMLElement;
  reelFrame: HTMLElement;
  reelCaption: HTMLElement | null;
  reducedMotion: boolean;
  finePointer: boolean;
  /** Called whenever the reel switches between open and not open. */
  onOpenChange?: (open: boolean) => void;
};

type Layout = {
  phone: boolean;
  width: number;
  height: number;
  dpr: number;
  scale: number; // CSS pixels per source pixel of the fresco
  fontSize: number;
  cellW: number;
  cellH: number;
  gapX: number;
  gapYRest: number;
  gapYEnd: number;
  sepRest: number;
  sepEnd: number;
  reelW: number;
  pointerRadius: number;
  pointerPush: number;
};

// Small deterministic hash so the art is the same on every load.
function hash(x: number, y: number, salt: number) {
  let h = (x * 73856093) ^ (y * 19349663) ^ (salt * 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// Decode the committed density map once.
const MAP_COLS = hands.cols;
const MAP_ROWS = hands.rows;
const SAMPLE = hands.sample;
const SPLIT = hands.split;
const MAP = new Float32Array(MAP_COLS * MAP_ROWS);
hands.density.forEach((line, y) => {
  for (let x = 0; x < MAP_COLS; x++) MAP[y * MAP_COLS + x] = parseInt(line[x], 16) / (hands.levels - 1);
});
// The midpoint between the two fingertips, in source pixels of the crop, and
// how far apart they are in the fresco.
const TIP_MID_X = ((hands.tips.left[0] + hands.tips.right[0]) / 2 + 0.5) * SAMPLE;
const TIP_MID_Y = ((hands.tips.left[1] + hands.tips.right[1]) / 2 + 0.5) * SAMPLE;
const TIP_GAP = (hands.tips.right[0] - hands.tips.left[0]) * SAMPLE;

// How far the inked rows reach above and below the fingertips, in source
// pixels, within a window of the given half-width around them.
function inkReach(halfWidth: number) {
  const x0 = Math.max(0, Math.floor((TIP_MID_X - halfWidth) / SAMPLE));
  const x1 = Math.min(MAP_COLS - 1, Math.ceil((TIP_MID_X + halfWidth) / SAMPLE));
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < MAP_ROWS; y++) {
    let n = 0;
    for (let x = x0; x <= x1; x++) if (MAP[y * MAP_COLS + x] >= THRESHOLD) n++;
    if (n < 3) continue;
    if (top < 0) top = y;
    bottom = y;
  }
  return { above: TIP_MID_Y - top * SAMPLE, below: (bottom + 1) * SAMPLE - TIP_MID_Y };
}

// Free space on a phone: the hands sit between the headline copy and the
// meta row, and the reel hangs from the gap into whatever is left below.
type Band = { top: number; bottom: number };

function computeLayout(width: number, height: number, band: Band | null): Layout {
  const phone = width < 640;
  const tablet = !phone && width < 1024;
  const dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.75 : 2);
  let scale = (width * (phone ? 2.6 : tablet ? 1.35 : 1.06)) / hands.crop.w;
  const fontSize = clamp(width / 150, 7, 10.5);
  const cellH = fontSize * 1.12;
  let reelW = phone ? width * 0.84 : tablet ? width * 0.46 : Math.min(width * 0.34, 620);

  // On a phone, grow the hands to fill the free band (never past 1.3x, or
  // the fingers stop reading as hands) and centre them in it. On a short
  // phone the open reel wins over the clearance above the hands.
  let phoneGapRest = height * 0.62;
  let phoneGapEnd = height * 0.55;
  if (phone && band && band.bottom > band.top) {
    const captionReserve = 52;
    const maxReelW = ((band.bottom - band.top - cellH - 12 - captionReserve) * 16) / 9;
    reelW = Math.min(reelW, Math.max(0, maxReelW));
    const reach = inkReach(width / 2 / scale);
    const inkHeight = (reach.above + reach.below) * scale;
    const fit = clamp(((band.bottom - band.top) * 0.86) / inkHeight, 1, 1.3);
    scale *= fit;
    const above = reach.above * scale;
    const below = reach.below * scale;
    const centred = band.top + (band.bottom - band.top - above - below) / 2 + above;
    // The open reel (plus its caption) hangs below the gap and must clear
    // the meta row, so the gap cannot sit lower than that allows.
    const reelBelow = cellH + (reelW * 9) / 16 + 12 + captionReserve;
    const lowest = band.bottom - reelBelow;
    phoneGapRest = centred;
    // Rise a little as the reel opens, but stay clear of the copy above.
    phoneGapEnd = Math.min(centred - 22, lowest);
  }
  // Phones are too narrow for a reel between the hands, so there the reel
  // unfurls downward from the spark under the fingertips instead.
  return {
    phone,
    width,
    height,
    dpr,
    scale,
    fontSize,
    cellW: fontSize * 0.62,
    cellH,
    gapX: width * 0.5,
    // Desktop: the hands sit under the name and rise to the middle as the
    // reel opens. Phones keep the name in view and the hands below it.
    gapYRest: phone ? phoneGapRest : height * 0.7,
    // Stop just above the resting gap, so the reel opens in the fingertips
    // without rising into the copy above it.
    gapYEnd: phone ? phoneGapEnd : height * 0.62,
    // At rest the fingertips nearly touch, as in the fresco. Opening the reel
    // parts them until they meet its edges.
    sepRest: TIP_GAP * scale + width * (phone ? 0.014 : 0.012),
    sepEnd: phone ? TIP_GAP * scale + width * 0.12 : reelW * 0.94,
    reelW,
    pointerRadius: phone ? 0 : 110,
    pointerPush: 7,
  };
}

type Cells = {
  count: number;
  side: Uint8Array; // 0 left hand, 1 right hand
  rx: Float32Array; // resting position relative to the fingertip midpoint
  ry: Float32Array;
  group: Uint8Array;
  glyph: Uint8Array;
  base: Uint8Array;
  phase: Float32Array;
  delay: Float32Array;
  ox: Float32Array;
  oy: Float32Array;
  heat: Float32Array;
};

function buildCells(layout: Layout): Cells {
  const k = layout.scale;
  const cw = layout.cellW / k; // cell size in source pixels
  const ch = layout.cellH / k;
  const cols = Math.ceil(hands.crop.w / cw);
  const rows = Math.ceil(hands.crop.h / ch);
  const splitPx = SPLIT * SAMPLE;

  // Pass 1: area-average the map under every cell of the glyph grid.
  const grid = new Float32Array(cols * rows);
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const sx0 = gx * cw;
      const sy0 = gy * ch;
      // Cells that straddle the split are left empty so the fingertips
      // stay clean and the two hands never share a cell.
      if (sx0 < splitPx && sx0 + cw > splitPx) continue;
      const mx0 = Math.floor(sx0 / SAMPLE);
      const my0 = Math.floor(sy0 / SAMPLE);
      const mx1 = Math.min(MAP_COLS - 1, Math.floor((sx0 + cw) / SAMPLE));
      const my1 = Math.min(MAP_ROWS - 1, Math.floor((sy0 + ch) / SAMPLE));
      let total = 0;
      let samples = 0;
      for (let my = my0; my <= my1; my++) {
        for (let mx = mx0; mx <= mx1; mx++) {
          total += MAP[my * MAP_COLS + mx];
          samples++;
        }
      }
      grid[gy * cols + gx] = samples ? clamp(total / samples + (hash(gx, gy, 1) - 0.5) * 0.06) : 0;
    }
  }
  const at = (gx: number, gy: number) => (gx < 0 || gy < 0 || gx >= cols || gy >= rows ? 0 : grid[gy * cols + gx]);

  // Pass 2: one glyph per inked cell. Cells on the silhouette get an outline
  // glyph and more light; the interior gets texture.
  const max = cols * rows;
  const side = new Uint8Array(max);
  const rx = new Float32Array(max);
  const ry = new Float32Array(max);
  const group = new Uint8Array(max);
  const glyph = new Uint8Array(max);
  const base = new Uint8Array(max);
  const phase = new Float32Array(max);
  const delay = new Float32Array(max);
  const maxDist = Math.hypot(hands.crop.w, hands.crop.h) / 2;
  let n = 0;

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const v = grid[gy * cols + gx];
      if (v < THRESHOLD) continue;
      const left = at(gx - 1, gy) < THRESHOLD;
      const right = at(gx + 1, gy) < THRESHOLD;
      const up = at(gx, gy - 1) < THRESHOLD;
      const down = at(gx, gy + 1) < THRESHOLD;
      const edge = left || right || up || down;
      // Speckle the interior only, so the outline stays unbroken.
      if (!edge && hash(gx, gy, 2) < 0.1 * (1 - v)) continue;

      let g: number;
      let pick: number;
      let level = Math.round(clamp((v - THRESHOLD) / 0.7) * 4);
      if (edge) {
        g = EDGE_GROUP;
        // The density gradient points into the hand; the outline runs across it.
        const dx = at(gx + 1, gy) - at(gx - 1, gy);
        const dy = at(gx, gy + 1) - at(gx, gy - 1);
        if (Math.abs(dx) > Math.abs(dy) * 1.8) pick = EDGE.vertical;
        else if (Math.abs(dy) > Math.abs(dx) * 1.8) pick = dy > 0 ? EDGE.top : EDGE.bottom;
        else pick = dx * dy > 0 ? EDGE.falling : EDGE.rising;
        level = Math.min(LEVEL_ALPHA.length - 1, Math.max(level, 2) + 2);
      } else {
        g = hash(gx, gy, 3) < 0.3 ? STROKE_GROUP : Math.min(GROUPS.length - 1, Math.floor(v * GROUPS.length));
        const pool = g === STROKE_GROUP ? STROKES : GROUPS[g];
        pick = pool[Math.floor(hash(gx, gy, 4) * pool.length)];
        level = Math.min(LEVEL_ALPHA.length - 2, level);
      }

      const cx = gx * cw + cw / 2;
      const cy = gy * ch + ch / 2;
      side[n] = cx < splitPx ? 0 : 1;
      rx[n] = (cx - TIP_MID_X) * k;
      ry[n] = (cy - TIP_MID_Y) * k;
      group[n] = g;
      glyph[n] = pick;
      base[n] = level;
      phase[n] = hash(gx, gy, 5) * Math.PI * 2;
      // The intro spreads out from the fingertips.
      delay[n] = (Math.hypot(cx - TIP_MID_X, cy - TIP_MID_Y) / maxDist) * 0.9 + hash(gx, gy, 6) * 0.2;
      n++;
    }
  }
  return {
    count: n,
    side,
    rx,
    ry,
    group,
    glyph,
    base,
    phase,
    delay,
    ox: new Float32Array(n),
    oy: new Float32Array(n),
    heat: new Float32Array(n),
  };
}

function buildAtlas(layout: Layout) {
  const aw = Math.ceil(layout.cellW * layout.dpr) + 2;
  const ah = Math.ceil(layout.cellH * layout.dpr) + 2;
  const atlas = document.createElement("canvas");
  atlas.width = aw * CHARS.length;
  atlas.height = ah * LEVELS;
  const ctx = atlas.getContext("2d");
  if (!ctx) return { atlas, aw, ah };
  ctx.font = `500 ${layout.fontSize * layout.dpr}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let level = 0; level < LEVELS; level++) {
    let color: string;
    if (level < LEVEL_ALPHA.length) {
      color = `rgba(${AMBER[0]}, ${AMBER[1]}, ${AMBER[2]}, ${LEVEL_ALPHA[level]})`;
    } else {
      const t = (level - LEVEL_ALPHA.length + 1) / HOT_LEVELS;
      color = `rgb(${Math.round(lerp(AMBER[0], HOT[0], t))}, ${Math.round(lerp(AMBER[1], HOT[1], t))}, ${Math.round(lerp(AMBER[2], HOT[2], t))})`;
    }
    ctx.fillStyle = color;
    for (let i = 0; i < CHARS.length; i++) {
      ctx.fillText(CHARS[i], i * aw + aw / 2, level * ah + ah / 2);
    }
  }
  return { atlas, aw, ah };
}

export function initHero(opts: Options) {
  const { canvas, copy, meta, reel, reelFrame, reelCaption, reducedMotion, finePointer, onOpenChange } = opts;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;

  // The free band between the headline copy and the meta row, in canvas pixels.
  const measureBand = (): Band | null => {
    if (!copy || !meta) return null;
    const box = canvas.getBoundingClientRect();
    return { top: copy.getBoundingClientRect().bottom - box.top + 20, bottom: meta.getBoundingClientRect().top - box.top - 8 };
  };

  let layout = computeLayout(canvas.clientWidth, canvas.clientHeight, measureBand());
  let cells = buildCells(layout);
  let { atlas, aw, ah } = buildAtlas(layout);
  let progress = reducedMotion ? 1 : 0;
  let running = false;
  let visible = true;
  let raf = 0;
  let start = performance.now();
  const pointer = { x: -9999, y: -9999, active: false };
  let wasOpen: boolean | null = null;

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    layout = computeLayout(width, height, measureBand());
    canvas.width = Math.round(width * layout.dpr);
    canvas.height = Math.round(height * layout.dpr);
    cells = buildCells(layout);
    ({ atlas, aw, ah } = buildAtlas(layout));
    if (reducedMotion || !running) draw(performance.now(), true);
  }

  const openAt = (p: number) => easeInOut(clamp((p - 0.04) / 0.22));

  // How far the gap has opened for a given scroll progress: first a spark
  // widens between the fingertips (parting the hands), then it opens tall.
  function reelState(p: number) {
    const w = layout.reelW;
    const h = (w * 9) / 16;
    const line = easeInOut(clamp(p / 0.16));
    const open = openAt(p);
    const sep = lerp(layout.sepRest, layout.sepEnd, line);
    const curW = lerp(Math.min(26, layout.sepRest * 0.6), w, line);
    const curH = lerp(2, h, open);
    return { w, h, curW, curH, open, line, sep };
  }

  // The still frame (reduced motion) shows the reel already open. On a
  // desktop it sits in the resting gap, so the copy above stays clear; on a
  // phone the reel hangs below the gap, so it uses the open position, which
  // is where the reel clears the meta row.
  const gapYAt = (p: number) =>
    reducedMotion
      ? layout.phone
        ? layout.gapYEnd
        : layout.gapYRest
      : lerp(layout.gapYRest, layout.gapYEnd, layout.phone ? openAt(p) : easeInOut(clamp(p / 0.9)));

  // Top edge of the reel: centred on the gap, or (phones) hanging from it.
  const reelTop = (s: ReturnType<typeof reelState>, gapY: number) =>
    layout.phone ? gapY + layout.cellH : gapY - s.curH / 2;

  function placeReel(p: number, gapY: number) {
    const s = reelState(p);
    const x = layout.gapX - s.curW / 2;
    const y = reelTop(s, gapY);
    reel.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    reel.style.width = `${s.curW.toFixed(1)}px`;
    reel.style.height = `${s.curH.toFixed(1)}px`;
    reelFrame.style.width = `${s.w.toFixed(1)}px`;
    reelFrame.style.height = `${s.h.toFixed(1)}px`;
    const isOpen = s.open > 0.8;
    reel.dataset.open = isOpen ? "true" : "false";
    if (isOpen !== wasOpen) {
      wasOpen = isOpen;
      onOpenChange?.(isOpen);
    }
    if (reelCaption) {
      reelCaption.style.transform = `translate3d(${(layout.gapX - s.w / 2).toFixed(1)}px, ${(y + s.curH + 12).toFixed(1)}px, 0)`;
      reelCaption.style.width = `${s.w.toFixed(1)}px`;
      reelCaption.style.opacity = clamp((s.open - 0.55) / 0.35).toFixed(3);
    }
    return s;
  }

  function draw(now: number, still = false) {
    const t = (now - start) / 1000;
    const { width, height, dpr, gapX } = layout;
    const p = progress;
    const gapY = gapYAt(p);
    const s = placeReel(p, gapY);
    const shift = (s.sep - TIP_GAP * layout.scale) / 2;

    // The reel (and its caption, once shown) is a window cut out of the
    // field: cells under it are not drawn, cells just outside it dim.
    const cutting = s.line > 0.04;
    const pad = 4 + 8 * s.line;
    const feather = 18;
    const cx0 = gapX - s.curW / 2 - pad;
    const cx1 = gapX + s.curW / 2 + pad;
    const top = reelTop(s, gapY);
    const cy0 = top - (layout.phone ? 2 : pad);
    const cy1 = top + s.curH + pad + (s.open > 0.5 ? (layout.phone ? 52 : 30) * s.open : 0);

    const pr = layout.pointerRadius;
    const pointerOn = pointer.active && pr > 0 && !still;
    const introRunning = !still && t < 1.7;

    ctx!.setTransform(1, 0, 0, 1, 0, 0);
    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    const c = cells;
    if (!still) {
      // Re-roll a few interior glyphs each frame; outlines stay put.
      const reroll = Math.ceil(c.count * 0.01);
      for (let r = 0; r < reroll; r++) {
        const i = (Math.random() * c.count) | 0;
        if (c.group[i] === EDGE_GROUP) continue;
        const pool = c.group[i] === STROKE_GROUP ? STROKES : GROUPS[c.group[i]];
        c.glyph[i] = pool[(Math.random() * pool.length) | 0];
      }
    }

    for (let i = 0; i < c.count; i++) {
      const homeX = gapX + c.rx[i] + (c.side[i] === 0 ? -shift : shift);
      const homeY = gapY + c.ry[i];
      if (homeX < -16 || homeX > width + 16 || homeY < -16 || homeY > height + 16) continue;

      let level = c.base[i];
      if (cutting) {
        const outX = homeX < cx0 ? cx0 - homeX : homeX > cx1 ? homeX - cx1 : 0;
        const outY = homeY < cy0 ? cy0 - homeY : homeY > cy1 ? homeY - cy1 : 0;
        if (outX === 0 && outY === 0) continue;
        if (Math.max(outX, outY) < feather) level -= 2;
      }

      // Near the cursor glyphs light up and lean away a little.
      let tx = 0;
      let ty = 0;
      let heat = 0;
      if (pointerOn) {
        const dx = homeX - pointer.x;
        const dy = homeY - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < pr * pr) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / pr) * (1 - d / pr);
          tx = (dx / d) * f * layout.pointerPush;
          ty = (dy / d) * f * layout.pointerPush;
          heat = f;
          if (f > 0.3 && c.group[i] !== EDGE_GROUP && Math.random() < 0.08) {
            const pool = c.group[i] === STROKE_GROUP ? STROKES : GROUPS[c.group[i]];
            c.glyph[i] = pool[(Math.random() * pool.length) | 0];
          }
        }
      }
      if (still) {
        c.ox[i] = 0;
        c.oy[i] = 0;
        c.heat[i] = 0;
      } else {
        c.ox[i] += (tx - c.ox[i]) * 0.16;
        c.oy[i] += (ty - c.oy[i]) * 0.16;
        c.heat[i] += (heat - c.heat[i]) * 0.14;
      }

      let x = homeX + c.ox[i];
      let y = homeY + c.oy[i];
      let alpha = 1;
      if (introRunning) {
        alpha = easeOut(clamp((t - c.delay[i]) / 0.6));
        if (alpha <= 0) continue;
        // Glyphs settle in from a short drift.
        const drift = (1 - alpha) * 18;
        x += Math.cos(c.phase[i]) * drift;
        y += Math.sin(c.phase[i]) * drift;
      }

      // A slow travelling shimmer across the interior.
      if (!still && c.group[i] !== EDGE_GROUP) {
        const wave = Math.sin(homeX * 0.012 - t * 1.4 + c.phase[i] * 0.6);
        if (wave > 0.82) level += 1;
        else if (wave < -0.9) level -= 1;
      }
      const h = c.heat[i];
      if (h > 0.5) level = LEVEL_ALPHA.length + 1;
      else if (h > 0.22) level = LEVEL_ALPHA.length;
      else if (h > 0.06) level = Math.max(level, LEVEL_ALPHA.length - 1);
      level = level < 0 ? 0 : level >= LEVELS ? LEVELS - 1 : level;

      if (introRunning) ctx!.globalAlpha = alpha;
      ctx!.drawImage(
        atlas,
        c.glyph[i] * aw,
        level * ah,
        aw,
        ah,
        Math.round(x * dpr - aw / 2),
        Math.round(y * dpr - ah / 2),
        aw,
        ah,
      );
    }
    if (introRunning) ctx!.globalAlpha = 1;
  }

  function frame(now: number) {
    if (!running) return;
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  function play() {
    if (running || reducedMotion || !visible || document.hidden) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(raf);
  }

  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  // The copy reflows when the fonts arrive, which moves the free band.
  if (copy) ro.observe(copy);

  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) play();
    else pause();
  });
  io.observe(canvas);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
    else play();
  });

  if (finePointer && !reducedMotion) {
    const host = canvas.parentElement ?? canvas;
    host.addEventListener("pointermove", (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    });
    host.addEventListener("pointerleave", () => {
      pointer.active = false;
    });
  }

  resize();
  start = performance.now();
  if (reducedMotion) draw(start, true);
  else play();

  return {
    setProgress(p: number) {
      progress = clamp(p);
      if (!running) draw(performance.now(), reducedMotion);
    },
    reelOpenAt(p: number) {
      return reelState(p).open;
    },
  };
}
