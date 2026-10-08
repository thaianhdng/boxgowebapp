import { useState } from "react";
import { supabase } from "./lib/supabaseClient.js";
import { Logo } from "./components/Logo.jsx";

const CONTACT_EMAIL = "thaianh.dng@gmail.com";
const CONTACT_PHONE = "(+84)969609379";

// Invite-only sign-in gate. Accounts are created ahead of time in the
// Supabase dashboard (Authentication → Users → Invite) — this screen only
// signs in, it never signs up.
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
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
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 360,
          boxSizing: "border-box",
          padding: 28,
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Logo size={26} style={{ color: "#eee" }} />
          <span style={{ color: "#eee", fontSize: 18, fontWeight: 600 }}>BOXGO</span>
          <span style={{ color: "#888", fontSize: 10.5, letterSpacing: 0.3, textTransform: "uppercase" }}>Equipment List Composer</span>
        </div>
        <div style={{ color: "#aaa", fontSize: 12, lineHeight: 1.6, marginBottom: 8 }}>
          Build camera, lens, grip and lighting lists from your own gear catalog,
          set quantities per shoot day, then export a clean PDF or share a link
          with your crew and rental house.
        </div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          style={inputStyle}
        />
        {error && <div style={{ color: "#ff5c5c", fontSize: 13 }}>{error}</div>}
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <div style={{ borderTop: "1px solid #333", marginTop: 6, paddingTop: 12, fontSize: 11.5, color: "#888", lineHeight: 1.6 }}>
          A personal project, available by invitation only. Need access? Contact{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#FFB020" }}>{CONTACT_EMAIL}</a>
          {" "}or {CONTACT_PHONE}.
        </div>
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
