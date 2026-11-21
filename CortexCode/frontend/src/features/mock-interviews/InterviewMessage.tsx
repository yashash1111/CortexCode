'use client';

import React from 'react';
import { Bot, User, Volume2, VolumeX } from 'lucide-react';
import { CodeBlock } from '@/components/CodeBlock';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import type { MockInterviewMessage } from './interview.types';

export function InterviewMessage({
  message,
  voiceEnabled,
  isStreaming,
}: {
  message: MockInterviewMessage;
  voiceEnabled?: boolean;
  isStreaming?: boolean;
}) {
  const isInterviewer = message.role === 'interviewer';
  const tts = useTextToSpeech();

  const renderBody = (content: string) => {
    const blocks = content.split(/(```[\s\S]*?```)/g);
    return blocks.map((block, idx) => {
      if (block.startsWith('```') && block.endsWith('```')) {
        const lines = block.slice(3, -3).split('\n');
        const lang = lines[0]?.trim() || 'code';
        const codeBody = lines.slice(1).join('\n');
        return <CodeBlock key={idx} code={codeBody} language={lang} />;
      }
      return (
        <div key={idx} className="whitespace-pre-wrap leading-relaxed">
          {block}
        </div>
      );
    });
  };

  return (
    <div className={`flex gap-3 ${isInterviewer ? 'justify-start' : 'justify-end'}`}>
      {isInterviewer && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md mt-0.5">
          <Bot className="w-4 h-4" />
        </div>
      )}

      <div
        className={`rounded-2xl border p-4 text-sm max-w-2xl ${
          isInterviewer
            ? 'bg-[var(--bg-card)] border-[var(--accent-border)] text-[var(--text-secondary)] rounded-tl-sm'
            : 'bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[var(--text-primary)] rounded-tr-sm'
        }`}
      >
        <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-[var(--border-default)] text-[11px]">
          <span className="font-semibold text-[var(--text-primary)]">
            {isInterviewer ? 'AI Interviewer' : 'Your Response'}
            {message.questionNumber ? ` · Q${message.questionNumber}` : ''}
          </span>
          <div className="flex items-center gap-2">
            {message.topic && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent-primary)] text-[10px] font-medium">
                {message.topic}
              </span>
            )}
            {isInterviewer && voiceEnabled && tts.isSupported && !isStreaming && (
              <button
                type="button"
                onClick={() => (tts.isSpeaking ? tts.stop() : tts.speak(message.content))}
                className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
                title={tts.isSpeaking ? 'Stop reading' : 'Read question aloud'}
              >
                {tts.isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {renderBody(message.content || (isStreaming ? 'Thinking...' : ''))}
      </div>

      {!isInterviewer && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-md mt-0.5">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
