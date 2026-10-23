'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const admin = fs.readFileSync(path.join(root, 'client', 'js', 'admin.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'client', 'css', 'style.css'), 'utf8');
const i18n = fs.readFileSync(path.join(root, 'client', 'js', 'i18n.js'), 'utf8');

test('menu item modal has a details-to-options step flow', () => {
  assert.ok(admin.includes('data-item-step="details"'));
  assert.ok(admin.includes('data-item-step="options"'));
  assert.ok(admin.includes('item-step is-active'));
  assert.ok(admin.includes("I.t('itemStepLockedHint')"));
  assert.ok(admin.includes("I.t('itemSaveContinue')"));
  assert.ok(admin.includes("I.t('itemOptionsBack')"));
  assert.ok(admin.includes("I.t('itemOptionsDone')"));
  assert.ok(admin.includes("setStep('options', { skipLoad: true })"));
  assert.ok(admin.includes('markDetailsDirty'));
  assert.ok(admin.includes("itemForm.addEventListener('input', markDetailsDirty)"));
});

test('menu item modal is widened and uses the step-builder styles', () => {
  assert.ok(admin.includes("'modal-wide'"));
  assert.ok(css.includes('.modal.modal-wide'));
  assert.ok(css.includes('.item-steps'));
  assert.ok(css.includes('.item-step.is-active'));
  assert.ok(css.includes('.item-step-panel[hidden]'));
  assert.ok(css.includes('.item-step-actions'));
});

test('option groups use labeled choice inputs and clear group cards', () => {
  assert.ok(admin.includes('option-group-card'));
  assert.ok(admin.includes('option-choice-form-grid'));
  assert.ok(admin.includes('option-required-card'));
  assert.ok(admin.includes('option-howto-step'));
  assert.ok(admin.includes("<label for=\"' + esc(choiceNameId)"));
  assert.ok(admin.includes("<label for=\"' + esc(choicePriceId)"));
  assert.ok(admin.includes('id="it-name" type="text"'));
  assert.ok(admin.includes('type="text" maxlength="60" required'));
  assert.ok(css.includes('.option-group-card'));
  assert.ok(css.includes('.option-choice-form-grid'));
  assert.ok(css.includes('.option-required-card'));
  assert.ok(css.includes('@media (max-width: 640px)'));
});

test('new option-builder strings exist in both dictionaries', () => {
  const keys = [
    'itemStepsLabel',
    'itemStepDetails',
    'itemStepDetailsHint',
    'itemStepOptions',
    'itemStepOptionsHint',
    'itemStepLockedHint',
    'itemSaveContinue',
    'itemOptionsBack',
    'itemOptionsDone',
    'optTitleFor',
    'optStepDesc',
    'optDoneHint',
    'optHowtoTitle',
    'optHowtoGroup',
    'optHowtoGroupDesc',
    'optHowtoChoices',
    'optHowtoChoicesDesc',
    'optHowtoRules',
    'optHowtoRulesDesc',
    'optGroupCount',
    'optGroupNameHint',
    'optSelectionHint',
    'optPricingHint',
    'optChoiceFormHint',
    'optChoicePrice',
    'optDeleteGroup',
    'optDeleteChoice',
  ];
  for (const key of keys) {
    const matches = i18n.match(new RegExp('\\b' + key + ':', 'g')) || [];
    assert.strictEqual(matches.length, 2, key + ' must be defined in Arabic and English');
  }
});
