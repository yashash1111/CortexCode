'use client';

import React, { useEffect } from 'react';
import { Mic, MicOff, Square, X, Volume2 } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useToast } from '@/providers/ToastProvider';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
}

export default function VoiceInput({ onTranscript }: VoiceInputProps) {
  const toast = useToast();
  const { isSupported, state, transcript, interimTranscript, error, start, stop, cancel, reset } =
    useSpeechRecognition();

  // When final transcript arrives, push it to composer
  useEffect(() => {
    if (transcript && state === 'idle') {
      onTranscript(transcript);
      reset();
    }
  }, [transcript, state, onTranscript, reset]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast.showError?.('Voice Input Error', error) ??
        toast.showInfo('Voice Input', error);
    }
  }, [error, toast]);

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        title="Voice input is not supported in this browser"
        className="p-2.5 text-zinc-600 rounded-2xl cursor-not-allowed"
      >
        <MicOff size={18} />
      </button>
    );
  }

  if (state === 'listening') {
    return (
      <div className="flex items-center gap-1.5">
        {/* Animated listening indicator */}
        <div className="flex items-center gap-1 px-2 py-1 bg-red-950/50 border border-red-500/40 rounded-xl">
          <div className="relative flex">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute" />
            <span className="w-2 h-2 rounded-full bg-red-400 relative" />
          </div>
          <span className="text-[10px] font-bold text-red-300 ml-1">Listening...</span>
        </div>

        {/* Stop recording */}
        <button
          type="button"
          onClick={stop}
          title="Stop recording"
          className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all shadow-md"
        >
          <Square size={14} className="fill-white" />
        </button>

        {/* Cancel */}
        <button
          type="button"
          onClick={cancel}
          title="Cancel"
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  if (state === 'processing') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800/60 border border-white/10 rounded-xl">
        <Volume2 size={14} className="text-purple-400 animate-pulse" />
        <span className="text-[10px] font-bold text-zinc-300">Transcribing...</span>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <button
        type="button"
        onClick={start}
        title="Retry voice input"
        className="p-2.5 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-2xl transition-colors"
      >
        <MicOff size={18} />
      </button>
    );
  }

  // Idle state
  return (
    <button
      type="button"
      onClick={start}
      title="Start voice input"
      className="p-2.5 text-zinc-400 hover:text-purple-300 hover:bg-purple-950/30 rounded-2xl transition-colors"
    >
      <Mic size={18} />
    </button>
  );
}
