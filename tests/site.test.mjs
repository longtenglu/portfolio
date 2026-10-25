// @ts-check
// Browser checks for the built site. `npm test` builds first, then this
// serves dist/ on a free local port and drives the local Chrome through
// playwright-core. Hosted media requests are blocked, so the checks run
// offline and only exercise the page's own behaviour.

import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { findChrome } from "../scripts/lib/chrome.mjs";
import { serveDir } from "../scripts/lib/static.mjs";

const DIST = fileURLToPath(new URL("../dist", import.meta.url));
const HERO_TITLE = "20th Anniversary Dinner Reception";

/** @type {{ port: number, close: () => Promise<void> }} */
let server;
/** @type {import("playwright-core").Browser} */
let browser;

before(async () => {
  server = await serveDir(path.resolve(DIST));
  browser = await chromium.launch({ executablePath: findChrome() });
});

after(async () => {
  await browser?.close();
  await server?.close();
});

/**
 * @param {{ reducedMotion?: "reduce" | "no-preference", viewport?: { width: number, height: number } }} [opts]
 */
async function openHome(opts = {}) {
  const context = await browser.newContext({
    viewport: opts.viewport ?? { width: 1440, height: 900 },
    reducedMotion: opts.reducedMotion ?? "no-preference",
  });
  await context.route(/blob\.vercel-storage\.com/, (route) => route.abort());
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.port}/`);
  // The hero starts once the mono font is in, then reports the reel state.
  await page.waitForFunction(() => document.querySelector("[data-reel]")?.getAttribute("data-open") !== null);
  return { context, page };
}

/** @param {import("playwright-core").Page} page */
function describeFocus(page) {
  return page.evaluate(() => {
    const el = /** @type {HTMLElement | null} */ (document.activeElement);
    if (!el || el === document.body) return null;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      restCta: el.hasAttribute("data-reel-rest-cta"),
      reelFrame: el.hasAttribute("data-reel-frame"),
      inert: Boolean(el.closest("[inert]")),
      visible: rect.width >= 16 && rect.height >= 16 && Number(style.opacity) > 0.5,
      outline: style.outlineStyle,
    };
  });
}

/**
 * Presses Tab until the predicate matches the focused element, recording
 * every stop on the way.
 * @param {import("playwright-core").Page} page
 * @param {(f: NonNullable<Awaited<ReturnType<typeof describeFocus>>>) => boolean} match
 */
async function tabUntil(page, match) {
  const stops = [];
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    const focus = await describeFocus(page);
    if (!focus) continue;
    stops.push(focus);
    if (match(focus)) return { found: focus, stops };
  }
  return { found: null, stops };
}

/** @param {import("playwright-core").Page} page */
async function scrollIntroToEnd(page) {
  await page.evaluate(() => {
    const intro = /** @type {HTMLElement} */ (document.querySelector("[data-intro]"));
    window.scrollTo(0, intro.offsetHeight - window.innerHeight);
  });
  await page.waitForFunction(() => document.querySelector("[data-reel]")?.getAttribute("data-open") === "true");
}

/** @param {import("playwright-core").Page} page */
const videoDialog = (page) =>
  page.evaluate(() => {
    const dialog = /** @type {HTMLDialogElement} */ (document.querySelector("[data-video-modal]"));
    return { open: dialog.open, title: dialog.querySelector("[data-video-title]")?.textContent ?? "" };
  });

/**
 * @param {import("playwright-core").Page} page
 * @param {number} progress
 */
async function scrollHeroTo(page, progress) {
  await page.evaluate((p) => {
    const intro = /** @type {HTMLElement} */ (document.querySelector("[data-intro]"));
    window.scrollTo(0, (intro.offsetHeight - window.innerHeight) * p);
  }, progress);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

/** @param {import("playwright-core").Page} page */
const heroGeometry = (page) =>
  page.evaluate(() => {
    /** @param {string} selector */
    const rect = (selector) => {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`missing ${selector}`);
      return el.getBoundingClientRect();
    };
    const reel = rect("[data-reel]");
    return {
      copyBottom: rect("[data-hero-copy]").bottom,
      reelTop: reel.top,
      reelBottom: reel.bottom,
      reelWidth: reel.width,
      reelHeight: reel.height,
      captionBottom: rect("[data-reel-caption]").bottom,
      metaTop: rect("[data-hero-meta]").top,
    };
  });

/**
 * Count the pixels the hero canvas has painted behind the headline copy and
 * behind the meta row, which the hands must stay clear of on a phone.
 * @param {import("playwright-core").Page} page
 */
const handPixelsOverText = (page) =>
  page.evaluate(() => {
    const canvas = /** @type {HTMLCanvasElement} */ (document.querySelector("[data-hero-canvas]"));
    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));
    const box = canvas.getBoundingClientRect();
    const scale = canvas.height / box.height;
    /** @param {string} selector */
    const painted = (selector) => {
      const el = /** @type {HTMLElement} */ (document.querySelector(selector));
      const rect = el.getBoundingClientRect();
      const top = Math.max(0, Math.floor((rect.top - box.top) * scale));
      const bottom = Math.min(canvas.height, Math.ceil((rect.bottom - box.top) * scale));
      if (bottom <= top) return 0;
      const data = ctx.getImageData(0, top, canvas.width, bottom - top).data;
      let count = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) count++;
      return count;
    };
    return { overCopy: painted("[data-hero-copy]"), overMeta: painted("[data-hero-meta]") };
  });

/**
 * @param {Awaited<ReturnType<typeof heroGeometry>>} geometry
 * @param {string} viewport
 */
function assertOpenReelUsable(geometry, viewport) {
  const fullHeight = (geometry.reelWidth * 9) / 16;
  assert.ok(
    geometry.reelWidth >= 160,
    `${viewport}: the open reel is at least 160px wide: ${geometry.reelWidth}`,
  );
  assert.ok(
    geometry.reelHeight >= fullHeight * 0.75 && geometry.reelHeight <= fullHeight + 1,
    `${viewport}: the open reel is a real 16:9 frame: ${geometry.reelWidth}x${geometry.reelHeight}`,
  );
}

/**
 * @param {import("playwright-core").Page} page
 * @param {string} viewport
 */
async function assertOpenHeroClears(page, viewport) {
  assert.equal(await page.getAttribute("[data-reel]", "data-open"), "false", `${viewport}: the reel starts closed`);

  await scrollHeroTo(page, 0.18);
  await page.waitForFunction(() => document.querySelector("[data-reel]")?.getAttribute("data-open") === "true");
  const firstOpen = await heroGeometry(page);
  assertOpenReelUsable(firstOpen, viewport);
  assert.ok(
    firstOpen.reelTop >= firstOpen.copyBottom,
    `${viewport}: the open reel starts below the copy: reel ${firstOpen.reelTop}, copy ${firstOpen.copyBottom}`,
  );
  assert.ok(
    firstOpen.reelBottom <= firstOpen.metaTop,
    `${viewport}: the open reel clears the meta row: reel ${firstOpen.reelBottom}, meta ${firstOpen.metaTop}`,
  );
  assert.ok(
    firstOpen.captionBottom <= firstOpen.metaTop,
    `${viewport}: the caption clears the meta row: caption ${firstOpen.captionBottom}, meta ${firstOpen.metaTop}`,
  );

  await scrollHeroTo(page, 1);
  await page.waitForFunction(() => document.querySelector("[data-reel]")?.getAttribute("data-open") === "true");
  const end = await heroGeometry(page);
  assertOpenReelUsable(end, viewport);
  assert.ok(
    end.reelTop >= end.copyBottom,
    `${viewport}: the fully open reel starts below the copy: reel ${end.reelTop}, copy ${end.copyBottom}`,
  );
  assert.ok(
    end.reelBottom <= end.metaTop,
    `${viewport}: the fully open reel clears the meta row: reel ${end.reelBottom}, meta ${end.metaTop}`,
  );
  assert.ok(
    end.captionBottom <= end.metaTop,
    `${viewport}: the full caption clears the meta row: caption ${end.captionBottom}, meta ${end.metaTop}`,
  );
}

/**
 * @param {import("playwright-core").Page} page
 * @param {string} viewport
 */
async function assertRestTriggerWorks(page, viewport) {
  assert.equal(await page.getAttribute("[data-reel]", "data-open"), "false", `${viewport}: the reel starts closed`);

  await scrollHeroTo(page, 0.18);
  assert.equal(
    await page.getAttribute("[data-reel]", "data-open"),
    "false",
    `${viewport}: the reel stays closed at the first open frame`,
  );

  await scrollHeroTo(page, 1);
  assert.equal(
    await page.getAttribute("[data-reel]", "data-open"),
    "false",
    `${viewport}: the reel stays closed at full scroll`,
  );

  const state = await page.evaluate(() => {
    const cta = /** @type {HTMLElement} */ (document.querySelector("[data-reel-rest-cta]"));
    const frame = /** @type {HTMLElement} */ (document.querySelector("[data-reel-frame]"));
    const box = cta.getBoundingClientRect();
    const style = getComputedStyle(cta);
    return {
      ctaInert: cta.inert,
      frameInert: frame.inert,
      ctaVisible: box.width >= 16 && box.height >= 16 && Number(style.opacity) > 0.5,
    };
  });
  assert.equal(state.ctaInert, false, `${viewport}: the rest button stays active`);
  assert.equal(state.frameInert, true, `${viewport}: the unusable reel is inert`);
  assert.ok(state.ctaVisible, `${viewport}: the rest button is visible`);

  const { found } = await tabUntil(page, (f) => f.restCta);
  assert.ok(found && !found.inert && found.visible, `${viewport}: the rest button is focusable`);
  await page.keyboard.press("Enter");
  assert.deepEqual(await videoDialog(page), { open: true, title: HERO_TITLE });
}

describe("hero reel, keyboard and pointer access", () => {
  test("at rest the closed reel is skipped and the visible button is the keyboard path", async () => {
    const { context, page } = await openHome();
    try {
      assert.equal(await page.getAttribute("[data-reel]", "data-open"), "false");
      const { found, stops } = await tabUntil(page, (f) => f.restCta);
      assert.ok(found, "Tab reaches the Watch the film button");
      assert.ok(!stops.some((f) => f.reelFrame), "Tab never lands on the closed reel");
      assert.ok(stops.every((f) => !f.inert), "Tab never lands inside an inert element");
      assert.ok(found.visible, "the focused button is visible");
      assert.notEqual(found.outline, "none", "the focused button shows a focus ring");

      // The sliver of reel between the fingertips takes no clicks.
      const hit = await page.evaluate(() => {
        const r = /** @type {HTMLElement} */ (document.querySelector("[data-reel]")).getBoundingClientRect();
        const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return Boolean(el?.closest("[data-reel-frame]"));
      });
      assert.equal(hit, false);
    } finally {
      await context.close();
    }
  });

  test("on a 375x667 phone the open reel and caption clear the meta row", async () => {
    const { context, page } = await openHome({ viewport: { width: 375, height: 667 } });
    try {
      await assertOpenHeroClears(page, "375x667");
    } finally {
      await context.close();
    }
  });

  test("on a 390x844 phone the open reel and caption clear the meta row", async () => {
    const { context, page } = await openHome({ viewport: { width: 390, height: 844 } });
    try {
      await assertOpenHeroClears(page, "390x844");
    } finally {
      await context.close();
    }
  });

  test("on a 375x553 phone the narrow band keeps the rest button as the trigger", async () => {
    const { context, page } = await openHome({ viewport: { width: 375, height: 553 } });
    try {
      await assertRestTriggerWorks(page, "375x553");
    } finally {
      await context.close();
    }
  });

  test("on a 320x568 phone the narrow band keeps the rest button as the trigger", async () => {
    const { context, page } = await openHome({ viewport: { width: 320, height: 568 } });
    try {
      await assertRestTriggerWorks(page, "320x568");
    } finally {
      await context.close();
    }
  });

  test("on phones the hands are never painted over the headline copy or the meta row", async () => {
    for (const [width, height] of [
      [320, 568],
      [375, 553],
      [375, 667],
      [390, 844],
    ]) {
      const viewport = `${width}x${height}`;
      const { context, page } = await openHome({ viewport: { width, height } });
      try {
        for (const progress of [0, 0.18, 1]) {
          await scrollHeroTo(page, progress);
          const painted = await handPixelsOverText(page);
          assert.deepEqual(painted, { overCopy: 0, overMeta: 0 }, `${viewport} at progress ${progress}`);
        }
      } finally {
        await context.close();
      }
    }
  });

  test("Enter on the button plays the film and Escape returns focus to it", async () => {
    const { context, page } = await openHome();
    try {
      await tabUntil(page, (f) => f.restCta);
      await page.keyboard.press("Enter");
      assert.deepEqual(await videoDialog(page), { open: true, title: HERO_TITLE });
      await page.keyboard.press("Escape");
      assert.equal((await videoDialog(page)).open, false);
      const focus = await describeFocus(page);
      assert.ok(focus?.restCta && focus.visible, "focus is back on the visible button");
    } finally {
      await context.close();
    }
  });

  test("once the reel is open the reel itself is the trigger", async () => {
    const { context, page } = await openHome();
    try {
      await scrollIntroToEnd(page);
      const state = await page.evaluate(() => ({
        frameInert: /** @type {HTMLElement} */ (document.querySelector("[data-reel-frame]")).inert,
        ctaInert: /** @type {HTMLElement} */ (document.querySelector("[data-reel-rest-cta]")).inert,
      }));
      assert.deepEqual(state, { frameInert: false, ctaInert: true });

      const { found, stops } = await tabUntil(page, (f) => f.reelFrame);
      assert.ok(found && !found.inert, "Tab reaches the open reel");
      assert.ok(!stops.some((f) => f.restCta), "the hidden button is skipped");

      await page.keyboard.press("Enter");
      assert.deepEqual(await videoDialog(page), { open: true, title: HERO_TITLE });
      await page.keyboard.press("Escape");
      assert.equal((await describeFocus(page))?.reelFrame, true, "focus returns to the reel");
    } finally {
      await context.close();
    }
  });

  test("closing the video never leaves focus on an inert or hidden control", async () => {
    const { context, page } = await openHome();
    try {
      await scrollIntroToEnd(page);
      await tabUntil(page, (f) => f.reelFrame);
      await page.keyboard.press("Enter");
      assert.equal((await videoDialog(page)).open, true);
      // The control that opened the video becomes unusable while it plays.
      await page.evaluate(() => {
        /** @type {HTMLElement} */ (document.querySelector("[data-reel-frame]")).inert = true;
      });
      await page.keyboard.press("Escape");
      // The dialog's close event is async; wait for the handler to move focus.
      await page.waitForFunction(
        () => !document.querySelector("[data-video-modal]")?.contains(document.activeElement),
        undefined,
        { timeout: 3000 },
      );
      const focus = await describeFocus(page);
      assert.ok(focus, "something on the page has focus");
      assert.equal(focus.inert, false);
      assert.equal(focus.visible, true);
    } finally {
      await context.close();
    }
  });
});

describe("positioning and de-templating", () => {
  test("the page names the roles, the availability line and the share card", async () => {
    const { context, page } = await openHome();
    try {
      const text = await page.evaluate(() => document.body.innerText);
      assert.match(text, /Programme Executive at Tax Academy of Singapore since March 2026\./);
      assert.match(text, /Open to marketing, communications and programme roles in Singapore\./);
      assert.doesNotMatch(text, /aspiring/i);
      assert.equal((text.match(/Produced at Tax Academy of Singapore/g) ?? []).length, 1);
      const nav = await page.$$eval(".header__nav a", (links) => links.map((a) => a.textContent?.trim()));
      assert.ok(nav.includes("Experience"), "Experience is in the navigation");
      const share = await page.evaluate(() => ({
        og: document.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? "",
        twitter: document.querySelector('meta[name="twitter:card"]')?.getAttribute("content") ?? "",
      }));
      assert.match(share.og, /\/og\.png$/);
      assert.equal(share.twitter, "summary_large_image");
    } finally {
      await context.close();
    }
  });
});

describe("fact strip", () => {
  test("starts on its first phrase once fonts load, and carries facts only", async () => {
    const { context, page } = await openHome();
    try {
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);
      const strip = await page.evaluate(() => ({
        left: document.querySelector(".strip__phrase")?.getBoundingClientRect().left ?? NaN,
        first: document.querySelector(".strip__phrase")?.textContent?.trim() ?? "",
        text: document.querySelector(".strip .visually-hidden")?.textContent?.trim() ?? "",
      }));
      assert.ok(Math.abs(strip.left) <= 1, `first phrase starts at the left edge, not ${strip.left}px`);
      assert.equal(strip.first, "ABOUT 70 VIDEOS");
      assert.equal(
        strip.text,
        "ABOUT 70 VIDEOS • ABOUT 10 PROGRAMMES AND EVENTS • ABOUT 50 MADE WITH AN AI-ASSISTED WORKFLOW • SINGAPORE",
      );
    } finally {
      await context.close();
    }
  });
});

describe("reduced motion", () => {
  test("the still hero shows the reel open, and it is the only trigger", async () => {
    const { context, page } = await openHome({ reducedMotion: "reduce" });
    try {
      assert.equal(await page.getAttribute("[data-reel]", "data-open"), "true");
      const { found, stops } = await tabUntil(page, (f) => f.reelFrame);
      assert.ok(found && !found.inert);
      assert.ok(!stops.some((f) => f.restCta));
    } finally {
      await context.close();
    }
  });

  test("an open dialog stops the page scrolling behind it without smooth scroll", async () => {
    const { context, page } = await openHome({ reducedMotion: "reduce" });
    try {
      await page.keyboard.press("Backquote");
      await page.waitForFunction(() => document.querySelector("dialog[data-terminal]")?.hasAttribute("open"));
      const locked = await page.evaluate(() => ({
        lenis: document.documentElement.classList.contains("lenis"),
        overflow: getComputedStyle(document.documentElement).overflowY,
      }));
      assert.equal(locked.lenis, false, "smooth scroll is off under reduced motion");
      assert.ok(["hidden", "clip"].includes(locked.overflow), `page overflow is ${locked.overflow}`);

      const before = await page.evaluate(() => window.scrollY);
      await page.mouse.move(40, 450);
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => window.scrollY), before, "the page did not scroll");
    } finally {
      await context.close();
    }
  });
});
