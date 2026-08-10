import React, { useState } from 'react';
import {
  Search, Plus, Mail, Phone, Tag, Clock, Trash2, Edit3
} from 'lucide-react';
import { db } from '../lib/supabase';
import { Client, User } from '../lib/types';
import { ClientModal } from '../components/crm/ClientModal';
import { ActivityModal } from '../components/crm/ActivityModal';

interface ClientsProps {
  activeUser: User;
}

export const Clients: React.FC<ClientsProps> = ({ activeUser }) => {
  const [clients, setClients] = useState(db.getClients());
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();

  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();

  const refreshData = () => {
    setClients(db.getClients());
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this client profile?')) {
      db.deleteClient(id);
      refreshData();
    }
  };

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company_name && c.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSource = sourceFilter === 'all' || c.source === sourceFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

    return matchesSearch && matchesSource && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="space-y-1 pb-3 border-b border-[#1a1a1a]">
        <div className="text-2xl">📂</div>
        <h1 className="text-xl font-bold text-white tracking-tight">Clients Directory</h1>
        <p className="text-xs text-[#888888]">
          Centralized contact database with source tagging and touchpoint history.
        </p>
      </div>

      {/* Notion Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-[#777777] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#0a0a0a] border border-[#1e1e1e] rounded-md text-xs text-white placeholder-[#666666] focus:outline-none focus:border-[#444444]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#0a0a0a] border border-[#1e1e1e] rounded-md text-xs text-[#aaaaaa] focus:outline-none"
          >
            <option value="all">All Sources</option>
            <option value="referral">Referral</option>
            <option value="instagram">Instagram</option>
            <option value="cold_dm">Cold DM</option>
            <option value="website">Website</option>
          </select>

          <button
            onClick={() => {
              setEditingClient(undefined);
              setIsClientModalOpen(true);
            }}
            className="notion-button bg-[#1E9EFF] hover:bg-[#0A8AE6] text-white font-medium text-xs ml-auto"
          >
            <Plus className="w-3.5 h-3.5" /> New Client
          </button>
        </div>
      </div>

      {/* Notion Database Table View */}
      {filteredClients.length === 0 ? (
        <div className="p-12 notion-card text-center border-dashed border-[#151515] space-y-2">
          <p className="text-xs text-[#777777]">No clients found in directory.</p>
          <button
            onClick={() => {
              setEditingClient(undefined);
              setIsClientModalOpen(true);
            }}
            className="text-xs text-white underline hover:text-[#1E9EFF]"
          >
            + Add your first client
          </button>
        </div>
      ) : (
        <div className="notion-card overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1c1c1c] border-b border-[#181818] text-[#888888] font-medium">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Company</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Source</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111111] text-[#cccccc]">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-[#111111] transition-colors">
                  <td className="p-3 font-semibold text-white">{client.name}</td>
                  <td className="p-3 text-[#aaaaaa]">{client.company_name || '—'}</td>
                  <td className="p-3 space-y-0.5">
                    {client.email && <div className="text-[11px] text-[#888888]">{client.email}</div>}
                    {client.phone && <div className="text-[10px] text-[#666666]">{client.phone}</div>}
                  </td>
                  <td className="p-3 capitalize text-[#888888]">{client.source}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded ${
                        client.status === 'active'
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40'
                          : 'bg-[#181818] text-[#aaaaaa]'
                      }`}
                    >
                      {client.status}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1">
                    <button
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setIsActivityModalOpen(true);
                      }}
                      className="px-2 py-1 bg-[#181818] hover:bg-[#333333] text-[#cccccc] rounded text-[10px]"
                    >
                      + Touchpoint
                    </button>
                    <button
                      onClick={() => {
                        setEditingClient(client);
                        setIsClientModalOpen(true);
                      }}
                      className="p-1 text-[#777777] hover:text-white"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="p-1 text-[#777777] hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={refreshData}
        initialData={editingClient}
      />
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSuccess={refreshData}
        clientId={selectedClientId}
        activeUser={activeUser}
      />
    </div>
  );
};
