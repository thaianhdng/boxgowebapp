import { useRef } from "react";
import { flushSync } from "react-dom";
import { EASE, motionOn } from "./motion.js";

// Drag to reorder (owner only for now): press the ⋮⋮ grip of a row and
// move. Works with a finger as well as a mouse (pointer events, not the
// browser's own drag and drop, which phones barely support). The row lifts
// and follows, the others slide aside, the page (or the window it sits in)
// scrolls by itself near its top / bottom edge, and on release the row
// settles into its gap and `onMove(from, to, ids)` saves the new order. A row
// stays inside its own group (`ids`): a catalog item never leaves its
// subcategory.
//
//   const sort = useSortable((from, to, ids) => …);
//   <div ref={sort.row(id)}>  <span {...sort.grip(id, ids)}>⋮⋮</span> … </div>
export function useSortable(onMove) {
  const rows = useRef(new Map());
  const refs = useRef(new Map());
  const moveRef = useRef(onMove);
  moveRef.current = onMove;

  // A stable ref callback per id, so React doesn't detach / re-attach it on
  // every render.
  function row(id) {
    if (!refs.current.has(id)) {
      refs.current.set(id, (el) => { if (el) rows.current.set(id, el); else rows.current.delete(id); });
    }
    return refs.current.get(id);
  }

  function grip(id, ids) {
    return {
      onPointerDown: (e) => start(e, id, ids),
      title: "Drag to reorder",
      style: { touchAction: "none", cursor: "grab", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" },
    };
  }

  function start(e, id, ids) {
    if (e.button !== undefined && e.button !== 0) return;
    const els = ids.map((x) => rows.current.get(x));
    const from = ids.indexOf(id);
    if (from < 0 || els.some((el) => !el) || ids.length < 2) return;
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget;
    try { handle.setPointerCapture(e.pointerId); } catch { /* fine without */ }

    const scroller = scrollParent(els[from]);
    const scrollTop = () => (scroller ? scroller.scrollTop : window.scrollY);
    const s0 = scrollTop();
    const rects = els.map((el) => el.getBoundingClientRect());
    // Screen pixels per CSS pixel (the app's size setting zooms the page).
    const k = els[from].offsetHeight > 0 ? rects[from].height / els[from].offsetHeight : 1;
    const tops = rects.map((r) => r.top + s0); // positions in the page, not the screen
    const mids = rects.map((r, i) => tops[i] + r.height / 2);
    const h = rects[from].height;
    const gap = from < ids.length - 1 ? rects[from + 1].top - rects[from].bottom : rects[from].top - rects[from - 1].bottom;
    const slot = rects[from].height + Math.max(0, gap);
    const minDy = tops[0] - tops[from];
    const maxDy = tops[ids.length - 1] + rects[ids.length - 1].height - (tops[from] + rects[from].height);
    const y0 = e.clientY;
    const quick = motionOn() ? `translate 180ms ${EASE}` : "none";

    const dragged = els[from];
    const saved = { position: dragged.style.position, zIndex: dragged.style.zIndex, boxShadow: dragged.style.boxShadow, background: dragged.style.background };
    dragged.style.position = "relative";
    dragged.style.zIndex = "30";
    dragged.style.boxShadow = "0 8px 24px rgba(0,0,0,0.35)";
    const bg = getComputedStyle(dragged).backgroundColor;
    if (bg === "transparent" || bg === "rgba(0, 0, 0, 0)") dragged.style.background = "var(--surface2)";
    dragged.style.transition = "none";
    dragged.style.scale = "1.02";
    els.forEach((el, i) => { if (i !== from) el.style.transition = quick; });
    handle.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    let y = y0;
    let to = from;
    let dy = 0;
    let raf = 0;
    let done = false;

    function layout() {
      dy = Math.min(maxDy, Math.max(minDy, y - y0 + (scrollTop() - s0)));
      dragged.style.translate = `0 ${dy / k}px`;
      // A row gives way once the dragged row's leading edge passes its
      // middle (rows can differ in height, e.g. category cards).
      const top = tops[from] + dy;
      to = from;
      for (let i = from + 1; i < ids.length; i++) if (top + h > mids[i]) to = i;
      for (let i = from - 1; i >= 0; i--) if (top < mids[i]) to = i;
      els.forEach((el, i) => {
        if (i === from) return;
        const shift = from < to && i > from && i <= to ? -slot : to < from && i >= to && i < from ? slot : 0;
        el.style.translate = shift ? `0 ${shift / k}px` : "";
      });
    }

    // Near the top / bottom of the visible area, scroll by itself.
    function tick() {
      if (done) return;
      const box = scroller ? scroller.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
      const edge = 70;
      const speed = y < box.top + edge ? -Math.ceil((box.top + edge - y) / 6) : y > box.bottom - edge ? Math.ceil((y - (box.bottom - edge)) / 6) : 0;
      if (speed) {
        if (scroller) scroller.scrollTop += speed; else window.scrollBy(0, speed);
        layout();
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    function onPointerMove(ev) { y = ev.clientY; layout(); }
    function finish() {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      handle.style.cursor = "";
      document.body.style.userSelect = "";
      const before = dragged.getBoundingClientRect().top;
      els.forEach((el) => { el.style.transition = "none"; el.style.translate = ""; });
      if (to !== from) flushSync(() => moveRef.current(from, to, ids));
      // Settle: from where it was let go into its place.
      const after = dragged.getBoundingClientRect().top;
      const back = () => {
        Object.assign(dragged.style, saved);
        dragged.style.scale = "";
        dragged.style.transition = "";
        els.forEach((el) => { el.style.transition = ""; });
      };
      if (motionOn() && Math.abs(before - after) > 1) {
        const a = dragged.animate(
          [{ translate: `0 ${(before - after) / k}px`, scale: "1.02" }, { translate: "0 0", scale: "1" }],
          { duration: 200, easing: EASE },
        );
        a.onfinish = back;
        a.oncancel = back;
      } else back();
    }
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  }

  return { row, grip };
}

// The nearest ancestor that scrolls (a pop-up window's body), or null for
// the page itself.
function scrollParent(el) {
  for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
    const o = getComputedStyle(n).overflowY;
    if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight) return n;
  }
  return null;
}
