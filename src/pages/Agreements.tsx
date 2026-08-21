import React, { useState } from 'react';
import { FileSignature, Plus, Copy, Download, Send, Trash2, CheckCircle, Clock, AlertCircle, Link2, Search, X } from 'lucide-react';
import { db } from '../lib/firebaseDb';
import { User, ClientAgreement } from '../lib/types';
import { isAdminOrAbove, isMasterRoot } from '../lib/rbac';
import { generateAgreementPDF, downloadPDFDocument } from '../lib/pdfEngine';
import { showToast } from '../components/common/Toast';
import { CustomSelect } from '../components/common/CustomSelect';

interface AgreementsProps { activeUser: User; }

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Awaiting Signature', cls: 'text-amber-300 bg-amber-950/30 border-amber-800/40' },
  signed:    { label: 'Signed & Executed',  cls: 'text-emerald-300 bg-emerald-950/30 border-emerald-800/40' },
  expired:   { label: 'Expired',            cls: 'text-rose-300 bg-rose-950/30 border-rose-800/40' },
  cancelled: { label: 'Cancelled',          cls: 'text-[#808090] bg-[#14141A] border-[#202028]' },
};

const HESICS_SERVICES = [
  'Enterprise Business OS Architecture & Cloud Infrastructure',
  'AI & Workflow Automation Engineering',
  'Commercial ERP & CRM Platform Retainer',
  'Corporate Brand Identity & Design System',
  'Full-Stack Web & Mobile Product Sprint',
  'Performance Marketing & Growth Strategy',
  'Content Strategy & Digital Presence',
  'Executive Advisory & Operations Consulting',
];

export const Agreements: React.FC<AgreementsProps> = ({ activeUser }) => {
  const [agreements, setAgreements] = useState<ClientAgreement[]>(() => db.getAgreements());
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ clientId: '', clientName: '', clientEmail: '', clientPhone: '', clientCompany: '', panCard: '', scope: [] as string[], customScope: '', validDays: '30' });
  const clients = db.getClients();
  const org = db.getOrg();
  const canManage = isAdminOrAbove(activeUser.hierarchy) || isMasterRoot(activeUser.email);

  const refresh = () => setAgreements(db.getAgreements());
  const filtered = agreements.filter(a => a.client_name.toLowerCase().includes(search.toLowerCase()) || a.client_email.toLowerCase().includes(search.toLowerCase()));
  const toggleScope = (s: string) => setForm(f => ({ ...f, scope: f.scope.includes(s) ? f.scope.filter(x => x !== s) : [...f.scope, s] }));

  const handleClientSelect = (id: string) => {
    const c = clients.find(cl => cl.id === id);
    if (c) setForm(f => ({ ...f, clientId: c.id, clientName: c.name, clientEmail: c.email || '', clientPhone: c.phone || '', clientCompany: c.company_name || '' }));
  };

  const handleCreate = () => {
    if (!form.clientName.trim() || !form.clientEmail.trim()) { showToast('Missing Info', 'Client name and email are required.', 'error'); return; }
    const scopeList = [...form.scope, ...(form.customScope.trim() ? [form.customScope.trim()] : [])];
    if (!scopeList.length) { showToast('No Scope', 'Select at least one service.', 'error'); return; }
    const a = db.addAgreement({ client_id: form.clientId || `cl-${Date.now()}`, client_name: form.clientName, client_email: form.clientEmail, client_phone: form.clientPhone, client_company: form.clientCompany, pan_card: form.panCard, scope: scopeList, status: 'pending', expires_at: new Date(Date.now() + Number(form.validDays) * 86400000).toISOString() });
    refresh(); setShowCreate(false); setForm({ clientId: '', clientName: '', clientEmail: '', clientPhone: '', clientCompany: '', panCard: '', scope: [], customScope: '', validDays: '30' });
    showToast('Agreement Created', `Sign link ready for ${a.client_name}`, 'success');
  };

  const downloadPDF = (agr: ClientAgreement) => {
    const doc = generateAgreementPDF({ clientName: agr.client_name, clientEmail: agr.client_email, clientPhone: agr.client_phone || '', clientCompany: agr.client_company, panCard: agr.pan_card, scope: agr.scope, signatureDataUrl: agr.signature_url, photoDataUrl: agr.photo_url, agreementId: agr.id, signedAt: agr.signed_at || agr.created_at, org });
    downloadPDFDocument(doc, `${agr.client_name.replace(/\s+/g, '_')}_Agreement_HESICS.pdf`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1A20]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
              <FileSignature className="w-4 h-4 text-[#77727E]" />
            </div>
            <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">Client Agreements</h1>
          </div>
          <p className="text-xs text-[#828290] mt-1">Generate legally binding digital agreements · KYC · Digital signatures · Auto PDF archival</p>
        </div>
        {canManage && <button onClick={() => setShowCreate(true)} className="hesics-btn-primary text-xs"><Plus className="w-3.5 h-3.5" /> New Agreement</button>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['Total', agreements.length, 'text-[#D4D4D8]'], ['Signed', agreements.filter(a => a.status === 'signed').length, 'text-emerald-400'], ['Pending', agreements.filter(a => a.status === 'pending').length, 'text-amber-400'], ['Expired', agreements.filter(a => a.status === 'expired').length, 'text-rose-400']].map(([l, v, c]) => (
          <div key={l as string} className="hesics-card p-4"><div className={`text-2xl font-bold ${c}`}>{v}</div><div className="text-[10px] text-[#808090] mt-1 uppercase tracking-wider">{l}</div></div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#606070]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client..." className="hesics-input pl-9 text-xs w-full" />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="hesics-card p-16 text-center"><FileSignature className="w-10 h-10 text-[#2A2A35] mx-auto mb-4" /><p className="text-[#555565] text-sm">No agreements yet. Create one to get started.</p></div>
        ) : filtered.map(agr => {
          const st = STATUS_MAP[agr.status] || STATUS_MAP.pending;
          return (
            <div key={agr.id} className="hesics-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#77727E]/30 transition-colors">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-[#0D0D12] border border-[#1E1E28] flex items-center justify-center shrink-0"><FileSignature className="w-4 h-4 text-[#77727E]" /></div>
                <div className="min-w-0">
                  <div className="font-semibold text-[#F4F4F6] text-sm truncate">{agr.client_name}</div>
                  <div className="text-xs text-[#707080]">{agr.client_email}{agr.client_company && ` · ${agr.client_company}`}</div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${st.cls}`}>{st.label}</span>
                    {agr.scope.slice(0, 2).map((s, i) => <span key={i} className="text-[9px] text-[#808090] bg-[#0E0E16] border border-[#1A1A24] rounded-md px-2 py-0.5 truncate max-w-[150px]">{s}</span>)}
                    {agr.scope.length > 2 && <span className="text-[9px] text-[#606070]">+{agr.scope.length - 2} more</span>}
                  </div>
                  <div className="text-[10px] text-[#505060] mt-1 font-mono">Created {new Date(agr.created_at).toLocaleDateString()}{agr.signed_at && ` · Signed ${new Date(agr.signed_at).toLocaleDateString()}`}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {agr.status === 'pending' && <>
                  <button onClick={() => { navigator.clipboard.writeText(agr.sign_link); showToast('Copied', 'Sign link copied.', 'success'); }} className="hesics-btn-secondary text-[11px] gap-1.5"><Link2 className="w-3.5 h-3.5" /> Copy Link</button>
                  <a href={agr.sign_link} target="_blank" rel="noreferrer" className="hesics-btn-secondary text-[11px] gap-1.5"><Send className="w-3.5 h-3.5" /> Open</a>
                </>}
                <button onClick={() => downloadPDF(agr)} className="p-2 rounded-xl text-[#707080] hover:text-white hover:bg-[#14141C] transition-colors" title="Download PDF"><Download className="w-4 h-4" /></button>
                {canManage && <button onClick={() => { db.deleteAgreement(agr.id); refresh(); }} className="p-2 rounded-xl text-[#707080] hover:text-rose-400 hover:bg-rose-950/20 transition-colors"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>
          );
        })}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <div className="bg-[#0D0D11] border border-[#22222B] rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-7 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1C1C26] pb-4">
              <div><h2 className="text-base font-bold text-[#F4F4F6]">Create New Agreement</h2><p className="text-xs text-[#808090]">Generate a KYC e-sign link for your client.</p></div>
              <button onClick={() => setShowCreate(false)} className="text-[#606070] hover:text-white p-1.5 rounded-lg hover:bg-[#16161D]"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="hesics-label">Select Existing Client</label>
              <CustomSelect value={form.clientId} onChange={handleClientSelect} options={[{ value: '', label: 'Manual Entry' }, ...clients.map(c => ({ value: c.id, label: c.name, sublabel: c.email || '' }))]} searchable />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[['clientName','Client Full Name *','Sheik Mydeen','text'],['clientEmail','Email *','client@company.com','email'],['clientPhone','Phone','+91 98765 43210','text'],['clientCompany','Company','Apex Global Pvt. Ltd.','text'],['panCard','PAN Card','ABCDE1234F','text'],['validDays','Valid For (days)','30','number']].map(([k,l,p,t]) => (
                <div key={k as string}><label className="hesics-label">{l}</label><input className="hesics-input text-xs" type={t as string} value={(form as any)[k as string]} onChange={e => setForm(f => ({ ...f, [k as string]: e.target.value }))} placeholder={p as string} /></div>
              ))}
            </div>
            <div>
              <label className="hesics-label">Scope of Services</label>
              <div className="grid gap-1.5 mt-1">
                {HESICS_SERVICES.map(s => (
                  <button key={s} type="button" onClick={() => toggleScope(s)} className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-xs text-left transition-all ${form.scope.includes(s) ? 'border-[#77727E]/50 bg-[#77727E]/10 text-[#F4F4F6]' : 'border-[#1E1E28] bg-[#09090C] text-[#707080] hover:border-[#2A2A38]'}`}>
                    <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${form.scope.includes(s) ? 'bg-[#77727E] border-[#77727E]' : 'border-[#2A2A38]'}`}>{form.scope.includes(s) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
                    {s}
                  </button>
                ))}
                <input className="hesics-input text-xs mt-1" value={form.customScope} onChange={e => setForm(f => ({ ...f, customScope: e.target.value }))} placeholder="Add custom scope item..." />
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-[#1A1A22]">
              <button onClick={() => setShowCreate(false)} className="hesics-btn-ghost text-xs">Cancel</button>
              <button onClick={handleCreate} className="hesics-btn-primary text-xs px-8"><FileSignature className="w-3.5 h-3.5" /> Generate Sign Link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
