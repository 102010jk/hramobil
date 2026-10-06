// Sestaví hru do jednoho HTML souboru (dist/vajecna-krava.html) a z něj Windows exe (dist/VajecnaKrava.exe).
// Použití: node vajecna-krava/tools/build-pc.mjs   (potřebuje Node a pro exe Go)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });

// 1) JS do jednoho souboru
const bundle = path.join(dist, 'bundle.js');
const esbuild = process.env.ESBUILD || 'npx --yes esbuild@0.24.0';
execSync(`${esbuild} js/main.js --bundle --format=iife --minify --target=es2020 --outfile="${bundle}"`, { cwd: root, stdio: 'inherit' });

// 2) HTML se vším uvnitř
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const js = fs.readFileSync(bundle, 'utf8').replace(/<\/script/gi, '<\\/script');
const icon = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root, 'icons/icon.svg')).toString('base64');
html = html
  .replace(/\s*<link rel="manifest"[^>]*>/, '')
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '')
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${icon}">`)
  .replace(/<link rel="stylesheet" href="css\/style.css">/, () => `<style>${css}</style>`)
  .replace(/<script type="module" src="js\/main.js"><\/script>/, () => `<script>${js}</script>`);
if (html.includes('js/main.js') || html.includes('css/style.css')) throw new Error('Nepodařilo se vložit skripty/styly do HTML');
const out = path.join(dist, 'vajecna-krava.html');
fs.writeFileSync(out, html);
fs.rmSync(bundle);
console.log(`HTML: ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} kB)`);

// 3) Windows exe (Go, bez dalších závislostí)
if (process.argv.includes('--no-exe')) process.exit(0);
const launcher = path.join(root, 'launcher');
fs.copyFileSync(out, path.join(launcher, 'game.html'));
const exe = path.join(dist, 'VajecnaKrava.exe');
execSync(`go build -trimpath -ldflags "-s -w -H windowsgui" -o "${exe}" .`, {
  cwd: launcher,
  stdio: 'inherit',
  env: { ...process.env, GOOS: 'windows', GOARCH: 'amd64', CGO_ENABLED: '0' },
});
fs.rmSync(path.join(launcher, 'game.html'));
console.log(`EXE: ${exe} (${(fs.statSync(exe).size / 1024 / 1024).toFixed(1)} MB)`);
