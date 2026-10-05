#!/usr/bin/env node
// Pre-generates the puzzles for levels 1..100 into www/levels.json.
// Usage: node tools/generate-levels.mjs [--from 1] [--to 100] [--variants 4] [--workers N] [--fresh 1]
// Results are cached in tools/.levels-cache.json, so the script can be
// interrupted and resumed; delete the cache to regenerate everything.
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const enginePath = path.join(here, '..', 'www', 'js', 'engine.js');
const outPath = path.join(here, '..', 'www', 'levels.json');
const cachePath = path.join(here, '.levels-cache.json');

if (!isMainThread) {
  const E = await import(enginePath);
  parentPort.on('message', ({ level, variant }) => {
    const p = E.levelParams(level);
    const accept = (r) => r.maxLevel >= Math.min(p.minTech, p.maxTech);
    const t0 = Date.now();
    // top levels: several candidates, keep the one needing the most hard steps
    const want = 1;
    let out = null, found = 0;
    for (let attempt = 0; attempt < 40 && found < want; attempt++) {
      const seed = level * 1000003 + variant * 7919 + attempt * 104729;
      const r = E.generatePuzzle(p.n, p.k, seed, { maxLevel: p.maxTech, accept, maxTries: 4, harden: p.harden });
      if (!r) continue;
      found++;
      const cand = { ...E.encodePuzzle(r.P), m: r.rating.maxLevel, lc: r.rating.levelCounts, h: Math.round(E.hardness(r.rating)) };
      if (!out || cand.h > out.h) out = cand;
    }
    if (out) delete out.c;
    parentPort.postMessage({ level, variant, puzzle: out, ms: Date.now() - t0 });
  });
} else {
  const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, []));
  const from = +(args.from || 1), to = +(args.to || 100);
  const variantsFor = (level) => +(args.variants || (level <= 60 ? 4 : level <= 84 ? 3 : 1));
  const nWorkers = +(args.workers || Math.max(1, cpus().length));
  const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};
  if (!existsSync(cachePath) && existsSync(outPath) && !args.fresh) {
    // continue from the committed levels.json
    const prev = JSON.parse(readFileSync(outPath, 'utf8')).levels || {};
    for (const [l, list] of Object.entries(prev)) cache[l] = Object.fromEntries(list.map((p, i) => [i, p]));
  }

  const jobs = [];
  // biggest (slowest) first so the tail is short
  for (let level = to; level >= from; level--) {
    for (let v = 0; v < variantsFor(level); v++) {
      if (!(cache[level] && cache[level][v])) jobs.push({ level, variant: v });
    }
  }
  console.log(`${jobs.length} puzzles to generate with ${nWorkers} workers`);

  const write = () => {
    writeFileSync(cachePath, JSON.stringify(cache));
    const levels = {};
    for (let l = 1; l <= 100; l++) {
      const list = cache[l] ? Object.values(cache[l]).filter(Boolean) : [];
      if (list.length) levels[l] = list.map(({ lc, h, ...rest }) => rest);
    }
    writeFileSync(outPath, JSON.stringify({ version: 1, generated: new Date().toISOString(), levels }));
  };

  let done = 0;
  await Promise.all(Array.from({ length: nWorkers }, () => new Promise((resolve) => {
    const w = new Worker(fileURLToPath(import.meta.url));
    const next = () => {
      const job = jobs.shift();
      if (!job) { w.terminate(); resolve(); return; }
      w.postMessage(job);
    };
    w.on('message', ({ level, variant, puzzle, ms }) => {
      done++;
      if (puzzle) {
        cache[level] = cache[level] || {};
        cache[level][variant] = puzzle;
      }
      console.log(`[${done}] level ${level} v${variant}: ${puzzle ? `${puzzle.n}x${puzzle.n} tech=${puzzle.m} hard=${puzzle.h} steps=${puzzle.lc}` : 'FAILED'} ${(ms / 1000).toFixed(1)}s`);
      write();
      next();
    });
    w.on('error', (e) => { console.error(e); resolve(); });
    next();
  })));
  write();
  const missing = [];
  for (let l = from; l <= to; l++) if (!cache[l] || !Object.keys(cache[l]).length) missing.push(l);
  console.log(missing.length ? `Missing levels: ${missing.join(', ')}` : 'All levels present.');
}
