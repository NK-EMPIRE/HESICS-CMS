import React, { useState } from 'react';
import { X, Building2, Mail, Phone, Tag, User } from 'lucide-react';
import { db } from '../../lib/firebaseDb';
import { Client, ClientSource, ClientStatus, User as UserType } from '../../lib/types';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client?: Client;
  activeUser: UserType;
}

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
  const [source, setSource] = useState<ClientSource>(client?.source || 'referral');
  const [status, setStatus] = useState<ClientStatus>(client?.status || 'lead');
  const [notes, setNotes] = useState(client?.notes || '');
  const [tagsInput, setTagsInput] = useState(client?.tags?.join(', ') || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (client) {
      db.updateClient(client.id, {
        name: name.trim(),
        company_name: companyName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        source,
        status,
        notes: notes.trim() || undefined,
        tags,
      });
    } else {
      db.addClient({
        name: name.trim(),
        company_name: companyName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        source,
        status,
        notes: notes.trim() || undefined,
        tags,
        owner_id: activeUser.id,
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
            {client ? 'Edit Client Account' : 'New Client Account'}
          </h2>
          <button onClick={onClose} className="text-[#606070] hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="hesics-label">Contact / Account Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="hesics-input"
            />
          </div>

          <div>
            <label className="hesics-label">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Apex Global Technologies"
              className="hesics-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="hesics-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@company.com"
                className="hesics-input"
              />
            </div>
            <div>
              <label className="hesics-label">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="hesics-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="hesics-label">Lead Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as ClientSource)}
                className="hesics-input"
              >
                <option value="referral">Referral</option>
                <option value="instagram">Instagram</option>
                <option value="cold_dm">Direct Outreach</option>
                <option value="website">Website Inquiry</option>
                <option value="other">Other Channel</option>
              </select>
            </div>
            <div>
              <label className="hesics-label">Account Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ClientStatus)}
                className="hesics-input"
              >
                <option value="lead">Prospect / Lead</option>
                <option value="active">Active Client</option>
                <option value="churned">Churned</option>
              </select>
            </div>
          </div>

          <div>
            <label className="hesics-label">Tags (comma separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Enterprise, High Priority, Retainer"
              className="hesics-input"
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
              {client ? 'Save Changes' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};