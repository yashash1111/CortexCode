'use client';

import { useState, useRef, useEffect } from 'react';
import { WorkspaceBrainData } from '@/lib/workspaceApi';

interface Props { brain: WorkspaceBrainData; }

const NODE_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  frontend:  { bg: 'rgba(59,130,246,0.15)',  border: '#3b82f6', text: '#93c5fd', glow: 'rgba(59,130,246,0.3)' },
  backend:   { bg: 'rgba(139,92,246,0.15)',  border: '#8b5cf6', text: '#c4b5fd', glow: 'rgba(139,92,246,0.3)' },
  database:  { bg: 'rgba(16,185,129,0.15)',  border: '#10b981', text: '#6ee7b7', glow: 'rgba(16,185,129,0.3)' },
  auth:      { bg: 'rgba(245,158,11,0.15)',  border: '#f59e0b', text: '#fcd34d', glow: 'rgba(245,158,11,0.3)' },
  service:   { bg: 'rgba(236,72,153,0.15)',  border: '#ec4899', text: '#f9a8d4', glow: 'rgba(236,72,153,0.3)' },
};

const LAYER_X: Record<string, number> = { frontend: 60, backend: 240, database: 420, auth: 600, service: 600 };
const LEGEND = [
  { type: 'frontend', label: 'Frontend' },
  { type: 'backend', label: 'Backend' },
  { type: 'database', label: 'Database' },
  { type: 'auth', label: 'Auth' },
  { type: 'service', label: 'Service' },
];

function getEdges(nodes: { id: string; type: string }[]) {
  const edges: { from: string; to: string }[] = [];
  const frontends = nodes.filter(n => n.type === 'frontend').map(n => n.id);
  const backends = nodes.filter(n => n.type === 'backend').map(n => n.id);
  const databases = nodes.filter(n => n.type === 'database').map(n => n.id);
  const auths = nodes.filter(n => n.type === 'auth').map(n => n.id);
  frontends.forEach(f => backends.forEach(b => edges.push({ from: f, to: b })));
  backends.forEach(b => databases.forEach(d => edges.push({ from: b, to: d })));
  backends.forEach(b => auths.forEach(a => edges.push({ from: b, to: a })));
  return edges;
}

export default function ArchitectureMap({ brain }: Props) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const nodes = brain.architecture?.diagramNodes ?? [];
  const selected = nodes.find(n => n.id === selectedNode);
  const edges = getEdges(nodes);

  // Compute node positions
  const typeCount: Record<string, number> = {};
  const positions: Record<string, { x: number; y: number }> = {};
  nodes.forEach(node => {
    const type = node.type || 'service';
    const idx = typeCount[type] ?? 0;
    typeCount[type] = idx + 1;
    const baseY = 60 + idx * 90;
    const extraY = type === 'service' ? (typeCount['auth'] ?? 0) * 90 : 0;
    positions[node.id] = { x: LAYER_X[type] ?? 60, y: baseY + extraY };
  });

  const NODE_W = 140, NODE_H = 56;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Architecture Map</h2>
        <p className="text-zinc-500 text-sm">Interactive visualization of your project's layer structure.</p>
      </div>

      {nodes.length === 0 ? (
        // Fallback: structured list view
        <div className="space-y-4">
          <div className="bg-zinc-900/50 border border-blue-500/20 rounded-2xl p-4 text-center text-sm text-zinc-400 mb-2">
            No architecture nodes detected. Showing structural overview instead.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Entry Points', items: brain.architecture?.entryPoints ?? [], color: NODE_COLORS.frontend, icon: '🚪' },
              { label: 'API Routes', items: brain.architecture?.apiRoutes ?? [], color: NODE_COLORS.backend, icon: '🛣' },
              { label: 'UI Components', items: brain.architecture?.components ?? [], color: NODE_COLORS.frontend, icon: '🖼' },
              { label: 'DB Models', items: brain.architecture?.models ?? [], color: NODE_COLORS.database, icon: '📦' },
            ].map(section => (
              <div key={section.label} className="bg-zinc-900/60 rounded-xl border overflow-hidden" style={{ borderColor: section.color.border + '40' }}>
                <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: section.color.border + '20', background: section.color.bg }}>
                  <span>{section.icon}</span>
                  <span className="text-sm font-semibold" style={{ color: section.color.text }}>{section.label}</span>
                  <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-white/10">{section.items.length}</span>
                </div>
                <div className="p-3 space-y-1 max-h-40 overflow-y-auto">
                  {section.items.length === 0 ? (
                    <p className="text-xs text-zinc-700">None detected</p>
                  ) : section.items.slice(0, 8).map(item => (
                    <div key={item} className="text-xs text-zinc-400 font-mono truncate py-0.5">{item}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Graph Area */}
          <div className="flex-1 bg-zinc-900/60 border border-white/8 rounded-2xl overflow-hidden">
            <div
              ref={containerRef}
              className="relative overflow-x-auto"
              style={{ height: Math.max(400, Math.max(...Object.values(positions).map(p => p.y)) + 120) }}
            >
              {/* SVG edges */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.2)" />
                  </marker>
                  <marker id="arrowhead-hover" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="rgba(99,102,241,0.8)" />
                  </marker>
                </defs>
                {edges.map((edge, idx) => {
                  const from = positions[edge.from];
                  const to = positions[edge.to];
                  if (!from || !to) return null;
                  return (
                    <line
                      key={idx}
                      x1={from.x + NODE_W} y1={from.y + NODE_H / 2}
                      x2={to.x} y2={to.y + NODE_H / 2}
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      markerEnd="url(#arrowhead)"
                    />
                  );
                })}
              </svg>

              {/* Node divs */}
              {nodes.map(node => {
                const pos = positions[node.id];
                if (!pos) return null;
                const colors = NODE_COLORS[node.type] ?? NODE_COLORS.service;
                const isSelected = selectedNode === node.id;
                const isHovered = hoveredNode === node.id;
                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNode(isSelected ? null : node.id)}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    className="absolute flex flex-col items-center justify-center rounded-xl text-center transition-all cursor-pointer"
                    style={{
                      left: pos.x, top: pos.y,
                      width: NODE_W, height: NODE_H,
                      background: colors.bg,
                      border: `1.5px solid ${isSelected ? colors.border : colors.border + '60'}`,
                      boxShadow: (isSelected || isHovered) ? `0 0 20px ${colors.glow}` : 'none',
                      transform: (isSelected || isHovered) ? 'scale(1.06)' : 'scale(1)',
                      zIndex: 2,
                    }}
                  >
                    <div className="text-lg">{node.type === 'frontend' ? '🖥' : node.type === 'backend' ? '⚙️' : node.type === 'database' ? '🗄' : node.type === 'auth' ? '🔐' : '🔌'}</div>
                    <div className="text-xs font-semibold leading-tight px-2 mt-0.5" style={{ color: colors.text }}>{node.label}</div>
                    <div className="text-[9px] mt-0.5" style={{ color: colors.text, opacity: 0.6 }}>{node.files.length} file{node.files.length !== 1 ? 's' : ''}</div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-5 py-3 border-t border-white/8 flex-wrap">
              {LEGEND.map(item => {
                const colors = NODE_COLORS[item.type];
                return (
                  <div key={item.type} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colors.border, opacity: 0.7 }} />
                    <span className="text-zinc-500">{item.label}</span>
                  </div>
                );
              })}
              <div className="ml-auto text-xs text-zinc-600">{nodes.length} nodes · {edges.length} connections</div>
            </div>
          </div>

          {/* File Panel */}
          <div className={`transition-all duration-300 ${selected ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
            {selected && (
              <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 h-full">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">{selected.label}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border mt-1 inline-block" style={{ borderColor: (NODE_COLORS[selected.type]?.border || '#fff') + '60', color: NODE_COLORS[selected.type]?.text }}>{selected.type}</span>
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="text-zinc-600 hover:text-white text-lg">×</button>
                </div>
                <p className="text-xs text-zinc-600 mb-2">{selected.files.length} file{selected.files.length !== 1 ? 's' : ''}</p>
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {selected.files.map(fp => (
                    <div key={fp} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-white/5">
                      <span className="text-zinc-600">📄</span>
                      <code className="text-zinc-400 truncate">{fp}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Entry Points', value: brain.architecture?.entryPoints?.length ?? 0, icon: '🚪' },
          { label: 'API Routes', value: brain.architecture?.apiRoutes?.length ?? 0, icon: '🛣' },
          { label: 'Components', value: brain.architecture?.components?.length ?? 0, icon: '🖼' },
          { label: 'DB Models', value: brain.architecture?.models?.length ?? 0, icon: '📦' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900/60 border border-white/8 rounded-xl p-4 flex items-center gap-3">
            <span className="text-xl">{s.icon}</span>
            <div>
              <div className="text-lg font-bold text-white">{s.value}</div>
              <div className="text-xs text-zinc-600">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
