import React, { useState } from 'react';
import { X, DollarSign, Calendar, Tag, User } from 'lucide-react';
import { db } from '../../lib/firebaseDb';
import { IncomeSourceType, User as UserType } from '../../lib/types';

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activeUser: UserType;
}

export const IncomeModal: React.FC<IncomeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  activeUser,
}) => {
  const [clientName, setClientName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Client Retainer');
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer (NEFT/RTGS/IMPS)');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    db.addIncomeEntry({
      source_type: 'direct',
      client_name: clientName.trim() || undefined,
      amount: Number(amount),
      currency: 'INR',
      category: category.trim() || 'Direct Revenue',
      received_at: receivedAt,
      payment_method: paymentMethod,
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
          <h2 className="text-sm font-bold text-[#F4F4F6]">Record Inflow / Revenue</h2>
          <button onClick={onClose} className="text-[#606070] hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="hesics-label">Client / Source Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Apex Global Technologies"
              className="hesics-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="hesics-label">Amount Received (₹) *</label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100000"
                className="hesics-input font-mono"
              />
            </div>
            <div>
              <label className="hesics-label">Received Date *</label>
              <input
                type="date"
                required
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                className="hesics-input font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="hesics-label">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Retainer, Project Milestone"
                className="hesics-input"
              />
            </div>
            <div>
              <label className="hesics-label">Payment Method</label>
              <input
                type="text"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="e.g. UPI, Bank Transfer"
                className="hesics-input"
              />
            </div>
          </div>

          <div>
            <label className="hesics-label">Notes & Reference #</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="UTR reference or payment memo..."
              className="hesics-input resize-none"
            />
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
              Record Income
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};