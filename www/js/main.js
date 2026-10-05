import {
  decodePuzzle, transformPuzzle, levelParams, generatePuzzle, encodePuzzle, findStep, applyStep, logicSolve,
  cellName, STAR, EMPTY, REGION_COLORS,
} from './engine.js';
import { buildReport, knowledgeFromSnapshot, TYPE_LABEL } from './explain.js';
import { Ink } from './ink.js';

// ------------------------------------------------------------------ constants

const PALETTE = REGION_COLORS.map((c) => c.bg);
const VCOLOR = REGION_COLORS.map((c) => c.fg);
const MAX_LIVES = 3;
const DOUBLE_TAP_MS = 320;

// ------------------------------------------------------------------ storage

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('vd:' + key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('vd:' + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  },
  del(key) { try { localStorage.removeItem('vd:' + key); } catch { /* ignore */ } },
};

const settings = Object.assign({ autoCross: true, haptics: true, showCoords: false, timer: true }, store.get('settings', {}));
const progress = store.get('progress', {}); // level -> { stars, best, wins, solver }
const attempts = store.get('attempts', {}); // level -> number of grids started
const saveSettings = () => store.set('settings', settings);
const saveProgress = () => { store.set('progress', progress); store.set('attempts', attempts); };

// ------------------------------------------------------------------ helpers

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const fmtTime = (ms) => { const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}`; };
const vibrate = (p) => { if (settings.haptics && navigator.vibrate) try { navigator.vibrate(p); } catch { /* ignore */ } };
const escapeHtml = (s) => String(s).replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));

function verita(colorIdx, cls = 'v') {
  return `<svg class="${cls}" style="--vc:${VCOLOR[colorIdx % VCOLOR.length]}"><use href="#v${colorIdx % 8}"/></svg>`;
}

let toastTimer = 0;
function toast(msg, bad = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('bad', bad);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ------------------------------------------------------------------ screens & back button

let currentScreen = 'home';
function show(name, push = true) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
  currentScreen = name;
  $('#toast').classList.remove('show');
  if (push) history.pushState({ screen: name }, '');
  if (name === 'home') renderHome();
  if (name === 'levels') renderLevels();
}
window.addEventListener('popstate', (e) => {
  if (!$('#modal').hidden) { closeModal(); history.pushState({ screen: currentScreen }, ''); return; }
  const target = (e.state && e.state.screen) || 'home';
  if (currentScreen === 'game') { pauseGame(); }
  if (currentScreen === 'report' || target === 'report' || target === 'game' && !game) { show('home', false); return; }
  show(target, false);
  if (target === 'game') resumeGame();
});
document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => history.back()));

function openModal(html, onMount) {
  $('#modal-card').innerHTML = html;
  $('#modal').hidden = false;
  if (onMount) onMount($('#modal-card'));
}
function closeModal() { $('#modal').hidden = true; $('#modal-card').innerHTML = ''; }
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && !$('#modal').dataset.locked) closeModal(); });

// ------------------------------------------------------------------ levels data

let LEVELS = null;
async function loadLevels() {
  if (LEVELS) return LEVELS;
  const res = await fetch('levels.json');
  LEVELS = await res.json();
  return LEVELS;
}

/** Puzzle for (level, attempt): rotate through stored grids, then symmetries + recolouring. */
function puzzleFor(level, attempt) {
  const list = LEVELS.levels[String(level)];
  if (!list || !list.length) {
    // level missing from levels.json: generate it on the fly
    const p = levelParams(level);
    for (let t = 0; t < 20; t++) {
      const r = generatePuzzle(p.n, p.k, level * 1000003 + attempt * 7919 + t * 104729, { maxLevel: p.maxTech, maxTries: 6 });
      if (r) return decodePuzzle(transformPuzzle(encodePuzzle(r.P), 0, level * 7919 + attempt));
    }
    throw new Error('Level se nepodařilo vygenerovat');
  }
  const base = list[attempt % list.length];
  const sym = Math.floor(attempt / list.length) % 8;
  return decodePuzzle(transformPuzzle(base, sym, level * 7919 + attempt * 104729 + 17));
}

// ------------------------------------------------------------------ home

function renderHome() {
  const done = Object.values(progress).filter((p) => p.wins > 0).length;
  const stars = Object.values(progress).reduce((a, p) => a + (p.stars || 0), 0);
  const next = nextLevel();
  $('#play-sub').textContent = `Level ${next} · ${levelParams(next).tier}`;
  const saved = store.get('current', null);
  const cont = $('#btn-continue');
  if (saved) {
    cont.hidden = false;
    $('#continue-sub').textContent = `Level ${saved.level} · ${'❤'.repeat(saved.lives)}`;
  } else cont.hidden = true;
  $('#home-stats').innerHTML =
    `<div class="stat"><b>${done}</b><span>vyřešeno</span></div>` +
    `<div class="stat"><b>${stars}</b><span>hvězd</span></div>` +
    `<div class="stat"><b>${Math.max(0, ...Object.keys(progress).filter((l) => progress[l].wins).map(Number), 0)}</b><span>nejvyšší level</span></div>`;
}

function nextLevel() {
  for (let l = 1; l <= 100; l++) if (!(progress[l] && progress[l].wins)) return l;
  return 100;
}

// ------------------------------------------------------------------ level select

let picked = 1;
function renderLevels() {
  picked = picked || nextLevel();
  const grid = $('#level-grid');
  grid.innerHTML = '';
  let lastTier = '';
  for (let l = 1; l <= 100; l++) {
    const p = levelParams(l);
    if (p.tier !== lastTier) {
      lastTier = p.tier;
      grid.appendChild(el('div', 'level-sep', `${p.tier} · ${l}–${lastOfTier(l)}`));
    }
    const pr = progress[l] || {};
    const b = el('button', `lvl t-${p.tier}${pr.wins ? ' done' : ''}${l === picked ? ' selected' : ''}`,
      `${l}<small>${p.n}×${p.n}</small><span class="lstars">${pr.wins ? '★'.repeat(pr.stars || 0) || '✓' : ''}</span>`);
    b.addEventListener('click', () => { picked = l; updatePicker(); grid.querySelectorAll('.lvl').forEach((x) => x.classList.remove('selected')); b.classList.add('selected'); });
    grid.appendChild(b);
  }
  updatePicker();
}
function lastOfTier(l) { const t = levelParams(l).tier; while (l < 100 && levelParams(l + 1).tier === t) l++; return l; }
function updatePicker() {
  const p = levelParams(picked);
  $('#pick-num').textContent = picked;
  $('#pick-play').textContent = `Hrát level ${picked}`;
  $('#pick-range').value = picked;
  $('#pick-info').textContent = `Mřížka ${p.n}×${p.n} · ${p.stars} verit · ${p.k === 1 ? '1 verita' : p.k + ' verity'} v každé řadě i oblasti`;
  const tb = $('#pick-tier');
  tb.textContent = p.tier;
  tb.className = 'tier-badge tier-' + p.tier;
}
$('#pick-range').addEventListener('input', (e) => {
  picked = +e.target.value;
  updatePicker();
  document.querySelectorAll('.lvl').forEach((x) => x.classList.toggle('selected', +x.firstChild.textContent === picked));
});
$('#pick-play').addEventListener('click', () => startLevel(picked));

// ------------------------------------------------------------------ game state

let game = null; // see newGame()
let P = null;
let cellEls = [];
let timerId = 0;
let ink = null;

async function startLevel(level, fresh = false) {
  await loadLevels();
  const saved = store.get('current', null);
  if (saved && saved.level === level && !fresh) { resumeSaved(); return; }
  // starting another grid abandons the running one (it stays used up)
  if (saved) store.del('current');
  const attempt = attempts[level] || 0;
  attempts[level] = attempt + 1;
  saveProgress();
  const hasData = LEVELS.levels[String(level)];
  if (!hasData) { $('#loading').hidden = false; await new Promise((r) => setTimeout(r, 50)); }
  let puzzle;
  try { puzzle = puzzleFor(level, attempt); } finally { $('#loading').hidden = true; }
  game = {
    level, attempt, puzzle: { n: puzzle.n, k: puzzle.k },
    enc: null, cells: new Array(puzzle.N).fill(''), lives: MAX_LIVES, mistakes: [],
    hints: 0, solverUsed: false, elapsed: 0, undo: [], strokes: [], over: false,
  };
  P = puzzle;
  game.enc = { n: P.n, k: P.k, r: Array.from(P.regions, (g) => g.toString(36)).join(''), s: Array.from(P.solution), c: Array.from(P.colorOf) };
  enterGame();
  persist();
}

function resumeSaved() {
  const saved = store.get('current', null);
  if (!saved) return;
  game = saved;
  game.undo = [];
  P = decodePuzzle(saved.enc);
  enterGame();
}

function persist() {
  if (!game || game.over) return;
  const { undo, ...rest } = game;
  store.set('current', rest);
}

function enterGame() {
  show('game');
  closeHint();
  const p = levelParams(game.level);
  $('#g-level').textContent = `Level ${game.level}`;
  $('#g-meta').textContent = `${p.tier} · ${P.n}×${P.n} · ${P.k === 1 ? '1 verita' : P.k + ' verity'} na řadu`;
  buildBoard();
  renderLives();
  updateProgress();
  setMode('play');
  ink.setStrokes(game.strokes || []);
  resumeGame();
  const tip = $('#gesture-tip');
  tip.classList.remove('gone');
  setTimeout(() => tip.classList.add('gone'), 6000);
}

function resumeGame() {
  if (!game || game.over) return;
  clearInterval(timerId);
  game.resumedAt = Date.now();
  timerId = setInterval(tick, 1000);
  tick();
}
function pauseGame() {
  if (!game || game.over || !game.resumedAt) return;
  game.elapsed += Date.now() - game.resumedAt;
  game.resumedAt = 0;
  clearInterval(timerId);
  persist();
}
function elapsed() { return game.elapsed + (game.resumedAt ? Date.now() - game.resumedAt : 0); }
function tick() { $('#g-timer').textContent = settings.timer ? '⏱ ' + fmtTime(elapsed()) : '⏱ –'; }
document.addEventListener('visibilitychange', () => {
  if (currentScreen !== 'game') return;
  if (document.hidden) pauseGame(); else resumeGame();
});

// ------------------------------------------------------------------ board

function buildBoard() {
  const board = $('#board');
  board.innerHTML = '';
  board.classList.remove('won');
  board.style.setProperty('--n', P.n);
  cellEls = [];
  const n = P.n;
  for (let i = 0; i < P.N; i++) {
    const r = Math.floor(i / n), c = i % n;
    const g = P.regions[i];
    const d = el('div', 'cell');
    d.style.setProperty('--rc', PALETTE[P.colorOf[g] % PALETTE.length]);
    d.style.setProperty('--d', r + c);
    if (r === 0 || P.regions[i - n] !== g) d.classList.add('bt');
    if (c === 0 || P.regions[i - 1] !== g) d.classList.add('bl');
    if (r === n - 1 || P.regions[i + n] !== g) d.classList.add('bb');
    if (c === n - 1 || P.regions[i + 1] !== g) d.classList.add('br');
    board.appendChild(d);
    cellEls.push(d);
  }
  for (let i = 0; i < P.N; i++) renderCell(i);
  fitBoard();
}

function renderCell(i, anim = false) {
  const d = cellEls[i];
  const v = game.cells[i];
  d.classList.remove('locked', 'auto', 'placed', 'wrong');
  if (v === 'v') {
    d.innerHTML = verita(P.colorOf[P.regions[i]]);
    if (anim) d.classList.add('placed');
  } else if (v === 'x' || v === 'a' || v === 'l') {
    d.innerHTML = '<span class="x"></span>';
    if (v === 'a') d.classList.add('auto');
    if (v === 'l') d.classList.add('locked');
  } else d.innerHTML = '';
}

function fitBoard() {
  const wrap = $('#board-wrap');
  const w = wrap.clientWidth - 4, h = wrap.clientHeight - 4;
  const size = Math.max(14, Math.floor(Math.min(w, h, 640) / P.n));
  $('#board').style.setProperty('--cell', size + 'px');
  zoom.reset();
  ink.resize(size * P.n, size * P.n);
}
window.addEventListener('resize', () => { if (currentScreen === 'game' && P) fitBoard(); });

function renderLives() {
  const box = $('#g-lives');
  box.innerHTML = '';
  for (let i = 0; i < MAX_LIVES; i++) {
    box.insertAdjacentHTML('beforeend', `<svg viewBox="0 0 24 24" class="${i < game.lives ? '' : 'lost'}"><use href="#i-heart"/></svg>`);
  }
}

function updateProgress() {
  const placed = game.cells.filter((v) => v === 'v').length;
  $('#g-progress').textContent = `${placed} / ${P.n * P.k} verit`;
}

// ------------------------------------------------------------------ zoom & pan (two fingers)

const zoom = {
  s: 1, x: 0, y: 0,
  apply() { $('#board-zoom').style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.s})`; },
  reset() { this.s = 1; this.x = 0; this.y = 0; this.apply(); },
  clamp() {
    this.s = Math.min(4, Math.max(1, this.s));
    if (this.s === 1) { this.x = 0; this.y = 0; return; }
    const b = $('#board');
    const w = b.offsetWidth, h = b.offsetHeight;
    // the scaled board grows right/down from its origin; keep part of it on screen
    const lim = (v, size) => Math.min(60, Math.max(-size * (this.s - 1) - 60, v));
    this.x = lim(this.x, w);
    this.y = lim(this.y, h);
  },
};

// ------------------------------------------------------------------ input

const pointers = new Map();
let gesture = null; // { kind: 'tap'|'drag'|'pinch'|'ink', ... }
let lastTap = { cell: -1, time: 0 };

function cellAt(x, y) {
  const r = $('#board').getBoundingClientRect();
  const cs = r.width / P.n;
  const c = Math.floor((x - r.left) / cs), row = Math.floor((y - r.top) / cs);
  if (c < 0 || row < 0 || c >= P.n || row >= P.n) return -1;
  return row * P.n + c;
}

const wrap = $('#board-wrap');
wrap.addEventListener('pointerdown', (e) => {
  if (!game || game.over) return;
  wrap.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    // switch to pinch: cancel whatever the first finger started
    if (gesture && gesture.kind === 'ink') ink.cancelStroke();
    if (gesture && gesture.kind === 'drag') rollbackDrag();
    const [a, b] = [...pointers.values()];
    gesture = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), s0: zoom.s, x0: zoom.x, y0: zoom.y, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    return;
  }
  if (pointers.size > 2) return;
  if (mode === 'ink') {
    gesture = { kind: 'ink' };
    ink.startStroke(e.clientX, e.clientY);
    return;
  }
  const c = cellAt(e.clientX, e.clientY);
  if (c < 0) { gesture = null; return; }
  gesture = { kind: 'tap', start: c, last: c, x: e.clientX, y: e.clientY, changes: [] };
});

wrap.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!gesture) return;
  if (gesture.kind === 'pinch' && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const ns = Math.min(4, Math.max(1, gesture.s0 * d / gesture.d0));
    const rect = wrap.getBoundingClientRect();
    const zr = $('#board-zoom');
    const ox = zr.offsetLeft + rect.left, oy = zr.offsetTop + rect.top;
    // keep the pinch centre fixed
    const px = (gesture.cx - ox - gesture.x0) / gesture.s0, py = (gesture.cy - oy - gesture.y0) / gesture.s0;
    zoom.s = ns;
    zoom.x = cx - ox - px * ns;
    zoom.y = cy - oy - py * ns;
    zoom.clamp();
    zoom.apply();
    return;
  }
  if (gesture.kind === 'ink') { ink.moveStroke(e.clientX, e.clientY); return; }
  if (gesture.kind === 'tap' || gesture.kind === 'drag') {
    const c = cellAt(e.clientX, e.clientY);
    if (c < 0 || c === gesture.last) return;
    if (gesture.kind === 'tap') {
      // becomes a drag: mode decided by the first cell
      const first = game.cells[gesture.start];
      gesture.kind = 'drag';
      gesture.paint = first === 'x' || first === 'a' ? '' : 'x';
      paintCell(gesture.start, gesture);
    }
    gesture.last = c;
    paintCell(c, gesture);
  }
});

function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (!gesture) return;
  if (gesture.kind === 'pinch') {
    if (pointers.size === 0) gesture = null;
    return;
  }
  if (gesture.kind === 'ink') { ink.endStroke(); game.strokes = ink.getStrokes(); persist(); gesture = null; return; }
  if (e.type === 'pointercancel') { if (gesture.kind === 'drag') rollbackDrag(); gesture = null; return; }
  if (gesture.kind === 'drag') {
    if (gesture.changes.length) pushUndo(gesture.changes);
    persist();
  } else if (gesture.kind === 'tap') {
    handleTap(gesture.start);
  }
  gesture = null;
}
wrap.addEventListener('pointerup', endPointer);
wrap.addEventListener('pointercancel', endPointer);
wrap.addEventListener('contextmenu', (e) => e.preventDefault());

function paintCell(c, g) {
  const v = game.cells[c];
  if (v === 'v' || v === 'l') return;
  const target = g.paint;
  const cur = v === 'a' ? 'x' : v;
  if (cur === target) return;
  g.changes.push({ c, from: v, to: target });
  game.cells[c] = target;
  renderCell(c);
}
function rollbackDrag() {
  if (!gesture || !gesture.changes) return;
  for (const ch of gesture.changes.reverse()) { game.cells[ch.c] = ch.from; renderCell(ch.c); }
  gesture.changes = [];
}

function handleTap(c) {
  const now = Date.now();
  const v = game.cells[c];
  if (lastTap.cell === c && now - lastTap.time < DOUBLE_TAP_MS) {
    // double tap: undo the cross from the first tap, then place a verita
    lastTap = { cell: -1, time: 0 };
    if (game.undo.length && game.undo[game.undo.length - 1].tapCell === c) {
      const entry = game.undo.pop();
      for (const ch of entry.changes) { game.cells[ch.c] = ch.from; renderCell(ch.c); }
    }
    placeVerita(c);
    return;
  }
  lastTap = { cell: c, time: now };
  if (v === 'v' || v === 'l') {
    if (v === 'l') toast('Tady byla chyba – pole je zamčené.');
    return;
  }
  const to = v === '' ? 'x' : '';
  const changes = [{ c, from: v, to }];
  game.cells[c] = to;
  renderCell(c);
  pushUndo(changes, c);
  vibrate(6);
  persist();
}

function pushUndo(changes, tapCell = -1) {
  game.undo.push({ changes, tapCell });
  if (game.undo.length > 300) game.undo.shift();
}

function undo() {
  if (mode === 'ink') { ink.undo(); game.strokes = ink.getStrokes(); persist(); return; }
  const entry = game.undo.pop();
  if (!entry) { toast('Není co vrátit.'); return; }
  for (const ch of entry.changes.slice().reverse()) {
    if (game.cells[ch.c] === 'v' || game.cells[ch.c] === 'l') continue; // verity are final
    game.cells[ch.c] = ch.from;
    renderCell(ch.c);
  }
  persist();
}

function snapshot() { return { cells: game.cells.slice() }; }

function placeVerita(c, fromHelper = false) {
  if (game.over) return;
  const v = game.cells[c];
  if (v === 'v' || v === 'l') return;
  if (P.solMask[c]) {
    game.cells[c] = 'v';
    renderCell(c, true);
    vibrate(15);
    if (settings.autoCross) autoCross(c);
    updateProgress();
    persist();
    checkWin();
    return true;
  }
  // mistake
  game.mistakes.push({ cell: c, snap: snapshot(), t: elapsed(), helper: fromHelper });
  game.lives--;
  game.cells[c] = 'l';
  const d = cellEls[c];
  d.innerHTML = verita(P.colorOf[P.regions[c]]);
  d.classList.add('wrong');
  vibrate([60, 40, 90]);
  renderLives();
  const hearts = $('#g-lives').children;
  if (hearts[game.lives]) hearts[game.lives].classList.add('pop');
  setTimeout(() => { if (game && game.cells[c] === 'l') renderCell(c); }, 800);
  if (game.lives <= 0) {
    game.over = true;
    clearInterval(timerId);
    pauseGameForEnd();
    store.del('current');
    setTimeout(gameOver, 900);
  } else {
    toast(`Tady verita není. Zbývá ${game.lives} ${game.lives === 1 ? 'život' : 'životy'}.`, true);
    persist();
  }
  return false;
}

function pauseGameForEnd() {
  if (game.resumedAt) { game.elapsed += Date.now() - game.resumedAt; game.resumedAt = 0; }
}

function autoCross(c) {
  const changes = [];
  const mark = (x) => { if (game.cells[x] === '') { game.cells[x] = 'a'; changes.push({ c: x, from: '', to: 'a' }); renderCell(x); } };
  for (const x of P.nb[c]) mark(x);
  for (let i = 0; i < 3; i++) {
    const u = P.cellUnits[c * 3 + i];
    let s = 0;
    for (const x of P.units[u]) if (game.cells[x] === 'v') s++;
    if (s >= P.k) for (const x of P.units[u]) mark(x);
  }
  if (changes.length) pushUndo(changes);
}

function checkWin() {
  const placed = game.cells.filter((v) => v === 'v').length;
  if (placed < P.n * P.k) return;
  game.over = true;
  pauseGameForEnd();
  clearInterval(timerId);
  store.del('current');
  // clear leftover marks for a clean final picture
  for (let i = 0; i < P.N; i++) if (game.cells[i] === 'x' || game.cells[i] === 'a') { game.cells[i] = 'a'; renderCell(i); }
  $('#board').classList.add('won');
  vibrate([20, 40, 20, 40, 60]);
  const lvl = game.level;
  const pr = progress[lvl] || { stars: 0, wins: 0, best: 0 };
  let stars = 0;
  if (!game.solverUsed) {
    const m = game.mistakes.length;
    stars = m === 0 && game.hints === 0 ? 3 : m <= 1 && game.hints <= 2 ? 2 : 1;
  }
  pr.wins = (pr.wins || 0) + 1;
  pr.stars = Math.max(pr.stars || 0, stars);
  if (!game.solverUsed) pr.best = pr.best ? Math.min(pr.best, game.elapsed) : game.elapsed;
  if (game.solverUsed) pr.solver = true;
  progress[lvl] = pr;
  saveProgress();
  setTimeout(() => showWin(stars), 900);
}

function showWin(stars) {
  const lvl = game.level;
  const starHtml = [0, 1, 2].map((i) => `<span class="${i < stars ? '' : 'off'}">★</span>`).join('');
  openModal(`
    <div class="big-emoji">${verita(4, 'win-v')}</div>
    <h3 style="text-align:center">${game.solverUsed ? 'Vyřešeno s řešičem' : 'Hotovo!'}</h3>
    <div class="win-stars">${starHtml}</div>
    <div class="kv">
      <div><b>${fmtTime(game.elapsed)}</b><span>čas</span></div>
      <div><b>${game.mistakes.length}</b><span>chyb</span></div>
      <div><b>${game.hints}</b><span>nápověd</span></div>
    </div>
    <p style="text-align:center;margin:0">${stars === 3 ? 'Perfektní – bez chyby a bez nápovědy!' : game.solverUsed ? 'Řešič ti pomohl. Zkus to příště sám/sama – hvězdy dostaneš jen bez řešiče.' : 'Pro 3 hvězdy: žádná chyba a žádná nápověda.'}</p>
    <div class="modal-actions">
      ${lvl < 100 ? `<button class="btn btn-primary" id="w-next">Další level (${lvl + 1})</button>` : ''}
      <button class="btn btn-glass" id="w-again">Nová mřížka – level ${lvl}</button>
      <button class="btn btn-glass" id="w-levels">Výběr levelu</button>
    </div>`, (m) => {
    Object.assign(m.querySelector('.win-v').style, { width: '84px', height: '84px' });
    const nx = m.querySelector('#w-next');
    if (nx) nx.onclick = () => { closeModal(); startLevel(lvl + 1); };
    m.querySelector('#w-again').onclick = () => { closeModal(); startLevel(lvl); };
    m.querySelector('#w-levels').onclick = () => { closeModal(); picked = Math.min(100, lvl + 1); show('levels'); };
  });
}

// ------------------------------------------------------------------ hints & solver

let hintState = null; // { step, auto }

function currentKnowledge() {
  return knowledgeFromSnapshot(P, { cells: game.cells });
}

function wrongCrosses() {
  const out = [];
  for (let c = 0; c < P.N; c++) if ((game.cells[c] === 'x' || game.cells[c] === 'a') && P.solMask[c]) out.push(c);
  return out;
}

function clearHighlights() {
  cellEls.forEach((d) => d.classList.remove('focus', 'target', 'dim'));
}

function showStep(step, { solver = false } = {}) {
  if (step.action === 'unx') step.title = step.title || 'Špatný křížek';
  clearHighlights();
  hintState = { step, solver };
  const panel = $('#hint-panel');
  panel.hidden = false;
  $('#hint-title').textContent = (solver ? 'Řešič · ' : '💡 ') + step.title;
  $('#hint-text').textContent = step.text;
  for (const c of step.focus || []) cellEls[c] && cellEls[c].classList.add('focus');
  for (const c of step.cells) cellEls[c].classList.add('target');
  $('#hint-apply').hidden = false;
  $('#hint-apply').textContent = step.action === 'unx' ? 'Odstranit křížek' : step.action === 'place' ? (step.cells.length > 1 ? 'Položit verity' : 'Položit veritu') : 'Zakřížkovat';
  $('#hint-next').hidden = true;
}

function closeHint() {
  $('#hint-panel').hidden = true;
  hintState = null;
  if (cellEls.length) clearHighlights();
}

function nextStep(maxLevel = 5) {
  const wrong = wrongCrosses();
  if (wrong.length) {
    return {
      tech: 'fix', title: 'Špatný křížek', action: 'unx', cells: wrong.slice(0, 1), focus: [],
      text: `Pozor: na ${cellName(P, wrong[0])} máš křížek, ale tam verita ve skutečnosti patří. Odstraň ho – jinak tě dovede k chybě.`,
    };
  }
  const known = currentKnowledge();
  return findStep(P, known, maxLevel);
}

function doHint() {
  if (!game || game.over) return;
  if (hintState && !hintState.solver) { closeHint(); return; }
  const step = nextStep();
  if (!step) { toast('Žádný další krok – všechno hotovo?'); return; }
  game.hints++;
  persist();
  showStep(step);
}

function applyCurrentStep() {
  if (!hintState) return;
  const { step, solver } = hintState;
  const changes = [];
  if (step.action === 'unx') {
    for (const c of step.cells) { changes.push({ c, from: game.cells[c], to: '' }); game.cells[c] = ''; renderCell(c); }
  } else if (step.action === 'cross') {
    for (const c of step.cells) if (game.cells[c] === '') { changes.push({ c, from: '', to: 'x' }); game.cells[c] = 'x'; renderCell(c); }
  } else {
    for (const c of step.cells) placeVerita(c, true);
  }
  if (changes.length) pushUndo(changes);
  persist();
  if (game.over) { closeHint(); return; }
  if (solver) {
    const nx = nextStep();
    if (nx) showStep(nx, { solver: true }); else closeHint();
  } else closeHint();
}

$('#hint-apply').addEventListener('click', applyCurrentStep);
$('#hint-next').addEventListener('click', applyCurrentStep);
$('#hint-close').addEventListener('click', closeHint);
$('#t-hint').addEventListener('click', doHint);
$('#t-undo').addEventListener('click', () => game && !game.over && undo());

$('#t-solver').addEventListener('click', () => {
  if (!game || game.over) return;
  openModal(`
    <h3>⚙ Řešič</h3>
    <p>Řešič postupuje čistě logicky a u každého kroku vysvětlí proč. <b>Když ho použiješ, level se započítá bez hvězd.</b></p>
    <div class="modal-actions">
      <button class="btn btn-glass" id="s-check">Zkontrolovat moje křížky (zdarma)</button>
      <button class="btn btn-primary" id="s-step">Řešit krok za krokem</button>
      <button class="btn btn-glass" id="s-all">Vyřešit celé</button>
      <button class="btn btn-glass" id="s-close">Zavřít</button>
    </div>`, (m) => {
    m.querySelector('#s-check').onclick = () => {
      closeModal();
      const w = wrongCrosses();
      if (!w.length) toast('Všechny křížky sedí ✓');
      else { clearHighlights(); w.forEach((c) => cellEls[c].classList.add('focus')); toast(`Špatně: ${w.map((c) => cellName(P, c)).join(', ')}`, true); }
    };
    m.querySelector('#s-step').onclick = () => {
      closeModal();
      game.solverUsed = true;
      persist();
      const s = nextStep();
      if (s) showStep(s, { solver: true });
    };
    m.querySelector('#s-all').onclick = () => { closeModal(); solveAll(); };
    m.querySelector('#s-close').onclick = closeModal;
  });
});

async function solveAll() {
  game.solverUsed = true;
  closeHint();
  for (let guard = 0; guard < P.N * 3 && !game.over; guard++) {
    const step = nextStep();
    if (!step) break;
    clearHighlights();
    step.cells.forEach((c) => cellEls[c].classList.add('target'));
    await new Promise((r) => setTimeout(r, step.action === 'place' ? 140 : 40));
    if (step.action === 'unx') step.cells.forEach((c) => { game.cells[c] = ''; renderCell(c); });
    else if (step.action === 'cross') step.cells.forEach((c) => { if (game.cells[c] === '') { game.cells[c] = 'a'; renderCell(c); } });
    else step.cells.forEach((c) => placeVerita(c, true));
  }
  clearHighlights();
}

// ------------------------------------------------------------------ ink ("fixy") mode

let mode = 'play';
const INK_COLORS = ['#ffd34d', '#ff5f9e', '#5ee7ff', '#4ade80', '#ffffff', '#1b1d33'];

function setMode(m) {
  mode = m;
  $('#t-mode').classList.toggle('on', m === 'ink');
  $('#ink-tools').hidden = m !== 'ink';
  $('#ink').classList.toggle('active', m === 'ink');
  const chip = $('#g-mode-chip');
  chip.textContent = m === 'ink' ? 'Režim: fixy ✎' : 'Režim: hra';
  chip.classList.toggle('drawing', m === 'ink');
  $('#t-undo').querySelector('span:last-child').textContent = m === 'ink' ? 'Zpět tah' : 'Zpět';
}
$('#t-mode').addEventListener('click', () => { setMode(mode === 'ink' ? 'play' : 'ink'); if (mode === 'ink') toast('Kresli prstem po mřížce. Dva prsty = zoom.'); });

function buildInkTools() {
  const sw = $('#swatches');
  INK_COLORS.forEach((col, i) => {
    const b = el('button', 'swatch' + (i === 0 ? ' on' : ''));
    b.style.background = col;
    b.addEventListener('click', () => {
      ink.color = col; ink.eraser = false;
      $('#ink-eraser').classList.remove('on');
      sw.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('on', x === b));
    });
    sw.appendChild(b);
  });
  const widths = [{ w: 0.006, l: '•' }, { w: 0.012, l: '●' }, { w: 0.024, l: '⬤' }];
  let wi = 1;
  $('#ink-width').addEventListener('click', () => { wi = (wi + 1) % widths.length; ink.width = widths[wi].w; $('#ink-width').textContent = widths[wi].l; });
  $('#ink-eraser').addEventListener('click', () => { ink.eraser = !ink.eraser; $('#ink-eraser').classList.toggle('on', ink.eraser); });
  $('#ink-undo').addEventListener('click', () => { ink.undo(); game.strokes = ink.getStrokes(); persist(); });
  $('#ink-clear').addEventListener('click', () => { ink.clear(); game.strokes = []; persist(); });
}

// ------------------------------------------------------------------ menu, settings, how-to

$('#t-menu').addEventListener('click', () => {
  openModal(`
    <h3>Více</h3>
    <div class="modal-actions">
      <button class="btn btn-glass" id="m-clear">Smazat všechny křížky</button>
      <button class="btn btn-glass" id="m-zoom">Obnovit zoom</button>
      <button class="btn btn-glass" id="m-settings">Nastavení</button>
      <button class="btn btn-glass" id="m-howto">Jak hrát</button>
      <button class="btn btn-danger" id="m-giveup">Vzdát se (rozbor hry)</button>
      <button class="btn btn-glass" id="m-close">Zavřít</button>
    </div>`, (m) => {
    m.querySelector('#m-clear').onclick = () => {
      const changes = [];
      for (let c = 0; c < P.N; c++) if (game.cells[c] === 'x' || game.cells[c] === 'a') { changes.push({ c, from: game.cells[c], to: '' }); game.cells[c] = ''; renderCell(c); }
      if (changes.length) pushUndo(changes);
      persist(); closeModal();
    };
    m.querySelector('#m-zoom').onclick = () => { zoom.reset(); closeModal(); };
    m.querySelector('#m-settings').onclick = openSettings;
    m.querySelector('#m-howto').onclick = openHowto;
    m.querySelector('#m-giveup').onclick = () => {
      openModal(`<h3>Opravdu vzdát?</h3><p>Mřížka se ukončí a už se k ní nevrátíš. Dostaneš rozbor a celé řešení.</p>
        <div class="modal-actions"><button class="btn btn-danger" id="g-yes">Vzdát se</button><button class="btn btn-glass" id="g-no">Hrát dál</button></div>`, (mm) => {
        mm.querySelector('#g-yes').onclick = () => {
          closeModal();
          game.over = true; game.gaveUp = true;
          pauseGameForEnd(); clearInterval(timerId); store.del('current');
          gameOver();
        };
        mm.querySelector('#g-no').onclick = closeModal;
      });
    };
    m.querySelector('#m-close').onclick = closeModal;
  });
});

function openSettings() {
  const row = (key, title, sub) => `<label class="setting"><div>${title}<small>${sub}</small></div><span class="switch"><input type="checkbox" data-k="${key}" ${settings[key] ? 'checked' : ''}><span></span></span></label>`;
  openModal(`
    <h3>Nastavení</h3>
    ${row('autoCross', 'Automatické křížkování', 'Po položení verity zakřížkuje okolí a plné řady/oblasti.')}
    ${row('haptics', 'Vibrace', 'Jemná odezva při ťuknutí a chybě.')}
    ${row('timer', 'Zobrazit čas', 'Stopky během hry.')}
    <div class="modal-actions">
      <button class="btn btn-glass" id="st-reset">Smazat postup ve hře</button>
      <button class="btn btn-primary" id="st-close">Hotovo</button>
    </div>`, (m) => {
    m.querySelectorAll('input[data-k]').forEach((inp) => inp.addEventListener('change', () => { settings[inp.dataset.k] = inp.checked; saveSettings(); if (game) tick(); }));
    m.querySelector('#st-close').onclick = closeModal;
    m.querySelector('#st-reset').onclick = () => {
      if (!confirm('Opravdu smazat všechny hvězdy a postup?')) return;
      for (const k of Object.keys(progress)) delete progress[k];
      for (const k of Object.keys(attempts)) delete attempts[k];
      saveProgress(); store.del('current'); closeModal(); renderHome();
      toast('Postup smazán.');
    };
  });
}

function openHowto() {
  openModal(`
    <h3>Jak hrát</h3>
    <div class="howto-demo">${verita(0)}${verita(1)}${verita(2)}${verita(3)}${verita(4)}</div>
    <ul class="rules">
      <li>V každém <b>řádku</b>, <b>sloupci</b> a každé <b>barevné oblasti</b> je přesně <b>jedna verita</b> (od levelu 61 <b>dvě</b>, od levelu 85 <b>tři</b>). Kolik jich je, vidíš nahoře.</li>
      <li>Verity se <b>nesmí dotýkat</b> – ani rohem.</li>
      <li><b>Ťuknutí</b> = křížek (tady verita není). <b>Táhnutím</b> zakřížkuješ víc polí najednou.</li>
      <li><b>Dvojklik</b> = položit veritu. Špatná verita stojí <b>život</b> – máš 3.</li>
      <li>Když přijdeš o všechny životy, mřížka končí. Žádné oživení – ale dostaneš <b>podrobný rozbor</b>, co bylo špatně a jak to šlo líp.</li>
      <li><b>Fixy</b>: přepni režim a kresli si po mřížce poznámky. <b>Dvěma prsty</b> zoomuješ.</li>
      <li><b>Nápověda</b> ukáže další logický krok s vysvětlením. <b>Řešič</b> umí vyřešit celou mřížku (pak bez hvězd).</li>
      <li>Každá mřížka má <b>jediné řešení</b> a dá se vyřešit čistou logikou – hádat nikdy není potřeba.</li>
    </ul>
    <div class="modal-actions"><button class="btn btn-primary" id="h-ok">Rozumím</button></div>`, (m) => {
    m.querySelectorAll('svg.v').forEach((s) => { s.style.width = '40px'; s.style.height = '40px'; });
    m.querySelector('#h-ok').onclick = () => { closeModal(); store.set('seenHowto', true); };
  });
}

// ------------------------------------------------------------------ game over & report

function miniBoard(state, opts = {}) {
  // state: array of '' | 'x' | 'v' | 'l' | 'sol' ; opts.mark: {cell: cls}
  const size = Math.max(10, Math.min(28, Math.floor(Math.min(window.innerWidth - 64, 420) / P.n)));
  const wrapEl = el('div', 'mini-board-wrap');
  const b = el('div', 'mini-board');
  b.style.setProperty('--n', P.n);
  b.style.setProperty('--mc', size + 'px');
  const n = P.n;
  for (let i = 0; i < P.N; i++) {
    const r = Math.floor(i / n), c = i % n, g = P.regions[i];
    const d = el('div', 'cell');
    d.style.setProperty('--rc', PALETTE[P.colorOf[g] % PALETTE.length]);
    if (r === 0 || P.regions[i - n] !== g) d.classList.add('bt');
    if (c === 0 || P.regions[i - 1] !== g) d.classList.add('bl');
    if (r === n - 1 || P.regions[i + n] !== g) d.classList.add('bb');
    if (c === n - 1 || P.regions[i + 1] !== g) d.classList.add('br');
    const v = state[i];
    if (v === 'v' || v === 'sol') d.innerHTML = verita(P.colorOf[g]);
    else if (v === 'x' || v === 'a') d.innerHTML = '<span class="x"></span>';
    else if (v === 'l') { d.innerHTML = '<span class="x"></span>'; d.classList.add('locked'); }
    if (v === 'sol') d.querySelector('svg').style.opacity = '.55';
    const mark = opts.mark && opts.mark[i];
    if (mark) d.classList.add(mark);
    b.appendChild(d);
  }
  wrapEl.appendChild(b);
  return wrapEl;
}

function gameOver() {
  closeHint();
  const report = buildReport(P, game);
  const box = $('#report');
  box.innerHTML = '';
  const hero = el('div', 'report-hero', `
    <div class="big-emoji">💔</div>
    <h3>${game.gaveUp ? 'Vzdáno' : 'Došly životy'}</h3>
    <p>Level ${game.level} · ${P.n}×${P.n} · stihl/a jsi ${report.placed} z ${report.total} verit za ${fmtTime(game.elapsed)}</p>`);
  box.appendChild(hero);

  if (!report.items.length) {
    box.appendChild(el('div', 'card', `<h4>Bez chyb</h4><p>Vzdal/a jsi to bez jediné chyby. Podívej se níže na řešení a projdi si postup krok za krokem.</p>`));
  }
  report.items.forEach((it, i) => {
    const card = el('div', 'card');
    card.innerHTML = `
      <h4><span class="mistake-num">${i + 1}</span> Verita na ${it.name}<span class="tag tag-${it.type}">${TYPE_LABEL[it.type]}</span></h4>
      <div class="sub">Co bylo špatně</div>
      <p>${escapeHtml(it.why)}</p>
      <p>${escapeHtml(it.belonged)}</p>
      ${it.better ? `<div class="sub">Jak to šlo udělat líp</div><p>${escapeHtml(it.better)}</p>` : ''}`;
    // board at that moment: wrong cell = focus, better move = target
    const mark = { [it.cell]: 'focus' };
    if (it.betterStep) it.betterStep.cells.forEach((c) => { if (c !== it.cell) mark[c] = 'target'; });
    const snapCells = game.mistakes[i].snap.cells.slice();
    snapCells[it.cell] = 'v';
    card.appendChild(miniBoard(snapCells, { mark }));
    card.appendChild(el('div', 'legend', '<span><i style="background:#fff"></i>tvůj chybný tah</span><span><i style="background:#5ee7ff"></i>lepší tah v tu chvíli</span>'));
    box.appendChild(card);
  });

  if (report.tips.length) {
    const tips = el('div', 'card', `<h4>🎯 Na co si dát příště pozor</h4><ul>${report.tips.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`);
    box.appendChild(tips);
  }

  // full solution
  const solState = new Array(P.N).fill('');
  for (let c = 0; c < P.N; c++) {
    if (P.solMask[c]) solState[c] = game.cells[c] === 'v' ? 'v' : 'sol';
    else if (game.cells[c] === 'l') solState[c] = 'l';
  }
  const solCard = el('div', 'card', `<h4>✅ Správné řešení</h4><p style="margin:0">Plné verity = tvoje, poloprůhledné = chyběly, červené křížky = tvoje chyby.</p>`);
  solCard.appendChild(miniBoard(solState));
  box.appendChild(solCard);

  const walk = el('div', 'card', `<h4>🧠 Projdi si řešení krok za krokem</h4><p>Ukážu ti celý logický postup od začátku – přesně tak, jak by to vyřešil zkušený hráč.</p>`);
  const wb = el('button', 'btn btn-glass', 'Spustit průvodce');
  wb.onclick = openWalkthrough;
  walk.appendChild(wb);
  box.appendChild(walk);

  const actions = el('div', 'modal-actions');
  actions.innerHTML = `
    <button class="btn btn-primary" id="r-new">Nová mřížka – level ${game.level}</button>
    ${game.level > 1 ? `<button class="btn btn-glass" id="r-easier">Zkusit lehčí – level ${game.level - 1}</button>` : ''}
    <button class="btn btn-glass" id="r-levels">Výběr levelu</button>
    <button class="btn btn-glass" id="r-home">Domů</button>`;
  box.appendChild(actions);
  const lvl = game.level;
  actions.querySelector('#r-new').onclick = () => startLevel(lvl);
  const easier = actions.querySelector('#r-easier');
  if (easier) easier.onclick = () => startLevel(lvl - 1);
  actions.querySelector('#r-levels').onclick = () => { picked = lvl; show('levels'); };
  actions.querySelector('#r-home').onclick = () => show('home');
  show('report');
  box.scrollTop = 0;
}

function openWalkthrough() {
  const result = logicSolve(P, 4, null, true);
  const steps = result.steps;
  // frames: board state after each step
  const st = new Uint8Array(P.N);
  const frames = [];
  for (const s of steps) {
    frames.push({ before: st.slice(), step: s });
    applyStep(P, st, s);
  }
  let i = 0;
  const toCells = (arr) => Array.from(arr, (v) => (v === STAR ? 'v' : v === EMPTY ? 'x' : ''));
  openModal(`
    <h3>Průvodce řešením</h3>
    <div id="w-board"></div>
    <div class="walk-text"><div class="sub" id="w-title"></div><p id="w-text"></p></div>
    <div class="walk-controls">
      <button class="btn btn-small btn-glass" id="w-prev">‹ Zpět</button>
      <span class="chip" id="w-count"></span>
      <button class="btn btn-small btn-primary" id="w-next">Další ›</button>
    </div>
    <div class="modal-actions"><button class="btn btn-glass" id="w-close">Zavřít</button></div>`, (m) => {
    const render = () => {
      const f = frames[i];
      const mark = {};
      (f.step.focus || []).forEach((c) => { mark[c] = 'focus'; });
      f.step.cells.forEach((c) => { mark[c] = 'target'; });
      const b = m.querySelector('#w-board');
      b.innerHTML = '';
      b.appendChild(miniBoard(toCells(f.before), { mark }));
      m.querySelector('#w-title').textContent = `${f.step.title} · ${f.step.action === 'place' ? 'verita' : 'křížky'}`;
      m.querySelector('#w-text').textContent = f.step.text;
      m.querySelector('#w-count').textContent = `${i + 1} / ${frames.length}`;
      m.querySelector('#w-prev').disabled = i === 0;
      m.querySelector('#w-next').textContent = i === frames.length - 1 ? 'Konec' : 'Další ›';
    };
    m.querySelector('#w-prev').onclick = () => { if (i > 0) { i--; render(); } };
    m.querySelector('#w-next').onclick = () => { if (i < frames.length - 1) { i++; render(); } else closeModal(); };
    m.querySelector('#w-close').onclick = closeModal;
    render();
  });
}

// ------------------------------------------------------------------ wiring

$('#btn-play').addEventListener('click', () => {
  const lvl = nextLevel();
  const saved = store.get('current', null);
  if (saved && saved.level === lvl) resumeSaved(); else startLevel(lvl);
});
$('#btn-continue').addEventListener('click', async () => { await loadLevels(); resumeSaved(); });
$('#btn-levels').addEventListener('click', () => { picked = nextLevel(); show('levels'); });
$('#btn-howto').addEventListener('click', openHowto);
$('#btn-settings').addEventListener('click', openSettings);
$('#game-back').addEventListener('click', () => { pauseGame(); show('home'); });

ink = new Ink($('#ink'), $('#board'));
buildInkTools();
history.replaceState({ screen: 'home' }, '');
show('home', false);
loadLevels().catch(() => toast('Nepodařilo se načíst levely.', true));
if (!store.get('seenHowto', false)) setTimeout(openHowto, 400);

if ('serviceWorker' in navigator && !window.Capacitor?.isNativePlatform?.()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// expose for debugging in the console
window.veritdoku = { get game() { return game; }, get puzzle() { return P; } };
