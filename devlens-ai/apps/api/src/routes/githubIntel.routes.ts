import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { GitHubClient } from '../services/github/github.client';
import { decryptToken } from '../utils/crypto';
import { addIndexJob } from '../jobs/queues/indexing.queue';
import { RepoRagService } from '../services/github/repoRagService';
import { PRReviewService } from '../services/github/prReviewService';
import { AIGateway } from '../services/ai/aiGateway';

const router = Router();
router.use(authenticate);

function parseRepoUrlOrFullName(input: string): { owner: string; repo: string } {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') };
  }
  const slashMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (slashMatch) {
    return { owner: slashMatch[1], repo: slashMatch[2].replace(/\.git$/, '') };
  }
  throw new Error('Provide a valid GitHub repository URL or owner/repo');
}

// POST /api/github-intel/repos/connect
router.post('/repos/connect', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId, repoUrl, branch } = req.body;
    if (!workspaceId || !repoUrl) {
      return res.status(400).json({ success: false, error: { message: 'workspaceId and repoUrl are required' } });
    }

    const ws = await prisma.workspace.findFirst({ where: { id: workspaceId, userId } });
    if (!ws) return res.status(404).json({ success: false, error: { message: 'Workspace not found' } });

    const { owner, repo } = parseRepoUrlOrFullName(repoUrl);
    const ghAccount = await prisma.gitHubAccount.findUnique({ where: { userId } });
    const token = ghAccount ? decryptToken(ghAccount.accessTokenEncrypted) : undefined;

    const ghData = await GitHubClient.getRepository(owner, repo, token);
    const githubId = String(ghData.id);

    let repository = await prisma.repository.findUnique({ where: { githubId } });
    if (repository) {
      if (repository.userId !== userId) {
        return res.status(403).json({ success: false, error: { message: 'Repository already connected by another user' } });
      }
      repository = await prisma.repository.update({
        where: { id: repository.id },
        data: {
          workspaceId,
          defaultBranch: branch || ghData.default_branch || repository.defaultBranch,
        },
      });
    } else {
      repository = await prisma.repository.create({
        data: {
          userId,
          workspaceId,
          githubId,
          name: ghData.name,
          fullName: ghData.full_name,
          description: ghData.description || null,
          owner: ghData.owner?.login || owner,
          defaultBranch: branch || ghData.default_branch || 'main',
          private: Boolean(ghData.private),
          language: ghData.language || null,
          stars: Number(ghData.stargazers_count || 0),
          forks: Number(ghData.forks_count || 0),
          githubUrl: ghData.html_url,
        },
      });
    }

    return res.status(201).json({ success: true, data: repository });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message || 'Failed to connect repository' } });
  }
});

// GET /api/github-intel/repos?workspaceId=...
router.get('/repos', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;
    const repos = await prisma.repository.findMany({
      where: {
        userId,
        ...(workspaceId ? { workspaceId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });

    const jobs = await prisma.ingestionJob.findMany({
      where: { userId, moduleType: 'repo' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const latestByRepo = new Map<string, any>();
    for (const j of jobs) {
      if (j.sourceId && !latestByRepo.has(j.sourceId)) latestByRepo.set(j.sourceId, j);
    }

    const enriched = await Promise.all(
      repos.map(async (r) => {
        const chunkCount = await prisma.codeChunk.count({ where: { repositoryId: r.id } });
        const fileCount = await prisma.repositoryFile.count({ where: { repositoryId: r.id } });
        return {
          ...r,
          chunkCount,
          fileCount,
          latestJob: latestByRepo.get(r.id) || null,
        };
      })
    );

    return res.json({ success: true, data: enriched });
  } catch {
    return res.status(500).json({ success: false, error: { message: 'Failed to list repositories' } });
  }
});

// GET /api/github-intel/repos/:id/branches
router.get('/repos/:id/branches', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const repo = await prisma.repository.findFirst({ where: { id: req.params.id, userId } });
    if (!repo) return res.status(404).json({ success: false, error: { message: 'Repository not found' } });

    const ghAccount = await prisma.gitHubAccount.findUnique({ where: { userId } });
    const token = ghAccount ? decryptToken(ghAccount.accessTokenEncrypted) : undefined;
    const branches = await GitHubClient.listBranches(repo.owner, repo.name, token);
    return res.json({ success: true, data: branches.map((b) => b.name) });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// POST /api/github-intel/repos/:id/index
router.post('/repos/:id/index', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const repo = await prisma.repository.findFirst({ where: { id: req.params.id, userId } });
    if (!repo) return res.status(404).json({ success: false, error: { message: 'Repository not found' } });

    const branch = typeof req.body?.branch === 'string' && req.body.branch ? req.body.branch : repo.defaultBranch;
    if (branch !== repo.defaultBranch) {
      await prisma.repository.update({ where: { id: repo.id }, data: { defaultBranch: branch } });
    }

    const job = await addIndexJob({
      repositoryId: repo.id,
      userId,
      workspaceId: repo.workspaceId || undefined,
      branch,
      syncGitHub: req.body?.syncGitHub !== false,
    });

    return res.status(202).json({ success: true, data: { jobId: job.id, job } });
  } catch (err: any) {
    return res.status(503).json({ success: false, error: { message: err.message || 'Failed to queue indexing' } });
  }
});

// DELETE /api/github-intel/repos/:id
router.delete('/repos/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const repo = await prisma.repository.findFirst({ where: { id: req.params.id, userId } });
    if (!repo) return res.status(404).json({ success: false, error: { message: 'Repository not found' } });

    if (repo.workspaceId) {
      await prisma.$executeRaw`
        DELETE FROM "KnowledgeChunk"
        WHERE "workspaceId" = ${repo.workspaceId}
          AND "moduleType" = 'repo'
          AND "metadata"->>'repositoryId' = ${repo.id}
      `;
    }
    await prisma.repository.delete({ where: { id: repo.id } });
    return res.json({ success: true, data: { deletedId: repo.id } });
  } catch {
    return res.status(500).json({ success: false, error: { message: 'Failed to remove repository' } });
  }
});

// POST /api/github-intel/repos/:id/qa
router.post('/repos/:id/qa', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { question, topK = 6 } = req.body;
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ success: false, error: { message: 'question is required' } });
    }

    const repo = await prisma.repository.findFirst({ where: { id: req.params.id, userId } });
    if (!repo || !repo.workspaceId) {
      return res.status(404).json({ success: false, error: { message: 'Indexed repository not found' } });
    }

    const chunks = await RepoRagService.hybridSearch({
      workspaceId: repo.workspaceId,
      repositoryId: repo.id,
      query: question.trim(),
      topK,
      userId,
    });
    const edges = await RepoRagService.getDependencyContext(
      repo.id,
      Array.from(new Set(chunks.map((c) => c.filePath)))
    );

    const systemPrompt = RepoRagService.buildGroundedPrompt(chunks, edges);
    const aiRes = await AIGateway.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question.trim() },
      ],
      temperature: 0.2,
      userId,
      workspaceId: repo.workspaceId,
      requestType: 'repo_qa',
    });

    return res.json({
      success: true,
      data: {
        answer: aiRes.content,
        sources: chunks,
        dependencies: edges,
        usage: {
          model: aiRes.model,
          provider: aiRes.provider,
          latencyMs: aiRes.latencyMs,
          totalTokens: aiRes.totalTokens,
          estimatedCost: aiRes.estimatedCost,
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message || 'Codebase Q&A failed' } });
  }
});

// GET /api/github-intel/repos/:id/tree
router.get('/repos/:id/tree', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const repo = await prisma.repository.findFirst({ where: { id: req.params.id, userId } });
    if (!repo) return res.status(404).json({ success: false, error: { message: 'Repository not found' } });

    const files = await prisma.repositoryFile.findMany({
      where: { repositoryId: repo.id },
      select: {
        id: true,
        path: true,
        name: true,
        language: true,
        size: true,
        lineCount: true,
        symbols: true,
      },
      orderBy: { path: 'asc' },
    });

    return res.json({ success: true, data: files });
  } catch {
    return res.status(500).json({ success: false, error: { message: 'Failed to load file tree' } });
  }
});

// POST /api/github-intel/repos/:id/vulnerabilities — Free OSV.dev CVE scan
router.post('/repos/:id/vulnerabilities', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const repo = await prisma.repository.findFirst({
      where: { id: req.params.id, userId },
      include: { user: { include: { githubAccount: true } } },
    });
    if (!repo) return res.status(404).json({ success: false, error: { message: 'Repository not found' } });

    const token = repo.user.githubAccount ? decryptToken(repo.user.githubAccount.accessTokenEncrypted) : undefined;
    const queries: Array<{ package: { name: string; ecosystem: string }; version: string }> = [];

    // Try package.json from DB or GitHub
    let pkgJsonText = (
      await prisma.repositoryFile.findFirst({
        where: { repositoryId: repo.id, path: { endsWith: 'package.json' } },
      })
    )?.content;

    if (!pkgJsonText) {
      pkgJsonText = await GitHubClient.getFileContent(repo.owner, repo.name, 'package.json', repo.defaultBranch, token).catch(() => undefined);
    }

    if (pkgJsonText) {
      try {
        const parsed = JSON.parse(pkgJsonText);
        const deps = { ...(parsed.dependencies || {}), ...(parsed.devDependencies || {}) };
        for (const [name, rawVer] of Object.entries(deps)) {
          const cleanVer = String(rawVer).replace(/^[\^~>=<]+/, '').trim();
          if (/^\d+\.\d+\.\d+/.test(cleanVer)) {
            queries.push({ package: { name, ecosystem: 'npm' }, version: cleanVer });
          }
        }
      } catch { /* ignore malformed package.json */ }
    }

    if (queries.length === 0) {
      return res.json({ success: true, data: { scannedPackages: 0, findings: [] } });
    }

    const batch = queries.slice(0, 50);
    const osvRes = await fetch('https://api.osv.dev/v1/querybatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries: batch }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!osvRes.ok) {
      throw new Error(`OSV.dev API error (${osvRes.status})`);
    }

    const osvData = await osvRes.json();
    const results: any[] = osvData.results || [];
    await prisma.dependencyFinding.deleteMany({ where: { repositoryId: repo.id } });

    const createdFindings: any[] = [];
    for (let i = 0; i < batch.length; i++) {
      const vulns = results[i]?.vulns || [];
      if (vulns.length > 0) {
        const pkg = batch[i];
        const row = await prisma.dependencyFinding.create({
          data: {
            repositoryId: repo.id,
            name: pkg.package.name,
            version: pkg.version,
            type: pkg.package.ecosystem,
            risk: vulns.length >= 3 ? 'high' : 'medium',
            vulnerabilities: vulns.slice(0, 5).map((v: any) => ({ id: v.id, summary: v.summary || v.details?.slice(0, 140) })),
          },
        });
        createdFindings.push(row);
      }
    }

    return res.json({
      success: true,
      data: {
        scannedPackages: batch.length,
        findings: createdFindings,
      },
    });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: { message: err.message || 'Vulnerability scan failed' } });
  }
});

// GET /api/github-intel/repos/:id/graph
router.get('/repos/:id/graph', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const repo = await prisma.repository.findFirst({ where: { id: req.params.id, userId } });
    if (!repo) return res.status(404).json({ success: false, error: { message: 'Repository not found' } });

    const [files, edges] = await Promise.all([
      prisma.repositoryFile.findMany({
        where: { repositoryId: repo.id },
        select: { id: true, path: true, language: true, symbols: true, imports: true },
        take: 100,
      }),
      prisma.codeGraphEdge.findMany({
        where: { repositoryId: repo.id },
        take: 250,
      }),
    ]);

    return res.json({ success: true, data: { files, edges } });
  } catch {
    return res.status(500).json({ success: false, error: { message: 'Failed to load dependency graph' } });
  }
});

// POST /api/github-intel/pr-reviews
router.post('/pr-reviews', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId, prUrl, repositoryId, prNumber } = req.body;
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { message: 'workspaceId is required' } });
    }

    const review = await PRReviewService.runReview({
      userId,
      workspaceId,
      prUrl,
      repositoryId,
      prNumber: prNumber ? Number(prNumber) : undefined,
    });

    return res.status(201).json({ success: true, data: review });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message || 'PR review failed' } });
  }
});

// GET /api/github-intel/pr-reviews?workspaceId=...
router.get('/pr-reviews', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;
    const reviews = await prisma.pullRequestReview.findMany({
      where: {
        ...(workspaceId ? { workspaceId } : {}),
        pullRequest: { repository: { userId } },
      },
      include: {
        pullRequest: { include: { repository: { select: { id: true, fullName: true, owner: true, name: true } } } },
        findings: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return res.json({ success: true, data: reviews });
  } catch {
    return res.status(500).json({ success: false, error: { message: 'Failed to list PR reviews' } });
  }
});

// PATCH /api/github-intel/pr-reviews/findings/:findingId
router.patch('/pr-reviews/findings/:findingId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { status } = req.body;
    if (!['open', 'dismissed', 'resolved', 'approved'].includes(status)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid finding status' } });
    }

    const finding = await prisma.reviewFinding.findFirst({
      where: {
        id: req.params.findingId,
        review: { pullRequest: { repository: { userId } } },
      },
    });
    if (!finding) return res.status(404).json({ success: false, error: { message: 'Finding not found' } });

    const updated = await prisma.reviewFinding.update({
      where: { id: finding.id },
      data: { status },
    });
    return res.json({ success: true, data: updated });
  } catch {
    return res.status(500).json({ success: false, error: { message: 'Failed to update finding' } });
  }
});

// POST /api/github-intel/pr-reviews/:reviewId/publish — ONLY on explicit user confirmation
router.post('/pr-reviews/:reviewId/publish', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { confirmed } = req.body;
    if (confirmed !== true) {
      return res.status(400).json({ success: false, error: { message: 'Explicit user confirmation (confirmed: true) is required' } });
    }

    const review = await prisma.pullRequestReview.findFirst({
      where: { id: req.params.reviewId, pullRequest: { repository: { userId } } },
      include: { pullRequest: { include: { repository: true } }, findings: true },
    });
    if (!review) return res.status(404).json({ success: false, error: { message: 'Review not found' } });

    const ghAccount = await prisma.gitHubAccount.findUnique({ where: { userId } });
    if (!ghAccount) {
      return res.status(400).json({ success: false, error: { message: 'Connect GitHub OAuth to publish PR comments' } });
    }

    const approved = review.findings.filter((f) => f.status === 'approved');
    if (approved.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'Approve at least one finding before publishing' } });
    }

    const body = [
      `### CortexCode AI Review Summary`,
      review.summary || '',
      '',
      ...approved.map(
        (f) =>
          `- **[${f.severity.toUpperCase()}] ${f.title}** (\`${f.filePath}${f.lineNumber ? `:${f.lineNumber}` : ''}\`)\n  ${f.description}${f.suggestedFix ? `\n  \`\`\`\n  ${f.suggestedFix}\n  \`\`\`` : ''}`
      ),
    ].join('\n');

    const token = decryptToken(ghAccount.accessTokenEncrypted);
    const repo = review.pullRequest.repository;
    const ghResp = await GitHubClient.postPullRequestComment(
      token,
      repo.owner,
      repo.name,
      review.pullRequest.number,
      body
    );

    return res.json({ success: true, data: { commentUrl: ghResp.html_url } });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message || 'Publish failed' } });
  }
});

export default router;
