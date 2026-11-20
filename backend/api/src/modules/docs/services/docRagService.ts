import prisma from '../../../config/prisma';
import { EmbeddingService } from '../../ai/services/embeddingService';
import { wrapUntrustedContext } from '../../../shared/utils/promptGuard';

export interface RetrievedDocChunk {
  id: string;
  sourcePath: string;
  content: string;
  documentId: string;
  documentName: string;
  pageNumber: number | null;
  sectionHeading: string | null;
  chunkIndex: number;
  vectorSimilarity: number;
  textRank: number;
  score: number;
}

export function formatCitationLabel(chunk: Pick<RetrievedDocChunk, 'documentName' | 'pageNumber' | 'sectionHeading'>): string {
  if (chunk.pageNumber !== null && chunk.pageNumber !== undefined) {
    return `[${chunk.documentName}, p. ${chunk.pageNumber}]`;
  }
  if (chunk.sectionHeading) {
    return `[${chunk.documentName}, §${chunk.sectionHeading}]`;
  }
  return `[${chunk.documentName}]`;
}

export class DocRagService {
  static async hybridSearch(params: {
    workspaceId: string;
    query: string;
    documentIds?: string[];
    topK?: number;
    userId?: string;
  }): Promise<RetrievedDocChunk[]> {
    const topK = Math.min(20, Math.max(1, params.topK ?? 6));
    const { embeddings } = await EmbeddingService.generateEmbeddings([params.query], {
      userId: params.userId,
      workspaceId: params.workspaceId,
    });
    const vectorLiteral = `[${embeddings[0].join(',')}]`;

    const hasDocFilter = Array.isArray(params.documentIds) && params.documentIds.length > 0;

    const rows = hasDocFilter
      ? await prisma.$queryRaw<any[]>`
          SELECT
            "id",
            "sourcePath",
            "content",
            "metadata",
            (1 - ("embedding" <=> ${vectorLiteral}::vector))::float AS "vectorSimilarity",
            ts_rank_cd(to_tsvector('english', "content"), plainto_tsquery('english', ${params.query}))::float AS "textRank",
            (
              0.75 * (1 - ("embedding" <=> ${vectorLiteral}::vector))
              + 0.25 * LEAST(1.0, ts_rank_cd(to_tsvector('english', "content"), plainto_tsquery('english', ${params.query})))
            )::float AS "score"
          FROM "KnowledgeChunk"
          WHERE "workspaceId" = ${params.workspaceId}
            AND "moduleType" = 'doc'
            AND "embedding" IS NOT NULL
            AND "metadata"->>'documentId' = ANY(${params.documentIds!})
          ORDER BY "score" DESC
          LIMIT ${topK};
        `
      : await prisma.$queryRaw<any[]>`
          SELECT
            "id",
            "sourcePath",
            "content",
            "metadata",
            (1 - ("embedding" <=> ${vectorLiteral}::vector))::float AS "vectorSimilarity",
            ts_rank_cd(to_tsvector('english', "content"), plainto_tsquery('english', ${params.query}))::float AS "textRank",
            (
              0.75 * (1 - ("embedding" <=> ${vectorLiteral}::vector))
              + 0.25 * LEAST(1.0, ts_rank_cd(to_tsvector('english', "content"), plainto_tsquery('english', ${params.query})))
            )::float AS "score"
          FROM "KnowledgeChunk"
          WHERE "workspaceId" = ${params.workspaceId}
            AND "moduleType" = 'doc'
            AND "embedding" IS NOT NULL
          ORDER BY "score" DESC
          LIMIT ${topK};
        `;

    return rows.map((r) => {
      const meta = (r.metadata && typeof r.metadata === 'object' ? r.metadata : {}) as Record<string, any>;
      return {
        id: r.id,
        sourcePath: r.sourcePath,
        content: r.content,
        documentId: String(meta.documentId || ''),
        documentName: String(meta.documentName || r.sourcePath),
        pageNumber: meta.pageNumber !== null && meta.pageNumber !== undefined ? Number(meta.pageNumber) : null,
        sectionHeading: meta.sectionHeading ? String(meta.sectionHeading) : null,
        chunkIndex: Number(meta.chunkIndex ?? 0),
        vectorSimilarity: Number(r.vectorSimilarity ?? 0),
        textRank: Number(r.textRank ?? 0),
        score: Number(r.score ?? 0),
      };
    });
  }

  static buildGroundedSystemPrompt(chunks: RetrievedDocChunk[]): string {
    if (chunks.length === 0) {
      return `You are CortexCode Docs AI. No relevant document chunks were retrieved for this query.
You MUST respond that the uploaded documents in this workspace do not contain sufficient information to answer the question.`;
    }

    const formattedSources = chunks
      .map((chunk, idx) => {
        const citation = formatCitationLabel(chunk);
        const headingInfo = chunk.sectionHeading ? ` | Section: ${chunk.sectionHeading}` : '';
        return `### Source ${idx + 1}: ${citation}${headingInfo}\n${chunk.content}`;
      })
      .join('\n\n');

    return `You are CortexCode Docs AI, a precise technical documentation assistant.

STRICT GROUNDING RULES:
1. Answer ONLY using facts explicitly stated in the retrieved document excerpts below.
2. Cite your sources inline using the exact bracketed citation label provided for each source, e.g. ${formatCitationLabel(chunks[0])}.
3. NEVER invent document names, page numbers, APIs, or facts not present in the excerpts.
4. If the retrieved excerpts do not contain sufficient information to answer the question, explicitly state: "The available documents do not contain sufficient information to answer this question."
5. Format responses cleanly in Markdown with syntax-highlighted code blocks where appropriate.

${wrapUntrustedContext('retrieved_documents', formattedSources)}`;
  }
}
