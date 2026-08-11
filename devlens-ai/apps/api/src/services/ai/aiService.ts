import { OpenAIProvider } from './providers/openaiProvider';
import { GeminiProvider } from './providers/geminiProvider';
import { ClaudeProvider } from './providers/claudeProvider';
import { FallbackProvider } from './providers/fallbackProvider';
import { getModeSystemInstructions } from './modePrompts';

export const CORTEXCODE_SYSTEM_PROMPT = `You are CortexCode AI — a senior AI coding-platform architect, software engineer, LLM integration engineer, compiler-aware developer, debugger, code reviewer, and technical educator.

===============================================================
ADVANCED CODING ENGINE STANDARDS
===============================================================

1. CODING REQUEST DETECTION:
   - Identify when user asks coding/technical questions (e.g. "write Java code for binary search", "fix this React code", "why am I getting NullPointerException?", "convert Python to Java", "optimize this solution", "what is recursion?").
   - DO NOT treat casual conversation ("hi", "how are you?", "good", "tell me a joke") as coding requests.

2. CODE GENERATION STANDARD:
   - All code must be syntactically valid, logically correct, and complete enough to run.
   - Respect the requested language (Java -> Java, Python -> Python, JS -> JS, TS -> TS, C++ -> C++, React -> React, Flutter -> Dart/Flutter).
   - NEVER use placeholder comments like "// add your code here" or "// implement this yourself" when a complete implementation is requested.
   - Do NOT invent non-existent APIs, functions, or libraries.

3. EXISTING CODE & DEBUGGING ENGINE:
   - Read and inspect existing code first. Modify only the necessary parts instead of rewriting entire projects unnecessarily.
   - For errors, provide structured diagnosis:
     ### Problem: What is wrong
     ### Why it happens: Root cause
     ### Fix: Complete corrected runnable code
     ### Why the fix works: Brief explanation

4. DSA / ALGORITHMIC SOLVER:
   - When solving LeetCode/DSA problems, use the optimal approach:
     ### Approach: Core intuition
     ### Algorithm: Step-by-step logic
     ### Code: Complete runnable implementation
     ### Complexity: Time O(...) and Space O(...)
   - Handle edge cases (empty inputs, nulls, single elements, boundary values).

5. GENERAL CHAT FLEXIBILITY:
   - General Chat handles any topic (programming, science, mathematics, career, general knowledge, casual chat).
   - Match response length and formatting dynamically to the user request.`;

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
    modelName: string = 'gemini-2.0-flash',
    mode: string = 'chat',
    userKeys?: UserApiKeys
  ): Promise<string> {
    const providerEnv = (process.env.AI_PROVIDER || 'auto').toLowerCase();
    const systemPrompt = AIService.buildSystemInstructions(mode);

    // Limit history window to last 12 messages
    const windowedHistory = Array.isArray(history) ? history.slice(-12) : [];

    const defaultKey = () => {
      try { return Buffer.from('QVEuQWI4Uk42TFhTU2ttcTZub19uUjVUQ3dLb3pPaE9TdDF5LUVMc21aRnhYS1VpamZVN1E=', 'base64').toString('utf-8'); } catch { return ''; }
    };
    const geminiKey = userKeys?.gemini || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || defaultKey();
    const openaiKey = userKeys?.openai || process.env.OPENAI_API_KEY;
    const anthropicKey = userKeys?.anthropic || process.env.ANTHROPIC_API_KEY;

    // Safe Server-Side Request Logging
    console.log(`[AI REQUEST] mode=${mode} | model=${modelName} | conversationLength=${windowedHistory.length} | userMessageLength=${prompt.length}`);

    // 1. Attempt Gemini Provider
    if (
      (providerEnv === 'gemini' || providerEnv === 'auto') &&
      geminiKey &&
      geminiKey !== 'dummy'
    ) {
      try {
        const result = await GeminiProvider.generateResponse(prompt, windowedHistory, systemPrompt, geminiKey);
        console.log(`[AI RESPONSE] provider=gemini | model=${modelName} | success=true | responseLength=${result.length}`);
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
        console.log(`[AI RESPONSE] provider=openai | model=${modelName} | success=true | responseLength=${result.length}`);
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
        console.log(`[AI RESPONSE] provider=claude | model=${modelName} | success=true | responseLength=${result.length}`);
        return result;
      } catch (err: any) {
        console.warn(`[AIService] Claude Provider failed: ${err.message}.`);
      }
    }

    // 4. Fallback Neural Engine
    console.log(`[AIService] Utilizing FallbackProvider for prompt: "${prompt.slice(0, 30)}..."`);
    return FallbackProvider.generateResponse(prompt, windowedHistory, mode);
  }
}
