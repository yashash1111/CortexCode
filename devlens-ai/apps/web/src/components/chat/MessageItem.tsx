'use client';

import React, { useState } from 'react';
import { Bot, Copy, Check, ThumbsUp, ThumbsDown, RefreshCw, Terminal, Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
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
        return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 bg-black/60 border border-white/15 rounded text-purple-300 font-mono text-xs">
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
            return <hr key={idx} className="my-3 border-white/10" />;
          }

          // Heading 3: ### Title
          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-base font-bold text-white mt-4 mb-1 tracking-tight flex items-center gap-2">
                {renderInlineFormattedText(trimmed.replace(/^###\s+/, ''))}
              </h3>
            );
          }

          // Heading 4: #### Title
          if (trimmed.startsWith('#### ')) {
            return (
              <h4 key={idx} className="text-sm font-bold text-purple-300 mt-3 mb-1 tracking-tight">
                {renderInlineFormattedText(trimmed.replace(/^####\s+/, ''))}
              </h4>
            );
          }

          // Bullet List: - item or * item
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-2 ml-2 my-1 text-zinc-200">
                <span className="text-purple-400 font-bold select-none">•</span>
                <span className="flex-1">{renderInlineFormattedText(trimmed.replace(/^[-*]\s+/, ''))}</span>
              </div>
            );
          }

          // Numbered List: 1. item
          const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start gap-2 ml-2 my-1 text-zinc-200">
                <span className="text-purple-400 font-bold select-none min-w-[1.25rem] text-right">{numMatch[1]}.</span>
                <span className="flex-1">{renderInlineFormattedText(numMatch[2])}</span>
              </div>
            );
          }

          // Table Row Header / Body
          if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            if (trimmed.includes('---')) return null; // skip markdown table delimiter row
            const cells = trimmed.split('|').filter(c => c.trim() !== '');
            return (
              <div key={idx} className="grid grid-cols-4 gap-2 p-2 bg-black/40 border border-white/10 rounded-lg text-xs font-mono my-1">
                {cells.map((cell, cIdx) => (
                  <div key={cIdx} className="truncate">{renderInlineFormattedText(cell.trim())}</div>
                ))}
              </div>
            );
          }

          // Standard Paragraph
          return (
            <p key={idx} className="leading-relaxed text-zinc-200">
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

          return (
            <div key={idx} className="my-3 rounded-2xl bg-black/90 border border-white/15 overflow-hidden shadow-2xl">
              {/* Code Block Language Header & Copy Button */}
              <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-white/10 text-xs font-mono text-zinc-400">
                <span className="flex items-center gap-1.5 font-bold text-purple-300">
                  <Terminal size={13} /> {part.language}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(part.code || '');
                    toast.showSuccess('Code Copied', `Copied ${part.language} snippet.`);
                  }}
                  className="flex items-center gap-1.5 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[11px]"
                >
                  <Copy size={12} /> Copy Code
                </button>
              </div>

              {/* Syntax Highlighted Code Canvas */}
              <pre className="p-4 text-xs font-mono text-zinc-100 overflow-x-auto leading-relaxed custom-scrollbar selection:bg-purple-500 selection:text-white">
                <code>{part.code}</code>
              </pre>
            </div>
          );
        })}
      </div>
    );
  };

  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 animate-fade-in-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      
      {/* AI Assistant Avatar */}
      {!isUser && (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 p-[1px] shrink-0 shadow-lg mt-0.5">
          <div className="w-full h-full bg-black rounded-[15px] flex items-center justify-center">
            <Bot size={18} className="text-purple-300" />
          </div>
        </div>
      )}

      {/* Message Content Bubble */}
      <div className={`max-w-2xl rounded-3xl p-5 border backdrop-blur-xl shadow-xl text-sm leading-relaxed ${
        isUser
          ? 'bg-purple-600/30 border-purple-500/40 text-white rounded-tr-none shadow-[0_0_30px_rgba(168,85,247,0.2)]'
          : 'bg-zinc-900/80 border-white/10 text-zinc-200 rounded-tl-none'
      }`}>
        
        {/* Header Name & Timestamp */}
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10 text-xs font-bold text-zinc-400">
          <span>{isUser ? userName : 'CortexCode AI'}</span>
          <span className="text-[10px] font-normal text-zinc-500">{message.timestamp}</span>
        </div>

        {/* Message Content Body */}
        {message.isThinking || (!message.content && message.isStreaming) ? (
          <div className="flex items-center gap-2.5 py-2 px-3.5 my-1 rounded-2xl bg-purple-950/30 border border-purple-500/20 w-fit backdrop-blur-md animate-fade-in-up">
            <div className="relative flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping absolute opacity-75" />
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
            </div>
            <span className="text-xs font-semibold text-purple-200">
              {message.thinkingText || 'CortexCode AI is thinking'}
            </span>
            <div className="flex gap-1 items-center ml-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '120ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '240ms' }} />
            </div>
          </div>
        ) : (
          renderFormattedContent(message.content)
        )}

        {/* AI Message Action Footer */}
        {!isUser && !message.isStreaming && (
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[11px]"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[11px]"
                >
                  <RefreshCw size={12} /> Regenerate
                </button>
              )}

              {/* Read Aloud Controls */}
              {tts.isSupported && !tts.isSpeaking && (
                <button
                  onClick={() => tts.speak(message.content)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-purple-950/40 hover:text-purple-300 transition-colors text-[11px]"
                  title="Read aloud"
                >
                  <Volume2 size={12} /> Read aloud
                </button>
              )}
              {tts.isSupported && tts.isSpeaking && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={tts.isPaused ? tts.resume : tts.pause}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-950/40 text-purple-300 hover:bg-purple-950/60 transition-colors text-[11px]"
                    title={tts.isPaused ? 'Resume' : 'Pause'}
                  >
                    {tts.isPaused ? <Play size={12} /> : <Pause size={12} />}
                    {tts.isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={tts.stop}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/40 text-red-300 hover:bg-red-950/60 transition-colors text-[11px]"
                    title="Stop"
                  >
                    <VolumeX size={12} /> Stop
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFeedback('like')}
                className={`p-1 rounded-lg transition-colors ${
                  feedback === 'like' ? 'text-emerald-400 bg-emerald-950/40' : 'hover:text-white'
                }`}
              >
                <ThumbsUp size={14} />
              </button>

              <button
                onClick={() => handleFeedback('dislike')}
                className={`p-1 rounded-lg transition-colors ${
                  feedback === 'dislike' ? 'text-red-400 bg-red-950/40' : 'hover:text-white'
                }`}
              >
                <ThumbsDown size={14} />
              </button>

              <span className="text-[10px] text-purple-400 font-semibold ml-1">CortexCode AI</span>
            </div>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-lg mt-0.5">
          {userName.charAt(0)}
        </div>
      )}

    </div>
  );
}
