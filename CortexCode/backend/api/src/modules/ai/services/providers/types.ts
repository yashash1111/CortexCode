import { CentralAIProviderName } from '../aiConfig';
import { redactSecrets } from '../secretRedactor';

export interface AdapterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AdapterCallParams {
  apiKey: string;
  accountId?: string;
  model: string;
  messages: AdapterMessage[];
  temperature: number;
  maxTokens: number;
  responseFormat: 'text' | 'json';
  timeoutMs: number;
}

export interface AdapterCallResult {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  usageEstimated: boolean;
}

export type NormalizedErrorKind =
  | 'rate_limit'
  | 'auth_error'
  | 'upstream_error'
  | 'timeout'
  | 'network'
  | 'bad_request'
  | 'unknown';

export class ProviderNormalizedError extends Error {
  provider: CentralAIProviderName;
  kind: NormalizedErrorKind;
  statusCode?: number;
  retryableSameProvider: boolean;
  fallbackAllowed: boolean;

  constructor(params: {
    provider: CentralAIProviderName;
    kind: NormalizedErrorKind;
    message: string;
    statusCode?: number;
    retryableSameProvider: boolean;
    fallbackAllowed: boolean;
  }) {
    super(redactSecrets(params.message));
    this.name = 'ProviderNormalizedError';
    this.provider = params.provider;
    this.kind = params.kind;
    this.statusCode = params.statusCode;
    this.retryableSameProvider = params.retryableSameProvider;
    this.fallbackAllowed = params.fallbackAllowed;
  }
}

export function approxTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function classifyProviderError(provider: CentralAIProviderName, err: unknown): ProviderNormalizedError {
  if (err instanceof ProviderNormalizedError) return err;

  const axiosErr = err as {
    code?: string;
    message?: string;
    response?: { status?: number; data?: { error?: { message?: string }; message?: string } };
  };
  const status = axiosErr?.response?.status;
  const rawMsg =
    axiosErr?.response?.data?.error?.message ||
    axiosErr?.response?.data?.message ||
    axiosErr?.message ||
    'Provider request failed';
  const safeMsg = redactSecrets(rawMsg);

  if (status === 400 || status === 422) {
    return new ProviderNormalizedError({
      provider,
      kind: 'bad_request',
      statusCode: status,
      message: safeMsg,
      retryableSameProvider: false,
      fallbackAllowed: false,
    });
  }

  if (status === 401 || status === 403) {
    return new ProviderNormalizedError({
      provider,
      kind: 'auth_error',
      statusCode: status,
      message: safeMsg,
      retryableSameProvider: false,
      fallbackAllowed: true,
    });
  }

  if (status === 429) {
    return new ProviderNormalizedError({
      provider,
      kind: 'rate_limit',
      statusCode: status,
      message: safeMsg,
      retryableSameProvider: false,
      fallbackAllowed: true,
    });
  }

  if (status && [500, 502, 503, 504].includes(status)) {
    return new ProviderNormalizedError({
      provider,
      kind: 'upstream_error',
      statusCode: status,
      message: safeMsg,
      retryableSameProvider: true,
      fallbackAllowed: true,
    });
  }

  const code = (axiosErr?.code || '').toUpperCase();
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || safeMsg.toLowerCase().includes('timeout')) {
    return new ProviderNormalizedError({
      provider,
      kind: 'timeout',
      statusCode: status,
      message: safeMsg,
      retryableSameProvider: true,
      fallbackAllowed: true,
    });
  }

  if (['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'].includes(code)) {
    return new ProviderNormalizedError({
      provider,
      kind: 'network',
      statusCode: status,
      message: safeMsg,
      retryableSameProvider: true,
      fallbackAllowed: true,
    });
  }

  return new ProviderNormalizedError({
    provider,
    kind: 'unknown',
    statusCode: status,
    message: safeMsg,
    retryableSameProvider: false,
    fallbackAllowed: true,
  });
}

export interface ProviderAdapter {
  readonly id: CentralAIProviderName;
  generate(params: AdapterCallParams): Promise<AdapterCallResult>;
  stream?(params: AdapterCallParams): AsyncGenerator<string, AdapterCallResult, unknown>;
  validateConnection(apiKey: string, model: string, timeoutMs: number, accountId?: string): Promise<{ ok: boolean; latencyMs: number; error?: string }>;
}
