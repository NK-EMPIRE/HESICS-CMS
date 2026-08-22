import React, { useState, useEffect } from 'react';
import {
  History, Search, Filter, Download, Trash2,
  Calendar, UserCheck, Shield, ChevronRight, X, FileSpreadsheet, Eye, RefreshCw
} from 'lucide-react';
import { db } from '../lib/firebaseDb';
import { User } from '../lib/types';
import { AuditLogEntry, formatAuditAction, getAuditLog, clearAuditLog } from '../lib/auditLog';
import { isMasterRoot } from '../lib/rbac';
import { exportAuditLogsToExcel } from '../lib/excelExport';
import { AuditFilterModal, AuditFilterState } from '../components/audit/AuditFilterModal';
import { showToast } from '../components/common/Toast';

interface AuditLogsProps {
  activeUser: User;
}

const CATEGORY_BADGES: Record<AuditLogEntry['category'], string> = {
  CRM: 'text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30',
  Billing: 'text-indigo-300 bg-indigo-950/40 border-indigo-800/50',
  Finance: 'text-emerald-300 bg-emerald-950/40 border-emerald-800/50',
  Team: 'text-amber-300 bg-amber-950/40 border-amber-800/50',
  Security: 'text-rose-300 bg-rose-950/40 border-rose-800/50',
  Settings: 'text-[#808090] bg-[#14141A] border-[#202028]',
};

const DEFAULT_FILTERS: AuditFilterState = {
  searchQuery: '',
  category: 'ALL',
  actorUserId: 'ALL',
  startDate: '',
  endDate: '',
};

export const AuditLogs: React.FC<AuditLogsProps> = ({ activeUser }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>(() => getAuditLog(1000));
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<AuditFilterState>(DEFAULT_FILTERS);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const isChief = isMasterRoot(activeUser.email);
  const users = db.getUsers(activeUser.email);

  const refreshLogs = () => {
    setLogs(getAuditLog(1000));
  };

  const userOptions = users.map((u) => ({
    value: u.id,
    label: u.name,
    sublabel: u.email,
    badge: u.role_name || u.hierarchy,
    badgeColor: 'text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30',
  }));

  // Multi-parameter filtration
  const filteredLogs = logs.filter((log) => {
    // 1. Search Query
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const matchLabel = (log.entity_label || '').toLowerCase().includes(q);
      const matchAction = formatAuditAction(log.action).toLowerCase().includes(q);
      const matchUser = (log.user_name || '').toLowerCase().includes(q) || (log.actor_email || '').toLowerCase().includes(q);
      const matchId = (log.entity_id || '').toLowerCase().includes(q);
      if (!matchLabel && !matchAction && !matchUser && !matchId) return false;
    }

    // 2. Category
    if (filters.category !== 'ALL' && log.category !== filters.category) {
      return false;
    }

    // 3. Actor / User
    if (filters.actorUserId !== 'ALL' && log.user_id !== filters.actorUserId) {
      return false;
    }

    // 4. Date Range
    if (filters.startDate) {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0];
      if (logDate < filters.startDate) return false;
    }
    if (filters.endDate) {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0];
      if (logDate > filters.endDate) return false;
    }

    return true;
  });

  const handleExportExcel = () => {
    exportAuditLogsToExcel(filteredLogs);
    showToast('Audit Trail Exported', `Exported ${filteredLogs.length} audit records to Excel.`);
  };

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to permanently clear the audit trail history?')) {
      clearAuditLog();
      setLogs([]);
      showToast('Audit Trail Cleared', 'All historical audit entries have been removed.');
    }
  };

  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.category !== 'ALL' ||
    filters.actorUserId !== 'ALL' ||
    filters.startDate !== '' ||
    filters.endDate !== '';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1A20]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
              <History className="w-4 h-4 text-[#77727E]" />
            </div>
            <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">
              Audit Logs & Security Trail
            </h1>
          </div>
          <p className="text-xs text-[#828290] mt-1">
            Immutable, real-time chronicle of all operational and administrative actions across HESICS OS.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`hesics-btn-secondary text-xs ${hasActiveFilters ? 'border-[#77727E] text-white' : ''}`}
          >
            <Filter className="w-3.5 h-3.5 text-[#77727E]" />
            <span>Unified Filters {hasActiveFilters && '(Active)'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="hesics-btn-secondary text-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#77727E]" />
            <span>Export Excel</span>
          </button>

          {isChief && logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="p-2.5 text-[#707080] hover:text-rose-400 rounded-xl hover:bg-rose-950/20 transition-colors"
              title="Clear Audit History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Search & Category Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#09090C] border border-[#1C1C24] p-2.5 rounded-2xl">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#606070]" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
            placeholder="Quick search action, user, or entity..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#0D0D12] border border-[#20202A] rounded-xl text-xs text-[#F4F4F6] placeholder-[#505060] focus:outline-none focus:border-[#77727E]"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'CRM', 'Billing', 'Finance', 'Team', 'Security', 'Settings'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilters({ ...filters, category: cat })}
              className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-all shrink-0 ${
                filters.category === cat
                  ? 'bg-[#77727E] text-white font-semibold shadow-md'
                  : 'text-[#707080] hover:text-[#D4D4D8] hover:bg-[#14141C]'
              }`}
            >
              {cat === 'ALL' ? 'All Domains' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-[#808090]">
          <span>Active Filters:</span>
          {filters.searchQuery && (
            <span className="px-2.5 py-1 rounded-lg bg-[#14141C] border border-[#22222E] text-[#D4D4D8] flex items-center gap-1.5">
              Query: "{filters.searchQuery}"
              <button onClick={() => setFilters({ ...filters, searchQuery: '' })} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.category !== 'ALL' && (
            <span className="px-2.5 py-1 rounded-lg bg-[#14141C] border border-[#22222E] text-[#D4D4D8] flex items-center gap-1.5">
              Category: {filters.category}
              <button onClick={() => setFilters({ ...filters, category: 'ALL' })} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.actorUserId !== 'ALL' && (
            <span className="px-2.5 py-1 rounded-lg bg-[#14141C] border border-[#22222E] text-[#D4D4D8] flex items-center gap-1.5">
              Actor: {users.find((u) => u.id === filters.actorUserId)?.name || filters.actorUserId}
              <button onClick={() => setFilters({ ...filters, actorUserId: 'ALL' })} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {(filters.startDate || filters.endDate) && (
            <span className="px-2.5 py-1 rounded-lg bg-[#14141C] border border-[#22222E] text-[#D4D4D8] flex items-center gap-1.5">
              Date: {filters.startDate || '—'} to {filters.endDate || '—'}
              <button onClick={() => setFilters({ ...filters, startDate: '', endDate: '' })} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="text-[11px] text-[#77727E] hover:underline"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="hesics-card overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#09090C] text-[#707080] border-b border-[#181820] uppercase text-[10px] font-semibold tracking-wider">
            <tr>
              <th className="p-4">Timestamp</th>
              <th className="p-4">Domain</th>
              <th className="p-4">Operational Action</th>
              <th className="p-4">Target Entity</th>
              <th className="p-4">Actor</th>
              <th className="p-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#15151C]">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-[#555565]">
                  No audit log entries match the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#111116] transition-colors">
                  <td className="p-4 font-mono text-[11px] text-[#808090]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>

                  <td className="p-4">
                    <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${CATEGORY_BADGES[log.category]}`}>
                      {log.category}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="font-semibold text-[#F4F4F6]">{formatAuditAction(log.action)}</div>
                    <div className="text-[10px] font-mono text-[#606070]">{log.action}</div>
                  </td>

                  <td className="p-4">
                    <div className="font-medium text-[#D4D4D8] truncate max-w-[220px]">
                      {log.entity_label || log.entity_id}
                    </div>
                    <div className="text-[10px] text-[#606070] font-mono">{log.entity_type}</div>
                  </td>

                  <td className="p-4">
                    <div className="font-semibold text-[#F4F4F6]">{log.user_name || 'System'}</div>
                    <div className="text-[10px] text-[#707080] font-mono">{log.actor_role}</div>
                  </td>

                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedEntry(log)}
                      className="p-1.5 text-[#707080] hover:text-white rounded-lg hover:bg-[#16161E] transition-colors"
                      title="Inspect Event Payload"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Unified Filter Modal */}
      {isFilterModalOpen && (
        <AuditFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          filters={filters}
          onApplyFilters={setFilters}
          onResetFilters={() => setFilters(DEFAULT_FILTERS)}
          userOptions={userOptions}
        />
      )}

      {/* Event Details Inspector Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-confirmDialog flex items-center justify-center p-4">
          <div className="bg-[#0D0D12] border border-[#262634] rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#1C1C26] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#77727E]/20 border border-[#77727E]/40 flex items-center justify-center">
                  <History className="w-4 h-4 text-[#77727E]" />
                </div>
                <h3 className="text-sm font-bold text-[#F4F4F6]">Audit Event Inspector</h3>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="text-[#606070] hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#08080A] rounded-xl border border-[#1A1A24]">
                <div>
                  <span className="text-[10px] text-[#606070] uppercase font-mono block">Action</span>
                  <span className="font-semibold text-[#F4F4F6]">{formatAuditAction(selectedEntry.action)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#606070] uppercase font-mono block">Domain</span>
                  <span className="font-semibold text-[#D4D4D8]">{selectedEntry.category}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#606070] uppercase font-mono block">Actor</span>
                  <span className="font-semibold text-[#F4F4F6]">{selectedEntry.user_name} ({selectedEntry.actor_role})</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#606070] uppercase font-mono block">Timestamp</span>
                  <span className="font-mono text-[#808090]">{new Date(selectedEntry.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="hesics-label">Target Entity</span>
                <div className="p-2.5 bg-[#08080A] rounded-xl border border-[#1A1A24] font-mono text-xs text-[#D4D4D8]">
                  {selectedEntry.entity_label || selectedEntry.entity_id}
                </div>
              </div>

              {selectedEntry.details && (
                <div>
                  <span className="hesics-label">Payload & Change Attributes</span>
                  <pre className="p-3 bg-[#08080A] rounded-xl border border-[#1A1A24] font-mono text-[11px] text-[#A0A0B0] overflow-x-auto max-h-48 leading-relaxed">
                    {JSON.stringify(selectedEntry.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#181822]">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="hesics-btn-secondary text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
