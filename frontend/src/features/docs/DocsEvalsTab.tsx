'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Play, BarChart3, Loader2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { EvalRunItem } from './types';
import { EmptyState, MetricCard, StatusBadge } from '@/components/layout/StateCards';

export function DocsEvalsTab({
  workspaceId,
  hasIndexedDocs,
}: {
  workspaceId: string;
  hasIndexedDocs: boolean;
}) {
  const [runs, setRuns] = useState<EvalRunItem[]>([]);
  const [selectedRun, setSelectedRun] = useState<EvalRunItem | null>(null);
  const [customJson, setCustomJson] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/api/docs/evals?workspaceId=${encodeURIComponent(workspaceId)}`);
      const list: EvalRunItem[] = Array.isArray(res.data?.data) ? res.data.data : [];
      setRuns(list);
      if (list.length > 0 && !selectedRun) {
        const detail = await apiClient.get(`/api/docs/evals/${list[0].id}`);
        setSelectedRun(detail.data?.data || list[0]);
      }
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to load evaluation runs');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, selectedRun]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadRuns();
    });
  }, [loadRuns]);

  const handleRunEval = async () => {
    setError(null);
    let parsedCases: Array<{ question: string; expectedSource?: string; groundTruth?: string }> | undefined;

    if (showCustom && customJson.trim()) {
      try {
        const parsed = JSON.parse(customJson);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error('Dataset must be a non-empty JSON array.');
        }
        parsedCases = parsed;
      } catch (e: unknown) {
        setError(`Invalid JSON dataset: ${e instanceof Error ? e.message : 'Parse error'}`);
        return;
      }
    }

    setRunning(true);
    try {
      const res = await apiClient.post(
        '/api/docs/evals/run',
        { workspaceId, cases: parsedCases, topK: 5 },
        { timeout: 180_000 }
      );
      const run: EvalRunItem = res.data?.data;
      setSelectedRun(run);
      await loadRuns();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(apiErr?.response?.data?.error?.message || apiErr?.message || 'Evaluation run failed');
    } finally {
      setRunning(false);
    }
  };

  const selectRun = async (runId: string) => {
    try {
      const res = await apiClient.get(`/api/docs/evals/${runId}`);
      setSelectedRun(res.data?.data || null);
    } catch {
      setError('Failed to load evaluation details');
    }
  };

  const metrics = selectedRun?.metrics;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">RAG Evaluation Engine (LLM-as-a-Judge)</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Measures Retrieval Hit Rate, MRR, Context Relevance, Answer Faithfulness, Citation Precision, and Latency.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowCustom((v) => !v)}
            className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200 transition-colors"
          >
            {showCustom ? 'Use Auto 30-Q Benchmark' : 'Custom Dataset JSON'}
          </button>
          <button
            type="button"
            disabled={running || !hasIndexedDocs}
            onClick={handleRunEval}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {running ? 'Running Evaluation...' : 'Run Benchmark'}
          </button>
        </div>
      </div>

      {showCustom && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-2">
          <label className="block text-xs font-medium text-zinc-300">
            Custom Benchmark JSON (`[{`{"question":"...","expectedSource":"doc.pdf","groundTruth":"..."}`}]`)
          </label>
          <textarea
            rows={5}
            value={customJson}
            onChange={(e) => setCustomJson(e.target.value)}
            placeholder='[{"question":"How does auth work?","expectedSource":"System_Design.pdf","groundTruth":"Uses JWT bearer tokens."}]'
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-600"
          />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && runs.length === 0 && !running ? (
        <EmptyState
          icon={BarChart3}
          title="No evaluation runs yet"
          description={
            hasIndexedDocs
              ? 'Click "Run Benchmark" to evaluate retrieval and groundedness on your indexed documents.'
              : 'Upload and index at least one document before running RAG evaluations.'
          }
        />
      ) : selectedRun ? (
        <>
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard label="Hit Rate" value={`${(metrics.retrievalHitRate * 100).toFixed(1)}%`} />
              <MetricCard label="MRR" value={metrics.meanReciprocalRank.toFixed(3)} />
              <MetricCard label="Context Rel." value={`${(metrics.contextRelevance * 100).toFixed(1)}%`} />
              <MetricCard label="Faithfulness" value={`${(metrics.answerFaithfulness * 100).toFixed(1)}%`} />
              <MetricCard label="Citation Prec." value={`${(metrics.citationPrecision * 100).toFixed(1)}%`} />
              <MetricCard
                label="Avg Latency"
                value={`${metrics.avgLatencyMs} ms`}
                sublabel={`${selectedRun.passedCount}/${selectedRun.datasetSize} passed`}
              />
            </div>
          )}

          {/* Run History Selector */}
          {runs.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {runs.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => selectRun(r.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs whitespace-nowrap transition-colors ${
                    selectedRun.id === r.id
                      ? 'border-zinc-600 bg-zinc-800 text-zinc-100'
                      : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {r.name} ({r.datasetSize} Qs)
                </button>
              ))}
            </div>
          )}

          {/* Per-question results */}
          {selectedRun.cases && selectedRun.cases.length > 0 && (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800/80">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Question</th>
                      <th className="px-4 py-2.5 font-medium">Expected</th>
                      <th className="px-4 py-2.5 font-medium">Retrieved</th>
                      <th className="px-4 py-2.5 font-medium">Hit / MRR</th>
                      <th className="px-4 py-2.5 font-medium">Faithfulness</th>
                      <th className="px-4 py-2.5 font-medium">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {selectedRun.cases.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-900/50 align-top">
                        <td className="px-4 py-3 max-w-xs">
                          <div className="text-zinc-100 font-medium">{c.question}</div>
                          <div className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                            {c.actualAnswer}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-300">{c.expectedSource}</td>
                        <td className="px-4 py-3 font-mono text-zinc-400">
                          {c.retrievedSources.map((s) => s.documentName).slice(0, 2).join(', ') || 'None'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={c.hitRate >= 1 ? 'success' : 'failed'} />
                          <div className="font-mono text-[11px] text-zinc-500 mt-1">
                            MRR: {c.reciprocalRank.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-300">
                          {(c.answerFaithfulness * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-400">{c.latencyMs} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
