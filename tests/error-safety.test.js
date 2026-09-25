'use strict';

/**
 * FR-012: 4xx/5xx responses contain no secrets, tokens, or stack traces —
 * only safe codes and messages.
 */

process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || '';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { startApp } = require('./helpers');

let env;
let fx;

before(async () => {
  env = await startApp({ orderRateMax: 1000 });
  await env.createPlatformOwner('root', 'owner-password-123');
  const ownerCookie = await env.login('root', 'owner-password-123');
  fx = await env.createRestaurantFixture(ownerCookie, { name: 'Leak Lab', slug: 'leak-lab' });
});

after(async () => {
  if (env) await env.close();
});

const FORBIDDEN = [/password/i, /secret/i, /token/i, /stack/i, /at\s+\S+\.js:\d+/, /Bearer /];

test('error responses leak nothing sensitive', async () => {
  const probes = [
    ['GET', '/api/admin/orders/nope'],
    ['GET', '/api/owner/restaurants/nope'],
    ['POST', '/api/auth/login'],
    ['GET', '/api/orders/track/NOPE123'],
    ['GET', '/api/no-such-route'],
  ];
  for (const [method, path] of probes) {
    const opts = { method };
    if (method === 'POST') opts.body = { identifier: 'nobody', password: 'wrong-password-1' };
    const res = await env.req(path, opts);
    assert.ok(res.status >= 400, path + ' got ' + res.status);
    const body = JSON.stringify(res.data);
    for (const re of FORBIDDEN) {
      assert.ok(!re.test(body), path + ' leaks via ' + re);
    }
  }
});

test('oversized and malformed bodies fail safely', async () => {
  const big = await env.req('/api/restaurants/' + fx.slug + '/orders', {
    method: 'POST',
    body: { customerName: 'x'.repeat(70000), customerWhatsapp: '1', orderType: 'pickup', items: [] },
  });
  assert.ok(big.status === 400 || big.status === 413, 'got ' + big.status);
  assert.ok(!/stack/i.test(JSON.stringify(big.data)), 'no stack trace');
});
