// Video cards: a muted preview on hover or focus, and click-to-play with
// sound in a native <dialog>, which gives focus trapping and Esc for free.

import { lockScroll } from "./scroll";

type Playable = { title: string; src: string; poster: string; orientation: string; note: string };

// Can this element take focus and be seen right now?
function usable(el: HTMLElement | null): el is HTMLElement {
  return Boolean(el && el.isConnected && !el.closest("[inert]") && el.getClientRects().length > 0);
}

// Where focus goes when the control that opened a video is no longer usable
// (for example the hero reel closed while the dialog was up).
function fallbackFocus() {
  const candidates = [
    document.querySelector<HTMLElement>("[data-reel-rest-cta]"),
    document.querySelector<HTMLElement>("[data-reel-frame]"),
    ...document.querySelectorAll<HTMLElement>("main a[href], main button"),
  ];
  return candidates.find(usable) ?? null;
}

export function initVideos(finePointer: boolean) {
  const dataEl = document.getElementById("video-data");
  const modal = document.querySelector<HTMLDialogElement>("[data-video-modal]");
  const player = modal?.querySelector<HTMLVideoElement>("[data-video-player]");
  const title = modal?.querySelector<HTMLElement>("[data-video-title]");
  const note = modal?.querySelector<HTMLElement>("[data-video-note]");
  if (!dataEl || !modal || !player || !title || !note) return;
  const data = JSON.parse(dataEl.textContent ?? "{}") as Record<string, Playable>;
  let opener: HTMLElement | null = null;

  // Hover previews.
  document.querySelectorAll<HTMLElement>("[data-preview-host]").forEach((host) => {
    const video = host.querySelector<HTMLVideoElement>(".vcard__preview");
    if (!video) return;
    const start = () => {
      if (!video.src) video.src = video.dataset.src ?? "";
      video.play().then(
        () => host.classList.add("is-previewing"),
        () => {},
      );
    };
    const stop = () => {
      host.classList.remove("is-previewing");
      video.pause();
    };
    if (finePointer) {
      host.addEventListener("pointerenter", start);
      host.addEventListener("pointerleave", stop);
    }
    host.addEventListener("focus", () => {
      if (host.matches(":focus-visible")) start();
    });
    host.addEventListener("blur", stop);
  });

  const open = (id: string, trigger: HTMLElement) => {
    const item = data[id];
    if (!item) return;
    opener = trigger;
    title.textContent = item.title;
    note.textContent = item.note;
    modal.dataset.orientation = item.orientation;
    player.poster = item.poster;
    player.src = item.src;
    // Pause any preview so only one thing makes noise or moves.
    document.querySelectorAll<HTMLVideoElement>(".vcard__preview, [data-reel-video]").forEach((v) => v.pause());
    lockScroll(true);
    modal.showModal();
    player.play().catch(() => {});
  };

  const close = () => {
    if (modal.open) modal.close();
  };

  modal.addEventListener("close", () => {
    player.pause();
    player.removeAttribute("src");
    player.load();
    lockScroll(false);
    (usable(opener) ? opener : fallbackFocus())?.focus({ preventScroll: true });
    opener = null;
    document.dispatchEvent(new Event("video-modal:close"));
  });

  // A click on the backdrop (the dialog element itself) closes it.
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  modal.querySelector("[data-video-close]")?.addEventListener("click", close);

  document.addEventListener("click", (e) => {
    const trigger = (e.target as Element | null)?.closest<HTMLElement>("[data-video-open]");
    if (!trigger) return;
    e.preventDefault();
    open(trigger.dataset.videoOpen ?? "", trigger);
  });
}
