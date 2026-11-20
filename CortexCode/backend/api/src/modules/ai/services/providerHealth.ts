import prisma from '../../../config/prisma';
import {
  ALL_CENTRAL_PROVIDER_IDS,
  CENTRAL_PROVIDERS,
  CentralAIProviderName,
  getProviderCredentials,
} from './aiConfig';
import { redactSecrets } from './secretRedactor';

export type ProviderHealthStatus = 'healthy' | 'degraded' | 'rate_limited' | 'auth_error' | 'unavailable';

export interface ProviderRuntimeHealth {
  provider: CentralAIProviderName;
  status: ProviderHealthStatus;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  lastLatencyMs: number | null;
  cooldownUntil: number | null;
  requestCount: number;
  failureCount: number;
  fallbackCount: number;
}

const runtimeHealth = new Map<CentralAIProviderName, ProviderRuntimeHealth>();

function getOrInitHealth(provider: CentralAIProviderName): ProviderRuntimeHealth {
  let existing = runtimeHealth.get(provider);
  if (!existing) {
    existing = {
      provider,
      status: getProviderCredentials(provider).configured ? 'healthy' : 'unavailable',
      lastSuccessAt: null,
      lastFailureAt: null,
      lastError: null,
      lastLatencyMs: null,
      cooldownUntil: null,
      requestCount: 0,
      failureCount: 0,
      fallbackCount: 0,
    };
    runtimeHealth.set(provider, existing);
  }
  return existing;
}

export class ProviderHealthManager {
  static getRuntimeHealth(provider: CentralAIProviderName): ProviderRuntimeHealth {
    const state = getOrInitHealth(provider);
    if (!getProviderCredentials(provider).configured) {
      state.status = 'unavailable';
    } else if (state.cooldownUntil && Date.now() >= state.cooldownUntil) {
      state.cooldownUntil = null;
      if (state.status === 'rate_limited') state.status = 'healthy';
    }
    return { ...state };
  }

  static isAvailable(provider: CentralAIProviderName): boolean {
    if (!getProviderCredentials(provider).configured) return false;
    const state = this.getRuntimeHealth(provider);
    if (state.cooldownUntil && Date.now() < state.cooldownUntil) return false;
    return state.status !== 'auth_error';
  }

  static async recordSuccess(provider: CentralAIProviderName, model: string, latencyMs: number) {
    const state = getOrInitHealth(provider);
    state.status = 'healthy';
    state.lastSuccessAt = new Date().toISOString();
    state.lastError = null;
    state.lastLatencyMs = latencyMs;
    state.cooldownUntil = null;
    state.requestCount += 1;

    try {
      await prisma.aIProviderHealthEvent.create({
        data: { provider, model, status: 'healthy', latencyMs },
      });
    } catch {
      // non-fatal telemetry write
    }
  }

  static async recordFailure(params: {
    provider: CentralAIProviderName;
    model?: string;
    status: ProviderHealthStatus;
    statusCode?: number;
    latencyMs?: number;
    errorMessage: string;
    cooldownMs?: number;
    isFallbackTrigger?: boolean;
  }) {
    const state = getOrInitHealth(params.provider);
    const safeMsg = redactSecrets(params.errorMessage).slice(0, 500);
    state.status = params.status;
    state.lastFailureAt = new Date().toISOString();
    state.lastError = safeMsg;
    if (typeof params.latencyMs === 'number') state.lastLatencyMs = params.latencyMs;
    state.requestCount += 1;
    state.failureCount += 1;
    if (params.isFallbackTrigger) state.fallbackCount += 1;
    if (params.cooldownMs && params.cooldownMs > 0) {
      state.cooldownUntil = Date.now() + params.cooldownMs;
    }

    try {
      await prisma.aIProviderHealthEvent.create({
        data: {
          provider: params.provider,
          model: params.model || null,
          status: params.status,
          latencyMs: params.latencyMs ?? null,
          statusCode: params.statusCode ?? null,
          errorMessage: safeMsg,
        },
      });
    } catch {
      // non-fatal telemetry write
    }
  }

  static resetForTests() {
    runtimeHealth.clear();
  }

  static async getEffectiveConfigs() {
    let dbConfigs: Array<{
      provider: string;
      enabled: boolean;
      priority: number;
      selectedModel: string | null;
      dailyRequestLimit: number | null;
      monthlyTokenLimit: number | null;
    }> = [];
    try {
      dbConfigs = await prisma.aIProviderConfig.findMany();
    } catch {
      dbConfigs = [];
    }

    const byProvider = new Map(dbConfigs.map((c) => [c.provider, c]));

    return ALL_CENTRAL_PROVIDER_IDS.map((id) => {
      const def = CENTRAL_PROVIDERS[id];
      const db = byProvider.get(id);
      const creds = getProviderCredentials(id);
      const health = this.getRuntimeHealth(id);

      return {
        provider: id,
        displayName: def.displayName,
        configured: creds.configured,
        credentialStatus: creds.configured ? 'Configured' : 'Not configured',
        enabled: db ? db.enabled : true,
        priority: db ? db.priority : def.defaultPriority,
        selectedModel: db?.selectedModel || def.defaultModel,
        supportedModels: def.supportedModels,
        supportsStreaming: def.supportsStreaming,
        supportsJsonMode: def.supportsJsonMode,
        dailyRequestLimit: db?.dailyRequestLimit ?? null,
        monthlyTokenLimit: db?.monthlyTokenLimit ?? null,
        health,
      };
    }).sort((a, b) => a.priority - b.priority);
  }
}
