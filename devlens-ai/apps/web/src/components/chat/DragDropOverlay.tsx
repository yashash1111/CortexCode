'use client';

import React from 'react';
import { Upload, FileCode, FolderOpen } from 'lucide-react';

interface DragDropOverlayProps {
  isActive: boolean;
}

export default function DragDropOverlay({ isActive }: DragDropOverlayProps) {
  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-40 pointer-events-none">
      {/* Background Blur Overlay */}
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />

      {/* Animated Drop Zone */}
      <div className="absolute inset-6 rounded-3xl border-2 border-dashed border-purple-500 flex flex-col items-center justify-center gap-4 animate-pulse-border">
        {/* Glow Effect */}
        <div className="absolute inset-0 rounded-3xl bg-purple-600/10" />

        {/* Icon Stack */}
        <div className="relative flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-600/20 border border-purple-500/40">
            <FolderOpen size={28} className="text-purple-300" />
          </div>
          <div className="p-3 rounded-2xl bg-blue-600/20 border border-blue-500/40">
            <FileCode size={28} className="text-blue-300" />
          </div>
          <div className="p-4 rounded-2xl bg-white/10 border border-white/20 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
            <Upload size={32} className="text-white" />
          </div>
        </div>

        <div className="relative text-center">
          <p className="text-2xl font-black text-white tracking-tight">Drop files here</p>
          <p className="text-sm text-zinc-400 mt-1">Release to attach files, images, or folders to your message</p>
        </div>

        <div className="flex gap-2 flex-wrap justify-center mt-2 relative">
          {['Code', 'Images', 'JSON', 'CSV', 'Text', 'Folders'].map(type => (
            <span
              key={type}
              className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[11px] font-bold text-zinc-300"
            >
              {type}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
