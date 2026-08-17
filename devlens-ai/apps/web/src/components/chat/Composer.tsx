'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
      className="w-full max-w-4xl mx-auto px-4 pb-4 md:px-6 md:pb-6 shrink-0"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        className={`relative bg-[#121212] border rounded-lg transition-all ${
          isDragOver
            ? 'border-blue-500 bg-[#171717]'
            : 'border-[#262626] focus-within:border-neutral-700'
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
              : 'Ask CortexCode anything... (Enter to send, Shift+Enter for new line)'
          }
          className="w-full px-4 py-3 bg-transparent text-sm font-medium text-white placeholder-neutral-500 focus:outline-none resize-none overflow-y-auto max-h-48 font-sans"
        />

        {/* Bottom Bar: Left actions + Right send */}
        <div className="flex items-center justify-between px-3 pb-2.5">
          {/* Left: Attachment Actions */}
          <div className="flex items-center gap-1">
            {/* File Attachment */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach files"
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#1c1c1c] rounded transition-colors"
            >
              <Paperclip size={15} />
            </button>

            {/* Folder Upload */}
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              title="Upload a folder / project"
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#1c1c1c] rounded transition-colors"
            >
              <FolderOpen size={15} />
            </button>

            {/* Voice Input */}
            <VoiceInput onTranscript={handleVoiceTranscript} />
          </div>

          {/* Right: Stop / Send */}
          <div className="flex items-center gap-2">
            {attachedFiles.length > 0 && (
              <span className="text-[10px] font-mono text-neutral-400 mr-1">
                {attachedFiles.length} file{attachedFiles.length > 1 ? 's' : ''}
              </span>
            )}

            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGenerating}
                className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold transition-colors"
                title="Stop generating"
              >
                <Square size={11} className="fill-white" />
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-30 transition-colors flex items-center justify-center"
                title="Send message"
              >
                <Send size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hint Text */}
      <p className="text-center text-[10px] font-mono text-neutral-500 mt-2">
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
