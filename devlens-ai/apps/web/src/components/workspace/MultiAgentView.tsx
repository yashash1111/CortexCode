'use client';

import { useState, useEffect } from 'react';
import { Bot, Plus, Trash2, Check, X, Search } from 'lucide-react';

export interface AgentItem {
  id: string;
  name: string;
  role: string;
  personality: string;
  instructions: string;
  tools: string[];
  isBuiltin?: boolean;
}

const BUILTIN_AGENTS: AgentItem[] = [
  {
    id: 'agent-coding',
    name: 'Coding Agent',
    role: 'Software Architect & Debugger',
    personality: 'Precise, technical, production-ready',
    instructions: 'Provide optimal, bug-free, type-safe code examples. Focus on exact root-cause debugging and performance.',
    tools: ['Memory', 'Code Analysis', 'Syntax Refactoring'],
    isBuiltin: true
  },
  {
    id: 'agent-study',
    name: 'Study Agent',
    role: 'AI Tutor & Quiz Master',
    personality: 'Encouraging, structured, interactive',
    instructions: 'Break down complex topics into simple concepts. Ask interactive practice questions and generate flashcards.',
    tools: ['Memory', 'Document Search', 'Quiz Generator'],
    isBuiltin: true
  },
  {
    id: 'agent-research',
    name: 'Research Agent',
    role: 'Technical Fact Verifier & Researcher',
    personality: 'Objective, analytical, thorough',
    instructions: 'Collect authoritative sources, verify claims, and present clear factual summaries with citations.',
    tools: ['Document Search', 'Fact Verification', 'Web Search'],
    isBuiltin: true
  },
  {
    id: 'agent-planning',
    name: 'Planning Agent',
    role: 'Project Manager & Goal Strategist',
    personality: 'Structured, methodical, goal-oriented',
    instructions: 'Break ambitious engineering goals into actionable daily milestones and monitor execution progress.',
    tools: ['Memory', 'Goal Roadmap Engine'],
    isBuiltin: true
  },
  {
    id: 'agent-review',
    name: 'Review Agent',
    role: 'Code Quality & Security Auditor',
    personality: 'Strict, security-focused, comprehensive',
    instructions: 'Audit code for OWASP security vulnerabilities, memory leaks, and performance bottlenecks.',
    tools: ['Code Analysis', 'Security Audit Engine'],
    isBuiltin: true
  }
];

export default function MultiAgentView() {
  const [agents, setAgents] = useState<AgentItem[]>(BUILTIN_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(BUILTIN_AGENTS[0].id);
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [personality, setPersonality] = useState('Strict but helpful');
  const [instructions, setInstructions] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>(['Memory', 'Code Analysis']);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cortexcode_custom_agents');
      if (saved) {
        const parsed = JSON.parse(saved);
        setAgents([...BUILTIN_AGENTS, ...parsed]);
      }
    } catch { /* ignore */ }
  }, []);

  const saveCustomAgents = (customList: AgentItem[]) => {
    setAgents([...BUILTIN_AGENTS, ...customList]);
    try {
      localStorage.setItem('cortexcode_custom_agents', JSON.stringify(customList));
    } catch { /* ignore */ }
  };

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !instructions.trim()) return;

    const newAgent: AgentItem = {
      id: 'agent-custom-' + Date.now(),
      name: name.trim(),
      role: role.trim() || 'Custom AI Agent',
      personality: personality.trim(),
      instructions: instructions.trim(),
      tools: selectedTools,
      isBuiltin: false
    };

    const customOnly = agents.filter(a => !a.isBuiltin);
    saveCustomAgents([newAgent, ...customOnly]);
    setSelectedAgentId(newAgent.id);
    setName('');
    setRole('');
    setInstructions('');
    setShowBuilderModal(false);
  };

  const handleDeleteCustomAgent = (id: string) => {
    const customOnly = agents.filter(a => !a.isBuiltin && a.id !== id);
    saveCustomAgents(customOnly);
    setSelectedAgentId(BUILTIN_AGENTS[0].id);
  };

  const toggleTool = (tool: string) => {
    if (selectedTools.includes(tool)) {
      setSelectedTools(prev => prev.filter(t => t !== tool));
    } else {
      setSelectedTools(prev => [...prev, tool]);
    }
  };

  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] text-white font-sans overflow-hidden">
      
      {/* Header */}
      <div className="p-6 border-b border-[#262626] bg-[#121212] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Multi-Agent System & Agent Builder</h2>
          <p className="text-xs text-neutral-400">
            Specialized execution agents for coding, studying, research, planning & security auditing.
          </p>
        </div>

        <button
          onClick={() => setShowBuilderModal(true)}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <Plus size={14} />
          <span>Build Custom Agent</span>
        </button>
      </div>

      {/* Search Filter Strip */}
      <div className="px-6 py-3 bg-[#0d0d0d] border-b border-[#262626] flex items-center justify-between shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search agents..."
            className="pl-8 pr-3 py-1 bg-[#141414] border border-[#262626] rounded text-xs text-white placeholder-neutral-500 outline-none w-56 focus:border-neutral-700"
          />
        </div>

        <span className="text-xs text-neutral-400 font-mono">
          {filteredAgents.length} Agents Available
        </span>
      </div>

      {/* Enterprise Agent Table View */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="border border-[#262626] rounded-lg overflow-hidden bg-[#121212]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#171717] border-b border-[#262626] text-[11px] font-mono uppercase text-neutral-400">
                <th className="py-2.5 px-4 font-semibold">Agent Name</th>
                <th className="py-2.5 px-4 font-semibold">Role / Capacity</th>
                <th className="py-2.5 px-4 font-semibold">System Instructions</th>
                <th className="py-2.5 px-4 font-semibold">Tools</th>
                <th className="py-2.5 px-4 font-semibold text-right">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626] text-xs">
              {filteredAgents.map(agent => {
                const isActive = agent.id === selectedAgentId;
                return (
                  <tr
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`cursor-pointer transition group ${
                      isActive ? 'bg-[#1a1a1a]' : 'hover:bg-[#151515]'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Bot size={15} className={isActive ? 'text-blue-400' : 'text-neutral-400'} />
                        <span className="font-bold text-white">{agent.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-neutral-300 font-medium">
                      {agent.role}
                    </td>

                    <td className="py-3.5 px-4 text-neutral-400 max-w-sm line-clamp-2">
                      {agent.instructions}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {agent.tools.map((t, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-[#1c1c1c] border border-[#262626] text-[10px] text-neutral-400 font-mono">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          agent.isBuiltin
                            ? 'bg-[#1c1c1c] border-[#262626] text-neutral-400'
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        }`}>
                          {agent.isBuiltin ? 'System' : 'Custom'}
                        </span>
                        {!agent.isBuiltin && (
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteCustomAgent(agent.id); }}
                            className="p-1 text-neutral-500 hover:text-red-400 transition"
                            title="Delete Agent"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Custom Agent Builder */}
      {showBuilderModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateAgent}
            className="w-full max-w-md bg-[#121212] border border-[#262626] rounded-lg p-5 shadow-2xl space-y-4 font-sans max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="text-sm font-bold text-white">Create Custom Agent</h3>
              <button
                type="button"
                onClick={() => setShowBuilderModal(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1 uppercase">Agent Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. DSA Technical Interviewer"
                className="w-full p-2 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none placeholder-neutral-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1 uppercase">Role Title</label>
              <input
                type="text"
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="e.g. Senior Tech Lead Interviewer"
                className="w-full p-2 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none placeholder-neutral-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1 uppercase">Personality & Tone</label>
              <input
                type="text"
                value={personality}
                onChange={e => setPersonality(e.target.value)}
                placeholder="e.g. Strict but helpful"
                className="w-full p-2 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1 uppercase">Instructions / Prompt</label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={3}
                placeholder="Ask one LeetCode question at a time. Evaluate solutions step-by-step."
                className="w-full p-2 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none resize-none placeholder-neutral-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase">Enabled Tools</label>
              <div className="grid grid-cols-2 gap-1.5">
                {['Memory', 'Code Analysis', 'Document Search', 'Goal Roadmap Engine', 'Fact Verification'].map(tool => {
                  const isChecked = selectedTools.includes(tool);
                  return (
                    <button
                      type="button"
                      key={tool}
                      onClick={() => toggleTool(tool)}
                      className={`p-2 rounded text-xs transition border flex items-center justify-between ${
                        isChecked
                          ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 font-medium'
                          : 'bg-[#171717] border-[#262626] text-neutral-400'
                      }`}
                    >
                      <span>{tool}</span>
                      {isChecked && <Check size={13} className="text-blue-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262626]">
              <button
                type="button"
                onClick={() => setShowBuilderModal(false)}
                className="px-3 py-1.5 bg-[#171717] text-neutral-300 hover:text-white rounded text-xs border border-[#262626]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded text-xs"
              >
                Deploy Agent
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
