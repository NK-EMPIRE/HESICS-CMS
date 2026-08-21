import React, { useState } from 'react';
import {
  Plus, Receipt, Download, CheckCircle2,
  Trash2, Edit3, Clock, DollarSign
} from 'lucide-react';
import { db } from '../lib/firebaseDb';
import { Invoice, InvoiceStatus, User } from '../lib/types';
import { InvoiceModal } from '../components/invoices/InvoiceModal';
import { generateInvoicePDF } from '../components/invoices/InvoicePDF';
import { hasPermission } from '../lib/rbac';

interface InvoicesProps {
  activeUser: User;
}

const statusBadge: Record<InvoiceStatus, string> = {
  draft: 'text-[#808090] bg-[#14141A] border-[#202028]',
  sent: 'text-[#1E9EFF] bg-[#1E9EFF]/10 border-[#1E9EFF]/30',
  paid: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40',
  overdue: 'text-rose-400 bg-rose-950/30 border-rose-900/40',
  cancelled: 'text-[#606070] bg-[#101014] border-[#181820]',
};

export const Invoices: React.FC<InvoicesProps> = ({ activeUser }) => {
  const [invoices, setInvoices] = useState(() => db.getInvoices());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const canWrite = hasPermission(activeUser.role_id, 'invoices:write');

  const refreshInvoices = () => setInvoices(db.getInvoices());

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  const handleMarkPaid = (inv: Invoice) => {
    db.updateInvoice(inv.id, {
      status: 'paid',
      paid_at: new Date().toISOString().split('T')[0],
    });
    refreshInvoices();
  };

  const handleDelete = (inv: Invoice) => {
    if (window.confirm(`Delete invoice #${inv.invoice_number}?`)) {
      db.deleteInvoice(inv.id);
      refreshInvoices();
    }
  };

  const handleDownloadPDF = (inv: Invoice) => {
    const org = db.getOrg();
    generateInvoicePDF(inv, org, 'invoice');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1A20]">
        <div>
          <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">Invoices & Billing</h1>
          <p className="text-xs text-[#828290] mt-1">
            Tax invoices, collection tracking, and automated income reconciliation.
          </p>
        </div>

        {canWrite && (
          <button
            onClick={() => {
              setEditingInvoice(null);
              setIsModalOpen(true);
            }}
            className="hesics-btn-primary self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Issue Invoice
          </button>
        )}
      </div>

      {/* Invoices Table */}
      <div className="hesics-card overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#09090C] text-[#606070] border-b border-[#181820] uppercase text-[10px] font-semibold tracking-wider">
            <tr>
              <th className="p-3.5">Invoice #</th>
              <th className="p-3.5">Client</th>
              <th className="p-3.5">Due Date</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Total Amount</th>
              <th className="p-3.5 text-right">Actions</th>
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
                  <td className="p-3.5 font-mono text-[#F4F4F6] font-semibold">
                    {inv.invoice_number}
                  </td>
                  <td className="p-3.5 font-semibold text-[#F4F4F6]">{inv.client_name}</td>
                  <td className="p-3.5 text-[#808090] font-mono text-[11px]">
                    {inv.due_date || '—'}
                  </td>
                  <td className="p-3.5">
                    <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${statusBadge[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-[#F4F4F6] font-mono">{fmt(inv.total)}</td>
                  <td className="p-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => handleDownloadPDF(inv)}
                        title="Download PDF"
                        className="p-1.5 text-[#707080] hover:text-[#1E9EFF] rounded transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {canWrite && inv.status !== 'paid' && (
                        <button
                          onClick={() => handleMarkPaid(inv)}
                          title="Mark as Paid"
                          className="p-1.5 text-[#707080] hover:text-emerald-400 rounded transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {canWrite && (
                        <button
                          onClick={() => handleDelete(inv)}
                          title="Delete Invoice"
                          className="p-1.5 text-[#707080] hover:text-rose-400 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

    </div>
  );
};