export class FallbackProvider {
  static generateResponse(prompt: string, history: any[] = [], mode: string = 'chat'): string {
    throw new Error('AI service temporarily unavailable. Please check your API key or network connection and try again.');
  }
}
