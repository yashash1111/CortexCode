import prisma from '../../../config/prisma';
import { AIGateway } from '../../ai/services/aiGateway';
import { DocRagService, formatCitationLabel } from './docRagService';

export interface EvalBenchmarkCase {
  question: string;
  expectedSource: string;
  groundTruth: string;
}

export class DocEvalService {
  /**
   * Generate a grounded benchmark dataset from the workspace's indexed chunks
   * when the caller does not supply a custom 30-50 question dataset.
   */
  static async generateDatasetFromWorkspace(
    workspaceId: string,
    targetCount = 30
  ): Promise<EvalBenchmarkCase[]> {
    const count = Math.min(50, Math.max(5, targetCount));
    const chunks = await prisma.knowledgeChunk.findMany({
      where: { workspaceId, moduleType: 'doc' },
      take: count,
      orderBy: { createdAt: 'asc' },
    });

    if (chunks.length === 0) {
      throw new Error('No indexed document chunks found in this workspace to evaluate.');
    }

    const cases: EvalBenchmarkCase[] = [];
    // Generate synthetic Q&A pairs in small batches using AIGateway JSON mode
    const batchSize = 5;
    for (let i = 0; i < count; i++) {
      const chunk = chunks[i % chunks.length];
      const meta = (chunk.metadata && typeof chunk.metadata === 'object' ? chunk.metadata : {}) as Record<string, any>;
      const sourceName = String(meta.documentName || chunk.sourcePath);

      if (i % batchSize === 0) {
        const slice = [];
        for (let j = 0; j < batchSize && i + j < count; j++) {
          const c = chunks[(i + j) % chunks.length];
          const m = (c.metadata && typeof c.metadata === 'object' ? c.metadata : {}) as Record<string, any>;
          slice.push({
            source: String(m.documentName || c.sourcePath),
            excerpt: c.content.slice(0, 700),
          });
        }

        const gen = await AIGateway.generate({
          messages: [
            {
              role: 'system',
              content:
                'Generate one factual engineering question and concise ground-truth answer for each excerpt. Return JSON: {"items":[{"question":"...","expectedSource":"...","groundTruth":"..."}]}',
            },
            {
              role: 'user',
              content: JSON.stringify(slice),
            },
          ],
          responseFormat: 'json',
          temperature: 0.2,
          requestType: 'eval_dataset_gen',
        });

        const items = Array.isArray(gen.json?.items) ? gen.json.items : [];
        for (let k = 0; k < slice.length; k++) {
          const item = items[k];
          cases.push({
            question: item?.question || `What is described in ${slice[k].source}?`,
            expectedSource: slice[k].source,
            groundTruth: item?.groundTruth || slice[k].excerpt.slice(0, 200),
          });
        }
      } else {
        // Already populated by batch above
        void sourceName;
      }
    }

    return cases.slice(0, count);
  }

  static async runEvaluation(params: {
    workspaceId: string;
    userId: string;
    name?: string;
    cases?: EvalBenchmarkCase[];
    topK?: number;
  }) {
    const { workspaceId, userId } = params;
    const topK = params.topK ?? 5;

    const evalRun = await prisma.evalRun.create({
      data: {
        workspaceId,
        userId,
        moduleType: 'doc',
        name: params.name || `Docs RAG Eval (${new Date().toISOString().slice(0, 16)})`,
        status: 'running',
        startedAt: new Date(),
      },
    });

    try {
      const benchmarkCases =
        params.cases && params.cases.length > 0
          ? params.cases
          : await this.generateDatasetFromWorkspace(workspaceId, 30);

      await prisma.evalRun.update({
        where: { id: evalRun.id },
        data: { datasetSize: benchmarkCases.length },
      });

      let hitSum = 0;
      let mrrSum = 0;
      let relevanceSum = 0;
      let faithfulnessSum = 0;
      let citationPrecisionSum = 0;
      let latencySum = 0;
      let passedCount = 0;

      for (const tc of benchmarkCases) {
        const start = Date.now();
        const retrieved = await DocRagService.hybridSearch({
          workspaceId,
          query: tc.question,
          topK,
          userId,
        });

        const systemPrompt = DocRagService.buildGroundedSystemPrompt(retrieved);
        const answerRes = await AIGateway.generate({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: tc.question },
          ],
          temperature: 0.1,
          userId,
          workspaceId,
          requestType: 'eval_answer',
        });
        const latencyMs = Date.now() - start;

        // Deterministic Retrieval Hit Rate & MRR
        const expectedLower = tc.expectedSource.toLowerCase();
        const matchIdx = retrieved.findIndex(
          (c) =>
            c.documentName.toLowerCase().includes(expectedLower) ||
            c.sourcePath.toLowerCase().includes(expectedLower)
        );
        const hitRate = matchIdx >= 0 ? 1 : 0;
        const reciprocalRank = matchIdx >= 0 ? 1 / (matchIdx + 1) : 0;

        // LLM-as-a-Judge for Context Relevance, Answer Faithfulness, Citation Precision
        const retrievedSummary = retrieved.map((c) => ({
          citation: formatCitationLabel(c),
          excerpt: c.content.slice(0, 400),
        }));

        const judgeRes = await AIGateway.generate({
          messages: [
            {
              role: 'system',
              content: `You are an impartial RAG evaluator. Score the following from 0.0 to 1.0:
- contextRelevance: How relevant the retrieved excerpts are to the question.
- answerFaithfulness: Whether the actualAnswer is strictly grounded in the retrieved excerpts and aligns with groundTruth.
- citationPrecision: Whether citations in actualAnswer accurately reference the retrieved sources.
Return strict JSON: {"contextRelevance":0.0,"answerFaithfulness":0.0,"citationPrecision":0.0,"reasoning":"..."}`,
            },
            {
              role: 'user',
              content: JSON.stringify({
                question: tc.question,
                groundTruth: tc.groundTruth,
                actualAnswer: answerRes.content,
                retrievedSources: retrievedSummary,
              }),
            },
          ],
          responseFormat: 'json',
          temperature: 0.0,
          userId,
          workspaceId,
          requestType: 'eval_judge',
        });

        const clamp01 = (v: any) => Math.min(1, Math.max(0, Number(v) || 0));
        const contextRelevance = clamp01(judgeRes.json?.contextRelevance);
        const answerFaithfulness = clamp01(judgeRes.json?.answerFaithfulness);
        const citationPrecision = clamp01(judgeRes.json?.citationPrecision);
        const reasoning = String(judgeRes.json?.reasoning || '');

        hitSum += hitRate;
        mrrSum += reciprocalRank;
        relevanceSum += contextRelevance;
        faithfulnessSum += answerFaithfulness;
        citationPrecisionSum += citationPrecision;
        latencySum += latencyMs;
        if (hitRate === 1 && answerFaithfulness >= 0.6) passedCount++;

        await prisma.evalCaseResult.create({
          data: {
            evalRunId: evalRun.id,
            question: tc.question,
            expectedSource: tc.expectedSource,
            groundTruth: tc.groundTruth,
            actualAnswer: answerRes.content,
            retrievedSources: retrieved.map((c) => ({
              id: c.id,
              documentId: c.documentId,
              documentName: c.documentName,
              pageNumber: c.pageNumber,
              sectionHeading: c.sectionHeading,
              score: c.score,
            })),
            hitRate,
            reciprocalRank,
            contextRelevance,
            answerFaithfulness,
            citationPrecision,
            latencyMs,
            reasoning,
          },
        });
      }

      const n = benchmarkCases.length || 1;
      const metrics = {
        retrievalHitRate: Number((hitSum / n).toFixed(4)),
        meanReciprocalRank: Number((mrrSum / n).toFixed(4)),
        contextRelevance: Number((relevanceSum / n).toFixed(4)),
        answerFaithfulness: Number((faithfulnessSum / n).toFixed(4)),
        citationPrecision: Number((citationPrecisionSum / n).toFixed(4)),
        avgLatencyMs: Math.round(latencySum / n),
      };

      return prisma.evalRun.update({
        where: { id: evalRun.id },
        data: {
          status: 'completed',
          passedCount,
          metrics,
          completedAt: new Date(),
        },
        include: { cases: true },
      });
    } catch (error: any) {
      await prisma.evalRun.update({
        where: { id: evalRun.id },
        data: {
          status: 'failed',
          error: error.message || 'Evaluation failed',
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }
}
