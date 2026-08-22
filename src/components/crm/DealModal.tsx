import React, { useState } from "react";
import { X, Target } from "lucide-react";
import { db } from "../../lib/db/deals";
import { Deal, DealStage, User as UserType } from "../../lib/types";
import { DatePicker } from "../common/DatePicker";
import { CustomSelect, Option } from "../common/CustomSelect";

interface DealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  deal?: Deal;
  activeUser: UserType;
}

const STAGE_OPTIONS: Option[] = [
  {
    value: "discovery",
    label: "Discovery",
    badge: "10%",
    badgeColor: "text-[#808090] bg-[#14141A] border-[#202028]",
  },
  {
    value: "proposal",
    label: "Proposal Sent",
    badge: "40%",
    badgeColor: "text-indigo-300 bg-indigo-950/40 border-indigo-800/50",
  },
  {
    value: "negotiation",
    label: "Commercial Negotiation",
    badge: "75%",
    badgeColor: "text-amber-300 bg-amber-950/40 border-amber-800/50",
  },
  {
    value: "won",
    label: "Closed Won",
    badge: "100%",
    badgeColor: "text-emerald-400 bg-emerald-950/40 border-emerald-800/50",
  },
  {
    value: "lost",
    label: "Closed Lost",
    badge: "0%",
    badgeColor: "text-rose-400 bg-rose-950/40 border-rose-800/50",
  },
];

export const DealModal: React.FC<DealModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  deal,
  activeUser,
}) => {
  const clients = db.getClients();
  const [clientId, setClientId] = useState(
    deal?.client_id || clients[0]?.id || "",
  );
  const [title, setTitle] = useState(deal?.title || "");
  const [value, setValue] = useState(deal?.value ? String(deal.value) : "");
  const [stage, setStage] = useState<DealStage>(deal?.stage || "discovery");
  const [closeDate, setCloseDate] = useState(deal?.expected_close_date || "");
  const [notes, setNotes] = useState(deal?.notes || "");

  if (!isOpen) return null;

  const clientOptions: Option[] = clients.map((c) => ({
    value: c.id,
    label: c.name,
    sublabel: c.company_name,
    badge: c.primary_service || "Enterprise",
    badgeColor: "text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30",
  }));

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
        client_name: selectedClient?.name || "General Client",
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
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-modal flex items-center justify-center p-4">
      <div className="bg-[#0D0D11] border border-[#22222B] rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-8 space-y-6 pb-36 shadow-2xl shadow-black/80">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1C1C26] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
              <Target className="w-4 h-4 text-[#77727E]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F4F4F6] tracking-tight font-display">
                {deal ? "Edit Deal Opportunity" : "New Deal Opportunity"}
              </h2>
              <p className="text-xs text-[#808090]">
                Track revenue probability, expected close velocity, and client
                account association.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#606070] hover:text-white p-1.5 rounded-lg hover:bg-[#16161D] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="hesics-label">
                Associated Client Account *
              </label>
              <CustomSelect
                value={clientId}
                onChange={setClientId}
                options={clientOptions}
                placeholder="Select client account..."
                searchable
              />
            </div>

            <div>
              <label className="hesics-label">Deal Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Enterprise Platform Retainer"
                className="hesics-input text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="hesics-label">Deal Value (₹ INR) *</label>
              <input
                type="number"
                required
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="250000"
                className="hesics-input text-xs font-mono font-semibold"
              />
            </div>
            <div>
              <label className="hesics-label">Pipeline Stage</label>
              <CustomSelect
                value={stage}
                onChange={(v) => setStage(v as DealStage)}
                options={STAGE_OPTIONS}
              />
            </div>
            <div>
              <label className="hesics-label">Expected Close Date</label>
              <DatePicker
                value={closeDate}
                onChange={setCloseDate}
                placeholder="Target date..."
              />
            </div>
          </div>

          <div>
            <label className="hesics-label">Deal Notes & Scope Strategy</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Scope details, key decision makers, and milestone schedule..."
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
            <button type="submit" className="hesics-btn-primary px-6">
              {deal ? "Save Changes" : "Create Deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
