// Production build without vite (vite 8 needs a native rolldown binary
// unavailable offline). Uses cached esbuild + tailwindcss directly:
//   1. tailwindcss CLI compiles src/index.css -> dist/assets/app.css
//   2. esbuild bundles src/main.tsx -> dist/assets/app.js
//   3. index.html + public/ copied to dist/
import * as esbuild from 'esbuild';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });

// 1. CSS via tailwind CLI (reads tailwind.config.js + postcss.config.js)
console.log('[build] tailwindcss...');
execSync('node node_modules/tailwindcss/lib/cli.js -i ./src/index.css -o ./dist/assets/app.css --minify', {
  cwd: root,
  stdio: 'inherit',
});

// 2. JS bundle via esbuild
console.log('[build] esbuild...');
await esbuild.build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  outfile: 'dist/assets/app.js',
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  sourcemap: false,
  jsx: 'automatic',
  loader: { '.css': 'empty' },
  alias: { '@': './src' },
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
});

// 3. index.html + public/
console.log('[build] static files...');
fs.copyFileSync(path.join(root, 'index.html'), path.join(dist, 'index.html'));

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
const pub = path.join(root, 'public');
if (fs.existsSync(pub)) {
  for (const entry of fs.readdirSync(pub)) {
    const s = path.join(pub, entry);
    const d = path.join(dist, entry);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const jsSize = (fs.statSync(path.join(dist, 'assets/app.js')).size / 1024).toFixed(0);
const cssSize = (fs.statSync(path.join(dist, 'assets/app.css')).size / 1024).toFixed(0);
console.log(`[build] done: app.js ${jsSize}KB, app.css ${cssSize}KB`);
