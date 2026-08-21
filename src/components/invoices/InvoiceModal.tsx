import React, { useState } from 'react';
import { X, Plus, Trash2, Send, Download, FileText, Sparkles } from 'lucide-react';
import { db } from '../../lib/firebaseDb';
import { Invoice, InvoiceStatus, LineItem, User as UserType } from '../../lib/types';
import { DatePicker } from '../common/DatePicker';
import { CustomSelect, Option } from '../common/CustomSelect';
import { generateInvoicePDF, AVAILABLE_TEMPLATES, TemplateType } from '../../lib/pdfEngine';
import { EmailDispatchModal } from '../common/EmailDispatchModal';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice?: Invoice;
  activeUser: UserType;
}

const STATUS_OPTIONS: Option[] = [
  { value: 'draft', label: 'Draft Invoice', badge: 'Draft', badgeColor: 'text-[#808090] bg-[#14141A] border-[#202028]' },
  { value: 'sent', label: 'Sent / Pending Payment', badge: 'Pending', badgeColor: 'text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30' },
  { value: 'paid', label: 'Paid & Reconciled', badge: 'Paid', badgeColor: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50' },
  { value: 'overdue', label: 'Overdue Payment', badge: 'Overdue', badgeColor: 'text-rose-400 bg-rose-950/40 border-rose-800/50' },
  { value: 'cancelled', label: 'Cancelled / Void', badge: 'Void', badgeColor: 'text-[#606070] bg-[#14141A] border-[#202028]' },
];

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  invoice,
  activeUser,
}) => {
  const org = db.getOrg();
  const clients = db.getClients();

  const isTaxEnabled = org.is_tax_enabled !== false;

  const [clientId, setClientId] = useState(invoice?.client_id || clients[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState(
    invoice?.invoice_number || `INV-${Date.now().toString().slice(-4)}`
  );
  const [issueDate, setIssueDate] = useState(
    invoice?.issue_date || new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState(
    invoice?.due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status || 'sent');
  const [templateId, setTemplateId] = useState<TemplateType>(
    (invoice?.template_id as TemplateType) || (org.default_invoice_template as TemplateType) || 'titanium'
  );

  const [items, setItems] = useState<LineItem[]>(
    invoice?.line_items || invoice?.items || [
      { id: '1', description: 'Enterprise Business OS & Platform Licensing', quantity: 1, unit_price: 100000, tax_rate: isTaxEnabled ? 18 : 0, amount: 100000 },
    ]
  );

  const [showEmailModal, setShowEmailModal] = useState(false);

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

  const handleExportPDF = () => {
    const invPayload: Invoice = {
      id: invoice?.id || 'temp',
      org_id: org.id,
      client_id: clientId,
      client_name: selectedClient?.name || 'Client',
      client_email: selectedClient?.email,
      invoice_number: invoiceNumber,
      issue_date: issueDate,
      due_date: dueDate,
      status,
      items,
      line_items: items,
      subtotal,
      tax,
      total,
      created_at: new Date().toISOString(),
    };
    const doc = generateInvoicePDF(invPayload, org, templateId);
    doc.save(`HESICS_Invoice_${invoiceNumber}.pdf`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || items.length === 0) return;

    const payload = {
      client_id: clientId,
      client_name: selectedClient?.name || 'Client',
      client_email: selectedClient?.email,
      invoice_number: invoiceNumber,
      template_id: templateId,
      issue_date: issueDate,
      due_date: dueDate,
      status,
      items,
      line_items: items,
      subtotal,
      tax,
      total,
      paid_at: status === 'paid' ? (invoice?.paid_at || new Date().toISOString().split('T')[0]) : undefined,
    };

    if (invoice) {
      db.updateInvoice(invoice.id, payload);
    } else {
      db.addInvoice(payload);
    }

    onSuccess();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-[#0D0D11] border border-[#22222B] rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-8 space-y-6 shadow-2xl shadow-black/80">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#1C1C26] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
                <FileText className="w-4 h-4 text-[#77727E]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#F4F4F6] tracking-tight font-display">
                  {invoice ? 'Edit Tax Invoice' : 'Issue Tax Invoice'}
                </h2>
                <p className="text-xs text-[#808090]">
                  Configure commercial billing line items, select layout template, and export vector PDF.
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
                <label className="hesics-label">Invoice #</label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
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
                <label className="hesics-label">Payment Due Date</label>
                <DatePicker
                  value={dueDate}
                  onChange={setDueDate}
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
                <label className="hesics-label">Invoice Status</label>
                <CustomSelect
                  value={status}
                  onChange={(v) => setStatus(v as InvoiceStatus)}
                  options={STATUS_OPTIONS}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3 pt-4 border-t border-[#1C1C26]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#F4F4F6]">Invoice Line Items</h3>
                  <p className="text-[11px] text-[#707080]">Itemize deliverables, rates, and units for client invoicing.</p>
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
                        placeholder="Service or milestone description..."
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
                        placeholder="Unit Price (₹)"
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
                <span>Commercial Subtotal:</span>
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
                <span>Total Payable:</span>
                <span className="font-mono text-[#F4F4F6] text-base">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1A1A22]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="hesics-btn-secondary text-xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#77727E]" /> Export PDF
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
                  {invoice ? 'Save Invoice' : 'Issue Invoice'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Email Dispatch Modal */}
      {showEmailModal && (
        <EmailDispatchModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          defaultTo={selectedClient?.email || ''}
          recipientName={selectedClient?.name || 'Client'}
          documentType="Invoice"
          documentNumber={invoiceNumber}
          defaultSubject={`Tax Invoice #${invoiceNumber} from HESICS — Due ${dueDate}`}
          defaultMessage={`Please find attached formal tax invoice #${invoiceNumber} for your account.\n\nTotal Payable: ₹${total.toLocaleString('en-IN')}\nPayment Due Date: ${dueDate}\n\nKindly process the remittance at your earliest convenience.`}
        />
      )}
    </>
  );
};
