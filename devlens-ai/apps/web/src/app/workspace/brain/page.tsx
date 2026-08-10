'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BackgroundVideo from '@/components/BackgroundVideo';
import { listWorkspaces, WorkspaceBrainData } from '@/lib/workspaceApi';
import dynamic from 'next/dynamic';

const CreateWorkspaceModal = dynamic(() => import('@/components/workspace/CreateWorkspaceModal'), { ssr: false });
const ProjectDashboard = dynamic(() => import('@/components/workspace/ProjectDashboard'), { ssr: false });
const ArchitectureMap = dynamic(() => import('@/components/workspace/ArchitectureMap'), { ssr: false });
const CodeReviewView = dynamic(() => import('@/components/workspace/CodeReviewView'), { ssr: false });
const DebugModeView = dynamic(() => import('@/components/workspace/DebugModeView'), { ssr: false });
const BuildWithMeView = dynamic(() => import('@/components/workspace/BuildWithMeView'), { ssr: false });
const TaskSystemView = dynamic(() => import('@/components/workspace/TaskSystemView'), { ssr: false });
const InterviewModeView = dynamic(() => import('@/components/workspace/InterviewModeView'), { ssr: false });
const LearnModeView = dynamic(() => import('@/components/workspace/LearnModeView'), { ssr: false });
const ProjectMemoryView = dynamic(() => import('@/components/workspace/ProjectMemoryView'), { ssr: false });
const SmartChatView = dynamic(() => import('@/components/workspace/SmartChatView'), { ssr: false });

type ViewTab = 'dashboard'|'chat'|'architecture'|'review'|'debug'|'build'|'tasks'|'interview'|'learn'|'memory';

const TABS: { id: ViewTab; label: string; icon: string; section: 'overview'|'tools'|'brain'; color: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', section: 'overview', color: 'from-blue-500 to-cyan-500' },
  { id: 'chat', label: 'Smart Chat', icon: '💬', section: 'tools', color: 'from-violet-500 to-purple-500' },
  { id: 'debug', label: 'Debug Console', icon: '🐛', section: 'tools', color: 'from-red-500 to-orange-500' },
  { id: 'review', label: 'Code Review', icon: '🔍', section: 'tools', color: 'from-amber-500 to-yellow-500' },
  { id: 'build', label: 'Build With Me', icon: '🛠', section: 'tools', color: 'from-emerald-500 to-green-500' },
  { id: 'tasks', label: 'Task Board', icon: '📋', section: 'tools', color: 'from-sky-500 to-blue-500' },
  { id: 'architecture', label: 'Architecture', icon: '🗺️', section: 'brain', color: 'from-indigo-500 to-blue-500' },
  { id: 'interview', label: 'Interview Mode', icon: '🎯', section: 'brain', color: 'from-pink-500 to-rose-500' },
  { id: 'learn', label: 'Learn Mode', icon: '🎓', section: 'brain', color: 'from-orange-500 to-amber-500' },
  { id: 'memory', label: 'Project Memory', icon: '🧠', section: 'brain', color: 'from-teal-500 to-emerald-500' },
];

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function healthColor(score: number) {
  return score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
}

function HealthRing({ score, size = 48 }: { score: number; size?: number }) {
  const r = size * 0.4;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = healthColor(score);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={size*0.08} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={size*0.08}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  );
}

export default function ProjectBrainPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceBrainData[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceBrainData | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const cmdRef = useRef<HTMLInputElement>(null);
  const [viewKey, setViewKey] = useState(0);

  useEffect(() => {
    (async () => {
      const list = await listWorkspaces();
      setWorkspaces(list);
      if (list.length > 0) setActiveWorkspace(list[0]);
      setLoading(false);
    })();
  }, []);

  // Command palette keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
        setCmdQuery('');
      }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => { if (cmdOpen) setTimeout(() => cmdRef.current?.focus(), 50); }, [cmdOpen]);

  const handleWorkspaceCreated = useCallback((brain: WorkspaceBrainData) => {
    setWorkspaces(prev => [brain, ...prev]);
    setActiveWorkspace(brain);
    setActiveTab('dashboard');
    setViewKey(k => k + 1);
  }, []);

  const handleTabChange = (tab: ViewTab) => {
    setActiveTab(tab);
    setViewKey(k => k + 1);
    setCmdOpen(false);
  };

  const filteredTabs = TABS.filter(t => t.label.toLowerCase().includes(cmdQuery.toLowerCase()));

  function renderView() {
    if (!activeWorkspace) return null;
    switch (activeTab) {
      case 'dashboard': return <ProjectDashboard brain={activeWorkspace} />;
      case 'chat': return <SmartChatView workspaceId={activeWorkspace.id} brain={activeWorkspace} />;
      case 'architecture': return <ArchitectureMap brain={activeWorkspace} />;
      case 'review': return <CodeReviewView workspaceId={activeWorkspace.id} initialIssues={activeWorkspace.issues} />;
      case 'debug': return <DebugModeView workspaceId={activeWorkspace.id} />;
      case 'build': return <BuildWithMeView workspaceId={activeWorkspace.id} />;
      case 'tasks': return <TaskSystemView workspaceId={activeWorkspace.id} initialTasks={activeWorkspace.tasks} />;
      case 'interview': return <InterviewModeView workspaceId={activeWorkspace.id} brain={activeWorkspace} />;
      case 'learn': return <LearnModeView workspaceId={activeWorkspace.id} />;
      case 'memory': return <ProjectMemoryView workspaceId={activeWorkspace.id} initialMemories={activeWorkspace.memories} />;
      default: return null;
    }
  }

  const score = activeWorkspace?.health?.overallScore ?? 0;
  const activeTabMeta = TABS.find(t => t.id === activeTab);

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-[#0a0a0f] text-white">
      <BackgroundVideo />
      <div className="absolute inset-0 bg-[#0a0a0f]/85 backdrop-blur-sm z-0" />

      {/* Command Palette */}
      {cmdOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCmdOpen(false)} />
          <div className="relative z-10 w-full max-w-lg bg-zinc-900 border border-white/15 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <span className="text-zinc-500">⌘</span>
              <input
                ref={cmdRef}
                value={cmdQuery}
                onChange={e => setCmdQuery(e.target.value)}
                placeholder="Jump to view..."
                className="flex-1 bg-transparent text-white text-sm placeholder-zinc-600 focus:outline-none"
              />
              <kbd className="text-[10px] text-zinc-600 bg-zinc-800 border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
            </div>
            <div className="p-2 max-h-72 overflow-y-auto">
              {filteredTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  disabled={!activeWorkspace}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all disabled:opacity-40 ${activeTab === tab.id ? 'bg-blue-600/20 text-white' : 'text-zinc-400 hover:bg-white/8 hover:text-white'}`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span className="ml-auto text-[10px] text-zinc-600 uppercase">{tab.section}</span>
                </button>
              ))}
              {filteredTabs.length === 0 && <p className="text-center text-zinc-600 py-4 text-sm">No views match</p>}
            </div>
          </div>
        </div>
      )}

      {/* ---- Sidebar ---- */}
      <aside className={`relative z-10 flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-72' : 'w-16'} min-h-screen bg-zinc-950/80 backdrop-blur-xl border-r border-white/8 flex-shrink-0`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/8">
          {sidebarOpen && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm font-bold">CC</div>
              <div>
                <div className="text-sm font-bold text-white leading-none">CortexCode</div>
                <div className="text-[10px] text-blue-400 font-semibold tracking-wider mt-0.5">PROJECT BRAIN</div>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors ml-auto"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Workspace Selector */}
        {sidebarOpen && (
          <div className="p-3 border-b border-white/8">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2 font-semibold px-1">Workspaces</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {workspaces.map(ws => (
                <button
                  key={ws.id}
                  onClick={() => { setActiveWorkspace(ws); setActiveTab('dashboard'); setViewKey(k => k + 1); }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all ${activeWorkspace?.id === ws.id ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-white/6 border border-transparent'}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${activeWorkspace?.id === ws.id ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                    {getInitials(ws.name)}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-medium truncate text-zinc-200">{ws.name}</div>
                    {ws.health && (
                      <div className="text-[10px] mt-0.5" style={{ color: healthColor(ws.health.overallScore) }}>
                        Health {ws.health.overallScore}/100
                      </div>
                    )}
                  </div>
                </button>
              ))}
              {workspaces.length === 0 && !loading && (
                <p className="text-zinc-700 text-xs px-2 py-1">No workspaces yet</p>
              )}
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-white/12 text-zinc-500 hover:text-white hover:border-blue-500/40 hover:bg-blue-600/8 transition-all text-sm"
            >
              <span className="text-base">+</span>
              <span>New Workspace</span>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {(['overview', 'tools', 'brain'] as const).map(section => (
            <div key={section}>
              {sidebarOpen && (
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-4 mb-1.5 font-semibold px-2 first:mt-0">
                  {section === 'overview' ? 'Overview' : section === 'tools' ? 'AI Tools' : 'Brain'}
                </p>
              )}
              {TABS.filter(t => t.section === section).map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    disabled={!activeWorkspace}
                    title={!sidebarOpen ? tab.label : undefined}
                    className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600/20 to-violet-600/10 text-white border border-blue-500/25'
                        : 'text-zinc-500 hover:bg-white/6 hover:text-white border border-transparent'
                    }`}
                  >
                    {isActive && (
                      <span className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-gradient-to-b ${tab.color}`} />
                    )}
                    <span className="text-base flex-shrink-0 relative z-10">{tab.icon}</span>
                    {sidebarOpen && (
                      <>
                        <span className="truncate font-medium relative z-10">{tab.label}</span>
                        {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-white/8 space-y-1">
          {sidebarOpen && (
            <p className="text-[10px] text-zinc-700 text-center mb-2">
              <kbd className="bg-zinc-900 border border-white/10 rounded px-1">⌘K</kbd> to jump to view
            </p>
          )}
          <button
            onClick={() => router.push('/workspace')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/8 transition-all text-sm"
          >
            <span>💬</span>
            {sidebarOpen && <span>Back to Chat</span>}
          </button>
        </div>
      </aside>

      {/* ---- Main Content ---- */}
      <main className="relative z-10 flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/8 bg-zinc-950/60 backdrop-blur-sm flex-shrink-0">
          {activeWorkspace ? (
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-base font-bold text-white leading-none">{activeWorkspace.name}</h1>
                <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full bg-gradient-to-r ${activeTabMeta?.color || 'from-blue-500 to-violet-500'}`} />
                  {activeTabMeta?.label}
                </p>
              </div>
              <div className="flex gap-1.5">
                {activeWorkspace.stack?.frameworks?.slice(0, 3).map(f => (
                  <span key={f} className="px-2 py-0.5 bg-zinc-900 border border-white/10 rounded-lg text-[11px] text-zinc-400">{f}</span>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-lg font-bold text-white">CortexCode Brain</h1>
              <p className="text-xs text-zinc-500">Your AI Developer Workspace</p>
            </div>
          )}

          <div className="flex items-center gap-4">
            {activeWorkspace && (
              <>
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-zinc-600">{activeWorkspace.totalFiles} files · {activeWorkspace.totalLines?.toLocaleString()} lines</div>
                  <div className="text-[10px] text-zinc-700 mt-0.5">
                    {activeWorkspace.lastAnalyzedAt ? `Analyzed ${new Date(activeWorkspace.lastAnalyzedAt).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <div className="relative flex items-center justify-center">
                  <HealthRing score={score} size={48} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-black" style={{ color: healthColor(score) }}>{score}</span>
                  </div>
                </div>
              </>
            )}
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:border-white/20 text-xs transition-all"
            >
              <span>⌘</span><span>K</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-zinc-900/50 animate-pulse" />
              ))}
            </div>
          ) : activeWorkspace ? (
            <div key={viewKey} className="h-full animate-fadeIn" style={{ animation: 'fadeIn 0.2s ease' }}>
              {renderView()}
            </div>
          ) : (
            <EmptyWorkspaceState onCreate={() => setShowCreateModal(true)} />
          )}
        </div>
      </main>

      {showCreateModal && (
        <CreateWorkspaceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleWorkspaceCreated}
        />
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function EmptyWorkspaceState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-20 text-center gap-8">
      <div className="relative">
        <div className="w-28 h-28 rounded-3xl flex items-center justify-center text-6xl relative z-10 bg-zinc-900/80 border border-white/10">
          🧠
        </div>
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/20 to-violet-500/20 blur-xl animate-pulse" />
      </div>
      <div>
        <h2 className="text-3xl font-bold text-white mb-3">Your AI Developer Workspace</h2>
        <p className="text-zinc-400 text-lg max-w-xl leading-relaxed">
          Upload your project codebase and CortexCode will build a persistent{' '}
          <span className="text-blue-400 font-semibold">Project Brain</span>{' '}
          — powering smart chat, code review, debugging, architecture visualization, interview prep, and more.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl w-full">
        {[
          { icon: '📊', label: 'Dashboard', desc: 'Health scores & analytics' },
          { icon: '🔍', label: 'Code Review', desc: 'Real issue detection' },
          { icon: '🐛', label: 'Debug Console', desc: 'Root cause analysis' },
          { icon: '🎯', label: 'Interview Prep', desc: 'Project-specific Q&A' },
          { icon: '📋', label: 'Task Board', desc: 'Kanban task management' },
          { icon: '🗺️', label: 'Architecture', desc: 'Interactive SVG graph' },
          { icon: '🎓', label: 'Learn Mode', desc: 'AI-powered lessons' },
          { icon: '🧠', label: 'Memory Bank', desc: 'Persistent decisions' },
        ].map(f => (
          <div key={f.label} className="bg-zinc-900/60 border border-white/8 rounded-xl p-4 text-center hover:border-white/15 transition-colors">
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="text-sm font-semibold text-white">{f.label}</div>
            <div className="text-xs text-zinc-600 mt-1">{f.desc}</div>
          </div>
        ))}
      </div>
      <button
        onClick={onCreate}
        className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-2xl font-semibold text-lg transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:scale-105"
      >
        <span>🧠</span>
        Create Your First Workspace
      </button>
    </div>
  );
}
