export type CentralAIProviderName = 'gemini' | 'groq' | 'openrouter' | 'cloudflare';

export interface ProviderDefinition {
  id: CentralAIProviderName;
  displayName: string;
  defaultModel: string;
  supportedModels: string[];
  supportsStreaming: boolean;
  supportsJsonMode: boolean;
  defaultPriority: number;
}

export const CENTRAL_PROVIDERS: Record<CentralAIProviderName, ProviderDefinition> = {
  gemini: {
    id: 'gemini',
    displayName: 'Google Gemini',
    defaultModel: 'gemini-3-flash-preview',
    supportedModels: [
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite-preview',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ],
    supportsStreaming: true,
    supportsJsonMode: true,
    defaultPriority: 1,
  },
  groq: {
    id: 'groq',
    displayName: 'Groq',
    defaultModel: 'llama-3.3-70b-versatile',
    supportedModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    supportsStreaming: true,
    supportsJsonMode: true,
    defaultPriority: 2,
  },
  openrouter: {
    id: 'openrouter',
    displayName: 'OpenRouter',
    defaultModel: 'openai/gpt-4o-mini',
    supportedModels: ['openai/gpt-4o-mini', 'meta-llama/llama-3.3-70b-instruct:free', 'google/gemini-2.0-flash-001'],
    supportsStreaming: true,
    supportsJsonMode: true,
    defaultPriority: 3,
  },
  cloudflare: {
    id: 'cloudflare',
    displayName: 'Cloudflare Workers AI',
    defaultModel: '@cf/meta/llama-3.1-8b-instruct',
    supportedModels: ['@cf/meta/llama-3.1-8b-instruct', '@cf/meta/llama-3.3-70b-instruct-fp8-fast'],
    supportsStreaming: false,
    supportsJsonMode: false,
    defaultPriority: 4,
  },
};

export const ALL_CENTRAL_PROVIDER_IDS: CentralAIProviderName[] = [
  'gemini',
  'groq',
  'openrouter',
  'cloudflare',
];

function cleanSecret(val: string | undefined): string | undefined {
  if (!val) return undefined;
  const trimmed = val.trim();
  if (!trimmed || trimmed === 'dummy' || trimmed.startsWith('your_')) return undefined;
  return trimmed;
}

export function getProviderCredentials(provider: CentralAIProviderName): {
  configured: boolean;
  apiKey?: string;
  accountId?: string;
} {
  switch (provider) {
    case 'gemini': {
      const apiKey = cleanSecret(process.env.GEMINI_API_KEY) || cleanSecret(process.env.GOOGLE_API_KEY);
      return { configured: Boolean(apiKey), apiKey };
    }
    case 'groq': {
      const apiKey = cleanSecret(process.env.GROQ_API_KEY);
      return { configured: Boolean(apiKey), apiKey };
    }
    case 'openrouter': {
      const apiKey = cleanSecret(process.env.OPENROUTER_API_KEY);
      return { configured: Boolean(apiKey), apiKey };
    }
    case 'cloudflare': {
      const accountId = cleanSecret(process.env.CLOUDFLARE_ACCOUNT_ID);
      const apiKey = cleanSecret(process.env.CLOUDFLARE_API_TOKEN);
      return { configured: Boolean(accountId && apiKey), apiKey, accountId };
    }
  }
}

export function getAIConfig() {
  const defaultProviderRaw = (process.env.AI_DEFAULT_PROVIDER || 'gemini').toLowerCase();
  const defaultProvider: CentralAIProviderName =
    ALL_CENTRAL_PROVIDER_IDS.includes(defaultProviderRaw as CentralAIProviderName)
      ? (defaultProviderRaw as CentralAIProviderName)
      : 'gemini';

  return {
    defaultProvider,
    fallbackEnabled: process.env.AI_PROVIDER_FALLBACK_ENABLED !== 'false',
    timeoutMs: Math.max(2000, Number(process.env.AI_REQUEST_TIMEOUT_MS || 30_000)),
    maxRetries: Math.min(4, Math.max(0, Number(process.env.AI_MAX_RETRIES ?? 2))),
    userDailyRequestLimit: Math.max(10, Number(process.env.AI_USER_DAILY_REQUEST_LIMIT || 250)),
    userMonthlyTokenLimit: Math.max(10_000, Number(process.env.AI_USER_MONTHLY_TOKEN_LIMIT || 2_000_000)),
    maxInputChars: Math.max(2000, Number(process.env.AI_MAX_INPUT_CHARS || 48_000)),
    maxOutputTokens: Math.min(8192, Math.max(128, Number(process.env.AI_MAX_OUTPUT_TOKENS || 4096))),
  };
}

export function validateAIConfigAtStartup() {
  const status = ALL_CENTRAL_PROVIDER_IDS.map((id) => ({
    provider: id,
    configured: getProviderCredentials(id).configured,
  }));
  const configuredCount = status.filter((s) => s.configured).length;
  const summary = status.map((s) => `${s.provider}=${s.configured ? 'Configured' : 'Not configured'}`).join(', ');

  if (configuredCount === 0) {
    console.warn(`[AIGateway] No central AI provider credentials configured (${summary}). AI requests will return temporary unavailability until configured.`);
  } else {
    console.info(`[AIGateway] Central providers initialized: ${summary}`);
  }
  return status;
}
