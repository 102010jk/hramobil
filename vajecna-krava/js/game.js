import { sfx, initAudio, setSound, suspendAudio } from './audio.js';
import { drawCow, drawCloud, drawEgg, drawPoop, drawPower, drawBasket, star, SKINS, POWERS, OUTLINE } from './draw.js';

// Polyfill pro starší WebView.
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(typeof r === 'number' ? r : 0, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ================= uložená data ================= */

const SAVE_KEY = 'vajecna-krava-v1';
const DEFAULTS = {
  coins: 0,
  best: 0,
  up: { basket: 0, lives: 0, power: 0, luck: 0 },
  skins: ['strakata'],
  skin: 'strakata',
  sound: true,
  games: 0,
  eggs: 0,
};

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null') || {};
    return {
      ...DEFAULTS,
      ...s,
      up: { ...DEFAULTS.up, ...(s.up || {}) },
      skins: Array.isArray(s.skins) && s.skins.length ? s.skins : ['strakata'],
    };
  } catch {
    return { ...DEFAULTS, up: { ...DEFAULTS.up }, skins: ['strakata'] };
  }
}
const save = loadSave();
if (!SKINS[save.skin]) save.skin = 'strakata';
function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    /* soukromé okno apod. – hra jede dál bez ukládání */
  }
}

const UPGRADES = [
  { id: 'basket', icon: '🧺', name: 'Širší košík', desc: 'Košík je o kus širší.', costs: [80, 220, 500] },
  { id: 'lives', icon: '❤️', name: 'Srdíčko navíc', desc: '+1 život na začátku hry.', costs: [150, 450] },
  { id: 'power', icon: '✨', name: 'Silnější bonusy', desc: 'Bonusy vydrží déle.', costs: [100, 300, 700] },
  { id: 'luck', icon: '🥚', name: 'Zlaté štěstí', desc: 'Víc zlatých vajec.', costs: [120, 350, 800] },
];

/* ================= canvas a rozměry ================= */

const VW = 400; // virtuální šířka hřiště
const cv = $('cv');
const ctx = cv.getContext('2d');
let scale = 1;
let VH = 700;
let dpr = 1;
let groundY = 660;
let rimY = 600;
let cowY = 170;
const BASKET_H = 44;

function resize() {
  const r = cv.getBoundingClientRect();
  dpr = Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.max(1, Math.round(r.width * dpr));
  cv.height = Math.max(1, Math.round(r.height * dpr));
  scale = r.width / VW;
  VH = r.height / scale;
  groundY = VH - 36;
  rimY = groundY - BASKET_H - 2;
  const hudBottom = ($('hud').hidden ? 70 : 92) / scale;
  cowY = Math.max(hudBottom + 92, VH * 0.24);
  for (const s of scenery.clouds) s.y = Math.min(s.y, VH * 0.5);
}

/* ================= scenérie ================= */

const scenery = {
  clouds: Array.from({ length: 5 }, (_, i) => ({
    x: rand(0, VW),
    y: 60 + i * 55 + rand(-20, 20),
    w: rand(70, 130),
    v: rand(4, 12),
    a: rand(0.55, 0.9),
  })),
  stars: Array.from({ length: 45 }, () => ({ x: rand(0, VW), y: rand(0, 1), r: rand(0.6, 1.8), p: rand(0, 6) })),
  tufts: Array.from({ length: 26 }, () => ({ x: rand(0, VW), h: rand(5, 11) })),
  flowers: Array.from({ length: 9 }, () => ({ x: rand(10, VW - 10), c: pick(['#ffffff', '#ffd84a', '#ff8fb1', '#b9a3ff']) })),
};

const SKIES = [
  { top: '#5ab8ff', bot: '#d4f1ff', h1: '#9fd86f', h2: '#6cc04f', grass: '#4caf3e', sun: '#ffe066', night: 0 },
  { top: '#ff8f6b', bot: '#ffe0a3', h1: '#b5c062', h2: '#8aa645', grass: '#6c9a37', sun: '#ff7a3d', night: 0 },
  { top: '#141c46', bot: '#4b3f7a', h1: '#36546e', h2: '#284460', grass: '#2b4f3c', sun: '#f4f1d0', night: 1 },
  { top: '#ff9ccc', bot: '#fff0e0', h1: '#a7d77a', h2: '#7dc25a', grass: '#5bb244', sun: '#fff1a8', night: 0 },
];
const hexRgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const SKY_RGB = SKIES.map((s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, typeof v === 'string' ? hexRgb(v) : v])));
function skyAt(phase) {
  const n = SKIES.length;
  const i = Math.floor(phase) % n;
  const j = (i + 1) % n;
  const f = phase - Math.floor(phase);
  const e = f * f * (3 - 2 * f);
  const a = SKY_RGB[i];
  const b = SKY_RGB[j];
  const out = {};
  for (const k of Object.keys(a)) {
    if (typeof a[k] === 'number') out[k] = a[k] + (b[k] - a[k]) * e;
    else {
      const c = a[k].map((v, idx) => Math.round(v + (b[k][idx] - v) * e));
      out[k] = `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  return out;
}

/* ================= stav hry ================= */

const G = {
  state: 'menu', // menu | play | paused | over
  t: 0,
  score: 0,
  eggs: 0,
  golden: 0,
  level: 1,
  nextLevelAt: 12,
  lives: 3,
  maxLives: 3,
  combo: 0,
  bestCombo: 0,
  items: [],
  parts: [],
  splats: [],
  texts: [],
  cows: [],
  power: { slow: 0, magnet: 0, big: 0 },
  powerMax: { slow: 1, magnet: 1, big: 1 },
  frenzy: 0,
  basket: { x: VW / 2, w: 84, bump: 0, eggs: 0, goldenIn: 0, dirty: 0, vx: 0 },
  shake: 0,
  hurt: 0,
  dying: 0,
  skyPhase: 0,
  hintT: 0,
  menuCowY: 0,
};

function makeCow(name, x, skin, pitch = 1) {
  return {
    name,
    x,
    y: cowY,
    dir: Math.random() < 0.5 ? -1 : 1,
    target: x,
    walk: 0,
    idle: 0,
    layT: rand(0.8, 1.6),
    laying: 0,
    layKind: null,
    squash: 0,
    blinkT: rand(1, 4),
    blink: 0,
    moo: 0,
    tail: 0,
    pitch,
    skin,
    enter: 1, // 1 = právě přichází (sjíždí z nebe)
  };
}

function difficulty() {
  const L = Math.min(G.level, 18);
  const cows = G.cows.length || 1;
  return {
    interval: Math.max(0.42, 1.25 - (L - 1) * 0.07) * (0.55 + 0.45 * cows),
    g: 250 + (L - 1) * 21,
    cowSpeed: 70 + (L - 1) * 9,
    poop: G.level < 2 ? 0 : Math.min(0.3, 0.1 + (G.level - 2) * 0.025),
    golden: 0.05 + save.up.luck * 0.025,
    power: 0.05,
    kick: Math.min(90, 20 + L * 5),
  };
}

function basketWidth() {
  const base = 84 + save.up.basket * 12;
  return G.power.big > 0 ? base * 1.55 : base;
}

/* ================= HUD ================= */

const hud = {
  score: $('hud-score'),
  hearts: $('hud-hearts'),
  level: $('hud-level'),
  combo: $('hud-combo'),
  powers: $('hud-powers'),
  hint: $('hud-hint'),
  cache: {},
};

function renderHearts(lostIndex = -1) {
  let html = '';
  for (let i = 0; i < G.maxLives; i++) {
    const cls = i < G.lives ? 'heart' : 'heart empty';
    html += `<i class="${cls}${i === lostIndex ? ' lost' : ''}"></i>`;
  }
  hud.hearts.innerHTML = html;
}

function updateHud() {
  const c = hud.cache;
  if (c.score !== G.score) {
    hud.score.textContent = G.score;
    hud.score.classList.remove('bump');
    void hud.score.offsetWidth;
    hud.score.classList.add('bump');
    c.score = G.score;
  }
  if (c.level !== G.level) {
    hud.level.textContent = `Úroveň ${G.level}`;
    c.level = G.level;
  }
  const mult = multiplier();
  if (c.mult !== mult) {
    hud.combo.hidden = mult < 2;
    hud.combo.textContent = `×${mult}`;
    hud.combo.classList.toggle('hot', mult >= 4);
    c.mult = mult;
  }
  const keys = Object.keys(G.power).filter((k) => G.power[k] > 0);
  const sig = keys.join(',');
  if (c.powSig !== sig) {
    hud.powers.innerHTML = keys.map((k) => `<span class="power" data-k="${k}">${POWERS[k].icon}<i></i></span>`).join('');
    c.powSig = sig;
  }
  for (const el of hud.powers.children) {
    const k = el.dataset.k;
    el.querySelector('i').style.setProperty('--p', `${(G.power[k] / G.powerMax[k]) * 100}%`);
  }
}

let bannerTimer = 0;
function banner(text, sub = '') {
  const b = $('banner');
  b.innerHTML = sub ? `${text}<small>${sub}</small>` : text;
  b.classList.remove('show');
  void b.offsetWidth;
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), 2000);
}

/* ================= efekty ================= */

function vibrate(ms) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* nic */
  }
}

function floatText(x, y, text, color = '#fff', size = 22) {
  G.texts.push({ x, y, text, color, size, life: 0, max: 0.9 });
}

function burst(x, y, n, opts = {}) {
  for (let i = 0; i < n; i++) {
    const a = opts.angle != null ? opts.angle + rand(-opts.spread, opts.spread) : rand(0, Math.PI * 2);
    const sp = rand(opts.min || 60, opts.max || 220);
    G.parts.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      g: opts.g ?? 500,
      life: 0,
      max: rand(0.4, opts.life || 0.9),
      size: rand(opts.size?.[0] || 2, opts.size?.[1] || 5),
      color: Array.isArray(opts.color) ? pick(opts.color) : opts.color || '#fff',
      type: opts.type || 'dot',
      rot: rand(0, 6),
      vr: rand(-10, 10),
    });
  }
}

/* ================= herní logika ================= */

function multiplier() {
  return Math.min(5, 1 + Math.floor(G.combo / 5));
}

function resetRun() {
  G.score = 0;
  G.eggs = 0;
  G.golden = 0;
  G.level = 1;
  G.nextLevelAt = 12;
  G.maxLives = 3 + save.up.lives;
  G.lives = G.maxLives;
  G.combo = 0;
  G.bestCombo = 0;
  G.items = [];
  G.parts = [];
  G.texts = [];
  G.splats = [];
  G.power = { slow: 0, magnet: 0, big: 0 };
  G.frenzy = 0;
  G.dying = 0;
  G.hurt = 0;
  G.shake = 0;
  G.basket = { x: VW / 2, w: basketWidth(), bump: 0, eggs: 0, goldenIn: 0, dirty: 0, vx: 0 };
  const main = G.cows[0] || makeCow('Bětka', VW / 2, save.skin);
  main.skin = save.skin;
  main.layT = 1.2;
  main.laying = 0;
  G.cows = [main];
  hud.cache = {};
  renderHearts();
}

function startGame() {
  initAudio();
  resetRun();
  G.state = 'play';
  G.hintT = 3.5;
  hud.hint.classList.remove('gone');
  hud.hint.hidden = false;
  showScreen(null);
  $('hud').hidden = false;
  resize();
  save.games++;
  persist();
  sfx.moo(1);
  G.cows[0].moo = 1;
}

function chooseLay() {
  const d = difficulty();
  if (G.frenzy > 0) return Math.random() < 0.2 ? 'golden' : 'egg';
  const r = Math.random();
  if (r < d.poop) return 'poop';
  if (r < d.poop + d.power) {
    const opts = ['slow', 'magnet', 'big'];
    if (G.lives < G.maxLives) opts.push('heart', 'heart');
    return 'p:' + pick(opts);
  }
  return Math.random() < d.golden ? 'golden' : 'egg';
}

function spawnFromCow(c, kind) {
  const d = difficulty();
  const rearX = c.x - c.dir * 50 * 0.9;
  const y = c.y - 32;
  const isPower = kind.startsWith('p:');
  const it = {
    kind: isPower ? 'power' : kind,
    power: isPower ? kind.slice(2) : null,
    x: clamp(rearX, 20, VW - 20),
    y,
    py: y,
    vx: -c.dir * rand(10, d.kick) + rand(-15, 15),
    vy: rand(-90, -40),
    r: kind === 'golden' ? 17 : kind === 'poop' ? 21 : isPower ? 17 : 16,
    rot: rand(-0.4, 0.4),
    vr: rand(-3, 3),
    tint: Math.random() < 0.35,
    t: rand(0, 5),
  };
  G.items.push(it);
  if (kind === 'poop') {
    sfx.pff();
    burst(rearX, y, 6, { color: 'rgba(160,200,90,0.8)', min: 20, max: 60, g: -40, life: 0.7, size: [4, 8] });
  } else sfx.plop();
}

function updateCow(c, dt, inPlay) {
  const d = difficulty();
  const ts = G.power.slow > 0 ? 0.55 : 1;
  const ty = G.state === 'menu' ? G.menuCowY : cowY;
  c.enter = Math.max(0, c.enter - dt * 1.5);
  c.y += (ty - c.y) * (1 - Math.exp(-dt * 4));

  c.blinkT -= dt;
  if (c.blinkT <= 0) {
    c.blink = 0.12;
    c.blinkT = rand(1.5, 5);
  }
  c.blink = Math.max(0, c.blink - dt);
  c.moo = Math.max(0, c.moo - dt * 1.1);
  c.tail = Math.max(0, c.tail - dt * 3);

  if (c.laying > 0) {
    c.laying -= dt * ts;
    const p = 1 - c.laying / 0.24;
    c.squash = Math.sin(clamp(p, 0, 1) * Math.PI);
    if (c.layKind === 'poop') c.tail = 1;
    if (c.laying <= 0) {
      c.squash = 0;
      if (c.layKind) spawnFromCow(c, c.layKind);
      c.layKind = null;
    }
    return;
  }

  if (c.idle > 0) {
    c.idle -= dt * ts;
  } else {
    const dx = c.target - c.x;
    if (Math.abs(dx) < 4) {
      c.target = rand(60, VW - 60);
      if (Math.random() < 0.3) c.idle = rand(0.2, 0.8);
    } else {
      const sp = (inPlay ? d.cowSpeed * (G.frenzy > 0 ? 1.5 : 1) : 45) * ts;
      const step = Math.sign(dx) * Math.min(Math.abs(dx), sp * dt);
      c.x += step;
      c.dir = Math.sign(dx) || c.dir;
      c.walk += dt * sp * 0.13;
    }
  }

  c.layT -= dt * ts;
  if (c.layT <= 0) {
    if (inPlay && G.dying <= 0 && c.enter <= 0) {
      const interval = G.frenzy > 0 ? 0.28 : d.interval;
      c.layT = interval * rand(0.7, 1.3);
      c.layKind = chooseLay();
      if (c.layKind === 'poop') c.tail = 1;
      c.laying = 0.24;
    } else if (G.state === 'menu') {
      c.layT = rand(2.5, 4.5);
      c.layKind = Math.random() < 0.15 ? 'golden' : 'egg';
      c.laying = 0.24;
    } else c.layT = 0.5;
  }
}

function catchItem(it) {
  const b = G.basket;
  b.bump = 1;
  if (it.kind === 'egg' || it.kind === 'golden') {
    G.combo++;
    G.bestCombo = Math.max(G.bestCombo, G.combo);
    const m = multiplier();
    const pts = (it.kind === 'golden' ? 50 : 10) * m;
    G.score += pts;
    G.eggs++;
    b.eggs++;
    if (it.kind === 'golden') {
      G.golden++;
      b.goldenIn = Math.min(b.goldenIn + 1, 7);
      sfx.golden();
      burst(it.x, rimY, 18, { color: ['#fff6a0', '#ffd23f', '#ffffff'], type: 'star', min: 80, max: 260, size: [4, 8] });
      floatText(it.x, rimY - 20, `+${pts}`, '#ffd23f', 28);
    } else {
      sfx.catch(G.combo);
      burst(it.x, rimY, 6, { color: ['#ffffff', '#fff1c4'], min: 40, max: 140, size: [2, 4] });
      floatText(it.x, rimY - 18, `+${pts}`, '#fff', m > 1 ? 24 : 20);
    }
    if (G.combo > 0 && G.combo % 5 === 0 && m <= 5) floatText(b.x, rimY - 50, `Kombo ×${m}!`, '#ffcf3a', 26);
    if (G.eggs >= G.nextLevelAt) levelUp();
  } else if (it.kind === 'poop') {
    G.combo = 0;
    b.dirty = 2.2;
    b.eggs = Math.max(0, b.eggs - 2);
    sfx.splat();
    burst(it.x, rimY, 16, { color: ['#6b4423', '#8a5a30', '#4e3018'], min: 60, max: 240, size: [3, 7] });
    floatText(it.x, rimY - 22, 'Fuj!', '#a8754a', 30);
    loseLife();
  } else if (it.kind === 'power') {
    applyPower(it.power, it.x);
  }
}

function applyPower(kind, x) {
  G.score += 25;
  if (kind === 'heart') {
    if (G.lives < G.maxLives) G.lives++;
    renderHearts();
    sfx.heart();
    floatText(x, rimY - 24, '+1 ❤️', '#ff5a5f', 26);
  } else {
    const dur = 7 * (1 + save.up.power * 0.25);
    G.power[kind] = dur;
    G.powerMax[kind] = dur;
    sfx.power();
    floatText(x, rimY - 24, POWERS[kind].name + '!', '#fff', 24);
  }
  burst(x, rimY, 14, { color: ['#ffffff', POWERS[kind].color], type: 'star', min: 60, max: 200, size: [3, 6] });
}

function landItem(it) {
  if (it.kind === 'egg' || it.kind === 'golden') {
    G.splats.push({ x: it.x, y: groundY + rand(2, 10), r: rand(15, 19), life: 4, golden: it.kind === 'golden', seed: Math.random() * 10 });
    burst(it.x, groundY, 8, { color: it.kind === 'golden' ? '#ffcf2e' : '#fff3df', type: 'shell', min: 80, max: 220, size: [4, 7], angle: -Math.PI / 2, spread: 1.1 });
    if (G.state === 'play') {
      sfx.crack();
      G.combo = 0;
      floatText(it.x, groundY - 30, 'Křach!', '#fff', 24);
      loseLife();
    }
  } else if (it.kind === 'poop') {
    G.splats.push({ x: it.x, y: groundY + rand(2, 8), r: rand(12, 15), life: 2.5, poop: true, seed: 0 });
    if (G.state === 'play') sfx.softLand();
  } else {
    burst(it.x, groundY - 8, 8, { color: '#ffffff', min: 30, max: 90, g: -60, size: [3, 6] });
  }
}

function loseLife() {
  if (G.dying > 0 || G.state !== 'play') return;
  G.lives--;
  G.shake = 0.35;
  G.hurt = 0.45;
  vibrate(70);
  renderHearts(G.lives);
  sfx.hurt();
  if (G.lives <= 0) {
    G.dying = 1.3;
    for (const c of G.cows) c.moo = 1;
    sfx.moo(0.8, 1.3);
  }
}

function levelUp() {
  G.level++;
  G.nextLevelAt += 10 + G.level * 2;
  sfx.level();
  const lead = G.cows[0];
  lead.moo = 1;
  setTimeout(() => sfx.moo(1.05), 250);

  if (G.level === 5 || G.level === 10) {
    const name = G.level === 5 ? 'Bára' : 'Líza';
    const skins = Object.keys(SKINS).filter((k) => k !== save.skin);
    const c = makeCow(name, G.level === 5 ? 60 : VW - 60, pick(skins), G.level === 5 ? 1.25 : 0.85);
    c.y = -80;
    c.layT = 2;
    G.cows.push(c);
    banner(`Přichází ${name}!`, `Úroveň ${G.level}`);
    setTimeout(() => sfx.moo(c.pitch), 700);
  } else if (G.level % 4 === 0) {
    G.frenzy = 5;
    sfx.frenzy();
    banner('Vaječná smršť!', 'Jen vejce, chytej!');
  } else {
    banner(`Úroveň ${G.level}`, pick(['Bětka přidává!', 'Rychleji!', 'Bučí to!', 'Vejce letí!', 'Pozor, kravince!']));
  }
}

function gameOver() {
  G.state = 'over';
  $('hud').hidden = true;
  const coins = G.eggs + G.golden * 4;
  save.coins += coins;
  save.eggs += G.eggs;
  const isBest = G.score > save.best;
  if (isBest) save.best = G.score;
  persist();
  sfx.over();
  $('over-title').textContent = G.score === 0 ? 'Ani jedno vejce?' : pick(['Konec hry!', 'Bů-ů-ů…', 'Vejce došla!', 'Hotovo!']);
  $('over-score').textContent = G.score;
  $('over-best-badge').hidden = !isBest || G.score === 0;
  $('over-eggs').textContent = G.eggs;
  $('over-golden').textContent = G.golden;
  $('over-combo').textContent = G.bestCombo;
  $('over-level').textContent = G.level;
  $('over-coins').textContent = coins;
  showScreen('scr-over');
}

/* ================= vstup ================= */

const input = { left: false, right: false, dragging: false, lastX: 0, pointerId: null };

function toVirtualX(clientX) {
  const r = cv.getBoundingClientRect();
  return (clientX - r.left) / scale;
}

cv.addEventListener('pointerdown', (e) => {
  initAudio();
  if (G.state === 'menu') {
    // ťuknutí na krávu v menu
    const r = cv.getBoundingClientRect();
    const vx = (e.clientX - r.left) / scale;
    const vy = (e.clientY - r.top) / scale;
    for (const c of G.cows) {
      if (Math.abs(vx - c.x) < 70 && vy > c.y - 110 && vy < c.y + 10) {
        c.moo = 1;
        sfx.moo(c.pitch * rand(0.95, 1.08));
        if (c.laying <= 0) {
          c.layKind = Math.random() < 0.3 ? 'golden' : 'egg';
          c.laying = 0.24;
        }
      }
    }
    return;
  }
  if (G.state !== 'play') return;
  input.dragging = true;
  input.pointerId = e.pointerId;
  input.lastX = toVirtualX(e.clientX);
  try {
    cv.setPointerCapture(e.pointerId);
  } catch {
    /* nic */
  }
});
cv.addEventListener('pointermove', (e) => {
  if (G.state !== 'play') return;
  if (e.pointerType === 'mouse') {
    // myš: košík jde přímo pod kurzor
    G.basket.x = clamp(toVirtualX(e.clientX), G.basket.w / 2, VW - G.basket.w / 2);
    return;
  }
  if (!input.dragging || e.pointerId !== input.pointerId) return;
  const x = toVirtualX(e.clientX);
  // relativní tažení – prst nezakrývá košík
  G.basket.x = clamp(G.basket.x + (x - input.lastX) * 1.15, G.basket.w / 2, VW - G.basket.w / 2);
  input.lastX = x;
});
const endDrag = (e) => {
  if (e.pointerId === input.pointerId) input.dragging = false;
};
cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', endDrag);

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') input.left = true;
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') input.right = true;
  else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
    if (G.state === 'play') pause();
    else if (G.state === 'paused') resume();
  } else if ((e.key === 'Enter' || e.key === ' ') && (G.state === 'menu' || G.state === 'over') && !anyModalOpen()) {
    e.preventDefault();
    startGame();
  }
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') input.left = false;
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') input.right = false;
});

/* ================= update ================= */

function update(dt) {
  G.t += dt;
  const inPlay = G.state === 'play';

  // obloha se mění s úrovní
  const targetPhase = G.state === 'menu' ? 0 : (G.level - 1) / 3;
  G.skyPhase += (targetPhase - G.skyPhase) * (1 - Math.exp(-dt * 0.8));

  for (const s of scenery.clouds) {
    s.x += s.v * dt;
    if (s.x - s.w > VW) {
      s.x = -s.w;
      s.y = rand(50, VH * 0.45);
    }
  }

  if (G.state === 'paused') return;

  if (inPlay) {
    for (const k of Object.keys(G.power)) G.power[k] = Math.max(0, G.power[k] - dt);
    G.frenzy = Math.max(0, G.frenzy - dt);
    G.hintT -= dt;
    if (G.hintT <= 0 && !hud.hint.classList.contains('gone')) hud.hint.classList.add('gone');

    const b = G.basket;
    const kb = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    b.vx += (kb * 520 - b.vx) * (1 - Math.exp(-dt * 14));
    if (kb || Math.abs(b.vx) > 1) b.x += b.vx * dt;
    b.w += (basketWidth() - b.w) * (1 - Math.exp(-dt * 10));
    b.x = clamp(b.x, b.w / 2, VW - b.w / 2);
    b.bump = Math.max(0, b.bump - dt * 6);
    b.dirty = Math.max(0, b.dirty - dt);

    if (G.dying > 0) {
      G.dying -= dt;
      if (G.dying <= 0) gameOver();
    }
  }

  for (const c of G.cows) updateCow(c, dt, inPlay);

  // padající předměty
  const d = difficulty();
  const ts = G.power.slow > 0 ? 0.55 : 1;
  const b = G.basket;
  for (let i = G.items.length - 1; i >= 0; i--) {
    const it = G.items[i];
    it.t += dt;
    it.py = it.y;
    const g = it.kind === 'power' ? d.g * 0.6 : d.g;
    it.vy += g * dt * ts;
    if (inPlay && G.power.magnet > 0 && it.y > cowY && it.vy > 0) {
      const dx = b.x - it.x;
      if (it.kind === 'egg' || it.kind === 'golden') it.x += dx * (1 - Math.exp(-dt * 3.2));
      else if (it.kind === 'poop' && Math.abs(dx) < 110) it.x -= Math.sign(dx || 1) * 70 * dt;
    }
    it.x += it.vx * dt * ts;
    it.y += it.vy * dt * ts;
    it.rot += it.vr * dt * ts;
    if (it.x < it.r) {
      it.x = it.r;
      it.vx = Math.abs(it.vx) * 0.6;
    } else if (it.x > VW - it.r) {
      it.x = VW - it.r;
      it.vx = -Math.abs(it.vx) * 0.6;
    }

    const lip = it.r * 0.55;
    if (inPlay && G.dying <= 0 && it.vy > 0 && it.py + lip < rimY + 4 && it.y + lip >= rimY + 4 && Math.abs(it.x - b.x) < b.w / 2 + it.r * 0.35) {
      catchItem(it);
      G.items.splice(i, 1);
      continue;
    }
    if (it.y + it.r * 0.8 >= groundY) {
      landItem(it);
      G.items.splice(i, 1);
    }
  }

  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    p.life += dt;
    if (p.life >= p.max) {
      G.parts.splice(i, 1);
      continue;
    }
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
  }
  for (let i = G.texts.length - 1; i >= 0; i--) {
    const t = G.texts[i];
    t.life += dt;
    t.y -= 50 * dt;
    if (t.life >= t.max) G.texts.splice(i, 1);
  }
  for (let i = G.splats.length - 1; i >= 0; i--) {
    G.splats[i].life -= dt;
    if (G.splats[i].life <= 0) G.splats.splice(i, 1);
  }
  G.shake = Math.max(0, G.shake - dt);
  G.hurt = Math.max(0, G.hurt - dt);
}

/* ================= render ================= */

function drawScenery(sky) {
  const g = ctx.createLinearGradient(0, 0, 0, groundY);
  g.addColorStop(0, sky.top);
  g.addColorStop(1, sky.bot);
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, VW + 40, VH + 40);

  if (sky.night > 0.02) {
    ctx.fillStyle = '#fff';
    for (const s of scenery.stars) {
      ctx.globalAlpha = sky.night * (0.5 + 0.5 * Math.sin(G.t * 2 + s.p));
      ctx.beginPath();
      ctx.arc(s.x, s.y * VH * 0.6, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // slunce / měsíc
  const sx = VW - 70;
  const sy = 120 + Math.sin(G.t * 0.3) * 4;
  const halo = ctx.createRadialGradient(sx, sy, 10, sx, sy, 90);
  halo.addColorStop(0, sky.sun);
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(sx, sy, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = sky.sun;
  ctx.beginPath();
  ctx.arc(sx, sy, 32, 0, Math.PI * 2);
  ctx.fill();
  if (sky.night > 0.5) {
    ctx.fillStyle = sky.top;
    ctx.globalAlpha = (sky.night - 0.5) * 2;
    ctx.beginPath();
    ctx.arc(sx + 14, sy - 8, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const c of scenery.clouds) drawCloud(ctx, c.x, c.y, c.w, c.a * (1 - sky.night * 0.5), false);

  // kopce
  const hill = (base, amp, freq, off, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-10, VH + 10);
    for (let x = -10; x <= VW + 10; x += 10) {
      ctx.lineTo(x, base - Math.sin(x * freq + off) * amp - Math.sin(x * freq * 2.3 + off * 2) * amp * 0.35);
    }
    ctx.lineTo(VW + 10, VH + 10);
    ctx.fill();
  };
  hill(groundY - 120, 26, 0.012, 1.3, sky.h1);
  hill(groundY - 60, 20, 0.018, 4.1, sky.h2);

  // plot
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.fillStyle = sky.night > 0.5 ? '#8a7560' : '#e7c79a';
  for (let x = 12; x < VW; x += 42) {
    ctx.beginPath();
    ctx.roundRect(x - 4, groundY - 46, 8, 46, 3);
    ctx.fill();
    ctx.stroke();
  }
  for (const yy of [groundY - 38, groundY - 22]) {
    ctx.beginPath();
    ctx.roundRect(-5, yy, VW + 10, 7, 3);
    ctx.fill();
    ctx.stroke();
  }

  // tráva
  ctx.fillStyle = sky.grass;
  ctx.beginPath();
  ctx.moveTo(-10, groundY);
  for (let x = -10; x <= VW + 10; x += 20) ctx.lineTo(x, groundY + Math.sin(x * 0.07) * 2);
  ctx.lineTo(VW + 10, VH + 20);
  ctx.lineTo(-10, VH + 20);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-10, groundY);
  for (let x = -10; x <= VW + 10; x += 20) ctx.lineTo(x, groundY + Math.sin(x * 0.07) * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(20,60,20,0.45)';
  for (const t of scenery.tufts) {
    const yy = groundY + 14 + (t.x * 7) % 14;
    ctx.beginPath();
    ctx.moveTo(t.x - 3, yy);
    ctx.lineTo(t.x - 5, yy - t.h);
    ctx.moveTo(t.x, yy);
    ctx.lineTo(t.x, yy - t.h - 2);
    ctx.moveTo(t.x + 3, yy);
    ctx.lineTo(t.x + 5, yy - t.h);
    ctx.stroke();
  }
  for (const f of scenery.flowers) {
    const yy = groundY + 20 + (f.x * 3) % 10;
    ctx.fillStyle = f.c;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(a) * 3.2, yy + Math.sin(a) * 3.2, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffb000';
    ctx.beginPath();
    ctx.arc(f.x, yy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSplat(s) {
  ctx.save();
  ctx.globalAlpha = Math.min(1, s.life);
  ctx.translate(s.x, s.y);
  ctx.scale(1, 0.42);
  if (s.poop) {
    ctx.fillStyle = '#5a3a1e';
    ctx.beginPath();
    ctx.ellipse(0, 0, s.r * 1.3, s.r, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const rr = s.r * (1.25 + 0.35 * Math.sin(s.seed + k * 2.1));
      ctx.lineTo(Math.cos(a) * rr * 1.3, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = s.golden ? '#ffb000' : '#ffc21a';
    ctx.beginPath();
    ctx.arc(0, 0, s.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(-s.r * 0.2, -s.r * 0.2, s.r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function render() {
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  if (G.shake > 0) {
    const m = G.shake * 18;
    ctx.translate(rand(-m, m), rand(-m, m));
  }
  const sky = skyAt(G.skyPhase);
  drawScenery(sky);

  for (const s of G.splats) drawSplat(s);

  // krávy na obláčcích
  for (const c of G.cows) {
    const bob = Math.sin(G.t * 1.6 + c.pitch * 3) * 3;
    drawCloud(ctx, c.x, c.y + 12 + bob, 160, 0.97);
    drawCow(ctx, {
      x: c.x,
      y: c.y + bob,
      s: 0.9,
      dir: c.dir,
      walk: c.walk,
      squash: c.squash,
      blink: c.blink > 0,
      moo: c.moo,
      tail: c.tail,
      skin: c.skin,
      t: G.t,
    });
    if (c.moo > 0.4) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (c.moo - 0.4) * 3);
      ctx.font = '700 20px Fredoka, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = OUTLINE;
      ctx.fillStyle = '#fff';
      const tx = c.x + c.dir * 70;
      const ty = c.y - 112 - (1 - c.moo) * 20;
      ctx.strokeText('Búúú!', tx, ty);
      ctx.fillText('Búúú!', tx, ty);
      ctx.restore();
    }
  }

  // předměty
  for (const it of G.items) {
    if (it.kind === 'egg' || it.kind === 'golden') drawEgg(ctx, it.x, it.y, it.r, it.rot, it.kind, it.t, it.tint);
    else if (it.kind === 'poop') drawPoop(ctx, it.x, it.y, it.r, it.rot, it.t);
    else drawPower(ctx, it.x, it.y, it.r, it.power, it.t);
  }

  // košík
  if (G.state !== 'menu') {
    const b = G.basket;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(b.x, groundY + 4, b.w * 0.45, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    drawBasket(ctx, b.x, rimY, b.w, BASKET_H, {
      eggs: b.eggs,
      goldenIn: b.goldenIn,
      dirty: b.dirty,
      bump: b.bump,
      t: G.t,
      magnet: G.power.magnet > 0,
    });
  }

  // částice
  for (const p of G.parts) {
    const a = 1 - p.life / p.max;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    if (p.type === 'star') star(ctx, p.x, p.y, p.size);
    else if (p.type === 'shell') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.moveTo(-p.size, 0);
      ctx.lineTo(0, -p.size * 0.8);
      ctx.lineTo(p.size, p.size * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // létající texty
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of G.texts) {
    const k = t.life / t.max;
    ctx.globalAlpha = 1 - k * k;
    const sc = k < 0.15 ? 0.6 + (k / 0.15) * 0.5 : 1.1 - Math.min(0.1, (k - 0.15) * 0.3);
    ctx.font = `700 ${Math.round(t.size * sc)}px Fredoka, system-ui, sans-serif`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = OUTLINE;
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;

  // efekty přes celou obrazovku
  if (G.power.slow > 0) {
    ctx.fillStyle = 'rgba(190,230,255,0.12)';
    ctx.fillRect(-20, -20, VW + 40, VH + 40);
  }
  if (G.frenzy > 0) {
    ctx.strokeStyle = `rgba(255,207,58,${0.35 + Math.sin(G.t * 12) * 0.25})`;
    ctx.lineWidth = 12;
    ctx.strokeRect(0, 0, VW, VH);
  }
  if (G.hurt > 0) {
    const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.25, VW / 2, VH / 2, VH * 0.75);
    vg.addColorStop(0, 'rgba(255,60,60,0)');
    vg.addColorStop(1, `rgba(255,60,60,${G.hurt})`);
    ctx.fillStyle = vg;
    ctx.fillRect(-20, -20, VW + 40, VH + 40);
  }
}

/* ================= smyčka ================= */

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  if (G.state === 'play') updateHud();
  requestAnimationFrame(frame);
}

/* ================= obrazovky ================= */

const SCREENS = ['scr-menu', 'scr-pause', 'scr-over', 'scr-shop', 'scr-help'];
let shopReturn = 'scr-menu';

function showScreen(id) {
  for (const s of SCREENS) $(s).hidden = s !== id;
  if (id === 'scr-menu') refreshMenu();
}
function anyModalOpen() {
  return ['scr-shop', 'scr-help', 'scr-pause'].some((s) => !$(s).hidden);
}

function refreshMenu() {
  $('menu-coins').textContent = save.coins;
  $('menu-best').textContent = save.best;
  const label = save.sound ? 'Zvuk: zap.' : 'Zvuk: vyp.';
  $('btn-sound').textContent = label;
  $('btn-pause-sound').textContent = label;
  $('btn-sound').setAttribute('aria-pressed', String(save.sound));
}

function goMenu() {
  G.state = 'menu';
  $('hud').hidden = true;
  G.items = [];
  G.level = 1;
  G.frenzy = 0;
  G.power = { slow: 0, magnet: 0, big: 0 };
  const main = G.cows[0];
  main.skin = save.skin;
  G.cows = [main];
  resize();
  showScreen('scr-menu');
}

function pause() {
  if (G.state !== 'play') return;
  G.state = 'paused';
  input.left = input.right = input.dragging = false;
  refreshMenu();
  showScreen('scr-pause');
}
function resume() {
  if (G.state !== 'paused') return;
  initAudio();
  G.state = 'play';
  showScreen(null);
  last = performance.now();
}

function toggleSound() {
  save.sound = !save.sound;
  setSound(save.sound);
  persist();
  refreshMenu();
  if (save.sound) {
    initAudio();
    sfx.click();
  }
}

/* ---------- obchod ---------- */

function renderShop() {
  $('shop-coins').textContent = save.coins;
  const ul = $('shop-upgrades');
  ul.innerHTML = '';
  for (const u of UPGRADES) {
    const lvl = save.up[u.id];
    const maxed = lvl >= u.costs.length;
    const cost = maxed ? 0 : u.costs[lvl];
    const row = document.createElement('div');
    row.className = 'upg';
    row.innerHTML = `
      <div class="upg-icon">${u.icon}</div>
      <div>
        <div class="upg-name">${u.name}</div>
        <div class="upg-desc">${u.desc}</div>
        <div class="pips">${u.costs.map((_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</div>
      </div>`;
    const btn = document.createElement('button');
    btn.className = 'btn buy' + (maxed ? '' : ' btn-primary');
    btn.innerHTML = maxed ? 'Max' : `<i class="coin"></i>${cost}`;
    btn.disabled = maxed || save.coins < cost;
    btn.addEventListener('click', () => {
      if (save.coins < cost || maxed) return;
      save.coins -= cost;
      save.up[u.id]++;
      persist();
      sfx.buy();
      renderShop();
    });
    row.appendChild(btn);
    ul.appendChild(row);
  }

  const grid = $('shop-skins');
  grid.innerHTML = '';
  for (const [id, sk] of Object.entries(SKINS)) {
    const owned = save.skins.includes(id);
    const el = document.createElement('button');
    el.className = 'skin' + (save.skin === id ? ' sel' : '') + (owned ? '' : ' locked') + (!owned && save.coins < sk.price ? ' cant' : '');
    const c = document.createElement('canvas');
    c.width = 220;
    c.height = 160;
    const cx = c.getContext('2d');
    cx.scale(2, 2);
    drawCow(cx, { x: 52, y: 74, s: 0.62, dir: 1, walk: 0, skin: id, t: 0.5 });
    el.appendChild(c);
    const nm = document.createElement('div');
    nm.className = 'nm';
    nm.textContent = sk.name;
    el.appendChild(nm);
    const pr = document.createElement('div');
    pr.className = 'pr';
    pr.innerHTML = owned ? (save.skin === id ? 'Vybraná' : 'Vybrat') : `<i class="coin"></i>${sk.price}`;
    el.appendChild(pr);
    el.addEventListener('click', () => {
      if (owned) {
        save.skin = id;
        G.cows[0].skin = id;
        G.cows[0].moo = 1;
        sfx.moo(rand(0.95, 1.1));
      } else if (save.coins >= sk.price) {
        save.coins -= sk.price;
        save.skins.push(id);
        save.skin = id;
        G.cows[0].skin = id;
        sfx.buy();
      } else {
        sfx.hurt();
        return;
      }
      persist();
      renderShop();
    });
    grid.appendChild(el);
  }
}

function openShop(from) {
  initAudio();
  shopReturn = from;
  renderShop();
  showScreen('scr-shop');
}

/* ---------- tlačítka ---------- */

const on = (id, fn) =>
  $(id).addEventListener('click', (e) => {
    initAudio();
    sfx.click();
    fn(e);
  });

on('btn-play', startGame);
on('btn-again', startGame);
on('btn-shop', () => openShop('scr-menu'));
on('btn-over-shop', () => openShop('scr-over'));
on('btn-shop-close', () => {
  if (shopReturn === 'scr-over') showScreen('scr-over');
  else showScreen('scr-menu');
});
on('btn-help', () => showScreen('scr-help'));
on('btn-help-close', () => showScreen(G.state === 'over' ? 'scr-over' : 'scr-menu'));
on('btn-menu', goMenu);
on('btn-pause', pause);
on('btn-resume', resume);
on('btn-quit', goMenu);
on('btn-sound', toggleSound);
on('btn-pause-sound', toggleSound);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pause();
    suspendAudio();
  } else {
    last = performance.now();
  }
});
window.addEventListener('blur', pause);
window.addEventListener('resize', resize);

/* ================= start ================= */

setSound(save.sound);
G.cows = [makeCow('Bětka', VW / 2, save.skin)];
G.cows[0].enter = 0;
resize();
G.menuCowY = VH * 0.58;
G.cows[0].y = G.menuCowY;
window.addEventListener('resize', () => {
  G.menuCowY = VH * 0.58;
});
showScreen('scr-menu');
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// pro testy v prohlížeči
window.__krava = { G, save };
