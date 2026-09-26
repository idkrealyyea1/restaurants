'use strict';

/**
 * 005 Order Notifications — restaurant inbox (US1), platform feed (US2),
 * read state (US3), silence (US4), burst proof (Polish).
 */

process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || '';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { startApp } = require('./helpers');

let env;
let ownerCookie;
let A;
let B;

before(async () => {
  env = await startApp({ orderRateMax: 10000 });
  await env.createPlatformOwner('root', 'owner-password-123');
  ownerCookie = await env.login('root', 'owner-password-123');
  A = await env.createRestaurantFixture(ownerCookie, { name: 'Notif Alpha', slug: 'notif-alpha' });
  B = await env.createRestaurantFixture(ownerCookie, { name: 'Notif Beta', slug: 'notif-beta' });
});

after(async () => {
  if (env) await env.close();
});

async function placeOrder(slug, idx) {
  const fx = slug === A.slug ? A : B;
  const res = await env.req('/api/restaurants/' + slug + '/orders', {
    method: 'POST',
    body: {
      customerName: 'Notif Customer ' + idx,
      customerWhatsapp: '1555900' + String(100 + idx),
      orderType: 'pickup',
      items: [{ itemId: fx.itemId, quantity: 1 }],
    },
  });
  assert.strictEqual(res.status, 201, 'order places, got ' + res.status);
  return res.data.order.code;
}

async function inbox(cookie, base) {
  const res = await env.req(base + '/notifications?limit=100', { cookie });
  assert.strictEqual(res.status, 200, 'inbox loads, got ' + res.status);
  return res.data;
}

// US1: offline inbox — order with no session, notification unread on login.
test('offline order appears unread on dashboard open (US1)', async () => {
  const code = await placeOrder(A.slug, 1);
  const box = await inbox(A.adminCookie, '/api/admin');
  assert.strictEqual(box.unreadCount, 1, 'one unread, got ' + JSON.stringify(box));
  assert.strictEqual(box.notifications.length, 1);
  assert.strictEqual(box.notifications[0].orderCode, code);
  assert.strictEqual(box.notifications[0].isRead, false);
});

// US1: live session sees it without refresh; reload shows exactly once.
test('live session receives notification without refresh (US1)', async () => {
  const before = await inbox(A.adminCookie, '/api/admin');
  const code = await placeOrder(A.slug, 2);
  const after = await inbox(A.adminCookie, '/api/admin');
  assert.strictEqual(after.unreadCount, before.unreadCount + 1, 'count grew by one');
  const codes = after.notifications.map((n) => n.orderCode);
  assert.ok(codes.includes(code), 'new order listed');
  assert.strictEqual(new Set(codes).size, codes.length, 'no duplicates on re-read');
});

// US2: platform feed isolation.
test('platform sees both restaurants; tenants see only their own (US2)', async () => {
  const codeA = await placeOrder(A.slug, 10);
  const codeB = await placeOrder(B.slug, 11);

  const boxA = await inbox(A.adminCookie, '/api/admin');
  const boxB = await inbox(B.adminCookie, '/api/admin');
  const codesA = boxA.notifications.map((n) => n.orderCode);
  const codesB = boxB.notifications.map((n) => n.orderCode);
  assert.ok(codesA.includes(codeA), 'A sees own order');
  assert.ok(!codesA.includes(codeB), 'A never sees B order');
  assert.ok(codesB.includes(codeB), 'B sees own order');
  assert.ok(!codesB.includes(codeA), 'B never sees A order');

  const ownerBox = await inbox(ownerCookie, '/api/owner');
  const ownerCodes = ownerBox.notifications.map((n) => n.orderCode);
  assert.ok(ownerCodes.includes(codeA) && ownerCodes.includes(codeB), 'owner sees both');
  const rowA = ownerBox.notifications.find((n) => n.orderCode === codeA);
  assert.strictEqual(rowA.restaurantSlug, A.slug, 'platform row identifies restaurant');

  // Direct cross-tenant read denied without leak.
  const foreign = boxB.notifications.find((n) => n.orderCode === codeB);
  const res = await env.req('/api/admin/notifications/' + foreign.id + '/read', {
    method: 'PATCH',
    cookie: A.adminCookie,
  });
  assert.strictEqual(res.status, 404, 'cross-tenant read denied, got ' + res.status);
});

// US3: personal read state, survives re-login, cross-user denied.
test('read state is personal and persistent (US3)', async () => {
  await placeOrder(A.slug, 20);
  const box = await inbox(A.adminCookie, '/api/admin');
  const target = box.notifications.find((n) => !n.isRead);
  assert.ok(target, 'an unread notification exists');

  const mark = await env.req('/api/admin/notifications/' + target.id + '/read', {
    method: 'PATCH',
    cookie: A.adminCookie,
  });
  assert.strictEqual(mark.status, 200);
  const after = await inbox(A.adminCookie, '/api/admin');
  assert.strictEqual(after.unreadCount, box.unreadCount - 1, 'count drops by one');

  // A second admin of the same restaurant has independent read state.
  const admin2 = await env.req('/api/owner/restaurants/' + A.restaurantId + '/admins', {
    method: 'POST',
    cookie: ownerCookie,
    body: { username: 'notif-alpha-admin-2', password: 'admin-password-123' },
  });
  assert.strictEqual(admin2.status, 201, 'second admin created, got ' + admin2.status);
  const admin2Cookie = await env.login('notif-alpha-admin-2', 'admin-password-123');

  // New order notifies both admins with separate rows.
  const code3 = await placeOrder(A.slug, 21);
  const box1 = await inbox(A.adminCookie, '/api/admin');
  const box2 = await inbox(admin2Cookie, '/api/admin');
  const row1 = box1.notifications.find((n) => n.orderCode === code3);
  const row2 = box2.notifications.find((n) => n.orderCode === code3);
  assert.ok(row1 && row2, 'both admins notified');
  assert.notStrictEqual(row1.id, row2.id, 'separate per-user rows');

  // First admin marks own read; second admin unaffected.
  await env.req('/api/admin/notifications/' + row1.id + '/read', {
    method: 'PATCH',
    cookie: A.adminCookie,
  });
  const box2After = await inbox(admin2Cookie, '/api/admin');
  assert.strictEqual(
    box2After.notifications.find((n) => n.id === row2.id).isRead,
    false,
    'second admin still unread'
  );

  // Cross-user mark-read denied without leak.
  const denied = await env.req('/api/admin/notifications/' + row2.id + '/read', {
    method: 'PATCH',
    cookie: A.adminCookie,
  });
  assert.strictEqual(denied.status, 404, 'cross-user read denied, got ' + denied.status);

  // State survives re-login.
  const freshCookie = await env.login(A.adminUsername, A.adminPassword);
  const freshBox = await inbox(freshCookie, '/api/admin');
  assert.strictEqual(
    freshBox.notifications.find((n) => n.id === row1.id).isRead,
    true,
    'read persists across login'
  );
});

// Polish: 50 concurrent orders → exact notification sets per recipient.
test('burst yields exact notification sets, none lost/duplicated/misassigned', async () => {
  const beforeA = await inbox(A.adminCookie, '/api/admin');
  const beforeOwner = await inbox(ownerCookie, '/api/owner');
  const results = await Promise.all(
    Array.from({ length: 50 }, (_, i) => placeOrder(A.slug, 100 + i))
  );
  assert.ok(results.every((r) => typeof r === 'string'), 'all 50 orders committed');

  const afterA = await inbox(A.adminCookie, '/api/admin');
  const afterOwner = await inbox(ownerCookie, '/api/owner');
  assert.strictEqual(
    afterA.total - beforeA.total,
    50,
    'restaurant inbox grew by exactly 50'
  );
  assert.strictEqual(
    afterOwner.total - beforeOwner.total,
    50,
    'platform inbox grew by exactly 50'
  );
  const codes = afterA.notifications.map((n) => n.orderCode);
  assert.ok(results.every((c) => codes.includes(c)), 'every order notified, none lost');
  const boxB = await inbox(B.adminCookie, '/api/admin');
  assert.ok(results.every((c) => !boxB.notifications.map((n) => n.orderCode).includes(c)), 'none misassigned to B');
});

// US4: failed orders stay silent; repeats mirror persisted orders.
test('failed submissions create no notifications (US4)', async () => {
  const before = await inbox(A.adminCookie, '/api/admin');
  const bad = await env.req('/api/restaurants/' + A.slug + '/orders', {
    method: 'POST',
    body: {
      customerName: 'X',
      customerWhatsapp: '1',
      orderType: 'pickup',
      items: [{ itemId: A.itemId, quantity: 1 }],
    },
  });
  assert.strictEqual(bad.status, 400, 'invalid submission rejected, got ' + bad.status);
  const after = await inbox(A.adminCookie, '/api/admin');
  assert.strictEqual(after.total, before.total, 'no notification for failed order');
});
