import {
  Plus, Trash2, X,
} from "lucide-react";
import { Combobox } from "./Combobox.jsx";


export function DayManagerModal({ days, recentProjectLabels, onUpdate, onAdd, onRemove, onClose }) {
  return (
    <div className="no-print" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 420, maxHeight: "85vh", overflowY: "auto", padding: 22, border: "1px solid var(--border2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="stencil" style={{ fontSize: 14 }}>Manage Shoot Days</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)" }}><X size={18} /></button>
        </div>

        {days.map((d) => (
          <div key={d.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", width: 20, flexShrink: 0 }}>{d.label.replace("Day ", "D")}</span>
              <input
                type="date"
                style={{ width: 118, flexShrink: 0, fontSize: 12, padding: "5px 6px" }}
                value={d.date}
                onChange={(e) => onUpdate(d.id, { date: e.target.value })}
              />
              <Combobox
                value={d.projectLabel || ""}
                onChange={(v) => onUpdate(d.id, { projectLabel: v })}
                options={recentProjectLabels}
                placeholder="Type of shooting…"
                style={{ flex: 1 }}
              />
              <button onClick={() => onRemove(d.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)", flexShrink: 0 }}>
                <Trash2 size={14} />
              </button>
            </div>
            <input
              style={{ width: "calc(100% - 26px)", marginLeft: 26 }}
              value={d.location || ""}
              onChange={(e) => onUpdate(d.id, { location: e.target.value })}
              placeholder="Location"
            />
          </div>
        ))}

        {days.length < 7 ? (
          <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }} onClick={onAdd}>
            <Plus size={14} /> Add Day
          </button>
        ) : (
          <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 6 }}>
            7-day maximum reached
          </div>
        )}
      </div>
    </div>
  );
}
