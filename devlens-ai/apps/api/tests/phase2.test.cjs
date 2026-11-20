require('dotenv/config');
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const prisma = require('../dist/config/prisma.js').default;
const { connection } = require('../dist/config/redis.js');
const app = require('../dist/app.js').default;
const { docIngestionQueue } = require('../dist/jobs/queues/doc_ingestion.queue.js');
const { docIngestionWorker } = require('../dist/jobs/workers/doc_ingestion.worker.js');

let server;
let baseUrl;
let userAId;
let userBId;
let tokenA;
let tokenB;
let workspaceId;
let pdfDocId;
let mdDocId;

async function apiReq(pathname, options = {}, token = tokenA) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  return res;
}

function buildTestPdfBuffer() {
  // Generate a real 2-page PDF via PyMuPDF in ai-service venv
  const pyBin = path.resolve(__dirname, '../../ai-service/venv/bin/python');
  const script = `
import base64, pymupdf
doc = pymupdf.open()
p1 = doc.new_page()
p1.insert_text((72, 72), "Authentication Architecture", fontsize=18)
p1.insert_text((72, 110), "CortexCode uses JWT access tokens and SHA-256 hashed refresh tokens.", fontsize=11)
p2 = doc.new_page()
p2.insert_text((72, 72), "Error Handling Policy", fontsize=18)
p2.insert_text((72, 110), "Rate limit errors return HTTP 429 with a Retry-After header.", fontsize=11)
print(base64.b64encode(doc.tobytes()).decode('ascii'))
doc.close()
`;
  const b64 = execFileSync(pyBin, ['-c', script], { encoding: 'utf-8' }).trim();
  return Buffer.from(b64, 'base64');
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User A', email: `p2a-${ts}@cortexcode.test`, password: 'Password123!' }),
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User B', email: `p2b-${ts}@cortexcode.test`, password: 'Password123!' }),
    },
    null
  );
  const bB = await rB.json();
  userBId = bB.data.user.id;
  tokenB = bB.data.accessToken;

  const wsRes = await apiReq('/api/workspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Phase2 Docs Workspace' }),
  });
  const wsBody = await wsRes.json();
  workspaceId = wsBody.data.id;
});

test.after(async () => {
  if (userAId) await prisma.user.delete({ where: { id: userAId } }).catch(() => {});
  if (userBId) await prisma.user.delete({ where: { id: userBId } }).catch(() => {});
  await docIngestionWorker.close().catch(() => {});
  await docIngestionQueue.close().catch(() => {});
  await connection.quit().catch(() => {});
  await prisma.$disconnect();
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('1. Reject invalid PDF header on upload', async () => {
  const form = new FormData();
  form.append('workspaceId', workspaceId);
  form.append('file', new Blob([Buffer.from('not a pdf')], { type: 'application/pdf' }), 'fake.pdf');

  const res = await apiReq('/api/docs/upload', { method: 'POST', body: form });
  assert.equal(res.status, 400);
});

test('2. Upload PDF & Markdown and process via BullMQ worker with real embeddings', async () => {
  const pdfBuf = buildTestPdfBuffer();
  const pdfForm = new FormData();
  pdfForm.append('workspaceId', workspaceId);
  pdfForm.append('file', new Blob([pdfBuf], { type: 'application/pdf' }), 'System_Design.pdf');

  const pdfRes = await apiReq('/api/docs/upload', { method: 'POST', body: pdfForm });
  assert.equal(pdfRes.status, 202);
  const pdfJson = await pdfRes.json();
  pdfDocId = pdfJson.data.document.id;
  const pdfJobId = pdfJson.data.jobId;

  const mdContent = '# API Gateway Spec\n\n## Timeouts\n\nAll LLM requests enforce a 25 second timeout.\n';
  const mdForm = new FormData();
  mdForm.append('workspaceId', workspaceId);
  mdForm.append('file', new Blob([Buffer.from(mdContent)], { type: 'text/markdown' }), 'gateway.md');

  const mdRes = await apiReq('/api/docs/upload', { method: 'POST', body: mdForm });
  assert.equal(mdRes.status, 202);
  const mdJson = await mdRes.json();
  mdDocId = mdJson.data.document.id;
  const mdJobId = mdJson.data.jobId;

  // Poll both jobs until completed
  for (const jobId of [pdfJobId, mdJobId]) {
    let job;
    for (let i = 0; i < 40; i++) {
      const jr = await apiReq(`/api/jobs/${jobId}`);
      const jb = await jr.json();
      job = jb.data;
      if (job.status === 'completed' || job.status === 'failed') break;
      await new Promise((r) => setTimeout(r, 500));
    }
    assert.equal(job.status, 'completed', `Job failed: ${job.error}`);
    assert.equal(job.progress, 100);
  }

  // Verify chunks & page numbers
  const detailRes = await apiReq(`/api/docs/${pdfDocId}`);
  const detailJson = await detailRes.json();
  assert.equal(detailJson.data.document.status, 'INDEXED');
  assert.ok(detailJson.data.chunks.length >= 2);
  const pages = detailJson.data.chunks.map((c) => c.metadata.pageNumber);
  assert.ok(pages.includes(1) && pages.includes(2));
});

test('3. Hybrid search & strict workspace isolation', async () => {
  const searchRes = await apiReq('/api/docs/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId, query: 'HTTP 429 rate limit error handling', topK: 3 }),
  });
  assert.equal(searchRes.status, 200);
  const searchJson = await searchRes.json();
  assert.ok(searchJson.data.length >= 1);
  assert.equal(searchJson.data[0].documentName, 'System_Design.pdf');
  assert.equal(searchJson.data[0].pageNumber, 2);

  // User B must be blocked from User A workspace
  const unauthList = await apiReq(`/api/docs?workspaceId=${workspaceId}`, {}, tokenB);
  assert.equal(unauthList.status, 404);

  const unauthSearch = await apiReq(
    '/api/docs/search',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, query: 'JWT' }),
    },
    tokenB
  );
  assert.equal(unauthSearch.status, 404);
});

test('4. SSE Streaming RAG Chat with citations & file serving', async () => {
  const chatRes = await apiReq('/api/docs/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workspaceId,
      message: 'What status code is returned for rate limit errors?',
    }),
  });
  assert.equal(chatRes.status, 200);
  const sseText = await chatRes.text();
  assert.ok(sseText.includes('"type":"sources"'));
  assert.ok(sseText.includes('System_Design.pdf'));
  assert.ok(sseText.includes('"type":"done"'));

  const histRes = await apiReq(`/api/docs/chat/history?workspaceId=${workspaceId}`);
  const histJson = await histRes.json();
  assert.ok(histJson.data.messages.length >= 2);

  // File serving for Citation Viewer
  const fileRes = await apiReq(`/api/docs/${pdfDocId}/file`);
  assert.equal(fileRes.status, 200);
  assert.equal(fileRes.headers.get('content-type'), 'application/pdf');
});

test('5. Evaluation Engine (LLM-as-a-Judge) persistence & metrics', async () => {
  const evalRes = await apiReq('/api/docs/evals/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workspaceId,
      name: 'Phase 2 Automated Eval',
      cases: [
        {
          question: 'What does CortexCode use for authentication tokens?',
          expectedSource: 'System_Design.pdf',
          groundTruth: 'JWT access tokens and SHA-256 hashed refresh tokens.',
        },
        {
          question: 'What timeout is enforced on LLM requests?',
          expectedSource: 'gateway.md',
          groundTruth: '25 second timeout.',
        },
      ],
    }),
  });
  assert.equal(evalRes.status, 201);
  const evalJson = await evalRes.json();
  const run = evalJson.data;
  assert.equal(run.status, 'completed');
  assert.equal(run.datasetSize, 2);
  assert.ok(run.metrics.retrievalHitRate >= 0.5);
  assert.ok(run.cases.length === 2);
});

test('6. Document deletion removes document and its KnowledgeChunks', async () => {
  const delRes = await apiReq(`/api/docs/${mdDocId}`, { method: 'DELETE' });
  assert.equal(delRes.status, 200);

  const chunks = await prisma.$queryRaw`
    SELECT "id" FROM "KnowledgeChunk"
    WHERE "workspaceId" = ${workspaceId}
      AND "moduleType" = 'doc'
      AND "metadata"->>'documentId' = ${mdDocId}
  `;
  assert.equal(chunks.length, 0);
});
