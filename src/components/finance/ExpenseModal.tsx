import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { ExpenseCategory, User } from '../../lib/types';
import { db } from '../../lib/supabase';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activeUser: User;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  activeUser,
}) => {
  const [formData, setFormData] = useState({
    category: 'software' as ExpenseCategory,
    vendor: '',
    amount: 10000,
    gst_paid: 1800, // Input GST credit
    spent_at: new Date().toISOString().split('T')[0],
    is_recurring: false,
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;

    db.addExpenseEntry({
      ...formData,
      currency: 'INR',
      created_by: activeUser.id,
    });

    onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Business Expense"
      subtitle="Track operational costs & claim Input GST credits."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold uppercase tracking-wider text-[#888888] mb-1">
            Expense Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
            className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-md text-white focus:outline-none"
          >
            <option value="software">Software & SaaS Tools</option>
            <option value="marketing">Marketing & Ads</option>
            <option value="salary">Team Salary / Payouts</option>
            <option value="equipment">Equipment & Hardware</option>
            <option value="travel">Travel & Client Meetings</option>
            <option value="other">Other Operational Costs</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#888888] mb-1">
              Vendor / Service Name
            </label>
            <input
              type="text"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              placeholder="e.g. OpenAI, AWS, Vercel"
              className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-md text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#888888] mb-1">
              Date Spent *
            </label>
            <input
              type="date"
              required
              value={formData.spent_at}
              onChange={(e) => setFormData({ ...formData, spent_at: e.target.value })}
              className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-md text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#888888] mb-1">
              Total Amount Paid (₹ INR) *
            </label>
            <input
              type="number"
              min="0"
              required
              value={formData.amount}
              onChange={(e) => {
                const amt = Number(e.target.value);
                // Auto compute 18% input GST estimate
                setFormData({ ...formData, amount: amt, gst_paid: Math.round(amt * 0.18) });
              }}
              className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-md text-white font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#888888] mb-1">
              Input GST Paid (Tax Credit ₹)
            </label>
            <input
              type="number"
              min="0"
              value={formData.gst_paid}
              onChange={(e) => setFormData({ ...formData, gst_paid: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-md text-emerald-400 font-mono focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold uppercase tracking-wider text-[#888888] mb-1">
            Notes / Invoice Details
          </label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="e.g. Monthly subscription invoice #1042"
            className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-md text-white focus:outline-none"
          />
        </div>

        <div className="pt-3 flex justify-end gap-2 border-t border-[#161616]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[#888888] hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="notion-button bg-[#1E9EFF] hover:bg-[#0A8AE6] text-white font-medium text-xs"
          >
            Save Expense
          </button>
        </div>
      </form>
    </Modal>
  );
};
