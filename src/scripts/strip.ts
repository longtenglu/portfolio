// The strip under the hero: a JS-driven marquee that pauses on hover and
// stays still when motion is reduced.
//
// It starts once the fonts are in, so the phrases are measured at their final
// size and the first thing on screen is the first phrase, set on the page
// gutter and standing still for a moment, never a word cut in half.

export function initStrip(reducedMotion: boolean) {
  const strip = document.querySelector<HTMLElement>("[data-strip]");
  const track = strip?.querySelector<HTMLElement>("[data-strip-track]");
  const unit = track?.querySelector<HTMLElement>("[data-strip-unit]");
  if (!strip || !track || !unit || reducedMotion) return;

  const SPEED = 46; // px per second
  const HOLD = 900; // ms the strip stands still before it drifts
  let unitWidth = 0;
  let offset = 0;
  let hovering = false;
  let speedNow = 0;
  let visible = true;
  let started = false;
  let looping = false;
  let last = performance.now();
  let holdUntil = 0;
  let lastScroll = window.scrollY;
  let boost = 0;

  // Enough copies to cover the strip twice over, so the loop never shows a gap.
  const fill = () => {
    unitWidth = unit.getBoundingClientRect().width;
    if (!unitWidth) return;
    const needed = Math.ceil((strip.clientWidth * 2) / unitWidth) + 1;
    while (track.children.length < needed) track.appendChild(unit.cloneNode(true));
  };

  // Where the first phrase's text sits at rest: on the page gutter, like the
  // hero copy above it. The phrase has its own padding, so the track starts
  // that much further left (a negative offset moves it right).
  const restOffset = () => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;width:var(--gutter)";
    strip.appendChild(probe);
    const gutter = probe.getBoundingClientRect().width;
    probe.remove();
    const phrase = unit.querySelector<HTMLElement>(".strip__phrase");
    const pad = phrase ? parseFloat(getComputedStyle(phrase).paddingLeft) : 0;
    return -Math.max(0, gutter - pad);
  };

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // Scrolling nudges the strip along, like a belt that catches the page.
    const scrolled = Math.abs(window.scrollY - lastScroll);
    lastScroll = window.scrollY;
    boost = Math.min(240, boost * 0.9 + scrolled * 4);
    const target = hovering || now < holdUntil ? 0 : SPEED + boost;
    speedNow += (target - speedNow) * 0.08;
    offset = (offset + speedNow * dt) % (unitWidth || 1);
    track.style.transform = `translate3d(${-offset.toFixed(2)}px, 0, 0)`;
    if (visible) requestAnimationFrame(frame);
    else looping = false;
  };

  // One animation loop at a time, and none before the strip has begun.
  const kick = () => {
    if (!started || looping || !visible) return;
    looping = true;
    last = performance.now();
    requestAnimationFrame(frame);
  };

  strip.addEventListener("pointerenter", () => (hovering = true));
  strip.addEventListener("pointerleave", () => (hovering = false));
  new ResizeObserver(fill).observe(strip);
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    kick();
  }).observe(strip);

  const begin = () => {
    fill();
    offset = restOffset();
    track.style.transform = `translate3d(${-offset.toFixed(2)}px, 0, 0)`;
    strip.classList.add("is-ready");
    started = true;
    holdUntil = performance.now() + HOLD;
    kick();
  };

  // The strip face is the bold Archivo. Wait for it, but never for long: a
  // font that fails to load must not leave the strip empty.
  const fontReady = document.fonts?.load('720 17px "Archivo Variable"').then(() => document.fonts.ready, () => undefined);
  Promise.race([fontReady, new Promise((r) => setTimeout(r, 2000))]).then(begin);
}
