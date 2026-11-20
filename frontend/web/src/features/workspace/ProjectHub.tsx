'use client';

import { useState, useEffect } from 'react';
import {
  Layers, Plus, Folder, Code, CheckSquare, FileText, Cpu,
  X, Check, Trash2, Search
} from 'lucide-react';

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  architecture?: string;
  tasks: { id: string; title: string; completed: boolean }[];
  documents: { id: string; name: string; size: string; content?: string }[];
  aiDecisions: { id: string; topic: string; decision: string; date: string }[];
  updatedAt: string;
}

const DEFAULT_PROJECTS: ProjectItem[] = [
  {
    id: 'proj-1',
    name: 'TrainTrack',
    description: 'Real-time railway ticketing and train live location tracking web platform.',
    technologies: ['Node.js', 'Express', 'React', 'PostgreSQL', 'Socket.io'],
    architecture: 'Microservices architecture with REST API endpoints for booking and WebSocket feeds for live GPS train coordinates.',
    tasks: [
      { id: 't1', title: 'Implement JWT authentication & refresh tokens', completed: true },
      { id: 't2', title: 'Build live socket stream for train delay alerts', completed: false },
      { id: 't3', title: 'Optimize seat availability SQL queries', completed: true }
    ],
    documents: [
      { id: 'd1', name: 'system_architecture.md', size: '4.2 KB' },
      { id: 'd2', name: 'api_schema.json', size: '12.8 KB' }
    ],
    aiDecisions: [
      { id: 'ad1', topic: 'Database Choice', decision: 'Selected PostgreSQL over MongoDB due to strict ACID compliance for seat reservation transactions.', date: '2 days ago' }
    ],
    updatedAt: 'Today'
  },
  {
    id: 'proj-2',
    name: 'FloodAlert',
    description: 'IoT emergency flood warning system with real-time water sensor telemetry.',
    technologies: ['Python', 'FastAPI', 'MQTT', 'InfluxDB', 'React Native'],
    architecture: 'Telemetry ingest queue reading river sensor payloads via MQTT, calculating risk thresholds and notifying mobile apps via Firebase FCM.',
    tasks: [
      { id: 't4', title: 'Calibrate sensor threshold calculation script', completed: true },
      { id: 't5', title: 'Setup SMS emergency alert gateway', completed: false }
    ],
    documents: [
      { id: 'd3', name: 'sensor_specs.pdf', size: '1.4 MB' }
    ],
    aiDecisions: [
      { id: 'ad2', topic: 'Time-Series Engine', decision: 'Used InfluxDB for storing high-frequency sensor readings efficiently.', date: '1 week ago' }
    ],
    updatedAt: '3 days ago'
  },
  {
    id: 'proj-3',
    name: 'CortexCode',
    description: 'Context-aware AI workspace platform with long-term memory & multi-agent execution.',
    technologies: ['Next.js 16', 'TypeScript', 'Prisma', 'PostgreSQL', 'Python FastAPI'],
    architecture: 'Monorepo containing Next.js client, Express API server, and Python AI Service integrated with Cerebras LLaMA-3.3 70B & Gemini Flash.',
    tasks: [
      { id: 't6', title: 'Build Long-Term Memory Manager', completed: true },
      { id: 't7', title: 'Implement 3-Pane AI Code Lab workbench', completed: true },
      { id: 't8', title: 'Integrate multi-agent custom agent builder', completed: false }
    ],
    documents: [
      { id: 'd4', name: 'master_prompt.md', size: '8.1 KB' }
    ],
    aiDecisions: [
      { id: 'ad3', topic: 'Streaming Architecture', decision: 'Adopted SSE (Server-Sent Events) with word-by-word typewriter fallback for instant UI response feel.', date: 'Yesterday' }
    ],
    updatedAt: 'Just now'
  }
];

export default function ProjectHub() {
  const [projects, setProjects] = useState<ProjectItem[]>(DEFAULT_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState<string>(DEFAULT_PROJECTS[0].id);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'docs' | 'decisions'>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectTechs, setNewProjectTechs] = useState('');

  const [newTaskInput, setNewTaskInput] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cortexcode_projects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          setProjects(parsed);
          setActiveProjectId(parsed[0].id);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const saveProjects = (updated: ProjectItem[]) => {
    setProjects(updated);
    try {
      localStorage.setItem('cortexcode_projects', JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const techs = newProjectTechs.split(',').map(t => t.trim()).filter(Boolean);
    const newProj: ProjectItem = {
      id: 'proj-' + Date.now(),
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || 'New personal project workspace.',
      technologies: techs.length > 0 ? techs : ['TypeScript', 'React'],
      architecture: 'Client-server architecture.',
      tasks: [],
      documents: [],
      aiDecisions: [],
      updatedAt: 'Just now'
    };

    const updated = [newProj, ...projects];
    saveProjects(updated);
    setActiveProjectId(newProj.id);
    setNewProjectName('');
    setNewProjectDesc('');
    setNewProjectTechs('');
    setShowCreateModal(false);
  };

  const handleToggleTask = (taskId: string) => {
    const updated = projects.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          tasks: p.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
        };
      }
      return p;
    });
    saveProjects(updated);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;

    const updated = projects.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          tasks: [...p.tasks, { id: 't-' + Date.now(), title: newTaskInput.trim(), completed: false }]
        };
      }
      return p;
    });
    saveProjects(updated);
    setNewTaskInput('');
  };

  const handleDeleteProject = (projId: string) => {
    if (confirm('Delete this project workspace?')) {
      const updated = projects.filter(p => p.id !== projId);
      saveProjects(updated);
      if (updated.length > 0) setActiveProjectId(updated[0].id);
    }
  };

  return (
    <div className="flex-1 flex h-full bg-[#0a0a0a] text-white font-sans overflow-hidden">
      
      {/* Left Sidebar Project List */}
      <aside className="w-64 bg-[#0d0d0d] border-r border-[#262626] p-3 flex flex-col shrink-0 custom-scrollbar">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition mb-3"
        >
          <Plus size={14} />
          <span>New Project</span>
        </button>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider px-2 block mb-1">
            Projects ({projects.length})
          </span>

          {projects.map(proj => {
            const isActive = proj.id === activeProjectId;
            const completedTasks = proj.tasks.filter(t => t.completed).length;
            return (
              <div
                key={proj.id}
                onClick={() => setActiveProjectId(proj.id)}
                className={`p-2.5 rounded-md cursor-pointer transition border text-left group ${
                  isActive
                    ? 'bg-[#1a1a1a] border-[#262626] text-white shadow-sm'
                    : 'bg-transparent hover:bg-[#141414] border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 truncate">
                    <Folder size={14} className={isActive ? 'text-blue-400' : 'text-neutral-500'} />
                    <span className="font-semibold text-xs text-white truncate">{proj.name}</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteProject(proj.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <p className="text-[11px] text-neutral-400 line-clamp-1 mb-1 font-sans">
                  {proj.description}
                </p>

                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono pt-1">
                  <span>{proj.technologies.slice(0, 2).join(' · ')}</span>
                  <span>{completedTasks}/{proj.tasks.length} tasks</span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Project View */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a]">
        
        {/* Header */}
        <header className="px-6 py-4 border-b border-[#262626] bg-[#121212] flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">{activeProject.name}</h2>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded">
                Active Context
              </span>
            </div>
            <p className="text-xs text-neutral-400 max-w-xl mt-0.5">{activeProject.description}</p>
          </div>
        </header>

        {/* Tab Strip */}
        <div className="flex px-6 bg-[#0d0d0d] border-b border-[#262626] gap-1 shrink-0">
          {[
            { id: 'overview', label: 'Overview & Architecture', icon: Layers },
            { id: 'tasks', label: 'Tasks', icon: CheckSquare },
            { id: 'docs', label: 'Documents', icon: FileText },
            { id: 'decisions', label: 'AI Decisions', icon: Cpu }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as unknown)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition ${
                  isActive
                    ? 'border-blue-500 text-white bg-[#141414]'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5 max-w-3xl">
              <div className="bg-[#121212] border border-[#262626] rounded-lg p-4">
                <h4 className="text-xs font-mono uppercase text-neutral-400 mb-2 flex items-center gap-2">
                  <Code size={14} className="text-blue-400" />
                  Technologies
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeProject.technologies.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded bg-[#1c1c1c] border border-[#262626] text-neutral-300 text-xs font-mono"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-[#121212] border border-[#262626] rounded-lg p-4">
                <h4 className="text-xs font-mono uppercase text-neutral-400 mb-2 flex items-center gap-2">
                  <Layers size={14} className="text-neutral-400" />
                  Architecture Blueprint
                </h4>
                <div className="p-3.5 rounded bg-[#0d0d0d] border border-[#262626] text-xs text-neutral-300 font-mono leading-relaxed">
                  {activeProject.architecture || 'No architecture defined.'}
                </div>
              </div>
            </div>
          )}

          {/* TASKS */}
          {activeTab === 'tasks' && (
            <div className="max-w-2xl space-y-3">
              <form onSubmit={handleAddTask} className="flex gap-2">
                <input
                  type="text"
                  value={newTaskInput}
                  onChange={e => setNewTaskInput(e.target.value)}
                  placeholder="Add a new project task..."
                  className="flex-1 bg-[#121212] border border-[#262626] rounded px-3 py-1.5 text-xs text-white placeholder-neutral-500 outline-none"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded transition"
                >
                  Add Task
                </button>
              </form>

              <div className="space-y-1.5">
                {activeProject.tasks.length === 0 ? (
                  <div className="py-6 text-center text-xs text-neutral-500">No tasks in this project yet.</div>
                ) : (
                  activeProject.tasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={`p-3 rounded-lg border transition flex items-center justify-between cursor-pointer ${
                        task.completed
                          ? 'bg-[#121212] border-[#262626] text-neutral-500 line-through'
                          : 'bg-[#121212] border-[#262626] hover:border-neutral-700 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                          task.completed ? 'bg-blue-600 border-blue-500 text-white' : 'border-neutral-600'
                        }`}>
                          {task.completed && <Check size={10} />}
                        </div>
                        <span className="text-xs">{task.title}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* DOCUMENTS */}
          {activeTab === 'docs' && (
            <div className="max-w-2xl space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {activeProject.documents.map(doc => (
                  <div key={doc.id} className="p-3 bg-[#121212] border border-[#262626] rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText size={16} className="text-neutral-400" />
                      <div>
                        <div className="text-xs font-semibold text-white">{doc.name}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">{doc.size}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI DECISIONS */}
          {activeTab === 'decisions' && (
            <div className="max-w-2xl space-y-2">
              {activeProject.aiDecisions.map(dec => (
                <div key={dec.id} className="p-3.5 bg-[#121212] border border-[#262626] rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Cpu size={13} className="text-blue-400" />
                      {dec.topic}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">{dec.date}</span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed font-sans">{dec.decision}</p>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* Modal: Create Project */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateProject}
            className="w-full max-w-md bg-[#121212] border border-[#262626] rounded-lg p-5 shadow-2xl space-y-4 font-sans"
          >
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="text-sm font-bold text-white">Create Project</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1 uppercase">Project Name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="e.g. TrainTrack"
                className="w-full p-2 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none placeholder-neutral-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1 uppercase">Description</label>
              <textarea
                value={newProjectDesc}
                onChange={e => setNewProjectDesc(e.target.value)}
                rows={2}
                placeholder="Short summary of project..."
                className="w-full p-2 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none resize-none placeholder-neutral-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1 uppercase">Technologies (comma separated)</label>
              <input
                type="text"
                value={newProjectTechs}
                onChange={e => setNewProjectTechs(e.target.value)}
                placeholder="e.g. React, Node.js, PostgreSQL"
                className="w-full p-2 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none placeholder-neutral-600"
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
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
