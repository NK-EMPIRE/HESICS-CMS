import React, { useState, useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { DealsKanban } from './pages/DealsKanban';
import { Finance } from './pages/Finance';
import { Quotations } from './pages/Quotations';
import { Invoices } from './pages/Invoices';
import { TeamPermissions } from './pages/TeamPermissions';
import { Settings } from './pages/Settings';
import { PrivateSpace } from './pages/PrivateSpace';
import { AuditLogs } from './pages/AuditLogs';
import { Agreements } from './pages/Agreements';
import { SignAgreement } from './pages/SignAgreement';
import { Login } from './pages/Login';
import { db } from './lib/firebaseDb';
import { getLocalSession, setLocalSession, signOut, onAuthStateChange } from './lib/firebaseAuth';
import { User } from './lib/types';

// Parse hash route for public sign portal
function getHashRoute(): { route: string; param?: string } {
  const hash = window.location.hash.replace('#', '');
  if (hash.startsWith('/sign-agreement/')) {
    return { route: 'sign-agreement', param: hash.replace('/sign-agreement/', '') };
  }
  return { route: '' };
}

export function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [activeUser, setActiveUser] = useState<User | null>(() => getLocalSession());
  const [hashRoute, setHashRoute] = useState(getHashRoute);

  useEffect(() => {
    const handleHash = () => setHashRoute(getHashRoute());
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => { if (user) setActiveUser(user); });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key.toLowerCase()) {
        case 'c': setCurrentTab('clients'); break;
        case 'd': setCurrentTab('deals'); break;
        case 'f': setCurrentTab('finance'); break;
        case 'q': setCurrentTab('quotations'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Public e-sign portal — no auth required
  if (hashRoute.route === 'sign-agreement' && hashRoute.param) {
    return <SignAgreement agreementId={hashRoute.param} />;
  }

  if (!activeUser) {
    return <Login onLogin={(user) => { setActiveUser(user); setLocalSession(user); }} />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':    return <Dashboard activeUser={activeUser} onNavigate={setCurrentTab} />;
      case 'private_space':return <PrivateSpace activeUser={activeUser} />;
      case 'clients':      return <Clients activeUser={activeUser} />;
      case 'deals':        return <DealsKanban activeUser={activeUser} />;
      case 'finance':      return <Finance activeUser={activeUser} />;
      case 'quotations':   return <Quotations activeUser={activeUser} />;
      case 'invoices':     return <Invoices activeUser={activeUser} />;
      case 'agreements':   return <Agreements activeUser={activeUser} />;
      case 'team':         return <TeamPermissions activeUser={activeUser} />;
      case 'audit_logs':   return <AuditLogs activeUser={activeUser} />;
      case 'settings':     return <Settings activeUser={activeUser} />;
      default:             return <Dashboard activeUser={activeUser} onNavigate={setCurrentTab} />;
    }
  };

  return (
    <AppShell currentTab={currentTab} onTabChange={setCurrentTab} activeUser={activeUser} onLogout={async () => { await signOut(); setActiveUser(null); setCurrentTab('dashboard'); }}>
      {renderContent()}
    </AppShell>
  );
}

export default App;
