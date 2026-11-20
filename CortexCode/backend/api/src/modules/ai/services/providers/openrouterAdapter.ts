import axios from 'axios';
import {
  AdapterCallParams,
  AdapterCallResult,
  ProviderAdapter,
  approxTokens,
  classifyProviderError,
} from './types';

export const openrouterAdapter: ProviderAdapter = {
  id: 'openrouter',

  async generate(params: AdapterCallParams): Promise<AdapterCallResult> {
    const body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    };
    if (params.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    try {
      const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', body, {
        headers: {
          Authorization: `Bearer ${params.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.CLIENT_URL || 'https://cortexcode.ai',
          'X-Title': 'CortexCode',
        },
        timeout: params.timeoutMs,
      });

      const content = res.data?.choices?.[0]?.message?.content;
      if (!content || !content.trim()) {
        throw new Error(`OpenRouter returned empty content for ${params.model}`);
      }
      const usage = res.data?.usage;
      const usageEstimated = !usage || typeof usage.total_tokens !== 'number';
      const inputTokens = Number(usage?.prompt_tokens ?? approxTokens(params.messages.map((x) => x.content).join(' ')));
      const outputTokens = Number(usage?.completion_tokens ?? approxTokens(content));
      const totalTokens = Number(usage?.total_tokens ?? inputTokens + outputTokens);
      return { content: content.trim(), model: params.model, inputTokens, outputTokens, totalTokens, usageEstimated };
    } catch (err) {
      throw classifyProviderError('openrouter', err);
    }
  },

  async *stream(params: AdapterCallParams): AsyncGenerator<string, AdapterCallResult, unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), params.timeoutMs);

    try {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${params.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.CLIENT_URL || 'https://cortexcode.ai',
          'X-Title': 'CortexCode',
        },
        body: JSON.stringify({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const errBody = await resp.text().catch(() => '');
        throw classifyProviderError('openrouter', {
          response: { status: resp.status, data: { message: errBody || `HTTP ${resp.status}` } },
        });
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6).trim();
          if (!dataStr || dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed?.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              yield delta;
            }
          } catch {
            // ignore partial JSON
          }
        }
      }

      const inputTokens = approxTokens(params.messages.map((x) => x.content).join(' '));
      const outputTokens = approxTokens(fullText);
      return {
        content: fullText,
        model: params.model,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        usageEstimated: true,
      };
    } catch (err) {
      throw classifyProviderError('openrouter', err);
    } finally {
      clearTimeout(timer);
    }
  },

  async validateConnection(apiKey: string, _model: string, timeoutMs: number) {
    const start = Date.now();
    try {
      const res = await axios.get('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: Math.min(timeoutMs, 10_000),
      });
      return { ok: res.status === 200, latencyMs: Date.now() - start };
    } catch (err) {
      const norm = classifyProviderError('openrouter', err);
      return { ok: false, latencyMs: Date.now() - start, error: norm.message };
    }
  },
};
