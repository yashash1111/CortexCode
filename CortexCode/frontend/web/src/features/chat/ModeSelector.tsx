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
    <div className="flex items-center gap-1.5 px-4 py-2 border-t border-white/5 bg-zinc-950/50 overflow-x-auto scrollbar-none">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 mr-1">Mode</span>
      {MODES.map((mode) => {
        const isActive = activeMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            title={mode.description}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 shrink-0 ${
              isActive
                ? `bg-gradient-to-r ${mode.color} text-white shadow-lg scale-105`
                : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
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
