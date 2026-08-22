import React, { useState, useEffect } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";

import { AppShell } from "./components/layout/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { Clients } from "./pages/Clients";
import { ClientDetail } from "./pages/ClientDetail";
import { DealsKanban } from "./pages/DealsKanban";
import { Finance } from "./pages/Finance";
import { Quotations } from "./pages/Quotations";
import { Invoices } from "./pages/Invoices";
import { TeamPermissions } from "./pages/TeamPermissions";
import { Settings } from "./pages/Settings";
import { PrivateSpace } from "./pages/PrivateSpace";
import { AuditLogs } from "./pages/AuditLogs";
import { Agreements } from "./pages/Agreements";
import { Meetings } from "./pages/Meetings";
import { SignAgreement } from "./pages/SignAgreement";
import { Login } from "./pages/Login";
import {
  getLocalSession,
  setLocalSession,
  signOut,
  onAuthStateChange,
} from "./lib/firebaseAuth";
import { User } from "./lib/types";

// ClientDetail wrapper extracting :clientId from route params
function ClientDetailRouteWrapper({ activeUser }: { activeUser: User }) {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  return (
    <ClientDetail
      clientId={clientId || ""}
      activeUser={activeUser}
      onBack={() => navigate("/clients")}
    />
  );
}

// SignAgreement wrapper extracting :agreementId
function SignAgreementRouteWrapper() {
  const { agreementId } = useParams<{ agreementId: string }>();
  return <SignAgreement agreementId={agreementId || ""} />;
}

// Keyboard shortcuts listener component (inside Router context)
function KeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ||
          el.isContentEditable ||
          el.closest("[data-custom-input]"))
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key.toLowerCase()) {
        case "c":
          navigate("/clients");
          break;
        case "d":
          navigate("/deals");
          break;
        case "f":
          navigate("/finance");
          break;
        case "q":
          navigate("/quotations");
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return null;
}

export function App() {
  const [activeUser, setActiveUser] = useState<User | null>(() =>
    getLocalSession(),
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      if (user) setActiveUser(user);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await signOut();
    setActiveUser(null);
  };

  return (
    <HashRouter>
      <KeyboardShortcuts />
      <Routes>
        {/* Public E-Sign Portal — No Auth Required */}
        <Route
          path="/sign-agreement/:agreementId"
          element={<SignAgreementRouteWrapper />}
        />

        {/* Authenticated Dashboard / Workspaces */}
        {!activeUser ? (
          <Route
            path="*"
            element={
              <Login
                onLogin={(user) => {
                  setActiveUser(user);
                  setLocalSession(user);
                }}
              />
            }
          />
        ) : (
          <Route
            path="/*"
            element={
              <AppShell activeUser={activeUser} onLogout={handleLogout}>
                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to="/dashboard" replace />}
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <Dashboard
                        activeUser={activeUser}
                        onNavigate={() => {}}
                      />
                    }
                  />
                  <Route
                    path="/clients"
                    element={<Clients activeUser={activeUser} />}
                  />
                  <Route
                    path="/clients/:clientId"
                    element={
                      <ClientDetailRouteWrapper activeUser={activeUser} />
                    }
                  />
                  <Route
                    path="/deals"
                    element={<DealsKanban activeUser={activeUser} />}
                  />
                  <Route
                    path="/meetings"
                    element={<Meetings activeUser={activeUser} />}
                  />
                  <Route
                    path="/finance"
                    element={<Finance activeUser={activeUser} />}
                  />
                  <Route
                    path="/quotations"
                    element={<Quotations activeUser={activeUser} />}
                  />
                  <Route
                    path="/quotations/:quoteId"
                    element={<Quotations activeUser={activeUser} />}
                  />
                  <Route
                    path="/invoices"
                    element={<Invoices activeUser={activeUser} />}
                  />
                  <Route
                    path="/invoices/:invoiceId"
                    element={<Invoices activeUser={activeUser} />}
                  />
                  <Route
                    path="/agreements"
                    element={<Agreements activeUser={activeUser} />}
                  />
                  <Route
                    path="/team"
                    element={<TeamPermissions activeUser={activeUser} />}
                  />
                  <Route
                    path="/audit-logs"
                    element={<AuditLogs activeUser={activeUser} />}
                  />
                  <Route
                    path="/private-space"
                    element={<PrivateSpace activeUser={activeUser} />}
                  />
                  <Route
                    path="/settings"
                    element={<Settings activeUser={activeUser} />}
                  />
                  <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                  />
                </Routes>
              </AppShell>
            }
          />
        )}
      </Routes>
      <Analytics />
    </HashRouter>
  );
}

export default App;
