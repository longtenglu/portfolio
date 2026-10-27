// @ts-check
// Browser checks for the built site. `npm test` builds first, then this
// serves dist/ on a free local port and drives the local Chrome through
// playwright-core. Hosted media requests are blocked, so the checks run
// offline and only exercise the page's own behaviour.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { findChrome } from "../scripts/lib/chrome.mjs";
import { serveDir } from "../scripts/lib/static.mjs";

const DIST = fileURLToPath(new URL("../dist", import.meta.url));
const FILM_TITLE = "China trip recap";

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
 * Opens the home page without waiting for the hero, which starts on its own
 * font clock.
 * @param {{ reducedMotion?: "reduce" | "no-preference", width?: number, height?: number, holdFonts?: boolean }} [opts]
 */
async function openPage(opts = {}) {
  const context = await browser.newContext({
    viewport: { width: opts.width ?? 1440, height: opts.height ?? 900 },
    reducedMotion: opts.reducedMotion ?? "no-preference",
  });
  await context.route(/blob\.vercel-storage\.com/, (route) => route.abort());
  /** @type {import("playwright-core").Route[]} */
  const fonts = [];
  if (opts.holdFonts) await context.route(/\.woff2$/, (route) => void fonts.push(route));
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.port}/`, opts.holdFonts ? { waitUntil: "domcontentloaded" } : undefined);
  return { context, page, fonts };
}

/**
 * @param {{ reducedMotion?: "reduce" | "no-preference", width?: number, height?: number }} [opts]
 */
async function openHome(opts = {}) {
  const opened = await openPage(opts);
  // The hero starts once the mono font is in, then reports the reel state.
  await opened.page.waitForFunction(() => document.querySelector("[data-reel]")?.getAttribute("data-open") !== null);
  return opened;
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

  test("Enter on the button plays the film and Escape returns focus to it", async () => {
    const { context, page } = await openHome();
    try {
      await tabUntil(page, (f) => f.restCta);
      await page.keyboard.press("Enter");
      assert.deepEqual(await videoDialog(page), { open: true, title: FILM_TITLE });
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
      assert.deepEqual(await videoDialog(page), { open: true, title: FILM_TITLE });
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

describe("hero opening", () => {
  test("the copy stays until the reel starts to open, and the reel is open by about a quarter of a screen", async () => {
    const { context, page } = await openHome();
    try {
      const copyOpacity = () =>
        page.evaluate(() => Number(getComputedStyle(/** @type {HTMLElement} */ (document.querySelector(".hero__copy"))).opacity));
      const scrollBy = async (/** @type {number} */ fraction) => {
        await page.evaluate((f) => window.scrollTo(0, window.innerHeight * f), fraction);
        await page.waitForTimeout(250);
      };

      assert.equal(await copyOpacity(), 1, "the copy is fully visible at rest");
      // The spark has widened and the hands have parted, but the reel is still shut.
      await scrollBy(0.06);
      assert.equal(await page.getAttribute("[data-reel]", "data-open"), "false");
      assert.equal(await copyOpacity(), 1, "the copy has not started to fade before the reel opens");

      await scrollBy(0.28);
      assert.equal(await page.getAttribute("[data-reel]", "data-open"), "true", "the reel is open a quarter of a screen in");
      assert.ok((await copyOpacity()) < 0.05, "the copy has stepped back once the reel is open");
    } finally {
      await context.close();
    }
  });

  test("the pinned stage is half a screen long, so no stretch of it is empty", async () => {
    const { context, page } = await openHome({ width: 390, height: 844 });
    try {
      const stage = await page.evaluate(() => {
        const intro = /** @type {HTMLElement} */ (document.querySelector("[data-intro]"));
        return { scroll: intro.offsetHeight - window.innerHeight, viewport: window.innerHeight };
      });
      assert.ok(Math.abs(stage.scroll - stage.viewport / 2) <= 2, `the stage adds ${stage.scroll}px of scroll`);
      await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.28));
      await page.waitForFunction(() => document.querySelector("[data-reel]")?.getAttribute("data-open") === "true");
    } finally {
      await context.close();
    }
  });

  test("the reel plays a Selected video, and its caption says so", async () => {
    const { context, page } = await openHome({ reducedMotion: "reduce" });
    try {
      const caption = await page.evaluate(
        () => /** @type {HTMLElement | null} */ (document.querySelector("[data-reel-caption]"))?.innerText.replace(/\s+/g, " ").trim() ?? "",
      );
      assert.match(caption, /^China trip recap Story, information design and a code-built edit/);
      const films = await page.evaluate(() =>
        [...document.querySelectorAll(".vcard__title")].map((el) => el.textContent?.trim()),
      );
      assert.ok(films.includes("China trip recap"));
    } finally {
      await context.close();
    }
  });
});

describe("the strip", () => {
  for (const width of [390, 1440, 1920]) {
    test(`starts at rest on the first phrase, set on the page gutter at ${width}px`, async () => {
      const { context, page } = await openPage({ width });
      try {
        await page.waitForSelector(".strip.is-ready");
        const edges = await page.evaluate(() => {
          const phrase = /** @type {HTMLElement} */ (document.querySelector(".strip__phrase"));
          const range = document.createRange();
          range.selectNodeContents(phrase);
          const text = range.getBoundingClientRect();
          const name = /** @type {HTMLElement} */ (document.querySelector(".hero__name")).getBoundingClientRect();
          return { text: text.left, gutter: name.left, words: phrase.textContent };
        });
        assert.equal(edges.words, "DESIGN × CODE");
        assert.ok(
          Math.abs(edges.text - edges.gutter) <= 2,
          `the first phrase starts at ${edges.text}, the hero copy at ${edges.gutter}`,
        );
      } finally {
        await context.close();
      }
    });
  }

  test("stays hidden until it is ready, then fades in", async () => {
    const { context, page, fonts } = await openPage({ holdFonts: true });
    try {
      const before = await page.evaluate(() => {
        const strip = document.querySelector("[data-strip]");
        const track = document.querySelector("[data-strip-track]");
        if (!(strip instanceof HTMLElement) || !(track instanceof HTMLElement)) throw new Error("no strip");
        return {
          ready: strip.classList.contains("is-ready"),
          opacity: Number(getComputedStyle(track).opacity),
        };
      });
      assert.equal(before.ready, false, "the strip is not ready while its face is still loading");
      assert.equal(before.opacity, 0, "the track is held hidden until it has been measured");
      await Promise.all(fonts.map((route) => route.continue()));
      await page.waitForSelector(".strip.is-ready");
      await page.waitForFunction(() => {
        const track = document.querySelector("[data-strip-track]");
        return track instanceof HTMLElement && getComputedStyle(track).opacity === "1";
      });
    } finally {
      await context.close();
    }
  });

  test("is simply there, unwrapped from the marquee, when motion is reduced", async () => {
    const { context, page } = await openPage({ reducedMotion: "reduce" });
    try {
      const state = await page.evaluate(() => {
        const strip = document.querySelector("[data-strip]");
        const track = document.querySelector("[data-strip-track]");
        if (!(strip instanceof HTMLElement) || !(track instanceof HTMLElement)) throw new Error("no strip");
        const style = getComputedStyle(track);
        return {
          ready: strip.classList.contains("is-ready"),
          opacity: Number(style.opacity),
          transform: style.transform,
        };
      });
      assert.equal(state.ready, false);
      assert.equal(state.opacity, 1, "the reduced-motion strip is not left hidden");
      assert.equal(state.transform, "none");
    } finally {
      await context.close();
    }
  });

  test("keeps its words, and says 70 videos rather than aspiring", async () => {
    const { context, page } = await openHome();
    try {
      const words = await page.evaluate(() => document.querySelector("[data-strip] .visually-hidden")?.textContent ?? "");
      assert.equal(words, "DESIGN × CODE • VIDEO × AI • BUILDING WITH AGENTS • 70 VIDEOS AND COUNTING");
    } finally {
      await context.close();
    }
  });
});

describe("page details", () => {
  test("no small uppercase label is left except dates", async () => {
    const { context, page } = await openHome();
    try {
      const found = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll("main *, header *, footer *")) {
          if (!(el instanceof HTMLElement) || el.closest("dialog")) continue;
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim());
          if (!own) continue;
          const style = getComputedStyle(el);
          if (style.textTransform !== "uppercase" || parseFloat(style.fontSize) > 14) continue;
          out.push(`${el.className || el.tagName}: ${el.textContent?.trim().slice(0, 40)}`);
        }
        return out;
      });
      assert.deepEqual(found.filter((f) => !f.startsWith("exp__dates")), []);
    } finally {
      await context.close();
    }
  });

  test("Contact has no clock", async () => {
    const { context, page } = await openHome();
    try {
      assert.equal(await page.locator("[data-clock], .clock").count(), 0);
      assert.equal(await page.locator("#contact").getByText(/local time/i).count(), 0);
    } finally {
      await context.close();
    }
  });

  test("each film has one credit line and no skill chips", async () => {
    const { context, page } = await openHome();
    try {
      assert.equal(await page.locator(".chip, .vcard__skills").count(), 0);
      const credits = await page.locator(".vcard__credit").allTextContents();
      assert.equal(credits.length, 4);
      assert.ok(credits.every((c) => c.trim().length > 0 && c.trim().length <= 70));
    } finally {
      await context.close();
    }
  });

  test("the Builds rules and lists line up across a row", async () => {
    const { context, page } = await openHome();
    try {
      const tops = await page.evaluate(() =>
        [...document.querySelectorAll(".build__examples")].map((el) => Math.round(el.getBoundingClientRect().top + window.scrollY)),
      );
      assert.equal(tops.length, 4);
      assert.equal(tops[0], tops[1]);
      assert.equal(tops[2], tops[3]);
    } finally {
      await context.close();
    }
  });

  test("the Toolbox groups keep their own height, with no empty cells", async () => {
    const { context, page } = await openHome();
    try {
      const boxes = await page.evaluate(() =>
        [...document.querySelectorAll(".tgroup")].map((el) => {
          const rect = el.getBoundingClientRect();
          return { items: el.querySelectorAll("li").length, height: Math.round(rect.height) };
        }),
      );
      assert.equal(boxes.length, 4);
      const [video, marketing] = boxes;
      assert.ok(marketing.height > video.height, "a longer group is taller than a shorter one");
    } finally {
      await context.close();
    }
  });

  test("step numbers are plain, with no rule running off them", async () => {
    const { context, page } = await openHome();
    try {
      const after = await page.evaluate(() =>
        [...document.querySelectorAll(".step__num")].map((el) => getComputedStyle(el, "::after").content),
      );
      assert.equal(after.length, 6);
      assert.ok(after.every((c) => c === "none" || c === "normal"), `a step number has an ::after of ${after}`);
    } finally {
      await context.close();
    }
  });

  test("a Builds card keeps its solid dark background before it reveals, and only its content comes in", async () => {
    const { context, page } = await openHome({ width: 390, height: 844 });
    try {
      // Builds is far below the fold, so on load no card has revealed yet.
      const before = await page.evaluate(() =>
        [...document.querySelectorAll(".build")].map((card) => ({
          revealed: card.classList.contains("is-in"),
          opacity: getComputedStyle(card).opacity,
          background: getComputedStyle(card).backgroundColor,
          content: [...card.children].map((el) => getComputedStyle(el).opacity),
        })),
      );
      assert.equal(before.length, 4);
      for (const card of before) {
        assert.equal(card.revealed, false);
        assert.equal(card.opacity, "1", "the card itself is never faded out");
        assert.equal(card.background, "rgb(11, 11, 11)", "the card is solid dark, so the divider colour never shows through");
        assert.ok(card.content.every((o) => o === "0"), "its content waits to come in");
      }

      await page.evaluate(() => document.querySelector(".builds__grid")?.scrollIntoView());
      await page.waitForFunction(() => document.querySelector(".build")?.classList.contains("is-in"));
      await page.waitForFunction(() =>
        [...(document.querySelector(".build")?.children ?? [])].every((el) => getComputedStyle(el).opacity === "1"),
      );
    } finally {
      await context.close();
    }
  });

  test("the process source lines sit level on one line per row", async () => {
    for (const { width, height, perRow } of [{ width: 1440, height: 900, perRow: 6 }, { width: 390, height: 844, perRow: 2 }]) {
      const { context, page } = await openHome({ width, height });
      try {
        await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; transform: none !important; }" });
        const lines = await page.evaluate(() =>
          [...document.querySelectorAll(".step__from")].map((el) => {
            const r = el.getBoundingClientRect();
            return { bottom: Math.round(r.bottom + window.scrollY), height: Math.round(r.height) };
          }),
        );
        assert.equal(lines.length, 6);
        // Each step in a row ends on the same line, however long its caption is.
        for (let i = 0; i < lines.length; i += perRow) {
          const row = lines.slice(i, i + perRow);
          assert.ok(
            row.every((l) => Math.abs(l.bottom - row[0].bottom) <= 1),
            `at ${width}px a row's source lines end at ${row.map((l) => l.bottom)}`,
          );
        }
      } finally {
        await context.close();
      }
    }
  });

  test("the footer's text and button are centred on one line", async () => {
    const { context, page } = await openHome();
    try {
      // The vertical centre of what is actually drawn, not of the stretched boxes around it.
      const centres = await page.evaluate(() => {
        const text = (/** @type {string} */ selector) => {
          const range = document.createRange();
          range.selectNodeContents(/** @type {Element} */ (document.querySelector(selector)));
          const r = range.getBoundingClientRect();
          return r.top + r.height / 2;
        };
        const box = (/** @type {string} */ selector) => {
          const r = /** @type {Element} */ (document.querySelector(selector)).getBoundingClientRect();
          return r.top + r.height / 2;
        };
        return {
          copyright: text(".footer__inner > p:first-child"),
          credit: text(".footer__credit"),
          hint: box(".footer__key"),
          button: box(".footer__terminal"),
        };
      });
      const all = Object.values(centres);
      assert.ok(
        all.every((c) => Math.abs(c - all[0]) <= 1.5),
        `the footer centres are ${JSON.stringify(centres)}`,
      );
    } finally {
      await context.close();
    }
  });

  test("the process strip shows six stills with their captions", async () => {
    const { context, page } = await openHome();
    try {
      const steps = await page.evaluate(() =>
        [...document.querySelectorAll(".step")].map((el) => ({
          title: el.querySelector(".step__title")?.textContent,
          caption: el.querySelector(".step__caption")?.textContent?.length ?? 0,
          alt: el.querySelector("img")?.getAttribute("alt")?.length ?? 0,
          src: el.querySelector("img")?.getAttribute("src") ?? "",
        })),
      );
      assert.deepEqual(
        steps.map((s) => s.title),
        ["Script", "Footage and b-roll", "Motion in code", "Captions", "Review", "Final edit in CapCut"],
      );
      assert.ok(steps.every((s) => s.caption > 0 && s.alt > 0 && s.src.length > 0));
    } finally {
      await context.close();
    }
  });
});

describe("phones", () => {
  test("About shows the words before the headshot", async () => {
    const { context, page } = await openHome({ width: 390, height: 844 });
    try {
      const tops = await page.evaluate(() => ({
        copy: /** @type {HTMLElement} */ (document.querySelector(".about__copy")).getBoundingClientRect().top,
        photo: /** @type {HTMLElement} */ (document.querySelector(".about__photo")).getBoundingClientRect().top,
      }));
      assert.ok(tops.copy < tops.photo);
    } finally {
      await context.close();
    }
  });

  test("Selected videos are one card to a row", async () => {
    const { context, page } = await openHome({ width: 390, height: 844 });
    try {
      const rects = await page.evaluate(() =>
        [...document.querySelectorAll(".vgrid > .vcard")].map((el) => {
          const r = el.getBoundingClientRect();
          return { left: Math.round(r.left), width: Math.round(r.width), top: Math.round(r.top + window.scrollY) };
        }),
      );
      assert.equal(rects.length, 4);
      assert.ok(rects.every((r) => r.left === rects[0].left && r.width === rects[0].width), "every card spans the same row width");
      assert.ok(rects.every((r, i) => i === 0 || r.top > rects[i - 1].top), "each card sits below the one before");
      assert.ok(rects[0].width > 300, `the card is ${rects[0].width}px wide`);
    } finally {
      await context.close();
    }
  });

  test("nothing scrolls sideways", async () => {
    const { context, page } = await openHome({ width: 390, height: 844 });
    try {
      const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(wide <= 0, `the page is ${wide}px wider than the screen`);
    } finally {
      await context.close();
    }
  });
});

describe("the built site", () => {
  /** @param {string} dir @returns {string[]} */
  function htmlFiles(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return htmlFiles(full);
      return entry.name.endsWith(".html") ? [full] : [];
    });
  }

  test("has no em dash, no workplace name and no mention of the dropped film", () => {
    for (const file of htmlFiles(DIST)) {
      const html = readFileSync(file, "utf8");
      // Only what a visitor reads: the markup between tags and the text of the page.
      assert.ok(!html.includes("\u2014"), `${file} has an em dash`);
      assert.ok(!/tax academy/i.test(html), `${file} names the workplace`);
      assert.ok(!/anniversary/i.test(html), `${file} mentions the anniversary film`);
    }
  });
});
