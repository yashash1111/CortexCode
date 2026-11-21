'use client';

import React from 'react';
import {
  FileCode, FileText, FileImage, FileJson, File, X, FolderOpen,
  FileSpreadsheet, FileType, Music
} from 'lucide-react';
import type { AttachedFile } from './types';

interface FileAttachmentsProps {
  files: AttachedFile[];
  onRemove: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: AttachedFile['type'], mimeType: string) {
  if (type === 'image') return <FileImage size={16} className="text-blue-400 shrink-0" />;
  if (type === 'audio') return <Music size={16} className="text-pink-400 shrink-0" />;
  if (type === 'folder') return <FolderOpen size={16} className="text-amber-400 shrink-0" />;
  if (type === 'code') return <FileCode size={16} className="text-purple-400 shrink-0" />;
  if (type === 'data') return mimeType.includes('json')
    ? <FileJson size={16} className="text-yellow-400 shrink-0" />
    : <FileSpreadsheet size={16} className="text-green-400 shrink-0" />;
  if (type === 'document') return <FileText size={16} className="text-zinc-300 shrink-0" />;
  if (type === 'unsupported') return <FileType size={16} className="text-red-400 shrink-0" />;
  return <File size={16} className="text-zinc-400 shrink-0" />;
}

function getTypeBadge(type: AttachedFile['type']): { label: string; className: string } {
  switch (type) {
    case 'image': return { label: 'Image', className: 'bg-blue-950/60 text-blue-300 border-blue-700/40' };
    case 'audio': return { label: 'Audio', className: 'bg-pink-950/60 text-pink-300 border-pink-700/40' };
    case 'code': return { label: 'Code', className: 'bg-purple-950/60 text-purple-300 border-purple-700/40' };
    case 'data': return { label: 'Data', className: 'bg-yellow-950/60 text-yellow-300 border-yellow-700/40' };
    case 'document': return { label: 'Doc', className: 'bg-zinc-800/60 text-zinc-300 border-zinc-600/40' };
    case 'folder': return { label: 'Folder', className: 'bg-amber-950/60 text-amber-300 border-amber-700/40' };
    case 'unsupported': return { label: 'Unsupported', className: 'bg-red-950/60 text-red-300 border-red-700/40' };
    default: return { label: 'File', className: 'bg-zinc-800/60 text-zinc-400 border-zinc-700/40' };
  }
}

export default function FileAttachments({ files, onRemove }: FileAttachmentsProps) {
  if (files.length === 0) return null;

  return (
    <div className="px-4 pb-2 flex flex-wrap gap-2 animate-fade-in-up">
      {files.map(f => {
        const badge = getTypeBadge(f.type);

        return (
          <div
            key={f.id}
            className="group flex items-center gap-2.5 px-3 py-2 bg-zinc-900/80 border border-white/15 rounded-2xl backdrop-blur-md max-w-xs hover:border-purple-500/40 transition-all relative"
          >
            {/* Image Preview Thumbnail */}
            {f.type === 'image' && f.preview ? (
              <img
                src={f.preview}
                alt={f.name}
                className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0"
              />
            ) : (
              getFileIcon(f.type, f.mimeType)
            )}

            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-zinc-200 truncate max-w-[140px]">{f.name}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${badge.className}`}>
                  {badge.label}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {f.isFolder ? `${f.folderContents?.length ?? 0} files` : formatBytes(f.size)}
                </span>
              </div>
              {f.type === 'unsupported' && (
                <span className="text-[10px] text-red-400 mt-0.5">Not supported yet</span>
              )}
            </div>

            {/* Remove Button */}
            <button
              type="button"
              onClick={() => onRemove(f.id)}
              className="ml-1 p-0.5 text-zinc-500 hover:text-red-400 transition-colors shrink-0"
              title="Remove"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
