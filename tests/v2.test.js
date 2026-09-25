'use strict';

/** V2 feature coverage: analytics depth, CSV reports, cancel window, reorder, delivery flow. */

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
  fx = await env.createRestaurantFixture(ownerCookie, { name: 'V2 Barn', slug: 'v2-barn' });
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
      orderType: 'delivery',
      customerAddress: '123 Test Street',
      items: [{ itemId: fx.itemId, quantity: 1 }],
    }, over),
  });
}

async function orderToStatus(code, status) {
  const row = await env.query('SELECT id FROM orders WHERE code = $1', [code]);
  await env.req(`/api/admin/orders/${row.rows[0].id}/status`, {
    method: 'PATCH', cookie: fx.adminCookie, body: { status },
  });
}

/* ----------------------------- analytics ----------------------------- */

test('admin analytics returns AOV + day-of-week + hour breakdowns', async () => {
  const order = await checkout();
  for (const s of ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed']) {
    await orderToStatus(order.data.order.code, s);
  }

  const res = await env.req('/api/admin/analytics?days=30', { cookie: fx.adminCookie });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.averageOrderValueCents, order.data.order.totalCents);
  assert.ok(Array.isArray(res.data.byHour) && res.data.byHour.length > 0);
  assert.ok(Array.isArray(res.data.byDayOfWeek));
  const revenue = res.data.byHour.reduce((s, r) => s + r.revenueCents, 0);
  assert.strictEqual(revenue, order.data.order.totalCents);
});

/* ---------------------------- CSV reports ---------------------------- */

test('orders CSV report downloads as CSV for download', async () => {
  const res = await env.req('/api/admin/reports/orders.csv', { cookie: fx.adminCookie, raw: true });
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /text\/csv/);
  const disp = res.headers.get('content-disposition') || '';
  assert.match(disp, /attachment/);
  assert.match(disp, /\.csv/);
});

/* ----------------------------- reorder ------------------------------- */

test('tracking exposes menu_item_id so reorder links can be built', async () => {
  const order = await checkout();
  const tracked = await env.req('/api/orders/track/' + order.data.order.code);
  assert.strictEqual(tracked.status, 200);
  assert.ok(Array.isArray(tracked.data.order.items));
  for (const it of tracked.data.order.items) {
    assert.ok(it.menu_item_id, 'tracking item carries menu_item_id for reorder');
  }
});

/* --------------------------- cancel window --------------------------- */

test('customer cancels a pending order within the grace window', async () => {
  const order = await checkout();
  assert.strictEqual(order.data.order.status, 'pending');

  const cancel = await env.req('/api/orders/cancel', {
    method: 'POST', body: { code: order.data.order.code },
  });
  assert.strictEqual(cancel.status, 200);
  assert.strictEqual(cancel.data.order.status, 'cancelled');
});

test('cancelling an already-prepared or unknown order is rejected', async () => {
  const order = await checkout();
  await orderToStatus(order.data.order.code, 'preparing');
  const late = await env.req('/api/orders/cancel', {
    method: 'POST', body: { code: order.data.order.code },
  });
  assert.strictEqual(late.status, 409);
  assert.strictEqual(late.data.error.code, 'CANCEL_NOT_ALLOWED');

  assert.strictEqual((await env.req('/api/orders/cancel', { method: 'POST', body: { code: 'NOPE99999' } })).status, 404);
});

/* --------------------------- delivery flow --------------------------- */

test('delivery accounts retired: provisioning and delivery API are gone (D4)', async () => {
  // Groups table stays for history; account provisioning is removed.
  const gA = await env.req('/api/owner/delivery-groups', {
    method: 'POST', cookie: ownerCookie, body: { name: 'Couriers A' },
  });
  assert.strictEqual(gA.status, 201);
  const aId = gA.data.group.id;

  const acct = await env.req('/api/owner/delivery-groups/' + aId + '/account', {
    method: 'POST', cookie: ownerCookie, body: { username: 'dlvA', password: 'delivery-pass-123' },
  });
  assert.strictEqual(acct.status, 404, 'account provisioning removed, got ' + acct.status);

  const api = await env.req('/api/delivery/orders', { cookie: ownerCookie });
  assert.strictEqual(api.status, 404, 'delivery API removed, got ' + api.status);
});

test('retired delivery credentials cannot log in or reach the API (D4)', async () => {
  const g = await env.req('/api/owner/delivery-groups', {
    method: 'POST', cookie: ownerCookie, body: { name: 'Couriers C' },
  });
  const gid = g.data.group.id;
  const acct = await env.req('/api/owner/delivery-groups/' + gid + '/account', {
    method: 'POST', cookie: ownerCookie, body: { username: 'dlvC', password: 'delivery-pass-123' },
  });
  assert.strictEqual(acct.status, 404, 'no accounts provisioned, got ' + acct.status);

  const login = await env.req('/api/auth/login', {
    method: 'POST', body: { identifier: 'dlvC', password: 'delivery-pass-123' },
  });
  assert.strictEqual(login.status, 401, 'unknown delivery login refused, got ' + login.status);
});
