import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { IncomeSourceType, User } from '../../lib/types';
import { db } from '../../lib/supabase';

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activeUser: User;
}

export const IncomeModal: React.FC<IncomeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  activeUser,
}) => {
  const clients = db.getClients();

  const [formData, setFormData] = useState({
    source_type: 'invoice' as IncomeSourceType,
    client_name: clients[0]?.name || '',
    amount: 50000,
    category: 'Client Retainer',
    received_at: new Date().toISOString().split('T')[0],
    payment_method: 'Bank Transfer / UPI',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;

    db.addIncomeEntry({
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
      title="Record Income Received"
      subtitle="Log client retainer payments, digital sales, or direct bank credits."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#888888] mb-1">
              Revenue Stream *
            </label>
            <select
              value={formData.source_type}
              onChange={(e) => setFormData({ ...formData, source_type: e.target.value as IncomeSourceType })}
              className="w-full px-3 py-2 bg-[#191919] border border-[#2e2e2e] rounded-md text-white focus:outline-none"
            >
              <option value="invoice">Client Invoice Payment</option>
              <option value="product_sale">Digital Product Sale</option>
              <option value="subscription">SaaS Subscription</option>
              <option value="other">Other Income</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#888888] mb-1">
              Client / Source Name
            </label>
            <input
              type="text"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              placeholder="e.g. Anand Kumar"
              className="w-full px-3 py-2 bg-[#191919] border border-[#2e2e2e] rounded-md text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#888888] mb-1">
              Amount Received (₹ INR) *
            </label>
            <input
              type="number"
              min="0"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-[#191919] border border-[#2e2e2e] rounded-md text-white font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#888888] mb-1">
              Date Received *
            </label>
            <input
              type="date"
              required
              value={formData.received_at}
              onChange={(e) => setFormData({ ...formData, received_at: e.target.value })}
              className="w-full px-3 py-2 bg-[#191919] border border-[#2e2e2e] rounded-md text-white focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold uppercase tracking-wider text-[#888888] mb-1">
            Payment Method
          </label>
          <input
            type="text"
            value={formData.payment_method}
            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
            placeholder="e.g. HDFC Bank IMPS / Razorpay"
            className="w-full px-3 py-2 bg-[#191919] border border-[#2e2e2e] rounded-md text-white focus:outline-none"
          />
        </div>

        <div className="pt-3 flex justify-end gap-2 border-t border-[#2a2a2a]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[#888888] hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="notion-button bg-[#FF6B00] hover:bg-[#ea580c] text-white font-medium text-xs"
          >
            Record Income
          </button>
        </div>
      </form>
    </Modal>
  );
};
