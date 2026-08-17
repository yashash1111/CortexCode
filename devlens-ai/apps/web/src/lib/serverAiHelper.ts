import { generateLocalAIResponse } from './aiResponseEngine';

export interface UserApiKeys {
  cerebras?: string;
  gemini?: string;
  openai?: string;
  anthropic?: string;
}

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

const CEREBRAS_MODELS = [
  'llama-3.3-70b',
  'llama3.1-8b',
  'llama3.1-70b'
];

export async function generateAiResponseServer(
  prompt: string,
  history: any[] = [],
  mode: string = 'chat',
  userKeys?: UserApiKeys
): Promise<string> {
  const geminiKey = userKeys?.gemini || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const cerebrasKey = userKeys?.cerebras || process.env.CEREBRAS_API_KEY;

  // 1. Try Gemini if key is provided
  if (geminiKey && geminiKey.trim() !== '' && geminiKey !== 'dummy') {
    const rawHistory = history
      .filter(m => m && (m.role === 'user' || m.role === 'assistant' || m.role === 'model') && typeof m.content === 'string')
      .map(m => ({
        role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const formattedHistory: { role: string; parts: { text: string }[] }[] = [];
    for (const item of rawHistory) {
      if (formattedHistory.length === 0 || formattedHistory[formattedHistory.length - 1].role !== item.role) {
        formattedHistory.push(item);
      }
    }

    const last = formattedHistory[formattedHistory.length - 1];
    if (!last || last.role !== 'user' || last.parts[0]?.text !== prompt) {
      formattedHistory.push({ role: 'user', parts: [{ text: prompt }] });
    }

    for (const model of GEMINI_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey.trim()}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: formattedHistory,
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch {
        // Try next model
      }
    }
  }

  // 2. Try Cerebras if key is provided
  if (cerebrasKey && cerebrasKey.trim() !== '' && cerebrasKey !== 'dummy') {
    const messages = [
      {
        role: 'system',
        content: 'You are CortexCode AI, an expert AI software engineer and developer assistant.'
      },
      ...history
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: prompt }
    ];

    for (const model of CEREBRAS_MODELS) {
      try {
        const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cerebrasKey.trim()}`
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 2048
          })
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content && content.trim()) {
            return content.trim();
          }
        }
      } catch {
        // Try next model
      }
    }
  }

  // 3. Fallback to Local AI Engine
  return generateLocalAIResponse(prompt, mode);
}
