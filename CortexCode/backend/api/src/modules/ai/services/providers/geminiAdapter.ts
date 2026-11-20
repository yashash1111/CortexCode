import axios from 'axios';
import {
  AdapterCallParams,
  AdapterCallResult,
  AdapterMessage,
  ProviderAdapter,
  approxTokens,
  classifyProviderError,
} from './types';

function buildGeminiPayload(messages: AdapterMessage[], temperature: number, maxTokens: number, responseFormat: 'text' | 'json') {
  const systemText = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const contents: { role: string; parts: { text: string }[] }[] = [];
  for (const m of messages.filter((m) => m.role !== 'system')) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts.push({ text: m.content });
    } else {
      contents.push({ role, parts: [{ text: m.content }] });
    }
  }
  if (contents.length === 0) contents.push({ role: 'user', parts: [{ text: 'Hello' }] });

  const generationConfig: Record<string, unknown> = { temperature, maxOutputTokens: maxTokens };
  if (responseFormat === 'json') generationConfig.responseMimeType = 'application/json';

  return {
    ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
    contents,
    generationConfig,
  };
}

export const geminiAdapter: ProviderAdapter = {
  id: 'gemini',

  async generate(params: AdapterCallParams): Promise<AdapterCallResult> {
    const payload = buildGeminiPayload(params.messages, params.temperature, params.maxTokens, params.responseFormat);
    const isOAuth = params.apiKey.startsWith('ya29.');
    const candidateModels = Array.from(
      new Set([params.model, 'gemini-3-flash-preview', 'gemini-3.1-flash-lite-preview'])
    );
    let lastErr: unknown;

    for (const modelName of candidateModels) {
      const url = isOAuth
        ? `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`
        : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${params.apiKey}`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (isOAuth) headers['Authorization'] = `Bearer ${params.apiKey}`;

      try {
        const res = await axios.post(url, payload, { headers, timeout: params.timeoutMs });
        const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text || !text.trim()) {
          throw new Error(`Gemini returned empty content for ${modelName}`);
        }
        const meta = res.data?.usageMetadata;
        const usageEstimated = !meta || typeof meta.totalTokenCount !== 'number';
        const inputTokens = Number(meta?.promptTokenCount ?? approxTokens(params.messages.map((x) => x.content).join(' ')));
        const outputTokens = Number(meta?.candidatesTokenCount ?? approxTokens(text));
        const totalTokens = Number(meta?.totalTokenCount ?? inputTokens + outputTokens);
        return {
          content: text.trim(),
          model: modelName,
          inputTokens,
          outputTokens,
          totalTokens,
          usageEstimated,
        };
      } catch (err) {
        const classified = classifyProviderError('gemini', err);
        lastErr = classified;
        if (classified.kind === 'auth_error' || classified.kind === 'bad_request') {
          throw classified;
        }
      }
    }
    throw lastErr;
  },

  async *stream(params: AdapterCallParams): AsyncGenerator<string, AdapterCallResult, unknown> {
    const payload = buildGeminiPayload(params.messages, params.temperature, params.maxTokens, params.responseFormat);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:streamGenerateContent?alt=sse&key=${params.apiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), params.timeoutMs);

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const errBody = await resp.text().catch(() => '');
        throw classifyProviderError('gemini', {
          response: { status: resp.status, data: { message: errBody || `HTTP ${resp.status}` } },
        });
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullText = '';
      let inputTokens = approxTokens(params.messages.map((x) => x.content).join(' '));
      let outputTokens = 0;

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
            const delta = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (delta) {
              fullText += delta;
              yield delta;
            }
            if (parsed?.usageMetadata) {
              inputTokens = Number(parsed.usageMetadata.promptTokenCount ?? inputTokens);
              outputTokens = Number(parsed.usageMetadata.candidatesTokenCount ?? approxTokens(fullText));
            }
          } catch {
            // ignore partial SSE JSON frames
          }
        }
      }

      if (!outputTokens) outputTokens = approxTokens(fullText);
      return {
        content: fullText,
        model: params.model,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        usageEstimated: false,
      };
    } catch (err) {
      throw classifyProviderError('gemini', err);
    } finally {
      clearTimeout(timer);
    }
  },

  async validateConnection(apiKey: string, model: string, timeoutMs: number) {
    const start = Date.now();
    try {
      const res = await axios.get(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${apiKey}`,
        { timeout: Math.min(timeoutMs, 10_000) }
      );
      return { ok: res.status === 200, latencyMs: Date.now() - start };
    } catch (err) {
      const norm = classifyProviderError('gemini', err);
      return { ok: false, latencyMs: Date.now() - start, error: norm.message };
    }
  },
};
