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
import { Login } from './pages/Login';
import { db } from './lib/firebaseDb';
import { getLocalSession, setLocalSession, signOut, onAuthStateChange } from './lib/firebaseAuth';
import { User } from './lib/types';

export function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [activeUser, setActiveUser] = useState<User | null>(() => getLocalSession());

  // Listen for real-time auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      if (user) {
        setActiveUser(user);
      }
    });
    return unsubscribe;
  }, []);

  // Keyboard shortcuts (c = clients, d = deals, f = finance, q = quotations)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName)) return;
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

  const handleLogin = (user: User) => {
    setActiveUser(user);
    setLocalSession(user);
  };

  const handleLogout = async () => {
    await signOut();
    setActiveUser(null);
    setCurrentTab('dashboard');
  };

  // Show Login if unauthenticated
  if (!activeUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard activeUser={activeUser} onNavigate={setCurrentTab} />;
      case 'private_space':
        return <PrivateSpace activeUser={activeUser} />;
      case 'clients':
        return <Clients activeUser={activeUser} />;
      case 'deals':
        return <DealsKanban activeUser={activeUser} />;
      case 'finance':
        return <Finance activeUser={activeUser} />;
      case 'quotations':
        return <Quotations activeUser={activeUser} />;
      case 'invoices':
        return <Invoices activeUser={activeUser} />;
      case 'team':
        return <TeamPermissions activeUser={activeUser} />;
      case 'settings':
        return <Settings activeUser={activeUser} />;
      default:
        return <Dashboard activeUser={activeUser} onNavigate={setCurrentTab} />;
    }
  };

  return (
    <AppShell
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      activeUser={activeUser}
      onUserSwitch={handleLogin}
      onLogout={handleLogout}
    >
      {renderContent()}
    </AppShell>
  );
}

export default App;
