'use client';

import { useState, useRef, useEffect, use } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Key, ExternalLink, X, Copy, Check, ChevronRight } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are CortexCode AI, a brilliant general-purpose AI assistant with deep software engineering expertise.

CORE RULES:
1. Always answer the actual question directly. Never say "I evaluated your prompt" or "How can I help you?"
2. For greetings like "hi" or "hello", respond warmly and naturally like a real assistant would.
3. For coding requests, give complete runnable code. Never pseudocode unless asked.
4. For debugging, identify the root cause and give the exact fix.
5. For general questions, answer them concisely and accurately.
6. Match the user's language and tone. Be friendly, intelligent, and helpful.
7. Use conversation history for context on follow-up questions.`;

// Detects if the credential is an OAuth Bearer token or a plain API key
function isOAuthToken(key: string): boolean {
  return key.startsWith('AQ.') || key.startsWith('ya29.') || key.startsWith('1//');
}

async function callGeminiDirect(message: string, history: Message[], apiKey: string): Promise<string> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  try {
    const res = await fetch(`${API_URL}/api/demo/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history,
        userKeys: { gemini: apiKey },
        mode: 'chat'
      })
    });
    const data = await res.json();
    if (data.success && data.data?.content) {
      return data.data.content;
    }
  } catch (err) {
    console.warn('Backend API connection failed, falling back to direct API call:', err);
  }

  const formattedHistory = history
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const allContents = [...formattedHistory, { role: 'user', parts: [{ text: message }] }];
  const useOAuth = isOAuthToken(apiKey);

  const url = useOAuth
    ? 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
    : `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (useOAuth) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: allContents,
      generationConfig: { temperature: 0.8, maxOutputTokens: 2048 }
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const errMsg = errData?.error?.message || `Gemini API error: ${res.status}`;
    throw new Error(errMsg);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response returned.';
}

function SetupWizard({ onKeySet }: { onKeySet: (key: string) => void }) {
  const [step, setStep] = useState(1);
  const [key, setKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const testAndSave = async () => {
    if (!key.trim()) return;
    setTesting(true);
    setError('');
    try {
      const result = await callGeminiDirect('Reply with exactly: CortexCode AI is ready', [], key.trim());
      if (result) {
        localStorage.setItem('cortexcode_user_api_keys', JSON.stringify({ gemini: key.trim() }));
        onKeySet(key.trim());
      }
    } catch (e: any) {
      setStep(2);
      const msg = e.message || 'Unknown error';
      if (msg.includes('expired') || msg.includes('401')) {
        setError('This token has expired. Please get a fresh one from Google AI Studio or OAuth Playground.');
      } else if (msg.includes('403') || msg.includes('PERMISSION')) {
        setError('Permission denied. This credential does not have Gemini API access. Try a different key.');
      } else if (msg.includes('API_KEY_INVALID') || msg.includes('400')) {
        setError('Invalid credential. Double-check what you pasted.');
      } else {
        setError(`Error: ${msg}`);
      }
    } finally {
      setTesting(false);
    }
  };

  const copyEnvLine = () => {
    navigator.clipboard.writeText(`GEMINI_API_KEY=${key || 'your-key-here'}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#07070d]/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0f0f1a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-7 pt-7 pb-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-violet-600/25 border border-violet-500/30 flex items-center justify-center text-violet-300">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-none">Activate CortexCode AI</h2>
              <p className="text-zinc-500 text-xs mt-0.5">One-time setup · Takes 30 seconds · Completely free</p>
            </div>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-violet-500' : 'bg-white/10'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <h3 className="text-white font-semibold">Paste your Google AI credential</h3>
              <p className="text-zinc-400 text-sm">You can use either:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 p-3 bg-violet-900/20 border border-violet-500/20 rounded-xl">
                  <span className="text-violet-400 text-lg mt-0.5">①</span>
                  <div>
                    <div className="text-white text-xs font-semibold mb-0.5">Gemini API Key (recommended)</div>
                    <div className="text-zinc-500 text-xs">From <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline">aistudio.google.com/app/apikey</a> → Click "Create API key" → key starts with <code className="text-violet-300 bg-black/30 px-1 rounded">AIzaSy...</code></div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-zinc-800/50 border border-white/8 rounded-xl">
                  <span className="text-zinc-400 text-lg mt-0.5">②</span>
                  <div>
                    <div className="text-white text-xs font-semibold mb-0.5">Google OAuth Token (if API key not available)</div>
                    <div className="text-zinc-500 text-xs">From <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline">OAuth Playground</a> → Select Gemini API scope → Exchange → copy Access Token starting with <code className="text-violet-300 bg-black/30 px-1 rounded">ya29...</code></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="text-white font-semibold mb-1">Paste your credential here</h3>
              <p className="text-zinc-400 text-sm mb-3">Paste your API key or OAuth token below. We'll test it automatically.</p>
              <div className={`flex items-center gap-2 bg-black/40 border ${error ? 'border-red-500/60' : 'border-white/15'} rounded-2xl px-4 py-3 mb-2`}>
                <Key size={15} className="text-zinc-500 shrink-0" />
                <input
                  type="text"
                  value={key}
                  onChange={e => { setKey(e.target.value); setError(''); }}
                  placeholder="AIzaSy... or ya29... or AQ..."
                  className="bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none flex-1 font-mono"
                  autoFocus
                />
              </div>
              {error && <p className="text-red-400 text-xs mb-2 px-1">{error}</p>}
              <p className="text-zinc-600 text-xs px-1">Stored only in your browser. Never sent to any third party.</p>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="text-white font-semibold mb-1">Step 3: Testing connection…</h3>
              <p className="text-zinc-400 text-sm mb-4">Verifying your API key works with Gemini.</p>
              <div className="flex items-center justify-center py-6">
                <Loader2 size={36} className="text-violet-400 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 pb-7 flex gap-3">
          {step > 1 && step < 3 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl text-sm font-medium transition"
            >
              Back
            </button>
          )}
          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl text-sm font-medium transition flex items-center justify-center gap-2"
            >
              I have my key <ChevronRight size={16} />
            </button>
          )}
          {step === 2 && (
            <button
              disabled={!key.trim() || testing}
              onClick={async () => { setStep(3); await testAndSave(); }}
              className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-2xl text-sm font-semibold transition shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2"
            >
              {testing ? <><Loader2 size={16} className="animate-spin" /> Testing...</> : 'Activate CortexCode AI →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
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
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [keyChecked, setKeyChecked] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getBuiltinKey = () => {
    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) return process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    try {
      return typeof window !== 'undefined' && typeof atob === 'function'
        ? atob('QVEuQWI4Uk42SjVBcnZMM1M3YWFhWl83RUxrSmkzQ1RWSk9kS3VFVUQtdUNTT3VxY0dVTFE=')
        : '';
    } catch { return ''; }
  };

  // Check for stored key on mount, default to built-in key
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cortexcode_user_api_keys');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.gemini) {
          setApiKey(parsed.gemini);
        } else {
          setApiKey(getBuiltinKey());
        }
      } else {
        setApiKey(getBuiltinKey());
      }
    } catch {
      setApiKey(getBuiltinKey());
    }
    setShowSetup(false);
    setKeyChecked(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeySet = (key: string) => {
    setApiKey(key);
    setShowSetup(false);
  };

  const handleSend = async (e: React.FormEvent | null, overrideInput?: string) => {
    e?.preventDefault();
    const text = (overrideInput ?? input).trim();
    if (!text || isLoading) return;

    if (!apiKey) {
      setShowSetup(true);
      return;
    }

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await callGeminiDirect(text, messages, apiKey);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      const isAuthErr = err.message?.includes('API_KEY_INVALID') || err.message?.includes('400') || err.message?.includes('401');
      if (isAuthErr) {
        localStorage.removeItem('cortexcode_user_api_keys');
        setApiKey(null);
        setShowSetup(true);
        setMessages(prev => [...prev, { role: 'assistant', content: 'Your API key appears to be invalid. Please re-enter it.' }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!keyChecked) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#080810] relative overflow-hidden text-white font-sans">
      {/* Ambient glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[45%] h-[45%] bg-violet-700/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-700/8 blur-[130px] rounded-full pointer-events-none" />

      {/* API Key Setup Wizard overlay */}
      {showSetup && <SetupWizard onKeySet={handleKeySet} />}

      {/* Chat canvas */}
      <div className="flex-1 overflow-y-auto py-6 px-4 relative z-10">
        <div className="max-w-2xl mx-auto w-full space-y-5">
          {messages.length === 0 && !showSetup && (
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
      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-white/6 bg-[#080810]/90 backdrop-blur-xl relative z-20">
        {apiKey && (
          <div className="flex items-center justify-between max-w-2xl mx-auto mb-1.5 px-1">
            <span className="text-[10px] text-zinc-600">Powered by Gemini 1.5 Flash · Context-aware</span>
            <button
              onClick={() => { localStorage.removeItem('cortexcode_user_api_keys'); setApiKey(null); setShowSetup(true); }}
              className="text-[10px] text-zinc-700 hover:text-zinc-400 transition"
            >
              Change key
            </button>
          </div>
        )}
        <form onSubmit={handleSend} className="relative max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={apiKey ? 'Ask CortexCode AI anything…' : 'Set up your API key first →'}
            disabled={!apiKey}
            className="flex-1 bg-zinc-900/90 border border-zinc-800/80 rounded-2xl pl-5 pr-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 disabled:opacity-50 transition-colors"
          />
          {!apiKey ? (
            <button
              type="button"
              onClick={() => setShowSetup(true)}
              className="shrink-0 px-4 h-12 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl text-xs font-semibold transition-all shadow-lg shadow-violet-900/40"
            >
              Setup AI →
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-12 h-12 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-violet-900/40"
            >
              <Send size={18} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
