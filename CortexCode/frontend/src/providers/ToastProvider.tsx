'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, X, Sparkles } from 'lucide-react';

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

      setToasts((prev) => [...prev.slice(-4), newToast]);

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

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl border bg-[var(--modal-bg)] backdrop-blur-xl shadow-[var(--shadow-lg)] transition-all duration-300 transform animate-fade-in-up ${
              toast.type === 'success'
                ? 'border-[var(--status-success-border)]'
                : toast.type === 'error'
                ? 'border-[var(--status-error-border)]'
                : toast.type === 'warning'
                ? 'border-[var(--status-warning-border)]'
                : 'border-[var(--accent-border)]'
            }`}
          >
            <div className="p-1 rounded-xl shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 size={20} className="text-[var(--status-success)]" />}
              {toast.type === 'error' && <AlertCircle size={20} className="text-[var(--status-error)]" />}
              {toast.type === 'warning' && <AlertTriangle size={20} className="text-[var(--status-warning)]" />}
              {toast.type === 'info' && <Sparkles size={20} className="text-[var(--accent-primary)]" />}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold tracking-tight text-[var(--text-primary)] mb-0.5 flex items-center gap-1.5">
                {toast.title}
              </h4>
              {toast.description && (
                <p className="text-[11px] font-medium leading-relaxed text-[var(--text-secondary)]">
                  {toast.description}
                </p>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--bg-hover)] transition-colors shrink-0"
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
