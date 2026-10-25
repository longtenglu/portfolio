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
  if (!intro || !canvas || !reel || !reelFrame || !reelVideo) return;

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hero = initHero({ canvas, reel, reelFrame, reelCaption: caption, reducedMotion, finePointer });
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
    intro.style.setProperty("--p", progress.toFixed(3));
    syncPlayback(hero.reelOpenAt(progress));
  };

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  document.addEventListener("visibilitychange", () => syncPlayback(hero.reelOpenAt(progress)));
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
