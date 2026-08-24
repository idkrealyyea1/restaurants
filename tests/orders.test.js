'use strict';

/** Checkout pricing, restaurant-status enforcement, hours, tracking, transitions. */

process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || '';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { startApp } = require('./helpers');

let env;
let ownerCookie;
let fx; // fixture

before(async () => {
  env = await startApp({ orderRateMax: 1000 });
  await env.createPlatformOwner('root', 'owner-password-123');
  ownerCookie = await env.login('root', 'owner-password-123');
  fx = await env.createRestaurantFixture(ownerCookie, { name: 'Order Barn', slug: 'order-barn' });
});

after(async () => {
  if (env) await env.close();
});

async function checkout(over = {}) {
  return env.req('/api/restaurants/' + fx.slug + '/orders', {
    method: 'POST',
    body: Object.assign({
      customerName: 'Test Customer',
      customerWhatsapp: '15557654321',
      orderType: 'pickup',
      items: [{ itemId: fx.itemId, quantity: 2 }],
    }, over),
  });
}

test('public menu endpoint exposes storefront data without secrets', async () => {
  const res = await env.req('/api/restaurants/' + fx.slug + '/menu');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.name, 'Order Barn');
  assert.ok(Array.isArray(res.data.items) && res.data.items.length === 1);
  assert.ok(!('maxMenuItems' in res.data));
});

test('pickup order is priced server-side (frontend totals ignored)', async () => {
  const res = await checkout({
    items: [{ itemId: fx.itemId, quantity: 2, priceCents: 1, totalCents: 2 }], // tampering attempt
  });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.data.order.subtotalCents, 1700); // 2 × 850 from DB
  assert.strictEqual(res.data.order.totalCents, 1700);

  const row = await env.query(
    'SELECT unit_price_cents FROM order_items WHERE order_id = (SELECT id FROM orders WHERE code=$1)',
    [res.data.order.code]
  );
  assert.strictEqual(row.rows[0].unit_price_cents, 850);
});

test('delivery adds the configured delivery fee', async () => {
  // set fee via settings API
  const patch = await env.req('/api/admin/settings', {
    method: 'PATCH', cookie: fx.adminCookie, body: { deliveryFeeCents: 300 },
  });
  assert.strictEqual(patch.status, 200);

  const res = await checkout({
    orderType: 'delivery',
    customerAddress: '123 Test Street, Springfield',
  });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.data.order.deliveryFeeCents, 300);
  assert.strictEqual(res.data.order.totalCents, 2000);
});

test('delivery without address is rejected; bad phone rejected; empty cart rejected', async () => {
  assert.strictEqual((await checkout({ orderType: 'delivery' })).status, 400);
  assert.strictEqual((await checkout({ customerWhatsapp: 'abc12' })).status, 400);
  assert.strictEqual((await checkout({ items: [] })).status, 400);
});

test('unavailable or unknown items are rejected with server error', async () => {
  await env.req('/api/admin/items/' + fx.itemId, {
    method: 'PATCH', cookie: fx.adminCookie, body: { isAvailable: false },
  });
  const res = await checkout();
  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.data.error.code, 'ITEMS_UNAVAILABLE');

  await env.req('/api/admin/items/' + fx.itemId, {
    method: 'PATCH', cookie: fx.adminCookie, body: { isAvailable: true },
  });

  const ghost = await checkout({ items: [{ itemId: '11111111-1111-4111-8111-111111111111', quantity: 1 }] });
  assert.strictEqual(ghost.status, 409);
});

test('closing the restaurant blocks new orders but keeps the menu visible', async () => {
  const closeRes = await env.req('/api/admin/status', {
    method: 'PATCH', cookie: fx.adminCookie, body: { status: 'closed' },
  });
  assert.strictEqual(closeRes.status, 200);

  const menu = await env.req('/api/restaurants/' + fx.slug + '/menu');
  assert.strictEqual(menu.status, 200, 'menu still browsable');
  assert.strictEqual(menu.data.openNow, false);

  const blocked = await checkout();
  assert.strictEqual(blocked.status, 409);
  assert.strictEqual(blocked.data.error.code, 'RESTAURANT_CLOSED');

  await env.req('/api/admin/status', { method: 'PATCH', cookie: fx.adminCookie, body: { status: 'open' } });
  assert.strictEqual((await checkout()).status, 201);
});

test('outside opening hours orders are rejected (server-side clock, UTC)', async () => {
  // Close every day of the week → always outside hours.
  await env.query(`UPDATE restaurant_hours SET is_closed = TRUE WHERE restaurant_id = $1`, [fx.restaurantId]);

  const blocked = await checkout();
  assert.strictEqual(blocked.status, 409);
  assert.strictEqual(blocked.data.error.code, 'OUTSIDE_OPENING_HOURS');

  const menu = await env.req('/api/restaurants/' + fx.slug + '/menu');
  assert.strictEqual(menu.data.openNow, false);

  // ignore_opening_hours overrides.
  await env.req('/api/admin/settings', {
    method: 'PATCH', cookie: fx.adminCookie, body: { ignoreOpeningHours: true },
  });
  const ok = await checkout();
  assert.strictEqual(ok.status, 201);

  // Restore 24/7 open hours for remaining tests.
  await env.req('/api/admin/settings', {
    method: 'PATCH', cookie: fx.adminCookie, body: { ignoreOpeningHours: false },
  });
  await env.query(`UPDATE restaurant_hours SET is_closed = FALSE, opens_at='00:00', closes_at='23:59' WHERE restaurant_id = $1`, [fx.restaurantId]);
});

test('order status transitions follow the workflow rules', async () => {
  const order = await checkout();
  const idRow = await env.query('SELECT id FROM orders WHERE code = $1', [order.data.order.code]);
  const orderId = idRow.rows[0].id;

  const setStatus = (status) =>
    env.req(`/api/admin/orders/${orderId}/status`, { method: 'PATCH', cookie: fx.adminCookie, body: { status } });

  assert.strictEqual((await setStatus('preparing')).status, 200);
  assert.strictEqual((await setStatus('ready')).status, 200);
  // pickup order cannot go "out for delivery"
  assert.strictEqual((await setStatus('out_for_delivery')).status, 400);
  assert.strictEqual((await setStatus('confirmed')).status, 409, 'no backwards transition');
  assert.strictEqual((await setStatus('completed')).status, 200);
  assert.strictEqual((await setStatus('cancelled')).status, 409, 'terminal status locked');
});

test('tracking works by code and prices survive later menu changes', async () => {
  const before = await checkout();
  const code = before.data.order.code;

  // Admin raises the price afterwards.
  await env.req('/api/admin/items/' + fx.itemId, {
    method: 'PATCH', cookie: fx.adminCookie, body: { priceCents: 9999 },
  });

  const tracked = await env.req('/api/orders/track/' + code);
  assert.strictEqual(tracked.status, 200);
  assert.strictEqual(tracked.data.order.total_cents, 1700, 'original price preserved');
  assert.strictEqual(tracked.data.order.restaurant_slug, fx.slug);
  assert.ok(!('customer_whatsapp' in tracked.data.order), 'no PII leak on public tracking');

  assert.strictEqual((await env.req('/api/orders/track/ZZZZZZZZ')).status, 404);
  assert.strictEqual((await env.req('/api/orders/track/<script>alert(1)</script>')).status, 404);
});
