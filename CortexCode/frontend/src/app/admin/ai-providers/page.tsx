'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Shield, CheckCircle2, AlertTriangle, Play, Power } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { EmptyState, ErrorState, LoadingState, MetricCard, StatusBadge } from '@/components/layout/StateCards';
import { apiClient } from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/errorUtils';
import { useAuth } from '@/providers/AuthProvider';

interface ProviderEntry {
  provider: string;
  displayName: string;
  configured: boolean;
  credentialStatus: string;
  enabled: boolean;
  priority: number;
  selectedModel: string;
  supportedModels: string[];
  supportsStreaming: boolean;
  supportsJsonMode: boolean;
  health: {
    status: string;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    lastError: string | null;
    lastLatencyMs: number | null;
    requestCount: number;
    failureCount: number;
    fallbackCount: number;
  };
}

interface AdminDashboardData {
  providers: ProviderEntry[];
  recentEvents: Array<{
    id: string;
    provider: string;
    model: string | null;
    status: string;
    latencyMs: number | null;
    statusCode: number | null;
    errorMessage: string | null;
    createdAt: string;
  }>;
  usage: {
    totalRequests: number;
    totalTokens: number;
    totalEstimatedCost: number;
  };
}

export default function AdminAIProvidersPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/admin/ai-providers');
      setData(res.data?.data || null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load AI provider controls'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === 'ADMIN') {
      queueMicrotask(() => {
        void loadData();
      });
    } else if (!authLoading) {
      queueMicrotask(() => {
        setLoading(false);
      });
    }
  }, [authLoading, user, loadData]);

  const handleUpdate = async (provider: string, patch: { enabled?: boolean; priority?: number; selectedModel?: string }) => {
    setError(null);
    try {
      await apiClient.patch(`/api/admin/ai-providers/${provider}`, patch);
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update provider configuration'));
    }
  };

  const handleTest = async (provider: string) => {
    setTesting(provider);
    setTestResult(null);
    try {
      const res = await apiClient.post(`/api/admin/ai-providers/${provider}/test`);
      const d = res.data?.data;
      setTestResult(
        d?.ok
          ? `${provider} connection healthy (${d.latencyMs}ms)`
          : `${provider} check failed: ${d?.error || 'Unavailable'}`
      );
      await loadData();
    } catch (err: unknown) {
      setTestResult(getErrorMessage(err, `Failed to test ${provider}`));
    } finally {
      setTesting(null);
    }
  };

  return (
    <DashboardShell
      title="Central AI Providers"
      subtitle="Administrator-only provider health, model routing, fallback activity, and fair-use telemetry"
      actions={
        <button
          onClick={() => void loadData()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--btn-secondary-bg)] hover:bg-[var(--btn-secondary-hover)] border border-[var(--btn-secondary-border)] text-xs font-medium text-[var(--btn-secondary-text)]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      }
    >
      {authLoading || loading ? (
        <LoadingState label="Loading centralized AI provider controls..." />
      ) : user?.role !== 'ADMIN' ? (
        <EmptyState
          icon={Shield}
          title="Administrator Access Required"
          description="Centralized AI provider credentials and controls are restricted to system administrators."
        />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadData()} />
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard label="Total AI Requests" value={data.usage.totalRequests.toLocaleString()} />
            <MetricCard label="Total Tokens" value={data.usage.totalTokens.toLocaleString()} />
            <MetricCard label="Estimated Spend" value={`$${data.usage.totalEstimatedCost.toFixed(4)}`} />
          </div>

          {testResult && (
            <div className="p-3 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-xs font-medium text-[var(--text-primary)]">
              {testResult}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.providers.map((p) => (
              <div
                key={p.provider}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-3 shadow-[var(--shadow-sm)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{p.displayName}</h3>
                      <StatusBadge status={p.health.status} />
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Credential: <strong>{p.credentialStatus}</strong> · Priority #{p.priority}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void handleUpdate(p.provider, { enabled: !p.enabled })}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                        p.enabled
                          ? 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-default)]'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      {p.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button
                      onClick={() => void handleTest(p.provider)}
                      disabled={!p.configured || testing === p.provider}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] disabled:opacity-50 text-[var(--btn-primary-text)] text-xs font-medium"
                    >
                      <Play className="w-3 h-3" />
                      {testing === p.provider ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">Active Model</label>
                    <select
                      value={p.selectedModel}
                      onChange={(e) => void handleUpdate(p.provider, { selectedModel: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] text-xs"
                    >
                      {p.supportedModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">Priority</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={p.priority}
                      onChange={(e) => void handleUpdate(p.provider, { priority: Number(e.target.value) || 1 })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
                  <span>Requests: <strong className="text-[var(--text-primary)]">{p.health.requestCount}</strong></span>
                  <span>Failures: <strong className="text-[var(--text-primary)]">{p.health.failureCount}</strong></span>
                  <span>Fallbacks: <strong className="text-[var(--text-primary)]">{p.health.fallbackCount}</strong></span>
                  {p.health.lastLatencyMs !== null && (
                    <span>Latency: <strong className="text-[var(--text-primary)]">{p.health.lastLatencyMs}ms</strong></span>
                  )}
                </div>

                {p.health.lastError && (
                  <div className="flex items-start gap-1.5 text-[11px] text-[var(--status-error)] bg-[var(--status-error-bg)] border border-[var(--status-error-border)] rounded-lg p-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="truncate">{p.health.lastError}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Recent Provider Health & Fallback Events
            </h2>
            {data.recentEvents.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No health events recorded yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                {data.recentEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between gap-3 text-xs px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {ev.status === 'healthy' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-success)] shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-[var(--status-warning)] shrink-0" />
                      )}
                      <span className="font-medium text-[var(--text-primary)]">{ev.provider}</span>
                      {ev.model && <span className="text-[var(--text-muted)] font-mono truncate">{ev.model}</span>}
                      {ev.errorMessage && <span className="text-[var(--status-error)] truncate">{ev.errorMessage}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-[11px] text-[var(--text-muted)]">
                      {ev.latencyMs !== null && <span>{ev.latencyMs}ms</span>}
                      <StatusBadge status={ev.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </DashboardShell>
  );
}
