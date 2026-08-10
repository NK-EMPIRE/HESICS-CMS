import React, { useState } from 'react';
import {
  Plus, Search, User, Mail, Phone, Tag, Trash2, Clock,
  FileText, Kanban, MessageSquare, AlertCircle, ChevronRight, X
} from 'lucide-react';
import { db } from '../lib/supabase';
import { Client, ClientStatus, User as UserType, Activity, Deal, Quotation, Invoice } from '../lib/types';
import { ClientModal } from '../components/crm/ClientModal';
import { logAudit } from '../lib/auditLog';

interface ClientsProps {
  activeUser: UserType;
}

// Calculate days since last activity or updated_at
function getDaysInactive(client: Client, activities: Activity[]): number {
  const clientActs = activities.filter((a) => a.client_id === client.id);
  let latest = new Date(client.updated_at || client.created_at).getTime();
  clientActs.forEach((a) => {
    const t = new Date(a.created_at).getTime();
    if (t > latest) latest = t;
  });
  return Math.floor((Date.now() - latest) / (1000 * 60 * 60 * 24));
}

export const Clients: React.FC<ClientsProps> = ({ activeUser }) => {
  const [clients, setClients] = useState(() => db.getClients());
  const [activities, setActivities] = useState(() => db.getActivities());
  const [deals, setDeals] = useState(() => db.getDeals());
  const [quotations, setQuotations] = useState(() => db.getQuotations());
  const [invoices, setInvoices] = useState(() => db.getInvoices());

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();

  // Client Detail Timeline Drawer
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [newNote, setNewNote] = useState('');

  const refreshData = () => {
    setClients(db.getClients());
    setActivities(db.getActivities());
    setDeals(db.getDeals());
    setQuotations(db.getQuotations());
    setInvoices(db.getInvoices());
  };

  const handleDelete = (id: string) => {
    const target = clients.find((c) => c.id === id);
    if (!target || !window.confirm(`Delete client "${target.name}"?`)) return;
    db.deleteClient(id);
    logAudit(activeUser.id, activeUser.name, 'client.deleted', 'client', id, target.name);
    if (activeClient?.id === id) setActiveClient(null);
    refreshData();
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient || !newNote.trim()) return;

    db.addActivity({
      client_id: activeClient.id,
      client_name: activeClient.name,
      type: 'dm',
      outcome: newNote,
      author_id: activeUser.id,
      author_name: activeUser.name,
    });
    logAudit(activeUser.id, activeUser.name, 'client.updated', 'client', activeClient.id, activeClient.name, undefined, { note: newNote });
    setNewNote('');
    refreshData();
  };

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || c.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate merged timeline for active client
  const clientTimeline = activeClient
    ? [
        ...activities
          .filter((a) => a.client_id === activeClient.id)
          .map((a) => ({
            id: `act-${a.id}`,
            type: 'activity' as const,
            title: `Activity (${a.type})`,
            desc: a.outcome || 'Logged activity',
            date: a.created_at,
            author: a.author_name,
            icon: MessageSquare,
            color: 'text-blue-400',
          })),
        ...deals
          .filter((d) => d.client_id === activeClient.id)
          .map((d) => ({
            id: `deal-${d.id}`,
            type: 'deal' as const,
            title: `Deal: ${d.title}`,
            desc: `Stage: ${d.stage.toUpperCase()} · Value: ₹${Number(d.value).toLocaleString('en-IN')}`,
            date: d.updated_at || d.created_at,
            author: d.owner_name,
            icon: Kanban,
            color: 'text-violet-400',
          })),
        ...quotations
          .filter((q) => q.client_id === activeClient.id)
          .map((q) => ({
            id: `quote-${q.id}`,
            type: 'quote' as const,
            title: `Quotation #${q.quote_number}`,
            desc: `Amount: ₹${q.total.toLocaleString('en-IN')} · Status: ${q.status}`,
            date: q.created_at,
            author: undefined,
            icon: FileText,
            color: 'text-amber-400',
          })),
        ...invoices
          .filter((i) => i.client_id === activeClient.id)
          .map((i) => ({
            id: `inv-${i.id}`,
            type: 'invoice' as const,
            title: `Invoice #${i.invoice_number}`,
            desc: `Total: ₹${i.total.toLocaleString('en-IN')} · Status: ${i.status.toUpperCase()}`,
            date: i.paid_at || i.created_at,
            author: undefined,
            icon: FileText,
            color: i.status === 'paid' ? 'text-emerald-400' : 'text-red-400',
          })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1a1a1a]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Clients Directory</h1>
          <p className="text-[11px] text-[#555555] mt-0.5">
            Manage relationships, track timelines, surface cold clients
          </p>
        </div>
        <button
          onClick={() => {
            setEditingClient(undefined);
            setIsClientModalOpen(true);
          }}
          className="notion-button bg-[#1E9EFF] hover:bg-[#0A8AE6] text-white font-semibold text-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Add Client
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#444444]" />
          <input
            type="text"
            placeholder="Search by name, company, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl text-xs text-white placeholder-[#333333] focus:outline-none focus:border-[#1E9EFF]/40"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['all', 'lead', 'active', 'churned'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                selectedStatus === st
                  ? 'bg-[#1E9EFF]/15 text-[#1E9EFF] border border-[#1E9EFF]/30'
                  : 'bg-[#0d0d0d] text-[#555555] border border-[#141414] hover:text-[#aaaaaa]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main View: Table + Timeline Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Clients Table */}
        <div className={`${activeClient ? 'lg:col-span-7' : 'lg:col-span-12'} transition-all space-y-2`}>
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#141414] bg-[#0a0a0a] text-[10px] uppercase font-semibold text-[#555555]">
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-[#444444] text-xs">
                      No clients found.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => {
                    const daysInactive = getDaysInactive(client, activities);
                    const isCold = client.status === 'active' && daysInactive >= 30;
                    const isSelected = activeClient?.id === client.id;

                    return (
                      <tr
                        key={client.id}
                        onClick={() => setActiveClient(client)}
                        className={`hover:bg-[#121212] transition-colors cursor-pointer ${
                          isSelected ? 'bg-[#161616]' : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white flex items-center gap-2">
                            {client.name}
                            {isCold && (
                              <span className="flex items-center gap-1 text-[9px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-900/50 px-1.5 py-0.5 rounded-full" title={`${daysInactive} days without activity`}>
                                <AlertCircle className="w-2.5 h-2.5" /> Going Cold ({daysInactive}d)
                              </span>
                            )}
                          </div>
                          {client.company_name && (
                            <div className="text-[10px] text-[#555555]">{client.company_name}</div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[10px] font-mono text-[#888888] capitalize">
                            {client.source.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              client.status === 'active'
                                ? 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40'
                                : client.status === 'lead'
                                ? 'text-[#1E9EFF] bg-[#1E9EFF]/10 border-[#1E9EFF]/20'
                                : 'text-red-400 bg-red-950/30 border-red-900/40'
                            }`}
                          >
                            {client.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setActiveClient(client)}
                              className="p-1 text-[#555555] hover:text-[#1E9EFF] rounded transition-colors"
                              title="View Timeline"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(client.id)}
                              className="p-1 text-[#333333] hover:text-red-400 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Unified Client Timeline Drawer */}
        {activeClient && (
          <div className="lg:col-span-5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 space-y-4 relative sticky top-16">
            <button
              onClick={() => setActiveClient(null)}
              className="absolute right-3 top-3 p-1 text-[#555555] hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile Info */}
            <div className="border-b border-[#141414] pb-3 space-y-1.5">
              <div className="text-xs font-semibold text-[#1E9EFF] uppercase tracking-wider">Client Profile</div>
              <h2 className="text-base font-bold text-white">{activeClient.name}</h2>
              {activeClient.company_name && (
                <div className="text-xs text-[#888888]">{activeClient.company_name}</div>
              )}
              <div className="flex items-center gap-3 text-[11px] text-[#555555] pt-1">
                {activeClient.email && (
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-[#444444]" /> {activeClient.email}</span>
                )}
                {activeClient.phone && (
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-[#444444]" /> {activeClient.phone}</span>
                )}
              </div>
            </div>

            {/* Quick Add Note */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#555555]">
                Quick Note / Activity Log
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type note or update..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-[#080808] border border-[#1a1a1a] rounded-lg text-xs text-white placeholder-[#333333] focus:outline-none focus:border-[#1E9EFF]/40"
                />
                <button
                  type="submit"
                  disabled={!newNote.trim()}
                  className="px-3 py-1.5 bg-[#1E9EFF] hover:bg-[#0A8AE6] disabled:opacity-40 text-white font-semibold text-xs rounded-lg transition-colors shrink-0"
                >
                  Save
                </button>
              </div>
            </form>

            {/* Unified Chronological Timeline */}
            <div className="space-y-2 pt-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#555555] flex items-center justify-between">
                <span>Unified Activity Timeline</span>
                <span className="text-[#333333] font-mono">{clientTimeline.length} events</span>
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {clientTimeline.length === 0 ? (
                  <div className="py-8 text-center text-[10px] text-[#444444]">No activity recorded yet.</div>
                ) : (
                  clientTimeline.map((ev) => {
                    const Icon = ev.icon;
                    return (
                      <div key={ev.id} className="p-2.5 bg-[#080808] border border-[#141414] rounded-lg space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-semibold flex items-center gap-1.5 ${ev.color}`}>
                            <Icon className="w-3.5 h-3.5" /> {ev.title}
                          </span>
                          <span className="text-[9px] text-[#444444] font-mono">
                            {new Date(ev.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#888888] pl-5">{ev.desc}</div>
                        {ev.author && (
                          <div className="text-[9px] text-[#333333] pl-5">by {ev.author}</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={refreshData}
        initialData={editingClient}
      />
    </div>
  );
};
