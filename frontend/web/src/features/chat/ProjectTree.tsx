'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileCode, FileText, FileImage, FileJson, File } from 'lucide-react';
import type { FolderFile } from './types';

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  file?: FolderFile;
}

function buildTree(files: FolderFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  files.forEach(file => {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const existing = current.find(n => n.name === part);

      if (existing) {
        current = existing.children;
      } else {
        const node: TreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isDir: !isLast,
          children: [],
          file: isLast ? file : undefined
        };
        current.push(node);
        current = node.children;
      }
    }
  });

  return root;
}

function getFileIcon(file?: FolderFile) {
  if (!file) return <Folder size={14} className="text-amber-400 shrink-0" />;
  switch (file.type) {
    case 'code': return <FileCode size={14} className="text-purple-400 shrink-0" />;
    case 'image': return <FileImage size={14} className="text-blue-400 shrink-0" />;
    case 'data': return <FileJson size={14} className="text-yellow-400 shrink-0" />;
    case 'document': return <FileText size={14} className="text-zinc-300 shrink-0" />;
    default: return <File size={14} className="text-zinc-500 shrink-0" />;
  }
}

interface TreeNodeProps {
  node: TreeNode;
  depth: number;
}

function TreeNodeItem({ node, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 w-full py-0.5 hover:text-white text-zinc-300 transition-colors text-xs"
          style={{ paddingLeft: `${depth * 14}px` }}
        >
          {expanded
            ? <ChevronDown size={12} className="text-zinc-500 shrink-0" />
            : <ChevronRight size={12} className="text-zinc-500 shrink-0" />
          }
          {expanded
            ? <FolderOpen size={14} className="text-amber-400 shrink-0" />
            : <Folder size={14} className="text-amber-500 shrink-0" />
          }
          <span className="font-semibold truncate">{node.name}</span>
        </button>
        {expanded && (
          <div>
            {node.children.map((child, i) => (
              <TreeNodeItem key={i} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 py-0.5 text-zinc-400 text-xs"
      style={{ paddingLeft: `${depth * 14 + 14}px` }}
    >
      {getFileIcon(node.file)}
      <span className="truncate hover:text-zinc-200 transition-colors">{node.name}</span>
    </div>
  );
}

interface ProjectTreeProps {
  folderName: string;
  files: FolderFile[];
}

export default function ProjectTree({ folderName, files }: ProjectTreeProps) {
  const [expanded, setExpanded] = useState(true);
  const tree = buildTree(files);

  return (
    <div className="mt-3 p-3 bg-zinc-900/80 border border-white/10 rounded-2xl">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-bold text-amber-300 hover:text-amber-200 transition-colors w-full"
      >
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <FolderOpen size={14} className="text-amber-400" />
        <span>{folderName}</span>
        <span className="ml-auto text-zinc-500 font-normal">{files.length} files</span>
      </button>
      {expanded && (
        <div className="mt-2 border-t border-white/5 pt-2 max-h-48 overflow-y-auto custom-scrollbar">
          {tree.map((node, i) => (
            <TreeNodeItem key={i} node={node} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}
