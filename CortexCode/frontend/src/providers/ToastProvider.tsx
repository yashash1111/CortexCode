'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, Sparkles } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (title: string, description?: string, type?: ToastType, duration?: number) => void;
  showSuccess: (title: string, description?: string) => void;
  showError: (title: string, description?: string) => void;
  showInfo: (title: string, description?: string) => void;
  showWarning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (title: string, description?: string, type: ToastType = 'info', duration: number = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, title, description, type, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep max 5 active toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const showSuccess = useCallback((title: string, description?: string) => showToast(title, description, 'success'), [showToast]);
  const showError = useCallback((title: string, description?: string) => showToast(title, description, 'error', 5000), [showToast]);
  const showInfo = useCallback((title: string, description?: string) => showToast(title, description, 'info'), [showToast]);
  const showWarning = useCallback((title: string, description?: string) => showToast(title, description, 'warning'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning }}>
      {children}

      {/* Floating Glassmorphic Toast Notifications Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl border backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] transition-all duration-300 transform animate-fade-in-up ${
              toast.type === 'success'
                ? 'bg-zinc-950/85 border-emerald-500/40 text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
                : toast.type === 'error'
                ? 'bg-zinc-950/85 border-red-500/40 text-red-200 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                : toast.type === 'warning'
                ? 'bg-zinc-950/85 border-amber-500/40 text-amber-200 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
                : 'bg-zinc-950/85 border-purple-500/40 text-purple-200 shadow-[0_0_30px_rgba(168,85,247,0.25)]'
            }`}
          >
            <div className="p-1 rounded-xl shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-400" />}
              {toast.type === 'error' && <AlertCircle size={20} className="text-red-400" />}
              {toast.type === 'warning' && <AlertTriangle size={20} className="text-amber-400" />}
              {toast.type === 'info' && <Sparkles size={20} className="text-purple-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black tracking-tight text-white mb-0.5 flex items-center gap-1.5">
                {toast.title}
              </h4>
              {toast.description && (
                <p className="text-[11px] font-medium leading-relaxed text-zinc-300">
                  {toast.description}
                </p>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
