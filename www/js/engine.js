// Veritdoku engine: puzzle model, exhaustive solver, generator and a
// human-style logic solver that can explain every step in Czech.
// Runs both in the browser and in Node (tools/generate-levels.mjs).

export const UNKNOWN = 0, STAR = 1, EMPTY = 2;

// Region colours, ordered so the first ones are the most distinct.
// bg = cell colour, fg = darker tone for the verita body.
export const REGION_COLORS = [
  { name: 'Růžová', bg: '#f9a8d4', fg: '#ec4899' },
  { name: 'Modrá', bg: '#93c5fd', fg: '#2563eb' },
  { name: 'Zelená', bg: '#86efac', fg: '#16a34a' },
  { name: 'Žlutá', bg: '#fde68a', fg: '#eab308' },
  { name: 'Fialová', bg: '#c4b5fd', fg: '#7c3aed' },
  { name: 'Oranžová', bg: '#fdba74', fg: '#ea580c' },
  { name: 'Tyrkysová', bg: '#5eead4', fg: '#0d9488' },
  { name: 'Červená', bg: '#fca5a5', fg: '#dc2626' },
  { name: 'Šedá', bg: '#cbd5e1', fg: '#475569' },
  { name: 'Limetková', bg: '#d9f99d', fg: '#65a30d' },
  { name: 'Hnědá', bg: '#d6b48c', fg: '#92400e' },
  { name: 'Purpurová', bg: '#f0abfc', fg: '#c026d3' },
  { name: 'Nebeská', bg: '#a5f3fc', fg: '#0891b2' },
  { name: 'Bílá', bg: '#f8fafc', fg: '#64748b' },
  { name: 'Olivová', bg: '#c3c98a', fg: '#4d5a12' },
  { name: 'Indigová', bg: '#a5b4fc', fg: '#4338ca' },
  { name: 'Korálová', bg: '#fb7185', fg: '#be123c' },
  { name: 'Zlatá', bg: '#facc15', fg: '#a16207' },
  { name: 'Mátová', bg: '#bbf7d0', fg: '#059669' },
  { name: 'Ocelová', bg: '#94a3b8', fg: '#1e293b' },
];
export const REGION_NAMES = REGION_COLORS.map((c) => c.name);

function hexRgb(h) { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); }
const COLOR_DIST = REGION_COLORS.map((a) => REGION_COLORS.map((b) => {
  const [r1, g1, b1] = hexRgb(a.bg), [r2, g2, b2] = hexRgb(b.bg);
  const rm = (r1 + r2) / 2; // "redmean" perceptual approximation
  return Math.sqrt((2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - rm) / 256) * (b1 - b2) ** 2);
}));

const COL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// ---------------------------------------------------------------- random

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------- model

const geomCache = new Map();
function geometry(n) {
  if (geomCache.has(n)) return geomCache.get(n);
  const nb = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const list = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < n && cc >= 0 && cc < n) list.push(rr * n + cc);
        }
      }
      nb.push(Int16Array.from(list));
    }
  }
  const g = { nb };
  geomCache.set(n, g);
  return g;
}

/**
 * Build a puzzle context.
 * regions: array (length n*n) of region indices 0..n-1
 * solution: optional array of star cell indices
 */
export function makePuzzle(n, k, regions, solution = null, colorOf = null) {
  const N = n * n;
  const units = [];
  const unitType = [];
  const unitIdx = [];
  for (let r = 0; r < n; r++) {
    units.push(Int16Array.from({ length: n }, (_, c) => r * n + c));
    unitType.push('row'); unitIdx.push(r);
  }
  for (let c = 0; c < n; c++) {
    units.push(Int16Array.from({ length: n }, (_, r) => r * n + c));
    unitType.push('col'); unitIdx.push(c);
  }
  const regCells = Array.from({ length: n }, () => []);
  for (let i = 0; i < N; i++) regCells[regions[i]].push(i);
  for (let g = 0; g < n; g++) {
    units.push(Int16Array.from(regCells[g]));
    unitType.push('region'); unitIdx.push(g);
  }
  const cellUnits = new Int16Array(N * 3);
  for (let i = 0; i < N; i++) {
    cellUnits[i * 3] = Math.floor(i / n);
    cellUnits[i * 3 + 1] = n + (i % n);
    cellUnits[i * 3 + 2] = 2 * n + regions[i];
  }
  const P = {
    n, k, N, regions: Int8Array.from(regions), units, unitType, unitIdx, cellUnits,
    nb: geometry(n).nb, solution: solution ? Int16Array.from(solution).sort() : null,
    solMask: null,
    colorOf: colorOf ? Int8Array.from(colorOf) : Int8Array.from({ length: n }, (_, i) => i),
  };
  if (solution) {
    P.solMask = new Uint8Array(N);
    for (const c of solution) P.solMask[c] = 1;
  }
  return P;
}

export function encodePuzzle(P) {
  return {
    n: P.n, k: P.k,
    r: Array.from(P.regions, (g) => g.toString(36)).join(''),
    s: Array.from(P.solution),
    c: Array.from(P.colorOf),
  };
}

export function decodePuzzle(obj) {
  const regions = Array.from(obj.r, (ch) => parseInt(ch, 36));
  return makePuzzle(obj.n, obj.k, regions, obj.s, obj.c || null);
}

/**
 * Derive a fresh-looking variant of a stored puzzle: one of the 8 symmetries
 * of the square plus a new colour assignment. Uniqueness and difficulty stay
 * exactly the same. Returns an encoded puzzle object.
 */
export function transformPuzzle(obj, sym, colorSeed, paletteSize = REGION_NAMES.length) {
  const n = obj.n;
  const map = (r, c) => {
    switch (sym & 7) {
      case 1: return [c, n - 1 - r];
      case 2: return [n - 1 - r, n - 1 - c];
      case 3: return [n - 1 - c, r];
      case 4: return [r, n - 1 - c];
      case 5: return [n - 1 - r, c];
      case 6: return [c, r];
      case 7: return [n - 1 - c, n - 1 - r];
      default: return [r, c];
    }
  };
  const src = Array.from(obj.r, (ch) => parseInt(ch, 36));
  const reg = new Array(n * n);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const [rr, cc] = map(r, c);
    reg[rr * n + cc] = src[r * n + c];
  }
  const sol = obj.s.map((x) => { const [rr, cc] = map(Math.floor(x / n), x % n); return rr * n + cc; }).sort((a, b) => a - b);
  return { n, k: obj.k, r: reg.map((g) => g.toString(36)).join(''), s: sol, c: assignColors(n, reg, colorSeed, paletteSize) };
}

/** Pick region colours so that touching regions look as different as possible. */
export function assignColors(n, reg, seed, paletteSize = REGION_COLORS.length) {
  const rng = mulberry32(seed);
  const adj = new Set();
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n), c = i % n;
    for (const j of [r + 1 < n ? i + n : -1, c + 1 < n ? i + 1 : -1, r + 1 < n && c + 1 < n ? i + n + 1 : -1, r + 1 < n && c > 0 ? i + n - 1 : -1]) {
      if (j >= 0 && reg[i] !== reg[j]) adj.add(Math.min(reg[i], reg[j]) * 64 + Math.max(reg[i], reg[j]));
    }
  }
  const pairs = [...adj].map((x) => [Math.floor(x / 64), x % 64]);
  // use the most distinct colours first (with a little variety)
  const poolSize = Math.min(paletteSize, Math.max(n, Math.min(paletteSize, n + 3)));
  let best = null, bestScore = -1;
  for (let t = 0; t < 400; t++) {
    const pool = shuffle(Array.from({ length: poolSize }, (_, i) => i), rng).slice(0, n);
    let worst = Infinity, sum = 0;
    for (const [a, b] of pairs) { const d = COLOR_DIST[pool[a]][pool[b]]; if (d < worst) worst = d; sum += d; }
    const score = worst * 1000 + sum / Math.max(1, pairs.length);
    if (score > bestScore) { bestScore = score; best = pool; }
  }
  return best;
}

// ---------------------------------------------------------------- naming

export function cellName(P, c) {
  return COL_LETTERS[c % P.n] + (Math.floor(c / P.n) + 1);
}

export function unitName(P, u, form = 'nom') {
  const t = P.unitType[u], i = P.unitIdx[u];
  if (t === 'row') return (form === 'loc' ? 'řádku ' : form === 'acc' ? 'řádek ' : 'řádek ') + (i + 1);
  if (t === 'col') return (form === 'loc' ? 'sloupci ' : 'sloupec ') + COL_LETTERS[i];
  const name = REGION_NAMES[P.colorOf ? P.colorOf[i] : i] || ('#' + (i + 1));
  if (form === 'loc') return 'oblasti ' + name.replace(/á$/, 'é');
  if (form === 'acc') return 'oblast ' + name.replace(/á$/, 'ou');
  return 'oblast ' + name;
}

/** "v řádku 3" / "ve sloupci B" / "v oblasti Modré" */
export function inUnit(P, u) {
  return (P.unitType[u] === 'col' ? 've ' : 'v ') + unitName(P, u, 'loc');
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function plural(n, one, few, many) {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

export function versText(k) { return k === 1 ? 'jedna verita' : `${k} verity`; }

// ---------------------------------------------------------------- core rules

/** Place a star (and cross its neighbours). Returns false on contradiction. */
export function setStar(P, st, c) {
  if (st[c] === EMPTY) return false;
  if (st[c] === STAR) return true;
  const nb = P.nb[c];
  for (let i = 0; i < nb.length; i++) if (st[nb[i]] === STAR) return false;
  st[c] = STAR;
  for (let i = 0; i < nb.length; i++) st[nb[i]] = EMPTY;
  return true;
}

/**
 * Repeatedly apply the basic rules:
 *  - a unit with k stars: all other cells empty
 *  - a unit whose unknown cells are exactly what it still needs: all stars
 * If `fills` is false only the first rule runs.
 * If `trace` is given, forced placements and the failing unit are recorded.
 */
export function propagate(P, st, fills = true, trace = null) {
  const { units, k } = P;
  let changed = true;
  while (changed) {
    changed = false;
    for (let u = 0; u < units.length; u++) {
      const cells = units[u];
      let s = 0, unk = 0;
      for (let i = 0; i < cells.length; i++) {
        const v = st[cells[i]];
        if (v === STAR) s++; else if (v === UNKNOWN) unk++;
      }
      if (s > k || s + unk < k) {
        if (trace) trace.fail = { unit: u, stars: s, unk, why: s > k ? 'too-many' : 'too-few' };
        return false;
      }
      if (unk === 0) continue;
      if (s === k) {
        for (let i = 0; i < cells.length; i++) if (st[cells[i]] === UNKNOWN) st[cells[i]] = EMPTY;
        changed = true;
      } else if (fills && s + unk === k) {
        for (let i = 0; i < cells.length; i++) {
          const c = cells[i];
          if (st[c] !== UNKNOWN) continue;
          if (!setStar(P, st, c)) {
            if (trace) trace.fail = { unit: u, stars: s, unk, why: 'touch', cell: c };
            return false;
          }
          if (trace) trace.chain.push({ cell: c, unit: u });
        }
        changed = true;
      }
    }
  }
  return true;
}

/**
 * Extra pruning used only by the exhaustive solver (not explained to players):
 *  - a line can hold at most as many stars as its open cells allow without touching
 *  - two neighbouring lines split into 2x2 blocks; each block holds at most one star
 */
function strongCheck(P, st) {
  const { n, k } = P;
  // max non-touching stars per line
  for (let dir = 0; dir < 2; dir++) {
    const sa = dir === 0 ? n : 1, sb = dir === 0 ? 1 : n;
    for (let r = 0; r < n; r++) {
      let cnt = 0, last = -5;
      for (let i = 0; i < n; i++) {
        const v = st[r * sa + i * sb];
        if (v === STAR || (v === UNKNOWN && i - last >= 2)) { cnt++; last = i; }
      }
      if (cnt < k) return false;
    }
  }
  if (k < 2) return true;
  // 2x2 blocks over pairs of neighbouring lines
  for (let dir = 0; dir < 2; dir++) {
    const sa = dir === 0 ? n : 1, sb = dir === 0 ? 1 : n;
    for (let r = 0; r + 1 < n; r++) {
      const base0 = r * sa, base1 = (r + 1) * sa;
      let need = 2 * k;
      for (let i = 0; i < n; i++) {
        if (st[base0 + i * sb] === STAR) need--;
        if (st[base1 + i * sb] === STAR) need--;
      }
      if (need <= 0) continue;
      for (let off = 0; off < 2; off++) {
        let avail = 0;
        for (let b = -off; b < n; b += 2) {
          let star = false, open = false;
          const lo = b < 0 ? 0 : b, hi = b + 2 > n ? n : b + 2;
          for (let i = lo; i < hi; i++) {
            const x = st[base0 + i * sb], y = st[base1 + i * sb];
            if (x === STAR || y === STAR) star = true;
            else if (x === UNKNOWN || y === UNKNOWN) open = true;
          }
          if (open && !star) avail++;
        }
        if (avail < need) return false;
      }
    }
  }
  return true;
}

/** Exhaustive solver. Returns { count, solutions } (stops at `limit`). */
export function solve(P, limit = 2, start = null, nodeBudget = Infinity) {
  const res = { count: 0, solutions: [], nodes: 0, aborted: false };
  const { units, k } = P;
  const st0 = start ? Uint8Array.from(start) : new Uint8Array(P.N);
  // stars already in start must have crossed neighbours
  if (start) {
    for (let c = 0; c < P.N; c++) if (st0[c] === STAR) { st0[c] = UNKNOWN; if (!setStar(P, st0, c)) return res; }
  }
  function rec(st) {
    if (res.count >= limit || res.aborted) return;
    if (++res.nodes > nodeBudget) { res.aborted = true; return; }
    if (!propagate(P, st) || !strongCheck(P, st)) return;
    let best = -1, bestScore = 1e9;
    for (let u = 0; u < units.length; u++) {
      const cells = units[u];
      let s = 0, unk = 0;
      for (let i = 0; i < cells.length; i++) {
        const v = st[cells[i]];
        if (v === STAR) s++; else if (v === UNKNOWN) unk++;
      }
      if (s < k && unk < bestScore) { bestScore = unk; best = u; }
    }
    if (best < 0) {
      res.count++;
      const sol = [];
      for (let c = 0; c < P.N; c++) if (st[c] === STAR) sol.push(c);
      res.solutions.push(sol);
      return;
    }
    // binary branch on the first open cell of the most constrained unit
    const cells = units[best];
    let c = -1;
    for (let i = 0; i < cells.length; i++) if (st[cells[i]] === UNKNOWN) { c = cells[i]; break; }
    const st2 = st.slice();
    if (setStar(P, st2, c)) rec(st2);
    if (res.count >= limit || res.aborted) return;
    st[c] = EMPTY;
    rec(st);
  }
  rec(st0);
  return res;
}

// ---------------------------------------------------------------- logic solver (explainable)

/*
 * Every step: {
 *   tech: string id, level: 0..5, action: 'place'|'cross',
 *   cells: [cell indices to place/cross],
 *   focus: [cells to highlight as the "reason"],
 *   units: [unit ids involved],
 *   title: short Czech title, text: full Czech explanation
 * }
 */

export const TECH_INFO = {
  'last-cells': { level: 1, title: 'Jediná možná místa' },
  'full-unit': { level: 0, title: 'Plná řada / oblast' },
  'neighbors': { level: 0, title: 'Verity se nedotýkají' },
  'confine': { level: 2, title: 'Uzavření do řady' },
  'confine-multi': { level: 3, title: 'Uzavření více oblastí' },
  'blocker': { level: 2, title: 'Pole, které by vše zablokovalo' },
  'contradiction': { level: 4, title: 'Důkaz sporem' },
  'reveal': { level: 5, title: 'Odhalení pole' },
};

function unitStats(P, st, u) {
  const cells = P.units[u];
  let s = 0; const unk = [];
  for (let i = 0; i < cells.length; i++) {
    const v = st[cells[i]];
    if (v === STAR) s++; else if (v === UNKNOWN) unk.push(cells[i]);
  }
  return { s, unk };
}

function listCells(P, cells, max = 6) {
  const names = cells.slice(0, max).map((c) => cellName(P, c));
  let t = names.join(', ');
  if (cells.length > max) t += ` a dalších ${cells.length - max}`;
  return t;
}

function stepLastCells(P, st) {
  const { k } = P;
  // Prefer regions, then rows/cols – feels most natural for players.
  const order = [];
  for (let u = 2 * P.n; u < 3 * P.n; u++) order.push(u);
  for (let u = 0; u < 2 * P.n; u++) order.push(u);
  for (const u of order) {
    const { s, unk } = unitStats(P, st, u);
    if (unk.length > 0 && s < k && s + unk.length === k) {
      const need = k - s;
      const where = cap(inUnit(P, u));
      const text = need === 1
        ? `${where} zbývá jediné volné pole – ${cellName(P, unk[0])}. Verita tam tedy musí být.`
        : `${where} chybí ještě ${need} verity a volná pole jsou přesně ${need}: ${listCells(P, unk)}. Všechna musí být verity.`;
      return { tech: 'last-cells', action: 'place', cells: unk, focus: Array.from(P.units[u]), units: [u], text };
    }
  }
  return null;
}

function stepFullUnit(P, st) {
  const { k } = P;
  for (let u = 0; u < P.units.length; u++) {
    const { s, unk } = unitStats(P, st, u);
    if (s === k && unk.length) {
      const text = `${cap(unitName(P, u, 'nom'))} už má ${k === 1 ? 'svou veritu' : `všechny ${k} verity`}. Ostatní pole ${inUnit(P, u)} můžeš zakřížkovat.`;
      return { tech: 'full-unit', action: 'cross', cells: unk, focus: Array.from(P.units[u]).filter((c) => st[c] === STAR), units: [u], text };
    }
  }
  return null;
}

function stepNeighbors(P, st) {
  for (let c = 0; c < P.N; c++) {
    if (st[c] !== STAR) continue;
    const cells = Array.from(P.nb[c]).filter((x) => st[x] === UNKNOWN);
    if (cells.length) {
      const text = `Verity se nesmí dotýkat ani rohem. Všech 8 polí kolem verity na ${cellName(P, c)} proto můžeš zakřížkovat.`;
      return { tech: 'neighbors', action: 'cross', cells, focus: [c], units: [], text };
    }
  }
  return null;
}

function* combinations(arr, m, start = 0, acc = []) {
  if (acc.length === m) { yield acc.slice(); return; }
  for (let i = start; i <= arr.length - (m - acc.length); i++) {
    acc.push(arr[i]);
    yield* combinations(arr, m, i + 1, acc);
    acc.pop();
  }
}

function stepConfine(P, st, maxM) {
  const { n, k } = P;
  const fams = { row: [], col: [], region: [] };
  for (let u = 0; u < P.units.length; u++) fams[P.unitType[u]].push(u);
  const pairs = [['region', 'row'], ['region', 'col'], ['row', 'region'], ['col', 'region'], ['row', 'col'], ['col', 'row']];
  const stats = P.units.map((_, u) => unitStats(P, st, u));
  const famOf = (type, c) => (type === 'row' ? Math.floor(c / n) : type === 'col' ? n + (c % n) : 2 * n + P.regions[c]);
  for (let m = 1; m <= maxM; m++) {
    for (const [A, B] of pairs) {
      const open = fams[A].filter((u) => stats[u].s < k);
      if (open.length < m) continue;
      for (const S of combinations(open, m)) {
        const needS = S.reduce((a, u) => a + (k - stats[u].s), 0);
        const T = new Set();
        for (const u of S) for (const c of stats[u].unk) T.add(famOf(B, c));
        if (T.size > m) continue;
        let needT = 0;
        for (const t of T) needT += k - stats[t].s;
        if (needT !== needS) continue;
        const inS = new Set(S);
        const cells = [];
        for (const t of T) for (const c of stats[t].unk) if (!inS.has(famOf(A, c))) cells.push(c);
        if (!cells.length) continue;
        const Tarr = [...T].sort((a, b) => a - b);
        const focus = [];
        for (const u of S) focus.push(...stats[u].unk);
        const sNames = S.map((u) => unitName(P, u, 'acc'));
        const tNames = Tarr.map((u) => unitName(P, u, 'nom'));
        let text;
        if (m === 1) {
          text = `Všechna volná pole, kde může ležet ${k === 1 ? 'verita' : 'zbývající verity'} pro ${sNames[0]}, leží ${inUnit(P, Tarr[0])}. ` +
            `${cap(unitName(P, Tarr[0], 'nom'))} tedy ${k === 1 ? 'svou veritu' : 'své verity'} musí mít právě na těchto polích – ostatní volná pole ${inUnit(P, Tarr[0])} (${listCells(P, cells)}) můžeš zakřížkovat.`;
        } else {
          text = `${cap(joinCz(S.map((u) => unitName(P, u, 'nom'))))} mají všechna svá volná pole jen v těchto řadách/oblastech: ${joinCz(tNames)}. ` +
            `Ty proto musí své verity dostat právě od nich – ostatní pole v nich (${listCells(P, cells)}) jsou prázdná.`;
        }
        return { tech: m === 1 ? 'confine' : 'confine-multi', action: 'cross', cells, focus, units: [...S, ...Tarr], text };
      }
    }
  }
  return null;
}

export function joinCz(list) {
  if (list.length <= 1) return list.join('');
  return list.slice(0, -1).join(', ') + ' a ' + list[list.length - 1];
}

/** Try "what if a star were here" with/without follow-up fills. */
export function testStar(P, st, c, fills) {
  const st2 = st.slice();
  const trace = { chain: [], fail: null };
  if (!setStar(P, st2, c)) return { ok: false, trace: { chain: [], fail: { why: 'touch', unit: -1 } } };
  const ok = propagate(P, st2, fills, trace);
  return { ok, trace };
}

function describeFail(P, fail) {
  if (!fail || fail.unit < 0) return 'by se dvě verity dotýkaly';
  const u = fail.unit;
  if (fail.why === 'too-few') {
    return fail.unk === 0 && fail.stars === 0
      ? `by ${inUnit(P, u)} nezbylo žádné volné pole pro veritu`
      : `by ${inUnit(P, u)} nezbylo dost volných polí (chybí ${P.k - fail.stars}, volných ${fail.unk})`;
  }
  if (fail.why === 'too-many') return `by ${unitName(P, u, 'nom')} měl${P.unitType[u] === 'region' ? 'a' : ''} příliš mnoho verit`;
  return `by se ${inUnit(P, u)} musely dotýkat dvě verity`;
}

function stepBlocker(P, st, fills, batch = false) {
  if (batch) {
    // fast path for rating: collect every provable cell in one sweep
    const cells = [];
    for (let c = 0; c < P.N; c++) {
      if (st[c] !== UNKNOWN) continue;
      const st2 = st.slice();
      if (!setStar(P, st2, c) || !propagate(P, st2, fills)) cells.push(c);
    }
    if (!cells.length) return null;
    return { tech: fills ? 'contradiction' : 'blocker', action: 'cross', cells, focus: [], units: [], text: '' };
  }
  for (let c = 0; c < P.N; c++) {
    if (st[c] !== UNKNOWN) continue;
    const t = testStar(P, st, c, fills);
    if (t.ok) continue;
    let text;
    const failTxt = describeFail(P, t.trace.fail);
    if (!fills || !t.trace.chain.length) {
      text = `Kdyby verita byla na ${cellName(P, c)}, vyřadila by okolní pole i zbytek svých řad – a pak ${failTxt}. Pole ${cellName(P, c)} je tedy prázdné.`;
    } else {
      const chain = t.trace.chain.slice(0, 4).map((x) => `${cellName(P, x.cell)} (jediné místo ${inUnit(P, x.unit)})`);
      text = `Zkus si představit veritu na ${cellName(P, c)}. Pak by verity musely přijít na ${chain.join(', pak ')}${t.trace.chain.length > 4 ? ' …' : ''} – a nakonec ${failTxt}. To je spor, takže ${cellName(P, c)} je prázdné.`;
    }
    const focus = [c, ...t.trace.chain.map((x) => x.cell)];
    const units = t.trace.fail && t.trace.fail.unit >= 0 ? [t.trace.fail.unit] : [];
    return { tech: fills ? 'contradiction' : 'blocker', action: 'cross', cells: [c], focus, units, text };
  }
  return null;
}

/**
 * Find the easiest next logical step from knowledge state `st`.
 * maxLevel limits techniques (5 = allow revealing a solution cell).
 */
export function findStep(P, st, maxLevel = 5, batch = false) {
  const fns = [
    () => stepLastCells(P, st),
    () => stepFullUnit(P, st),
    () => stepNeighbors(P, st),
    () => (maxLevel >= 2 ? stepConfine(P, st, 1) : null),
    () => (maxLevel >= 2 ? stepBlocker(P, st, false, batch) : null),
    () => (maxLevel >= 3 ? stepConfine(P, st, P.k === 1 ? 3 : 2) : null),
    () => (maxLevel >= 4 ? stepBlocker(P, st, true, batch) : null),
  ];
  for (const f of fns) {
    const s = f();
    if (s) {
      s.level = TECH_INFO[s.tech].level;
      s.title = TECH_INFO[s.tech].title;
      return s;
    }
  }
  if (maxLevel >= 5 && P.solMask) {
    for (let c = 0; c < P.N; c++) {
      if (st[c] === UNKNOWN && P.solMask[c]) {
        return {
          tech: 'reveal', level: 5, title: TECH_INFO.reveal.title, action: 'place', cells: [c], focus: [c], units: [],
          text: `Tady už jednoduché úvahy nestačí. Prozradím ti jedno správné pole: verita patří na ${cellName(P, c)}.`,
        };
      }
    }
  }
  return null;
}

/** Apply a step to a knowledge state (in place). */
export function applyStep(P, st, step) {
  for (const c of step.cells) {
    if (step.action === 'place') setStar(P, st, c);
    else if (st[c] === UNKNOWN) st[c] = EMPTY;
  }
}

/** Solve purely by logic. Returns { solved, maxLevel, steps, levelCounts }. */
export function logicSolve(P, maxLevel = 4, start = null, keepSteps = false) {
  const st = start ? Uint8Array.from(start) : new Uint8Array(P.N);
  const steps = [];
  const levelCounts = [0, 0, 0, 0, 0, 0];
  let maxUsed = 0;
  for (let guard = 0; guard < P.N * 4; guard++) {
    if (isSolvedState(P, st)) break;
    const step = findStep(P, st, maxLevel, !keepSteps);
    if (!step) return { solved: false, maxLevel: maxUsed, steps, levelCounts, state: st };
    levelCounts[step.level]++;
    if (step.level > maxUsed) maxUsed = step.level;
    if (keepSteps) steps.push(step);
    applyStep(P, st, step);
  }
  return { solved: isSolvedState(P, st), maxLevel: maxUsed, steps, levelCounts, state: st };
}

export function isSolvedState(P, st) {
  let stars = 0;
  for (let c = 0; c < P.N; c++) if (st[c] === STAR) stars++;
  return stars === P.n * P.k;
}

// ---------------------------------------------------------------- generator

function randomSolution(n, k, rng) {
  // Row by row, choose k non-adjacent columns, no vertical/diagonal touching.
  const opts = [];
  (function build(start, acc) {
    if (acc.length === k) { opts.push(acc.slice()); return; }
    for (let c = start; c < n; c++) { acc.push(c); build(c + 2, acc); acc.pop(); }
  })(0, []);
  const colCnt = new Int8Array(n);
  const rows = [];
  let budget = 20000;
  function ok(opt, prev, rowsLeft) {
    for (const c of opt) {
      if (colCnt[c] >= k) return false;
      if (prev) for (const p of prev) if (Math.abs(p - c) <= 1) return false;
    }
    return true;
  }
  function rec(r) {
    if (--budget < 0) return false;
    if (r === n) return true;
    const prev = r ? rows[r - 1] : null;
    const order = shuffle(opts.slice(), rng);
    for (const opt of order) {
      if (!ok(opt, prev)) continue;
      for (const c of opt) colCnt[c]++;
      // prune: each column still needs (k - cnt) stars in (n-r-1) rows, non-adjacent vertically
      const left = n - r - 1;
      let feasible = true;
      for (let c = 0; c < n; c++) {
        if (k - colCnt[c] > Math.ceil(left / 2) + (left > 0 && !opt.includes(c) ? 0 : 0)) { feasible = false; break; }
      }
      if (feasible) {
        rows.push(opt);
        if (rec(r + 1)) return true;
        rows.pop();
      }
      for (const c of opt) colCnt[c]--;
      if (budget < 0) return false;
    }
    return false;
  }
  if (!rec(0)) return null;
  const sol = [];
  rows.forEach((opt, r) => opt.forEach((c) => sol.push(r * n + c)));
  return sol;
}

function bfsPath(n, from, to, blocked) {
  const N = n * n;
  const prev = new Int32Array(N).fill(-1);
  prev[from] = from;
  const q = [from];
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi];
    if (c === to) break;
    const r = Math.floor(c / n), cc = c % n;
    const nbs = [];
    if (r > 0) nbs.push(c - n);
    if (r < n - 1) nbs.push(c + n);
    if (cc > 0) nbs.push(c - 1);
    if (cc < n - 1) nbs.push(c + 1);
    for (const x of nbs) {
      if (prev[x] !== -1) continue;
      if (x !== to && blocked[x]) continue;
      prev[x] = c;
      q.push(x);
    }
  }
  if (prev[to] === -1) return null;
  const path = [];
  for (let c = to; c !== from; c = prev[c]) path.push(c);
  path.push(from);
  return path;
}

function orthNeighbors(n, c) {
  const r = Math.floor(c / n), cc = c % n, out = [];
  if (r > 0) out.push(c - n);
  if (r < n - 1) out.push(c + n);
  if (cc > 0) out.push(c - 1);
  if (cc < n - 1) out.push(c + 1);
  return out;
}

function growRegions(n, k, sol, rng) {
  const N = n * n;
  const reg = new Int8Array(N).fill(-1);
  const isStar = new Uint8Array(N);
  for (const c of sol) isStar[c] = 1;
  if (k === 1) {
    shuffle(sol.slice(), rng).forEach((c, g) => { reg[c] = g; });
  } else {
    // group k stars into each region, joining them with shortest paths
    const free = new Set(sol);
    const order = shuffle(sol.slice(), rng);
    let g = 0;
    for (const a of order) {
      if (!free.has(a)) continue;
      free.delete(a);
      reg[a] = g;
      const members = [a];
      for (let m = 1; m < k; m++) {
        const dist = (b) => Math.min(...members.map((x) => Math.abs(Math.floor(b / n) - Math.floor(x / n)) + Math.abs((b % n) - (x % n))));
        const cands = [...free].map((b) => ({ b, d: dist(b) + rng() * 1.5 })).sort((x, y) => x.d - y.d);
        let done = false;
        for (const { b } of cands.slice(0, 4)) {
          const blocked = new Uint8Array(N);
          for (let i = 0; i < N; i++) if ((reg[i] >= 0 && reg[i] !== g) || (isStar[i] && i !== b && reg[i] !== g)) blocked[i] = 1;
          // path from the nearest member
          const from = members.slice().sort((x, y) => (Math.abs(Math.floor(b / n) - Math.floor(x / n)) + Math.abs((b % n) - (x % n))) - (Math.abs(Math.floor(b / n) - Math.floor(y / n)) + Math.abs((b % n) - (y % n))))[0];
          const path = bfsPath(n, from, b, blocked);
          if (!path) continue;
          for (const c of path) reg[c] = g;
          free.delete(b);
          members.push(b);
          done = true;
          break;
        }
        if (!done) return null;
      }
      g++;
    }
  }
  // random multi-source growth, favouring small regions
  const size = new Int32Array(n);
  for (let i = 0; i < N; i++) if (reg[i] >= 0) size[reg[i]]++;
  let remaining = 0;
  for (let i = 0; i < N; i++) if (reg[i] < 0) remaining++;
  const appetite = Float64Array.from({ length: n }, () => 0.25 + rng() * rng() * 3);
  let guard = N * 50;
  while (remaining > 0 && guard-- > 0) {
    // pick a region weighted towards smaller sizes
    const frontier = [];
    for (let i = 0; i < N; i++) {
      if (reg[i] >= 0) continue;
      for (const x of orthNeighbors(n, i)) if (reg[x] >= 0) { frontier.push([i, reg[x]]); }
    }
    if (!frontier.length) return null;
    let total = 0;
    const w = frontier.map(([, g]) => { const v = appetite[g] / (1 + size[g]) ** 1.3; total += v; return v; });
    let pick = rng() * total, idx = 0;
    while (pick > w[idx] && idx < w.length - 1) { pick -= w[idx]; idx++; }
    const [cell, g] = frontier[idx];
    reg[cell] = g; size[g]++; remaining--;
  }
  return remaining ? null : Array.from(reg);
}

function regionConnectedWithout(n, reg, g, removed) {
  const cells = [];
  for (let i = 0; i < reg.length; i++) if (reg[i] === g && i !== removed) cells.push(i);
  if (!cells.length) return false;
  const seen = new Set([cells[0]]);
  const q = [cells[0]];
  for (let qi = 0; qi < q.length; qi++) {
    for (const x of orthNeighbors(n, q[qi])) {
      if (x !== removed && reg[x] === g && !seen.has(x)) { seen.add(x); q.push(x); }
    }
  }
  return seen.size === cells.length;
}

function knownCount(st) {
  let x = 0;
  for (let i = 0; i < st.length; i++) if (st[i] !== UNKNOWN) x++;
  return x;
}

/**
 * Reshape regions until the puzzle is solvable by pure logic (techniques up to
 * maxLevel). Every logic step is sound, so a fully solved puzzle is unique.
 * Hill climbing: while solutions can be counted cheaply we minimise their
 * number, otherwise (and once unique) we maximise how far the logic solver
 * gets. Every move transfers one non-solution cell to a neighbouring region,
 * so the intended solution always stays valid.
 */
function logicify(n, k, reg, sol, rng, maxLevel, maxIter, tries = 10) {
  const solSet = new Set(sol);
  const key = sol.slice().sort((a, b) => a - b).join(',');
  const CAP = k === 1 ? 64 : 256;
  const budget = k === 1 ? 20000 : 12000;
  const countFrac = k === 1 ? 1 : 0.5;
  // Move cell c (never a solution cell) into a neighbouring region. If that
  // would split c's region, the piece cut off from the region's solution
  // stars moves along with it. Returns the list of [cell, oldRegion] or null.
  const tryMove = (c) => {
    const g = reg[c];
    const targets = [...new Set(orthNeighbors(n, c).map((x) => reg[x]).filter((x) => x !== g))];
    if (!targets.length) return null;
    const t = targets[Math.floor(rng() * targets.length)];
    const moved = [c];
    if (!regionConnectedWithout(n, reg, g, c)) {
      // flood from the region's solution stars; everything unreached moves with c
      const seen = new Set();
      const q = sol.filter((x) => reg[x] === g);
      q.forEach((x) => seen.add(x));
      for (let qi = 0; qi < q.length; qi++) {
        for (const y of orthNeighbors(n, q[qi])) if (y !== c && reg[y] === g && !seen.has(y)) { seen.add(y); q.push(y); }
      }
      // the region's own stars must stay connected to each other
      const stars = sol.filter((x) => reg[x] === g);
      const s0 = new Set([stars[0]]), q0 = [stars[0]];
      for (let qi = 0; qi < q0.length; qi++) {
        for (const y of orthNeighbors(n, q0[qi])) if (y !== c && reg[y] === g && !s0.has(y)) { s0.add(y); q0.push(y); }
      }
      if (stars.some((x) => !s0.has(x))) return null;
      for (let i = 0; i < reg.length; i++) if (reg[i] === g && i !== c && !seen.has(i)) moved.push(i);
      if (moved.length > Math.max(4, n)) return null;
    }
    const undo = moved.map((x) => [x, reg[x]]);
    for (const x of moved) reg[x] = t;
    return undo;
  };
  const revert = (undo) => { for (const [x, g] of undo) reg[x] = g; };
  // Logic first (cheap, sound); then count the remaining solutions starting
  // from the logic state, which keeps the exhaustive search small.
  const evaluate = () => {
    const P = makePuzzle(n, k, reg, sol);
    const lr = logicSolve(P, maxLevel);
    if (lr.solved) return { solved: true, lr };
    const unknown = P.N - knownCount(lr.state);
    // counting is only cheap once logic has decided most of the grid
    const r = unknown <= P.N * countFrac ? solve(P, CAP, lr.state, budget) : { aborted: true, count: 0, solutions: [] };
    // fewer solutions first; how far logic gets breaks ties (and guides us
    // while the remaining search is still too big to count)
    const score = (r.aborted ? -1e5 : -1000 * r.count) + knownCount(lr.state);
    return { score, lr, counted: r };
  };
  let cur = evaluate();
  if (cur.solved) return { reg, rating: cur.lr };
  let bestScore = cur.score, bestIter = 0;
  const stall = k === 1 ? 40 : 25;
  for (let iter = 0; iter < maxIter; iter++) {
    let ordered = [];
    let sols = cur.counted ? cur.counted.solutions : [];
    if (sols.length < 2 && cur.lr) {
      // too many solutions to count: still sample a few to aim the moves
      sols = solve(makePuzzle(n, k, reg, sol), 8, cur.lr.state, 3000).solutions;
    }
    if (sols.length) {
      const freq = new Map();
      for (const s of sols) {
        if (s.join(',') === key) continue;
        for (const c of s) if (!solSet.has(c)) freq.set(c, (freq.get(c) || 0) + 1);
      }
      ordered = [...freq.entries()].map((e) => [e[0], e[1] + rng()]).sort((a, b) => b[1] - a[1]).map((e) => e[0]);
    }
    const pool = [];
    const st = cur.lr ? cur.lr.state : null;
    for (let c = 0; c < n * n; c++) {
      if (solSet.has(c) || (st && st[c] !== UNKNOWN)) continue;
      if (orthNeighbors(n, c).some((x) => reg[x] !== reg[c])) pool.push(c);
    }
    ordered.push(...shuffle(pool, rng));
    let best = null, tested = 0;
    for (const c of ordered) {
      if (tested >= tries) break;
      const undo = tryMove(c);
      if (!undo) continue;
      tested++;
      const after = undo.map(([x]) => [x, reg[x]]);
      const e = evaluate();
      if (e.solved) return { reg, rating: e.lr };
      revert(undo);
      e.score += rng() * 0.9;
      if (!best || e.score > best.e.score) best = { after, e };
    }
    if (!best) return null;
    for (const [x, g] of best.after) reg[x] = g;
    cur = best.e;
    // give up on this layout when we stop making progress
    if (cur.score > bestScore + 1) { bestScore = cur.score; bestIter = iter; } else if (iter - bestIter > stall) return null;
  }
  return null;
}

/**
 * Generate a unique, logic-solvable puzzle. Returns { P, rating } or null.
 * accept(rating) decides whether the logic difficulty suits the level.
 */
export function generatePuzzle(n, k, seed, { maxLevel = 4, accept = () => true, maxTries = 12, maxIter = 300 } = {}) {
  const rng = mulberry32(seed);
  for (let t = 0; t < maxTries; t++) {
    const sol = randomSolution(n, k, rng);
    if (!sol) continue;
    const reg = growRegions(n, k, sol, rng);
    if (!reg) continue;
    const out = logicify(n, k, reg, sol, rng, maxLevel, maxIter);
    if (!out) continue;
    if (!accept(out.rating)) continue;
    return { P: makePuzzle(n, k, out.reg, sol), rating: out.rating };
  }
  return null;
}

// ---------------------------------------------------------------- levels

/** Grid size, stars per unit and target logic difficulty for level 1..100. */
export function levelParams(level) {
  const L = Math.max(1, Math.min(100, level | 0));
  let n, k;
  if (L <= 6) { n = 5; k = 1; }
  else if (L <= 14) { n = 6; k = 1; }
  else if (L <= 22) { n = 7; k = 1; }
  else if (L <= 31) { n = 8; k = 1; }
  else if (L <= 40) { n = 9; k = 1; }
  else if (L <= 50) { n = 10; k = 1; }
  else if (L <= 60) { n = 11; k = 1; }
  else if (L <= 68) { n = 10; k = 2; }
  else if (L <= 76) { n = 11; k = 2; }
  else if (L <= 84) { n = 12; k = 2; }
  else if (L <= 92) { n = 12; k = 3; }
  else { n = 13; k = 3; }
  // target maximum technique level the puzzle may need
  let maxTech;
  if (L <= 8) maxTech = 1;
  else if (L <= 25) maxTech = 2;
  else if (L <= 45) maxTech = 3;
  else maxTech = 4;
  // minimum technique level, so later levels are not trivial
  let minTech = 0;
  if (L >= 30) minTech = 2;
  if (L >= 52) minTech = 3;
  if (L >= 85) minTech = 4;
  const tier = L <= 15 ? 'Lehká' : L <= 35 ? 'Střední' : L <= 60 ? 'Těžká' : L <= 85 ? 'Expert' : L < 100 ? 'Mistr' : 'ULTRA';
  return { level: L, n, k, maxTech, minTech, tier, stars: n * k };
}

export function acceptFor(params) {
  return (rating) => rating.maxLevel <= params.maxTech && rating.maxLevel >= Math.min(params.minTech, params.maxTech);
}
export const _internals = { randomSolution, growRegions, logicify };
