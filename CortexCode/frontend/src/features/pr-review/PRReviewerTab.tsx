'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  GitPullRequest,
  Play,
  Loader2,
  AlertCircle,
  Check,
  X,
  Copy,
  Send,
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { EmptyState, StatusBadge } from '@/components/layout/StateCards';

interface FindingItem {
  id: string;
  filePath: string;
  lineNumber?: number | null;
  severity: 'critical' | 'warning' | 'suggestion' | string;
  category: string;
  title: string;
  description: string;
  suggestedFix?: string | null;
  status: string;
}

interface PRReviewItem {
  id: string;
  prUrl?: string | null;
  status: string;
  summary?: string | null;
  score?: number | null;
  model?: string | null;
  diffContent?: string | null;
  changedFiles?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }> | null;
  createdAt: string;
  pullRequest: {
    number: number;
    title: string;
    author: string;
    sourceBranch: string;
    targetBranch: string;
    githubUrl: string;
    repository: { fullName: string };
  };
  findings: FindingItem[];
}

export function PRReviewerTab({ workspaceId }: { workspaceId: string }) {
  const [prUrl, setPrUrl] = useState('');
  const [reviews, setReviews] = useState<PRReviewItem[]>([]);
  const [activeReview, setActiveReview] = useState<PRReviewItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    try {
      const res = await apiClient.get(`/api/github-intel/pr-reviews?workspaceId=${encodeURIComponent(workspaceId)}`);
      const list: PRReviewItem[] = Array.isArray(res.data?.data) ? res.data.data : [];
      setReviews(list);
      if (list.length > 0 && !activeReview) {
        setActiveReview(list[0]);
        setSelectedFile(list[0].changedFiles?.[0]?.filename || '');
      }
    } catch {
      // ignore initial load error
    }
  }, [workspaceId, activeReview]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadReviews();
    });
  }, [loadReviews]);

  const handleRunReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prUrl.trim()) return;
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await apiClient.post(
        '/api/github-intel/pr-reviews',
        { workspaceId, prUrl: prUrl.trim() },
        { timeout: 120_000 }
      );
      const rev: PRReviewItem = res.data?.data;
      setActiveReview(rev);
      setSelectedFile(rev.changedFiles?.[0]?.filename || '');
      setPrUrl('');
      await loadReviews();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(apiErr?.response?.data?.error?.message || apiErr?.message || 'PR review failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFindingStatus = async (findingId: string, status: 'open' | 'dismissed' | 'resolved' | 'approved') => {
    try {
      await apiClient.patch(`/api/github-intel/pr-reviews/findings/${findingId}`, { status });
      setActiveReview((prev) =>
        prev
          ? {
              ...prev,
              findings: prev.findings.map((f) => (f.id === findingId ? { ...f, status } : f)),
            }
          : null
      );
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to update finding');
    }
  };

  const handlePublishApproved = async () => {
    if (!activeReview) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await apiClient.post(`/api/github-intel/pr-reviews/${activeReview.id}/publish`, {
        confirmed: true,
      });
      setConfirmPublish(false);
      setNotice(`Published approved review comments to GitHub: ${res.data?.data?.commentUrl}`);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to publish comments to GitHub');
    } finally {
      setPublishing(false);
    }
  };

  const activeFilePatch =
    activeReview?.changedFiles?.find((f) => f.filename === selectedFile)?.patch ||
    activeReview?.diffContent ||
    '';

  const visibleFindings = (activeReview?.findings || []).filter(
    (f) => severityFilter === 'all' || f.severity === severityFilter
  );

  const approvedCount = (activeReview?.findings || []).filter((f) => f.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* PR URL Form */}
      <form
        onSubmit={handleRunReview}
        className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 flex flex-col sm:flex-row gap-3"
      >
        <input
          type="url"
          value={prUrl}
          onChange={(e) => setPrUrl(e.target.value)}
          placeholder="Paste GitHub PR URL (e.g. https://github.com/owner/repo/pull/42)"
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
        />
        <button
          type="submit"
          disabled={submitting || !prUrl.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {submitting ? 'Reviewing PR...' : 'Run AI PR Review'}
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300">
          {notice}
        </div>
      )}

      {!activeReview ? (
        <EmptyState
          icon={GitPullRequest}
          title="No PR reviews yet"
          description="Paste any accessible GitHub Pull Request URL above to run a codebase-aware AI review."
        />
      ) : (
        <div className="space-y-4">
          {/* Review History Strip */}
          {reviews.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {reviews.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setActiveReview(r);
                    setSelectedFile(r.changedFiles?.[0]?.filename || '');
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs whitespace-nowrap ${
                    activeReview.id === r.id
                      ? 'border-zinc-600 bg-zinc-800 text-zinc-100'
                      : 'border-zinc-800 bg-zinc-900/40 text-zinc-400'
                  }`}
                >
                  {r.pullRequest.repository.fullName} #{r.pullRequest.number}
                </button>
              ))}
            </div>
          )}

          {/* PR Overview Header */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-zinc-100">
                  {activeReview.pullRequest.title}
                </span>
                <StatusBadge status={activeReview.status} />
                {activeReview.score !== null && activeReview.score !== undefined && (
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px]">
                    Score: {activeReview.score}/100
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {activeReview.pullRequest.repository.fullName} #{activeReview.pullRequest.number} • by @{activeReview.pullRequest.author} ({activeReview.pullRequest.sourceBranch} → {activeReview.pullRequest.targetBranch})
              </p>
              {activeReview.summary && (
                <p className="text-xs text-zinc-300 mt-2">{activeReview.summary}</p>
              )}
            </div>

            {approvedCount > 0 && (
              <button
                type="button"
                onClick={() => setConfirmPublish(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-xs font-semibold shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                Publish {approvedCount} Approved
              </button>
            )}
          </div>

          {/* Diff Viewer & Findings Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Diff Viewer */}
            <div className="lg:col-span-7 rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden flex flex-col max-h-[560px]">
              <div className="px-3 py-2 border-b border-zinc-800/80 bg-zinc-950/60 flex items-center gap-2 overflow-x-auto">
                {(activeReview.changedFiles || []).map((f) => (
                  <button
                    key={f.filename}
                    type="button"
                    onClick={() => setSelectedFile(f.filename)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono whitespace-nowrap ${
                      selectedFile === f.filename
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {f.filename} (+{f.additions}/-{f.deletions})
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-auto p-3 font-mono text-[11px] leading-5 bg-zinc-950">
                {activeFilePatch ? (
                  activeFilePatch.split('\n').map((line, i) => {
                    const cls = line.startsWith('+')
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : line.startsWith('-')
                      ? 'bg-red-500/15 text-red-300'
                      : line.startsWith('@@')
                      ? 'text-blue-400 bg-blue-500/10'
                      : 'text-zinc-400';
                    return (
                      <div key={i} className={`px-2 whitespace-pre ${cls}`}>
                        {line || ' '}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-zinc-500 p-4">No diff patch available.</div>
                )}
              </div>
            </div>

            {/* Findings Panel */}
            <div className="lg:col-span-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 flex flex-col max-h-[560px] overflow-y-auto space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-zinc-200">
                  Findings ({visibleFindings.length})
                </h4>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-300"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="suggestion">Suggestion</option>
                </select>
              </div>

              {visibleFindings.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                  No findings for this filter.
                </div>
              ) : (
                visibleFindings.map((f) => (
                  <div
                    key={f.id}
                    className={`rounded-lg border p-3 space-y-2 ${
                      f.status === 'dismissed'
                        ? 'border-zinc-800/40 bg-zinc-950/30 opacity-50'
                        : 'border-zinc-800 bg-zinc-950/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono uppercase mr-1.5 ${
                            f.severity === 'critical'
                              ? 'bg-red-500/20 text-red-300'
                              : f.severity === 'warning'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {f.severity}
                        </span>
                        <span className="text-xs font-semibold text-zinc-100">{f.title}</span>
                      </div>
                      <StatusBadge status={f.status} />
                    </div>

                    <div className="text-[11px] font-mono text-zinc-400">
                      {f.filePath}{f.lineNumber ? `:${f.lineNumber}` : ''} • {f.category}
                    </div>
                    <p className="text-xs text-zinc-300">{f.description}</p>

                    {f.suggestedFix && (
                      <div className="rounded bg-zinc-900 border border-zinc-800 p-2 text-[11px] font-mono text-zinc-200 relative">
                        <button
                          type="button"
                          onClick={() => navigator.clipboard?.writeText(f.suggestedFix || '')}
                          className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-zinc-800 text-zinc-400"
                          title="Copy suggested fix"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <pre className="overflow-x-auto pr-6">{f.suggestedFix}</pre>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleFindingStatus(f.id, 'approved')}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px]"
                      >
                        <Check className="w-3 h-3" /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFindingStatus(f.id, 'resolved')}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px]"
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFindingStatus(f.id, 'dismissed')}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-[11px]"
                      >
                        <X className="w-3 h-3" /> Dismiss
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Explicit Confirmation Modal for Publishing */}
      {confirmPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-100">Confirm GitHub PR Comment</h3>
            <p className="text-xs text-zinc-400">
              You are about to post {approvedCount} approved review finding(s) to{' '}
              <span className="font-mono text-zinc-200">
                {activeReview?.pullRequest.repository.fullName} #{activeReview?.pullRequest.number}
              </span>
              . This will modify the live GitHub Pull Request.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmPublish(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={publishing}
                onClick={handlePublishApproved}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold disabled:opacity-50"
              >
                {publishing ? 'Publishing...' : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
