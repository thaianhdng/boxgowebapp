import { useState } from "react";
import { supabase } from "./lib/supabaseClient.js";

// Single-user sign-in gate. The user account was created ahead of time in
// the Supabase dashboard (Authentication → Users) — this screen only signs
// in, it never signs up, since BOXGO isn't meant to onboard new accounts.
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
        <div style={{ color: "#eee", fontSize: 18, fontWeight: 600, marginBottom: 8 }}>BOXGO</div>
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
