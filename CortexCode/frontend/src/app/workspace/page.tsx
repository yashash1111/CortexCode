'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  Menu, Sparkles, ChevronDown, Activity, LogOut, X,
  BarChart3, TrendingUp, Zap, MessageSquare, Code2, FileText,
  Search, BookOpen, Target, Bot, ShieldCheck, Award, Bell,
  FolderKanban, Lightbulb, GraduationCap
} from 'lucide-react';
import Sidebar from '@/features/chat/Sidebar';
import EmptyState from '@/features/chat/EmptyState';
import MessageItem from '@/features/chat/MessageItem';
import Composer from '@/features/chat/Composer';
import ModeSelector, { ChatMode } from '@/features/chat/ModeSelector';
import DragDropOverlay from '@/features/chat/DragDropOverlay';
import BackgroundVideo from '@/components/BackgroundVideo';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useToast } from '@/providers/ToastProvider';
import { useAuth } from '@/providers/AuthProvider';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { getApiUrl } from '@/lib/apiConfig';
import { getAPIErrorMessage } from '@/lib/aiResponseEngine';
import type { AttachedFile } from '@/features/chat/types';

import CommandPalette, { WorkspaceTab } from '@/features/workspace/CommandPalette';
import StudyMode from '@/features/workspace/StudyMode';
import GoalTracker from '@/features/workspace/GoalTracker';
import MultiAgentView from '@/features/workspace/MultiAgentView';
import SecuritySettingsView from '@/features/workspace/SecuritySettingsView';
import AssessmentHub from '@/features/assessments/AssessmentHub';

const createId = (prefix: string) => `${prefix}-${Date.now()}`;

function WorkspaceContent() {
  const router = useRouter();
  const toast = useToast();
  const { user, logout } = useAuth();

  // Sidebar & Responsive State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Workspace Tab & Command Palette State
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>('chat');
  const [showCmdPalette, setShowCmdPalette] = useState(false);

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
  type WorkspaceConversation = {
    id: string;
    title: string;
    group: string;
    model?: string;
    updatedAt: string;
  };
  type WorkspaceMessage = {
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
  const DEFAULT_CONV_ID = 'conv-1';
  const DEFAULT_WELCOME_MSG: WorkspaceMessage[] = [{
    id: 'msg-init-1', role: 'assistant',
    content: `Welcome to CortexCode! 👋 I'm your AI Coding & Learning Assistant.\n\nI can help you with:\n\n- Writing and reviewing code in any language\n- Debugging errors and fixing broken code\n- Explaining programming concepts clearly\n- Generating structured study notes\n- Preparing for technical interviews\n\nSelect a mode below the chat box to tailor my responses, or just start typing your question. What would you like to work on today?`,
    timestamp: 'Just now'
  }];
  const DEFAULT_CONVERSATIONS: Record<string, WorkspaceConversation[]> = {
    'Today': [{ id: DEFAULT_CONV_ID, title: 'Welcome Chat', group: 'Today', model: 'CortexCode AI (GPT-4o)', updatedAt: '2024-01-01T00:00:00.000Z' }],
    'Yesterday': [], 'Previous 7 Days': [], 'Previous 30 Days': [], 'Older': []
  };

  const [conversations, setConversations] = useState<Record<string, WorkspaceConversation[]>>(DEFAULT_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string | null>(DEFAULT_CONV_ID);
  const [messages, setMessages] = useState<WorkspaceMessage[]>(DEFAULT_WELCOME_MSG);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage AFTER mount (client-only, avoids SSR mismatch)
  useEffect(() => {
    queueMicrotask(() => {
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
    });
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
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const streamTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'dashboard'>('profile');

  // Usage Stats
  const [usageStats, setUsageStats] = useState({
    tokensUsed: 142850,
    conversationsStarted: 23,
    snippetsGenerated: 48,
    debuggingSessions: 12,
    daysActive: 7,
    monthlyActivity: [12, 8, 15, 22, 9, 18, 30, 24, 16, 28, 35, 20, 14, 40, 32, 26, 18, 22, 38, 45, 20, 17, 29, 34, 28, 42, 19, 33, 27, 48]
  });

  // User Profile
  const [userProfile, setUserProfile] = useState({
    name: 'Developer',
    email: 'developer@cortex.ai',
    role: 'Software Engineer',
    plan: 'Pro Developer',
  });

  useEffect(() => {
    queueMicrotask(() => {
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
    });
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

    let found: WorkspaceConversation | null = null;
    Object.values(conversations).forEach(list => {
      const match = list.find(c => c.id === id);
      if (match) found = match;
    });
    if (found) {
      toast.showInfo('Conversation Loaded', `Opened "${(found as WorkspaceConversation).title}"`);
    }
  };

  // Handle Rename Conversation
  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations(prev => {
      const updated: Record<string, WorkspaceConversation[]> = {};
      Object.keys(prev).forEach(group => {
        updated[group] = prev[group].map(c => c.id === id ? { ...c, title: newTitle } : c);
      });
      return updated;
    });
  };

  // Handle Delete Conversation
  const handleDeleteConversation = (id: string) => {
    setConversations(prev => {
      const updated: Record<string, WorkspaceConversation[]> = {};
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
    const freshConvs: Record<string, WorkspaceConversation[]> = {
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
      const newId = createId('conv');
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
      id: createId('msg'),
      role: 'user' as const,
      content: prompt || `Analyze ${currentFiles.length === 1 ? currentFiles[0].name : `${currentFiles.length} files`}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedFiles: currentFiles.length > 0 ? currentFiles : undefined
    };

    const tempAiMsgId = createId('msg-ai-temp');
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

    // Call Backend API with 60s timeout
    axios.post(
      `${getApiUrl()}/api/conversations/${currentConvId}/messages`,
      {
        content: fullPrompt,
        mode: activeMode,
        attachments: currentFiles
      },
      { timeout: 60000, withCredentials: true }
    ).then((res) => {
      const aiText = res.data?.data?.aiResponse?.content;
      if (aiText) {
        startTypewriterStream(aiText, tempAiMsgId);
      } else {
        const errorMsg = res.data?.error?.message || getAPIErrorMessage();
        startTypewriterStream(errorMsg, tempAiMsgId);
      }
    }).catch(() => {
      // Check for unified /api/chat fallback
      axios.post(
        `${getApiUrl()}/api/chat`,
        {
          message: fullPrompt,
          conversationId: currentConvId,
          mode: activeMode
        },
        { timeout: 60000, withCredentials: true }
      ).then((chatRes) => {
        const text = chatRes.data?.data?.content;
        if (text) {
          startTypewriterStream(text, tempAiMsgId);
        } else {
          const errorMsg = chatRes.data?.error?.message || getAPIErrorMessage();
          startTypewriterStream(errorMsg, tempAiMsgId);
        }
      }).catch((chatErr) => {
        const errorMsg = chatErr?.response?.data?.error?.message ||
          (chatErr?.code === 'ECONNABORTED'
            ? 'Request timed out. Please try again.'
            : getAPIErrorMessage());
        startTypewriterStream(errorMsg, tempAiMsgId);
      });
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
      } else if (f.type === 'audio') {
        parts.push(`[Audio attached: ${f.name} (${f.mimeType})]`);
      } else {
        parts.push(`[File attached: ${f.name} (${f.mimeType})]`);
      }
    }

    return parts.join('\n\n');
  };

  // Start Progressive Typewriter Response Streaming
  const startTypewriterStream = (fullResponse: string, existingAiMsgId?: string) => {
    const aiMsgId = existingAiMsgId || createId('msg-ai');

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



  const firstName = (userProfile.name || 'Developer').split(' ')[0];

  return (
    <div className="h-screen w-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex overflow-hidden font-sans relative">
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
        userRole={user?.role}
        activeWorkspaceTab={activeWorkspaceTab}
        onSelectWorkspaceTab={setActiveWorkspaceTab}
      />

      {/* GLOBAL COMMAND PALETTE (Cmd+K) */}
      <CommandPalette
        isOpen={showCmdPalette}
        onClose={() => setShowCmdPalette(false)}
        onSelectTab={setActiveWorkspaceTab}
      />

      {/* MAIN WORKSPACE CANVAS */}
      <main className="flex-1 flex flex-col h-full cortex-ambient-bg relative overflow-hidden">

        {/* TOP NAVIGATION BAR */}
        <header className="h-14 border-b border-[var(--border-default)] bg-[var(--header-bg)] backdrop-blur-xl px-3 sm:px-6 flex items-center justify-between gap-3 z-20 shrink-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-xl transition-colors shrink-0"
              aria-label="Open sidebar"
            >
              <Menu size={18} />
            </button>

            {/* Centered Global Search Pill (matches reference) */}
            <button
              onClick={() => setShowCmdPalette(true)}
              className="flex items-center justify-between gap-3 w-full max-w-md px-3.5 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] hover:border-[var(--accent-border)] rounded-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all shadow-sm cursor-pointer"
              title="Global Command Palette (Cmd+K)"
            >
              <span className="flex items-center gap-2 truncate">
                <Search size={14} className="text-[var(--accent-primary)] shrink-0" />
                <span className="truncate">Search anything in CortexCode...</span>
              </span>
              <kbd className="hidden sm:inline-block px-2 py-0.5 bg-[var(--bg-secondary)] rounded-md text-[10px] text-[var(--text-muted)] font-mono border border-[var(--border-default)] shrink-0">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <ThemeSwitcher />

            <button
              type="button"
              onClick={() =>
                toast.showInfo(
                  'System Status',
                  `All systems operational · ${usageStats.tokensUsed.toLocaleString()} tokens used`
                )
              }
              className="relative p-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="hidden sm:flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] transition-colors cursor-pointer"
              title="Profile & Settings"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
              <ChevronDown size={13} className="text-[var(--text-muted)]" />
            </button>
          </div>
        </header>

        {/* COMPACT MODULE STRIP FOR TABLET/MOBILE */}
        <div className="flex md:hidden overflow-x-auto px-3 py-2 bg-[var(--bg-secondary)]/70 border-b border-[var(--border-default)] gap-1.5 shrink-0 scrollbar-none">
          {[
            { id: 'chat' as WorkspaceTab, label: 'AI Chat', icon: MessageSquare },
            { id: 'study' as WorkspaceTab, label: 'Study Mode', icon: BookOpen },
            { id: 'goals' as WorkspaceTab, label: 'Goal Roadmap', icon: Target },
            { id: 'agents' as WorkspaceTab, label: 'Multi-Agent', icon: Bot },
            { id: 'security' as WorkspaceTab, label: 'Security', icon: ShieldCheck },
            { id: 'assessments' as WorkspaceTab, label: 'Assessments', icon: Award },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeWorkspaceTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveWorkspaceTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] border border-[var(--accent-border)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-transparent'
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* DYNAMIC TAB CANVAS */}
        {activeWorkspaceTab === 'study' && <StudyMode />}

        {activeWorkspaceTab === 'goals' && <GoalTracker />}

        {activeWorkspaceTab === 'agents' && <MultiAgentView />}

        {activeWorkspaceTab === 'security' && <SecuritySettingsView />}

        {activeWorkspaceTab === 'assessments' && <AssessmentHub />}

        {activeWorkspaceTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
            {/* SCROLLABLE CHAT MESSAGES BODY */}
            <div className="flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-5 custom-scrollbar">
              {/* HERO WELCOME HEADER + FEATURE PILL BAR (matches reference) */}
              <div className="max-w-3xl mx-auto mb-6 text-center">
                <div className="inline-flex items-center justify-center gap-3.5 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-[1.5px] shadow-lg shadow-violet-600/30">
                    <img
                      src="/logo.jpg"
                      alt="CortexCode"
                      className="w-full h-full rounded-[14px] object-cover"
                    />
                  </div>
                  <div className="text-left">
                    <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">
                      Welcome back, {firstName}!
                    </h1>
                    <p className="text-xs text-[var(--text-muted)]">
                      Your AI Developer Intelligence Workspace
                    </p>
                  </div>
                </div>

                {/* 5-Pill Feature Quick Bar */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {[
                    {
                      label: 'Ask Anything',
                      icon: MessageSquare,
                      active: activeMode === 'chat',
                      onClick: () => handleModeChange('chat'),
                    },
                    {
                      label: 'Analyze Code',
                      icon: Code2,
                      active: activeMode === 'review' || activeMode === 'debug',
                      onClick: () => handleModeChange('review'),
                    },
                    {
                      label: 'Build Projects',
                      icon: FolderKanban,
                      active: false,
                      onClick: () => setActiveWorkspaceTab('agents'),
                    },
                    {
                      label: 'Get Insights',
                      icon: Lightbulb,
                      active: activeMode === 'explain',
                      onClick: () => handleModeChange('explain'),
                    },
                    {
                      label: 'Learn & Grow',
                      icon: GraduationCap,
                      active: activeMode === 'notes',
                      onClick: () => setActiveWorkspaceTab('study'),
                    },
                  ].map((pill) => {
                    const Icon = pill.icon;
                    return (
                      <button
                        key={pill.label}
                        type="button"
                        onClick={pill.onClick}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                          pill.active
                            ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent-primary)] shadow-sm'
                            : 'bg-[var(--bg-card)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-border)]'
                        }`}
                      >
                        <Icon size={13} className={pill.active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'} />
                        <span>{pill.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {messages.length === 0 ? (
                <EmptyState onSelectPrompt={handleSendMessage} mode={activeMode} />
              ) : (
                <div className="max-w-3xl mx-auto space-y-5 pb-6">
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
              activeMode={activeMode}
              onModeChange={handleModeChange}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              tokensUsed={usageStats.tokensUsed}
            />

            {/* DRAG DROP OVERLAY */}
            <DragDropOverlay isActive={isDragging} />
          </div>
        )}

      </main>

      {/* USER SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)] backdrop-blur-xl animate-fade-in-up">
          <div className="w-full max-w-2xl bg-[var(--modal-bg)] border border-[var(--modal-border)] rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col relative max-h-[90vh] overflow-y-auto">

            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-5 right-5 p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-full transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[var(--border-default)]">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-lg">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{userProfile.name}</h2>
                <div className="text-xs text-[var(--accent-primary)] font-semibold">{userProfile.email}</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{userProfile.plan} · {userProfile.role}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--border-default)] gap-2 mb-6">
              {[
                { id: 'profile', label: '👤 Profile' },
                { id: 'dashboard', label: '📊 Dashboard' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSettingsTab(tab.id as 'profile' | 'dashboard')}
                  className={`px-4 py-2 text-xs font-bold transition border-b-2 ${
                    settingsTab === tab.id
                      ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
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
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Role Title</label>
                  <input
                    type="text"
                    value={userProfile.role}
                    onChange={(e) => setUserProfile({ ...userProfile, role: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition"
                  />
                </div>
              </div>
            )}

            {/* Dashboard Tab */}
            {settingsTab === 'dashboard' && (
              <div className="space-y-5">
                {/* Token Usage Bar */}
                <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)]">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                      <Zap size={15} className="text-[var(--status-warning)]" />
                      Token Usage
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">{usageStats.tokensUsed.toLocaleString()} / 1,000,000</span>
                  </div>
                  <div className="w-full h-3 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-1000"
                      style={{ width: `${tokenPercentage}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-2">{tokenPercentage.toFixed(2)}% of monthly limit used</div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Conversations', value: usageStats.conversationsStarted, icon: <MessageSquare size={16} />, color: 'text-[var(--accent-primary)]' },
                    { label: 'Snippets Generated', value: usageStats.snippetsGenerated, icon: <Code2 size={16} />, color: 'text-[var(--status-info)]' },
                    { label: 'Debug Sessions', value: usageStats.debuggingSessions, icon: <FileText size={16} />, color: 'text-[var(--status-error)]' },
                    { label: 'Days Active', value: usageStats.daysActive, icon: <TrendingUp size={16} />, color: 'text-[var(--status-success)]' },
                  ].map((stat, idx) => (
                    <div key={idx} className="p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)]">
                      <div className={`flex items-center gap-2 text-xs font-bold mb-2 ${stat.color}`}>
                        {stat.icon}
                        {stat.label}
                      </div>
                      <div className="text-2xl font-black text-[var(--text-primary)]">{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Monthly Activity Sparkline */}
                <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)]">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] mb-4">
                    <BarChart3 size={15} className="text-[var(--accent-primary)]" />
                    30-Day Activity
                  </div>
                  <div className="flex items-end gap-1 h-16">
                    {usageStats.monthlyActivity.map((val, idx) => {
                      const maxVal = Math.max(...usageStats.monthlyActivity);
                      const height = (val / maxVal) * 100;
                      return (
                        <div
                          key={idx}
                          className="flex-1 rounded-sm bg-gradient-to-t from-violet-700 to-indigo-400 opacity-80 hover:opacity-100 transition-opacity"
                          style={{ height: `${height}%` }}
                          title={`Day ${idx + 1}: ${val} actions`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-2">
                    <span>30 days ago</span>
                    <span>Today</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-6 mt-4 border-t border-[var(--border-default)] flex justify-between">
              <button
                onClick={() => router.push('/logout')}
                className="px-5 py-2.5 bg-[var(--status-error-bg)] hover:opacity-90 text-[var(--status-error)] font-bold text-xs rounded-xl flex items-center gap-2 border border-[var(--status-error-border)] transition"
              >
                <LogOut size={15} /> Logout
              </button>
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  toast.showSuccess('Settings Saved', 'Your workspace preferences have been updated.');
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-md"
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
