'use client';

import { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

interface Props {
  confidence?: number;
  sources?: string[];
}

export default function FactVerificationBadge({ confidence = 96, sources = ['RFC 793 (TCP Specification)', 'Oracle Java SE 21 Documentation'] }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-2 inline-block text-left font-sans">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#141414] border border-[#262626] hover:border-neutral-700 text-neutral-300 text-xs font-mono transition"
      >
        <ShieldCheck size={13} className="text-blue-400" />
        <span>Verified ({confidence}%)</span>
        {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {expanded && (
        <div className="mt-1.5 p-3 bg-[#121212] border border-[#262626] rounded-md text-xs text-neutral-300 space-y-1.5 animate-fade-in-up shadow-lg max-w-xs">
          <div className="flex items-center gap-1 font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
            <CheckCircle2 size={12} className="text-blue-400" />
            <span>Technical Sources</span>
          </div>

          <div className="space-y-1 pl-1">
            {sources.map((src, idx) => (
              <div key={idx} className="flex items-center gap-1 text-[11px] text-neutral-300 font-mono">
                <span className="text-blue-400">✓</span>
                <span className="truncate">{src}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
