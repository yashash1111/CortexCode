'use client';

import React from 'react';
import { CitationSource } from './types';

function renderInlineWithCitations(
  text: string,
  sources: CitationSource[],
  onSelectCitation: (source: CitationSource) => void
): React.ReactNode[] {
  // Match bracketed citations like [System_Design.pdf, p. 12] or [auth.md, §Refresh]
  const parts = text.split(/(\[[^\[\]]+\])/g);
  return parts.map((part, idx) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      const inner = part.slice(1, -1).toLowerCase();
      const matched = sources.find((s) => {
        const label = s.citationLabel.toLowerCase();
        if (label === part.toLowerCase()) return true;
        const docMatch = inner.includes(s.documentName.toLowerCase());
        if (!docMatch) return false;
        if (s.pageNumber !== null && inner.includes(`p. ${s.pageNumber}`)) return true;
        if (s.pageNumber === null) return true;
        return false;
      });

      if (matched) {
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectCitation(matched)}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-[var(--accent-soft)] hover:bg-[var(--bg-active)] text-[var(--accent-primary)] border border-[var(--accent-border)] font-mono text-[11px] transition-colors cursor-pointer"
            title={`View ${matched.documentName}${matched.pageNumber ? ` (Page ${matched.pageNumber})` : ''}`}
          >
            {part}
          </button>
        );
      }
    }

    // Inline code formatting
    const codeSplit = part.split(/(`[^`]+`)/g);
    return (
      <React.Fragment key={idx}>
        {codeSplit.map((seg, cIdx) => {
          if (seg.startsWith('`') && seg.endsWith('`') && seg.length > 2) {
            return (
              <code
                key={cIdx}
                className="px-1.5 py-0.5 rounded bg-[var(--code-header-bg)] text-[var(--code-text)] border border-[var(--code-border)] font-mono text-[12px]"
              >
                {seg.slice(1, -1)}
              </code>
            );
          }
          // Bold **text**
          const boldSplit = seg.split(/(\*\*[^*]+\*\*)/g);
          return boldSplit.map((b, bIdx) =>
            b.startsWith('**') && b.endsWith('**') ? (
              <strong key={`${cIdx}-${bIdx}`} className="font-semibold text-[var(--text-primary)]">
                {b.slice(2, -2)}
              </strong>
            ) : (
              <React.Fragment key={`${cIdx}-${bIdx}`}>{b}</React.Fragment>
            )
          );
        })}
      </React.Fragment>
    );
  });
}

export function MarkdownRenderer({
  content,
  sources = [],
  onSelectCitation,
}: {
  content: string;
  sources?: CitationSource[];
  onSelectCitation: (source: CitationSource) => void;
}) {
  const blocks = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-[var(--text-secondary)]">
      {blocks.map((block, idx) => {
        if (block.startsWith('```') && block.endsWith('```')) {
          const lines = block.slice(3, -3).split('\n');
          const lang = lines[0]?.trim() || 'code';
          const codeBody = lines.slice(1).join('\n');
          return (
            <div key={idx} className="rounded-lg border border-[var(--code-border)] bg-[var(--code-bg)] overflow-hidden my-2">
              <div className="px-3 py-1.5 bg-[var(--code-header-bg)] border-b border-[var(--code-border)] text-[11px] font-mono text-[var(--text-muted)]">
                {lang}
              </div>
              <pre className="p-3 overflow-x-auto text-xs font-mono text-[var(--code-text)]">
                <code>{codeBody}</code>
              </pre>
            </div>
          );
        }

        const lines = block.split('\n');
        return (
          <div key={idx} className="space-y-1.5">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lIdx} className="h-1" />;
              if (trimmed.startsWith('### ')) {
                return (
                  <h4 key={lIdx} className="text-sm font-semibold text-zinc-100 pt-1">
                    {renderInlineWithCitations(trimmed.slice(4), sources, onSelectCitation)}
                  </h4>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h3 key={lIdx} className="text-base font-semibold text-zinc-100 pt-1">
                    {renderInlineWithCitations(trimmed.slice(3), sources, onSelectCitation)}
                  </h3>
                );
              }
              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return (
                  <div key={lIdx} className="flex gap-2 pl-2">
                    <span className="text-zinc-500">•</span>
                    <span>{renderInlineWithCitations(trimmed.slice(2), sources, onSelectCitation)}</span>
                  </div>
                );
              }
              return (
                <p key={lIdx}>
                  {renderInlineWithCitations(line, sources, onSelectCitation)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
