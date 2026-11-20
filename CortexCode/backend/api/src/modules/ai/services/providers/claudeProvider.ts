import axios from 'axios';
import { CORTEXCODE_SYSTEM_PROMPT } from '../aiService';

export class ClaudeProvider {
  static async generateResponse(
    prompt: string,
    history: any[] = [],
    systemPrompt: string = CORTEXCODE_SYSTEM_PROMPT,
    overrideApiKey?: string
  ): Promise<string> {
    const apiKey = overrideApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'dummy') {
      throw new Error('ANTHROPIC_API_KEY is not configured');
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

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 2048,
        system: systemPrompt,
        messages: formattedHistory
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.content?.[0]?.text || 'No response text returned from Claude model.';
  }
}
