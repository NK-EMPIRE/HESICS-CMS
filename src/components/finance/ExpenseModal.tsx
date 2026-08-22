import React, { useState } from 'react';
import { X, Receipt } from 'lucide-react';
import { db } from '../../lib/firebaseDb';
import { ExpenseCategory, User as UserType } from '../../lib/types';
import { DatePicker } from '../common/DatePicker';
import { CustomSelect, Option } from '../common/CustomSelect';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activeUser: UserType;
}

const CATEGORY_OPTIONS: Option[] = [
  { value: 'software', label: 'Software, Servers & Cloud Infrastructure', badge: 'Tech', badgeColor: 'text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30' },
  { value: 'salary', label: 'Executive & Team Payroll', badge: 'Payroll', badgeColor: 'text-emerald-300 bg-emerald-950/40 border-emerald-800/50' },
  { value: 'marketing', label: 'Marketing, PR & Strategic Campaigns', badge: 'Growth', badgeColor: 'text-indigo-300 bg-indigo-950/40 border-indigo-800/50' },
  { value: 'rent', label: 'Corporate Office & Real Estate', badge: 'Facility', badgeColor: 'text-amber-300 bg-amber-950/40 border-amber-800/50' },
  { value: 'travel', label: 'Client Meetings & Executive Travel', badge: 'Travel', badgeColor: 'text-purple-300 bg-purple-950/40 border-purple-800/50' },
  { value: 'legal', label: 'Legal, Audit & Professional Compliance', badge: 'Legal', badgeColor: 'text-rose-300 bg-rose-950/40 border-rose-800/50' },
  { value: 'other', label: 'Other Operational Expenditures', badge: 'General', badgeColor: 'text-[#707080] bg-[#14141A] border-[#202028]' },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  activeUser,
}) => {
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('software');
  const [gstPaid, setGstPaid] = useState('0');
  const [spentAt, setSpentAt] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    db.addExpenseEntry({
      vendor: vendor.trim() || undefined,
      amount: Number(amount),
      currency: 'INR',
      category,
      gst_paid: Number(gstPaid) || 0,
      spent_at: spentAt,
      notes: notes.trim() || undefined,
      created_by: activeUser.id,
    });

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-modal flex items-center justify-center p-4">
      <div className="bg-[#0D0D11] border border-[#22222B] rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-8 space-y-6 shadow-2xl shadow-black/80">
        <div className="flex items-center justify-between border-b border-[#1C1C26] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-[#77727E]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F4F4F6] tracking-tight font-display">
                Record Expenditure
              </h2>
              <p className="text-xs text-[#808090]">
                Log operational outlays, vendor purchases, and tax credits.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#606070] hover:text-white p-1.5 rounded-lg hover:bg-[#16161D]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="hesics-label">Vendor / Service Entity</label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. Amazon Web Services / Google Cloud / Vercel"
              className="hesics-input text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="hesics-label">Total Outlay Amount (₹ INR) *</label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="25000"
                className="hesics-input text-xs font-mono font-semibold"
              />
            </div>
            <div>
              <label className="hesics-label">GST Input Tax Credit Paid (₹)</label>
              <input
                type="number"
                min="0"
                value={gstPaid}
                onChange={(e) => setGstPaid(e.target.value)}
                placeholder="4500"
                className="hesics-input text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="hesics-label">Expense Category</label>
              <CustomSelect
                value={category}
                onChange={(v) => setCategory(v as ExpenseCategory)}
                options={CATEGORY_OPTIONS}
              />
            </div>
            <div>
              <label className="hesics-label">Transaction Date *</label>
              <DatePicker
                value={spentAt}
                onChange={setSpentAt}
                placeholder="Select date..."
              />
            </div>
          </div>

          <div>
            <label className="hesics-label">Invoicing Memo & Business Purpose</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Business justification, invoice voucher numbers, or payment notes..."
              className="hesics-input text-xs resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1A1A22]">
            <button type="button" onClick={onClose} className="hesics-btn-ghost">
              Cancel
            </button>
            <button type="submit" className="hesics-btn-primary px-6">
              Record Outflow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
