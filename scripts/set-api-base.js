#!/usr/bin/env node
'use strict';

/**
 * Stamp (or clear) the split-frontend API base in every client HTML file.
 *
 * The frontend reads `<meta name="api-base" content="...">` (see
 * client/js/api.js). Empty content = same origin, which is correct for
 * full-stack hosting (Render / Wasmer / local dev). For the Cloudflare Pages
 * split frontend, stamp your Render URL so `/api/*` and `/uploads/*` calls
 * go to the backend.
 *
 * Usage:
 *   npm run api-base -- https://restaurants-api.onrender.com   # stamp URL
 *   npm run api-base -- --clear                                # back to ""
 *   API_BASE=https://... node scripts/set-api-base.js          # CI / Pages build
 *
 * Exits non-zero on invalid input or if no api-base meta tags are found.
 */

const fs = require('fs');
const path = require('path');

const CLIENT_DIR = path.join(__dirname, '..', 'client');
const META_RE = /(<meta\s+name="api-base"\s+content=")[^"]*(")/g;

function walkHtml(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function main() {
  const arg = (process.argv[2] || process.env.API_BASE || '').trim();
  if (!arg) {
    console.error('Usage: node scripts/set-api-base.js <https://api.example.com | --clear>');
    console.error('       API_BASE=https://api.example.com node scripts/set-api-base.js');
    process.exit(1);
  }

  let base = '';
  if (arg !== '--clear') {
    base = arg.replace(/\/+$/, '');
    if (!/^https?:\/\/[^/]+/i.test(base)) {
      console.error(`Invalid API base "${arg}" — must look like https://your-api.onrender.com`);
      process.exit(1);
    }
  }

  const files = walkHtml(CLIENT_DIR, []);
  let scanned = 0;
  let changed = 0;

  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('name="api-base"')) continue;
    scanned++;
    // Function replacement so `$` characters in the URL are never special.
    const next = html.replace(META_RE, (_m, open, close) => open + base + close);
    if (next !== html) {
      fs.writeFileSync(file, next);
      changed++;
    }
  }

  if (scanned === 0) {
    console.error('No files with <meta name="api-base"> found under client/ — nothing to do.');
    process.exit(1);
  }
  const shown = base || '(empty = same origin)';
  console.log(`api-base = ${shown}`);
  console.log(`${scanned} file(s) contain the meta tag, ${changed} updated.`);
}

main();
