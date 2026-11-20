'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  MessageSquare,
  FileText,
  BarChart3,
  Plus,
  Send,
  Square,
  Trash2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { EmptyState, ErrorState, LoadingState } from '@/components/layout/StateCards';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/providers/AuthProvider';
import { ChatMsg, CitationSource, DocItem } from '@/components/docs/types';
import { MarkdownRenderer } from '@/components/docs/MarkdownRenderer';
import { CitationViewer } from '@/components/docs/CitationViewer';
import { DocsDocumentsTab } from '@/components/docs/DocsDocumentsTab';
import { DocsEvalsTab } from '@/components/docs/DocsEvalsTab';

interface WorkspaceOption {
  id: string;
  name: string;
  description?: string;
}

export default function DocsPage() {
  const { user, loading: authLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [newWsName, setNewWsName] = useState('');
  const [creatingWs, setCreatingWs] = useState(false);
  const [showNewWs, setShowNewWs] = useState(false);

  const [activeTab, setActiveTab] = useState<'chat' | 'documents' | 'evals'>('chat');
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [activeSources, setActiveSources] = useState<CitationSource[]>([]);
  const [activeSourceIdx, setActiveSourceIdx] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/workspaces');
      const list: WorkspaceOption[] = Array.isArray(res.data?.data) ? res.data.data : [];
      setWorkspaces(list);
      if (list.length > 0 && !workspaceId) {
        setWorkspaceId(list[0].id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const loadWorkspaceDocsAndChat = useCallback(async (wsId: string) => {
    if (!wsId) return;
    try {
      const [docsRes, chatRes] = await Promise.all([
        apiClient.get(`/api/docs?workspaceId=${encodeURIComponent(wsId)}`),
        apiClient.get(`/api/docs/chat/history?workspaceId=${encodeURIComponent(wsId)}`),
      ]);
      setDocuments(Array.isArray(docsRes.data?.data) ? docsRes.data.data : []);
      const msgs: ChatMsg[] = (chatRes.data?.data?.messages || []).map((m: any) => ({
        id: m.id,
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
        sources: Array.isArray(m.sources) ? m.sources : [],
      }));
      setMessages(msgs);
      const lastWithSources = [...msgs].reverse().find((m) => m.sources && m.sources.length > 0);
      if (lastWithSources?.sources) {
        setActiveSources(lastWithSources.sources);
        setActiveSourceIdx(0);
      } else {
        setActiveSources([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to load workspace documents');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      loadWorkspaces();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user, loadWorkspaces]);

  useEffect(() => {
    if (workspaceId) {
      loadWorkspaceDocsAndChat(workspaceId);
    }
  }, [workspaceId, loadWorkspaceDocsAndChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setCreatingWs(true);
    try {
      const res = await apiClient.post('/api/workspaces', {
        name: newWsName.trim(),
        description: 'Docs & Spec RAG Workspace',
      });
      const created = res.data?.data;
      if (created?.id) {
        setWorkspaces((prev) => [created, ...prev]);
        setWorkspaceId(created.id);
        setNewWsName('');
        setShowNewWs(false);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to create workspace');
    } finally {
      setCreatingWs(false);
    }
  };

  const handleSelectCitation = (source: CitationSource, msgSources?: CitationSource[]) => {
    const list = msgSources && msgSources.length > 0 ? msgSources : activeSources;
    setActiveSources(list);
    const idx = list.findIndex((s) => s.id === source.id);
    setActiveSourceIdx(idx >= 0 ? idx : 0);
    setActiveTab('chat');
  };

  const handleInspectDocument = (doc: DocItem) => {
    const syntheticSource: CitationSource = {
      id: doc.id,
      documentId: doc.id,
      documentName: doc.fileName,
      pageNumber: doc.mimeType === 'application/pdf' ? 1 : null,
      sectionHeading: null,
      citationLabel: `[${doc.fileName}]`,
      content: `Document "${doc.fileName}" (${doc.chunkCount} indexed chunks). Switch to "PDF Page View" or "Raw File" above to inspect the full document.`,
      score: 1,
    };
    setActiveSources([syntheticSource]);
    setActiveSourceIdx(0);
    setActiveTab('chat');
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !workspaceId || streaming) return;

    const question = input.trim();
    setInput('');
    setError(null);

    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', content: question };
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: ChatMsg = { id: assistantId, role: 'assistant', content: '', sources: [] };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch('/api/docs/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          workspaceId,
          message: question,
          documentIds: selectedDocIds.length > 0 ? selectedDocIds : undefined,
          topK: 6,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `Chat request failed (${resp.status})`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const raw = line.slice(5).trim();
          if (!raw || raw === '[DONE]') continue;

          try {
            const evt = JSON.parse(raw);
            if (evt.type === 'sources') {
              const srcs: CitationSource[] = evt.sources || [];
              setActiveSources(srcs);
              setActiveSourceIdx(0);
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, sources: srcs } : m))
              );
            } else if (evt.type === 'token' && evt.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + evt.content } : m
                )
              );
            } else if (evt.type === 'done' && evt.usage) {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, usage: evt.usage } : m))
              );
            } else if (evt.type === 'error') {
              throw new Error(evt.error || 'Streaming failed');
            }
          } catch (parseErr: any) {
            if (parseErr?.message && !parseErr.message.includes('JSON')) {
              throw parseErr;
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Streaming chat failed');
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleClearChat = async () => {
    if (!workspaceId) return;
    await apiClient.delete(`/api/docs/chat/history?workspaceId=${encodeURIComponent(workspaceId)}`);
    setMessages([]);
    setActiveSources([]);
  };

  const indexedDocs = documents.filter((d) => d.status === 'INDEXED');

  return (
    <DashboardShell
      title="Docs & Spec RAG"
      subtitle="Upload technical specs, ask grounded questions, and verify inline citations"
      actions={
        user && workspaces.length > 0 ? (
          <div className="flex items-center gap-2">
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewWs((v) => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-200"
              title="New workspace"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>
        ) : undefined
      }
    >
      {authLoading || loading ? (
        <LoadingState label="Loading Docs RAG workspace..." />
      ) : !user ? (
        <EmptyState
          icon={BookOpen}
          title="Sign in to use Docs & Spec RAG"
          description="Upload PDF and Markdown specs, run semantic search, and inspect citations inside your private workspace."
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
        <div className="space-y-4">
          {(showNewWs || workspaces.length === 0) && (
            <form
              onSubmit={handleCreateWorkspace}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              <input
                type="text"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                placeholder="New workspace name (e.g. Payments Architecture)"
                className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              />
              <button
                type="submit"
                disabled={creatingWs || !newWsName.trim()}
                className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold disabled:opacity-50"
              >
                {creatingWs ? 'Creating...' : 'Create Workspace'}
              </button>
            </form>
          )}

          {error && <ErrorState message={error} onRetry={() => workspaceId && loadWorkspaceDocsAndChat(workspaceId)} />}

          {workspaceId && (
            <>
              {/* Tabs */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeTab === 'chat'
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Chat & Citations
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('documents')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeTab === 'documents'
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Documents ({documents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('evals')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeTab === 'evals'
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Evals
                  </button>
                </div>

                {activeTab === 'chat' && messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearChat}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300"
                  >
                    <Trash2 className="w-3 h-3" /> Clear chat
                  </button>
                )}
              </div>

              {/* Tab Content */}
              {activeTab === 'chat' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[620px]">
                  {/* LEFT PANEL: Streaming Chat */}
                  <div className="lg:col-span-7 flex flex-col rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden h-[620px]">
                    {/* Document Filter Strip */}
                    {indexedDocs.length > 0 && (
                      <div className="px-3 py-2 border-b border-zinc-800/80 bg-zinc-950/40 flex items-center gap-1.5 overflow-x-auto">
                        <span className="text-[11px] text-zinc-500 shrink-0 mr-1">Filter:</span>
                        {indexedDocs.map((d) => {
                          const selected = selectedDocIds.includes(d.id);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() =>
                                setSelectedDocIds((prev) =>
                                  selected ? prev.filter((id) => id !== d.id) : [...prev, d.id]
                                )
                              }
                              className={`px-2 py-0.5 rounded-md text-[11px] border whitespace-nowrap transition-colors ${
                                selected
                                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              {d.fileName}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6">
                          <Sparkles className="w-5 h-5 text-zinc-500 mb-2" />
                          <p className="text-sm font-medium text-zinc-200 mb-1">
                            Ask questions about your documentation
                          </p>
                          <p className="text-xs text-zinc-500 max-w-sm">
                            {indexedDocs.length > 0
                              ? 'Every factual claim is grounded in pgvector hybrid retrieval with clickable page citations.'
                              : 'Upload a PDF or Markdown document in the Documents tab first.'}
                          </p>
                        </div>
                      ) : (
                        messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${
                              msg.role === 'user' ? 'items-end' : 'items-start'
                            }`}
                          >
                            <div
                              className={`max-w-[92%] rounded-xl px-4 py-3 ${
                                msg.role === 'user'
                                  ? 'bg-zinc-800 text-zinc-100 text-sm'
                                  : 'bg-zinc-950/70 border border-zinc-800/80 text-zinc-200 w-full'
                              }`}
                            >
                              {msg.role === 'user' ? (
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                              ) : (
                                <>
                                  <MarkdownRenderer
                                    content={msg.content || (streaming ? 'Thinking...' : '')}
                                    sources={msg.sources}
                                    onSelectCitation={(s) => handleSelectCitation(s, msg.sources)}
                                  />
                                  {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex flex-wrap gap-1.5">
                                      {msg.sources.map((src) => (
                                        <button
                                          key={src.id}
                                          type="button"
                                          onClick={() => handleSelectCitation(src, msg.sources)}
                                          className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-[11px] font-mono text-zinc-300 transition-colors"
                                        >
                                          {src.citationLabel}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {msg.usage && (
                                    <div className="mt-2 text-[10px] font-mono text-zinc-500">
                                      {msg.usage.model} • {msg.usage.latencyMs}ms • {msg.usage.totalTokens} tokens
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <form
                      onSubmit={handleSend}
                      className="p-3 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                          indexedDocs.length > 0
                            ? 'Ask about architecture, APIs, error handling...'
                            : 'Upload a document in the Documents tab first...'
                        }
                        className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
                      />
                      {streaming ? (
                        <button
                          type="button"
                          onClick={() => abortRef.current?.abort()}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-xs font-medium"
                        >
                          <Square className="w-3.5 h-3.5" />
                          Stop
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={!input.trim()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold disabled:opacity-40"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Ask
                        </button>
                      )}
                    </form>
                  </div>

                  {/* RIGHT PANEL: Citation & Document Viewer */}
                  <div className="lg:col-span-5 h-[620px]">
                    <CitationViewer
                      sources={activeSources}
                      activeIndex={activeSourceIdx}
                      onChangeIndex={setActiveSourceIdx}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'documents' && (
                <DocsDocumentsTab
                  workspaceId={workspaceId}
                  documents={documents}
                  onRefresh={() => loadWorkspaceDocsAndChat(workspaceId)}
                  onInspectDocument={handleInspectDocument}
                />
              )}

              {activeTab === 'evals' && (
                <DocsEvalsTab
                  workspaceId={workspaceId}
                  hasIndexedDocs={indexedDocs.length > 0}
                />
              )}
            </>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
