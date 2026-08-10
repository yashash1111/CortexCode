'use client';

import { useState, useCallback } from 'react';
import { WorkspaceMemory, addMemory, deleteMemory } from '@/lib/workspaceApi';

interface Props { workspaceId: string; initialMemories: WorkspaceMemory[]; }

const TYPE_META: Record<string, { icon: string; bg: string; border: string; text: string; dot: string }> = {
  GOAL:           { icon: '🎯', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  STACK_DECISION: { icon: '🛠', bg: 'bg-blue-500/10',    border: 'border-blue-500/25',    text: 'text-blue-300',    dot: 'bg-blue-400' },
  ARCHITECTURE:   { icon: '🗺️', bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   text: 'text-amber-300',   dot: 'bg-amber-400' },
  NOTE:           { icon: '📝', bg: 'bg-zinc-700/30',    border: 'border-white/10',       text: 'text-zinc-400',    dot: 'bg-zinc-500' },
};
const TYPES = ['GOAL', 'STACK_DECISION', 'ARCHITECTURE', 'NOTE'] as const;

export default function ProjectMemoryView({ workspaceId, initialMemories }: Props) {
  const [memories, setMemories] = useState<WorkspaceMemory[]>(initialMemories ?? []);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<typeof TYPES[number]>('NOTE');
  const [newContent, setNewContent] = useState('');
  const [adding, setAdding] = useState(false);
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filteredBase = memories
    .filter(m => filterType === 'ALL' || m.type === filterType)
    .filter(m => !search || m.content.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pinnedMems = filteredBase.filter(m => pinned.has(m.id));
  const unpinnedMems = filteredBase.filter(m => !pinned.has(m.id));
  const allVisible = [...pinnedMems, ...unpinnedMems];

  const handleAdd = useCallback(async () => {
    if (!newContent.trim()) return;
    setAdding(true);
    const mem = await addMemory(workspaceId, newType, newContent.trim());
    if (mem) setMemories(prev => [mem, ...prev]);
    setNewContent(''); setShowAdd(false); setAdding(false);
  }, [workspaceId, newType, newContent]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteMemory(workspaceId, id);
    setMemories(prev => prev.filter(m => m.id !== id));
    setConfirmDelete(null);
  }, [workspaceId]);

  const togglePin = (id: string) => setPinned(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleExpand = (id: string) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div className="p-6 space-y-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white">Project Memory</h2>
          <p className="text-zinc-500 text-sm">Persistent store for goals, stack decisions, and architectural choices.</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 rounded-xl text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
        >
          {showAdd ? '× Cancel' : '+ Add Memory'}
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="bg-zinc-900/60 border border-blue-500/20 rounded-2xl p-5 space-y-3 flex-shrink-0">
          <div className="flex gap-2 flex-wrap">
            {TYPES.map(t => {
              const meta = TYPE_META[t];
              return (
                <button
                  key={t}
                  onClick={() => setNewType(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${newType === t ? `${meta.bg} ${meta.border} ${meta.text}` : 'bg-zinc-800 border-white/10 text-zinc-500'}`}
                >
                  <span>{meta.icon}</span>{t.replace('_', ' ')}
                </button>
              );
            })}
          </div>
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="e.g. We chose PostgreSQL because we need ACID compliance for financial transactions..."
            rows={3}
            className="w-full px-4 py-3 bg-zinc-950/80 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50 resize-none"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newContent.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl text-white text-sm font-semibold transition-all"
          >
            {adding ? 'Saving...' : '+ Save Memory'}
          </button>
        </div>
      )}

      {/* Search + Filters */}
      <div className="space-y-2 flex-shrink-0">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search memories..."
            className="w-full pl-9 pr-4 py-2.5 bg-zinc-900/60 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500/40"
          />
          {search && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600">
              {allVisible.length} of {memories.length}
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterType('ALL')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === 'ALL' ? 'bg-white/15 text-white' : 'text-zinc-500 hover:text-white'}`}>
            All ({memories.length})
          </button>
          {TYPES.map(t => (
            <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === t ? 'bg-white/15 text-white' : 'text-zinc-500 hover:text-white'}`}>
              {TYPE_META[t].icon} {t.replace('_', ' ')} ({memories.filter(m => m.type === t).length})
            </button>
          ))}
        </div>
      </div>

      {/* Memory Timeline */}
      <div className="flex-1 overflow-y-auto">
        {allVisible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="text-4xl">🧠</div>
            <p className="text-zinc-600 text-sm">No memories yet. Start capturing decisions.</p>
          </div>
        ) : (
          <div className="relative pl-8">
            {/* Timeline line */}
            <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/30 via-white/8 to-transparent" />

            <div className="space-y-4">
              {allVisible.map((mem, idx) => {
                const meta = TYPE_META[mem.type] ?? TYPE_META.NOTE;
                const isPinned = pinned.has(mem.id);
                const isExpanded = expanded.has(mem.id);
                const isLong = mem.content.length > 150;
                const isConfirmingDelete = confirmDelete === mem.id;
                return (
                  <div key={mem.id} className="relative">
                    {/* Timeline dot */}
                    <div className={`absolute -left-5 w-3 h-3 rounded-full border-2 border-zinc-950 mt-4 ${meta.dot}`} />

                    <div className={`rounded-xl border p-4 transition-all hover:border-opacity-60 ${isPinned ? 'border-amber-400/40 bg-amber-500/5' : 'border-white/8 bg-zinc-900/60'}`}>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isPinned && <span className="text-xs text-amber-400">📌</span>}
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${meta.bg} ${meta.border} ${meta.text}`}>
                            {meta.icon} {mem.type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-zinc-600">{mem.source}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => togglePin(mem.id)}
                            className={`p-1.5 rounded-lg text-xs transition-all ${isPinned ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-600 hover:text-amber-400 hover:bg-amber-500/10'}`}
                            title={isPinned ? 'Unpin' : 'Pin'}
                          >
                            📌
                          </button>
                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDelete(mem.id)} className="px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/15 rounded-lg transition-colors">Yes</button>
                              <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 text-[10px] text-zinc-500 hover:bg-white/8 rounded-lg transition-colors">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDelete(mem.id)} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
                              🗑
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        {isLong && !isExpanded ? mem.content.slice(0, 150) + '...' : mem.content}
                      </p>
                      {isLong && (
                        <button onClick={() => toggleExpand(mem.id)} className="text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors">
                          {isExpanded ? '▲ Show less' : '▼ Show more'}
                        </button>
                      )}

                      <p className="text-[10px] text-zinc-700 mt-2">{new Date(mem.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
