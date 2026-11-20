'use client';

import React from 'react';
import { MessageSquare, Bug, BookOpen, FileText, Search } from 'lucide-react';

export type ChatMode = 'chat' | 'debug' | 'explain' | 'notes' | 'review';

interface ModeSelectorProps {
  activeMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

const MODES: { id: ChatMode; label: string; icon: React.ReactNode; color: string; description: string }[] = [
  {
    id: 'chat',
    label: 'Chat',
    icon: <MessageSquare size={14} />,
    color: 'from-purple-500 to-violet-500',
    description: 'General AI conversation'
  },
  {
    id: 'debug',
    label: 'Debug',
    icon: <Bug size={14} />,
    color: 'from-red-500 to-orange-500',
    description: 'Fix & explain errors'
  },
  {
    id: 'explain',
    label: 'Explain',
    icon: <BookOpen size={14} />,
    color: 'from-blue-500 to-cyan-500',
    description: 'Break down concepts'
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: <FileText size={14} />,
    color: 'from-emerald-500 to-teal-500',
    description: 'Generate study notes'
  },
  {
    id: 'review',
    label: 'Review',
    icon: <Search size={14} />,
    color: 'from-amber-500 to-yellow-500',
    description: 'Code review & suggestions'
  }
];

export default function ModeSelector({ activeMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2 border-t border-[var(--border-default)] bg-[var(--bg-secondary)] overflow-x-auto scrollbar-none">
      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider shrink-0 mr-1">Mode</span>
      {MODES.map((mode) => {
        const isActive = activeMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            title={mode.description}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-transform duration-150 shrink-0 ${
              isActive
                ? `bg-gradient-to-r ${mode.color} text-white shadow-md scale-105`
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
            }`}
          >
            {mode.icon}
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
