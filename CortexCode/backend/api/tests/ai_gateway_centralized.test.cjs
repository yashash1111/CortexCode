require('dotenv/config');
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Ensure central dummy credentials exist in process.env for deterministic mocked tests
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyTestGeminiDummyKey0000000000000000';
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'gsk_testGroqDummyKey0000000000000000000000';
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'sk-or-v1-testOpenRouterDummyKey00000000000000';
process.env.CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'cf_test_account_id_12345';
process.env.CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || 'cf_test_api_token_abcdef123456';
process.env.AI_MOCK_MODE = 'false';

const prisma = require('../dist/config/prisma.js').default;
const { connection } = require('../dist/config/redis.js');
const app = require('../dist/app.js').default;
const {
  AIGateway,
  TemporaryAIUnavailableError,
} = require('../dist/modules/ai/services/aiGateway.js');
const { ProviderHealthManager } = require('../dist/modules/ai/services/providerHealth.js');
const { ProviderNormalizedError } = require('../dist/modules/ai/services/providers/types.js');
const { AIQuotaService, QuotaExceededError } = require('../dist/modules/ai/services/aiQuotaService.js');
const { redactSecrets } = require('../dist/modules/ai/services/secretRedactor.js');
const { indexingQueue } = require('../dist/jobs/queues/indexing.queue.js');
const { indexingWorker } = require('../dist/jobs/workers/indexing.worker.js');

let server;
let baseUrl;
const suffix = Date.now();
const normalEmail = `user-${suffix}@cortexcode.test`;
const adminEmail = `admin-${suffix}@cortexcode.test`;
const password = 'TestPassword123!';
let normalUserId;
let adminUserId;
let normalToken;
let adminToken;

function makeMockAdapter(id, handler, streamHandler) {
  return {
    id,
    generate: handler,
    stream:
      streamHandler ||
      async function* (params) {
        const res = await handler(params);
        yield res.content;
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
  return { status: res.status, body, text, headers: res.headers };
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

  // Register normal user
  const regUser = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Normal User', email: normalEmail, password }),
  });
  assert.equal(regUser.status, 201);
  normalUserId = regUser.body.data.user.id;
  normalToken = regUser.body.data.accessToken;

  // Register admin user via API, promote role to ADMIN, and re-login
  const regAdmin = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Admin User', email: adminEmail, password }),
  });
  assert.equal(regAdmin.status, 201);
  adminUserId = regAdmin.body.data.user.id;
  await prisma.user.update({
    where: { id: adminUserId },
    data: { role: 'ADMIN' },
  });
  const loginAdmin = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: adminEmail, password }),
  });
  assert.equal(loginAdmin.status, 200);
  adminToken = loginAdmin.body.data.accessToken;
});

test.after(async () => {
  AIGateway.clearAdapterOverridesForTests();
  if (normalUserId) {
    await prisma.usageLog.deleteMany({ where: { userId: normalUserId } }).catch(() => {});
    await prisma.user.delete({ where: { id: normalUserId } }).catch(() => {});
  }
  if (adminUserId) {
    await prisma.usageLog.deleteMany({ where: { userId: adminUserId } }).catch(() => {});
    await prisma.user.delete({ where: { id: adminUserId } }).catch(() => {});
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

test('1. Gemini adapter mocked success', async () => {
  AIGateway.setAdapterOverridesForTests({
    gemini: makeMockAdapter('gemini', async (params) => {
      assert.equal(params.apiKey, process.env.GEMINI_API_KEY);
      return {
        content: 'Gemini central response',
        model: 'gemini-2.5-flash',
        inputTokens: 12,
        outputTokens: 8,
        totalTokens: 20,
        usageEstimated: false,
      };
    }),
  });

  const res = await AIGateway.generate({
    messages: [{ role: 'user', content: 'Hello Gemini' }],
    provider: 'gemini',
  });
  assert.equal(res.provider, 'gemini');
  assert.equal(res.content, 'Gemini central response');
  assert.equal(res.totalTokens, 20);
});

test('2. Groq adapter mocked success', async () => {
  AIGateway.setAdapterOverridesForTests({
    groq: makeMockAdapter('groq', async (params) => {
      assert.equal(params.apiKey, process.env.GROQ_API_KEY);
      return {
        content: 'Groq central response',
        model: 'llama-3.3-70b-versatile',
        inputTokens: 10,
        outputTokens: 6,
        totalTokens: 16,
        usageEstimated: false,
      };
    }),
  });

  const res = await AIGateway.generate({
    messages: [{ role: 'user', content: 'Hello Groq' }],
    provider: 'groq',
  });
  assert.equal(res.provider, 'groq');
  assert.equal(res.content, 'Groq central response');
});

test('3. OpenRouter adapter mocked success', async () => {
  AIGateway.setAdapterOverridesForTests({
    openrouter: makeMockAdapter('openrouter', async (params) => {
      assert.equal(params.apiKey, process.env.OPENROUTER_API_KEY);
      return {
        content: 'OpenRouter central response',
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        inputTokens: 15,
        outputTokens: 9,
        totalTokens: 24,
        usageEstimated: false,
      };
    }),
  });

  const res = await AIGateway.generate({
    messages: [{ role: 'user', content: 'Hello OpenRouter' }],
    provider: 'openrouter',
  });
  assert.equal(res.provider, 'openrouter');
  assert.equal(res.content, 'OpenRouter central response');
});

test('4. Cloudflare adapter mocked success', async () => {
  AIGateway.setAdapterOverridesForTests({
    cloudflare: makeMockAdapter('cloudflare', async (params) => {
      assert.equal(params.apiKey, process.env.CLOUDFLARE_API_TOKEN);
      assert.equal(params.accountId, process.env.CLOUDFLARE_ACCOUNT_ID);
      return {
        content: 'Cloudflare central response',
        model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        inputTokens: 11,
        outputTokens: 7,
        totalTokens: 18,
        usageEstimated: true,
      };
    }),
  });

  const res = await AIGateway.generate({
    messages: [{ role: 'user', content: 'Hello Cloudflare' }],
    provider: 'cloudflare',
  });
  assert.equal(res.provider, 'cloudflare');
  assert.equal(res.content, 'Cloudflare central response');
});

test('5. Timeout error triggers fallback to next provider', async () => {
  AIGateway.setAdapterOverridesForTests({
    gemini: makeMockAdapter('gemini', async () => {
      throw new ProviderNormalizedError({
        provider: 'gemini',
        kind: 'timeout',
        message: 'gemini request timed out',
        retryableSameProvider: false,
        fallbackAllowed: true,
      });
    }),
    groq: makeMockAdapter('groq', async () => ({
      content: 'Recovered via Groq after Gemini timeout',
      model: 'llama-3.3-70b-versatile',
      inputTokens: 10,
      outputTokens: 8,
      totalTokens: 18,
      usageEstimated: false,
    })),
  });

  const res = await AIGateway.generate({
    messages: [{ role: 'user', content: 'Test timeout fallback' }],
  });
  assert.equal(res.provider, 'groq');
  assert.equal(res.content, 'Recovered via Groq after Gemini timeout');
});

test('6. 401/403 invalid key marks auth_error and falls back', async () => {
  AIGateway.setAdapterOverridesForTests({
    gemini: makeMockAdapter('gemini', async () => {
      throw new ProviderNormalizedError({
        provider: 'gemini',
        kind: 'auth_error',
        statusCode: 401,
        message: 'Invalid API key',
        retryableSameProvider: false,
        fallbackAllowed: true,
      });
    }),
    groq: makeMockAdapter('groq', async () => ({
      content: 'Groq ok after Gemini 401',
      model: 'llama-3.3-70b-versatile',
      inputTokens: 5,
      outputTokens: 5,
      totalTokens: 10,
      usageEstimated: false,
    })),
  });

  const res = await AIGateway.generate({
    messages: [{ role: 'user', content: 'Test 401 fallback' }],
  });
  assert.equal(res.provider, 'groq');
  const health = ProviderHealthManager.getRuntimeHealth('gemini');
  assert.equal(health.status, 'auth_error');
});

test('7. 429 rate-limit marks rate_limited and falls back', async () => {
  AIGateway.setAdapterOverridesForTests({
    gemini: makeMockAdapter('gemini', async () => {
      throw new ProviderNormalizedError({
        provider: 'gemini',
        kind: 'rate_limit',
        statusCode: 429,
        message: 'Quota exceeded 429',
        retryableSameProvider: false,
        fallbackAllowed: true,
      });
    }),
    groq: makeMockAdapter('groq', async () => ({
      content: 'Groq ok after Gemini 429',
      model: 'llama-3.3-70b-versatile',
      inputTokens: 5,
      outputTokens: 5,
      totalTokens: 10,
      usageEstimated: false,
    })),
  });

  const res = await AIGateway.generate({
    messages: [{ role: 'user', content: 'Test 429 fallback' }],
  });
  assert.equal(res.provider, 'groq');
  const health = ProviderHealthManager.getRuntimeHealth('gemini');
  assert.equal(health.status, 'rate_limited');
});

test('8. Full fallback chain Gemini -> Groq -> OpenRouter -> Cloudflare', async () => {
  const order = [];
  const failUpstream = (provider) =>
    makeMockAdapter(provider, async () => {
      order.push(provider);
      throw new ProviderNormalizedError({
        provider,
        kind: 'upstream_error',
        statusCode: 503,
        message: `${provider} down`,
        retryableSameProvider: false,
        fallbackAllowed: true,
      });
    });

  AIGateway.setAdapterOverridesForTests({
    gemini: failUpstream('gemini'),
    groq: failUpstream('groq'),
    openrouter: failUpstream('openrouter'),
    cloudflare: makeMockAdapter('cloudflare', async () => {
      order.push('cloudflare');
      return {
        content: 'Cloudflare final fallback',
        model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        inputTokens: 8,
        outputTokens: 6,
        totalTokens: 14,
        usageEstimated: true,
      };
    }),
  });

  const res = await AIGateway.generate({
    messages: [{ role: 'user', content: 'Test full chain' }],
  });
  assert.deepEqual(order, ['gemini', 'groq', 'openrouter', 'cloudflare']);
  assert.equal(res.provider, 'cloudflare');
});

test('9. No fallback on 400 bad request', async () => {
  const called = [];
  AIGateway.setAdapterOverridesForTests({
    gemini: makeMockAdapter('gemini', async () => {
      called.push('gemini');
      throw new ProviderNormalizedError({
        provider: 'gemini',
        kind: 'bad_request',
        statusCode: 400,
        message: 'Malformed payload',
        retryableSameProvider: false,
        fallbackAllowed: false,
      });
    }),
    groq: makeMockAdapter('groq', async () => {
      called.push('groq');
      return {
        content: 'Should not reach Groq',
        model: 'llama-3.3-70b-versatile',
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
        usageEstimated: false,
      };
    }),
  });

  await assert.rejects(
    () => AIGateway.generate({ messages: [{ role: 'user', content: 'Bad request' }] }),
    (err) => err && err.status === 400 && err.message.includes('Malformed payload')
  );
  assert.deepEqual(called, ['gemini']);
});

test('10. All providers unavailable returns friendly 503 error without fabricated answer', async () => {
  const failAll = (provider) =>
    makeMockAdapter(provider, async () => {
      throw new ProviderNormalizedError({
        provider,
        kind: 'upstream_error',
        statusCode: 503,
        message: `${provider} unavailable`,
        retryableSameProvider: false,
        fallbackAllowed: true,
      });
    });

  AIGateway.setAdapterOverridesForTests({
    gemini: failAll('gemini'),
    groq: failAll('groq'),
    openrouter: failAll('openrouter'),
    cloudflare: failAll('cloudflare'),
  });

  await assert.rejects(
    () => AIGateway.generate({ messages: [{ role: 'user', content: 'Hello' }] }),
    (err) =>
      err instanceof TemporaryAIUnavailableError &&
      err.status === 503 &&
      err.message.toLowerCase().includes('temporarily unavailable')
  );
});

test('11. Streaming SSE works via AIGateway.stream and /api/demo/chat/stream', async () => {
  AIGateway.setAdapterOverridesForTests({
    gemini: makeMockAdapter(
      'gemini',
      async () => ({ content: 'unused', model: 'gemini-2.5-flash', inputTokens: 1, outputTokens: 1, totalTokens: 2, usageEstimated: true }),
      async function* () {
        yield 'Hello ';
        yield 'stream!';
        return {
          content: 'Hello stream!',
          model: 'gemini-2.5-flash',
          inputTokens: 2,
          outputTokens: 2,
          totalTokens: 4,
          usageEstimated: true,
        };
      }
    ),
  });

  const res = await apiFetch('/api/demo/chat/stream', {
    method: 'POST',
    body: JSON.stringify({ message: 'Say hello stream' }),
  });
  assert.equal(res.status, 200);
  assert.ok(res.text.includes('data: {"content":"Hello "}'));
  assert.ok(res.text.includes('data: {"content":"stream!"}'));
  assert.ok(res.text.includes('data: [DONE]'));
});

test('12. POST /api/chat requires authentication (401 without token)', async () => {
  const res = await apiFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message: 'Unauthenticated call' }),
  });
  assert.equal(res.status, 401);
});

test('13. Authenticated user gets AI response automatically without supplying keys', async () => {
  AIGateway.setAdapterOverridesForTests({
    gemini: makeMockAdapter('gemini', async () => ({
      content: 'Automatic centralized AI answer',
      model: 'gemini-2.5-flash',
      inputTokens: 10,
      outputTokens: 10,
      totalTokens: 20,
      usageEstimated: false,
    })),
  });

  const res = await apiFetch(
    '/api/chat',
    {
      method: 'POST',
      body: JSON.stringify({ message: 'Explain closures' }),
    },
    normalToken
  );
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.content, 'Automatic centralized AI answer');
  assert.equal(res.body.data.provider, 'gemini');
});

test('14. User-supplied userKeys are ignored; central credentials are always used', async () => {
  let seenApiKey = null;
  AIGateway.setAdapterOverridesForTests({
    gemini: makeMockAdapter('gemini', async (params) => {
      seenApiKey = params.apiKey;
      return {
        content: 'Used central key',
        model: 'gemini-2.5-flash',
        inputTokens: 5,
        outputTokens: 5,
        totalTokens: 10,
        usageEstimated: false,
      };
    }),
  });

  const res = await apiFetch(
    '/api/chat',
    {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello',
        userKeys: { gemini: 'AIzaSyFakeClientInjectedKey1234567890' },
      }),
    },
    normalToken
  );
  assert.equal(res.status, 200);
  assert.equal(seenApiKey, process.env.GEMINI_API_KEY);
  assert.notEqual(seenApiKey, 'AIzaSyFakeClientInjectedKey1234567890');
});

test('15. Per-user daily/monthly fair-use limits enforce 429 QuotaExceededError', async () => {
  const prevLimit = process.env.AI_USER_DAILY_REQUEST_LIMIT;
  process.env.AI_USER_DAILY_REQUEST_LIMIT = '10';
  try {
    await prisma.usageLog.createMany({
      data: Array.from({ length: 10 }, () => ({
        userId: normalUserId,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        requestType: 'chat',
        latencyMs: 10,
        inputTokens: 5,
        outputTokens: 5,
        totalTokens: 10,
        status: 'success',
      })),
    });
    await assert.rejects(
      () => AIQuotaService.enforceUserFairUse(normalUserId),
      (err) => err instanceof QuotaExceededError && err.status === 429
    );
  } finally {
    if (prevLimit === undefined) delete process.env.AI_USER_DAILY_REQUEST_LIMIT;
    else process.env.AI_USER_DAILY_REQUEST_LIMIT = prevLimit;
  }
});

test('16. Admin AI provider endpoints reject normal users with 403 and allow ADMIN', async () => {
  const userRes = await apiFetch('/api/admin/ai-providers', { method: 'GET' }, normalToken);
  assert.equal(userRes.status, 403);

  const adminRes = await apiFetch('/api/admin/ai-providers', { method: 'GET' }, adminToken);
  assert.equal(adminRes.status, 200);
  assert.equal(adminRes.body.success, true);
  assert.ok(Array.isArray(adminRes.body.data.providers));
  assert.equal(adminRes.body.data.providers.length, 4);
});

test('17. Admin endpoint masks credentials and supports PATCH priority/enable toggle', async () => {
  const adminRes = await apiFetch('/api/admin/ai-providers', { method: 'GET' }, adminToken);
  assert.equal(adminRes.status, 200);
  // Raw secret values must never appear in response
  assert.equal(adminRes.text.includes(process.env.GEMINI_API_KEY), false);
  assert.equal(adminRes.text.includes(process.env.GROQ_API_KEY), false);
  assert.equal(adminRes.text.includes(process.env.OPENROUTER_API_KEY), false);
  assert.equal(adminRes.text.includes(process.env.CLOUDFLARE_API_TOKEN), false);

  const geminiRow = adminRes.body.data.providers.find((p) => p.provider === 'gemini');
  assert.equal(geminiRow.credentialStatus, 'Configured');

  const patchRes = await apiFetch(
    '/api/admin/ai-providers/groq',
    {
      method: 'PATCH',
      body: JSON.stringify({ priority: 2 }),
    },
    adminToken
  );
  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.body.data.priority, 2);
});

test('18. Secret redaction strips provider keys and bearer tokens from errors/logs', () => {
  const raw =
    'Request failed with key=AIzaSySecretKey12345678901234567890 and Authorization: Bearer gsk_supersecret1234567890 and sk-or-v1-secret9876543210';
  const redacted = redactSecrets(raw);
  assert.equal(redacted.includes('AIzaSySecretKey'), false);
  assert.equal(redacted.includes('gsk_supersecret'), false);
  assert.equal(redacted.includes('sk-or-v1-secret'), false);
  assert.ok(redacted.includes('[REDACTED'));
});
