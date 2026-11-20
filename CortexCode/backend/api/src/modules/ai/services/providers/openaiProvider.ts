import axios from 'axios';
import { CORTEXCODE_SYSTEM_PROMPT } from '../aiService';

export class OpenAIProvider {
  static async generateResponse(
    prompt: string,
    history: any[] = [],
    model: string = 'gpt-4o',
    systemPrompt: string = CORTEXCODE_SYSTEM_PROMPT,
    overrideApiKey?: string
  ): Promise<string> {
    const apiKey = overrideApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'dummy') {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const formattedHistory = history
      .filter(m => m.role === 'user' || m.role === 'assistant')
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

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model.toLowerCase().includes('gpt-4') ? 'gpt-4o' : 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 2048
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices?.[0]?.message?.content || 'No response text returned from OpenAI model.';
  }
}
