import React, { useState } from 'react';
import {
  Plus, DollarSign, Calendar,
  MoreVertical, Edit3, Trash2,
  ChevronRight, Kanban, CheckCircle2
} from 'lucide-react';
import { db } from '../lib/firebaseDb';
import { Deal, DealStage, User } from '../lib/types';
import { DealModal } from '../components/crm/DealModal';
import { hasPermission } from '../lib/rbac';

interface DealsKanbanProps {
  activeUser: User;
}

const STAGES: { id: DealStage; label: string; color: string }[] = [
  { id: 'discovery', label: 'Discovery', color: 'border-blue-500/30 text-blue-400' },
  { id: 'proposal', label: 'Proposal Sent', color: 'border-indigo-500/30 text-indigo-400' },
  { id: 'negotiation', label: 'Negotiation', color: 'border-amber-500/30 text-amber-400' },
  { id: 'won', label: 'Closed Won', color: 'border-emerald-500/30 text-emerald-400' },
  { id: 'lost', label: 'Closed Lost', color: 'border-rose-500/30 text-rose-400' },
];

export const DealsKanban: React.FC<DealsKanbanProps> = ({ activeUser }) => {
  const [deals, setDeals] = useState(() => db.getDeals());
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const canWrite = hasPermission(activeUser.role_id, 'deals:write');

  const refreshDeals = () => setDeals(db.getDeals());

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  const handleStageChange = (deal: Deal, newStage: DealStage) => {
    db.updateDeal(deal.id, { stage: newStage });
    refreshDeals();
  };

  const handleDeleteDeal = (deal: Deal) => {
    if (window.confirm(`Delete deal "${deal.title}"?`)) {
      db.deleteDeal(deal.id);
      refreshDeals();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1A20]">
        <div>
          <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">Deals Board</h1>
          <p className="text-xs text-[#828290] mt-1">
            Visual revenue pipeline stages and deal momentum.
          </p>
        </div>

        {canWrite && (
          <button
            onClick={() => {
              setEditingDeal(null);
              setIsDealModalOpen(true);
            }}
            className="hesics-btn-primary self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Create Deal
          </button>
        )}
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.id);
          const stageTotal = stageDeals.reduce((sum, d) => sum + Number(d.value), 0);

          return (
            <div key={stage.id} className="bg-[#09090C] border border-[#1A1A20] rounded-xl p-3 space-y-3 min-w-[220px]">
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-[#16161D] pb-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-[#F4F4F6]">
                  <span className={`w-2 h-2 rounded-full border ${stage.color}`} />
                  <span>{stage.label}</span>
                  <span className="text-[10px] text-[#606070] font-mono">({stageDeals.length})</span>
                </div>
                <span className="font-mono text-[10px] text-[#808090]">{fmt(stageTotal)}</span>
              </div>

              {/* Deal Cards Container */}
              <div className="space-y-2.5 min-h-[300px]">
                {stageDeals.length === 0 ? (
                  <div className="h-32 border border-dashed border-[#181820] rounded-lg flex items-center justify-center text-[10px] text-[#454555]">
                    No active deals
                  </div>
                ) : (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="bg-[#0F0F14] border border-[#1E1E26] hover:border-[#2C2C38] rounded-xl p-3 space-y-2.5 transition-all shadow-md group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-bold text-[#F4F4F6] line-clamp-1 leading-snug">{deal.title}</h3>
                        {canWrite && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingDeal(deal);
                                setIsDealModalOpen(true);
                              }}
                              className="p-1 text-[#707080] hover:text-white rounded"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteDeal(deal)}
                              className="p-1 text-[#707080] hover:text-rose-400 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {deal.client_name && (
                        <div className="text-[11px] text-[#808090] truncate">
                          {deal.client_name}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#181822]">
                        <span className="font-bold text-[#1E9EFF] font-mono">{fmt(deal.value)}</span>
                        {deal.expected_close_date && (
                          <span className="text-[10px] text-[#606070] flex items-center gap-1 font-mono">
                            <Calendar className="w-2.5 h-2.5" />
                            {deal.expected_close_date.split('T')[0]}
                          </span>
                        )}
                      </div>

                      {/* Quick Move Stage dropdown */}
                      {canWrite && (
                        <select
                          value={deal.stage}
                          onChange={(e) => handleStageChange(deal, e.target.value as DealStage)}
                          className="w-full text-[10px] bg-[#09090C] border border-[#1A1A22] rounded px-2 py-1 text-[#9090A0] focus:outline-none focus:border-[#1E9EFF]/40"
                        >
                          {STAGES.map((s) => (
                            <option key={s.id} value={s.id}>
                              Move to: {s.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deal Modal */}
      {isDealModalOpen && (
        <DealModal
          isOpen={isDealModalOpen}
          onClose={() => {
            setIsDealModalOpen(false);
            setEditingDeal(null);
          }}
          onSuccess={refreshDeals}
          deal={editingDeal || undefined}
          activeUser={activeUser}
        />
      )}

    </div>
  );
};