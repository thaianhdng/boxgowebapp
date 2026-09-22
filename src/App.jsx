import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient.js";
import Login from "./Login.jsx";
import SetPassword from "./SetPassword.jsx";
import EquipmentManifest from "./EquipmentManifest.jsx";
import { SharedListView } from "./components/SharedListView.jsx";

const shareMatch = window.location.pathname.match(/^\/share\/([0-9a-f-]{36})\/?$/i);

// Supabase appends #...&type=invite (or type=recovery) to the redirect URL
// after someone clicks an invite or password-reset email — it logs them in
// automatically but leaves no password set, so that link type routes to
// SetPassword instead of straight into the app.
function isAuthLinkType(type) {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(hash).get("type") === type;
}

export default function App() {
  if (shareMatch) return <SharedListView token={shareMatch[1]} />;
  return <AuthedApp />;
}

function AuthedApp() {
  const [session, setSession] = useState(undefined); // undefined = not checked yet, null = signed out
  const [needsPassword, setNeedsPassword] = useState(
    () => isAuthLinkType("invite") || isAuthLinkType("recovery")
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null; // brief flash while checking for an existing session
  if (session && needsPassword) return <SetPassword onDone={() => setNeedsPassword(false)} />;
  if (!session) return <Login />;
  return <EquipmentManifest session={session} />;
}
