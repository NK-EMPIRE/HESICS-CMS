import React, { useState } from "react";
import { X, DollarSign, Building2, User as UserIcon } from "lucide-react";
import { db } from "../../lib/db/finance";
import { User as UserType } from "../../lib/types";
import { DatePicker } from "../common/DatePicker";
import { CustomSelect, Option } from "../common/CustomSelect";
import { showToast } from "../common/Toast";

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activeUser: UserType;
}

const PAYMENT_METHODS: Option[] = [
  {
    value: "Bank Transfer (NEFT/RTGS/IMPS)",
    label: "Bank Transfer (NEFT / RTGS / IMPS)",
    badge: "Bank",
    badgeColor: "text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30",
  },
  {
    value: "Corporate Wire / SWIFT",
    label: "Corporate Wire / SWIFT (USD/EUR)",
    badge: "Wire",
    badgeColor: "text-indigo-300 bg-indigo-950/40 border-indigo-800/50",
  },
  {
    value: "UPI / Commercial QR",
    label: "UPI / Commercial QR Payment",
    badge: "UPI",
    badgeColor: "text-emerald-400 bg-emerald-950/40 border-emerald-800/50",
  },
  {
    value: "Cheque / Commercial Draft",
    label: "Cheque / Demand Draft",
    badge: "Draft",
    badgeColor: "text-[#808090] bg-[#14141A] border-[#202028]",
  },
];

export const IncomeModal: React.FC<IncomeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  activeUser,
}) => {
  const clients = db.getClients();
  const [isManualInput, setIsManualInput] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(
    clients[0]?.id || "",
  );
  const [manualClientName, setManualClientName] = useState("");

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Enterprise Retainer");
  const [receivedAt, setReceivedAt] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].value);
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const clientOptions: Option[] = clients.map((c) => ({
    value: c.id,
    label: c.name,
    sublabel: c.company_name || c.email,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    let finalClientName = manualClientName.trim();
    if (!isManualInput) {
      const selected = clients.find((c) => c.id === selectedClientId);
      finalClientName = selected ? selected.name : "Direct Source";
    }

    db.addIncomeEntry({
      source_type: "direct",
      client_name: finalClientName || "Direct Revenue",
      amount: Number(amount),
      currency: "INR",
      category: category.trim() || "Direct Revenue",
      received_at: receivedAt,
      payment_method: paymentMethod,
      notes: notes.trim() || undefined,
      created_by: activeUser.id,
    });

    showToast(
      "Inflow Recorded",
      `Recorded ₹${Number(amount).toLocaleString("en-IN")} from ${finalClientName || "Direct Source"}.`,
    );
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-modal flex items-center justify-center p-4">
      <div className="bg-[#0D0D11] border border-[#22222B] rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-8 pb-16 space-y-6 shadow-2xl shadow-black/80">
        <div className="flex items-center justify-between border-b border-[#1C1C26] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#77727E]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F4F4F6] tracking-tight font-display">
                Record Revenue Inflow
              </h2>
              <p className="text-xs text-[#808090]">
                Log direct payments, client milestones, and banking remittances.
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
          {/* Client Account Selector / Manual Mode */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="hesics-label mb-0">
                Client / Commercial Source Entity *
              </label>
              <button
                type="button"
                onClick={() => setIsManualInput(!isManualInput)}
                className="text-[11px] text-[#D4D4D8] hover:text-white font-medium hover:underline"
              >
                {isManualInput
                  ? "← Select from client roster"
                  : "+ Or type custom entity manually"}
              </button>
            </div>

            {isManualInput ? (
              <input
                type="text"
                required
                value={manualClientName}
                onChange={(e) => setManualClientName(e.target.value)}
                placeholder="e.g. Apex Global Technologies Ltd / Direct Consulting"
                className="hesics-input text-xs"
                autoFocus
              />
            ) : (
              <CustomSelect
                value={selectedClientId}
                onChange={setSelectedClientId}
                options={clientOptions}
                placeholder="Select client account..."
                searchable
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="hesics-label">Amount Received (₹ INR) *</label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100000"
                className="hesics-input text-xs font-mono font-semibold"
              />
            </div>
            <div>
              <label className="hesics-label">Received Date *</label>
              <DatePicker
                value={receivedAt}
                onChange={setReceivedAt}
                placeholder="Select date..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="hesics-label">Revenue Classification</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Enterprise Retainer / Milestone"
                className="hesics-input text-xs"
              />
            </div>
            <div>
              <label className="hesics-label">Payment Channel</label>
              <CustomSelect
                value={paymentMethod}
                onChange={setPaymentMethod}
                options={PAYMENT_METHODS}
              />
            </div>
          </div>

          <div>
            <label className="hesics-label">
              Notes & UTR / Banking Reference
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Banking UTR reference or remittance notes..."
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
              Record Inflow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
