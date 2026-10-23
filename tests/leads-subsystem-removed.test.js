'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('platform owner no longer exposes AI sales or offers', () => {
  const owner = read('client/owner.html');
  assert.ok(!owner.includes('/leads.html'));
  assert.ok(!owner.includes('data-i18n="ownerOffersLink"'));
  assert.ok(!read('client/js/i18n.js').includes('ownerOffersLink'));
  assert.ok(!read('client/js/owner.js').includes('offers-link'));
});

test('leads and offer pages and assets are removed', () => {
  const removed = [
    'client/leads.html',
    'client/offers.html',
    'client/offer.html',
    'client/js/leads.js',
    'client/js/offer.js',
    'client/css/offers.css',
    'server/routes/leads.routes.js',
    'server/controllers/leads.controller.js',
    'server/services/leads.service.js',
    'server/services/enrichment.service.js',
  ];
  for (const rel of removed) {
    assert.ok(!fs.existsSync(path.join(root, rel)), `${rel} should be removed`);
  }
});

test('server no longer mounts leads or offer routes', () => {
  const app = read('server/app.js');
  assert.ok(!app.includes('leadsRoutes'));
  assert.ok(!app.includes('/api/owner/leads'));
  assert.ok(!app.includes("'/offer/:code'"));

  const publicRoutes = read('server/routes/public.routes.js');
  assert.ok(!publicRoutes.includes("'/offer/:code'"));
  assert.ok(!publicRoutes.includes('leads.service'));

  const siteRoutes = read('server/routes/site.routes.js');
  assert.ok(!siteRoutes.includes('/leads.html'));
  assert.ok(!siteRoutes.includes('Disallow: /offer/'));

  const redirects = read('client/_redirects');
  assert.ok(!redirects.includes('/offer/*'));
});

test('forward migration drops the leads tables', () => {
  const sql = read('database/migrations/037_drop_leads_subsystem.sql');
  assert.match(sql, /DROP TABLE IF EXISTS search_runs/i);
  assert.match(sql, /DROP TABLE IF EXISTS leads/i);
});
