import { Worker, Job } from 'bullmq';
import crypto from 'crypto';
import { connection } from '../../config/redis';
import prisma from '../../config/prisma';
import { AIClient } from '../../modules/ai/services/ai.client';
import { EmbeddingService } from '../../modules/ai/services/embeddingService';
import { GitHubClient } from '../../modules/github/services/github.client';
import { decryptToken } from '../../shared/utils/crypto';

const SUPPORTED_EXTS = new Set(['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'py', 'java', 'go']);
const IGNORED_SEGMENTS = [
  'node_modules/',
  'dist/',
  'build/',
  '.next/',
  '.git/',
  'vendor/',
  '__pycache__/',
  '.venv/',
  'venv/',
  'coverage/',
];
const IGNORED_FILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'poetry.lock',
  'go.sum',
]);

const MAX_FILE_BYTES = Number(process.env.MAX_INDEX_FILE_BYTES || 250 * 1024);
const MAX_REPO_FILES = Number(process.env.MAX_INDEX_REPO_FILES || 120);

export function isIndexableFilePath(filePath: string, size?: number): boolean {
  const lower = filePath.toLowerCase();
  if (IGNORED_SEGMENTS.some((seg) => lower.includes(seg))) return false;
  const baseName = lower.split('/').pop() || '';
  if (IGNORED_FILES.has(baseName)) return false;
  if (baseName.startsWith('.env') || baseName.includes('.secret') || baseName.endsWith('.pem') || baseName.endsWith('.key')) {
    return false;
  }
  if (size !== undefined && size > MAX_FILE_BYTES) return false;
  const ext = baseName.includes('.') ? baseName.split('.').pop() || '' : '';
  return SUPPORTED_EXTS.has(ext);
}

async function syncFilesFromGitHub(repositoryId: string, branchOverride?: string) {
  const repo = await prisma.repository.findUnique({
    where: { id: repositoryId },
    include: { user: { include: { githubAccount: true } } },
  });
  if (!repo) throw new Error('Repository not found');

  const token = repo.user.githubAccount
    ? decryptToken(repo.user.githubAccount.accessTokenEncrypted)
    : undefined;

  const branch = branchOverride || repo.defaultBranch || 'main';
  const tree = await GitHubClient.getRecursiveTree(repo.owner, repo.name, branch, token);
  const candidates = tree
    .filter((item) => item.type === 'blob' && isIndexableFilePath(item.path, item.size))
    .slice(0, MAX_REPO_FILES);

  const existingFiles = await prisma.repositoryFile.findMany({ where: { repositoryId } });
  const existingByPath = new Map(existingFiles.map((f) => [f.path, f]));
  const currentPaths = new Set(candidates.map((c) => c.path));

  // Remove deleted files and their chunks/edges
  for (const oldFile of existingFiles) {
    if (!currentPaths.has(oldFile.path)) {
      await prisma.codeChunk.deleteMany({ where: { repositoryId, filePath: oldFile.path } });
      await prisma.codeGraphEdge.deleteMany({ where: { repositoryId, sourceFile: oldFile.path } });
      if (repo.workspaceId) {
        await prisma.$executeRaw`
          DELETE FROM "KnowledgeChunk"
          WHERE "workspaceId" = ${repo.workspaceId}
            AND "moduleType" = 'repo'
            AND "sourcePath" = ${oldFile.path}
            AND "metadata"->>'repositoryId' = ${repositoryId}
        `;
      }
      await prisma.repositoryFile.delete({ where: { id: oldFile.id } });
    }
  }

  for (const item of candidates) {
    try {
      const content = await GitHubClient.getFileContent(repo.owner, repo.name, item.path, branch, token);
      if (Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) continue;

      const contentHash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
      const existing = existingByPath.get(item.path);
      const ext = item.path.split('.').pop()?.toLowerCase() || '';

      if (existing) {
        if (existing.contentHash !== contentHash) {
          await prisma.repositoryFile.update({
            where: { id: existing.id },
            data: {
              content,
              size: Buffer.byteLength(content, 'utf8'),
              lineCount: content.split('\n').length,
            },
          });
        }
      } else {
        await prisma.repositoryFile.create({
          data: {
            repositoryId,
            path: item.path,
            name: item.path.split('/').pop() || item.path,
            extension: ext,
            language: ext,
            size: Buffer.byteLength(content, 'utf8'),
            lineCount: content.split('\n').length,
            content,
            isBinary: false,
          },
        });
      }
    } catch (err: any) {
      console.warn(`[IndexingWorker] Skipped GitHub file ${item.path}: ${err.message}`);
    }
  }
}

export const indexingWorker = new Worker(
  'repository-indexing',
  async (job: Job) => {
    const { ingestionJobId, repositoryId, workspaceId, userId, branch, syncGitHub } = job.data;

    try {
      if (syncGitHub) {
        await syncFilesFromGitHub(repositoryId, branch);
      }

      const files = await prisma.repositoryFile.findMany({
        where: { repositoryId, isBinary: false },
      });

      const nonEmptyFiles = files.filter((f) => f.content && f.content.trim().length > 0);
      const total = nonEmptyFiles.length;

      if (ingestionJobId) {
        await prisma.ingestionJob.update({
          where: { id: ingestionJobId },
          data: {
            status: 'processing',
            startedAt: new Date(),
            total,
            processed: 0,
            progress: total === 0 ? 100 : 5,
            attempts: job.attemptsMade + 1,
            metadata: { stage: 'parsing' },
          },
        });
      }

      if (total === 0) {
        if (ingestionJobId) {
          await prisma.ingestionJob.update({
            where: { id: ingestionJobId },
            data: { status: 'completed', progress: 100, completedAt: new Date(), metadata: { stage: 'completed' } },
          });
        }
        return { processed: 0, skipped: 0, chunks: 0 };
      }

      let processed = 0;
      let skipped = 0;
      let totalChunks = 0;

      for (const file of nonEmptyFiles) {
        const content = file.content || '';
        const newHash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');

        // Incremental indexing check: skip unchanged files that already have chunks
        if (file.contentHash === newHash) {
          const existingChunkCount = await prisma.codeChunk.count({
            where: { repositoryId, fileId: file.id },
          });
          if (existingChunkCount > 0) {
            skipped++;
            processed++;
            const progress = Math.floor((processed / total) * 100);
            await job.updateProgress(progress);
            if (ingestionJobId) {
              await prisma.ingestionJob.update({
                where: { id: ingestionJobId },
                data: { processed, progress },
              });
            }
            continue;
          }
        }

        // Parse code with Tree-sitter
        const parsed = await AIClient.parseAndChunkCode({
          filePath: file.path,
          content,
          language: file.language || undefined,
        });

        const parsedChunks: Array<{
          chunk_index: number;
          file_path: string;
          language: string;
          symbol_name?: string | null;
          node_type?: string | null;
          start_line: number;
          end_line: number;
          content: string;
          imports: string[];
          calls: string[];
          file_hash: string;
          token_count: number;
        }> = parsed.chunks || [];

        // Remove old chunks & graph edges for this file before inserting new ones
        await prisma.codeChunk.deleteMany({ where: { repositoryId, fileId: file.id } });
        await prisma.codeGraphEdge.deleteMany({ where: { repositoryId, sourceFile: file.path } });
        if (workspaceId) {
          await prisma.$executeRaw`
            DELETE FROM "KnowledgeChunk"
            WHERE "workspaceId" = ${workspaceId}
              AND "moduleType" = 'repo'
              AND "sourcePath" = ${file.path}
              AND "metadata"->>'repositoryId' = ${repositoryId}
          `;
        }

        if (parsedChunks.length > 0) {
          const { embeddings } = await EmbeddingService.generateEmbeddings(
            parsedChunks.map((c) => c.content),
            { userId, workspaceId }
          );

          for (let idx = 0; idx < parsedChunks.length; idx++) {
            const c = parsedChunks[idx];
            const vectorLiteral = `[${embeddings[idx].join(',')}]`;

            await prisma.$executeRaw`
              INSERT INTO "CodeChunk" ("id", "repositoryId", "fileId", "content", "filePath", "language", "symbolName", "startLine", "endLine", "chunkIndex", "tokenCount", "embedding", "updatedAt")
              VALUES (gen_random_uuid(), ${repositoryId}, ${file.id}, ${c.content}, ${file.path}, ${c.language}, ${c.symbol_name || null}, ${c.start_line}, ${c.end_line}, ${c.chunk_index}, ${c.token_count}, ${vectorLiteral}::vector, NOW())
            `;

            if (workspaceId && ingestionJobId) {
              const metaJson = JSON.stringify({
                repositoryId,
                fileId: file.id,
                filePath: file.path,
                language: c.language,
                symbolName: c.symbol_name || null,
                nodeType: c.node_type || null,
                startLine: c.start_line,
                endLine: c.end_line,
                imports: c.imports || [],
                fileHash: newHash,
                chunkIndex: c.chunk_index,
              });
              await prisma.$executeRaw`
                INSERT INTO "KnowledgeChunk" ("id", "workspaceId", "jobId", "moduleType", "sourcePath", "metadata", "content", "embedding", "createdAt")
                VALUES (gen_random_uuid(), ${workspaceId}, ${ingestionJobId}, 'repo', ${file.path}, ${metaJson}::jsonb, ${c.content}, ${vectorLiteral}::vector, NOW())
              `;
            }
            totalChunks++;
          }
        }

        // Persist Dependency Graph Edges
        const edgesToCreate: Array<{
          repositoryId: string;
          workspaceId: string | null;
          sourceFile: string;
          sourceSymbol: string | null;
          targetFile: string;
          targetSymbol: string | null;
          edgeType: string;
        }> = [];

        for (const imp of parsed.imports || []) {
          edgesToCreate.push({
            repositoryId,
            workspaceId: workspaceId || null,
            sourceFile: file.path,
            sourceSymbol: null,
            targetFile: String(imp).slice(0, 200),
            targetSymbol: null,
            edgeType: 'import',
          });
        }
        for (const sym of parsed.symbols || []) {
          for (const call of (parsed.calls || []).slice(0, 8)) {
            edgesToCreate.push({
              repositoryId,
              workspaceId: workspaceId || null,
              sourceFile: file.path,
              sourceSymbol: sym.name,
              targetFile: file.path,
              targetSymbol: call,
              edgeType: 'call',
            });
          }
        }
        for (const route of parsed.api_routes || []) {
          edgesToCreate.push({
            repositoryId,
            workspaceId: workspaceId || null,
            sourceFile: file.path,
            sourceSymbol: null,
            targetFile: route,
            targetSymbol: route,
            edgeType: 'route',
          });
        }
        for (const model of parsed.db_models || []) {
          edgesToCreate.push({
            repositoryId,
            workspaceId: workspaceId || null,
            sourceFile: file.path,
            sourceSymbol: null,
            targetFile: `prisma.${model}`,
            targetSymbol: model,
            edgeType: 'model',
          });
        }

        if (edgesToCreate.length > 0) {
          await prisma.codeGraphEdge.createMany({ data: edgesToCreate.slice(0, 60) });
        }

        await prisma.repositoryFile.update({
          where: { id: file.id },
          data: {
            contentHash: newHash,
            language: parsed.language,
            imports: parsed.imports || [],
            symbols: parsed.symbols || [],
          },
        });

        processed++;
        const progress = Math.floor((processed / total) * 100);
        await job.updateProgress(progress);
        if (ingestionJobId) {
          await prisma.ingestionJob.update({
            where: { id: ingestionJobId },
            data: { processed, progress },
          });
        }
      }

      await prisma.repository.update({
        where: { id: repositoryId },
        data: { lastAnalyzedAt: new Date() },
      }).catch(() => {});

      if (ingestionJobId) {
        await prisma.ingestionJob.update({
          where: { id: ingestionJobId },
          data: {
            status: 'completed',
            progress: 100,
            processed,
            completedAt: new Date(),
            metadata: { stage: 'completed', skippedUnchanged: skipped, totalChunks },
          },
        });
      }

      return { processed, skipped, chunks: totalChunks };
    } catch (error: any) {
      console.error('[IndexingWorker] Job failed:', error.message);
      if (ingestionJobId) {
        await prisma.ingestionJob.update({
          where: { id: ingestionJobId },
          data: {
            status: 'failed',
            error: error.message || 'Indexing failed',
            attempts: job.attemptsMade + 1,
            metadata: { stage: 'failed' },
            completedAt: new Date(),
          },
        }).catch(() => {});
      }
      throw error;
    }
  },
  { connection, concurrency: 2 }
);

indexingWorker.on('error', (err) => {
  console.error('[IndexingWorker] Worker error:', err.message);
});
