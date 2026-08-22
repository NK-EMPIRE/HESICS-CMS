import React, { useState } from "react";
import {
  Lock,
  Shield,
  Plus,
  Trash2,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  CheckSquare,
  Calendar,
} from "lucide-react";
import { db } from "../lib/firebaseDb";
import { PrivateVaultItem, User } from "../lib/types";
import { showToast } from "../components/common/Toast";

interface PrivateSpaceProps {
  activeUser: User;
}

export const PrivateSpace: React.FC<PrivateSpaceProps> = ({ activeUser }) => {
  const [items, setItems] = useState<PrivateVaultItem[]>(() =>
    db.getPrivateVaultItems(),
  );
  const [activeTab, setActiveTab] = useState<
    "all" | "finance" | "clients" | "notes" | "tasks"
  >("all");

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [type, setType] = useState<PrivateVaultItem["type"]>("note");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [content, setContent] = useState("");

  const refreshItems = () => setItems(db.getPrivateVaultItems());

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    db.addPrivateVaultItem({
      type,
      title: title.trim(),
      amount: amount ? Number(amount) : undefined,
      category: category.trim() || undefined,
      client_contact: clientContact.trim() || undefined,
      due_date: dueDate || undefined,
      content: content.trim() || undefined,
      is_completed: false,
    });

    showToast("Vault Record Stored", `Saved "${title}" in your private space.`);
    setTitle("");
    setAmount("");
    setCategory("");
    setClientContact("");
    setDueDate("");
    setContent("");
    setIsAdding(false);
    refreshItems();
  };

  const handleDeleteItem = (id: string, itemTitle: string) => {
    if (window.confirm(`Delete private vault entry "${itemTitle}"?`)) {
      db.deletePrivateVaultItem(id);
      showToast("Record Deleted", `Removed "${itemTitle}" from private vault.`);
      refreshItems();
    }
  };

  const handleToggleTask = (item: PrivateVaultItem) => {
    db.updatePrivateVaultItem(item.id, { is_completed: !item.is_completed });
    refreshItems();
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === "all") return true;
    if (activeTab === "finance")
      return item.type === "income" || item.type === "expense";
    if (activeTab === "clients") return item.type === "client";
    if (activeTab === "notes") return item.type === "note";
    if (activeTab === "tasks") return item.type === "task";
    return true;
  });

  const privateIncomes = items
    .filter((i) => i.type === "income")
    .reduce((sum, i) => sum + (i.amount || 0), 0);
  const privateExpenses = items
    .filter((i) => i.type === "expense")
    .reduce((sum, i) => sum + (i.amount || 0), 0);
  const privateNet = privateIncomes - privateExpenses;

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1A20]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#77727E]/20 border border-[#77727E]/40 flex items-center justify-center">
              <Lock className="w-4 h-4 text-[#77727E]" />
            </div>
            <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">
              Superadmin Private Vault & Executive Space
            </h1>
          </div>
          <p className="text-xs text-[#828290] mt-1">
            Zero-knowledge isolated workspace for confidential cash tracking,
            private clients, strategic notes, and executive tasks.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="hesics-btn-primary self-start sm:self-auto text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAdding ? "Close Form" : "New Vault Entry"}</span>
        </button>
      </div>

      {/* KPI Cards for Private Ledger */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="hesics-card p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#808090]">
            <span>Private Inflow Treasury</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-[#F4F4F6] font-mono">
            {fmt(privateIncomes)}
          </div>
        </div>

        <div className="hesics-card p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#808090]">
            <span>Private Outlays</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-[#F4F4F6] font-mono">
            {fmt(privateExpenses)}
          </div>
        </div>

        <div className="hesics-card p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#808090]">
            <span>Net Private Balance</span>
            <Shield className="w-4 h-4 text-[#77727E]" />
          </div>
          <div
            className={`text-xl font-bold font-mono ${privateNet >= 0 ? "text-emerald-400" : "text-rose-400"}`}
          >
            {fmt(privateNet)}
          </div>
        </div>
      </div>

      {/* Add New Entry Form */}
      {isAdding && (
        <form
          onSubmit={handleAddItem}
          className="p-6 bg-[#0D0D12] border border-[#262634] rounded-3xl space-y-4 shadow-2xl animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-[#1C1C26] pb-3">
            <h3 className="text-xs font-bold text-[#F4F4F6] uppercase tracking-wider">
              New Private Vault Record
            </h3>
            <div className="flex items-center gap-1.5 bg-[#08080A] p-1 rounded-xl border border-[#1A1A24]">
              {(["note", "income", "expense", "client", "task"] as const).map(
                (t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`px-3 py-1 text-xs rounded-lg capitalize font-medium transition-all ${
                      type === t
                        ? "bg-[#77727E] text-white font-semibold"
                        : "text-[#707080] hover:text-[#D4D4D8]"
                    }`}
                  >
                    {t}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="hesics-label">Record Title / Entity *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Confidential Strategic Deal / Offshore Retainer"
                className="hesics-input text-xs"
                autoFocus
              />
            </div>

            {(type === "income" || type === "expense") && (
              <div>
                <label className="hesics-label">Amount (₹ INR) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="250000"
                  className="hesics-input text-xs font-mono font-semibold"
                />
              </div>
            )}

            {type === "client" && (
              <div>
                <label className="hesics-label">Private Contact & Phone</label>
                <input
                  type="text"
                  value={clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                  placeholder="name@confidential.com / +91 99999..."
                  className="hesics-input text-xs font-mono"
                />
              </div>
            )}

            {type === "task" && (
              <div>
                <label className="hesics-label">Due Target Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="hesics-input text-xs font-mono"
                />
              </div>
            )}
          </div>

          <div>
            <label className="hesics-label">Confidential Brief & Notes</label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Encrypted notes, private deliverables, NDA terms, or reminders..."
              className="hesics-input text-xs resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#181822]">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="hesics-btn-ghost text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="hesics-btn-primary text-xs px-6">
              Save to Private Vault
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-[#09090C] border border-[#1C1C22] p-1 rounded-xl w-fit">
        {(["all", "finance", "clients", "notes", "tasks"] as const).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 text-xs rounded-lg capitalize font-medium transition-all ${
                activeTab === tab
                  ? "bg-[#77727E] text-white font-semibold shadow-md"
                  : "text-[#707080] hover:text-[#D4D4D8]"
              }`}
            >
              {tab}
            </button>
          ),
        )}
      </div>

      {/* Vault Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="hesics-card p-12 text-center text-xs text-[#505060]">
            Your private vault is currently empty. Click "New Vault Entry" above
            to add confidential records.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="hesics-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-[#77727E]/40"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-md bg-[#77727E]/15 border border-[#77727E]/30 text-[#D4D4D8] font-bold">
                    {item.type}
                  </span>
                  <h4
                    className={`text-xs font-bold text-[#F4F4F6] truncate ${item.is_completed ? "line-through opacity-50" : ""}`}
                  >
                    {item.title}
                  </h4>
                </div>

                {item.content && (
                  <p className="text-xs text-[#808090] leading-relaxed line-clamp-2">
                    {item.content}
                  </p>
                )}

                <div className="flex items-center gap-4 text-[11px] text-[#606070] font-mono pt-1">
                  {item.amount !== undefined && (
                    <span
                      className={`font-bold ${item.type === "income" ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {item.type === "income" ? "+" : "-"}
                      {fmt(item.amount)}
                    </span>
                  )}
                  {item.client_contact && (
                    <span>Contact: {item.client_contact}</span>
                  )}
                  {item.due_date && <span>Due: {item.due_date}</span>}
                  <span>
                    Saved: {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.type === "task" && (
                  <button
                    type="button"
                    onClick={() => handleToggleTask(item)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      item.is_completed
                        ? "bg-emerald-950/40 border-emerald-800 text-emerald-400"
                        : "bg-[#14141C] border-[#22222E] text-[#707080] hover:text-white"
                    }`}
                    title="Toggle Task Completed"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id, item.title)}
                  className="p-1.5 text-[#606070] hover:text-rose-400 p-1 rounded-lg hover:bg-rose-950/20 transition-colors"
                  title="Remove from Vault"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
