import React, { useState } from 'react';
import {
  ShieldCheck, Users, CheckCircle2, XCircle,
  UserPlus, Shield, UserCheck, Trash2,
  UserX, Pencil, X, ChevronDown, Plus, Briefcase
} from 'lucide-react';
import { db } from '../lib/firebaseDb';
import { PermissionKey, User, UserHierarchy, Role } from '../lib/types';
import {
  isAdminOrAbove, canManageUser, getAllowedRoleTiers,
  isMasterRoot, getPermissionsForRole
} from '../lib/rbac';

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
  if (h === 'founder' || h === 'admin') return <Shield className={`${className} text-[#1E9EFF]`} />;
  if (h === 'officer') return <Briefcase className={`${className} text-indigo-400`} />;
  return <UserCheck className={`${className} text-emerald-400`} />;
};

const hierarchyBadge: Record<UserHierarchy, string> = {
  founder: 'text-[#1E9EFF] bg-[#1E9EFF]/10 border-[#1E9EFF]/30',
  admin: 'text-[#1E9EFF] bg-[#1E9EFF]/10 border-[#1E9EFF]/30',
  officer: 'text-indigo-400 bg-indigo-950/40 border-indigo-900/50',
  employee: 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50',
  intern: 'text-slate-400 bg-slate-800/40 border-slate-700/50',
};

const hierarchyDisplayName: Record<UserHierarchy, string> = {
  founder: 'Admin',
  admin: 'Admin',
  officer: 'Officer',
  employee: 'Employee',
  intern: 'Intern',
};

interface InviteFormData {
  name: string;
  email: string;
  role_id: string;
  department: string;
}

export const TeamPermissions: React.FC<TeamPermissionsProps> = ({ activeUser }) => {
  const [users, setUsers] = useState(() => db.getUsers(activeUser.email));
  const roles = db.getRoles();
  const canManage = isAdminOrAbove(activeUser.hierarchy);
  const isMaster = isMasterRoot(activeUser.email);
  const allowedTiers = getAllowedRoleTiers(activeUser.hierarchy, activeUser.email);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showCreateRoleForm, setShowCreateRoleForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleTier, setNewRoleTier] = useState<UserHierarchy>('employee');

  const [inviteData, setInviteData] = useState<InviteFormData>({
    name: '', email: '', role_id: roles[0]?.id || 'role-admin', department: '',
  });
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const refreshUsers = () => setUsers(db.getUsers(activeUser.email));

  const availableRoles = roles.filter((r) => allowedTiers.includes(r.hierarchy_level));

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!inviteData.name || !inviteData.email || !inviteData.role_id) return;

    const role = roles.find((r) => r.id === inviteData.role_id);
    const targetHierarchy = role?.hierarchy_level || 'employee';

    // Verify permission: Only master root can create admin
    if (targetHierarchy === 'admin' && !isMaster) {
      setErrorMessage('Permission Denied: Only organization owners can provision new Admins.');
      return;
    }

    db.addUser({
      name: inviteData.name,
      email: inviteData.email.trim().toLowerCase(),
      role_id: inviteData.role_id,
      role_name: role?.name || 'Team Member',
      hierarchy: targetHierarchy,
      department: inviteData.department || 'Operations',
      is_active: true,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(inviteData.name)}`,
    });

    refreshUsers();
    setInviteSuccess(`${inviteData.name} added to the team.`);
    setInviteData({ name: '', email: '', role_id: availableRoles[0]?.id || 'role-officer', department: '' });
    setTimeout(() => {
      setInviteSuccess('');
      setShowInviteForm(false);
    }, 2000);
  };

  const handleCreateCustomRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    if (newRoleTier === 'admin' && !isMaster) {
      alert('Only organization owners can create Admin level roles.');
      return;
    }

    db.addRole({
      name: newRoleName.trim(),
      description: newRoleDesc.trim() || undefined,
      hierarchy_level: newRoleTier,
    });

    setNewRoleName('');
    setNewRoleDesc('');
    setShowCreateRoleForm(false);
  };

  const handleDeactivate = (targetUser: User) => {
    if (!canManageUser(activeUser.hierarchy, targetUser.hierarchy, activeUser.email)) {
      alert('You do not have permission to modify this user account.');
      return;
    }
    db.deactivateUser(targetUser.id);
    refreshUsers();
  };

  const handleReactivate = (targetUser: User) => {
    if (!canManageUser(activeUser.hierarchy, targetUser.hierarchy, activeUser.email)) {
      alert('You do not have permission to modify this user account.');
      return;
    }
    db.updateUser(targetUser.id, { is_active: true });
    refreshUsers();
  };

  const handleDelete = (targetUser: User) => {
    if (!canManageUser(activeUser.hierarchy, targetUser.hierarchy, activeUser.email)) {
      alert('You do not have permission to remove this user.');
      return;
    }
    if (window.confirm(`Permanently remove ${targetUser.name} from the organization roster?`)) {
      db.removeUser(targetUser.id);
      refreshUsers();
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a1a1a]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight font-display">Team & Access Control</h1>
          <p className="text-[11px] text-[#666666] mt-0.5">
            Role-Based Access Control, team roster, and operational permissions.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateRoleForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#121212] hover:bg-[#181818] border border-[#1e1e1e] text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#1E9EFF]" /> Create Role
            </button>
            <button
              onClick={() => setShowInviteForm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1E9EFF] hover:bg-[#0A8AE6] text-white text-xs font-semibold rounded-lg transition-colors shadow-lg shadow-[#1E9EFF]/10"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add Team Member
            </button>
          </div>
        )}
      </div>

      {/* Add Team Member Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#161616] pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#1E9EFF]" /> Provision Team Member
              </h2>
              <button
                onClick={() => setShowInviteForm(false)}
                className="text-[#666666] hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-red-400">
                {errorMessage}
              </div>
            )}
            {inviteSuccess && (
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-900/50 rounded-lg text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {inviteSuccess}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#666666] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={inviteData.name}
                  onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                  placeholder="e.g. Sheik Mydeen"
                  className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-white text-xs focus:outline-none focus:border-[#1E9EFF]/40"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#666666] mb-1">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  placeholder="name@hesics.com"
                  className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-white text-xs focus:outline-none focus:border-[#1E9EFF]/40"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#666666] mb-1">
                  Assigned Role *
                </label>
                <select
                  value={inviteData.role_id}
                  onChange={(e) => setInviteData({ ...inviteData, role_id: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-white text-xs focus:outline-none focus:border-[#1E9EFF]/40"
                >
                  {availableRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({hierarchyDisplayName[r.hierarchy_level] || r.hierarchy_level})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#666666] mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={inviteData.department}
                  onChange={(e) => setInviteData({ ...inviteData, department: e.target.value })}
                  placeholder="e.g. Sales, Marketing, Tech"
                  className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-white text-xs focus:outline-none focus:border-[#1E9EFF]/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="px-3 py-1.5 text-xs text-[#666666] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1E9EFF] hover:bg-[#0A8AE6] text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Provision User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Custom Role Modal */}
      {showCreateRoleForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#161616] pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1E9EFF]" /> Create Custom Role
              </h2>
              <button
                onClick={() => setShowCreateRoleForm(false)}
                className="text-[#666666] hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomRole} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#666666] mb-1">
                  Role Title *
                </label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Senior Creative Lead"
                  className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-white text-xs focus:outline-none focus:border-[#1E9EFF]/40"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#666666] mb-1">
                  Hierarchy Tier *
                </label>
                <select
                  value={newRoleTier}
                  onChange={(e) => setNewRoleTier(e.target.value as UserHierarchy)}
                  className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-white text-xs focus:outline-none focus:border-[#1E9EFF]/40"
                >
                  {allowedTiers.map((t) => (
                    <option key={t} value={t}>
                      {hierarchyDisplayName[t] || t} Tier
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#666666] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Operational responsibilities and scope"
                  className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-white text-xs focus:outline-none focus:border-[#1E9EFF]/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateRoleForm(false)}
                  className="px-3 py-1.5 text-xs text-[#666666] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1E9EFF] hover:bg-[#0A8AE6] text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Roster Table */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-[#161616] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1E9EFF]" />
            <h2 className="text-xs font-bold text-white">Organization Members ({users.length})</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a0a0a] text-[#555555] border-b border-[#161616] uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="p-3.5">Member</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#555555]">
                    No team members provisioned yet.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isManageable = canManageUser(activeUser.hierarchy, u.hierarchy, activeUser.email);
                  const isSelf = u.id === activeUser.id;

                  return (
                    <tr key={u.id} className="hover:bg-[#111111] transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar_url}
                            alt={u.name}
                            className="w-8 h-8 rounded-full bg-[#181818] ring-1 ring-[#1e1e1e]"
                          />
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              {u.name}
                              {isSelf && (
                                <span className="text-[9px] text-[#1E9EFF] font-normal">(You)</span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#555555]">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${hierarchyBadge[u.hierarchy]}`}>
                          <HierarchyIcon h={u.hierarchy} />
                          {u.role_name || hierarchyDisplayName[u.hierarchy]}
                        </span>
                      </td>

                      <td className="p-3.5 text-[#888888] font-mono text-[11px]">
                        {u.department || 'Operations'}
                      </td>

                      <td className="p-3.5">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-900/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-950/30 px-2 py-0.5 rounded-full border border-red-900/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Deactivated
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        {isManageable && !isSelf ? (
                          <div className="inline-flex items-center gap-1.5">
                            {u.is_active ? (
                              <button
                                onClick={() => handleDeactivate(u)}
                                className="p-1.5 text-[#666666] hover:text-amber-400 hover:bg-amber-950/20 rounded transition-colors"
                                title="Deactivate Account"
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivate(u)}
                                className="p-1.5 text-[#666666] hover:text-emerald-400 hover:bg-emerald-950/20 rounded transition-colors"
                                title="Reactivate Account"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(u)}
                              className="p-1.5 text-[#666666] hover:text-red-400 hover:bg-red-950/20 rounded transition-colors"
                              title="Permanently Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#444444]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Permission Matrix Card */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-5 space-y-4 shadow-2xl">
        <h2 className="text-xs font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1E9EFF]" /> Role Permission Matrix
        </h2>
        <p className="text-[11px] text-[#666666]">
          Configured capability boundaries per organization role.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {roles.map((r) => {
            const perms = getPermissionsForRole(r.id);
            return (
              <div key={r.id} className="p-4 bg-[#080808] border border-[#161616] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{r.name}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${hierarchyBadge[r.hierarchy_level]}`}>
                    {hierarchyDisplayName[r.hierarchy_level] || r.hierarchy_level}
                  </span>
                </div>
                <p className="text-[10px] text-[#666666] min-h-[28px] leading-relaxed">
                  {r.description || 'Standard role permissions.'}
                </p>
                <div className="pt-2 border-t border-[#141414] text-[10px] text-[#888888] flex items-center justify-between">
                  <span>Authorized Actions:</span>
                  <span className="font-mono text-[#1E9EFF]">{perms.length}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};