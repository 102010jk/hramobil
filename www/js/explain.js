// Post-mortem analysis: why each wrong verita was wrong, what the better
// move was at that moment, and what to watch out for next time.
import {
  UNKNOWN, STAR, EMPTY, cellName, unitName, propagate, testStar, findStep,
  applyStep, REGION_NAMES, inUnit, joinCz,
} from './engine.js';

/**
 * Knowledge the player had right before a move: their (always correct)
 * verity, their crosses that were correct and locked red crosses.
 */
export function knowledgeFromSnapshot(P, snap) {
  const st = new Uint8Array(P.N);
  for (let c = 0; c < P.N; c++) {
    const v = snap.cells[c];
    if (v === 'v') st[c] = STAR;
    else if ((v === 'x' || v === 'a' || v === 'l') && !P.solMask[c]) st[c] = EMPTY;
  }
  // crossing neighbours of stars is implied knowledge
  for (let c = 0; c < P.N; c++) if (st[c] === STAR) for (const x of P.nb[c]) st[x] = EMPTY;
  return st;
}

function directConflict(P, st, c) {
  // adjacency
  for (const x of P.nb[c]) {
    if (st[x] === STAR) {
      return `Pole ${cellName(P, c)} se dotýká verity na ${cellName(P, x)}. Verity se nesmí dotýkat ani rohem.`;
    }
  }
  for (let i = 0; i < 3; i++) {
    const u = P.cellUnits[c * 3 + i];
    let s = 0;
    for (const x of P.units[u]) if (st[x] === STAR) s++;
    if (s >= P.k) {
      const have = Array.from(P.units[u]).filter((x) => st[x] === STAR).map((x) => cellName(P, x)).join(', ');
      return `${cap(unitName(P, u, 'nom'))} už ${P.k === 1 ? 'měl' + (P.unitType[u] === 'region' ? 'a' : '') + ' svou veritu' : 'měl' + (P.unitType[u] === 'region' ? 'a' : '') + ' všechny verity'} (${have}). Další se tam nevejde.`;
    }
  }
  return null;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/** Basic closure: apply full-unit crosses (no placements). */
function closeTrivial(P, st) {
  const st2 = st.slice();
  propagate(P, st2, false);
  return st2;
}

function whereItBelonged(P, c) {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < 3; i++) {
    const u = P.cellUnits[c * 3 + i];
    const sol = Array.from(P.units[u]).filter((x) => P.solMask[x]);
    const names = sol.map((x) => cellName(P, x));
    const key = names.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(`${inUnit(P, u)} ${P.k === 1 ? 'patřila verita na' : 'patřily verity na'} ${joinCz(names)}`);
  }
  return 'Správně: ' + out.join('; ') + '.';
}

/**
 * Analyse one mistake.
 * mistake = { cell, snap: { cells: [...] }, t }
 */
export function analyseMistake(P, mistake) {
  const c = mistake.cell;
  const known = knowledgeFromSnapshot(P, mistake.snap);
  const res = { cell: c, name: cellName(P, c), type: 'guess', why: '', better: '', belonged: whereItBelonged(P, c) };

  const conflict = directConflict(P, known, c);
  if (conflict) {
    res.type = 'conflict';
    res.why = conflict;
  } else {
    const closed = closeTrivial(P, known);
    const quick = testStar(P, closed, c, false);
    if (!quick.ok) {
      res.type = 'blocker';
      res.why = blockerText(P, c, quick.trace.fail);
    } else {
      const deep = testStar(P, closed, c, true);
      if (!deep.ok) {
        res.type = 'contradiction';
        const chain = deep.trace.chain.slice(0, 4).map((x) => `${cellName(P, x.cell)} (jediné volné místo ${inUnit(P, x.unit)})`);
        res.why = `Šlo to dokázat sporem: s veritou na ${cellName(P, c)} by verity musely jít na ${chain.join(', pak ')}${deep.trace.chain.length > 4 ? ' …' : ''} a ${failText(P, deep.trace.fail)}.`;
      } else {
        res.type = 'guess';
        res.why = `V tu chvíli se ${cellName(P, c)} ještě nedalo vyloučit jednoduchou úvahou – tah byl tip. Logika hry ale vždy vede k jedinému řešení, takže hádat není potřeba.`;
      }
    }
  }

  // the better move available at that moment
  const pendingTrivial = findStep(P, known, 1);
  const closed = closeTrivial(P, known);
  // skip pure crossing steps to get to something meaningful
  const st = closed.slice();
  let step = null;
  for (let guard = 0; guard < 40; guard++) {
    step = findStep(P, st, 4);
    if (!step) break;
    if (step.action === 'place' || step.level >= 2) break;
    applyStep(P, st, step);
  }
  if (step) {
    const crossedTarget = step.action === 'place' && step.cells.filter((x) => mistake.snap.cells[x] === 'x' || mistake.snap.cells[x] === 'a');
    res.better = (pendingTrivial && pendingTrivial.action === 'cross'
      ? 'Nejdřív si zakřížkuj pole, která už jsou jasná (okolí verit, plné řady). '
      : '') + step.text +
      (crossedTarget && crossedTarget.length ? ` (Ty jsi ale ${crossedTarget.map((x) => cellName(P, x)).join(', ')} omylem zakřížkoval/a – proto jsi to místo přehlédl/a.)` : '');
    res.betterStep = step;
  }
  res.known = known;
  return res;
}

function failText(P, fail) {
  if (!fail || fail.unit < 0) return 'dvě verity by se dotýkaly';
  if (fail.why === 'too-few') return `${unitName(P, fail.unit, 'nom')} by neměl${P.unitType[fail.unit] === 'region' ? 'a' : ''} kam dát ${P.k === 1 ? 'svou veritu' : 'zbývající verity'}`;
  if (fail.why === 'too-many') return `${unitName(P, fail.unit, 'nom')} by měl${P.unitType[fail.unit] === 'region' ? 'a' : ''} verit příliš`;
  return `${inUnit(P, fail.unit)} by se verity dotýkaly`;
}

function blockerText(P, c, fail) {
  return `Verita na ${cellName(P, c)} by „zabrala“ své okolí, řádek, sloupec i oblast – a ${failText(P, fail)}. ` +
    `Tohle se dalo poznat jen pohledem: pole, které vidí všechna volná místa nějaké oblasti, být veritou nemůže.`;
}

const TIPS = {
  conflict: 'Před položením verity si vždy zkontroluj 4 věci: řádek, sloupec, barevnou oblast a 8 okolních polí. Zapni si v Nastavení „Automatické křížkování“ – hra ti zakřížkuje všechno, kam už nic nepatří.',
  blocker: 'Než položíš veritu, podívej se, jestli by nevyřadila všechna volná pole nějaké oblasti nebo řady. Nejlepší začátek: najdi nejmenší oblasti a pole, která sousedí s celou oblastí.',
  contradiction: 'Když si nejsi jistý/á, zkus si veritu v duchu (nebo fixou) položit a dopočítej, co z toho plyne. Jakmile někde nezbude místo, máš důkaz, že tam verita není – a pole zakřížkuj.',
  guess: 'Nehádej. Když nevidíš jistý tah, hledej: (1) oblasti, které leží celé v jednom řádku/sloupci, (2) řady s posledními volnými poli, (3) dvojice oblastí uzavřené ve dvou řadách. Nápověda tě nic nestojí.',
  crossedSolution: 'Pozor na křížky: zakřížkoval/a jsi pole, kde verita ve skutečnosti byla. Křížek dávej jen tam, kde to umíš zdůvodnit – špatný křížek tě později dovede k chybě.',
  speed: 'Chyby přišly rychle za sebou. Zpomal – po každé chybě se zastav a podívej se, co ti chyba prozradila.',
};

/** Build the full report. game = { mistakes, cells (final), hintsUsed, elapsed } */
export function buildReport(P, game) {
  const items = game.mistakes.map((m) => analyseMistake(P, m));
  const types = new Set(items.map((i) => i.type));
  const tips = [];
  for (const t of ['conflict', 'blocker', 'contradiction', 'guess']) if (types.has(t)) tips.push(TIPS[t]);
  const crossedSol = [];
  for (let c = 0; c < P.N; c++) {
    const v = game.cells[c];
    if ((v === 'x' || v === 'a') && P.solMask[c]) crossedSol.push(c);
  }
  if (crossedSol.length) tips.push(TIPS.crossedSolution.replace('kde verita', `kde verita (${crossedSol.slice(0, 4).map((c) => cellName(P, c)).join(', ')})`));
  if (game.mistakes.length >= 2) {
    const ts = game.mistakes.map((m) => m.t);
    if (ts[ts.length - 1] - ts[0] < 20000) tips.push(TIPS.speed);
  }
  let placed = 0;
  for (let c = 0; c < P.N; c++) if (game.cells[c] === 'v') placed++;
  return { items, tips, crossedSol, placed, total: P.n * P.k };
}

export const TYPE_LABEL = {
  conflict: 'Přímý konflikt',
  blocker: 'Šlo vidět',
  contradiction: 'Šlo dokázat',
  guess: 'Tip',
};

export { REGION_NAMES };
