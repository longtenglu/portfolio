// Small page behaviours: header state, the phone menu, in-page links, scroll
// reveals, the cursor dot and the copy-email button.

import { lockScroll, scrollToTarget } from "./scroll";

export function initHeader() {
  const header = document.querySelector<HTMLElement>("[data-header]");
  if (!header) return;
  const sync = () => header.classList.toggle("is-scrolled", window.scrollY > window.innerHeight * 0.6);
  window.addEventListener("scroll", sync, { passive: true });
  sync();
}

export function initMenu() {
  const menu = document.querySelector<HTMLDialogElement>("[data-menu]");
  const openBtn = document.querySelector<HTMLButtonElement>("[data-menu-open]");
  if (!menu || !openBtn) return;
  openBtn.addEventListener("click", () => {
    lockScroll(true);
    menu.showModal();
  });
  menu.querySelector("[data-menu-close]")?.addEventListener("click", () => menu.close());
  menu.addEventListener("close", () => lockScroll(false));
}

// In-page links go through the smooth scroller, and close the menu first.
export function initAnchors() {
  document.addEventListener("click", (e) => {
    const link = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute("href")?.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    const menu = document.querySelector<HTMLDialogElement>("[data-menu]");
    if (menu?.open) {
      menu.close();
      // The dialog's close event fires later; unlock now so the scroll runs.
      lockScroll(false);
    }
    scrollToTarget(id === "top" ? 0 : target);
    history.replaceState(null, "", id === "top" ? location.pathname : `#${id}`);
    // Move focus for keyboard and screen reader users without a second jump.
    if (id !== "top") {
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  });
}

export function initReveals(reducedMotion: boolean) {
  const items = document.querySelectorAll<HTMLElement>("[data-reveal]");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  items.forEach((el) => io.observe(el));
}

export function initCursor(finePointer: boolean, reducedMotion: boolean) {
  const dot = document.querySelector<HTMLElement>("[data-cursor]");
  if (!dot || !finePointer) return;
  let x = -100;
  let y = -100;
  let cx = x;
  let cy = y;
  let running = false;
  const frame = () => {
    cx += (x - cx) * (reducedMotion ? 1 : 0.3);
    cy += (y - cy) * (reducedMotion ? 1 : 0.3);
    dot.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
    if (Math.abs(x - cx) > 0.1 || Math.abs(y - cy) > 0.1) requestAnimationFrame(frame);
    else running = false;
  };
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    x = e.clientX;
    y = e.clientY;
    dot.classList.add("is-visible");
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  });
  document.documentElement.addEventListener("pointerleave", () => dot.classList.remove("is-visible"));
  document.addEventListener("pointerover", (e) => {
    const hit = (e.target as Element | null)?.closest("a, button, [data-video-open], input");
    dot.classList.toggle("is-hover", Boolean(hit));
  });
}

export function initCopy() {
  document.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((btn) => {
    const label = btn.querySelector<HTMLElement>("[data-copy-label]");
    const status = btn.parentElement?.querySelector<HTMLElement>("[data-copy-status]");
    const original = label?.textContent ?? "";
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy ?? "");
        if (label) label.textContent = btn.dataset.copied ?? "";
        if (status) status.textContent = btn.dataset.copiedStatus ?? "";
        setTimeout(() => {
          if (label) label.textContent = original;
          if (status) status.textContent = "";
        }, 2000);
      } catch {
        window.location.href = `mailto:${btn.dataset.copy}`;
      }
    });
  });
}
