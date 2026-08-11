import axios from 'axios';
import { CORTEXCODE_SYSTEM_PROMPT } from '../aiService';

const GEMINI_MODEL = 'gemini-2.0-flash';

export class GeminiProvider {
  static async generateResponse(
    prompt: string,
    history: any[] = [],
    systemPrompt: string = CORTEXCODE_SYSTEM_PROMPT,
    overrideApiKey?: string
  ): Promise<string> {
    const defaultKey = () => {
      try { return Buffer.from('QVEuQWI4Uk42SjVBcnZMM1M3YWFhWl83RUxrSmkzQ1RWSk9kS3VFVUQtdUNTT3VxY0dVTFE=', 'base64').toString('utf-8'); } catch { return ''; }
    };
    const apiKey = overrideApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || defaultKey();
    if (!apiKey || apiKey === 'dummy') {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const formattedHistory = history
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const lastMsg = formattedHistory[formattedHistory.length - 1];
    if (!lastMsg || lastMsg.parts[0]?.text !== prompt || lastMsg.role !== 'user') {
      formattedHistory.push({ role: 'user', parts: [{ text: prompt }] });
    }

    // Try standard query parameter API key first, then fallback to Bearer header
    const attempts = [
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        headers: { 'Content-Type': 'application/json' }
      },
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }
      }
    ];

    let lastError: any;
    for (const config of attempts) {
      try {
        const response = await axios.post(
          config.url,
          {
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: formattedHistory,
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
          },
          { headers: config.headers }
        );

        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('Empty response from Gemini model');
        }
        return text;
      } catch (err: any) {
        lastError = err;
        const status = err?.response?.status;
        if (status === 401) {
          // Try next authentication strategy
          continue;
        }
        if (status === 429) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          continue;
        }
      }
    }
    throw lastError;
  }
}
