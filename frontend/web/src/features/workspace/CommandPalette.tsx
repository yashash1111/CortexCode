'use client';

import { useState, useEffect } from 'react';
import {
  Search, MessageSquare, Cpu, FileText, BookOpen,
  Target, Bot, X, ArrowRight, Layers, LayoutDashboard
} from 'lucide-react';

export type WorkspaceTab =
  | 'chat'
  | 'study'
  | 'goals'
  | 'agents'
  | 'security'
  | 'assessments';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: WorkspaceTab) => void;
}

export default function CommandPalette({ isOpen, onClose, onSelectTab }: Props) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const COMMANDS: { id: WorkspaceTab; title: string; desc: string; icon: any; category: string }[] = [
    { id: 'chat', title: 'AI Chat Assistant', desc: 'Ask questions, debug & stream answers', icon: MessageSquare, category: 'AI Tools' },
    { id: 'study', title: 'AI Study Mode', desc: 'Upload materials, flashcards & MCQs', icon: BookOpen, category: 'Learning' },
    { id: 'goals', title: 'Goal Roadmap Tracker', desc: 'Track multi-day roadmaps & daily tasks', icon: Target, category: 'Planning' },
    { id: 'agents', title: 'Multi-Agent Builder', desc: 'Specialized agents & custom agent builder', icon: Bot, category: 'AI Agents' },
    { id: 'security', title: 'Security & Active Sessions', desc: 'Change password & review security activity', icon: Cpu, category: 'Settings' },
    { id: 'assessments', title: 'AI Proctored Assessments', desc: 'Technical exams, coding workbenches & real-time proctoring', icon: Target, category: 'Assessments' }
  ];

  const filtered = COMMANDS.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.desc.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 p-4 animate-fade-in-up">
      <div className="w-full max-w-lg bg-[#121212] border border-[#262626] rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans">

        {/* Search Bar Header */}
        <div className="flex items-center px-3.5 py-3 border-b border-[#262626] bg-[#171717]">
          <Search size={16} className="text-neutral-400 shrink-0 mr-3" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search commands or jump to..."
            className="w-full bg-transparent text-xs text-white placeholder-neutral-500 outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition ml-2"
          >
            <X size={14} />
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">No commands found matching "{query}".</div>
          ) : (
            filtered.map(cmd => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    onSelectTab(cmd.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg bg-transparent hover:bg-[#1c1c1c] transition group text-left border border-transparent hover:border-[#262626]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-[#1c1c1c] border border-[#262626] flex items-center justify-center text-neutral-400 group-hover:text-blue-400 transition">
                      <Icon size={14} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-200 group-hover:text-white transition">
                        {cmd.title}
                      </div>
                      <div className="text-[11px] text-neutral-400">{cmd.desc}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1c1c1c] text-neutral-400 border border-[#262626]">
                      {cmd.category}
                    </span>
                    <ArrowRight size={12} className="text-neutral-600 group-hover:text-neutral-300 transition" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-3.5 py-2 bg-[#171717] border-t border-[#262626] flex items-center justify-between text-[11px] text-neutral-400 font-mono">
          <span>Shortcuts</span>
          <span>Press <kbd className="px-1.5 py-0.5 bg-[#0a0a0a] rounded border border-[#262626] text-neutral-300">Esc</kbd> to close</span>
        </div>

      </div>
    </div>
  );
}
