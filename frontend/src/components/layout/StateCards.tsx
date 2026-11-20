'use client';

import React from 'react';
import { AlertCircle, Inbox, Loader2, RefreshCw } from 'lucide-react';

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-zinc-800/80 bg-zinc-900/30">
      <Loader2 className="w-6 h-6 text-zinc-400 animate-spin mb-3" />
      <p className="text-sm text-zinc-400 font-medium">{label}</p>
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
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center rounded-xl border border-red-500/20 bg-red-500/5">
      <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400 mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-100 mb-1">{title}</h3>
      <p className="text-xs text-zinc-400 max-w-md mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
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
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20">
      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-100 mb-1">{title}</h3>
      <p className="text-xs text-zinc-400 max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  let styles = 'bg-zinc-800/80 text-zinc-300 border-zinc-700';
  let dot = 'bg-zinc-400';

  if (['healthy', 'ok', 'completed', 'success', 'connected'].includes(normalized)) {
    styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    dot = 'bg-emerald-400';
  } else if (['processing', 'queued', 'running', 'pending'].includes(normalized)) {
    styles = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    dot = 'bg-amber-400';
  } else if (['unhealthy', 'unreachable', 'failed', 'error', 'degraded'].includes(normalized)) {
    styles = 'bg-red-500/10 text-red-400 border-red-500/20';
    dot = 'bg-red-400';
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
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 transition-colors hover:border-zinc-700/80">
      <div className="text-xs font-medium text-zinc-400 mb-1">{label}</div>
      <div className="text-2xl font-semibold tracking-tight text-zinc-100">{value}</div>
      {sublabel && <div className="text-[11px] text-zinc-500 mt-1">{sublabel}</div>}
    </div>
  );
}
