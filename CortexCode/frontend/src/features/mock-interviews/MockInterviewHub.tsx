'use client';

import React, { useEffect, useState } from 'react';
import { Briefcase, Plus, History, PlayCircle, FileBarChart2, Loader2 } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import { InterviewSetup } from './InterviewSetup';
import { InterviewWorkbench } from './InterviewWorkbench';
import { InterviewReport } from './InterviewReport';
import {
  createInterviewSession,
  getInterviewReport,
  getInterviewSession,
  listInterviewSessions,
  resumeInterviewSession,
  startInterviewSession,
} from './interview.api';
import type {
  CreateInterviewPayload,
  MockInterviewReportData,
  MockInterviewSession,
} from './interview.types';

type HubView = 'hub' | 'setup' | 'workbench' | 'report';

export default function MockInterviewHub() {
  const toast = useToast();
  const [view, setView] = useState<HubView>('hub');
  const [sessions, setSessions] = useState<MockInterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeSession, setActiveSession] = useState<MockInterviewSession | null>(null);
  const [activeReport, setActiveReport] = useState<MockInterviewReportData | null>(null);
  const [preset, setPreset] = useState<{ role?: string; interviewType?: string; difficulty?: string } | undefined>();

  const loadSessions = async () => {
    try {
      const list = await listInterviewSessions();
      setSessions(list);
    } catch {
      // ignore initial error if unauthenticated
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    listInterviewSessions()
      .then((list) => {
        if (active) setSessions(list);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleStartInterview = async (payload: CreateInterviewPayload) => {
    setCreating(true);
    try {
      const created = await createInterviewSession(payload);
      const started = await startInterviewSession(created.id);
      setActiveSession(started);
      setView('workbench');
      loadSessions();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      toast.showError(
        'Could Not Start Interview',
        e?.response?.data?.error?.message || e?.message || 'Please try again.'
      );
    } finally {
      setCreating(false);
    }
  };

  const handleResume = async (sessionId: string) => {
    try {
      const resumed = await resumeInterviewSession(sessionId);
      setActiveSession(resumed);
      setView('workbench');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      toast.showError('Resume Failed', e?.response?.data?.error?.message || 'Unable to resume session');
    }
  };

  const handleViewReport = async (sessionId: string) => {
    try {
      const [sess, rep] = await Promise.all([
        getInterviewSession(sessionId),
        getInterviewReport(sessionId),
      ]);
      setActiveSession(sess);
      setActiveReport(rep.report);
      setView('report');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      toast.showError('Report Unavailable', e?.response?.data?.error?.message || 'Finish the interview first.');
    }
  };

  if (view === 'workbench' && activeSession) {
    return (
      <InterviewWorkbench
        initialSession={activeSession}
        onBack={() => {
          setView('hub');
          loadSessions();
        }}
        onCompleted={(sess, rep) => {
          setActiveSession(sess);
          setActiveReport(rep);
          setView('report');
          loadSessions();
        }}
      />
    );
  }

  if (view === 'report' && activeSession && activeReport) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        <InterviewReport
          session={activeSession}
          report={activeReport}
          onBack={() => setView('hub')}
          onStartNext={(rec) => {
            setPreset(rec);
            setView('setup');
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">AI Mock Interview Preparation</h1>
              <p className="text-xs text-[var(--text-muted)]">
                Adaptive role-specific technical, DSA, system design, and behavioral interviews
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {view === 'setup' ? (
              <button
                type="button"
                onClick={() => setView('hub')}
                className="px-4 py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer"
              >
                View History
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPreset(undefined);
                  setView('setup');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Mock Interview</span>
              </button>
            )}
          </div>
        </div>

        {view === 'setup' ? (
          <InterviewSetup
            onStartInterview={handleStartInterview}
            isSubmitting={creating}
            initialPreset={preset}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <History className="w-4 h-4 text-[var(--accent-primary)]" />
                Recent Interview Sessions
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-xs text-[var(--text-muted)] gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-primary)]" />
                Loading your mock interviews...
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] text-center space-y-3">
                <p className="text-sm font-semibold text-[var(--text-primary)]">No mock interviews yet</p>
                <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                  Start an adaptive AI mock interview tailored to your target role, experience level, and preferred tech stack.
                </p>
                <button
                  type="button"
                  onClick={() => setView('setup')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Configure First Interview
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--accent-border)] transition-colors flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {s.title || s.role}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            s.status === 'completed'
                              ? 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]'
                              : 'bg-[var(--accent-soft)] text-[var(--accent-primary)] border-[var(--accent-border)]'
                          }`}
                        >
                          {s.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        {s.interviewType} · {s.difficulty} · {s.questionsAsked}/{s.questionLimit} questions
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-default)] text-xs">
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        {s.status !== 'completed' ? (
                          <button
                            type="button"
                            onClick={() => handleResume(s.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-primary)] border border-[var(--accent-border)] font-semibold cursor-pointer"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            Resume
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleViewReport(s.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-default)] font-semibold cursor-pointer"
                          >
                            <FileBarChart2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                            {s.report ? `Report (${Math.round(s.report.overallScore)}%)` : 'View Report'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
