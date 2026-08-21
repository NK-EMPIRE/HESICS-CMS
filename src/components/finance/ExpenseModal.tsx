import React, { useState } from 'react';
import { X } from 'lucide-react';
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
  { value: 'software', label: 'Software, Servers & Cloud (AWS/GCP)', badge: 'Tech', badgeColor: 'text-[#1E9EFF] bg-[#1E9EFF]/10 border-[#1E9EFF]/30' },
  { value: 'salary', label: 'Executive & Team Payroll', badge: 'Payroll', badgeColor: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40' },
  { value: 'marketing', label: 'Marketing, PR & Campaigns', badge: 'Growth', badgeColor: 'text-indigo-400 bg-indigo-950/30 border-indigo-900/40' },
  { value: 'rent', label: 'Corporate Office & Real Estate', badge: 'Facility', badgeColor: 'text-amber-400 bg-amber-950/30 border-amber-900/40' },
  { value: 'travel', label: 'Client Meetings & Executive Travel', badge: 'Travel', badgeColor: 'text-purple-400 bg-purple-950/30 border-purple-900/40' },
  { value: 'legal', label: 'Legal, Audit & Professional Fees', badge: 'Legal', badgeColor: 'text-rose-400 bg-rose-950/30 border-rose-900/40' },
  { value: 'other', label: 'Other Operational Expenses', badge: 'General', badgeColor: 'text-[#707080] bg-[#14141A] border-[#202028]' },
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D0D11] border border-[#1E1E26] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1A1A22] pb-3">
          <h2 className="text-sm font-bold text-[#F4F4F6]">Record Expenditure</h2>
          <button onClick={onClose} className="text-[#606070] hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="hesics-label">Vendor / Service Provider</label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. Amazon Web Services / Google Cloud"
              className="hesics-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="hesics-label">Total Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="25000"
                className="hesics-input font-mono"
              />
            </div>
            <div>
              <label className="hesics-label">GST Paid (₹)</label>
              <input
                type="number"
                min="0"
                value={gstPaid}
                onChange={(e) => setGstPaid(e.target.value)}
                placeholder="4500"
                className="hesics-input font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="hesics-label">Category</label>
              <CustomSelect
                value={category}
                onChange={(v) => setCategory(v as ExpenseCategory)}
                options={CATEGORY_OPTIONS}
              />
            </div>
            <div>
              <label className="hesics-label">Expense Date *</label>
              <DatePicker
                value={spentAt}
                onChange={setSpentAt}
                placeholder="Select date..."
              />
            </div>
          </div>

          <div>
            <label className="hesics-label">Notes & Invoicing Memo</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Business purpose, invoice reference..."
              className="hesics-input resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="hesics-btn-ghost">
              Cancel
            </button>
            <button type="submit" className="hesics-btn-primary">
              Record Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
