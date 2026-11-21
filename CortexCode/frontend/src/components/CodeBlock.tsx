'use client';

import React, { useState } from 'react';
import { Check, Copy, Code2 } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';

const KEYWORDS = new Set([
  'abstract', 'async', 'await', 'boolean', 'break', 'case', 'catch', 'class', 'const',
  'continue', 'default', 'def', 'delete', 'do', 'else', 'enum', 'export', 'extends',
  'false', 'final', 'finally', 'float', 'for', 'from', 'function', 'if', 'implements',
  'import', 'in', 'int', 'interface', 'let', 'long', 'new', 'null', 'package',
  'private', 'protected', 'public', 'return', 'short', 'static', 'string', 'struct',
  'super', 'switch', 'this', 'throw', 'throws', 'true', 'try', 'type', 'typeof',
  'undefined', 'var', 'void', 'while', 'with', 'yield', 'None', 'True', 'False', 'self',
]);

function formatLangLabel(lang?: string): string {
  const raw = (lang || 'code').trim();
  const map: Record<string, string> = {
    js: 'JavaScript',
    javascript: 'JavaScript',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    tsx: 'TSX',
    jsx: 'JSX',
    py: 'Python',
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    cs: 'C#',
    go: 'Go',
    rust: 'Rust',
    rs: 'Rust',
    sql: 'SQL',
    bash: 'Bash',
    sh: 'Shell',
    json: 'JSON',
    html: 'HTML',
    css: 'CSS',
  };
  return map[raw.toLowerCase()] || raw.charAt(0).toUpperCase() + raw.slice(1);
}

function highlightLine(line: string): React.ReactNode {
  // Single-line comment fast path
  const trimmed = line.trimStart();
  if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
    return <span style={{ color: 'var(--code-comment)' }}>{line}</span>;
  }

  const tokenRegex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*$|#.*$|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('//') || token.startsWith('#')) {
      nodes.push(
        <span key={key++} style={{ color: 'var(--code-comment)' }}>
          {token}
        </span>
      );
    } else if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
      nodes.push(
        <span key={key++} style={{ color: 'var(--code-string)' }}>
          {token}
        </span>
      );
    } else if (/^\d/.test(token)) {
      nodes.push(
        <span key={key++} className="text-amber-400">
          {token}
        </span>
      );
    } else if (KEYWORDS.has(token)) {
      nodes.push(
        <span key={key++} className="font-semibold" style={{ color: 'var(--code-keyword)' }}>
          {token}
        </span>
      );
    } else {
      nodes.push(token);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : ' ';
}

export function CodeBlock({
  code,
  language,
  showLineNumbers = true,
}: {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const label = formatLangLabel(language);
  const lines = code.replace(/\n$/, '').split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.showSuccess('Code Copied', `Copied ${label} snippet to clipboard.`);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-3 rounded-xl border border-[var(--code-border)] bg-[var(--code-bg)] overflow-hidden shadow-md">
      <div className="flex items-center justify-between px-3.5 py-2 bg-[var(--code-header-bg)] border-b border-[var(--code-border)]">
        <span className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
          <Code2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span>{label}</span>
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[var(--status-success)]" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="overflow-x-auto custom-scrollbar py-3 px-2 text-xs font-mono leading-relaxed">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-[var(--bg-hover)]/40">
                {showLineNumbers && (
                  <td
                    className="select-none text-right pr-3 pl-2 w-9 align-top text-[11px]"
                    style={{ color: 'var(--code-line-num)' }}
                  >
                    {idx + 1}
                  </td>
                )}
                <td className="pr-4 whitespace-pre text-[var(--code-text)]">{highlightLine(line)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
