import React, { useState } from 'react';
import {
  Plus, Clock, Sparkles, AlertTriangle,
  ArrowUpRight, TrendingUp, TrendingDown,
  Users, Briefcase, DollarSign, Target, Shield, CheckCircle2, ChevronRight
} from 'lucide-react';
import { db } from '../lib/firebaseDb';
import { User, UserHierarchy } from '../lib/types';
import { DealModal } from '../components/crm/DealModal';
import { ActivityModal } from '../components/crm/ActivityModal';
import { ClientModal } from '../components/crm/ClientModal';
import { isAdminOrAbove } from '../lib/rbac';

interface DashboardProps {
  activeUser: User;
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ activeUser, onNavigate }) => {
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [stats, setStats] = useState(() => db.getOrgStats());

  const refreshData = () => {
    setStats(db.getOrgStats());
  };

  const isAdminUser = isAdminOrAbove(activeUser.hierarchy);

  const fmt = (n: number) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(1)}L`
      : n >= 1000
      ? `₹${(n / 1000).toFixed(1)}K`
      : `₹${n.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1A20]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">
              {isAdminUser ? 'Executive Overview' : 'Operational Dashboard'}
            </h1>
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border text-[#1E9EFF] bg-[#1E9EFF]/10 border-[#1E9EFF]/25 font-mono">
              <Shield className="w-2.5 h-2.5" /> {activeUser.role_name || 'Admin'}
            </span>
          </div>
          <p className="text-xs text-[#828290] mt-1">
            Real-time pipeline metrics, financial cash flow, and client operations.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsClientModalOpen(true)}
            className="hesics-btn-secondary"
          >
            <Plus className="w-3.5 h-3.5 text-[#888896]" /> New Client
          </button>
          <button
            onClick={() => setIsDealModalOpen(true)}
            className="hesics-btn-primary"
          >
            <Sparkles className="w-3.5 h-3.5" /> New Deal
          </button>
          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="hesics-btn-secondary"
          >
            <Clock className="w-3.5 h-3.5 text-[#888896]" /> Log Activity
          </button>
        </div>
      </div>

      {/* Overdue alert banner */}
      {stats.overdueFollowUps > 0 && (
        <div className="p-3.5 bg-amber-950/20 border border-amber-900/30 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>{stats.overdueFollowUps} scheduled follow-up{stats.overdueFollowUps > 1 ? 's are' : ' is'} overdue.</strong> Review client activities to maintain momentum.
            </span>
          </div>
          <button
            onClick={() => onNavigate('clients')}
            className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline shrink-0"
          >
            View Follow-ups →
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Collected Revenue */}
        <div className="hesics-card p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#787886]">
            <span className="font-medium">Collected Cash</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-[#F4F4F6] font-display">
            {fmt(stats.cashCollected)}
          </div>
          <div className="text-[11px] text-[#60606E] flex items-center gap-1">
            <span>Invoiced: {fmt(stats.totalInvoiced)}</span>
          </div>
        </div>

        {/* Active Pipeline Value */}
        <div className="hesics-card p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#787886]">
            <span className="font-medium">Active Pipeline</span>
            <Target className="w-3.5 h-3.5 text-[#1E9EFF]" />
          </div>
          <div className="text-xl font-bold text-[#F4F4F6] font-display">
            {fmt(stats.activePipelineValue)}
          </div>
          <div className="text-[11px] text-[#60606E]">
            <span>{stats.totalDeals} Total Opportunities</span>
          </div>
        </div>

        {/* Net Profit Margin */}
        <div className="hesics-card p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#787886]">
            <span className="font-medium">Net Profit</span>
            {stats.netProfit >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>
          <div className={`text-xl font-bold font-display ${stats.netProfit >= 0 ? 'text-[#F4F4F6]' : 'text-rose-400'}`}>
            {fmt(stats.netProfit)}
          </div>
          <div className="text-[11px] text-[#60606E]">
            <span>{stats.profitMargin}% Margin</span>
          </div>
        </div>

        {/* Client Accounts */}
        <div className="hesics-card p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#787886]">
            <span className="font-medium">Active Clients</span>
            <Users className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-[#F4F4F6] font-display">
            {stats.activeClients}
          </div>
          <div className="text-[11px] text-[#60606E]">
            <span>{stats.totalClients} Total Roster</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Pipeline Summary & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Pipeline Breakdown (2 cols) */}
        <div className="hesics-card p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#F4F4F6]">Deal Pipeline Distribution</h2>
              <p className="text-[11px] text-[#707080]">Revenue grouped by operational stage</p>
            </div>
            <button
              onClick={() => onNavigate('deals')}
              className="text-xs text-[#1E9EFF] hover:underline font-medium flex items-center gap-1"
            >
              Open Deals Board <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {['discovery', 'proposal', 'negotiation', 'won'].map((stg) => {
              const stageDeals = db.getDeals().filter((d) => d.stage === stg);
              const stageSum = stageDeals.reduce((sum, d) => sum + Number(d.value), 0);
              const maxVal = stats.activePipelineValue || 1;
              const pct = Math.min(100, Math.round((stageSum / maxVal) * 100));

              return (
                <div key={stg} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize font-medium text-[#D4D4D8]">{stg}</span>
                    <span className="font-mono text-[#F4F4F6]">{fmt(stageSum)} ({stageDeals.length})</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#17171C] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        stg === 'won' ? 'bg-emerald-400' : 'bg-[#1E9EFF]'
                      }`}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Operations Sidebar (1 col) */}
        <div className="hesics-card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#F4F4F6]">Recent Activity</h2>
            <p className="text-[11px] text-[#707080]">Latest client touchpoints</p>
          </div>

          <div className="space-y-2.5">
            {db.getActivities().slice(0, 5).length === 0 ? (
              <div className="p-6 text-center text-xs text-[#505060]">
                No logged client touchpoints yet.
              </div>
            ) : (
              db.getActivities().slice(0, 5).map((act) => (
                <div key={act.id} className="p-2.5 bg-[#09090C] border border-[#18181F] rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#F4F4F6] truncate max-w-[140px]">{act.client_name || 'Client'}</span>
                    <span className="text-[10px] uppercase font-mono text-[#1E9EFF]">{act.type}</span>
                  </div>
                  <p className="text-[11px] text-[#787888] line-clamp-1">{act.title || act.notes || act.outcome || 'Touchpoint recorded'}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Modals */}
      {isDealModalOpen && (
        <DealModal
          isOpen={isDealModalOpen}
          onClose={() => setIsDealModalOpen(false)}
          onSuccess={refreshData}
          activeUser={activeUser}
        />
      )}
      {isClientModalOpen && (
        <ClientModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          onSuccess={refreshData}
          activeUser={activeUser}
        />
      )}
      {isActivityModalOpen && (
        <ActivityModal
          isOpen={isActivityModalOpen}
          onClose={() => setIsActivityModalOpen(false)}
          onSuccess={refreshData}
          activeUser={activeUser}
        />
      )}

    </div>
  );
};