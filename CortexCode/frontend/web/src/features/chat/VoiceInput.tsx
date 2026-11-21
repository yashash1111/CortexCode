'use client';

import React, { useEffect } from 'react';
import { Mic, MicOff, Square, X, Volume2, Check } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useToast } from '@/providers/ToastProvider';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
}

export default function VoiceInput({ onTranscript }: VoiceInputProps) {
  const toast = useToast();
  const { isSupported, state, transcript, interimTranscript, error, start, stop, cancel, reset } =
    useSpeechRecognition();

  // Push final transcript to composer when speech recognition completes
  useEffect(() => {
    if (transcript && state === 'idle') {
      onTranscript(transcript);
      reset();
    }
  }, [transcript, state, onTranscript, reset]);

  // Toast notifications for speech recognition errors
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
        title="Voice input is not supported in this browser (Use Chrome or Edge)"
        className="p-2 text-zinc-600 rounded-xl cursor-not-allowed opacity-50"
      >
        <MicOff size={17} />
      </button>
    );
  }

  if (state === 'listening') {
    return (
      <div className="flex items-center gap-2 bg-purple-950/80 border border-purple-500/50 px-3 py-1.5 rounded-2xl shadow-lg backdrop-blur-xl animate-fade-in">
        {/* Animated Microphone Pulsing Dot */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex items-center justify-center w-3 h-3">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute opacity-75" />
            <span className="w-2 h-2 rounded-full bg-red-400 relative" />
          </div>
          <span className="text-xs font-bold text-red-300">Listening...</span>
        </div>

        {/* Live Interim Transcript Display */}
        {(interimTranscript || transcript) && (
          <span className="text-xs text-purple-200 max-w-[200px] truncate italic border-l border-purple-500/30 pl-2">
            "{interimTranscript || transcript}"
          </span>
        )}

        {/* Done / Insert Button */}
        <button
          type="button"
          onClick={stop}
          title="Finish recording & insert text"
          className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all shadow-md flex items-center gap-1 text-[11px] font-bold"
        >
          <Check size={13} />
          Done
        </button>

        {/* Cancel Button */}
        <button
          type="button"
          onClick={cancel}
          title="Cancel recording"
          className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  if (state === 'processing') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/80 border border-purple-500/40 rounded-2xl shadow-md">
        <Volume2 size={15} className="text-purple-400 animate-pulse" />
        <span className="text-xs font-bold text-purple-300">Transcribing...</span>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <button
        type="button"
        onClick={start}
        title="Retry Voice Input"
        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors"
      >
        <MicOff size={17} />
      </button>
    );
  }

  // Idle State
  return (
    <button
      type="button"
      onClick={start}
      title="Start Voice Input"
      className="p-2 text-zinc-400 hover:text-purple-300 hover:bg-purple-950/40 rounded-xl transition-colors flex items-center gap-1 group"
    >
      <Mic size={17} className="group-hover:scale-110 transition-transform" />
    </button>
  );
}
