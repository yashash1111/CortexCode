'use client';

import { useState, useRef, useEffect, use } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

import { getApiUrl } from '@/lib/apiConfig';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

async function callCentralAI(message: string, history: Message[]): Promise<string> {
  try {
    const res = await fetch(`${getApiUrl()}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        message,
        history,
        mode: 'chat'
      })
    });

    const data = await res.json();
    if (data.success && data.data?.content) {
      return data.data.content;
    }
  } catch {
    // try demo fallback
  }

  // Fallback to /api/demo/chat
  const res = await fetch(`${getApiUrl()}/api/demo/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history,
      mode: 'chat'
    })
  });

  const data = await res.json();
  if (data.success && data.data?.content) {
    return data.data.content;
  }

  throw new Error(data.error?.message || 'AI service is temporarily unavailable. Please try again shortly.');
}

const SUGGESTIONS = [
  'Write a Python function to reverse a linked list',
  'Explain closures in JavaScript with examples',
  'How do I center a div in CSS?',
  'What is the difference between SQL and NoSQL?'
];

export default function ChatPage({ params }: { params: Promise<{ repositoryId: string }> }) {
  const unwrappedParams = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent | null, overrideInput?: string) => {
    e?.preventDefault();
    const text = (overrideInput ?? input).trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await callCentralAI(text, messages);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI service temporarily unavailable. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${msg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#080810] relative overflow-hidden text-white font-sans">
      {/* Ambient glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[45%] h-[45%] bg-violet-700/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-700/8 blur-[130px] rounded-full pointer-events-none" />

      {/* Chat canvas */}
      <div className="flex-1 overflow-y-auto py-6 px-4 relative z-10">
        <div className="max-w-2xl mx-auto w-full space-y-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center text-center pt-10 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 mb-4 shadow-2xl">
                <Bot size={26} />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">CortexCode AI</h2>
              <p className="text-sm text-zinc-500 mb-7 max-w-sm">Ask anything — coding, debugging, concepts, or general questions.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(null, s)}
                    className="text-left px-4 py-3 bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800/70 hover:border-violet-500/40 rounded-2xl text-xs text-zinc-400 hover:text-white transition-all duration-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 shrink-0 mt-1">
                  <Bot size={14} />
                </div>
              )}
              <div className={`px-4 py-3 rounded-2xl max-w-[82%] text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white rounded-tr-sm'
                  : 'bg-zinc-900 border border-zinc-800/80 text-zinc-200 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-white shrink-0 mt-1">
                  <User size={14} />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 shrink-0">
                <Loader2 size={14} className="animate-spin" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-zinc-900 border border-zinc-800/80 text-zinc-500 text-sm flex items-center gap-2">
                <Sparkles size={13} className="text-violet-400 animate-pulse" />
                Generating response...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Composer bar */}
      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-[var(--border-default)] bg-[var(--bg-card)]/90 backdrop-blur-xl relative z-20">
        <form onSubmit={handleSend} className="relative max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask CortexCode AI anything…"
            className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-2xl pl-5 pr-4 py-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:border-[var(--focus-ring)] transition-colors"
          />
          <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-12 h-12 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-violet-900/40"
            >
              <Send size={18} />
            </button>
        </form>
      </div>
    </div>
  );
}
