// Pop-up menus are position: fixed and placed from getBoundingClientRect().
// Inside the app's size setting (CSS zoom on .app-root) those two can use
// different units, and browsers don't all agree how. So measure instead of
// guessing: drop an invisible fixed probe next to the anchor at a known
// offset, see where it actually lands, and convert with that ratio.
export function fixedScale(anchorEl) {
  const host = anchorEl?.parentElement;
  if (!host) return 1;
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:100px;top:0;width:0;height:0;visibility:hidden;pointer-events:none";
  host.appendChild(probe);
  const k = probe.getBoundingClientRect().left / 100;
  probe.remove();
  return k > 0 ? k : 1;
}
