// Fallback Provider - Phase 8 Architectural Clean Error Handler
// All hardcoded keyword classifiers (isQuestion, isCode, Core Concept, Best Practice) have been completely removed.
// Application code controls API calls and errors; the LLM controls response generation and intent.

export class FallbackProvider {
  static generateResponse(prompt: string, history: any[] = [], mode: string = 'chat'): string {
    throw new Error('AI service temporarily unavailable. Please check your Google AI Studio API key or network connection.');
  }
}
