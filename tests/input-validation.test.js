'use strict';

/**
 * FR-011: hostile input rejected server-side with safe messages; database
 * stays clean. Frontend validation is never the only defense.
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
  fx = await env.createRestaurantFixture(ownerCookie, { name: 'Hostile House', slug: 'hostile-house' });
});

after(async () => {
  if (env) await env.close();
});

function orderBody(overrides = {}) {
  return {
    customerName: 'Hostile Customer',
    customerWhatsapp: '15550005555',
    orderType: 'pickup',
    items: [{ itemId: fx.itemId, quantity: 1 }],
    ...overrides,
  };
}

test('forged totals ignored: server prices win', async () => {
  const res = await env.req('/api/restaurants/' + fx.slug + '/orders', {
    method: 'POST',
    body: orderBody({ totalCents: 1, subtotalCents: 1, priceCents: 1 }),
  });
  assert.strictEqual(res.status, 201, 'order accepted, got ' + res.status);
  assert.strictEqual(res.data.order.totalCents, 850, 'DB price wins over forged totals');
});

test('bad quantities, empty cart, oversized carts rejected', async () => {
  for (const items of [
    [],
    [{ itemId: fx.itemId, quantity: 0 }],
    [{ itemId: fx.itemId, quantity: 100 }],
  ]) {
    const res = await env.req('/api/restaurants/' + fx.slug + '/orders', {
      method: 'POST',
      body: orderBody({ items }),
    });
    assert.strictEqual(res.status, 400, JSON.stringify(items) + ' got ' + res.status);
  }
  const many = Array.from({ length: 51 }, () => ({ itemId: fx.itemId, quantity: 1 }));
  const res = await env.req('/api/restaurants/' + fx.slug + '/orders', {
    method: 'POST',
    body: orderBody({ items: many }),
  });
  assert.strictEqual(res.status, 400, 'got ' + res.status);
});

test('malformed itemIds and unknown fields handled safely', async () => {
  const bad = await env.req('/api/restaurants/' + fx.slug + '/orders', {
    method: 'POST',
    body: orderBody({ items: [{ itemId: 'not-a-uuid', quantity: 1 }] }),
  });
  assert.strictEqual(bad.status, 400, 'got ' + bad.status);

  const sneaky = await env.req('/api/restaurants/' + fx.slug + '/orders', {
    method: 'POST',
    body: orderBody({ role: 'owner', is_admin: true, total_cents: 1 }),
  });
  assert.strictEqual(sneaky.status, 201, 'unknown fields ignored, got ' + sneaky.status);
  assert.strictEqual(sneaky.data.order.totalCents, 850);
});

test('oversized notes rejected; oversized body rejected', async () => {
  const notes = await env.req('/api/restaurants/' + fx.slug + '/orders', {
    method: 'POST',
    body: orderBody({ notes: 'x'.repeat(500) }),
  });
  assert.strictEqual(notes.status, 400, 'got ' + notes.status);

  const big = await env.req('/api/restaurants/' + fx.slug + '/orders', {
    method: 'POST',
    body: orderBody({ notes: 'x'.repeat(70000) }),
  });
  assert.ok(big.status === 400 || big.status === 413, 'got ' + big.status);
});

test('non-image upload rejected by content sniffing', async () => {
  const fd = new FormData();
  fd.append('image', new Blob(['not an image'], { type: 'image/png' }), 'x.png');
  const res = await env.req('/api/admin/images?type=items&itemId=' + fx.itemId, {
    method: 'POST',
    cookie: fx.adminCookie,
    body: fd,
  });
  assert.strictEqual(res.status, 400, 'got ' + res.status);
});
