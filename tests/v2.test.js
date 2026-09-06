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
  await orderToStatus(order.data.order.code, 'completed');

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

test('owner creates a delivery group + account; delivery user sees only its orders', async () => {
  // Group A + account
  const gA = await env.req('/api/owner/delivery-groups', {
    method: 'POST', cookie: ownerCookie, body: { name: 'Couriers A' },
  });
  assert.strictEqual(gA.status, 201);
  const aId = gA.data.group.id;
  await env.req('/api/owner/delivery-groups/' + aId + '/account', {
    method: 'POST', cookie: ownerCookie, body: { username: 'dlvA', password: 'delivery-pass-123' },
  });

  // Group B + account
  const gB = await env.req('/api/owner/delivery-groups', {
    method: 'POST', cookie: ownerCookie, body: { name: 'Couriers B' },
  });
  const bId = gB.data.group.id;
  await env.req('/api/owner/delivery-groups/' + bId + '/account', {
    method: 'POST', cookie: ownerCookie, body: { username: 'dlvB', password: 'delivery-pass-123' },
  });

  // Restaurant selects group A only.
  const sel = await env.req('/api/admin/delivery-groups', {
    method: 'PUT', cookie: fx.adminCookie, body: { groups: [aId] },
  });
  assert.strictEqual(sel.status, 200);
  assert.strictEqual(sel.data.groups.filter((g) => g.selected).length, 1);

  // Place a delivery order at this restaurant.
  const order = await checkout();
  const orderCode = order.data.order.code;
  await orderToStatus(orderCode, 'ready');

  const dlvACookie = await env.login('dlvA', 'delivery-pass-123');
  const dlvBCookie = await env.login('dlvB', 'delivery-pass-123');

  // Group A (selected) sees the order.
  const listA = await env.req('/api/delivery/orders?page=1&limit=20', { cookie: dlvACookie });
  assert.strictEqual(listA.status, 200);
  const codesA = listA.data.orders.map((o) => o.code);
  assert.ok(codesA.includes(orderCode), 'group A sees the selected restaurant order');

  // Group B (not selected) must NOT see it (tenant isolation for delivery).
  const listB = await env.req('/api/delivery/orders', { cookie: dlvBCookie });
  const codesB = listB.data.orders.map((o) => o.code);
  assert.ok(!codesB.includes(orderCode), 'group B is isolated from the order');

  // Advance ready -> out_for_delivery -> completed as group A.
  const idRow = await env.query('SELECT id FROM orders WHERE code = $1', [orderCode]);
  const oid = idRow.rows[0].id;

  const out = await env.req('/api/delivery/orders/' + oid + '/status', {
    method: 'PATCH', cookie: dlvACookie, body: { status: 'out_for_delivery' },
  });
  assert.strictEqual(out.status, 200);
  assert.strictEqual(out.data.order.status, 'out_for_delivery');

  const done = await env.req('/api/delivery/orders/' + oid + '/status', {
    method: 'PATCH', cookie: dlvACookie, body: { status: 'completed' },
  });
  assert.strictEqual(done.status, 200);
  assert.strictEqual(done.data.order.status, 'completed');

  // Group A cannot act on an order outside its scope.
  const otherOrder = await checkout();
  await orderToStatus(otherOrder.data.order.code, 'ready');
  const otherRow = await env.query('SELECT id FROM orders WHERE code = $1', [otherOrder.data.order.code]);
  const otherId = otherRow.rows[0].id;

  // Remove group A selection; now group A must be denied.
  await env.req('/api/admin/delivery-groups', { method: 'PUT', cookie: fx.adminCookie, body: { groups: [] } });
  const denied = await env.req('/api/delivery/orders/' + otherId + '/status', {
    method: 'PATCH', cookie: dlvACookie, body: { status: 'out_for_delivery' },
  });
  assert.strictEqual(denied.status, 404);
});

test('delivery account of a disabled group cannot log in', async () => {
  const g = await env.req('/api/owner/delivery-groups', {
    method: 'POST', cookie: ownerCookie, body: { name: 'Couriers C' },
  });
  const gid = g.data.group.id;
  const acct = await env.req('/api/owner/delivery-groups/' + gid + '/account', {
    method: 'POST', cookie: ownerCookie, body: { username: 'dlvC', password: 'delivery-pass-123' },
  });
  const acctId = acct.data.account.id;

  // Disable the delivery user.
  await env.req('/api/owner/delivery-groups/' + gid + '/account', {
    method: 'PATCH', cookie: ownerCookie, body: { isActive: false },
  });
  const login = await env.req('/api/auth/login', { method: 'POST', body: { identifier: 'dlvC', password: 'delivery-pass-123' } });
  assert.strictEqual(login.status, 401);

  // Re-enable and login works.
  await env.req('/api/owner/delivery-groups/' + gid + '/account', {
    method: 'PATCH', cookie: ownerCookie, body: { isActive: true },
  });
  const back = await env.login('dlvC', 'delivery-pass-123');
  assert.ok(back);
});
