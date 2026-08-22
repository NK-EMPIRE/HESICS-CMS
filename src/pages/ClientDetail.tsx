import React, { useState, useEffect } from 'react';
import {
  Building2, Mail, Phone, Calendar, Clock, DollarSign,
  FileSignature, Receipt, FileText, Plus, ArrowLeft, Download,
  Link2, Trash2, Edit3, MessageSquare, ExternalLink, CheckCircle2,
  Table as TableIcon, BookOpen, Video, ShieldCheck, Sparkles
} from 'lucide-react';
import { db } from '../lib/firebaseDb';
import { Client, User, ClientAgreement, Invoice, Quotation, Activity } from '../lib/types';
import { hasPermission } from '../lib/rbac';
import { generateAgreementPDF, generateInvoicePDF, generateQuotationPDF } from '../lib/pdfEngine';
import { showToast } from '../components/common/Toast';
import { InvoiceModal } from '../components/invoices/InvoiceModal';
import { QuotationModal } from '../components/invoices/QuotationModal';
import { ActivityModal } from '../components/crm/ActivityModal';
import { NotionWorkspace } from '../components/notion/NotionWorkspace';

interface ClientDetailProps {
  clientId: string;
  activeUser: User;
  onBack: () => void;
}

type TabType = 'overview' | 'agreements' | 'invoices' | 'quotations' | 'notion' | 'activities';

export const ClientDetail: React.FC<ClientDetailProps> = ({
  clientId,
  activeUser,
  onBack,
}) => {
  const [tab, setTab] = useState<TabType>('overview');
  const [quickNote, setQuickNote] = useState('');
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = db.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);


  // Modals mapped specifically to this client
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  const client = db.getClientById(clientId);
  const org = db.getOrg();

  if (!client) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="text-base text-[#D4D4D8]">Client record not found.</div>
        <button onClick={onBack} className="hesics-btn-primary mx-auto">
          <ArrowLeft className="w-4 h-4" /> Return to Client Directory
        </button>
      </div>
    );
  }

  const agreements = db.getAgreements().filter(
    (a) => a.client_id === client.id || a.client_name.toLowerCase() === client.name.toLowerCase()
  );
  const invoices = db.getInvoices().filter(
    (i) => i.client_name?.toLowerCase() === client.name.toLowerCase() || (i as any).client_id === client.id
  );
  const quotations = db.getQuotations().filter(
    (q) => q.client_name?.toLowerCase() === client.name.toLowerCase() || (q as any).client_id === client.id
  );
  const activities = db.getActivities(client.id);

  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.total || 0), 0);
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + Number(i.total || 0), 0);
  const totalOutstanding = totalInvoiced - totalPaid;

  const handleQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim()) return;

    db.addActivity({
      client_id: client.id,
      client_name: client.name,
      type: 'note',
      outcome: quickNote.trim(),
      author_id: activeUser.id,
      author_name: activeUser.name,
    });

    setQuickNote('');
    showToast('Note Logged', 'Communication note recorded on client timeline.', 'success');
  };

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Breadcrumbs & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1A20]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-[#0F0F14] border border-[#1E1E28] text-[#808090] hover:text-white hover:border-[#2A2A38] transition-all"
            title="Back to Directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-[#F4F4F6] font-display">{client.name}</h1>
              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md border ${
                client.status === 'active'
                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50'
                  : 'text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30'
              }`}>
                {client.status} Account
              </span>
            </div>
            <p className="text-xs text-[#808090] mt-0.5">
              {client.company_name || 'Individual Entity'} · Client ID: <span className="font-mono text-[#D4D4D8]">{client.id}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons mapped directly to this client */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsQuotationModalOpen(true)}
            className="hesics-btn-secondary text-xs"
          >
            <FileText className="w-3.5 h-3.5 text-[#77727E]" /> New Quote
          </button>

          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="hesics-btn-secondary text-xs"
          >
            <Receipt className="w-3.5 h-3.5 text-[#77727E]" /> Issue Invoice
          </button>

          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="hesics-btn-primary text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Log Activity
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="hesics-card p-4 space-y-1">
          <div className="text-[10px] text-[#606070] uppercase font-mono tracking-wider">Total Billed</div>
          <div className="text-lg font-bold font-mono text-[#F4F4F6]">₹{totalInvoiced.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-[#707080]">{invoices.length} invoices issued</div>
        </div>

        <div className="hesics-card p-4 space-y-1">
          <div className="text-[10px] text-[#606070] uppercase font-mono tracking-wider">Settled & Paid</div>
          <div className="text-lg font-bold font-mono text-emerald-400">₹{totalPaid.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-emerald-500/70">Reconciled in bank</div>
        </div>

        <div className="hesics-card p-4 space-y-1">
          <div className="text-[10px] text-[#606070] uppercase font-mono tracking-wider">Outstanding Due</div>
          <div className={`text-lg font-bold font-mono ${totalOutstanding > 0 ? 'text-amber-400' : 'text-[#707080]'}`}>
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-[#707080]">{invoices.filter(i => i.status !== 'paid').length} pending</div>
        </div>

        <div className="hesics-card p-4 space-y-1">
          <div className="text-[10px] text-[#606070] uppercase font-mono tracking-wider">Service Agreements</div>
          <div className="text-lg font-bold font-mono text-indigo-300">{agreements.length}</div>
          <div className="text-[10px] text-indigo-400/80">{agreements.filter(a => a.status === 'signed').length} executed</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-[#1A1A22] pb-2 overflow-x-auto">
        {([
          ['overview', 'Client 360 Overview', Building2],
          ['agreements', `Agreements (${agreements.length})`, FileSignature],
          ['invoices', `Invoices (${invoices.length})`, Receipt],
          ['quotations', `Quotations (${quotations.length})`, FileText],
          ['notion', 'Notion Table & Notes', TableIcon],
          ['activities', `Activity Timeline (${activities.length})`, Clock],
        ] as const).map(([tKey, label, Icon]) => (
          <button
            key={tKey}
            onClick={() => setTab(tKey as TabType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              tab === tKey
                ? 'bg-[#77727E]/20 text-[#F4F4F6] border border-[#77727E]/40 shadow-sm'
                : 'text-[#707080] hover:text-[#D4D4D8] hover:bg-[#121218] border border-transparent'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${tab === tKey ? 'text-[#77727E]' : ''}`} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="hesics-card p-6 space-y-5 lg:col-span-2">
            <h2 className="text-sm font-bold text-[#F4F4F6]">Corporate Profile & Contact Parameters</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[#0A0A0E] border border-[#1A1A22] rounded-xl space-y-1">
                <div className="text-[#606070] text-[10px] uppercase font-mono">Primary Email</div>
                <div className="text-[#F4F4F6] font-medium">{client.email || '—'}</div>
              </div>
              <div className="p-3 bg-[#0A0A0E] border border-[#1A1A22] rounded-xl space-y-1">
                <div className="text-[#606070] text-[10px] uppercase font-mono">Direct Phone</div>
                <div className="text-[#F4F4F6] font-medium">{client.phone || '—'}</div>
              </div>
              <div className="p-3 bg-[#0A0A0E] border border-[#1A1A22] rounded-xl space-y-1">
                <div className="text-[#606070] text-[10px] uppercase font-mono">Company / Legal Entity</div>
                <div className="text-[#F4F4F6] font-medium">{client.company_name || 'Individual'}</div>
              </div>
              <div className="p-3 bg-[#0A0A0E] border border-[#1A1A22] rounded-xl space-y-1">
                <div className="text-[#606070] text-[10px] uppercase font-mono">Service Retainer / Tier</div>
                <div className="text-[#F4F4F6] font-medium">{(client as any).primary_service || (client as any).tier || 'Enterprise Architecture'}</div>
              </div>
            </div>

            {/* Quick Note Submission */}
            <form onSubmit={handleQuickNote} className="pt-4 border-t border-[#1A1A22] space-y-2.5">
              <label className="hesics-label">Append Real-Time Communication Note</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="e.g., Client signed agreement, scheduled kickoff sprint for Monday..."
                  className="hesics-input text-xs"
                />
                <button type="submit" className="hesics-btn-primary px-4">
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

          {/* Side Summary */}
          <div className="hesics-card p-6 space-y-4">
            <h2 className="text-sm font-bold text-[#F4F4F6]">Active Engagements</h2>
            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-[#0A0A0E] border border-[#1A1A22] rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#D4D4D8]">Agreements</div>
                  <div className="text-[10px] text-[#707080]">{agreements.length} contracts</div>
                </div>
                <span className="text-xs font-bold text-[#F4F4F6]">{agreements.length}</span>
              </div>
              <div className="p-3 bg-[#0A0A0E] border border-[#1A1A22] rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#D4D4D8]">Invoices</div>
                  <div className="text-[10px] text-[#707080]">{invoices.length} billed</div>
                </div>
                <span className="text-xs font-bold text-emerald-400">₹{totalInvoiced.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-3 bg-[#0A0A0E] border border-[#1A1A22] rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#D4D4D8]">Quotations</div>
                  <div className="text-[10px] text-[#707080]">{quotations.length} estimates</div>
                </div>
                <span className="text-xs font-bold text-indigo-300">{quotations.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Agreements */}
      {tab === 'agreements' && (
        <div className="hesics-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1A1A22] pb-3.5">
            <div>
              <h2 className="text-sm font-bold text-[#F4F4F6]">Service Agreements & Digital Contracts</h2>
              <p className="text-xs text-[#707080]">Legally executed contracts under Indian IT Act 2000.</p>
            </div>
          </div>

          {agreements.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#555565]">
              No agreements registered for this client yet.
            </div>
          ) : (
            <div className="divide-y divide-[#15151C]">
              {agreements.map((agr) => (
                <div key={agr.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#F4F4F6]">AGR-{agr.id.slice(-6).toUpperCase()}</span>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                        agr.status === 'signed'
                          ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50'
                          : 'text-amber-400 bg-amber-950/40 border-amber-800/50'
                      }`}>
                        {agr.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#707080] mt-0.5">
                      Services: {agr.scope?.join(', ') || 'Custom Engagement'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {agr.status === 'pending' && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(agr.sign_link);
                          showToast('Sign Link Copied', 'Client e-signature URL copied to clipboard.', 'success');
                        }}
                        className="hesics-btn-secondary text-xs"
                      >
                        <Link2 className="w-3.5 h-3.5" /> Copy Sign Link
                      </button>
                    )}

                    <button
                      onClick={async () => {
                        const doc = await generateAgreementPDF({
                          clientName: agr.client_name,
                          clientEmail: agr.client_email,
                          clientPhone: agr.client_phone || '',
                          clientCompany: agr.client_company,
                          panCard: agr.pan_card,
                          scope: agr.scope,
                          signatureDataUrl: agr.signature_url,
                          photoDataUrl: agr.photo_url,
                          agreementId: agr.id,
                          signedAt: agr.signed_at || agr.created_at,
                          org,
                        });
                        const blob = doc.output('blob');
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${agr.client_name.replace(/\s+/g, '_')}_Agreement_HESICS.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
                      }}
                      className="hesics-btn-secondary text-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-[#77727E]" /> Download PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Invoices */}
      {tab === 'invoices' && (
        <div className="hesics-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1A1A22] pb-3.5">
            <div>
              <h2 className="text-sm font-bold text-[#F4F4F6]">Invoices & Billing History</h2>
              <p className="text-xs text-[#707080]">All tax invoices issued to {client.name}.</p>
            </div>
            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="hesics-btn-primary text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Issue Invoice
            </button>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#555565]">
              No invoices issued for this client yet.
            </div>
          ) : (
            <div className="divide-y divide-[#15151C]">
              {invoices.map((inv) => (
                <div key={inv.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#F4F4F6]">{inv.invoice_number}</span>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                        inv.status === 'paid'
                          ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50'
                          : 'text-amber-400 bg-amber-950/40 border-amber-800/50'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#707080] mt-0.5">
                      Due Date: {inv.due_date || 'On Receipt'} · Total: ₹{Number(inv.total || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      const doc = await generateInvoicePDF(inv, org);
                      const blob = doc.output('blob');
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `HESICS_Invoice_${inv.invoice_number}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
                    }}
                    className="hesics-btn-secondary text-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-[#77727E]" /> Download PDF
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Quotations */}
      {tab === 'quotations' && (
        <div className="hesics-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1A1A22] pb-3.5">
            <div>
              <h2 className="text-sm font-bold text-[#F4F4F6]">Commercial Quotations & Estimates</h2>
              <p className="text-xs text-[#707080]">Formal proposals submitted to {client.name}.</p>
            </div>
            <button
              onClick={() => setIsQuotationModalOpen(true)}
              className="hesics-btn-primary text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Create Quotation
            </button>
          </div>

          {quotations.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#555565]">
              No quotations issued for this client yet.
            </div>
          ) : (
            <div className="divide-y divide-[#15151C]">
              {quotations.map((qt) => (
                <div key={qt.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#F4F4F6]">{qt.quotation_number || (qt as any).quote_number}</span>
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border text-indigo-400 bg-indigo-950/40 border-indigo-800/50">
                        {qt.status || 'DRAFT'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#707080] mt-0.5">
                      Valid Until: {qt.valid_until || (qt as any).expiry_date || '30 Days'} · Amount: ₹{Number(qt.total || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      const doc = await generateQuotationPDF(qt, org);
                      const blob = doc.output('blob');
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `HESICS_Quotation_${qt.quotation_number || (qt as any).quote_number || 'QT'}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
                    }}
                    className="hesics-btn-secondary text-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-[#77727E]" /> Download PDF
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Notion Workspace (Tables & Notes) */}
      {tab === 'notion' && (
        <NotionWorkspace
          scopeId={`client-${client.id}`}
          scopeTitle={`${client.name} Workspace`}
          activeUser={activeUser}
        />
      )}

      {/* Tab 6: Activities */}
      {tab === 'activities' && (
        <div className="hesics-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1A1A22] pb-3.5">
            <div>
              <h2 className="text-sm font-bold text-[#F4F4F6]">Communication & Activity Timeline</h2>
              <p className="text-xs text-[#707080]">Audit log of calls, meetings, DMs, and notes.</p>
            </div>
            <button
              onClick={() => setIsActivityModalOpen(true)}
              className="hesics-btn-primary text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Log Entry
            </button>
          </div>

          {activities.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#555565]">
              No activity logs recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-[#15151C]">
              {activities.map((act) => (
                <div key={act.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#14141C] text-[#A0A0B0] border border-[#20202A]">
                        {act.type}
                      </span>
                      <span className="text-xs font-semibold text-[#F4F4F6]">{(act as any).title || act.outcome || act.notes}</span>
                    </div>
                    <div className="text-[10px] text-[#606070] flex items-center gap-2">
                      <span>Logged by {act.author_name || 'Admin'}</span>
                      <span>•</span>
                      <span>{new Date(act.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals for Direct Action Creation */}
      {isInvoiceModalOpen && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          onSuccess={() => {}}
          activeUser={activeUser}
        />
      )}

      {isQuotationModalOpen && (
        <QuotationModal
          isOpen={isQuotationModalOpen}
          onClose={() => setIsQuotationModalOpen(false)}
          onSuccess={() => {}}
          activeUser={activeUser}
        />
      )}

      {isActivityModalOpen && (
        <ActivityModal
          isOpen={isActivityModalOpen}
          onClose={() => setIsActivityModalOpen(false)}
          onSuccess={() => {}}
          clientId={client.id}
          activeUser={activeUser}
        />
      )}
    </div>
  );
};
