'use client';

import React, { useMemo, useState } from 'react';
import { Network, Filter } from 'lucide-react';

interface GraphFile {
  id: string;
  path: string;
  language?: string | null;
  symbols?: Array<{ name: string; type: string; startLine: number; endLine: number }>;
  imports?: string[];
}

interface GraphEdge {
  id: string;
  sourceFile: string;
  sourceSymbol?: string | null;
  targetFile: string;
  targetSymbol?: string | null;
  edgeType: string;
}

export function RepoGraphViewer({
  files,
  edges,
}: {
  files: GraphFile[];
  edges: GraphEdge[];
}) {
  const [selectedFile, setSelectedFile] = useState<string | null>(files[0]?.path || null);
  const [edgeFilter, setEdgeFilter] = useState<string>('all');

  const filteredEdges = useMemo(() => {
    return edges.filter((e) => edgeFilter === 'all' || e.edgeType === edgeFilter);
  }, [edges, edgeFilter]);

  const activeFileObj = files.find((f) => f.path === selectedFile) || files[0] || null;
  const relatedEdges = useMemo(() => {
    if (!activeFileObj) return [];
    return filteredEdges.filter(
      (e) => e.sourceFile === activeFileObj.path || e.targetFile === activeFileObj.path
    );
  }, [filteredEdges, activeFileObj]);

  // Layout top 16 nodes in a clean circular SVG graph
  const graphNodes = useMemo(() => {
    const uniqueNames = Array.from(
      new Set([
        ...files.slice(0, 12).map((f) => f.path),
        ...filteredEdges.slice(0, 12).map((e) => e.targetFile),
      ])
    ).slice(0, 16);

    const cx = 260;
    const cy = 180;
    const r = 130;
    return uniqueNames.map((name, idx) => {
      const angle = (idx / Math.max(1, uniqueNames.length)) * Math.PI * 2 - Math.PI / 2;
      return {
        id: name,
        label: name.split('/').pop() || name,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    });
  }, [files, filteredEdges]);

  const nodePos = useMemo(() => new Map(graphNodes.map((n) => [n.id, n])), [graphNodes]);

  if (files.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 p-12 text-center">
        <Network className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
        <p className="text-sm font-medium text-zinc-200">No dependency graph indexed yet</p>
        <p className="text-xs text-zinc-500 mt-1">
          Index a repository first to extract Tree-sitter symbols, imports, routes, and database models.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Interactive SVG Graph */}
      <div className="lg:col-span-7 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
            <Network className="w-4 h-4 text-blue-400" />
            Codebase Intelligence Graph ({files.length} files, {edges.length} edges)
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={edgeFilter}
              onChange={(e) => setEdgeFilter(e.target.value)}
              className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-300"
            >
              <option value="all">All Edges</option>
              <option value="import">Imports</option>
              <option value="call">Calls</option>
              <option value="route">API Routes</option>
              <option value="model">DB Models</option>
            </select>
          </div>
        </div>

        <svg viewBox="0 0 520 360" className="w-full h-[360px] rounded-lg bg-zinc-950/80 border border-zinc-800/60">
          {filteredEdges.slice(0, 60).map((e) => {
            const s = nodePos.get(e.sourceFile);
            const t = nodePos.get(e.targetFile);
            if (!s || !t || s.id === t.id) return null;
            const highlighted = activeFileObj && (e.sourceFile === activeFileObj.path || e.targetFile === activeFileObj.path);
            return (
              <line
                key={e.id}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={highlighted ? '#60a5fa' : '#3f3f46'}
                strokeWidth={highlighted ? 1.8 : 0.9}
                strokeOpacity={highlighted ? 0.9 : 0.45}
              />
            );
          })}
          {graphNodes.map((n) => {
            const isSelected = activeFileObj?.path === n.id;
            return (
              <g
                key={n.id}
                onClick={() => setSelectedFile(n.id)}
                className="cursor-pointer"
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={isSelected ? 10 : 7}
                  fill={isSelected ? '#3b82f6' : '#27272a'}
                  stroke={isSelected ? '#93c5fd' : '#71717a'}
                  strokeWidth={1.5}
                />
                <text
                  x={n.x}
                  y={n.y + 19}
                  textAnchor="middle"
                  className="fill-zinc-300 text-[9px] font-mono select-none"
                >
                  {n.label.slice(0, 18)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* File & Symbol Inspector */}
      <div className="lg:col-span-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-4 max-h-[430px] overflow-y-auto">
        <div>
          <label className="block text-[11px] font-medium text-zinc-400 mb-1">Inspect File</label>
          <select
            value={activeFileObj?.path || ''}
            onChange={(e) => setSelectedFile(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-mono text-zinc-200"
          >
            {files.map((f) => (
              <option key={f.id} value={f.path}>
                {f.path}
              </option>
            ))}
          </select>
        </div>

        {activeFileObj && (
          <>
            <div>
              <h4 className="text-xs font-semibold text-zinc-200 mb-1.5">
                Symbols ({activeFileObj.symbols?.length || 0})
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {(activeFileObj.symbols || []).map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800/80 text-[11px] font-mono"
                  >
                    <span className="text-zinc-200">{s.name}</span>
                    <span className="text-zinc-500">
                      L{s.startLine}-{s.endLine}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-zinc-200 mb-1.5">
                Relationships ({relatedEdges.length})
              </h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {relatedEdges.map((e) => (
                  <div
                    key={e.id}
                    className="px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800/80 text-[11px] font-mono text-zinc-300"
                  >
                    <span className="text-blue-400">[{e.edgeType}]</span>{' '}
                    {e.sourceSymbol ? `${e.sourceSymbol} → ` : ''}
                    {e.targetSymbol || e.targetFile}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
