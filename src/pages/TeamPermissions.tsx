import React, { useState } from 'react';
import {
  ShieldCheck, Users, Lock, CheckCircle2, XCircle,
  UserPlus, Key, Info, Sparkles
} from 'lucide-react';
import { db } from '../lib/supabase';
import { PermissionKey, User } from '../lib/types';
import { ROLE_PERMISSIONS, USER_ROLE_MAP } from '../lib/rbac';

interface TeamPermissionsProps {
  activeUser: User;
}

const ALL_PERMISSIONS: { key: PermissionKey; title: string; category: string }[] = [
  { key: 'clients:read', title: 'View Clients Directory', category: 'CRM' },
  { key: 'clients:write', title: 'Create & Edit Clients', category: 'CRM' },
  { key: 'clients:delete', title: 'Delete Clients', category: 'CRM' },
  { key: 'deals:read', title: 'View Sales Deals & Pipeline', category: 'CRM' },
  { key: 'deals:write', title: 'Create & Edit Deals', category: 'CRM' },
  { key: 'invoices:read', title: 'View Quotes & Invoices', category: 'Finance' },
  { key: 'invoices:write', title: 'Issue Quotes & Invoices', category: 'Finance' },
  { key: 'finance:read', title: 'View Financial Dashboards', category: 'Finance' },
  { key: 'finance:write', title: 'Manage Income/Expenses', category: 'Finance' },
  { key: 'team:manage', title: 'Manage Team & Permissions', category: 'Admin' },
];

export const TeamPermissions: React.FC<TeamPermissionsProps> = ({ activeUser }) => {
  const users = db.getUsers();
  const roles = db.getRoles();

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-display">
            Dynamic RBAC & Team Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Permission-based architecture designed for team expansion without hardcoding roles.
          </p>
        </div>
      </div>

      {/* Team Roster List */}
      <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-500" /> Active Team Members
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {users.map((u) => {
            const roleId = USER_ROLE_MAP[u.id] || 'role-intern';
            const roleObj = roles.find((r) => r.id === roleId);

            return (
              <div
                key={u.id}
                className="p-4 bg-dark-900 border border-dark-600 rounded-xl flex items-center gap-3.5"
              >
                <img
                  src={u.avatar_url}
                  alt={u.name}
                  className="w-10 h-10 rounded-full border border-brand-500/40"
                />
                <div>
                  <h4 className="text-sm font-bold text-white">{u.name}</h4>
                  <p className="text-xs text-slate-400">{u.email}</p>
                  <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30 mt-1">
                    {roleObj?.name || 'Member'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <Key className="w-5 h-5 text-brand-500" /> Role Permission Matrix
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Granular access control map evaluated at runtime.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-900/80 border-b border-dark-600 text-slate-400 uppercase font-bold tracking-wider">
              <tr>
                <th className="p-3">Permission Key</th>
                <th className="p-3 text-center">Founder</th>
                <th className="p-3 text-center">Co-founder</th>
                <th className="p-3 text-center">Sales Executive</th>
                <th className="p-3 text-center">Finance Manager</th>
                <th className="p-3 text-center">Intern</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-600 text-slate-200">
              {ALL_PERMISSIONS.map((p) => (
                <tr key={p.key} className="hover:bg-dark-700/40">
                  <td className="p-3 font-semibold text-white">
                    {p.title}
                    <div className="text-[10px] text-slate-400 font-mono">{p.key}</div>
                  </td>
                  {['role-founder', 'role-cofounder', 'role-sales', 'role-finance', 'role-intern'].map(
                    (roleId) => {
                      const isGranted = (ROLE_PERMISSIONS[roleId] || []).includes(p.key);
                      return (
                        <td key={roleId} className="p-3 text-center">
                          {isGranted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-600 inline" />
                          )}
                        </td>
                      );
                    }
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
