'use client';

import React from 'react';
import { Sparkles, Code2, Terminal, Shield, Cpu, HelpCircle, ArrowRight, Bug, BookOpen, FileText, Search, MessageSquare } from 'lucide-react';
import type { ChatMode } from './ModeSelector';

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
  mode: ChatMode;
}

const MODE_CONFIG: Record<ChatMode, {
  badge: string;
  badgeColor: string;
  headline: string;
  subtext: string;
  suggestions: { icon: React.ReactNode; title: string; category: string }[];
}> = {
  chat: {
    badge: '💬 General & Developer Assistant',
    badgeColor: 'bg-purple-950/40 border-purple-500/30 text-purple-300',
    headline: 'What can I help you with today?',
    subtext: 'Chat about anything, learn new concepts, write creatively, plan your goals, or build and debug your projects.',
    suggestions: [
      { icon: <MessageSquare size={18} className="text-purple-400" />, title: 'Chat with me about anything on your mind', category: 'General Chat' },
      { icon: <BookOpen size={18} className="text-blue-400" />, title: 'Explain photosynthesis in simple terms', category: 'General Learning' },
      { icon: <FileText size={18} className="text-emerald-400" />, title: 'Write a birthday message for my best friend', category: 'Writing' },
      { icon: <Sparkles size={18} className="text-amber-400" />, title: 'Help me plan my week and study schedule', category: 'Productivity' },
      { icon: <Code2 size={18} className="text-pink-400" />, title: 'Explain recursion in Java with an example', category: 'Technical' },
      { icon: <HelpCircle size={18} className="text-cyan-400" />, title: 'Help me prepare for an upcoming interview', category: 'Career' },
    ]
  },
  debug: {
    badge: '🐛 Debug Mode',
    badgeColor: 'bg-red-950/40 border-red-500/30 text-red-300',
    headline: 'Paste your buggy code and I\'ll fix it',
    subtext: 'Share your error message, stack trace, or broken code — I\'ll diagnose the issue and explain the fix clearly.',
    suggestions: [
      { icon: <Bug size={18} className="text-red-400" />, title: 'My React component is causing infinite re-renders', category: 'React Bug' },
      { icon: <Terminal size={18} className="text-amber-400" />, title: 'Fix: Cannot read properties of undefined', category: 'JavaScript Error' },
      { icon: <Code2 size={18} className="text-orange-400" />, title: 'Why is my async function returning a Promise instead of data?', category: 'Async Issue' },
      { icon: <Shield size={18} className="text-purple-400" />, title: 'My API returns 401 Unauthorized — how do I fix JWT auth?', category: 'Auth Error' },
      { icon: <Cpu size={18} className="text-pink-400" />, title: 'SQL query is running slow — help me optimize it', category: 'Performance' },
      { icon: <HelpCircle size={18} className="text-cyan-400" />, title: 'CORS error on my Next.js API route', category: 'Network Error' },
    ]
  },
  explain: {
    badge: '📚 Explain Mode',
    badgeColor: 'bg-blue-950/40 border-blue-500/30 text-blue-300',
    headline: 'What would you like me to explain?',
    subtext: 'I\'ll break down any concept, algorithm, or code snippet into simple, clear language with examples.',
    suggestions: [
      { icon: <BookOpen size={18} className="text-blue-400" />, title: 'Explain how closures work in JavaScript', category: 'JS Concepts' },
      { icon: <Cpu size={18} className="text-pink-400" />, title: 'What is Big O notation and why does it matter?', category: 'Algorithms' },
      { icon: <Code2 size={18} className="text-cyan-400" />, title: 'Explain the difference between == and === in JS', category: 'Basics' },
      { icon: <Shield size={18} className="text-purple-400" />, title: 'How does OAuth 2.0 authentication work?', category: 'Security' },
      { icon: <Terminal size={18} className="text-emerald-400" />, title: 'Explain REST vs GraphQL API design', category: 'API Design' },
      { icon: <Sparkles size={18} className="text-amber-400" />, title: 'What is the React virtual DOM and how does it work?', category: 'React' },
    ]
  },
  notes: {
    badge: '📝 Notes Mode',
    badgeColor: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300',
    headline: 'Generate structured study notes',
    subtext: 'Give me a topic and I\'ll create clear, organized notes with key concepts, examples, and summaries.',
    suggestions: [
      { icon: <FileText size={18} className="text-emerald-400" />, title: 'Create notes on JavaScript ES6+ features', category: 'JavaScript' },
      { icon: <BookOpen size={18} className="text-blue-400" />, title: 'Summarize key React hooks with examples', category: 'React' },
      { icon: <Code2 size={18} className="text-purple-400" />, title: 'Notes on Data Structures: Arrays, Stacks, Queues', category: 'CS Fundamentals' },
      { icon: <Shield size={18} className="text-pink-400" />, title: 'Study notes on web security: XSS, CSRF, SQL Injection', category: 'Security' },
      { icon: <Cpu size={18} className="text-amber-400" />, title: 'TypeScript cheatsheet for beginners', category: 'TypeScript' },
      { icon: <Terminal size={18} className="text-cyan-400" />, title: 'Docker and containerization concepts explained', category: 'DevOps' },
    ]
  },
  review: {
    badge: '🔍 Review Mode',
    badgeColor: 'bg-amber-950/40 border-amber-500/30 text-amber-300',
    headline: 'Paste your code for a professional review',
    subtext: 'I\'ll analyze your code for bugs, performance issues, security vulnerabilities, and best practice violations.',
    suggestions: [
      { icon: <Search size={18} className="text-amber-400" />, title: 'Review my Express.js middleware for security issues', category: 'Security Audit' },
      { icon: <Code2 size={18} className="text-blue-400" />, title: 'Improve performance of my React component', category: 'Performance' },
      { icon: <Shield size={18} className="text-purple-400" />, title: 'Check my SQL query for injection vulnerabilities', category: 'Security' },
      { icon: <Terminal size={18} className="text-emerald-400" />, title: 'Review my API error handling patterns', category: 'Best Practices' },
      { icon: <Cpu size={18} className="text-pink-400" />, title: 'Refactor this function to be more readable', category: 'Code Quality' },
      { icon: <Sparkles size={18} className="text-cyan-400" />, title: 'Check my TypeScript types and interfaces', category: 'TypeScript' },
    ]
  }
};

export default function EmptyState({ onSelectPrompt, mode }: EmptyStateProps) {
  const config = MODE_CONFIG[mode];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 text-center max-w-4xl mx-auto my-auto animate-fade-in-up">
      {/* Mode Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-primary)] text-xs font-semibold mb-3 backdrop-blur-md">
        <Sparkles size={13} className="animate-pulse" />
        <span>{config.badge}</span>
      </div>

      <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
        {config.headline}
      </h2>
      <p className="text-[var(--text-muted)] text-sm max-w-lg mb-8 leading-relaxed">
        {config.subtext}
      </p>

      {/* Grid of Clickable Prompt Suggestions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
        {config.suggestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(item.title)}
            className="group flex flex-col justify-between p-4 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] hover:border-[var(--accent-border)] rounded-2xl text-left transition-all duration-200 backdrop-blur-xl shadow-sm hover:shadow-md cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] group-hover:border-[var(--accent-border)] transition-colors">
                  {item.icon}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors">
                  {item.category}
                </span>
              </div>
              <div className="text-xs font-semibold text-[var(--text-primary)] leading-snug">
                &quot;{item.title}&quot;
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
