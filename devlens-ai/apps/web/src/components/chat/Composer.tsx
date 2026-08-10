'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { Send, Square, Paperclip, FolderOpen } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import FileAttachments from './FileAttachments';
import VoiceInput from './VoiceInput';
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
  '.png', '.jpg', '.jpeg', '.webp', '.gif',
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
}

export default function Composer({
  inputMessage,
  setInputMessage,
  onSend,
  isGenerating,
  onStopGenerating,
  attachedFiles,
  setAttachedFiles,
  onDragStateChange
}: ComposerProps) {
  const toast = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

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
      const pathParts = (file as unknown).webkitRelativePath?.split('/') || [];
      return !pathParts.some((part: string) => IGNORED_FOLDERS.has(part));
    });

    if (validFiles.length === 0) {
      toast.showInfo('Empty Folder', 'No valid source files found in the selected folder.');
      return;
    }

    const folderName = (validFiles[0] as unknown).webkitRelativePath?.split('/')[0] || 'Project';

    const folderContents: FolderFile[] = [];
    for (const file of validFiles) {
      const relativePath = (file as unknown).webkitRelativePath || file.name;
      const type = detectFileType(file.name, file.type);
      const folderFile: FolderFile = {
        path: relativePath,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'text/plain',
        type: type === 'folder' ? 'code' : type as unknown,
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

  // Drag and Drop Handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) onDragStateChange?.(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) onDragStateChange?.(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
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
      className="w-full max-w-4xl mx-auto px-4 pb-4 md:px-6 md:pb-6 shrink-0"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* File Attachment Preview Strip */}
      <FileAttachments files={attachedFiles} onRemove={handleRemoveFile} />

      {/* Main Composer Box */}
      <div className="relative bg-zinc-900/90 border border-white/20 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl focus-within:border-purple-500/60 transition-all">

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={
            attachedFiles.length > 0
              ? `Ask about ${attachedFiles.length === 1 ? attachedFiles[0].name : `${attachedFiles.length} files`}...`
              : 'Ask CortexCode anything... (Enter to send, Shift+Enter for new line)'
          }
          className="w-full px-5 py-3.5 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none resize-none overflow-y-auto max-h-48 font-sans"
        />

        {/* Bottom Bar: Left actions + Right send */}
        <div className="flex items-center justify-between px-3 pb-3">
          {/* Left: Attachment Actions */}
          <div className="flex items-center gap-1">
            {/* File Attachment */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach files"
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <Paperclip size={17} />
            </button>

            {/* Folder Upload */}
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              title="Upload a folder / project"
              className="p-2 text-zinc-400 hover:text-amber-300 hover:bg-amber-950/20 rounded-xl transition-colors"
            >
              <FolderOpen size={17} />
            </button>

            {/* Voice Input */}
            <VoiceInput onTranscript={handleVoiceTranscript} />
          </div>

          {/* Right: Stop / Send */}
          <div className="flex items-center gap-2">
            {attachedFiles.length > 0 && (
              <span className="text-[10px] text-zinc-500 font-medium mr-1">
                {attachedFiles.length} file{attachedFiles.length > 1 ? 's' : ''}
              </span>
            )}

            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGenerating}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-xs font-bold transition-all shadow-md"
                title="Stop generating"
              >
                <Square size={13} className="fill-white" />
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className="p-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:via-pink-500 hover:to-blue-500 text-white rounded-2xl disabled:opacity-30 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center transform active:scale-95"
                title="Send message"
              >
                <Send size={17} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hint Text */}
      <p className="text-center text-[10px] text-zinc-600 mt-2">
        Enter to send · Shift+Enter for new line · Drag files to attach
      </p>

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
        {...({ webkitdirectory: '', directory: '' } as unknown)}
        multiple
      />
    </div>
  );
}
