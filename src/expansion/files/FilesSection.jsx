import { useState } from "react";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { FieldRow, Modal, Section, fieldInput, smallBtn } from "../shared/ui.jsx";
import { uid } from "../../lib/utils.js";
import { Presence } from "../../components/Motion.jsx";

// A project's files (`project.files`): links to where they live (Google
// Drive, Dropbox, Frame.io…) — script, treatment deck, scouting / recce
// photos and videos, anything else. Each opens in a new tab. Picking
// straight from Google Drive can come later; pasting the link works now.

export const FILE_KINDS = [
  { id: "script", name: "Script" },
  { id: "treatment", name: "Treatment" },
  { id: "recce", name: "Scouting / Recce" },
  { id: "other", name: "Other" },
];
const kindName = (id) => (FILE_KINDS.find((k) => k.id === id) || FILE_KINDS[3]).name;

// "https://drive.google.com/…" → "drive.google.com"
function siteOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}
function withScheme(url) {
  const t = url.trim();
  return !t || /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
}

function FileModal({ initial, isNew, onSave, onDelete, onClose }) {
  const [f, setF] = useState(initial);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const url = withScheme(f.url);
  const ready = !!siteOf(url);
  const save = () => ready && onSave({ ...f, url, name: f.name.trim() || kindName(f.kind) });
  return (
    <Modal
      title={isNew ? "Add file" : "Edit file"}
      onClose={onClose}
      footer={
        <>
          {!isNew ? <button className="btn btn-ghost" style={{ color: "var(--danger)" }} onClick={onDelete}><Trash2 size={13} /> Remove</button> : <span />}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={!ready} style={{ opacity: ready ? 1 : 0.5 }}>{isNew ? "Add" : "Save"}</button>
          </div>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 5, marginBottom: 14 }}>
        {FILE_KINDS.map((k) => {
          const on = f.kind === k.id;
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => set({ kind: k.id })}
              style={{
                padding: "6px 7px", borderRadius: 3, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                border: `1px solid ${on ? "var(--accent)" : "var(--border2)"}`,
                background: on ? "var(--accent)" : "transparent", color: on ? "var(--accent-text)" : "var(--text)",
              }}
            >
              {k.name}
            </button>
          );
        })}
      </div>
      <FieldRow label="Link">
        <input autoFocus={isNew} type="url" value={f.url} onChange={(e) => set({ url: e.target.value })} placeholder="Paste a Google Drive (or any) link" style={{ ...fieldInput, flex: 1, minWidth: 0 }} />
      </FieldRow>
      <FieldRow label="Name">
        <input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder={`e.g. ${kindName(f.kind)} v3 (blank = ${kindName(f.kind)})`} style={{ ...fieldInput, flex: 1, minWidth: 0 }} />
      </FieldRow>
    </Modal>
  );
}

export function FilesSection({ files, onChange }) {
  const [editing, setEditing] = useState(null); // { file, isNew }
  const list = files || [];
  // Grouped by kind, in the kinds' order.
  const groups = FILE_KINDS.map((k) => [k, list.filter((f) => (FILE_KINDS.some((x) => x.id === f.kind) ? f.kind : "other") === k.id)]).filter(([, l]) => l.length);

  return (
    <Section
      id="x-files"
      title="Files"
      right={<button className="btn btn-primary" style={smallBtn} onClick={() => setEditing({ isNew: true, file: { id: uid(), kind: "script", name: "", url: "" } })}><Plus size={12} /> Add file</button>}
    >
      {list.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--muted2)" }}>No files yet — tap + Add file and paste a link (Google Drive, Dropbox…).</div>
      ) : (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          <Presence>{groups.map(([k, items]) => items.map((f, i) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--border)", minWidth: 0 }}>
              <span style={{ width: 92, flexShrink: 0, fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", visibility: i === 0 ? "visible" : "hidden" }}>{kindName(k.id)}</span>
              <a href={f.url} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0, color: "var(--text)", textDecoration: "none", display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                <span style={{ fontSize: 11, color: "var(--muted2)", whiteSpace: "nowrap", flexShrink: 0 }}>{siteOf(f.url)}</span>
                <ExternalLink size={11} style={{ flexShrink: 0, color: "var(--muted)", alignSelf: "center" }} />
              </a>
              <button onClick={() => setEditing({ isNew: false, file: f })} aria-label="Edit file" title="Edit" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2, display: "flex", flexShrink: 0 }}><Pencil size={13} /></button>
            </div>
          )))}</Presence>
        </div>
      )}
      {editing && (
        <FileModal
          initial={editing.file}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onDelete={() => { onChange(list.filter((x) => x.id !== editing.file.id)); setEditing(null); }}
          onSave={(file) => {
            onChange(editing.isNew ? [...list, file] : list.map((x) => (x.id === file.id ? file : x)));
            setEditing(null);
          }}
        />
      )}
    </Section>
  );
}
