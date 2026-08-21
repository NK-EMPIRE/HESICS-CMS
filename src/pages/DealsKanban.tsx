import React, { useState } from 'react';
import {
  Plus, MoreVertical, Calendar, User as UserIcon,
  CheckCircle, ArrowRight, Pencil, Trash2
} from 'lucide-react';
import { db } from '../lib/firebaseDb';
import { Deal, DealStage, User } from '../lib/types';
import { canPerform } from '../lib/rbac';
import { DealModal } from '../components/crm/DealModal';
import { CustomSelect, Option } from '../components/common/CustomSelect';

interface DealsKanbanProps {
  activeUser: User;
}

const STAGES: { id: DealStage; label: string; dotColor: string }[] = [
  { id: 'discovery', label: 'Discovery', dotColor: 'bg-slate-400' },
  { id: 'proposal', label: 'Proposal Sent', dotColor: 'bg-indigo-400' },
  { id: 'negotiation', label: 'Negotiation', dotColor: 'bg-amber-400' },
  { id: 'won', label: 'Closed Won', dotColor: 'bg-emerald-400' },
  { id: 'lost', label: 'Closed Lost', dotColor: 'bg-rose-400' },
];

const STAGE_MOVE_OPTIONS: Option[] = STAGES.map((s) => ({
  value: s.id,
  label: `Move: ${s.label}`,
  badge: s.label,
  badgeColor: 'text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30',
}));

export const DealsKanban: React.FC<DealsKanbanProps> = ({ activeUser }) => {
  const [deals, setDeals] = useState<Deal[]>(() => db.getDeals());
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const canWrite = canPerform(activeUser.role_id, 'deals:write');

  const refreshDeals = () => {
    setDeals(db.getDeals());
  };

  const handleStageChange = (deal: Deal, newStage: DealStage) => {
    db.updateDeal(deal.id, { stage: newStage });
    refreshDeals();
  };

  const handleDeleteDeal = (id: string) => {
    if (window.confirm('Delete this deal opportunity?')) {
      db.deleteDeal(id);
      refreshDeals();
    }
  };

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  const totalPipeline = deals
    .filter((d) => d.stage !== 'won' && d.stage !== 'lost')
    .reduce((sum, d) => sum + Number(d.value), 0);

  const totalWon = deals
    .filter((d) => d.stage === 'won')
    .reduce((sum, d) => sum + Number(d.value), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1A20]">
        <div>
          <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">Revenue Pipeline</h1>
          <p className="text-xs text-[#828290] mt-1">
            Active velocity: <span className="font-mono text-[#F4F4F6] font-semibold">{fmt(totalPipeline)}</span> • Won Revenue: <span className="font-mono text-emerald-400 font-semibold">{fmt(totalWon)}</span>
          </p>
        </div>

        {canWrite && (
          <button
            onClick={() => {
              setEditingDeal(null);
              setIsDealModalOpen(true);
            }}
            className="hesics-btn-primary"
          >
            <Plus className="w-3.5 h-3.5" /> New Deal
          </button>
        )}
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-start">
        {STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.id);
          const stageTotal = stageDeals.reduce((sum, d) => sum + Number(d.value), 0);

          return (
            <div
              key={stage.id}
              className="bg-[#09090C] border border-[#181820] rounded-2xl p-3.5 space-y-3 min-h-[480px] flex flex-col"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-[#16161E]">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${stage.dotColor}`} />
                  <h3 className="text-xs font-bold text-[#F4F4F6] tracking-tight font-display">{stage.label}</h3>
                </div>
                <span className="text-[10px] text-[#707080] font-mono px-2 py-0.5 bg-[#121218] rounded-md">
                  {stageDeals.length}
                </span>
              </div>

              {/* Total Value */}
              <div className="text-[11px] font-mono text-[#808090] font-medium">
                Total: <span className="text-[#D4D4D8]">{fmt(stageTotal)}</span>
              </div>

              {/* Deal Cards Container */}
              <div className="space-y-3 flex-1">
                {stageDeals.length === 0 ? (
                  <div className="h-28 border border-dashed border-[#16161E] rounded-xl flex items-center justify-center text-[11px] text-[#404050]">
                    No active deals
                  </div>
                ) : (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-3.5 bg-[#0D0D11] border border-[#1C1C22] hover:border-[#77727E]/50 rounded-2xl space-y-2.5 transition-all shadow-md group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold text-[#F4F4F6] leading-tight group-hover:text-white transition-colors">
                          {deal.title}
                        </h4>
                        {canWrite && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingDeal(deal);
                                setIsDealModalOpen(true);
                              }}
                              className="p-1 text-[#707080] hover:text-white"
                              title="Edit Deal"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteDeal(deal.id)}
                              className="p-1 text-[#707080] hover:text-rose-400"
                              title="Delete Deal"
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

                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#181822]">
                        <span className="font-bold text-[#F4F4F6] font-mono">{fmt(deal.value)}</span>
                        {deal.expected_close_date && (
                          <span className="text-[10px] text-[#606070] flex items-center gap-1 font-mono">
                            <Calendar className="w-2.5 h-2.5 text-[#77727E]" />
                            {deal.expected_close_date.split('T')[0]}
                          </span>
                        )}
                      </div>

                      {/* Quick Move Stage with CustomSelect */}
                      {canWrite && (
                        <CustomSelect
                          value={deal.stage}
                          onChange={(newStg) => handleStageChange(deal, newStg as DealStage)}
                          options={STAGE_MOVE_OPTIONS}
                          placeholder="Move Stage..."
                          className="w-full text-[10px]"
                        />
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
