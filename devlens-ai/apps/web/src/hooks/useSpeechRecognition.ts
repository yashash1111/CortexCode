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
  const recognitionRef = useRef<unknown>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as unknown).SpeechRecognition || (window as unknown).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setState('listening');
        setError(null);
        setInterimTranscript('');
      };

      recognition.onresult = (event: unknown) => {
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
          setState('processing');
        }
        setInterimTranscript(interim);
      };

      recognition.onend = () => {
        setInterimTranscript('');
        setState(prev => (prev === 'listening' || prev === 'processing' ? 'idle' : prev));
      };

      recognition.onerror = (event: unknown) => {
        const errorMessages: Record<string, string> = {
          'no-speech': "Couldn't hear anything. Please try again.",
          'audio-capture': 'Microphone not accessible. Check your permissions.',
          'not-allowed': 'Microphone permission denied. Please allow access.',
          'network': 'Network error. Check your connection.',
          'aborted': 'Recording cancelled.',
          'bad-grammar': "Couldn't understand the audio. Please try again.",
          'language-not-supported': 'Language not supported.',
        };
        setError(errorMessages[event.error] || "Couldn't understand the audio. Please try again.");
        setState('error');
      };

      recognitionRef.current = recognition;
    }

    return () => {
      recognitionRef.current?.abort();
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
      // Already started — ignore
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setState('processing');
  }, []);

  const cancel = useCallback(() => {
    recognitionRef.current?.abort();
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
