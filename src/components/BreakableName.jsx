import { Fragment } from "react";


// Item names like "DANA DOLLY/SLIDER" have no space around the slash, so a
// narrow column would otherwise break them mid-word ("DOLLY/SLID-ER"). A <wbr>
// after each slash lets the line break there first.
export function BreakableName({ name }) {
  const parts = (name || "").split("/");
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && <>/<wbr /></>}
    </Fragment>
  ));
}
