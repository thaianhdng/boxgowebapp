// Motion: short animations that help follow what changed (pop-ups,
// folding sections, rows added / removed, page changes), for everyone:
// EquipmentManifest puts the "motion" class on <html>, and the CSS and
// helpers here do nothing without it. Off on a device set to reduce motion
// (iPhone: Settings → Accessibility → Motion).

export const EASE = "cubic-bezier(0.2, 0, 0, 1)";

export function motionOn() {
  if (typeof document === "undefined") return false;
  if (!document.documentElement.classList.contains("motion")) return false;
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// How much of an element's height is on screen or above it, in its own
// CSS pixels (the app's size setting zooms the page, so convert).
// Growing or shrinking only that much looks the same as the whole height,
// and keeps a very long section (a big equipment category) light to move.
function onScreen(el, h) {
  const r = el.getBoundingClientRect();
  const k = el.offsetHeight > 0 ? r.height / el.offsetHeight : 1;
  const room = (window.innerHeight - r.top) / (k || 1);
  return Math.max(0, Math.min(h, room + 40));
}

// Grow an element from nothing to its own height, fading in.
export function growIn(el, ms = 220) {
  const h = onScreen(el, el.scrollHeight);
  if (!h) return null; // below the screen: nothing to see
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
  const h = onScreen(el, el.offsetHeight);
  if (!h) { done(); return null; }
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

// Closing pop-up windows, menus and the undo bar fade out too. React
// removes them at once, so just before one leaves the page a copy of it
// (same scroll positions and typed values, not tappable) is put in its
// place and faded out. Installed once, for the owner.
const EXITS = ".m-overlay, .m-toast";
let exitsInstalled = false;
export function installExitMotion() {
  if (exitsInstalled || typeof Node === "undefined") return;
  exitsInstalled = true;
  const removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child?.nodeType === 1 && motionOn()) {
      try { leaveGhosts(child, this); } catch { /* never stand in the way of a removal */ }
    }
    return removeChild.call(this, child);
  };
}

function leaveGhosts(node, parent) {
  const host = document.querySelector(".app-root");
  if (!host || node.contains(host)) return;
  // A menu that closes (not one going away with its whole page) fades
  // right where it was, in its own parent, so it stays in place.
  if (node.matches(".m-pop")) return ghost(node, parent, "menu");
  const els = node.matches(EXITS) ? [node] : [...node.querySelectorAll(EXITS)];
  for (const el of els) ghost(el, host, el.classList.contains("m-toast") ? "toast" : "window");
}

function ghost(el, host, kind) {
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
  if (kind === "menu") g.style.transformOrigin = getComputedStyle(el).transformOrigin;
  g.classList.remove("m-overlay", "m-toast", "m-pop"); // no opening animation on the copy
  g.setAttribute("aria-hidden", "true");
  g.inert = true;
  g.style.pointerEvents = "none";
  if (kind === "menu") host.insertBefore(g, el.nextSibling);
  else host.appendChild(g);
  scrolls.forEach(([m, top, left]) => { m.scrollTop = top; m.scrollLeft = left; });
  const opts = { duration: kind === "menu" ? 130 : 170, easing: "ease-in", fill: "forwards" };
  const a = kind === "menu"
    ? g.animate([{ opacity: 1 }, { opacity: 0, scale: "0.96" }], opts)
    : kind === "toast"
      ? g.animate([{ opacity: 1 }, { opacity: 0, translate: "0 10px" }], opts)
      : g.animate([{ opacity: 1 }, { opacity: 0 }], opts);
  if (kind === "window" && g.firstElementChild) {
    g.firstElementChild.animate([{ opacity: 1 }, { opacity: 0, translate: "0 10px", scale: "0.98" }], opts);
  }
  a.onfinish = () => g.remove();
  // Another window opening straight away (e.g. one window leading to the
  // next): only the closing window fades, not a second dark backdrop.
  if (kind === "window") requestAnimationFrame(() => { if (document.querySelector(".m-overlay")) g.style.background = "transparent"; });
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
  html.motion .m-save-busy > * { animation: m-pulse 1s ease-in-out infinite alternate; }
  html.motion .m-save-busy > .spin { animation: spin 0.9s linear infinite, m-pulse 1s ease-in-out infinite alternate; }
  html.motion .m-save-tick { animation: m-flash 1.4s ease-out; }
  html.motion .m-save-tick path { stroke-dasharray: 24; animation: m-draw 380ms ${EASE}; }
  html.motion .m-save-word { animation: m-fade 300ms ease-out; }
  html.motion .m-save-err > svg { animation: m-shake 360ms ease-in-out; }
  @keyframes m-pulse { from { opacity: 1; } to { opacity: 0.45; } }
  @keyframes m-draw { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
  @keyframes m-flash { from { color: var(--accent); } 60% { color: var(--accent); } }
  @keyframes m-shake { 20%, 60% { translate: -2px 0; } 40%, 80% { translate: 2px 0; } }
  @keyframes m-fade { from { opacity: 0; } }
  @keyframes m-rise { from { opacity: 0; translate: 0 14px; scale: 0.98; } }
  @keyframes m-pop { from { opacity: 0; scale: 0.96; } }
  @keyframes m-toast { from { opacity: 0; translate: 0 10px; } }
}
`;
