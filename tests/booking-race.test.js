'use strict';

/**
 * FR-009: concurrent bookings for the same restaurant with overlapping time
 * windows must not both confirm. N conflicting → 1 success + N−1 clean 409s;
 * non-conflicting concurrent bookings all succeed.
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
  fx = await env.createRestaurantFixture(ownerCookie, { name: 'Race Inn', slug: 'race-inn' });
});

after(async () => {
  if (env) await env.close();
});

function book(i, at) {
  return env.req('/api/restaurants/' + fx.slug + '/bookings', {
    method: 'POST',
    body: {
      customerName: 'Guest ' + i,
      customerWhatsapp: '1555000' + String(2000 + i),
      tablesCount: 2,
      bookedAt: at,
    },
  });
}

test('10 concurrent overlapping bookings → exactly one confirmation', async () => {
  const at = new Date(Date.now() + 3600 * 1000).toISOString();
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) => book(i, at)));
  const ok = results.filter((r) => r.status === 201);
  const rejected = results.filter((r) => r.status === 409);
  assert.strictEqual(ok.length, 1, 'exactly one winner, got ' + ok.length);
  assert.strictEqual(rejected.length, 9, 'nine clean rejections, got ' + rejected.length);
});

test('concurrent non-overlapping bookings all succeed (per-window, not global lock)', async () => {
  // Base +24h: clear of the +1h booking from the previous test (120-min windows).
  const results = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      book(100 + i, new Date(Date.now() + (86400 + i * 10800) * 1000).toISOString())
    )
  );
  const ok = results.filter((r) => r.status === 201);
  assert.strictEqual(ok.length, 5, 'non-conflicting bookings must all succeed');
});
