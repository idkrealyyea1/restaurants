'use strict';

/** Uploads, QR, SSE auth, validation hardening and order rate limiting. */

process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || '';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { startApp } = require('./helpers');

const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c626001000000ffff03000006000557bfabd40000000049454e44ae426082',
  'hex'
);
// "PNG" magic on the outside, HTML on the inside → must be rejected by sniffing? No: sniffing checks bytes only.
// This is a REAL PNG (tiny). For the spoof test we send text/html content-type with png bytes.
const HTML = Buffer.from('<html><body>x</body></html>');

let env;
let ownerCookie;
let fx;

before(async () => {
  env = await startApp({ orderRateMax: 3 });
  await env.createPlatformOwner('root', 'owner-password-123');
  ownerCookie = await env.login('root', 'owner-password-123');
  fx = await env.createRestaurantFixture(ownerCookie, { name: 'Misc Diner', slug: 'misc-diner' });
});

after(async () => {
  if (env) await env.close();
});

test('valid PNG upload attaches to a menu item', async () => {
  const fd = new FormData();
  fd.append('image', new Blob([PNG], { type: 'image/png' }), 'photo.png');
  const res = await env.req('/api/admin/images?type=items&itemId=' + fx.itemId, {
    method: 'POST', cookie: fx.adminCookie, body: fd,
  });
  assert.strictEqual(res.status, 201);
  assert.match(res.data.path, /^\/uploads\/items\/[0-9a-f-]+\.png$/);

  const item = await env.query('SELECT image_path FROM menu_items WHERE id = $1', [fx.itemId]);
  assert.strictEqual(item.rows[0].image_path, res.data.path);

  // The file is actually served.
  const img = await fetch(env.baseUrl + res.data.path);
  assert.strictEqual(img.status, 200);
  assert.strictEqual(img.headers.get('content-type'), 'image/png');
});

test('non-image uploads are rejected by MIME + magic-byte sniffing', async () => {
  const fd = new FormData();
  fd.append('image', new Blob([HTML], { type: 'text/html' }), 'evil.html');
  const res = await env.req('/api/admin/images?type=items&itemId=' + fx.itemId, {
    method: 'POST', cookie: fx.adminCookie, body: fd,
  });
  assert.strictEqual(res.status, 400);

  // Spoofed: html bytes claiming to be a PNG.
  const fd2 = new FormData();
  fd2.append('image', new Blob([HTML], { type: 'image/png' }), 'evil.png');
  const res2 = await env.req('/api/admin/images?type=items&itemId=' + fx.itemId, {
    method: 'POST', cookie: fx.adminCookie, body: fd2,
  });
  assert.strictEqual(res2.status, 400);
});

test('path traversal in image type parameter is rejected', async () => {
  const fd = new FormData();
  fd.append('image', new Blob([PNG], { type: 'image/png' }), 'ok.png');
  const res = await env.req('/api/admin/images?type=../../etc%00', {
    method: 'POST', cookie: fx.adminCookie, body: fd,
  });
  assert.strictEqual(res.status, 400);
});

test('QR endpoint returns an SVG for the public page URL', async () => {
  const res = await env.req('/api/admin/qr', { cookie: fx.adminCookie });
  assert.strictEqual(res.status, 200);
  assert.ok(res.data.svg.startsWith('<?xml') || res.data.svg.includes('<svg'));
  assert.ok(res.data.url.endsWith('/restaurant/' + fx.slug));
});

test('SSE endpoint requires authentication', async () => {
  const res = await env.req('/api/admin/events');
  assert.strictEqual(res.status, 401);
});

test('malformed JSON body produces 400, not a crash', async () => {
  const res = await fetch(env.baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not-json',
  });
  assert.strictEqual(res.status, 400);
});

test('oversized JSON body is rejected', async () => {
  const big = 'x'.repeat(200 * 1024);
  const res = await fetch(env.baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: big, password: 'x' }),
  });
  assert.strictEqual(res.status, 413);
});

test('cross-origin mutating request without matching Origin is rejected', async () => {
  const res = await fetch(env.baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://evil.example.com',
    },
    body: JSON.stringify({ identifier: 'root', password: 'owner-password-123' }),
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual((await res.json()).error.code, 'BAD_ORIGIN');
});

test('checkout rate limit returns 429 once exhausted (max=3)', async () => {
  const payload = () => ({
    customerName: 'Rate Test',
    customerWhatsapp: '15550009999',
    orderType: 'pickup',
    items: [{ itemId: fx.itemId, quantity: 1 }],
  });

  const first = await env.req('/api/restaurants/' + fx.slug + '/orders', { method: 'POST', body: payload() });
  assert.strictEqual(first.status, 201);
  await env.req('/api/restaurants/' + fx.slug + '/orders', { method: 'POST', body: payload() });
  await env.req('/api/restaurants/' + fx.slug + '/orders', { method: 'POST', body: payload() });

  const fourth = await env.req('/api/restaurants/' + fx.slug + '/orders', { method: 'POST', body: payload() });
  assert.strictEqual(fourth.status, 429);
  assert.strictEqual(fourth.data.error.code, 'RATE_LIMITED');
});
