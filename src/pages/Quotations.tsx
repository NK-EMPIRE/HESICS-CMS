import React, { useState } from 'react';
import {
  Plus, FileText, Download, CheckCircle2,
  Trash2, Edit3, ArrowRight, Clock, Send
} from 'lucide-react';
import { db } from '../lib/firebaseDb';
import { Quotation, QuotationStatus, User } from '../lib/types';
import { QuotationModal } from '../components/invoices/QuotationModal';
import { generateInvoicePDF } from '../components/invoices/InvoicePDF';
import { hasPermission } from '../lib/rbac';

interface QuotationsProps {
  activeUser: User;
}

const statusBadge: Record<QuotationStatus, string> = {
  draft: 'text-[#808090] bg-[#14141A] border-[#202028]',
  sent: 'text-[#1E9EFF] bg-[#1E9EFF]/10 border-[#1E9EFF]/30',
  accepted: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40',
  rejected: 'text-rose-400 bg-rose-950/30 border-rose-900/40',
  expired: 'text-[#606070] bg-[#101014] border-[#181820]',
};

export const Quotations: React.FC<QuotationsProps> = ({ activeUser }) => {
  const [quotations, setQuotations] = useState(() => db.getQuotations());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);

  const canWrite = hasPermission(activeUser.role_id, 'invoices:write');

  const refreshQuotes = () => setQuotations(db.getQuotations());

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  const handleConvertToInvoice = (quote: Quotation) => {
    const inv = db.addInvoice({
      client_id: quote.client_id,
      client_name: quote.client_name,
      client_email: quote.client_email,
      quotation_id: quote.id,
      invoice_number: `INV-${Date.now().toString().slice(-4)}`,
      due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: 'sent',
      items: quote.items || quote.line_items || [],
      line_items: quote.line_items || quote.items || [],
      subtotal: quote.subtotal,
      tax: quote.tax,
      total: quote.total,
    });

    db.updateQuotation(quote.id, { status: 'accepted' });
    refreshQuotes();
    alert(`Quotation #${quote.quotation_number || quote.quote_number} converted into Invoice #${inv.invoice_number}!`);
  };

  const handleDelete = (quote: Quotation) => {
    if (window.confirm(`Delete quotation #${quote.quotation_number || quote.quote_number}?`)) {
      db.deleteQuotation(quote.id);
      refreshQuotes();
    }
  };

  const handleDownloadPDF = (quote: Quotation) => {
    const org = db.getOrg();
    generateInvoicePDF(quote, org, 'quotation');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1A20]">
        <div>
          <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">Quotations & Estimates</h1>
          <p className="text-xs text-[#828290] mt-1">
            Formal price estimates, scopes of work, and invoice conversions.
          </p>
        </div>

        {canWrite && (
          <button
            onClick={() => {
              setEditingQuote(null);
              setIsModalOpen(true);
            }}
            className="hesics-btn-primary self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Create Quotation
          </button>
        )}
      </div>

      {/* Quotations Table */}
      <div className="hesics-card overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#09090C] text-[#606070] border-b border-[#181820] uppercase text-[10px] font-semibold tracking-wider">
            <tr>
              <th className="p-3.5">Quotation #</th>
              <th className="p-3.5">Client</th>
              <th className="p-3.5">Issue Date</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Total Amount</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#15151C]">
            {quotations.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#555565]">
                  No quotations issued yet.
                </td>
              </tr>
            ) : (
              quotations.map((q) => (
                <tr key={q.id} className="hover:bg-[#111116] transition-colors">
                  <td className="p-3.5 font-mono text-[#F4F4F6] font-semibold">
                    {q.quotation_number || q.quote_number || q.id}
                  </td>
                  <td className="p-3.5 font-semibold text-[#F4F4F6]">{q.client_name}</td>
                  <td className="p-3.5 text-[#808090] font-mono text-[11px]">
                    {q.issue_date || q.created_at.split('T')[0]}
                  </td>
                  <td className="p-3.5">
                    <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${statusBadge[q.status]}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-[#F4F4F6] font-mono">{fmt(q.total)}</td>
                  <td className="p-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => handleDownloadPDF(q)}
                        title="Download PDF"
                        className="p-1.5 text-[#707080] hover:text-[#1E9EFF] rounded transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {canWrite && q.status !== 'accepted' && (
                        <button
                          onClick={() => handleConvertToInvoice(q)}
                          title="Convert to Invoice"
                          className="p-1.5 text-[#707080] hover:text-emerald-400 rounded transition-colors"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {canWrite && (
                        <button
                          onClick={() => handleDelete(q)}
                          title="Delete Quotation"
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
        <QuotationModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingQuote(null);
          }}
          onSuccess={refreshQuotes}
          quotation={editingQuote || undefined}
          activeUser={activeUser}
        />
      )}

    </div>
  );
};