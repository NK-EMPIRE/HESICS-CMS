import React, { useState } from 'react';
import { X } from 'lucide-react';
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
  { value: 'lead', label: 'Prospective Lead', badge: 'Lead', badgeColor: 'text-blue-400 bg-blue-950/30 border-blue-900/40' },
  { value: 'churned', label: 'Archived / Churned', badge: 'Closed', badgeColor: 'text-[#707080] bg-[#14141A] border-[#202028]' },
];

const TIER_OPTIONS: Option[] = [
  { value: 'enterprise', label: 'Enterprise Strategic (10000cr+)', badge: 'Tier 1', badgeColor: 'text-[#1E9EFF] bg-[#1E9EFF]/10 border-[#1E9EFF]/30' },
  { value: 'growth', label: 'Growth Mid-Market', badge: 'Tier 2', badgeColor: 'text-indigo-400 bg-indigo-950/30 border-indigo-900/40' },
  { value: 'standard', label: 'Standard Commercial', badge: 'Tier 3', badgeColor: 'text-[#9090A0] bg-[#14141A] border-[#202028]' },
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D0D11] border border-[#1E1E26] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1A1A22] pb-3">
          <h2 className="text-sm font-bold text-[#F4F4F6]">
            {client ? 'Edit Client Profile' : 'Add New Client Account'}
          </h2>
          <button onClick={onClose} className="text-[#606070] hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="hesics-label">Primary Contact Person *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anand Mahindra"
                className="hesics-input"
              />
            </div>
            <div>
              <label className="hesics-label">Company / Enterprise Entity</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apex Global Corp"
                className="hesics-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="hesics-label">Corporate Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="director@apex.com"
                className="hesics-input"
              />
            </div>
            <div>
              <label className="hesics-label">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="hesics-input font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="hesics-label">GSTIN / Tax ID</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="33AAAAA0000A1Z5"
                className="hesics-input font-mono uppercase"
              />
            </div>
            <div>
              <label className="hesics-label">Industry Domain</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Enterprise SaaS & FinTech"
                className="hesics-input"
              />
            </div>
          </div>

          <div>
            <label className="hesics-label">Commercial Notes & Brief</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Strategic deliverables, contract terms, or account nuances..."
              className="hesics-input resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="hesics-btn-ghost">
              Cancel
            </button>
            <button type="submit" className="hesics-btn-primary">
              {client ? 'Save Profile' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
