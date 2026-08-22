import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Kanban,
  DollarSign,
  FileText,
  Receipt,
  FileSignature,
  Video,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCheck,
  Briefcase,
  Lock,
  History,
} from "lucide-react";
import { db } from "../../lib/firebaseDb";
import { User, PermissionKey, UserHierarchy } from "../../lib/types";
import { hasPermission, isSuperadmin, isAdminOrAbove } from "../../lib/rbac";
import { HesicsLogo } from "../common/HesicsLogo";
import { ToastContainer, showToast } from "../common/Toast";

interface AppShellProps {
  children: React.ReactNode;
  activeUser: User;
  onLogout: () => void;
}

const HierarchyIcon: React.FC<{ h: UserHierarchy }> = ({ h }) => {
  switch (h) {
    case "founder":
    case "admin":
      return <Shield className="w-3 h-3 text-[#77727E]" />;
    case "superadmin":
      return <Lock className="w-3 h-3 text-amber-300" />;
    case "officer":
      return <Briefcase className="w-3 h-3 text-indigo-400" />;
    default:
      return <UserCheck className="w-3 h-3 text-emerald-400" />;
  }
};

const displayTierName = (h: UserHierarchy, roleName?: string) => {
  if (roleName) return roleName;
  if (h === "founder" || h === "admin") return "Chief";
  if (h === "superadmin") return "Superadmin";
  if (h === "officer") return "Officer";
  if (h === "employee") return "Employee";
  return "Intern";
};

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeUser,
  onLogout,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const org = db.getOrg();

  // Private space strictly for Superadmin (Chief is stealth Admin)
  const isSuper = isSuperadmin(activeUser.hierarchy);
  const isAdmin = isAdminOrAbove(activeUser.hierarchy);

  const coldCount = db.getClients().filter((c) => {
    if (c.status !== "active") return false;
    const acts = db.getActivities().filter((a) => a.client_id === c.id);
    let latest = new Date(c.updated_at || c.created_at).getTime();
    acts.forEach((a) => {
      const t = new Date(a.created_at).getTime();
      if (t > latest) latest = t;
    });
    return Math.floor((Date.now() - latest) / (1000 * 60 * 60 * 24)) >= 30;
  }).length;

  const baseNavItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      perm: "deals:read" as PermissionKey,
    },
    ...(isSuper
      ? [
          {
            path: "/private-space",
            label: "Private Vault",
            icon: Lock,
            perm: "superadmin:vault" as PermissionKey,
            badge: "Superadmin",
            badgeColor: "bg-amber-950/40 text-amber-300 border-amber-800/50",
          },
        ]
      : []),
    {
      path: "/clients",
      label: "Clients",
      icon: Users,
      perm: "clients:read" as PermissionKey,
      badge: coldCount > 0 ? `${coldCount} cold` : undefined,
      badgeColor: "bg-amber-950/40 text-amber-400 border-amber-900/40",
    },
    {
      path: "/deals",
      label: "Deals Board",
      icon: Kanban,
      perm: "deals:read" as PermissionKey,
    },
    {
      path: "/meetings",
      label: "Meetings & Calendar",
      icon: Video,
      perm: "clients:read" as PermissionKey,
    },
    {
      path: "/finance",
      label: "Finance & Tax",
      icon: DollarSign,
      perm: "finance:read" as PermissionKey,
    },
    {
      path: "/quotations",
      label: "Quotations",
      icon: FileText,
      perm: "invoices:read" as PermissionKey,
    },
    {
      path: "/invoices",
      label: "Invoices",
      icon: Receipt,
      perm: "invoices:read" as PermissionKey,
    },
    {
      path: "/agreements",
      label: "Agreements",
      icon: FileSignature,
      perm: "clients:read" as PermissionKey,
    },
    {
      path: "/team",
      label: "Team & RBAC",
      icon: ShieldCheck,
      perm: "team:manage" as PermissionKey,
    },
    ...(isAdmin
      ? [
          {
            path: "/audit-logs",
            label: "Audit Logs",
            icon: History,
            perm: "team:manage" as PermissionKey,
          },
        ]
      : []),
    {
      path: "/settings",
      label: "Settings",
      icon: Settings,
      perm: "clients:read" as PermissionKey,
    },
  ];

  const handleSignOutClick = () => {
    showToast(
      "Signed Out",
      "You have been securely signed out of HESICS OS.",
      "info",
    );
    setTimeout(() => {
      onLogout();
    }, 400);
  };

  const isCurrentActive = (itemPath: string) => {
    if (itemPath === "/dashboard") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(itemPath);
  };

  return (
    <div className="flex h-screen bg-[#050505] text-[#A1A1AA] font-sans overflow-hidden select-none">
      {/* Global Toast Alerts */}
      <ToastContainer />

      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? "w-14" : "w-56"
        } transition-all duration-200 border-r border-[#191920] bg-[#09090C] flex flex-col justify-between shrink-0`}
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
              {collapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-2 space-y-0.5">
            {baseNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = isCurrentActive(item.path);
              const isAllowed = hasPermission(
                activeUser.role_id,
                item.perm,
                activeUser.hierarchy,
                activeUser.email,
              );

              return (
                <button
                  key={item.path}
                  disabled={!isAllowed}
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#77727E]/20 text-[#F4F4F6] border border-[#77727E]/40 font-semibold"
                      : isAllowed
                        ? "text-[#888896] hover:text-[#F4F4F6] hover:bg-[#14141A]"
                        : "text-[#353540] cursor-not-allowed opacity-40"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? "text-[#77727E]" : isAllowed ? "text-[#707080]" : "text-[#353540]"}`}
                  />
                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${
                            item.badgeColor ||
                            "bg-rose-950/50 text-rose-400 border-rose-900/40"
                          }`}
                        >
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
        <div className="p-2.5 border-t border-[#191920] bg-[#070709] space-y-2">
          <button
            onClick={handleSignOutClick}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-[#707080] hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 transition-all font-medium"
            title="Sign out of HESICS"
          >
            <div className="flex items-center gap-2 min-w-0">
              <LogOut className="w-3.5 h-3.5 text-rose-400/80 shrink-0" />
              {!collapsed && (
                <span className="truncate text-rose-300 font-semibold">
                  Sign Out
                </span>
              )}
            </div>
            {!collapsed && (
              <span className="text-[10px] text-[#505060]">Exit</span>
            )}
          </button>

          <div className="pt-2 border-t border-[#15151C] flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[#121218] border border-[#262634] flex items-center justify-center shrink-0">
                <HierarchyIcon h={activeUser.hierarchy} />
              </div>
              {!collapsed && (
                <div className="truncate min-w-0">
                  <div className="text-[11px] font-semibold text-[#F4F4F6] truncate leading-tight">
                    {activeUser.name}
                  </div>
                  <div className="text-[9px] text-[#707080] truncate mt-0.5">
                    {displayTierName(
                      activeUser.hierarchy,
                      activeUser.role_name,
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#08080B]">
        <div className="flex-1 overflow-y-auto w-full">{children}</div>
      </main>
    </div>
  );
};
