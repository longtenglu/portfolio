// Smooth scrolling with Lenis on motion-friendly screens. Everything else
// listens to plain window scroll events, so the page still works without it.

import Lenis from "lenis";

let lenis: Lenis | null = null;

export function initScroll(reducedMotion: boolean) {
  if (reducedMotion) return null;
  lenis = new Lenis({ duration: 1.1, anchors: false });
  const raf = (time: number) => {
    lenis?.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
  return lenis;
}

/** Scroll to an in-page target, smoothly when Lenis is running. */
export function scrollToTarget(target: HTMLElement | number) {
  if (lenis) {
    lenis.scrollTo(target, { offset: 0 });
    return;
  }
  const top = typeof target === "number" ? target : target.getBoundingClientRect().top + window.scrollY;
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
}

/** Stop the page scrolling under a dialog, and start it again. */
export function lockScroll(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.documentElement.classList.toggle("is-locked", locked);
}
