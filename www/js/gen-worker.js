// Background puzzle generation, so the UI stays responsive.
// message in:  { id, level, seed }
// message out: { id, puzzle }  (encoded puzzle, or null when it failed)
import { generatePuzzle, levelParams, encodePuzzle } from './engine.js';

self.onmessage = (e) => {
  const { id, level, seed } = e.data;
  const p = levelParams(level);
  const accept = (r) => r.maxLevel >= Math.min(p.minTech, p.maxTech);
  let puzzle = null;
  for (let t = 0; t < 60 && !puzzle; t++) {
    const r = generatePuzzle(p.n, p.k, (seed + t * 104729) >>> 0, { maxLevel: p.maxTech, accept, maxTries: 3, harden: Math.min(p.harden, 80) });
    if (r) puzzle = encodePuzzle(r.P);
  }
  self.postMessage({ id, puzzle });
};
