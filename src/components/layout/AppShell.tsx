import React, { useState } from 'react';
import {
  LayoutDashboard, Users, Kanban, DollarSign, FileText, Receipt,
  ShieldCheck, Settings, LogOut, ChevronLeft, ChevronRight,
  Crown, Shield, UserCheck
} from 'lucide-react';
import { db } from '../../lib/firebaseDb';
import { User, PermissionKey, UserHierarchy } from '../../lib/types';
import { hasPermission } from '../../lib/rbac';
import { HesicsLogo } from '../common/HesicsLogo';

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
    case 'founder': return <Crown className="w-3 h-3 text-amber-400" />;
    case 'admin': return <Shield className="w-3 h-3 text-[#1E9EFF]" />;
    default: return <UserCheck className="w-3 h-3 text-emerald-400" />;
  }
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

  // Calculate overdue count for badge
  const overdueCount = db.getOverdueActivitiesCount();
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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'deals:read' as PermissionKey, badge: overdueCount > 0 ? overdueCount : undefined },
    { id: 'clients', label: 'Clients', icon: Users, perm: 'clients:read' as PermissionKey, badge: coldCount > 0 ? `${coldCount} cold` : undefined, badgeColor: 'bg-amber-950/50 text-amber-400 border-amber-900/50' },
    { id: 'deals', label: 'Deals Board', icon: Kanban, perm: 'deals:read' as PermissionKey },
    { id: 'finance', label: 'Finance & Tax', icon: DollarSign, perm: 'finance:read' as PermissionKey },
    { id: 'quotations', label: 'Quotations', icon: FileText, perm: 'invoices:read' as PermissionKey },
    { id: 'invoices', label: 'Invoices', icon: Receipt, perm: 'invoices:read' as PermissionKey },
    { id: 'team', label: 'Team & RBAC', icon: ShieldCheck, perm: 'team:manage' as PermissionKey },
    { id: 'settings', label: 'Settings', icon: Settings, perm: 'clients:read' as PermissionKey },
  ];

  return (
    <div className="flex h-screen bg-[#080808] text-white font-sans overflow-hidden select-none">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-14' : 'w-56'
        } transition-all duration-200 border-r border-[#1a1a1a] bg-[#0d0d0d] flex flex-col justify-between shrink-0 z-30`}
      >
        {/* Workspace Brand Block */}
        <div>
          <div className="h-12 px-3 border-b border-[#1a1a1a] flex items-center justify-between">
            {!collapsed ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#080808] border border-[#1E9EFF]/30 flex items-center justify-center shrink-0 p-1">
                  <HesicsLogo size={20} variant="glow" />
                </div>
                <div className="truncate min-w-0">
                  <span className="text-xs font-bold tracking-tight text-white block truncate leading-none">
                    {org.name}
                  </span>
                  <span className="text-[9px] text-[#555555] font-medium tracking-wider uppercase block truncate mt-0.5">
                    Make It Simple.
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[#080808] border border-[#1E9EFF]/30 flex items-center justify-center mx-auto p-1">
                <HesicsLogo size={20} variant="glow" />
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 hover:bg-[#1a1a1a] text-[#555555] hover:text-white rounded transition-colors"
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-2 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              const isAllowed = hasPermission(activeUser.role_id, item.perm);

              return (
                <button
                  key={item.id}
                  disabled={!isAllowed}
                  onClick={() => onTabChange(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#1E9EFF]/15 text-[#1E9EFF] border border-[#1E9EFF]/30'
                      : isAllowed
                      ? 'text-[#888888] hover:text-white hover:bg-[#161616]'
                      : 'text-[#333333] cursor-not-allowed opacity-40'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1E9EFF]' : isAllowed ? 'text-[#777777]' : 'text-[#3d3d3d]'}`} />
                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                          item.badgeColor || 'bg-red-950/60 text-red-400 border-red-900/50'
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

        {/* Authenticated User Card at bottom of sidebar */}
        <div className="p-2.5 border-t border-[#1a1a1a] bg-[#090909]">
          {!collapsed ? (
            <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-[#0f0f0f] border border-[#181818]">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <img
                  src={activeUser.avatar_url}
                  alt={activeUser.name}
                  className="w-7 h-7 rounded-full bg-[#1a1a1a] ring-1 ring-[#1E9EFF]/40 shrink-0"
                />
                <div className="truncate min-w-0">
                  <div className="text-xs font-semibold text-white truncate leading-tight">
                    {activeUser.name}
                  </div>
                  <div className="text-[9px] text-[#666666] flex items-center gap-1 mt-0.5 truncate">
                    <HierarchyIcon h={activeUser.hierarchy} />
                    <span className="capitalize font-mono">{activeUser.role_name || activeUser.hierarchy}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-1.5 text-[#555555] hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogout}
              title={`Sign Out (${activeUser.name})`}
              className="w-full p-2 flex items-center justify-center text-[#555555] hover:text-red-400 hover:bg-[#161616] rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-12 px-6 border-b border-[#1a1a1a] bg-[#080808] flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs text-[#666666]">
            <span>{org.name}</span>
            <span>/</span>
            <span className="text-white font-medium capitalize">
              {navItems.find((n) => n.id === currentTab)?.label || currentTab}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img
                src={activeUser.avatar_url}
                alt={activeUser.name}
                className="w-6 h-6 rounded-full ring-1 ring-[#1E9EFF]/30"
              />
              <div className="hidden sm:block">
                <span className="text-xs font-medium text-white">{activeUser.name}</span>
                <span className="ml-1 text-[10px] text-[#555555] capitalize font-mono">· {activeUser.hierarchy}</span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#888888] hover:text-white hover:bg-[#141414] border border-[#1a1a1a] rounded-md transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page View Container */}
        <main className="flex-1 p-6 overflow-y-auto bg-[#080808]">
          {children}
        </main>
      </div>
    </div>
  );
};