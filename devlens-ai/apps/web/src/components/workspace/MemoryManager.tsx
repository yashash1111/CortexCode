'use client';

import { useState, useEffect } from 'react';
import { Cpu, Plus, Trash2, Edit2, ShieldAlert, Folder, Code, UserCheck, Target, Search, X } from 'lucide-react';

export interface MemoryItem {
  id: string;
  category: 'Projects' | 'Skills' | 'Preferences' | 'Goals' | 'Facts';
  key: string;
  value: string;
  updatedAt: string;
}

const DEFAULT_MEMORIES: MemoryItem[] = [
  { id: 'mem-1', category: 'Projects', key: 'TrainTrack', value: 'Railway ticketing & train live tracking platform built with Node.js & React', updatedAt: 'Today' },
  { id: 'mem-2', category: 'Projects', key: 'FloodAlert', value: 'IoT emergency flood warning system using Python & MQTT protocol', updatedAt: 'Today' },
  { id: 'mem-3', category: 'Projects', key: 'CortexCode', value: 'Context-aware AI workspace with multi-agent architecture', updatedAt: 'Today' },
  { id: 'mem-4', category: 'Skills', key: 'Java', value: 'Advanced Spring Boot, Microservices & Multithreading', updatedAt: 'Today' },
  { id: 'mem-5', category: 'Skills', key: 'Python', value: 'Data analysis, FastAPI & PyTorch model deployment', updatedAt: 'Today' },
  { id: 'mem-6', category: 'Skills', key: 'React & Next.js', value: 'App router, TailwindCSS & state management', updatedAt: 'Today' },
  { id: 'mem-7', category: 'Preferences', key: 'Language Preference', value: 'Prefer concise Java & TypeScript code snippets with type definitions', updatedAt: 'Today' },
  { id: 'mem-8', category: 'Preferences', key: 'Explanation Style', value: 'Provide step-by-step beginner-friendly explanations with bullet points', updatedAt: 'Today' },
  { id: 'mem-9', category: 'Goals', key: 'DSA Mastery', value: 'Target 60-day roadmap covering Arrays, Trees, Graphs & Dynamic Programming', updatedAt: 'Today' },
];

export default function MemoryManager() {
  const [memories, setMemories] = useState<MemoryItem[]>(DEFAULT_MEMORIES);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newCategory, setNewCategory] = useState<MemoryItem['category']>('Projects');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cortexcode_user_memories');
      if (saved) setMemories(JSON.parse(saved));
      const enabled = localStorage.getItem('cortexcode_memory_enabled');
      if (enabled !== null) setMemoryEnabled(enabled === 'true');
    } catch { /* ignore */ }
  }, []);

  const saveMemories = (updated: MemoryItem[]) => {
    setMemories(updated);
    try {
      localStorage.setItem('cortexcode_user_memories', JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const toggleMemoryEnabled = () => {
    const next = !memoryEnabled;
    setMemoryEnabled(next);
    try {
      localStorage.setItem('cortexcode_memory_enabled', String(next));
    } catch { /* ignore */ }
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    const item: MemoryItem = {
      id: 'mem-' + Date.now(),
      category: newCategory,
      key: newKey.trim(),
      value: newValue.trim(),
      updatedAt: new Date().toLocaleDateString()
    };

    const updated = [item, ...memories];
    saveMemories(updated);
    setNewKey('');
    setNewValue('');
    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    const updated = memories.filter(m => m.id !== id);
    saveMemories(updated);
  };

  const handleSaveEdit = (id: string) => {
    const updated = memories.map(m =>
      m.id === id ? { ...m, value: editValue, updatedAt: new Date().toLocaleDateString() } : m
    );
    saveMemories(updated);
    setEditingId(null);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all stored long-term AI memories?')) {
      saveMemories([]);
    }
  };

  const CATEGORIES = ['All', 'Projects', 'Skills', 'Preferences', 'Goals', 'Facts'];

  const filtered = memories.filter(m => {
    const matchesCat = filterCategory === 'All' || m.category === filterCategory;
    const matchesSearch = searchQuery === '' ||
      m.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.value.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] text-white font-sans overflow-hidden">
      
      {/* Top Header */}
      <div className="p-6 border-b border-[#262626] bg-[#121212] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-lg font-bold text-white tracking-tight">Long-Term Memory</h2>
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
              memoryEnabled
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400'
            }`}>
              {memoryEnabled ? 'Active' : 'Disabled'}
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Stored preferences, tech stacks, and project facts injected into AI prompts across sessions.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMemoryEnabled}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition border ${
              memoryEnabled
                ? 'bg-[#1a1a1a] border-[#262626] text-neutral-300 hover:text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500'
            }`}
          >
            {memoryEnabled ? 'Disable Memory' : 'Enable Memory'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Plus size={14} />
            <span>Add Memory</span>
          </button>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="px-6 py-3 bg-[#0d0d0d] border-b border-[#262626] flex items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-1.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                filterCategory === cat
                  ? 'bg-neutral-800 text-white border border-neutral-700'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter memories..."
              className="pl-8 pr-3 py-1 bg-[#141414] border border-[#262626] rounded-md text-xs text-white placeholder-neutral-500 outline-none w-48 focus:border-neutral-700"
            />
          </div>

          {memories.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-red-400 hover:text-red-300 px-2.5 py-1 rounded-md hover:bg-red-950/20 border border-transparent transition"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Enterprise Database Table View */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-neutral-500 max-w-md mx-auto">
            <ShieldAlert size={28} className="mx-auto mb-2 text-neutral-600" />
            <p className="text-xs font-semibold text-neutral-300">No memory entries found.</p>
            <p className="text-xs text-neutral-500 mt-1">Add preferences or skills to personalize your AI responses.</p>
          </div>
        ) : (
          <div className="border border-[#262626] rounded-lg overflow-hidden bg-[#121212]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#171717] border-b border-[#262626] text-[11px] font-mono uppercase text-neutral-400">
                  <th className="py-2.5 px-4 font-semibold">Category</th>
                  <th className="py-2.5 px-4 font-semibold">Key / Title</th>
                  <th className="py-2.5 px-4 font-semibold">Memory Content</th>
                  <th className="py-2.5 px-4 font-semibold">Updated</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] text-xs">
                {filtered.map(mem => (
                  <tr key={mem.id} className="hover:bg-[#1a1a1a] transition group">
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1c1c1c] border border-[#262626] text-neutral-300 uppercase">
                        {mem.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-white">
                      {mem.key}
                    </td>

                    <td className="py-3 px-4 text-neutral-300 max-w-md">
                      {editingId === mem.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="flex-1 bg-[#0a0a0a] border border-blue-500/50 rounded px-2 py-1 text-xs text-white outline-none"
                          />
                          <button
                            onClick={() => handleSaveEdit(mem.id)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <span>{mem.value}</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                      {mem.updatedAt}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => { setEditingId(mem.id); setEditValue(mem.value); }}
                          className="p-1 text-neutral-400 hover:text-white"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(mem.id)}
                          className="p-1 text-neutral-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Memory */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddMemory}
            className="w-full max-w-md bg-[#121212] border border-[#262626] rounded-lg p-5 shadow-2xl space-y-4 font-sans"
          >
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="text-sm font-bold text-white">Add Memory Entry</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1 uppercase">Category</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as unknown as MemoryItem['category'])}
                className="w-full p-2 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none"
              >
                <option value="Projects">Projects</option>
                <option value="Skills">Skills</option>
                <option value="Preferences">Preferences</option>
                <option value="Goals">Goals</option>
                <option value="Facts">Facts</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1 uppercase">Key / Title</label>
              <input
                type="text"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                placeholder="e.g. Language Preference"
                className="w-full p-2 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none placeholder-neutral-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1 uppercase">Memory Content</label>
              <textarea
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                rows={3}
                placeholder="e.g. Always write clean TypeScript code with explicit types."
                className="w-full p-2 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none resize-none placeholder-neutral-600"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262626]">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 bg-[#171717] text-neutral-300 hover:text-white rounded text-xs border border-[#262626]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
              >
                Save Entry
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
