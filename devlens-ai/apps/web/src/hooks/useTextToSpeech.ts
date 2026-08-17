'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  activeVoiceName: string;
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

/**
 * Smart voice selector: Picks the highest-clarity natural AI voice (Siri / Google Gemini / Microsoft Natural)
 * and eliminates low-quality robotic voices.
 */
function selectBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // 1. Apple Siri & Enhanced/Premium Natural Voices (macOS, iOS, Safari, Chrome on Mac)
  const siriOrApplePremium = voices.find(v =>
    (v.name.includes('Siri') ||
     v.name.includes('Samantha (Enhanced)') ||
     v.name.includes('Samantha (Premium)') ||
     v.name.includes('Ava (Premium)') ||
     v.name.includes('Ava (Enhanced)') ||
     v.name.includes('Zoe (Premium)') ||
     v.name.includes('Nicky (Enhanced)') ||
     v.name.includes('Karen (Enhanced)') ||
     v.name.includes('Daniel (Enhanced)')) &&
    v.lang.startsWith('en')
  );
  if (siriOrApplePremium) return siriOrApplePremium;

  // 2. Google Gemini / Neural English Voices (Chrome, Android, Google OS)
  const googleNatural = voices.find(v =>
    (v.name.includes('Google US English') ||
     v.name.includes('Google UK English Female') ||
     v.name.includes('Google Neural') ||
     (v.name.includes('Google') && v.lang.startsWith('en')))
  );
  if (googleNatural) return googleNatural;

  // 3. Microsoft Natural Online AI Voices (Edge, Windows 11)
  const msNatural = voices.find(v =>
    (v.name.includes('Natural') ||
     v.name.includes('Jenny') ||
     v.name.includes('Aria') ||
     v.name.includes('Guy') ||
     v.name.includes('Christopher')) &&
    v.lang.startsWith('en')
  );
  if (msNatural) return msNatural;

  // 4. Default high-clarity en-US standard voices
  const standardEn = voices.find(v =>
    (v.name.includes('Samantha') ||
     v.name.includes('Alex') ||
     v.name.includes('Victoria') ||
     v.name.includes('Karen')) &&
    v.lang.startsWith('en')
  );
  if (standardEn) return standardEn;

  // 5. Any en-US voice
  const anyEnUS = voices.find(v => v.lang === 'en-US' || v.lang === 'en_US');
  if (anyEnUS) return anyEnUS;

  // 6. Any English voice
  const anyEnglish = voices.find(v => v.lang.startsWith('en'));
  if (anyEnglish) return anyEnglish;

  return voices[0] || null;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [activeVoiceName, setActiveVoiceName] = useState('Gemini Voice');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        voicesRef.current = available;
        const best = selectBestVoice(available);
        if (best) {
          setActiveVoiceName(best.name);
        }
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      try {
        window.speechSynthesis.cancel();
      } catch { /* ignore */ }
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    // Clean text to sound natural like Siri & Gemini
    const cleanText = text
      .replace(/```[\w]*\n[\s\S]*?```/g, ' Code snippet omitted. ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/^[\s*#-]+(?=\w)/gm, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/[^\s)]+/g, '')
      .replace(/[{}[\]()<>=+*_\/\\~|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Natural human speech pace & pitch tuning
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Pick top-tier crystal clear voice
    const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
    const bestVoice = selectBestVoice(voices);
    if (bestVoice) {
      utterance.voice = bestVoice;
      setActiveVoiceName(bestVoice.name);
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const pause = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  return { isSpeaking, isPaused, isSupported, activeVoiceName, speak, pause, resume, stop };
}
