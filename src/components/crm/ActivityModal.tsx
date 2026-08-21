import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { db } from '../../lib/firebaseDb';
import { ActivityType, User as UserType } from '../../lib/types';
import { DatePicker } from '../common/DatePicker';
import { CustomSelect, Option } from '../common/CustomSelect';
import { sendTaskAssignmentEmail } from '../../lib/emailService';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId?: string;
  dealId?: string;
  activeUser: UserType;
}

const ACTIVITY_TYPE_OPTIONS: Option[] = [
  { value: 'call', label: 'Executive Phone Call', badge: 'Call', badgeColor: 'text-[#1E9EFF] bg-[#1E9EFF]/10 border-[#1E9EFF]/30' },
  { value: 'meeting', label: 'Video / In-Person Meeting', badge: 'Meeting', badgeColor: 'text-indigo-400 bg-indigo-950/30 border-indigo-900/40' },
  { value: 'email', label: 'Official Written Email', badge: 'Email', badgeColor: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40' },
  { value: 'dm', label: 'Direct Message / WhatsApp', badge: 'DM', badgeColor: 'text-amber-400 bg-amber-950/30 border-amber-900/40' },
  { value: 'task', label: 'Milestone Task Action', badge: 'Task', badgeColor: 'text-rose-400 bg-rose-950/30 border-rose-900/40' },
];

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const clientOptions: Option[] = clients.map((c) => ({
    value: c.id,
    label: c.name,
    sublabel: c.company_name,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcome.trim() || !clientId) return;

    setIsSubmitting(true);
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

    // If follow-up date exists, send automated email notification
    if (followUpDate && activeUser.email) {
      await sendTaskAssignmentEmail({
        to: activeUser.email,
        recipientName: activeUser.name,
        taskTitle: `${type.toUpperCase()} Follow-up: ${selectedClient?.name || 'Client'}`,
        clientName: selectedClient?.name,
        dueDate: followUpDate,
        activityType: type,
        outcomeNotes: outcome.trim(),
      });
    }

    setIsSubmitting(false);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D0D11] border border-[#1E1E26] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1A1A22] pb-3">
          <h2 className="text-sm font-bold text-[#F4F4F6]">Log Client Touchpoint & Task</h2>
          <button onClick={onClose} className="text-[#606070] hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="hesics-label">Client Account *</label>
            <CustomSelect
              value={clientId}
              onChange={setClientId}
              options={clientOptions}
              placeholder="Select client..."
              searchable
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="hesics-label">Activity Type</label>
              <CustomSelect
                value={type}
                onChange={(v) => setType(v as ActivityType)}
                options={ACTIVITY_TYPE_OPTIONS}
              />
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
            <button type="button" onClick={onClose} className="hesics-btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="hesics-btn-primary">
              {isSubmitting ? 'Recording & Emailing...' : 'Log Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
