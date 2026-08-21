import React, { useState } from 'react';
import { X, Sparkles, DollarSign, Calendar, Target, User } from 'lucide-react';
import { db } from '../../lib/firebaseDb';
import { Deal, DealStage, User as UserType } from '../../lib/types';

interface DealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  deal?: Deal;
  activeUser: UserType;
}

export const DealModal: React.FC<DealModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  deal,
  activeUser,
}) => {
  const clients = db.getClients();
  const [clientId, setClientId] = useState(deal?.client_id || clients[0]?.id || '');
  const [title, setTitle] = useState(deal?.title || '');
  const [value, setValue] = useState(deal?.value ? String(deal.value) : '');
  const [stage, setStage] = useState<DealStage>(deal?.stage || 'discovery');
  const [closeDate, setCloseDate] = useState(deal?.expected_close_date || '');
  const [notes, setNotes] = useState(deal?.notes || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !value) return;

    const selectedClient = clients.find((c) => c.id === clientId);

    if (deal) {
      db.updateDeal(deal.id, {
        client_id: clientId,
        client_name: selectedClient?.name || deal.client_name,
        title: title.trim(),
        value: Number(value),
        stage,
        expected_close_date: closeDate || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      db.addDeal({
        client_id: clientId,
        client_name: selectedClient?.name || 'General Client',
        title: title.trim(),
        value: Number(value),
        stage,
        expected_close_date: closeDate || undefined,
        owner_id: activeUser.id,
        owner_name: activeUser.name,
        notes: notes.trim() || undefined,
      });
    }

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D0D11] border border-[#1E1E26] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1A1A22] pb-3">
          <h2 className="text-sm font-bold text-[#F4F4F6]">
            {deal ? 'Edit Deal Opportunity' : 'New Deal Opportunity'}
          </h2>
          <button onClick={onClose} className="text-[#606070] hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="hesics-label">Associated Client Account *</label>
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

          <div>
            <label className="hesics-label">Deal Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Enterprise Cloud Integration Retainer"
              className="hesics-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="hesics-label">Deal Value (₹ INR) *</label>
              <input
                type="number"
                required
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="250000"
                className="hesics-input font-mono"
              />
            </div>
            <div>
              <label className="hesics-label">Pipeline Stage</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as DealStage)}
                className="hesics-input"
              >
                <option value="discovery">Discovery</option>
                <option value="proposal">Proposal Sent</option>
                <option value="negotiation">Negotiation</option>
                <option value="won">Closed Won</option>
                <option value="lost">Closed Lost</option>
              </select>
            </div>
          </div>

          <div>
            <label className="hesics-label">Expected Close Date</label>
            <input
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              className="hesics-input font-mono"
            />
          </div>

          <div>
            <label className="hesics-label">Deal Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Scope details, decision makers, and key milestones..."
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
              {deal ? 'Save Changes' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};