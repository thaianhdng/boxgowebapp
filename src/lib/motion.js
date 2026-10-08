// Motion: short animations that help follow what changed (pop-ups,
// folding sections, rows added / removed, page changes). Owner only for
// now: EquipmentManifest puts the "motion" class on <html> for the owner,
// and the CSS and helpers here do nothing without it. Off on a device set
// to reduce motion (iPhone: Settings → Accessibility → Motion).

export const EASE = "cubic-bezier(0.2, 0, 0, 1)";

export function motionOn() {
  if (typeof document === "undefined") return false;
  if (!document.documentElement.classList.contains("motion")) return false;
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// Grow an element from nothing to its own height, fading in.
export function growIn(el, ms = 220) {
  const h = el.scrollHeight;
  el.style.overflow = "hidden";
  const a = el.animate(
    [{ height: "0px", opacity: 0 }, { height: `${h}px`, opacity: 1 }],
    { duration: ms, easing: EASE },
  );
  const end = () => { el.style.overflow = ""; };
  a.onfinish = end;
  a.oncancel = end;
  return a;
}

// Shrink an element to nothing, fading out, then call `done`.
export function shrinkOut(el, done, ms = 200) {
  const h = el.offsetHeight;
  el.style.overflow = "hidden";
  const a = el.animate(
    [{ height: `${h}px`, opacity: 1 }, { height: "0px", opacity: 0 }],
    { duration: ms, easing: EASE, fill: "forwards" },
  );
  a.onfinish = done;
  return a;
}

// A quick fade-in, for a whole page after switching pages.
export function fadeIn(el, ms = 180) {
  return el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: "ease-out" });
}

// Closing pop-up windows (and the undo bar) fade out too. React removes
// them at once, so just before one leaves the page a copy of it (same
// scroll positions and typed values, not tappable) is put in its place
// and faded out. Installed once, for the owner.
const EXITS = ".m-overlay, .m-toast";
let exitsInstalled = false;
export function installExitMotion() {
  if (exitsInstalled || typeof Node === "undefined") return;
  exitsInstalled = true;
  const removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child?.nodeType === 1 && motionOn()) {
      try { leaveGhosts(child); } catch { /* never stand in the way of a removal */ }
    }
    return removeChild.call(this, child);
  };
}

function leaveGhosts(node) {
  const host = document.querySelector(".app-root");
  if (!host || node.contains(host)) return;
  const els = node.matches(EXITS) ? [node] : [...node.querySelectorAll(EXITS)];
  for (const el of els) ghost(el, host);
}

function ghost(el, host) {
  const toast = el.classList.contains("m-toast");
  const g = el.cloneNode(true);
  const from = [el, ...el.querySelectorAll("*")];
  const to = [g, ...g.querySelectorAll("*")];
  const scrolls = [];
  from.forEach((n, i) => {
    const m = to[i];
    if (!m) return;
    if (n.scrollTop || n.scrollLeft) scrolls.push([m, n.scrollTop, n.scrollLeft]);
    if (n.tagName === "INPUT" || n.tagName === "TEXTAREA" || n.tagName === "SELECT") {
      m.value = n.value;
      if (n.type === "checkbox" || n.type === "radio") m.checked = n.checked;
    }
    m.removeAttribute("id");
    m.removeAttribute("autofocus");
  });
  g.classList.remove("m-overlay", "m-toast"); // no opening animation on the copy
  g.setAttribute("aria-hidden", "true");
  g.inert = true;
  g.style.pointerEvents = "none";
  host.appendChild(g);
  scrolls.forEach(([m, top, left]) => { m.scrollTop = top; m.scrollLeft = left; });
  const opts = { duration: 170, easing: "ease-in", fill: "forwards" };
  const a = toast
    ? g.animate([{ opacity: 1 }, { opacity: 0, translate: "0 10px" }], opts)
    : g.animate([{ opacity: 1 }, { opacity: 0 }], opts);
  if (!toast && g.firstElementChild) {
    g.firstElementChild.animate([{ opacity: 1 }, { opacity: 0, translate: "0 10px", scale: "0.98" }], opts);
  }
  a.onfinish = () => g.remove();
  // Another window opening straight away (e.g. one window leading to the
  // next): only the closing window fades, not a second dark backdrop.
  if (!toast) requestAnimationFrame(() => { if (document.querySelector(".m-overlay")) g.style.background = "transparent"; });
}

// The CSS side (pop-up windows, menus, cards, the undo bar). Everything is
// under html.motion and only when the device doesn't ask for less motion.
export const MOTION_CSS = `
@media (prefers-reduced-motion: no-preference) {
  html.motion .m-overlay { animation: m-fade 160ms ease-out; }
  html.motion .m-overlay > * { animation: m-rise 220ms ${EASE}; }
  html.motion .m-pop { animation: m-pop 150ms ${EASE}; transform-origin: top center; }
  html.motion .m-pop.m-up { transform-origin: bottom right; }
  html.motion .m-toast { animation: m-toast 200ms ${EASE}; }
  html.motion .m-card { transition: translate 160ms ${EASE}, scale 120ms ${EASE}, box-shadow 160ms ${EASE}; }
  html.motion .m-card:active { scale: 0.985; }
  @media (hover: hover) {
    html.motion .m-card:hover { translate: 0 -2px; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22); }
    html.motion .m-card:active { translate: 0 0; }
  }
  @keyframes m-fade { from { opacity: 0; } }
  @keyframes m-rise { from { opacity: 0; translate: 0 14px; scale: 0.98; } }
  @keyframes m-pop { from { opacity: 0; scale: 0.96; } }
  @keyframes m-toast { from { opacity: 0; translate: 0 10px; } }
}
`;
