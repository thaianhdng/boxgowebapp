import { useState } from "react";
import { supabase } from "./lib/supabaseClient.js";

// Shown when someone arrives via a Supabase invite (or password-reset) link.
// Clicking that link logs them in automatically but leaves them with no
// password of their own — without this screen they'd have no way to sign
// back in later. See App.jsx for how we detect this case from the URL.
export default function SetPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Drop the invite/recovery token from the URL now that it's used.
    window.history.replaceState({}, "", window.location.pathname);
    onDone();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111",
        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 320,
          padding: 32,
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ color: "#eee", fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Welcome to BOXGO</div>
        <div style={{ color: "#888", fontSize: 12.5, marginBottom: 8 }}>Set a password to finish setting up your account.</div>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          style={inputStyle}
        />
        {error && <div style={{ color: "#ff5c5c", fontSize: 13 }}>{error}</div>}
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Saving…" : "Set password & continue"}
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  padding: "10px 12px",
  background: "#0d0d0d",
  border: "1px solid #333",
  borderRadius: 4,
  color: "#eee",
  fontSize: 14,
  fontFamily: "inherit",
};

const buttonStyle = {
  padding: "10px 12px",
  background: "#FFB020",
  border: "none",
  borderRadius: 4,
  color: "#111",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
};
