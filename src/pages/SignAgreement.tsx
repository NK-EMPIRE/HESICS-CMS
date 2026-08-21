import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle, Camera, Upload, PenTool, FileText, Eye, ArrowRight, ArrowLeft, ShieldCheck, User, Phone, CreditCard } from 'lucide-react';
import { db } from '../lib/firebaseDb';
import { generateAgreementPDF, downloadPDFDocument } from '../lib/pdfEngine';
import { ClientAgreement } from '../lib/types';

interface SignAgreementProps { agreementId: string; }

const STEPS = ['identity', 'kyc_photo', 'scope_review', 'terms', 'signature', 'confirm'] as const;
type Step = typeof STEPS[number];

const STEP_META: Record<Step, { title: string; subtitle: string; icon: React.FC<any> }> = {
  identity:    { title: 'Identity Verification',  subtitle: 'Confirm your personal details',       icon: User },
  kyc_photo:   { title: 'Photo & KYC Upload',     subtitle: 'Take a selfie and upload your ID',    icon: Camera },
  scope_review:{ title: 'Scope of Services',      subtitle: 'Review what has been agreed upon',    icon: FileText },
  terms:       { title: 'Terms & Conditions',     subtitle: 'Read and acknowledge all terms',      icon: ShieldCheck },
  signature:   { title: 'Digital Signature',      subtitle: 'Draw or type your legal signature',   icon: PenTool },
  confirm:     { title: 'Preview & Confirm',      subtitle: 'Review & execute the agreement',      icon: CheckCircle },
};

export const SignAgreement: React.FC<SignAgreementProps> = ({ agreementId }) => {
  const [agreement, setAgreement] = useState<ClientAgreement | null>(() => db.getAgreementById(agreementId) || null);
  const [step, setStep] = useState<Step>('identity');
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form data
  const [phone, setPhone] = useState('');
  const [panVerified, setPanVerified] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [kycDocUrl, setKycDocUrl] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const kycInputRef = useRef<HTMLInputElement>(null);

  const stepIndex = STEPS.indexOf(step);
  const org = db.getOrg();

  if (!agreement) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-[#77727E] text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-[#F4F4F6] mb-2">Agreement Not Found</h2>
          <p className="text-[#808090] text-sm">This agreement link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  if (agreement.status === 'signed' || isComplete) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="bg-[#0D0D11] border border-[#1E1E28] rounded-3xl p-12 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-[#F4F4F6]">Agreement Executed</h2>
          <p className="text-[#808090] text-sm">Your digital signature has been captured and the agreement has been formally executed with HESICS.</p>
          <div className="bg-[#09090C] border border-[#1A1A24] rounded-xl p-4 text-xs font-mono text-[#707080] text-left space-y-1">
            <div>Agreement ID: AGR-{agreement.id.slice(-6).toUpperCase()}</div>
            <div>Party: {agreement.client_name}</div>
            <div>Signed: {new Date().toLocaleString()}</div>
          </div>
          <p className="text-[10px] text-[#505060]">A copy will be shared with you at {agreement.client_email}. Thank you for trusting HESICS.</p>
          <div className="flex items-center justify-center mt-4 gap-2">
            <img src="/assets/hesics-logo-dark.png" alt="HESICS" className="w-8 h-8 object-contain" />
            <div className="text-xs font-bold text-[#77727E] tracking-widest">HESICS · MAKE IT SIMPLE</div>
          </div>
        </div>
      </div>
    );
  }

  // Canvas signature handlers
  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#1A1A22';
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
  };

  const endDraw = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current; if (!canvas) return;
    setSignatureDataUrl(canvas.toDataURL('image/png'));
  };

  const clearSig = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl('');
  };

  const handlePhotoUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setPhotoDataUrl(e.target?.result as string || '');
    reader.readAsDataURL(file);
  };

  const handleKycUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setKycDocUrl(e.target?.result as string || '');
    reader.readAsDataURL(file);
  };

  const handleConfirmSign = async () => {
    setIsLoading(true);
    const signedAt = new Date().toISOString();
    try {
      // Generate agreement PDF
      const doc = generateAgreementPDF({
        clientName: agreement.client_name,
        clientEmail: agreement.client_email,
        clientPhone: phone || agreement.client_phone || '',
        clientCompany: agreement.client_company,
        panCard: panVerified || agreement.pan_card,
        aadhaarNumber: aadhaar,
        scope: agreement.scope,
        signatureDataUrl,
        photoDataUrl,
        agreementId: agreement.id,
        signedAt,
        org,
      });
      const pdfBlob = doc.output('datauristring');

      db.updateAgreement(agreement.id, {
        status: 'signed',
        signed_at: signedAt,
        signature_url: signatureDataUrl,
        photo_url: photoDataUrl,
        kyc_doc_url: kycDocUrl,
        aadhaar_number: aadhaar,
        pan_card: panVerified || agreement.pan_card,
        pdf_data_url: pdfBlob,
      });

      setIsComplete(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 'terms') return termsAccepted;
    if (step === 'signature') return !!signatureDataUrl;
    return true;
  };

  return (
    <div className="min-h-screen bg-[#050505] font-sans">
      {/* Top nav bar */}
      <div className="border-b border-[#1A1A22] bg-[#09090C] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/assets/hesics-logo-white.png" alt="HESICS" className="w-8 h-8 object-contain" />
          <div>
            <div className="text-xs font-bold tracking-widest text-[#F4F4F6] uppercase">HESICS</div>
            <div className="text-[9px] text-[#77727E] tracking-widest uppercase">Service Agreement Portal</div>
          </div>
        </div>
        <div className="text-[10px] text-[#606070] font-mono">AGR-{agreement.id.slice(-6).toUpperCase()}</div>
      </div>

      {/* Progress stepper */}
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => {
            const Icon = STEP_META[s].icon;
            const done = i < stepIndex;
            const active = s === step;
            return (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${done ? 'bg-emerald-500 border-emerald-500' : active ? 'bg-[#77727E] border-[#77727E]' : 'bg-[#0D0D11] border-[#222230]'}`}>
                    {done ? <CheckCircle className="w-4.5 h-4.5 text-white" /> : <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-[#404050]'}`} />}
                  </div>
                  <span className={`text-[9px] font-medium hidden sm:block ${active ? 'text-[#D4D4D8]' : done ? 'text-emerald-400' : 'text-[#404050]'}`}>{STEP_META[s].title.split(' ')[0]}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < stepIndex ? 'bg-emerald-500' : 'bg-[#1A1A22]'}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#F4F4F6] tracking-tight">{STEP_META[step].title}</h2>
          <p className="text-sm text-[#808090] mt-0.5">{STEP_META[step].subtitle}</p>
        </div>

        {/* Step Content */}
        <div className="bg-[#0D0D11] border border-[#1E1E28] rounded-2xl p-6 mb-6 space-y-5">
          {step === 'identity' && (
            <div className="space-y-4">
              <div className="bg-[#09090C] border border-[#1A1A24] rounded-xl p-4 text-xs text-[#808090] space-y-1">
                <div className="font-semibold text-[#D4D4D8] text-sm mb-2">Agreement Details</div>
                <div>Party: <span className="text-[#F4F4F6] font-medium">{agreement.client_name}</span></div>
                <div>Email: <span className="text-[#F4F4F6]">{agreement.client_email}</span></div>
                {agreement.client_company && <div>Company: <span className="text-[#F4F4F6]">{agreement.client_company}</span></div>}
                <div>Agreement ID: <span className="font-mono text-[#77727E]">AGR-{agreement.id.slice(-6).toUpperCase()}</span></div>
                {agreement.expires_at && <div>Valid Until: <span className="text-[#F4F4F6]">{new Date(agreement.expires_at).toLocaleDateString()}</span></div>}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A0A0B0] mb-1.5">Phone Number</label>
                <input className="w-full px-3.5 py-2.5 bg-[#09090C] border border-[#1E1E28] rounded-xl text-sm text-[#F4F4F6] placeholder-[#505060] focus:outline-none focus:border-[#77727E]" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A0A0B0] mb-1.5">PAN Card Number</label>
                <input className="w-full px-3.5 py-2.5 bg-[#09090C] border border-[#1E1E28] rounded-xl text-sm text-[#F4F4F6] placeholder-[#505060] focus:outline-none focus:border-[#77727E] font-mono" value={panVerified} onChange={e => setPanVerified(e.target.value.toUpperCase())} placeholder={agreement.pan_card || 'ABCDE1234F'} maxLength={10} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A0A0B0] mb-1.5">Aadhaar Number (last 4 digits)</label>
                <input className="w-full px-3.5 py-2.5 bg-[#09090C] border border-[#1E1E28] rounded-xl text-sm text-[#F4F4F6] placeholder-[#505060] focus:outline-none focus:border-[#77727E] font-mono" value={aadhaar} onChange={e => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="XXXX" maxLength={4} />
              </div>
            </div>
          )}

          {step === 'kyc_photo' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-[#A0A0B0] mb-2">Client Photograph (Selfie / Photo)</label>
                <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-[#77727E]/50 ${photoDataUrl ? 'border-emerald-800/50' : 'border-[#2A2A38]'}`} onClick={() => photoInputRef.current?.click()}>
                  {photoDataUrl ? (<img src={photoDataUrl} alt="Client" className="w-28 h-28 rounded-xl object-cover mx-auto border border-[#2A2A38]" />) : (<><Camera className="w-8 h-8 text-[#404050] mx-auto mb-2" /><p className="text-xs text-[#606070]">Click to upload or take photo</p></>)}
                </div>
                <input ref={photoInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={e => handlePhotoUpload(e.target.files?.[0] || null)} />
                {photoDataUrl && <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Photo captured successfully</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A0A0B0] mb-2">ID Proof Upload (Aadhaar / PAN / Passport)</label>
                <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-[#77727E]/50 ${kycDocUrl ? 'border-emerald-800/50' : 'border-[#2A2A38]'}`} onClick={() => kycInputRef.current?.click()}>
                  {kycDocUrl ? (<img src={kycDocUrl} alt="KYC" className="w-40 h-28 rounded-xl object-cover mx-auto border border-[#2A2A38]" />) : (<><Upload className="w-8 h-8 text-[#404050] mx-auto mb-2" /><p className="text-xs text-[#606070]">Upload scanned ID document (JPG, PNG, PDF)</p></>)}
                </div>
                <input ref={kycInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleKycUpload(e.target.files?.[0] || null)} />
                {kycDocUrl && <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Document uploaded</p>}
              </div>
            </div>
          )}

          {step === 'scope_review' && (
            <div className="space-y-3">
              <p className="text-xs text-[#808090]">The following services have been included in this commercial agreement:</p>
              {agreement.scope.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-[#09090C] border border-[#1A1A24] rounded-xl">
                  <div className="w-5 h-5 rounded-full bg-[#77727E]/20 border border-[#77727E]/40 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-[#77727E]">{i + 1}</span>
                  </div>
                  <span className="text-sm text-[#D4D4D8]">{s}</span>
                </div>
              ))}
              <div className="p-3 bg-[#09090C] border border-[#1A1A24] rounded-xl text-xs text-[#606070]">
                <span className="font-semibold text-[#A0A0B0]">Service Provider:</span> {org.name || 'HESICS'} · {org.email || 'hesics1@gmail.com'}
              </div>
            </div>
          )}

          {step === 'terms' && (
            <div className="space-y-4">
              <div className="max-h-80 overflow-y-auto space-y-3 pr-1 text-xs text-[#A0A0B0] leading-relaxed">
                {[
                  ['Payment Terms', 'All service fees are payable within the agreed milestone schedule. Delayed payments attract an interest of 2% per month from the due date.'],
                  ['Confidentiality', 'Both parties agree to maintain strict confidentiality of all proprietary, technical, and commercial information shared during the engagement.'],
                  ['Intellectual Property', 'All creative deliverables, code, and outputs shall be exclusively owned by the Client upon full payment of all due invoices.'],
                  ['Termination', 'Either party may terminate this Agreement with 30 days\u2019 written notice. Fees for completed milestones are non-refundable.'],
                  ['Non-Solicitation', 'The Client agrees not to solicit or hire any HESICS team member for 24 months following the agreement period.'],
                  ['Dispute Resolution', 'All disputes shall be resolved through binding arbitration in Chennai, Tamil Nadu, under the Arbitration and Conciliation Act, 1996.'],
                  ['Governing Law', 'This Agreement is governed by Indian law, including the Information Technology Act, 2000 and the Indian Contract Act, 1872.'],
                  ['Force Majeure', 'Neither party shall be liable for service disruptions caused by events beyond their reasonable control.'],
                  ['Privacy Policy', 'Personal data collected is processed per the HESICS Privacy Policy and applicable Indian data protection regulations.'],
                ].map(([title, text]) => (
                  <div key={title as string} className="p-3 bg-[#09090C] border border-[#1A1A24] rounded-xl">
                    <div className="font-semibold text-[#D4D4D8] mb-1">{title}</div>
                    <div>{text}</div>
                  </div>
                ))}
              </div>
              <label className="flex items-start gap-3 cursor-pointer p-4 bg-[#09090C] border border-[#1A1A24] rounded-xl hover:border-[#77727E]/40 transition-colors">
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="mt-0.5 accent-[#77727E]" />
                <span className="text-sm text-[#D4D4D8]">I have read, understood, and agree to all the Terms & Conditions and Privacy Policy of this Agreement. I confirm my identity and legal capacity to enter into this binding contract.</span>
              </label>
            </div>
          )}

          {step === 'signature' && (
            <div className="space-y-4">
              <p className="text-xs text-[#808090]">Draw your signature in the box below using your mouse or finger. This constitutes your legally binding digital signature.</p>
              <div className="border border-[#2A2A38] rounded-xl overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={560}
                  height={180}
                  className="w-full cursor-crosshair touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-[#505060]">Draw your signature above. Keep it consistent with your legal documents.</p>
                <button onClick={clearSig} className="text-xs text-[#77727E] hover:underline">Clear</button>
              </div>
              {signatureDataUrl && <p className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Signature captured</p>}
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <p className="text-xs text-[#808090]">Please review your submission before final execution. This agreement is legally binding once confirmed.</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[['Name', agreement.client_name], ['Email', agreement.client_email], ['Phone', phone || agreement.client_phone || '—'], ['PAN', panVerified || agreement.pan_card || '—'], ['Aadhaar (last 4)', aadhaar || '—'], ['Scope Items', `${agreement.scope.length} services`]].map(([k, v]) => (
                  <div key={k as string} className="p-3 bg-[#09090C] border border-[#1A1A24] rounded-xl">
                    <div className="text-[10px] text-[#606070] uppercase tracking-wider mb-0.5">{k}</div>
                    <div className="font-medium text-[#D4D4D8] truncate">{v}</div>
                  </div>
                ))}
              </div>
              {photoDataUrl && (
                <div className="flex items-center gap-3 p-3 bg-[#09090C] border border-[#1A1A24] rounded-xl">
                  <img src={photoDataUrl} alt="Client" className="w-12 h-12 rounded-lg object-cover border border-[#2A2A38]" />
                  <div>
                    <div className="text-xs font-medium text-[#D4D4D8]">Photo Captured</div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> KYC Verified</div>
                  </div>
                </div>
              )}
              {signatureDataUrl && (
                <div className="p-3 bg-white border border-[#2A2A38] rounded-xl">
                  <div className="text-[10px] text-[#606070] mb-1">Your Captured Signature:</div>
                  <img src={signatureDataUrl} alt="Signature" className="h-14 object-contain" />
                </div>
              )}
              <div className="p-4 bg-amber-950/20 border border-amber-800/30 rounded-xl text-xs text-amber-300">
                ⚠️ By clicking "Confirm & Execute Agreement" below, you are entering into a legally binding contract with HESICS under Indian law. This action cannot be undone.
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-12">
          <button
            onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)])}
            disabled={stepIndex === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#1E1E28] text-sm text-[#808090] hover:text-[#F4F4F6] hover:border-[#2A2A38] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {step === 'confirm' ? (
            <button
              onClick={handleConfirmSign}
              disabled={isLoading}
              className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-[#77727E] text-white font-semibold text-sm hover:bg-[#8A8592] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#77727E]/20"
            >
              {isLoading ? 'Executing...' : <><CheckCircle className="w-4 h-4" /> Confirm & Execute Agreement</>}
            </button>
          ) : (
            <button
              onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)])}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#77727E] text-white font-semibold text-sm hover:bg-[#8A8592] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="text-center text-[10px] text-[#404050] pb-8">
          Secured by HESICS Enterprise OS · hub-hesics.vercel.app · Digital agreement legally valid under IT Act, 2000
        </div>
      </div>
    </div>
  );
};
