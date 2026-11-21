'use client';

import React from 'react';
import {
  Award, CheckCircle2, AlertTriangle, BookOpen, Compass, ArrowLeft, Sparkles, Info
} from 'lucide-react';
import type { MockInterviewReportData, MockInterviewSession } from './interview.types';

export function InterviewReport({
  session,
  report,
  onBack,
  onStartNext,
}: {
  session: MockInterviewSession;
  report: MockInterviewReportData;
  onBack: () => void;
  onStartNext?: (preset: { role: string; interviewType: string; difficulty: string }) => void;
}) {
  const incomplete = report.detailedResults?.incompleteOrIncorrectAnswers || [];
  const nextRec = report.detailedResults?.recommendedNextInterview;
  const disclaimer =
    report.detailedResults?.disclaimer ||
    'AI-generated evaluation based on your responses. Automated code checks (if any) are reported separately.';

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Mock Interviews
        </button>

        <span className="text-xs text-[var(--text-muted)]">
          {session.role} · {session.interviewType} · {session.difficulty}
        </span>
      </div>

      {/* Overall Score & Summary */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Interview Evaluation Report</h2>
              <p className="text-xs text-[var(--text-muted)]">{session.title || session.role}</p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-3xl font-black text-[var(--accent-primary)]">{Math.round(report.overallScore)}/100</div>
            <div className="text-[11px] text-[var(--text-muted)]">Overall Score</div>
          </div>
        </div>

        <p className="mt-4 text-sm text-[var(--text-secondary)] leading-relaxed">{report.summary}</p>

        {/* Sub-scores */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Technical Knowledge', val: report.technicalScore ?? report.overallScore },
            { label: 'Communication', val: report.communicationScore ?? report.overallScore },
            { label: 'Problem Solving', val: report.problemSolvingScore ?? report.overallScore },
          ].map((item) => (
            <div key={item.label} className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)]">
              <div className="text-xs text-[var(--text-muted)] mb-1">{item.label}</div>
              <div className="text-xl font-bold text-[var(--text-primary)]">{Math.round(item.val)}/100</div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-start gap-2 text-[11px] text-[var(--text-secondary)]">
          <Info className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
          <span>{disclaimer}</span>
        </div>
      </div>

      {/* Strong & Weak Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--status-success)]" />
            Strong Areas
          </h3>
          <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[var(--status-success)]">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--status-warning)]" />
            Areas to Improve
          </h3>
          <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
            {report.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[var(--status-warning)]">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Incomplete / Incorrect Answers & Suggested Answers */}
      {incomplete.length > 0 && (
        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Incomplete Answers & Suggested Improvements</h3>
          {incomplete.map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] space-y-1.5 text-xs">
              <div className="font-semibold text-[var(--accent-primary)]">
                Question {item.questionNumber} · {item.topic}
              </div>
              <div className="text-[var(--status-warning)]">Gap: {item.issue}</div>
              <div className="text-[var(--text-secondary)]">
                <strong className="text-[var(--text-primary)]">Suggested Answer:</strong> {item.suggestedAnswer}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Topics to Revise + Learning Roadmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--accent-primary)]" />
            Topics to Revise
          </h3>
          <div className="flex flex-wrap gap-2">
            {report.recommendations.map((topic, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)]"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Compass className="w-4 h-4 text-[var(--accent-primary)]" />
            Personalized Learning Roadmap
          </h3>
          <div className="space-y-2.5 text-xs">
            {report.learningRoadmap.map((step, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)]">
                <div className="font-semibold text-[var(--text-primary)]">{step.phase}: {step.focus}</div>
                <ul className="mt-1 space-y-0.5 text-[var(--text-muted)]">
                  {step.actionItems.map((act, aIdx) => (
                    <li key={aIdx}>- {act}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended Next Mock Interview */}
      {nextRec && (
        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[var(--accent-primary)] flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Recommended Next Mock Interview
            </div>
            <div className="text-sm font-bold text-[var(--text-primary)]">
              {nextRec.role} · {nextRec.interviewType} ({nextRec.difficulty})
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{nextRec.reason}</p>
          </div>
          {onStartNext && (
            <button
              type="button"
              onClick={() => onStartNext(nextRec)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold shrink-0 cursor-pointer"
            >
              Configure Next Session
            </button>
          )}
        </div>
      )}
    </div>
  );
}
