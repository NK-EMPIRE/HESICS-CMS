import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { db } from '../lib/supabase';
import { Deal, DealStage, User } from '../lib/types';
import { DealModal } from '../components/crm/DealModal';
import confetti from 'canvas-confetti';

interface DealsKanbanProps {
  activeUser: User;
}

const STAGES: { id: DealStage; label: string }[] = [
  { id: 'new', label: 'New Lead' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'quoted', label: 'Quoted' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'won', label: 'Won 🎉' },
  { id: 'lost', label: 'Lost' },
];

export const DealsKanban: React.FC<DealsKanbanProps> = ({ activeUser }) => {
  const [deals, setDeals] = useState(db.getDeals());
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | undefined>();

  const refreshData = () => {
    setDeals(db.getDeals());
  };

  const handleStageShift = (deal: Deal, newStage: DealStage) => {
    db.updateDeal(deal.id, { stage: newStage });
    if (newStage === 'won') {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
    refreshData();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete deal?')) {
      db.deleteDeal(id);
      refreshData();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="space-y-1 pb-3 border-b border-[#262626]">
        <div className="text-2xl">📋</div>
        <h1 className="text-xl font-bold text-white tracking-tight">Deals Board</h1>
        <p className="text-xs text-[#888888]">
          Notion-style Kanban pipeline. Stage deals from acquisition to win.
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingDeal(undefined);
            setIsDealModalOpen(true);
          }}
          className="notion-button bg-[#FF6B00] hover:bg-[#ea580c] text-white font-medium text-xs"
        >
          <Plus className="w-3.5 h-3.5" /> New Deal
        </button>
      </div>

      {/* Notion Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 items-start">
        {STAGES.map((col) => {
          const colDeals = deals.filter((d) => d.stage === col.id);
          const colTotal = colDeals.reduce((sum, d) => sum + Number(d.value), 0);

          return (
            <div
              key={col.id}
              className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg p-2.5 space-y-2.5 min-h-[480px] flex flex-col"
            >
              {/* Header */}
              <div className="pb-2 border-b border-[#2a2a2a] flex items-center justify-between text-xs">
                <span className="font-semibold text-white">
                  {col.label} <span className="text-[#666666] font-normal">({colDeals.length})</span>
                </span>
                <span className="font-mono text-[10px] text-[#aaaaaa]">
                  ₹{colTotal.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2 flex-1 overflow-y-auto">
                {colDeals.length === 0 ? (
                  <div className="py-8 text-center text-[10px] text-[#555555] border border-dashed border-[#282828] rounded">
                    Empty
                  </div>
                ) : (
                  colDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-2.5 bg-[#252525] border border-[#333333] rounded space-y-1.5 hover:border-[#444444] transition-colors cursor-pointer"
                      onClick={() => {
                        setEditingDeal(deal);
                        setIsDealModalOpen(true);
                      }}
                    >
                      <div className="text-xs font-semibold text-white leading-snug">{deal.title}</div>
                      <div className="text-[10px] text-[#888888]">{deal.client_name || 'Client'}</div>

                      <div className="pt-1.5 border-t border-[#303030] flex items-center justify-between text-[10px]">
                        <span className="font-mono font-bold text-white">
                          ₹{Number(deal.value).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[#666666]">{deal.probability}% win</span>
                      </div>

                      {/* Stage progression controls */}
                      <div className="pt-1 flex items-center justify-between text-[9px]" onClick={(e) => e.stopPropagation()}>
                        {col.id !== 'won' && (
                          <button
                            onClick={() => handleStageShift(deal, 'won')}
                            className="px-1.5 py-0.5 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60 rounded"
                          >
                            Won 🎉
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(deal.id)}
                          className="text-[#666666] hover:text-red-400 p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <DealModal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
        onSuccess={refreshData}
        initialData={editingDeal}
      />
    </div>
  );
};
