const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');

// Load compiled app from dist/app
const appModule = require(path.resolve(__dirname, '../dist/app.js'));
const app = appModule.default || appModule;
const { ActivityService } = require(path.resolve(__dirname, '../dist/modules/profile/services/activity.service.js'));

let server;
let baseUrl;
let tokenA;
let tokenB;
let userAId;
let userBId;

const stamp = Date.now();
const emailA = `profile-test-a-${stamp}@example.com`;
const emailB = `profile-test-b-${stamp}@example.com`;
const initialPass = 'TestPass123!';
const updatedPass = 'NewStrongPass456!';

async function apiReq(urlPath, { method = 'GET', token, body, headers = {} } = {}) {
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json, headers: res.headers };
}

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;

  const regA = await apiReq('/api/auth/register', {
    method: 'POST',
    body: { name: 'Profile Test A', email: emailA, password: initialPass },
  });
  assert.equal(regA.status, 201);
  tokenA = regA.json.data.accessToken;
  userAId = regA.json.data.user.id;

  const regB = await apiReq('/api/auth/register', {
    method: 'POST',
    body: { name: 'Profile Test B', email: emailB, password: initialPass },
  });
  assert.equal(regB.status, 201);
  tokenB = regB.json.data.accessToken;
  userBId = regB.json.data.user.id;
});

test.after(async () => {
  // Clean up both test users via authenticated delete endpoint
  if (tokenA) {
    await apiReq('/api/profile/account', {
      method: 'DELETE',
      token: tokenA,
      body: { currentPassword: updatedPass },
    }).catch(() => {});
    await apiReq('/api/profile/account', {
      method: 'DELETE',
      token: tokenA,
      body: { currentPassword: initialPass },
    }).catch(() => {});
  }
  if (tokenB) {
    await apiReq('/api/profile/account', {
      method: 'DELETE',
      token: tokenB,
      body: { currentPassword: initialPass },
    }).catch(() => {});
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('1. Unauthenticated access to /api/profile is rejected', async () => {
  const res = await apiReq('/api/profile');
  assert.equal(res.status, 401);
});

test('2. GET /api/profile returns safe user profile & real stats (no passwordHash)', async () => {
  const res = await apiReq('/api/profile', { token: tokenA });
  assert.equal(res.status, 200);
  assert.equal(res.json.success, true);
  assert.equal(res.json.data.user.email, emailA);
  assert.equal(res.json.data.user.passwordHash, undefined);
  assert.equal(typeof res.json.data.stats.totalConversations, 'number');
  assert.equal(res.json.data.stats.totalActivities, 0);
});

test('3. PATCH /api/profile updates profile fields and enforces unique username', async () => {
  const usernameA = `user_a_${stamp}`;
  const upd = await apiReq('/api/profile', {
    method: 'PATCH',
    token: tokenA,
    body: {
      name: 'Updated Developer A',
      username: usernameA,
      developerRole: 'Staff Software Engineer',
      bio: 'Building distributed systems',
      location: 'Bengaluru, IN',
      websiteUrl: 'https://example.dev',
      githubUrl: 'https://github.com/example',
      linkedinUrl: 'https://linkedin.com/in/example',
    },
  });
  assert.equal(upd.status, 200);
  assert.equal(upd.json.data.user.name, 'Updated Developer A');
  assert.equal(upd.json.data.user.username, usernameA);
  assert.equal(upd.json.data.user.developerRole, 'Staff Software Engineer');

  // User B cannot claim User A's username
  const dup = await apiReq('/api/profile', {
    method: 'PATCH',
    token: tokenB,
    body: { name: 'Profile Test B', username: usernameA },
  });
  assert.equal(dup.status, 409);
});

test('4. Avatar upload, serving, invalid file rejection, and removal', async () => {
  // Valid 1x1 PNG
  const pngBytes = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
    'hex'
  );
  const form = new FormData();
  form.append('avatar', new Blob([pngBytes], { type: 'image/png' }), 'avatar.png');

  const up = await apiReq('/api/profile/avatar', {
    method: 'POST',
    token: tokenA,
    body: form,
  });
  assert.equal(up.status, 200);
  const avatarUrl = up.json.data.user.avatarUrl;
  assert.ok(avatarUrl.startsWith('/api/profile/avatar/'));

  // Serve avatar
  const serveRes = await fetch(`${baseUrl}${avatarUrl}`);
  assert.equal(serveRes.status, 200);

  // Reject invalid file
  const badForm = new FormData();
  badForm.append('avatar', new Blob([Buffer.from('not an image')], { type: 'text/plain' }), 'bad.txt');
  const badRes = await apiReq('/api/profile/avatar', {
    method: 'POST',
    token: tokenA,
    body: badForm,
  });
  assert.equal(badRes.status, 400);

  // Remove avatar
  const del = await apiReq('/api/profile/avatar', {
    method: 'DELETE',
    token: tokenA,
  });
  assert.equal(del.status, 200);
  assert.equal(del.json.data.user.avatarUrl, null);
});

test('5. Skills & Preferences persistence', async () => {
  const skillsRes = await apiReq('/api/profile/skills', {
    method: 'PUT',
    token: tokenA,
    body: {
      skills: [
        { id: 's1', name: 'TypeScript', category: 'Language', level: 'Expert' },
        { id: 's2', name: 'Next.js', category: 'Framework', level: 'Advanced' },
      ],
    },
  });
  assert.equal(skillsRes.status, 200);
  assert.equal(skillsRes.json.data.user.skills.length, 2);

  const prefRes = await apiReq('/api/profile/preferences', {
    method: 'PUT',
    token: tokenA,
    body: {
      theme: 'dark',
      accentColor: 'emerald',
      density: 'compact',
      reducedMotion: true,
    },
  });
  assert.equal(prefRes.status, 200);
  assert.deepEqual(prefRes.json.data.user.preferences, {
    theme: 'dark',
    accentColor: 'emerald',
    density: 'compact',
    reducedMotion: true,
  });
});

test('6. Activity heatmap & user isolation', async () => {
  await ActivityService.recordUserActivity(userAId, 'ai_chat', { mode: 'chat' });
  await ActivityService.recordUserActivity(userAId, 'debug_session', { mode: 'debug' });

  const actA = await apiReq('/api/profile/activity?days=365', { token: tokenA });
  assert.equal(actA.status, 200);
  assert.equal(actA.json.data.days.length, 365);
  assert.equal(actA.json.data.summary.totalActivities, 2);
  assert.equal(actA.json.data.summary.totalActiveDays, 1);
  assert.equal(actA.json.data.summary.currentStreak, 1);
  assert.equal(actA.json.data.summary.longestStreak, 1);
  assert.equal(actA.json.data.recentTimeline.length, 2);

  // User B must still see 0 activities (strict isolation)
  const actB = await apiReq('/api/profile/activity?days=365', { token: tokenB });
  assert.equal(actB.status, 200);
  assert.equal(actB.json.data.summary.totalActivities, 0);
  assert.equal(actB.json.data.recentTimeline.length, 0);
});

test('7. Change password validates current password and updates hash', async () => {
  const bad = await apiReq('/api/auth/change-password', {
    method: 'POST',
    token: tokenA,
    body: { currentPassword: 'WrongPassword!', newPassword: updatedPass },
  });
  assert.equal(bad.status, 400);

  const ok = await apiReq('/api/auth/change-password', {
    method: 'POST',
    token: tokenA,
    body: { currentPassword: initialPass, newPassword: updatedPass },
  });
  assert.equal(ok.status, 200);

  // Login with new password
  const loginRes = await apiReq('/api/auth/login', {
    method: 'POST',
    body: { email: emailA, password: updatedPass },
  });
  assert.equal(loginRes.status, 200);
  tokenA = loginRes.json.data.accessToken;
});
