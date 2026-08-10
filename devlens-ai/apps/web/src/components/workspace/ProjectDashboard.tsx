'use client';

import { useState, useEffect, useRef } from 'react';
import { WorkspaceBrainData } from '@/lib/workspaceApi';

interface Props { brain: WorkspaceBrainData; }

function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, mounted]);
  return value;
}

function scoreColor(s: number) { return s >= 80 ? 'text-emerald-400' : s >= 60 ? 'text-yellow-400' : 'text-red-400'; }
function scoreStroke(s: number) { return s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444'; }
function scoreBg(s: number) { return s >= 80 ? 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/25' : s >= 60 ? 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/25' : 'from-red-500/10 to-red-600/5 border-red-500/25'; }

export default function ProjectDashboard({ brain }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const overall = brain.health?.overallScore ?? 0;
  const circumference = 2 * Math.PI * 54;
  const offset = mounted ? circumference * (1 - overall / 100) : circumference;

  const filesCount = useCountUp(brain.totalFiles ?? 0);
  const linesCount = useCountUp(brain.totalLines ?? 0);
  const issuesCount = useCountUp(brain.issues?.length ?? 0);
  const tasksCount = useCountUp(brain.tasks?.length ?? 0);

  const timeline = [
    { label: 'Workspace Created', time: 'Just now', icon: '🚀', color: 'bg-blue-500' },
    { label: `${brain.totalFiles} Files Analyzed`, time: 'Moments ago', icon: '📂', color: 'bg-violet-500' },
    { label: 'Project Brain Built', time: 'Moments ago', icon: '🧠', color: 'bg-purple-500' },
    { label: `${brain.issues?.length ?? 0} Issues Detected`, time: 'Moments ago', icon: '🔍', color: brain.issues?.length > 0 ? 'bg-amber-500' : 'bg-emerald-500' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* Hero Card */}
      <div className={`bg-gradient-to-br ${scoreBg(overall)} border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6`}>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">{brain.name}</h2>
          <p className="text-zinc-400 text-sm mt-1 max-w-lg leading-relaxed">{brain.summary?.overview || brain.description}</p>
          <p className="text-zinc-600 text-xs mt-3">
            Last analyzed: {brain.lastAnalyzedAt ? new Date(brain.lastAnalyzedAt).toLocaleString() : 'Just now'}
          </p>
        </div>
        {/* SVG Health Ring */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <div className="relative w-32 h-32">
            <svg width={128} height={128} style={{ transform: 'rotate(-90deg)' }} className="absolute inset-0">
              <circle cx={64} cy={64} r={54} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
              <circle
                cx={64} cy={64} r={54} fill="none"
                stroke={scoreStroke(overall)} strokeWidth={10}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-black ${scoreColor(overall)}`}>{overall}</span>
              <span className="text-xs text-zinc-600 mt-0.5">/ 100</span>
            </div>
          </div>
          <p className="text-xs text-zinc-500 font-medium">Overall Health</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: '📄', label: 'Files', value: filesCount, color: 'from-blue-500/15 to-blue-600/5 border-blue-500/20 text-blue-300' },
          { icon: '📝', label: 'Lines of Code', value: linesCount.toLocaleString(), color: 'from-violet-500/15 to-violet-600/5 border-violet-500/20 text-violet-300' },
          { icon: '⚠️', label: 'Issues Found', value: issuesCount, color: 'from-amber-500/15 to-amber-600/5 border-amber-500/20 text-amber-300' },
          { icon: '📋', label: 'Tasks', value: tasksCount, color: 'from-emerald-500/15 to-emerald-600/5 border-emerald-500/20 text-emerald-300' },
        ].map(stat => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.color} border rounded-2xl p-5 hover:scale-105 transition-transform`}>
            <div className="text-2xl mb-3">{stat.icon}</div>
            <div className="text-3xl font-black text-white">{stat.value}</div>
            <div className="text-xs mt-1.5 opacity-80">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Health Categories */}
      {brain.health?.categories?.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-3">Health Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {brain.health.categories.map((cat, idx) => (
              <div
                key={cat.name}
                className="bg-zinc-900/60 border border-white/8 rounded-xl p-4 hover:border-white/15 transition-colors"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{cat.name}</span>
                  <span className={`text-lg font-black ${scoreColor(cat.score)}`}>{cat.score}</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: mounted ? `${cat.score}%` : '0%',
                      background: scoreStroke(cat.score),
                      transitionDelay: `${idx * 100 + 300}ms`,
                    }}
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{cat.explanation}</p>
                <p className="text-xs text-blue-400 mt-1">→ {cat.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tech Stack */}
      {(brain.stack?.frameworks?.length > 0 || brain.stack?.languages?.length > 0) && (
        <div className="bg-zinc-900/60 border border-white/8 rounded-2xl p-5">
          <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-4">Tech Stack</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Frameworks', items: brain.stack.frameworks, dot: 'bg-blue-500', text: 'text-blue-300', bg: 'bg-blue-500/10 border-blue-500/20' },
              { label: 'Languages', items: brain.stack.languages, dot: 'bg-emerald-500', text: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Databases', items: brain.stack.databases, dot: 'bg-purple-500', text: 'text-purple-300', bg: 'bg-purple-500/10 border-purple-500/20' },
              { label: 'Auth', items: brain.stack.authProviders, dot: 'bg-amber-500', text: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/20' },
            ].map(group => group.items?.length > 0 && (
              <div key={group.label}>
                <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">{group.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map(item => (
                    <span key={item} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${group.bg} ${group.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${group.dot}`} />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auth & Data Flow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900/60 border border-white/8 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-white mb-3">🔐 Auth Flow</h4>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {['User', 'Auth Provider', 'API Server', 'Protected Resource'].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-zinc-800 border border-white/10 rounded-lg text-zinc-300">{step}</span>
                {i < arr.length - 1 && <span className="text-zinc-600">→</span>}
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-3">{brain.summary?.authFlow || 'No auth provider detected.'}</p>
        </div>
        <div className="bg-zinc-900/60 border border-white/8 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-white mb-3">🗄️ Data Flow</h4>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {['Client', 'API Route', 'ORM / Query', 'Database'].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-zinc-800 border border-white/10 rounded-lg text-zinc-300">{step}</span>
                {i < arr.length - 1 && <span className="text-zinc-600">→</span>}
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-3">{brain.summary?.databaseFlow || 'No database detected.'}</p>
        </div>
      </div>

      {/* Key Features + Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {brain.summary?.keyFeatures?.length > 0 && (
          <div className="bg-zinc-900/60 border border-white/8 rounded-xl p-5">
            <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-3">Key Features</h3>
            <ul className="space-y-2">
              {brain.summary.keyFeatures.map((f, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-zinc-300"
                  style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateX(-8px)', transition: `all 0.4s ease ${i * 80 + 400}ms` }}
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px] text-emerald-400 flex-shrink-0 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Activity Timeline */}
        <div className="bg-zinc-900/60 border border-white/8 rounded-xl p-5">
          <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-4">Activity Timeline</h3>
          <div className="relative pl-6">
            <div className="absolute left-2 top-0 bottom-0 w-px bg-white/8" />
            {timeline.map((item, i) => (
              <div
                key={i}
                className="relative mb-4 last:mb-0"
                style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(8px)', transition: `all 0.4s ease ${i * 120 + 200}ms` }}
              >
                <div className={`absolute -left-4 w-3 h-3 rounded-full ${item.color} border-2 border-zinc-950 mt-0.5`} />
                <div className="flex items-center gap-2">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-sm text-zinc-300">{item.label}</span>
                </div>
                <p className="text-[10px] text-zinc-600 mt-0.5">{item.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interview Questions Preview */}
      {brain.summary?.potentialInterviewQuestions?.length > 0 && (
        <div className="bg-zinc-900/60 border border-white/8 rounded-xl p-5">
          <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-3">🎯 Potential Interview Questions</h3>
          <div className="space-y-2">
            {brain.summary.potentialInterviewQuestions.slice(0, 4).map((q, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="w-5 h-5 rounded-full bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-[10px] text-blue-400 flex-shrink-0 mt-0.5">{i+1}</span>
                <p className="text-zinc-400 leading-relaxed">{q}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
