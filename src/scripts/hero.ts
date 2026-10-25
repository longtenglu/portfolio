// The hero: Michelangelo's two reaching hands drawn in code characters on a
// canvas, with the video reel opening in the gap between the fingertips.
//
// The hands come from a density map built at dev time from the public-domain
// Commons photo (scripts/hero/build-hands.mjs). Each frame draws a few
// thousand glyphs from a pre-tinted atlas. Glyphs re-roll and shimmer, scatter
// away from the cursor and settle back, and as the page scrolls the hands
// drift together while the reel opens between them, pushing nearby glyphs
// aside.

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

// Atlas rows: six resting brightness levels, then two hot levels used near
// the cursor.
const LEVEL_ALPHA = [0.26, 0.36, 0.48, 0.62, 0.78, 0.94];
const HOT_LEVELS = 2;
const LEVELS = LEVEL_ALPHA.length + HOT_LEVELS;

type Options = {
  canvas: HTMLCanvasElement;
  reel: HTMLElement;
  reelFrame: HTMLElement;
  reelCaption: HTMLElement | null;
  reducedMotion: boolean;
  finePointer: boolean;
};

type Layout = {
  // On phones the reel opens below the fingertips instead of between them,
  // so the hands stay in view.
  reelBelow: boolean;
  width: number;
  height: number;
  dpr: number;
  fontSize: number;
  cellW: number;
  cellH: number;
  gapX: number;
  gapYRest: number;
  gapYEnd: number;
  sepRest: number;
  sepEnd: number;
  reelW: number;
  reelH: number;
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
// The midpoint between the two fingertips, in source pixels of the crop.
const TIP_MID_X = ((hands.tips.left[0] + hands.tips.right[0]) / 2 + 0.5) * SAMPLE;
const TIP_MID_Y = ((hands.tips.left[1] + hands.tips.right[1]) / 2 + 0.5) * SAMPLE;
const TIP_GAP = (hands.tips.right[0] - hands.tips.left[0]) * SAMPLE;

function computeLayout(width: number, height: number): Layout {
  const phone = width < 640;
  const tablet = !phone && width < 1024;
  const dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.75 : 2);
  const fontSize = clamp(width / 128, 8, 12);
  return {
    reelBelow: phone,
    width,
    height,
    dpr,
    fontSize,
    cellW: fontSize * 0.62,
    cellH: fontSize * 1.16,
    gapX: width * 0.5,
    // At rest the hands sit low, under the name; they rise to the middle as
    // the reel opens.
    gapYRest: height * (phone ? 0.6 : 0.66),
    gapYEnd: height * (phone ? 0.3 : 0.5),
    // Hands start apart and drift together as the page scrolls.
    sepRest: width * (phone ? 0.16 : tablet ? 0.17 : 0.15),
    sepEnd: width * (phone ? 0.08 : 0.07),
    reelW: phone ? width * 0.84 : tablet ? width * 0.46 : Math.min(width * 0.34, 620),
    reelH: 0,
    pointerRadius: phone ? 0 : 120,
    pointerPush: 30,
  };
}

// How many CSS pixels one source pixel of the fresco covers.
function bandScale(width: number) {
  if (width < 640) return (width * 2.75) / hands.crop.w;
  if (width < 1024) return (width * 1.35) / hands.crop.w;
  return (width * 0.98) / hands.crop.w;
}

type Cells = {
  count: number;
  side: Uint8Array; // 0 left hand, 1 right hand
  rx: Float32Array; // resting position relative to the fingertip midpoint
  ry: Float32Array;
  dens: Float32Array;
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
  const k = bandScale(layout.width);
  const cw = layout.cellW / k; // cell size in source pixels
  const ch = layout.cellH / k;
  const cols = Math.ceil(hands.crop.w / cw);
  const rows = Math.ceil(hands.crop.h / ch);
  const max = cols * rows;
  const side = new Uint8Array(max);
  const rx = new Float32Array(max);
  const ry = new Float32Array(max);
  const dens = new Float32Array(max);
  const group = new Uint8Array(max);
  const glyph = new Uint8Array(max);
  const base = new Uint8Array(max);
  const phase = new Float32Array(max);
  const delay = new Float32Array(max);
  let n = 0;
  const splitPx = SPLIT * SAMPLE;
  const maxDist = Math.hypot(hands.crop.w, hands.crop.h) / 2;

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const sx0 = gx * cw;
      const sy0 = gy * ch;
      const cx = sx0 + cw / 2;
      // A cell belongs to the hand on its side of the split; cells that
      // straddle it are skipped so the fingertips stay clean.
      const isLeft = sx0 + cw <= splitPx;
      const isRight = sx0 >= splitPx;
      if (!isLeft && !isRight) continue;
      // Area-average the map samples under this cell.
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
      let v = samples ? total / samples : 0;
      v = clamp(v + (hash(gx, gy, 1) - 0.5) * 0.14);
      if (v < 0.12) continue;
      // Punch occasional holes so the hand reads as grain, not a slab.
      if (hash(gx, gy, 2) < 0.15 * (1 - v * 0.75)) continue;
      const g = hash(gx, gy, 3) < 0.34 ? 6 : Math.min(5, Math.floor(v * 6));
      side[n] = isLeft ? 0 : 1;
      rx[n] = (cx - TIP_MID_X) * k;
      ry[n] = (sy0 + ch / 2 - TIP_MID_Y) * k;
      dens[n] = v;
      group[n] = g;
      const pool = g === 6 ? STROKES : GROUPS[g];
      glyph[n] = pool[Math.floor(hash(gx, gy, 4) * pool.length)];
      base[n] = Math.min(LEVEL_ALPHA.length - 2, Math.round(v * (LEVEL_ALPHA.length - 2)));
      phase[n] = hash(gx, gy, 5) * Math.PI * 2;
      // The intro spreads out from the fingertips.
      delay[n] = (Math.hypot(cx - TIP_MID_X, sy0 - TIP_MID_Y) / maxDist) * 0.9 + hash(gx, gy, 6) * 0.25;
      n++;
    }
  }
  return {
    count: n,
    side,
    rx,
    ry,
    dens,
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
  const { canvas, reel, reelFrame, reelCaption, reducedMotion, finePointer } = opts;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;

  let layout = computeLayout(canvas.clientWidth, canvas.clientHeight);
  let cells = buildCells(layout);
  let { atlas, aw, ah } = buildAtlas(layout);
  let progress = reducedMotion ? 1 : 0;
  let running = false;
  let visible = true;
  let raf = 0;
  let start = performance.now();
  const pointer = { x: -9999, y: -9999, active: false };

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    layout = computeLayout(width, height);
    canvas.width = Math.round(width * layout.dpr);
    canvas.height = Math.round(height * layout.dpr);
    cells = buildCells(layout);
    ({ atlas, aw, ah } = buildAtlas(layout));
    if (reducedMotion || !running) draw(performance.now(), true);
  }

  // Where the reel sits and how far it has opened, for a given progress.
  function reelState(p: number) {
    const w = layout.reelW;
    const h = (w * 9) / 16;
    // First a thin line spreads between the fingertips, then it opens.
    const line = easeInOut(clamp(p / 0.42));
    const open = easeInOut(clamp((p - 0.32) / 0.5));
    const curW = lerp(Math.min(28, w), w, line);
    const curH = lerp(2, h, open);
    return { w, h, curW, curH, open, line, cy: 0 };
  }

  // The still frame (reduced motion) keeps the hands at rest height, under
  // the copy, with the reel already open between them.
  const gapYAt = (p: number) => {
    if (reducedMotion) return layout.gapYRest - (layout.reelBelow ? layout.height * 0.05 : 0);
    return lerp(layout.gapYRest, layout.gapYEnd, easeInOut(clamp(p / 0.9)));
  };

  // Vertical centre of the reel: in the gap, or sliding down below it.
  function reelCenterY(p: number, gapY: number, h: number) {
    if (!layout.reelBelow) return gapY;
    return gapY + (h / 2 + 64) * easeInOut(clamp(p / 0.4));
  }

  function placeReel(p: number, gapY: number) {
    const s = reelState(p);
    const cy = reelCenterY(p, gapY, s.h);
    const x = layout.gapX - s.curW / 2;
    const y = cy - s.curH / 2;
    reel.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    reel.style.width = `${s.curW.toFixed(1)}px`;
    reel.style.height = `${s.curH.toFixed(1)}px`;
    reelFrame.style.width = `${s.w.toFixed(1)}px`;
    reelFrame.style.height = `${s.h.toFixed(1)}px`;
    reel.dataset.open = s.open > 0.98 ? "true" : "false";
    reel.style.setProperty("--reel-open", s.open.toFixed(3));
    Object.assign(s, { cy });
    if (reelCaption) {
      reelCaption.style.transform = `translate3d(${(layout.gapX - s.w / 2).toFixed(1)}px, ${(cy + s.h / 2 + 12).toFixed(1)}px, 0)`;
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
    const sep = lerp(layout.sepRest, layout.sepEnd, easeInOut(clamp(p / 0.85)));
    const shift = (sep - TIP_GAP * bandScale(width)) / 2;
    const rx0 = gapX - s.curW / 2;
    const rx1 = gapX + s.curW / 2;
    const ry0 = s.cy - s.curH / 2;
    // Keep the caption under the reel clear too, once it shows.
    const ry1 = s.cy + s.curH / 2 + (s.open > 0.5 ? 30 * s.open : 0);
    const margin = 8 + 12 * s.open;
    const reelActive = s.open > 0.02 || s.line > 0.5;
    const pr = layout.pointerRadius;
    const pointerOn = pointer.active && pr > 0 && !still;
    const intro = still ? 1 : clamp(t / 1.6);
    const introRunning = intro < 1;

    ctx!.setTransform(1, 0, 0, 1, 0, 0);
    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    const c = cells;
    const reroll = still ? 0 : Math.ceil(c.count * 0.01);
    for (let r = 0; r < reroll; r++) {
      const i = (Math.random() * c.count) | 0;
      const pool = c.group[i] === 6 ? STROKES : GROUPS[c.group[i]];
      c.glyph[i] = pool[(Math.random() * pool.length) | 0];
    }

    for (let i = 0; i < c.count; i++) {
      const baseX = gapX + c.rx[i] + (c.side[i] === 0 ? -shift : shift);
      const baseY = gapY + c.ry[i];
      let tx = 0;
      let ty = 0;
      let heat = 0;

      {
        if (pointerOn) {
          const dx = baseX + c.ox[i] - pointer.x;
          const dy = baseY + c.oy[i] - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < pr * pr) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / pr) * (1 - d / pr);
            tx += (dx / d) * f * layout.pointerPush * (0.6 + c.dens[i]);
            ty += (dy / d) * f * layout.pointerPush * (0.6 + c.dens[i]);
            heat = f;
          }
        }
        if (reelActive) {
          // Glyphs inside the opening reel are pushed to its nearest edge.
          const x = baseX;
          const y = baseY;
          if (x > rx0 - margin && x < rx1 + margin && y > ry0 - margin && y < ry1 + margin) {
            // Out through the nearest edge, plus a little scatter so the
            // displaced glyphs spray rather than stack in a line.
            const left = rx0 - margin - x;
            const right = rx1 + margin - x;
            const up = ry0 - margin - y;
            const down = ry1 + margin - y;
            const extra = (0.5 + 0.5 * Math.sin(c.phase[i] * 3.1)) * 22 * s.open;
            if (Math.min(-left, right) < Math.min(-up, down)) tx += -left < right ? left - extra : right + extra;
            else ty += -up < down ? up - extra : down + extra;
          }
        }
        if (still) {
          // A still frame lands straight on the target.
          c.ox[i] = tx;
          c.oy[i] = ty;
          c.heat[i] = 0;
        } else {
          // Spring towards the target offset.
          c.ox[i] += (tx - c.ox[i]) * 0.14;
          c.oy[i] += (ty - c.oy[i]) * 0.14;
          c.heat[i] += (heat - c.heat[i]) * 0.12;
        }
      }

      let x = baseX + c.ox[i];
      let y = baseY + c.oy[i];
      let alpha = 1;
      if (introRunning) {
        const local = easeOut(clamp((t - c.delay[i]) / 0.7));
        alpha = local;
        if (local <= 0) continue;
        // Glyphs settle in from a small scatter.
        const spread = (1 - local) * 40;
        x += Math.cos(c.phase[i]) * spread;
        y += Math.sin(c.phase[i]) * spread;
      }
      if (x < -20 || x > width + 20 || y < -20 || y > height + 20) continue;

      // A slow travelling shimmer across the field.
      let level = c.base[i];
      if (!still) {
        const wave = Math.sin(baseX * 0.012 - t * 1.4 + c.phase[i] * 0.6);
        if (wave > 0.82) level += 1;
        else if (wave < -0.9) level -= 1;
      }
      // Glyphs the reel has shoved aside fade back, so the piles along its
      // edges stay quiet instead of stacking into a bright wall.
      if (Math.abs(c.ox[i]) + Math.abs(c.oy[i]) > 10 && c.heat[i] < 0.2) level -= 2;
      const h = c.heat[i];
      if (h > 0.55) level = LEVEL_ALPHA.length + 1;
      else if (h > 0.25) level = LEVEL_ALPHA.length;
      else if (h > 0.08) level = Math.max(level, LEVEL_ALPHA.length - 1);
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

    // Phones: a thin line ties the fingertips to the reel below them.
    if (layout.reelBelow && s.line > 0.02) {
      const top = gapY + 6;
      const bottom = s.cy - s.curH / 2 - 2;
      if (bottom > top) {
        ctx!.fillStyle = `rgba(${AMBER[0]}, ${AMBER[1]}, ${AMBER[2]}, ${(0.7 * clamp(s.line * 2)).toFixed(3)})`;
        ctx!.fillRect(Math.round(gapX * dpr), Math.round(top * dpr), Math.max(1, Math.round(dpr)), Math.round((bottom - top) * dpr));
      }
    }
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
