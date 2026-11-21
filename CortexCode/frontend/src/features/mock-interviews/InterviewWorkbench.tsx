'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, PanelRight, Flag, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import { InterviewTimer } from './InterviewTimer';
import { InterviewProgress } from './InterviewProgress';
import { InterviewMessage } from './InterviewMessage';
import { InterviewComposer } from './InterviewComposer';
import {
  finishInterviewSession,
  skipInterviewQuestion,
  streamInterviewAnswer,
} from './interview.api';
import type {
  MockInterviewMessage,
  MockInterviewReportData,
  MockInterviewSession,
} from './interview.types';

export function InterviewWorkbench({
  initialSession,
  onBack,
  onCompleted,
}: {
  initialSession: MockInterviewSession;
  onBack: () => void;
  onCompleted: (session: MockInterviewSession, report: MockInterviewReportData) => void;
}) {
  const toast = useToast();
  const [session, setSession] = useState<MockInterviewSession>(initialSession);
  const [messages, setMessages] = useState<MockInterviewMessage[]>(initialSession.messages || []);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activityText, setActivityText] = useState<string>('');
  const [isFinishing, setIsFinishing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activityText]);

  const handleSubmit = async (payload: {
    answer: string;
    code?: string;
    language?: string;
    action: 'answer' | 'clarification';
  }) => {
    if (isStreaming) return;

    const tempCandidateId = `cand-${Date.now()}`;
    const tempAiId = `ai-${Date.now() + 1}`;
    const displayContent = payload.code
      ? `${payload.answer}\n\n\`\`\`${payload.language || 'code'}\n${payload.code}\n\`\`\``
      : payload.answer;

    setMessages((prev) => [
      ...prev,
      {
        id: tempCandidateId,
        sessionId: session.id,
        role: 'candidate',
        content: displayContent,
        questionNumber: session.questionsAsked,
        topic: session.currentTopic,
        createdAt: new Date().toISOString(),
      },
      {
        id: tempAiId,
        sessionId: session.id,
        role: 'interviewer',
        content: '',
        questionNumber: session.questionsAsked,
        topic: session.currentTopic,
        createdAt: new Date().toISOString(),
      },
    ]);

    setIsStreaming(true);
    setActivityText('Recording answer...');
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamInterviewAnswer(
        session.id,
        payload,
        {
          onActivity: (a) => setActivityText(a.detail),
          onStart: (s) => {
            if (s.currentDifficulty) {
              setSession((prev) => ({ ...prev, currentDifficulty: s.currentDifficulty }));
            }
          },
          onToken: (token) => {
            setActivityText('');
            setMessages((prev) =>
              prev.map((m) => (m.id === tempAiId ? { ...m, content: m.content + token } : m))
            );
          },
          onComplete: (data) => {
            setSession((prev) => ({ ...prev, ...data.session }));
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id === tempCandidateId && data.candidateMessage) return data.candidateMessage;
                if (m.id === tempAiId && data.message) return data.message;
                return m;
              })
            );
          },
          onError: (msg) => {
            toast.showError('Interview Stream Error', msg);
            setMessages((prev) =>
              prev.map((m) => (m.id === tempAiId && !m.content ? { ...m, content: `⚠️ ${msg}` } : m))
            );
          },
        },
        controller.signal
      );
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e?.name !== 'AbortError') {
        const msg = e?.message || 'Failed to submit answer';
        toast.showError('Error', msg);
        setMessages((prev) =>
          prev.map((m) => (m.id === tempAiId && !m.content ? { ...m, content: `⚠️ ${msg}` } : m))
        );
      }
    } finally {
      setIsStreaming(false);
      setActivityText('');
      abortRef.current = null;
    }
  };

  const handleSkip = async () => {
    if (isStreaming) return;
    setIsStreaming(true);
    setActivityText('Moving to next question...');
    try {
      const res = await skipInterviewQuestion(session.id);
      setSession((prev) => ({ ...prev, ...res.session }));
      setMessages((prev) => [...prev, res.skipMessage, res.interviewerMessage]);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      toast.showError('Skip Failed', e?.response?.data?.error?.message || 'Could not skip question');
    } finally {
      setIsStreaming(false);
      setActivityText('');
    }
  };

  const handleEndInterview = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    try {
      const res = await finishInterviewSession(session.id);
      onCompleted(res.session, res.report);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      toast.showError(
        'Report Generation Failed',
        e?.response?.data?.error?.message || 'Could not generate evaluation report'
      );
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Interview Header */}
      <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--header-bg)] backdrop-blur-xl flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] cursor-pointer"
            title="Back to Mock Interview Hub"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[var(--text-primary)] truncate">
              {session.title || `${session.role} Mock Interview`}
            </h2>
            <p className="text-[11px] text-[var(--text-muted)] truncate">
              {session.role} · {session.interviewType} · {session.currentDifficulty || session.difficulty}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <InterviewTimer
            startedAt={session.startedAt}
            durationMinutes={session.durationMinutes}
            isCompleted={session.status === 'completed'}
          />

          <span className="px-2.5 py-1.5 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] text-xs font-mono font-semibold text-[var(--accent-primary)]">
            Q {Math.min(session.questionsAsked, session.questionLimit)}/{session.questionLimit}
          </span>

          <button
            type="button"
            onClick={() => setVoiceEnabled((v) => !v)}
            className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
              voiceEnabled
                ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent-primary)]'
                : 'bg-[var(--bg-card)] border-[var(--border-default)] text-[var(--text-muted)]'
            }`}
            title={voiceEnabled ? 'Disable voice input/output' : 'Enable voice input/output'}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setShowDrawer((v) => !v)}
            className="lg:hidden p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] cursor-pointer"
            title="Toggle Progress Drawer"
          >
            <PanelRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleEndInterview}
            disabled={isFinishing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md disabled:opacity-50 cursor-pointer"
          >
            {isFinishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
            <span>{isFinishing ? 'Generating Report...' : 'End & Evaluate'}</span>
          </button>
        </div>
      </div>

      {/* Main Content + Right Progress Panel */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
            {messages.map((msg, idx) => (
              <InterviewMessage
                key={msg.id}
                message={msg}
                voiceEnabled={voiceEnabled}
                isStreaming={isStreaming && idx === messages.length - 1}
              />
            ))}

            {activityText && (
              <div className="text-xs text-[var(--accent-primary)] flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] w-fit">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{activityText}</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <InterviewComposer
            onSubmit={handleSubmit}
            onSkip={handleSkip}
            onStopStreaming={() => abortRef.current?.abort()}
            isStreaming={isStreaming}
            isCompleted={session.status === 'completed'}
            defaultLanguage={session.preferredLanguage}
            voiceEnabled={voiceEnabled}
          />
        </div>

        {/* Desktop Right Progress Panel */}
        <aside className="hidden lg:block w-72 border-l border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-4 overflow-y-auto custom-scrollbar shrink-0">
          <InterviewProgress session={session} />
        </aside>

        {/* Mobile/Tablet Expandable Progress Drawer */}
        {showDrawer && (
          <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
            <div className="fixed inset-0 bg-[var(--bg-overlay)]" onClick={() => setShowDrawer(false)} />
            <aside className="relative z-10 w-72 bg-[var(--sidebar-bg)] border-l border-[var(--border-default)] p-4 overflow-y-auto h-full">
              <InterviewProgress session={session} />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
