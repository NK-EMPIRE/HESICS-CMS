import React, { useState } from "react";
import { X, CalendarClock } from "lucide-react";
import { db } from "../../lib/db/activities";
import { ActivityType, User as UserType } from "../../lib/types";
import { DatePicker } from "../common/DatePicker";
import { CustomSelect, Option } from "../common/CustomSelect";
import { sendTaskAssignmentEmail } from "../../lib/emailService";

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId?: string;
  dealId?: string;
  activeUser: UserType;
}

const ACTIVITY_TYPE_OPTIONS: Option[] = [
  {
    value: "call",
    label: "Executive Phone Call",
    badge: "Call",
    badgeColor: "text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30",
  },
  {
    value: "meeting",
    label: "Video / In-Person Meeting",
    badge: "Meeting",
    badgeColor: "text-indigo-300 bg-indigo-950/40 border-indigo-800/50",
  },
  {
    value: "email",
    label: "Official Written Email",
    badge: "Email",
    badgeColor: "text-emerald-400 bg-emerald-950/40 border-emerald-800/50",
  },
  {
    value: "dm",
    label: "Direct Message / WhatsApp",
    badge: "DM",
    badgeColor: "text-amber-300 bg-amber-950/40 border-amber-800/50",
  },
  {
    value: "task",
    label: "Milestone Task Action",
    badge: "Task",
    badgeColor: "text-rose-400 bg-rose-950/40 border-rose-800/50",
  },
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

  const [clientId, setClientId] = useState(
    initialClientId || clients[0]?.id || "",
  );
  const [dealId, setDealId] = useState(initialDealId || "");
  const [type, setType] = useState<ActivityType>("call");
  const [outcome, setOutcome] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
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

    if (followUpDate && activeUser.email) {
      await sendTaskAssignmentEmail({
        to: activeUser.email,
        recipientName: activeUser.name,
        taskTitle: `${type.toUpperCase()} Follow-up: ${selectedClient?.name || "Client"}`,
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
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-modal flex items-center justify-center p-4">
      <div className="bg-[#0D0D11] border border-[#22222B] rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-8 space-y-6 pb-28 shadow-2xl shadow-black/80">
        <div className="flex items-center justify-between border-b border-[#1C1C26] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
              <CalendarClock className="w-4 h-4 text-[#77727E]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F4F4F6] tracking-tight font-display">
                Log Touchpoint & Task
              </h2>
              <p className="text-xs text-[#808090]">
                Record client communication milestones and schedule action
                follow-ups.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#606070] hover:text-white p-1.5 rounded-lg hover:bg-[#16161D]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="hesics-label">Client Account *</label>
            <CustomSelect
              value={clientId}
              onChange={setClientId}
              options={clientOptions}
              placeholder="Select client account..."
              searchable
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="hesics-label">Activity Type</label>
              <CustomSelect
                value={type}
                onChange={(v) => setType(v as ActivityType)}
                options={ACTIVITY_TYPE_OPTIONS}
              />
            </div>

            <div>
              <label className="hesics-label">Follow-Up Target Date</label>
              <DatePicker
                value={followUpDate}
                onChange={setFollowUpDate}
                placeholder="Next follow-up..."
              />
            </div>
          </div>

          <div>
            <label className="hesics-label">Discussion Notes & Outcome *</label>
            <textarea
              rows={4}
              required
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Key deliverables discussed, client feedback, and agreed next steps..."
              className="hesics-input text-xs resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1A1A22]">
            <button
              type="button"
              onClick={onClose}
              className="hesics-btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="hesics-btn-primary px-6"
            >
              {isSubmitting ? "Recording & Emailing..." : "Log Touchpoint"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
