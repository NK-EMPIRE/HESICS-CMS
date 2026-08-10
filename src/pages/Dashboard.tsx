import React, { useState } from 'react';
import {
  Plus, Clock, Sparkles, AlertTriangle,
  ArrowUpRight, TrendingUp, TrendingDown,
  Users, Briefcase, DollarSign, Target,
  Crown, Shield
} from 'lucide-react';
import { db } from '../lib/supabase';
import { User, UserHierarchy } from '../lib/types';
import { DealModal } from '../components/crm/DealModal';
import { ActivityModal } from '../components/crm/ActivityModal';
import { ClientModal } from '../components/crm/ClientModal';
import { isAdminOrAbove } from '../lib/rbac';

interface DashboardProps {
  activeUser: User;
  onNavigate: (tab: string) => void;
}

const HierarchyBadge: React.FC<{ h: UserHierarchy }> = ({ h }) => {
  if (h === 'founder') return (
    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-amber-400 bg-amber-950/40 border-amber-900/50">
      <Crown className="w-2.5 h-2.5" /> Founder
    </span>
  );
  if (h === 'admin') return (
    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-blue-400 bg-blue-950/40 border-blue-900/50">
      <Shield className="w-2.5 h-2.5" /> Admin
    </span>
  );
  return null;
};

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
      <div className="space-y-1 pb-4 border-b border-[#262626]">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-2xl">⚡</div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {isAdminUser ? 'Executive Dashboard' : 'Dashboard'}
              </h1>
              <HierarchyBadge h={activeUser.hierarchy} />
            </div>
            <p className="text-[11px] text-[#666666] mt-0.5">
              Welcome back, <span className="text-[#aaaaaa]">{activeUser.name.split(' ')[0]}</span>
              {isAdminUser && ' · Org-wide metrics below'}
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-2 flex-wrap">
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
      {stats.overdueFollowUps > 0 && (
        <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{stats.overdueFollowUps} overdue follow-up{stats.overdueFollowUps > 1 ? 's' : ''} need attention</span>
          </div>
          <button
            onClick={() => onNavigate('clients')}
            className="text-xs text-red-300 underline font-medium hover:text-white"
          >
            Review →
          </button>
        </div>
      )}

      {/* Admin-only: Full Revenue Cards */}
      {isAdminUser && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#555555] mb-3">Revenue Overview</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-[#1d1d1d] border border-[#2a2a2a] rounded-xl space-y-1 hover:border-[#383838] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#666666]">Total Income</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-400">{fmt(stats.totalIncome)}</div>
              <div className="text-[10px] text-[#555555]">Collected + logged</div>
            </div>

            <div className="p-4 bg-[#1d1d1d] border border-[#2a2a2a] rounded-xl space-y-1 hover:border-[#383838] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#666666]">Total Expenses</span>
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              </div>
              <div className="text-xl font-bold font-mono text-red-400">{fmt(stats.totalExpenses)}</div>
              <div className="text-[10px] text-[#555555]">All categories</div>
            </div>

            <div className="p-4 bg-[#1d1d1d] border border-[#2a2a2a] rounded-xl space-y-1 hover:border-[#383838] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#666666]">Net Profit</span>
                <DollarSign className="w-3.5 h-3.5 text-[#FF6B00]" />
              </div>
              <div className={`text-xl font-bold font-mono ${stats.netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
                {fmt(stats.netProfit)}
              </div>
              <div className="text-[10px] text-[#555555]">
                {stats.profitMargin}% margin
              </div>
            </div>

            <div className="p-4 bg-[#1d1d1d] border border-[#2a2a2a] rounded-xl space-y-1 hover:border-[#383838] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#666666]">Pipeline Value</span>
                <Target className="w-3.5 h-3.5 text-[#888888]" />
              </div>
              <div className="text-xl font-bold font-mono text-white">{fmt(stats.activePipelineValue)}</div>
              <div className="text-[10px] text-[#555555]">{stats.totalDeals} deals total</div>
            </div>
          </div>
        </div>
      )}

      {/* CRM Metrics (visible to all) */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#555555] mb-3">CRM Snapshot</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 bg-[#1d1d1d] border border-[#2a2a2a] rounded-xl space-y-1">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#888888]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#666666]">Clients</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">{stats.totalClients}</div>
            <div className="text-[10px] text-[#555555]">{stats.activeClients} active · {stats.leadClients} leads</div>
          </div>

          <div className="p-4 bg-[#1d1d1d] border border-[#2a2a2a] rounded-xl space-y-1">
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#888888]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#666666]">Won Revenue</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">{fmt(stats.wonDealsValue)}</div>
            <div className="text-[10px] text-[#555555]">Committed contracts</div>
          </div>

          <div className="p-4 bg-[#1d1d1d] border border-[#2a2a2a] rounded-xl space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#666666] mb-1">Cash Collected</div>
            <div className="text-xl font-bold font-mono text-white">{fmt(stats.collectedCash)}</div>
            <div className="text-[10px] text-[#555555]">Paid invoices</div>
          </div>

          <div className="p-4 bg-[#1d1d1d] border border-[#2a2a2a] rounded-xl space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#666666] mb-1">Outstanding</div>
            <div className={`text-xl font-bold font-mono ${stats.outstandingInvoices > 0 ? 'text-amber-400' : 'text-white'}`}>
              {fmt(stats.outstandingInvoices)}
            </div>
            <div className="text-[10px] text-[#555555]">Overdue invoices</div>
          </div>
        </div>
      </div>

      {/* Admin: Team Overview strip */}
      {isAdminUser && (
        <div className="p-4 bg-[#1d1d1d] border border-[#2a2a2a] rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-[#FF6B00]" />
            <div>
              <div className="text-xs font-semibold text-white">Team — {stats.teamSize} active members</div>
              <div className="text-[10px] text-[#666666] mt-0.5">
                {db.getUsers().filter((u) => u.hierarchy === 'founder').length} founder ·{' '}
                {db.getUsers().filter((u) => u.hierarchy === 'admin').length} admins ·{' '}
                {db.getUsers().filter((u) => u.hierarchy === 'employee').length} employees ·{' '}
                {db.getUsers().filter((u) => u.hierarchy === 'intern').length} interns
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('team')}
            className="text-xs text-[#666666] hover:text-white flex items-center gap-1 transition-colors"
          >
            Manage <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Deals & Activities Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Deals */}
        <div className="lg:col-span-2 bg-[#1d1d1d] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#888888]">Active Deals</h3>
            <button
              onClick={() => onNavigate('deals')}
              className="text-xs text-[#666666] hover:text-white flex items-center gap-1 transition-colors"
            >
              Board <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {db.getDeals().length === 0 ? (
            <div className="py-10 text-center border border-dashed border-[#2a2a2a] rounded-lg space-y-2">
              <p className="text-xs text-[#666666]">No deals in pipeline yet.</p>
              <button
                onClick={() => setIsDealModalOpen(true)}
                className="text-xs text-[#FF6B00] hover:underline"
              >
                + Add your first deal
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {db.getDeals().slice(0, 6).map((deal) => (
                <div
                  key={deal.id}
                  className="p-3 bg-[#191919] border border-[#282828] rounded-lg flex items-center justify-between hover:border-[#383838] transition-colors"
                >
                  <div>
                    <div className="text-xs font-medium text-white">{deal.title}</div>
                    <div className="text-[10px] text-[#666666]">{deal.client_name || '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-semibold text-white">
                      ₹{Number(deal.value).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#262626] text-[#888888]">
                      {deal.stage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-[#1d1d1d] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#888888]">Touchpoints</h3>
            <button
              onClick={() => setIsActivityModalOpen(true)}
              className="text-xs text-[#666666] hover:text-white transition-colors"
            >
              + Log
            </button>
          </div>

          {db.getActivities().length === 0 ? (
            <div className="py-10 text-center border border-dashed border-[#2a2a2a] rounded-lg">
              <p className="text-xs text-[#666666]">No touchpoints yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {db.getActivities().slice(0, 5).map((act) => (
                <div key={act.id} className="p-2.5 bg-[#191919] border border-[#282828] rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-white">
                    <span>{act.client_name || '—'}</span>
                    <span className="text-[9px] text-[#666666] uppercase">{act.type}</span>
                  </div>
                  <p className="text-[11px] text-[#888888] line-clamp-2">{act.outcome}</p>
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
