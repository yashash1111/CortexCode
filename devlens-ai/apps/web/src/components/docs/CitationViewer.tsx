'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, ExternalLink, Highlighter } from 'lucide-react';
import { CitationSource } from './types';

export function CitationViewer({
  sources,
  activeIndex,
  onChangeIndex,
}: {
  sources: CitationSource[];
  activeIndex: number;
  onChangeIndex: (index: number) => void;
}) {
  const [viewMode, setViewMode] = useState<'passage' | 'document'>('passage');

  if (sources.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center rounded-xl border border-zinc-800/80 bg-zinc-900/20">
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 mb-3">
          <FileText className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-200 mb-1">Citation & Document Viewer</h3>
        <p className="text-xs text-zinc-500 max-w-xs">
          Ask a question or click any citation badge like <code className="text-zinc-400 font-mono">[System_Design.pdf, p. 1]</code> to inspect the exact source passage and page.
        </p>
      </div>
    );
  }

  const current = sources[Math.min(activeIndex, sources.length - 1)] || sources[0];
  const isPdf = current.documentName.toLowerCase().endsWith('.pdf');
  const fileUrl = `/api/docs/${current.documentId}/file${current.pageNumber ? `#page=${current.pageNumber}` : ''}`;

  return (
    <div className="h-full flex flex-col rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-xs font-semibold text-zinc-100 truncate">
              {current.documentName}
            </span>
            {current.pageNumber !== null && (
              <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-mono text-[11px] shrink-0">
                Page {current.pageNumber}
              </span>
            )}
          </div>
          {current.sectionHeading && (
            <p className="text-[11px] text-zinc-400 truncate mt-0.5 pl-6">
              § {current.sectionHeading}
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={activeIndex <= 0}
            onClick={() => onChangeIndex(activeIndex - 1)}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            title="Previous source"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-zinc-400 px-1.5">
            {activeIndex + 1} / {sources.length}
          </span>
          <button
            type="button"
            disabled={activeIndex >= sources.length - 1}
            onClick={() => onChangeIndex(activeIndex + 1)}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            title="Next source"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="px-4 py-2 border-b border-zinc-800/60 bg-zinc-950/30 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode('passage')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'passage'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Highlighted Passage
          </button>
          <button
            type="button"
            onClick={() => setViewMode('document')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'document'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {isPdf ? 'PDF Page View' : 'Raw File'}
          </button>
        </div>

        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200"
        >
          Open <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'passage' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5 text-amber-300/90">
                <Highlighter className="w-3.5 h-3.5" />
                Retrieved Passage (Chunk #{current.chunkIndex})
              </span>
              <span className="font-mono">
                Score: {(current.score * 100).toFixed(1)}%
              </span>
            </div>

            <div className="p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 text-sm leading-relaxed text-zinc-100 whitespace-pre-wrap">
              {current.content}
            </div>
          </div>
        ) : (
          <iframe
            key={fileUrl}
            src={fileUrl}
            title={current.documentName}
            className="w-full h-full min-h-[420px] rounded-lg border border-zinc-800 bg-white"
          />
        )}
      </div>
    </div>
  );
}
