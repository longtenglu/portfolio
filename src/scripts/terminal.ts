// The hidden terminal. Backtick opens it (or the footer button), Esc closes.
// Commands: help, whoami, projects, contact, clear, exit.

import { lockScroll } from "./scroll";

type TerminalData = {
  prompt: string;
  welcome: string[];
  help: string[];
  whoami: string[];
  projectsHeading: string;
  contactHeading: string;
  notFound: string;
  projects: { title: string; kicker: string }[];
  contact: { label: string; value: string; href: string }[];
};

export function initTerminal() {
  const dialog = document.querySelector<HTMLDialogElement>("[data-terminal]");
  const out = dialog?.querySelector<HTMLElement>("[data-terminal-out]");
  const screen = dialog?.querySelector<HTMLElement>("[data-terminal-screen]");
  const form = dialog?.querySelector<HTMLFormElement>("[data-terminal-form]");
  const input = dialog?.querySelector<HTMLInputElement>("[data-terminal-input]");
  const dataEl = document.getElementById("terminal-data");
  if (!dialog || !out || !screen || !form || !input || !dataEl) return;
  const data = JSON.parse(dataEl.textContent ?? "{}") as TerminalData;
  const history: string[] = [];
  let cursor = 0;
  let greeted = false;

  const line = (text: string, className?: string) => {
    const p = document.createElement("p");
    p.textContent = text;
    if (className) p.className = className;
    out.appendChild(p);
    return p;
  };

  const echo = (cmd: string) => {
    const p = document.createElement("p");
    p.className = "term__cmd";
    const prompt = document.createElement("span");
    prompt.textContent = `${data.prompt} `;
    p.append(prompt, cmd);
    out.appendChild(p);
  };

  const commands: Record<string, () => void> = {
    help: () => data.help.forEach((l) => line(l)),
    whoami: () => data.whoami.forEach((l) => line(l)),
    projects: () => {
      line(data.projectsHeading, "term__accent");
      data.projects.forEach((p, i) => line(`  0${i + 1}  ${p.title.padEnd(24)} ${p.kicker.toLowerCase()}`));
    },
    contact: () => {
      line(data.contactHeading, "term__accent");
      data.contact.forEach((c) => {
        const p = line(`  ${c.label.padEnd(10)}`);
        const a = document.createElement("a");
        a.href = c.href;
        a.textContent = c.value;
        if (c.href.startsWith("http")) {
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        }
        p.appendChild(a);
      });
    },
    clear: () => {
      out.replaceChildren();
    },
    exit: () => dialog.close(),
  };

  const run = (raw: string) => {
    const cmd = raw.trim().toLowerCase();
    echo(raw.trim());
    if (!cmd) return;
    history.push(cmd);
    cursor = history.length;
    const fn = commands[cmd] ?? commands[cmd.replace(/^\//, "")];
    if (fn) fn();
    else line(data.notFound.replace("{cmd}", cmd.slice(0, 40)));
    screen.scrollTop = screen.scrollHeight;
  };

  const open = () => {
    if (dialog.open) return;
    lockScroll(true);
    dialog.showModal();
    if (!greeted) {
      greeted = true;
      data.welcome.forEach((l) => line(l));
    }
    input.focus();
  };

  dialog.addEventListener("close", () => lockScroll(false));
  dialog.querySelector("[data-terminal-close]")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  screen.addEventListener("click", () => {
    if (!window.getSelection()?.toString()) input.focus();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    run(input.value);
    input.value = "";
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "`") {
      e.preventDefault();
      dialog.close();
    } else if (e.key === "ArrowUp" && history.length) {
      e.preventDefault();
      cursor = Math.max(0, cursor - 1);
      input.value = history[cursor] ?? "";
    } else if (e.key === "ArrowDown" && history.length) {
      e.preventDefault();
      cursor = Math.min(history.length, cursor + 1);
      input.value = history[cursor] ?? "";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "`" || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
    if (document.querySelector("dialog[open]")) return;
    e.preventDefault();
    open();
  });

  document.querySelectorAll("[data-terminal-open]").forEach((btn) => btn.addEventListener("click", open));
}
