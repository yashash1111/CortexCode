'use client';

import React from 'react';
import { CheckCircle2, Layers, Gauge, Sparkles } from 'lucide-react';
import type { MockInterviewSession } from './interview.types';

export function InterviewProgress({ session }: { session: MockInterviewSession }) {
  const asked = Math.min(session.questionsAsked || 0, session.questionLimit || 10);
  const pct = session.questionLimit > 0 ? Math.round((asked / session.questionLimit) * 100) : 0;
  const topics = Array.from(
    new Set(
      (session.messages || [])
        .map((m) => m.topic)
        .filter((t): t is string => Boolean(t && t.trim()))
    )
  );

  return (
    <div className="space-y-4 text-xs">
      <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            Interview Progress
          </span>
          <span className="font-mono text-[var(--accent-primary)] font-bold">
            {asked}/{session.questionLimit}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span>Difficulty: <strong className="text-[var(--text-primary)]">{session.currentDifficulty || session.difficulty}</strong></span>
          <span>{pct}%</span>
        </div>
      </div>

      {session.skills && session.skills.length > 0 && (
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="font-semibold text-[var(--text-primary)] mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            Skills Evaluated
          </div>
          <div className="flex flex-wrap gap-1.5">
            {session.skills.map((skill) => (
              <span
                key={skill}
                className="px-2.5 py-1 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent-primary)] text-[11px] font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
        <div className="font-semibold text-[var(--text-primary)] mb-2.5 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          Topics Covered
        </div>
        {topics.length === 0 ? (
          <p className="text-[11px] text-[var(--text-muted)]">Topics will appear as questions progress.</p>
        ) : (
          <ul className="space-y-1.5">
            {topics.map((topic) => (
              <li key={topic} className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-success)] shrink-0" />
                <span className="truncate">{topic}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
