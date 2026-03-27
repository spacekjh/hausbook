import { useState } from "react";
import LoginPage from "./LoginPage";
import HausbookPage from "./HausbookPage";
import StatsPage from "./StatsPage";

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
  var [page, setPage] = useState("hausbook"); // "hausbook" | "stats"

  function handleLogin(data) {
    setSession(data);
    setPage("hausbook");
  }

  async function handleLogout() {
    if (session && session.access_token) {
      await apiLogout(session.access_token);
    }
    setSession(null);
    setPage("hausbook");
  }

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }
  if (page === "stats") {
    return <StatsPage onBack={function(){ setPage("hausbook"); }} onLogout={handleLogout} />;
  }
  return <HausbookPage onLogout={handleLogout} onStats={function(){ setPage("stats"); }} />;
}
