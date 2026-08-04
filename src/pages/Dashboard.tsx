import React, { useState } from 'react';
import {
  Plus, Clock, Sparkles, AlertTriangle, Layers,
  CheckCircle2, ArrowUpRight, FolderPlus
} from 'lucide-react';
import { db } from '../lib/supabase';
import { User } from '../lib/types';
import { DealModal } from '../components/crm/DealModal';
import { ActivityModal } from '../components/crm/ActivityModal';
import { ClientModal } from '../components/crm/ClientModal';

interface DashboardProps {
  activeUser: User;
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ activeUser, onNavigate }) => {
  const [deals, setDeals] = useState(db.getDeals());
  const [clients, setClients] = useState(db.getClients());
  const [activities, setActivities] = useState(db.getActivities());
  const [invoices, setInvoices] = useState(db.getInvoices());

  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  const refreshData = () => {
    setDeals(db.getDeals());
    setClients(db.getClients());
    setActivities(db.getActivities());
    setInvoices(db.getInvoices());
  };

  const totalPipelineValue = deals
    .filter((d) => d.stage !== 'lost')
    .reduce((sum, d) => sum + Number(d.value), 0);

  const wonDealsValue = deals
    .filter((d) => d.stage === 'won')
    .reduce((sum, d) => sum + Number(d.value), 0);

  const paidInvoicesValue = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.total), 0);

  const todayStr = new Date().toISOString().split('T')[0];
  const overdueActivities = activities.filter(
    (a) => a.follow_up_date && a.follow_up_date < todayStr
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Notion Notion-Page Header */}
      <div className="space-y-2 pb-4 border-b border-[#262626]">
        <div className="text-3xl">⚡</div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Executive Dashboard</h1>
        <p className="text-xs text-[#888888]">
          Real-time pipeline metrics, account activity log, and revenue status.
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsClientModalOpen(true)}
          className="notion-button bg-[#242424] hover:bg-[#2c2c2c] text-white border border-[#333333]"
        >
          <Plus className="w-3.5 h-3.5 text-[#aaaaaa]" /> New Client
        </button>
        <button
          onClick={() => setIsDealModalOpen(true)}
          className="notion-button bg-[#242424] hover:bg-[#2c2c2c] text-white border border-[#333333]"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" /> New Deal
        </button>
        <button
          onClick={() => setIsActivityModalOpen(true)}
          className="notion-button bg-[#242424] hover:bg-[#2c2c2c] text-white border border-[#333333]"
        >
          <Clock className="w-3.5 h-3.5 text-[#aaaaaa]" /> Log Activity
        </button>
      </div>

      {/* Overdue alert banner */}
      {overdueActivities.length > 0 && (
        <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{overdueActivities.length} overdue follow-up actions require attention</span>
          </div>
          <button
            onClick={() => onNavigate('clients')}
            className="text-xs text-red-300 underline font-medium hover:text-white"
          >
            Review
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 notion-card space-y-1">
          <div className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">Active Pipeline</div>
          <div className="text-xl font-bold font-mono text-white">
            ₹{totalPipelineValue.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-[#666666]">{deals.length} deals in progress</div>
        </div>

        <div className="p-4 notion-card space-y-1">
          <div className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">Won Revenue</div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            ₹{wonDealsValue.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-[#666666]">Committed contracts</div>
        </div>

        <div className="p-4 notion-card space-y-1">
          <div className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">Collected Cash</div>
          <div className="text-xl font-bold font-mono text-white">
            ₹{paidInvoicesValue.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-[#666666]">Paid tax invoices</div>
        </div>

        <div className="p-4 notion-card space-y-1">
          <div className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">Client Accounts</div>
          <div className="text-xl font-bold font-mono text-white">{clients.length}</div>
          <div className="text-[10px] text-[#666666]">Directory entries</div>
        </div>
      </div>

      {/* Main Grid: Pipeline Summary & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal Pipeline View (2 cols) */}
        <div className="lg:col-span-2 notion-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#aaaaaa]">Active Deals</h3>
            <button
              onClick={() => onNavigate('deals')}
              className="text-xs text-[#888888] hover:text-white flex items-center gap-1"
            >
              View Board <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {deals.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-[#2a2a2a] rounded-lg space-y-2">
              <p className="text-xs text-[#777777]">No active deals in pipeline.</p>
              <button
                onClick={() => setIsDealModalOpen(true)}
                className="text-xs text-white underline hover:text-[#FF6B00]"
              >
                + Create your first deal
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className="p-3 bg-[#191919] border border-[#282828] rounded-md flex items-center justify-between hover:border-[#383838] transition-colors"
                >
                  <div>
                    <div className="text-xs font-medium text-white">{deal.title}</div>
                    <div className="text-[10px] text-[#777777]">{deal.client_name || 'Client'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-semibold text-white">
                      ₹{Number(deal.value).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#262626] text-[#aaaaaa]">
                      {deal.stage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Log (1 col) */}
        <div className="notion-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#aaaaaa]">Touchpoints</h3>
            <button
              onClick={() => setIsActivityModalOpen(true)}
              className="text-xs text-[#888888] hover:text-white"
            >
              + Log
            </button>
          </div>

          {activities.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-[#2a2a2a] rounded-lg">
              <p className="text-xs text-[#777777]">No touchpoints logged.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((act) => (
                <div key={act.id} className="p-2.5 bg-[#191919] border border-[#282828] rounded-md text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-white">
                    <span>{act.client_name || 'Client'}</span>
                    <span className="text-[9px] text-[#777777] uppercase">{act.type}</span>
                  </div>
                  <p className="text-[11px] text-[#999999] line-clamp-2">{act.outcome}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <DealModal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
        onSuccess={refreshData}
      />
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={refreshData}
      />
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSuccess={refreshData}
        activeUser={activeUser}
      />
    </div>
  );
};
