import axios from 'axios';
import prisma from '../../config/prisma';
import { estimateModelCost } from '../../config/modelPricing';
import { detectPromptInjection, sanitizeUserPrompt } from '../../utils/promptGuard';

export type AIProviderName = 'gemini' | 'groq' | 'huggingface' | 'openai' | 'cerebras' | 'claude' | 'ai-service';

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
  userKeys?: {
    gemini?: string;
    groq?: string;
    huggingface?: string;
    openai?: string;
    cerebras?: string;
    anthropic?: string;
  };
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

const DEFAULT_TIMEOUT_MS = 25_000;

function getProviderKey(provider: AIProviderName, userKeys?: AIGatewayRequest['userKeys']): string | undefined {
  let raw: string | undefined;
  switch (provider) {
    case 'gemini':
      raw = userKeys?.gemini || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      break;
    case 'groq':
      raw = userKeys?.groq || process.env.GROQ_API_KEY;
      break;
    case 'huggingface':
      raw = userKeys?.huggingface || process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
      break;
    case 'openai':
      raw = userKeys?.openai || process.env.OPENAI_API_KEY;
      break;
    case 'cerebras':
      raw = userKeys?.cerebras || process.env.CEREBRAS_API_KEY;
      break;
    case 'claude':
      raw = userKeys?.anthropic || process.env.ANTHROPIC_API_KEY;
      break;
    default:
      raw = undefined;
  }
  if (!raw || raw.trim() === '' || raw.trim() === 'dummy') return undefined;
  return raw.trim();
}

function approxTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
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
        errorMessage: params.errorMessage || null,
        metadata: { usageEstimated: Boolean(params.usageEstimated) },
      },
    });
  } catch (err: any) {
    console.warn('[AIGateway] Failed to persist UsageLog:', err.message);
  }
}

export class AIGateway {
  static getConfiguredProviders() {
    return {
      gemini: Boolean(getProviderKey('gemini')),
      groq: Boolean(getProviderKey('groq')),
      huggingface: Boolean(getProviderKey('huggingface')),
      openai: Boolean(getProviderKey('openai')),
      cerebras: Boolean(getProviderKey('cerebras')),
      claude: Boolean(getProviderKey('claude')),
    };
  }

  private static resolveProviderOrder(
    preferred?: AIProviderName | 'auto',
    userKeys?: AIGatewayRequest['userKeys']
  ): AIProviderName[] {
    const envPref = (preferred && preferred !== 'auto'
      ? preferred
      : (process.env.AI_PROVIDER || 'auto').toLowerCase()) as AIProviderName | 'auto';

    const all: AIProviderName[] = ['gemini', 'groq', 'huggingface', 'openai', 'cerebras', 'claude'];
    const configured = all.filter((p) => Boolean(getProviderKey(p, userKeys)));

    if (envPref !== 'auto' && configured.includes(envPref)) {
      return [envPref, ...configured.filter((p) => p !== envPref)];
    }
    return configured;
  }

  private static sanitizeMessages(messages: GatewayMessage[]): GatewayMessage[] {
    return messages.map((m) => {
      const cleaned = sanitizeUserPrompt(m.content);
      if (m.role === 'user' && detectPromptInjection(cleaned)) {
        console.warn('[AIGateway] Potential prompt-injection pattern detected in user input');
      }
      return { role: m.role, content: cleaned };
    });
  }

  private static async callOpenAICompatible(params: {
    url: string;
    apiKey: string;
    model: string;
    messages: GatewayMessage[];
    temperature: number;
    maxTokens: number;
    responseFormat: 'text' | 'json';
    timeoutMs: number;
    supportsJsonMode?: boolean;
  }) {
    const body: Record<string, any> = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    };
    if (params.responseFormat === 'json' && params.supportsJsonMode !== false) {
      body.response_format = { type: 'json_object' };
    }

    const res = await axios.post(params.url, body, {
      headers: { Authorization: `Bearer ${params.apiKey}`, 'Content-Type': 'application/json' },
      timeout: params.timeoutMs,
    });

    const content = res.data?.choices?.[0]?.message?.content;
    if (!content || !content.trim()) {
      throw new Error(`Empty content returned from ${params.model}`);
    }
    const usage = res.data?.usage;
    const usageEstimated = !usage || typeof usage.total_tokens !== 'number';
    const inputTokens = Number(usage?.prompt_tokens ?? approxTokens(params.messages.map((x) => x.content).join(' ')));
    const outputTokens = Number(usage?.completion_tokens ?? approxTokens(content));
    const totalTokens = Number(usage?.total_tokens ?? inputTokens + outputTokens);
    return { content: content.trim(), model: params.model, inputTokens, outputTokens, totalTokens, usageEstimated };
  }

  private static async callGemini(
    messages: GatewayMessage[],
    apiKey: string,
    model: string | undefined,
    temperature: number,
    maxTokens: number,
    responseFormat: 'text' | 'json',
    timeoutMs: number
  ) {
    const candidates = model && model.startsWith('gemini')
      ? [model, 'gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest']
      : ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];
    const uniqueModels = Array.from(new Set(candidates));

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

    const generationConfig: Record<string, any> = { temperature, maxOutputTokens: maxTokens };
    if (responseFormat === 'json') generationConfig.responseMimeType = 'application/json';

    let lastErr: any;
    for (const m of uniqueModels) {
      try {
        const isOAuth = apiKey.startsWith('ya29.');
        const url = isOAuth
          ? `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`
          : `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (isOAuth) headers['Authorization'] = `Bearer ${apiKey}`;

        const res = await axios.post(
          url,
          {
            ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
            contents,
            generationConfig,
          },
          { headers, timeout: timeoutMs }
        );

        const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          const meta = res.data?.usageMetadata;
          const usageEstimated = !meta || typeof meta.totalTokenCount !== 'number';
          const inputTokens = Number(meta?.promptTokenCount ?? approxTokens(messages.map((x) => x.content).join(' ')));
          const outputTokens = Number(meta?.candidatesTokenCount ?? approxTokens(text));
          const totalTokens = Number(meta?.totalTokenCount ?? inputTokens + outputTokens);
          return { content: text.trim(), model: m, inputTokens, outputTokens, totalTokens, usageEstimated };
        }
      } catch (err: any) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('All Gemini models failed');
  }

  private static async callClaude(
    messages: GatewayMessage[],
    apiKey: string,
    temperature: number,
    maxTokens: number,
    timeoutMs: number
  ) {
    const model = 'claude-3-5-sonnet-20240620';
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const res = await axios.post(
      'https://api.anthropic.com/v1/messages',
      { model, max_tokens: maxTokens, temperature, ...(system ? { system } : {}), messages: chatMessages },
      {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        timeout: timeoutMs,
      }
    );

    const content = res.data?.content?.[0]?.text;
    if (!content || !content.trim()) throw new Error('Claude returned empty content');
    const usage = res.data?.usage;
    const usageEstimated = !usage;
    const inputTokens = Number(usage?.input_tokens ?? approxTokens(messages.map((x) => x.content).join(' ')));
    const outputTokens = Number(usage?.output_tokens ?? approxTokens(content));
    return { content: content.trim(), model, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, usageEstimated };
  }

  static async generate(req: AIGatewayRequest): Promise<AIGatewayResponse> {
    const sanitizedMessages = this.sanitizeMessages(req.messages);
    const providers = this.resolveProviderOrder(req.provider, req.userKeys);
    if (providers.length === 0) {
      throw new Error('No AI provider API keys are configured on the server.');
    }

    const temperature = req.temperature ?? 0.7;
    const maxTokens = req.maxTokens ?? 2048;
    const responseFormat = req.responseFormat ?? 'text';
    const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const requestType = req.requestType || (responseFormat === 'json' ? 'json' : 'chat');

    const start = Date.now();
    const errors: string[] = [];

    for (const provider of providers) {
      const apiKey = getProviderKey(provider, req.userKeys);
      if (!apiKey) continue;

      try {
        let result: {
          content: string;
          model: string;
          inputTokens: number;
          outputTokens: number;
          totalTokens: number;
          usageEstimated: boolean;
        };

        if (provider === 'gemini') {
          result = await this.callGemini(sanitizedMessages, apiKey, req.model, temperature, maxTokens, responseFormat, timeoutMs);
        } else if (provider === 'groq') {
          const targetModel = req.model && req.model.includes('llama') ? req.model : 'llama-3.3-70b-versatile';
          result = await this.callOpenAICompatible({
            url: 'https://api.groq.com/openai/v1/chat/completions',
            apiKey,
            model: targetModel,
            messages: sanitizedMessages,
            temperature,
            maxTokens,
            responseFormat,
            timeoutMs,
            supportsJsonMode: true,
          });
        } else if (provider === 'huggingface') {
          const targetModel = req.model && req.model.includes('/') ? req.model : 'Qwen/Qwen2.5-72B-Instruct';
          result = await this.callOpenAICompatible({
            url: 'https://router.huggingface.co/v1/chat/completions',
            apiKey,
            model: targetModel,
            messages: sanitizedMessages,
            temperature,
            maxTokens,
            responseFormat,
            timeoutMs,
            supportsJsonMode: false,
          });
        } else if (provider === 'openai') {
          const targetModel = req.model && req.model.startsWith('gpt-') ? req.model : 'gpt-4o-mini';
          result = await this.callOpenAICompatible({
            url: 'https://api.openai.com/v1/chat/completions',
            apiKey,
            model: targetModel,
            messages: sanitizedMessages,
            temperature,
            maxTokens,
            responseFormat,
            timeoutMs,
            supportsJsonMode: true,
          });
        } else if (provider === 'cerebras') {
          const targetModel = req.model && req.model.includes('llama') ? req.model : 'llama-3.3-70b';
          result = await this.callOpenAICompatible({
            url: 'https://api.cerebras.ai/v1/chat/completions',
            apiKey,
            model: targetModel,
            messages: sanitizedMessages,
            temperature,
            maxTokens,
            responseFormat,
            timeoutMs,
            supportsJsonMode: true,
          });
        } else {
          result = await this.callClaude(sanitizedMessages, apiKey, temperature, maxTokens, timeoutMs);
        }

        let parsedJson: any;
        if (responseFormat === 'json') {
          const cleanedJson = result.content.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
          try {
            parsedJson = JSON.parse(cleanedJson);
          } catch {
            throw new Error(`Provider ${provider} returned invalid JSON`);
          }
        }

        const latencyMs = Date.now() - start;
        const estimatedCost = estimateModelCost(result.model, result.inputTokens, result.outputTokens);

        await persistUsageLog({
          userId: req.userId,
          workspaceId: req.workspaceId,
          provider,
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
          provider,
          model: result.model,
          latencyMs,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          totalTokens: result.totalTokens,
          usageEstimated: result.usageEstimated,
          estimatedCost,
        };
      } catch (err: any) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.error?.message || err?.message || 'Unknown provider error';
        errors.push(`${provider}${status ? ` (${status})` : ''}: ${msg}`);
        console.warn(`[AIGateway] Provider ${provider} failed: ${msg}`);
      }
    }

    const latencyMs = Date.now() - start;
    const errorSummary = errors.join(' | ');
    await persistUsageLog({
      userId: req.userId,
      workspaceId: req.workspaceId,
      provider: providers[0],
      model: req.model || 'unknown',
      requestType,
      latencyMs,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      usageEstimated: true,
      estimatedCost: 0,
      status: 'error',
      errorMessage: errorSummary,
    });

    throw new Error(`All configured AI providers failed: ${errorSummary}`);
  }

  static async *stream(req: AIGatewayRequest): AsyncGenerator<string, AIGatewayResponse, unknown> {
    const sanitizedMessages = this.sanitizeMessages(req.messages);
    const providers = this.resolveProviderOrder(req.provider, req.userKeys);
    if (providers.length === 0) {
      throw new Error('No AI provider API keys are configured on the server.');
    }

    const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const start = Date.now();
    const geminiKey = getProviderKey('gemini', req.userKeys);
    const groqKey = getProviderKey('groq', req.userKeys);

    if (providers[0] === 'gemini' && geminiKey) {
      const model = req.model && req.model.startsWith('gemini') ? req.model : 'gemini-3.5-flash-lite';
      const systemText = sanitizedMessages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
      const contents = sanitizedMessages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${geminiKey}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
            contents,
            generationConfig: {
              temperature: req.temperature ?? 0.7,
              maxOutputTokens: req.maxTokens ?? 2048,
            },
          }),
          signal: controller.signal,
        });

        if (!resp.ok || !resp.body) {
          throw new Error(`Gemini stream HTTP ${resp.status}`);
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const raw = line.slice(5).trim();
            if (!raw || raw === '[DONE]') continue;
            try {
              const parsed = JSON.parse(raw);
              const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                fullText += text;
                yield text;
              }
            } catch {
              // ignore partial JSON frames
            }
          }
        }

        const latencyMs = Date.now() - start;
        const inputTokens = approxTokens(sanitizedMessages.map((m) => m.content).join(' '));
        const outputTokens = approxTokens(fullText);
        const estimatedCost = estimateModelCost(model, inputTokens, outputTokens);

        await persistUsageLog({
          userId: req.userId,
          workspaceId: req.workspaceId,
          provider: 'gemini',
          model,
          requestType: req.requestType || 'stream',
          latencyMs,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          usageEstimated: true,
          estimatedCost,
          status: 'success',
        });

        return {
          content: fullText,
          provider: 'gemini',
          model,
          latencyMs,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          usageEstimated: true,
          estimatedCost,
        };
      } finally {
        clearTimeout(timer);
      }
    }

    // Stream via Groq if primary is Groq
    if (providers[0] === 'groq' && groqKey) {
      const model = 'llama-3.3-70b-versatile';
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: sanitizedMessages,
          temperature: req.temperature ?? 0.7,
          max_tokens: req.maxTokens ?? 2048,
          stream: true,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (resp.ok && resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const raw = line.slice(5).trim();
            if (!raw || raw === '[DONE]') continue;
            try {
              const delta = JSON.parse(raw)?.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                yield delta;
              }
            } catch { /* ignore */ }
          }
        }
        const latencyMs = Date.now() - start;
        const inputTokens = approxTokens(sanitizedMessages.map((m) => m.content).join(' '));
        const outputTokens = approxTokens(fullText);
        const estimatedCost = estimateModelCost(model, inputTokens, outputTokens);
        await persistUsageLog({
          userId: req.userId,
          workspaceId: req.workspaceId,
          provider: 'groq',
          model,
          requestType: req.requestType || 'stream',
          latencyMs,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          usageEstimated: true,
          estimatedCost,
          status: 'success',
        });
        return {
          content: fullText,
          provider: 'groq',
          model,
          latencyMs,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          usageEstimated: true,
          estimatedCost,
        };
      }
    }

    const result = await this.generate({ ...req, requestType: req.requestType || 'stream' });
    yield result.content;
    return result;
  }
}
