import prisma from '../../../config/prisma';
import { estimateModelCost } from '../../../config/modelPricing';
import { detectPromptInjection, sanitizeUserPrompt } from '../../../shared/utils/promptGuard';
import {
  ALL_CENTRAL_PROVIDER_IDS,
  CENTRAL_PROVIDERS,
  CentralAIProviderName,
  getAIConfig,
  getProviderCredentials,
} from './aiConfig';
import { AIQuotaService } from './aiQuotaService';
import { ProviderHealthManager } from './providerHealth';
import { redactSecrets } from './secretRedactor';
import { cloudflareAdapter } from './providers/cloudflareAdapter';
import { geminiAdapter } from './providers/geminiAdapter';
import { groqAdapter } from './providers/groqAdapter';
import { openrouterAdapter } from './providers/openrouterAdapter';
import {
  AdapterCallParams,
  AdapterCallResult,
  ProviderAdapter,
  ProviderNormalizedError,
  approxTokens,
  classifyProviderError,
} from './providers/types';

export type AIProviderName = CentralAIProviderName;

export interface GatewayMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIGatewayRequest {
  messages: GatewayMessage[];
  provider?: AIProviderName | 'auto';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  timeoutMs?: number;
  userId?: string;
  workspaceId?: string;
  requestType?: string;
  /** @deprecated Ignored in centralized mode; backend credentials are always used. */
  userKeys?: Record<string, string | undefined>;
}

export interface AIGatewayResponse {
  content: string;
  json?: any;
  provider: string;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  usageEstimated: boolean;
  estimatedCost: number;
}

export class TemporaryAIUnavailableError extends Error {
  status = 503;
  constructor(message = 'AI service is temporarily unavailable. Please try again in a few moments.') {
    super(message);
    this.name = 'TemporaryAIUnavailableError';
  }
}

const DEFAULT_ADAPTERS: Record<CentralAIProviderName, ProviderAdapter> = {
  gemini: geminiAdapter,
  groq: groqAdapter,
  openrouter: openrouterAdapter,
  cloudflare: cloudflareAdapter,
};

let adapterOverrides: Partial<Record<CentralAIProviderName, ProviderAdapter>> = {};

function getAdapter(provider: CentralAIProviderName): ProviderAdapter {
  return adapterOverrides[provider] || DEFAULT_ADAPTERS[provider];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function persistUsageLog(params: {
  userId?: string;
  workspaceId?: string;
  provider: string;
  model: string;
  requestType: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  usageEstimated?: boolean;
  estimatedCost: number;
  status: 'success' | 'error';
  errorMessage?: string;
}) {
  try {
    await prisma.usageLog.create({
      data: {
        userId: params.userId || null,
        workspaceId: params.workspaceId || null,
        provider: params.provider,
        model: params.model,
        requestType: params.requestType,
        latencyMs: params.latencyMs,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        totalTokens: params.totalTokens,
        estimatedCost: params.estimatedCost,
        status: params.status,
        errorMessage: params.errorMessage ? redactSecrets(params.errorMessage).slice(0, 500) : null,
        metadata: { usageEstimated: Boolean(params.usageEstimated) },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.warn('[AIGateway] Failed to persist UsageLog:', redactSecrets(msg));
  }
}

export class AIGateway {
  static setAdapterOverridesForTests(overrides: Partial<Record<CentralAIProviderName, ProviderAdapter>>) {
    adapterOverrides = overrides;
  }

  static clearAdapterOverridesForTests() {
    adapterOverrides = {};
  }

  static getConfiguredProviders(): Record<CentralAIProviderName, boolean> {
    return {
      gemini: getProviderCredentials('gemini').configured,
      groq: getProviderCredentials('groq').configured,
      openrouter: getProviderCredentials('openrouter').configured,
      cloudflare: getProviderCredentials('cloudflare').configured,
    };
  }

  private static sanitizeMessages(messages: GatewayMessage[], maxInputChars: number): GatewayMessage[] {
    let remaining = maxInputChars;
    return messages.map((m) => {
      const cleaned = sanitizeUserPrompt(m.content || '');
      if (m.role === 'user' && detectPromptInjection(cleaned)) {
        console.warn('[AIGateway] Potential prompt-injection pattern detected in user input');
      }
      const sliced = cleaned.slice(0, Math.max(0, remaining));
      remaining = Math.max(0, remaining - sliced.length);
      return { role: m.role, content: sliced };
    });
  }

  private static async resolveOrderedProviders(preferred?: AIProviderName | 'auto') {
    const cfg = getAIConfig();
    const effective = await ProviderHealthManager.getEffectiveConfigs();
    const enabledAndConfigured = effective.filter((c) => c.enabled && c.configured && ProviderHealthManager.isAvailable(c.provider));

    const preferredId =
      preferred && preferred !== 'auto' && ALL_CENTRAL_PROVIDER_IDS.includes(preferred)
        ? preferred
        : cfg.defaultProvider;

    const preferredEntry = enabledAndConfigured.find((c) => c.provider === preferredId);
    const ordered = preferredEntry
      ? [preferredEntry, ...enabledAndConfigured.filter((c) => c.provider !== preferredId)]
      : enabledAndConfigured;

    if (!cfg.fallbackEnabled && ordered.length > 1) {
      return [ordered[0]];
    }
    return ordered;
  }

  private static selectModelForProvider(
    provider: CentralAIProviderName,
    configuredModel: string,
    requestedModel?: string
  ): string {
    const def = CENTRAL_PROVIDERS[provider];
    if (requestedModel && def.supportedModels.includes(requestedModel)) {
      return requestedModel;
    }
    return configuredModel || def.defaultModel;
  }

  static async generate(req: AIGatewayRequest): Promise<AIGatewayResponse> {
    const cfg = getAIConfig();
    await AIQuotaService.enforceUserFairUse(req.userId);

    const sanitizedMessages = this.sanitizeMessages(req.messages, cfg.maxInputChars);
    const temperature = req.temperature ?? 0.7;
    const maxTokens = Math.min(cfg.maxOutputTokens, req.maxTokens ?? 2048);
    const responseFormat = req.responseFormat ?? 'text';
    const timeoutMs = req.timeoutMs ?? cfg.timeoutMs;
    const requestType = req.requestType || (responseFormat === 'json' ? 'json' : 'chat');

    if (process.env.AI_MOCK_MODE === 'true') {
      const start = Date.now();
      const lastUser = [...sanitizedMessages].reverse().find((m) => m.role === 'user')?.content || '';
      let parsedJson: unknown;
      let content: string;

      if (requestType === 'eval_judge') {
        parsedJson = {
          contextRelevance: 0.92,
          answerFaithfulness: 0.95,
          citationPrecision: 0.9,
          reasoning: 'Deterministic mock evaluation: answer is grounded in retrieved sources.',
        };
        content = JSON.stringify(parsedJson);
      } else if (requestType === 'eval_dataset_gen') {
        parsedJson = {
          items: [
            {
              question: 'What is described in the indexed document?',
              expectedSource: 'document',
              groundTruth: 'Grounded summary from indexed workspace chunk.',
            },
          ],
        };
        content = JSON.stringify(parsedJson);
      } else if (responseFormat === 'json') {
        parsedJson = { status: 'ok', ok: true, summary: 'Deterministic mock JSON response' };
        content = JSON.stringify(parsedJson);
      } else {
        content = `Deterministic grounded response for "${lastUser.slice(0, 120)}" [1].`;
      }

      const inputTokens = approxTokens(sanitizedMessages.map((x) => x.content).join(' '));
      const outputTokens = approxTokens(content);
      const totalTokens = inputTokens + outputTokens;
      const latencyMs = Date.now() - start;

      await persistUsageLog({
        userId: req.userId,
        workspaceId: req.workspaceId,
        provider: 'mock',
        model: 'mock-deterministic-v1',
        requestType,
        latencyMs,
        inputTokens,
        outputTokens,
        totalTokens,
        usageEstimated: true,
        estimatedCost: 0,
        status: 'success',
      });

      return {
        content,
        ...(parsedJson !== undefined ? { json: parsedJson } : {}),
        provider: 'mock',
        model: 'mock-deterministic-v1',
        latencyMs,
        inputTokens,
        outputTokens,
        totalTokens,
        usageEstimated: true,
        estimatedCost: 0,
      };
    }

    const candidates = await this.resolveOrderedProviders(req.provider);
    if (candidates.length === 0) {
      throw new TemporaryAIUnavailableError(
        'AI service is temporarily unavailable because no healthy central providers are currently available.'
      );
    }

    const overallStart = Date.now();
    const errors: string[] = [];

    for (let idx = 0; idx < candidates.length; idx++) {
      const candidate = candidates[idx];
      const creds = getProviderCredentials(candidate.provider);
      if (!creds.configured || !creds.apiKey) continue;

      const adapter = getAdapter(candidate.provider);
      const model = this.selectModelForProvider(candidate.provider, candidate.selectedModel, req.model);
      const effectiveResponseFormat =
        responseFormat === 'json' && !CENTRAL_PROVIDERS[candidate.provider].supportsJsonMode ? 'text' : responseFormat;

      const maxAttempts = 1 + cfg.maxRetries;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const attemptStart = Date.now();
        try {
          const callParams: AdapterCallParams = {
            apiKey: creds.apiKey,
            accountId: creds.accountId,
            model,
            messages: sanitizedMessages,
            temperature,
            maxTokens,
            responseFormat: effectiveResponseFormat,
            timeoutMs,
          };

          const result: AdapterCallResult = await adapter.generate(callParams);

          let parsedJson: unknown;
          if (responseFormat === 'json') {
            const cleanedJson = result.content.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
            try {
              parsedJson = JSON.parse(cleanedJson);
            } catch {
              throw new ProviderNormalizedError({
                provider: candidate.provider,
                kind: 'upstream_error',
                message: `Provider ${candidate.provider} returned invalid JSON`,
                retryableSameProvider: false,
                fallbackAllowed: true,
              });
            }
          }

          const latencyMs = Date.now() - attemptStart;
          const estimatedCost = estimateModelCost(result.model, result.inputTokens, result.outputTokens);

          await ProviderHealthManager.recordSuccess(candidate.provider, result.model, latencyMs);
          await persistUsageLog({
            userId: req.userId,
            workspaceId: req.workspaceId,
            provider: candidate.provider,
            model: result.model,
            requestType,
            latencyMs,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            totalTokens: result.totalTokens,
            usageEstimated: result.usageEstimated,
            estimatedCost,
            status: 'success',
          });

          return {
            content: result.content,
            ...(parsedJson !== undefined ? { json: parsedJson } : {}),
            provider: candidate.provider,
            model: result.model,
            latencyMs,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            totalTokens: result.totalTokens,
            usageEstimated: result.usageEstimated,
            estimatedCost,
          };
        } catch (rawErr) {
          const norm = classifyProviderError(candidate.provider, rawErr);
          const attemptLatency = Date.now() - attemptStart;

          if (!norm.fallbackAllowed) {
            const badReqErr = new Error(norm.message) as Error & { status?: number };
            badReqErr.status = norm.statusCode || 400;
            throw badReqErr;
          }

          const hasMoreAttempts = norm.retryableSameProvider && attempt + 1 < maxAttempts;
          if (hasMoreAttempts) {
            const backoffMs = Math.min(1500, 150 * Math.pow(2, attempt));
            await sleep(backoffMs);
            continue;
          }

          const healthStatus =
            norm.kind === 'rate_limit'
              ? 'rate_limited'
              : norm.kind === 'auth_error'
              ? 'auth_error'
              : 'degraded';

          await ProviderHealthManager.recordFailure({
            provider: candidate.provider,
            model,
            status: healthStatus,
            statusCode: norm.statusCode,
            latencyMs: attemptLatency,
            errorMessage: norm.message,
            cooldownMs: norm.kind === 'rate_limit' ? 30_000 : undefined,
            isFallbackTrigger: idx + 1 < candidates.length,
          });

          errors.push(`${candidate.provider}: ${norm.message}`);
          console.warn(`[AIGateway] Provider ${candidate.provider} failed (${norm.kind}): ${norm.message}`);
          break;
        }
      }
    }

    const totalLatencyMs = Date.now() - overallStart;
    await persistUsageLog({
      userId: req.userId,
      workspaceId: req.workspaceId,
      provider: candidates[0]?.provider || 'none',
      model: req.model || 'unknown',
      requestType,
      latencyMs: totalLatencyMs,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      usageEstimated: true,
      estimatedCost: 0,
      status: 'error',
      errorMessage: errors.join(' | '),
    });

    throw new TemporaryAIUnavailableError(
      'AI service is temporarily unavailable across configured providers. Please try again shortly.'
    );
  }

  static async *stream(req: AIGatewayRequest): AsyncGenerator<string, AIGatewayResponse, unknown> {
    const cfg = getAIConfig();
    await AIQuotaService.enforceUserFairUse(req.userId);

    const sanitizedMessages = this.sanitizeMessages(req.messages, cfg.maxInputChars);
    const temperature = req.temperature ?? 0.7;
    const maxTokens = Math.min(cfg.maxOutputTokens, req.maxTokens ?? 2048);
    const timeoutMs = req.timeoutMs ?? cfg.timeoutMs;
    const requestType = req.requestType || 'stream';

    if (process.env.AI_MOCK_MODE === 'true') {
      const lastUser = sanitizedMessages.filter((m) => m.role === 'user').pop()?.content || '';
      const content = `Deterministic grounded stream response for "${lastUser.slice(0, 120)}" [1].`;
      yield content;
      const inputTokens = approxTokens(sanitizedMessages.map((x) => x.content).join(' '));
      const outputTokens = approxTokens(content);
      const totalTokens = inputTokens + outputTokens;
      await persistUsageLog({
        userId: req.userId,
        workspaceId: req.workspaceId,
        provider: 'mock',
        model: 'mock-deterministic-v1',
        requestType,
        latencyMs: 5,
        inputTokens,
        outputTokens,
        totalTokens,
        usageEstimated: true,
        estimatedCost: 0,
        status: 'success',
      });
      return {
        content,
        provider: 'mock',
        model: 'mock-deterministic-v1',
        latencyMs: 5,
        inputTokens,
        outputTokens,
        totalTokens,
        usageEstimated: true,
        estimatedCost: 0,
      };
    }

    const candidates = await this.resolveOrderedProviders(req.provider);
    if (candidates.length === 0) {
      throw new TemporaryAIUnavailableError();
    }

    const start = Date.now();
    const errors: string[] = [];

    for (let idx = 0; idx < candidates.length; idx++) {
      const candidate = candidates[idx];
      const creds = getProviderCredentials(candidate.provider);
      if (!creds.configured || !creds.apiKey) continue;

      const adapter = getAdapter(candidate.provider);
      const model = this.selectModelForProvider(candidate.provider, candidate.selectedModel, req.model);
      const attemptStart = Date.now();

      try {
        let finalResult: AdapterCallResult;

        if (adapter.stream) {
          const gen = adapter.stream({
            apiKey: creds.apiKey,
            accountId: creds.accountId,
            model,
            messages: sanitizedMessages,
            temperature,
            maxTokens,
            responseFormat: 'text',
            timeoutMs,
          });

          let yieldedAny = false;
          while (true) {
            const next = await gen.next();
            if (next.done) {
              finalResult = next.value;
              break;
            }
            yieldedAny = true;
            yield next.value;
          }
          if (!yieldedAny && !finalResult.content) {
            throw new Error(`Empty stream from ${candidate.provider}`);
          }
        } else {
          // Non-streaming fallback adapter (e.g., Cloudflare Workers AI)
          finalResult = await adapter.generate({
            apiKey: creds.apiKey,
            accountId: creds.accountId,
            model,
            messages: sanitizedMessages,
            temperature,
            maxTokens,
            responseFormat: 'text',
            timeoutMs,
          });
          yield finalResult.content;
        }

        const latencyMs = Date.now() - attemptStart;
        const estimatedCost = estimateModelCost(finalResult.model, finalResult.inputTokens, finalResult.outputTokens);
        await ProviderHealthManager.recordSuccess(candidate.provider, finalResult.model, latencyMs);
        await persistUsageLog({
          userId: req.userId,
          workspaceId: req.workspaceId,
          provider: candidate.provider,
          model: finalResult.model,
          requestType: req.requestType || 'stream',
          latencyMs,
          inputTokens: finalResult.inputTokens,
          outputTokens: finalResult.outputTokens,
          totalTokens: finalResult.totalTokens,
          usageEstimated: finalResult.usageEstimated,
          estimatedCost,
          status: 'success',
        });

        return {
          content: finalResult.content,
          provider: candidate.provider,
          model: finalResult.model,
          latencyMs,
          inputTokens: finalResult.inputTokens,
          outputTokens: finalResult.outputTokens,
          totalTokens: finalResult.totalTokens,
          usageEstimated: finalResult.usageEstimated,
          estimatedCost,
        };
      } catch (rawErr) {
        const norm = classifyProviderError(candidate.provider, rawErr);
        if (!norm.fallbackAllowed) {
          const badReqErr = new Error(norm.message) as Error & { status?: number };
          badReqErr.status = norm.statusCode || 400;
          throw badReqErr;
        }
        await ProviderHealthManager.recordFailure({
          provider: candidate.provider,
          model,
          status: norm.kind === 'rate_limit' ? 'rate_limited' : norm.kind === 'auth_error' ? 'auth_error' : 'degraded',
          statusCode: norm.statusCode,
          latencyMs: Date.now() - attemptStart,
          errorMessage: norm.message,
          cooldownMs: norm.kind === 'rate_limit' ? 30_000 : undefined,
          isFallbackTrigger: idx + 1 < candidates.length,
        });
        errors.push(`${candidate.provider}: ${norm.message}`);
      }
    }

    await persistUsageLog({
      userId: req.userId,
      workspaceId: req.workspaceId,
      provider: candidates[0]?.provider || 'none',
      model: req.model || 'unknown',
      requestType: req.requestType || 'stream',
      latencyMs: Date.now() - start,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      usageEstimated: true,
      estimatedCost: 0,
      status: 'error',
      errorMessage: errors.join(' | '),
    });

    throw new TemporaryAIUnavailableError(
      'AI streaming service is temporarily unavailable across configured providers. Please try again shortly.'
    );
  }
}
