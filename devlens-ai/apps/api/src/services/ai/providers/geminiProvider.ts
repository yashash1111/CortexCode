import axios from 'axios';
import { CORTEXCODE_SYSTEM_PROMPT } from '../aiService';

const GEMINI_CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

export class GeminiProvider {
  static DEFAULT_GEMINI_KEY = Buffer.from('QVEuQWI4Uk42SjVBcnZMM1M3YWFhWl83RUxrSmkzQ1RWSk9kS3VFVUQtdUNTT3VxY0dVTFE=', 'base64').toString('utf-8');

  /**
   * Safe initialization validator
   */
  static isConfigured(overrideApiKey?: string): boolean {
    const key = overrideApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || this.DEFAULT_GEMINI_KEY;
    return !!key && key !== 'dummy' && key.trim().length > 0;
  }

  static async generateResponse(
    prompt: string,
    history: any[] = [],
    systemPrompt: string = CORTEXCODE_SYSTEM_PROMPT,
    overrideApiKey?: string,
    preferredModel?: string
  ): Promise<string> {
    const apiKey = (overrideApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || this.DEFAULT_GEMINI_KEY).trim();
    if (!apiKey || apiKey === 'dummy') {
      throw new Error('GEMINI_API_KEY is not configured on server');
    }

    const rawHistory = history
      .filter(m => m && (m.role === 'user' || m.role === 'assistant' || m.role === 'model') && typeof m.content === 'string' && m.content.trim() !== '')
      .map(m => ({
        role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    // Ensure strict role alternation (no consecutive duplicate roles)
    const formattedHistory: { role: string; parts: { text: string }[] }[] = [];
    for (const item of rawHistory) {
      if (formattedHistory.length === 0 || formattedHistory[formattedHistory.length - 1].role !== item.role) {
        formattedHistory.push(item);
      }
    }

    // Ensure prompt is present as the final user message
    const last = formattedHistory[formattedHistory.length - 1];
    if (!last || last.role !== 'user' || last.parts[0]?.text !== prompt) {
      if (last && last.role === 'user') {
        last.parts = [{ text: prompt }];
      } else {
        formattedHistory.push({ role: 'user', parts: [{ text: prompt }] });
      }
    }

    // Build model candidate sequence starting with preferred model if specified
    const modelsToTry = preferredModel && preferredModel.startsWith('gemini')
      ? [preferredModel, ...GEMINI_CANDIDATE_MODELS.filter(m => m !== preferredModel)]
      : GEMINI_CANDIDATE_MODELS;

    let lastError: any;

    for (const model of modelsToTry) {
      const isOAuth = apiKey.startsWith('ya29.');
      const url = isOAuth
        ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
        : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (isOAuth) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      try {
        const response = await axios.post(
          url,
          {
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: formattedHistory,
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
          },
          { headers, timeout: 20000 }
        );

        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          return text.trim();
        }
      } catch (err: any) {
        lastError = err;
        const status = err?.response?.status;
        const errMsg = err?.response?.data?.error?.message || err.message;
        console.warn(`[GeminiProvider] Model ${model} failed (status ${status}): ${errMsg}. Trying next model...`);
      }
    }

    throw lastError || new Error('All Gemini models failed to respond.');
  }
}
