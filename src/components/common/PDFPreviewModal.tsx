import React, { useState, useEffect } from 'react';
import { X, Download, Printer, Send, Eye, FileText, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { EmailDispatchModal } from './EmailDispatchModal';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  pdfDocument?: jsPDF;
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
  const [dataUrl, setDataUrl] = useState<string>('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  useEffect(() => {
    if (pdfDocument) {
      try {
        const url = pdfDocument.output('datauristring');
        setDataUrl(url);
      } catch (err) {
        console.error('PDF datauristring generation error:', err);
      }
    } else if (initialDataUrl) {
      setDataUrl(initialDataUrl);
    }
  }, [pdfDocument, initialDataUrl]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (pdfDocument) {
      pdfDocument.save(fileName);
    } else if (dataUrl) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.click();
    }
  };

  const handlePrint = () => {
    const iframe = document.getElementById('hesics-pdf-preview-frame') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
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
                    Live Vector Preview
                  </span>
                </h2>
                <p className="text-[11px] text-[#707080]">
                  High-fidelity rendering formatted for client delivery and ISO standard print.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="hesics-btn-secondary text-xs py-2 px-3"
                title="Download Vector PDF"
              >
                <Download className="w-3.5 h-3.5 text-[#77727E]" /> Download
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="hesics-btn-secondary text-xs py-2 px-3"
                title="Print Document"
              >
                <Printer className="w-3.5 h-3.5 text-[#77727E]" /> Print
              </button>

              {emailDefaults && (
                <button
                  type="button"
                  onClick={() => setShowEmailModal(true)}
                  className="hesics-btn-primary text-xs py-2 px-3.5"
                  title="Dispatch via Email"
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

          {/* Embedded PDF Viewer Frame */}
          <div className="flex-1 bg-[#050507] p-2 sm:p-4 overflow-hidden relative flex items-center justify-center">
            {dataUrl ? (
              <iframe
                id="hesics-pdf-preview-frame"
                src={`${dataUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full rounded-2xl border border-[#1A1A24] bg-white shadow-2xl"
                title="HESICS PDF Live Preview"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-xs text-[#707080]">
                <div className="w-6 h-6 border-2 border-[#77727E] border-t-transparent rounded-full animate-spin" />
                <span>Rendering High-Resolution Vector Document...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nested Email Dispatch Modal */}
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

