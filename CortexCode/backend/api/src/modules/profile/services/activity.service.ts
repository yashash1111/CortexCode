import prisma from '../../../config/prisma';
import { Prisma } from '@prisma/client';

export type ActivityActionType =
  | 'ai_chat'
  | 'ai_debug'
  | 'ai_explain'
  | 'ai_notes'
  | 'ai_review'
  | 'debug_session'
  | 'explain_session'
  | 'notes_created'
  | 'code_review'
  | 'mock_interview'
  | 'mock_interview_completed'
  | 'goal_updated'
  | 'doc_uploaded'
  | 'doc_chat'
  | 'repo_analyzed'
  | (string & {});

export const ALLOWED_CLIENT_ACTIVITIES = new Set<ActivityActionType>([
  'goal_updated',
]);

export interface DailyActivityEntry {
  date: string; // YYYY-MM-DD (UTC)
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  breakdown: Record<string, number>;
}

export interface ActivityHeatmapResult {
  startDate: string;
  endDate: string;
  totalActiveDays: number;
  currentStreak: number;
  longestStreak: number;
  totalActivities: number;
  days: DailyActivityEntry[];
}

function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function computeIntensityLevel(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (maxCount <= 1) return 2;
  if (maxCount <= 4) {
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count === 3) return 3;
    return 4;
  }
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

export function mapChatModeToActivityAction(mode: string): ActivityActionType {
  switch (mode) {
    case 'debug':
      return 'debug_session';
    case 'explain':
      return 'explain_session';
    case 'notes':
      return 'notes_created';
    case 'review':
      return 'code_review';
    case 'chat':
    default:
      return 'ai_chat';
  }
}

export class ActivityService {
  static async recordUserActivity(
    userId: string,
    action: ActivityActionType,
    metadata?: Record<string, unknown>,
    repositoryId?: string
  ): Promise<void> {
    if (!userId) return;
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          action,
          ...(repositoryId ? { repositoryId } : {}),
          ...(metadata ? { metadata: metadata as Prisma.InputJsonValue } : {}),
        },
      });
    } catch (err) {
      console.warn('[ActivityService] Failed to record activity:', err instanceof Error ? err.message : err);
    }
  }

  static async getActivityHeatmap(userId: string, windowDays = 365): Promise<ActivityHeatmapResult> {
    const safeDays = Math.min(365, Math.max(1, windowDays));
    const now = new Date();
    const endUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (safeDays - 1), 0, 0, 0, 0));

    const logs = await prisma.activityLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: startUtc,
          lte: endUtc,
        },
      },
      select: {
        action: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<string, { count: number; breakdown: Record<string, number> }>();
    for (const log of logs) {
      const key = toUtcDateKey(log.createdAt);
      const existing = dailyMap.get(key) || { count: 0, breakdown: {} };
      existing.count += 1;
      existing.breakdown[log.action] = (existing.breakdown[log.action] || 0) + 1;
      dailyMap.set(key, existing);
    }

    let maxCount = 0;
    for (const entry of dailyMap.values()) {
      if (entry.count > maxCount) maxCount = entry.count;
    }

    const days: DailyActivityEntry[] = [];
    for (let i = 0; i < safeDays; i++) {
      const dayDate = addUtcDays(startUtc, i);
      const key = toUtcDateKey(dayDate);
      const entry = dailyMap.get(key);
      const count = entry?.count || 0;
      days.push({
        date: key,
        count,
        level: computeIntensityLevel(count, maxCount),
        breakdown: entry?.breakdown || {},
      });
    }

    const totalActivities = logs.length;
    const totalActiveDays = dailyMap.size;

    // Longest streak across the window
    let longestStreak = 0;
    let runningStreak = 0;
    for (const day of days) {
      if (day.count > 0) {
        runningStreak += 1;
        if (runningStreak > longestStreak) longestStreak = runningStreak;
      } else {
        runningStreak = 0;
      }
    }

    // Current streak: consecutive active days ending today (or yesterday if today has 0 so far)
    let currentStreak = 0;
    const todayIdx = days.length - 1;
    let idx = todayIdx;
    if (idx >= 0 && days[idx].count === 0) {
      idx -= 1;
    }
    while (idx >= 0 && days[idx].count > 0) {
      currentStreak += 1;
      idx -= 1;
    }

    return {
      startDate: toUtcDateKey(startUtc),
      endDate: toUtcDateKey(endUtc),
      totalActiveDays,
      currentStreak,
      longestStreak,
      totalActivities,
      days,
    };
  }

  static async getRecentActivity(userId: string, limit = 25) {
    const safeLimit = Math.min(100, Math.max(1, limit));
    return prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      select: {
        id: true,
        action: true,
        metadata: true,
        repositoryId: true,
        createdAt: true,
      },
    });
  }
}
