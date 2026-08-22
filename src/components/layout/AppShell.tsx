import React, { useState } from 'react';
import {
  LayoutDashboard, Users, Kanban, DollarSign, FileText, Receipt, FileSignature, Video,
  ShieldCheck, Settings, LogOut, ChevronLeft, ChevronRight,
  Shield, UserCheck, Briefcase, Lock, History
} from 'lucide-react';
import { db } from '../../lib/firebaseDb';
import { User, PermissionKey, UserHierarchy } from '../../lib/types';
import { hasPermission, isSuperadmin, isAdminOrAbove } from '../../lib/rbac';
import { HesicsLogo } from '../common/HesicsLogo';
import { ToastContainer, showToast } from '../common/Toast';

interface AppShellProps {
  children: React.ReactNode;
  currentTab: string;
  onTabChange: (tab: string) => void;
  activeUser: User;
  onUserSwitch?: (user: User) => void;
  onLogout: () => void;
}

const HierarchyIcon: React.FC<{ h: UserHierarchy }> = ({ h }) => {
  switch (h) {
    case 'founder':
    case 'admin':
      return <Shield className="w-3 h-3 text-[#77727E]" />;
    case 'superadmin':
      return <Lock className="w-3 h-3 text-amber-300" />;
    case 'officer':
      return <Briefcase className="w-3 h-3 text-indigo-400" />;
    default:
      return <UserCheck className="w-3 h-3 text-emerald-400" />;
  }
};

const displayTierName = (h: UserHierarchy, roleName?: string) => {
  if (roleName) return roleName;
  if (h === 'founder' || h === 'admin') return 'Admin';
  if (h === 'superadmin') return 'Superadmin';
  if (h === 'officer') return 'Officer';
  if (h === 'employee') return 'Employee';
  return 'Intern';
};

export const AppShell: React.FC<AppShellProps> = ({
  children,
  currentTab,
  onTabChange,
  activeUser,
  onLogout,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const org = db.getOrg();

  // Private space strictly for Superadmin (Chief is stealth Admin)
  const isSuper = isSuperadmin(activeUser.hierarchy);
  const isAdmin = isAdminOrAbove(activeUser.hierarchy);

  const coldCount = db.getClients().filter((c) => {
    if (c.status !== 'active') return false;
    const acts = db.getActivities().filter((a) => a.client_id === c.id);
    let latest = new Date(c.updated_at || c.created_at).getTime();
    acts.forEach((a) => {
      const t = new Date(a.created_at).getTime();
      if (t > latest) latest = t;
    });
    return Math.floor((Date.now() - latest) / (1000 * 60 * 60 * 24)) >= 30;
  }).length;

  const baseNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'deals:read' as PermissionKey },
    ...(isSuper
      ? [{ id: 'private_space', label: 'Private Vault', icon: Lock, perm: 'superadmin:vault' as PermissionKey, badge: 'Superadmin', badgeColor: 'bg-amber-950/40 text-amber-300 border-amber-800/50' }]
      : []),
    { id: 'clients', label: 'Clients', icon: Users, perm: 'clients:read' as PermissionKey, badge: coldCount > 0 ? `${coldCount} cold` : undefined, badgeColor: 'bg-amber-950/40 text-amber-400 border-amber-900/40' },
    { id: 'deals', label: 'Deals Board', icon: Kanban, perm: 'deals:read' as PermissionKey },
    { id: 'meetings', label: 'Meetings & Calendar', icon: Video, perm: 'clients:read' as PermissionKey },
    { id: 'finance', label: 'Finance & Tax', icon: DollarSign, perm: 'finance:read' as PermissionKey },
    { id: 'quotations', label: 'Quotations', icon: FileText, perm: 'invoices:read' as PermissionKey },
    { id: 'invoices', label: 'Invoices', icon: Receipt, perm: 'invoices:read' as PermissionKey },
    { id: 'agreements', label: 'Agreements', icon: FileSignature, perm: 'clients:read' as PermissionKey },
    { id: 'team', label: 'Team & RBAC', icon: ShieldCheck, perm: 'team:manage' as PermissionKey },
    ...(isAdmin
      ? [{ id: 'audit_logs', label: 'Audit Logs', icon: History, perm: 'team:manage' as PermissionKey }]
      : []),
    { id: 'settings', label: 'Settings', icon: Settings, perm: 'clients:read' as PermissionKey },
  ];

  const handleSignOutClick = () => {
    showToast('Signed Out', 'You have been securely signed out of HESICS OS.', 'info');
    setTimeout(() => {
      onLogout();
    }, 400);
  };

  return (
    <div className="flex h-screen bg-[#050505] text-[#A1A1AA] font-sans overflow-hidden select-none">
      {/* Global Toast Alerts */}
      <ToastContainer />

      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-14' : 'w-56'
        } transition-all duration-200 border-r border-[#191920] bg-[#09090C] flex flex-col justify-between shrink-0 z-30`}
      >
        {/* Workspace Brand Block */}
        <div>
          <div className="h-12 px-3 border-b border-[#191920] flex items-center justify-between">
            {!collapsed ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#050505] border border-[#77727E]/30 flex items-center justify-center shrink-0 p-1">
                  <HesicsLogo size={20} variant="glow" />
                </div>
                <div className="truncate min-w-0">
                  <span className="text-xs font-bold tracking-tight text-[#F4F4F6] block truncate leading-none">
                    {org.name}
                  </span>
                  <span className="text-[9px] text-[#606070] font-medium tracking-wider uppercase block truncate mt-0.5">
                    Make It Simple.
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[#050505] border border-[#77727E]/30 flex items-center justify-center mx-auto p-1">
                <HesicsLogo size={20} variant="glow" />
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 hover:bg-[#14141A] text-[#606070] hover:text-[#F4F4F6] rounded transition-colors"
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-2 space-y-0.5">
            {baseNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              const isAllowed = hasPermission(activeUser.role_id, item.perm, activeUser.hierarchy, activeUser.email);

              return (
                <button
                  key={item.id}
                  disabled={!isAllowed}
                  onClick={() => onTabChange(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#77727E]/20 text-[#F4F4F6] border border-[#77727E]/40 font-semibold'
                      : isAllowed
                      ? 'text-[#888896] hover:text-[#F4F4F6] hover:bg-[#14141A]'
                      : 'text-[#353540] cursor-not-allowed opacity-40'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#77727E]' : isAllowed ? 'text-[#707080]' : 'text-[#353540]'}`} />
                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${
                          item.badgeColor || 'bg-rose-950/50 text-rose-400 border-rose-900/40'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Authenticated User Card at bottom of sidebar with Dedicated Sign Out Button */}
        <div className="p-2.5 border-t border-[#191920] bg-[#070709] space-y-2">
          <button
            onClick={handleSignOutClick}
            className={`w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-[#808090] hover:text-rose-300 bg-[#0E0E12] hover:bg-rose-950/20 border border-[#1A1A22] hover:border-rose-900/30 transition-all cursor-pointer ${
              collapsed ? 'p-2' : ''
            }`}
            title="Sign Out of Session"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0 text-[#707080] group-hover:text-rose-300" />
            {!collapsed && <span>Sign Out</span>}
          </button>

          {!collapsed ? (
            <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-[#0D0D11] border border-[#181820]">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <img
                  src={activeUser.avatar_url}
                  alt={activeUser.name}
                  className="w-7 h-7 rounded-full bg-[#14141A] ring-1 ring-[#77727E]/40 shrink-0"
                />
                <div className="truncate min-w-0">
                  <div className="text-xs font-semibold text-[#F4F4F6] truncate leading-tight">
                    {activeUser.name}
                  </div>
                  <div className="text-[9px] text-[#606070] flex items-center gap-1 mt-0.5 truncate">
                    <HierarchyIcon h={activeUser.hierarchy} />
                    <span className="capitalize font-mono">{displayTierName(activeUser.hierarchy, activeUser.role_name)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#14141A] ring-1 ring-[#77727E]/40 mx-auto overflow-hidden">
              <img src={activeUser.avatar_url} alt={activeUser.name} className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#050505]">
        {/* Topbar */}
        <header className="h-12 px-6 border-b border-[#191920] bg-[#070709] flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2 text-xs text-[#606070]">
            <span>{org.name}</span>
            <span>/</span>
            <span className="text-[#F4F4F6] font-medium capitalize">
              {baseNavItems.find((n) => n.id === currentTab)?.label || currentTab}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0E0E12] border border-[#1C1C24] text-[11px] font-mono text-[#808090]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>HESICS LIVE OS</span>
            </div>
          </div>
        </header>

        {/* Page View Container */}
        <main className="flex-1 p-6 overflow-y-auto bg-[#050505]">
          {children}
        </main>
      </div>
    </div>
  );
};




