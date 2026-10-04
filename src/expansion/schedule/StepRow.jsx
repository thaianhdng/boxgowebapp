import { MapPin, Video } from "lucide-react";
import { wdm } from "../shared/dates.js";
import { stepDays } from "./steps.js";

export function stepWhen(step) {
  if (!step.start) return "Date TBC";
  const days = stepDays(step).length;
  let s = wdm(step.start);
  if (days > 1) s += ` → ${wdm(step.end)} · ${days} days`;
  if (step.time) s += ` · ${step.time}${step.endTime ? `–${step.endTime}` : ""}`;
  return s;
}

// The link in a location / meeting field, if it has one: a pasted URL
// anywhere in the text, or the whole text being a web address
// ("meet.google.com/abc-defg-hij"). Plain text like "Studio A" has none.
export function linkIn(text) {
  const t = (text || "").trim();
  const url = t.match(/https?:\/\/\S+/i)?.[0];
  if (url) return url;
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(t)) return `https://${t}`;
  return null;
}

const isMapsLink = (url) => /(maps\.google\.|google\.[a-z.]+\/maps|goo\.gl\/maps|maps\.app\.goo\.gl)/i.test(url);

// One schedule step. `projectName` is shown on the all-projects calendar.
// A MAP button shows when the location / link field holds a Google Maps
// link, LINK for any other link; plain text gets no button. `hideLinks`
// drops it.
export function StepRow({ step, type, projectName, dayLabel, hideLinks, onClick, onToggleConfirmed }) {
  const faded = !step.confirmed;
  const where = step.mode === "online" ? step.link : step.location;
  const href = linkIn(where);
  return (
    <div
      onClick={onClick}
      className="row"
      style={{
        display: "flex", gap: 10, padding: "9px 10px 9px 0", cursor: onClick ? "pointer" : "default",
        borderBottom: "1px solid var(--border)", alignItems: "flex-start", minWidth: 0,
      }}
    >
      <span style={{
        width: 4, alignSelf: "stretch", borderRadius: 2, flexShrink: 0,
        background: faded ? "transparent" : type.color,
        border: faded ? `1px dashed ${type.color}` : "none",
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: type.color }}>{type.name}</span>
          {dayLabel && <span style={{ fontSize: 11, color: "var(--muted)" }}>{dayLabel}</span>}
          {step.label && <span style={{ fontSize: 11.5, color: "var(--text)", fontWeight: 600 }}>{step.label}</span>}
          {projectName && <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{projectName}</span>}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{stepWhen(step)}</div>
        {(where || step.mode === "online") && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
            {step.mode === "online" ? <Video size={12} style={{ flexShrink: 0 }} /> : <MapPin size={12} style={{ flexShrink: 0 }} />}
            {step.mode === "online" && !step.link && <span>Online</span>}
            {where && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{where}</span>}
            {href && !hideLinks && (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text)", border: "1px solid var(--border2)", borderRadius: 3, padding: "1px 6px", textDecoration: "none", marginLeft: 2 }}
              >
                {isMapsLink(href) ? "Map" : "Link"}
              </a>
            )}
          </div>
        )}
        {step.note && <div style={{ fontSize: 12, color: "var(--text)", marginTop: 4, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{step.note}</div>}
      </div>
      {onToggleConfirmed && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleConfirmed(); }}
          title={faded ? "Tentative — tap to confirm" : "Confirmed — tap to mark tentative"}
          style={{
            flexShrink: 0, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em",
            padding: "3px 7px", borderRadius: 3, cursor: "pointer", fontFamily: "inherit",
            border: `1px ${faded ? "dashed" : "solid"} ${faded ? "var(--muted2)" : "var(--text)"}`,
            background: faded ? "transparent" : "var(--text)", color: faded ? "var(--muted)" : "var(--bg)",
          }}
        >
          {faded ? "Tentative" : "Confirmed"}
        </button>
      )}
    </div>
  );
}
