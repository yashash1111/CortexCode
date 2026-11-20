import { Router, Request, Response } from 'express';
import prisma from '../../../config/prisma';
import { authenticate } from '../../../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function classifyModule(requestType: string): 'docs' | 'github' | 'other' {
  const lower = requestType.toLowerCase();
  if (lower.includes('doc') || lower.includes('eval') || lower === 'embed') return 'docs';
  if (lower.includes('repo') || lower.includes('pr_review') || lower.includes('explain') || lower.includes('bug')) {
    return 'github';
  }
  return 'other';
}

// GET /api/jobs — list ingestion jobs for authenticated user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId, moduleType, status } = req.query;

    const jobs = await prisma.ingestionJob.findMany({
      where: {
        userId,
        ...(typeof workspaceId === 'string' && workspaceId ? { workspaceId } : {}),
        ...(typeof moduleType === 'string' && moduleType ? { moduleType } : {}),
        ...(typeof status === 'string' && status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json({ success: true, data: jobs });
  } catch {
    return res.status(500).json({ success: false, error: { message: 'Failed to load jobs' } });
  }
});

// GET /api/jobs/overview — Real-time Overview Dashboard metrics
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const [
      totalDocuments,
      totalRepositories,
      totalPRReviews,
      usageLogs,
      recentJobs,
      recentRepositories,
      recentPRReviews,
    ] = await Promise.all([
      prisma.document.count({ where: { userId } }),
      prisma.repository.count({ where: { userId } }),
      prisma.pullRequestReview.count({ where: { pullRequest: { repository: { userId } } } }),
      prisma.usageLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      prisma.ingestionJob.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.repository.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 6,
        select: {
          id: true,
          fullName: true,
          language: true,
          defaultBranch: true,
          lastAnalyzedAt: true,
          updatedAt: true,
        },
      }),
      prisma.pullRequestReview.findMany({
        where: { pullRequest: { repository: { userId } } },
        include: {
          pullRequest: {
            select: {
              number: true,
              title: true,
              author: true,
              repository: { select: { fullName: true } },
            },
          },
          _count: { select: { findings: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ]);

    const totalAIRequests = usageLogs.length;
    const totalTokens = usageLogs.reduce((s, l) => s + l.totalTokens, 0);
    const totalCost = Number(usageLogs.reduce((s, l) => s + l.estimatedCost, 0).toFixed(6));
    const avgLatencyMs =
      totalAIRequests > 0
        ? Math.round(usageLogs.reduce((s, l) => s + l.latencyMs, 0) / totalAIRequests)
        : 0;

    const dailyMap = new Map<string, { date: string; requests: number; tokens: number; cost: number }>();
    for (const log of usageLogs) {
      const date = log.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(date) || { date, requests: 0, tokens: 0, cost: 0 };
      entry.requests += 1;
      entry.tokens += log.totalTokens;
      entry.cost = Number((entry.cost + log.estimatedCost).toFixed(6));
      dailyMap.set(date, entry);
    }

    return res.json({
      success: true,
      data: {
        metrics: {
          totalDocuments,
          totalRepositories,
          totalPRReviews,
          totalAIRequests,
          totalTokens,
          totalCost,
          avgLatencyMs,
        },
        dailyUsage: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
        recentJobs,
        recentRepositories,
        recentPRReviews,
        recentUsage: usageLogs.slice(0, 8),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: 'Failed to load overview metrics' } });
  }
});

// GET /api/jobs/observability/summary
router.get('/observability/summary', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
    const workspaceId = typeof req.query.workspaceId === 'string' && req.query.workspaceId ? req.query.workspaceId : undefined;
    const moduleFilter = typeof req.query.module === 'string' && req.query.module ? req.query.module : undefined;
    const modelFilter = typeof req.query.model === 'string' && req.query.model ? req.query.model : undefined;

    const since = new Date();
    since.setDate(since.getDate() - days);

    const [rawLogs, jobs, evalRuns, prReviews] = await Promise.all([
      prisma.usageLog.findMany({
        where: {
          userId,
          createdAt: { gte: since },
          ...(workspaceId ? { workspaceId } : {}),
          ...(modelFilter ? { model: modelFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      prisma.ingestionJob.findMany({
        where: {
          userId,
          ...(workspaceId ? { workspaceId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.evalRun.findMany({
        where: {
          userId,
          ...(workspaceId ? { workspaceId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.pullRequestReview.findMany({
        where: {
          ...(workspaceId ? { workspaceId } : {}),
          pullRequest: { repository: { userId } },
        },
        include: {
          pullRequest: { include: { repository: { select: { fullName: true } } } },
          _count: { select: { findings: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const usageLogs = moduleFilter
      ? rawLogs.filter((l) => classifyModule(l.requestType) === moduleFilter)
      : rawLogs;

    const totalRequests = usageLogs.length;
    const promptTokens = usageLogs.reduce((acc, l) => acc + l.inputTokens, 0);
    const completionTokens = usageLogs.reduce((acc, l) => acc + l.outputTokens, 0);
    const totalTokens = usageLogs.reduce((acc, l) => acc + l.totalTokens, 0);
    const totalCost = Number(usageLogs.reduce((acc, l) => acc + l.estimatedCost, 0).toFixed(6));
    const latencies = usageLogs.map((l) => l.latencyMs).sort((a, b) => a - b);
    const avgLatencyMs =
      totalRequests > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / totalRequests) : 0;
    const p50LatencyMs = percentile(latencies, 50);
    const p95LatencyMs = percentile(latencies, 95);
    const errorCount = usageLogs.filter((l) => l.status === 'error').length;
    const rateLimitEvents = usageLogs.filter(
      (l) => l.errorMessage?.includes('429') || l.errorMessage?.toLowerCase().includes('rate')
    ).length;

    const byModelMap = new Map<string, { model: string; requests: number; tokens: number; cost: number }>();
    const byModuleMap = new Map<string, { module: string; requests: number; tokens: number; cost: number }>();
    const dailyMap = new Map<string, { date: string; requests: number; tokens: number; cost: number; latencySum: number }>();

    for (const log of usageLogs) {
      const mEntry = byModelMap.get(log.model) || { model: log.model, requests: 0, tokens: 0, cost: 0 };
      mEntry.requests += 1;
      mEntry.tokens += log.totalTokens;
      mEntry.cost = Number((mEntry.cost + log.estimatedCost).toFixed(6));
      byModelMap.set(log.model, mEntry);

      const mod = classifyModule(log.requestType);
      const modEntry = byModuleMap.get(mod) || { module: mod, requests: 0, tokens: 0, cost: 0 };
      modEntry.requests += 1;
      modEntry.tokens += log.totalTokens;
      modEntry.cost = Number((modEntry.cost + log.estimatedCost).toFixed(6));
      byModuleMap.set(mod, modEntry);

      const dayKey = log.createdAt.toISOString().slice(0, 10);
      const dEntry = dailyMap.get(dayKey) || { date: dayKey, requests: 0, tokens: 0, cost: 0, latencySum: 0 };
      dEntry.requests += 1;
      dEntry.tokens += log.totalTokens;
      dEntry.cost = Number((dEntry.cost + log.estimatedCost).toFixed(6));
      dEntry.latencySum += log.latencyMs;
      dailyMap.set(dayKey, dEntry);
    }

    const dailyUsage = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        date: d.date,
        requests: d.requests,
        tokens: d.tokens,
        cost: d.cost,
        avgLatencyMs: Math.round(d.latencySum / d.requests),
      }));

    return res.json({
      success: true,
      data: {
        summary: {
          totalRequests,
          promptTokens,
          completionTokens,
          totalTokens,
          totalCost,
          avgLatencyMs,
          p50LatencyMs,
          p95LatencyMs,
          errorCount,
          rateLimitEvents,
        },
        byModel: Array.from(byModelMap.values()),
        byModule: Array.from(byModuleMap.values()),
        dailyUsage,
        availableModels: Array.from(new Set(rawLogs.map((l) => l.model))),
        recentUsage: usageLogs.slice(0, 30),
        recentJobs: jobs,
        recentEvals: evalRuns,
        recentPRReviews: prReviews,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: 'Failed to load observability summary' } });
  }
});

// GET /api/jobs/:id — get specific job status
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const job = await prisma.ingestionJob.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!job) {
      return res.status(404).json({ success: false, error: { message: 'Job not found' } });
    }

    return res.json({ success: true, data: job });
  } catch {
    return res.status(500).json({ success: false, error: { message: 'Failed to load job' } });
  }
});

export default router;
