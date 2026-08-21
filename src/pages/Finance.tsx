import React, { useState } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Plus,
  FileText, Calendar, Trash2, Tag, ArrowUpRight
} from 'lucide-react';
import { db } from '../lib/firebaseDb';
import { IncomeEntry, ExpenseEntry, User } from '../lib/types';
import { IncomeModal } from '../components/finance/IncomeModal';
import { ExpenseModal } from '../components/finance/ExpenseModal';
import { hasPermission } from '../lib/rbac';

interface FinanceProps {
  activeUser: User;
}

export const Finance: React.FC<FinanceProps> = ({ activeUser }) => {
  const [activeTab, setActiveTab] = useState<'income' | 'expenses' | 'tax'>('income');
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const [incomes, setIncomes] = useState(() => db.getIncomeEntries());
  const [expenses, setExpenses] = useState(() => db.getExpenseEntries());
  const [stats, setStats] = useState(() => db.getOrgStats());

  const canWrite = hasPermission(activeUser.role_id, 'finance:write');

  const refreshData = () => {
    setIncomes(db.getIncomeEntries());
    setExpenses(db.getExpenseEntries());
    setStats(db.getOrgStats());
  };

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  const handleDeleteIncome = (id: string) => {
    if (window.confirm('Delete this income record?')) {
      db.deleteIncomeEntry(id);
      refreshData();
    }
  };

  const handleDeleteExpense = (id: string) => {
    if (window.confirm('Delete this expense record?')) {
      db.deleteExpenseEntry(id);
      refreshData();
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1A20]">
        <div>
          <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">Finance & Taxation</h1>
          <p className="text-xs text-[#828290] mt-1">
            Cash inflow, operational expenditures, and GST liability breakdown.
          </p>
        </div>

        {canWrite && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="hesics-btn-secondary"
            >
              <Plus className="w-3.5 h-3.5 text-[#888896]" /> Record Expense
            </button>
            <button
              onClick={() => setIsIncomeModalOpen(true)}
              className="hesics-btn-primary"
            >
              <Plus className="w-3.5 h-3.5" /> Record Income
            </button>
          </div>
        )}
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="hesics-card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[#787886]">
            <span>Total Inflow</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 font-display">
            {fmt(stats.totalIncome)}
          </div>
          <div className="text-[10px] text-[#606070]">{incomes.length} Recorded Inflow Items</div>
        </div>

        <div className="hesics-card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[#787886]">
            <span>Total Outflow</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400 font-display">
            {fmt(stats.totalExpenses)}
          </div>
          <div className="text-[10px] text-[#606070]">{expenses.length} Recorded Expense Items</div>
        </div>

        <div className="hesics-card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[#787886]">
            <span>Net Balance</span>
            <DollarSign className="w-3.5 h-3.5 text-[#1E9EFF]" />
          </div>
          <div className={`text-xl font-bold font-display ${stats.netProfit >= 0 ? 'text-[#F4F4F6]' : 'text-rose-400'}`}>
            {fmt(stats.netProfit)}
          </div>
          <div className="text-[10px] text-[#606070]">{stats.profitMargin}% Operating Margin</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#1A1A20] pb-2 text-xs">
        {[
          { id: 'income', label: `Income Entries (${incomes.length})` },
          { id: 'expenses', label: `Expenses (${expenses.length})` },
          { id: 'tax', label: 'GST Tax Summary' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === t.id
                ? 'bg-[#15151C] text-white border border-[#20202A]'
                : 'text-[#707080] hover:text-[#D4D4D8]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Income View */}
      {activeTab === 'income' && (
        <div className="hesics-card overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#09090C] text-[#606070] border-b border-[#181820] uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Source / Client</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#15151C]">
              {incomes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#555565]">
                    No income records logged yet.
                  </td>
                </tr>
              ) : (
                incomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-[#111116] transition-colors">
                    <td className="p-3.5 text-[#808090] font-mono text-[11px]">{inc.received_at}</td>
                    <td className="p-3.5 font-semibold text-[#F4F4F6]">{inc.client_name || 'Direct Receipt'}</td>
                    <td className="p-3.5 text-[#808090]">{inc.category}</td>
                    <td className="p-3.5 font-bold text-emerald-400 font-mono">{fmt(inc.amount)}</td>
                    <td className="p-3.5 text-right">
                      {canWrite && (
                        <button
                          onClick={() => handleDeleteIncome(inc.id)}
                          className="p-1.5 text-[#707080] hover:text-rose-400 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Expenses View */}
      {activeTab === 'expenses' && (
        <div className="hesics-card overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#09090C] text-[#606070] border-b border-[#181820] uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Vendor / Entity</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">GST Included</th>
                <th className="p-3.5">Total Amount</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#15151C]">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#555565]">
                    No expense records logged yet.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#111116] transition-colors">
                    <td className="p-3.5 text-[#808090] font-mono text-[11px]">{exp.spent_at || exp.date || '—'}</td>
                    <td className="p-3.5 font-semibold text-[#F4F4F6]">{exp.vendor || 'Expense Item'}</td>
                    <td className="p-3.5 text-[#808090] capitalize">{exp.category}</td>
                    <td className="p-3.5 font-mono text-[#808090]">{fmt(exp.gst_paid)}</td>
                    <td className="p-3.5 font-bold text-rose-400 font-mono">{fmt(exp.amount)}</td>
                    <td className="p-3.5 text-right">
                      {canWrite && (
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 text-[#707080] hover:text-rose-400 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tax Summary View */}
      {activeTab === 'tax' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="hesics-card p-4 space-y-1">
            <span className="text-xs text-[#787886]">Total Output GST (Collected)</span>
            <div className="text-lg font-bold text-[#F4F4F6] font-mono">{fmt(stats.totalOutputGST)}</div>
            <p className="text-[10px] text-[#606070]">Calculated from billed client invoices</p>
          </div>

          <div className="hesics-card p-4 space-y-1">
            <span className="text-xs text-[#787886]">Input Tax Credit (GST Paid)</span>
            <div className="text-lg font-bold text-[#F4F4F6] font-mono">{fmt(stats.totalInputGST)}</div>
            <p className="text-[10px] text-[#606070]">Recorded through business expense claims</p>
          </div>

          <div className="hesics-card p-4 space-y-1">
            <span className="text-xs text-[#787886]">Estimated Net GST Payable</span>
            <div className="text-lg font-bold text-[#1E9EFF] font-mono">{fmt(stats.netGSTPayable)}</div>
            <p className="text-[10px] text-[#606070]">Current tax period balance</p>
          </div>
        </div>
      )}

      {/* Modals */}
      {isIncomeModalOpen && (
        <IncomeModal
          isOpen={isIncomeModalOpen}
          onClose={() => setIsIncomeModalOpen(false)}
          onSuccess={refreshData}
          activeUser={activeUser}
        />
      )}
      {isExpenseModalOpen && (
        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          onSuccess={refreshData}
          activeUser={activeUser}
        />
      )}

    </div>
  );
};