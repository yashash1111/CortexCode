// Language Extraction Helper for CortexCode AI Engine

export class FallbackProvider {
  static extractLanguage(prompt: string): string | null {
    const p = prompt.toLowerCase();
    if (/\b(java|spring boot)\b/i.test(p) && !/\b(javascript|js)\b/i.test(p)) return 'Java';
    if (/\b(python|py|django|flask)\b/i.test(p)) return 'Python';
    if (/\b(c\+\+|cpp)\b/i.test(p)) return 'C++';
    if (/\b(c#|csharp|\.net)\b/i.test(p)) return 'C#';
    if (/\b(dart|flutter)\b/i.test(p)) return 'Dart';
    if (/\b(typescript|ts)\b/i.test(p)) return 'TypeScript';
    if (/\b(javascript|js|node|express|react)\b/i.test(p)) return 'JavaScript';
    if (/\b(go|golang)\b/i.test(p)) return 'Go';
    if (/\b(rust)\b/i.test(p)) return 'Rust';
    if (/\b(kotlin)\b/i.test(p)) return 'Kotlin';
    if (/\b(sql|postgres|mysql)\b/i.test(p)) return 'SQL';
    return null;
  }

  static generateResponse(prompt: string, history: any[] = [], mode: string = 'chat'): string {
    throw new Error('AI API Error: Unable to generate response. Please ensure a valid API key (Gemini or Cerebras) is configured.');
  }
}
