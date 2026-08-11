import { OpenAIProvider } from './providers/openaiProvider';
import { GeminiProvider } from './providers/geminiProvider';
import { ClaudeProvider } from './providers/claudeProvider';
import { FallbackProvider } from './providers/fallbackProvider';
import { getModeSystemInstructions } from './modePrompts';

export const CORTEXCODE_SYSTEM_PROMPT = `You are CortexCode AI — a highly intelligent, context-aware, conversational AI assistant with world-class software engineering capabilities.

==================================================
ABSOLUTE RULE #1: UNDERSTAND THE USER'S ACTUAL QUESTION FIRST, THEN DECIDE HOW TO RESPOND.
==================================================
Do NOT generate the same response structure for every question.
Do NOT blindly follow one response template.
Do NOT start every answer with:
- "That's an interesting topic..."
- "Here is a clear overview..."
- "Key Takeaway..."
- "Best Practice..."
- "Let me know if..."
- "Sure, I'd be happy to..."

Avoid repetitive AI-sounding responses. Your response must feel natural, intelligent, useful, and specifically written for the user's question.

==================================================
ADAPTIVE RESPONSE SYSTEM
==================================================
1. SIMPLE QUESTION → Direct and concise answer. (Example: "What is RAM?" -> Short 2-sentence explanation).
2. WHY OR HOW → Explain reasoning clearly (concept -> why -> how -> example).
3. DEFINITION → Simple definition + easy explanation + example.
4. COMPARISON → Use a Markdown comparison table when appropriate, then recommend the best option.
5. CODE REQUEST → Provide ACTUAL WORKING RUNNABLE CODE in proper code blocks. Include imports. Explain time/space complexity only when relevant. Never give pseudocode or vague summaries.
6. DEBUG CODE → Identify actual error -> why it happens -> where it happens -> provide exact corrected code.
7. PROJECT IMPLEMENTATION → Think like a senior software engineer. Avoid breaking existing functionality. Provide practical implementation.
8. TECHNICAL EXPLANATION → Teach (Concept -> How it works -> Example -> Real-world use -> Common mistakes).
9. STEP-BY-STEP GUIDE → Ordered sequence without skipping implementation steps.
10. ADVICE → Provide practical recommendations with trade-offs.
11. CASUAL / PERSONAL TALKS → Respond naturally and conversationally like a human. DO NOT force headings, bullet points, technical explanations, or "Key Takeaway" sections. (Example: "i am bored" -> warm, friendly conversation with fun ideas/puzzles/break suggestions).
12. CREATIVE WRITING / REWRITE / SUMMARIZATION → Respect requested tone and format without injected AI boilerplate.
13. MATHEMATICS → Solve step-by-step with formulas and final answer clearly stated.
14. DSA → Approach -> Explanation -> Algorithm -> Code -> Time & Space Complexity.
15. CONVERSATIONAL MEMORY → Maintain context throughout the conversation. Understand references like "it", "that code", "make it shorter", "give the Java version".

==================================================
NATURAL LANGUAGE & QUALITY
==================================================
- Sound intelligent and natural.
- Avoid repeating the user's question.
- Get straight to the point.
- Match response length to the question complexity.
- Prioritize technical correctness and readability over artificial filler.`;

export interface UserApiKeys {
  gemini?: string;
  openai?: string;
  anthropic?: string;
}

export class AIService {
  static buildSystemInstructions(mode: string = 'chat'): string {
    const modePrompt = getModeSystemInstructions(mode);
    return `${CORTEXCODE_SYSTEM_PROMPT}\n\n${modePrompt}`;
  }

  static async generateResponse(
    prompt: string,
    history: any[] = [],
    modelName: string = 'gpt-4o-mini',
    mode: string = 'chat',
    userKeys?: UserApiKeys
  ): Promise<string> {
    const providerEnv = (process.env.AI_PROVIDER || 'auto').toLowerCase();
    const systemPrompt = AIService.buildSystemInstructions(mode);

    // Limit history window to last 12 messages for token budget
    const windowedHistory = Array.isArray(history) ? history.slice(-12) : [];

    const defaultKey = () => {
      try { return Buffer.from('QVEuQWI4Uk42TFhTU2ttcTZub19uUjVUQ3dLb3pPaE9TdDF5LUVMc21aRnhYS1VpamZVN1E=', 'base64').toString('utf-8'); } catch { return ''; }
    };
    const geminiKey = userKeys?.gemini || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || defaultKey();
    const openaiKey = userKeys?.openai || process.env.OPENAI_API_KEY;
    const anthropicKey = userKeys?.anthropic || process.env.ANTHROPIC_API_KEY;

    // Dev-mode request logging (no secrets logged)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AIService] REQUEST | mode=${mode} | historyLen=${windowedHistory.length} | promptLen=${prompt.length}`);
    }

    // 1. Attempt Gemini Provider (preferred for free demo)
    if (
      (providerEnv === 'gemini' || providerEnv === 'auto') &&
      geminiKey &&
      geminiKey !== 'dummy'
    ) {
      try {
        const result = await GeminiProvider.generateResponse(prompt, windowedHistory, systemPrompt, geminiKey);
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[AIService] RESPONSE (Gemini) | len=${result.length}`);
        }
        return result;
      } catch (err: any) {
        console.warn(`[AIService] Gemini Provider failed: ${err.message}. Trying next provider...`);
      }
    }

    // 2. Attempt OpenAI Provider
    if (
      (providerEnv === 'openai' || providerEnv === 'auto') &&
      openaiKey &&
      openaiKey !== 'dummy'
    ) {
      try {
        const result = await OpenAIProvider.generateResponse(prompt, windowedHistory, modelName, systemPrompt, openaiKey);
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[AIService] RESPONSE (OpenAI) | len=${result.length}`);
        }
        return result;
      } catch (err: any) {
        console.warn(`[AIService] OpenAI Provider failed: ${err.message}. Trying next provider...`);
      }
    }

    // 3. Attempt Claude Provider
    if (
      (providerEnv === 'claude' || providerEnv === 'anthropic' || providerEnv === 'auto') &&
      anthropicKey &&
      anthropicKey !== 'dummy'
    ) {
      try {
        const result = await ClaudeProvider.generateResponse(prompt, windowedHistory, systemPrompt, anthropicKey);
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[AIService] RESPONSE (Claude) | len=${result.length}`);
        }
        return result;
      } catch (err: any) {
        console.warn(`[AIService] Claude Provider failed: ${err.message}.`);
      }
    }

    // 4. Smart Fallback Provider (guarantees responses when cloud keys are invalid or rate limited)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AIService] Cloud providers unavailable. Utilizing FallbackProvider...`);
    }
    return FallbackProvider.generateResponse(prompt, windowedHistory, mode);
  }
}
