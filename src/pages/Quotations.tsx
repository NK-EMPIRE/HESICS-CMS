import React, { useState } from 'react';
import { Plus, Download, Eye } from 'lucide-react';
import { db } from '../lib/supabase';
import { Quotation, User } from '../lib/types';
import { QuotationModal } from '../components/invoices/QuotationModal';
import { InvoicePDFDocument } from '../components/invoices/InvoicePDF';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { Modal } from '../components/ui/Modal';
import confetti from 'canvas-confetti';

interface QuotationsProps {
  activeUser: User;
}

export const Quotations: React.FC<QuotationsProps> = ({ activeUser }) => {
  const [quotations, setQuotations] = useState(db.getQuotations());
  const org = db.getOrg();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | undefined>();
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | undefined>();

  const refreshData = () => {
    setQuotations(db.getQuotations());
  };

  const handleConvertToInvoice = (quote: Quotation) => {
    db.addInvoice({
      client_id: quote.client_id,
      client_name: quote.client_name,
      client_email: quote.client_email,
      deal_id: quote.deal_id,
      quotation_id: quote.id,
      invoice_number: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
      line_items: quote.line_items,
      subtotal: quote.subtotal,
      tax: quote.tax,
      total: quote.total,
      status: 'sent',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    });

    db.updateQuotation(quote.id, { status: 'accepted' });
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    refreshData();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="space-y-1 pb-3 border-b border-[#262626]">
        <div className="text-2xl">📄</div>
        <h1 className="text-xl font-bold text-white tracking-tight">Quotations</h1>
        <p className="text-xs text-[#888888]">
          Client quotations database with 18% GST output tax calculations.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingQuotation(undefined);
            setIsModalOpen(true);
          }}
          className="notion-button bg-[#FF6B00] hover:bg-[#ea580c] text-white font-medium text-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Create Quotation
        </button>
      </div>

      {quotations.length === 0 ? (
        <div className="p-12 notion-card text-center border-dashed border-[#2d2d2d] space-y-2">
          <p className="text-xs text-[#777777]">No quotations created yet.</p>
          <button
            onClick={() => {
              setEditingQuotation(undefined);
              setIsModalOpen(true);
            }}
            className="text-xs text-white underline hover:text-[#FF6B00]"
          >
            + Build your first quote
          </button>
        </div>
      ) : (
        <div className="notion-card overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1c1c1c] border-b border-[#282828] text-[#888888] font-medium">
              <tr>
                <th className="p-3">Quote #</th>
                <th className="p-3">Client</th>
                <th className="p-3">Subtotal</th>
                <th className="p-3">GST (18%)</th>
                <th className="p-3">Total Payable</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242424] text-[#cccccc]">
              {quotations.map((q) => (
                <tr key={q.id} className="hover:bg-[#242424] transition-colors">
                  <td className="p-3 font-mono font-semibold text-white">{q.quote_number}</td>
                  <td className="p-3 font-medium text-white">{q.client_name || 'Client'}</td>
                  <td className="p-3 font-mono">₹{q.subtotal.toLocaleString('en-IN')}</td>
                  <td className="p-3 font-mono text-[#888888]">₹{q.tax.toLocaleString('en-IN')}</td>
                  <td className="p-3 font-mono font-bold text-white">₹{q.total.toLocaleString('en-IN')}</td>
                  <td className="p-3">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#282828] text-[#aaaaaa]">
                      {q.status}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <button
                      onClick={() => setPreviewQuotation(q)}
                      className="px-2 py-1 bg-[#282828] hover:bg-[#333333] text-[#cccccc] rounded text-[10px]"
                    >
                      <Eye className="w-3 h-3 inline mr-1" /> PDF Preview
                    </button>
                    {q.status !== 'accepted' && (
                      <button
                        onClick={() => handleConvertToInvoice(q)}
                        className="px-2 py-1 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60 rounded text-[10px]"
                      >
                        Convert to Invoice &rarr;
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
      <QuotationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refreshData}
        initialData={editingQuotation}
      />

      {/* PDF Preview Modal */}
      {previewQuotation && (
        <Modal
          isOpen={Boolean(previewQuotation)}
          onClose={() => setPreviewQuotation(undefined)}
          title={`Quotation PDF — #${previewQuotation.quote_number}`}
          maxWidth="2xl"
        >
          <div className="space-y-3">
            <div className="h-[420px] w-full border border-[#2e2e2e] rounded-lg overflow-hidden bg-[#111111]">
              <PDFViewer width="100%" height="100%" showToolbar={false}>
                <InvoicePDFDocument data={previewQuotation} org={org} type="quotation" />
              </PDFViewer>
            </div>
            <div className="flex justify-end pt-1">
              <PDFDownloadLink
                document={<InvoicePDFDocument data={previewQuotation} org={org} type="quotation" />}
                fileName={`Quotation-${previewQuotation.quote_number}.pdf`}
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
