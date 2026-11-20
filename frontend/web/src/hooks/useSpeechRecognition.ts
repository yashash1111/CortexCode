'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type SpeechState = 'idle' | 'listening' | 'processing' | 'error';

interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  state: SpeechState;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  cancel: () => void;
  reset: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [state, setState] = useState<SpeechState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setState('listening');
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        if (final) {
          setTranscript(prev => (prev ? prev + ' ' + final : final).trim());
        }
        setInterimTranscript(interim);
      };

      recognition.onend = () => {
        setInterimTranscript('');
        setState(prev => (prev === 'listening' || prev === 'processing' ? 'idle' : prev));
      };

      recognition.onerror = (event: any) => {
        const errorMessages: Record<string, string> = {
          'no-speech': "No speech detected. Please speak louder into your microphone.",
          'audio-capture': 'Microphone not accessible. Please check your system settings.',
          'not-allowed': 'Microphone permission denied. Please allow microphone access in your browser.',
          'network': 'Network error. Please check your connection.',
          'aborted': 'Voice input cancelled.',
          'bad-grammar': "Could not process audio. Please try again.",
          'language-not-supported': 'Language not supported.',
        };
        const msg = errorMessages[event.error] || "Voice input error. Please try again.";
        setError(msg);
        setState('error');
      };

      recognitionRef.current = recognition;
    }

    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    try {
      recognitionRef.current.start();
    } catch {
      // If already running, abort and restart cleanly
      try {
        recognitionRef.current.abort();
        setTimeout(() => recognitionRef.current?.start(), 100);
      } catch { /* ignore */ }
    }
  }, []);

  const stop = useCallback(() => {
    try {
      setState('processing');
      recognitionRef.current?.stop();
    } catch {
      setState('idle');
    }
  }, []);

  const cancel = useCallback(() => {
    try {
      recognitionRef.current?.abort();
    } catch { /* ignore */ }
    setState('idle');
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setState('idle');
  }, []);

  return { isSupported, state, transcript, interimTranscript, error, start, stop, cancel, reset };
}
