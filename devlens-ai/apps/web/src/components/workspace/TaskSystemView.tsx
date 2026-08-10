'use client';

import { useState, useCallback, useRef } from 'react';
import { WorkspaceTask, addTask, updateTaskStatus } from '@/lib/workspaceApi';

interface Props { workspaceId: string; initialTasks: WorkspaceTask[]; }

const COLUMNS: { status: WorkspaceTask['status']; label: string; color: string; headerBg: string; dot: string }[] = [
  { status: 'PENDING',     label: 'Pending',     color: 'border-zinc-700/50',   headerBg: 'from-zinc-800/60 to-zinc-900/40',  dot: 'bg-zinc-500' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'border-blue-500/30',   headerBg: 'from-blue-900/30 to-blue-950/20',  dot: 'bg-blue-400' },
  { status: 'COMPLETED',   label: 'Completed',   color: 'border-emerald-500/30',headerBg: 'from-emerald-900/25 to-emerald-950/15', dot: 'bg-emerald-400' },
];
const PRIORITY_BORDER: Record<string, string> = { HIGH: 'border-l-red-500', MEDIUM: 'border-l-yellow-500', LOW: 'border-l-zinc-600' };
const PRIORITY_BADGE: Record<string, string> = { HIGH: 'bg-red-500/15 border-red-500/30 text-red-300', MEDIUM: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300', LOW: 'bg-zinc-700/50 border-white/10 text-zinc-500' };

export default function TaskSystemView({ workspaceId, initialTasks }: Props) {
  const [tasks, setTasks] = useState<WorkspaceTask[]>(initialTasks ?? []);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [adding, setAdding] = useState(false);

  const total = tasks.length;
  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const progressPct = total > 0 ? (completedCount / total) * 100 : 0;

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    setDraggingId(taskId);
  };
  const handleDragEnd = () => { setDraggingId(null); setDragOverCol(null); };
  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverCol(status);
  };
  const handleDrop = useCallback(async (e: React.DragEvent, newStatus: WorkspaceTask['status']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    setDraggingId(null); setDragOverCol(null);
    if (!taskId) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await updateTaskStatus(workspaceId, taskId, newStatus);
  }, [tasks, workspaceId]);

  const handleAddTask = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    const task = await addTask(workspaceId, { title: newTitle, description: newDesc, priority: newPriority, source: 'USER' });
    if (task) setTasks(prev => [...prev, task]);
    setNewTitle(''); setNewDesc(''); setNewPriority('MEDIUM'); setShowAddModal(false); setAdding(false);
  };

  const startEdit = (task: WorkspaceTask) => { setEditingId(task.id); setEditTitle(task.title); };
  const saveEdit = (taskId: string) => {
    if (editTitle.trim()) setTasks(prev => prev.map(t => t.id === taskId ? { ...t, title: editTitle.trim() } : t));
    setEditingId(null);
  };

  return (
    <div className="p-6 space-y-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white">Task Board</h2>
          <p className="text-zinc-500 text-sm">{total} tasks · {completedCount} completed · {total - completedCount} remaining</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 rounded-xl text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
        >
          + Add Task
        </button>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="flex-shrink-0">
          <div className="flex justify-between text-xs text-zinc-600 mb-1.5">
            <span>Progress</span>
            <span>{completedCount}/{total} tasks done</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Kanban Columns */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.status);
          const isDragTarget = dragOverCol === col.status;
          return (
            <div
              key={col.status}
              onDragOver={e => handleDragOver(e, col.status)}
              onDrop={e => handleDrop(e, col.status)}
              onDragLeave={() => setDragOverCol(null)}
              className={`flex flex-col rounded-2xl border transition-all ${col.color} ${isDragTarget ? 'border-opacity-100 scale-[1.01] shadow-lg' : 'border-opacity-40'}`}
              style={{ background: 'rgba(9,9,15,0.5)', minHeight: 200 }}
            >
              {/* Column Header */}
              <div className={`flex items-center justify-between px-4 py-3 border-b ${col.color} rounded-t-2xl bg-gradient-to-r ${col.headerBg}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className="text-sm font-semibold text-white">{col.label}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-400">{colTasks.length}</span>
              </div>

              {/* Tasks */}
              <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className={`flex items-center justify-center h-20 rounded-xl border border-dashed ${isDragTarget ? 'border-white/25 bg-white/5' : 'border-white/10'} transition-all`}>
                    <p className="text-xs text-zinc-700">Drop tasks here</p>
                  </div>
                ) : colTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={e => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    className={`group bg-zinc-900/80 border border-white/8 border-l-4 ${PRIORITY_BORDER[task.priority]} rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all hover:border-white/15 hover:shadow-lg ${draggingId === task.id ? 'opacity-50 scale-95' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-zinc-700 mt-0.5 flex-shrink-0 cursor-grab">⠿</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-1.5 mb-1.5 flex-wrap">
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${PRIORITY_BADGE[task.priority]}`}>{task.priority}</span>
                          <span className={`px-1.5 py-0.5 text-[9px] rounded border ${task.source === 'AI_AUDIT' ? 'bg-purple-600/15 border-purple-500/25 text-purple-400' : 'bg-blue-600/15 border-blue-500/25 text-blue-400'}`}>
                            {task.source === 'AI_AUDIT' ? '🤖' : '👤'}
                          </span>
                        </div>
                        {editingId === task.id ? (
                          <input
                            autoFocus
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(task.id); if (e.key === 'Escape') setEditingId(null); }}
                            onBlur={() => saveEdit(task.id)}
                            className="w-full bg-zinc-800 border border-blue-500/40 rounded-lg px-2 py-1 text-sm text-white focus:outline-none"
                          />
                        ) : (
                          <h4
                            onDoubleClick={() => startEdit(task)}
                            className={`text-sm font-medium leading-snug cursor-text ${col.status === 'COMPLETED' ? 'line-through text-zinc-600' : 'text-white'}`}
                            title="Double-click to edit"
                          >
                            {task.title}
                          </h4>
                        )}
                        {task.description && <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{task.description}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Add New Task</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white text-xl">×</button>
            </div>
            <div className="space-y-3">
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Task title..."
                className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50"
              />
              <input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Description (optional)..."
                className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50"
              />
              <div className="flex gap-2">
                {(['HIGH', 'MEDIUM', 'LOW'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setNewPriority(p)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${newPriority === p ? PRIORITY_BADGE[p] : 'bg-zinc-800 border-white/10 text-zinc-500'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-zinc-400 text-sm hover:text-white transition-colors">Cancel</button>
              <button
                onClick={handleAddTask}
                disabled={!newTitle.trim() || adding}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {adding ? 'Adding...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
