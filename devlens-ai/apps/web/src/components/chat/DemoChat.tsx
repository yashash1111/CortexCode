'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, X, Sparkles, Bot, User, Loader2, Key, Eye, EyeOff,
  Copy, Check, Download, Mic, MicOff, Paperclip, Bug, Lightbulb,
  FileText, ShieldCheck, MessageSquare, Info, ChevronRight,
  Trash2, Cpu, Square, Plus, PanelLeft, Edit2, Trash
} from 'lucide-react';
import { getApiUrl } from '@/lib/apiConfig';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: string;
  attachments?: { name: string; size: number }[];
  isStreaming?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
}

interface DemoChatProps {
  onClose: () => void;
}

export type AIMode = 'chat' | 'debug' | 'explain' | 'notes' | 'review';

const MODES: { id: AIMode; label: string; icon: any; desc: string }[] = [
  { id: 'chat', label: 'General Chat', icon: MessageSquare, desc: 'General-purpose AI assistant for any query' },
  { id: 'debug', label: 'Debug Mode', icon: Bug, desc: 'Root cause analysis & exact code fixes' },
  { id: 'explain', label: 'Explain Code', icon: Lightbulb, desc: 'Step-by-step code & concept walkthrough' },
  { id: 'notes', label: 'Notes Generator', icon: FileText, desc: 'Structured high-yield study & reference notes' },
  { id: 'review', label: 'Code Review', icon: ShieldCheck, desc: 'Quality, security, performance & edge case audit' },
];

const MODELS = [
  { id: 'gemini-2.0-flash', name: '⚡ Gemini 2.0 Flash (Fast & Smart)' },
  { id: 'gemini-2.0-flash-lite', name: '🚀 Gemini 2.0 Flash Lite (Lightweight)' },
  { id: 'gemini-2.5-pro', name: '🧠 Gemini 2.5 Pro (Most Capable)' },
  { id: 'gemini-3-flash-preview', name: '🔮 Gemini 3 Flash Preview (Latest)' },
];

const STARTER_CATEGORIES = [
  {
    category: '⚡ General & Casual',
    prompts: [
      "Hi! What can you help me with today?",
      "Help me prepare a study schedule for finals",
      "Explain quantum computing in simple terms"
    ]
  },
  {
    category: '💻 Code Generation',
    prompts: [
      "Write Java code to reverse a string",
      "Build a React login form with validation",
      "Write a Python script to parse JSON and export to CSV"
    ]
  },
  {
    category: '🐛 Debugging',
    prompts: [
      "My Java program is throwing NullPointerException at line 24",
      "Fix this CORS error in Express: Access-Control-Allow-Origin missing",
      "Why is my React useEffect running in an infinite loop?"
    ]
  },
  {
    category: '📐 DSA & Architecture',
    prompts: [
      "Explain the 2 Sum problem and give optimal O(n) Java code",
      "Compare MongoDB vs PostgreSQL for an e-commerce app",
      "Design a scalable URL shortener like Bitly"
    ]
  },
  {
    category: '🚀 Career & Prep',
    prompts: [
      "Help me prepare for a software engineering internship interview",
      "How do I structure my software developer resume?",
      "Give me 5 impressive full-stack project ideas"
    ]
  }
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function renderMarkdownWithCopy(text: string): string {
  let codeBlockIndex = 0;
  return text
    .replace(/```(\w+)?\n?([\s\S]*?)```/g, (_: string, lang: string, code: string) => {
      const language = lang || 'code';
      const id = `code-block-${codeBlockIndex++}`;
      const rawCode = code.trim();
      const escaped = rawCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<div class="demo-code-container" id="${id}">
        <div class="demo-code-header">
          <span class="demo-code-lang">${language}</span>
          <button class="demo-code-copy-btn" data-code="${encodeURIComponent(rawCode)}">
            📋 Copy Code
          </button>
        </div>
        <pre><code class="language-${language}">${escaped}</code></pre>
      </div>`;
    })
    .replace(/`([^`]+)`/g, '<code class="demo-inline-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4 class="demo-h4">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="demo-h3">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="demo-h2">$1</h2>')
    .replace(/^\d+\. (.+)$/gm, '<li class="demo-li-num">$1</li>')
    .replace(/^[-•] (.+)$/gm, '<li class="demo-li">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export default function DemoChat({ onClose }: DemoChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<AIMode>('chat');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [error, setError] = useState('');
  const [showApiKeyPanel, setShowApiKeyPanel] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  // Load Gemini key from environment variable if available
  const BUILTIN_GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
  const [apiKey, setApiKey] = useState(BUILTIN_GEMINI_KEY);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiProvider, setApiProvider] = useState<'gemini' | 'openai'>('gemini');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: number; text: string }[]>([]);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load conversations from LocalStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cortexcode_demo_conversations');
      if (saved) {
        const parsed: Conversation[] = JSON.parse(saved);
        if (parsed.length > 0) {
          setConversations(parsed);
          setActiveConvId(parsed[0].id);
          setMessages(parsed[0].messages);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save conversations to LocalStorage when updated
  const saveConversations = useCallback((updatedConvs: Conversation[]) => {
    setConversations(updatedConvs);
    try {
      localStorage.setItem('cortexcode_demo_conversations', JSON.stringify(updatedConvs));
    } catch {
      // Storage full ignore
    }
  }, []);

  // Auto scroll to bottom during streaming/new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle Code Block Copy Buttons
  useEffect(() => {
    const handleCopyClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.classList.contains('demo-code-copy-btn')) {
        const encodedCode = target.getAttribute('data-code');
        if (encodedCode) {
          const code = decodeURIComponent(encodedCode);
          navigator.clipboard.writeText(code);
          target.innerText = '✓ Copied!';
          setTimeout(() => {
            target.innerText = '📋 Copy Code';
          }, 2000);
        }
      }
    };
    document.addEventListener('click', handleCopyClick);
    return () => document.removeEventListener('click', handleCopyClick);
  }, []);

  // Create New Chat
  const startNewChat = () => {
    const newId = 'conv-' + Date.now();
    const newConv: Conversation = {
      id: newId,
      title: 'New Chat',
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: []
    };
    const updated = [newConv, ...conversations];
    setActiveConvId(newId);
    setMessages([]);
    saveConversations(updated);
    inputRef.current?.focus();
  };

  // Switch Conversation
  const switchConversation = (conv: Conversation) => {
    setActiveConvId(conv.id);
    setMessages(conv.messages);
    inputRef.current?.focus();
  };

  // Delete Conversation
  const deleteConversation = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = conversations.filter(c => c.id !== convId);
    saveConversations(updated);
    if (activeConvId === convId) {
      if (updated.length > 0) {
        setActiveConvId(updated[0].id);
        setMessages(updated[0].messages);
      } else {
        startNewChat();
      }
    }
  };

  // Auto-generate title from prompt
  const generateTitle = (text: string): string => {
    const clean = text.trim().replace(/^[^a-zA-Z0-9]+/, '');
    if (!clean) return 'New Chat';
    const words = clean.split(/\s+/).slice(0, 5).join(' ');
    return words.length > 30 ? words.slice(0, 27) + '...' : words;
  };

  // Voice Recognition setup
  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => (prev ? prev + ' ' + transcript : transcript));
    };

    recognition.start();
  };

  // Stop Generation
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  // Send Message with Word-by-Word Streaming
  const sendMessage = useCallback(async (text: string, overrideMode?: AIMode) => {
    const trimmed = text.trim();
    if ((!trimmed && attachedFiles.length === 0) || loading) return;

    const modeToUse = overrideMode || activeMode;
    let fullPrompt = trimmed;

    if (attachedFiles.length > 0) {
      const fileContext = attachedFiles
        .map(f => `--- Attached File: ${f.name} ---\n${f.text}`)
        .join('\n\n');
      fullPrompt = `${fileContext}\n\nUser Question:\n${trimmed || 'Analyze the attached file(s).'}`;
    }

    const userMsgId = 'msg-u-' + Date.now();
    const assistantMsgId = 'msg-ai-' + Date.now();

    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: trimmed || `[Attached ${attachedFiles.length} file(s)]`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: modeToUse,
      attachments: attachedFiles.map(f => ({ name: f.name, size: f.size }))
    };

    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: modeToUse,
      isStreaming: true
    };

    const newMessages = [...messages, userMsg, initialAssistantMsg];
    setMessages(newMessages);
    setInput('');
    setAttachedFiles([]);
    setLoading(true);
    setError('');

    // Ensure active conversation session
    let currentConvId = activeConvId;
    let updatedConvs = [...conversations];
    let activeConv = updatedConvs.find(c => c.id === currentConvId);

    if (!activeConv) {
      currentConvId = 'conv-' + Date.now();
      setActiveConvId(currentConvId);
      activeConv = {
        id: currentConvId,
        title: generateTitle(trimmed),
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        messages: []
      };
      updatedConvs = [activeConv, ...updatedConvs];
    } else if (activeConv.title === 'New Chat' || activeConv.messages.length === 0) {
      activeConv.title = generateTitle(trimmed);
    }

    // Send history (role + content)
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    const userKeys: Record<string, string> = {};
    if (apiKey.trim()) {
      userKeys[apiProvider] = apiKey.trim();
    }

    abortControllerRef.current = new AbortController();

    try {
      // ── Call Gemini API directly from the browser (no backend needed) ──
      const geminiKey = userKeys['gemini'] || BUILTIN_GEMINI_KEY;
      const modelName = selectedModel.startsWith('gpt') ? 'gemini-2.0-flash' : selectedModel;

      // Build system prompt based on mode
      const systemInstructions: Record<string, string> = {
        chat: 'You are CortexCode AI, a highly intelligent general-purpose assistant. Answer any question thoughtfully, conversationally and accurately.',
        debug: 'You are CortexCode AI in Debug Mode. Identify the root cause of bugs, explain the issue clearly, and provide exact corrected code.',
        explain: 'You are CortexCode AI in Explain Mode. Break down code or concepts step-by-step in simple, clear language with examples.',
        notes: 'You are CortexCode AI in Notes Mode. Generate structured, high-yield study notes with headers, bullet points and examples.',
        review: 'You are CortexCode AI in Code Review Mode. Audit the code for quality, security, performance, and edge cases. Give actionable feedback.'
      };
      const systemPrompt = systemInstructions[modeToUse] || systemInstructions.chat;

      // Format conversation history for Gemini
      const geminiContents = [
        ...history.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        { role: 'user', parts: [{ text: fullPrompt }] }
      ];

      let geminiResponse: Response | null = null;

      // Only attempt direct Gemini API fetch if valid API key is present
      if (geminiKey && geminiKey.trim() !== '' && geminiKey !== 'demo_token' && geminiKey.length > 10) {
        try {
          geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${geminiKey}&alt=sse`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: geminiContents,
                generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
              }),
              signal: abortControllerRef.current.signal
            }
          );
        } catch {
          geminiResponse = null;
        }
      }

      // If direct Gemini request was omitted or failed, call backend stream endpoint
      if (!geminiResponse || !geminiResponse.ok) {
        try {
          geminiResponse = await fetch(`${getApiUrl()}/api/demo/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: fullPrompt,
              history,
              mode: modeToUse,
              userKeys
            }),
            signal: abortControllerRef.current.signal
          });
        } catch {
          geminiResponse = null;
        }
      }

      let accumulatedContent = '';

      if (geminiResponse && geminiResponse.ok && geminiResponse.body) {
        const reader = geminiResponse.body.getReader();
        const decoder = new TextDecoder('utf-8');

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunkText = decoder.decode(value, { stream: true });
          const lines = chunkText.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (!dataStr || dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                const token = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || parsed?.content;
                if (token) {
                  accumulatedContent += token;
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === assistantMsgId
                        ? { ...m, content: accumulatedContent }
                        : m
                    )
                  );
                }
              } catch {
                // Ignore partial chunk parse errors
              }
            }
          }
        }
      }

      if (!accumulatedContent) {
        accumulatedContent = "🔑 **Gemini API Key Required**\n\nTo use direct Gemini streaming, please enter your free Gemini API Key in the settings panel (top-right key icon 🔑), or choose a different AI model.";
      }

      // Complete message state
      const finalizedMessages = newMessages.map(m =>
        m.id === assistantMsgId ? { ...m, content: accumulatedContent, isStreaming: false } : m
      );
      setMessages(finalizedMessages);

      // Save conversation
      const finalConvs = updatedConvs.map(c =>
        c.id === currentConvId
          ? { ...c, messages: finalizedMessages, updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          : c
      );
      saveConversations(finalConvs);

    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User stopped generation manually
      } else {
        console.error('[CortexCode AI] DemoChat error gracefully handled:', err);
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: "🔑 **Gemini API Key Required**\n\nPlease configure your free Gemini API Key in the settings modal (top-right key icon 🔑) to begin chatting.",
                  isStreaming: false
                }
              : m
          )
        );
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
      inputRef.current?.focus();
    }
  }, [messages, loading, activeMode, apiKey, apiProvider, attachedFiles, activeConvId, conversations, saveConversations, selectedModel]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string || '';
        setAttachedFiles(prev => [...prev, { name: file.name, size: file.size, text }]);
      };
      reader.readAsText(file);
    });
  };

  const exportChatAsMarkdown = () => {
    if (messages.length === 0) return;

    let content = `# CortexCode AI Demo Chat Export\nDate: ${new Date().toLocaleString()}\n\n---\n\n`;
    messages.forEach(m => {
      content += `### ${m.role === 'user' ? '👤 User' : '🤖 CortexCode AI'} (${m.timestamp}) [Mode: ${m.mode || 'chat'}]\n\n${m.content}\n\n---\n\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cortexcode-chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const totalWords = messages.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0);
  const estimatedTokens = Math.round(totalWords * 1.3);

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] flex flex-col text-white font-sans overflow-hidden animate-fade-in-up">

      {/* Top Navbar */}
      <header className="h-16 px-4 md:px-6 bg-zinc-950/90 border-b border-white/10 flex items-center justify-between shrink-0 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLeftSidebar(v => !v)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition"
            title="Toggle Sidebar"
          >
            <PanelLeft size={16} />
          </button>
          <button
            onClick={onClose}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/90 hover:text-white rounded-xl text-xs font-semibold transition"
          >
            ← Home
          </button>
          <div className="h-4 w-px bg-white/15 hidden md:block" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white shadow-md">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight text-white">CortexCode AI</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-[10px] font-bold text-purple-300">
                  LIVE WORKSPACE
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Context-Aware AI Assistant Engine</p>
            </div>
          </div>
        </div>

        {/* Center Model Selector */}
        <div className="hidden md:flex items-center gap-2 bg-zinc-900/90 px-3 py-1.5 rounded-2xl border border-white/10">
          <Cpu size={14} className="text-purple-400" />
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
          >
            {MODELS.map(m => (
              <option key={m.id} value={m.id} className="bg-zinc-900 text-white">{m.name}</option>
            ))}
          </select>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowApiKeyPanel(v => !v)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              showApiKeyPanel
                ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Configure API Key"
          >
            <Key size={15} />
            <span className="hidden sm:inline">API Key</span>
          </button>

          <button
            onClick={exportChatAsMarkdown}
            disabled={messages.length === 0}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition"
            title="Export Markdown"
          >
            <Download size={15} />
          </button>

          <button
            onClick={() => setShowRightPanel(v => !v)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition"
            title="Inspector Panel"
          >
            <Info size={15} />
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition ml-1"
            title="Close"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      {/* Mode Selector Strip */}
      <div className="flex overflow-x-auto p-2 bg-zinc-950 border-b border-white/10 gap-1.5 scrollbar-none justify-center">
        {MODES.map(mode => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10'
              }`}
              title={mode.desc}
            >
              <Icon size={14} />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* API Key Panel Drawer */}
      {showApiKeyPanel && (
        <div className="bg-purple-950/40 border-b border-purple-500/30 p-4 shrink-0 animate-fade-in-up">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-purple-200">🔑 Optional Custom API Key</p>
              <p className="text-[11px] text-zinc-400">
                Provide your Gemini key from <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 underline">aistudio.google.com</a> or use the built-in CortexCode engine.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={apiProvider}
                onChange={e => setApiProvider(e.target.value as 'gemini' | 'openai')}
                className="bg-zinc-900 border border-white/15 rounded-xl text-xs text-white px-3 py-2 outline-none"
              >
                <option value="gemini">Gemini API</option>
                <option value="openai">OpenAI API</option>
              </select>
              <div className="relative flex-1 md:w-64">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={apiProvider === 'gemini' ? 'AIza...' : 'sk-...'}
                  className="w-full bg-zinc-900 border border-white/15 rounded-xl text-xs text-white px-3 py-2 pr-8 font-mono outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => setShowApiKey(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                onClick={() => { setApiKey(''); setShowApiKeyPanel(false); }}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-xs font-bold text-zinc-300 rounded-xl"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Sidebar History (ChatGPT / Gemini style) */}
        {showLeftSidebar && (
          <aside className="w-64 bg-zinc-950 border-r border-white/10 p-3 flex flex-col shrink-0 custom-scrollbar animate-fade-in-up">
            <button
              onClick={startNewChat}
              className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-purple-900/30 mb-3"
            >
              <Plus size={16} />
              <span>New Chat</span>
            </button>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              <span className="text-[10px] font-bold text-zinc-500 px-2 uppercase tracking-wider block mb-2">
                Recent Chats
              </span>

              {conversations.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-600">No chat history yet.</div>
              ) : (
                conversations.map(c => {
                  const isActive = c.id === activeConvId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => switchConversation(c)}
                      className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition ${
                        isActive
                          ? 'bg-white/10 text-white font-bold'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <MessageSquare size={13} className={isActive ? 'text-purple-400' : 'text-zinc-500'} />
                        <span className="truncate">{c.title}</span>
                      </div>
                      <button
                        onClick={e => deleteConversation(c.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition"
                        title="Delete Chat"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* Center Stream Stream & Message Log */}
        <div className="flex-1 flex flex-col min-w-0 bg-black/40">

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">

            {messages.length === 0 && !loading && (
              <div className="max-w-3xl mx-auto py-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-blue-600/30 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto mb-5 shadow-2xl">
                  <Cpu size={32} />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Welcome to CortexCode AI</h2>
                <p className="text-sm text-zinc-400 max-w-lg mx-auto mb-8">
                  Intelligent general-purpose AI assistant with real-time streaming, conversation memory, and multi-model support.
                </p>

                {/* Starters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  {STARTER_CATEGORIES.map((cat, idx) => (
                    <div key={idx} className="bg-zinc-900/70 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
                      <h4 className="text-xs font-bold text-zinc-300 mb-3">{cat.category}</h4>
                      <div className="space-y-2">
                        {cat.prompts.map((p, pIdx) => (
                          <button
                            key={pIdx}
                            onClick={() => sendMessage(p)}
                            className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-purple-600/20 border border-white/5 hover:border-purple-500/40 text-xs text-zinc-300 hover:text-white transition flex items-center justify-between group"
                          >
                            <span className="truncate pr-2">{p}</span>
                            <ChevronRight size={13} className="text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-4xl mx-auto flex gap-4 ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm ${
                    msg.role === 'user'
                      ? 'bg-zinc-800 border border-white/15 text-zinc-300'
                      : 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-600/30'
                  }`}
                >
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>

                {/* Content */}
                <div className={`flex-1 min-w-0 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>

                  <div className={`flex items-center gap-2 mb-1.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-xs font-bold text-white">
                      {msg.role === 'user' ? 'You' : 'CortexCode AI'}
                    </span>
                    {msg.mode && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/10 text-zinc-400 uppercase tracking-wider">
                        {msg.mode}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-500">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`inline-block p-4 rounded-2xl text-sm leading-relaxed text-left ${
                      msg.role === 'user'
                        ? 'bg-purple-900/40 border border-purple-500/30 text-purple-100 rounded-tr-xs'
                        : 'bg-zinc-900/90 border border-white/10 text-zinc-200 rounded-tl-xs shadow-xl'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div>
                        <div
                          className="demo-markdown font-sans space-y-2"
                          dangerouslySetInnerHTML={{ __html: renderMarkdownWithCopy(msg.content) }}
                        />
                        {msg.isStreaming && (
                          <span className="inline-block w-2 h-4 ml-1 bg-purple-400 animate-pulse align-middle" />
                        )}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className={`flex items-center gap-2 mt-1 text-[11px] text-zinc-500 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <button
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      className="hover:text-zinc-300 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5 transition"
                    >
                      {copiedMsgId === msg.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                </div>
              </div>
            ))}

            {error && (
              <div className="max-w-4xl mx-auto bg-red-950/40 border border-red-500/30 text-red-300 p-3.5 rounded-xl text-xs flex items-center justify-between">
                <span>⚠️ {error}</span>
                <button onClick={() => setError('')} className="text-red-400 hover:text-white">✕</button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div className="p-4 bg-zinc-950/90 border-t border-white/10 shrink-0">
            <div className="max-w-4xl mx-auto relative bg-zinc-900/90 border border-white/15 rounded-2xl p-2.5 focus-within:border-purple-500/60 transition shadow-2xl">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder={`Ask CortexCode AI in [${MODES.find(m => m.id === activeMode)?.label}] mode... (Enter to send, Shift+Enter for new line)`}
                className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none resize-none px-2 font-sans"
                disabled={loading}
              />
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
                    title="Attach File"
                  >
                    <Paperclip size={16} />
                  </button>
                  <button
                    onClick={toggleVoiceInput}
                    className={`p-1.5 rounded-lg transition ${
                      isListening ? 'bg-red-500 text-white animate-pulse' : 'text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                    title="Voice Input"
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  <span className="text-[11px] text-zinc-500 px-2 py-0.5 bg-white/5 rounded-md font-mono">
                    Mode: {MODES.find(m => m.id === activeMode)?.label}
                  </span>
                </div>

                {loading ? (
                  <button
                    onClick={stopGeneration}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg"
                  >
                    <Square size={13} />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() && attachedFiles.length === 0}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-30 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg"
                  >
                    <Send size={14} />
                    <span>Send</span>
                  </button>
                )}
              </div>
            </div>
            <p className="text-center text-[10px] text-zinc-600 mt-2">
              CortexCode AI Engine · Real-Time Word Streaming Enabled
            </p>
          </div>

        </div>

        {/* Right Collapsible Inspector Panel */}
        {showRightPanel && (
          <aside className="w-80 bg-zinc-950 border-l border-white/10 p-4 hidden lg:flex flex-col gap-4 overflow-y-auto shrink-0 custom-scrollbar">

            {/* Mode Guide */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles size={14} className="text-purple-400" />
                Active Mode: {MODES.find(m => m.id === activeMode)?.label}
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {MODES.find(m => m.id === activeMode)?.desc}
              </p>
            </div>

            {/* Token & Stats */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                <Cpu size={14} className="text-blue-400" />
                Session Intelligence Meter
              </h4>
              <div className="space-y-2.5 text-xs text-zinc-300 font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Messages:</span>
                  <span className="font-bold">{messages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Total Words:</span>
                  <span className="font-bold">{totalWords}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Est. Tokens:</span>
                  <span className="font-bold text-purple-300">{estimatedTokens} / 128k</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden mt-1">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min((estimatedTokens / 128000) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-white mb-3">Quick Prompts</h4>
              <div className="space-y-2">
                <button
                  onClick={() => sendMessage("Write Java code to reverse a string", "chat")}
                  className="w-full p-2 rounded-xl bg-white/5 hover:bg-white/10 text-left text-xs text-zinc-300 transition"
                >
                  ☕ Java String Reversal
                </button>
                <button
                  onClick={() => sendMessage("My Java program is giving NullPointerException", "debug")}
                  className="w-full p-2 rounded-xl bg-white/5 hover:bg-white/10 text-left text-xs text-zinc-300 transition"
                >
                  🐛 Debug NullPointerException
                </button>
                <button
                  onClick={() => sendMessage("Compare MongoDB vs PostgreSQL", "explain")}
                  className="w-full p-2 rounded-xl bg-white/5 hover:bg-white/10 text-left text-xs text-zinc-300 transition"
                >
                  📊 MongoDB vs PostgreSQL
                </button>
                <button
                  onClick={() => sendMessage("Help me prepare for a software internship", "chat")}
                  className="w-full p-2 rounded-xl bg-white/5 hover:bg-white/10 text-left text-xs text-zinc-300 transition"
                >
                  🚀 Internship Prep Plan
                </button>
              </div>
            </div>

          </aside>
        )}

      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
        accept=".txt,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.html,.css,.json,.md"
      />
    </div>
  );
}
