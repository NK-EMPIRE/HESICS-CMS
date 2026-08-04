import React, { useState } from 'react';
import {
  LayoutDashboard, Users, Kanban, FileText, Receipt,
  ShieldCheck, Settings, ChevronLeft, ChevronRight,
  UserCheck, DollarSign, LogOut, Command
} from 'lucide-react';
import { User, PermissionKey } from '../../lib/types';
import { db } from '../../lib/supabase';
import { getActiveUserPermissions, USER_ROLE_MAP } from '../../lib/rbac';

interface AppShellProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  activeUser: User;
  onUserSwitch: (user: User) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

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
  const allUsers = db.getUsers();

  const userPermissions = getActiveUserPermissions(activeUser.id);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'deals:read' },
    { id: 'clients', label: 'Clients', icon: Users, perm: 'clients:read' },
    { id: 'deals', label: 'Deals Board', icon: Kanban, perm: 'deals:read' },
    { id: 'finance', label: 'Finance & Tax', icon: DollarSign, perm: 'finance:read' },
    { id: 'quotations', label: 'Quotations', icon: FileText, perm: 'invoices:read' },
    { id: 'invoices', label: 'Invoices', icon: Receipt, perm: 'invoices:read' },
    { id: 'team', label: 'Team & RBAC', icon: ShieldCheck, perm: 'team:manage' },
    { id: 'settings', label: 'Settings', icon: Settings, perm: 'clients:read' },
  ];

  return (
    <div className="min-h-screen flex bg-[#191919] text-[#d4d4d4] font-sans">
      {/* Notion-Style Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-14' : 'w-60'
        } transition-all duration-200 border-r border-[#262626] bg-[#1f1f1f] flex flex-col justify-between z-30 sticky top-0 h-screen select-none`}
      >
        <div>
          {/* Header */}
          <div className="h-12 px-3 flex items-center justify-between border-b border-[#262626]">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-6 h-6 rounded bg-[#2e2e2e] border border-[#3d3d3d] flex items-center justify-center font-display font-bold text-xs text-white shrink-0">
                H
              </div>
              {!collapsed && (
                <div className="truncate">
                  <h1 className="font-semibold text-xs text-white truncate tracking-tight">
                    {org.name}
                  </h1>
                </div>
              )}
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 text-[#888888] hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-2 space-y-0.5">
            {!collapsed && (
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#666666]">
                Workspace Modules
              </div>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isAllowed = userPermissions.includes(item.perm as PermissionKey);
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => isAllowed && onTabChange(item.id)}
                  disabled={!isAllowed}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#2d2d2d] text-white font-semibold'
                      : isAllowed
                      ? 'text-[#999999] hover:bg-[#252525] hover:text-[#e5e5e5]'
                      : 'text-[#444444] cursor-not-allowed opacity-40'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#888888]'}`} />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* User Session Footer & Sign Out */}
        <div className="p-2 border-t border-[#262626] bg-[#1a1a1a]">
          {!collapsed && (
            <div className="px-2 py-1 text-[10px] font-semibold text-[#666666] uppercase tracking-wider flex items-center justify-between">
              <span>Active Session</span>
              <button
                onClick={onLogout}
                className="text-[#888888] hover:text-red-400 flex items-center gap-1 text-[10px]"
                title="Sign Out"
              >
                <LogOut className="w-3 h-3" /> Sign Out
              </button>
            </div>
          )}
          <div className="space-y-0.5">
            {allUsers.map((u) => {
              const roleId = USER_ROLE_MAP[u.id];
              const roleName = roleId === 'role-founder' ? 'Founder' : 'Co-founder';
              const isSelected = u.id === activeUser.id;

              return (
                <button
                  key={u.id}
                  onClick={() => onUserSwitch(u)}
                  className={`w-full flex items-center gap-2 p-1.5 rounded-md text-left transition-all ${
                    isSelected
                      ? 'bg-[#2a2a2a] text-white font-medium border border-[#383838]'
                      : 'hover:bg-[#222222] text-[#888888]'
                  }`}
                >
                  <img
                    src={u.avatar_url}
                    alt={u.name}
                    className="w-5 h-5 rounded-full bg-[#333333]"
                  />
                  {!collapsed && (
                    <div className="truncate">
                      <div className="text-[11px] leading-none text-white truncate">{u.name}</div>
                      <div className="text-[9px] text-[#777777] mt-0.5">{roleName}</div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Workspace Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-12 px-6 border-b border-[#262626] bg-[#191919] flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs text-[#888888]">
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
                className="w-6 h-6 rounded-full bg-[#333333]"
              />
              <span className="text-xs font-medium text-white hidden sm:inline">{activeUser.name}</span>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 text-[#888888] hover:text-white hover:bg-[#262626] rounded transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};
