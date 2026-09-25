'use strict';

/**
 * FR-008 (concern A): 50 simultaneous submissions from different customers.
 * Every success creates exactly one cent-correct order; legitimate rejections
 * create nothing and fail cleanly.
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
  fx = await env.createRestaurantFixture(ownerCookie, { name: 'Burst Diner', slug: 'burst-diner' });
});

after(async () => {
  if (env) await env.close();
});

function submitOrder(i) {
  return env.req('/api/restaurants/' + fx.slug + '/orders', {
    method: 'POST',
    body: {
      customerName: 'Customer ' + i,
      customerWhatsapp: '1555000' + String(1000 + i),
      orderType: 'pickup',
      items: [{ itemId: fx.itemId, quantity: 1 }],
    },
  });
}

test('50 simultaneous submissions: each success is exactly one correct order', async () => {
  const results = await Promise.all(Array.from({ length: 50 }, (_, i) => submitOrder(i)));
  const ok = results.filter((r) => r.status === 201);
  const failed = results.filter((r) => r.status !== 201);
  assert.strictEqual(failed.length, 0, 'unexpected rejections: ' + JSON.stringify(failed.slice(0, 3)));

  const codes = ok.map((r) => r.data.order.code);
  assert.strictEqual(new Set(codes).size, 50, 'codes must be unique');
  for (const r of ok) {
    assert.strictEqual(r.data.order.totalCents, 850, 'server-priced total');
  }
  const count = await env.query('SELECT COUNT(*)::int AS n FROM orders');
  assert.strictEqual(count.rows[0].n, 50, 'exactly 50 persisted orders');
});

test('unavailable item rejects cleanly with no partial order', async () => {
  const before = await env.query('SELECT COUNT(*)::int AS n FROM orders');
  const res = await env.req('/api/restaurants/' + fx.slug + '/orders', {
    method: 'POST',
    body: {
      customerName: 'Unlucky Customer',
      customerWhatsapp: '15550009999',
      orderType: 'pickup',
      items: [{ itemId: '00000000-0000-0000-0000-000000000000', quantity: 1 }],
    },
  });
  assert.ok(res.status === 409 || res.status === 400, 'got ' + res.status);
  const after = await env.query('SELECT COUNT(*)::int AS n FROM orders');
  assert.strictEqual(after.rows[0].n, before.rows[0].n, 'no partial order persisted');
});
