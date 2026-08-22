import React, { useState } from "react";
import {
  Building,
  Database,
  RefreshCw,
  CheckCircle2,
  Save,
  Shield,
  History,
  Trash2,
  Cloud,
  UploadCloud,
  Server,
  Image as ImageIcon,
  FileText,
  Upload,
  Eye,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import { db } from "../lib/firebaseDb";
import { isFirebaseConfigured, firebaseConfig } from "../lib/firebase";
import { EntityType, User, CustomTemplate, Invoice } from "../lib/types";
import { getAuditLog, formatAuditAction, clearAuditLog } from "../lib/auditLog";
import { HesicsLogo } from "../components/common/HesicsLogo";
import { isAdminOrAbove, isMasterRoot } from "../lib/rbac";
import { CustomSelect, Option } from "../components/common/CustomSelect";
import {
  AVAILABLE_TEMPLATES,
  TemplateType,
  generateInvoicePDF,
} from "../lib/pdfEngine";
import { PDFPreviewModal } from "../components/common/PDFPreviewModal";
import { showToast } from "../components/common/Toast";

interface SettingsProps {
  activeUser: User;
}

const ENTITY_OPTIONS: Option[] = [
  {
    value: "proprietorship",
    label: "Proprietorship",
    badge: "Sole",
    badgeColor: "text-[#808090] bg-[#14141A] border-[#202028]",
  },
  {
    value: "partnership",
    label: "Partnership Firm",
    badge: "Partnership",
    badgeColor: "text-indigo-300 bg-indigo-950/40 border-indigo-800/50",
  },
  {
    value: "llp",
    label: "LLP (Limited Liability Partnership)",
    badge: "LLP",
    badgeColor: "text-amber-300 bg-amber-950/40 border-amber-800/50",
  },
  {
    value: "pvt_ltd",
    label: "Private Limited Company (Pvt Ltd)",
    badge: "Pvt Ltd",
    badgeColor: "text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30",
  },
];

export const Settings: React.FC<SettingsProps> = ({ activeUser }) => {
  const [org, setOrg] = useState(() => db.getOrg());
  const [isSaved, setIsSaved] = useState(false);
  const [auditLogs, setAuditLogs] = useState(() => getAuditLog());

  const [previewTemplate, setPreviewTemplate] = useState<TemplateType | null>(
    null,
  );
  const [uploadedTemplates, setUploadedTemplates] = useState<CustomTemplate[]>(
    () => org.custom_templates || [],
  );
  const [previewUploadedPdf, setPreviewUploadedPdf] =
    useState<CustomTemplate | null>(null);

  const canEdit = isAdminOrAbove(activeUser.hierarchy);
  const isMaster = isMasterRoot(activeUser.email);
  const isTaxEnabled = org.is_tax_enabled !== false;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = db.updateOrg({
      ...org,
      custom_templates: uploadedTemplates,
    });
    setOrg(updated);
    setIsSaved(true);
    showToast(
      "Settings Saved",
      "Organization profile & tax settings updated in persistent storage.",
    );
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleToggleTax = () => {
    const updated = db.updateOrg({ ...org, is_tax_enabled: !isTaxEnabled });
    setOrg(updated);
    showToast(
      "Tax Policy Updated",
      `GST & Tax calculation is now ${!isTaxEnabled ? "ENABLED" : "DISABLED"}.`,
    );
  };

  const handleUploadTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const newTemplate: CustomTemplate = {
        id: `tpl-${Date.now()}`,
        name: file.name.replace(".pdf", ""),
        type: "invoice",
        file_name: file.name,
        data_url: reader.result as string,
        created_at: new Date().toISOString(),
      };
      const updatedList = [...uploadedTemplates, newTemplate];
      setUploadedTemplates(updatedList);
      const updatedOrg = db.updateOrg({
        ...org,
        custom_templates: updatedList,
      });
      setOrg(updatedOrg);
      showToast(
        "Template Uploaded",
        `Custom PDF template "${file.name}" saved.`,
      );
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteUploadedTemplate = (id: string) => {
    const updatedList = uploadedTemplates.filter((t) => t.id !== id);
    setUploadedTemplates(updatedList);
    const updatedOrg = db.updateOrg({ ...org, custom_templates: updatedList });
    setOrg(updatedOrg);
    showToast("Template Removed", "Custom PDF template deleted.");
  };

  const templateOptions: Option[] = AVAILABLE_TEMPLATES.map((t) => ({
    value: t.id,
    label: t.name,
    sublabel: t.description,
    badge: t.badge,
    badgeColor: "text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30",
  }));

  // Build sample invoice for live PDF template preview
  const sampleInvoice: Invoice = {
    id: "sample-inv",
    org_id: org.id,
    client_id: "client-sample",
    client_name: "Apex Global Enterprise Ltd",
    client_email: "director@apexglobal.com",
    invoice_number: "INV-SAMPLE-2026",
    template_id: previewTemplate || "titanium",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    status: "sent",
    items: [
      {
        id: "1",
        description: "Enterprise Business OS Architecture & Cloud Infra",
        quantity: 1,
        unit_price: 500000,
        tax_rate: isTaxEnabled ? 18 : 0,
        amount: 500000,
      },
      {
        id: "2",
        description: "AI & Workflow Automation Engineering",
        quantity: 1,
        unit_price: 350000,
        tax_rate: isTaxEnabled ? 18 : 0,
        amount: 350000,
      },
    ],
    line_items: [
      {
        id: "1",
        description: "Enterprise Business OS Architecture & Cloud Infra",
        quantity: 1,
        unit_price: 500000,
        tax_rate: isTaxEnabled ? 18 : 0,
        amount: 500000,
      },
      {
        id: "2",
        description: "AI & Workflow Automation Engineering",
        quantity: 1,
        unit_price: 350000,
        tax_rate: isTaxEnabled ? 18 : 0,
        amount: 350000,
      },
    ],
    subtotal: 850000,
    tax: isTaxEnabled ? 153000 : 0,
    total: isTaxEnabled ? 1003000 : 850000,
    created_at: new Date().toISOString(),
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-[#1A1A22]">
        <div>
          <h1 className="text-2xl font-bold text-[#F4F4F6] tracking-tight font-display">
            System & Settings
          </h1>
          <p className="text-xs text-[#828290] mt-1">
            Enterprise infrastructure, tax policy, document templates, and
            operational security logs.
          </p>
        </div>
      </div>

      {/* 1. Organization Details & Tax Configuration Form */}
      <form onSubmit={handleSave} className="hesics-card p-7 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#1C1C26]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
              <Building className="w-4 h-4 text-[#77727E]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F4F4F6]">
                Organization Profile & Tax Policy
              </h2>
              <p className="text-xs text-[#707080]">
                Configure company credentials, legal structure, and taxation
                rules.
              </p>
            </div>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={handleToggleTax}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                isTaxEnabled
                  ? "bg-[#77727E]/20 border-[#77727E]/50 text-white"
                  : "bg-[#121217] border-[#22222B] text-[#707080]"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${isTaxEnabled ? "bg-emerald-400" : "bg-zinc-600"}`}
              />
              <span>
                {isTaxEnabled
                  ? "GST & Tax Calculations: ENABLED"
                  : "Tax Calculations: DISABLED (Gross Only)"}
              </span>
            </button>
          )}
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="hesics-label">Enterprise Entity Name *</label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={org.name}
                onChange={(e) => setOrg({ ...org, name: e.target.value })}
                className="hesics-input disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="hesics-label">Brand Tagline</label>
              <input
                type="text"
                disabled={!canEdit}
                value={org.tagline || ""}
                onChange={(e) => setOrg({ ...org, tagline: e.target.value })}
                placeholder="Make It Simple."
                className="hesics-input disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="hesics-label">Primary Operational Email</label>
              <input
                type="email"
                disabled={!canEdit}
                value={org.email || ""}
                onChange={(e) => setOrg({ ...org, email: e.target.value })}
                placeholder="operations@hesics.com"
                className="hesics-input disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="hesics-label">Headquarters Address</label>
              <input
                type="text"
                disabled={!canEdit}
                value={org.address || ""}
                onChange={(e) => setOrg({ ...org, address: e.target.value })}
                placeholder="Chennai, Tamil Nadu, India"
                className="hesics-input disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="hesics-label mb-0">GSTIN / Tax ID</label>
                <span
                  className={`text-[10px] font-mono ${isTaxEnabled ? "text-emerald-400" : "text-[#606070]"}`}
                >
                  {isTaxEnabled
                    ? "Active for Invoices"
                    : "Ignored (Tax Disabled)"}
                </span>
              </div>
              <input
                type="text"
                disabled={!canEdit || !isTaxEnabled}
                value={org.gstin || ""}
                onChange={(e) => setOrg({ ...org, gstin: e.target.value })}
                placeholder="33AAAAA0000A1Z5"
                className="hesics-input font-mono uppercase disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="hesics-label">Legal Entity Type</label>
              <CustomSelect
                disabled={!canEdit}
                value={org.entity_type || "pvt_ltd"}
                onChange={(v) =>
                  setOrg({ ...org, entity_type: v as EntityType })
                }
                options={ENTITY_OPTIONS}
              />
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className="hesics-btn-primary px-6">
              <Save className="w-4 h-4" /> Save Profile & Tax Rules
            </button>
            {isSaved && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Changes Applied
              </span>
            )}
          </div>
        )}
      </form>

      {/* 2. Commercial Invoice & Quotation Templates Hub */}
      <div className="hesics-card p-7 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#1C1C26]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#77727E]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F4F4F6]">
                Invoice & Quotation Templates
              </h2>
              <p className="text-xs text-[#707080]">
                Manage default layouts, preview live PDF themes, or upload
                custom branding templates.
              </p>
            </div>
          </div>

          {canEdit && (
            <label className="hesics-btn-secondary text-xs cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-[#77727E]" /> Upload Custom
              PDF Template
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleUploadTemplate}
              />
            </label>
          )}
        </div>

        {/* Default Selection Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="hesics-label">Default Invoice Template</label>
            <CustomSelect
              value={org.default_invoice_template || "titanium"}
              onChange={(v) => {
                const updated = db.updateOrg({
                  ...org,
                  default_invoice_template: v,
                });
                setOrg(updated);
                showToast(
                  "Default Updated",
                  `Default invoice template set to "${AVAILABLE_TEMPLATES.find((t) => t.id === v)?.name}".`,
                );
              }}
              options={templateOptions}
            />
          </div>

          <div>
            <label className="hesics-label">Default Quotation Template</label>
            <CustomSelect
              value={org.default_quotation_template || "titanium"}
              onChange={(v) => {
                const updated = db.updateOrg({
                  ...org,
                  default_quotation_template: v,
                });
                setOrg(updated);
                showToast(
                  "Default Updated",
                  `Default quotation template set to "${AVAILABLE_TEMPLATES.find((t) => t.id === v)?.name}".`,
                );
              }}
              options={templateOptions}
            />
          </div>
        </div>

        {/* Built-in Luxury Templates Showcase with Live Vector PDF Preview */}
        <div className="space-y-3 pt-3">
          <label className="hesics-label">
            Available System Templates ({AVAILABLE_TEMPLATES.length})
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVAILABLE_TEMPLATES.map((tmpl) => {
              const isDefaultInv =
                (org.default_invoice_template || "titanium") === tmpl.id;
              const isDefaultQuote =
                (org.default_quotation_template || "titanium") === tmpl.id;

              return (
                <div
                  key={tmpl.id}
                  className="p-4 bg-[#08080A] border border-[#1C1C26] hover:border-[#77727E]/50 rounded-2xl space-y-3 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#F4F4F6] group-hover:text-white transition-colors">
                        {tmpl.name}
                      </span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-[#77727E]/15 border border-[#77727E]/30 text-[#D4D4D8]">
                        {tmpl.badge}
                      </span>
                    </div>

                    {(isDefaultInv || isDefaultQuote) && (
                      <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Active Default
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#707080] leading-relaxed">
                    {tmpl.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#16161E] text-xs">
                    <span className="text-[10px] text-[#505060] font-mono">
                      Vector PDF Engine
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate(tmpl.id)}
                      className="text-[#D4D4D8] hover:text-white flex items-center gap-1.5 font-semibold hover:underline cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#77727E]" /> Live Vector
                      Preview →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Uploaded Custom PDF Templates List */}
        {uploadedTemplates.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-[#1A1A22]">
            <label className="hesics-label">
              Custom Uploaded PDF Templates ({uploadedTemplates.length})
            </label>
            <div className="space-y-2">
              {uploadedTemplates.map((t) => (
                <div
                  key={t.id}
                  className="p-3 bg-[#08080B] border border-[#1C1C24] rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-[#77727E]" />
                    <span className="font-semibold text-[#F4F4F6]">
                      {t.file_name}
                    </span>
                    <span className="text-[10px] text-[#606070] font-mono">
                      ({new Date(t.created_at).toLocaleDateString()})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.data_url && (
                      <button
                        type="button"
                        onClick={() => setPreviewUploadedPdf(t)}
                        className="text-xs text-[#D4D4D8] hover:text-white flex items-center gap-1 font-medium"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#77727E]" /> View PDF
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteUploadedTemplate(t.id)}
                      className="text-[#606070] hover:text-rose-400 p-1 rounded hover:bg-rose-950/20"
                      title="Remove Template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Security & Audit Log (Chief & Admins) */}
      {canEdit && (
        <div className="hesics-card p-7 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-[#1C1C26]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
                <History className="w-4 h-4 text-[#77727E]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#F4F4F6]">
                  Security & Audit Trail
                </h2>
                <p className="text-xs text-[#707080]">
                  Real-time immutable log of all commercial and administrative
                  operations.
                </p>
              </div>
            </div>
            {isMaster && auditLogs.length > 0 && (
              <button
                onClick={() => {
                  clearAuditLog();
                  setAuditLogs([]);
                  showToast("Logs Cleared", "Audit trail history cleared.");
                }}
                className="text-xs text-[#707080] hover:text-rose-400 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Audit Logs
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-5 text-center text-xs text-[#505060]">
                No system events logged yet.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-[#08080B] border border-[#16161E] rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-medium text-[#F4F4F6]">
                      {formatAuditAction(log.action)}
                    </div>
                    <div className="text-[10px] text-[#707080]">
                      {log.entity_label || log.entity_id}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-[#505060]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Live Vector PDF Template Preview Modal */}
      {previewTemplate && (
        <PDFPreviewModal
          isOpen={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          title={`Template Preview: ${AVAILABLE_TEMPLATES.find((t) => t.id === previewTemplate)?.name}`}
          pdfDocument={generateInvoicePDF(sampleInvoice, org, previewTemplate)}
          fileName={`HESICS_Template_${previewTemplate}.pdf`}
        />
      )}

      {/* Uploaded PDF Preview Modal */}
      {previewUploadedPdf && (
        <PDFPreviewModal
          isOpen={!!previewUploadedPdf}
          onClose={() => setPreviewUploadedPdf(null)}
          title={`Custom Uploaded Template: ${previewUploadedPdf.file_name}`}
          pdfDataUrl={previewUploadedPdf.data_url}
          fileName={previewUploadedPdf.file_name}
        />
      )}
    </div>
  );
};
