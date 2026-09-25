'use strict';

/**
 * FR-003b + FR-004: per-restaurant delivery toggle and subscription gating.
 * Toggle OFF → delivery submissions rejected, pickup unaffected.
 * Expired subscription → no new orders, dashboards readable, reactivation restores.
 */

process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || '';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { startApp } = require('./helpers');

let env;
let ownerCookie;
let fx;

before(async () => {
  env = await startApp({ orderRateMax: 1000 });
  await env.createPlatformOwner('root', 'owner-password-123');
  ownerCookie = await env.login('root', 'owner-password-123');
  fx = await env.createRestaurantFixture(ownerCookie, { name: 'Toggle Tavern', slug: 'toggle-tavern' });
});

after(async () => {
  if (env) await env.close();
});

function deliveryOrder() {
  return env.req('/api/restaurants/' + fx.slug + '/orders', {
    method: 'POST',
    body: {
      customerName: 'Toggle Customer',
      customerWhatsapp: '15550006666',
      orderType: 'delivery',
      customerAddress: '123 Toggle Street',
      items: [{ itemId: fx.itemId, quantity: 1 }],
    },
  });
}

function pickupOrder() {
  return env.req('/api/restaurants/' + fx.slug + '/orders', {
    method: 'POST',
    body: {
      customerName: 'Toggle Customer',
      customerWhatsapp: '15550006667',
      orderType: 'pickup',
      items: [{ itemId: fx.itemId, quantity: 1 }],
    },
  });
}

test('delivery toggle OFF rejects delivery, keeps pickup', async () => {
  const patch = await env.req('/api/admin/settings', {
    method: 'PATCH',
    cookie: fx.adminCookie,
    body: { deliveryEnabled: false },
  });
  assert.strictEqual(patch.status, 200, 'toggle saved, got ' + patch.status);

  const denied = await deliveryOrder();
  assert.strictEqual(denied.status, 409, 'delivery must 409, got ' + denied.status);

  const ok = await pickupOrder();
  assert.strictEqual(ok.status, 201, 'pickup works, got ' + ok.status);

  const back = await env.req('/api/admin/settings', {
    method: 'PATCH',
    cookie: fx.adminCookie,
    body: { deliveryEnabled: true },
  });
  assert.strictEqual(back.status, 200);
  const restored = await deliveryOrder();
  assert.strictEqual(restored.status, 201, 'delivery restored, got ' + restored.status);
});

test('expired subscription refuses orders, keeps reads, reactivates cleanly', async () => {
  // Owner update API has no subscription field (creation-only); expire via SQL setup.
  await env.query('UPDATE restaurants SET subscription_ends_at = now() - INTERVAL \'1 day\' WHERE id = $1', [
    fx.restaurantId,
  ]);

  const refused = await pickupOrder();
  assert.strictEqual(refused.status, 403, 'expired must 403, got ' + refused.status);

  const dash = await env.req('/api/admin/dashboard', { cookie: fx.adminCookie });
  assert.strictEqual(dash.status, 200, 'dashboard readable, got ' + dash.status);

  await env.query('UPDATE restaurants SET subscription_ends_at = now() + INTERVAL \'7 days\' WHERE id = $1', [
    fx.restaurantId,
  ]);
  const again = await pickupOrder();
  assert.strictEqual(again.status, 201, 'ordering restored, got ' + again.status);
});
