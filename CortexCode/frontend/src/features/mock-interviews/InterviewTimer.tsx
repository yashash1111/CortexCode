'use client';

import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

export function InterviewTimer({
  startedAt,
  durationMinutes,
  isCompleted,
}: {
  startedAt?: string | null;
  durationMinutes: number;
  isCompleted: boolean;
}) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!startedAt || isCompleted) return;
    const startMs = new Date(startedAt).getTime();
    const tick = () => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [startedAt, isCompleted]);

  const totalSec = durationMinutes * 60;
  const remainingSec = Math.max(0, totalSec - elapsedSec);

  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-xs font-mono">
      <Clock className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
      <span className="text-[var(--text-primary)] font-semibold">{fmt(elapsedSec)}</span>
      <span className="text-[var(--text-muted)]">/ {fmt(remainingSec)} left</span>
    </div>
  );
}
