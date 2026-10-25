import { initIntro } from "./intro";
import { initScroll } from "./scroll";
import { initStrip } from "./strip";
import { initTerminal } from "./terminal";
import { initAnchors, initClock, initCopy, initCursor, initHeader, initMenu, initReveals } from "./ui";
import { initVideos } from "./videos";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

initScroll(reducedMotion);
initHeader();
initMenu();
initAnchors();
initReveals(reducedMotion);
initCopy();
initClock();
initVideos(finePointer);
initTerminal();
initCursor(finePointer, reducedMotion);
initStrip(reducedMotion);

// The canvas waits for the mono font so the glyph atlas is drawn in it.
const fontReady = document.fonts?.load('500 12px "JetBrains Mono Variable"').catch(() => undefined);
Promise.race([fontReady, new Promise((r) => setTimeout(r, 1500))]).then(() => initIntro(reducedMotion));
