import { Children, isValidElement, useLayoutEffect, useReducer, useRef, useState } from "react";
import { growIn, motionOn, shrinkOut } from "../lib/motion.js";

// A folding section's body. With motion on it opens and closes smoothly;
// otherwise it just shows or hides.
export function Fold({ open, children, style }) {
  const ref = useRef(null);
  const anim = useRef(null);
  const was = useRef(open);
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);
  useLayoutEffect(() => {
    if (was.current === open) return;
    was.current = open;
    const el = ref.current;
    anim.current?.cancel();
    if (!el || !motionOn()) { if (!open) setShown(false); return; }
    anim.current = open ? growIn(el) : shrinkOut(el, () => setShown(false));
  }, [open]);
  if (!shown) return null;
  return <div ref={ref} style={style}>{children}</div>;
}

// A list whose rows grow in when added and shrink away when removed (with
// motion on; otherwise just the rows). Rows already there when the list
// first shows don't move. `children`: keyed elements.
export function Presence({ children }) {
  const items = Children.toArray(children).filter(isValidElement);
  const prev = useRef(null);
  const gone = useRef(new Set());
  const [, bump] = useReducer((n) => n + 1, 0);
  const on = motionOn();

  let list;
  if (!prev.current || !on) {
    list = items.map((el) => ({ key: el.key, el }));
  } else {
    const keys = new Set(items.map((el) => el.key));
    const before = prev.current;
    const known = new Set(before.map((r) => r.key));
    list = items.map((el) => ({ key: el.key, el, isNew: !known.has(el.key) }));
    before.forEach((r, i) => {
      if (keys.has(r.key) || gone.current.has(r.key)) return;
      // Keep a removed row where it was while it shrinks away.
      let at = 0;
      for (let j = i - 1; j >= 0; j--) {
        const k = list.findIndex((x) => x.key === before[j].key);
        if (k >= 0) { at = k + 1; break; }
      }
      list.splice(at, 0, { key: r.key, el: r.el, leaving: true });
    });
    items.forEach((el) => gone.current.delete(el.key));
  }
  useLayoutEffect(() => { prev.current = list; });

  if (!on) return items;
  return list.map((r) => (
    <Row key={r.key} isNew={r.isNew} leaving={r.leaving} onGone={() => { gone.current.add(r.key); bump(); }}>
      {r.el}
    </Row>
  ));
}

function Row({ isNew, leaving, onGone, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (isNew && ref.current) growIn(ref.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!leaving || !ref.current) return;
    const a = shrinkOut(ref.current, onGone);
    return () => a.cancel();
  }, [leaving]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={ref}>{children}</div>;
}
