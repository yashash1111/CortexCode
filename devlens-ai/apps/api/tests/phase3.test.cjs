require('dotenv/config');
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');

const prisma = require('../dist/config/prisma.js').default;
const { connection } = require('../dist/config/redis.js');
const app = require('../dist/app.js').default;
const { addIndexJob, indexingQueue } = require('../dist/jobs/queues/indexing.queue.js');
const { indexingWorker, isIndexableFilePath } = require('../dist/jobs/workers/indexing.worker.js');
const { parseGitHubPrUrl, PRReviewOutputSchema } = require('../dist/services/github/prReviewService.js');

let server;
let baseUrl;
let userAId;
let userBId;
let tokenA;
let tokenB;
let workspaceId;
let repoId;

async function apiReq(pathname, options = {}, token = tokenA) {
  return fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}

test.before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  const ts = Date.now();
  const rA = await apiReq(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({ name: 'P3 User A', email: `p3a-${ts}@cortexcode.test`, password: 'Password123!' }),
    },
    null
  );
  const bA = await rA.json();
  userAId = bA.data.user.id;
  tokenA = bA.data.accessToken;

  const rB = await apiReq(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({ name: 'P3 User B', email: `p3b-${ts}@cortexcode.test`, password: 'Password123!' }),
    },
    null
  );
  const bB = await rB.json();
  userBId = bB.data.user.id;
  tokenB = bB.data.accessToken;

  const wsRes = await apiReq('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name: 'Phase3 GitHub Workspace' }),
  });
  const wsJson = await wsRes.json();
  workspaceId = wsJson.data.id;
});

test.after(async () => {
  if (userAId) await prisma.user.delete({ where: { id: userAId } }).catch(() => {});
  if (userBId) await prisma.user.delete({ where: { id: userBId } }).catch(() => {});
  await indexingWorker.close().catch(() => {});
  await indexingQueue.close().catch(() => {});
  await connection.quit().catch(() => {});
  await prisma.$disconnect();
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('1. File filtering & PR URL / Finding schema validation', () => {
  assert.equal(isIndexableFilePath('src/auth/jwt.ts', 1200), true);
  assert.equal(isIndexableFilePath('node_modules/pkg/index.js', 500), false);
  assert.equal(isIndexableFilePath('.env.production', 100), false);
  assert.equal(isIndexableFilePath('package-lock.json', 1000), false);

  const parsed = parseGitHubPrUrl('https://github.com/octocat/Hello-World/pull/12');
  assert.equal(parsed.owner, 'octocat');
  assert.equal(parsed.repo, 'Hello-World');
  assert.equal(parsed.prNumber, 12);

  const validated = PRReviewOutputSchema.parse({
    summary: 'Looks good overall',
    score: 90,
    findings: [
      {
        severity: 'warning',
        category: 'security',
        file_path: 'src/auth.ts',
        line_number: 42,
        title: 'Missing rate limit',
        explanation: 'Endpoint lacks rate limiting',
        suggested_fix: 'app.use(rateLimiter)',
      },
    ],
  });
  assert.equal(validated.findings.length, 1);
});

test('2. Tree-sitter indexing, incremental skipping, Dependency Graph & Codebase Q&A', async () => {
  const repo = await prisma.repository.create({
    data: {
      userId: userAId,
      workspaceId,
      githubId: `p3-${crypto.randomUUID()}`,
      name: 'cortex-sample',
      fullName: 'cortex/cortex-sample',
      owner: 'cortex',
      defaultBranch: 'main',
      private: false,
      githubUrl: 'https://github.com/cortex/cortex-sample',
    },
  });
  repoId = repo.id;

  await prisma.repositoryFile.createMany({
    data: [
      {
        repositoryId: repoId,
        path: 'src/middleware/auth.ts',
        name: 'auth.ts',
        extension: 'ts',
        language: 'typescript',
        size: 220,
        content: `import jwt from 'jsonwebtoken';\nexport function verifyJwtToken(token: string) {\n  return jwt.verify(token, process.env.JWT_SECRET!);\n}\n`,
        isBinary: false,
      },
      {
        repositoryId: repoId,
        path: 'src/routes/users.ts',
        name: 'users.ts',
        extension: 'ts',
        language: 'typescript',
        size: 180,
        content: `import { verifyJwtToken } from '../middleware/auth';\nimport prisma from '../config/prisma';\nexport async function getProfile(token: string) {\n  const payload = verifyJwtToken(token);\n  return prisma.user.findUnique({ where: { id: payload.userId } });\n}\n`,
        isBinary: false,
      },
    ],
  });

  // First index run
  const job1 = await addIndexJob({ repositoryId: repoId, userId: userAId, workspaceId, syncGitHub: false });
  let finalJob1;
  for (let i = 0; i < 40; i++) {
    const jr = await apiReq(`/api/jobs/${job1.id}`);
    finalJob1 = (await jr.json()).data;
    if (finalJob1.status === 'completed' || finalJob1.status === 'failed') break;
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.equal(finalJob1.status, 'completed', `Job 1 failed: ${finalJob1.error}`);

  // Second index run (incremental: unchanged files must be skipped!)
  const job2 = await addIndexJob({ repositoryId: repoId, userId: userAId, workspaceId, syncGitHub: false });
  let finalJob2;
  for (let i = 0; i < 40; i++) {
    const jr = await apiReq(`/api/jobs/${job2.id}`);
    finalJob2 = (await jr.json()).data;
    if (finalJob2.status === 'completed' || finalJob2.status === 'failed') break;
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.equal(finalJob2.status, 'completed');
  assert.equal(finalJob2.metadata?.skippedUnchanged, 2);

  // Dependency Graph check
  const graphRes = await apiReq(`/api/github-intel/repos/${repoId}/graph`);
  assert.equal(graphRes.status, 200);
  const graphJson = await graphRes.json();
  assert.equal(graphJson.data.files.length, 2);
  assert.ok(graphJson.data.edges.length >= 2);

  // Codebase Q&A check
  const qaRes = await apiReq(`/api/github-intel/repos/${repoId}/qa`, {
    method: 'POST',
    body: JSON.stringify({ question: 'Where is JWT token verification implemented?' }),
  });
  assert.equal(qaRes.status, 200);
  const qaJson = await qaRes.json();
  assert.ok(qaJson.data.sources.some((s) => s.filePath === 'src/middleware/auth.ts'));
  assert.ok(qaJson.data.answer.length > 10);

  // Workspace isolation check for User B
  const qaForbidden = await apiReq(
    `/api/github-intel/repos/${repoId}/qa`,
    { method: 'POST', body: JSON.stringify({ question: 'JWT?' }) },
    tokenB
  );
  assert.equal(qaForbidden.status, 404);
});

test('3. GitHub Webhook HMAC signature & duplicate delivery protection', async () => {
  const prevSecret = process.env.GITHUB_WEBHOOK_SECRET;
  process.env.GITHUB_WEBHOOK_SECRET = 'phase3-webhook-test-secret';

  try {
    const payload = { action: 'opened', repository: { id: 999999999 }, pull_request: { number: 1 } };
    const bodyStr = JSON.stringify(payload);
    const sig = 'sha256=' + crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET).update(bodyStr).digest('hex');
    const deliveryId = `deliv-${Date.now()}`;

    // Bad signature -> 401
    const badRes = await fetch(`${baseUrl}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=0000000000000000000000000000000000000000000000000000000000000000',
        'x-github-event': 'pull_request',
        'x-github-delivery': deliveryId,
      },
      body: bodyStr,
    });
    assert.equal(badRes.status, 401);

    // Valid signature -> 202
    const okRes = await fetch(`${baseUrl}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': sig,
        'x-github-event': 'pull_request',
        'x-github-delivery': deliveryId,
      },
      body: bodyStr,
    });
    assert.equal(okRes.status, 202);

    // Duplicate delivery -> 200
    const dupRes = await fetch(`${baseUrl}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': sig,
        'x-github-event': 'pull_request',
        'x-github-delivery': deliveryId,
      },
      body: bodyStr,
    });
    assert.equal(dupRes.status, 200);
  } finally {
    process.env.GITHUB_WEBHOOK_SECRET = prevSecret;
  }
});

test('4. Observability summary computes real database metrics & percentiles', async () => {
  const obsRes = await apiReq(`/api/jobs/observability/summary?days=30&workspaceId=${workspaceId}`);
  assert.equal(obsRes.status, 200);
  const obsJson = await obsRes.json();
  const data = obsJson.data;
  assert.ok(data.summary.totalRequests >= 1);
  assert.ok(data.summary.totalTokens > 0);
  assert.ok(data.summary.p50LatencyMs >= 0);
  assert.ok(data.summary.p95LatencyMs >= data.summary.p50LatencyMs);
  assert.ok(Array.isArray(data.dailyUsage));
  assert.ok(Array.isArray(data.byModel));
  assert.ok(Array.isArray(data.byModule));
});
