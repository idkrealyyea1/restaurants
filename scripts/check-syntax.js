#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'data', 'coverage']);

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const files = walk(ROOT, []);
let failed = 0;

for (const file of files) {
  try {
    // Syntax check only: parses the file, executes nothing.
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    console.log(`ok   ${path.relative(ROOT, file)}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${path.relative(ROOT, file)}`);
    console.error(err.stderr ? err.stderr.toString() : err.message);
  }
}

console.log(`\n${files.length} file(s) checked, ${failed} failure(s)`);
process.exit(failed > 0 ? 1 : 0);
