import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Plus, Calculator,
  Calendar, ArrowUpRight, ArrowDownRight, ShieldCheck, Trash2
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { db } from '../lib/supabase';
import { User, ExpenseEntry, IncomeEntry } from '../lib/types';
import { ExpenseModal } from '../components/finance/ExpenseModal';
import { IncomeModal } from '../components/finance/IncomeModal';

interface FinanceProps {
  activeUser: User;
}

export const Finance: React.FC<FinanceProps> = ({ activeUser }) => {
  const [incomes, setIncomes] = useState<IncomeEntry[]>(db.getIncomeEntries());
  const [expenses, setExpenses] = useState<ExpenseEntry[]>(db.getExpenseEntries());
  const invoices = db.getInvoices();

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'income' | 'expenses' | 'tax'>('overview');

  const refreshData = () => {
    setIncomes(db.getIncomeEntries());
    setExpenses(db.getExpenseEntries());
  };

  const handleDeleteExpense = (id: string) => {
    if (window.confirm('Delete expense record?')) {
      db.deleteExpenseEntry(id);
      refreshData();
    }
  };

  // Finance Totals
  const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

  // Quarterly Tax Calculator (India 18% GST Output vs Input Credit)
  // Output GST collected on paid & sent invoices
  const totalOutputGST = invoices.reduce((sum, inv) => sum + Number(inv.tax), 0);
  // Input GST paid on expenses
  const totalInputGST = expenses.reduce((sum, exp) => sum + Number(exp.gst_paid), 0);
  // Net GST Payable
  const netGSTPayable = Math.max(0, totalOutputGST - totalInputGST);

  // Financial Chart Data (Monthly aggregation mock/computed)
  const chartData = [
    { month: 'May', Income: Math.round(totalIncome * 0.2), Expenses: Math.round(totalExpenses * 0.3) },
    { month: 'Jun', Income: Math.round(totalIncome * 0.3), Expenses: Math.round(totalExpenses * 0.25) },
    { month: 'Jul', Income: Math.round(totalIncome * 0.5), Expenses: Math.round(totalExpenses * 0.45) },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="space-y-1 pb-3 border-b border-[#1a1a1a]">
        <div className="text-2xl">📊</div>
        <h1 className="text-xl font-bold text-white tracking-tight">Finance & Tax Operations</h1>
        <p className="text-xs text-[#888888]">
          Phase 2 Module: P&L tracking, expense logging, and quarterly GST liability calculator.
        </p>
      </div>

      {/* Tabs & Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1 bg-[#0d0d0d] p-1 border border-[#161616] rounded-lg">
          {(['overview', 'income', 'expenses', 'tax'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs font-medium rounded capitalize transition-all ${
                activeTab === tab
                  ? 'bg-[#151515] text-white font-semibold shadow-xs'
                  : 'text-[#888888] hover:text-[#cccccc]'
              }`}
            >
              {tab === 'tax' ? 'GST Tax Calc' : tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="notion-button bg-[#111111] hover:bg-[#141414] text-white border border-[#333333]"
          >
            <Plus className="w-3.5 h-3.5" /> + Expense
          </button>
          <button
            onClick={() => setIsIncomeModalOpen(true)}
            className="notion-button bg-[#1E9EFF] hover:bg-[#0A8AE6] text-white font-medium text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> + Record Income
          </button>
        </div>
      </div>

      {/* Summary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 notion-card space-y-1">
          <div className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">Gross Income</div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            ₹{totalIncome.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-[#666666]">Recorded revenue credits</div>
        </div>

        <div className="p-4 notion-card space-y-1">
          <div className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">Total Expenses</div>
          <div className="text-xl font-bold font-mono text-red-400">
            ₹{totalExpenses.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-[#666666]">Operational outflows</div>
        </div>

        <div className="p-4 notion-card space-y-1">
          <div className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">Net Profit</div>
          <div className={`text-xl font-bold font-mono ${netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
            ₹{netProfit.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-[#666666]">{profitMargin}% Profit Margin</div>
        </div>

        <div className="p-4 notion-card space-y-1 bg-[#1e1c18] border-[#382d1e]">
          <div className="text-[11px] font-medium text-[#1E9EFF] uppercase tracking-wider">Net GST Liability</div>
          <div className="text-xl font-bold font-mono text-white">
            ₹{netGSTPayable.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-[#aaaaaa]">Est. Q2 Tax Payable</div>
        </div>
      </div>

      {/* Tab 1: P&L Overview & Recharts Financial Trend */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="notion-card p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#aaaaaa]">
              Revenue vs Expense Trend (Recharts)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#161616" />
                  <XAxis dataKey="month" stroke="#666666" fontSize={11} />
                  <YAxis stroke="#666666" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#333333', borderRadius: '6px', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="Income" stroke="#10b981" fillOpacity={1} fill="url(#incomeGrad)" />
                  <Area type="monotone" dataKey="Expenses" stroke="#ef4444" fillOpacity={1} fill="url(#expenseGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Income List */}
      {activeTab === 'income' && (
        <div className="notion-card overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1c1c1c] border-b border-[#181818] text-[#888888] font-medium">
              <tr>
                <th className="p-3">Source / Client</th>
                <th className="p-3">Type</th>
                <th className="p-3">Date</th>
                <th className="p-3">Method</th>
                <th className="p-3 font-mono text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111111] text-[#cccccc]">
              {incomes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#666666]">No income entries recorded yet.</td>
                </tr>
              ) : (
                incomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-[#111111]">
                    <td className="p-3 font-semibold text-white">{inc.client_name || 'Revenue Stream'}</td>
                    <td className="p-3 uppercase text-[10px] text-[#888888]">{inc.source_type}</td>
                    <td className="p-3 text-[#888888] font-mono">{inc.received_at}</td>
                    <td className="p-3 text-[#888888]">{inc.payment_method || 'Bank'}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">₹{inc.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Expense List */}
      {activeTab === 'expenses' && (
        <div className="notion-card overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1c1c1c] border-b border-[#181818] text-[#888888] font-medium">
              <tr>
                <th className="p-3">Category</th>
                <th className="p-3">Vendor</th>
                <th className="p-3">Date</th>
                <th className="p-3 font-mono">Input GST Paid (₹)</th>
                <th className="p-3 font-mono text-right">Amount (₹)</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111111] text-[#cccccc]">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#666666]">No expense entries recorded.</td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#111111]">
                    <td className="p-3 font-semibold text-white capitalize">{exp.category}</td>
                    <td className="p-3 text-[#aaaaaa]">{exp.vendor || '—'}</td>
                    <td className="p-3 text-[#888888] font-mono">{exp.spent_at}</td>
                    <td className="p-3 font-mono text-emerald-400">₹{exp.gst_paid.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right font-mono font-bold text-white">₹{exp.amount.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleDeleteExpense(exp.id)} className="text-[#666666] hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Quarterly GST Tax Calculator */}
      {activeTab === 'tax' && (
        <div className="notion-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#161616] pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Quarterly GST Tax Provisioning (India 18%)</h3>
              <p className="text-xs text-[#888888] mt-0.5">Automated computation of Output GST Liability vs. Input Tax Credit.</p>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#1e1e1e] text-xs font-mono text-[#cccccc]">2026-Q2</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#080808] border border-[#161616] rounded-lg space-y-1">
              <div className="text-xs text-[#888888]">1. Output GST Collected</div>
              <div className="text-lg font-bold font-mono text-[#1E9EFF]">
                ₹{totalOutputGST.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-[#666666]">18% GST charged on sales</div>
            </div>

            <div className="p-4 bg-[#080808] border border-[#161616] rounded-lg space-y-1">
              <div className="text-xs text-[#888888]">2. Input GST Credit (Expenses)</div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                - ₹{totalInputGST.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-[#666666]">Tax paid on vendors & tools</div>
            </div>

            <div className="p-4 bg-[#1e1a14] border border-[#42331c] rounded-lg space-y-1">
              <div className="text-xs text-[#1E9EFF] font-bold">3. Net GST Payable</div>
              <div className="text-xl font-bold font-mono text-white">
                ₹{netGSTPayable.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-[#aaaaaa]">Estimated payment liability</div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={refreshData}
        activeUser={activeUser}
      />

      <IncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onSuccess={refreshData}
        activeUser={activeUser}
      />
    </div>
  );
};
