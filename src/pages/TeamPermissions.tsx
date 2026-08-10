import React, { useState } from 'react';
import {
  ShieldCheck, Users, CheckCircle2, XCircle,
  UserPlus, Key, Crown, Shield, UserCheck,
  MoreHorizontal, UserX, Pencil, X, ChevronDown
} from 'lucide-react';
import { db } from '../lib/supabase';
import { PermissionKey, User, UserHierarchy } from '../lib/types';
import { ROLE_PERMISSIONS, isAdminOrAbove, canManageUser } from '../lib/rbac';
import { INITIAL_ROLES } from '../lib/mockData';

interface TeamPermissionsProps {
  activeUser: User;
}

const ALL_PERMISSIONS: { key: PermissionKey; title: string; category: string }[] = [
  { key: 'clients:read', title: 'View Clients Directory', category: 'CRM' },
  { key: 'clients:write', title: 'Create & Edit Clients', category: 'CRM' },
  { key: 'clients:delete', title: 'Delete Clients', category: 'CRM' },
  { key: 'deals:read', title: 'View Deals & Pipeline', category: 'CRM' },
  { key: 'deals:write', title: 'Create & Edit Deals', category: 'CRM' },
  { key: 'invoices:read', title: 'View Quotes & Invoices', category: 'Finance' },
  { key: 'invoices:write', title: 'Issue Quotes & Invoices', category: 'Finance' },
  { key: 'finance:read', title: 'View Financial Dashboards', category: 'Finance' },
  { key: 'finance:write', title: 'Manage Income & Expenses', category: 'Finance' },
  { key: 'team:manage', title: 'Manage Team & Roles', category: 'Admin' },
  { key: 'team:invite', title: 'Invite Team Members', category: 'Admin' },
  { key: 'org:admin', title: 'Org-Level Admin Control', category: 'Admin' },
];

const HierarchyIcon: React.FC<{ h: UserHierarchy; className?: string }> = ({ h, className = 'w-3.5 h-3.5' }) => {
  if (h === 'founder') return <Crown className={`${className} text-amber-400`} />;
  if (h === 'admin') return <Shield className={`${className} text-blue-400`} />;
  return <UserCheck className={`${className} text-slate-400`} />;
};

const hierarchyBadge: Record<UserHierarchy, string> = {
  founder: 'text-amber-400 bg-amber-950/40 border-amber-900/50',
  admin: 'text-blue-400 bg-blue-950/40 border-blue-900/50',
  employee: 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50',
  intern: 'text-slate-400 bg-slate-800/40 border-slate-700/50',
};

interface InviteFormData {
  name: string;
  email: string;
  role_id: string;
  department: string;
}

export const TeamPermissions: React.FC<TeamPermissionsProps> = ({ activeUser }) => {
  const [users, setUsers] = useState(() => db.getUsers());
  const roles = db.getRoles();
  const canManage = isAdminOrAbove(activeUser.hierarchy);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState<InviteFormData>({
    name: '', email: '', role_id: 'role-sales', department: '',
  });
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const refreshUsers = () => setUsers(db.getUsers());

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData.name || !inviteData.email || !inviteData.role_id) return;

    const role = roles.find((r) => r.id === inviteData.role_id);
    db.addUser({
      name: inviteData.name,
      email: inviteData.email,
      role_id: inviteData.role_id,
      role_name: role?.name,
      hierarchy: role?.hierarchy_level || 'employee',
      department: inviteData.department || undefined,
      is_active: true,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(inviteData.name)}`,
    });
    refreshUsers();
    setInviteSuccess(`${inviteData.name} added to the team.`);
    setInviteData({ name: '', email: '', role_id: 'role-sales', department: '' });
    setTimeout(() => {
      setInviteSuccess('');
      setShowInviteForm(false);
    }, 2000);
  };

  const handleDeactivate = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    if (target.hierarchy === 'founder') {
      alert('Cannot deactivate the Founder account.');
      return;
    }
    if (!canManageUser(activeUser.hierarchy, target.hierarchy)) {
      alert('You cannot manage users at your own or higher level.');
      return;
    }
    db.deactivateUser(userId);
    refreshUsers();
    setActiveMenu(null);
  };

  const handleRemove = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    if (target.hierarchy === 'founder') {
      alert('Cannot remove the Founder account.');
      return;
    }
    if (!canManageUser(activeUser.hierarchy, target.hierarchy)) {
      alert('You cannot remove users at your own or higher level.');
      return;
    }
    if (!confirm(`Remove ${target.name} from the team? This cannot be undone.`)) return;
    db.removeUser(userId);
    refreshUsers();
    setActiveMenu(null);
  };

  const activeUsers = users.filter((u) => u.is_active);
  const inactiveUsers = users.filter((u) => !u.is_active);

  // Group by hierarchy
  const founders = activeUsers.filter((u) => u.hierarchy === 'founder');
  const admins = activeUsers.filter((u) => u.hierarchy === 'admin');
  const employees = activeUsers.filter((u) => u.hierarchy === 'employee');
  const interns = activeUsers.filter((u) => u.hierarchy === 'intern');

  const roleColumns = [
    { id: 'role-founder', label: 'Founder' },
    { id: 'role-admin', label: 'Admin' },
    { id: 'role-sales', label: 'Sales' },
    { id: 'role-finance', label: 'Finance' },
    { id: 'role-design', label: 'Design' },
    { id: 'role-intern', label: 'Intern' },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#262626]">
        <div>
          <div className="text-2xl mb-1">👥</div>
          <h1 className="text-xl font-bold text-white tracking-tight">Team & Permissions</h1>
          <p className="text-[11px] text-[#666666] mt-0.5">
            Org hierarchy · Role-based access control · {activeUsers.length} active members
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#FF6B00] hover:bg-[#ea580c] text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Member
          </button>
        )}
      </div>

      {/* Invite Form */}
      {showInviteForm && canManage && (
        <div className="p-5 bg-[#1d1d1d] border border-[#2e2e2e] rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Add Team Member</h3>
            <button onClick={() => setShowInviteForm(false)} className="text-[#666666] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {inviteSuccess ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-lg text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> {inviteSuccess}
            </div>
          ) : (
            <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#666666] mb-1">Full Name *</label>
                <input
                  required
                  value={inviteData.name}
                  onChange={(e) => setInviteData((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Ravi Kumar"
                  className="w-full px-3 py-2 bg-[#191919] border border-[#2e2e2e] rounded-lg text-xs text-white placeholder-[#444444] focus:outline-none focus:border-[#555555]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#666666] mb-1">Work Email *</label>
                <input
                  required
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData((d) => ({ ...d, email: e.target.value }))}
                  placeholder="ravi@hesics.com"
                  className="w-full px-3 py-2 bg-[#191919] border border-[#2e2e2e] rounded-lg text-xs text-white placeholder-[#444444] focus:outline-none focus:border-[#555555]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#666666] mb-1">Role *</label>
                <div className="relative">
                  <select
                    required
                    value={inviteData.role_id}
                    onChange={(e) => setInviteData((d) => ({ ...d, role_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#191919] border border-[#2e2e2e] rounded-lg text-xs text-white focus:outline-none focus:border-[#555555] appearance-none"
                  >
                    {roles
                      .filter((r) => {
                        // Founder can assign any role; Admin cannot assign founder or admin
                        if (activeUser.hierarchy === 'founder') return true;
                        return r.hierarchy_level !== 'founder' && r.hierarchy_level !== 'admin';
                      })
                      .map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-[#666666] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#666666] mb-1">Department</label>
                <input
                  value={inviteData.department}
                  onChange={(e) => setInviteData((d) => ({ ...d, department: e.target.value }))}
                  placeholder="e.g. Sales, Design..."
                  className="w-full px-3 py-2 bg-[#191919] border border-[#2e2e2e] rounded-lg text-xs text-white placeholder-[#444444] focus:outline-none focus:border-[#555555]"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="px-4 py-1.5 text-xs text-[#888888] hover:text-white border border-[#333333] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#FF6B00] hover:bg-[#ea580c] text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Add to Team
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Org Hierarchy View */}
      <div className="space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#555555]">Organisation Hierarchy</p>

        {/* Founder tier */}
        {founders.map((u) => (
          <div key={u.id} className="p-4 bg-[#1d1d1d] border border-amber-900/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={u.avatar_url} alt={u.name} className="w-9 h-9 rounded-full ring-2 ring-amber-500/30" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{u.name}</span>
                  <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${hierarchyBadge[u.hierarchy]}`}>
                    <Crown className="w-2.5 h-2.5" /> Founder & Owner
                  </span>
                </div>
                <div className="text-[11px] text-[#666666] mt-0.5">{u.email}</div>
              </div>
            </div>
            <div className="text-[10px] text-[#555555]">All permissions</div>
          </div>
        ))}

        {/* Vertical connector + Admin tier */}
        {admins.length > 0 && (
          <div className="ml-4 pl-4 border-l border-[#2e2e2e] space-y-2">
            <p className="text-[10px] text-[#555555] uppercase font-semibold tracking-wider">Admins</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {admins.map((u) => (
                <UserCard key={u.id} user={u} activeUser={activeUser} canManage={canManage}
                  onDeactivate={handleDeactivate} onRemove={handleRemove}
                  activeMenu={activeMenu} setActiveMenu={setActiveMenu}
                />
              ))}
            </div>
          </div>
        )}

        {/* Employees tier */}
        {employees.length > 0 && (
          <div className="ml-4 pl-4 border-l border-[#2e2e2e] space-y-2">
            <p className="text-[10px] text-[#555555] uppercase font-semibold tracking-wider">Employees</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {employees.map((u) => (
                <UserCard key={u.id} user={u} activeUser={activeUser} canManage={canManage}
                  onDeactivate={handleDeactivate} onRemove={handleRemove}
                  activeMenu={activeMenu} setActiveMenu={setActiveMenu}
                />
              ))}
            </div>
          </div>
        )}

        {/* Interns tier */}
        {interns.length > 0 && (
          <div className="ml-8 pl-4 border-l border-[#2e2e2e] space-y-2">
            <p className="text-[10px] text-[#555555] uppercase font-semibold tracking-wider">Interns</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {interns.map((u) => (
                <UserCard key={u.id} user={u} activeUser={activeUser} canManage={canManage}
                  onDeactivate={handleDeactivate} onRemove={handleRemove}
                  activeMenu={activeMenu} setActiveMenu={setActiveMenu}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {founders.length === 0 && admins.length === 0 && employees.length === 0 && interns.length === 0 && (
          <div className="py-12 text-center border border-dashed border-[#2a2a2a] rounded-xl">
            <p className="text-xs text-[#666666]">No active team members.</p>
          </div>
        )}

        {/* Inactive members */}
        {inactiveUsers.length > 0 && (
          <div className="pt-2">
            <p className="text-[10px] text-[#444444] uppercase font-semibold tracking-wider mb-2">Deactivated</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {inactiveUsers.map((u) => (
                <div key={u.id} className="p-3 bg-[#181818] border border-[#222222] rounded-lg flex items-center gap-2.5 opacity-50">
                  <img src={u.avatar_url} alt={u.name} className="w-7 h-7 rounded-full grayscale" />
                  <div>
                    <div className="text-xs font-medium text-[#666666]">{u.name}</div>
                    <div className="text-[10px] text-[#444444]">Deactivated</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Permission Matrix */}
      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#555555]">Role Permission Matrix</p>
          <p className="text-[10px] text-[#444444] mt-0.5">Evaluated at runtime — roles determine what each member can access</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="py-2 pr-4 text-[10px] font-semibold uppercase tracking-wider text-[#666666] min-w-[160px]">Permission</th>
                {roleColumns.map((rc) => (
                  <th key={rc.id} className="py-2 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[#666666]">
                    {rc.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Group by category */}
              {['CRM', 'Finance', 'Admin'].map((category) => (
                <React.Fragment key={category}>
                  <tr>
                    <td colSpan={roleColumns.length + 1} className="pt-4 pb-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#FF6B00]">{category}</span>
                    </td>
                  </tr>
                  {ALL_PERMISSIONS.filter((p) => p.category === category).map((p) => (
                    <tr key={p.key} className="border-b border-[#1e1e1e] hover:bg-[#1f1f1f] transition-colors">
                      <td className="py-2 pr-4">
                        <div className="text-[11px] font-medium text-[#cccccc]">{p.title}</div>
                        <div className="text-[9px] font-mono text-[#444444]">{p.key}</div>
                      </td>
                      {roleColumns.map((rc) => {
                        const isGranted = (ROLE_PERMISSIONS[rc.id] || []).includes(p.key);
                        return (
                          <td key={rc.id} className="py-2 px-3 text-center">
                            {isGranted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-[#333333] inline" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Reusable user card component
const UserCard: React.FC<{
  user: User;
  activeUser: User;
  canManage: boolean;
  onDeactivate: (id: string) => void;
  onRemove: (id: string) => void;
  activeMenu: string | null;
  setActiveMenu: (id: string | null) => void;
}> = ({ user, activeUser, canManage, onDeactivate, onRemove, activeMenu, setActiveMenu }) => {
  const badge = hierarchyBadge[user.hierarchy];
  const isSelf = user.id === activeUser.id;
  const canAct = canManage && !isSelf && canManageUser(activeUser.hierarchy, user.hierarchy);

  return (
    <div className="p-3 bg-[#1d1d1d] border border-[#2a2a2a] rounded-lg flex items-center justify-between hover:border-[#383838] transition-colors relative">
      <div className="flex items-center gap-2.5">
        <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full" />
        <div>
          <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1.5">
            {user.name}
            {isSelf && <span className="text-[9px] text-[#666666]">(you)</span>}
          </div>
          <div className="text-[10px] text-[#666666] mt-0.5">{user.role_name || user.hierarchy}</div>
          {user.department && (
            <div className="text-[9px] text-[#555555]">{user.department}</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${badge}`}>
          {user.hierarchy}
        </span>
        {canAct && (
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
              className="p-1 text-[#555555] hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {activeMenu === user.id && (
              <div className="absolute right-0 top-7 z-20 bg-[#1a1a1a] border border-[#333333] rounded-lg shadow-xl shadow-black/50 min-w-[130px] py-1 text-xs">
                <button
                  onClick={() => onDeactivate(user.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[#aaaaaa] hover:bg-[#2a2a2a] hover:text-white transition-colors text-left"
                >
                  <UserX className="w-3.5 h-3.5" /> Deactivate
                </button>
                <button
                  onClick={() => onRemove(user.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-red-400 hover:bg-[#2a2a2a] transition-colors text-left"
                >
                  <X className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
