'use client';

import { useState } from 'react';
import { learnConcept } from '@/lib/workspaceApi';

interface Props { workspaceId: string; }

const SUGGESTED_TOPICS = [
  'React Hooks', 'TypeScript Generics', 'REST API Design',
  'Authentication Flows', 'Database Indexing', 'Docker & Containers',
  'CI/CD Pipelines', 'System Design Basics', 'Async/Await in JavaScript',
  'SQL Joins', 'State Management', 'Microservices'
];
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

interface LessonItem { concept: string; difficulty: string; lesson: string; contextFiles: string[]; createdAt: string; }

export default function LearnModeView({ workspaceId }: Props) {
  const [concept, setConcept] = useState('');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [loading, setLoading] = useState(false);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleLearn = async (c?: string) => {
    const topic = (c ?? concept).trim();
    if (!topic) return;
    setLoading(true);
    const result = await learnConcept(workspaceId, topic, difficulty);
    const item: LessonItem = { concept: topic, difficulty, lesson: result.lesson, contextFiles: result.contextFiles, createdAt: new Date().toISOString() };
    setLessons(prev => [item, ...prev.slice(0, 4)]);
    setExpanded(item.createdAt);
    if (!c) setConcept('');
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Learn Mode</h2>
        <p className="text-zinc-500 text-sm">Learn concepts with examples drawn directly from your project code.</p>
      </div>

      <div className="bg-zinc-900/50 border border-white/8 rounded-2xl p-5 space-y-4">
        <div className="flex gap-3">
          <input
            value={concept}
            onChange={e => setConcept(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLearn()}
            placeholder="Enter a concept, e.g. React Context API..."
            className="flex-1 px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/60 text-sm"
          />
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
            className="px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
          >
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <button
          onClick={() => handleLearn()}
          disabled={loading || !concept.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl text-white text-sm font-semibold transition-all"
        >
          {loading ? <><span className="animate-spin">⟳</span> Generating Lesson...</> : '🎓 Learn This Concept'}
        </button>

        {/* Suggested Topics */}
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-wider mb-2">Quick Start Topics</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_TOPICS.map(t => (
              <button
                key={t}
                onClick={() => { setConcept(t); handleLearn(t); }}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-white/8 text-xs text-zinc-400 hover:text-white transition-all"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lessons History */}
      {lessons.map(item => (
        <div key={item.createdAt} className="bg-zinc-900/50 border border-white/8 rounded-2xl overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === item.createdAt ? null : item.createdAt)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors text-left"
          >
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-white">{item.concept}</h4>
                <span className="px-2 py-0.5 rounded text-[10px] bg-purple-600/20 border border-purple-500/30 text-purple-300">{item.difficulty}</span>
                {item.contextFiles.length > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-blue-600/15 border border-blue-500/25 text-blue-300">
                    Used: {item.contextFiles.slice(0, 2).join(', ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-600 mt-0.5">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
            <span className="text-zinc-500">{expanded === item.createdAt ? '▲' : '▼'}</span>
          </button>
          {expanded === item.createdAt && (
            <div className="px-5 pb-5">
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans bg-zinc-950/50 rounded-xl p-4">{item.lesson}</pre>
            </div>
          )}
        </div>
      ))}

      {lessons.length === 0 && !loading && (
        <div className="text-center py-12 text-zinc-600">
          <div className="text-4xl mb-3">🎓</div>
          <p>Start learning — type a concept or pick a quick-start topic above.</p>
        </div>
      )}
    </div>
  );
}
