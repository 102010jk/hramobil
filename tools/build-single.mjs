#!/usr/bin/env node
// Bundles the whole game (CSS, JS modules, levels) into one self-contained
// HTML file: dist/veritdoku.html (a full document) and
// dist/veritdoku-artifact.html (body content only, for hosts that add their
// own <html>/<head> wrapper).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const www = (f) => readFileSync(path.join(root, 'www', f), 'utf8');
const ORDER = ['engine.js', 'verities.js', 'ink.js', 'explain.js', 'main.js'];

function wrapModule(file, code) {
  const exportsList = [];
  // imports -> destructure from earlier modules
  code = code.replace(/import\s*\{([^}]*)\}\s*from\s*'\.\/([\w-]+)\.js';?/g, (_, names, mod) =>
    `const {${names}} = __m_${mod.replace(/-/g, '_')};`);
  code = code.replace(/^export\s+(async\s+function|function|const|let|class)\s+([\w$]+)/gm, (_, kw, name) => {
    exportsList.push(name);
    return `${kw} ${name}`;
  });
  code = code.replace(/^export\s*\{([^}]*)\};?\s*$/gm, (_, names) => {
    names.split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => exportsList.push(n));
    return '';
  });
  const id = file.replace('.js', '').replace(/-/g, '_');
  return `const __m_${id} = (() => {\n${code}\nreturn { ${[...new Set(exportsList)].join(', ')} };\n})();\n`;
}

const js = ORDER.map((f) => wrapModule(f, www('js/' + f))).join('\n');
// background generator: engine + worker as one classic script, started from a Blob
const workerSrc = wrapModule('engine.js', www('js/engine.js')) + wrapModule('gen-worker.js', www('js/gen-worker.js'));
const safe = (str) => str.replace(/<\/(script)/gi, '<\\/$1');
const css = www('css/style.css');
const levels = process.env.VERITDOKU_LEVELS ? readFileSync(process.env.VERITDOKU_LEVELS, 'utf8') : www('levels.json');
const html = www('index.html');

const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
let body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
body = body.replace(/<script type="module" src="js\/main.js"><\/script>/, '');
const keepHead = head
  .split('\n')
  .filter((l) => /<title>|fonts\.googleapis|fonts\.gstatic|name="description"|name="theme-color"/.test(l))
  .join('\n');
const inline = `<style>\n${css}\n</style>\n<script>window.__VERITDOKU_LEVELS__ = ${levels.trim()};\nwindow.__VERITDOKU_WORKER_SRC__ = ${safe(JSON.stringify(workerSrc))};</script>\n<script type="module">\n${safe(js)}\n</script>`;

mkdirSync(path.join(root, 'dist'), { recursive: true });
const full = `<!doctype html>\n<html lang="cs">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n${keepHead}\n</head>\n<body>\n${body}\n${inline}\n</body>\n</html>\n`;
writeFileSync(path.join(root, 'dist', 'veritdoku.html'), full);
const artifact = `<title>Veritdoku</title>\n${keepHead.replace(/<title>.*<\/title>/, '')}\n${body}\n${inline}\n`;
writeFileSync(path.join(root, 'dist', 'veritdoku-artifact.html'), artifact);
console.log('dist/veritdoku.html', (full.length / 1024).toFixed(0) + ' KB');
