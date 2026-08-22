import { DownloadManagerModal } from '../components/common/DownloadManagerModal';
import React, { useState } from 'react';
import {
  Plus, Receipt, Download, CheckCircle2,
  Trash2, Edit3, Clock, DollarSign, FileSpreadsheet, Eye
} from 'lucide-react';
import { db } from '../lib/db/invoices';
import { Invoice, InvoiceStatus, User } from '../lib/types';
import { InvoiceModal } from '../components/invoices/InvoiceModal';
import { generateInvoicePDF, TemplateType } from '../lib/pdfEngine';
import { exportInvoicesToExcel } from '../lib/excelExport';
import { hasPermission } from '../lib/rbac';
import { PDFPreviewModal } from '../components/common/PDFPreviewModal';
import { CustomSelect, Option } from '../components/common/CustomSelect';
import { showToast } from '../components/common/Toast';

interface InvoicesProps {
  activeUser: User;
}

const statusBadge: Record<InvoiceStatus, string> = {
  draft: 'text-[#808090] bg-[#14141A] border-[#202028]',
  sent: 'text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30',
  paid: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
  overdue: 'text-rose-400 bg-rose-950/40 border-rose-800/50',
  cancelled: 'text-[#606070] bg-[#101014] border-[#181820]',
};

const INVOICE_STATUS_OPTIONS: Option[] = [
  { value: 'draft', label: 'Draft', badge: 'Draft', badgeColor: statusBadge['draft'] },
  { value: 'sent', label: 'Sent', badge: 'Sent', badgeColor: statusBadge['sent'] },
  { value: 'paid', label: 'Paid', badge: 'Paid', badgeColor: statusBadge['paid'] },
  { value: 'overdue', label: 'Overdue', badge: 'Overdue', badgeColor: statusBadge['overdue'] },
  { value: 'cancelled', label: 'Cancelled', badge: 'Void', badgeColor: statusBadge['cancelled'] },
];

export const Invoices: React.FC<InvoicesProps> = ({ activeUser }) => {
  const [invoices, setInvoices] = useState(() => db.getInvoices());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [previewingInvoice, setPreviewingInvoice] = useState<Invoice | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const canWrite = hasPermission(activeUser.role_id, 'invoices:write');
  const org = db.getOrg();

  const refreshInvoices = () => setInvoices(db.getInvoices());
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  const handleQuickStatusChange = (inv: Invoice, newStatus: InvoiceStatus) => {
    db.updateInvoice(inv.id, {
      status: newStatus,
      paid_at: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : inv.paid_at,
    });
    refreshInvoices();
    showToast('Status Updated', `Invoice #${inv.invoice_number} set to ${newStatus.toUpperCase()}`);
  };

  const handleDelete = (inv: Invoice) => {
    if (window.confirm(`Delete invoice #${inv.invoice_number}?`)) {
      db.deleteInvoice(inv.id);
      showToast('Invoice Deleted', `Invoice #${inv.invoice_number} removed.`);
      refreshInvoices();
    }
  };

  const handleDownloadPDF = async (inv: Invoice) => {
    const doc = await generateInvoicePDF(inv, org, (inv.template_id as TemplateType) || 'titanium');
    const blob = doc.output('blob'); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `HESICS_Invoice_${inv.invoice_number}.pdf`;
    document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
  };

  const handleExportExcel = () => {
    exportInvoicesToExcel(invoices);
    showToast('Excel Exported', 'Downloaded invoices ledger spreadsheet.');
  };

  
  const handleExecuteInvoiceDownload = async (config: {
    format: 'pdf' | 'excel' | 'both';
    dateMode: 'all' | 'month' | 'custom';
    selectedMonth: number;
    selectedYear: number;
    startDate: string;
    endDate: string;
  }) => {
    let filtered = [...invoices];
    if (config.dateMode === 'month') {
      filtered = filtered.filter((i) => {
        const d = new Date(i.issue_date || i.created_at);
        return d.getMonth() === config.selectedMonth && d.getFullYear() === config.selectedYear;
      });
    } else if (config.dateMode === 'custom') {
      if (config.startDate) filtered = filtered.filter((i) => (i.issue_date || i.created_at).split('T')[0] >= config.startDate);
      if (config.endDate) filtered = filtered.filter((i) => (i.issue_date || i.created_at).split('T')[0] <= config.endDate);
    }

    if (config.format === 'excel' || config.format === 'both') {
      exportInvoicesToExcel(filtered);
    }
    if (config.format === 'pdf' || config.format === 'both') {
      for (const inv of filtered.slice(0, 10)) {
        const doc = await generateInvoicePDF(inv, org, (inv.template_id as TemplateType) || 'titanium');
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HESICS_Invoice_${inv.invoice_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 400);
      }
    }
  };

  const totalBilled = invoices.reduce((sum, i) => sum + Number(i.total || 0), 0);
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + Number(i.total || 0), 0);

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1A20]">
        <div>
          <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">Invoices & Billing</h1>
          <p className="text-xs text-[#828290] mt-1">
            Total Billed: <span className="font-mono text-[#F4F4F6] font-semibold">{fmt(totalBilled)}</span> • Reconciled: <span className="font-mono text-emerald-400 font-semibold">{fmt(totalPaid)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsDownloadModalOpen(true)}
            className="hesics-btn-secondary"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#77727E]" /> Export & Download
          </button>
          {canWrite && (
            <button
              onClick={() => {
                setEditingInvoice(null);
                setIsModalOpen(true);
              }}
              className="hesics-btn-primary"
            >
              <Plus className="w-3.5 h-3.5" /> Issue Invoice
            </button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="hesics-card overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#09090C] text-[#707080] border-b border-[#181820] uppercase text-[10px] font-semibold tracking-wider">
            <tr>
              <th className="p-4">Invoice #</th>
              <th className="p-4">Client Account</th>
              <th className="p-4">Due Date</th>
              <th className="p-4">Status</th>
              <th className="p-4">Total Amount</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#15151C]">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#555565]">
                  No invoices issued yet.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#111116] transition-colors">
                  <td className="p-4 font-mono text-[#F4F4F6] font-semibold">
                    {inv.invoice_number}
                  </td>
                  <td className="p-4 font-semibold text-[#F4F4F6]">{inv.client_name}</td>
                  <td className="p-4 text-[#808090] font-mono text-[11px]">
                    {inv.due_date || '—'}
                  </td>
                  <td className="p-4">
                    {canWrite ? (
                      <div className="w-28">
                        <CustomSelect
                          value={inv.status}
                          onChange={(v) => handleQuickStatusChange(inv, v as InvoiceStatus)}
                          options={INVOICE_STATUS_OPTIONS}
                        />
                      </div>
                    ) : (
                      <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${statusBadge[inv.status]}`}>
                        {inv.status}
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-bold text-[#F4F4F6] font-mono">{fmt(inv.total)}</td>
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => setPreviewingInvoice(inv)}
                        title="Live Vector Preview"
                        className="p-1.5 text-[#707080] hover:text-white rounded-lg hover:bg-[#16161D] transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDownloadPDF(inv)}
                        title="Download Vector PDF"
                        className="p-1.5 text-[#707080] hover:text-white rounded-lg hover:bg-[#16161D] transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {canWrite && (
                        <button
                          onClick={() => {
                            setEditingInvoice(inv);
                            setIsModalOpen(true);
                          }}
                          title="Edit Invoice"
                          className="p-1.5 text-[#707080] hover:text-white rounded-lg hover:bg-[#16161D] transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}

                      {canWrite && (
                        <button
                          onClick={() => handleDelete(inv)}
                          title="Delete Invoice"
                          className="p-1.5 text-[#707080] hover:text-rose-400 rounded-lg hover:bg-rose-950/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Live PDF Preview Modal */}
      {previewingInvoice && (
        <PDFPreviewModal
          isOpen={!!previewingInvoice}
          onClose={() => setPreviewingInvoice(null)}
          title={`Tax Invoice #${previewingInvoice.invoice_number}`}
          pdfDocument={generateInvoicePDF(
            previewingInvoice,
            org,
            (previewingInvoice.template_id as TemplateType) || 'titanium'
          )}
          fileName={`HESICS_Invoice_${previewingInvoice.invoice_number}.pdf`}
          emailDefaults={
            previewingInvoice.client_email
              ? {
                  to: previewingInvoice.client_email,
                  recipientName: previewingInvoice.client_name || 'Client',
                  documentType: 'Invoice',
                  documentNumber: previewingInvoice.invoice_number,
                  defaultSubject: `Tax Invoice #${previewingInvoice.invoice_number} from HESICS — Due ${previewingInvoice.due_date}`,
                  defaultMessage: `Please find attached formal tax invoice #${previewingInvoice.invoice_number} for your account.\n\nTotal Payable: ₹${previewingInvoice.total.toLocaleString('en-IN')}\nPayment Due Date: ${previewingInvoice.due_date}\n\nKindly process the remittance at your earliest convenience.`,
                }
              : undefined
          }
        />
      )}

      {/* Modal */}
      {isModalOpen && (
        <InvoiceModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingInvoice(null);
          }}
          onSuccess={refreshInvoices}
          invoice={editingInvoice || undefined}
          activeUser={activeUser}
        />
      )}
      {/* Unified Download Manager Modal */}
      {isDownloadModalOpen && (
        <DownloadManagerModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          title="Export Invoices & Billing Ledger"
          totalRecordsCount={invoices.length}
          onExecuteDownload={handleExecuteInvoiceDownload}
        />
      )}
    </div>
  );
};