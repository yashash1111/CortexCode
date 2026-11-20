import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../../config/prisma';
import { authenticate } from '../../../middleware/auth.middleware';
import { requireAdmin } from '../../../middleware/rbac.middleware';
import {
  ALL_CENTRAL_PROVIDER_IDS,
  CENTRAL_PROVIDERS,
  CentralAIProviderName,
  getAIConfig,
  getProviderCredentials,
} from '../../ai/services/aiConfig';
import { ProviderHealthManager } from '../../ai/services/providerHealth';
import { cloudflareAdapter } from '../../ai/services/providers/cloudflareAdapter';
import { geminiAdapter } from '../../ai/services/providers/geminiAdapter';
import { groqAdapter } from '../../ai/services/providers/groqAdapter';
import { openrouterAdapter } from '../../ai/services/providers/openrouterAdapter';

const router = Router();

router.use(authenticate, requireAdmin);

const updateProviderSchema = z.object({
  enabled: z.boolean().optional(),
  priority: z.number().int().min(1).max(20).optional(),
  selectedModel: z.string().min(1).max(120).optional(),
  dailyRequestLimit: z.number().int().min(1).nullable().optional(),
  monthlyTokenLimit: z.number().int().min(1000).nullable().optional(),
});

// GET /api/admin/ai-providers
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [providers, recentEvents, usageAgg, usageByProvider] = await Promise.all([
      ProviderHealthManager.getEffectiveConfigs(),
      prisma.aIProviderHealthEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.usageLog.aggregate({
        _sum: { totalTokens: true, estimatedCost: true },
        _count: { _all: true },
      }),
      prisma.usageLog.groupBy({
        by: ['provider', 'status'],
        _count: { _all: true },
        _sum: { totalTokens: true, estimatedCost: true },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        gatewayConfig: getAIConfig(),
        providers,
        recentEvents,
        usage: {
          totalRequests: usageAgg._count._all,
          totalTokens: Number(usageAgg._sum.totalTokens || 0),
          totalEstimatedCost: Number(usageAgg._sum.estimatedCost || 0),
          byProvider: usageByProvider.map((u) => ({
            provider: u.provider,
            status: u.status,
            requests: u._count._all,
            totalTokens: Number(u._sum.totalTokens || 0),
            estimatedCost: Number(u._sum.estimatedCost || 0),
          })),
        },
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to load AI provider dashboard' },
    });
  }
});

// PATCH /api/admin/ai-providers/:provider
router.patch('/:provider', async (req: Request, res: Response) => {
  const providerId = req.params.provider as CentralAIProviderName;
  if (!ALL_CENTRAL_PROVIDER_IDS.includes(providerId)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid AI provider' } });
  }

  const parsed = updateProviderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid configuration payload', issues: parsed.error.issues },
    });
  }

  const def = CENTRAL_PROVIDERS[providerId];
  if (parsed.data.selectedModel && !def.supportedModels.includes(parsed.data.selectedModel)) {
    return res.status(400).json({
      success: false,
      error: { message: `Unsupported model for ${def.displayName}` },
    });
  }

  try {
    const updated = await prisma.aIProviderConfig.upsert({
      where: { provider: providerId },
      create: {
        provider: providerId,
        enabled: parsed.data.enabled ?? true,
        priority: parsed.data.priority ?? def.defaultPriority,
        selectedModel: parsed.data.selectedModel ?? def.defaultModel,
        dailyRequestLimit: parsed.data.dailyRequestLimit ?? null,
        monthlyTokenLimit: parsed.data.monthlyTokenLimit ?? null,
        updatedBy: req.user?.userId || null,
      },
      update: {
        ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
        ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
        ...(parsed.data.selectedModel !== undefined ? { selectedModel: parsed.data.selectedModel } : {}),
        ...(parsed.data.dailyRequestLimit !== undefined ? { dailyRequestLimit: parsed.data.dailyRequestLimit } : {}),
        ...(parsed.data.monthlyTokenLimit !== undefined ? { monthlyTokenLimit: parsed.data.monthlyTokenLimit } : {}),
        updatedBy: req.user?.userId || null,
      },
    });

    return res.json({ success: true, data: updated });
  } catch {
    return res.status(500).json({ success: false, error: { message: 'Failed to update provider config' } });
  }
});

// POST /api/admin/ai-providers/:provider/test
router.post('/:provider/test', async (req: Request, res: Response) => {
  const providerId = req.params.provider as CentralAIProviderName;
  if (!ALL_CENTRAL_PROVIDER_IDS.includes(providerId)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid AI provider' } });
  }

  const creds = getProviderCredentials(providerId);
  if (!creds.configured || !creds.apiKey) {
    return res.status(400).json({
      success: false,
      error: { message: `${CENTRAL_PROVIDERS[providerId].displayName} credentials are not configured.` },
    });
  }

  const configs = await ProviderHealthManager.getEffectiveConfigs();
  const current = configs.find((c) => c.provider === providerId);
  const model = current?.selectedModel || CENTRAL_PROVIDERS[providerId].defaultModel;
  const timeoutMs = getAIConfig().timeoutMs;

  const adapterMap = {
    gemini: geminiAdapter,
    groq: groqAdapter,
    openrouter: openrouterAdapter,
    cloudflare: cloudflareAdapter,
  };

  const result = await adapterMap[providerId].validateConnection(creds.apiKey, model, timeoutMs, creds.accountId);
  if (result.ok) {
    await ProviderHealthManager.recordSuccess(providerId, model, result.latencyMs);
  } else {
    await ProviderHealthManager.recordFailure({
      provider: providerId,
      model,
      status: 'degraded',
      latencyMs: result.latencyMs,
      errorMessage: result.error || 'Connection test failed',
    });
  }

  return res.json({ success: true, data: { provider: providerId, model, ...result } });
});

export default router;
