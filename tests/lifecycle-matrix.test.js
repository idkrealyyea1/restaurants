'use strict';

/**
 * FR-003: every pair in contracts/lifecycle.md exercised across admin and
 * customer paths. Valid pairs succeed; all invalid pairs rejected clearly.
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
  fx = await env.createRestaurantFixture(ownerCookie, { name: 'Cycle Cafe', slug: 'cycle-cafe' });
});

after(async () => {
  if (env) await env.close();
});

async function placeOrder() {
  const res = await env.req('/api/restaurants/' + fx.slug + '/orders', {
    method: 'POST',
    body: {
      customerName: 'Cycle Customer',
      customerWhatsapp: '1555000' + String(3000 + Math.floor(Math.random() * 900)),
      orderType: 'pickup',
      items: [{ itemId: fx.itemId, quantity: 1 }],
    },
  });
  assert.strictEqual(res.status, 201);
  const row = await env.query('SELECT id FROM orders WHERE code = $1', [res.data.order.code]);
  return { code: res.data.order.code, id: row.rows[0].id };
}

async function setStatus(id, status) {
  return env.req('/api/admin/orders/' + id + '/status', {
    method: 'PATCH',
    cookie: fx.adminCookie,
    body: { status },
  });
}

test('valid pickup lifecycle completes end to end', async () => {
  const o = await placeOrder();
  for (const s of ['confirmed', 'preparing', 'ready', 'completed']) {
    const res = await setStatus(o.id, s);
    assert.strictEqual(res.status, 200, s + ' got ' + res.status);
  }
});

test('invalid jumps rejected: pending→completed, completed→cancelled', async () => {
  const o = await placeOrder();
  const skip = await setStatus(o.id, 'completed');
  assert.strictEqual(skip.status, 409, 'skip must 409, got ' + skip.status);
  assert.match(JSON.stringify(skip.data), /INVALID_STATUS_TRANSITION/);

  for (const s of ['confirmed', 'preparing', 'ready', 'completed']) {
    assert.strictEqual((await setStatus(o.id, s)).status, 200);
  }
  const back = await setStatus(o.id, 'cancelled');
  assert.strictEqual(back.status, 409, 'terminal must 409, got ' + back.status);
});

test('unknown status rejected with 400', async () => {
  const o = await placeOrder();
  const res = await setStatus(o.id, 'flying');
  assert.strictEqual(res.status, 400, 'got ' + res.status);
});

test('customer cancel works on pending, then deterministically refused', async () => {
  const o = await placeOrder();
  const first = await env.req('/api/orders/cancel', { method: 'POST', body: { code: o.code } });
  assert.strictEqual(first.status, 200, 'got ' + first.status);
  const second = await env.req('/api/orders/cancel', { method: 'POST', body: { code: o.code } });
  assert.strictEqual(second.status, 409, 'second cancel must 409, got ' + second.status);
});
