// Fallback Provider - Phase 5 & 18 Honest Error Handler
// Per Phase 4, 5 & 18 requirements: Mock canned response generators have been COMPLETELY REMOVED.
// The application NEVER silently returns a fake AI answer when cloud API calls fail.

export class FallbackProvider {
  static generateResponse(prompt: string, history: any[] = [], mode: string = 'chat'): string {
    throw new Error('AI service temporarily unavailable. Please verify your Google AI Studio API key or quota.');
  }
}
