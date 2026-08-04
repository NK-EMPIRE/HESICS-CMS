import React, { useState } from 'react';
import { Plus, Download, Eye } from 'lucide-react';
import { db } from '../lib/supabase';
import { Invoice, User } from '../lib/types';
import { InvoiceModal } from '../components/invoices/InvoiceModal';
import { InvoicePDFDocument } from '../components/invoices/InvoicePDF';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { Modal } from '../components/ui/Modal';
import confetti from 'canvas-confetti';

interface InvoicesProps {
  activeUser: User;
}

export const Invoices: React.FC<InvoicesProps> = ({ activeUser }) => {
  const [invoices, setInvoices] = useState(db.getInvoices());
  const org = db.getOrg();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>();
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | undefined>();

  const refreshData = () => {
    setInvoices(db.getInvoices());
  };

  const handleMarkAsPaid = (invoice: Invoice) => {
    db.updateInvoice(invoice.id, {
      status: 'paid',
      paid_at: new Date().toISOString(),
    });
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
    refreshData();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="space-y-1 pb-3 border-b border-[#262626]">
        <div className="text-2xl">🧾</div>
        <h1 className="text-xl font-bold text-white tracking-tight">Tax Invoices</h1>
        <p className="text-xs text-[#888888]">
          Tax compliance invoices database with status tracking and PDF receipt export.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingInvoice(undefined);
            setIsModalOpen(true);
          }}
          className="notion-button bg-[#FF6B00] hover:bg-[#ea580c] text-white font-medium text-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Issue Invoice
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="p-12 notion-card text-center border-dashed border-[#2d2d2d] space-y-2">
          <p className="text-xs text-[#777777]">No tax invoices created yet.</p>
          <button
            onClick={() => {
              setEditingInvoice(undefined);
              setIsModalOpen(true);
            }}
            className="text-xs text-white underline hover:text-[#FF6B00]"
          >
            + Create your first invoice
          </button>
        </div>
      ) : (
        <div className="notion-card overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1c1c1c] border-b border-[#282828] text-[#888888] font-medium">
              <tr>
                <th className="p-3">Invoice #</th>
                <th className="p-3">Client</th>
                <th className="p-3">Subtotal</th>
                <th className="p-3">GST (18%)</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Due Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242424] text-[#cccccc]">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#242424] transition-colors">
                  <td className="p-3 font-mono font-semibold text-white">{inv.invoice_number}</td>
                  <td className="p-3 font-medium text-white">{inv.client_name || 'Client'}</td>
                  <td className="p-3 font-mono">₹{inv.subtotal.toLocaleString('en-IN')}</td>
                  <td className="p-3 font-mono text-[#888888]">₹{inv.tax.toLocaleString('en-IN')}</td>
                  <td className="p-3 font-mono font-bold text-white">₹{inv.total.toLocaleString('en-IN')}</td>
                  <td className="p-3 font-mono text-[#888888]">{inv.due_date || '—'}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded ${
                        inv.status === 'paid'
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40'
                          : 'bg-[#282828] text-[#aaaaaa]'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <button
                      onClick={() => setPreviewInvoice(inv)}
                      className="px-2 py-1 bg-[#282828] hover:bg-[#333333] text-[#cccccc] rounded text-[10px]"
                    >
                      <Eye className="w-3 h-3 inline mr-1" /> PDF Preview
                    </button>
                    {inv.status !== 'paid' && (
                      <button
                        onClick={() => handleMarkAsPaid(inv)}
                        className="px-2 py-1 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60 rounded text-[10px]"
                      >
                        Mark Paid ✅
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form */}
      <InvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refreshData}
        initialData={editingInvoice}
      />

      {/* PDF Preview Modal */}
      {previewInvoice && (
        <Modal
          isOpen={Boolean(previewInvoice)}
          onClose={() => setPreviewInvoice(undefined)}
          title={`Tax Invoice PDF — #${previewInvoice.invoice_number}`}
          maxWidth="2xl"
        >
          <div className="space-y-3">
            <div className="h-[420px] w-full border border-[#2e2e2e] rounded-lg overflow-hidden bg-[#111111]">
              <PDFViewer width="100%" height="100%" showToolbar={false}>
                <InvoicePDFDocument data={previewInvoice} org={org} type="invoice" />
              </PDFViewer>
            </div>
            <div className="flex justify-end pt-1">
              <PDFDownloadLink
                document={<InvoicePDFDocument data={previewInvoice} org={org} type="invoice" />}
                fileName={`Invoice-${previewInvoice.invoice_number}.pdf`}
                className="notion-button bg-[#FF6B00] text-white text-xs"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </PDFDownloadLink>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
