import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

// Global emitter for toasts
type ToastListener = (toast: ToastMessage) => void;
const listeners: Set<ToastListener> = new Set();

export const showToast = (title: string, description?: string, type: 'success' | 'error' | 'info' = 'success') => {
  const toast: ToastMessage = {
    id: `toast-${Date.now()}-${Math.random()}`,
    type,
    title,
    description,
  };
  listeners.forEach((l) => l(toast));
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast: ToastListener = (t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== t.id));
      }, 4000);
    };

    listeners.add(handleToast);
    return () => {
      listeners.delete(handleToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start justify-between gap-3 animate-in slide-in-from-bottom-5 fade-in duration-200 ${
            t.type === 'success'
              ? 'bg-[#0E1511]/95 border-emerald-800/40 text-emerald-300'
              : t.type === 'error'
              ? 'bg-[#180E10]/95 border-rose-800/40 text-rose-300'
              : 'bg-[#101015]/95 border-[#77727E]/30 text-[#F4F4F6]'
          }`}
        >
          <div className="flex items-start gap-3">
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="w-4 h-4 text-[#77727E] shrink-0 mt-0.5" />}
            <div>
              <div className="text-xs font-bold leading-tight">{t.title}</div>
              {t.description && (
                <div className="text-[11px] text-[#A0A0B0] mt-0.5 leading-relaxed">{t.description}</div>
              )}
            </div>
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="text-[#707080] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
