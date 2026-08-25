import { ClientDetail } from "./ClientDetail";
import React, { useState } from "react";
import {
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  Clock,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit3,
  UserCheck,
  MessageSquare,
  Download,
  Link2,
} from "lucide-react";
import { db } from "../lib/db/clients";
import { Client, ClientStatus, User, Activity } from "../lib/types";
import { ClientModal } from "../components/crm/ClientModal";
import { ActivityModal } from "../components/crm/ActivityModal";
import { hasPermission } from "../lib/rbac";
import {
  generateAgreementPDF,
  generateInvoicePDF,
  generateQuotationPDF,
} from "../lib/pdfEngine";
import { showToast } from "../components/common/Toast";

interface ClientsProps {
  activeUser: User;
}

const statusBadge: Record<ClientStatus, string> = {
  lead: "text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30",
  qualified: "text-sky-400 bg-sky-950/40 border-sky-800/50",
  active: "text-emerald-400 bg-emerald-950/40 border-emerald-800/50",
  at_risk: "text-orange-400 bg-orange-950/40 border-orange-800/50",
  dormant: "text-amber-400 bg-amber-950/40 border-amber-800/50",
  churned: "text-[#707080] bg-[#18181E] border-[#22222A]",
  archived: "text-[#606070] bg-[#101015] border-[#22222A]",
};

const statusLabel: Record<ClientStatus, string> = {
  lead: "Lead",
  qualified: "Qualified",
  active: "Active",
  at_risk: "At risk",
  dormant: "Dormant",
  churned: "Churned",
  archived: "Archived",
};

export const Clients: React.FC<ClientsProps> = ({ activeUser }) => {
  const [clients, setClients] = useState(() => db.getClients());
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ClientStatus | "all">(
    "all",
  );
  const [showArchived, setShowArchived] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [viewingClientId, setViewingClientId] = useState<string | null>(null);
  const [resourceTab, setResourceTab] = useState<
    "agreements" | "invoices" | "quotations" | "activities"
  >("agreements");

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [quickDmText, setQuickDmText] = useState("");

  const canWrite = hasPermission(activeUser.role_id, "clients:write");
  const canDelete = hasPermission(activeUser.role_id, "clients:delete");

  const refreshClients = () => {
    const updated = db.getClients();
    setClients(updated);
    if (selectedClient) {
      const refreshed = updated.find((c) => c.id === selectedClient.id);
      setSelectedClient(refreshed || null);
    }
  };

  React.useEffect(() => {
    refreshClients();
    const unsub = db.subscribe(() => {
      refreshClients();
    });
    return () => unsub();
  }, []);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      (c.company_name && c.company_name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q));
    const matchesStatus =
      selectedStatus === "all" || c.status === selectedStatus;
    const matchesArchive = showArchived ? c.status === "archived" : c.status !== "archived";
    return matchesSearch && matchesStatus && matchesArchive;
  });

  const handleDeleteClient = (client: Client) => {
    if (window.confirm(`Archive client "${client.name}"? This keeps the history and removes it from active views.`)) {
      db.archiveClient(client.id);
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
      type: "dm",
      outcome: quickDmText.trim(),
      author_id: activeUser.id,
      author_name: activeUser.name,
    });

    setQuickDmText("");
    refreshClients();
  };

  if (viewingClientId) {
    return (
      <ClientDetail
        clientId={viewingClientId}
        activeUser={activeUser}
        onBack={() => {
          setViewingClientId(null);
          refreshClients();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1A20]">
          <div>
            <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">
              Clients
            </h1>
            <p className="text-xs text-[#828290] mt-1">
              One workspace for relationships, follow-ups, commercial work, and history.
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
          {(["all", "lead", "qualified", "active", "at_risk", "dormant", "churned"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3.5 py-1.5 text-xs rounded-lg capitalize font-medium transition-all ${
                selectedStatus === st
                  ? "bg-[#77727E] text-white font-semibold shadow-md"
                  : "text-[#707080] hover:text-[#D4D4D8]"
              }`}
            >
              {st === "all" ? "All active" : statusLabel[st]}
            </button>
          ))}
          <button
            onClick={() => setShowArchived((value) => !value)}
            className={`px-3.5 py-1.5 text-xs rounded-lg font-medium transition-all ${showArchived ? "bg-[#77727E] text-white" : "text-[#707080] hover:text-[#D4D4D8]"}`}
          >
            {showArchived ? "Archived" : "Show archived"}
          </button>
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
                    onClick={() => {
                      setSelectedClient(c);
                      setViewingClientId(c.id);
                    }}
                    className={`p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected ? "bg-[#15151C]" : "hover:bg-[#111116]"
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#F4F4F6] truncate">
                          {c.name}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${statusBadge[c.status]}`}
                        >
                          {statusLabel[c.status]}
                        </span>
                        {c.next_action_due && (
                          <span className={`text-[9px] ${new Date(c.next_action_due) < new Date() ? "text-rose-400" : "text-[#707080]"}`}>
                            {new Date(c.next_action_due) < new Date() ? "Follow-up overdue" : "Next action"}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#707080] flex items-center gap-3">
                        {c.company_name && <span>{c.company_name}</span>}
                        {c.email && <span>{c.email}</span>}
                        {c.owner_name && <span className="hidden xl:inline">Owner: {c.owner_name}</span>}
                      </div>
                      {c.next_action && (
                        <div className="text-[10px] text-[#8D8D9A] truncate max-w-[460px]">
                          Next: {c.next_action}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {canWrite && c.status !== "archived" && (
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
                      {canDelete && c.status !== "archived" && (
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

        {/* Client Resource Hub */}
        <div
          className="hesics-card p-5 space-y-4 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 200px)" }}
        >
          {selectedClient ? (
            <div className="space-y-4">
              <div className="border-b border-[#1A1A22] pb-3 space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#F4F4F6]">
                    {selectedClient.name}
                  </h2>
                  <span
                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${statusBadge[selectedClient.status]}`}
                  >
                    {statusLabel[selectedClient.status]}
                  </span>
                </div>
                {selectedClient.company_name && (
                  <div className="text-xs text-[#808090]">
                    {selectedClient.company_name}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-lg bg-[#0A0A0E] border border-[#1A1A22] p-2">
                  <div className="text-[#606070] uppercase tracking-wider">Health</div>
                  <div className="mt-1 text-[#D4D4D8] capitalize">{selectedClient.relationship_health || "healthy"}</div>
                </div>
                <div className="rounded-lg bg-[#0A0A0E] border border-[#1A1A22] p-2">
                  <div className="text-[#606070] uppercase tracking-wider">Owner</div>
                  <div className="mt-1 text-[#D4D4D8] truncate">{selectedClient.owner_name || "Unassigned"}</div>
                </div>
              </div>
              {selectedClient.next_action && (
                <div className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-3 text-xs">
                  <div className="text-[9px] uppercase tracking-wider font-bold text-amber-400">Next action</div>
                  <div className="mt-1 text-[#D4D4D8]">{selectedClient.next_action}</div>
                  {selectedClient.next_action_due && <div className="mt-1 text-[10px] text-[#888894]">Due {new Date(selectedClient.next_action_due).toLocaleDateString()}</div>}
                </div>
              )}
              <div className="space-y-1.5 text-xs">
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
              <div className="pt-2 border-t border-[#1A1A22]">
                <div className="text-[9px] text-[#606070] uppercase tracking-wider font-bold mb-2">
                  Resources
                </div>
                <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
                  {(
                    [
                      "agreements",
                      "invoices",
                      "quotations",
                      "activities",
                    ] as const
                  ).map((t) => (
                    <button
                      key={t}
                      onClick={() => setResourceTab(t)}
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-medium whitespace-nowrap transition-all capitalize border ${resourceTab === t ? "border-[#77727E]/50 bg-[#77727E]/15 text-[#F4F4F6]" : "border-transparent text-[#707080] hover:text-[#D4D4D8] hover:bg-[#14141C]"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {resourceTab === "agreements" &&
                  (() => {
                    const agrs = db
                      .getAgreements()
                      .filter(
                        (a) =>
                          a.client_id === selectedClient.id ||
                          a.client_name === selectedClient.name,
                      );
                    if (!agrs.length)
                      return (
                        <div className="text-center py-6 text-[10px] text-[#555565]">
                          No agreements yet.
                        </div>
                      );
                    return (
                      <>
                        {agrs.map((agr) => (
                          <div
                            key={agr.id}
                            className="flex items-center justify-between p-2.5 bg-[#0A0A0E] border border-[#1A1A22] rounded-xl mb-1.5"
                          >
                            <div>
                              <div className="text-[10px] font-semibold text-[#D4D4D8]">
                                AGR-{agr.id.slice(-6).toUpperCase()}
                              </div>
                              <div
                                className={`text-[9px] ${agr.status === "signed" ? "text-emerald-400" : "text-amber-400"}`}
                              >
                                {agr.status}
                              </div>
                            </div>
                            <div className="flex gap-1.5">
                              {agr.status === "pending" && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      agr.sign_link,
                                    );
                                    showToast(
                                      "Copied",
                                      "Sign link copied",
                                      "success",
                                    );
                                  }}
                                  className="p-1 text-[#707080] hover:text-white rounded"
                                  title="Copy sign link"
                                >
                                  <Link2 className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  try {
                                    const doc = await generateAgreementPDF({
                                      clientName: agr.client_name,
                                      clientEmail: agr.client_email,
                                      clientPhone: agr.client_phone || "",
                                      clientCompany: agr.client_company,
                                      panCard: agr.pan_card,
                                      scope: agr.scope,
                                      signatureDataUrl: agr.signature_url,
                                      photoDataUrl: agr.photo_url,
                                      agreementId: agr.id,
                                      signedAt: agr.signed_at || agr.created_at,
                                      org: db.getOrg(),
                                    });
                                    const blob = doc.output("blob");
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = `${agr.client_name}_Agreement.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    setTimeout(() => {
                                      document.body.removeChild(a);
                                      URL.revokeObjectURL(url);
                                    }, 500);
                                  } catch (e) {
                                    showToast("Error", "PDF failed", "error");
                                  }
                                }}
                                className="p-1 text-[#707080] hover:text-white rounded"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                {resourceTab === "invoices" &&
                  (() => {
                    const invs = db
                      .getInvoices()
                      .filter(
                        (i) =>
                          i.client_name === selectedClient.name ||
                          (i as any).client_id === selectedClient.id,
                      );
                    if (!invs.length)
                      return (
                        <div className="text-center py-6 text-[10px] text-[#555565]">
                          No invoices.
                        </div>
                      );
                    return (
                      <>
                        {invs.map((inv) => (
                          <div
                            key={inv.id}
                            className="flex items-center justify-between p-2.5 bg-[#0A0A0E] border border-[#1A1A22] rounded-xl mb-1.5"
                          >
                            <div>
                              <div className="text-[10px] font-semibold text-[#D4D4D8]">
                                {inv.invoice_number}
                              </div>
                              <div
                                className={`text-[9px] ${inv.status === "paid" ? "text-emerald-400" : "text-amber-400"}`}
                              >
                                ₹
                                {Number(inv.total || 0).toLocaleString("en-IN")}{" "}
                                · {inv.status?.toUpperCase()}
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  const doc = await generateInvoicePDF(
                                    inv,
                                    db.getOrg(),
                                  );
                                  const blob = doc.output("blob");
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `${inv.invoice_number}.pdf`;
                                  document.body.appendChild(a);
                                  a.click();
                                  setTimeout(() => {
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                  }, 500);
                                } catch (e) {
                                  showToast("Error", "PDF failed", "error");
                                }
                              }}
                              className="p-1 text-[#707080] hover:text-white rounded"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                {resourceTab === "quotations" &&
                  (() => {
                    const qts = db
                      .getQuotations()
                      .filter(
                        (q) =>
                          q.client_name === selectedClient.name ||
                          (q as any).client_id === selectedClient.id,
                      );
                    if (!qts.length)
                      return (
                        <div className="text-center py-6 text-[10px] text-[#555565]">
                          No quotations.
                        </div>
                      );
                    return (
                      <>
                        {qts.map((qt) => (
                          <div
                            key={qt.id}
                            className="flex items-center justify-between p-2.5 bg-[#0A0A0E] border border-[#1A1A22] rounded-xl mb-1.5"
                          >
                            <div>
                              <div className="text-[10px] font-semibold text-[#D4D4D8]">
                                {qt.quotation_number ||
                                  (qt as any).quote_number}
                              </div>
                              <div className="text-[9px] text-[#77727E]">
                                ₹{Number(qt.total || 0).toLocaleString("en-IN")}
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  const doc = await generateQuotationPDF(
                                    qt,
                                    db.getOrg(),
                                  );
                                  const blob = doc.output("blob");
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `${qt.quotation_number || (qt as any).quote_number}.pdf`;
                                  document.body.appendChild(a);
                                  a.click();
                                  setTimeout(() => {
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                  }, 500);
                                } catch (e) {
                                  showToast("Error", "PDF failed", "error");
                                }
                              }}
                              className="p-1 text-[#707080] hover:text-white rounded"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                {resourceTab === "activities" &&
                  (() => {
                    const acts = db
                      .getActivities(selectedClient.id)
                      .slice(0, 10);
                    if (!acts.length)
                      return (
                        <div className="text-center py-6 text-[10px] text-[#555565]">
                          No activities.
                        </div>
                      );
                    return (
                      <>
                        {acts.map((act) => (
                          <div
                            key={act.id}
                            className="p-2.5 bg-[#0A0A0E] border border-[#1A1A22] rounded-xl mb-1.5"
                          >
                            <div className="text-[10px] font-semibold text-[#D4D4D8] capitalize">
                              {act.type}:{" "}
                              {(act as any).title || act.notes?.slice(0, 50)}
                            </div>
                            <div className="text-[9px] text-[#606070] mt-0.5">
                              {new Date(act.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
              </div>
              <form
                onSubmit={handleQuickDm}
                className="space-y-2 pt-2 border-t border-[#1A1A22]"
              >
                <label className="hesics-label">Log Quick Note</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickDmText}
                    onChange={(e) => setQuickDmText(e.target.value)}
                    placeholder="e.g. Call completed, quote requested..."
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
              Select a client to view resources.
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
