'use client';

import { useState, useEffect } from 'react';
import { Target, Plus, CheckCircle2, Trophy, X } from 'lucide-react';

export interface GoalTaskItem {
  id: string;
  dayNumber: number;
  taskText: string;
  completed: boolean;
}

export interface GoalItem {
  id: string;
  title: string;
  category: string;
  targetDays: number;
  currentDay: number;
  status: 'On track' | 'At Risk' | 'Completed';
  tasks: GoalTaskItem[];
  updatedAt: string;
}

const DEFAULT_GOALS: GoalItem[] = [
  {
    id: 'g1',
    title: 'Master DSA in 60 Days',
    category: 'Data Structures & Algorithms',
    targetDays: 60,
    currentDay: 32,
    status: 'On track',
    tasks: [
      { id: 'gt1', dayNumber: 32, taskText: 'Arrays & Two Pointers technique', completed: true },
      { id: 'gt2', dayNumber: 32, taskText: 'Solve 3 LeetCode Medium problems', completed: true },
      { id: 'gt3', dayNumber: 32, taskText: 'Review Recursion & Backtracking patterns', completed: false },
      { id: 'gt4', dayNumber: 33, taskText: 'Binary Search Trees & Traversal', completed: false },
      { id: 'gt5', dayNumber: 34, taskText: 'Graph BFS & DFS algorithms', completed: false }
    ],
    updatedAt: 'Today'
  },
  {
    id: 'g2',
    title: 'Build Full-Stack AI App in 30 Days',
    category: 'Full-Stack Web Dev',
    targetDays: 30,
    currentDay: 18,
    status: 'On track',
    tasks: [
      { id: 'gt6', dayNumber: 18, taskText: 'Design Prisma PostgreSQL schema', completed: true },
      { id: 'gt7', dayNumber: 18, taskText: 'Integrate Cerebras LLaMA-3.3 streaming SSE API', completed: true },
      { id: 'gt8', dayNumber: 19, taskText: 'Deploy frontend to Vercel & backend to Railway', completed: false }
    ],
    updatedAt: 'Yesterday'
  }
];

export default function GoalTracker() {
  const [goals, setGoals] = useState<GoalItem[]>(DEFAULT_GOALS);
  const [activeGoalId, setActiveGoalId] = useState<string>(DEFAULT_GOALS[0].id);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Coding');
  const [newDays, setNewDays] = useState(60);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cortexcode_goals');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          setGoals(parsed);
          setActiveGoalId(parsed[0].id);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const saveGoals = (updated: GoalItem[]) => {
    setGoals(updated);
    try {
      localStorage.setItem('cortexcode_goals', JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const activeGoal = goals.find(g => g.id === activeGoalId) || goals[0];

  const completedCount = activeGoal.tasks.filter(t => t.completed).length;
  const progressPercent = activeGoal.tasks.length > 0
    ? Math.round((completedCount / activeGoal.tasks.length) * 100)
    : 0;

  const handleToggleTask = (taskId: string) => {
    const updated = goals.map(g => {
      if (g.id === activeGoalId) {
        return {
          ...g,
          tasks: g.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
        };
      }
      return g;
    });
    saveGoals(updated);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newG: GoalItem = {
      id: 'g-' + Date.now(),
      title: newTitle.trim(),
      category: newCategory,
      targetDays: newDays,
      currentDay: 1,
      status: 'On track',
      tasks: [
        { id: 'gt-' + Date.now(), dayNumber: 1, taskText: 'Initial setup and syllabus review', completed: false },
        { id: 'gt-' + (Date.now() + 1), dayNumber: 1, taskText: 'Complete first practice problem set', completed: false }
      ],
      updatedAt: 'Just now'
    };

    const updated = [newG, ...goals];
    saveGoals(updated);
    setActiveGoalId(newG.id);
    setNewTitle('');
    setShowCreateModal(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] text-white font-sans overflow-hidden">
      
      {/* Header */}
      <div className="p-6 border-b border-[#262626] bg-[#121212] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Goal Roadmap Engine</h2>
          <p className="text-xs text-neutral-400">
            Structured multi-day roadmaps with daily task checklists and progress tracking.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <Plus size={14} />
          <span>Create Goal</span>
        </button>
      </div>

      {/* Goal Selector Strip */}
      <div className="px-6 py-2.5 bg-[#0d0d0d] border-b border-[#262626] flex items-center gap-2 overflow-x-auto shrink-0">
        {goals.map(g => {
          const isActive = g.id === activeGoalId;
          return (
            <button
              key={g.id}
              onClick={() => setActiveGoalId(g.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition whitespace-nowrap border ${
                isActive
                  ? 'bg-[#1a1a1a] border-blue-500/50 text-white font-semibold'
                  : 'bg-transparent border-transparent hover:bg-[#141414] text-neutral-400 hover:text-white'
              }`}
            >
              <Trophy size={13} className={isActive ? 'text-blue-400' : 'text-neutral-500'} />
              <span>{g.title}</span>
              <span className="px-1.5 py-0.2 rounded bg-[#1c1c1c] text-[10px] font-mono text-neutral-400">
                Day {g.currentDay}/{g.targetDays}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Goal Canvas */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
        <div className="max-w-3xl space-y-5">

          {/* Active Goal Overview */}
          <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#1c1c1c] border border-[#262626] text-neutral-300">
                  {activeGoal.category}
                </span>
                <h3 className="text-xl font-bold text-white tracking-tight mt-1.5">{activeGoal.title}</h3>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400">
                  {activeGoal.status}
                </span>
                <div className="text-xs text-neutral-400 font-mono mt-1">Day {activeGoal.currentDay} / {activeGoal.targetDays}</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs text-neutral-400 font-mono">
                <span>Completion Rate</span>
                <span className="text-blue-400 font-semibold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-[#1a1a1a] border border-[#262626] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Daily Tasks Checklist */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono uppercase text-neutral-400">
              Day {activeGoal.currentDay} Tasks Checklist
            </h4>

            <div className="space-y-1.5">
              {activeGoal.tasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => handleToggleTask(t.id)}
                  className={`p-3 rounded-lg border transition flex items-center justify-between cursor-pointer ${
                    t.completed
                      ? 'bg-[#121212] border-[#262626] text-neutral-500 line-through'
                      : 'bg-[#121212] border-[#262626] hover:border-neutral-700 text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                      t.completed ? 'bg-blue-600 border-blue-500 text-white' : 'border-neutral-600'
                    }`}>
                      {t.completed && <CheckCircle2 size={12} />}
                    </div>
                    <span className="text-xs font-medium">{t.taskText}</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500">Day {t.dayNumber}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Modal: Create Goal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateGoal}
            className="w-full max-w-md bg-[#121212] border border-[#262626] rounded-lg p-5 shadow-2xl space-y-4 font-sans"
          >
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="text-sm font-bold text-white">Create Goal Roadmap</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1 uppercase">Goal Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Master DSA in 60 Days"
                className="w-full p-2 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none placeholder-neutral-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1 uppercase">Category</label>
              <input
                type="text"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="e.g. Algorithms or Web Development"
                className="w-full p-2 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none placeholder-neutral-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1 uppercase">Target Days</label>
              <input
                type="number"
                value={newDays}
                onChange={e => setNewDays(Number(e.target.value))}
                min={7}
                max={365}
                className="w-full p-2 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262626]">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 bg-[#171717] text-neutral-300 hover:text-white rounded text-xs border border-[#262626]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
              >
                Start Roadmap
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
