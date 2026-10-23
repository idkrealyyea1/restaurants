'use strict';

/** Landing start CTA choice — static audit, no database. */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const appSrc = fs.readFileSync(path.join(ROOT, 'client/app.js'), 'utf8');
const cssSrc = fs.readFileSync(path.join(ROOT, 'client/styles.css'), 'utf8');

test('start CTA opens a free-or-subscribe choice', () => {
  const startActions = appSrc.match(/data-action="start"/g) || [];
  const choiceMarkup = (appSrc.match(/function startChoiceMarkup[\s\S]*?\n\}/) || [''])[0];
  assert.ok(startActions.length >= 2, 'pricing and closing CTAs use the start action');
  assert.ok(choiceMarkup, 'choice markup exists');
  assert.ok(choiceMarkup.includes('href="/signup.html"'), 'free choice links to signup');
  assert.ok(choiceMarkup.includes('data-action="choose-subscribe"'), 'subscribe choice is wired');
  assert.ok(appSrc.includes('data-action="choose-start"'), 'subscribe form can return to the choice');
  assert.ok(appSrc.includes('modalView === "choice"'), 'choice view is rendered');
});

test('start choice copy and styling exist in both languages', () => {
  for (const value of ['freeTitle: "ابدأ مجانًا"', 'freeTitle: "Start for free"', 'subscribeTitle: "اشترك"', 'subscribeTitle: "Subscribe"']) {
    assert.ok(appSrc.includes(value), `missing copy: ${value}`);
  }
  assert.ok(appSrc.includes('Subscription request from the landing page'), 'subscription requests are identifiable in the dashboard notes');
  assert.ok(cssSrc.includes('.start-choice-panel'), 'choice panel styles exist');
  assert.ok(cssSrc.includes('.start-choice-free'), 'free option styles exist');
  assert.ok(cssSrc.includes('.start-choice-subscribe'), 'subscribe option styles exist');
});
