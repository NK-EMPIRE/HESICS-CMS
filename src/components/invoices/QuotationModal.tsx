import React, { useState } from 'react';
import { X, Plus, Trash2, FileText, User } from 'lucide-react';
import { db } from '../../lib/firebaseDb';
import { Quotation, QuotationStatus, LineItem, User as UserType } from '../../lib/types';

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  quotation?: Quotation;
  activeUser: UserType;
}

export const QuotationModal: React.FC<QuotationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  quotation,
  activeUser,
}) => {
  const clients = db.getClients();
  const deals = db.getDeals();

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

  const [items, setItems] = useState<LineItem[]>(
    quotation?.line_items || quotation?.items || [
      { id: '1', description: 'Web Platform Development & API Design', quantity: 1, unit_price: 150000, tax_rate: 18, amount: 150000 },
    ]
  );

  if (!isOpen) return null;

  const addItem = () => {
    setItems([
      ...items,
      { id: String(Date.now()), description: '', quantity: 1, unit_price: 0, tax_rate: 18, amount: 0 },
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
  const tax = Math.round(items.reduce((sum, item) => sum + (Number(item.amount) * ((item.tax_rate ?? 18) / 100)), 0));
  const total = subtotal + tax;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || items.length === 0) return;

    const selectedClient = clients.find((c) => c.id === clientId);

    const payload = {
      client_id: clientId,
      client_name: selectedClient?.name || 'Client',
      client_email: selectedClient?.email,
      deal_id: dealId || undefined,
      quotation_number: quoteNumber,
      quote_number: quoteNumber,
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
    } else {
      db.addQuotation(payload);
    }

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D0D11] border border-[#1E1E26] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1A1A22] pb-3">
          <h2 className="text-sm font-bold text-[#F4F4F6]">
            {quotation ? 'Edit Quotation' : 'Create Quotation'}
          </h2>
          <button onClick={onClose} className="text-[#606070] hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="hesics-label">Client Account *</label>
              <select
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="hesics-input"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company_name ? `(${c.company_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="hesics-label">Quotation #</label>
              <input
                type="text"
                required
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                className="hesics-input font-mono"
              />
            </div>

            <div>
              <label className="hesics-label">Valid Until</label>
              <input
                type="date"
                required
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="hesics-input font-mono"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2 pt-2 border-t border-[#1A1A22]">
            <div className="flex items-center justify-between">
              <label className="hesics-label mb-0">Line Items & Scope</label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-[#1E9EFF] hover:underline flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center bg-[#09090C] p-2 rounded-lg border border-[#181820]">
                  <div className="col-span-6">
                    <input
                      type="text"
                      placeholder="Service or milestone description..."
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      className="hesics-input text-xs py-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                      className="hesics-input text-xs py-1 font-mono text-center"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="Unit Price (₹)"
                      value={item.unit_price ?? item.rate}
                      onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value))}
                      className="hesics-input text-xs py-1 font-mono"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-[#606070] hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="p-3 bg-[#09090C] border border-[#1A1A22] rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between text-[#808090]">
              <span>Subtotal:</span>
              <span className="font-mono text-[#F4F4F6]">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-[#808090]">
              <span>Estimated GST (18%):</span>
              <span className="font-mono text-[#F4F4F6]">₹{tax.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-[#F4F4F6] pt-1.5 border-t border-[#16161E]">
              <span>Grand Total:</span>
              <span className="font-mono text-[#1E9EFF]">₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="hesics-btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" className="hesics-btn-primary">
              {quotation ? 'Save Quotation' : 'Issue Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};