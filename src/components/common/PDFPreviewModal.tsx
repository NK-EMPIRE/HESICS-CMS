import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Printer, Send, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { EmailDispatchModal } from './EmailDispatchModal';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  pdfDocument?: jsPDF | Promise<jsPDF>;
  pdfDataUrl?: string;
  fileName?: string;
  onDispatchEmail?: () => void;
  emailDefaults?: {
    to: string;
    recipientName: string;
    documentType: 'Task' | 'Invoice' | 'Quotation' | 'Report';
    documentNumber: string;
    defaultSubject: string;
    defaultMessage: string;
  };
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  pdfDocument,
  pdfDataUrl: initialDataUrl,
  fileName = 'document.pdf',
  onDispatchEmail,
  emailDefaults,
}) => {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [resolvedDoc, setResolvedDoc] = useState<jsPDF | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const prevBlobUrl = useRef<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setHasError(false);
    setBlobUrl('');
    setResolvedDoc(null);

    // Revoke previous blob URL
    if (prevBlobUrl.current) {
      URL.revokeObjectURL(prevBlobUrl.current);
      prevBlobUrl.current = '';
    }

    const resolve = async () => {
      try {
        let doc: jsPDF | null = null;

        if (pdfDocument) {
          // May be a Promise<jsPDF> or jsPDF
          doc = await Promise.resolve(pdfDocument);
          setResolvedDoc(doc);
          const blob = doc.output('blob');
          const url = URL.createObjectURL(blob);
          prevBlobUrl.current = url;
          setBlobUrl(url);
        } else if (initialDataUrl) {
          // Convert data URI to blob URL for more reliable iframe rendering
          const response = await fetch(initialDataUrl);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          prevBlobUrl.current = url;
          setBlobUrl(url);
        }
      } catch (err) {
        console.error('PDF preview error:', err);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    resolve();

    return () => {
      if (prevBlobUrl.current) {
        URL.revokeObjectURL(prevBlobUrl.current);
      }
    };
  }, [isOpen, pdfDocument, initialDataUrl]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (resolvedDoc) {
      try {
        const blob = resolvedDoc.output('blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.endsWith('.pdf') ? fileName : fileName + '.pdf';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
      } catch { resolvedDoc.save(fileName); }
    } else if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName.endsWith('.pdf') ? fileName : fileName + '.pdf';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 500);
    }
  };

  const handlePrint = () => {
    const iframe = document.getElementById('hesics-pdf-preview-frame') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-6">
        <div className="bg-[#0D0D12] border border-[#262632] rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Top Control Bar */}
          <div className="px-6 py-4 border-b border-[#1C1C26] flex items-center justify-between bg-[#08080B] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
                <FileText className="w-4 h-4 text-[#77727E]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#F4F4F6] font-display flex items-center gap-2">
                  <span>{title}</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-[#77727E]/15 border border-[#77727E]/30 text-[#D4D4D8]">
                    Live Preview
                  </span>
                </h2>
                <p className="text-[11px] text-[#707080]">
                  High-fidelity rendering · Click Download to save as PDF
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isLoading || hasError}
                className="hesics-btn-secondary text-xs py-2 px-3 disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5 text-[#77727E]" /> Download
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={isLoading || hasError}
                className="hesics-btn-secondary text-xs py-2 px-3 disabled:opacity-40"
              >
                <Printer className="w-3.5 h-3.5 text-[#77727E]" /> Print
              </button>

              {emailDefaults && (
                <button
                  type="button"
                  onClick={() => setShowEmailModal(true)}
                  className="hesics-btn-primary text-xs py-2 px-3.5"
                >
                  <Send className="w-3.5 h-3.5" /> Dispatch Email
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="text-[#707080] hover:text-white p-2 rounded-xl hover:bg-[#1A1A24] transition-colors ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* PDF Viewer Area */}
          <div className="flex-1 bg-[#050507] p-3 sm:p-5 overflow-hidden relative flex items-center justify-center">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#050507] z-10">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-[#1A1A24] rounded-full" />
                  <div className="absolute inset-0 border-4 border-t-[#77727E] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-[#D4D4D8]">Generating PDF…</div>
                  <div className="text-xs text-[#606070] mt-1">Fetching logo assets & building document</div>
                </div>
              </div>
            )}

            {hasError && !isLoading && (
              <div className="flex flex-col items-center justify-center gap-3 text-xs text-[#707080]">
                <div className="text-4xl">⚠️</div>
                <div className="font-semibold text-[#D4D4D8]">PDF generation failed</div>
                <div className="text-[#606070]">Try downloading directly using the button above.</div>
              </div>
            )}

            {!isLoading && !hasError && blobUrl && (
              <iframe
                id="hesics-pdf-preview-frame"
                src={blobUrl}
                className="w-full h-full rounded-2xl border border-[#1A1A24] bg-white shadow-2xl"
                title="HESICS PDF Preview"
              />
            )}
          </div>
        </div>
      </div>

      {showEmailModal && emailDefaults && (
        <EmailDispatchModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          defaultTo={emailDefaults.to}
          recipientName={emailDefaults.recipientName}
          documentType={emailDefaults.documentType}
          documentNumber={emailDefaults.documentNumber}
          defaultSubject={emailDefaults.defaultSubject}
          defaultMessage={emailDefaults.defaultMessage}
        />
      )}
    </>
  );
};
