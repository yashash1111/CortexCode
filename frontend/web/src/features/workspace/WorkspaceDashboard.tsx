'use client';

import {
  MessageSquare, Layers, Target, BookOpen,
  Cpu, ArrowRight, Code2, Bot
} from 'lucide-react';
import { WorkspaceTab } from './CommandPalette';

interface Props {
  onNavigateTab: (tab: WorkspaceTab) => void;
  userName?: string;
}

export default function WorkspaceDashboard({ onNavigateTab, userName = 'Developer' }: Props) {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] text-white font-sans overflow-y-auto custom-scrollbar p-6 space-y-6">
      <div className="max-w-5xl mx-auto w-full space-y-6">

        {/* Professional Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#262626] pb-5">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Welcome back, {userName}
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Continue where you left off. Grounded in 3 active projects, 9 memories, and your DSA roadmap.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('chat')}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded transition flex items-center gap-1.5"
            >
              <MessageSquare size={14} />
              <span>New Chat</span>
            </button>
            <button
              onClick={() => onNavigateTab('codelab')}
              className="px-3.5 py-1.5 bg-[#171717] hover:bg-[#202020] border border-[#262626] text-neutral-200 font-semibold text-xs rounded transition flex items-center gap-1.5"
            >
              <Code2 size={14} className="text-blue-400" />
              <span>Code Lab</span>
            </button>
          </div>
        </div>

        {/* 4 Minimalist Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { title: 'Conversations', count: '128', sub: '12 active this week', icon: MessageSquare, tab: 'chat' as WorkspaceTab },
            { title: 'Active Projects', count: '3', sub: 'TrainTrack, FloodAlert, CortexCode', icon: Layers, tab: 'projects' as WorkspaceTab },
            { title: 'Goal Roadmaps', count: '2', sub: 'Master DSA in 60 Days', icon: Target, tab: 'goals' as WorkspaceTab },
            { title: 'Learning Progress', count: '78%', sub: '3 concepts mastered', icon: BookOpen, tab: 'study' as WorkspaceTab },
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                onClick={() => onNavigateTab(card.tab)}
                className="bg-[#121212] border border-[#262626] hover:border-neutral-700 rounded-lg p-4 cursor-pointer transition flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">{card.title}</span>
                  <Icon size={15} className="text-neutral-500 group-hover:text-blue-400 transition" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white tracking-tight">{card.count}</div>
                  <div className="text-[11px] text-neutral-500 truncate mt-0.5">{card.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3 Core System Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Card 1: Memory */}
          <div
            onClick={() => onNavigateTab('memory')}
            className="p-4 bg-[#121212] border border-[#262626] hover:border-neutral-700 rounded-lg cursor-pointer transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-2 text-white">
                <Cpu size={16} className="text-blue-400" />
                <h3 className="text-sm font-bold">Long-Term Memory</h3>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans mb-4">
                View & edit stored coding preferences, tech stacks, and project facts.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-blue-400">
              <span>Open Memory</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          {/* Card 2: Study Mode */}
          <div
            onClick={() => onNavigateTab('study')}
            className="p-4 bg-[#121212] border border-[#262626] hover:border-neutral-700 rounded-lg cursor-pointer transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-2 text-white">
                <BookOpen size={16} className="text-blue-400" />
                <h3 className="text-sm font-bold">AI Study & Tutor</h3>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans mb-4">
                Upload notes or PDFs, review auto-generated flashcards, and test concepts.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-blue-400">
              <span>Open Study Mode</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          {/* Card 3: Multi-Agent Builder */}
          <div
            onClick={() => onNavigateTab('agents')}
            className="p-4 bg-[#121212] border border-[#262626] hover:border-neutral-700 rounded-lg cursor-pointer transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-2 text-white">
                <Bot size={16} className="text-blue-400" />
                <h3 className="text-sm font-bold">Multi-Agent Builder</h3>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans mb-4">
                Deploy specialized execution agents for coding, research, planning & security audit.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-blue-400">
              <span>Manage Agents</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition" />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
