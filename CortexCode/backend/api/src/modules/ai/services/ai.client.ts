export class AIClient {
  private static readonly BASE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  private static readonly TOKEN = process.env.AI_SERVICE_TOKEN || 'internal-service-token';

  private static getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-AI-Service-Token': this.TOKEN,
    };
  }

  static async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  static async embed(inputs: string[], dimensions = 1536) {
    const response = await fetch(`${this.BASE_URL}/ai/embed`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ inputs, dimensions }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`AI Service embed failed (${response.status}): ${detail.slice(0, 200)}`);
    }
    return response.json();
  }

  static async chat(messages: any[], stream = false, options?: { model?: string; responseFormat?: 'text' | 'json' }) {
    const response = await fetch(`${this.BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        messages,
        stream,
        model: options?.model,
        response_format: options?.responseFormat,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`AI Service chat failed (${response.status}): ${detail.slice(0, 200)}`);
    }
    return stream ? response.body : response.json();
  }

  static async parseAndChunkDocument(params: {
    fileType: 'pdf' | 'markdown';
    sourcePath: string;
    contentBase64?: string;
    text?: string;
    chunkSize?: number;
    chunkOverlap?: number;
  }) {
    const response = await fetch(`${this.BASE_URL}/ai/docs/parse-and-chunk`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        file_type: params.fileType,
        source_path: params.sourcePath,
        content_base64: params.contentBase64,
        text: params.text,
        chunk_size: params.chunkSize ?? 1200,
        chunk_overlap: params.chunkOverlap ?? 180,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Document parse failed (${response.status}): ${detail.slice(0, 300)}`);
    }
    return response.json();
  }

  static async parseAndChunkCode(params: {
    filePath: string;
    content: string;
    language?: string;
    maxChunkChars?: number;
  }) {
    const response = await fetch(`${this.BASE_URL}/ai/code/parse-and-chunk`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        file_path: params.filePath,
        content: params.content,
        language: params.language,
        max_chunk_chars: params.maxChunkChars ?? 2000,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Code parse failed (${response.status}): ${detail.slice(0, 300)}`);
    }
    return response.json();
  }
}
