import React, { useState, useCallback } from 'react';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable, closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Trash2, Clock, AlertTriangle, TrendingUp, GripVertical, ChevronRight
} from 'lucide-react';
import { db } from '../lib/supabase';
import { Deal, DealStage, User } from '../lib/types';
import { DealModal } from '../components/crm/DealModal';
import { logAudit } from '../lib/auditLog';
import confetti from 'canvas-confetti';

interface DealsKanbanProps {
  activeUser: User;
}

const STAGES: { id: DealStage; label: string; color: string; dotColor: string }[] = [
  { id: 'new',         label: 'New Lead',    color: 'text-[#888888]',  dotColor: '#555555' },
  { id: 'contacted',   label: 'Contacted',   color: 'text-blue-400',   dotColor: '#60a5fa' },
  { id: 'quoted',      label: 'Quoted',      color: 'text-violet-400', dotColor: '#a78bfa' },
  { id: 'negotiation', label: 'Negotiation', color: 'text-amber-400',  dotColor: '#fbbf24' },
  { id: 'won',         label: 'Won',         color: 'text-emerald-400',dotColor: '#34d399' },
  { id: 'lost',        label: 'Lost',        color: 'text-red-400',    dotColor: '#f87171' },
];

// Calculate days since last update
function getDaysStagnant(deal: Deal): number {
  const lastUpdate = new Date(deal.updated_at || deal.created_at);
  return Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
}

// Deal decay visual config
function getDecayConfig(days: number): { border: string; badge: string | null; pulse: boolean } {
  if (days >= 14) return {
    border: 'border-red-900/50 hover:border-red-800/70',
    badge: `⚠ ${days}d stagnant`,
    pulse: true,
  };
  if (days >= 7) return {
    border: 'border-amber-900/40 hover:border-amber-800/60',
    badge: `${days}d stagnant`,
    pulse: false,
  };
  return { border: 'border-[#1e1e1e] hover:border-[#2a2a2a]', badge: null, pulse: false };
}

// ─── Sortable Deal Card ────────────────────────────────────────────────────

interface DealCardProps {
  deal: Deal;
  onEdit: (deal: Deal) => void;
  onDelete: (id: string) => void;
  onMoveStage: (deal: Deal, stage: DealStage) => void;
  isDragging?: boolean;
}

const DealCard: React.FC<DealCardProps> = ({ deal, onEdit, onDelete, onMoveStage, isDragging = false }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: deal.id });
  const days = getDaysStagnant(deal);
  const decay = getDecayConfig(days);
  const stageIdx = STAGES.findIndex((s) => s.id === deal.stage);
  const nextStage = stageIdx < STAGES.length - 1 ? STAGES[stageIdx + 1] : null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group p-3 bg-[#0d0d0d] border ${decay.border} rounded-xl space-y-2.5 transition-all cursor-pointer select-none ${isDragging ? 'shadow-2xl shadow-black/60 rotate-1 scale-105' : ''} ${decay.pulse ? 'animate-pulse-slow' : ''}`}
      onClick={() => onEdit(deal)}
    >
      {/* Drag Handle + Title */}
      <div className="flex items-start gap-1.5">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 p-0.5 text-[#2a2a2a] hover:text-[#555555] rounded cursor-grab active:cursor-grabbing transition-colors shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white leading-snug truncate">{deal.title}</div>
          <div className="text-[10px] text-[#555555] mt-0.5 truncate">{deal.client_name || 'Unknown Client'}</div>
        </div>
      </div>

      {/* Value + Probability */}
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-xs font-bold text-white">
          ₹{Number(deal.value).toLocaleString('en-IN')}
        </span>
        <span className="text-[10px] text-[#555555]">{deal.probability}%</span>
      </div>

      {/* Decay badge */}
      {decay.badge && (
        <div className={`flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full w-fit ${
          days >= 14 ? 'text-red-400 bg-red-950/40' : 'text-amber-400 bg-amber-950/40'
        }`}>
          <AlertTriangle className="w-2.5 h-2.5" />
          {decay.badge}
        </div>
      )}

      {/* Footer actions */}
      <div className="pt-1 border-t border-[#141414] flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 text-[9px] text-[#444444]">
          <Clock className="w-2.5 h-2.5" />
          <span>{days === 0 ? 'Today' : `${days}d ago`}</span>
        </div>
        <div className="flex items-center gap-1">
          {nextStage && deal.stage !== 'won' && deal.stage !== 'lost' && (
            <button
              onClick={() => onMoveStage(deal, nextStage.id)}
              className="flex items-center gap-0.5 text-[9px] text-[#555555] hover:text-[#1E9EFF] transition-colors px-1.5 py-0.5 rounded hover:bg-[#1E9EFF]/10"
            >
              {nextStage.label} <ChevronRight className="w-2.5 h-2.5" />
            </button>
          )}
          {deal.stage !== 'won' && (
            <button
              onClick={() => onMoveStage(deal, 'won')}
              className="text-[9px] text-[#444444] hover:text-emerald-400 transition-colors px-1.5 py-0.5 rounded hover:bg-emerald-950/40"
            >
              Won 🎉
            </button>
          )}
          <button
            onClick={() => onDelete(deal.id)}
            className="p-0.5 text-[#333333] hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Droppable Column ─────────────────────────────────────────────────────────

interface KanbanColumnProps {
  stage: typeof STAGES[number];
  deals: Deal[];
  onEdit: (deal: Deal) => void;
  onDelete: (id: string) => void;
  onMoveStage: (deal: Deal, stage: DealStage) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ stage, deals, onEdit, onDelete, onMoveStage }) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = deals.reduce((sum, d) => sum + Number(d.value), 0);

  return (
    <div className={`flex flex-col rounded-xl border transition-colors min-h-[460px] ${
      isOver ? 'border-[#1E9EFF]/40 bg-[#1E9EFF]/4' : 'border-[#141414] bg-[#080808]'
    }`}>
      {/* Column header */}
      <div className="px-3 py-2.5 border-b border-[#141414] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.dotColor }} />
          <span className={`text-[11px] font-bold ${stage.color}`}>{stage.label}</span>
          <span className="text-[10px] text-[#444444] font-normal">({deals.length})</span>
        </div>
        <span className="text-[10px] font-mono text-[#555555]">
          ₹{total.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="flex-1 p-2 space-y-2">
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-[10px] text-[#2a2a2a] border border-dashed border-[#181818] rounded-lg">
              Drop here
            </div>
          ) : (
            deals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onEdit={onEdit}
                onDelete={onDelete}
                onMoveStage={onMoveStage}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};

// ─── Main Board ───────────────────────────────────────────────────────────────

export const DealsKanban: React.FC<DealsKanbanProps> = ({ activeUser }) => {
  const [deals, setDeals] = useState(() => db.getDeals());
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | undefined>();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const refreshData = useCallback(() => setDeals(db.getDeals()), []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const deal = deals.find((d) => d.id === active.id);
    if (!deal) return;

    // Check if dropped on a stage column
    const targetStage = STAGES.find((s) => s.id === over.id);
    if (targetStage && targetStage.id !== deal.stage) {
      moveToStage(deal, targetStage.id);
      return;
    }

    // Check if dropped on another card (find that card's stage)
    const targetDeal = deals.find((d) => d.id === over.id);
    if (targetDeal && targetDeal.stage !== deal.stage) {
      moveToStage(deal, targetDeal.stage);
    }
  };

  const moveToStage = (deal: Deal, newStage: DealStage) => {
    const prevStage = deal.stage;
    db.updateDeal(deal.id, { stage: newStage, updated_at: new Date().toISOString() });
    logAudit(
      activeUser.id, activeUser.name, 'deal.stage_changed', 'deal', deal.id,
      deal.title, { stage: prevStage }, { stage: newStage }
    );
    if (newStage === 'won') {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, colors: ['#1E9EFF', '#ffffff', '#34d399'] });
    }
    refreshData();
  };

  const handleDelete = (id: string) => {
    const deal = deals.find((d) => d.id === id);
    if (!deal || !window.confirm(`Delete deal "${deal.title}"? This cannot be undone.`)) return;
    db.deleteDeal(id);
    logAudit(activeUser.id, activeUser.name, 'deal.deleted', 'deal', id, deal.title);
    refreshData();
  };

  // Pipeline summary
  const activePipeline = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost');
  const pipelineValue = activePipeline.reduce((s, d) => s + Number(d.value), 0);
  const wonValue = deals.filter((d) => d.stage === 'won').reduce((s, d) => s + Number(d.value), 0);
  const stagnantCount = activePipeline.filter((d) => getDaysStagnant(d) >= 7).length;

  const activeDeal = activeDragId ? deals.find((d) => d.id === activeDragId) : null;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1a1a1a]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Deals Pipeline</h1>
          <p className="text-[11px] text-[#555555] mt-0.5">
            Drag cards to move stages · {deals.length} deals total
          </p>
        </div>
        <button
          onClick={() => { setEditingDeal(undefined); setIsDealModalOpen(true); }}
          className="notion-button bg-[#1E9EFF] hover:bg-[#0A8AE6] text-white font-semibold text-xs"
        >
          <Plus className="w-3.5 h-3.5" /> New Deal
        </button>
      </div>

      {/* Pipeline KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Pipeline', value: `₹${pipelineValue.toLocaleString('en-IN')}`, sub: `${activePipeline.length} open deals`, color: 'text-[#1E9EFF]' },
          { label: 'Won Revenue', value: `₹${wonValue.toLocaleString('en-IN')}`, sub: `${deals.filter((d) => d.stage === 'won').length} closed`, color: 'text-emerald-400' },
          { label: 'Stagnant Deals', value: String(stagnantCount), sub: '7+ days in stage', color: stagnantCount > 0 ? 'text-amber-400' : 'text-[#555555]' },
        ].map((kpi) => (
          <div key={kpi.label} className="p-3 bg-[#0d0d0d] border border-[#141414] rounded-xl">
            <div className="text-[10px] text-[#555555] uppercase font-semibold tracking-wider">{kpi.label}</div>
            <div className={`text-lg font-bold font-mono ${kpi.color} mt-1`}>{kpi.value}</div>
            <div className="text-[10px] text-[#444444] mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 items-start overflow-x-auto pb-2">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={deals.filter((d) => d.stage === stage.id)}
              onEdit={(deal) => { setEditingDeal(deal); setIsDealModalOpen(true); }}
              onDelete={handleDelete}
              onMoveStage={moveToStage}
            />
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeDeal ? (
            <DealCard
              deal={activeDeal}
              onEdit={() => {}}
              onDelete={() => {}}
              onMoveStage={() => {}}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Deal Modal */}
      <DealModal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
        onSuccess={refreshData}
        initialData={editingDeal}
      />
    </div>
  );
};
