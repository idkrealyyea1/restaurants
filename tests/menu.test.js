'use strict';

/** Menu + category management, backend-enforced item limits. */

process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || '';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { startApp } = require('./helpers');

let env;
let ownerCookie;
let adminCookie;
let restaurantId;
let categoryId;

before(async () => {
  env = await startApp();
  await env.createPlatformOwner('root', 'owner-password-123');
  ownerCookie = await env.login('root', 'owner-password-123');

  const created = await env.req('/api/owner/restaurants', {
    method: 'POST',
    cookie: ownerCookie,
    body: {
      name: 'Menu Lab',
      slug: 'menu-lab',
      maxMenuItems: 2,
      adminUsername: 'menu-admin',
      adminPassword: 'admin-password-123',
    },
  });
  restaurantId = created.data.restaurant.id;
  adminCookie = await env.login('menu-admin', 'admin-password-123');
});

after(async () => {
  if (env) await env.close();
});

test('category CRUD with duplicate rejection', async () => {
  const created = await env.req('/api/admin/categories', {
    method: 'POST', cookie: adminCookie, body: { name: 'Drinks' },
  });
  assert.strictEqual(created.status, 201);
  categoryId = created.data.category.id;

  const dupe = await env.req('/api/admin/categories', {
    method: 'POST', cookie: adminCookie, body: { name: 'drinks' },
  });
  assert.strictEqual(dupe.status, 409);

  const renamed = await env.req('/api/admin/categories/' + categoryId, {
    method: 'PATCH', cookie: adminCookie, body: { name: 'Beverages' },
  });
  assert.strictEqual(renamed.data.category.name, 'Beverages');

  const list = await env.req('/api/admin/categories', { cookie: adminCookie });
  assert.strictEqual(list.data.categories.length, 1);
});

test('item creation requires valid price and category', async () => {
  const bad = await env.req('/api/admin/items', {
    method: 'POST', cookie: adminCookie,
    body: { categoryId: categoryId, name: 'Tea', priceCents: -5 },
  });
  assert.strictEqual(bad.status, 400);

  const badCat = await env.req('/api/admin/items', {
    method: 'POST', cookie: adminCookie,
    body: { categoryId: '11111111-1111-4111-8111-111111111111', name: 'Ghost', priceCents: 100 },
  });
  assert.strictEqual(badCat.status, 404);
});

test('MENU LIMIT is enforced on the backend (limit=2)', async () => {
  const first = await env.req('/api/admin/items', {
    method: 'POST', cookie: adminCookie,
    body: { categoryId, name: 'Espresso', priceCents: 250 },
  });
  assert.strictEqual(first.status, 201);

  const second = await env.req('/api/admin/items', {
    method: 'POST', cookie: adminCookie,
    body: { categoryId, name: 'Latte', priceCents: 350 },
  });
  assert.strictEqual(second.status, 201);

  // Limit reached — direct API abuse must fail.
  const third = await env.req('/api/admin/items', {
    method: 'POST', cookie: adminCookie,
    body: { categoryId, name: 'Mocha', priceCents: 400 },
  });
  assert.strictEqual(third.status, 409);
  assert.strictEqual(third.data.error.code, 'MENU_LIMIT_REACHED');

  // Raising the limit via the owner unblocks creation.
  const raise = await env.req('/api/owner/restaurants/' + restaurantId, {
    method: 'PATCH', cookie: ownerCookie, body: { maxMenuItems: 3 },
  });
  assert.strictEqual(raise.status, 200);

  const okNow = await env.req('/api/admin/items', {
    method: 'POST', cookie: adminCookie,
    body: { categoryId, name: 'Mocha', priceCents: 400 },
  });
  assert.strictEqual(okNow.status, 201);
});

test('item flags: sold-out and popular toggles work', async () => {
  const items = (await env.req('/api/admin/items', { cookie: adminCookie })).data.items;
  const espresso = items.find((i) => i.name === 'Espresso');

  const soldOut = await env.req('/api/admin/items/' + espresso.id, {
    method: 'PATCH', cookie: adminCookie, body: { isAvailable: false },
  });
  assert.strictEqual(soldOut.data.item.is_available, false);

  const popular = await env.req('/api/admin/items/' + espresso.id, {
    method: 'PATCH', cookie: adminCookie, body: { isPopular: true },
  });
  assert.strictEqual(popular.data.item.is_popular, true);

  const list = await env.req('/api/admin/items?restaurantId=' + restaurantId, { cookie: ownerCookie });
  const view = list.data.items.find((i) => i.id === espresso.id);
  assert.strictEqual(view.is_available, false);
  assert.strictEqual(view.is_popular, true);
});

test('deleting a category cascades its items', async () => {
  const cat2 = await env.req('/api/admin/categories', {
    method: 'POST', cookie: adminCookie, body: { name: 'Temp' },
  });
  const it = await env.req('/api/admin/items', {
    method: 'POST', cookie: adminCookie,
    body: { categoryId: cat2.data.category.id, name: 'Doomed Item', priceCents: 100 },
  });
  assert.strictEqual(it.status, 201);

  const del = await env.req('/api/admin/categories/' + cat2.data.category.id, {
    method: 'DELETE', cookie: adminCookie,
  });
  assert.strictEqual(del.status, 200);

  const gone = await env.query('SELECT 1 FROM menu_items WHERE id = $1', [it.data.item.id]);
  assert.strictEqual(gone.rowCount, 0);
});
