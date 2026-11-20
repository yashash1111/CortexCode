'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, Image as ImageIcon, Music, Folder, Code,
  Eye, Download, Play, Pause, X, ChevronDown, ChevronRight,
  FileCode, ExternalLink, Copy, Check
} from 'lucide-react';
import { formatBytes, type AttachedFile, type FolderFile } from './types';

interface AttachmentViewerProps {
  attachments?: AttachedFile[];
  isUser?: boolean;
}

export default function AttachmentViewer({ attachments, isUser = false }: AttachmentViewerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFileText, setSelectedFileText] = useState<{ name: string; content: string } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [copiedFile, setCopiedFile] = useState(false);

  if (!attachments || attachments.length === 0) return null;

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleCopyText = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  const images = attachments.filter(a => a.type === 'image' || !!a.preview);
  const audios = attachments.filter(a => a.type === 'audio' || !!a.audioUrl);
  const folders = attachments.filter(a => a.isFolder || a.type === 'folder');
  const documents = attachments.filter(
    a => a.type !== 'image' && a.type !== 'audio' && !a.isFolder && a.type !== 'folder' && !a.preview
  );

  return (
    <div className="my-2.5 space-y-2.5">
      {/* ── 1. Images Grid & Visualization ── */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {images.map((img) => (
            <div
              key={img.id || img.name}
              className="group relative overflow-hidden rounded-2xl border border-white/15 bg-black/40 shadow-lg transition-all hover:border-purple-500/50 hover:shadow-purple-500/10"
            >
              {img.preview ? (
                <div
                  onClick={() => setSelectedImage(img.preview!)}
                  className="cursor-pointer relative aspect-video w-full overflow-hidden bg-zinc-950 flex items-center justify-center"
                >
                  <img
                    src={img.preview}
                    alt={img.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="p-2 rounded-full bg-black/70 text-white shadow">
                      <Eye size={16} />
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 flex items-center gap-3">
                  <ImageIcon size={20} className="text-purple-400 shrink-0" />
                  <span className="text-xs font-semibold truncate text-zinc-200">{img.name}</span>
                </div>
              )}

              <div className="p-2 bg-zinc-950/80 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="font-medium truncate text-zinc-300 max-w-[140px]" title={img.name}>
                  {img.name}
                </span>
                <span className="text-zinc-500 font-mono text-[10px] shrink-0">
                  {formatBytes(img.size)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 2. Audio Players & Visualization ── */}
      {audios.length > 0 && (
        <div className="space-y-2">
          {audios.map((aud) => (
            <AudioPlayerItem key={aud.id || aud.name} audio={aud} />
          ))}
        </div>
      )}

      {/* ── 3. Folder Trees & Directory Visualization ── */}
      {folders.length > 0 && (
        <div className="space-y-2">
          {folders.map((folder) => {
            const isExpanded = expandedFolders[folder.id || folder.name];
            const count = folder.folderFileCount || folder.folderContents?.length || 0;
            return (
              <div
                key={folder.id || folder.name}
                className="rounded-2xl border border-white/15 bg-zinc-950/60 overflow-hidden shadow-md"
              >
                <div
                  onClick={() => toggleFolder(folder.id || folder.name)}
                  className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Folder size={16} className="text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-zinc-200 truncate">
                      {folder.folderName || folder.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold shrink-0">
                      {count} file{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <button className="text-zinc-400 hover:text-white p-1">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </div>

                {isExpanded && folder.folderContents && (
                  <div className="px-3 pb-3 pt-1 border-t border-white/10 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                    {folder.folderContents.map((file, idx) => (
                      <div
                        key={idx}
                        onClick={() => file.extractedText && setSelectedFileText({ name: file.name, content: file.extractedText })}
                        className={`flex items-center justify-between py-1 px-2 rounded-lg text-xs transition ${
                          file.extractedText ? 'hover:bg-purple-950/40 cursor-pointer text-purple-200' : 'text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {file.type === 'code' ? (
                            <Code size={13} className="text-blue-400 shrink-0" />
                          ) : (
                            <FileText size={13} className="text-zinc-400 shrink-0" />
                          )}
                          <span className="truncate font-mono text-[11px]">{file.path || file.name}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono shrink-0 ml-2">
                          {formatBytes(file.size)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 4. Code & Document File Chips ── */}
      {documents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {documents.map((doc) => (
            <div
              key={doc.id || doc.name}
              onClick={() => doc.extractedText && setSelectedFileText({ name: doc.name, content: doc.extractedText })}
              className={`flex items-center gap-2 py-1.5 px-3 rounded-xl border border-white/15 bg-zinc-900/80 shadow-md transition ${
                doc.extractedText ? 'hover:border-purple-500/60 hover:bg-purple-950/30 cursor-pointer' : ''
              }`}
              title={doc.extractedText ? 'Click to inspect text content' : doc.name}
            >
              {doc.type === 'code' ? (
                <FileCode size={14} className="text-blue-400 shrink-0" />
              ) : (
                <FileText size={14} className="text-emerald-400 shrink-0" />
              )}
              <span className="text-xs font-semibold text-zinc-200 max-w-[160px] truncate">
                {doc.name}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {formatBytes(doc.size)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Image Fullscreen Lightbox Modal ── */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in-up"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl border border-white/20 bg-zinc-950 shadow-2xl flex flex-col"
          >
            <div className="p-3 bg-zinc-900/90 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <ImageIcon size={15} className="text-purple-400" />
                Image Preview
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={selectedImage}
                  download="cortexcode-attachment.png"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition"
                  title="Download Image"
                >
                  <Download size={14} />
                </a>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/80 max-h-[75vh] overflow-auto">
              <img
                src={selectedImage}
                alt="Enlarged Attachment"
                className="max-h-[70vh] w-auto object-contain rounded-xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Code / Text File Inspector Modal ── */}
      {selectedFileText && (
        <div
          onClick={() => setSelectedFileText(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in-up"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[80vh] overflow-hidden rounded-3xl border border-white/20 bg-zinc-950 shadow-2xl flex flex-col"
          >
            <div className="p-4 bg-zinc-900/90 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <FileCode size={15} className="text-blue-400" />
                {selectedFileText.name}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyText(selectedFileText.content)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-bold transition"
                >
                  {copiedFile ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedFile ? 'Copied' : 'Copy Content'}</span>
                </button>
                <button
                  onClick={() => setSelectedFileText(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
            <pre className="p-5 text-xs font-mono text-zinc-200 overflow-auto bg-black/90 leading-relaxed custom-scrollbar max-h-[65vh]">
              <code>{selectedFileText.content}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Interactive Audio Player Item with Waveform Animation
 */
function AudioPlayerItem({ audio }: { audio: AttachedFile }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl border border-white/15 bg-zinc-950/80 shadow-md">
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shrink-0 shadow-lg hover:scale-105 transition"
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-semibold text-zinc-200 truncate flex items-center gap-1.5">
            <Music size={12} className="text-pink-400" />
            {audio.name}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">
            {formatTime(currentTime)} / {formatTime(duration || 0)}
          </span>
        </div>

        {/* Animated Waveform Bars */}
        <div className="flex items-center gap-1 h-3">
          {[40, 70, 100, 60, 85, 45, 95, 65, 30, 80, 50, 90, 75, 40, 60].map((h, i) => (
            <span
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                isPlaying ? 'bg-gradient-to-t from-purple-500 to-pink-400 animate-pulse' : 'bg-white/20'
              }`}
              style={{
                height: isPlaying ? `${Math.max(20, Math.sin(currentTime * 5 + i) * 50 + 50)}%` : `${h}%`,
                animationDelay: `${i * 60}ms`
              }}
            />
          ))}
        </div>
      </div>

      {audio.audioUrl && (
        <audio
          ref={audioRef}
          src={audio.audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
    </div>
  );
}
