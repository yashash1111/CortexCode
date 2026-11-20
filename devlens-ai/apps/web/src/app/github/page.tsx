'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GitBranch,
  RefreshCw,
  Settings,
  ArrowRight,
  FolderGit2,
  Network,
  GitPullRequest,
  MessageSquare,
  Play,
  Trash2,
  Send,
  Loader2,
  Plus,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { EmptyState, ErrorState, LoadingState, StatusBadge } from '@/components/layout/StateCards';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/providers/AuthProvider';
import { RepoGraphViewer } from '@/components/github/RepoGraphViewer';
import { PRReviewerTab } from '@/components/github/PRReviewerTab';

interface WorkspaceOption {
  id: string;
  name: string;
}

interface RepoItem {
  id: string;
  name: string;
  fullName: string;
  description?: string | null;
  language?: string | null;
  defaultBranch: string;
  private: boolean;
  stars: number;
  chunkCount: number;
  fileCount: number;
  lastAnalyzedAt?: string | null;
  latestJob?: { id: string; status: string; progress: number; error?: string | null } | null;
}

export default function GitHubPage() {
  const { user, loading: authLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [account, setAccount] = useState<{ username: string } | null>(null);
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState('');

  const [activeTab, setActiveTab] = useState<'repos' | 'graph' | 'pr'>('repos');
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [branchInput, setBranchInput] = useState('');
  const [connecting, setConnecting] = useState(false);

  const [qaQuestion, setQaQuestion] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaResult, setQaResult] = useState<{
    answer: string;
    sources: Array<{
      id: string;
      filePath: string;
      symbolName?: string | null;
      startLine: number;
      endLine: number;
      content: string;
      score: number;
    }>;
    usage?: any;
  } | null>(null);
  const [selectedSource, setSelectedSource] = useState<any | null>(null);

  const [graphData, setGraphData] = useState<{ files: any[]; edges: any[] }>({ files: [], edges: [] });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wsRes, accRes] = await Promise.all([
        apiClient.get('/api/workspaces'),
        apiClient.get('/api/github/account').catch(() => ({ data: { data: null } })),
      ]);
      const wsList: WorkspaceOption[] = Array.isArray(wsRes.data?.data) ? wsRes.data.data : [];
      setWorkspaces(wsList);
      const activeWs = workspaceId || wsList[0]?.id || '';
      if (activeWs && !workspaceId) setWorkspaceId(activeWs);
      setAccount(accRes.data?.data || null);

      const repoRes = await apiClient.get(
        `/api/github-intel/repos${activeWs ? `?workspaceId=${encodeURIComponent(activeWs)}` : ''}`
      );
      const repoList: RepoItem[] = Array.isArray(repoRes.data?.data) ? repoRes.data.data : [];
      setRepos(repoList);
      if (repoList.length > 0 && !selectedRepoId) {
        setSelectedRepoId(repoList[0].id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load GitHub intelligence');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, selectedRepoId]);

  useEffect(() => {
    if (!authLoading && user) {
      loadAll();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user, loadAll]);

  useEffect(() => {
    const activeRepo = repos.find(
      (r) => r.latestJob?.status === 'queued' || r.latestJob?.status === 'processing'
    );
    if (!activeRepo?.latestJob?.id) return;

    const timer = setInterval(async () => {
      try {
        const res = await apiClient.get(`/api/jobs/${activeRepo.latestJob!.id}`);
        const job = res.data?.data;
        if (job) {
          setRepos((prev) =>
            prev.map((r) => (r.id === activeRepo.id ? { ...r, latestJob: job } : r))
          );
          if (job.status === 'completed' || job.status === 'failed') {
            loadAll();
          }
        }
      } catch {
        // ignore poll glitch
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [repos, loadAll]);

  useEffect(() => {
    if (activeTab === 'graph' && selectedRepoId) {
      apiClient
        .get(`/api/github-intel/repos/${selectedRepoId}/graph`)
        .then((res) => setGraphData(res.data?.data || { files: [], edges: [] }))
        .catch(() => setGraphData({ files: [], edges: [] }));
    }
  }, [activeTab, selectedRepoId]);

  const handleConnectRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrlInput.trim() || !workspaceId) return;
    setError(null);
    setConnecting(true);
    try {
      const res = await apiClient.post('/api/github-intel/repos/connect', {
        workspaceId,
        repoUrl: repoUrlInput.trim(),
        branch: branchInput.trim() || undefined,
      });
      const created = res.data?.data;
      setRepoUrlInput('');
      setBranchInput('');
      if (created?.id) setSelectedRepoId(created.id);
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to connect repository');
    } finally {
      setConnecting(false);
    }
  };

  const handleStartIndex = async (repo: RepoItem) => {
    setError(null);
    try {
      await apiClient.post(`/api/github-intel/repos/${repo.id}/index`, {
        branch: repo.defaultBranch,
        syncGitHub: true,
      });
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to start repository indexing');
    }
  };

  const handleRemoveRepo = async (repoId: string) => {
    try {
      await apiClient.delete(`/api/github-intel/repos/${repoId}`);
      if (selectedRepoId === repoId) setSelectedRepoId('');
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to remove repository');
    }
  };

  const handleAskCodebase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaQuestion.trim() || !selectedRepoId) return;
    setQaLoading(true);
    setError(null);
    try {
      const res = await apiClient.post(
        `/api/github-intel/repos/${selectedRepoId}/qa`,
        { question: qaQuestion.trim(), topK: 6 },
        { timeout: 60_000 }
      );
      const data = res.data?.data;
      setQaResult(data);
      setSelectedSource(data?.sources?.[0] || null);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Codebase Q&A failed');
    } finally {
      setQaLoading(false);
    }
  };

  return (
    <DashboardShell
      title="GitHub Code Intelligence & PR Reviewer"
      subtitle="Tree-sitter code indexing, dependency graph, architectural Q&A, and automated PR reviews"
      actions={
        <div className="flex items-center gap-2">
          {workspaces.length > 0 && (
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          )}
          <Link
            href="/settings/github"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200"
          >
            <Settings className="w-3.5 h-3.5" />
            OAuth
          </Link>
          {user && (
            <button
              onClick={loadAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      }
    >
      {authLoading || loading ? (
        <LoadingState label="Loading GitHub intelligence workspace..." />
      ) : !user ? (
        <EmptyState
          icon={GitBranch}
          title="Sign in to use GitHub Code Intelligence"
          description="Connect repositories, inspect dependency graphs, ask codebase questions, and review Pull Requests."
          action={
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold"
            >
              Sign In <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs">
              <GitBranch className="w-4 h-4 text-zinc-400" />
              <span className="text-zinc-200 font-medium">
                {account ? `GitHub OAuth: @${account.username}` : 'Public Repos Enabled (Connect GitHub OAuth for Private Repos)'}
              </span>
              <StatusBadge status={account ? 'connected' : 'ok'} />
            </div>
            <Link href="/settings/github" className="text-xs text-blue-400 hover:underline">
              {account ? 'Manage OAuth' : 'Connect OAuth →'}
            </Link>
          </div>

          {error && <ErrorState message={error} onRetry={loadAll} />}

          <div className="flex items-center gap-1 border-b border-zinc-800/80 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('repos')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                activeTab === 'repos' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Repositories & Q&A ({repos.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('graph')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                activeTab === 'graph' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Dependency Graph
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pr')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                activeTab === 'pr' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              AI PR Reviewer
            </button>
          </div>

          {activeTab === 'repos' && (
            <div className="space-y-6">
              <form
                onSubmit={handleConnectRepo}
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 flex flex-col sm:flex-row gap-3"
              >
                <input
                  type="text"
                  value={repoUrlInput}
                  onChange={(e) => setRepoUrlInput(e.target.value)}
                  placeholder="GitHub URL or owner/repo (e.g. https://github.com/vercel/swr)"
                  className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
                <input
                  type="text"
                  value={branchInput}
                  onChange={(e) => setBranchInput(e.target.value)}
                  placeholder="Branch (optional)"
                  className="sm:w-36 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
                <button
                  type="submit"
                  disabled={connecting || !repoUrlInput.trim() || !workspaceId}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold disabled:opacity-50"
                >
                  {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Connect Repo
                </button>
              </form>

              {repos.length === 0 ? (
                <EmptyState
                  icon={FolderGit2}
                  title="No repositories connected"
                  description="Enter a public GitHub URL above or connect GitHub OAuth to index a repository."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {repos.map((r) => {
                    const isSelected = selectedRepoId === r.id;
                    const jobStatus = r.latestJob?.status;
                    const progress = r.latestJob?.progress ?? (r.chunkCount > 0 ? 100 : 0);
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRepoId(r.id)}
                        className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-blue-500/50 bg-blue-500/5'
                            : 'border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="text-sm font-semibold text-zinc-100">{r.fullName}</div>
                            <div className="text-[11px] text-zinc-500">
                              Branch: <code className="text-zinc-300">{r.defaultBranch}</code> • {r.language || 'Code'} • {r.fileCount} files • {r.chunkCount} chunks
                            </div>
                          </div>
                          {jobStatus && <StatusBadge status={jobStatus} />}
                        </div>

                        {(jobStatus === 'queued' || jobStatus === 'processing') && (
                          <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden my-2">
                            <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2 mt-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartIndex(r);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-100"
                          >
                            <Play className="w-3 h-3" />
                            {r.chunkCount > 0 ? 'Re-index' : 'Start Indexing'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveRepo(r.id);
                            }}
                            className="p-1.5 rounded-md border border-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-300"
                            title="Remove repository"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedRepoId && (
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-100">Codebase Architectural Q&A</h3>
                    <span className="text-[11px] text-zinc-500">
                      Hybrid pgvector + keyword search + Dependency Graph
                    </span>
                  </div>

                  <form onSubmit={handleAskCodebase} className="flex gap-2">
                    <input
                      type="text"
                      value={qaQuestion}
                      onChange={(e) => setQaQuestion(e.target.value)}
                      placeholder="e.g. Where is JWT validation implemented? Which files call this function?"
                      className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
                    />
                    <button
                      type="submit"
                      disabled={qaLoading || !qaQuestion.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold disabled:opacity-50"
                    >
                      {qaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Ask
                    </button>
                  </form>

                  {qaResult && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
                      <div className="lg:col-span-7 rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 space-y-3">
                        <div className="text-xs leading-relaxed text-zinc-200 whitespace-pre-wrap">
                          {qaResult.answer}
                        </div>
                        {qaResult.sources.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-800">
                            {qaResult.sources.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setSelectedSource(s)}
                                className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                                  selectedSource?.id === s.id
                                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                                }`}
                              >
                                {s.filePath}:{s.startLine}-{s.endLine}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="lg:col-span-5 rounded-lg border border-zinc-800 bg-zinc-950 p-3 overflow-auto max-h-80">
                        {selectedSource ? (
                          <>
                            <div className="text-[11px] font-mono text-blue-400 mb-2">
                              {selectedSource.filePath} (Lines {selectedSource.startLine}-{selectedSource.endLine})
                              {selectedSource.symbolName ? ` • ${selectedSource.symbolName}` : ''}
                            </div>
                            <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">
                              {selectedSource.content}
                            </pre>
                          </>
                        ) : (
                          <div className="text-xs text-zinc-500">Click a file reference to inspect source code.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'graph' && (
            <RepoGraphViewer files={graphData.files} edges={graphData.edges} />
          )}

          {activeTab === 'pr' && workspaceId && (
            <PRReviewerTab workspaceId={workspaceId} />
          )}
        </div>
      )}
    </DashboardShell>
  );
}
