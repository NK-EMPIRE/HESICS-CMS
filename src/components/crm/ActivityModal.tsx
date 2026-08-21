import React, { useState } from 'react';
import { X, Clock, CheckSquare, MessageSquare } from 'lucide-react';
import { db } from '../../lib/firebaseDb';
import { ActivityType, User as UserType } from '../../lib/types';
import { DatePicker } from '../common/DatePicker';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId?: string;
  dealId?: string;
  activeUser: UserType;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientId: initialClientId,
  dealId: initialDealId,
  activeUser,
}) => {
  const clients = db.getClients();
  const deals = db.getDeals();

  const [clientId, setClientId] = useState(initialClientId || clients[0]?.id || '');
  const [dealId, setDealId] = useState(initialDealId || '');
  const [type, setType] = useState<ActivityType>('call');
  const [outcome, setOutcome] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcome.trim() || !clientId) return;

    const selectedClient = clients.find((c) => c.id === clientId);
    const selectedDeal = deals.find((d) => d.id === dealId);

    db.addActivity({
      client_id: clientId,
      client_name: selectedClient?.name,
      deal_id: dealId || undefined,
      deal_title: selectedDeal?.title,
      type,
      outcome: outcome.trim(),
      follow_up_date: followUpDate || undefined,
      author_id: activeUser.id,
      author_name: activeUser.name,
    });

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D0D11] border border-[#1E1E26] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1A1A22] pb-3">
          <h2 className="text-sm font-bold text-[#F4F4F6]">Log Client Touchpoint</h2>
          <button onClick={onClose} className="text-[#606070] hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="hesics-label">Client Account *</label>
            <select
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="hesics-input"
            >
              {clients.length === 0 && <option value="">No clients found — add client first</option>}
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.company_name ? `(${c.company_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="hesics-label">Activity Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ActivityType)}
                className="hesics-input"
              >
                <option value="call">Phone Call</option>
                <option value="meeting">Video / In-Person Meeting</option>
                <option value="email">Email</option>
                <option value="dm">Direct Message</option>
                <option value="task">Task Action</option>
              </select>
            </div>

            <div>
              <label className="hesics-label">Follow-Up Date</label>
              <DatePicker
                value={followUpDate}
                onChange={setFollowUpDate}
                placeholder="Next follow-up..."
              />
            </div>
          </div>

          <div>
            <label className="hesics-label">Discussion & Outcome *</label>
            <textarea
              rows={3}
              required
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Key points discussed, client feedback, and next scheduled action..."
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
              Log Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};