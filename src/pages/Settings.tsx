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
import { CustomSelect, Option } from '../components/common/CustomSelect';

interface SettingsProps {
  activeUser: User;
}

const ENTITY_OPTIONS: Option[] = [
  { value: 'proprietorship', label: 'Proprietorship', badge: 'Sole', badgeColor: 'text-[#808090] bg-[#14141A] border-[#202028]' },
  { value: 'partnership', label: 'Partnership Firm', badge: 'Partnership', badgeColor: 'text-indigo-400 bg-indigo-950/30 border-indigo-900/40' },
  { value: 'llp', label: 'LLP (Limited Liability Partnership)', badge: 'LLP', badgeColor: 'text-amber-400 bg-amber-950/30 border-amber-900/40' },
  { value: 'pvt_ltd', label: 'Private Limited Company (Pvt Ltd)', badge: 'Pvt Ltd', badgeColor: 'text-[#1E9EFF] bg-[#1E9EFF]/10 border-[#1E9EFF]/30' },
];

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#1A1A20]">
        <div>
          <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">System & Settings</h1>
          <p className="text-xs text-[#828290] mt-1">
            Enterprise infrastructure, brand identity, and operational security logs.
          </p>
        </div>
      </div>

      {/* Organization Details Form */}
      <form onSubmit={handleSave} className="hesics-card p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#181820]">
          <Building className="w-4 h-4 text-[#1E9EFF]" />
          <h2 className="text-xs font-bold text-[#F4F4F6]">Organization Profile</h2>
        </div>

        <div className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="hesics-label">Enterprise Entity Name *</label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={org.name}
                onChange={(e) => setOrg({ ...org, name: e.target.value })}
                className="hesics-input disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="hesics-label">Brand Tagline</label>
              <input
                type="text"
                disabled={!canEdit}
                value={org.tagline || ''}
                onChange={(e) => setOrg({ ...org, tagline: e.target.value })}
                placeholder="Make It Simple."
                className="hesics-input disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="hesics-label">Primary Operational Email</label>
              <input
                type="email"
                disabled={!canEdit}
                value={org.email || ''}
                onChange={(e) => setOrg({ ...org, email: e.target.value })}
                placeholder="operations@hesics.com"
                className="hesics-input disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="hesics-label">Headquarters Address</label>
              <input
                type="text"
                disabled={!canEdit}
                value={org.address || ''}
                onChange={(e) => setOrg({ ...org, address: e.target.value })}
                placeholder="Chennai, Tamil Nadu, India"
                className="hesics-input disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
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
              <CustomSelect
                disabled={!canEdit}
                value={org.entity_type || 'pvt_ltd'}
                onChange={(v) => setOrg({ ...org, entity_type: v as EntityType })}
                options={ENTITY_OPTIONS}
              />
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
          <div className="flex items-center justify-between pb-3 border-b border-[#181820]">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#1E9EFF]" />
              <h2 className="text-xs font-bold text-[#F4F4F6]">Security & Audit Trail</h2>
            </div>
            {isMaster && auditLogs.length > 0 && (
              <button
                onClick={() => {
                  clearAuditLog();
                  setAuditLogs([]);
                }}
                className="text-[11px] text-[#707080] hover:text-rose-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Clear Audit Logs
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#505060]">No system events logged yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-2.5 bg-[#08080B] border border-[#16161D] rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <div className="font-medium text-[#F4F4F6]">{formatAuditAction(log.action)}</div>
                    <div className="text-[10px] text-[#606070]">{log.entity_label || log.entity_id}</div>
                  </div>
                  <div className="text-[10px] font-mono text-[#505060]">{new Date(log.timestamp).toLocaleTimeString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
