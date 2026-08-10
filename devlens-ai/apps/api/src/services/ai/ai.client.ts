export class AIClient {
  private static readonly BASE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  private static readonly TOKEN = process.env.AI_SERVICE_TOKEN || 'internal-service-token';

  private static getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-AI-Service-Token': this.TOKEN,
    };
  }

  static async embed(inputs: string[]) {
    const response = await fetch(`${this.BASE_URL}/ai/embed`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ inputs }),
    });
    if (!response.ok) throw new Error('Failed to generate embeddings');
    return response.json();
  }

  static async chat(messages: any[], stream = false) {
    const response = await fetch(`${this.BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ messages, stream }),
    });
    if (!response.ok) throw new Error('Failed to generate chat response');
    return stream ? response.body : response.json();
  }
}
