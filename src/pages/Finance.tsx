import {
  generateFinanceReportPDF,
  downloadPDFDocument,
} from "../lib/pdfEngine";
import { DownloadManagerModal } from "../components/common/DownloadManagerModal";
import React, { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  FileSpreadsheet,
  Calendar,
  Percent,
} from "lucide-react";
import { db } from "../lib/db/finance";
import { User, IncomeEntry, ExpenseEntry } from "../lib/types";
import { IncomeModal } from "../components/finance/IncomeModal";
import { ExpenseModal } from "../components/finance/ExpenseModal";
import { exportFinanceToExcel } from "../lib/excelExport";
import { FinanceReportModal } from "../components/finance/FinanceReportModal";
import { hasPermission } from "../lib/rbac";

interface FinanceProps {
  activeUser: User;
}

export const Finance: React.FC<FinanceProps> = ({ activeUser }) => {
  const org = db.getOrg();
  const isTaxEnabled = org.is_tax_enabled !== false;

  const [incomes, setIncomes] = useState<IncomeEntry[]>(() =>
    db.getIncomeEntries(),
  );
  const [expenses, setExpenses] = useState<ExpenseEntry[]>(() =>
    db.getExpenseEntries(),
  );
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const canWrite = hasPermission(activeUser.role_id, "finance:write");

  const refreshData = () => {
    setIncomes(db.getIncomeEntries());
    setExpenses(db.getExpenseEntries());
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const totalIncome = incomes.reduce(
    (sum, i) => sum + Number(i.amount || 0),
    0,
  );
  const totalExpense = expenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0,
  );
  const netProfit = totalIncome - totalExpense;

  const gstCollected = Math.round(totalIncome * 0.18);
  const gstPaid = expenses.reduce((sum, e) => sum + Number(e.gst_paid || 0), 0);
  const netGSTPayable = isTaxEnabled ? Math.max(0, gstCollected - gstPaid) : 0;

  const handleDeleteIncome = (id: string) => {
    if (window.confirm("Delete this revenue entry?")) {
      db.deleteIncomeEntry(id);
      refreshData();
    }
  };

  const handleDeleteExpense = (id: string) => {
    if (window.confirm("Delete this expense entry?")) {
      db.deleteExpenseEntry(id);
      refreshData();
    }
  };

  const handleExportExcel = () => {
    exportFinanceToExcel(incomes, expenses);
  };

  const handleExecuteFinanceDownload = async (config: {
    format: "pdf" | "excel" | "both";
    dateMode: "all" | "month" | "custom";
    selectedMonth: number;
    selectedYear: number;
    startDate: string;
    endDate: string;
  }) => {
    let filteredIncomes = [...incomes];
    let filteredExpenses = [...expenses];

    if (config.dateMode === "month") {
      filteredIncomes = filteredIncomes.filter((i) => {
        const d = new Date(i.received_at || i.created_at);
        return (
          d.getMonth() === config.selectedMonth &&
          d.getFullYear() === config.selectedYear
        );
      });
      filteredExpenses = filteredExpenses.filter((e) => {
        const d = new Date(e.spent_at || e.date || e.created_at);
        return (
          d.getMonth() === config.selectedMonth &&
          d.getFullYear() === config.selectedYear
        );
      });
    } else if (config.dateMode === "custom") {
      if (config.startDate) {
        filteredIncomes = filteredIncomes.filter(
          (i) =>
            (i.received_at || i.created_at).split("T")[0] >= config.startDate,
        );
        filteredExpenses = filteredExpenses.filter(
          (e) =>
            (e.spent_at || e.date || e.created_at).split("T")[0] >=
            config.startDate,
        );
      }
      if (config.endDate) {
        filteredIncomes = filteredIncomes.filter(
          (i) =>
            (i.received_at || i.created_at).split("T")[0] <= config.endDate,
        );
        filteredExpenses = filteredExpenses.filter(
          (e) =>
            (e.spent_at || e.date || e.created_at).split("T")[0] <=
            config.endDate,
        );
      }
    }

    if (config.format === "excel" || config.format === "both") {
      exportFinanceToExcel(filteredIncomes, filteredExpenses);
    }
    if (config.format === "pdf" || config.format === "both") {
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      const periodLabel =
        config.dateMode === "month"
          ? `${monthNames[config.selectedMonth]} ${config.selectedYear}`
          : config.dateMode === "custom"
            ? `${config.startDate || "Start"} to ${config.endDate || "Present"}`
            : "All-Time Financial Statement";

      const doc = await generateFinanceReportPDF(
        filteredIncomes,
        filteredExpenses,
        periodLabel,
        org,
      );
      downloadPDFDocument(doc, `HESICS_Finance_Report_${Date.now()}.pdf`);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1A20]">
        <div>
          <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">
            Financial Statements & Treasury
          </h1>
          <p className="text-xs text-[#828290] mt-1">
            Cash inflow, operational expenditures, net profit margins, and tax
            reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsDownloadModalOpen(true)}
            className="hesics-btn-secondary"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#77727E]" /> Export &
            Download
          </button>
          {canWrite && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="hesics-btn-secondary text-rose-300 hover:text-rose-200"
              >
                <Plus className="w-3.5 h-3.5 text-rose-400" /> Record Expense
              </button>
              <button
                onClick={() => setIsIncomeModalOpen(true)}
                className="hesics-btn-primary"
              >
                <Plus className="w-3.5 h-3.5" /> Record Inflow
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inflow */}
        <div className="hesics-card p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#808090]">
            <span>Total Revenue Inflows</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-[#F4F4F6] font-mono">
            {fmt(totalIncome)}
          </div>
          <div className="text-[11px] text-emerald-400/80 font-medium">
            Reconciled receipts
          </div>
        </div>

        {/* Total Outflow */}
        <div className="hesics-card p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#808090]">
            <span>Total Expenditures</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-[#F4F4F6] font-mono">
            {fmt(totalExpense)}
          </div>
          <div className="text-[11px] text-rose-400/80 font-medium">
            Operational outlays
          </div>
        </div>

        {/* Net Profit */}
        <div className="hesics-card p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#808090]">
            <span>Net Operating Margin</span>
            <DollarSign className="w-4 h-4 text-[#77727E]" />
          </div>
          <div
            className={`text-2xl font-bold font-mono ${netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}
          >
            {fmt(netProfit)}
          </div>
          <div className="text-[11px] text-[#707080]">
            {totalIncome > 0
              ? `${((netProfit / totalIncome) * 100).toFixed(1)}% margin`
              : "—"}
          </div>
        </div>

        {/* GST Summary */}
        <div className="hesics-card p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#808090]">
            <span>Net GST Liability</span>
            <Percent className="w-4 h-4 text-[#77727E]" />
          </div>
          <div className="text-2xl font-bold text-[#D4D4D8] font-mono">
            {fmt(netGSTPayable)}
          </div>
          <div className="text-[11px] text-[#707080]">
            {isTaxEnabled ? `ITC Offset: ${fmt(gstPaid)}` : "Tax Disabled"}
          </div>
        </div>
      </div>

      {/* Tables Container: Revenue vs Expenditures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incomes Table */}
        <div className="hesics-card overflow-hidden">
          <div className="p-4 border-b border-[#181820] flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#F4F4F6] flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Revenue
              Inflow Register
            </h2>
            <span className="text-[10px] text-[#606070] font-mono">
              {incomes.length} records
            </span>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#09090C] text-[#707080] border-b border-[#181820] uppercase text-[10px] font-semibold">
                <tr>
                  <th className="p-3.5">Source / Client</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5 text-right">Date</th>
                  {canWrite && <th className="p-3.5 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#15151C]">
                {incomes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-[#505060]">
                      No inflow records logged.
                    </td>
                  </tr>
                ) : (
                  incomes.map((inc) => (
                    <tr
                      key={inc.id}
                      className="hover:bg-[#111116] transition-colors"
                    >
                      <td className="p-3.5 font-semibold text-[#F4F4F6]">
                        {inc.client_name || inc.source_type}
                      </td>
                      <td className="p-3.5 text-[#808090]">{inc.category}</td>
                      <td className="p-3.5 font-bold font-mono text-emerald-400">
                        {fmt(inc.amount)}
                      </td>
                      <td className="p-3.5 text-right text-[#707080] font-mono text-[11px]">
                        {inc.received_at}
                      </td>
                      {canWrite && (
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleDeleteIncome(inc.id)}
                            className="p-1 text-[#606070] hover:text-rose-400 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="hesics-card overflow-hidden">
          <div className="p-4 border-b border-[#181820] flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#F4F4F6] flex items-center gap-2">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> Expenditure
              Register
            </h2>
            <span className="text-[10px] text-[#606070] font-mono">
              {expenses.length} records
            </span>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#09090C] text-[#707080] border-b border-[#181820] uppercase text-[10px] font-semibold">
                <tr>
                  <th className="p-3.5">Vendor</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5 text-right">Date</th>
                  {canWrite && <th className="p-3.5 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#15151C]">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-[#505060]">
                      No expense records logged.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr
                      key={exp.id}
                      className="hover:bg-[#111116] transition-colors"
                    >
                      <td className="p-3.5 font-semibold text-[#F4F4F6]">
                        {exp.vendor || "Operational"}
                      </td>
                      <td className="p-3.5 text-[#808090]">{exp.category}</td>
                      <td className="p-3.5 font-bold font-mono text-rose-400">
                        {fmt(exp.amount)}
                      </td>
                      <td className="p-3.5 text-right text-[#707080] font-mono text-[11px]">
                        {exp.spent_at || exp.date || "—"}
                      </td>
                      {canWrite && (
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 text-[#606070] hover:text-rose-400 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isIncomeModalOpen && (
        <IncomeModal
          isOpen={isIncomeModalOpen}
          onClose={() => setIsIncomeModalOpen(false)}
          onSuccess={refreshData}
          activeUser={activeUser}
        />
      )}

      {isReportModalOpen && (
        <FinanceReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          incomes={incomes}
          expenses={expenses}
          org={org}
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

      {/* Unified Finance Download Manager Modal */}
      {isDownloadModalOpen && (
        <DownloadManagerModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          title="Export Financial Statements & Ledgers"
          subtitle="Download customized Income & Expense statements with date filtering in PDF or Excel."
          totalRecordsCount={incomes.length + expenses.length}
          onExecuteDownload={handleExecuteFinanceDownload}
        />
      )}
    </div>
  );
};
