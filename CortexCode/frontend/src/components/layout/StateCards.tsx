'use client';

import React from 'react';
import { AlertCircle, Inbox, Loader2, RefreshCw } from 'lucide-react';

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)]">
      <Loader2 className="w-6 h-6 text-[var(--accent-primary)] animate-spin mb-3" />
      <p className="text-sm text-[var(--text-muted)] font-medium">{label}</p>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center rounded-xl border border-[var(--status-error-border)] bg-[var(--status-error-bg)]">
      <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--status-error-border)] text-[var(--status-error)] mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
      <p className="text-xs text-[var(--text-secondary)] max-w-md mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--btn-secondary-bg)] hover:bg-[var(--btn-secondary-hover)] border border-[var(--btn-secondary-border)] text-xs font-medium text-[var(--btn-secondary-text)] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)]">
      <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
      <p className="text-xs text-[var(--text-muted)] max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  let styles = 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-default)]';
  let dot = 'bg-[var(--text-muted)]';

  if (['healthy', 'ok', 'completed', 'success', 'connected'].includes(normalized)) {
    styles = 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]';
    dot = 'bg-[var(--status-success)]';
  } else if (['processing', 'queued', 'running', 'pending'].includes(normalized)) {
    styles = 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]';
    dot = 'bg-[var(--status-warning)]';
  } else if (['unhealthy', 'unreachable', 'failed', 'error', 'degraded'].includes(normalized)) {
    styles = 'bg-[var(--status-error-bg)] text-[var(--status-error)] border-[var(--status-error-border)]';
    dot = 'bg-[var(--status-error)]';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)]">
      <div className="text-xs text-[var(--text-muted)] font-medium">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{value}</div>
      {sublabel && <div className="mt-1 text-[11px] text-[var(--text-muted)]">{sublabel}</div>}
    </div>
  );
}
