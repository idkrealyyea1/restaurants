'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const client = path.join(__dirname, '..', 'client');
const categories = ['restaurants', 'cafes', 'dessert-shops', 'cake-shops', 'home-businesses'];
for (const category of categories) {
  test(`${category} keeps navigation, bilingual content, demo and request form`, () => {
    const page = fs.readFileSync(path.join(client, `for-${category}.html`), 'utf8');
    assert.equal((page.match(/<h1\b/g) || []).length, 1);
    assert.match(page, /class="mk-nav"/);
    assert.match(page, /class="mk-footer"/);
    assert.match(page, /data-cat-ar=/);
    assert.match(page, /data-cat-en=/);
    assert.match(page, /href="\/demo\/"/);
    assert.match(page, /href="\/signup.html"/);
    assert.match(page, /id="request-form"/);
    for (const field of ['name', 'rest', 'phone', 'wa', 'city', 'notes', 'submit', 'msg']) {
      assert.ok(page.includes(`id="rq-${field}"`));
    }
    for (const linked of categories) assert.ok(page.includes(`href="/for-${linked}"`));
    assert.match(page, /\/css\/category.css/);
    assert.match(page, /\/js\/category.js/);
    assert.doesNotMatch(page, /user-scalable=no/);
  });
}
test('category styles and language changes stay scoped', () => {
  const script = fs.readFileSync(path.join(client, 'js/category.js'), 'utf8');
  assert.match(script, /I18N.onChange\(applyCategoryLanguage\)/);
  const css = fs.readFileSync(path.join(client, 'css/category.css'), 'utf8');
  assert.match(css, /@media \(max-width: 480px\)/);
  assert.match(css, /grid-template-columns: 1fr;/);
});
