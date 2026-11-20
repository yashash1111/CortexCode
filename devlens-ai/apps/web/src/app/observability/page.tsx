'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Activity, RefreshCw, Server, ArrowRight } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  StatusBadge,
} from '@/components/layout/StateCards';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/providers/AuthProvider';

interface HealthPayload {
  status: string;
  services: Record<string, string>;
}

interface ObservabilityData {
  summary: {
    totalRequests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    totalCost: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    errorCount: number;
    rateLimitEvents: number;
  };
  byModel: Array<{ model: string; requests: number; tokens: number; cost: number }>;
  byModule: Array<{ module: string; requests: number; tokens: number; cost: number }>;
  dailyUsage: Array<{ date: string; requests: number; tokens: number; cost: number; avgLatencyMs: number }>;
  availableModels: string[];
  recentUsage: Array<{
    id: string;
    provider: string;
    model: string;
    requestType: string;
    latencyMs: number;
    totalTokens: number;
    estimatedCost: number;
    status: string;
    createdAt: string;
  }>;
  recentJobs: Array<{
    id: string;
    moduleType: string;
    status: string;
    progress: number;
    error?: string | null;
    createdAt: string;
  }>;
  recentEvals: Array<{
    id: string;
    name: string;
    status: string;
    datasetSize: number;
    passedCount: number;
    createdAt: string;
  }>;
  recentPRReviews: Array<{
    id: string;
    status: string;
    score?: number | null;
    createdAt: string;
    pullRequest: { number: number; title: string; repository: { fullName: string } };
    _count: { findings: number };
  }>;
}

export default function ObservabilityPage() {
  const { user, loading: authLoading } = useAuth();
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [obs, setObs] = useState<ObservabilityData | null>(null);
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; name: string }>>([]);

  // Filters
  const [days, setDays] = useState('30');
  const [workspaceId, setWorkspaceId] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTelemetry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const healthRes = await fetch('/api/backend-health');
      setHealth(await healthRes.json());

      if (user) {
        const params = new URLSearchParams({ days });
        if (workspaceId) params.set('workspaceId', workspaceId);
        if (moduleFilter) params.set('module', moduleFilter);
        if (modelFilter) params.set('model', modelFilter);

        const [obsRes, wsRes] = await Promise.all([
          apiClient.get(`/api/jobs/observability/summary?${params.toString()}`),
          apiClient.get('/api/workspaces'),
        ]);
        setObs(obsRes.data?.data || null);
        setWorkspaces(Array.isArray(wsRes.data?.data) ? wsRes.data.data : []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load observability');
    } finally {
      setLoading(false);
    }
  }, [user, days, workspaceId, moduleFilter, modelFilter]);

  useEffect(() => {
    if (!authLoading) loadTelemetry();
  }, [authLoading, loadTelemetry]);

  return (
    <DashboardShell
      title="Observability"
      subtitle="Real-time AI Gateway usage, costs, latency percentiles, jobs, evals, and PR review telemetry"
      actions={
        <button
          onClick={loadTelemetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      }
    >
      <div className="space-y-6">
        {loading ? (
          <LoadingState label="Loading observability metrics..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadTelemetry} />
        ) : (
          <>
            {/* Infrastructure Health */}
            {health && (
              <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-zinc-400" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                      Infrastructure Health
                    </h2>
                  </div>
                  <StatusBadge status={health.status} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(health.services).map(([svc, state]) => (
                    <div
                      key={svc}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 flex items-center justify-between"
                    >
                      <span className="text-xs font-medium text-zinc-300 capitalize">{svc}</span>
                      <StatusBadge status={state} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!user ? (
              <EmptyState
                icon={Activity}
                title="Sign in for AI & Job Telemetry"
                description="Metrics, Recharts dashboards, evaluation history, and PR review logs are scoped to your account."
                action={
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold"
                  >
                    Sign In <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                }
              />
            ) : obs ? (
              <>
                {/* Filters */}
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3 flex flex-wrap items-center gap-3">
                  <select
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200"
                  >
                    <option value="7">Last 7 days</option>
                    <option value="14">Last 14 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                  <select
                    value={workspaceId}
                    onChange={(e) => setWorkspaceId(e.target.value)}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200"
                  >
                    <option value="">All Workspaces</option>
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value)}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200"
                  >
                    <option value="">All Modules</option>
                    <option value="docs">Docs RAG</option>
                    <option value="github">GitHub & PR</option>
                  </select>
                  <select
                    value={modelFilter}
                    onChange={(e) => setModelFilter(e.target.value)}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200"
                  >
                    <option value="">All Models</option>
                    {obs.availableModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <MetricCard label="Total AI Requests" value={obs.summary.totalRequests} />
                  <MetricCard
                    label="Total Tokens"
                    value={obs.summary.totalTokens.toLocaleString()}
                    sublabel={`In: ${obs.summary.promptTokens.toLocaleString()} • Out: ${obs.summary.completionTokens.toLocaleString()}`}
                  />
                  <MetricCard label="Estimated Cost" value={`$${obs.summary.totalCost.toFixed(4)}`} />
                  <MetricCard
                    label="Latency (Avg / p95)"
                    value={`${obs.summary.avgLatencyMs} ms`}
                    sublabel={`p50: ${obs.summary.p50LatencyMs}ms • p95: ${obs.summary.p95LatencyMs}ms`}
                  />
                  <MetricCard
                    label="Failures / Rate Limits"
                    value={`${obs.summary.errorCount} / ${obs.summary.rateLimitEvents}`}
                  />
                </div>

                {/* Recharts Visualizations */}
                {obs.dailyUsage.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                      <h3 className="text-xs font-semibold text-zinc-200 mb-3">Daily Token Consumption</h3>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={obs.dailyUsage}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis dataKey="date" stroke="#71717a" fontSize={10} />
                            <YAxis stroke="#71717a" fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: 11 }} />
                            <Area type="monotone" dataKey="tokens" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                      <h3 className="text-xs font-semibold text-zinc-200 mb-3">Daily Cost (USD)</h3>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={obs.dailyUsage}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis dataKey="date" stroke="#71717a" fontSize={10} />
                            <YAxis stroke="#71717a" fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: 11 }} />
                            <Bar dataKey="cost" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                      <h3 className="text-xs font-semibold text-zinc-200 mb-3">Daily Average Latency (ms)</h3>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={obs.dailyUsage}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis dataKey="date" stroke="#71717a" fontSize={10} />
                            <YAxis stroke="#71717a" fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: 11 }} />
                            <Line type="monotone" dataKey="avgLatencyMs" stroke="#f59e0b" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                      <h3 className="text-xs font-semibold text-zinc-200 mb-3">Requests by Module & Model</h3>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={obs.byModel}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis dataKey="model" stroke="#71717a" fontSize={10} />
                            <YAxis stroke="#71717a" fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: 11 }} />
                            <Bar dataKey="requests" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* Background Jobs, Eval History, PR Review History */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-2">
                    <h3 className="text-xs font-semibold text-zinc-200">Background Jobs ({obs.recentJobs.length})</h3>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {obs.recentJobs.map((j) => (
                        <div key={j.id} className="flex items-center justify-between text-xs p-2 rounded bg-zinc-950/60 border border-zinc-800/60">
                          <span className="font-mono text-zinc-300">{j.moduleType} ({j.progress}%)</span>
                          <StatusBadge status={j.status} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-2">
                    <h3 className="text-xs font-semibold text-zinc-200">RAG Evaluations ({obs.recentEvals.length})</h3>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {obs.recentEvals.map((ev) => (
                        <div key={ev.id} className="flex items-center justify-between text-xs p-2 rounded bg-zinc-950/60 border border-zinc-800/60">
                          <span className="truncate text-zinc-300">{ev.name} ({ev.passedCount}/{ev.datasetSize})</span>
                          <StatusBadge status={ev.status} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-2">
                    <h3 className="text-xs font-semibold text-zinc-200">PR Reviews ({obs.recentPRReviews.length})</h3>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {obs.recentPRReviews.map((pr) => (
                        <div key={pr.id} className="flex items-center justify-between text-xs p-2 rounded bg-zinc-950/60 border border-zinc-800/60">
                          <span className="truncate text-zinc-300">
                            {pr.pullRequest.repository.fullName} #{pr.pullRequest.number} ({pr._count.findings})
                          </span>
                          <StatusBadge status={pr.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Detailed Request Records */}
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800/80 text-xs font-semibold text-zinc-200">
                    Recent AI Gateway Requests
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800/80">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">Provider / Model</th>
                          <th className="px-4 py-2.5 font-medium">Type</th>
                          <th className="px-4 py-2.5 font-medium">Tokens</th>
                          <th className="px-4 py-2.5 font-medium">Latency</th>
                          <th className="px-4 py-2.5 font-medium">Cost</th>
                          <th className="px-4 py-2.5 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {obs.recentUsage.map((log) => (
                          <tr key={log.id} className="hover:bg-zinc-900/50">
                            <td className="px-4 py-2.5 font-mono text-zinc-200">{log.provider} / {log.model}</td>
                            <td className="px-4 py-2.5 text-zinc-400">{log.requestType}</td>
                            <td className="px-4 py-2.5 text-zinc-300">{log.totalTokens}</td>
                            <td className="px-4 py-2.5 text-zinc-300">{log.latencyMs} ms</td>
                            <td className="px-4 py-2.5 text-zinc-300">${log.estimatedCost.toFixed(5)}</td>
                            <td className="px-4 py-2.5"><StatusBadge status={log.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
