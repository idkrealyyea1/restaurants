'use strict';

/**
 * FR-001b: staff creates restaurants and nothing else. Every other platform
 * operation is denied for staff sessions.
 */

process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || '';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { startApp } = require('./helpers');

let env;
let staffCookie;

before(async () => {
  env = await startApp();
  await env.createPlatformOwner('root', 'owner-password-123');
  staffCookie = await env.createStaffUser('remit-staff', 'staff-password-123');
});

after(async () => {
  if (env) await env.close();
});

test('staff can add a restaurant', async () => {
  const res = await env.req('/api/owner/restaurants', {
    method: 'POST',
    cookie: staffCookie,
    body: {
      name: 'Staff Bistro',
      slug: 'staff-bistro',
      maxMenuItems: 10,
      adminUsername: 'staff-bistro-admin',
      adminPassword: 'admin-password-123',
    },
  });
  assert.strictEqual(res.status, 201, 'got ' + res.status + ' ' + JSON.stringify(res.data));
  assert.ok(res.data.restaurant && res.data.restaurant.id, 'restaurant created');

  // R1: staff-created restaurants still bootstrap a working admin login.
  const adminCookie = await env.login('staff-bistro-admin', 'admin-password-123');
  const dash = await env.req('/api/admin/dashboard', { cookie: adminCookie });
  assert.strictEqual(dash.status, 200, 'bootstrapped admin works, got ' + dash.status);
});

test('staff is denied everything else', async () => {
  const denied = [
    ['GET', '/api/owner/overview'],
    ['GET', '/api/owner/restaurants'],
    ['GET', '/api/owner/delivery-groups'],
    ['POST', '/api/owner/delivery-groups'],
    ['GET', '/api/owner/platform-pricing'],
    ['GET', '/api/owner/staff'],
    ['GET', '/api/admin/dashboard'],
    ['GET', '/api/admin/orders'],
  ];
  for (const [method, path] of denied) {
    const opts = { method, cookie: staffCookie };
    if (method !== 'GET' && method !== 'HEAD') opts.body = {};
    const res = await env.req(path, opts);
    assert.strictEqual(res.status, 403, method + ' ' + path + ' got ' + res.status);
  }
  const del = await env.req('/api/owner/restaurants/some-id', { method: 'DELETE', cookie: staffCookie });
  assert.strictEqual(del.status, 403, 'DELETE got ' + del.status);
});
