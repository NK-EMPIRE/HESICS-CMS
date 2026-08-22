import { DownloadManagerModal } from "../components/common/DownloadManagerModal";
import React, { useState } from "react";
import {
  Plus,
  FileText,
  Download,
  CheckCircle2,
  Trash2,
  Edit3,
  ArrowRight,
  DollarSign,
  FileSpreadsheet,
  Eye,
} from "lucide-react";
import { db } from "../lib/db/invoices";
import { Quotation, QuotationStatus, User } from "../lib/types";
import { QuotationModal } from "../components/invoices/QuotationModal";
import { generateQuotationPDF, TemplateType } from "../lib/pdfEngine";
import { exportQuotationsToExcel } from "../lib/excelExport";
import { hasPermission } from "../lib/rbac";
import { PDFPreviewModal } from "../components/common/PDFPreviewModal";
import { CustomSelect, Option } from "../components/common/CustomSelect";
import { showToast } from "../components/common/Toast";

interface QuotationsProps {
  activeUser: User;
}

const statusBadge: Record<QuotationStatus, string> = {
  draft: "text-[#808090] bg-[#14141A] border-[#202028]",
  sent: "text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30",
  accepted: "text-emerald-400 bg-emerald-950/40 border-emerald-800/50",
  rejected: "text-rose-400 bg-rose-950/40 border-rose-800/50",
  expired: "text-[#606070] bg-[#101014] border-[#181820]",
};

const QUOTATION_STATUS_OPTIONS: Option[] = [
  {
    value: "draft",
    label: "Draft",
    badge: "Draft",
    badgeColor: statusBadge["draft"],
  },
  {
    value: "sent",
    label: "Sent",
    badge: "Sent",
    badgeColor: statusBadge["sent"],
  },
  {
    value: "accepted",
    label: "Accepted",
    badge: "Accepted",
    badgeColor: statusBadge["accepted"],
  },
  {
    value: "rejected",
    label: "Rejected",
    badge: "Rejected",
    badgeColor: statusBadge["rejected"],
  },
  {
    value: "expired",
    label: "Expired",
    badge: "Expired",
    badgeColor: statusBadge["expired"],
  },
];

export const Quotations: React.FC<QuotationsProps> = ({ activeUser }) => {
  const [quotations, setQuotations] = useState(() => db.getQuotations());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(
    null,
  );
  const [previewingQuotation, setPreviewingQuotation] =
    useState<Quotation | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const canWrite = hasPermission(activeUser.role_id, "invoices:write");
  const org = db.getOrg();

  const refreshQuotations = () => setQuotations(db.getQuotations());
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const handleQuickStatusChange = (
    q: Quotation,
    newStatus: QuotationStatus,
  ) => {
    db.updateQuotation(q.id, { status: newStatus });
    refreshQuotations();
    showToast(
      "Status Updated",
      `Quotation #${q.quotation_number || q.quote_number} set to ${newStatus.toUpperCase()}`,
    );
  };

  const handleDelete = (q: Quotation) => {
    if (
      window.confirm(
        `Delete quotation #${q.quotation_number || q.quote_number}?`,
      )
    ) {
      db.deleteQuotation(q.id);
      showToast(
        "Quotation Deleted",
        `Quotation #${q.quotation_number || q.quote_number} removed.`,
      );
      refreshQuotations();
    }
  };

  const handleExecuteQuotationDownload = async (config: {
    format: "pdf" | "excel" | "both";
    dateMode: "all" | "month" | "custom";
    selectedMonth: number;
    selectedYear: number;
    startDate: string;
    endDate: string;
  }) => {
    let filtered = [...quotations];
    if (config.dateMode === "month") {
      filtered = filtered.filter((q) => {
        const d = new Date(q.created_at);
        return (
          d.getMonth() === config.selectedMonth &&
          d.getFullYear() === config.selectedYear
        );
      });
    } else if (config.dateMode === "custom") {
      if (config.startDate)
        filtered = filtered.filter(
          (q) => q.created_at.split("T")[0] >= config.startDate,
        );
      if (config.endDate)
        filtered = filtered.filter(
          (q) => q.created_at.split("T")[0] <= config.endDate,
        );
    }

    if (config.format === "excel" || config.format === "both") {
      exportQuotationsToExcel(filtered);
    }
    if (config.format === "pdf" || config.format === "both") {
      for (const q of filtered.slice(0, 10)) {
        const doc = await generateQuotationPDF(
          q,
          org,
          (q.template_id as TemplateType) || "titanium",
        );
        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `HESICS_Quotation_${q.quotation_number || (q as any).quote_number || "QT"}.pdf`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 400);
      }
    }
  };

  const handleDownloadPDF = async (q: Quotation) => {
    const doc = await generateQuotationPDF(
      q,
      org,
      (q.template_id as TemplateType) || "titanium",
    );
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HESICS_Quotation_${q.quotation_number || (q as any).quote_number || "QT"}.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
  };

  const handleExportExcel = () => {
    exportQuotationsToExcel(quotations);
    showToast("Excel Exported", "Downloaded quotations register spreadsheet.");
  };

  const totalQuoted = quotations.reduce(
    (sum, q) => sum + Number(q.total || 0),
    0,
  );

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1A20]">
        <div>
          <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">
            Commercial Quotations
          </h1>
          <p className="text-xs text-[#828290] mt-1">
            Total Quotation Pipeline:{" "}
            <span className="font-mono text-[#F4F4F6] font-semibold">
              {fmt(totalQuoted)}
            </span>
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
                  <td className="p-4 font-semibold text-[#F4F4F6]">
                    {q.client_name}
                  </td>
                  <td className="p-4 text-[#808090] font-mono text-[11px]">
                    {q.valid_until || q.expiry_date || "—"}
                  </td>
                  <td className="p-4">
                    {canWrite ? (
                      <div className="w-28">
                        <CustomSelect
                          value={q.status}
                          onChange={(v) =>
                            handleQuickStatusChange(q, v as QuotationStatus)
                          }
                          options={QUOTATION_STATUS_OPTIONS}
                        />
                      </div>
                    ) : (
                      <span
                        className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${statusBadge[q.status]}`}
                      >
                        {q.status}
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-bold text-[#F4F4F6] font-mono">
                    {fmt(q.total)}
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => setPreviewingQuotation(q)}
                        title="Live Vector Preview"
                        className="p-1.5 text-[#707080] hover:text-white rounded-lg hover:bg-[#16161D] transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

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

      {/* Live PDF Preview Modal */}
      {previewingQuotation && (
        <PDFPreviewModal
          isOpen={!!previewingQuotation}
          onClose={() => setPreviewingQuotation(null)}
          title={`Commercial Quotation #${previewingQuotation.quotation_number || previewingQuotation.quote_number}`}
          pdfDocument={generateQuotationPDF(
            previewingQuotation,
            org,
            (previewingQuotation.template_id as TemplateType) || "titanium",
          )}
          fileName={`HESICS_Quotation_${previewingQuotation.quotation_number || previewingQuotation.quote_number || "QT"}.pdf`}
          emailDefaults={
            previewingQuotation.client_email
              ? {
                  to: previewingQuotation.client_email,
                  recipientName: previewingQuotation.client_name || "Client",
                  documentType: "Quotation",
                  documentNumber:
                    previewingQuotation.quotation_number ||
                    previewingQuotation.quote_number ||
                    "QT",
                  defaultSubject: `Commercial Quotation #${previewingQuotation.quotation_number || previewingQuotation.quote_number} from HESICS`,
                  defaultMessage: `We are pleased to present formal commercial quotation #${previewingQuotation.quotation_number || previewingQuotation.quote_number} for your review.\n\nTotal Estimate: ₹${previewingQuotation.total.toLocaleString("en-IN")}\nValid Until: ${previewingQuotation.valid_until || previewingQuotation.expiry_date}\n\nPlease let us know if you require any scope adjustments or milestone alignments.`,
                }
              : undefined
          }
        />
      )}

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
      {/* Unified Download Manager Modal */}
      {isDownloadModalOpen && (
        <DownloadManagerModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          title="Export Quotations & Proposals"
          totalRecordsCount={quotations.length}
          onExecuteDownload={handleExecuteQuotationDownload}
        />
      )}
    </div>
  );
};
