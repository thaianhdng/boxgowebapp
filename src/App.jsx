import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient.js";
import Login from "./Login.jsx";
import EquipmentManifest from "./EquipmentManifest.jsx";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = not checked yet, null = signed out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null; // brief flash while checking for an existing session
  if (!session) return <Login />;
  return <EquipmentManifest session={session} />;
}
