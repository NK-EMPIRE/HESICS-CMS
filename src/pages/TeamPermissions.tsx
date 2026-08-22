import React, { useState } from 'react';
import {
  ShieldCheck, Users, CheckCircle2, XCircle,
  UserPlus, Shield, UserCheck, Trash2,
  UserX, Pencil, X, ChevronDown, Plus, Briefcase,
  Layers, Lock, Check, Mail, Send
} from 'lucide-react';
import { db } from '../lib/db/team';
import { PermissionKey, User, UserHierarchy, Role } from '../lib/types';
import {
  isAdminOrAbove, canManageUser, getAllowedRoleTiers,
  isMasterRoot, getPermissionsForRole
} from '../lib/rbac';
import { CustomSelect, Option } from '../components/common/CustomSelect';
import { sendInvitationEmail } from '../lib/emailService';
import { UserConfirmModal, UserConfirmActionType } from '../components/team/UserConfirmModal';
import { showToast } from '../components/common/Toast';

interface TeamPermissionsProps {
  activeUser: User;
}

const ALL_PERMISSIONS_CATALOG: { key: PermissionKey; title: string; category: string; description: string }[] = [
  { key: 'clients:read', title: 'View Clients Directory', category: 'CRM & Pipeline', description: 'Access organization client accounts, histories, and contact points' },
  { key: 'clients:write', title: 'Create & Edit Clients', category: 'CRM & Pipeline', description: 'Provision new client accounts and modify contact parameters' },
  { key: 'clients:delete', title: 'Delete Clients', category: 'CRM & Pipeline', description: 'Permanently archive and delete client profiles' },
  { key: 'deals:read', title: 'View Pipeline & Deals', category: 'CRM & Pipeline', description: 'Inspect real-time revenue pipeline and deal velocity' },
  { key: 'deals:write', title: 'Manage Deals & Stages', category: 'CRM & Pipeline', description: 'Create deals, update probabilities, and advance pipeline stages' },
  { key: 'invoices:read', title: 'View Invoices & Quotations', category: 'Billing & Commercials', description: 'Read formal quotations and billing tax invoices' },
  { key: 'invoices:write', title: 'Issue Invoices & Quotations', category: 'Billing & Commercials', description: 'Generate PDF quotations, convert to invoices, and mark paid' },
  { key: 'finance:read', title: 'View Financial Statements', category: 'Finance & Taxation', description: 'Inspect cash inflow, outflow, and net profit margins' },
  { key: 'finance:write', title: 'Record Inflows & Outflows', category: 'Finance & Taxation', description: 'Log operational expenditures, revenue receipts, and GST credits' },
  { key: 'team:manage', title: 'Manage Roles & Members', category: 'Governance & Security', description: 'Deactivate members, delete accounts, and adjust authority tiers' },
  { key: 'team:invite', title: 'Provision Team Members', category: 'Governance & Security', description: 'Authorize new work emails and send invitation access links' },
  { key: 'org:admin', title: 'Executive Admin Control', category: 'Governance & Security', description: 'Full organization-level control and audit logs' },
];

const PREDEFINED_DEPARTMENTS: Option[] = [
  { value: 'Enterprise Sales & Key Accounts', label: 'Enterprise Sales & Key Accounts', sublabel: 'Revenue & client acquisition' },
  { value: 'Growth & Strategic Marketing', label: 'Growth & Strategic Marketing', sublabel: 'Brand campaigns & lead generation' },
  { value: 'Finance, Tax & Treasury', label: 'Finance, Tax & Treasury', sublabel: 'Cash flow, invoicing & compliance' },
  { value: 'Client Success & Delivery', label: 'Client Success & Delivery', sublabel: 'Account retention & operational delivery' },
  { value: 'Product & Technology Operations', label: 'Product & Technology Operations', sublabel: 'Engineering & systems infrastructure' },
  { value: 'Legal & Corporate Affairs', label: 'Legal & Corporate Affairs', sublabel: 'Contracts, NDAs & corporate governance' },
];

const HierarchyIcon: React.FC<{ h: UserHierarchy; className?: string }> = ({ h, className = 'w-3.5 h-3.5' }) => {
  if (h === 'founder' || h === 'admin') return <Shield className={`${className} text-[#D4D4D8]`} />;
  if (h === 'officer') return <Briefcase className={`${className} text-indigo-300`} />;
  return <UserCheck className={`${className} text-emerald-400`} />;
};

const hierarchyBadge: Record<UserHierarchy, string> = {
  founder: 'text-[#D4D4D8] bg-[#77727E]/20 border-[#77727E]/40',
  superadmin: 'text-amber-300 bg-amber-950/40 border-amber-800/50',
  admin: 'text-[#D4D4D8] bg-[#77727E]/20 border-[#77727E]/40',
  officer: 'text-indigo-300 bg-indigo-950/40 border-indigo-800/50',
  employee: 'text-emerald-300 bg-emerald-950/40 border-emerald-800/50',
  intern: 'text-[#808090] bg-[#14141A] border-[#202028]',
};

const hierarchyDisplayName: Record<UserHierarchy, string> = {
  founder: 'Chief',
  superadmin: 'Superadmin',
  admin: 'Admin',
  officer: 'Officer',
  employee: 'Employee',
  intern: 'Intern',
};
export const TeamPermissions: React.FC<TeamPermissionsProps> = ({ activeUser }) => {
  const [users, setUsers] = useState(() => db.getUsers(activeUser.email));
  const roles = db.getRoles();
  const canManage = isAdminOrAbove(activeUser.hierarchy);
  const isMaster = isMasterRoot(activeUser.email);
  const allowedTiers = getAllowedRoleTiers(activeUser.hierarchy, activeUser.email);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showCreateRoleForm, setShowCreateRoleForm] = useState(false);
  const [selectedRoleForDetail, setSelectedRoleForDetail] = useState<Role | null>(null);
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    targetUser: User | null;
    actionType: UserConfirmActionType;
  }>({ isOpen: false, targetUser: null, actionType: 'delete' });

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleTier, setNewRoleTier] = useState<UserHierarchy>('employee');

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState(roles[0]?.id || 'role-admin');
  const [inviteDepartment, setInviteDepartment] = useState(PREDEFINED_DEPARTMENTS[0].value);
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [customDeptText, setCustomDeptText] = useState('');

  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const refreshUsers = () => setUsers(db.getUsers(activeUser.email));
  const availableRoles = roles.filter((r) => allowedTiers.includes(r.hierarchy_level));
  const selectedInviteRole = roles.find((r) => r.id === inviteRoleId);
  const isInviteRoleAdmin = selectedInviteRole?.hierarchy_level === 'admin' || selectedInviteRole?.hierarchy_level === 'founder';

  const roleOptions: Option[] = availableRoles.map((r) => ({
    value: r.id,
    label: r.name,
    sublabel: r.description,
    badge: hierarchyDisplayName[r.hierarchy_level] || r.hierarchy_level,
    badgeColor: hierarchyBadge[r.hierarchy_level],
  }));

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!inviteName.trim() || !inviteEmail.trim() || !inviteRoleId) return;

    const role = roles.find((r) => r.id === inviteRoleId);
    const targetHierarchy = role?.hierarchy_level || 'employee';

    if (targetHierarchy === 'admin' && !isMaster) {
      setErrorMessage('Permission Denied: Only organization owners can provision new Admins.');
      return;
    }

    const assignedDept = isInviteRoleAdmin
      ? 'Executive Operations'
      : isCustomDept
      ? customDeptText.trim() || 'Operations'
      : inviteDepartment;

    setIsSendingInvite(true);

    const newUser = db.addUser({
      name: inviteName.trim(),
      email: inviteEmail.trim().toLowerCase(),
      role_id: inviteRoleId,
      role_name: role?.name || 'Team Member',
      hierarchy: targetHierarchy,
      department: assignedDept,
      is_active: true,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(inviteName)}`,
    });

    await sendInvitationEmail({
      to: inviteEmail.trim().toLowerCase(),
      recipientName: inviteName.trim(),
      roleName: role?.name || 'Team Member',
      department: assignedDept,
    });

    setIsSendingInvite(false);
    refreshUsers();
    setInviteSuccess(`Provisioned ${inviteName} and dispatched official welcome email to ${inviteEmail}.`);
    setInviteName('');
    setInviteEmail('');
    setTimeout(() => {
      setInviteSuccess('');
      setShowInviteForm(false);
    }, 2500);
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

  const handleRequestDeactivate = (targetUser: User) => {
    if (!canManageUser(activeUser.hierarchy, targetUser.hierarchy, activeUser.email)) {
      showToast('Permission Denied', 'You do not have permission to modify this user account.', 'error');
      return;
    }
    setConfirmModalState({
      isOpen: true,
      targetUser,
      actionType: 'deactivate',
    });
  };

  const handleReactivate = (targetUser: User) => {
    if (!canManageUser(activeUser.hierarchy, targetUser.hierarchy, activeUser.email)) {
      showToast('Permission Denied', 'You do not have permission to modify this user account.', 'error');
      return;
    }
    db.updateUser(targetUser.id, { is_active: true });
    refreshUsers();
    showToast('Member Reactivated', `${targetUser.name} has been reactivated successfully.`, 'success');
  };

  const handleRequestDelete = (targetUser: User) => {
    if (!canManageUser(activeUser.hierarchy, targetUser.hierarchy, activeUser.email)) {
      showToast('Permission Denied', 'You do not have permission to remove this user account.', 'error');
      return;
    }
    setConfirmModalState({
      isOpen: true,
      targetUser,
      actionType: 'delete',
    });
  };

  const handleExecuteConfirmedAction = () => {
    const { targetUser, actionType } = confirmModalState;
    if (!targetUser) return;

    if (actionType === 'delete') {
      db.removeUser(targetUser.id);
      refreshUsers();
      showToast('Member Purged', `Permanently removed ${targetUser.name} from organization.`, 'success');
    } else if (actionType === 'deactivate') {
      db.deactivateUser(targetUser.id);
      refreshUsers();
      showToast('Member Deactivated', `Deactivated access credentials for ${targetUser.name}.`, 'success');
    }
  };
  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1A20]">
        <div>
          <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">Team & Access Control</h1>
          <p className="text-xs text-[#828290] mt-1">
            Enterprise role-based governance, team rosters, and automated email operations.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowCreateRoleForm(true)}
              className="hesics-btn-secondary"
            >
              <Plus className="w-3.5 h-3.5 text-[#77727E]" /> Create Custom Role
            </button>
            <button
              onClick={() => setShowInviteForm(true)}
              className="hesics-btn-primary"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add Team Member
            </button>
          </div>
        )}
      </div>

      {/* Provision Team Member Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-modal flex items-center justify-center p-4">
          <div className="bg-[#0D0D11] border border-[#22222B] rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-8 space-y-6 shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between border-b border-[#1C1C26] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-[#77727E]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#F4F4F6] tracking-tight font-display">
                    Provision Team Member
                  </h2>
                  <p className="text-xs text-[#808090]">
                    Authorize corporate credentials and send official onboarding invite.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteForm(false)}
                className="text-[#606070] hover:text-white p-1.5 rounded-lg hover:bg-[#16161D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-rose-950/20 border border-rose-900/40 rounded-xl text-xs text-rose-300">
                {errorMessage}
              </div>
            )}
            {inviteSuccess && (
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="leading-relaxed">{inviteSuccess}</span>
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="hesics-label">Full Legal / Team Name *</label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Sheik Mydeen"
                    className="hesics-input text-xs"
                  />
                </div>

                <div>
                  <label className="hesics-label">Authorized Work Email *</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="name@hesics.com"
                    className="hesics-input text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="hesics-label">Assigned Organization Role *</label>
                <CustomSelect
                  value={inviteRoleId}
                  onChange={setInviteRoleId}
                  options={roleOptions}
                  placeholder="Select role..."
                />
              </div>

              {/* Dynamic Department Logic */}
              <div>
                <label className="hesics-label">Assigned Department</label>
                {isInviteRoleAdmin ? (
                  <div className="p-3 bg-[#09090C] border border-[#1F1F28] rounded-xl text-xs text-[#9090A0] flex items-center justify-between">
                    <span className="font-medium text-[#F4F4F6]">Executive Operations</span>
                    <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-md bg-[#77727E]/15 text-[#D4D4D8] border border-[#77727E]/30">
                      Org-Wide Admin
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {!isCustomDept ? (
                      <CustomSelect
                        value={inviteDepartment}
                        onChange={setInviteDepartment}
                        options={PREDEFINED_DEPARTMENTS}
                        placeholder="Select department..."
                      />
                    ) : (
                      <input
                        type="text"
                        required
                        value={customDeptText}
                        onChange={(e) => setCustomDeptText(e.target.value)}
                        placeholder="Enter custom department name..."
                        className="hesics-input text-xs"
                        autoFocus
                      />
                    )}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsCustomDept(!isCustomDept)}
                        className="text-[11px] text-[#D4D4D8] hover:underline"
                      >
                        {isCustomDept ? '← Choose predefined department' : '+ Or type custom department'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1A1A22]">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="hesics-btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingInvite}
                  className="hesics-btn-primary px-6"
                >
                  {isSendingInvite ? (
                    <span>Dispatching Invite...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Provision & Send Email</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Create Custom Role Modal */}
      {showCreateRoleForm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-modal flex items-center justify-center p-4">
          <div className="bg-[#0D0D11] border border-[#22222B] rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-8 space-y-6 shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between border-b border-[#1C1C26] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-[#77727E]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#F4F4F6] tracking-tight font-display">
                    Create Custom Role
                  </h2>
                  <p className="text-xs text-[#808090]">
                    Define specific operational tiers and organizational responsibilities.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateRoleForm(false)}
                className="text-[#606070] hover:text-white p-1.5 rounded-lg hover:bg-[#16161D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomRole} className="space-y-5">
              <div>
                <label className="hesics-label">Role Title *</label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Senior Commercial Director"
                  className="hesics-input text-xs"
                />
              </div>

              <div>
                <label className="hesics-label">Hierarchy Tier *</label>
                <CustomSelect
                  value={newRoleTier}
                  onChange={(v) => setNewRoleTier(v as UserHierarchy)}
                  options={allowedTiers.map((t) => ({
                    value: t,
                    label: `${hierarchyDisplayName[t] || t} Tier`,
                    badge: hierarchyDisplayName[t] || t,
                    badgeColor: hierarchyBadge[t],
                  }))}
                />
              </div>

              <div>
                <label className="hesics-label">Operational Scope & Boundaries</label>
                <input
                  type="text"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Responsibilities, pipeline authority, and deliverables..."
                  className="hesics-input text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1A1A22]">
                <button
                  type="button"
                  onClick={() => setShowCreateRoleForm(false)}
                  className="hesics-btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="hesics-btn-primary px-6"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Detailed Capability Drawer / Modal */}
      {selectedRoleForDetail && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-modal flex items-center justify-center p-4">
          <div className="bg-[#0D0D11] border border-[#22222B] rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-8 space-y-6 shadow-2xl shadow-black/80">
            <div className="flex items-start justify-between border-b border-[#1C1C26] pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-[#F4F4F6]">{selectedRoleForDetail.name}</h2>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md border ${hierarchyBadge[selectedRoleForDetail.hierarchy_level]}`}>
                    {hierarchyDisplayName[selectedRoleForDetail.hierarchy_level]} Tier
                  </span>
                </div>
                <p className="text-xs text-[#808090] mt-1.5 leading-relaxed">
                  {selectedRoleForDetail.description || 'Configured operational boundaries and authorizations.'}
                </p>
              </div>
              <button
                onClick={() => setSelectedRoleForDetail(null)}
                className="text-[#606070] hover:text-white p-1.5 rounded-lg hover:bg-[#16161D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Authorized Operations Breakdown */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#F4F4F6] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#77727E]" />
                Authorized Operations ({getPermissionsForRole(selectedRoleForDetail.id).length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {ALL_PERMISSIONS_CATALOG.map((perm) => {
                  const isGranted = getPermissionsForRole(selectedRoleForDetail.id).includes(perm.key);
                  return (
                    <div
                      key={perm.key}
                      className={`p-3.5 rounded-2xl border text-xs space-y-1.5 transition-colors ${
                        isGranted
                          ? 'bg-[#121217] border-[#77727E]/40 text-[#F4F4F6]'
                          : 'bg-[#08080A] border-[#181820] text-[#454555]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="truncate">{perm.title}</span>
                        {isGranted ? (
                          <Check className="w-4 h-4 text-[#77727E] shrink-0" />
                        ) : (
                          <span className="text-[9px] uppercase font-mono text-[#404050]">Denied</span>
                        )}
                      </div>
                      <p className="text-[10.5px] leading-relaxed line-clamp-2" style={{ color: isGranted ? '#A0A0B0' : '#353540' }}>
                        {perm.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Members with this Role */}
            <div className="pt-4 border-t border-[#1C1C26] space-y-3">
              <h3 className="text-xs font-bold text-[#F4F4F6] flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                Active Assigned Members ({users.filter((u) => u.role_id === selectedRoleForDetail.id).length})
              </h3>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {users.filter((u) => u.role_id === selectedRoleForDetail.id).length === 0 ? (
                  <div className="p-3.5 text-center text-xs text-[#505060]">No members currently hold this role.</div>
                ) : (
                  users.filter((u) => u.role_id === selectedRoleForDetail.id).map((u) => (
                    <div key={u.id} className="p-2.5 bg-[#08080B] border border-[#181822] rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <img src={u.avatar_url} alt={u.name} className="w-6 h-6 rounded-full bg-[#15151C]" />
                        <span className="font-medium text-[#F4F4F6]">{u.name}</span>
                        <span className="text-[10px] text-[#606070] font-mono">({u.email})</span>
                      </div>
                      <span className="text-[10px] text-[#707080] font-mono">{u.department || 'Operations'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRoleForDetail(null)}
                className="hesics-btn-secondary"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Team Roster Table */}
      <div className="hesics-card overflow-hidden">
        <div className="p-4 border-b border-[#181820] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-[#77727E]" />
            <h2 className="text-xs font-bold text-[#F4F4F6]">Organization Members ({users.length})</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#09090C] text-[#707080] border-b border-[#181820] uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="p-4">Member</th>
                <th className="p-4">Role</th>
                <th className="p-4">Department</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#15151C]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#555565]">
                    No team members provisioned yet.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isManageable = canManageUser(activeUser.hierarchy, u.hierarchy, activeUser.email);
                  const isSelf = u.id === activeUser.id;

                  return (
                    <tr key={u.id} className="hover:bg-[#111116] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar_url}
                            alt={u.name}
                            className="w-8 h-8 rounded-full bg-[#15151C] ring-1 ring-[#202028]"
                          />
                          <div>
                            <div className="font-semibold text-[#F4F4F6] flex items-center gap-1.5">
                              {u.name}
                              {isSelf && (
                                <span className="text-[9px] text-[#77727E] font-normal font-mono">(You)</span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#707080]">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${hierarchyBadge[u.hierarchy]}`}>
                          <HierarchyIcon h={u.hierarchy} />
                          {u.role_name || hierarchyDisplayName[u.hierarchy]}
                        </span>
                      </td>

                      <td className="p-4 text-[#808090] font-mono text-[11px]">
                        {u.department || 'Executive Operations'}
                      </td>

                      <td className="p-4">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-900/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-400 bg-rose-950/30 px-2 py-0.5 rounded-full border border-rose-900/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Deactivated
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        {isManageable && !isSelf ? (
                          <div className="inline-flex items-center gap-2">
                            {u.is_active ? (
                              <button
                                onClick={() => handleRequestDeactivate(u)}
                                className="p-1.5 text-[#707080] hover:text-amber-400 hover:bg-amber-950/20 rounded transition-colors"
                                title="Deactivate Account"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivate(u)}
                                className="p-1.5 text-[#707080] hover:text-emerald-400 hover:bg-emerald-950/20 rounded transition-colors"
                                title="Reactivate Account"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleRequestDelete(u)}
                              className="p-1.5 text-[#707080] hover:text-rose-400 hover:bg-rose-950/20 rounded transition-colors"
                              title="Permanently Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#454555]">—</span>
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

      {/* Interactive Role Capability Matrix */}
      <div className="hesics-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-[#F4F4F6] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#77727E]" /> Role Capability Matrix
            </h2>
            <p className="text-xs text-[#707080] mt-0.5">
              Click any role card to view full authorized operations, capability scopes, and member allocations.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {roles.map((r) => {
            const perms = getPermissionsForRole(r.id);
            return (
              <div
                key={r.id}
                onClick={() => setSelectedRoleForDetail(r)}
                className="p-4 bg-[#08080B] border border-[#181820] hover:border-[#77727E]/60 rounded-2xl space-y-3 cursor-pointer transition-all hover:scale-[1.01] shadow-lg group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F4F4F6] group-hover:text-white transition-colors">
                    {r.name}
                  </span>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${hierarchyBadge[r.hierarchy_level]}`}>
                    {hierarchyDisplayName[r.hierarchy_level] || r.hierarchy_level}
                  </span>
                </div>
                <p className="text-[10.5px] text-[#707080] min-h-[30px] leading-relaxed">
                  {r.description || 'Standard enterprise operational capability boundary.'}
                </p>
                <div className="pt-2 border-t border-[#14141A] text-[10px] text-[#808090] flex items-center justify-between">
                  <span>Authorized Actions:</span>
                  <span className="font-mono text-[#D4D4D8] font-semibold flex items-center gap-1">
                    {perms.length} <span className="text-[8px] text-[#606070]">View →</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* GitHub-style Security Verification Modal */}
      {confirmModalState.isOpen && (
        <UserConfirmModal
          isOpen={confirmModalState.isOpen}
          onClose={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={handleExecuteConfirmedAction}
          targetUser={confirmModalState.targetUser}
          actionType={confirmModalState.actionType}
        />
      )}
    </div>
  );
};