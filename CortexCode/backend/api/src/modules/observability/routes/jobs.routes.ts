import { Router, Request, Response } from 'express';
import prisma from '../../../config/prisma';
import { authenticate } from '../../../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

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
