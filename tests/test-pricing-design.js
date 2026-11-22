'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../client/js/pricing.js'), 'utf8');
async function render(value, lang = 'en', ok = true) {
  const nodes = Object.fromEntries(['pricing-amount', 'pricing-period', 'pricing-status', 'pricing-trial'].map(id => [id, {textContent: '', hidden: false}]));
  let listener;
  const window = {I18N: {lang, onChange: fn => { listener = fn; }}};
  vm.runInNewContext(script, {window, Intl, Number, Error, document: {getElementById: id => nodes[id], querySelectorAll: () => [], querySelector: () => null}, fetch: async () => ({ok, json: async () => ({pricing: value})})});
  await new Promise(resolve => setImmediate(resolve));
  return {nodes, change: lang => { window.I18N.lang = lang; listener(); }};
}
const monthly = {pricing_cents: 499, pricing_currency: 'USD', pricing_period: 'month', trial_days: 7};
test('pricing uses the API amount and a separate localized billing label', async () => {
  const {nodes, change} = await render(monthly);
  assert.match(nodes['pricing-amount'].textContent, /USD.*4\.99/);
  assert.equal(nodes['pricing-period'].textContent, 'per month');
  change('ar');
  assert.equal(nodes['pricing-period'].textContent, 'شهريًا');
  assert.match(nodes['pricing-trial'].textContent, /7/);
});
test('annual prices and trial days are not hard-coded', async () => {
  const {nodes} = await render({...monthly, pricing_cents: 9900, pricing_period: 'year', trial_days: 14});
  assert.match(nodes['pricing-amount'].textContent, /99\.00/);
  assert.equal(nodes['pricing-period'].textContent, 'per year');
  assert.match(nodes['pricing-trial'].textContent, /14-day/);
});
test('no trial is claimed when trial days is zero', async () => {
  const {nodes} = await render({...monthly, trial_days: 0});
  assert.equal(nodes['pricing-trial'].hidden, true);
});
test('failed pricing does not invent an amount or trial', async () => {
  const {nodes} = await render(monthly, 'en', false);
  assert.equal(nodes['pricing-amount'].textContent, '—');
  assert.match(nodes['pricing-status'].textContent, /unavailable/);
  assert.equal(nodes['pricing-trial'].hidden, true);
});
test('invalid pricing is rejected', async () => {
  const {nodes} = await render({...monthly, pricing_cents: -1});
  assert.equal(nodes['pricing-amount'].textContent, '—');
});
test('pricing markup isolates the price and keeps the existing request fields', () => {
  const html = fs.readFileSync(path.join(__dirname, '../client/pricing.html'), 'utf8');
  assert.match(html, /<bdi id="pricing-amount" dir="ltr">/);
  assert.doesNotMatch(html, /4\.99|user-scalable=no|id="mk-price"/);
  for (const id of ['name', 'rest', 'phone', 'wa', 'city', 'notes', 'submit', 'msg']) assert.ok(html.includes(`id="rq-${id}"`));
  assert.match(html, /i18n.js\?v=20261123/);
});
