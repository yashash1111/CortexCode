'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Brain, ChevronDown, ChevronUp, CornerUpLeft, X, Quote, Zap } from 'lucide-react';
import { WorkspaceBrainData, chatWithWorkspace } from '@/lib/workspaceApi';

interface Props { workspaceId: string; brain: WorkspaceBrainData; }
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contextFiles?: string[];
  timestamp: string;
  replyTo?: { id: string; role: string; content: string; author: string };
  thinkingDuration?: number;
  isThinking?: boolean;
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-white/10">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-white/10">
        <span className="text-[10px] text-zinc-600 font-mono uppercase">{lang || 'code'}</span>
        <button onClick={copy} className="text-[10px] text-zinc-500 hover:text-white transition-colors flex items-center gap-1">
          {copied ? '✓ Copied' : '⎘ Copy'}
        </button>
      </div>
      <pre className="p-4 bg-zinc-950 overflow-x-auto text-xs text-zinc-300 font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderMessage(content: string) {
  const blocks: React.ReactNode[] = [];
  let i = 0;
  const lines = content.split('\n');
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push(<CodeBlock key={key++} code={codeLines.join('\n')} lang={lang} />);
      i++;
      continue;
    }

    // H1
    if (line.startsWith('# ')) {
      blocks.push(<h2 key={key++} className="text-lg font-bold text-white mt-4 mb-2">{line.slice(2)}</h2>);
      i++; continue;
    }
    // H2
    if (line.startsWith('## ')) {
      blocks.push(<h3 key={key++} className="text-base font-semibold text-zinc-200 mt-3 mb-1">{line.slice(3)}</h3>);
      i++; continue;
    }
    // H3
    if (line.startsWith('### ')) {
      blocks.push(<h4 key={key++} className="text-sm font-semibold text-zinc-300 mt-2 mb-1">{line.slice(4)}</h4>);
      i++; continue;
    }

    // Bullet list — collect consecutive bullets
    if (line.match(/^[-*] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-2 space-y-1 pl-4">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
              <span className="text-blue-400 mt-1 flex-shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code class="bg-zinc-800 px-1 rounded text-blue-300 text-xs font-mono">$1</code>') }} />
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      blocks.push(
        <ol key={key++} className="my-2 space-y-1 pl-4">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
              <span className="text-blue-400 flex-shrink-0 font-mono text-xs mt-0.5">{idx+1}.</span>
              <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code class="bg-zinc-800 px-1 rounded text-blue-300 text-xs font-mono">$1</code>') }} />
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line
    if (line.trim() === '') { i++; continue; }

    // Regular paragraph
    blocks.push(
      <p key={key++} className="text-sm text-zinc-300 leading-relaxed mb-1"
        dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>').replace(/`(.+?)`/g, '<code class="bg-zinc-800 px-1 rounded text-blue-300 text-xs font-mono">$1</code>') }}
      />
    );
    i++;
  }
  return blocks;
}

const QUICK_PROMPTS = ['Explain auth flow', 'List all API routes', 'Top 3 issues?', 'Suggest improvements', 'Explain architecture'];

export default function SmartChatView({ workspaceId, brain }: Props) {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'init', role: 'assistant', timestamp: 'Just now',
    content: `Hello! I'm your CortexCode AI with full knowledge of **${brain.name}**.\n\nI can see your project uses ${[...brain.stack.frameworks, ...brain.stack.databases].slice(0, 4).join(', ') || 'your tech stack'}.\n\nAsk me anything about your project — bugs, architecture, how things work, or what to build next.`,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [useContext, setUseContext] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [replyingTo, setReplyingTo] = useState<{ id: string; role: string; content: string; author: string } | null>(null);
  const [selectionTooltip, setSelectionTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [openThinkingMap, setOpenThinkingMap] = useState<Record<string, boolean>>({});

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
  }, []);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionTooltip(null);
      return;
    }
    const text = selection.toString().trim();
    if (text.length > 3) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionTooltip({
        text,
        x: rect.left + rect.width / 2,
        y: rect.top - 12
      });
    } else {
      setSelectionTooltip(null);
    }
  };

  const handleAskCortexCodeFromSelection = (text: string) => {
    setReplyingTo({
      id: 'sel-' + Date.now(),
      role: 'assistant',
      content: text,
      author: 'Selected Snippet'
    });
    setSelectionTooltip(null);
    window.getSelection()?.removeAllRanges();
    textareaRef.current?.focus();
  };

  const toggleThinking = (msgId: string) => {
    setOpenThinkingMap(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleSend = useCallback(async (text?: string) => {
    const rawMsg = (text ?? input).trim();
    if (!rawMsg || loading) return;

    let msgToSend = rawMsg;
    if (replyingTo) {
      msgToSend = `[Replying to ${replyingTo.author}: "${replyingTo.content.slice(0, 300)}"]\n\n${rawMsg}`;
    }

    const currentReplyTo = replyingTo;
    const userMsg: Message = {
      id: 'u-' + Date.now(),
      role: 'user',
      content: rawMsg,
      timestamp: new Date().toLocaleTimeString(),
      replyTo: currentReplyTo ? { id: currentReplyTo.id, role: currentReplyTo.role, content: currentReplyTo.content, author: currentReplyTo.author } : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setReplyingTo(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    const startTime = Date.now();
    const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
    const result = await chatWithWorkspace(workspaceId, msgToSend, useContext, history);
    const duration = Math.max(0.4, Number(((Date.now() - startTime) / 1000).toFixed(1)));

    setMessages(prev => [
      ...prev,
      {
        id: 'a-' + Date.now(),
        role: 'assistant',
        content: result.response,
        contextFiles: result.contextFiles,
        timestamp: new Date().toLocaleTimeString(),
        thinkingDuration: duration
      }
    ]);
    setLoading(false);
  }, [input, loading, messages, replyingTo, useContext, workspaceId]);

  const showQuickPrompts = messages.length <= 1;

  return (
    <div className="flex flex-col h-full relative">
      {/* Floating Text Selection Ask CortexCode Tooltip */}
      {selectionTooltip && (
        <div
          style={{ top: `${selectionTooltip.y}px`, left: `${selectionTooltip.x}px`, transform: 'translate(-50%, -100%)' }}
          className="fixed z-50 animate-fade-in-up pointer-events-auto"
        >
          <button
            onClick={() => handleAskCortexCodeFromSelection(selectionTooltip.text)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold shadow-2xl border border-white/20 hover:scale-105 transition-all cursor-pointer"
          >
            <Sparkles size={13} className="animate-spin text-blue-200" />
            <span>Ask CortexCode</span>
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/8 bg-zinc-950/40 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setUseContext(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${useContext ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' : 'bg-zinc-800/80 border-white/10 text-zinc-500'}`}
          >
            <span className={`w-2 h-2 rounded-full ${useContext ? 'bg-blue-400' : 'bg-zinc-600'}`} />
            Project Context {useContext ? 'ON' : 'OFF'}
          </button>
          {useContext && <span className="text-xs text-zinc-600">Answers grounded in your code files</span>}
        </div>
        <div className="flex gap-1.5">
          {brain.stack.frameworks.slice(0, 3).map(f => (
            <span key={f} className="px-2 py-0.5 rounded-lg bg-zinc-800/80 border border-white/8 text-[10px] text-zinc-500">{f}</span>
          ))}
        </div>
      </div>

      {/* Quick Prompts */}
      {showQuickPrompts && (
        <div className="px-5 pt-3 pb-1 flex flex-wrap gap-2 flex-shrink-0">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => handleSend(p)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/10 text-xs text-zinc-400 hover:text-white hover:border-blue-500/40 hover:bg-blue-600/10 transition-all"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div onMouseUp={handleMouseUp} className="flex-1 overflow-y-auto px-5 py-4 space-y-5 relative">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-sm flex-shrink-0 mt-1 shadow-lg shadow-blue-600/20">
                🧠
              </div>
            )}
            <div className={`max-w-2xl min-w-0 ${msg.role === 'user' ? 'max-w-sm' : ''}`}>

              {/* Quoted Reply Reference */}
              {msg.replyTo && (
                <div className="mb-2 p-2.5 rounded-xl bg-black/60 border-l-4 border-blue-500 text-xs text-blue-200/90 text-left font-sans">
                  <div className="flex items-center gap-1 font-bold text-blue-300 text-[11px] mb-0.5">
                    <Quote size={11} className="rotate-180 text-blue-400" />
                    <span>Replying to {msg.replyTo.author}</span>
                  </div>
                  <div className="line-clamp-2 text-[11px] text-zinc-400">{msg.replyTo.content}</div>
                </div>
              )}

              {/* Thinking Accordion (ChatGPT style) */}
              {msg.role === 'assistant' && (msg.isThinking || msg.thinkingDuration) ? (
                <div className="mb-3 rounded-xl border border-blue-500/30 bg-blue-950/20 p-2.5 backdrop-blur-md transition-all">
                  <button
                    onClick={() => toggleThinking(msg.id)}
                    className="flex items-center justify-between w-full text-xs font-semibold text-blue-300 hover:text-blue-200 transition"
                  >
                    <div className="flex items-center gap-2">
                      <Brain size={14} className={`text-blue-400 ${msg.isThinking ? 'animate-pulse' : ''}`} />
                      <span>
                        {msg.isThinking
                          ? 'CortexCode is thinking...'
                          : `Thought for ${(msg.thinkingDuration || 1.2).toFixed(1)}s`}
                      </span>
                    </div>
                    {openThinkingMap[msg.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {(openThinkingMap[msg.id] || msg.isThinking) && (
                    <div className="mt-2.5 pt-2.5 border-t border-blue-500/20 text-[11px] font-mono text-blue-300/80 space-y-1.5 pl-2">
                      <div className="flex items-center gap-2">
                        <Zap size={11} className="text-blue-400 shrink-0" />
                        <span>Analyzing codebase AST & workspace graph context</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sparkles size={11} className="text-violet-400 shrink-0" />
                        <span>Retrieving file dependencies and grounding answer</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <div className={`rounded-2xl px-4 py-3 ${msg.role === 'user'
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm shadow-lg shadow-blue-600/20'
                : 'bg-zinc-900/80 border border-white/8 text-zinc-200 rounded-tl-sm'}`}
              >
                {msg.role === 'assistant' ? (
                  <div className="text-sm leading-relaxed">{renderMessage(msg.content)}</div>
                ) : (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                )}
              </div>
              {msg.contextFiles && msg.contextFiles.length > 0 && (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-zinc-700">Context:</span>
                  {msg.contextFiles.map(f => (
                    <span key={f} className="px-2 py-0.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-[10px] text-blue-400 font-mono">{f}</span>
                  ))}
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-1 px-1">
                <span className="text-[10px] text-zinc-600">{msg.timestamp}</span>
                <button
                  onClick={() => setReplyingTo({
                    id: msg.id,
                    role: msg.role,
                    content: msg.content,
                    author: msg.role === 'user' ? 'You' : 'CortexCode AI'
                  })}
                  className="text-[10px] text-zinc-500 hover:text-blue-300 flex items-center gap-1 transition"
                  title="Reply to message"
                >
                  <CornerUpLeft size={11} />
                  <span>Reply</span>
                </button>
              </div>

            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold text-zinc-300 flex-shrink-0 mt-1">
                Y
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-sm flex-shrink-0">🧠</div>
            <div className="bg-zinc-900/80 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Brain size={15} className="text-blue-400 animate-pulse" />
              <span className="text-xs text-blue-300 font-medium">CortexCode is thinking...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Composer */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-white/8 bg-zinc-950/40">
        {replyingTo && (
          <div className="flex items-center justify-between px-3.5 py-2 bg-blue-950/60 border border-blue-500/40 rounded-xl mb-2 text-xs text-blue-200 animate-fade-in-up">
            <div className="flex items-center gap-2 truncate">
              <CornerUpLeft size={14} className="text-blue-400 shrink-0" />
              <span className="font-bold text-blue-300">Replying to {replyingTo.author}:</span>
              <span className="truncate text-blue-200/80">"{replyingTo.content.slice(0, 90)}"</span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-blue-300 hover:text-white transition"
            >
              <X size={13} />
            </button>
          </div>
        )}

        <div className="flex gap-3 items-end bg-zinc-900/80 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-blue-500/40 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); autoResize(); }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={useContext ? `Ask about ${brain.name}...` : 'Ask anything...'}
            rows={1}
            className="flex-1 bg-transparent text-white text-sm placeholder-zinc-600 focus:outline-none resize-none leading-relaxed"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all shadow-lg shadow-blue-600/20"
          >
            <span className="text-white text-sm">↑</span>
          </button>
        </div>
        <p className="text-[10px] text-zinc-700 text-center mt-2">Shift+Enter for newline · Enter to send</p>
      </div>
    </div>
  );
}
