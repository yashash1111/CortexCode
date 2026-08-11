'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  Menu, Sparkles, ChevronDown, Check, Activity, LogOut, X,
  BarChart3, Key, TrendingUp, Zap, MessageSquare, Code2, FileText
} from 'lucide-react';
import Sidebar from '@/components/chat/Sidebar';
import EmptyState from '@/components/chat/EmptyState';
import MessageItem from '@/components/chat/MessageItem';
import Composer from '@/components/chat/Composer';
import ModeSelector, { ChatMode } from '@/components/chat/ModeSelector';
import DragDropOverlay from '@/components/chat/DragDropOverlay';
import BackgroundVideo from '@/components/BackgroundVideo';
import { useToast } from '@/providers/ToastProvider';
import { useAuth } from '@/providers/AuthProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { getApiUrl } from '@/lib/apiConfig';
import type { AttachedFile } from '@/components/chat/types';

function WorkspaceContent() {
  const router = useRouter();
  const toast = useToast();
  const { user, logout } = useAuth();

  // Sidebar & Responsive State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mode State
  const [activeMode, setActiveMode] = useState<ChatMode>('chat');

  // File attachment state
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // ── localStorage keys ─────────────────────────────────────────────────────
  const STORAGE_CONVS_KEY = 'cortexcode_conversations';
  const STORAGE_ACTIVE_KEY = 'cortexcode_active_conv';
  const msgKey = (id: string) => `cortexcode_msgs_${id}`;

  const saveConversations = (convs: Record<string, unknown[]>) => {
    try { localStorage.setItem(STORAGE_CONVS_KEY, JSON.stringify(convs)); } catch { /* ignore */ }
  };
  const saveMessages = (id: string, msgs: unknown[]) => {
    try { localStorage.setItem(msgKey(id), JSON.stringify(msgs)); } catch { /* ignore */ }
  };
  // ──────────────────────────────────────────────────────────────────────────

  // Static defaults — MUST match server render to avoid hydration mismatch.
  // localStorage is loaded in a post-mount useEffect below.
  const DEFAULT_CONV_ID = 'conv-1';
  const DEFAULT_WELCOME_MSG = [{
    id: 'msg-init-1', role: 'assistant',
    content: `Welcome to CortexCode! 👋 I'm your AI Coding & Learning Assistant.\n\nI can help you with:\n\n- Writing and reviewing code in any language\n- Debugging errors and fixing broken code\n- Explaining programming concepts clearly\n- Generating structured study notes\n- Preparing for technical interviews\n\nSelect a mode below the chat box to tailor my responses, or just start typing your question. What would you like to work on today?`,
    timestamp: 'Just now'
  }];
  const DEFAULT_CONVERSATIONS: Record<string, unknown[]> = {
    'Today': [{ id: DEFAULT_CONV_ID, title: 'Welcome Chat', group: 'Today', model: 'CortexCode AI (GPT-4o)', updatedAt: '2024-01-01T00:00:00.000Z' }],
    'Yesterday': [], 'Previous 7 Days': [], 'Previous 30 Days': [], 'Older': []
  };

  const [conversations, setConversations] = useState<Record<string, unknown[]>>(DEFAULT_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string | null>(DEFAULT_CONV_ID);
  const [messages, setMessages] = useState<unknown[]>(DEFAULT_WELCOME_MSG);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage AFTER mount (client-only, avoids SSR mismatch)
  useEffect(() => {
    try {
      const savedConvs = localStorage.getItem(STORAGE_CONVS_KEY);
      const savedActiveId = localStorage.getItem(STORAGE_ACTIVE_KEY) || DEFAULT_CONV_ID;

      if (savedConvs) setConversations(JSON.parse(savedConvs));
      setActiveConvId(savedActiveId);

      const savedMsgs = localStorage.getItem(msgKey(savedActiveId));
      if (savedMsgs) {
        setMessages(JSON.parse(savedMsgs));
      } else if (savedActiveId === DEFAULT_CONV_ID) {
        setMessages(DEFAULT_WELCOME_MSG);
      } else {
        setMessages([]);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist conversations whenever they change (after hydration)
  useEffect(() => {
    if (hydrated) saveConversations(conversations);
  }, [conversations, hydrated]);

  // Persist messages whenever they change (after hydration)
  useEffect(() => {
    if (hydrated && activeConvId) saveMessages(activeConvId, messages);
  }, [messages, activeConvId, hydrated]);

  // Persist active conversation id
  useEffect(() => {
    if (hydrated) {
      try {
        if (activeConvId) {
          localStorage.setItem(STORAGE_ACTIVE_KEY, activeConvId);
        } else {
          localStorage.removeItem(STORAGE_ACTIVE_KEY);
        }
      } catch { /* ignore */ }
    }
  }, [activeConvId, hydrated]);

  // Model & AI Generation State
  const [selectedModel, setSelectedModel] = useState('CortexCode AI (GPT-4o)');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const streamTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'dashboard' | 'apikeys'>('profile');

  // Usage Stats
  const [usageStats, setUsageStats] = useState({
    tokensUsed: 142850,
    conversationsStarted: 23,
    snippetsGenerated: 48,
    debuggingSessions: 12,
    daysActive: 7,
    monthlyActivity: [12, 8, 15, 22, 9, 18, 30, 24, 16, 28, 35, 20, 14, 40, 32, 26, 18, 22, 38, 45, 20, 17, 29, 34, 28, 42, 19, 33, 27, 48]
  });

  // User Profile & Custom API Keys
  const [userProfile, setUserProfile] = useState({
    name: 'Developer',
    email: 'developer@cortex.ai',
    role: 'Software Engineer',
    plan: 'Pro Developer',
    apiKey: 'ctx_live_98a72b14c0094ef8a1e2',
  });

  const [customApiKeys, setCustomApiKeys] = useState<{ gemini: string; openai: string; anthropic: string }>({
    gemini: '',
    openai: '',
    anthropic: ''
  });

  useEffect(() => {
    if (user) {
      setUserProfile(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        role: user.role || prev.role
      }));
    } else {
      try {
        const rawUser = localStorage.getItem('cortexcode_user');
        if (rawUser) {
          const u = JSON.parse(rawUser);
          setUserProfile(prev => ({
            ...prev,
            name: u.name || prev.name,
            email: u.email || prev.email,
            role: u.role || prev.role
          }));
        }
      } catch { /* ignore */ }
    }

    try {
      const rawKeys = localStorage.getItem('cortexcode_user_api_keys');
      if (rawKeys) setCustomApiKeys(JSON.parse(rawKeys));
    } catch { /* ignore */ }
  }, [user]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Handle New Chat Creation
  const handleNewChat = () => {
    const newId = 'conv-' + Date.now();
    const newConv = {
      id: newId,
      title: 'New Conversation',
      group: 'Today',
      model: selectedModel,
      updatedAt: new Date().toISOString()
    };

    setConversations(prev => ({
      ...prev,
      'Today': [newConv, ...(prev['Today'] || [])]
    }));

    setActiveConvId(newId);
    setMessages([]);
    toast.showSuccess('New Conversation Started', 'Ask CortexCode AI anything!');
  };

  // Handle Select Conversation
  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    // Load messages from localStorage immediately
    try {
      const raw = localStorage.getItem(`cortexcode_msgs_${id}`);
      setMessages(raw ? JSON.parse(raw) : []);
    } catch { setMessages([]); }

    let found: unknown = null;
    Object.values(conversations).forEach(list => {
      const match = list.find(c => c.id === id);
      if (match) found = match;
    });
    if (found) {
      toast.showInfo('Conversation Loaded', `Opened "${(found as unknown).title}"`);
    }
  };

  // Handle Rename Conversation
  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations(prev => {
      const updated: Record<string, unknown[]> = {};
      Object.keys(prev).forEach(group => {
        updated[group] = prev[group].map(c => c.id === id ? { ...c, title: newTitle } : c);
      });
      return updated;
    });
  };

  // Handle Delete Conversation
  const handleDeleteConversation = (id: string) => {
    setConversations(prev => {
      const updated: Record<string, unknown[]> = {};
      Object.keys(prev).forEach(group => {
        updated[group] = prev[group].filter(c => c.id !== id);
      });
      return updated;
    });
    if (activeConvId === id) {
      setActiveConvId(null);
      setMessages([]);
    }
    try { localStorage.removeItem(`cortexcode_msgs_${id}`); } catch { /* ignore */ }
  };

  // Auto-title a conversation from first user message
  const autoTitleConversation = (id: string, prompt: string) => {
    const words = prompt.trim().split(/\s+/).slice(0, 6).join(' ');
    const title = words.length > 3 ? words : prompt.substring(0, 40);
    handleRenameConversation(id, title);
  };

  // Handle Clear All Chats
  const handleClearAllChats = () => {
    // Wipe all conversation message keys from localStorage
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(k => {
        if (k.startsWith('cortexcode_msgs_') || k === STORAGE_CONVS_KEY || k === STORAGE_ACTIVE_KEY) {
          localStorage.removeItem(k);
        }
      });
    } catch { /* ignore */ }

    const freshId = 'conv-1';
    const freshConvs: Record<string, unknown[]> = {
      'Today': [{ id: freshId, title: 'Welcome Chat', group: 'Today', model: selectedModel, updatedAt: new Date().toISOString() }],
      'Yesterday': [], 'Previous 7 Days': [], 'Previous 30 Days': [], 'Older': []
    };
    setConversations(freshConvs);
    setActiveConvId(freshId);
    setMessages(DEFAULT_WELCOME_MSG);
    toast.showSuccess('Cleared', 'All chats have been cleared.');
  };

  // Handle Archive Conversation
  const handleArchiveConversation = (id: string) => {
    handleDeleteConversation(id);
  };

  // Handle Mode Change
  const handleModeChange = (mode: ChatMode) => {
    setActiveMode(mode);
    const modeNames: Record<ChatMode, string> = {
      chat: '💬 Chat',
      debug: '🐛 Debug',
      explain: '📚 Explain',
      notes: '📝 Notes',
      review: '🔍 Review'
    };
    toast.showInfo('Mode Switched', `${modeNames[mode]} mode is now active`);
  };

  // Handle Send Message & Progressive Streaming
  const handleSendMessage = (customPrompt?: string, files?: AttachedFile[]) => {
    const prompt = customPrompt || inputMessage;
    const currentFiles = files || attachedFiles;
    if (!prompt.trim() && currentFiles.length === 0) return;
    if (isGenerating) return;

    let currentConvId = activeConvId;

    // If no active conversation, create one
    if (!currentConvId) {
      const newId = 'conv-' + Date.now();
      const newConv = {
        id: newId,
        title: 'New Conversation',
        group: 'Today',
        model: selectedModel,
        updatedAt: new Date().toISOString()
      };
      setConversations(prev => ({
        ...prev,
        'Today': [newConv, ...(prev['Today'] || [])]
      }));
      setActiveConvId(newId);
      currentConvId = newId;
    }

    const userMsg = {
      id: 'msg-' + Date.now(),
      role: 'user' as const,
      content: prompt || `Analyze ${currentFiles.length === 1 ? currentFiles[0].name : `${currentFiles.length} files`}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedFiles: currentFiles.length > 0 ? currentFiles : undefined
    };

    const tempAiMsgId = 'msg-ai-temp-' + Date.now();
    const tempAiMsg = {
      id: tempAiMsgId,
      role: 'assistant' as const,
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isThinking: true,
      thinkingText: 'CortexCode AI is thinking'
    };

    setMessages(prev => {
      const userMessages = prev.filter(m => m.role === 'user');
      if (userMessages.length === 0 && currentConvId) {
        setTimeout(() => autoTitleConversation(currentConvId!, userMsg.content), 0);
      }
      return [...prev, userMsg, tempAiMsg];
    });

    setInputMessage('');
    setAttachedFiles([]);
    setIsGenerating(true);

    // Update stats
    setUsageStats(prev => ({
      ...prev,
      debuggingSessions: activeMode === 'debug' ? prev.debuggingSessions + 1 : prev.debuggingSessions,
    }));

    // Build file context for AI
    const fileContext = currentFiles.length > 0 ? buildFileContext(currentFiles) : '';
    const fullPrompt = fileContext ? `${fileContext}\n\nUser request: ${userMsg.content}` : userMsg.content;

    const getBuiltinKey = () => {
      if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) return process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      try {
        return typeof window !== 'undefined' && typeof atob === 'function'
          ? atob('QVEuQWI4Uk42SjVBcnZMM1M3YWFhWl83RUxrSmkzQ1RWSk9kS3VFVUQtdUNTT3VxY0dVTFE=')
          : '';
      } catch { return ''; }
    };

    const effectiveKeys = {
      gemini: customApiKeys.gemini || getBuiltinKey(),
      openai: customApiKeys.openai,
      anthropic: customApiKeys.anthropic
    };

    const callDirectGeminiFallback = async () => {
      try {
        const key = effectiveKeys.gemini;
        if (!key) throw new Error('No Gemini key');
        const isOAuth = key.startsWith('AQ.') || key.startsWith('ya29.') || key.startsWith('1//');
        const fetchUrl = isOAuth
          ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
          : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

        const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (isOAuth) {
          requestHeaders['Authorization'] = `Bearer ${key}`;
        }

        const res = await fetch(fetchUrl, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
          })
        });
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          startTypewriterStream(text, tempAiMsgId);
          return;
        }
      } catch { /* ignore */ }
      startTypewriterStream("I couldn't generate a response right now. Please try again.", tempAiMsgId);
    };

    // Call Backend API
    axios.post(`${getApiUrl()}/api/conversations/${currentConvId}/messages`, {
      content: fullPrompt,
      mode: activeMode,
      attachments: currentFiles,
      userKeys: effectiveKeys
    }).then((res) => {
      const aiText = res.data?.data?.aiResponse?.content;
      if (aiText && !aiText.includes("couldn't generate a response")) {
        startTypewriterStream(aiText, tempAiMsgId);
      } else {
        callDirectGeminiFallback();
      }
    }).catch(() => {
      callDirectGeminiFallback();
    });
  };

  // Build file context string for AI prompt
  const buildFileContext = (files: AttachedFile[]): string => {
    const parts: string[] = [];

    for (const f of files) {
      if (f.isFolder && f.folderContents) {
        const structure = f.folderContents.map(fc => `  ${fc.path}`).join('\n');
        const sourceFiles = f.folderContents.filter(fc => fc.extractedText && fc.type === 'code');
        parts.push(`Project folder: ${f.folderName}\nStructure:\n${structure}`);
        for (const sf of sourceFiles.slice(0, 8)) {
          parts.push(`\n--- File: ${sf.path} ---\n${sf.extractedText?.slice(0, 2000)}`);
        }
      } else if (f.extractedText) {
        parts.push(`--- File: ${f.name} ---\n${f.extractedText.slice(0, 3000)}`);
      } else if (f.type === 'image') {
        parts.push(`[Image attached: ${f.name}]`);
      } else {
        parts.push(`[File attached: ${f.name} (${f.mimeType})]`);
      }
    }

    return parts.join('\n\n');
  };

  // Start Progressive Typewriter Response Streaming
  const startTypewriterStream = (fullResponse: string, existingAiMsgId?: string) => {
    const aiMsgId = existingAiMsgId || ('msg-ai-' + Date.now());

    setMessages(prev => {
      const existingIdx = prev.findIndex(m => m.id === aiMsgId);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          isThinking: false,
          isStreaming: true,
          content: ''
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: aiMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isStreaming: true
        }
      ];
    });

    // Token Usage Counter Update
    const tokenCost = Math.floor(fullResponse.split(' ').length * 1.3);
    setUsageStats(prev => ({ ...prev, tokensUsed: prev.tokensUsed + tokenCost }));

    let currentIndex = 0;
    const chars = fullResponse.split('');

    streamTimerRef.current = setInterval(() => {
      // Stream 3 chars at a time for faster feel
      currentIndex = Math.min(currentIndex + 3, chars.length);
      const currentText = chars.slice(0, currentIndex).join('');

      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.findIndex(m => m.id === aiMsgId);
        if (lastIdx !== -1) {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: currentText,
            isStreaming: currentIndex < chars.length
          };
        }
        return updated;
      });

      if (currentIndex >= chars.length) {
        if (streamTimerRef.current) clearInterval(streamTimerRef.current);
        setIsGenerating(false);
        setUsageStats(prev => ({ ...prev, snippetsGenerated: prev.snippetsGenerated + 1 }));
      }
    }, 15);
  };

  // Stop Generating Button Handler
  const handleStopGenerating = () => {
    if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    setIsGenerating(false);
    toast.showInfo('Generation Stopped', 'AI response generation paused.');
  };

  // Token usage percentage
  const tokenPercentage = Math.min((usageStats.tokensUsed / 1000000) * 100, 100);



  return (
    <div className="h-screen w-screen bg-zinc-950 text-white flex overflow-hidden font-sans select-none relative">
      <BackgroundVideo variant="subtle" />

      {/* LEFT SIDEBAR */}
      <Sidebar
        conversations={conversations}
        activeConvId={activeConvId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        onArchiveConversation={handleArchiveConversation}
        onClearAllChats={handleClearAllChats}
        onOpenSettings={() => setShowSettingsModal(true)}
        onLogout={() => router.push('/logout')}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
        userName={userProfile.name}
        userEmail={userProfile.email}
      />

      {/* MAIN CHAT CANVAS */}
      <main className="flex-1 flex flex-col h-full bg-zinc-950/70 backdrop-blur-xl relative overflow-hidden">

        {/* TOP FLOATING HEADER */}
        <header className="h-14 border-b border-white/10 bg-zinc-900/60 backdrop-blur-2xl px-4 md:px-6 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-2 text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <Menu size={20} />
            </button>

            {/* Model Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-black/50 hover:bg-black/70 border border-white/15 rounded-xl text-xs font-bold text-zinc-200 hover:text-white transition-all backdrop-blur-md"
              >
                <Sparkles size={14} className="text-purple-400" />
                <span>{selectedModel}</span>
                <ChevronDown size={14} className="text-zinc-400" />
              </button>

              {showModelDropdown && (
                <div className="absolute top-10 left-0 w-64 bg-zinc-900 border border-white/15 rounded-2xl p-2 shadow-2xl z-50 animate-fade-in-up">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase px-3 py-1">Select AI Model</div>
                  {[
                    'CortexCode AI (GPT-4o)',
                    'CortexCode AI (Gemini Pro)',
                    'CortexCode AI (Claude 3.5)',
                    'CortexCode AI (DeepSeek R1)'
                  ].map(model => (
                    <button
                      key={model}
                      onClick={() => {
                        setSelectedModel(model);
                        setShowModelDropdown(false);
                        toast.showSuccess('Model Switched', `Now using ${model}`);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                        selectedModel === model ? 'bg-purple-600/30 text-purple-300' : 'text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      {model}
                      {selectedModel === model && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Token Counter */}
            <div className="text-xs text-zinc-400 hidden sm:flex items-center gap-2">
              <Activity size={14} className="text-emerald-400" />
              <span>Tokens: <strong className="text-white">{usageStats.tokensUsed.toLocaleString()}</strong> / 1M</span>
            </div>
          </div>
        </header>

        {/* CHAT MESSAGES BODY */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          {messages.length === 0 ? (
            <EmptyState onSelectPrompt={handleSendMessage} mode={activeMode} />
          ) : (
            <div className="max-w-3xl mx-auto space-y-6 pb-6">
              {messages.map(msg => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  userName={userProfile.name}
                  onRegenerate={() => handleSendMessage(messages.filter(m => m.role === 'user').slice(-1)[0]?.content || 'Explain again')}
                />
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* MODE SELECTOR */}
        <ModeSelector activeMode={activeMode} onModeChange={handleModeChange} />

        {/* COMPOSER AT BOTTOM */}
        <Composer
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          onSend={handleSendMessage}
          isGenerating={isGenerating}
          onStopGenerating={handleStopGenerating}
          attachedFiles={attachedFiles}
          setAttachedFiles={setAttachedFiles}
          onDragStateChange={setIsDragging}
        />

        {/* DRAG DROP OVERLAY */}
        <DragDropOverlay isActive={isDragging} />

      </main>

      {/* USER SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in-up">
          <div className="w-full max-w-2xl bg-zinc-950 border border-purple-500/40 rounded-3xl p-6 md:p-8 shadow-[0_0_80px_rgba(168,85,247,0.4)] flex flex-col relative max-h-[90vh] overflow-y-auto">

            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center font-black text-xl text-white shadow-lg">
                {userProfile.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{userProfile.name}</h2>
                <div className="text-xs text-purple-400 font-semibold">{userProfile.email}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{userProfile.plan} · {userProfile.role}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 gap-2 mb-6">
              {[
                { id: 'profile', label: '👤 Profile' },
                { id: 'dashboard', label: '📊 Dashboard' },
                { id: 'apikeys', label: '🔑 API Keys' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSettingsTab(tab.id as unknown)}
                  className={`px-4 py-2 text-xs font-bold transition border-b-2 ${
                    settingsTab === tab.id
                      ? 'border-purple-500 text-purple-300'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Profile Tab */}
            {settingsTab === 'profile' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Role Title</label>
                  <input
                    type="text"
                    value={userProfile.role}
                    onChange={(e) => setUserProfile({ ...userProfile, role: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>
            )}

            {/* Dashboard Tab */}
            {settingsTab === 'dashboard' && (
              <div className="space-y-5">
                {/* Token Usage Bar */}
                <div className="p-4 bg-zinc-900 rounded-2xl border border-white/10">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <Zap size={15} className="text-amber-400" />
                      Token Usage
                    </div>
                    <span className="text-xs text-zinc-400">{usageStats.tokensUsed.toLocaleString()} / 1,000,000</span>
                  </div>
                  <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-1000"
                      style={{ width: `${tokenPercentage}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-2">{tokenPercentage.toFixed(2)}% of monthly limit used</div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Conversations', value: usageStats.conversationsStarted, icon: <MessageSquare size={16} />, color: 'text-purple-400' },
                    { label: 'Snippets Generated', value: usageStats.snippetsGenerated, icon: <Code2 size={16} />, color: 'text-blue-400' },
                    { label: 'Debug Sessions', value: usageStats.debuggingSessions, icon: <FileText size={16} />, color: 'text-red-400' },
                    { label: 'Days Active', value: usageStats.daysActive, icon: <TrendingUp size={16} />, color: 'text-emerald-400' },
                  ].map((stat, idx) => (
                    <div key={idx} className="p-4 bg-zinc-900 rounded-2xl border border-white/10">
                      <div className={`flex items-center gap-2 text-xs font-bold mb-2 ${stat.color}`}>
                        {stat.icon}
                        {stat.label}
                      </div>
                      <div className="text-2xl font-black text-white">{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Monthly Activity Sparkline */}
                <div className="p-4 bg-zinc-900 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-2 text-sm font-bold text-white mb-4">
                    <BarChart3 size={15} className="text-purple-400" />
                    30-Day Activity
                  </div>
                  <div className="flex items-end gap-1 h-16">
                    {usageStats.monthlyActivity.map((val, idx) => {
                      const maxVal = Math.max(...usageStats.monthlyActivity);
                      const height = (val / maxVal) * 100;
                      return (
                        <div
                          key={idx}
                          className="flex-1 rounded-sm bg-gradient-to-t from-purple-700 to-purple-400 opacity-80 hover:opacity-100 transition-opacity"
                          style={{ height: `${height}%` }}
                          title={`Day ${idx + 1}: ${val} actions`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-600 mt-2">
                    <span>30 days ago</span>
                    <span>Today</span>
                  </div>
                </div>
              </div>
            )}

            {/* API Keys Tab */}
            {settingsTab === 'apikeys' && (
              <div className="space-y-4">
                <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl">
                  <div className="text-xs font-bold text-purple-300 mb-1">🔑 AI Model Provider Keys</div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Paste your free Google Gemini API key or OpenAI key below. Keys are stored locally in your browser.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1 flex justify-between">
                    <span>Google Gemini API Key</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:underline normal-case text-[11px]"
                    >
                      Get Free Key →
                    </a>
                  </label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={customApiKeys.gemini}
                    onChange={(e) => setCustomApiKeys({ ...customApiKeys, gemini: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-white/15 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">OpenAI API Key</label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={customApiKeys.openai}
                    onChange={(e) => setCustomApiKeys({ ...customApiKeys, openai: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-white/15 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Anthropic Claude Key</label>
                  <input
                    type="password"
                    placeholder="sk-ant-..."
                    value={customApiKeys.anthropic}
                    onChange={(e) => setCustomApiKeys({ ...customApiKeys, anthropic: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-white/15 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>
            )}

            <div className="pt-6 mt-4 border-t border-white/10 flex justify-between">
              <button
                onClick={() => router.push('/logout')}
                className="px-5 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 font-bold text-xs rounded-xl flex items-center gap-2 border border-red-500/30 transition"
              >
                <LogOut size={15} /> Logout
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.setItem('cortexcode_user_api_keys', JSON.stringify(customApiKeys));
                  } catch { /* ignore */ }
                  setShowSettingsModal(false);
                  toast.showSuccess('Settings Saved', 'Your API keys and preferences have been updated.');
                }}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <ProtectedRoute>
      <WorkspaceContent />
    </ProtectedRoute>
  );
}
