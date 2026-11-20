import axios from 'axios';
import {
  AdapterCallParams,
  AdapterCallResult,
  ProviderAdapter,
  approxTokens,
  classifyProviderError,
} from './types';

export const cloudflareAdapter: ProviderAdapter = {
  id: 'cloudflare',

  async generate(params: AdapterCallParams): Promise<AdapterCallResult> {
    if (!params.accountId) {
      throw classifyProviderError('cloudflare', {
        response: { status: 401, data: { message: 'CLOUDFLARE_ACCOUNT_ID is not configured' } },
      });
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${params.accountId}/ai/run/${params.model}`;
    try {
      const res = await axios.post(
        url,
        {
          messages: params.messages,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
        },
        {
          headers: {
            Authorization: `Bearer ${params.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: params.timeoutMs,
        }
      );

      const content = res.data?.result?.response;
      if (!content || !String(content).trim()) {
        throw new Error(`Cloudflare Workers AI returned empty content for ${params.model}`);
      }
      const text = String(content).trim();
      const inputTokens = approxTokens(params.messages.map((x) => x.content).join(' '));
      const outputTokens = approxTokens(text);
      return {
        content: text,
        model: params.model,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        usageEstimated: true,
      };
    } catch (err) {
      throw classifyProviderError('cloudflare', err);
    }
  },

  async validateConnection(apiKey: string, _model: string, timeoutMs: number, accountId?: string) {
    const start = Date.now();
    if (!accountId) {
      return { ok: false, latencyMs: 0, error: 'CLOUDFLARE_ACCOUNT_ID is not configured' };
    }
    try {
      const res = await axios.get(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search?per_page=1`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: Math.min(timeoutMs, 10_000),
        }
      );
      return { ok: res.status === 200, latencyMs: Date.now() - start };
    } catch (err) {
      const norm = classifyProviderError('cloudflare', err);
      return { ok: false, latencyMs: Date.now() - start, error: norm.message };
    }
  },
};
