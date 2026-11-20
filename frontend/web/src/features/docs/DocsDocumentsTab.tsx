'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  RotateCw,
  Eye,
  History,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { DocItem, DocJobInfo } from './types';
import { EmptyState, StatusBadge } from '@/components/layout/StateCards';

const MAX_BYTES = 15 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function DocsDocumentsTab({
  workspaceId,
  documents,
  onRefresh,
  onInspectDocument,
}: {
  workspaceId: string;
  documents: DocItem[];
  onRefresh: () => Promise<void>;
  onInspectDocument: (doc: DocItem) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<DocJobInfo | null>(null);
  const [historyModal, setHistoryModal] = useState<{ doc: DocItem; jobs: DocJobInfo[] } | null>(null);

  // Poll active job or any processing document
  useEffect(() => {
    const processingDoc = documents.find(
      (d) =>
        d.status === 'PENDING' ||
        d.status === 'PROCESSING' ||
        d.latestJob?.status === 'queued' ||
        d.latestJob?.status === 'processing'
    );
    const jobIdToPoll = activeJob && (activeJob.status === 'queued' || activeJob.status === 'processing')
      ? activeJob.id
      : processingDoc?.latestJob?.id;

    if (!jobIdToPoll) return;

    const timer = setInterval(async () => {
      try {
        const res = await apiClient.get(`/api/jobs/${jobIdToPoll}`);
        const job: DocJobInfo = res.data?.data;
        if (job) {
          setActiveJob(job);
          if (job.status === 'completed' || job.status === 'failed') {
            await onRefresh();
          }
        }
      } catch {
        // ignore transient poll error
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeJob, documents, onRefresh]);

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'md', 'markdown'].includes(ext)) {
      setUploadError('Only PDF (.pdf) and Markdown (.md, .markdown) files are supported.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError('File exceeds the 15 MB maximum upload limit.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('workspaceId', workspaceId);
      formData.append('file', file);

      const res = await apiClient.post('/api/docs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      const job: DocJobInfo | undefined = res.data?.data?.job;
      if (job) setActiveJob(job);
      setUploadSuccess(`Uploaded "${file.name}". Background ingestion started.`);
      await onRefresh();
    } catch (err: any) {
      setUploadError(err?.response?.data?.error?.message || err?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleReindex = async (doc: DocItem) => {
    setUploadError(null);
    try {
      const res = await apiClient.post(`/api/docs/${doc.id}/reindex`);
      if (res.data?.data?.job) {
        setActiveJob(res.data.data.job);
      }
      await onRefresh();
    } catch (err: any) {
      setUploadError(err?.response?.data?.error?.message || 'Failed to trigger re-indexing.');
    }
  };

  const handleDelete = async (doc: DocItem) => {
    setUploadError(null);
    try {
      await apiClient.delete(`/api/docs/${doc.id}`);
      await onRefresh();
    } catch (err: any) {
      setUploadError(err?.response?.data?.error?.message || 'Failed to delete document.');
    }
  };

  const handleViewHistory = async (doc: DocItem) => {
    try {
      const res = await apiClient.get(`/api/docs/${doc.id}`);
      setHistoryModal({ doc, jobs: res.data?.data?.jobs || [] });
    } catch {
      setUploadError('Failed to load ingestion history.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) handleFileUpload(f);
        }}
        className="rounded-xl border border-dashed border-zinc-700/80 hover:border-zinc-500 bg-zinc-900/30 p-6 text-center transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.md,.markdown"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileUpload(f);
            e.target.value = '';
          }}
        />
        <div className="mx-auto w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 mb-3">
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
        </div>
        <h3 className="text-sm font-semibold text-zinc-100 mb-1">
          Upload Technical Documentation
        </h3>
        <p className="text-xs text-zinc-400 mb-4">
          Drag and drop a PDF or Markdown file (max 15 MB) for PyMuPDF/heading-aware chunking and pgvector indexing.
        </p>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Uploading...' : 'Select PDF or Markdown'}
        </button>
      </div>

      {/* Feedback & Real-Time Job Progress */}
      {uploadError && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {uploadSuccess && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {activeJob && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-200">Ingestion Job</span>
              <span className="font-mono text-[11px] text-zinc-500">{activeJob.id.slice(0, 8)}</span>
              <StatusBadge status={activeJob.metadata?.stage || activeJob.status} />
            </div>
            <span className="font-mono text-zinc-300">{activeJob.progress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                activeJob.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${activeJob.progress}%` }}
            />
          </div>
          {activeJob.error && (
            <p className="text-xs text-red-400">{activeJob.error}</p>
          )}
        </div>
      )}

      {/* Document Library */}
      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents uploaded yet"
          description="Upload a PDF specification or Markdown doc above to build your workspace knowledge base."
        />
      ) : (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800/80">
                <tr>
                  <th className="px-4 py-3 font-medium">Document</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Chunks</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Last Indexed</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {documents.map((doc) => {
                  const stageOrStatus = doc.latestJob?.metadata?.stage || doc.status;
                  const progress = doc.latestJob?.progress ?? (doc.status === 'INDEXED' ? 100 : 0);
                  return (
                    <tr key={doc.id} className="hover:bg-zinc-900/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-100">{doc.fileName}</div>
                        <div className="text-[11px] text-zinc-500">
                          {formatBytes(doc.size)} • {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-400">
                        {doc.mimeType === 'application/pdf' ? 'PDF' : 'Markdown'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={stageOrStatus} />
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-300">{doc.chunkCount}</td>
                      <td className="px-4 py-3 font-mono text-zinc-400">{progress}%</td>
                      <td className="px-4 py-3 text-zinc-400">
                        {doc.lastIndexedAt ? new Date(doc.lastIndexedAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onInspectDocument(doc)}
                            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                            title="View document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleViewHistory(doc)}
                            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                            title="Ingestion history"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReindex(doc)}
                            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                            title="Re-index"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(doc)}
                            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-300"
                            title="Delete document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ingestion History Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">
                Ingestion History — {historyModal.doc.fileName}
              </h3>
              <button
                type="button"
                onClick={() => setHistoryModal(null)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {historyModal.jobs.length === 0 ? (
                <p className="text-xs text-zinc-500">No ingestion jobs recorded.</p>
              ) : (
                historyModal.jobs.map((j) => (
                  <div
                    key={j.id}
                    className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <StatusBadge status={j.status} />
                      <span className="font-mono text-zinc-400">{j.progress}%</span>
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {new Date(j.createdAt).toLocaleString()}
                    </div>
                    {j.error && <div className="text-[11px] text-red-400">{j.error}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
