import React, { useState } from 'react';
import {
  Building, Database, RefreshCw,
  CheckCircle2, Save, Crown, Shield
} from 'lucide-react';
import { db, isSupabaseConfigured } from '../lib/supabase';
import { EntityType, User } from '../lib/types';

interface SettingsProps {
  activeUser: User;
}

export const Settings: React.FC<SettingsProps> = ({ activeUser }) => {
  const [org, setOrg] = useState(db.getOrg());
  const [isSaved, setIsSaved] = useState(false);

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

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="space-y-1 pb-4 border-b border-[#262626]">
        <div className="text-2xl">⚙️</div>
        <h1 className="text-xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-[11px] text-[#666666]">
          Organisation profile, tax configuration, and system status.
        </p>
      </div>

      {/* Active User Info */}
      <div className="p-4 bg-[#1d1d1d] border border-[#2a2a2a] rounded-xl flex items-center gap-3">
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
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-blue-400 bg-blue-950/40 border-blue-900/50">
                <Shield className="w-2.5 h-2.5" /> Admin
              </span>
            )}
          </div>
          <div className="text-[11px] text-[#666666]">{activeUser.email} · {activeUser.role_name}</div>
        </div>
      </div>

      {/* Database Status */}
      <div className="p-4 bg-[#1d1d1d] border border-[#2a2a2a] rounded-xl space-y-3">
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-[#FF6B00]" /> Database & Storage Engine
        </h3>
        {isSupabaseConfigured ? (
          <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg flex items-center gap-2 text-xs text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Live Supabase PostgreSQL — Connected & Syncing
          </div>
        ) : (
          <div className="p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#FF6B00]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Local Storage Store Active — Demo Mode
            </div>
            <p className="text-[11px] text-[#777777]">
              All data persists in browser localStorage. To connect live Supabase, set{' '}
              <code className="text-[#FF6B00] font-mono">VITE_SUPABASE_URL</code> and{' '}
              <code className="text-[#FF6B00] font-mono">VITE_SUPABASE_ANON_KEY</code> in your{' '}
              <code className="text-[#aaaaaa] font-mono">.env</code> file.
            </p>
          </div>
        )}
      </div>

      {/* Org Profile Form */}
      <form onSubmit={handleSave} className="p-4 bg-[#1d1d1d] border border-[#2a2a2a] rounded-xl space-y-4">
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          <Building className="w-4 h-4 text-[#FF6B00]" /> Organisation Profile
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
              className="w-full px-3 py-2 bg-[#191919] border border-[#2e2e2e] rounded-lg text-white text-xs focus:outline-none focus:border-[#555555] disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full px-3 py-2 bg-[#191919] border border-[#2e2e2e] rounded-lg text-white text-xs font-mono focus:outline-none focus:border-[#555555] disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full px-3 py-2 bg-[#191919] border border-[#2e2e2e] rounded-lg text-white text-xs focus:outline-none focus:border-[#555555] disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="flex items-center justify-between pt-3 border-t border-[#262626]">
            {isSaved ? (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Settings saved!
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-1.5 bg-[#FF6B00] hover:bg-[#ea580c] text-white font-semibold text-xs rounded-lg transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> Save Changes
            </button>
          </div>
        )}

        {!canEdit && (
          <p className="text-[11px] text-[#555555] pt-2 border-t border-[#262626]">
            Only Founders and Admins can edit organisation settings.
          </p>
        )}
      </form>

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
