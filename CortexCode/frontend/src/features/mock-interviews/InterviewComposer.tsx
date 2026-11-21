'use client';

import React, { useState } from 'react';
import { Send, Square, Code2, HelpCircle, SkipForward } from 'lucide-react';
import VoiceInput from '@/features/chat/VoiceInput';

interface InterviewComposerProps {
  onSubmit: (payload: { answer: string; code?: string; language?: string; action: 'answer' | 'clarification' }) => void;
  onSkip: () => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  isCompleted: boolean;
  defaultLanguage?: string | null;
  voiceEnabled: boolean;
}

export function InterviewComposer({
  onSubmit,
  onSkip,
  onStopStreaming,
  isStreaming,
  isCompleted,
  defaultLanguage,
  voiceEnabled,
}: InterviewComposerProps) {
  const [answer, setAnswer] = useState('');
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState(defaultLanguage || 'javascript');

  const handleSend = (action: 'answer' | 'clarification') => {
    if ((!answer.trim() && !code.trim()) || isStreaming || isCompleted) return;
    onSubmit({
      answer: answer.trim() || '[Code submission]',
      code: showCodeEditor && code.trim() ? code : undefined,
      language: showCodeEditor ? language : undefined,
      action,
    });
    setAnswer('');
    if (action === 'answer') {
      setCode('');
    }
  };

  return (
    <div className="border-t border-[var(--border-default)] bg-[var(--header-bg)] backdrop-blur-xl p-3 sm:p-4 shrink-0">
      {showCodeEditor && (
        <div className="mb-3 rounded-xl border border-[var(--border-strong)] bg-[var(--code-bg)] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--code-header-bg)] border-b border-[var(--code-border)]">
            <span className="text-[11px] font-mono text-[var(--text-secondary)]">Code Solution Editor</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-2 py-0.5 rounded bg-[var(--input-bg)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] outline-none"
            >
              {['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'sql'].map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={6}
            placeholder={`Write your ${language} solution here...`}
            className="w-full p-3 bg-transparent text-xs font-mono text-[var(--code-text)] placeholder-[var(--input-placeholder)] outline-none resize-y"
          />
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)] p-2.5">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend('answer');
            }
          }}
          disabled={isCompleted}
          rows={2}
          placeholder={
            isCompleted
              ? 'This interview has ended. View your final evaluation report.'
              : 'Type your answer... (Enter to submit, Shift+Enter for new line)'
          }
          className="w-full px-2 py-1.5 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--input-placeholder)] outline-none resize-none"
        />

        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-default)] gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowCodeEditor((v) => !v)}
              disabled={isCompleted}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                showCodeEditor
                  ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent-primary)]'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{showCodeEditor ? 'Hide Code' : 'Code Editor'}</span>
            </button>

            {voiceEnabled && (
              <VoiceInput
                onTranscript={(text) => setAnswer((prev) => (prev ? `${prev} ${text}` : text))}
              />
            )}

            <button
              type="button"
              onClick={() => handleSend('clarification')}
              disabled={isStreaming || isCompleted || !answer.trim()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Ask Clarification</span>
            </button>

            <button
              type="button"
              onClick={onSkip}
              disabled={isStreaming || isCompleted}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Skip</span>
            </button>
          </div>

          <div>
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--status-error)] text-white text-xs font-semibold cursor-pointer"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSend('answer')}
                disabled={isCompleted || (!answer.trim() && !code.trim())}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold disabled:opacity-40 shadow-md transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Answer</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
