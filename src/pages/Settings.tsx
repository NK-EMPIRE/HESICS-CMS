import React, { useState } from 'react';
import {
  Settings as SettingsIcon, Building, Database, RefreshCw,
  CheckCircle2, ShieldAlert, Save
} from 'lucide-react';
import { db, isSupabaseConfigured } from '../lib/supabase';
import { EntityType, User } from '../lib/types';

interface SettingsProps {
  activeUser: User;
}

export const Settings: React.FC<SettingsProps> = ({ activeUser }) => {
  const [org, setOrg] = useState(db.getOrg());
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateOrg(org);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all demo data back to default initial seed?')) {
      db.resetAll();
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white font-display">Organization & OS Settings</h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage business tax parameters, invoice headers, and database connection.
        </p>
      </div>

      {/* Backend Connection Status Card */}
      <div className="p-6 bg-dark-800 border border-dark-600 rounded-2xl space-y-3">
        <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
          <Database className="w-5 h-5 text-brand-500" /> Database & Storage Engine Status
        </h3>

        {isSupabaseConfigured ? (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Live Supabase PostgreSQL Connected & Syncing
          </div>
        ) : (
          <div className="p-4 bg-brand-500/10 border border-brand-500/30 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-brand-400">
              <CheckCircle2 className="w-4 h-4 text-brand-500" /> Reactive Local Storage Store Active (Demo Mode)
            </div>
            <p className="text-slate-300">
              You are currently running with a full-featured local state database with instant persistence.
              To connect your live Supabase database, set <code className="text-brand-400">VITE_SUPABASE_URL</code> and <code className="text-brand-400">VITE_SUPABASE_ANON_KEY</code> in <code className="text-slate-300">.env</code>.
            </p>
          </div>
        )}
      </div>

      {/* Org Profile Form */}
      <form onSubmit={handleSave} className="p-6 bg-dark-800 border border-dark-600 rounded-2xl space-y-4">
        <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
          <Building className="w-5 h-5 text-brand-500" /> Business Entity Profile
        </h3>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Organization Name
          </label>
          <input
            type="text"
            required
            value={org.name}
            onChange={(e) => setOrg({ ...org, name: e.target.value })}
            className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              GSTIN (Tax Registration)
            </label>
            <input
              type="text"
              value={org.gstin || ''}
              onChange={(e) => setOrg({ ...org, gstin: e.target.value })}
              placeholder="33AAAAA0000A1Z5"
              className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Legal Entity Type
            </label>
            <select
              value={org.entity_type || 'pvt_ltd'}
              onChange={(e) => setOrg({ ...org, entity_type: e.target.value as EntityType })}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
            >
              <option value="pvt_ltd">Private Limited (Pvt Ltd)</option>
              <option value="proprietorship">Sole Proprietorship</option>
              <option value="partnership">Partnership Firm</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-dark-600">
          {isSaved ? (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Settings updated!
            </span>
          ) : (
            <span />
          )}

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-brand-500/20"
          >
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </form>

      {/* Reset Data Danger Zone */}
      <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-white">Reset Local Database</h4>
          <p className="text-xs text-slate-400 mt-0.5">Restore all clients, deals, and invoices back to initial seed data.</p>
        </div>
        <button
          type="button"
          onClick={handleResetData}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs font-semibold rounded-xl transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Reset Seed Data
        </button>
      </div>
    </div>
  );
};
