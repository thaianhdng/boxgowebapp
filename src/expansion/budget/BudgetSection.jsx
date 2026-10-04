import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FieldRow, Modal, Section, Toggle, fieldInput, smallBtn } from "../shared/ui.jsx";
import { uid } from "../../lib/utils.js";

// A project's budget (`project.budget`): one currency and a list of lines,
// each item × quantity × rate, with a running total. A first version, to
// grow with how the owner actually budgets a job.

export const CURRENCIES = [["VND", "VND"], ["USD", "USD"]];

export function money(n, currency) {
  const v = Number(n) || 0;
  return currency === "USD"
    ? `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
    : `${v.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} ₫`;
}

export const lineAmount = (l) => (Number(l.qty) || 0) * (Number(l.rate) || 0);
export const budgetTotal = (budget) => (budget?.lines || []).reduce((sum, l) => sum + lineAmount(l), 0);

// Typed numbers, shown with separators while typing: VND whole numbers
// as 1.500.000, USD (and quantities) as 1,500.50.
const digits = (s, currency) => (currency === "VND"
  ? String(s).replace(/\D/g, "")
  : String(s).replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"));
const grouped = (s, currency) => {
  const [a, b] = String(s ?? "").split(".");
  const int = (a || "").replace(/\B(?=(\d{3})+(?!\d))/g, currency === "VND" ? "." : ",");
  return b !== undefined && currency !== "VND" ? `${int}.${b}` : int;
};

function LineModal({ initial, isNew, currency, onSave, onDelete, onClose }) {
  const [l, setL] = useState(initial);
  const set = (patch) => setL((p) => ({ ...p, ...patch }));
  const ready = l.item.trim() !== "";
  const save = () => ready && onSave({ ...l, item: l.item.trim(), qty: Number(l.qty) || 0, rate: Number(l.rate) || 0 });
  return (
    <Modal
      title={isNew ? "Add budget line" : "Edit budget line"}
      onClose={onClose}
      footer={
        <>
          {!isNew ? <button className="btn btn-ghost" style={{ color: "var(--danger)" }} onClick={onDelete}><Trash2 size={13} /> Delete</button> : <span />}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={!ready} style={{ opacity: ready ? 1 : 0.5 }}>{isNew ? "Add" : "Save"}</button>
          </div>
        </>
      }
    >
      <FieldRow label="Item">
        <input autoFocus value={l.item} onChange={(e) => set({ item: e.target.value })} placeholder="e.g. DOP fee, Camera package" style={{ ...fieldInput, flex: 1, minWidth: 0 }} />
      </FieldRow>
      <FieldRow label="Qty">
        <input inputMode="decimal" value={grouped(l.qty)} onChange={(e) => set({ qty: digits(e.target.value) })} style={{ ...fieldInput, width: 70 }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>× Rate</span>
        <input inputMode={currency === "VND" ? "numeric" : "decimal"} value={grouped(l.rate, currency)} onChange={(e) => set({ rate: digits(e.target.value, currency) })} placeholder="0" style={{ ...fieldInput, flex: 1, minWidth: 0 }} />
      </FieldRow>
      <FieldRow label="">
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>= <b style={{ color: "var(--text)" }}>{money(lineAmount(l), currency)}</b></span>
      </FieldRow>
      <FieldRow label="Note" top>
        <textarea value={l.note} onChange={(e) => set({ note: e.target.value })} rows={2} placeholder="Optional" style={{ ...fieldInput, width: "100%", resize: "vertical" }} />
      </FieldRow>
    </Modal>
  );
}

export function BudgetSection({ budget, onChange }) {
  const [editing, setEditing] = useState(null); // { line, isNew }
  const currency = budget?.currency || "VND";
  const lines = budget?.lines || [];
  const put = (next) => onChange({ currency, lines, ...next });

  return (
    <Section
      id="x-budget"
      title="Budget"
      right={
        <>
          <Toggle options={CURRENCIES} value={currency} onChange={(c) => put({ currency: c })} style={{ padding: 2 }} />
          <button className="btn btn-primary" style={smallBtn} onClick={() => setEditing({ isNew: true, line: { id: uid(), item: "", qty: 1, rate: "", note: "" } })}><Plus size={12} /> Add line</button>
        </>
      }
    >
      {lines.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--muted2)" }}>No budget yet — tap + Add line.</div>
      ) : (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {lines.map((l) => (
            <div key={l.id} className="row" onClick={() => setEditing({ isNew: false, line: l })} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--border)", cursor: "pointer", alignItems: "baseline" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{l.item}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{grouped(l.qty)} × {money(l.rate, currency)}</div>
                {l.note && <div style={{ fontSize: 12, color: "var(--text)", marginTop: 2, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{l.note}</div>}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{money(lineAmount(l), currency)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", alignItems: "baseline" }}>
            <span className="stencil" style={{ fontSize: 11, color: "var(--muted)" }}>Total</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: "var(--accent)" }}>{money(budgetTotal(budget), currency)}</span>
          </div>
        </div>
      )}
      {editing && (
        <LineModal
          initial={editing.line}
          isNew={editing.isNew}
          currency={currency}
          onClose={() => setEditing(null)}
          onDelete={() => { put({ lines: lines.filter((x) => x.id !== editing.line.id) }); setEditing(null); }}
          onSave={(line) => {
            put({ lines: editing.isNew ? [...lines, line] : lines.map((x) => (x.id === line.id ? line : x)) });
            setEditing(null);
          }}
        />
      )}
    </Section>
  );
}
