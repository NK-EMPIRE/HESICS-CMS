import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Deal, DealStage } from '../../lib/types';
import { db } from '../../lib/supabase';
import confetti from 'canvas-confetti';

interface DealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Deal;
}

export const DealModal: React.FC<DealModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const clients = db.getClients();
  const users = db.getUsers();

  const [formData, setFormData] = useState({
    client_id: initialData?.client_id || clients[0]?.id || '',
    title: initialData?.title || '',
    value: initialData?.value || 100000,
    currency: initialData?.currency || 'INR',
    stage: (initialData?.stage || 'new') as DealStage,
    probability: initialData?.probability || 20,
    expected_close_date: initialData?.expected_close_date || new Date().toISOString().split('T')[0],
    owner_id: initialData?.owner_id || users[0]?.id || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const client = clients.find((c) => c.id === formData.client_id);
    const owner = users.find((u) => u.id === formData.owner_id);

    const payload = {
      ...formData,
      client_name: client?.name || '',
      company_name: client?.company_name || '',
      owner_name: owner?.name || '',
    };

    if (initialData) {
      db.updateDeal(initialData.id, payload);
    } else {
      db.addDeal(payload);
    }

    if (formData.stage === 'won') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Deal' : 'Create New Deal'}
      subtitle="Track high-value client engagements in your sales pipeline."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
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
                {c.name} {c.company_name ? `(${c.company_name})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Deal Title / Service Package *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. AI Workflow Automation & Custom CRM"
            className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Deal Value (₹ INR)
            </label>
            <input
              type="number"
              min="0"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Win Probability (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.probability}
              onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Pipeline Stage
            </label>
            <select
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value as DealStage })}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
            >
              <option value="new">New Lead</option>
              <option value="contacted">Contacted</option>
              <option value="quoted">Quoted</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won 🎉</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Expected Close
            </label>
            <input
              type="date"
              value={formData.expected_close_date}
              onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Deal Owner
            </label>
            <select
              value={formData.owner_id}
              onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
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
            {initialData ? 'Update Deal' : 'Save Deal'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
