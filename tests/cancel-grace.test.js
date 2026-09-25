'use strict';

/**
 * FR-010: grace-window enforcement is atomic — time and status checked in the
 * same write. Two concurrent cancels produce exactly one success + one clean
 * rejection; no partial state either way.
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
  fx = await env.createRestaurantFixture(ownerCookie, { name: 'Grace Grill', slug: 'grace-grill' });
});

after(async () => {
  if (env) await env.close();
});

async function placeOrder(phone) {
  const res = await env.req('/api/restaurants/' + fx.slug + '/orders', {
    method: 'POST',
    body: {
      customerName: 'Grace Customer',
      customerWhatsapp: phone,
      orderType: 'pickup',
      items: [{ itemId: fx.itemId, quantity: 1 }],
    },
  });
  assert.strictEqual(res.status, 201);
  return res.data.order.code;
}

test('two concurrent cancels → one success, one clean rejection', async () => {
  const code = await placeOrder('15550004001');
  const results = await Promise.all([
    env.req('/api/orders/cancel', { method: 'POST', body: { code } }),
    env.req('/api/orders/cancel', { method: 'POST', body: { code } }),
  ]);
  const ok = results.filter((r) => r.status === 200);
  const no = results.filter((r) => r.status === 409);
  assert.strictEqual(ok.length, 1, 'exactly one cancel wins');
  assert.strictEqual(no.length, 1, 'loser gets clean 409');
  const st = await env.query('SELECT status FROM orders WHERE code = $1', [code]);
  assert.strictEqual(st.rows[0].status, 'cancelled', 'deterministic final state');
});
