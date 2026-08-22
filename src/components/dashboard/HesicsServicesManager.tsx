import React, { useState } from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  DollarSign,
  Check,
  X,
  Shield,
  Layers,
} from "lucide-react";
import { db } from "../../lib/firebaseDb";
import { HesicsService, User } from "../../lib/types";
import { isMasterRoot } from "../../lib/rbac";
import { showToast } from "../common/Toast";

interface HesicsServicesManagerProps {
  activeUser: User;
  onServiceUpdated?: () => void;
}

export const HesicsServicesManager: React.FC<HesicsServicesManagerProps> = ({
  activeUser,
  onServiceUpdated,
}) => {
  const isChief =
    isMasterRoot(activeUser.email) || activeUser.hierarchy === "founder";
  if (!isChief) return null;

  const [services, setServices] = useState<HesicsService[]>(() =>
    db.getServices(),
  );
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Technology & Engineering");
  const [rate, setRate] = useState("");
  const [description, setDescription] = useState("");

  const refreshServices = () => {
    const updated = db.getServices();
    setServices(updated);
    if (onServiceUpdated) onServiceUpdated();
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rate) return;

    if (editingId) {
      db.updateService(editingId, {
        name: name.trim(),
        category: category.trim(),
        default_rate: Number(rate),
        description: description.trim() || undefined,
      });
      showToast(
        "Service Updated",
        `"${name}" rates updated in master catalog.`,
      );
    } else {
      db.addService({
        name: name.trim(),
        category: category.trim(),
        default_rate: Number(rate),
        description: description.trim() || undefined,
        is_active: true,
      });
      showToast("Service Added", `"${name}" added to HESICS services catalog.`);
    }

    setName("");
    setRate("");
    setDescription("");
    setIsAdding(false);
    setEditingId(null);
    refreshServices();
  };

  const handleEdit = (srv: HesicsService) => {
    setEditingId(srv.id);
    setName(srv.name);
    setCategory(srv.category);
    setRate(String(srv.default_rate));
    setDescription(srv.description || "");
    setIsAdding(true);
  };

  const handleDelete = (id: string, srvName: string) => {
    if (window.confirm(`Delete "${srvName}" from master services catalog?`)) {
      db.deleteService(id);
      showToast("Service Removed", `"${srvName}" removed from catalog.`);
      refreshServices();
    }
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="hesics-card p-6 space-y-5 border-[#2A2A38] bg-gradient-to-b from-[#0E0E14] to-[#0A0A0E]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1C1C26]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#77727E]/20 border border-[#77727E]/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#77727E]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#F4F4F6] font-display tracking-tight">
                HESICS Master Services & Pricing Catalog
              </h2>
              <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-md bg-[#77727E]/20 border border-[#77727E]/40 text-[#D4D4D8] font-bold">
                Chief Only
              </span>
            </div>
            <p className="text-[11px] text-[#808090]">
              Define standardized deliverables and default commercial pricing
              for 1-click invoice & quotation mapping.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isAdding) {
              setIsAdding(false);
              setEditingId(null);
            } else {
              setName("");
              setRate("");
              setDescription("");
              setEditingId(null);
              setIsAdding(true);
            }
          }}
          className="hesics-btn-primary self-start sm:self-auto text-xs"
        >
          {isAdding ? (
            <X className="w-3.5 h-3.5" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          <span>{isAdding ? "Close Form" : "Add Service"}</span>
        </button>
      </div>

      {/* Add / Edit Form */}
      {isAdding && (
        <form
          onSubmit={handleSaveService}
          className="p-4 bg-[#08080A] border border-[#22222E] rounded-2xl space-y-4 animate-in fade-in duration-150"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="hesics-label">
                Service Deliverable Title *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Enterprise Business OS Architecture & Cloud Infra"
                className="hesics-input text-xs"
                autoFocus
              />
            </div>
            <div>
              <label className="hesics-label">
                Default Commercial Rate (₹ INR) *
              </label>
              <input
                type="number"
                required
                min="1000"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="500000"
                className="hesics-input text-xs font-mono font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="hesics-label">Category Classification</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Technology, AI Automation, Retainer"
                className="hesics-input text-xs"
              />
            </div>
            <div>
              <label className="hesics-label">
                Scope Description & Key Deliverables
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key outcomes, milestones, or architecture scope..."
                className="hesics-input text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#181822]">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
              }}
              className="hesics-btn-ghost text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="hesics-btn-primary text-xs px-5">
              {editingId ? "Update Service" : "Save to Catalog"}
            </button>
          </div>
        </form>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.map((srv) => (
          <div
            key={srv.id}
            className="p-5 bg-[#08080B] border border-[#1A1A24] hover:border-[#77727E]/50 rounded-2xl space-y-2.5 transition-all group relative"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-bold text-[#F4F4F6] group-hover:text-white leading-tight">
                {srv.name}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleEdit(srv)}
                  className="p-1 text-[#707080] hover:text-white rounded"
                  title="Edit Rate"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(srv.id, srv.name)}
                  className="p-1 text-[#707080] hover:text-rose-400 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {srv.description && (
              <p className="text-[11px] text-[#707080] line-clamp-2 leading-relaxed">
                {srv.description}
              </p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#14141C] text-xs">
              <span className="text-[10px] text-[#606070] font-mono">
                {srv.category}
              </span>
              <span className="font-mono font-bold text-[#F4F4F6] text-sm">
                {fmt(srv.default_rate)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
