'use client';

import { useState, useCallback } from 'react';
import { runDebug } from '@/lib/workspaceApi';

interface Props { workspaceId: string; }

interface DebugSession {
  id: string;
  problem: string;
  result: { diagnosis: string; candidateFiles: string[] };
  timestamp: string;
}

function parseDiagnosisSteps(text: string): string[] {
  const lines = text.split('\n').filter(l => l.trim());
  const steps: string[] = [];
  let buffer = '';
  lines.forEach(line => {
    if (line.match(/^\d+\.\s/) || line.match(/^Step \d+/i)) {
      if (buffer) steps.push(buffer.trim());
      buffer = line.replace(/^\d+\.\s/, '').replace(/^Step \d+[:.]\s*/i, '');
    } else {
      buffer += (buffer ? ' ' : '') + line;
    }
  });
  if (buffer) steps.push(buffer.trim());
  return steps.length > 0 ? steps : lines.slice(0, 6);
}

export default function DebugModeView({ workspaceId }: Props) {
  const [problem, setProblem] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<DebugSession[]>([]);
  const [activeSession, setActiveSession] = useState<DebugSession | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDebug = useCallback(async () => {
    if (!problem.trim() || loading) return;
    setLoading(true);
    setActiveSession(null);
    const data = await runDebug(workspaceId, problem.trim());
    const session: DebugSession = {
      id: 'dbg-' + Date.now(),
      problem: problem.trim(),
      result: data,
      timestamp: new Date().toLocaleTimeString(),
    };
    setSessions(prev => [session, ...prev].slice(0, 5));
    setActiveSession(session);
    setLoading(false);
  }, [problem, loading, workspaceId]);

  const handleCopy = () => {
    if (!activeSession) return;
    navigator.clipboard.writeText(activeSession.result.diagnosis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = activeSession ? parseDiagnosisSteps(activeSession.result.diagnosis) : [];

  return (
    <div className="flex h-full">
      {/* Session History Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-white/8 bg-zinc-950/30 flex flex-col">
        <div className="px-4 py-3 border-b border-white/8">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Debug History</h3>
          <p className="text-[10px] text-zinc-700 mt-0.5">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">🐛</div>
              <p className="text-xs text-zinc-700">No debug sessions yet</p>
            </div>
          ) : sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSession(s)}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border ${activeSession?.id === s.id ? 'bg-blue-600/15 border-blue-500/30' : 'border-transparent hover:bg-white/5'}`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="text-[10px] text-zinc-600">{s.timestamp}</span>
              </div>
              <p className="text-xs text-zinc-400 truncate">{s.problem.slice(0, 45)}{s.problem.length > 45 ? '...' : ''}</p>
              {s.result.candidateFiles.length > 0 && (
                <p className="text-[10px] text-blue-400/70 mt-0.5">{s.result.candidateFiles.length} file{s.result.candidateFiles.length !== 1 ? 's' : ''} flagged</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Debug Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-white/8 bg-zinc-950/20 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Debug Console</h2>
          <p className="text-zinc-500 text-sm">Describe your bug. CortexCode will scan your codebase and diagnose the root cause.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Input */}
          <div className="bg-zinc-900/60 border border-white/8 rounded-2xl p-5 space-y-4">
            <label className="block text-sm font-medium text-zinc-300">Describe the Problem</label>
            <textarea
              value={problem}
              onChange={e => setProblem(e.target.value)}
              placeholder="e.g. My login form submits but nothing happens — no redirect, no error message appears..."
              rows={4}
              className="w-full px-4 py-3 bg-zinc-950/80 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 text-sm resize-none leading-relaxed font-mono"
            />
            <button
              onClick={handleDebug}
              disabled={loading || !problem.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed rounded-xl text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
            >
              {loading ? <><span className="animate-spin">⟳</span> Scanning codebase...</> : '🐛 Run Diagnosis'}
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="bg-zinc-900/60 border border-blue-500/20 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl animate-pulse">🔍</span>
                <div>
                  <p className="text-blue-300 font-medium text-sm">Scanning codebase for root cause...</p>
                  <p className="text-zinc-600 text-xs mt-0.5">Matching problem description against project files</p>
                </div>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '70%', animation: 'scanProgress 3s ease-in-out infinite' }} />
              </div>
            </div>
          )}

          {/* Results */}
          {activeSession && !loading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-zinc-500">Diagnosed at {activeSession.timestamp}</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-xs text-zinc-400 hover:text-white transition-all"
                >
                  {copied ? '✓ Copied' : '⎘ Copy Diagnosis'}
                </button>
              </div>

              {/* Candidate Files */}
              {activeSession.result.candidateFiles.length > 0 && (
                <div className="bg-zinc-900/60 border border-white/8 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-zinc-300 mb-3">📂 Candidate Files</h4>
                  <div className="flex flex-wrap gap-2">
                    {activeSession.result.candidateFiles.map(f => (
                      <span key={f} className="px-3 py-1.5 rounded-xl bg-emerald-600/10 border border-emerald-500/25 text-xs text-emerald-300 font-mono hover:bg-emerald-600/20 transition-colors">
                        📄 {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnosis Steps */}
              <div className="bg-zinc-950/80 border border-white/8 rounded-2xl p-5">
                <h4 className="text-sm font-semibold text-zinc-300 mb-4">🧠 Root Cause Analysis</h4>
                {steps.length > 1 ? (
                  <div className="space-y-3">
                    {steps.map((step, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3"
                        style={{ opacity: 0, animation: `fadeIn 0.4s ease ${i * 120}ms forwards` }}
                      >
                        <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[10px] text-blue-400 font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-sm text-zinc-300 leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans">{activeSession.result.diagnosis}</pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scanProgress {
          0% { width: 5%; }
          50% { width: 80%; }
          100% { width: 95%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
