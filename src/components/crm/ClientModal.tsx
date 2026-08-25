import React, { useState } from "react";
import { X, Building2, Briefcase } from "lucide-react";
import { db } from "../../lib/db/clients";
import { Client, ClientStatus, User } from "../../lib/types";
import { CustomSelect, Option } from "../common/CustomSelect";
import { showToast } from "../common/Toast";

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client?: Client;
  activeUser: User;
}

const STATUS_OPTIONS: Option[] = [
  {
    value: "qualified",
    label: "Qualified Opportunity",
    badge: "Qualified",
    badgeColor: "text-sky-400 bg-sky-950/40 border-sky-800/50",
  },
  {
    value: "at_risk",
    label: "At Risk",
    badge: "At Risk",
    badgeColor: "text-orange-400 bg-orange-950/40 border-orange-800/50",
  },
  {
    value: "dormant",
    label: "Dormant / Follow-up",
    badge: "Dormant",
    badgeColor: "text-amber-400 bg-amber-950/40 border-amber-800/50",
  },
  {
    value: "active",
    label: "Active Retainer",
    badge: "Active",
    badgeColor: "text-emerald-400 bg-emerald-950/40 border-emerald-800/50",
  },
  {
    value: "lead",
    label: "Prospective Lead",
    badge: "Lead",
    badgeColor: "text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30",
  },
  {
    value: "churned",
    label: "Churned / Closed",
    badge: "Closed",
    badgeColor: "text-[#707080] bg-[#14141A] border-[#202028]",
  },
];

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  client,
  activeUser,
}) => {
  const services = db.getServices();
  const serviceOptions: Option[] = services.map((s) => ({
    value: s.name,
    label: s.name,
    sublabel: `Default: ₹${s.default_rate.toLocaleString("en-IN")}`,
    badge: s.category,
    badgeColor: "text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30",
  }));

  const [name, setName] = useState(client?.name || "");
  const [companyName, setCompanyName] = useState(client?.company_name || "");
  const [email, setEmail] = useState(client?.email || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [status, setStatus] = useState<ClientStatus>(
    client?.status || "active",
  );
  const [primaryService, setPrimaryService] = useState(
    client?.primary_service ||
      services[0]?.name ||
      "Enterprise Business OS Architecture & Cloud Infra",
  );
  const [gstin, setGstin] = useState(client?.gstin || "");
  const [industry, setIndustry] = useState(client?.industry || "");
  const [notes, setNotes] = useState(client?.notes || "");
  const [tags, setTags] = useState((client?.tags || []).join(", "));
  const [nextAction, setNextAction] = useState(client?.next_action || "");
  const [nextActionDue, setNextActionDue] = useState(client?.next_action_due || "");
  const [validationError, setValidationError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");
    const normalizedEmail = email.trim().toLowerCase();
    if (name.trim().length < 2) {
      setValidationError("Enter a client contact name with at least 2 characters.");
      return;
    }
    if (normalizedEmail && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(normalizedEmail)) {
      setValidationError("Enter a valid business email address.");
      return;
    }
    const duplicates = db.findPotentialClientDuplicates({
      name,
      company_name: companyName,
      email: normalizedEmail,
      phone,
      exclude_id: client?.id,
    });
    if (duplicates.length > 0) {
      setValidationError(`A possible duplicate already exists: ${duplicates[0].name}${duplicates[0].company_name ? ` (${duplicates[0].company_name})` : ""}. Review the Clients workspace before continuing.`);
      return;
    }

    const payload = {
      name: name.trim(),
      company_name: companyName.trim() || undefined,
      email: normalizedEmail || undefined,
      phone: phone.trim() || undefined,
      status,
      primary_service: primaryService,
      gstin: gstin.trim() || undefined,
      industry: industry.trim() || undefined,
      notes: notes.trim() || undefined,
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 12),
      next_action: nextAction.trim() || undefined,
      next_action_due: nextActionDue || undefined,
      relationship_health: (status === "at_risk" ? "at_risk" : status === "dormant" ? "watch" : "healthy") as Client["relationship_health"],
      owner_id: client?.owner_id || activeUser.id,
      owner_name: client?.owner_name || activeUser.name,
    };

    if (client) {
      db.updateClient(client.id, payload);
      showToast("Client Updated", `Profile for "${name}" has been updated.`);
    } else {
      db.addClient(payload);
      showToast("Client Created", `Client "${name}" has been added.`);
    }

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-modal flex items-center justify-center p-4">
      <div className="bg-[#0D0D11] border border-[#22222B] rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-8 pb-36 space-y-6 pb-36 shadow-2xl shadow-black/80">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1C1C26] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[#77727E]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F4F4F6] tracking-tight font-display">
                {client ? "Edit Client Account" : "Add New Client Account"}
              </h2>
              <p className="text-xs text-[#808090]">
                Configure client identity, primary service requirements, and key
                commercial contact points.
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
          {/* Row 1: Contact & Company */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="hesics-label">Primary Contact Person *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anand Mahindra"
                className="hesics-input text-xs"
              />
            </div>
            <div>
              <label className="hesics-label">
                Company / Enterprise Entity
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apex Global Enterprise Ltd"
                className="hesics-input text-xs"
              />
            </div>
          </div>

          {/* Row 2: Email & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="hesics-label">Corporate Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="director@apex.com"
                className="hesics-input text-xs font-mono"
              />
            </div>
            <div>
              <label className="hesics-label">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="hesics-input text-xs font-mono"
              />
            </div>
          </div>

          {/* Row 3: Status & Primary Service Requirement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="hesics-label">Account Status</label>
              <CustomSelect
                value={status}
                onChange={(v) => setStatus(v as ClientStatus)}
                options={STATUS_OPTIONS}
              />
            </div>
            <div>
              <label className="hesics-label">Primary Service Required *</label>
              <CustomSelect
                value={primaryService}
                onChange={setPrimaryService}
                options={serviceOptions}
                searchable
              />
            </div>
          </div>

          {/* Row 4: GSTIN & Industry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="hesics-label">GSTIN / Tax ID</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="33AAAAA0000A1Z5"
                className="hesics-input text-xs font-mono uppercase"
              />
            </div>
            <div>
              <label className="hesics-label">Industry Domain</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Enterprise SaaS, FinTech & Defense"
                className="hesics-input text-xs"
              />
            </div>
          </div>

          {/* Row 5: Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="hesics-label">Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="priority, retainer, referral"
                className="hesics-input text-xs"
              />
              <p className="text-[10px] text-[#606070] mt-1">Separate tags with commas.</p>
            </div>
            <div>
              <label className="hesics-label">Next Action Due</label>
              <input
                type="date"
                value={nextActionDue}
                onChange={(e) => setNextActionDue(e.target.value)}
                className="hesics-input text-xs"
              />
            </div>
          </div>

          <div>
            <label className="hesics-label">Next Action</label>
            <input
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g. Send revised proposal"
              className="hesics-input text-xs"
            />
          </div>

          <div>
            <label className="hesics-label">Commercial Notes & Brief</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Strategic deliverables, contract terms, or account nuances..."
              className="hesics-input text-xs resize-none leading-relaxed"
            />
          </div>

          {validationError && (
            <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-xs text-rose-300" role="alert">
              {validationError}
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1A1A22]">
            <button
              type="button"
              onClick={onClose}
              className="hesics-btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" className="hesics-btn-primary px-6">
              {client ? "Save Profile" : "Create Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
