import prisma from '../../../config/prisma';
import { estimateModelCost } from '../../../config/modelPricing';
import { AIClient } from './ai.client';

export const EMBEDDING_DIMENSIONS = 1536;

export interface EmbeddingBatchResult {
  embeddings: number[][];
  model: string;
  provider: string;
  latencyMs: number;
}

export function validateEmbeddingVector(vec: unknown): asserts vec is number[] {
  if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Invalid embedding dimension: expected ${EMBEDDING_DIMENSIONS}, got ${Array.isArray(vec) ? vec.length : typeof vec}`
    );
  }
  for (let i = 0; i < vec.length; i++) {
    if (typeof vec[i] !== 'number' || !Number.isFinite(vec[i])) {
      throw new Error(`Invalid non-finite embedding value at index ${i}`);
    }
  }
}

export class EmbeddingService {
  static async generateEmbeddings(
    inputs: string[],
    options?: { userId?: string; workspaceId?: string }
  ): Promise<EmbeddingBatchResult> {
    if (!inputs || inputs.length === 0) {
      throw new Error('Embedding inputs cannot be empty');
    }

    const start = Date.now();
    try {
      const response = await AIClient.embed(inputs);
      const vectors: number[][] = response?.embeddings;
      if (!Array.isArray(vectors) || vectors.length !== inputs.length) {
        throw new Error(`Embedding count mismatch: expected ${inputs.length}, got ${vectors?.length ?? 0}`);
      }
      for (const vec of vectors) {
        validateEmbeddingVector(vec);
      }

      const latencyMs = response.latency_ms ?? Date.now() - start;
      const model = response.model || 'gemini-embedding-001';
      const provider = response.provider || 'gemini';
      const inputTokens = Number(response.usage?.input_tokens || inputs.reduce((s, t) => s + Math.ceil(t.length / 4), 0));
      const estimatedCost = estimateModelCost(model, inputTokens, 0);

      await prisma.usageLog.create({
        data: {
          userId: options?.userId || null,
          workspaceId: options?.workspaceId || null,
          provider,
          model,
          requestType: 'embed',
          latencyMs,
          inputTokens,
          outputTokens: 0,
          totalTokens: inputTokens,
          estimatedCost,
          status: 'success',
        },
      }).catch(() => {});

      return { embeddings: vectors, model, provider, latencyMs };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      await prisma.usageLog.create({
        data: {
          userId: options?.userId || null,
          workspaceId: options?.workspaceId || null,
          provider: 'ai-service',
          model: 'embedding',
          requestType: 'embed',
          latencyMs,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
          status: 'error',
          errorMessage: err.message,
        },
      }).catch(() => {});
      throw err;
    }
  }

  /**
   * Enforce strict workspaceId AND moduleType isolation on all vector similarity queries.
   */
  static async searchKnowledgeChunks(params: {
    workspaceId: string;
    moduleType: 'doc' | 'repo';
    query: string;
    limit?: number;
    userId?: string;
  }) {
    const { embeddings } = await this.generateEmbeddings([params.query], {
      userId: params.userId,
      workspaceId: params.workspaceId,
    });
    const vectorLiteral = `[${embeddings[0].join(',')}]`;
    const limit = Math.min(20, Math.max(1, params.limit ?? 5));

    return prisma.$queryRaw<
      Array<{
        id: string;
        workspaceId: string;
        jobId: string;
        moduleType: string;
        sourcePath: string;
        metadata: any;
        content: string;
        similarity: number;
      }>
    >`
      SELECT "id", "workspaceId", "jobId", "moduleType", "sourcePath", "metadata", "content",
             1 - ("embedding" <=> ${vectorLiteral}::vector) AS similarity
      FROM "KnowledgeChunk"
      WHERE "workspaceId" = ${params.workspaceId}
        AND "moduleType" = ${params.moduleType}
        AND "embedding" IS NOT NULL
      ORDER BY "embedding" <=> ${vectorLiteral}::vector
      LIMIT ${limit};
    `;
  }
}
