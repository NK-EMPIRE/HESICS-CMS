import React, { useState } from 'react';
import { X, Plus, Trash2, Send, Download, FileText, Sparkles, Eye } from 'lucide-react';
import { db } from '../../lib/firebaseDb';
import { Quotation, QuotationStatus, LineItem, User as UserType, HesicsService } from '../../lib/types';
import { DatePicker } from '../common/DatePicker';
import { CustomSelect, Option } from '../common/CustomSelect';
import { generateQuotationPDF, AVAILABLE_TEMPLATES, TemplateType } from '../../lib/pdfEngine';
import { EmailDispatchModal } from '../common/EmailDispatchModal';
import { PDFPreviewModal } from '../common/PDFPreviewModal';
import { showToast } from '../common/Toast';

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  quotation?: Quotation;
  activeUser: UserType;
}

const STATUS_OPTIONS: Option[] = [
  { value: 'draft', label: 'Draft Scope', badge: 'Draft', badgeColor: 'text-[#808090] bg-[#14141A] border-[#202028]' },
  { value: 'sent', label: 'Sent to Client', badge: 'Sent', badgeColor: 'text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30' },
  { value: 'accepted', label: 'Accepted by Client', badge: 'Accepted', badgeColor: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50' },
  { value: 'rejected', label: 'Rejected / Superseded', badge: 'Declined', badgeColor: 'text-rose-400 bg-rose-950/40 border-rose-800/50' },
];

export const QuotationModal: React.FC<QuotationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  quotation,
  activeUser,
}) => {
  const org = db.getOrg();
  const clients = db.getClients();
  const deals = db.getDeals();
  const services = db.getServices();

  const isTaxEnabled = org.is_tax_enabled !== false;

  const [clientId, setClientId] = useState(quotation?.client_id || clients[0]?.id || '');
  const [dealId, setDealId] = useState(quotation?.deal_id || '');
  const [quoteNumber, setQuoteNumber] = useState(
    quotation?.quotation_number || quotation?.quote_number || `QT-${Date.now().toString().slice(-4)}`
  );
  const [issueDate, setIssueDate] = useState(
    quotation?.issue_date || new Date().toISOString().split('T')[0]
  );
  const [validUntil, setValidUntil] = useState(
    quotation?.expiry_date || quotation?.valid_until || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<QuotationStatus>(quotation?.status || 'sent');
  const [templateId, setTemplateId] = useState<TemplateType>(
    (quotation?.template_id as TemplateType) || (org.default_quotation_template as TemplateType) || 'titanium'
  );

  const [items, setItems] = useState<LineItem[]>(
    quotation?.line_items || quotation?.items || [
      { id: '1', description: 'Enterprise Business OS Architecture & Cloud Infra', quantity: 1, unit_price: 500000, tax_rate: isTaxEnabled ? 18 : 0, amount: 500000 },
    ]
  );

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);

  if (!isOpen) return null;

  const clientOptions: Option[] = clients.map((c) => ({
    value: c.id,
    label: c.name,
    sublabel: c.company_name || c.email,
  }));

  const templateOptions: Option[] = AVAILABLE_TEMPLATES.map((t) => ({
    value: t.id,
    label: t.name,
    sublabel: t.description,
    badge: t.badge,
    badgeColor: 'text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30',
  }));

  const handleAddFromService = (serviceName: string) => {
    const srv = services.find((s) => s.name === serviceName);
    if (!srv) return;

    setItems([
      ...items,
      {
        id: String(Date.now()),
        description: srv.name,
        quantity: 1,
        unit_price: srv.default_rate,
        tax_rate: isTaxEnabled ? 18 : 0,
        amount: srv.default_rate,
      },
    ]);
    showToast('Service Mapped', `Added "${srv.name}" (₹${srv.default_rate.toLocaleString('en-IN')}) to quotation.`);
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: String(Date.now()), description: '', quantity: 1, unit_price: 0, tax_rate: isTaxEnabled ? 18 : 0, amount: 0 },
    ]);
  };

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price' || field === 'rate') {
      const q = Number(next[index].quantity) || 0;
      const r = Number(next[index].unit_price ?? next[index].rate) || 0;
      next[index].amount = q * r;
    }
    setItems(next);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const tax = isTaxEnabled
    ? Math.round(items.reduce((sum, item) => sum + (Number(item.amount) * ((item.tax_rate ?? 18) / 100)), 0))
    : 0;
  const total = subtotal + tax;

  const selectedClient = clients.find((c) => c.id === clientId);

  const buildQuotationPayload = (): Quotation => ({
    id: quotation?.id || 'temp',
    org_id: org.id,
    client_id: clientId,
    client_name: selectedClient?.name || 'Client',
    client_email: selectedClient?.email,
    quotation_number: quoteNumber,
    template_id: templateId,
    issue_date: issueDate,
    valid_until: validUntil,
    status,
    items,
    line_items: items,
    subtotal,
    tax,
    total,
    created_at: new Date().toISOString(),
  });

  const handleExportPDF = async () => {
    const doc = await generateQuotationPDF(buildQuotationPayload(), org, templateId);
    const blob = doc.output('blob'); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `HESICS_Quotation_${quoteNumber}.pdf`;
    document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || items.length === 0) return;

    const payload = {
      client_id: clientId,
      client_name: selectedClient?.name || 'Client',
      client_email: selectedClient?.email,
      deal_id: dealId || undefined,
      quotation_number: quoteNumber,
      quote_number: quoteNumber,
      template_id: templateId,
      issue_date: issueDate,
      expiry_date: validUntil,
      valid_until: validUntil,
      status,
      items,
      line_items: items,
      subtotal,
      tax,
      total,
    };

    if (quotation) {
      db.updateQuotation(quotation.id, payload);
      showToast('Quotation Updated', `Commercial Quotation #${quoteNumber} updated.`);
    } else {
      db.addQuotation(payload);
      showToast('Quotation Issued', `Commercial Quotation #${quoteNumber} created.`);
    }

    onSuccess();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-modal flex items-center justify-center p-4">
        <div className="bg-[#0D0D11] border border-[#22222B] rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-8 pb-16 space-y-6 pb-28 shadow-2xl shadow-black/80">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#1C1C26] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
                <FileText className="w-4 h-4 text-[#77727E]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#F4F4F6] tracking-tight font-display">
                  {quotation ? 'Edit Commercial Quotation' : 'Create & Issue Quotation'}
                </h2>
                <p className="text-xs text-[#808090]">
                  Configure scope line items, choose executive template, and preview live vector PDF.
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-[#606070] hover:text-white p-1.5 rounded-lg hover:bg-[#16161D]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Top Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              <div>
                <label className="hesics-label">Client Account *</label>
                <CustomSelect
                  value={clientId}
                  onChange={setClientId}
                  options={clientOptions}
                  placeholder="Select client..."
                  searchable
                />
              </div>

              <div>
                <label className="hesics-label">Quotation #</label>
                <input
                  type="text"
                  required
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  className="hesics-input text-xs font-mono"
                />
              </div>

              <div>
                <label className="hesics-label">Issue Date</label>
                <DatePicker
                  value={issueDate}
                  onChange={setIssueDate}
                />
              </div>

              <div>
                <label className="hesics-label">Valid Until</label>
                <DatePicker
                  value={validUntil}
                  onChange={setValidUntil}
                />
              </div>
            </div>

            {/* Template and Status selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="hesics-label">Layout Template Design</label>
                <CustomSelect
                  value={templateId}
                  onChange={(v) => setTemplateId(v as TemplateType)}
                  options={templateOptions}
                />
              </div>

              <div>
                <label className="hesics-label">Quotation Status</label>
                <CustomSelect
                  value={status}
                  onChange={(v) => setStatus(v as QuotationStatus)}
                  options={STATUS_OPTIONS}
                />
              </div>
            </div>

            {/* Quick Add from HESICS Services Catalog */}
            <div className="p-3.5 bg-[#09090D] border border-[#1E1E28] rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#D4D4D8] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#77727E]" /> Quick-Map from HESICS Services
                </span>
                <span className="text-[10px] text-[#606070]">Click to auto-populate deliverable and rate</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {services.map((srv) => (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => handleAddFromService(srv.name)}
                    className="text-[11px] px-2.5 py-1 bg-[#121217] hover:bg-[#1A1A22] border border-[#20202A] hover:border-[#77727E]/40 text-[#D4D4D8] hover:text-white rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#77727E]" />
                    <span>{srv.name}</span>
                    <span className="font-mono text-[10px] text-[#808090]">₹{srv.default_rate.toLocaleString('en-IN')}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Scope / Line Items */}
            <div className="space-y-3 pt-2 border-t border-[#1C1C26]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#F4F4F6]">Line Items & Scope Deliverables</h3>
                  <p className="text-[11px] text-[#707080]">Itemize deliverables, engineering hours, or milestone values.</p>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs text-[#D4D4D8] hover:text-white flex items-center gap-1.5 px-3 py-1.5 bg-[#14141C] border border-[#22222D] rounded-xl hover:border-[#77727E]/40 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#77727E]" /> Add Line Item
                </button>
              </div>

              <div className="space-y-2.5">
                {items.map((item, idx) => (
                  <div key={item.id || idx} className="grid grid-cols-12 gap-3 items-center bg-[#08080A] p-3 rounded-2xl border border-[#1C1C24]">
                    <div className="col-span-12 sm:col-span-6">
                      <input
                        type="text"
                        placeholder="Deliverable or scope description..."
                        value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        className="hesics-input text-xs py-2"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                        className="hesics-input text-xs py-2 font-mono text-center"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <input
                        type="number"
                        placeholder="Unit Rate (₹)"
                        value={item.unit_price ?? item.rate}
                        onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value))}
                        className="hesics-input text-xs py-2 font-mono font-semibold"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-[#606070] hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Commercial Summary Box */}
            <div className="p-5 bg-[#08080B] border border-[#1C1C26] rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between text-[#808090]">
                <span>Scope Subtotal:</span>
                <span className="font-mono text-[#F4F4F6] font-medium">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {isTaxEnabled ? (
                <div className="flex justify-between text-[#808090]">
                  <span>GST Applicable (18%):</span>
                  <span className="font-mono text-[#F4F4F6]">₹{tax.toLocaleString('en-IN')}</span>
                </div>
              ) : (
                <div className="flex justify-between text-[11px] text-[#606070]">
                  <span>GSTIN Tax Calculations:</span>
                  <span className="font-mono text-[#606070]">Disabled in Settings (Gross Only)</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-[#F4F4F6] pt-2 border-t border-[#181822]">
                <span>Total Quotation Estimate:</span>
                <span className="font-mono text-[#F4F4F6] text-base">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1A1A22]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLivePreview(true)}
                  className="hesics-btn-secondary text-xs"
                >
                  <Eye className="w-3.5 h-3.5 text-[#77727E]" /> Preview PDF...
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="hesics-btn-secondary text-xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#77727E]" /> Download PDF
                </button>
                {selectedClient?.email && (
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(true)}
                    className="hesics-btn-secondary text-xs"
                  >
                    <Send className="w-3.5 h-3.5 text-[#77727E]" /> Dispatch Email...
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button type="button" onClick={onClose} className="hesics-btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="hesics-btn-primary px-6">
                  {quotation ? 'Save Quotation' : 'Issue Quotation'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Live PDF Preview Modal */}
      {showLivePreview && (
        <PDFPreviewModal
          isOpen={showLivePreview}
          onClose={() => setShowLivePreview(false)}
          title={`Commercial Quotation #${quoteNumber}`}
          pdfDocument={generateQuotationPDF(buildQuotationPayload(), org, templateId)}
          fileName={`HESICS_Quotation_${quoteNumber}.pdf`}
          emailDefaults={
            selectedClient?.email
              ? {
                  to: selectedClient.email,
                  recipientName: selectedClient.name || 'Client',
                  documentType: 'Quotation',
                  documentNumber: quoteNumber,
                  defaultSubject: `Commercial Quotation #${quoteNumber} from HESICS`,
                  defaultMessage: `We are pleased to present formal commercial quotation #${quoteNumber} for your review.\n\nTotal Estimate: ₹${total.toLocaleString('en-IN')}\nValid Until: ${validUntil}\n\nPlease let us know if you require any scope adjustments or milestone alignments.`,
                }
              : undefined
          }
        />
      )}

      {/* Direct Email Dispatch Modal */}
      {showEmailModal && (
        <EmailDispatchModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          defaultTo={selectedClient?.email || ''}
          recipientName={selectedClient?.name || 'Client'}
          documentType="Quotation"
          documentNumber={quoteNumber}
          defaultSubject={`Commercial Quotation #${quoteNumber} from HESICS`}
          defaultMessage={`We are pleased to present formal commercial quotation #${quoteNumber} for your review.\n\nTotal Estimate: ₹${total.toLocaleString('en-IN')}\nValid Until: ${validUntil}\n\nPlease let us know if you require any scope adjustments or milestone alignments.`}
        />
      )}
    </>
  );
};

