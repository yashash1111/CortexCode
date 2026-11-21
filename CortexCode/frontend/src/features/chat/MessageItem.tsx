'use client';

import React, { useState } from 'react';
import { Bot, Copy, Check, ThumbsUp, ThumbsDown, RefreshCw, Volume2, VolumeX, Pause, Play, Sparkles, User } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { CodeBlock } from '@/components/CodeBlock';
import AttachmentViewer from './AttachmentViewer';
import type { AttachedFile } from './types';

export interface MessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    isStreaming?: boolean;
    isThinking?: boolean;
    thinkingText?: string;
    feedback?: 'like' | 'dislike';
    attachedFiles?: AttachedFile[];
  };
  userName: string;
  onRegenerate?: () => void;
}

export default function MessageItem({ message, userName, onRegenerate }: MessageProps) {
  const toast = useToast();
  const tts = useTextToSpeech();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(message.feedback || null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.showSuccess('Copied to Clipboard!', 'Message content copied.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: 'like' | 'dislike') => {
    setFeedback(type);
    toast.showInfo('Feedback Recorded', type === 'like' ? 'Thank you for your feedback!' : 'Feedback submitted.');
  };

  // Helper to parse Inline Formatting (Bold, Inline Code, LaTeX cleanup)
  const renderInlineFormattedText = (text: string) => {
    // Clean up unrendered LaTeX notation if present
    const cleaned = text
      .replace(/\\\(\s*\\mathcal\{O\}\((.+?)\)\s*\\\)/g, 'O($1)')
      .replace(/\\\(\s*O\((.+?)\)\s*\\\)/g, 'O($1)')
      .replace(/\{?\\mathcal\{O\}\((.+?)\)\}?/g, 'O($1)')
      .replace(/\\mathcal\{O\}/g, 'O');

    // Replace **bold** and `code` inline elements
    const parts = cleaned.split(/(\*\*.*?\*\*|`.*?`)/g);

    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-[var(--text-primary)]">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 bg-[var(--code-header-bg)] border border-[var(--code-border)] rounded text-[var(--accent-primary)] font-mono text-xs">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Helper to parse Markdown Lines (Headings, Lists, Dividers, Paragraphs)
  const renderMarkdownText = (textBlock: string) => {
    const lines = textBlock.split('\n');

    return (
      <div className="space-y-2">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          if (!trimmed) {
            return <div key={idx} className="h-1" />;
          }

          // Horizontal Divider
          if (trimmed === '---') {
            return <hr key={idx} className="my-3 border-[var(--border-default)]" />;
          }

          // Heading 3: ### Title
          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-base font-bold text-[var(--text-primary)] mt-4 mb-1 tracking-tight flex items-center gap-2">
                {renderInlineFormattedText(trimmed.replace(/^###\s+/, ''))}
              </h3>
            );
          }

          // Heading 4: #### Title
          if (trimmed.startsWith('#### ')) {
            return (
              <h4 key={idx} className="text-sm font-bold text-[var(--accent-primary)] mt-3 mb-1 tracking-tight">
                {renderInlineFormattedText(trimmed.replace(/^####\s+/, ''))}
              </h4>
            );
          }

          // Bullet List: - item or * item
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-2 ml-2 my-1 text-[var(--text-secondary)]">
                <span className="text-[var(--accent-primary)] font-bold select-none">•</span>
                <span className="flex-1">{renderInlineFormattedText(trimmed.replace(/^[-*]\s+/, ''))}</span>
              </div>
            );
          }

          // Numbered List: 1. item
          const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start gap-2 ml-2 my-1 text-[var(--text-secondary)]">
                <span className="text-[var(--accent-primary)] font-bold select-none min-w-[1.25rem] text-right">{numMatch[1]}.</span>
                <span className="flex-1">{renderInlineFormattedText(numMatch[2])}</span>
              </div>
            );
          }

          // Table Row Header / Body
          if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            if (trimmed.includes('---')) return null; // skip markdown table delimiter row
            const cells = trimmed.split('|').filter(c => c.trim() !== '');
            return (
              <div key={idx} className="grid grid-cols-4 gap-2 p-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-xs font-mono my-1">
                {cells.map((cell, cIdx) => (
                  <div key={cIdx} className="truncate">{renderInlineFormattedText(cell.trim())}</div>
                ))}
              </div>
            );
          }

          // Standard Paragraph
          return (
            <p key={idx} className="leading-relaxed text-[var(--text-secondary)]">
              {renderInlineFormattedText(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderFormattedContent = (content: string) => {
    const codeBlockRegex = /```([a-zA-Z0-9_+#-]+)?\s*\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: content.substring(lastIndex, match.index) });
      }

      parts.push({
        type: 'code',
        language: match[1] || 'code',
        code: match[2].trim()
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', value: content.substring(lastIndex) });
    }

    if (parts.length === 0) {
      return renderMarkdownText(content);
    }

    return (
      <div className="space-y-3 font-sans">
        {parts.map((part, idx) => {
          if (part.type === 'text') {
            return <div key={idx}>{renderMarkdownText(part.value || '')}</div>;
          }

          return <CodeBlock key={idx} code={part.code || ''} language={part.language} />;
        })}
      </div>
    );
  };

  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3.5 animate-fade-in-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* AI Assistant Avatar */}
      {!isUser && (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-[1px] shrink-0 shadow-md mt-0.5">
          <div className="w-full h-full bg-[var(--bg-secondary)] rounded-[11px] flex items-center justify-center">
            <Bot size={17} className="text-[var(--accent-primary)]" />
          </div>
        </div>
      )}

      {/* Message Content Bubble */}
      <div
        className={`rounded-2xl border backdrop-blur-xl text-sm leading-relaxed transition-colors ${
          isUser
            ? 'max-w-xl px-4 py-3 bg-[var(--bg-elevated)] border-[var(--accent-border)] text-[var(--text-primary)] rounded-tr-sm shadow-md'
            : 'w-full max-w-3xl p-5 bg-[var(--bg-card)] border-[var(--accent-border)] text-[var(--text-secondary)] rounded-tl-sm shadow-lg'
        }`}
      >
        {/* Top Status / Header */}
        {!isUser && (
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[var(--border-default)] text-xs">
            <div className="flex items-center gap-2">
              {message.isThinking || message.isStreaming ? (
                <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[11px] font-medium text-[var(--accent-primary)]">
                  <Sparkles size={12} className="animate-pulse" />
                  {message.thinkingText || 'Thinking... Analyzing your request'}
                </span>
              ) : (
                <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Sparkles size={13} className="text-[var(--accent-primary)]" />
                  CortexCode AI
                </span>
              )}
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">{message.timestamp}</span>
          </div>
        )}

        {/* Attached Files, Images, Folders & Audio Visualization */}
        {message.attachedFiles && message.attachedFiles.length > 0 && (
          <AttachmentViewer attachments={message.attachedFiles} isUser={isUser} />
        )}

        {/* Message Content Body */}
        {message.isThinking || (!message.content && message.isStreaming) ? (
          <div className="flex items-center gap-2.5 py-2 px-3.5 my-1 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] w-fit">
            <div className="relative flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-ping absolute opacity-75" />
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
            </div>
            <span className="text-xs font-medium text-[var(--text-primary)]">
              {message.thinkingText || 'Analyzing your request'}
            </span>
          </div>
        ) : isUser ? (
          <div className="text-sm font-medium whitespace-pre-wrap">{message.content}</div>
        ) : (
          renderFormattedContent(message.content)
        )}

        {/* AI Message Action Footer */}
        {!isUser && !message.isStreaming && (
          <div className="mt-4 pt-3 border-t border-[var(--border-default)] flex items-center justify-between text-xs text-[var(--text-muted)] flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-[11px]"
              >
                {copied ? <Check size={12} className="text-[var(--status-success)]" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-[11px]"
                >
                  <RefreshCw size={12} /> Regenerate
                </button>
              )}

              {/* Read Aloud Controls */}
              {tts.isSupported && !tts.isSpeaking && (
                <button
                  onClick={() => tts.speak(message.content)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--accent-soft)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors text-[11px]"
                  title="Read aloud"
                >
                  <Volume2 size={12} /> Read aloud
                </button>
              )}
              {tts.isSupported && tts.isSpeaking && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={tts.isPaused ? tts.resume : tts.pause}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-primary)] border border-[var(--accent-border)] transition-colors text-[11px]"
                    title={tts.isPaused ? 'Resume' : 'Pause'}
                  >
                    {tts.isPaused ? <Play size={12} /> : <Pause size={12} />}
                    {tts.isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={tts.stop}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--status-error-bg)] text-[var(--status-error)] border border-[var(--status-error-border)] transition-colors text-[11px]"
                    title="Stop"
                  >
                    <VolumeX size={12} /> Stop
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleFeedback('like')}
                className={`p-1.5 rounded-lg transition-colors ${
                  feedback === 'like'
                    ? 'text-[var(--status-success)] bg-[var(--status-success-bg)]'
                    : 'hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
                title="Helpful"
              >
                <ThumbsUp size={13} />
              </button>

              <button
                onClick={() => handleFeedback('dislike')}
                className={`p-1.5 rounded-lg transition-colors ${
                  feedback === 'dislike'
                    ? 'text-[var(--status-error)] bg-[var(--status-error-bg)]'
                    : 'hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
                title="Not helpful"
              >
                <ThumbsDown size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div
          title={userName}
          className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-md mt-0.5"
        >
          {userName ? userName.charAt(0).toUpperCase() : <User size={15} />}
        </div>
      )}
    </div>
  );
}
