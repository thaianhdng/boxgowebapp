// Marks every screen of the owner's TEST database, so it's never mistaken
// for the live one.
export function TestBadge({ style }) {
  return (
    <span
      title="You're using the TEST database. Switch back in Settings → Catalog & Data."
      style={{
        fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap",
        color: "#111", background: "#2DD4BF", borderRadius: 3, padding: "2px 6px", flexShrink: 0, ...style,
      }}
    >
      Test
    </span>
  );
}
