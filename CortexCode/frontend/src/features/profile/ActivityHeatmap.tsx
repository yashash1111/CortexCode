'use client';

import React, { useMemo, useState } from 'react';
import { Calendar, Flame, Trophy, Activity } from 'lucide-react';
import type { ActivityResponse, HeatmapDay } from './profile.types';

const LEVEL_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-[var(--bg-subtle)] border-[var(--border-default)]',
  1: 'bg-violet-500/30 border-violet-500/40',
  2: 'bg-violet-500/55 border-violet-500/60',
  3: 'bg-violet-500/80 border-violet-400/80',
  4: 'bg-violet-500 border-violet-300',
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ActivityHeatmap({ activity }: { activity: ActivityResponse }) {
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);

  const { weeks, monthLabels } = useMemo(() => {
    const days = activity.days || [];
    if (days.length === 0) return { weeks: [] as (HeatmapDay | null)[][], monthLabels: [] as { col: number; label: string }[] };

    const firstDate = new Date(`${days[0].date}T00:00:00Z`);
    const leadingPad = firstDate.getUTCDay(); // 0 (Sun) - 6 (Sat)
    const padded: (HeatmapDay | null)[] = [
      ...Array.from({ length: leadingPad }, () => null),
      ...days,
    ];

    const cols: (HeatmapDay | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      cols.push(padded.slice(i, i + 7));
    }

    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    cols.forEach((col, colIdx) => {
      const firstReal = col.find((d) => d !== null);
      if (firstReal) {
        const m = new Date(`${firstReal.date}T00:00:00Z`).getUTCMonth();
        if (m !== lastMonth) {
          labels.push({ col: colIdx, label: MONTH_NAMES[m] });
          lastMonth = m;
        }
      }
    });

    return { weeks: cols, monthLabels: labels };
  }, [activity.days]);

  const activeDay = selectedDay || [...(activity.days || [])].reverse().find((d) => d.count > 0) || null;

  return (
    <div className="space-y-4">
      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)]">
          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            Recorded Activities
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)] mt-1">
            {activity.totalActivities}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)]">
          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            Active Days (365d)
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)] mt-1">
            {activity.totalActiveDays}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)]">
          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Current Streak
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)] mt-1">
            {activity.currentStreak} {activity.currentStreak === 1 ? 'day' : 'days'}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)]">
          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-emerald-400" />
            Longest Streak
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)] mt-1">
            {activity.longestStreak} {activity.longestStreak === 1 ? 'day' : 'days'}
          </div>
        </div>
      </div>

      {/* Contribution Grid */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Daily Activity Heatmap (Last 365 Days)
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Tracks real AI conversations, debug/explain sessions, notes, code reviews, and mock interviews.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span>Less</span>
            {([0, 1, 2, 3, 4] as const).map((lvl) => (
              <span key={lvl} className={`w-3 h-3 rounded-[3px] border ${LEVEL_CLASSES[lvl]}`} />
            ))}
            <span>More</span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar pb-2">
          <div className="inline-block min-w-max">
            {/* Month Labels */}
            <div className="flex ml-8 mb-1.5 text-[10px] text-[var(--text-muted)] relative h-4">
              {monthLabels.map((m) => (
                <span
                  key={`${m.col}-${m.label}`}
                  className="absolute"
                  style={{ left: `${m.col * 15}px` }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            <div className="flex gap-1.5">
              {/* Weekday Labels */}
              <div className="grid grid-rows-7 gap-[3px] text-[10px] text-[var(--text-muted)] pr-1.5 select-none">
                <span className="h-[12px]" />
                <span className="h-[12px] leading-[12px]">Mon</span>
                <span className="h-[12px]" />
                <span className="h-[12px] leading-[12px]">Wed</span>
                <span className="h-[12px]" />
                <span className="h-[12px] leading-[12px]">Fri</span>
                <span className="h-[12px]" />
              </div>

              {/* 52-53 Week Columns */}
              <div className="flex gap-[3px]">
                {weeks.map((week, wIdx) => (
                  <div key={wIdx} className="grid grid-rows-7 gap-[3px]">
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const day = week[dIdx];
                      if (!day) {
                        return <div key={dIdx} className="w-[12px] h-[12px]" />;
                      }
                      const isSelected = selectedDay?.date === day.date;
                      return (
                        <button
                          key={day.date}
                          type="button"
                          onMouseEnter={() => setSelectedDay(day)}
                          onClick={() => setSelectedDay(day)}
                          title={`${day.date}: ${day.count} ${day.count === 1 ? 'activity' : 'activities'}`}
                          className={`w-[12px] h-[12px] rounded-[3px] border transition-transform cursor-pointer ${
                            LEVEL_CLASSES[day.level]
                          } ${isSelected ? 'ring-2 ring-[var(--accent-primary)] scale-110' : 'hover:scale-110'}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Selected / Hovered Day Breakdown or Honest Empty State */}
        <div className="mt-4 pt-3 border-t border-[var(--border-default)] text-xs">
          {activity.totalActivities === 0 ? (
            <p className="text-[var(--text-muted)]">
              No recorded activity yet in the last 365 days. Complete an AI chat, debug/explain session, study note, code review, or mock interview to start your streak.
            </p>
          ) : activeDay ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-[var(--text-primary)]">{activeDay.date}</span>
                <span className="text-[var(--text-muted)] ml-2">
                  {activeDay.count} {activeDay.count === 1 ? 'activity' : 'activities'}
                </span>
              </div>
              {Object.keys(activeDay.breakdown).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(activeDay.breakdown).map(([label, cnt]) => (
                    <span
                      key={label}
                      className="px-2 py-0.5 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[11px] text-[var(--accent-primary)]"
                    >
                      {label}: {cnt}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
