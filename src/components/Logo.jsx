import logoMask from "../assets/logo-mask.png";


// The BOXGO box logo, drawn in the current text colour (white in dark mode,
// black in light mode) — the PNG is only used as a stencil for its shape.
export function Logo({ size = 18, style }) {
  const mask = `url(${logoMask}) center / contain no-repeat`;
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block", flexShrink: 0, width: size, height: size,
        backgroundColor: "currentColor", WebkitMask: mask, mask,
        ...style,
      }}
    />
  );
}
