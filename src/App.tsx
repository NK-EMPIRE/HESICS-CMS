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
import { Login } from './pages/Login';
import { INITIAL_USERS } from './lib/mockData';
import { User } from './lib/types';

const SESSION_KEY = 'hesics_auth_user_v2';

export function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [activeUser, setActiveUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

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
  };

  // Guarded Route: Show Login if unauthenticated
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
