import { useState } from "react";
import LoginPage from "./LoginPage";
import HausbookPage from "./HausbookPage";

const SUPABASE_URL = "https://xmfynndokdelrqodibhi.supabase.co";
const SUPABASE_KEY = "sb_publishable__Oqv33sP_B9ysl08xJ_SNQ_z8MuTwIU";

async function apiLogout(token) {
  await fetch(SUPABASE_URL + "/auth/v1/logout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + token,
    },
  });
}

export default function App() {
  var [session, setSession] = useState(null);

  function handleLogin(data) {
    setSession(data);
  }

  async function handleLogout() {
    if (session && session.access_token) {
      await apiLogout(session.access_token);
    }
    setSession(null);
  }

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }
  return <HausbookPage onLogout={handleLogout} />;
}
