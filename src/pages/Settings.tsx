import React, { useState } from 'react';
import {
  Building, Database, RefreshCw,
  CheckCircle2, Save, Crown, Shield, History, Trash2
} from 'lucide-react';
import { db, isSupabaseConfigured } from '../lib/supabase';
import { EntityType, User } from '../lib/types';
import { getAuditLog, formatAuditAction, clearAuditLog } from '../lib/auditLog';

interface SettingsProps {
  activeUser: User;
}

export const Settings: React.FC<SettingsProps> = ({ activeUser }) => {
  const [org, setOrg] = useState(db.getOrg());
  const [isSaved, setIsSaved] = useState(false);
  const [auditLogs, setAuditLogs] = useState(() => getAuditLog());

  const canEdit = activeUser.hierarchy === 'founder' || activeUser.hierarchy === 'admin';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateOrg(org);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all data back to initial seed? This will clear all clients, deals, invoices and finance records.')) {
      db.resetAll();
    }
  };

  const handleClearAudit = () => {
    if (window.confirm('Clear all audit logs?')) {
      clearAuditLog();
      setAuditLogs([]);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="space-y-1 pb-4 border-b border-[#1a1a1a]">
        <div className="text-2xl">⚙️</div>
        <h1 className="text-xl font-bold text-white tracking-tight">Settings & Security</h1>
        <p className="text-[11px] text-[#666666]">
          Organisation profile, tax parameters, engine status, and audit log.
        </p>
      </div>

      {/* Active User Info */}
      <div className="p-4 bg-[#0f0f0f] border border-[#161616] rounded-xl flex items-center gap-3">
        <img
          src={activeUser.avatar_url}
          alt={activeUser.name}
          className="w-9 h-9 rounded-full"
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{activeUser.name}</span>
            {activeUser.hierarchy === 'founder' && (
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-amber-400 bg-amber-950/40 border-amber-900/50">
                <Crown className="w-2.5 h-2.5" /> Founder
              </span>
            )}
            {activeUser.hierarchy === 'admin' && (
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-[#1E9EFF] bg-[#1E9EFF]/10 border-[#1E9EFF]/30">
                <Shield className="w-2.5 h-2.5" /> Admin
              </span>
            )}
          </div>
          <div className="text-[11px] text-[#666666]">{activeUser.email} · {activeUser.role_name}</div>
        </div>
      </div>

      {/* Database Status */}
      <div className="p-4 bg-[#0f0f0f] border border-[#161616] rounded-xl space-y-3">
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-[#1E9EFF]" /> Database & Storage Engine
        </h3>
        {isSupabaseConfigured ? (
          <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg flex items-center gap-2 text-xs text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Live Supabase PostgreSQL — Connected & Syncing
          </div>
        ) : (
          <div className="p-3 bg-[#1a1a1a] border border-[#161616] rounded-lg space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1E9EFF]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Local Storage Store Active — Demo Mode
            </div>
            <p className="text-[11px] text-[#777777]">
              All data persists in browser localStorage. To connect live Supabase, set{' '}
              <code className="text-[#1E9EFF] font-mono">VITE_SUPABASE_URL</code> and{' '}
              <code className="text-[#1E9EFF] font-mono">VITE_SUPABASE_ANON_KEY</code> in your{' '}
              <code className="text-[#aaaaaa] font-mono">.env</code> file.
            </p>
          </div>
        )}
      </div>

      {/* Org Profile Form */}
      <form onSubmit={handleSave} className="p-4 bg-[#0f0f0f] border border-[#161616] rounded-xl space-y-4">
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          <Building className="w-4 h-4 text-[#1E9EFF]" /> Organisation Profile
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#666666] mb-1.5">
              Organisation Name
            </label>
            <input
              type="text"
              required
              disabled={!canEdit}
              value={org.name}
              onChange={(e) => setOrg({ ...org, name: e.target.value })}
              className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-white text-xs focus:outline-none focus:border-[#1E9EFF]/40 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#666666] mb-1.5">
                GSTIN (Tax Registration)
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={org.gstin || ''}
                onChange={(e) => setOrg({ ...org, gstin: e.target.value })}
                placeholder="33AAAAA0000A1Z5"
                className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-white text-xs font-mono focus:outline-none focus:border-[#1E9EFF]/40 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#666666] mb-1.5">
                Legal Entity Type
              </label>
              <select
                disabled={!canEdit}
                value={org.entity_type || 'pvt_ltd'}
                onChange={(e) => setOrg({ ...org, entity_type: e.target.value as EntityType })}
                className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-white text-xs focus:outline-none focus:border-[#1E9EFF]/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="pvt_ltd">Private Limited (Pvt Ltd)</option>
                <option value="proprietorship">Sole Proprietorship</option>
                <option value="partnership">Partnership Firm</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center justify-between pt-3 border-t border-[#1a1a1a]">
            {isSaved ? (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Settings saved!
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-1.5 bg-[#1E9EFF] hover:bg-[#0A8AE6] text-white font-semibold text-xs rounded-lg transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> Save Changes
            </button>
          </div>
        )}
      </form>

      {/* Audit Trail Section (Founders & Admins) */}
      {canEdit && (
        <div className="p-4 bg-[#0f0f0f] border border-[#161616] rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-[#1E9EFF]" /> Security Audit Log
            </h3>
            {auditLogs.length > 0 && (
              <button
                onClick={handleClearAudit}
                className="text-[10px] text-[#555555] hover:text-red-400 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Clear Log
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="py-6 text-center text-[10px] text-[#444444]">
                No security audit records yet. All team actions will be logged here.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-2 bg-[#080808] border border-[#141414] rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-white font-mono">{log.user_name}</span>
                    <span className="text-[10px] text-[#1E9EFF] bg-[#1E9EFF]/10 px-1.5 py-0.2 rounded">
                      {formatAuditAction(log.action)}
                    </span>
                    {log.entity_label && (
                      <span className="text-[10px] text-[#666666] font-mono">"{log.entity_label}"</span>
                    )}
                  </div>
                  <span className="text-[9px] text-[#444444] font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Danger Zone — Founder only */}
      {activeUser.hierarchy === 'founder' && (
        <div className="p-4 bg-red-950/10 border border-red-900/30 rounded-xl flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white">Reset Local Database</h4>
            <p className="text-[11px] text-[#666666] mt-0.5">
              Clears all clients, deals, invoices, income, and expenses. Users are preserved.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/30 hover:bg-red-950/50 text-red-400 border border-red-900/40 text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      )}
    </div>
  );
};
