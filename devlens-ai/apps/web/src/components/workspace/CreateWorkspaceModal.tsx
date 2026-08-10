'use client';

import { useState, useRef } from 'react';
import { createWorkspace, WorkspaceBrainData } from '@/lib/workspaceApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (brain: WorkspaceBrainData) => void;
}

const SCAN_STEPS = [
  'Scanning project structure...',
  'Analyzing tech stack & dependencies...',
  'Detecting architecture patterns...',
  'Running security & quality checks...',
  'Building Project Brain...',
  'Generating health scores...',
  'Project Brain ready! ✅',
];

export default function CreateWorkspaceModal({ isOpen, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const arr = Array.from(fileList);
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const newOnes = arr.filter(f => !existing.has(f.name + f.size));
      return [...prev, ...newOnes];
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Please enter a workspace name.'); return; }
    setError('');
    setStatus('analyzing');
    setStepIndex(0);

    // Animate scan steps
    for (let i = 0; i < SCAN_STEPS.length - 1; i++) {
      await new Promise(r => setTimeout(r, 700));
      setStepIndex(i + 1);
    }

    const brain = await createWorkspace(name.trim(), description.trim(), files);
    if (!brain) {
      setStatus('error');
      setError('Failed to create workspace. Please check that the API server is running.');
      return;
    }

    setStepIndex(SCAN_STEPS.length - 1);
    setStatus('done');
    await new Promise(r => setTimeout(r, 800));
    onCreate(brain);
    onClose();
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={status === 'idle' ? onClose : undefined} />
      <div className="relative z-10 w-full max-w-xl bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div>
            <h2 className="text-xl font-bold text-white">Create Workspace</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Upload your codebase to build a Project Brain</p>
          </div>
          {status === 'idle' && (
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">✕</button>
          )}
        </div>

        <div className="p-6 space-y-5">
          {status === 'idle' ? (
            <>
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Workspace Name <span className="text-red-400">*</span></label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. My E-Commerce App"
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/60 text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description <span className="text-zinc-600">(optional)</span></label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What does this project do?"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/60 text-sm resize-none"
                />
              </div>

              {/* Dropzone */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Upload Codebase <span className="text-zinc-600">(optional — adds Project Brain)</span></label>
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging ? 'border-blue-500 bg-blue-600/10' : 'border-white/15 hover:border-blue-500/40 hover:bg-white/3'}`}
                >
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
                  <div className="text-3xl mb-2">📂</div>
                  <p className="text-zinc-400 text-sm">Drop your files or <span className="text-blue-400">browse</span></p>
                  <p className="text-zinc-600 text-xs mt-1">Supports any source files, up to 200 files</p>
                </div>

                {/* File list */}
                {files.length > 0 && (
                  <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                    {files.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/60 border border-white/6 rounded-lg text-xs">
                        <span className="text-zinc-300 truncate flex-1">{f.name}</span>
                        <span className="text-zinc-600 ml-2 flex-shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                        <button onClick={() => removeFile(idx)} className="ml-2 text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0">✕</button>
                      </div>
                    ))}
                    <p className="text-zinc-600 text-xs px-1">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
                  </div>
                )}
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </>
          ) : (
            /* Scanning Progress */
            <div className="py-4 space-y-4">
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-4xl animate-pulse">🧠</div>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">Building Project Brain...</p>
                <p className="text-zinc-400 text-sm mt-1">{SCAN_STEPS[stepIndex]}</p>
              </div>
              <div className="space-y-2">
                {SCAN_STEPS.map((step, i) => (
                  <div key={i} className={`flex items-center gap-3 text-sm ${i <= stepIndex ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs border ${i < stepIndex ? 'bg-blue-600 border-blue-500' : i === stepIndex ? 'border-blue-400 animate-pulse' : 'border-zinc-700'}">
                      {i < stepIndex ? '✓' : i === stepIndex ? '⟳' : '○'}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
              {status === 'error' && <p className="text-red-400 text-sm text-center">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        {status === 'idle' && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/8">
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/30"
            >
              🧠 Build Project Brain
            </button>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/8">
            <button onClick={() => setStatus('idle')} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors">Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}
