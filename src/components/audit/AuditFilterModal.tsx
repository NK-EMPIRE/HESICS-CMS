import React, { useState } from "react";
import {
  X,
  Filter,
  RotateCcw,
  Calendar,
  Check,
  Users,
  Tag,
  ShieldCheck,
} from "lucide-react";
import { CustomSelect, Option } from "../common/CustomSelect";
import { DatePicker } from "../common/DatePicker";

export interface AuditFilterState {
  searchQuery: string;
  category: string;
  actorUserId: string;
  startDate: string;
  endDate: string;
}

interface AuditFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AuditFilterState;
  onApplyFilters: (filters: AuditFilterState) => void;
  onResetFilters: () => void;
  userOptions: Option[];
}

const CATEGORY_OPTIONS: Option[] = [
  { value: "ALL", label: "All Event Categories" },
  {
    value: "CRM",
    label: "CRM & Pipeline Operations",
    badge: "CRM",
    badgeColor: "text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30",
  },
  {
    value: "Billing",
    label: "Invoices & Quotations",
    badge: "Billing",
    badgeColor: "text-indigo-300 bg-indigo-950/40 border-indigo-800/50",
  },
  {
    value: "Finance",
    label: "Inflows & Expenditures",
    badge: "Finance",
    badgeColor: "text-emerald-400 bg-emerald-950/40 border-emerald-800/50",
  },
  {
    value: "Team",
    label: "Team Governance & RBAC",
    badge: "Team",
    badgeColor: "text-amber-300 bg-amber-950/40 border-amber-800/50",
  },
  {
    value: "Security",
    label: "Auth & Private Vault",
    badge: "Security",
    badgeColor: "text-rose-300 bg-rose-950/40 border-rose-800/50",
  },
  {
    value: "Settings",
    label: "Organization Settings",
    badge: "Settings",
    badgeColor: "text-[#808090] bg-[#14141A] border-[#202028]",
  },
];

export const AuditFilterModal: React.FC<AuditFilterModalProps> = ({
  isOpen,
  onClose,
  filters: initialFilters,
  onApplyFilters,
  onResetFilters,
  userOptions,
}) => {
  const [localFilters, setLocalFilters] =
    useState<AuditFilterState>(initialFilters);

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    onResetFilters();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-confirmDialog flex items-center justify-center p-4">
      <div className="bg-[#0D0D11] border border-[#22222B] rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-7 pb-12 space-y-6 shadow-2xl shadow-black/80">
        <div className="flex items-center justify-between border-b border-[#1C1C26] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
              <Filter className="w-4 h-4 text-[#77727E]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F4F4F6] tracking-tight font-display">
                Unified Audit Trail Filter
              </h2>
              <p className="text-xs text-[#808090]">
                Filter system-wide operational events by actor, category, date
                range, and keyword.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#606070] hover:text-white p-1.5 rounded-lg hover:bg-[#16161D]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleApply} className="space-y-5">
          {/* Keyword Search */}
          <div>
            <label className="hesics-label">
              Search Keyword / Entity Label
            </label>
            <input
              type="text"
              value={localFilters.searchQuery}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  searchQuery: e.target.value,
                })
              }
              placeholder="e.g. Apex Global, INV-2026, Sheik Mydeen..."
              className="hesics-input text-xs"
              autoFocus
            />
          </div>

          {/* Category Classification */}
          <div>
            <label className="hesics-label">Event Domain Category</label>
            <CustomSelect
              value={localFilters.category}
              onChange={(cat) =>
                setLocalFilters({ ...localFilters, category: cat })
              }
              options={CATEGORY_OPTIONS}
            />
          </div>

          {/* Actor / User Filter */}
          <div>
            <label className="hesics-label">Originating Actor / User</label>
            <CustomSelect
              value={localFilters.actorUserId}
              onChange={(uid) =>
                setLocalFilters({ ...localFilters, actorUserId: uid })
              }
              options={[
                { value: "ALL", label: "All Team Members & Automated System" },
                ...userOptions,
              ]}
              searchable
            />
          </div>

          {/* Date Range Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="hesics-label">From Date</label>
              <DatePicker
                value={localFilters.startDate}
                onChange={(date) =>
                  setLocalFilters({ ...localFilters, startDate: date })
                }
                placeholder="Earliest date..."
              />
            </div>
            <div>
              <label className="hesics-label">To Date</label>
              <DatePicker
                value={localFilters.endDate}
                onChange={(date) =>
                  setLocalFilters({ ...localFilters, endDate: date })
                }
                placeholder="Latest date..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#1A1A22]">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-[#707080] hover:text-white flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-[#14141C] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="hesics-btn-ghost text-xs"
              >
                Cancel
              </button>
              <button type="submit" className="hesics-btn-primary text-xs px-6">
                <Check className="w-3.5 h-3.5" /> Apply Filters
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
