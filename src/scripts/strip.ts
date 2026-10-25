// The strip under the hero: a JS-driven marquee that pauses on hover and
// stays still when motion is reduced.

export function initStrip(reducedMotion: boolean) {
  const strip = document.querySelector<HTMLElement>("[data-strip]");
  const track = strip?.querySelector<HTMLElement>("[data-strip-track]");
  const unit = track?.querySelector<HTMLElement>("[data-strip-unit]");
  if (!strip || !track || !unit || reducedMotion) return;

  const SPEED = 46; // px per second
  let unitWidth = 0;
  let offset = 0;
  let hovering = false;
  let speedNow = SPEED;
  let visible = true;
  let last = performance.now();
  let lastScroll = window.scrollY;
  let boost = 0;
  // Hold the first phrase still for a moment so the first read starts at the
  // left edge, then let the belt move.
  let holdUntil = performance.now() + 3200;

  // Enough copies to cover the strip twice over, so the loop never shows a gap.
  const fill = () => {
    unitWidth = unit.getBoundingClientRect().width;
    if (!unitWidth) return;
    const needed = Math.ceil((strip.clientWidth * 2) / unitWidth) + 1;
    while (track.children.length < needed) track.appendChild(unit.cloneNode(true));
  };

  const frame = (now: number) => {
    if (now < holdUntil) {
      last = now;
      lastScroll = window.scrollY;
      if (visible) requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // Scrolling nudges the strip along, like a belt that catches the page.
    const scrolled = Math.abs(window.scrollY - lastScroll);
    lastScroll = window.scrollY;
    boost = Math.min(240, boost * 0.9 + scrolled * 4);
    const target = hovering ? 0 : SPEED + boost;
    speedNow += (target - speedNow) * 0.08;
    offset = (offset + speedNow * dt) % (unitWidth || 1);
    track.style.transform = `translate3d(${-offset.toFixed(2)}px, 0, 0)`;
    if (visible) requestAnimationFrame(frame);
  };

  strip.addEventListener("pointerenter", () => (hovering = true));
  strip.addEventListener("pointerleave", () => (hovering = false));
  new ResizeObserver(fill).observe(strip);
  new IntersectionObserver((entries) => {
    const was = visible;
    visible = entries.some((e) => e.isIntersecting);
    if (visible && !was) {
      last = performance.now();
      requestAnimationFrame(frame);
    }
  }).observe(strip);

  // Fonts change the phrase widths, so measure again and start the first
  // phrase at the left edge rather than mid-word.
  document.fonts.ready.then(() => {
    fill();
    offset = 0;
    track.style.transform = "translate3d(0, 0, 0)";
    holdUntil = performance.now() + 3000;
  });
  fill();
  requestAnimationFrame(frame);
}
