import React, { useState } from 'react';
import { X, Send, Mail, CheckCircle2, FileText, Sparkles } from 'lucide-react';
import { sendCustomEmail } from '../../lib/emailService';

interface EmailDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTo: string;
  defaultSubject: string;
  defaultMessage: string;
  recipientName: string;
  documentType: 'Invoice' | 'Quotation' | 'Task' | 'Report';
  documentNumber?: string;
  onSuccess?: () => void;
}

export const EmailDispatchModal: React.FC<EmailDispatchModalProps> = ({
  isOpen,
  onClose,
  defaultTo,
  defaultSubject,
  defaultMessage,
  recipientName,
  documentType,
  documentNumber,
  onSuccess,
}) => {
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [attachPdf, setAttachPdf] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim() || !subject.trim()) {
      setErrorMsg('Please provide a valid recipient and subject line.');
      return;
    }

    setIsSending(true);
    setErrorMsg('');

    const formattedHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0D0D11; border: 1px solid #202028; border-radius: 16px; overflow: hidden; color: #F4F4F6;">
        <div style="background-color: #08080A; padding: 24px; border-bottom: 1px solid #1C1C24; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.1em; color: #F4F4F6;">HESICS<span style="color: #77727E;">.</span></h2>
          <div style="font-size: 10px; color: #77727E; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 4px;">Business Operating System</div>
        </div>
        <div style="padding: 28px; font-size: 14px; line-height: 1.6; color: #D4D4D8;">
          <div style="margin-bottom: 16px; font-weight: 600; color: #F4F4F6;">Dear ${recipientName || 'Client'},</div>
          <div style="white-space: pre-wrap; margin-bottom: 24px; color: #C0C0C8;">${message}</div>
          <div style="padding: 16px; background-color: #121217; border: 1px solid #1E1E26; border-radius: 12px; font-size: 12px; color: #9090A0; margin-bottom: 20px;">
            <div style="font-weight: 700; color: #F4F4F6; margin-bottom: 4px;">Commercial Document Reference:</div>
            <div>${documentType} ${documentNumber ? `#${documentNumber}` : ''} • Formally generated & sealed</div>
          </div>
          <div style="font-size: 12px; color: #707080; border-top: 1px solid #1C1C24; pt: 16px; margin-top: 24px;">
            HESICS Enterprise Suite • Confidential Commercial Communication
          </div>
        </div>
      </div>
    `;

    const res = await sendCustomEmail({
      to: to.trim().toLowerCase(),
      subject: subject.trim(),
      html: formattedHtml,
      text: message,
    });

    setIsSending(false);

    if (res.success) {
      setSentSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 2000);
    } else {
      setErrorMsg(res.error || 'Failed to dispatch email. Please check network connection.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-modal flex items-center justify-center p-4">
      <div className="bg-[#0D0D11] border border-[#22222B] rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-7 space-y-5 shadow-2xl shadow-black/80">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1C1C26] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
              <Mail className="w-4 h-4 text-[#77727E]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F4F4F6] tracking-tight font-display">
                Dispatch {documentType} by Email
              </h2>
              <p className="text-xs text-[#808090]">
                Customize message and dispatch official notification via verified SMTP.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#606070] hover:text-white p-1.5 rounded-lg hover:bg-[#16161D]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-950/20 border border-rose-900/40 rounded-xl text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {sentSuccess ? (
          <div className="p-8 text-center space-y-3 bg-[#08080A] rounded-2xl border border-emerald-900/30">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-sm font-bold text-[#F4F4F6]">Email Dispatched Successfully</h3>
            <p className="text-xs text-[#808090]">Official commercial document sent to {to}.</p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="hesics-label">Recipient Email Address *</label>
                <input
                  type="email"
                  required
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="client@enterprise.com"
                  className="hesics-input"
                />
              </div>

              <div>
                <label className="hesics-label">CC / Accounting (Optional)</label>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="accounts@hesics.com"
                  className="hesics-input"
                />
              </div>
            </div>

            <div>
              <label className="hesics-label">Email Subject Line *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="hesics-input"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="hesics-label mb-0">Customized Body Message</label>
                <span className="text-[10px] text-[#77727E] font-mono">Brand Aligned</span>
              </div>
              <textarea
                rows={5}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your custom notes, instructions, or commercial brief..."
                className="hesics-input resize-none leading-relaxed text-xs"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#08080A] border border-[#1C1C24] rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#77727E]" />
                <span className="text-[#F4F4F6] font-medium">Attach Official PDF {documentType}</span>
              </div>
              <input
                type="checkbox"
                checked={attachPdf}
                onChange={(e) => setAttachPdf(e.target.checked)}
                className="w-4 h-4 accent-[#77727E] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="hesics-btn-ghost">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="hesics-btn-primary"
              >
                {isSending ? (
                  <span>Dispatching Email...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Formal Email</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
