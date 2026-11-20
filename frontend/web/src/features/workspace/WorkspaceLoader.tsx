'use client';

import { useState, useEffect } from 'react';
import { Cpu } from 'lucide-react';

interface Props {
  message?: string;
}

export default function WorkspaceLoader({ message = 'Initializing CortexCode AI Workspace...' }: Props) {
  const [stepIndex, setStepIndex] = useState(0);

  const STEPS = [
    'Initializing workspace environment...',
    'Loading project context & memory...',
    'Connecting multi-agent orchestrator...',
    'Readying workspace canvas...'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex(prev => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 400);
    return () => clearInterval(interval);
  }, [STEPS.length]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col items-center justify-center text-white font-sans overflow-hidden select-none">
      <div className="flex flex-col items-center text-center max-w-sm px-6">
        
        {/* Subtle Icon Badge */}
        <div className="w-12 h-12 rounded-xl bg-[#141414] border border-[#262626] flex items-center justify-center mb-6 shadow-sm">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>

        {/* Brand Title */}
        <h2 className="text-lg font-bold tracking-tight text-white mb-1">
          CortexCode
        </h2>

        {/* Step Status Text */}
        <p className="text-xs font-mono text-neutral-400 h-5 mb-5">
          {STEPS[stepIndex]}
        </p>

        {/* Minimal Progress Bar */}
        <div className="w-48 bg-[#1a1a1a] border border-[#262626] rounded-full h-1 overflow-hidden relative">
          <div className="absolute inset-0 bg-blue-500 rounded-full animate-loading-bar" />
        </div>

      </div>
    </div>
  );
}
