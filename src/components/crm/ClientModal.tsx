import React, { useState } from 'react';
import { X, Building2, User as UserIcon } from 'lucide-react';
import { db } from '../../lib/firebaseDb';
import { Client, ClientStatus, ClientTier, User } from '../../lib/types';
import { CustomSelect, Option } from '../common/CustomSelect';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client?: Client;
  activeUser: User;
}

const STATUS_OPTIONS: Option[] = [
  { value: 'active', label: 'Active Retainer', badge: 'Active', badgeColor: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40' },
  { value: 'lead', label: 'Prospective Lead', badge: 'Lead', badgeColor: 'text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30' },
  { value: 'churned', label: 'Archived / Closed', badge: 'Closed', badgeColor: 'text-[#707080] bg-[#14141A] border-[#202028]' },
];

const TIER_OPTIONS: Option[] = [
  { value: 'enterprise', label: 'Enterprise Strategic (10000cr+)', badge: 'Tier 1', badgeColor: 'text-white bg-[#77727E]/30 border-[#77727E]/60' },
  { value: 'growth', label: 'Growth & Mid-Market', badge: 'Tier 2', badgeColor: 'text-indigo-300 bg-indigo-950/40 border-indigo-800/50' },
  { value: 'standard', label: 'Standard Commercial', badge: 'Tier 3', badgeColor: 'text-[#A0A0B0] bg-[#16161E] border-[#252530]' },
];

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  client,
  activeUser,
}) => {
  const [name, setName] = useState(client?.name || '');
  const [companyName, setCompanyName] = useState(client?.company_name || '');
  const [email, setEmail] = useState(client?.email || '');
  const [phone, setPhone] = useState(client?.phone || '');
  const [status, setStatus] = useState<ClientStatus>(client?.status || 'active');
  const [tier, setTier] = useState<ClientTier>(client?.tier || 'enterprise');
  const [gstin, setGstin] = useState(client?.gstin || '');
  const [industry, setIndustry] = useState(client?.industry || '');
  const [notes, setNotes] = useState(client?.notes || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      company_name: companyName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      status,
      tier,
      gstin: gstin.trim() || undefined,
      industry: industry.trim() || undefined,
      notes: notes.trim() || undefined,
      owner_id: client?.owner_id || activeUser.id,
      owner_name: client?.owner_name || activeUser.name,
    };

    if (client) {
      db.updateClient(client.id, payload);
    } else {
      db.addClient(payload);
    }

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D0D11] border border-[#22222B] rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-8 space-y-6 shadow-2xl shadow-black/80">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1C1C26] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[#77727E]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F4F4F6] tracking-tight font-display">
                {client ? 'Edit Client Account' : 'Add New Client Account'}
              </h2>
              <p className="text-xs text-[#808090]">
                Configure corporate identity, contract tier, and key commercial contact points.
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
              <label className="hesics-label">Company / Enterprise Entity</label>
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

          {/* Row 3: Status & Tier */}
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
              <label className="hesics-label">Client Tier</label>
              <CustomSelect
                value={tier}
                onChange={(v) => setTier(v as ClientTier)}
                options={TIER_OPTIONS}
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

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1A1A22]">
            <button type="button" onClick={onClose} className="hesics-btn-ghost">
              Cancel
            </button>
            <button type="submit" className="hesics-btn-primary px-6">
              {client ? 'Save Profile' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
