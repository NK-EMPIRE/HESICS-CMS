import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Invoice, InvoiceStatus, LineItem } from '../../lib/types';
import { db } from '../../lib/supabase';
import { Plus, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Invoice;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const clients = db.getClients();

  const [formData, setFormData] = useState({
    client_id: initialData?.client_id || clients[0]?.id || '',
    invoice_number: initialData?.invoice_number || `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
    status: (initialData?.status || 'sent') as InvoiceStatus,
    due_date: initialData?.due_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  });

  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialData?.line_items || [
      {
        id: 'li-inv-1',
        description: 'AI System Implementation & CRM Setup',
        quantity: 1,
        unit_price: 200000,
        tax_rate: 18,
        amount: 200000,
      },
    ]
  );

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: `li-${Date.now()}`,
        description: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: 18,
        amount: 0,
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.amount = Number(updated.quantity) * Number(updated.unit_price);
        }
        return updated;
      })
    );
  };

  const subtotal = lineItems.reduce((acc, item) => acc + item.amount, 0);
  const tax = lineItems.reduce((acc, item) => acc + (item.amount * item.tax_rate) / 100, 0);
  const total = subtotal + tax;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const client = clients.find((c) => c.id === formData.client_id);

    const payload = {
      ...formData,
      client_name: client?.name || '',
      client_email: client?.email || '',
      line_items: lineItems,
      subtotal,
      tax,
      total,
      paid_at: formData.status === 'paid' ? new Date().toISOString() : undefined,
    };

    if (initialData) {
      db.updateInvoice(initialData.id, payload);
    } else {
      db.addInvoice(payload);
    }

    if (formData.status === 'paid') {
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.5 },
      });
    }

    onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Invoice' : 'Create Tax Invoice'}
      subtitle="Generate professional GST compliance invoices for client payment."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Client *
            </label>
            <select
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.company_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Invoice Number
            </label>
            <input
              type="text"
              required
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Payment Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as InvoiceStatus })}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid ✅</option>
              <option value="overdue">Overdue ⚠️</option>
            </select>
          </div>
        </div>

        {/* Dynamic Line Items */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Invoice Items</h4>
            <button
              type="button"
              onClick={addLineItem}
              className="flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-400"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          {lineItems.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-dark-900 p-2.5 rounded-lg border border-dark-600">
              <div className="col-span-5">
                <input
                  type="text"
                  placeholder="Service / Product Description"
                  value={item.description}
                  onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-dark-800 border border-dark-600 rounded text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-dark-800 border border-dark-600 rounded text-xs text-white focus:outline-none focus:border-brand-500 text-center font-mono"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  placeholder="Unit Price"
                  value={item.unit_price}
                  onChange={(e) => updateLineItem(item.id, 'unit_price', Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-dark-800 border border-dark-600 rounded text-xs text-white focus:outline-none focus:border-brand-500 text-right font-mono"
                />
              </div>
              <div className="col-span-2 text-right font-mono text-xs font-semibold text-slate-200">
                ₹{item.amount.toLocaleString('en-IN')}
              </div>
              <div className="col-span-1 text-center">
                <button
                  type="button"
                  onClick={() => removeLineItem(item.id)}
                  className="text-slate-500 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Totals Summary */}
        <div className="bg-dark-900/80 p-4 rounded-xl border border-dark-600 space-y-1 text-right text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal Amount:</span>
            <span className="font-mono text-slate-200">₹{subtotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>GST Output Tax (18%):</span>
            <span className="font-mono text-brand-500">₹{tax.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-dark-600">
            <span>Total Payable Amount:</span>
            <span className="font-mono text-white">₹{total.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-dark-600">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg text-sm transition-all shadow-lg shadow-brand-500/20"
          >
            {initialData ? 'Update Invoice' : 'Save & Issue Invoice'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
