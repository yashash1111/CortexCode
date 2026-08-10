'use client';

import { useState, useEffect, useCallback } from 'react';
import { WorkspaceBrainData, evaluateInterviewAnswer } from '@/lib/workspaceApi';

interface Props { workspaceId: string; brain: WorkspaceBrainData; }

interface AnswerRecord { question: string; answer: string; evaluation: string; grade: string; score: number; timestamp: string; }

const MODES = ['HR Round', 'Technical Deep Dive', 'Project Deep Dive', 'React/Frontend', 'Backend/APIs', 'Database & ORM', 'Rapid Fire'];
const BASE_QUESTIONS: Record<string, string[]> = {
  'HR Round': ['Tell me about yourself and your development background.', 'Why did you build this project?', 'What was your biggest technical challenge?', 'How do you handle tight deadlines?'],
  'Technical Deep Dive': ['How does your application handle authentication?', 'Explain your database schema design decisions.', 'How do you ensure code quality?', 'What security vulnerabilities did you address?'],
  'Project Deep Dive': ['Walk me through your project architecture end-to-end.', 'What would you refactor if you started over?', 'How does data flow through your application?', 'What testing strategy did you implement?'],
  'React/Frontend': ['How do you manage state in this React application?', 'Explain component re-render optimization.', 'How do you handle API errors in the UI?', 'What approach did you use for styling?'],
  'Backend/APIs': ['How do you structure your REST API routes?', 'How do you handle authentication middleware?', 'Explain your error handling strategy.', 'How do you validate incoming request data?'],
  'Database & ORM': ['What database did you choose and why?', 'How do you handle database migrations?', 'Explain a complex query or relationship.', 'How do you handle connection failures?'],
  'Rapid Fire': ['SQL vs NoSQL?', 'REST vs GraphQL?', 'How many tables/collections does your project have?', 'What port does your backend run on?'],
};

function extractGrade(text: string): { grade: string; score: number } {
  const lower = text.toLowerCase();
  if (lower.includes('excellent') || lower.includes('outstanding')) return { grade: 'Excellent', score: 90 };
  if (lower.includes('good') || lower.includes('well') || lower.includes('solid')) return { grade: 'Good', score: 75 };
  if (lower.includes('average') || lower.includes('partial') || lower.includes('okay')) return { grade: 'Average', score: 55 };
  if (lower.includes('poor') || lower.includes('weak') || lower.includes('incorrect') || lower.includes('wrong')) return { grade: 'Needs Work', score: 35 };
  return { grade: 'Good', score: 65 };
}

const GRADE_STYLES: Record<string, string> = {
  'Excellent': 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  'Good': 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  'Average': 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  'Needs Work': 'bg-red-500/20 border-red-500/40 text-red-300',
};

function exportSession(mode: string, score: number, history: AnswerRecord[]) {
  const lines = [
    `Interview Session — ${new Date().toLocaleString()}`,
    `Mode: ${mode}`,
    `Total Score: ${score}/100`,
    '',
    ...history.map((h, i) => [
      `Q${i+1}: ${h.question}`,
      `Answer: ${h.answer}`,
      `Grade: ${h.grade} (${h.score}/100)`,
      `Evaluation: ${h.evaluation}`,
      '',
    ].join('\n')),
  ].join('\n');
  const blob = new Blob([lines], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'interview-session.txt'; a.click();
  URL.revokeObjectURL(url);
}

export default function InterviewModeView({ workspaceId, brain }: Props) {
  const [mode, setMode] = useState(MODES[0]);
  const [selectedQ, setSelectedQ] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState('');
  const [history, setHistory] = useState<AnswerRecord[]>([]);
  const [sessionScore, setSessionScore] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);
  const [historyExpanded, setHistoryExpanded] = useState<Set<number>>(new Set());

  const projectQs = brain.summary?.potentialInterviewQuestions ?? [];
  const allQuestions = mode === 'Project Deep Dive'
    ? [...projectQs, ...BASE_QUESTIONS['Project Deep Dive']]
    : BASE_QUESTIONS[mode] ?? [];
  const answeredQs = new Set(history.map(h => h.question));

  // Timer
  useEffect(() => {
    if (!timerRunning) return;
    if (timeLeft <= 0) { setTimerRunning(false); return; }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning, timeLeft]);

  const resetTimer = () => { setTimerRunning(false); setTimeLeft(180); };

  const handleEvaluate = useCallback(async () => {
    if (!selectedQ || !answer.trim()) return;
    setLoading(true);
    const result = await evaluateInterviewAnswer(workspaceId, selectedQ, answer.trim(), mode);
    const { grade, score } = extractGrade(result.evaluation);
    setEvaluation(result.evaluation);
    setHistory(prev => [{ question: selectedQ, answer: answer.trim(), evaluation: result.evaluation, grade, score, timestamp: new Date().toLocaleTimeString() }, ...prev]);
    setSessionScore(prev => Math.min(100, prev + Math.round(score / (history.length + 1))));
    resetTimer();
    setLoading(false);
  }, [selectedQ, answer, workspaceId, mode, history.length]);

  const handleModeChange = (m: string) => {
    setMode(m); setSelectedQ(null); setAnswer(''); setEvaluation(''); resetTimer();
  };

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');
  const timerRed = timeLeft < 30;
  const circumference = 2 * Math.PI * 22;

  return (
    <div className="p-6 space-y-5 h-full flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white">Interview Mode</h2>
          <p className="text-zinc-500 text-sm">Project-specific preparation with real-time AI evaluation.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Session Score Ring */}
          <div className="flex items-center gap-2">
            <div className="relative w-12 h-12">
              <svg width={48} height={48} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={24} cy={24} r={22} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
                <circle cx={24} cy={24} r={22} fill="none" stroke="#3b82f6" strokeWidth={4}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - sessionScore / 100)}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-black text-blue-400">{sessionScore}</span>
              </div>
            </div>
            <div className="text-xs text-zinc-500">Session<br/>Score</div>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${timerRed && timerRunning ? 'bg-red-500/15 border-red-500/30' : 'bg-zinc-900/60 border-white/10'}`}>
            <span className={`text-lg font-mono font-bold ${timerRed && timerRunning ? 'text-red-400' : 'text-white'}`}>{mm}:{ss}</span>
            <button
              onClick={() => { setTimerRunning(r => !r); }}
              className="text-xs text-zinc-500 hover:text-white transition-colors"
            >
              {timerRunning ? '⏸' : '▶'}
            </button>
            <button onClick={resetTimer} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">↺</button>
          </div>

          <button
            onClick={() => exportSession(mode, sessionScore, history)}
            disabled={history.length === 0}
            className="px-3 py-2 text-xs text-zinc-500 hover:text-white bg-zinc-900/60 border border-white/10 rounded-xl transition-colors disabled:opacity-40"
          >
            ↓ Export
          </button>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-2 flex-wrap flex-shrink-0">
        {MODES.map(m => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${mode === m ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'}`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5 min-h-0 overflow-hidden">
        {/* Questions Panel */}
        <div className="flex flex-col min-h-0">
          <h4 className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-2 flex-shrink-0">Questions — {mode}</h4>
          <div className="flex-1 overflow-y-auto space-y-1.5">
            {allQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedQ(q); setAnswer(''); setEvaluation(''); resetTimer(); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border ${selectedQ === q ? 'bg-blue-600/20 border-blue-500/40 text-white' : 'bg-zinc-900/60 border-white/8 text-zinc-400 hover:text-white hover:border-white/15'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-zinc-600 font-mono text-xs flex-shrink-0 mt-0.5">{idx + 1}.</span>
                  <span className="flex-1">{q}</span>
                  {answeredQs.has(q) && <span className="text-emerald-400 flex-shrink-0">✓</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Answer Panel */}
        <div className="flex flex-col space-y-4 min-h-0 overflow-y-auto">
          {selectedQ ? (
            <>
              <div className="bg-blue-600/10 border border-blue-500/25 rounded-xl p-4 flex-shrink-0">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Question</p>
                <p className="text-sm text-white leading-relaxed">{selectedQ}</p>
              </div>
              <div className="flex-shrink-0">
                <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-2">Your Answer</label>
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={6}
                  className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50 resize-none leading-relaxed"
                />
              </div>
              <button
                onClick={handleEvaluate}
                disabled={loading || !answer.trim()}
                className="flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed rounded-xl text-white text-sm font-semibold transition-all"
              >
                {loading ? <><span className="animate-spin">⟳</span> Evaluating...</> : '🎯 Evaluate Answer'}
              </button>

              {evaluation && (() => {
                const { grade } = extractGrade(evaluation);
                return (
                  <div className="bg-zinc-900/80 border border-white/8 rounded-xl p-4 space-y-3 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-semibold text-white">Evaluation</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${GRADE_STYLES[grade]}`}>{grade}</span>
                    </div>
                    <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">{evaluation}</pre>
                  </div>
                );
              })()}

              {/* Answer History */}
              {history.length > 0 && (
                <div className="flex-shrink-0 bg-zinc-900/60 border border-white/8 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/8">
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Answer History ({history.length})</h4>
                  </div>
                  <div className="divide-y divide-white/5 max-h-48 overflow-y-auto">
                    {history.map((h, i) => (
                      <div key={i} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => setHistoryExpanded(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; })}>
                          <p className="text-xs text-zinc-400 truncate flex-1">{h.question.slice(0, 50)}...</p>
                          <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold border ${GRADE_STYLES[h.grade] ?? GRADE_STYLES['Good']}`}>{h.grade}</span>
                        </div>
                        {historyExpanded.has(i) && (
                          <div className="mt-2 text-xs text-zinc-500 space-y-1">
                            <p className="text-zinc-600">A: {h.answer.slice(0, 100)}...</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-700">
              <div className="text-5xl mb-3">👈</div>
              <p className="text-sm">Select a question to begin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
