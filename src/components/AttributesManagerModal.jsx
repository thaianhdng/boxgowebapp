import { useRef } from "react";
import {
  Trash2, FileSpreadsheet, X, Package, ClipboardPaste, Sun, Moon, Monitor,
} from "lucide-react";
import { EditableAttrSection } from "./EditableAttrSection.jsx";
import { ACCENT_CHOICES, FONT_CHOICES } from "../constants.js";


// The selected Light/Dark/System button uses the accent, so picking a
// color visibly changes this panel too.
const selectedModeStyle = { background: "var(--accent)", borderColor: "var(--accent)", color: "var(--accent-text)" };

export function AttributesManagerModal({
  tags, onAddTag, onRenameTag, onRemoveTag,
  productionHouses, onAddProductionHouse, onRenameProductionHouse, onRemoveProductionHouse,
  rentalHouses, onAddRentalHouse, onRenameRentalHouse, onRemoveRentalHouse,
  templates, onDeleteTemplate,
  userName, onSetUserName, userEmail, onSetUserEmail, userPhone, onSetUserPhone,
  includeUsernameInPdf, onSetIncludeUsernameInPdf, includeEmailInPdf, onSetIncludeEmailInPdf, includePhoneInPdf, onSetIncludePhoneInPdf,
  theme, resolvedTheme, onSetTheme, accentId, onSetAccentId, fontId, onSetFontId,
  onOpenCatalog, onExportBackup, onRestoreFileSelect, backupError, onClose, onSignOut,
}) {
  const restoreInputRef = useRef(null);
  return (
    <div className="no-print" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16,
    }}>
      <div style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 400, maxHeight: "88vh", overflowY: "auto", padding: 22, border: "1px solid var(--border2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, position: "sticky", top: -22, background: "var(--surface)", paddingTop: 22, marginTop: -22, zIndex: 5 }}>
          <div className="stencil" style={{ fontSize: 14, color: "var(--accent)" }}>Settings</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)" }}><X size={18} /></button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="stencil" style={{ fontSize: 11, color: "var(--accent)", marginBottom: 6 }}>Master Catalog</div>
          <button
            className="btn btn-ghost"
            style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}
            onClick={onOpenCatalog}
          >
            <Package size={14} /> Manage Master Catalog
          </button>

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onExportBackup}>
              <FileSpreadsheet size={14} /> Backup
            </button>
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => restoreInputRef.current?.click()}>
              <ClipboardPaste size={14} /> Restore
            </button>
            <input
              ref={restoreInputRef}
              type="file"
              accept=".json"
              onChange={onRestoreFileSelect}
              style={{ display: "none" }}
            />
          </div>
          {backupError && (
            <div style={{ fontSize: 11.5, color: "#AA0000", marginBottom: 12 }}>{backupError}</div>
          )}
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            Backup saves every project, tag, house, and the master catalog to one file. Restore lets you pick which parts of that file to bring back.
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="stencil" style={{ fontSize: 11, color: "var(--accent)", marginBottom: 6 }}>Username</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <input
              value={userName}
              onChange={(e) => onSetUserName(e.target.value)}
              placeholder="Your name"
              style={{ flex: 1, fontSize: 13 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--muted)", flexShrink: 0 }}>
              <input type="checkbox" checked={includeUsernameInPdf} onChange={(e) => onSetIncludeUsernameInPdf(e.target.checked)} />
              in PDF
            </label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <input
              value={userEmail}
              onChange={(e) => onSetUserEmail(e.target.value)}
              placeholder="Email"
              type="email"
              style={{ flex: 1, fontSize: 13 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--muted)", flexShrink: 0 }}>
              <input type="checkbox" checked={includeEmailInPdf} onChange={(e) => onSetIncludeEmailInPdf(e.target.checked)} />
              in PDF
            </label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              value={userPhone}
              onChange={(e) => onSetUserPhone(e.target.value)}
              placeholder="Phone number"
              type="tel"
              style={{ flex: 1, fontSize: 13 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--muted)", flexShrink: 0 }}>
              <input type="checkbox" checked={includePhoneInPdf} onChange={(e) => onSetIncludePhoneInPdf(e.target.checked)} />
              in PDF
            </label>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="stencil" style={{ fontSize: 11, color: "var(--accent)", marginBottom: 6 }}>Appearance</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, justifyContent: "center", ...(theme === "light" ? selectedModeStyle : {}) }}
              onClick={() => onSetTheme("light")}
            >
              <Sun size={14} /> Light
            </button>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, justifyContent: "center", ...(theme === "dark" ? selectedModeStyle : {}) }}
              onClick={() => onSetTheme("dark")}
            >
              <Moon size={14} /> Dark
            </button>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, justifyContent: "center", ...(theme === "system" ? selectedModeStyle : {}) }}
              onClick={() => onSetTheme("system")}
            >
              <Monitor size={14} /> System
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {ACCENT_CHOICES.map((a) => (
              <button
                key={a.id}
                onClick={() => onSetAccentId(a.id)}
                title={a.name}
                style={{
                  width: 26, height: 26, borderRadius: "50%", cursor: "pointer",
                  background: resolvedTheme === "dark" ? a.dark : a.light,
                  border: accentId === a.id ? "2px solid var(--text)" : "2px solid transparent",
                  boxShadow: accentId === a.id ? "0 0 0 2px var(--surface)" : "none",
                  padding: 0,
                }}
              />
            ))}
          </div>

          <select
            value={fontId}
            onChange={(e) => onSetFontId(e.target.value)}
            style={{ width: "100%", marginTop: 12, fontSize: 13 }}
          >
            {FONT_CHOICES.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <EditableAttrSection
          title="Project Tags"
          placeholder="New tag…"
          items={tags}
          onAdd={onAddTag}
          onRename={onRenameTag}
          onRemove={onRemoveTag}
          uppercase
        />
        <EditableAttrSection
          title="Production Houses"
          placeholder="New production house…"
          items={productionHouses}
          onAdd={onAddProductionHouse}
          onRename={onRenameProductionHouse}
          onRemove={onRemoveProductionHouse}
        />
        <EditableAttrSection
          title="Rental Houses"
          placeholder="New rental house…"
          items={rentalHouses}
          onAdd={onAddRentalHouse}
          onRename={onRenameRentalHouse}
          onRemove={onRemoveRentalHouse}
        />

        {templates.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="stencil" style={{ fontSize: 11, color: "var(--accent)", marginBottom: 6 }}>Templates</div>
            {templates.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13 }}>{t.name}</span>
                <button onClick={() => onDeleteTemplate(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 20 }}>
          Click a name to rename it — this updates every project using it. Removing one just takes it off the list; projects already using it keep their saved value.
        </div>

        <button
          className="btn btn-ghost"
          style={{ width: "100%", justifyContent: "center", color: "#AA0000" }}
          onClick={onSignOut}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
