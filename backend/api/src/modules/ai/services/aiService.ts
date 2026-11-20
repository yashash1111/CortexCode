import { FallbackProvider } from './providers/fallbackProvider';
import { getModeSystemInstructions } from './modePrompts';
import { AIGateway, GatewayMessage } from './aiGateway';

export const CORTEXCODE_SYSTEM_PROMPT = `You are CortexCode AI — a senior AI coding-platform architect, software engineer, LLM integration engineer, compiler-aware developer, debugger, code reviewer, and technical educator.

===============================================================
ADVANCED CODING ENGINE STANDARDS & LANGUAGE PRIORITY
===============================================================

1. STRICT LANGUAGE PRIORITY RULE:
   - EXPLICIT USER LANGUAGE > ATTACHED CODE > PROJECT CONTEXT > DEFAULT
   - If user specifies "Java" -> generate JAVA code inside \`\`\`java blocks ONLY.
   - If user specifies "Python" -> generate PYTHON code inside \`\`\`python blocks ONLY.
   - If user specifies "C++" -> generate C++ code inside \`\`\`cpp blocks ONLY.
   - If user specifies "JavaScript" -> generate JAVASCRIPT code inside \`\`\`javascript blocks ONLY.
   - If user specifies "TypeScript" -> generate TYPESCRIPT code inside \`\`\`typescript blocks ONLY.
   - If user specifies "Dart" / "Flutter" -> generate DART code inside \`\`\`dart blocks ONLY.
   - JAVA AND JAVASCRIPT ARE DIFFERENT LANGUAGES. NEVER default Java requests to JavaScript.

2. CODE GENERATION STANDARD:
   - All code must be syntactically valid, logically correct, and complete enough to run.
   - NEVER use placeholder comments like "// add your code here" or "// implement this yourself".
   - Do NOT invent non-existent APIs, functions, or libraries.

3. DEBUGGING & DSA ENGINES:
   - Analyze actual error stack traces provided by the user.
   - DSA problems: Approach -> Algorithm -> Code -> Time O(...) and Space O(...) Complexity.

4. GENERAL CHAT FLEXIBILITY:
   - Casual conversation ("hi", "how r u", "good", "tell me a joke") must remain natural.`;

export interface UserApiKeys {
  cerebras?: string;
  gemini?: string;
  openai?: string;
  anthropic?: string;
}

export class AIService {
  static buildSystemInstructions(mode: string = 'chat', prompt: string = ''): string {
    const modePrompt = getModeSystemInstructions(mode);
    const detectedLang = FallbackProvider.extractLanguage(prompt);

    let languageLock = '';
    if (detectedLang) {
      languageLock = `\n\n===============================================================
EXPLICIT LANGUAGE LOCK: ${detectedLang.toUpperCase()}
===============================================================
The user explicitly requested ${detectedLang} code.
STRICT RULE: You MUST generate ${detectedLang} code inside \`\`\`${detectedLang.toLowerCase()} code blocks.
JavaScript, Python, C++, TypeScript, and other languages are STRICTLY FORBIDDEN unless requested.
Do NOT default to JavaScript under any circumstances.`;
    }

    return `${CORTEXCODE_SYSTEM_PROMPT}\n\n${modePrompt}${languageLock}`;
  }

  static async generateResponse(
    prompt: string,
    history: any[] = [],
    modelName: string = 'gemini-3.5-flash-lite',
    mode: string = 'chat',
    userKeys?: UserApiKeys,
    context?: { userId?: string; workspaceId?: string }
  ): Promise<string> {
    const systemPrompt = AIService.buildSystemInstructions(mode, prompt);
    const windowedHistory: GatewayMessage[] = Array.isArray(history)
      ? history
          .slice(-12)
          .filter((m) => m && typeof m.content === 'string')
          .map((m) => ({
            role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user',
            content: m.content,
          }))
      : [];

    const messages: GatewayMessage[] = [
      { role: 'system', content: systemPrompt },
      ...windowedHistory,
      { role: 'user', content: prompt },
    ];

    const result = await AIGateway.generate({
      messages,
      model: modelName,
      userKeys,
      userId: context?.userId,
      workspaceId: context?.workspaceId,
      requestType: mode,
    });

    return result.content;
  }
}
