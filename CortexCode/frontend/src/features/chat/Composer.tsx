'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Square, Paperclip, FolderOpen, Sparkles, ChevronDown, Check,
  SlidersHorizontal, MessageSquare, Bug, BookOpen, FileText, Search
} from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import FileAttachments from './FileAttachments';
import VoiceInput from './VoiceInput';
import type { ChatMode } from './ModeSelector';
import {
  detectFileType, readFileAsText, readFileAsDataURL,
  isTextReadable, generateFileId, IGNORED_FOLDERS,
  type AttachedFile, type FolderFile
} from './types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

const SUPPORTED_ACCEPT = [
  '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.go',
  '.rs', '.php', '.rb', '.html', '.css', '.scss', '.sql', '.sh', '.yaml', '.yml',
  '.json', '.xml', '.csv', '.md', '.txt', '.log', '.env', '.toml', '.ini',
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif', '.heic',
  '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm',
  '.pdf', '.doc', '.docx', '.xlsx'
].join(',');

interface ComposerProps {
  inputMessage: string;
  setInputMessage: (val: string) => void;
  onSend: (customMessage?: string, files?: AttachedFile[]) => void;
  isGenerating: boolean;
  onStopGenerating: () => void;
  attachedFiles: AttachedFile[];
  setAttachedFiles: (files: AttachedFile[]) => void;
  onDragStateChange?: (isDragging: boolean) => void;
  activeMode?: ChatMode;
  onModeChange?: (mode: ChatMode) => void;
  selectedModel?: string;
  onSelectModel?: (model: string) => void;
  tokensUsed?: number;
}

const MODE_PLACEHOLDERS: Record<ChatMode, string> = {
  chat: 'Ask CortexCode anything... (Use @ to add files, / for commands)',
  debug: 'Paste your code and error message to debug...',
  explain: 'What concept or code should I explain?',
  notes: 'Enter a topic or attach study material...',
  review: 'Attach code or a repository to review...',
};

const COMPOSER_MODELS = [
  'CortexCode AI (GPT-4o)',
  'CortexCode AI (Gemini Pro)',
  'CortexCode AI (Claude 3.5)',
  'CortexCode AI (DeepSeek R1)',
];

const TOOL_MODES: Array<{ id: ChatMode; label: string; desc: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { id: 'chat', label: 'AI Chat', desc: 'General developer assistant', icon: MessageSquare },
  { id: 'debug', label: 'Debug Mode', desc: 'Diagnose and fix errors', icon: Bug },
  { id: 'explain', label: 'Explain Mode', desc: 'Break down concepts', icon: BookOpen },
  { id: 'notes', label: 'Study Notes', desc: 'Structured notes & summaries', icon: FileText },
  { id: 'review', label: 'Code Review', desc: 'Security & quality audit', icon: Search },
];

export default function Composer({
  inputMessage,
  setInputMessage,
  onSend,
  isGenerating,
  onStopGenerating,
  attachedFiles,
  setAttachedFiles,
  onDragStateChange,
  activeMode = 'chat',
  onModeChange,
  selectedModel,
  onSelectModel,
  tokensUsed,
}: ComposerProps) {
  const toast = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputMessage]);

  const processFile = useCallback(async (file: File, relativePath?: string): Promise<AttachedFile | null> => {
    if (file.size > MAX_FILE_SIZE) {
      toast.showInfo('File Too Large', `${file.name} exceeds 10MB limit.`);
      return null;
    }

    const type = detectFileType(file.name, file.type);
    const id = generateFileId();
    const attached: AttachedFile = {
      id,
      file,
      name: relativePath || file.name,
      type,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
    };

    if (type === 'image') {
      try {
        attached.preview = await readFileAsDataURL(file);
      } catch { /* skip preview */ }
    } else if (type === 'audio') {
      try {
        attached.audioUrl = await readFileAsDataURL(file);
      } catch { /* skip audio */ }
    } else if (isTextReadable(type)) {
      try {
        attached.extractedText = await readFileAsText(file);
      } catch { /* skip text extraction */ }
    }

    return attached;
  }, [toast]);

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (attachedFiles.length + files.length > MAX_FILES) {
      toast.showInfo('Too Many Files', `You can attach up to ${MAX_FILES} files per message.`);
      return;
    }

    const processed: AttachedFile[] = [];
    for (const file of files) {
      const result = await processFile(file);
      if (result) processed.push(result);
    }

    if (processed.length > 0) {
      setAttachedFiles([...attachedFiles, ...processed]);
      toast.showSuccess(
        processed.length === 1 ? 'File Attached' : `${processed.length} Files Attached`,
        processed.map(f => f.name).join(', ')
      );
    }
  }, [attachedFiles, processFile, setAttachedFiles, toast]);

  const processFolderFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList);

    // Filter ignored folders
    const validFiles = files.filter(file => {
      const pathParts = (file as File & { webkitRelativePath?: string }).webkitRelativePath?.split('/') || [];
      return !pathParts.some((part: string) => IGNORED_FOLDERS.has(part));
    });

    if (validFiles.length === 0) {
      toast.showInfo('Empty Folder', 'No valid source files found in the selected folder.');
      return;
    }

    const folderName = (validFiles[0] as File & { webkitRelativePath?: string }).webkitRelativePath?.split('/')[0] || 'Project';

    const folderContents: FolderFile[] = [];
    for (const file of validFiles) {
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      const type = detectFileType(file.name, file.type);
      const folderFile: FolderFile = {
        path: relativePath,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'text/plain',
        type: type === 'folder' ? 'code' : (type as FolderFile['type']),
      };

      if (isTextReadable(type) && file.size < 500 * 1024) { // Read files < 500KB
        try { folderFile.extractedText = await readFileAsText(file); } catch { /* skip */ }
      }

      folderContents.push(folderFile);
    }

    const totalSize = validFiles.reduce((sum, f) => sum + f.size, 0);
    const folderAttachment: AttachedFile = {
      id: generateFileId(),
      file: validFiles[0],
      name: folderName,
      type: 'folder',
      mimeType: 'inode/directory',
      size: totalSize,
      isFolder: true,
      folderName,
      folderContents
    };

    setAttachedFiles([...attachedFiles, folderAttachment]);
    toast.showSuccess('Folder Attached', `${folderName} — ${validFiles.length} files ready`);
  }, [attachedFiles, setAttachedFiles, toast]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFolderFiles(e.target.files);
      e.target.value = '';
    }
  };

  const [isDragOver, setIsDragOver] = useState(false);

  // Drag and Drop Handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDragOver(true);
      onDragStateChange?.(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
      onDragStateChange?.(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    onDragStateChange?.(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const handleRemoveFile = (id: string) => {
    setAttachedFiles(attachedFiles.filter(f => f.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((inputMessage.trim() || attachedFiles.length > 0) && !isGenerating) {
        handleSend();
      }
    }
  };

  const handleSend = () => {
    if ((!inputMessage.trim() && attachedFiles.length === 0) || isGenerating) return;
    onSend(inputMessage || undefined, attachedFiles.length > 0 ? attachedFiles : undefined);
  };

  const handleVoiceTranscript = (text: string) => {
    setInputMessage(inputMessage ? inputMessage + ' ' + text : text);
    textareaRef.current?.focus();
  };

  const canSend = (inputMessage.trim().length > 0 || attachedFiles.length > 0) && !isGenerating;

  return (
    <div
      className="w-full max-w-4xl mx-auto px-3 pb-3 md:px-6 md:pb-5 shrink-0 relative z-20"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Floating Stop Generating Pill (matches reference) */}
      {isGenerating && (
        <div className="flex justify-start mb-2.5">
          <button
            type="button"
            onClick={onStopGenerating}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-strong)] text-xs font-medium text-[var(--text-primary)] shadow-md transition-colors cursor-pointer"
          >
            <Square size={11} className="fill-current text-[var(--text-primary)]" />
            <span>Stop generating</span>
          </button>
        </div>
      )}

      <div
        className={`relative bg-[var(--bg-card)] backdrop-blur-xl border rounded-2xl transition-all shadow-lg ${
          isDragOver
            ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-soft)]'
            : 'border-[var(--border-strong)] focus-within:border-[var(--accent-primary)]'
        }`}
      >
        {/* File Attachments Strip */}
        <FileAttachments files={attachedFiles} onRemove={handleRemoveFile} />

        {/* Textarea Input */}
        <textarea
          ref={textareaRef}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={
            attachedFiles.length > 0
              ? `Ask about ${attachedFiles.length === 1 ? attachedFiles[0].name : `${attachedFiles.length} files`}...`
              : MODE_PLACEHOLDERS[activeMode]
          }
          className="w-full px-4 pt-3.5 pb-2 bg-transparent text-sm font-medium text-[var(--text-primary)] placeholder-[var(--input-placeholder)] focus:outline-none resize-none overflow-y-auto max-h-48 font-sans"
        />

        {/* Bottom Bar: Left actions + Right model & send */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1 gap-2 flex-wrap">
          {/* Left: Attachment Actions + Tools */}
          <div className="flex items-center gap-1 relative">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach files"
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-xl transition-colors cursor-pointer"
            >
              <Paperclip size={15} />
            </button>

            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              title="Upload a folder / project"
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-xl transition-colors cursor-pointer"
            >
              <FolderOpen size={15} />
            </button>

            <VoiceInput onTranscript={handleVoiceTranscript} />

            {onModeChange && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowToolsMenu((v) => !v);
                    setShowModelMenu(false);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer ml-1"
                >
                  <SlidersHorizontal size={13} className="text-[var(--accent-primary)]" />
                  <span>Tools</span>
                  <ChevronDown size={12} className="text-[var(--text-muted)]" />
                </button>

                {showToolsMenu && (
                  <div className="absolute bottom-11 left-0 w-56 bg-[var(--dropdown-bg)] border border-[var(--dropdown-border)] rounded-xl p-1.5 shadow-2xl z-50">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] px-2.5 py-1">
                      AI Assistant Mode
                    </div>
                    {TOOL_MODES.map((m) => {
                      const Icon = m.icon;
                      const isActive = activeMode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            onModeChange(m.id);
                            setShowToolsMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${
                            isActive
                              ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-semibold'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Icon size={13} />
                            <span>{m.label}</span>
                          </span>
                          {isActive && <Check size={12} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Model Selector + Send */}
          <div className="flex items-center gap-2 ml-auto">
            {attachedFiles.length > 0 && (
              <span className="text-[11px] font-mono text-[var(--text-muted)] mr-1">
                {attachedFiles.length} file{attachedFiles.length > 1 ? 's' : ''}
              </span>
            )}

            {selectedModel && onSelectModel && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowModelMenu((v) => !v);
                    setShowToolsMenu(false);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <Sparkles size={13} className="text-[var(--accent-primary)] shrink-0" />
                  <span className="hidden sm:inline truncate max-w-[140px]">
                    {selectedModel.replace('CortexCode AI (', '').replace(')', '')}
                  </span>
                  <ChevronDown size={12} className="text-[var(--text-muted)]" />
                </button>

                {showModelMenu && (
                  <div className="absolute bottom-11 right-0 w-60 bg-[var(--dropdown-bg)] border border-[var(--dropdown-border)] rounded-xl p-1.5 shadow-2xl z-50">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] px-2.5 py-1">
                      Select AI Model
                    </div>
                    {COMPOSER_MODELS.map((model) => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => {
                          onSelectModel(model);
                          setShowModelMenu(false);
                          toast.showSuccess('Model Switched', `Now using ${model}`);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                          selectedModel === model
                            ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span>{model}</span>
                        {selectedModel === model && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="p-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl disabled:opacity-35 transition-all shadow-md shadow-violet-600/25 flex items-center justify-center cursor-pointer"
              title="Send message"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="flex items-center justify-between px-2 mt-2 text-[11px] text-[var(--text-muted)] gap-2 flex-wrap">
        <span className="hidden sm:inline">Enter to send · Shift+Enter for new line · Drag files to attach</span>
        <div className="flex items-center gap-3 ml-auto font-mono">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--status-success)]" />
            <span>All systems operational</span>
          </span>
          {typeof tokensUsed === 'number' && (
            <span className="text-[var(--text-secondary)]">
              {tokensUsed.toLocaleString()} tokens this month
            </span>
          )}
        </div>
      </div>

      {/* Hidden Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        accept={SUPPORTED_ACCEPT}
      />
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderChange}
        className="hidden"
        {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
        multiple
      />
    </div>
  );
}
