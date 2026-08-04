import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { ActivityType, User } from '../../lib/types';
import { db } from '../../lib/supabase';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId?: string;
  dealId?: string;
  activeUser: User;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  dealId,
  activeUser,
}) => {
  const clients = db.getClients();
  const deals = db.getDeals();

  const [formData, setFormData] = useState({
    client_id: clientId || clients[0]?.id || '',
    deal_id: dealId || '',
    type: 'meeting' as ActivityType,
    outcome: '',
    follow_up_date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.outcome.trim()) return;

    const client = clients.find((c) => c.id === formData.client_id);
    const deal = deals.find((d) => d.id === formData.deal_id);

    db.addActivity({
      ...formData,
      client_name: client?.name,
      deal_title: deal?.title,
      author_id: activeUser.id,
      author_name: activeUser.name,
    });

    onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Touchpoint / Activity"
      subtitle="Never lose track of client calls, meetings, or upcoming follow-up dates."
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Activity Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as ActivityType })}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
            >
              <option value="meeting font-semibold">🤝 Meeting / Demo</option>
              <option value="call">📞 Phone Call</option>
              <option value="dm">💬 Instagram / WhatsApp DM</option>
              <option value="email">✉️ Email</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Next Follow-Up Date *
            </label>
            <input
              type="date"
              required
              value={formData.follow_up_date}
              onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Discussion Outcome / Notes *
          </label>
          <textarea
            required
            rows={3}
            value={formData.outcome}
            onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
            placeholder="e.g. Discussed proposal details. Client agreed on terms, scheduled invoice rollout."
            className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
          />
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
            Log Activity
          </button>
        </div>
      </form>
    </Modal>
  );
};
