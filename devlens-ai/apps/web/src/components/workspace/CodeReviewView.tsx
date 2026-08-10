'use client';

import { useState, useCallback } from 'react';
import { WorkspaceIssue, runCodeReview } from '@/lib/workspaceApi';

interface Props { workspaceId: string; initialIssues: WorkspaceIssue[]; }

const SEV_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  CRITICAL: { bg: 'bg-red-500/15 border-red-500/35 text-red-300', text: 'text-red-300', dot: 'bg-red-500' },
  HIGH:     { bg: 'bg-orange-500/15 border-orange-500/35 text-orange-300', text: 'text-orange-300', dot: 'bg-orange-500' },
  WARNING:  { bg: 'bg-yellow-500/15 border-yellow-500/35 text-yellow-300', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  INFO:     { bg: 'bg-blue-500/15 border-blue-500/35 text-blue-300', text: 'text-blue-300', dot: 'bg-blue-400' },
};

function exportMarkdown(issues: WorkspaceIssue[], resolved: Set<string>) {
  const counts = { CRITICAL: 0, HIGH: 0, WARNING: 0, INFO: 0 };
  issues.forEach(i => { (counts as unknown)[i.severity]++; });
  const lines = [
    '# Code Review Report',
    '',
    `## Summary`,
    `${issues.length} issues found: ${counts.CRITICAL} critical, ${counts.HIGH} high, ${counts.WARNING} warnings, ${counts.INFO} info`,
    `${resolved.size} resolved`,
    '',
    '## Issues',
    '',
    ...issues.map(i => [
      `### ${i.title} (${i.severity})`,
      `**File:** \`${i.affectedFile}${i.lineRange ? ' · ' + i.lineRange : ''}\``,
      `**Category:** ${i.category}`,
      `**Status:** ${resolved.has(i.id) ? 'RESOLVED' : 'OPEN'}`,
      '',
      i.description,
      '',
      `> Why it matters: ${i.whyItMatters}`,
      '',
      `**Fix:** ${i.suggestedFix}`,
      '',
      '---',
      '',
    ].join('\n')),
  ].join('\n');
  const blob = new Blob([lines], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'code-review.md'; a.click();
  URL.revokeObjectURL(url);
}

export default function CodeReviewView({ workspaceId, initialIssues }: Props) {
  const [issues, setIssues] = useState<WorkspaceIssue[]>(initialIssues ?? []);
  const [aiSummary, setAiSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [sevFilter, setSevFilter] = useState<string>('ALL');
  const [catFilter, setCatFilter] = useState<string>('ALL');
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const handleRunReview = async () => {
    setLoading(true);
    const result = await runCodeReview(workspaceId);
    setIssues(result.issues);
    setAiSummary(result.aiSummary);
    setLoading(false);
  };

  const toggleResolved = useCallback((id: string) => {
    setResolved(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }, []);

  const categories = Array.from(new Set(issues.map(i => i.category)));
  const filtered = issues.filter(i =>
    (sevFilter === 'ALL' || i.severity === sevFilter) &&
    (catFilter === 'ALL' || i.category === catFilter)
  );
  const counts = { CRITICAL: 0, HIGH: 0, WARNING: 0, INFO: 0 };
  issues.forEach(i => { (counts as unknown)[i.severity]++; });
  const resolvedCount = issues.filter(i => resolved.has(i.id)).length;
  const resolvedPct = issues.length > 0 ? (resolvedCount / issues.length) * 100 : 0;

  return (
    <div className="p-6 space-y-5">
      {/* Progress Bar */}
      {issues.length > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
            <span>{resolvedCount} of {issues.length} issues resolved</span>
            <span>{Math.round(resolvedPct)}%</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${resolvedPct}%` }} />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Code Review</h2>
          <p className="text-zinc-500 text-sm">Real static analysis from your uploaded project files.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportMarkdown(issues, resolved)}
            disabled={issues.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 border border-white/10 rounded-xl text-zinc-300 text-sm font-medium transition-all"
          >
            ↓ Export MD
          </button>
          <button
            onClick={handleRunReview}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 rounded-xl text-white text-sm font-semibold transition-all"
          >
            {loading ? <><span className="animate-spin inline-block">⟳</span> Scanning...</> : '🔍 Run Deep Review'}
          </button>
        </div>
      </div>

      {/* Severity Cards */}
      <div className="grid grid-cols-4 gap-3">
        {(['CRITICAL', 'HIGH', 'WARNING', 'INFO'] as const).map(sev => {
          const s = SEV_STYLES[sev];
          return (
            <button
              key={sev}
              onClick={() => setSevFilter(sevFilter === sev ? 'ALL' : sev)}
              className={`rounded-xl border p-4 text-center transition-all hover:scale-105 ${s.bg} ${sevFilter === sev ? 'ring-2 ring-white/20 shadow-lg' : ''}`}
            >
              <div className={`text-2xl font-black ${s.text}`}>{(counts as unknown)[sev]}</div>
              <div className="text-xs mt-1 opacity-80">{sev}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-[10px] text-zinc-700 uppercase tracking-wider">Severity:</span>
          {(['ALL', 'CRITICAL', 'HIGH', 'WARNING', 'INFO'] as const).map(s => (
            <button key={s} onClick={() => setSevFilter(s)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${sevFilter === s ? 'bg-white/15 text-white' : 'text-zinc-500 hover:text-white'}`}>
              {s}
            </button>
          ))}
        </div>
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-[10px] text-zinc-700 uppercase tracking-wider">Category:</span>
            <button onClick={() => setCatFilter('ALL')} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${catFilter === 'ALL' ? 'bg-white/15 text-white' : 'text-zinc-500 hover:text-white'}`}>ALL</button>
            {categories.map(c => (
              <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${catFilter === c ? 'bg-white/15 text-white' : 'text-zinc-500 hover:text-white'}`}>{c}</button>
            ))}
          </div>
        )}
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <div className="bg-blue-600/10 border border-blue-500/25 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-blue-300 mb-2">🤖 AI Review Summary</h4>
          <pre className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans">{aiSummary}</pre>
        </div>
      )}

      {/* Issues List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">{issues.length === 0 ? '✅' : '🔍'}</div>
          <p className="text-zinc-500">{issues.length === 0 ? 'No issues detected — run a review to scan your project.' : 'No issues match selected filters.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((issue, idx) => {
            const s = SEV_STYLES[issue.severity] ?? SEV_STYLES.INFO;
            const isExpanded = expanded.has(issue.id);
            const isResolved = resolved.has(issue.id);
            return (
              <div
                key={issue.id}
                className={`bg-zinc-900/70 border border-white/8 rounded-xl overflow-hidden transition-all ${isResolved ? 'opacity-50' : ''}`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Collapsed Header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${s.bg}`}>{issue.severity}</span>
                      <span className="text-[10px] text-zinc-600 border border-white/10 rounded px-2 py-0.5">{issue.category}</span>
                      <code className="text-[10px] text-blue-400 font-mono">{issue.affectedFile}{issue.lineRange ? ` · ${issue.lineRange}` : ''}</code>
                    </div>
                    <h4 className={`text-sm font-semibold mt-1.5 ${isResolved ? 'line-through text-zinc-600' : 'text-white'}`}>{issue.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleResolved(issue.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${isResolved ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30' : 'bg-zinc-800 text-zinc-400 hover:text-white border-white/10'}`}
                    >
                      {isResolved ? '✓ Resolved' : 'Resolve'}
                    </button>
                    <button
                      onClick={() => toggleExpanded(issue.id)}
                      className={`p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/8 transition-all ${isExpanded ? 'rotate-90' : ''}`}
                      style={{ transition: 'transform 0.2s ease' }}
                    >
                      ▶
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-white/6 px-4 py-4 space-y-3 bg-zinc-950/30">
                    <p className="text-sm text-zinc-300">{issue.description}</p>
                    <p className="text-xs text-zinc-500 italic">{issue.whyItMatters}</p>
                    <div className="bg-emerald-900/20 border border-emerald-700/25 rounded-xl px-4 py-3">
                      <span className="text-xs text-emerald-400 font-semibold">💡 Suggested Fix: </span>
                      <span className="text-xs text-zinc-300">{issue.suggestedFix}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
