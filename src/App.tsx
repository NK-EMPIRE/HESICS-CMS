import React, { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { DealsKanban } from './pages/DealsKanban';
import { Finance } from './pages/Finance';
import { Quotations } from './pages/Quotations';
import { Invoices } from './pages/Invoices';
import { TeamPermissions } from './pages/TeamPermissions';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { db } from './lib/supabase';
import { User } from './lib/types';

const SESSION_KEY = 'hesics_auth_v3';

export function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');

  const [activeUser, setActiveUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (!saved) return null;
      const parsed: User = JSON.parse(saved);
      // Re-hydrate from db in case user data has changed
      const fresh = db.getUserById(parsed.id);
      return fresh || parsed;
    } catch (e) {
      return null;
    }
  });

  // Keyboard shortcuts (c = clients, d = deals, f = finance, q = quotations)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside input/textarea/select
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
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Session write error:', e);
    }
  };

  const handleLogout = () => {
    setActiveUser(null);
    localStorage.removeItem(SESSION_KEY);
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
