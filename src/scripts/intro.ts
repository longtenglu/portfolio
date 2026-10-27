// Connects page scroll to the hero: progress through the sticky intro stage
// drives the hands and the reel, and the reel loop only loads and plays once
// it is opening.

import { initHero } from "./hero";

export function initIntro(reducedMotion: boolean) {
  const intro = document.querySelector<HTMLElement>("[data-intro]");
  const canvas = document.querySelector<HTMLCanvasElement>("[data-hero-canvas]");
  const reel = document.querySelector<HTMLElement>("[data-reel]");
  const reelFrame = document.querySelector<HTMLElement>("[data-reel-frame]");
  const reelVideo = document.querySelector<HTMLVideoElement>("[data-reel-video]");
  const caption = document.querySelector<HTMLElement>("[data-reel-caption]");
  const restCta = document.querySelector<HTMLElement>("[data-reel-rest-cta]");
  if (!intro || !canvas || !reel || !reelFrame || !reelVideo) return;

  // Exactly one visible trigger for the film at any time: the reel itself
  // once it is open, the "Watch the film" button while it is not. Focus
  // moves across when the one holding it switches off.
  const setOpen = (open: boolean) => {
    const focused = document.activeElement;
    reelFrame.inert = !open;
    if (restCta) restCta.inert = open;
    if (open && focused === restCta) reelFrame.focus({ preventScroll: true });
    else if (!open && focused === reelFrame) restCta?.focus({ preventScroll: true });
  };

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hero = initHero({ canvas, reel, reelFrame, reelCaption: caption, reducedMotion, finePointer, onOpenChange: setOpen });
  if (!hero) return;

  let loaded = false;
  let inView = true;

  const loadReel = () => {
    if (loaded) return;
    loaded = true;
    reelVideo.src = reelVideo.dataset.src ?? "";
  };

  const syncPlayback = (open: number) => {
    if (reducedMotion) return;
    const shouldPlay = inView && open > 0.05 && !document.hidden;
    if (shouldPlay) {
      loadReel();
      if (reelVideo.paused) reelVideo.play().catch(() => {});
    } else if (!reelVideo.paused) {
      reelVideo.pause();
    }
  };

  let progress = reducedMotion ? 1 : 0;
  const update = () => {
    if (reducedMotion) return;
    const rect = intro.getBoundingClientRect();
    const distance = rect.height - window.innerHeight;
    progress = distance > 0 ? Math.min(1, Math.max(0, -rect.top / distance)) : 0;
    hero.setProgress(progress);
    const open = hero.reelOpenAt(progress);
    intro.style.setProperty("--open", open.toFixed(3));
    syncPlayback(open);
  };

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  document.addEventListener("visibilitychange", () => syncPlayback(hero.reelOpenAt(progress)));
  // Opening a video pauses the loop; pick it back up when the dialog closes.
  document.addEventListener("video-modal:close", () => syncPlayback(hero.reelOpenAt(progress)));
  new IntersectionObserver((entries) => {
    inView = entries.some((e) => e.isIntersecting);
    syncPlayback(hero.reelOpenAt(progress));
  }).observe(intro);

  // Warm the loop up once the page has settled, so it is ready to play the
  // moment the gap opens.
  const warm = () => {
    if (!reducedMotion) {
      reelVideo.preload = "auto";
      loadReel();
    }
  };
  if (document.readyState === "complete") setTimeout(warm, 1200);
  else window.addEventListener("load", () => setTimeout(warm, 1200), { once: true });

  update();
}
