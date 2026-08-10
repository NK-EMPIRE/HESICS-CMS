import React, { useState } from 'react';
import {
  LayoutDashboard, Users, Kanban, FileText, Receipt,
  ShieldCheck, Settings, ChevronLeft, ChevronRight,
  DollarSign, LogOut, Crown, Shield, UserCheck
} from 'lucide-react';
import { User, PermissionKey, UserHierarchy } from '../../lib/types';
import { db } from '../../lib/supabase';
import { getPermissionsForRole } from '../../lib/rbac';

interface AppShellProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  activeUser: User;
  onUserSwitch: (user: User) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const HierarchyIcon: React.FC<{ h: UserHierarchy }> = ({ h }) => {
  if (h === 'founder') return <Crown className="w-3 h-3 text-amber-400" />;
  if (h === 'admin') return <Shield className="w-3 h-3 text-blue-400" />;
  return <UserCheck className="w-3 h-3 text-slate-500" />;
};

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onTabChange,
  activeUser,
  onUserSwitch,
  onLogout,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const org = db.getOrg();
  const allUsers = db.getUsers().filter((u) => u.is_active);

  const userPermissions = getPermissionsForRole(activeUser.role_id);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'deals:read' as PermissionKey },
    { id: 'clients', label: 'Clients', icon: Users, perm: 'clients:read' as PermissionKey },
    { id: 'deals', label: 'Deals Board', icon: Kanban, perm: 'deals:read' as PermissionKey },
    { id: 'finance', label: 'Finance & Tax', icon: DollarSign, perm: 'finance:read' as PermissionKey },
    { id: 'quotations', label: 'Quotations', icon: FileText, perm: 'invoices:read' as PermissionKey },
    { id: 'invoices', label: 'Invoices', icon: Receipt, perm: 'invoices:read' as PermissionKey },
    { id: 'team', label: 'Team & RBAC', icon: ShieldCheck, perm: 'team:manage' as PermissionKey },
    { id: 'settings', label: 'Settings', icon: Settings, perm: 'clients:read' as PermissionKey },
  ];

  return (
    <div className="min-h-screen flex bg-[#080808] text-[#d4d4d4] font-sans">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-14' : 'w-60'
        } transition-all duration-200 border-r border-[#1a1a1a] bg-[#0d0d0d] flex flex-col justify-between z-30 sticky top-0 h-screen select-none shrink-0`}
      >
        <div>
          {/* Org Header */}
          <div className="h-12 px-3 flex items-center justify-between border-b border-[#1a1a1a]">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {/* HESICS H-bracket mini mark */}
              <div className="w-6 h-6 rounded bg-[#0d0d0d] border border-[#1E9EFF]/20 flex items-center justify-center shrink-0">
                <svg width="14" height="11" viewBox="0 0 28 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 2H7V10H13V2H18V20H13V13H7V20H2V2Z" fill="white"/>
                  <path d="M20 2L24 2L24 20" stroke="#1E9EFF" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              {!collapsed && (
                <div className="truncate">
                  <h1 className="font-bold text-xs text-white truncate tracking-tight font-display">HESICS</h1>
                  <p className="text-[9px] text-[#444444]">Make It Simple.</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 text-[#666666] hover:text-white hover:bg-[#161616] rounded transition-colors"
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Navigation */}
          <div className="p-2 space-y-0.5 mt-1">
            {!collapsed && (
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#555555]">
                Workspace
              </div>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isAllowed = userPermissions.includes(item.perm);
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => isAllowed && onTabChange(item.id)}
                  disabled={!isAllowed}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#151515] text-white font-semibold'
                      : isAllowed
                      ? 'text-[#888888] hover:bg-[#131313] hover:text-[#e5e5e5]'
                      : 'text-[#3d3d3d] cursor-not-allowed'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1E9EFF]' : isAllowed ? 'text-[#777777]' : 'text-[#3d3d3d]'}`} />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* User Section */}
        <div className="p-2 border-t border-[#1a1a1a] space-y-0.5">
          {!collapsed && (
            <div className="px-2 py-1 text-[10px] font-semibold text-[#555555] uppercase tracking-wider flex items-center justify-between">
              <span>Team</span>
              <button
                onClick={onLogout}
                className="text-[#666666] hover:text-red-400 flex items-center gap-1 transition-colors text-[10px]"
                title="Sign Out"
              >
                <LogOut className="w-3 h-3" /> Out
              </button>
            </div>
          )}
          <div className="space-y-0.5">
            {allUsers.map((u) => {
              const isSelected = u.id === activeUser.id;
              return (
                <button
                  key={u.id}
                  onClick={() => onUserSwitch(u)}
                  title={collapsed ? u.name : undefined}
                  className={`w-full flex items-center gap-2 p-1.5 rounded-md text-left transition-all ${
                    isSelected
                      ? 'bg-[#161616] text-white font-medium border border-[#383838]'
                      : 'hover:bg-[#222222] text-[#777777]'
                  }`}
                >
                  <img
                    src={u.avatar_url}
                    alt={u.name}
                    className={`w-5 h-5 rounded-full bg-[#333333] shrink-0 ${isSelected ? 'ring-1 ring-[#1E9EFF]/50' : ''}`}
                  />
                  {!collapsed && (
                    <div className="truncate flex-1 min-w-0">
                      <div className="text-[11px] leading-none text-white truncate">{u.name.split(' ')[0]}</div>
                      <div className="text-[9px] text-[#555555] mt-0.5 flex items-center gap-0.5">
                        <HierarchyIcon h={u.hierarchy} />
                        <span className="capitalize">{u.hierarchy}</span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {collapsed && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className="w-full p-1.5 flex items-center justify-center text-[#555555] hover:text-red-400 rounded-md transition-colors"
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

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <img
                src={activeUser.avatar_url}
                alt={activeUser.name}
                className="w-6 h-6 rounded-full"
              />
              <div className="hidden sm:block">
                <span className="text-xs font-medium text-white">{activeUser.name.split(' ')[0]}</span>
                <span className="ml-1 text-[10px] text-[#555555] capitalize">· {activeUser.hierarchy}</span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 text-[#666666] hover:text-white hover:bg-[#1a1a1a] rounded transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};
