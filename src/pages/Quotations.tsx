import React, { useState } from 'react';
import {
  Plus, FileText, Download, CheckCircle2,
  Trash2, Edit3, ArrowRight, DollarSign, FileSpreadsheet
} from 'lucide-react';
import { db } from '../lib/firebaseDb';
import { Quotation, QuotationStatus, User } from '../lib/types';
import { QuotationModal } from '../components/invoices/QuotationModal';
import { generateQuotationPDF } from '../lib/pdfEngine';
import { exportQuotationsToExcel } from '../lib/excelExport';
import { hasPermission } from '../lib/rbac';

interface QuotationsProps {
  activeUser: User;
}

const statusBadge: Record<QuotationStatus, string> = {
  draft: 'text-[#808090] bg-[#14141A] border-[#202028]',
  sent: 'text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30',
  accepted: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
  rejected: 'text-rose-400 bg-rose-950/40 border-rose-800/50',
  expired: 'text-[#606070] bg-[#101014] border-[#181820]',
};

export const Quotations: React.FC<QuotationsProps> = ({ activeUser }) => {
  const [quotations, setQuotations] = useState(() => db.getQuotations());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);

  const canWrite = hasPermission(activeUser.role_id, 'invoices:write');

  const refreshQuotations = () => setQuotations(db.getQuotations());

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  const handleDelete = (q: Quotation) => {
    if (window.confirm(`Delete quotation #${q.quotation_number || q.quote_number}?`)) {
      db.deleteQuotation(q.id);
      refreshQuotations();
    }
  };

  const handleDownloadPDF = (q: Quotation) => {
    const org = db.getOrg();
    const doc = generateQuotationPDF(q, org, (q.template_id as any) || 'titanium');
    doc.save(`HESICS_Quotation_${q.quotation_number || q.quote_number || 'QT'}.pdf`);
  };

  const handleExportExcel = () => {
    exportQuotationsToExcel(quotations);
  };

  const totalQuoted = quotations.reduce((sum, q) => sum + Number(q.total || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1A20]">
        <div>
          <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">Commercial Quotations</h1>
          <p className="text-xs text-[#828290] mt-1">
            Total Quotation Pipeline: <span className="font-mono text-[#F4F4F6] font-semibold">{fmt(totalQuoted)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="hesics-btn-secondary"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#77727E]" /> Export Excel
          </button>
          {canWrite && (
            <button
              onClick={() => {
                setEditingQuotation(null);
                setIsModalOpen(true);
              }}
              className="hesics-btn-primary"
            >
              <Plus className="w-3.5 h-3.5" /> Create Quotation
            </button>
          )}
        </div>
      </div>

      {/* Quotations Table */}
      <div className="hesics-card overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#09090C] text-[#707080] border-b border-[#181820] uppercase text-[10px] font-semibold tracking-wider">
            <tr>
              <th className="p-4">Quotation #</th>
              <th className="p-4">Client Account</th>
              <th className="p-4">Valid Until</th>
              <th className="p-4">Status</th>
              <th className="p-4">Total Estimate</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#15151C]">
            {quotations.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#555565]">
                  No formal quotations generated yet.
                </td>
              </tr>
            ) : (
              quotations.map((q) => (
                <tr key={q.id} className="hover:bg-[#111116] transition-colors">
                  <td className="p-4 font-mono text-[#F4F4F6] font-semibold">
                    {q.quotation_number || q.quote_number}
                  </td>
                  <td className="p-4 font-semibold text-[#F4F4F6]">{q.client_name}</td>
                  <td className="p-4 text-[#808090] font-mono text-[11px]">
                    {q.valid_until || q.expiry_date || '—'}
                  </td>
                  <td className="p-4">
                    <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${statusBadge[q.status]}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-[#F4F4F6] font-mono">{fmt(q.total)}</td>
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadPDF(q)}
                        title="Download Vector PDF"
                        className="p-1.5 text-[#707080] hover:text-white rounded-lg hover:bg-[#16161D] transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {canWrite && (
                        <button
                          onClick={() => {
                            setEditingQuotation(q);
                            setIsModalOpen(true);
                          }}
                          title="Edit Quotation"
                          className="p-1.5 text-[#707080] hover:text-white rounded-lg hover:bg-[#16161D] transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}

                      {canWrite && (
                        <button
                          onClick={() => handleDelete(q)}
                          title="Delete Quotation"
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

      {/* Modal */}
      {isModalOpen && (
        <QuotationModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingQuotation(null);
          }}
          onSuccess={refreshQuotations}
          quotation={editingQuotation || undefined}
          activeUser={activeUser}
        />
      )}
    </div>
  );
};
