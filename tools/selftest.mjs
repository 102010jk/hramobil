#!/usr/bin/env node
// Sanity checks for the engine and the stored levels:
//  - every stored puzzle has exactly one solution
//  - the logic solver solves it and never makes an unsound step
//  - symmetry transforms keep puzzles valid
//  - mistake analysis runs for random wrong moves
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  decodePuzzle, transformPuzzle, solve, findStep, applyStep, isSolvedState, levelParams, mulberry32,
} from '../www/js/engine.js';
import { analyseMistake } from '../www/js/explain.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(path.join(here, '..', 'www', 'levels.json'), 'utf8'));
let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL', msg); };
const rng = mulberry32(42);
const levels = Object.keys(data.levels).map(Number).sort((a, b) => a - b);

for (const level of levels) {
  const p = levelParams(level);
  data.levels[level].forEach((raw, vi) => {
    const tag = `level ${level} v${vi}`;
    if (raw.n !== p.n || raw.k !== p.k) fail(`${tag}: size ${raw.n}/${raw.k} != params ${p.n}/${p.k}`);
    const sym = Math.floor(rng() * 8);
    const P = decodePuzzle(transformPuzzle(raw, sym, 1234 + vi));
    const sols = solve(P, 2, null, 5e6);
    if (sols.count !== 1 || sols.solutions[0].join(',') !== Array.from(P.solution).join(',')) fail(`${tag}: not unique (${sols.count})`);
    const st = new Uint8Array(P.N);
    for (let i = 0; i < P.N * 3 && !isSolvedState(P, st); i++) {
      const step = findStep(P, st, 4);
      if (!step) { fail(`${tag}: logic stuck`); break; }
      for (const c of step.cells) {
        if (step.action === 'place' && !P.solMask[c]) fail(`${tag}: wrong placement ${c} by ${step.tech}`);
        if (step.action === 'cross' && P.solMask[c]) fail(`${tag}: wrong cross ${c} by ${step.tech}`);
      }
      applyStep(P, st, step);
    }
    // a random wrong move from an empty board must be analysable
    const wrong = [];
    for (let c = 0; c < P.N; c++) if (!P.solMask[c]) wrong.push(c);
    const cell = wrong[Math.floor(rng() * wrong.length)];
    const a = analyseMistake(P, { cell, snap: { cells: new Array(P.N).fill('') }, t: 0 });
    if (!a.why || !a.belonged) fail(`${tag}: empty mistake analysis`);
  });
}
console.log(failures ? `${failures} failure(s)` : `OK – ${levels.length} levels checked`);
process.exit(failures ? 1 : 0);
