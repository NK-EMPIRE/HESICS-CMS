import React, { useState } from 'react';
import {
  X, Download, FileText, FileSpreadsheet, Calendar, ChevronDown,
  Loader2, CheckCircle, TrendingUp, TrendingDown
} from 'lucide-react';
import { IncomeEntry, ExpenseEntry, Organization } from '../../lib/types';
import { generateIncomeReportPDF, generateExpenseReportPDF } from '../../lib/pdfEngine';
import { exportFinanceToExcel, exportMonthlyIncomeToExcel, exportMonthlyExpenseToExcel } from '../../lib/excelExport';
import { showToast } from '../common/Toast';

interface FinanceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  org: Organization;
}

type ReportType = 'income' | 'expense' | 'combined';
type FormatType = 'pdf' | 'excel' | 'both';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export const FinanceReportModal: React.FC<FinanceReportModalProps> = ({
  isOpen, onClose, incomes, expenses, org,
}) => {
  const [reportType, setReportType] = useState<ReportType>('combined');
  const [format, setFormat] = useState<FormatType>('both');
  const [filterMode, setFilterMode] = useState<'all' | 'month' | 'range'>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);

  if (!isOpen) return null;

  const filterEntries = <T extends { received_at?: string; spent_at?: string; date?: string; created_at?: string }>(
    entries: T[]
  ): T[] => {
    if (filterMode === 'all') return entries;
    return entries.filter(e => {
      const rawDate = (e as any).received_at || (e as any).spent_at || (e as any).date || (e as any).created_at || '';
      if (!rawDate) return true;
      const d = new Date(rawDate);
      if (filterMode === 'month') {
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      }
      if (filterMode === 'range') {
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      return true;
    });
  };

  const getLabel = () => {
    if (filterMode === 'month') return `${MONTHS[selectedMonth]} ${selectedYear}`;
    if (filterMode === 'range') return `${dateFrom || '—'} to ${dateTo || '—'}`;
    return 'All Time';
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadDone(false);
    try {
      const filteredIncome = filterEntries(incomes);
      const filteredExpense = filterEntries(expenses);
      const label = getLabel();
      const suffix = label.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

      if (format === 'excel' || format === 'both') {
        if (reportType === 'income' || reportType === 'combined') {
          
          exportMonthlyIncomeToExcel(filteredIncome, `HESICS_Income_${suffix}.xlsx`);
        }
        if (reportType === 'expense' || reportType === 'combined') {
          
          exportMonthlyExpenseToExcel(filteredExpense, `HESICS_Expense_${suffix}.xlsx`);
        }
        if (reportType === 'combined') {
          // Also export combined ledger
          setTimeout(() => exportFinanceToExcel(filteredIncome, filteredExpense, `HESICS_FinancialLedger_${suffix}.xlsx`), 600);
        }
      }

      if (format === 'pdf' || format === 'both') {
        if (reportType === 'income' || reportType === 'combined') {
          const doc = await generateIncomeReportPDF(filteredIncome, org, label);
          const blob = doc.output('blob');
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `HESICS_Income_Report_${suffix}.pdf`;
          document.body.appendChild(a); a.click();
          setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
        }
        if (reportType === 'expense' || reportType === 'combined') {
          const doc2 = await generateExpenseReportPDF(filteredExpense, org, label);
          const blob2 = doc2.output('blob');
          const url2 = URL.createObjectURL(blob2);
          const a2 = document.createElement('a');
          a2.href = url2; a2.download = `HESICS_Expense_Report_${suffix}.pdf`;
          document.body.appendChild(a2); a2.click();
          setTimeout(() => { document.body.removeChild(a2); URL.revokeObjectURL(url2); }, 800);
        }
      }

      setDownloadDone(true);
      showToast('Report Downloaded', `${label} report generated successfully.`, 'success');
      setTimeout(() => { setDownloadDone(false); onClose(); }, 1800);
    } catch (err) {
      console.error(err);
      showToast('Error', 'Failed to generate report. Please try again.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  // Summary counts
  const filteredIncomes = filterEntries(incomes);
  const filteredExpenses = filterEntries(expenses);
  const totalInc = filteredIncomes.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalExp = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
      <div className="bg-[#0D0D11] border border-[#22222B] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1C1C26]">
          <div>
            <h2 className="text-sm font-bold text-[#F4F4F6]">Export Financial Report</h2>
            <p className="text-xs text-[#808090] mt-0.5">Customize date range, type and format before downloading.</p>
          </div>
          <button onClick={onClose} className="text-[#606070] hover:text-white p-1.5 rounded-xl hover:bg-[#16161D]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Report Type */}
          <div>
            <label className="hesics-label mb-2 block">Report Type</label>
            <div className="grid grid-cols-3 gap-2">
              {([['income','Income','TrendingUp'], ['expense','Expense','TrendingDown'], ['combined','Combined','FileText']] as const).map(([v, l, Icon]) => (
                <button
                  key={v}
                  onClick={() => setReportType(v)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                    reportType === v ? 'border-[#77727E]/60 bg-[#77727E]/10 text-[#F4F4F6]' : 'border-[#1E1E28] bg-[#09090C] text-[#707080] hover:border-[#2A2A38]'
                  }`}
                >
                  {v === 'income' && <TrendingUp className={`w-4 h-4 ${reportType === v ? 'text-emerald-400' : ''}`} />}
                  {v === 'expense' && <TrendingDown className={`w-4 h-4 ${reportType === v ? 'text-rose-400' : ''}`} />}
                  {v === 'combined' && <FileText className={`w-4 h-4 ${reportType === v ? 'text-[#77727E]' : ''}`} />}
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="hesics-label mb-2 block">Download Format</label>
            <div className="grid grid-cols-3 gap-2">
              {([['pdf','PDF Report','FileText'], ['excel','Excel Ledger','FileSpreadsheet'], ['both','Both','Download']] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setFormat(v)}
                  className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    format === v ? 'border-[#77727E]/60 bg-[#77727E]/10 text-[#F4F4F6]' : 'border-[#1E1E28] bg-[#09090C] text-[#707080] hover:border-[#2A2A38]'
                  }`}
                >
                  {v === 'pdf' && <FileText className="w-3.5 h-3.5 text-rose-400" />}
                  {v === 'excel' && <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />}
                  {v === 'both' && <Download className="w-3.5 h-3.5 text-[#77727E]" />}
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Date Filter */}
          <div>
            <label className="hesics-label mb-2 block">Date Range</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {([['all','All Time'], ['month','By Month'], ['range','Custom Range']] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setFilterMode(v)}
                  className={`p-2 rounded-xl border text-xs font-medium transition-all ${
                    filterMode === v ? 'border-[#77727E]/60 bg-[#77727E]/10 text-[#F4F4F6]' : 'border-[#1E1E28] bg-[#09090C] text-[#707080] hover:border-[#2A2A38]'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {filterMode === 'month' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="hesics-label">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    className="hesics-input text-xs w-full"
                  >
                    {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="hesics-label">Year</label>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="hesics-input text-xs w-full"
                  >
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            )}

            {filterMode === 'range' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="hesics-label">From Date</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="hesics-input text-xs w-full" />
                </div>
                <div>
                  <label className="hesics-label">To Date</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="hesics-input text-xs w-full" />
                </div>
              </div>
            )}
          </div>

          {/* Summary Preview */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-[#09090C] border border-[#1A1A24] rounded-2xl">
            <div className="text-center">
              <div className="text-[10px] text-[#606070] uppercase tracking-wider">Income Entries</div>
              <div className="text-base font-bold text-emerald-400 mt-1">{filteredIncomes.length}</div>
              <div className="text-[9px] text-[#505060] font-mono">₹{totalInc.toLocaleString('en-IN')}</div>
            </div>
            <div className="text-center border-x border-[#1A1A24]">
              <div className="text-[10px] text-[#606070] uppercase tracking-wider">Expense Entries</div>
              <div className="text-base font-bold text-rose-400 mt-1">{filteredExpenses.length}</div>
              <div className="text-[9px] text-[#505060] font-mono">₹{totalExp.toLocaleString('en-IN')}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-[#606070] uppercase tracking-wider">Net Profit</div>
              <div className={`text-base font-bold mt-1 ${totalInc - totalExp >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ₹{Math.abs(totalInc - totalExp).toLocaleString('en-IN')}
              </div>
              <div className="text-[9px] text-[#505060]">{getLabel()}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1A1A22] flex items-center justify-between">
          <button onClick={onClose} className="hesics-btn-ghost text-xs">Cancel</button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="hesics-btn-primary text-xs px-8 gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating Report…
              </>
            ) : downloadDone ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Downloaded!
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Download Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
