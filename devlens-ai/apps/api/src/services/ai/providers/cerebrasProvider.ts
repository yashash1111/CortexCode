import axios from 'axios';
import { CORTEXCODE_SYSTEM_PROMPT } from '../aiService';

const CEREBRAS_CANDIDATE_MODELS = [
  'gemma-4-31b',
  'gpt-oss-120b',
  'zai-glm-4.7'
];

export class CerebrasProvider {
  static DEFAULT_CEREBRAS_KEY = 'csk-fynwdrytjrrwfdjpw2pv2635ymdw584jvyeerkxxvj3r3dpe';

  static async generateResponse(
    prompt: string,
    history: any[] = [],
    model: string = 'gemma-4-31b',
    systemPrompt: string = CORTEXCODE_SYSTEM_PROMPT,
    overrideApiKey?: string
  ): Promise<string> {
    const apiKey = overrideApiKey || process.env.CEREBRAS_API_KEY || this.DEFAULT_CEREBRAS_KEY;
    if (!apiKey || apiKey === 'dummy') {
      throw new Error('CEREBRAS_API_KEY is not configured');
    }

    const formattedHistory = history
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map(m => ({
        role: m.role,
        content: m.content
      }));

    const lastMsg = formattedHistory[formattedHistory.length - 1];
    if (!lastMsg || lastMsg.content !== prompt || lastMsg.role !== 'user') {
      formattedHistory.push({ role: 'user', content: prompt });
    }

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...formattedHistory
    ];

    // Determine target model sequence
    let targetModel = 'gemma-4-31b';
    if (model.includes('oss') || model.includes('120b')) {
      targetModel = 'gpt-oss-120b';
    } else if (model.includes('zai') || model.includes('glm')) {
      targetModel = 'zai-glm-4.7';
    }

    const modelsToTry = [targetModel, ...CEREBRAS_CANDIDATE_MODELS.filter(m => m !== targetModel)];
    let lastError: any;

    for (const m of modelsToTry) {
      try {
        const response = await axios.post(
          'https://api.cerebras.ai/v1/chat/completions',
          {
            model: m,
            messages,
            temperature: 0.7,
            max_tokens: 2048
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (content && content.trim()) {
          return content.trim();
        }
      } catch (error: any) {
        lastError = error;
        const status = error.response?.status;
        const errorMsg = error.response?.data?.message || error.message;
        console.warn(`[CerebrasProvider] Model ${m} error (status ${status}): ${errorMsg}`);
      }
    }

    throw lastError || new Error('Cerebras API models failed');
  }
}
