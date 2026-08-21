import React, { useState } from 'react';
import {
  Plus, Search, Building2, Mail, Phone,
  Clock, Calendar, CheckCircle2,
  Trash2, Edit3, UserCheck, MessageSquare
} from 'lucide-react';
import { db } from '../lib/firebaseDb';
import { Client, ClientStatus, User, Activity } from '../lib/types';
import { ClientModal } from '../components/crm/ClientModal';
import { ActivityModal } from '../components/crm/ActivityModal';
import { hasPermission } from '../lib/rbac';

interface ClientsProps {
  activeUser: User;
}

const statusBadge: Record<ClientStatus, string> = {
  lead: 'text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30',
  active: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
  churned: 'text-[#707080] bg-[#18181E] border-[#22222A]',
};

export const Clients: React.FC<ClientsProps> = ({ activeUser }) => {
  const [clients, setClients] = useState(() => db.getClients());
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ClientStatus | 'all'>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [quickDmText, setQuickDmText] = useState('');

  const canWrite = hasPermission(activeUser.role_id, 'clients:write');
  const canDelete = hasPermission(activeUser.role_id, 'clients:delete');

  const refreshClients = () => {
    const updated = db.getClients();
    setClients(updated);
    if (selectedClient) {
      const refreshed = updated.find((c) => c.id === selectedClient.id);
      setSelectedClient(refreshed || null);
    }
  };

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      (c.company_name && c.company_name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q));
    const matchesStatus = selectedStatus === 'all' || c.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleDeleteClient = (client: Client) => {
    if (window.confirm(`Permanently remove client "${client.name}"?`)) {
      db.deleteClient(client.id);
      if (selectedClient?.id === client.id) setSelectedClient(null);
      refreshClients();
    }
  };

  const handleQuickDm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !quickDmText.trim()) return;

    db.addActivity({
      client_id: selectedClient.id,
      client_name: selectedClient.name,
      type: 'dm',
      outcome: quickDmText.trim(),
      author_id: activeUser.id,
      author_name: activeUser.name,
    });

    setQuickDmText('');
    refreshClients();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1A20]">
        <div>
          <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">Client Directory</h1>
          <p className="text-xs text-[#828290] mt-1">
            Accounts, communication history, and revenue metrics.
          </p>
        </div>

        {canWrite && (
          <button
            onClick={() => {
              setEditingClient(null);
              setIsClientModalOpen(true);
            }}
            className="hesics-btn-primary self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Add Client
          </button>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#585866]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients by name, company, or email..."
            className="hesics-input pl-10"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-[#09090C] border border-[#1C1C22] p-1 rounded-xl">
          {(['all', 'lead', 'active', 'churned'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3.5 py-1.5 text-xs rounded-lg capitalize font-medium transition-all ${
                selectedStatus === st
                  ? 'bg-[#77727E] text-white font-semibold shadow-md'
                  : 'text-[#707080] hover:text-[#D4D4D8]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Client Roster List */}
        <div className="hesics-card overflow-hidden lg:col-span-2">
          <div className="divide-y divide-[#17171E]">
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#555565]">
                No clients match your filter query.
              </div>
            ) : (
              filtered.map((c) => {
                const isSelected = selectedClient?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedClient(c)}
                    className={`p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#15151C]' : 'hover:bg-[#111116]'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#F4F4F6] truncate">{c.name}</span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${statusBadge[c.status]}`}>
                          {c.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#707080] flex items-center gap-3">
                        {c.company_name && <span>{c.company_name}</span>}
                        {c.email && <span>{c.email}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {canWrite && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingClient(c);
                            setIsClientModalOpen(true);
                          }}
                          className="p-1.5 text-[#707080] hover:text-white hover:bg-[#1E1E28] rounded transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClient(c);
                          }}
                          className="p-1.5 text-[#707080] hover:text-rose-400 hover:bg-rose-950/20 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Client Detail Panel */}
        <div className="hesics-card p-6 space-y-5">
          {selectedClient ? (
            <div className="space-y-4">
              <div className="border-b border-[#1A1A22] pb-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#F4F4F6]">{selectedClient.name}</h2>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${statusBadge[selectedClient.status]}`}>
                    {selectedClient.status}
                  </span>
                </div>
                {selectedClient.company_name && (
                  <div className="text-xs text-[#808090]">{selectedClient.company_name}</div>
                )}
              </div>

              {/* Contact Info */}
              <div className="space-y-2 text-xs">
                {selectedClient.email && (
                  <div className="flex items-center gap-2 text-[#9090A0]">
                    <Mail className="w-3.5 h-3.5 text-[#77727E]" />
                    <span>{selectedClient.email}</span>
                  </div>
                )}
                {selectedClient.phone && (
                  <div className="flex items-center gap-2 text-[#9090A0]">
                    <Phone className="w-3.5 h-3.5 text-[#77727E]" />
                    <span>{selectedClient.phone}</span>
                  </div>
                )}
              </div>

              {/* Quick DM Note */}
              <form onSubmit={handleQuickDm} className="space-y-2 pt-2 border-t border-[#1A1A22]">
                <label className="hesics-label">Log Quick DM / Call Note</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickDmText}
                    onChange={(e) => setQuickDmText(e.target.value)}
                    placeholder="e.g. Call completed, requested quote..."
                    className="hesics-input text-xs"
                  />
                  <button type="submit" className="hesics-btn-primary px-3">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#555565]">
              Select a client to view details and communication logs.
            </div>
          )}
        </div>
      </div>

      {/* Client Modal */}
      {isClientModalOpen && (
        <ClientModal
          isOpen={isClientModalOpen}
          onClose={() => {
            setIsClientModalOpen(false);
            setEditingClient(null);
          }}
          onSuccess={refreshClients}
          client={editingClient || undefined}
          activeUser={activeUser}
        />
      )}

      {/* Activity Modal */}
      {isActivityModalOpen && selectedClient && (
        <ActivityModal
          isOpen={isActivityModalOpen}
          onClose={() => setIsActivityModalOpen(false)}
          onSuccess={refreshClients}
          clientId={selectedClient.id}
          activeUser={activeUser}
        />
      )}
    </div>
  );
};
