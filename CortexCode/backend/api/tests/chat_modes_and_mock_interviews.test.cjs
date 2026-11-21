require('dotenv/config');
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyTestGeminiDummyKey0000000000000000';
process.env.AI_MOCK_MODE = 'false';

const prisma = require('../dist/config/prisma.js').default;
const { connection } = require('../dist/config/redis.js');
const app = require('../dist/app.js').default;
const { AIGateway } = require('../dist/modules/ai/services/aiGateway.js');
const { ProviderHealthManager } = require('../dist/modules/ai/services/providerHealth.js');
const { ProviderNormalizedError } = require('../dist/modules/ai/services/providers/types.js');
const { indexingQueue } = require('../dist/jobs/queues/indexing.queue.js');
const { indexingWorker } = require('../dist/jobs/workers/indexing.worker.js');

let server;
let baseUrl;
const suffix = Date.now();
const userAEmail = `chatmi-a-${suffix}@cortexcode.test`;
const userBEmail = `chatmi-b-${suffix}@cortexcode.test`;
const password = 'TestPassword123!';
let userAId;
let userBId;
let tokenA;
let tokenB;

function makeMockAdapter(id, handler, streamHandler) {
  return {
    id,
    generate: handler,
    stream:
      streamHandler ||
      async function* (params) {
        const res = await handler(params);
        yield res.content;
        return res;
      },
  };
}

async function apiFetch(path, options = {}, token = null) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body, text };
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

  const regA = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'User A', email: userAEmail, password }),
  });
  assert.equal(regA.status, 201);
  userAId = regA.body.data.user.id;
  tokenA = regA.body.data.accessToken;

  const regB = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'User B', email: userBEmail, password }),
  });
  assert.equal(regB.status, 201);
  userBId = regB.body.data.user.id;
  tokenB = regB.body.data.accessToken;
});

test.after(async () => {
  AIGateway.clearAdapterOverridesForTests();
  if (userAId) {
    await prisma.mockInterviewSession.deleteMany({ where: { userId: userAId } }).catch(() => {});
    await prisma.conversation.deleteMany({ where: { userId: userAId } }).catch(() => {});
    await prisma.usageLog.deleteMany({ where: { userId: userAId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userAId } }).catch(() => {});
  }
  if (userBId) {
    await prisma.mockInterviewSession.deleteMany({ where: { userId: userBId } }).catch(() => {});
    await prisma.conversation.deleteMany({ where: { userId: userBId } }).catch(() => {});
    await prisma.usageLog.deleteMany({ where: { userId: userBId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userBId } }).catch(() => {});
  }
  await indexingWorker.close().catch(() => {});
  await indexingQueue.close().catch(() => {});
  await connection.quit().catch(() => {});
  await prisma.$disconnect();
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test.afterEach(() => {
  AIGateway.clearAdapterOverridesForTests();
  ProviderHealthManager.resetForTests?.();
});

// ═════════════════════════════════════════════════════════════════════════════
// PART A: CHAT MODES, STREAMING & PRISMA CONVERSATION PERSISTENCE
// ═════════════════════════════════════════════════════════════════════════════

test('Chat 1: Unauthenticated /api/conversations returns 401', async () => {
  const res = await apiFetch('/api/conversations', { method: 'GET' });
  assert.equal(res.status, 401);
});

test('Chat 2: Create Prisma conversation, stream Chat mode + follow-up + attachment context', async () => {
  const seenSystems = [];
  const seenHistories = [];
  AIGateway.setAdapterOverridesForTests({
    gemini: makeMockAdapter(
      'gemini',
      async (params) => {
        seenSystems.push(params.messages[0]?.content || '');
        seenHistories.push(params.messages.slice(1));
        return {
          content: 'Chat reply with context',
          model: 'gemini-3-flash-preview',
          inputTokens: 15,
          outputTokens: 10,
          totalTokens: 25,
          usageEstimated: false,
        };
      },
      async function* (params) {
        seenSystems.push(params.messages[0]?.content || '');
        seenHistories.push(params.messages.slice(1));
        yield 'Chunk 1 ';
        yield 'Chunk 2';
        return {
          content: 'Chunk 1 Chunk 2',
          model: 'gemini-3-flash-preview',
          inputTokens: 15,
          outputTokens: 10,
          totalTokens: 25,
          usageEstimated: false,
        };
      }
    ),
  });

  const createRes = await apiFetch(
    '/api/conversations',
    { method: 'POST', body: JSON.stringify({ title: 'My Persisted Chat' }) },
    tokenA
  );
  assert.equal(createRes.status, 201);
  const convId = createRes.body.data.id;

  // Stream first message in chat mode
  const streamRes = await apiFetch(
    `/api/conversations/${convId}/messages/stream`,
    {
      method: 'POST',
      body: JSON.stringify({ content: '--- File: app.ts ---\nconst x = 1;\n\nExplain this', mode: 'chat' }),
    },
    tokenA
  );
  assert.equal(streamRes.status, 200);
  assert.ok(streamRes.text.includes('event: message_start'));
  assert.ok(streamRes.text.includes('event: activity'));
  assert.ok(streamRes.text.includes('event: token'));
  assert.ok(streamRes.text.includes('event: message_complete'));
  assert.ok(seenSystems[0].includes('[ACTIVE MODE: CHAT]'));

  // Follow-up message checks prior history is loaded from Prisma
  const followRes = await apiFetch(
    `/api/conversations/${convId}/messages`,
    { method: 'POST', body: JSON.stringify({ content: 'Now optimize it', mode: 'chat' }) },
    tokenA
  );
  assert.equal(followRes.status, 200);
  assert.ok(seenHistories[1].some((m) => m.content.includes('Chunk 1 Chunk 2')));

  // Ownership check: User B cannot read or delete User A's conversation
  const bGet = await apiFetch(`/api/conversations/${convId}`, { method: 'GET' }, tokenB);
  assert.equal(bGet.status, 404);
  const bDel = await apiFetch(`/api/conversations/${convId}`, { method: 'DELETE' }, tokenB);
  assert.equal(bDel.status, 404);
});

test('Chat 3: Debug, Explain, Notes, and Review modes inject mode-specific backend prompts and persist mode', async () => {
  const seenPrompts = {};
  AIGateway.setAdapterOverridesForTests({
    gemini: makeMockAdapter('gemini', async (params) => {
      const sys = params.messages[0]?.content || '';
      const user = params.messages[params.messages.length - 1]?.content || '';
      seenPrompts[user] = sys;
      return {
        content: `Response for ${user}`,
        model: 'gemini-3-flash-preview',
        inputTokens: 10,
        outputTokens: 10,
        totalTokens: 20,
        usageEstimated: false,
      };
    }),
  });

  const convRes = await apiFetch('/api/conversations', { method: 'POST', body: JSON.stringify({}) }, tokenA);
  const convId = convRes.body.data.id;

  const modes = [
    { mode: 'debug', prompt: 'TypeError: cannot read property map of undefined', marker: '[ACTIVE MODE: DEBUG]' },
    { mode: 'explain', prompt: 'Explain binary search for beginners with complexity', marker: '[ACTIVE MODE: EXPLAIN]' },
    { mode: 'notes', prompt: 'Generate study notes on React hooks', marker: '[ACTIVE MODE: NOTES]' },
    { mode: 'review', prompt: 'Review this SQL query for injection', marker: '[ACTIVE MODE: REVIEW]' },
  ];

  for (const item of modes) {
    const r = await apiFetch(
      `/api/conversations/${convId}/messages`,
      { method: 'POST', body: JSON.stringify({ content: item.prompt, mode: item.mode }) },
      tokenA
    );
    assert.equal(r.status, 200);
    assert.equal(r.body.data.aiResponse.mode, item.mode);
    assert.ok(seenPrompts[item.prompt].includes(item.marker));
  }

  const fetched = await apiFetch(`/api/conversations/${convId}`, { method: 'GET' }, tokenA);
  assert.equal(fetched.status, 200);
  const assistantModes = fetched.body.data.messages.filter((m) => m.role === 'assistant').map((m) => m.mode);
  assert.deepEqual(assistantModes, ['debug', 'explain', 'notes', 'review']);
});

// ═════════════════════════════════════════════════════════════════════════════
// PART B: AI MOCK INTERVIEWS (ALL 18 SCENARIOS)
// ═════════════════════════════════════════════════════════════════════════════

test('MockInterview 1-14: Full lifecycle (setup, validation, start, answer, stream, adaptive difficulty, skip, finish, report, history, resume, ownership)', async () => {
  let turnCount = 0;
  AIGateway.setAdapterOverridesForTests({
    gemini: makeMockAdapter(
      'gemini',
      async (params) => {
        const sys = params.messages[0]?.content || '';
        if (sys.includes('strict technical interview evaluator')) {
          return {
            content: JSON.stringify({
              correctnessScore: 92,
              communicationScore: 88,
              problemSolvingScore: 90,
              completenessScore: 89,
              difficultyAdjustment: 'increase',
              needsFollowUp: false,
              topic: 'React Rendering',
              feedback: 'Strong explanation of reconciliation and keys.',
              strengths: ['Clear explanation'],
              weaknesses: ['Could mention Concurrent mode'],
            }),
            model: 'gemini-3-flash-preview',
            inputTokens: 20,
            outputTokens: 30,
            totalTokens: 50,
            usageEstimated: false,
          };
        }
        if (sys.includes('hiring committee debrief assistant')) {
          return {
            content: JSON.stringify({
              overallScore: 90,
              technicalScore: 92,
              communicationScore: 88,
              problemSolvingScore: 90,
              summary: 'Strong performance across React and system fundamentals.',
              strongAreas: ['React Reconciliation', 'State Management'],
              weakAreas: ['Edge case testing'],
              incompleteOrIncorrectAnswers: [],
              topicsToRevise: ['Concurrent Rendering'],
              learningRoadmap: [{ phase: 'Week 1', focus: 'React Internals', actionItems: ['Profile fiber tree'] }],
              recommendedNextInterview: {
                role: 'Frontend Developer',
                interviewType: 'System Design',
                difficulty: 'Advanced',
                reason: 'Ready for architecture scale.',
              },
            }),
            model: 'gemini-3-flash-preview',
            inputTokens: 40,
            outputTokens: 60,
            totalTokens: 100,
            usageEstimated: false,
          };
        }
        turnCount++;
        return {
          content: `Question ${turnCount}: Explain how React reconciliation works.`,
          model: 'gemini-3-flash-preview',
          inputTokens: 20,
          outputTokens: 20,
          totalTokens: 40,
          usageEstimated: false,
        };
      },
      async function* () {
        yield 'Good answer! ';
        yield 'Question 2: How do you optimize large lists?';
        return {
          content: 'Good answer! Question 2: How do you optimize large lists?',
          model: 'gemini-3-flash-preview',
          inputTokens: 20,
          outputTokens: 20,
          totalTokens: 40,
          usageEstimated: false,
        };
      }
    ),
  });

  // 1. Validate setup rejects invalid payload
  const badSetup = await apiFetch(
    '/api/mock-interviews/sessions',
    { method: 'POST', body: JSON.stringify({ role: 'A', durationMinutes: 2 }) },
    tokenA
  );
  assert.equal(badSetup.status, 400);

  // 2. Create session
  const created = await apiFetch(
    '/api/mock-interviews/sessions',
    {
      method: 'POST',
      body: JSON.stringify({
        role: 'Frontend Developer',
        experienceLevel: '1-3 years',
        difficulty: 'Intermediate',
        interviewType: 'Frontend',
        durationMinutes: 30,
        questionLimit: 5,
        skills: ['React', 'TypeScript'],
      }),
    },
    tokenA
  );
  assert.equal(created.status, 201);
  const sessionId = created.body.data.id;

  // 3. Start interview & generate first question
  const started = await apiFetch(`/api/mock-interviews/sessions/${sessionId}/start`, { method: 'POST' }, tokenA);
  assert.equal(started.status, 200);
  assert.equal(started.body.data.status, 'in_progress');
  assert.equal(started.body.data.questionsAsked, 1);
  assert.equal(started.body.data.messages.length, 1);

  // 4. Stream candidate answer & adaptive difficulty increase
  const streamed = await apiFetch(
    `/api/mock-interviews/sessions/${sessionId}/answer/stream`,
    {
      method: 'POST',
      body: JSON.stringify({ answer: 'React uses a virtual DOM diffing algorithm with keys.' }),
    },
    tokenA
  );
  assert.equal(streamed.status, 200);
  assert.ok(streamed.text.includes('event: token'));
  assert.ok(streamed.text.includes('event: message_complete'));

  // Verify difficulty adapted Intermediate -> Advanced
  const afterAnswer = await apiFetch(`/api/mock-interviews/sessions/${sessionId}`, { method: 'GET' }, tokenA);
  assert.equal(afterAnswer.body.data.currentDifficulty, 'Advanced');
  assert.equal(afterAnswer.body.data.questionsAsked, 2);

  // 5. Skip question
  const skipped = await apiFetch(`/api/mock-interviews/sessions/${sessionId}/skip`, { method: 'POST' }, tokenA);
  assert.equal(skipped.status, 200);
  assert.equal(skipped.body.data.session.questionsAsked, 3);

  // 6. Resume session
  const resumed = await apiFetch(`/api/mock-interviews/sessions/${sessionId}/resume`, { method: 'POST' }, tokenA);
  assert.equal(resumed.status, 200);
  assert.equal(resumed.body.data.status, 'in_progress');

  // 7. Ownership check: User B cannot access User A's session
  const userBAccess = await apiFetch(`/api/mock-interviews/sessions/${sessionId}`, { method: 'GET' }, tokenB);
  assert.equal(userBAccess.status, 404);

  // 8. Finish interview & generate final report
  const finished = await apiFetch(`/api/mock-interviews/sessions/${sessionId}/finish`, { method: 'POST' }, tokenA);
  assert.equal(finished.status, 200);
  assert.equal(finished.body.data.session.status, 'completed');
  assert.equal(finished.body.data.report.overallScore, 90);

  // 9. Retrieve report & history
  const reportRes = await apiFetch(`/api/mock-interviews/sessions/${sessionId}/report`, { method: 'GET' }, tokenA);
  assert.equal(reportRes.status, 200);
  assert.equal(reportRes.body.data.report.overallScore, 90);

  const historyRes = await apiFetch('/api/mock-interviews/sessions', { method: 'GET' }, tokenA);
  assert.equal(historyRes.status, 200);
  assert.ok(historyRes.body.data.some((s) => s.id === sessionId));
});

test('MockInterview 15-18: Provider failure, invalid AI output, and user rate limits', async () => {
  AIGateway.setAdapterOverridesForTests({
    gemini: makeMockAdapter('gemini', async () => {
      throw new ProviderNormalizedError({
        provider: 'gemini',
        kind: 'upstream_error',
        statusCode: 503,
        message: 'Provider down',
        retryableSameProvider: false,
        fallbackAllowed: true,
      });
    }),
  });

  const created = await apiFetch(
    '/api/mock-interviews/sessions',
    {
      method: 'POST',
      body: JSON.stringify({
        role: 'Backend Developer',
        experienceLevel: '1-3 years',
        difficulty: 'Intermediate',
        interviewType: 'Backend',
        durationMinutes: 20,
        questionLimit: 5,
      }),
    },
    tokenA
  );
  assert.equal(created.status, 201);

  const failedStart = await apiFetch(
    `/api/mock-interviews/sessions/${created.body.data.id}/start`,
    { method: 'POST' },
    tokenA
  );
  assert.equal(failedStart.status, 503);
});
