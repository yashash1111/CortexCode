import { z } from 'zod';
import prisma from '../../config/prisma';
import { GitHubClient } from './github.client';
import { AIGateway } from '../ai/aiGateway';
import { decryptToken } from '../../utils/crypto';
import { wrapUntrustedContext } from '../../utils/promptGuard';
import { RepoRagService } from './repoRagService';

export const FindingSchema = z.object({
  severity: z.enum(['critical', 'warning', 'suggestion']),
  category: z.enum(['bug', 'security', 'performance', 'style']),
  file_path: z.string().min(1),
  line_number: z.number().int().positive().nullable().optional(),
  title: z.string().min(1),
  explanation: z.string().min(1),
  suggested_fix: z.string().optional().default(''),
});

export const PRReviewOutputSchema = z.object({
  summary: z.string().min(1),
  score: z.number().int().min(0).max(100),
  findings: z.array(FindingSchema),
});

export function parseGitHubPrUrl(url: string): { owner: string; repo: string; prNumber: number } {
  const match = url.trim().match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)(?:[/?#].*)?$/i);
  if (!match) {
    throw new Error('Invalid GitHub Pull Request URL. Expected format: https://github.com/owner/repo/pull/123');
  }
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ''),
    prNumber: Number(match[3]),
  };
}

function chunkDiff(diff: string, maxChars = 24_000): string[] {
  if (!diff || diff.length <= maxChars) return [diff];
  const fileSections = diff.split(/(?=^diff --git )/m);
  const batches: string[] = [];
  let current = '';
  for (const sec of fileSections) {
    if ((current + sec).length > maxChars && current) {
      batches.push(current);
      current = sec;
    } else {
      current += sec;
    }
  }
  if (current) batches.push(current);
  return batches;
}

export class PRReviewService {
  static async runReview(params: {
    userId: string;
    workspaceId: string;
    prUrl?: string;
    repositoryId?: string;
    prNumber?: number;
  }) {
    const { userId, workspaceId } = params;

    const workspace = await prisma.workspace.findFirst({ where: { id: workspaceId, userId } });
    if (!workspace) {
      throw new Error('Workspace not found or access denied');
    }

    const ghAccount = await prisma.gitHubAccount.findUnique({ where: { userId } });
    const token = ghAccount ? decryptToken(ghAccount.accessTokenEncrypted) : undefined;

    let owner: string;
    let repoName: string;
    let prNumber: number;
    let prUrl: string;

    if (params.prUrl) {
      const parsed = parseGitHubPrUrl(params.prUrl);
      owner = parsed.owner;
      repoName = parsed.repo;
      prNumber = parsed.prNumber;
      prUrl = `https://github.com/${owner}/${repoName}/pull/${prNumber}`;
    } else if (params.repositoryId && params.prNumber) {
      const existingRepo = await prisma.repository.findFirst({
        where: { id: params.repositoryId, userId },
      });
      if (!existingRepo) throw new Error('Repository not found or access denied');
      owner = existingRepo.owner;
      repoName = existingRepo.name;
      prNumber = params.prNumber;
      prUrl = `https://github.com/${owner}/${repoName}/pull/${prNumber}`;
    } else {
      throw new Error('Either prUrl or repositoryId + prNumber is required');
    }

    // Fetch real PR metadata, changed files, and unified diff from GitHub
    const [prMeta, prFiles, rawDiff] = await Promise.all([
      GitHubClient.getPullRequest(owner, repoName, prNumber, token),
      GitHubClient.getPullRequestFiles(owner, repoName, prNumber, token),
      GitHubClient.getPullRequestDiff(token, owner, repoName, prNumber),
    ]);

    // Ensure Repository record exists
    const fullName = `${owner}/${repoName}`;
    let repoRecord = await prisma.repository.findFirst({
      where: { userId, fullName },
    });
    if (!repoRecord) {
      const ghRepo = await GitHubClient.getRepository(owner, repoName, token);
      repoRecord = await prisma.repository.create({
        data: {
          userId,
          workspaceId,
          githubId: String(ghRepo.id),
          name: ghRepo.name,
          fullName: ghRepo.full_name,
          description: ghRepo.description || null,
          owner: ghRepo.owner?.login || owner,
          defaultBranch: ghRepo.default_branch || 'main',
          private: Boolean(ghRepo.private),
          language: ghRepo.language || null,
          stars: Number(ghRepo.stargazers_count || 0),
          forks: Number(ghRepo.forks_count || 0),
          githubUrl: ghRepo.html_url,
        },
      });
    }

    // Upsert PullRequest record
    const ghPrId = String(prMeta.id || `${repoRecord.githubId}-pr-${prNumber}`);
    let prRecord = await prisma.pullRequest.findFirst({
      where: { repositoryId: repoRecord.id, number: prNumber },
    });
    if (!prRecord) {
      prRecord = await prisma.pullRequest.create({
        data: {
          repositoryId: repoRecord.id,
          githubId: ghPrId,
          number: prNumber,
          title: prMeta.title || `Pull Request #${prNumber}`,
          description: prMeta.body || null,
          author: prMeta.user?.login || 'unknown',
          sourceBranch: prMeta.head?.ref || 'head',
          targetBranch: prMeta.base?.ref || repoRecord.defaultBranch,
          status: prMeta.state || 'open',
          githubUrl: prMeta.html_url || prUrl,
        },
      });
    }

    const review = await prisma.pullRequestReview.create({
      data: {
        pullRequestId: prRecord.id,
        workspaceId,
        prUrl,
        status: 'processing',
        diffContent: rawDiff.slice(0, 120_000),
        changedFiles: prFiles.map((f) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          patch: f.patch || '',
        })),
      },
    });

    try {
      const changedPaths = prFiles.map((f) => f.filename);
      // Retrieve codebase context + dependency graph edges for changed files
      const [depEdges, relatedChunks] = await Promise.all([
        RepoRagService.getDependencyContext(repoRecord.id, changedPaths),
        changedPaths.length > 0
          ? RepoRagService.hybridSearch({
              workspaceId,
              repositoryId: repoRecord.id,
              query: changedPaths.slice(0, 5).join(' '),
              topK: 5,
              userId,
            }).catch(() => [])
          : Promise.resolve([]),
      ]);

      const contextText = [
        relatedChunks.length > 0
          ? `Related Indexed Repository Symbols:\n${relatedChunks
              .map((c) => `[${c.filePath}:${c.startLine}-${c.endLine}] (${c.symbolName || 'module'})\n${c.content.slice(0, 500)}`)
              .join('\n\n')}`
          : '',
        depEdges.length > 0
          ? `Dependency Graph Edges:\n${depEdges
              .map((e) => `${e.sourceFile} --[${e.edgeType}]--> ${e.targetFile} ${e.targetSymbol || ''}`)
              .join('\n')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const diffBatches = chunkDiff(rawDiff, 24_000);
      const allFindings: z.infer<typeof FindingSchema>[] = [];
      let lastSummary = '';
      let scoreSum = 0;
      let modelUsed = '';

      for (let bIdx = 0; bIdx < diffBatches.length; bIdx++) {
        const aiRes = await AIGateway.generate({
          messages: [
            {
              role: 'system',
              content: `You are an expert security & software architecture PR reviewer.
Analyze the untrusted PR diff below for real bugs, security vulnerabilities, auth/authz flaws, edge cases, race conditions, performance issues, error handling gaps, and breaking changes.
NEVER invent issues, file paths, or line numbers. If no meaningful issues exist, return an empty findings array.
Return STRICT JSON matching:
{"summary":"...","score":85,"findings":[{"severity":"critical|warning|suggestion","category":"bug|security|performance|style","file_path":"...","line_number":12,"title":"...","explanation":"...","suggested_fix":"..."}]}`,
            },
            {
              role: 'user',
              content: [
                `PR #${prNumber}: ${prMeta.title}`,
                `Changed Files: ${changedPaths.join(', ')}`,
                contextText ? wrapUntrustedContext('codebase_context', contextText) : '',
                wrapUntrustedContext(`pr_diff_part_${bIdx + 1}`, diffBatches[bIdx]),
              ]
                .filter(Boolean)
                .join('\n\n'),
            },
          ],
          responseFormat: 'json',
          temperature: 0.1,
          userId,
          workspaceId,
          requestType: 'pr_review',
        });

        modelUsed = aiRes.model;
        const validated = PRReviewOutputSchema.parse(aiRes.json);
        lastSummary = validated.summary;
        scoreSum += validated.score;
        allFindings.push(...validated.findings);
      }

      if (allFindings.length > 0) {
        await prisma.reviewFinding.createMany({
          data: allFindings.map((f) => ({
            reviewId: review.id,
            filePath: f.file_path,
            lineNumber: f.line_number ?? null,
            startLine: f.line_number ?? null,
            endLine: f.line_number ?? null,
            severity: f.severity,
            category: f.category,
            title: f.title,
            description: f.explanation,
            recommendation: f.suggested_fix || null,
            suggestedFix: f.suggested_fix || null,
            status: 'open',
          })),
        });
      }

      const avgScore = Math.round(scoreSum / diffBatches.length);
      return prisma.pullRequestReview.update({
        where: { id: review.id },
        data: {
          status: 'completed',
          summary: lastSummary,
          score: avgScore,
          model: modelUsed,
          completedAt: new Date(),
        },
        include: {
          pullRequest: true,
          findings: true,
        },
      });
    } catch (error: any) {
      await prisma.pullRequestReview.update({
        where: { id: review.id },
        data: {
          status: 'failed',
          error: error.message || 'PR review failed',
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }
}
