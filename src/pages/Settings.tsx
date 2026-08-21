import React, { useState } from 'react';
import {
  Building, Database, RefreshCw,
  CheckCircle2, Save, Shield, History, Trash2, Cloud, UploadCloud, Server, Image as ImageIcon
} from 'lucide-react';
import { db } from '../lib/firebaseDb';
import { isFirebaseConfigured, firebaseConfig } from '../lib/firebase';
import { EntityType, User } from '../lib/types';
import { getAuditLog, formatAuditAction, clearAuditLog } from '../lib/auditLog';
import { HesicsLogo } from '../components/common/HesicsLogo';
import { isAdminOrAbove, isMasterRoot } from '../lib/rbac';

interface SettingsProps {
  activeUser: User;
}

export const Settings: React.FC<SettingsProps> = ({ activeUser }) => {
  const [org, setOrg] = useState(db.getOrg());
  const [isSaved, setIsSaved] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [auditLogs, setAuditLogs] = useState(() => getAuditLog());

  const canEdit = isAdminOrAbove(activeUser.hierarchy);
  const isMaster = isMasterRoot(activeUser.email);

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
    if (window.confirm('Reset all data back to initial state? This will clear clients, deals, invoices and finance records.')) {
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
      <div className="space-y-1 pb-4 border-b border-[#1A1A20]">
        <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">Settings & Infrastructure</h1>
        <p className="text-xs text-[#828290]">
          Firebase Backend & Database, Organization parameters, brand assets, tax configuration, and audit logs.
        </p>
      </div>

      {/* Active User Info */}
      <div className="hesics-card p-4 flex items-center gap-3">
        <img
          src={activeUser.avatar_url}
          alt={activeUser.name}
          className="w-9 h-9 rounded-full ring-1 ring-[#1E9EFF]/30 bg-[#15151C]"
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#F4F4F6]">{activeUser.name}</span>
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border text-[#1E9EFF] bg-[#1E9EFF]/10 border-[#1E9EFF]/30">
              <Shield className="w-2.5 h-2.5" /> {activeUser.role_name || 'Admin'}
            </span>
          </div>
          <div className="text-xs text-[#707080]">{activeUser.email} · {activeUser.department || 'Operations'}</div>
        </div>
      </div>

      {/* Brand & Logo Card */}
      <div className="hesics-card p-5 space-y-3">
        <h3 className="text-xs font-bold text-[#F4F4F6] flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-[#1E9EFF]" /> Brand Identity & Logo
        </h3>
        <div className="flex items-center gap-4 p-3 bg-[#08080B] border border-[#181820] rounded-xl">
          <div className="w-14 h-14 rounded-xl bg-[#050505] border border-[#1E9EFF]/30 flex items-center justify-center p-2 shadow-lg shadow-[#1E9EFF]/10">
            <HesicsLogo size={42} variant="glow" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#F4F4F6]">HESICS Official Emblem</div>
            <p className="text-[11px] text-[#707080] mt-0.5">
              Active across System Header, Navigation Sidebar, Login Portal, Favicon, Quotations & PDF Invoices.
            </p>
            <span className="inline-block mt-1.5 text-[9px] font-mono text-[#1E9EFF] bg-[#1E9EFF]/10 px-2 py-0.5 rounded border border-[#1E9EFF]/20">
              public/hesics-logo.png
            </span>
          </div>
        </div>
      </div>

      {/* Firebase Backend & Database Status Card */}
      <div className="hesics-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#F4F4F6] flex items-center gap-2">
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
            <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-xl flex items-center justify-between text-xs text-emerald-300 font-semibold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Google Firebase Auth & Cloud Firestore Connected in Realtime</span>
              </div>
              <button
                type="button"
                onClick={handleSeedFirestore}
                disabled={isSeeding}
                className="hesics-btn-primary py-1 px-2.5 text-[10px]"
              >
                <UploadCloud className="w-3 h-3" />
                {isSeeding ? 'Syncing...' : 'Sync Local to Firestore'}
              </button>
            </div>

            {seedSuccess && (
              <div className="p-2.5 bg-emerald-950/30 border border-emerald-900/50 rounded-lg text-xs text-emerald-300">
                ✓ Firestore database successfully synced with initial schema & permanent root account!
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-xl space-y-2">
            <div className="text-xs text-amber-400 font-semibold flex items-center gap-2">
              <Server className="w-4 h-4" /> Running in Local Offline Mode
            </div>
            <p className="text-[11px] text-[#808090]">
              To connect your live Firebase project, configure your Firebase credentials in <code className="text-[#1E9EFF]">.env</code>.
            </p>
          </div>
        )}
      </div>

      {/* Org Profile Form */}
      <form onSubmit={handleSave} className="hesics-card p-5 space-y-4">
        <h3 className="text-xs font-bold text-[#F4F4F6] flex items-center gap-2">
          <Building className="w-4 h-4 text-[#1E9EFF]" /> Organisation Profile
        </h3>

        <div className="space-y-3">
          <div>
            <label className="hesics-label">Organisation Name</label>
            <input
              type="text"
              required
              disabled={!canEdit}
              value={org.name}
              onChange={(e) => setOrg({ ...org, name: e.target.value })}
              className="hesics-input disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="hesics-label">GSTIN (Tax Registration)</label>
              <input
                type="text"
                disabled={!canEdit}
                value={org.gstin || ''}
                onChange={(e) => setOrg({ ...org, gstin: e.target.value })}
                placeholder="33AAAAA0000A1Z5"
                className="hesics-input font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="hesics-label">Legal Entity Type</label>
              <select
                disabled={!canEdit}
                value={org.entity_type}
                onChange={(e) => setOrg({ ...org, entity_type: e.target.value as EntityType })}
                className="hesics-input disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="hesics-btn-primary"
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

      {/* Security & Audit Log (Admins only) */}
      {canEdit && (
        <div className="hesics-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#F4F4F6] flex items-center gap-2">
                <History className="w-4 h-4 text-[#1E9EFF]" /> Security & Operations Audit Log
              </h3>
              <p className="text-xs text-[#707080] mt-0.5">
                Tamper-evident record of data modifications across the organisation
              </p>
            </div>
            {auditLogs.length > 0 && (
              <button
                type="button"
                onClick={handleClearAudit}
                className="flex items-center gap-1 text-xs text-[#606070] hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Clear Log
              </button>
            )}
          </div>

          <div className="border border-[#1A1A22] rounded-xl overflow-hidden max-h-64 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#505060]">
                No audit entries recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#09090C] text-[#606070] border-b border-[#181820]">
                  <tr>
                    <th className="p-2.5 font-medium">Timestamp</th>
                    <th className="p-2.5 font-medium">User</th>
                    <th className="p-2.5 font-medium">Action</th>
                    <th className="p-2.5 font-medium">Entity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#15151C] font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#111116] transition-colors">
                      <td className="p-2.5 text-[#606070] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="p-2.5 text-[#9090A0] whitespace-nowrap">{log.user_name}</td>
                      <td className="p-2.5 text-[#1E9EFF] whitespace-nowrap">{formatAuditAction(log.action)}</td>
                      <td className="p-2.5 text-[#D4D4D8] font-sans text-xs">{log.entity_label || log.entity_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* System Reset Zone (Master Root Authority Only) */}
      {isMaster && (
        <div className="p-5 bg-rose-950/10 border border-rose-900/20 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-rose-400">System State Management</h3>
              <p className="text-xs text-[#707080]">
                Reset organizational data and state parameters.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetData}
              className="hesics-btn-secondary text-rose-400 hover:text-rose-300 border-rose-900/40 hover:bg-rose-950/30"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset System State
            </button>
          </div>
        </div>
      )}

    </div>
  );
};