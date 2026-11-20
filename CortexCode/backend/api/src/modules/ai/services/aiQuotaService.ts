import prisma from '../../../config/prisma';
import { getAIConfig } from './aiConfig';

export class QuotaExceededError extends Error {
  status = 429;
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

export class AIQuotaService {
  static async enforceUserFairUse(userId?: string) {
    if (!userId) return;
    const cfg = getAIConfig();
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    try {
      const [dailyCount, monthlyAgg] = await Promise.all([
        prisma.usageLog.count({
          where: {
            userId,
            createdAt: { gte: startOfDay },
          },
        }),
        prisma.usageLog.aggregate({
          where: {
            userId,
            createdAt: { gte: startOfMonth },
          },
          _sum: { totalTokens: true },
        }),
      ]);

      if (dailyCount >= cfg.userDailyRequestLimit) {
        throw new QuotaExceededError(
          `Daily AI fair-use limit reached (${cfg.userDailyRequestLimit} requests/day). Please try again tomorrow.`
        );
      }

      const monthlyTokens = Number(monthlyAgg._sum.totalTokens || 0);
      if (monthlyTokens >= cfg.userMonthlyTokenLimit) {
        throw new QuotaExceededError(
          `Monthly AI fair-use token limit reached (${cfg.userMonthlyTokenLimit.toLocaleString()} tokens/month).`
        );
      }
    } catch (err) {
      if (err instanceof QuotaExceededError) throw err;
      // Do not block requests if telemetry DB read has a transient issue
    }
  }

  static async getUserUsageSummary(userId: string) {
    const cfg = getAIConfig();
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [dailyRequests, monthlyAgg] = await Promise.all([
      prisma.usageLog.count({ where: { userId, createdAt: { gte: startOfDay } } }),
      prisma.usageLog.aggregate({
        where: { userId, createdAt: { gte: startOfMonth } },
        _sum: { totalTokens: true, estimatedCost: true },
        _count: { _all: true },
      }),
    ]);

    return {
      dailyRequests,
      dailyRequestLimit: cfg.userDailyRequestLimit,
      monthlyRequests: monthlyAgg._count._all,
      monthlyTokens: Number(monthlyAgg._sum.totalTokens || 0),
      monthlyTokenLimit: cfg.userMonthlyTokenLimit,
      monthlyEstimatedCost: Number(monthlyAgg._sum.estimatedCost || 0),
    };
  }
}
