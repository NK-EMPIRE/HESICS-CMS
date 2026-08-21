import React, { useState } from 'react';
import {
  Building, Database, RefreshCw,
  CheckCircle2, Save, Crown, Shield, History, Trash2, Cloud, UploadCloud, Server, Image as ImageIcon
} from 'lucide-react';
import { db } from '../lib/firebaseDb';
import { isFirebaseConfigured, firebaseConfig } from '../lib/firebase';
import { EntityType, User } from '../lib/types';
import { getAuditLog, formatAuditAction, clearAuditLog } from '../lib/auditLog';
import { HesicsLogo } from '../components/common/HesicsLogo';

interface SettingsProps {
  activeUser: User;
}

export const Settings: React.FC<SettingsProps> = ({ activeUser }) => {
  const [org, setOrg] = useState(db.getOrg());
  const [isSaved, setIsSaved] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [auditLogs, setAuditLogs] = useState(() => getAuditLog());

  const canEdit = activeUser.hierarchy === 'founder' || activeUser.hierarchy === 'admin';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateOrg(org);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSeedFirestore = async () => {
    if (!isFirebaseConfigured) {
      alert('Please configure your Firebase credentials in .env first.');
      return;
    }
    setIsSeeding(true);
    await db.seedInitialFirestore();
    setIsSeeding(false);
    setSeedSuccess(true);
    setTimeout(() => setSeedSuccess(false), 4000);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all data back to initial seed? This will reset all clients, deals, invoices and finance records.')) {
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
        <h1 className="text-xl font-bold text-white tracking-tight font-display">Settings & Infrastructure</h1>
        <p className="text-[11px] text-[#666666]">
          Firebase Backend & Database, Organization parameters, brand assets, tax configuration, and audit logs.
        </p>
      </div>

      {/* Active User Info */}
      <div className="p-4 bg-[#0f0f0f] border border-[#161616] rounded-xl flex items-center gap-3">
        <img
          src={activeUser.avatar_url}
          alt={activeUser.name}
          className="w-9 h-9 rounded-full ring-1 ring-[#1E9EFF]/30"
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{activeUser.name}</span>
            {activeUser.hierarchy === 'founder' && (
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-amber-400 bg-amber-950/40 border-amber-900/50">
                <Crown className="w-2.5 h-2.5" /> Founder & Owner
              </span>
            )}
            {activeUser.hierarchy === 'admin' && (
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-[#1E9EFF] bg-[#1E9EFF]/10 border-[#1E9EFF]/30">
                <Shield className="w-2.5 h-2.5" /> Admin
              </span>
            )}
          </div>
          <div className="text-[11px] text-[#666666]">{activeUser.email} · {activeUser.role_name || activeUser.hierarchy}</div>
        </div>
      </div>

      {/* Brand & Logo Card */}
      <div className="p-5 bg-[#0f0f0f] border border-[#161616] rounded-xl space-y-3">
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-[#1E9EFF]" /> Brand Identity & Logo
        </h3>
        <div className="flex items-center gap-4 p-3 bg-[#0a0a0a] border border-[#141414] rounded-lg">
          <div className="w-14 h-14 rounded-xl bg-[#080808] border border-[#1E9EFF]/30 flex items-center justify-center p-2 shadow-lg shadow-[#1E9EFF]/10">
            <HesicsLogo size={42} variant="glow" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">HESICS Official Emblem</div>
            <p className="text-[10px] text-[#555555] mt-0.5">
              Active across System Header, Navigation Sidebar, Login Portal, Favicon, Quotations & PDF Invoices.
            </p>
            <span className="inline-block mt-1.5 text-[9px] font-mono text-[#1E9EFF] bg-[#1E9EFF]/10 px-2 py-0.5 rounded border border-[#1E9EFF]/20">
              public/hesics-logo.png
            </span>
          </div>
        </div>
      </div>

      {/* Firebase Backend & Database Status Card */}
      <div className="p-5 bg-[#0f0f0f] border border-[#161616] rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[#1E9EFF]" /> Firebase Cloud Infrastructure & Database
          </h3>
          {isFirebaseConfigured && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-900/40">
              Project: {firebaseConfig.projectId}
            </span>
          )}
        </div>

        {isFirebaseConfigured ? (
          <div className="space-y-3">
            <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg flex items-center justify-between text-xs text-emerald-400 font-semibold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Google Firebase Auth & Cloud Firestore Connected in Realtime</span>
              </div>
              <button
                type="button"
                onClick={handleSeedFirestore}
                disabled={isSeeding}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#1E9EFF] hover:bg-[#0A8AE6] text-white text-[10px] font-semibold rounded transition-colors"
              >
                <UploadCloud className="w-3 h-3" />
                {isSeeding ? 'Syncing...' : 'Sync Local to Firestore'}
              </button>
            </div>

            {seedSuccess && (
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-900/60 rounded-md text-[11px] text-emerald-300">
                ✓ Firestore database successfully synced with initial schema!
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-amber-950/30 border border-amber-900/40 rounded-lg space-y-2">
            <div className="text-xs text-amber-400 font-semibold flex items-center gap-2">
              <Server className="w-4 h-4" /> Running in Local Offline Mode
            </div>
            <p className="text-[11px] text-[#888888]">
              To connect your live Firebase project, configure your Firebase credentials in <code className="text-[#1E9EFF]">.env</code>:
            </p>
            <div className="p-3 bg-[#080808] border border-[#1a1a1a] rounded-md font-mono text-[10px] text-[#aaaaaa] space-y-1 overflow-x-auto">
              <div>VITE_FIREBASE_API_KEY=AIzaSy...</div>
              <div>VITE_FIREBASE_AUTH_DOMAIN=hesics-os.firebaseapp.com</div>
              <div>VITE_FIREBASE_PROJECT_ID=hesics-os</div>
              <div>VITE_FIREBASE_STORAGE_BUCKET=hesics-os.firebasestorage.app</div>
              <div>VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890</div>
              <div>VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef</div>
            </div>
          </div>
        )}
      </div>

      {/* Org Profile Form */}
      <form onSubmit={handleSave} className="p-5 bg-[#0f0f0f] border border-[#161616] rounded-xl space-y-4">
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
                value={org.entity_type}
                onChange={(e) => setOrg({ ...org, entity_type: e.target.value as EntityType })}
                className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-white text-xs focus:outline-none focus:border-[#1E9EFF]/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="proprietorship">Proprietorship</option>
                <option value="partnership">Partnership</option>
                <option value="llp">LLP (Limited Liability Partnership)</option>
                <option value="pvt_ltd">Private Limited Company</option>
              </select>
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1E9EFF] hover:bg-[#0A8AE6] text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> Save Changes
            </button>
            {isSaved && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>
        )}
      </form>

      {/* Security & Audit Log (Founder & Admin only) */}
      {canEdit && (
        <div className="p-5 bg-[#0f0f0f] border border-[#161616] rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-[#1E9EFF]" /> Security & Operations Audit Log
              </h3>
              <p className="text-[11px] text-[#666666] mt-0.5">
                Tamper-evident record of data modifications across the organisation
              </p>
            </div>
            {auditLogs.length > 0 && (
              <button
                type="button"
                onClick={handleClearAudit}
                className="flex items-center gap-1 text-[10px] text-[#666666] hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Clear Log
              </button>
            )}
          </div>

          <div className="border border-[#181818] rounded-lg overflow-hidden max-h-64 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#555555]">
                No audit entries recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0a0a0a] text-[#555555] border-b border-[#181818]">
                  <tr>
                    <th className="p-2.5 font-medium">Timestamp</th>
                    <th className="p-2.5 font-medium">User</th>
                    <th className="p-2.5 font-medium">Action</th>
                    <th className="p-2.5 font-medium">Entity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141414] font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#121212] transition-colors">
                      <td className="p-2.5 text-[#555555] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="p-2.5 text-[#888888] whitespace-nowrap">{log.user_name}</td>
                      <td className="p-2.5 text-[#1E9EFF] whitespace-nowrap">{formatAuditAction(log.action)}</td>
                      <td className="p-2.5 text-[#aaaaaa] font-sans text-xs">{log.entity_label || log.entity_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Danger Zone (Founder only) */}
      {activeUser.hierarchy === 'founder' && (
        <div className="p-5 bg-red-950/10 border border-red-900/20 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-red-400">Founder Zone</h3>
              <p className="text-[11px] text-[#666666]">
                Data reset and organizational state management.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 text-xs rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Org Data
            </button>
          </div>
        </div>
      )}

    </div>
  );
};