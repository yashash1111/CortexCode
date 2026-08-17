import { getAPIErrorMessage } from './aiResponseEngine';

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
  'gemini-1.5-pro',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-flash-latest'
];

const CEREBRAS_MODELS = [
  'llama-3.3-70b',
  'llama3.1-8b',
  'llama3.1-70b'
];

const SYSTEM_INSTRUCTIONS: Record<string, string> = {
  chat: 'You are CortexCode AI, an expert software developer and technical assistant. Provide clear, direct, and helpful solutions.',
  debug: 'You are CortexCode AI in Debug Mode. Analyze the provided code or error stack trace, diagnose the root cause, and provide the exact fixed code.',
  explain: 'You are CortexCode AI in Explain Mode. Provide clear, step-by-step conceptual walkthroughs with code examples.',
  notes: 'You are CortexCode AI in Notes Generator Mode. Provide concise, structured, high-yield reference notes and cheat sheets.',
  review: 'You are CortexCode AI in Code Review Mode. Conduct an in-depth security, quality, performance, and type-safety audit of the provided code.'
};

export async function generateAiResponseServer(
  prompt: string,
  history: any[] = [],
  mode: string = 'chat',
  userKeys?: UserApiKeys
): Promise<string> {
  const geminiKey =
    userKeys?.gemini ||
    process.env.GEMINI_API_KEY ||
    process.env.GEMINIAPIKEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLEAPIKEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

  const cerebrasKey =
    userKeys?.cerebras ||
    process.env.CEREBRAS_API_KEY ||
    process.env.CEREBRASAPIKEY ||
    process.env.NEXT_PUBLIC_CEREBRAS_API_KEY ||
    'csk-fynwdrytjrrwfdjpw2pv2635ymdw584jvyeerkxxvj3r3dpe';

  const openaiKey =
    userKeys?.openai ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENAIAPIKEY ||
    process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  const anthropicKey =
    userKeys?.anthropic ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.ANTHROPICAPIKEY ||
    process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;

  const systemPrompt = SYSTEM_INSTRUCTIONS[mode] || SYSTEM_INSTRUCTIONS.chat;
  let lastProviderError = '';

  // 1. Google Gemini Live API
  if (geminiKey && geminiKey.trim() !== '' && geminiKey !== 'dummy') {
    const rawHistory = history
      .filter(m => m && (m.role === 'user' || m.role === 'assistant' || m.role === 'model') && typeof m.content === 'string' && m.content.trim() !== '')
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

    const isOAuth = geminiKey.startsWith('ya29.');

    for (const model of GEMINI_MODELS) {
      try {
        const url = isOAuth
          ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
          : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey.trim()}`;

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (isOAuth) {
          headers['Authorization'] = `Bearer ${geminiKey.trim()}`;
        }

        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
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
        } else {
          const errData = await res.json().catch(() => ({}));
          lastProviderError = errData?.error?.message || `Gemini HTTP status ${res.status}`;
          console.warn(`[Gemini Server] Model ${model} returned error: ${lastProviderError}`);
        }
      } catch (err: any) {
        lastProviderError = err.message || 'Gemini network error';
        console.warn(`[Gemini Server] Model ${model} exception: ${lastProviderError}`);
      }
    }
  }

  // 2. Cerebras Live API (Ultra-Fast Inference)
  if (cerebrasKey && cerebrasKey.trim() !== '' && cerebrasKey !== 'dummy') {
    const messages = [
      { role: 'system', content: systemPrompt },
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
        } else {
          const errData = await res.json().catch(() => ({}));
          lastProviderError = errData?.error?.message || `Cerebras HTTP status ${res.status}`;
          console.warn(`[Cerebras Server] Model ${model} error: ${lastProviderError}`);
        }
      } catch (err: any) {
        lastProviderError = err.message || 'Cerebras network error';
        console.warn(`[Cerebras Server] Exception: ${lastProviderError}`);
      }
    }
  }

  // 3. OpenAI Live API
  if (openaiKey && openaiKey.trim() !== '' && openaiKey.startsWith('sk-')) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history
          .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: prompt }
      ];

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          max_tokens: 4096
        })
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && content.trim()) {
          return content.trim();
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        lastProviderError = errData?.error?.message || `OpenAI HTTP status ${res.status}`;
      }
    } catch (err: any) {
      lastProviderError = err.message || 'OpenAI network error';
    }
  }

  // 4. Anthropic Claude Live API
  if (anthropicKey && anthropicKey.trim() !== '' && anthropicKey.startsWith('sk-ant-')) {
    try {
      const messages = history
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map(m => ({ role: m.role, content: m.content }));
      messages.push({ role: 'user', content: prompt });

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey.trim(),
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          system: systemPrompt,
          messages,
          max_tokens: 4096
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text;
        if (text && text.trim()) {
          return text.trim();
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        lastProviderError = errData?.error?.message || `Anthropic HTTP status ${res.status}`;
      }
    } catch (err: any) {
      lastProviderError = err.message || 'Anthropic network error';
    }
  }

  // If all providers failed, return clear message with provider error
  return getAPIErrorMessage(lastProviderError);
}
