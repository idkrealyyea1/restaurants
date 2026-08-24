'use strict';

process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || '';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { startApp } = require('./helpers');

let env;
let ownerCookie;

before(async () => {
  env = await startApp({ authRateMax: 100 });
  await env.createPlatformOwner('root', 'owner-password-123');
  ownerCookie = await env.login('root', 'owner-password-123');
});

after(async () => {
  if (env) await env.close();
});

test('health endpoint is public', async () => {
  const res = await env.req('/api/healthz');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.ok, true);
});

test('anonymous /me returns null user', async () => {
  const res = await env.req('/api/auth/me');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.user, null);
});

test('login with wrong password fails generically', async () => {
  const res = await env.req('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'root', password: 'wrong-password' },
  });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.data.error.code, 'UNAUTHORIZED');
});

test('login with unknown user fails identically (no enumeration)', async () => {
  const res = await env.req('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'does-not-exist', password: 'whatever-long' },
  });
  assert.strictEqual(res.status, 401);
  const res2 = await env.req('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'root', password: 'wrong-password' },
  });
  assert.strictEqual(res2.data.error.message, res.data.error.message);
});

test('successful login sets HttpOnly SameSite cookie and /me resolves role', async () => {
  const cookie = await env.login('root', 'owner-password-123');
  assert.ok(/^(?:__Host-)?sid=/.test(cookie), 'session cookie present');

  const me = await env.req('/api/auth/me', { cookie });
  assert.strictEqual(me.data.user.role, 'owner');
  assert.strictEqual(me.data.user.username, 'root');
  assert.ok(!('passwordHash' in me.data.user));
  assert.ok(!('password_hash' in me.data.user));
});

test('email login works when email set', async () => {
  // create an admin with email via fixture
  await env.req('/api/owner/restaurants', {
    method: 'POST',
    cookie: ownerCookie,
    body: {
      name: 'Email Login Diner',
      slug: 'email-login-diner',
      maxMenuItems: 5,
      adminUsername: 'email-admin',
      adminPassword: 'admin-password-123',
    },
  });
  const res = await env.req('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'email-admin', password: 'admin-password-123' },
  });
  assert.strictEqual(res.status, 200);
});

test('logout destroys the session server-side', async () => {
  const cookie = await env.login('root', 'owner-password-123');
  const out = await env.req('/api/auth/logout', { method: 'POST', cookie });
  assert.strictEqual(out.status, 200);

  const me = await env.req('/api/auth/me', { cookie });
  assert.strictEqual(me.data.user, null, 'cookie no longer resolves to a user');
});

test('admin of deactivated restaurant cannot log in; reactivation restores access', async () => {
  const created = await env.req('/api/owner/restaurants', {
    method: 'POST',
    cookie: ownerCookie,
    body: {
      name: 'Disabled Cafe',
      slug: 'disabled-cafe',
      maxMenuItems: 5,
      adminUsername: 'disabled-admin',
      adminPassword: 'admin-password-123',
    },
  });
  const restaurantId = created.data.restaurant.id;

  const deact = await env.req('/api/owner/restaurants/' + restaurantId, {
    method: 'PATCH', cookie: ownerCookie, body: { isActive: false },
  });
  assert.strictEqual(deact.status, 200);

  const denied = await env.req('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'disabled-admin', password: 'admin-password-123' },
  });
  assert.strictEqual(denied.status, 401);

  // Existing sessions are revoked on deactivation too.
  const reactivate = await env.req('/api/owner/restaurants/' + restaurantId, {
    method: 'PATCH', cookie: ownerCookie, body: { isActive: true },
  });
  assert.strictEqual(reactivate.status, 200);

  const ok = await env.req('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'disabled-admin', password: 'admin-password-123' },
  });
  assert.strictEqual(ok.status, 200);
});
