'use strict';

/**
 * FR-008b (concern B, separate from the burst): the same customer's order sent
 * twice (double-click / retry) must persist exactly one order for that intent.
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
  fx = await env.createRestaurantFixture(ownerCookie, { name: 'Double Diner', slug: 'double-diner' });
});

after(async () => {
  if (env) await env.close();
});

test('same submission replayed twice persists a single order', async () => {
  const body = {
    customerName: 'Double Clicker',
    customerWhatsapp: '15550007777',
    orderType: 'pickup',
    submissionKey: '11111111-2222-4333-8444-555555555555',
    items: [{ itemId: fx.itemId, quantity: 2 }],
  };
  const first = await env.req('/api/restaurants/' + fx.slug + '/orders', { method: 'POST', body });
  assert.strictEqual(first.status, 201);
  const second = await env.req('/api/restaurants/' + fx.slug + '/orders', { method: 'POST', body });
  assert.strictEqual(second.status, 201, 'repeat is accepted (idempotent), got ' + second.status);

  const count = await env.query('SELECT COUNT(*)::int AS n FROM orders WHERE customer_whatsapp = $1', [
    '15550007777',
  ]);
  assert.strictEqual(count.rows[0].n, 1, 'exactly one persisted order for one intent');
  assert.strictEqual(
    second.data.order.code,
    first.data.order.code,
    'repeat references the original order'
  );
});
