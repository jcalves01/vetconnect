/* ============================================================================
   App.jsx — FRONTEND ENTRY POINT
   ----------------------------------------------------------------------------
   Logged-out visitors see AuthScreen; logged-in users get a 5-tab shell
   (Feed / Mensagens / Vagas / Casos SOAP / Perfil), switched via local state
   — see CLAUDE.md for why no router was introduced for this.
   ============================================================================ */

import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import AuthScreen from "./components/auth/AuthScreen.jsx";
import TabNav from "./components/layout/TabNav.jsx";
import Feed from "./components/feed/Feed.jsx";
import Messages from "./components/messages/Messages.jsx";
import Jobs from "./components/jobs/Jobs.jsx";
import SoapCases from "./components/soap/SoapCases.jsx";
import Profile from "./components/profile/Profile.jsx";
import { mutedText } from "./styles.js";

function AppShell() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("feed");

  if (loading) {
    return <p style={{ ...mutedText, textAlign: "center", marginTop: "20vh" }}>A carregar…</p>;
  }

  if (!user) return <AuthScreen />;

  return (
    <>
      <TabNav active={tab} onChange={setTab} />
      {tab === "feed" && <Feed />}
      {tab === "messages" && <Messages />}
      {tab === "jobs" && <Jobs />}
      {tab === "soap" && <SoapCases />}
      {tab === "profile" && <Profile />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
