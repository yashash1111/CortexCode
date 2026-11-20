import prisma from '../../../config/prisma';
import { EmbeddingService } from '../../ai/services/embeddingService';
import { wrapUntrustedContext } from '../../../shared/utils/promptGuard';

export interface RetrievedRepoChunk {
  id: string;
  filePath: string;
  symbolName: string | null;
  language: string | null;
  startLine: number;
  endLine: number;
  content: string;
  score: number;
}

export class RepoRagService {
  static async hybridSearch(params: {
    workspaceId: string;
    repositoryId: string;
    query: string;
    topK?: number;
    userId?: string;
  }): Promise<RetrievedRepoChunk[]> {
    const topK = Math.min(20, Math.max(1, params.topK ?? 6));
    const { embeddings } = await EmbeddingService.generateEmbeddings([params.query], {
      userId: params.userId,
      workspaceId: params.workspaceId,
    });
    const vectorLiteral = `[${embeddings[0].join(',')}]`;

    const rows = await prisma.$queryRaw<any[]>`
      SELECT
        "id",
        "sourcePath",
        "content",
        "metadata",
        (
          0.75 * (1 - ("embedding" <=> ${vectorLiteral}::vector))
          + 0.25 * LEAST(1.0, ts_rank_cd(to_tsvector('english', "content"), plainto_tsquery('english', ${params.query})))
        )::float AS "score"
      FROM "KnowledgeChunk"
      WHERE "workspaceId" = ${params.workspaceId}
        AND "moduleType" = 'repo'
        AND "metadata"->>'repositoryId' = ${params.repositoryId}
        AND "embedding" IS NOT NULL
      ORDER BY "score" DESC
      LIMIT ${topK};
    `;

    return rows.map((r) => {
      const meta = (r.metadata && typeof r.metadata === 'object' ? r.metadata : {}) as Record<string, any>;
      return {
        id: r.id,
        filePath: String(meta.filePath || r.sourcePath),
        symbolName: meta.symbolName ? String(meta.symbolName) : null,
        language: meta.language ? String(meta.language) : null,
        startLine: Number(meta.startLine ?? 1),
        endLine: Number(meta.endLine ?? 1),
        content: r.content,
        score: Number(r.score ?? 0),
      };
    });
  }

  static async getDependencyContext(repositoryId: string, filePaths: string[]) {
    if (filePaths.length === 0) return [];
    return prisma.codeGraphEdge.findMany({
      where: {
        repositoryId,
        OR: [
          { sourceFile: { in: filePaths } },
          { targetFile: { in: filePaths } },
        ],
      },
      take: 30,
    });
  }

  static buildGroundedPrompt(chunks: RetrievedRepoChunk[], edges: any[]): string {
    if (chunks.length === 0) {
      return `You are CortexCode Codebase Intelligence AI. No indexed code chunks matched this query.
State clearly that the indexed repository does not contain sufficient code context to answer.`;
    }

    const codeContext = chunks
      .map((c, idx) => {
        const sym = c.symbolName ? ` | Symbol: ${c.symbolName}` : '';
        return `### Source ${idx + 1}: [${c.filePath}:${c.startLine}-${c.endLine}]${sym}\n\`\`\`${c.language || ''}\n${c.content}\n\`\`\``;
      })
      .join('\n\n');

    const graphSummary =
      edges.length > 0
        ? `\nDependency & Call Relationships:\n${edges
            .map((e) => `- ${e.sourceFile} (${e.sourceSymbol || 'module'}) --[${e.edgeType}]--> ${e.targetFile} ${e.targetSymbol || ''}`)
            .join('\n')}`
        : '';

    return `You are CortexCode Codebase Intelligence AI.

STRICT GROUNDING RULES:
1. Answer architectural and code questions ONLY using the retrieved source code and dependency graph below.
2. Cite exact file paths and line ranges in the format [path/to/file.ts:10-42].
3. NEVER invent file paths, symbol names, or line numbers.
4. If the retrieved code does not answer the question, explicitly say so.

${wrapUntrustedContext('repository_code', codeContext + graphSummary)}`;
  }
}
