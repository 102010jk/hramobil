import * as THREE from './vendor/three.module.min.js';
import { sfx, initAudio, setSound, suspendAudio, ufoHum } from './audio.js';
import {
  makeCow,
  animateCow,
  makeGirl,
  animateGirl,
  makeAlien,
  ALIEN_TYPES,
  makeUfo,
  makeViewGun,
  makePickup,
  PROJ_GEO,
  PROJ_MAT,
  basic,
} from './models.js';
import { buildWorld, resolveCircle, pointBlocked, ARENA_R } from './world.js';

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const v3 = () => new THREE.Vector3();
const TMP = v3();
const TMP2 = v3();

const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');

/* ================= uložená data ================= */

const SAVE_KEY = 'vajecna-krava-fps-v1';
const save = (() => {
  const d = { best: 0, bestWave: 0, sound: true, shadows: !isTouch, sens: 1, assist: true };
  try {
    return { ...d, ...(JSON.parse(localStorage.getItem(SAVE_KEY) || 'null') || {}) };
  } catch {
    return d;
  }
})();
function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    /* bez ukládání */
  }
}

/* ================= renderer a scéna ================= */

const cv = $('cv');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !isTouch, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2));
renderer.shadowMap.enabled = save.shadows;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.05, 320);
camera.rotation.order = 'YXZ';
scene.add(camera);

const world = buildWorld(scene);
const colliders = world.colliders;

function resize() {
  const w = cv.clientWidth || window.innerWidth;
  const h = cv.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 88 : 72;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

function setShadows(on) {
  renderer.shadowMap.enabled = on;
  world.sun.castShadow = on;
  scene.traverse((o) => {
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.needsUpdate = true));
  });
}

/* ================= zbraně ================= */

const WEAPONS = [
  { id: 'egg', name: 'Vajíčkomet', mag: 8, reserve: Infinity, rate: 4, dmg: 1, speed: 46, spread: 0.008, pellets: 1, reload: 0.95, proj: 'egg', grav: 2.2, kick: 0.6, sfx: 'shotEgg' },
  { id: 'milk', name: 'Mléčný kulomet', mag: 40, reserve: 80, rate: 12, dmg: 0.45, speed: 60, spread: 0.03, pellets: 1, reload: 1.6, proj: 'drop', grav: 1.2, kick: 0.25, sfx: 'shotMilk' },
  { id: 'gold', name: 'Zlatá brokovnice', mag: 6, reserve: 12, rate: 1.4, dmg: 0.75, speed: 42, spread: 0.075, pellets: 8, reload: 1.8, proj: 'pellet', grav: 2, kick: 1.4, sfx: 'shotGold' },
];
const GUN_BASE = new THREE.Vector3(0.19, -0.16, -0.36);
const GUN_SCALE = 0.5;
const viewGuns = WEAPONS.map((w) => {
  const g = makeViewGun(w.id);
  g.visible = false;
  g.scale.setScalar(GUN_SCALE);
  camera.add(g);
  return g;
});

/* ================= postavy ================= */

const cow = { mesh: makeCow(), pos: v3(), target: v3(), hp: 100, max: 100, layT: 10, layCount: 0, mooCd: 0, alertCd: 0, walking: false, attacked: 0, lift: 0 };
scene.add(cow.mesh);

const GIRLS = [
  { name: 'Kája', hair: '#f2c14e', shirt: '#ff7aa8', helmet: '#5b7a3a', color: '#ff7aa8', baseAngle: Math.PI * 0.75 },
  { name: 'Míša', hair: '#3b2416', shirt: '#4aa3ff', helmet: '#c0485a', color: '#4aa3ff', baseAngle: Math.PI * 0.25 },
];
const girls = GIRLS.map((d) => {
  const mesh = makeGirl(d);
  scene.add(mesh);
  return { ...d, mesh, pos: v3(), hp: 60, max: 60, down: 0, fireCd: 1, barkCd: 3, walking: false, aiming: false, aimYaw: 0 };
});

const P = {
  pos: v3(),
  vel: v3(),
  y: 0,
  vy: 0,
  yaw: 0,
  pitch: 0,
  hp: 100,
  max: 100,
  weapon: 0,
  ammo: WEAPONS.map((w) => ({ mag: w.mag, reserve: w.reserve })),
  reloadT: 0,
  fireCd: 0,
  swapT: 0,
  recoil: 0,
  bob: 0,
  kills: 0,
  shots: 0,
  hits: 0,
  eggsEaten: 0,
  hurtT: 0,
  flashT: 0,
};

const S = {
  state: 'menu', // menu | play | paused | over
  t: 0,
  score: 0,
  wave: 0,
  queue: [],
  spawnCd: 0,
  breakT: 0,
  waveActive: false,
  enemies: [],
  projs: [],
  pickups: [],
  decals: [],
  ufo: null,
  overT: 0,
};

/* ================= částice ================= */

const particles = [];
const PARTICLE_GEO = new THREE.BoxGeometry(1, 1, 1);
for (let i = 0; i < 240; i++) {
  const m = new THREE.Mesh(PARTICLE_GEO, new THREE.MeshBasicMaterial({ color: '#fff' }));
  m.visible = false;
  scene.add(m);
  particles.push({ mesh: m, vel: v3(), life: 0, max: 1, grav: 9, active: false });
}
let pIdx = 0;
function burst(pos, n, colors, speed = 4, size = 0.08, grav = 9, life = 0.8) {
  for (let i = 0; i < n; i++) {
    const p = particles[pIdx];
    pIdx = (pIdx + 1) % particles.length;
    p.active = true;
    p.life = 0;
    p.max = rand(life * 0.5, life);
    p.grav = grav;
    p.mesh.visible = true;
    p.mesh.position.copy(pos);
    p.mesh.scale.setScalar(size * rand(0.6, 1.4));
    p.mesh.material.color.set(Array.isArray(colors) ? pick(colors) : colors);
    p.vel.set(rand(-1, 1), rand(-0.2, 1.2), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.4, 1));
  }
}
function updateParticles(dt) {
  for (const p of particles) {
    if (!p.active) continue;
    p.life += dt;
    if (p.life >= p.max) {
      p.active = false;
      p.mesh.visible = false;
      continue;
    }
    p.vel.y -= p.grav * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    if (p.mesh.position.y < 0.02) {
      p.mesh.position.y = 0.02;
      p.vel.multiplyScalar(0.3);
    }
    p.mesh.rotation.x += dt * 8;
    p.mesh.rotation.y += dt * 6;
    const k = 1 - p.life / p.max;
    p.mesh.scale.multiplyScalar(k > 0.3 ? 1 : 0.92);
  }
}

const DECAL_GEO = new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2);
function addDecal(x, z, kind) {
  const g = new THREE.Group();
  if (kind === 'egg') {
    const white = new THREE.Mesh(DECAL_GEO, basic('#fff8ec'));
    white.scale.set(0.32, 1, 0.26);
    const yolk = new THREE.Mesh(DECAL_GEO, basic('#ffc21a'));
    yolk.scale.setScalar(0.12);
    yolk.position.y = 0.004;
    g.add(white, yolk);
  } else {
    const goo = new THREE.Mesh(DECAL_GEO, basic(kind));
    goo.scale.set(0.6, 1, 0.5);
    g.add(goo);
  }
  g.position.set(x, 0.015 + Math.random() * 0.01, z);
  g.rotation.y = rand(0, 6);
  scene.add(g);
  S.decals.push({ mesh: g, life: 12 });
  if (S.decals.length > 40) scene.remove(S.decals.shift().mesh);
}

/* ================= HUD ================= */

const hud = {
  score: $('hud-score'),
  wave: $('hud-wave'),
  cow: $('hud-cow'),
  cowBar: document.querySelector('.cowbar'),
  ufo: $('hud-ufo'),
  ufoBar: $('hud-ufo-bar'),
  enemies: $('hud-enemies'),
  hp: $('hud-hp'),
  hpNum: $('hud-hp-num'),
  weapon: $('hud-weapon'),
  mag: $('hud-mag'),
  reserve: $('hud-reserve'),
  reload: $('hud-reload'),
  squad: $('hud-squad'),
  hit: $('hitmarker'),
  cross: $('crosshair'),
  vignette: $('vignette'),
  c: {},
};
function setText(el, key, val) {
  if (hud.c[key] !== val) {
    hud.c[key] = val;
    el.textContent = val;
  }
}
function setWidth(el, key, frac) {
  const v = Math.round(clamp(frac, 0, 1) * 100);
  if (hud.c[key] !== v) {
    hud.c[key] = v;
    el.style.width = v + '%';
  }
}
function updateHud() {
  setText(hud.score, 'score', String(S.score));
  setText(hud.wave, 'wave', `Vlna ${S.wave}`);
  setWidth(hud.cow, 'cow', cow.hp / cow.max);
  hud.cowBar.classList.toggle('danger', cow.hp < 35);
  hud.ufo.hidden = !S.ufo || S.ufo.phase !== 'beam';
  if (S.ufo) setWidth(hud.ufoBar, 'ufo', S.ufo.progress);
  const left = S.enemies.length + S.queue.length;
  setText(hud.enemies, 'en', S.waveActive ? `Ufoni: ${left}${S.ufo ? ' + UFO' : ''}` : S.breakT > 0 ? `Další vlna za ${Math.ceil(S.breakT)} s` : '');
  setWidth(hud.hp, 'hp', P.hp / P.max);
  setText(hud.hpNum, 'hpn', String(Math.ceil(P.hp)));
  const w = WEAPONS[P.weapon];
  const a = P.ammo[P.weapon];
  setText(hud.weapon, 'wn', w.name);
  setText(hud.mag, 'mag', String(a.mag));
  setText(hud.reserve, 'res', a.reserve === Infinity ? '/ ∞' : `/ ${a.reserve}`);
  hud.reload.hidden = P.reloadT <= 0;
  const sq = girls.map((g) => `${g.name}:${g.down > 0 ? 'd' + Math.ceil(g.down) : Math.round((g.hp / g.max) * 10)}`).join(',');
  if (hud.c.sq !== sq) {
    hud.c.sq = sq;
    hud.squad.innerHTML = girls
      .map(
        (g) =>
          `<div class="mate${g.down > 0 ? ' down' : ''}"><span class="dot" style="background:${g.color}"></span>${g.name} ${
            g.down > 0 ? `<small>vstává ${Math.ceil(g.down)} s</small>` : `<div class="bar"><i style="width:${(g.hp / g.max) * 100}%"></i></div>`
          }</div>`
      )
      .join('');
  }
  const gap = 5 + P.recoil * 10 + (P.vel.length() > 1 ? 3 : 0);
  hud.cross.style.setProperty('--gap', gap.toFixed(1) + 'px');
  hud.vignette.style.opacity = String(clamp(P.hurtT * 1.6 + (P.hp < 30 ? 0.25 + Math.sin(S.t * 5) * 0.1 : 0), 0, 1));
}

let hitTimer = 0;
function hitmarker(kill) {
  hud.hit.classList.add('on');
  hud.hit.classList.toggle('kill', !!kill);
  clearTimeout(hitTimer);
  hitTimer = setTimeout(() => hud.hit.classList.remove('on', 'kill'), kill ? 220 : 110);
}

let bannerTimer = 0;
function banner(text, sub = '') {
  const b = $('banner');
  b.innerHTML = sub ? `${text}<small>${sub}</small>` : text;
  b.classList.remove('show');
  void b.offsetWidth;
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), 2500);
}

function toast(html) {
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = html;
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), 2700);
}

function bark(g, lines) {
  if (g.barkCd > 0 || g.down > 0) return;
  g.barkCd = rand(7, 12);
  toast(`<b style="color:${g.color}">${g.name}:</b> ${pick(lines)}`);
}

/* ================= vstup ================= */

const input = { fwd: 0, side: 0, sprint: false, fire: false, jump: false, keys: new Set(), lookDX: 0, lookDY: 0 };
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const looks = new Map(); // pointerId -> {x, y}
const stickEl = $('stick');
const knobEl = $('knob');

function setStick(dx, dy) {
  const max = 50;
  const d = Math.hypot(dx, dy);
  const k = d > max ? max / d : 1;
  stick.x = (dx * k) / max;
  stick.y = (dy * k) / max;
  knobEl.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
}

cv.addEventListener('pointerdown', (e) => {
  initAudio();
  if (S.state !== 'play') return;
  if (e.pointerType === 'mouse') {
    if (document.pointerLockElement !== cv) requestLock();
    else if (e.button === 0) input.fire = true;
    return;
  }
  const r = cv.getBoundingClientRect();
  if (e.clientX - r.left < r.width * 0.42 && stick.id === null) {
    stick.id = e.pointerId;
    stick.ox = e.clientX;
    stick.oy = e.clientY;
    stickEl.style.left = e.clientX - r.left + 'px';
    stickEl.style.top = e.clientY - r.top + 'px';
    stickEl.style.bottom = 'auto';
    stickEl.classList.add('active');
    setStick(0, 0);
  } else {
    looks.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }
  try {
    cv.setPointerCapture(e.pointerId);
  } catch {
    /* nic */
  }
});
window.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') {
    if (document.pointerLockElement === cv && S.state === 'play') {
      input.lookDX += e.movementX * 0.0022 * save.sens;
      input.lookDY += e.movementY * 0.0022 * save.sens;
    }
    return;
  }
  if (e.pointerId === stick.id) {
    setStick(e.clientX - stick.ox, e.clientY - stick.oy);
  } else if (looks.has(e.pointerId)) {
    const l = looks.get(e.pointerId);
    input.lookDX += (e.clientX - l.x) * 0.0058 * save.sens;
    input.lookDY += (e.clientY - l.y) * 0.0058 * save.sens;
    l.x = e.clientX;
    l.y = e.clientY;
  }
});
function endPointer(e) {
  if (e.pointerType === 'mouse') {
    if (e.button === 0) input.fire = false;
    return;
  }
  if (e.pointerId === stick.id) {
    stick.id = null;
    setStick(0, 0);
    stick.x = stick.y = 0;
    stickEl.classList.remove('active');
    stickEl.style.left = '';
    stickEl.style.top = '';
    stickEl.style.bottom = '';
  }
  if (looks.has(e.pointerId)) {
    looks.delete(e.pointerId);
    if (e.pointerId === fireId) {
      fireId = null;
      input.fire = false;
      $('t-fire').classList.remove('on');
    }
  }
}
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);

// tlačítko střelby zároveň slouží k míření (jako v mobilních FPS)
let fireId = null;
$('t-fire').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  initAudio();
  fireId = e.pointerId;
  input.fire = true;
  looks.set(e.pointerId, { x: e.clientX, y: e.clientY });
  $('t-fire').classList.add('on');
  try {
    $('t-fire').setPointerCapture(e.pointerId);
  } catch {
    /* nic */
  }
});
const tap = (id, fn) =>
  $(id).addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    initAudio();
    fn();
  });
tap('t-jump', () => (input.jump = true));
tap('t-reload', () => startReload());
tap('t-swap', () => switchWeapon((P.weapon + 1) % WEAPONS.length));

function requestLock() {
  if (isTouch) return;
  try {
    const p = cv.requestPointerLock?.();
    if (p && p.catch) p.catch(() => {});
  } catch {
    /* nic */
  }
}
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== cv && S.state === 'play' && !isTouch) pause();
});

window.addEventListener('keydown', (e) => {
  input.keys.add(e.code);
  if (S.state === 'play') {
    if (e.code === 'Space') {
      input.jump = true;
      e.preventDefault();
    } else if (e.code === 'KeyR') startReload();
    else if (e.code === 'Digit1') switchWeapon(0);
    else if (e.code === 'Digit2') switchWeapon(1);
    else if (e.code === 'Digit3') switchWeapon(2);
    else if (e.code === 'KeyQ') switchWeapon((P.weapon + 2) % 3);
    else if (e.code === 'KeyP') pause();
  } else if (S.state === 'paused' && e.code === 'KeyP') {
    resume();
  }
});
window.addEventListener('keyup', (e) => input.keys.delete(e.code));
window.addEventListener(
  'wheel',
  (e) => {
    if (S.state !== 'play') return;
    switchWeapon((P.weapon + (e.deltaY > 0 ? 1 : 2)) % 3);
  },
  { passive: true }
);

function readMoveInput() {
  const k = input.keys;
  let f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
  let s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
  input.sprint = k.has('ShiftLeft') || k.has('ShiftRight');
  if (stick.id !== null) {
    f = -stick.y;
    s = stick.x;
    input.sprint = Math.hypot(stick.x, stick.y) > 0.95;
  }
  input.fwd = f;
  input.side = s;
}

/* ================= hráč a střelba ================= */

function switchWeapon(i) {
  if (i === P.weapon || S.state !== 'play') return;
  P.weapon = i;
  P.reloadT = 0;
  P.swapT = 0.3;
  P.fireCd = Math.max(P.fireCd, 0.25);
  viewGuns.forEach((g, k) => (g.visible = k === i));
  sfx.reload();
}

function startReload() {
  const w = WEAPONS[P.weapon];
  const a = P.ammo[P.weapon];
  if (P.reloadT > 0 || a.mag >= w.mag || a.reserve <= 0) return;
  P.reloadT = w.reload;
  sfx.reload();
}

function camForward(out) {
  return out.set(-Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), -Math.cos(P.yaw) * Math.cos(P.pitch));
}

function assistTarget(from, fwd) {
  if (!(isTouch && save.assist)) return null;
  let best = null;
  let bestAng = 0.075;
  for (const e of S.enemies) {
    if (e.spawnT > 0) continue;
    TMP2.copy(e.pos).setY(e.pos.y + 0.68 * e.T.scale).sub(from);
    const d = TMP2.length();
    if (d > 45) continue;
    const ang = Math.acos(clamp(TMP2.dot(fwd) / d, -1, 1));
    if (ang < bestAng) {
      bestAng = ang;
      best = e.pos.clone().setY(e.pos.y + 0.68 * e.T.scale);
    }
  }
  return best;
}

function firePlayer() {
  const w = WEAPONS[P.weapon];
  const gun = viewGuns[P.weapon];
  const muzzle = gun.userData.muzzle.getWorldPosition(v3());
  const fwd = camForward(v3());
  const aim = assistTarget(camera.position, fwd) || camera.position.clone().addScaledVector(fwd, 40);
  for (let i = 0; i < w.pellets; i++) {
    const dir = aim.clone().sub(muzzle).normalize();
    dir.x += rand(-w.spread, w.spread);
    dir.y += rand(-w.spread, w.spread);
    dir.z += rand(-w.spread, w.spread);
    dir.normalize();
    spawnProj('player', muzzle, dir, w.speed, w.proj, w.dmg, w.grav);
  }
  P.shots++;
  P.recoil = Math.min(1.5, P.recoil + w.kick);
  P.pitch = clamp(P.pitch + w.kick * 0.012, -1.45, 1.45);
  P.flashT = 0.05;
  sfx[w.sfx]();
}

function updatePlayer(dt) {
  readMoveInput();
  // rozhlížení
  P.yaw -= input.lookDX;
  P.pitch = clamp(P.pitch - input.lookDY, -1.45, 1.45);
  input.lookDX = input.lookDY = 0;

  // pohyb
  const speed = input.sprint ? 8.2 : 5.4;
  const fx = -Math.sin(P.yaw);
  const fz = -Math.cos(P.yaw);
  const rx = Math.cos(P.yaw);
  const rz = -Math.sin(P.yaw);
  let mx = fx * input.fwd + rx * input.side;
  let mz = fz * input.fwd + rz * input.side;
  const ml = Math.hypot(mx, mz);
  if (ml > 1) {
    mx /= ml;
    mz /= ml;
  }
  const k = 1 - Math.exp(-dt * (P.y > 0 ? 3 : 12));
  P.vel.x += (mx * speed - P.vel.x) * k;
  P.vel.z += (mz * speed - P.vel.z) * k;
  P.pos.x += P.vel.x * dt;
  P.pos.z += P.vel.z * dt;
  resolveCircle(P.pos, 0.4, colliders, P.y);
  // nechodit skrz Bětku a parťačky
  pushOut(P.pos, cow.pos, 1.3);
  for (const g of girls) pushOut(P.pos, g.pos, 0.75);

  if (input.jump && P.y <= 0) P.vy = 5.4;
  input.jump = false;
  P.vy -= 15 * dt;
  P.y = Math.max(0, P.y + P.vy * dt);
  if (P.y <= 0) P.vy = 0;

  const moving = Math.hypot(P.vel.x, P.vel.z);
  if (P.y <= 0) P.bob += dt * moving * 1.7;
  const bobY = Math.sin(P.bob * 2) * 0.04 * Math.min(1, moving / 5);
  camera.position.set(P.pos.x, 1.6 + P.y + bobY, P.pos.z);
  camera.rotation.set(P.pitch, P.yaw, 0);

  // zbraň
  const w = WEAPONS[P.weapon];
  const a = P.ammo[P.weapon];
  P.fireCd -= dt;
  P.swapT = Math.max(0, P.swapT - dt);
  if (P.reloadT > 0) {
    P.reloadT -= dt;
    if (P.reloadT <= 0) {
      const take = Math.min(w.mag - a.mag, a.reserve);
      a.mag += take;
      if (a.reserve !== Infinity) a.reserve -= take;
    }
  } else if (input.fire && P.fireCd <= 0 && P.swapT <= 0) {
    if (a.mag > 0) {
      firePlayer();
      a.mag--;
      P.fireCd = 1 / w.rate;
      if (a.mag === 0) {
        if (a.reserve > 0) startReload();
        else if (P.weapon !== 0) {
          toast('Došly náboje – sbírej <b>zlatá vejce</b>!');
          switchWeapon(0);
        }
      }
    } else if (a.reserve > 0) startReload();
    else {
      sfx.empty();
      P.fireCd = 0.3;
      if (P.weapon !== 0) switchWeapon(0);
    }
  }

  // pohled na zbraň
  P.recoil = Math.max(0, P.recoil - dt * 6);
  P.flashT -= dt;
  const gun = viewGuns[P.weapon];
  const reloadK = P.reloadT > 0 ? Math.sin((1 - P.reloadT / w.reload) * Math.PI) : 0;
  gun.position.set(
    GUN_BASE.x + Math.sin(P.bob) * 0.012 * Math.min(1, moving / 5),
    GUN_BASE.y - Math.abs(Math.cos(P.bob)) * 0.012 * Math.min(1, moving / 5) - P.swapT * 0.8 - reloadK * 0.12,
    GUN_BASE.z + P.recoil * 0.06
  );
  gun.rotation.set(P.recoil * 0.12 - reloadK * 0.7, 0, reloadK * 0.4);
  gun.userData.flash.visible = P.flashT > 0;
  gun.userData.flash.scale.setScalar(rand(0.05, 0.1));
  if (gun.userData.spin) gun.userData.spin.rotation.z += dt * (input.fire && a.mag > 0 ? 30 : 2);

  P.hurtT = Math.max(0, P.hurtT - dt);

  // sbírání vajec
  for (let i = S.pickups.length - 1; i >= 0; i--) {
    const pk = S.pickups[i];
    if (pk.vy !== 0) continue;
    if (Math.hypot(pk.pos.x - P.pos.x, pk.pos.z - P.pos.z) < 1.3) {
      if (pk.kind === 'health') {
        if (P.hp >= P.max) continue;
        P.hp = Math.min(P.max, P.hp + 30);
        P.eggsEaten++;
        toast('🥚 +30 zdraví');
      } else {
        P.ammo[1].reserve += 60;
        P.ammo[2].reserve += 8;
        toast('🥚✨ Zlaté vejce: náboje doplněny');
      }
      sfx.pickup();
      scene.remove(pk.mesh);
      S.pickups.splice(i, 1);
    }
  }
}

function pushOut(p, o, min) {
  const dx = p.x - o.x;
  const dz = p.z - o.z;
  const d = Math.hypot(dx, dz);
  if (d < min && d > 1e-4) {
    p.x = o.x + (dx / d) * min;
    p.z = o.z + (dz / d) * min;
  }
}

function damagePlayer(d, from) {
  if (S.state !== 'play') return;
  P.hp -= d;
  P.hurtT = Math.min(0.6, P.hurtT + 0.3);
  sfx.playerHurt();
  try {
    navigator.vibrate?.(40);
  } catch {
    /* nic */
  }
  if (from) {
    // trhnutí kamery od zásahu
    P.pitch += rand(-0.02, 0.02);
    P.yaw += rand(-0.02, 0.02);
  }
  if (P.hp <= 0) {
    P.hp = 0;
    gameOver('player');
  }
}

/* ================= projektily ================= */

function spawnProj(owner, from, dir, speed, kind, dmg, grav) {
  const geoKind = kind === 'ally' ? 'egg' : kind;
  const mesh = new THREE.Mesh(PROJ_GEO[geoKind], PROJ_MAT[kind]);
  mesh.position.copy(from);
  scene.add(mesh);
  const pr = { owner, mesh, pos: mesh.position, vel: dir.clone().multiplyScalar(speed), dmg, grav, kind, life: 2.5 };
  S.projs.push(pr);
  return pr;
}

function enemyCenter(e, out) {
  return out.copy(e.pos).setY(e.pos.y + 0.68 * e.T.scale);
}

function updateProjs(dt) {
  for (let i = S.projs.length - 1; i >= 0; i--) {
    const pr = S.projs[i];
    pr.life -= dt;
    let dead = pr.life <= 0;
    const steps = Math.max(1, Math.ceil((pr.vel.length() * dt) / 0.3));
    const h = dt / steps;
    for (let s = 0; s < steps && !dead; s++) {
      pr.vel.y -= pr.grav * h;
      pr.pos.addScaledVector(pr.vel, h);
      if (pr.pos.y <= 0.03) {
        dead = true;
        if (pr.kind === 'egg' || pr.kind === 'ally') addDecal(pr.pos.x, pr.pos.z, 'egg');
        burst(pr.pos, 4, pr.kind === 'plasma' ? '#7dff5a' : ['#fff8ec', '#ffc21a'], 2, 0.05);
        break;
      }
      if (pointBlocked(pr.pos, colliders)) {
        dead = true;
        burst(pr.pos, 5, pr.kind === 'plasma' ? '#7dff5a' : ['#fff8ec', '#ffc21a'], 2.5, 0.05);
        break;
      }
      if (pr.owner !== 'enemy') {
        for (const e of S.enemies) {
          if (e.dead || e.spawnT > 0) continue;
          const r = 0.52 * e.T.scale + 0.05;
          if (enemyCenter(e, TMP).distanceToSquared(pr.pos) < r * r) {
            hitEnemy(e, pr);
            dead = true;
            break;
          }
        }
        if (!dead && S.ufo && S.ufo.phase !== 'dying') {
          const u = S.ufo.mesh.position;
          const dx = (pr.pos.x - u.x) / 3.2;
          const dy = (pr.pos.y - u.y) / 1.1;
          const dz = (pr.pos.z - u.z) / 3.2;
          if (dx * dx + dy * dy + dz * dz < 1) {
            hitUfo(pr);
            dead = true;
          }
        }
      } else {
        // zásah hráče
        const dxp = pr.pos.x - P.pos.x;
        const dzp = pr.pos.z - P.pos.z;
        if (dxp * dxp + dzp * dzp < 0.45 * 0.45 && pr.pos.y > P.y && pr.pos.y < P.y + 1.8) {
          damagePlayer(pr.dmg, pr.pos);
          burst(pr.pos, 6, '#7dff5a', 2, 0.05);
          dead = true;
          break;
        }
        for (const g of girls) {
          if (g.down > 0) continue;
          const dx = pr.pos.x - g.pos.x;
          const dz = pr.pos.z - g.pos.z;
          if (dx * dx + dz * dz < 0.4 * 0.4 && pr.pos.y < 1.8) {
            damageGirl(g, pr.dmg);
            burst(pr.pos, 6, '#7dff5a', 2, 0.05);
            dead = true;
            break;
          }
        }
        if (!dead && cow.lift <= 0) {
          TMP.copy(cow.pos).setY(1);
          if (TMP.distanceToSquared(pr.pos) < 1.0) {
            damageCow(pr.dmg * 0.6);
            dead = true;
          }
        }
      }
    }
    if (pr.kind !== 'plasma' && pr.kind !== 'drop' && pr.kind !== 'pellet') pr.mesh.lookAt(TMP2.copy(pr.pos).add(pr.vel));
    if (dead) {
      scene.remove(pr.mesh);
      S.projs.splice(i, 1);
    }
  }
}

/* ================= ufoni ================= */

function spawnEnemy(type, at) {
  const mesh = makeAlien(type);
  const T = ALIEN_TYPES[type];
  const hpScale = 1 + Math.max(0, S.wave - 6) * 0.08;
  const e = {
    type,
    T,
    mesh,
    pos: mesh.position,
    hp: T.hp * hpScale,
    shootCd: rand(2, 4),
    hurtT: 0,
    spawnT: 0.7,
    target: null,
    retarget: 0,
    stuckT: 0,
    side: Math.random() < 0.5 ? -1 : 1,
    sideT: 0,
    t: rand(0, 6),
    meleeCd: 0,
  };
  if (at) e.pos.copy(at);
  else {
    const pts = world.spawnPoints.filter((p) => p.distanceTo(P.pos) > 14);
    e.pos.copy(pick(pts.length ? pts : world.spawnPoints));
    e.pos.x += rand(-2, 2);
    e.pos.z += rand(-2, 2);
  }
  mesh.scale.setScalar(0.01);
  scene.add(mesh);
  S.enemies.push(e);
  // paprsek při výsadku
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 14, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#9dff8a', transparent: true, opacity: 0.45, depthWrite: false }));
  beam.position.set(e.pos.x, 7, e.pos.z);
  scene.add(beam);
  e.beam = beam;
  if (e.pos.distanceTo(P.pos) < 30) sfx.alienSpawn();
}

function pickTarget(e) {
  let best = { kind: 'cow', pos: cow.pos, d: e.pos.distanceTo(cow.pos) };
  const dp = e.pos.distanceTo(P.pos);
  if (dp < 9 && dp < best.d) best = { kind: 'player', pos: P.pos, d: dp };
  for (const g of girls) {
    if (g.down > 0) continue;
    const d = e.pos.distanceTo(g.pos);
    if (d < 5 && d < best.d) best = { kind: 'girl', girl: g, pos: g.pos, d };
  }
  return best;
}

function updateEnemies(dt) {
  const tsMul = 1;
  for (let i = S.enemies.length - 1; i >= 0; i--) {
    const e = S.enemies[i];
    const T = e.T;
    e.t += dt;
    if (e.spawnT > 0) {
      e.spawnT -= dt;
      const k = 1 - Math.max(0, e.spawnT) / 0.7;
      e.mesh.scale.setScalar(Math.max(0.01, k));
      e.beam.material.opacity = 0.45 * (1 - k);
      if (e.spawnT <= 0) {
        scene.remove(e.beam);
        e.beam.geometry.dispose();
        e.beam = null;
        e.mesh.scale.setScalar(1);
      }
      continue;
    }
    e.retarget -= dt;
    if (e.retarget <= 0 || !e.target) {
      e.target = pickTarget(e);
      e.retarget = 0.5;
    }
    const tg = e.target;
    const dx = tg.pos.x - e.pos.x;
    const dz = tg.pos.z - e.pos.z;
    const dist = Math.hypot(dx, dz) || 1;
    const reach = tg.kind === 'cow' ? 1.3 + 0.45 * T.scale : 1.0 + 0.3 * T.scale;
    let vx = 0;
    let vz = 0;
    if (dist > reach && !(tg.kind === 'cow' && cow.lift > 0.05)) {
      vx = (dx / dist) * T.speed;
      vz = (dz / dist) * T.speed;
      // obcházení překážek
      if (e.sideT > 0) {
        e.sideT -= dt;
        vx += (-dz / dist) * e.side * T.speed * 0.9;
        vz += (dx / dist) * e.side * T.speed * 0.9;
      }
      // rozestupy
      for (const o of S.enemies) {
        if (o === e) continue;
        const ox = e.pos.x - o.pos.x;
        const oz = e.pos.z - o.pos.z;
        const od = ox * ox + oz * oz;
        if (od < 1.4 && od > 1e-4) {
          vx += (ox / od) * 0.6;
          vz += (oz / od) * 0.6;
        }
      }
    }
    const bx = e.pos.x;
    const bz = e.pos.z;
    e.pos.x += vx * dt * tsMul;
    e.pos.z += vz * dt * tsMul;
    const hit = resolveCircle(e.pos, 0.42 * T.scale, colliders);
    const moved = Math.hypot(e.pos.x - bx, e.pos.z - bz);
    if (hit && vx * vx + vz * vz > 0.1 && moved < T.speed * dt * 0.4) {
      e.stuckT += dt;
      if (e.stuckT > 0.25) {
        e.sideT = 1.2;
        e.stuckT = 0;
        if (Math.random() < 0.3) e.side *= -1;
      }
    } else e.stuckT = 0;

    e.mesh.rotation.y = Math.atan2(dx, dz);
    const inner = e.mesh.userData.inner;
    const walking = vx * vx + vz * vz > 0.1;
    inner.position.y = walking ? Math.abs(Math.sin(e.t * T.speed * 2.2)) * 0.25 * T.scale : 0;
    inner.scale.set(T.scale, T.scale * (1 + Math.sin(e.t * 6) * 0.04), T.scale);

    // útok zblízka
    if (dist <= reach + 0.1) {
      if (tg.kind === 'cow') {
        if (cow.lift <= 0.05) {
          damageCow(T.dmgCow * dt);
          if (Math.random() < dt * 6) burst(TMP.copy(cow.pos).setY(1.1), 2, ['#9dff8a', '#ffffff'], 2, 0.05, 2, 0.4);
        }
      } else {
        e.meleeCd -= dt;
        if (e.meleeCd <= 0) {
          e.meleeCd = 0.8;
          if (tg.kind === 'player') damagePlayer(8 * T.scale, e.pos);
          else damageGirl(tg.girl, 8 * T.scale);
          sfx.zap();
        }
      }
    }

    // střelba na hráče
    if (T.shoots) {
      e.shootCd -= dt;
      const dp = e.pos.distanceTo(P.pos);
      if (e.shootCd <= 0 && dp < 24 && dp > 2.5) {
        e.shootCd = rand(2.2, 3.8) * (e.type === 'tank' ? 1.2 : 1);
        const from = enemyCenter(e, v3());
        from.y += 0.1;
        const aim = TMP.set(P.pos.x, 1.2 + P.y, P.pos.z).sub(from).normalize();
        const n = e.type === 'tank' ? 3 : 1;
        for (let k = 0; k < n; k++) {
          const dir = aim.clone();
          const yawOff = (k - (n - 1) / 2) * 0.12 + rand(-0.05, 0.05);
          dir.applyAxisAngle(THREE.Object3D.DEFAULT_UP, yawOff);
          dir.y += rand(-0.03, 0.03);
          spawnProj('enemy', from, dir.normalize(), 13 + Math.min(S.wave, 10) * 0.4, 'plasma', e.type === 'tank' ? 10 : 7, 0);
        }
        if (dp < 30) sfx.zap();
      }
    }

    // záblesk po zásahu
    e.hurtT = Math.max(0, e.hurtT - dt);
    e.mesh.userData.bodyMat.emissive.setScalar(e.hurtT > 0 ? 0.8 : 0);
  }
}

function hitEnemy(e, pr) {
  e.hp -= pr.dmg;
  e.hurtT = 0.08;
  TMP.copy(pr.vel).setY(0).normalize();
  e.pos.addScaledVector(TMP, 0.12 / e.T.scale);
  burst(pr.pos, 5, ['#fff8ec', '#ffc21a', e.T.color], 3, 0.06);
  if (pr.owner === 'player') {
    P.hits++;
    sfx.hit();
  }
  if (e.hp <= 0) killEnemy(e, pr.owner);
  else if (pr.owner === 'player') hitmarker(false);
}

function killEnemy(e, owner) {
  e.dead = true;
  const c = enemyCenter(e, v3());
  burst(c, 18, [e.T.color, e.T.belly, '#ffffff'], 6, 0.12, 9, 1);
  addDecal(e.pos.x, e.pos.z, e.T.color);
  scene.remove(e.mesh);
  if (e.beam) scene.remove(e.beam);
  S.enemies.splice(S.enemies.indexOf(e), 1);
  sfx.alienDie();
  S.score += e.T.score;
  if (owner === 'player') {
    P.kills++;
    hitmarker(true);
  } else if (owner === 'ally') {
    const g = pick(girls);
    bark(g, ['Mám ho!', 'Jeden ufoun dole!', 'Bětku nedostanete!', 'Vajíčko do čela!', 'Hezká trefa, co?']);
  }
  const r = Math.random();
  if (r < 0.08) dropPickup(e.pos, 'health');
  else if (r < 0.2) dropPickup(e.pos, 'ammo');
}

/* ================= UFO ================= */

function spawnUfo() {
  const mesh = makeUfo();
  mesh.position.set(rand(-30, 30), 24, -55);
  scene.add(mesh);
  const hp = 32 + S.wave * 3;
  S.ufo = { mesh, hp, max: hp, phase: 'arrive', progress: 0, dropCd: 6, hurtT: 0, dieT: 0 };
  banner('Pozor, UFO!', 'Chce unést Bětku – sestřel ho!');
  girls.forEach((g) => (g.barkCd = 0));
  bark(pick(girls), ['Nahoře! Talíř!', 'To je UFO! Střílej nahoru!', 'Bětku si neodnesou!']);
  ufoHum(true);
}

function hitUfo(pr) {
  const u = S.ufo;
  u.hp -= pr.dmg;
  u.hurtT = 0.08;
  burst(pr.pos, 5, ['#ffffff', '#c9ced6', '#ffe27a'], 3, 0.07);
  if (pr.owner === 'player') {
    P.hits++;
    hitmarker(false);
    sfx.hit();
  }
  if (u.hp <= 0 && u.phase !== 'dying') {
    u.phase = 'dying';
    u.dieT = 1.4;
    u.mesh.userData.beam.visible = false;
    ufoHum(false);
    if (pr.owner === 'player') hitmarker(true);
  }
}

function updateUfo(dt) {
  const u = S.ufo;
  if (!u) {
    cow.lift = Math.max(0, cow.lift - dt * 0.5);
    return;
  }
  const m = u.mesh;
  const ud = m.userData;
  ud.lights.forEach((l, i) => (l.visible = Math.floor(S.t * 8 + i) % 2 === 0));
  m.rotation.y += dt * 0.8;
  u.hurtT = Math.max(0, u.hurtT - dt);
  if (u.phase === 'arrive') {
    TMP.set(cow.pos.x, 10, cow.pos.z).sub(m.position);
    const d = TMP.length();
    if (d < 0.5) {
      u.phase = 'beam';
      ud.beam.visible = true;
    } else m.position.addScaledVector(TMP.normalize(), Math.min(d, 14 * dt));
  } else if (u.phase === 'beam') {
    m.position.x += (cow.pos.x - m.position.x) * dt * 2;
    m.position.z += (cow.pos.z - m.position.z) * dt * 2;
    m.position.y = 10 + Math.sin(S.t * 2) * 0.2;
    u.progress = Math.min(1, u.progress + dt / 26);
    cow.lift = u.progress;
    ud.beam.scale.set(1, 10, 1);
    ud.beam.position.y = -5;
    ud.beamMat.opacity = 0.2 + Math.sin(S.t * 10) * 0.06;
    u.dropCd -= dt;
    if (u.dropCd <= 0 && S.enemies.length < 14) {
      u.dropCd = 7;
      const at = v3(m.position.x + rand(-4, 4), 0, m.position.z + rand(-4, 4));
      resolveCircle(at, 0.5, colliders);
      spawnEnemy('grunt', at);
    }
    if (u.progress >= 1) gameOver('ufo');
  } else if (u.phase === 'dying') {
    u.dieT -= dt;
    m.rotation.z += dt * 2;
    m.position.y -= dt * 4;
    if (Math.random() < dt * 20) burst(m.position, 3, ['#ff8a3d', '#ffe27a', '#555555'], 5, 0.2, 3, 1);
    if (u.dieT <= 0) {
      burst(m.position, 60, ['#ff8a3d', '#ffe27a', '#c9ced6', '#7dff5a'], 12, 0.25, 6, 1.6);
      sfx.boom();
      scene.remove(m);
      S.ufo = null;
      S.score += 2000;
      banner('UFO sestřeleno!', '+2000');
      girls.forEach((g) => (g.barkCd = 0));
      bark(pick(girls), ['Jóóó! To byla rána!', 'Bětka zůstává doma!', 'A neopovažujte se vrátit!']);
      sfx.moo(1.1);
    }
  }
  for (const l of ud.lights) l.scale.setScalar(u.hurtT > 0 ? 0.3 : 0.16);
}

/* ================= kráva ================= */

function damageCow(d) {
  if (S.state !== 'play') return;
  cow.hp -= d;
  cow.attacked = 0.3;
  if (cow.mooCd <= 0) {
    cow.mooCd = 3.5;
    sfx.moo(rand(1.1, 1.25), 0.7);
  }
  if (cow.alertCd <= 0) {
    cow.alertCd = 8;
    toast('🐮 <b>Bětka je v ohrožení!</b>');
  }
  if (cow.hp <= 0) {
    cow.hp = 0;
    gameOver('cow');
  }
}

function dropPickup(at, kind, pop = false) {
  const mesh = makePickup(kind);
  mesh.position.set(at.x, pop ? 1 : 0.5, at.z);
  scene.add(mesh);
  const pk = { mesh, pos: mesh.position, kind, life: 30, vy: pop ? 3 : 0, vx: pop ? rand(-2, 2) : 0, vz: pop ? rand(-2, 2) : 0 };
  S.pickups.push(pk);
}

function updateCow(dt) {
  cow.mooCd -= dt;
  cow.alertCd -= dt;
  cow.attacked = Math.max(0, cow.attacked - dt);
  if (cow.lift <= 0.02) {
    const dx = cow.target.x - cow.pos.x;
    const dz = cow.target.z - cow.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.3) {
      const a = rand(0, Math.PI * 2);
      const r = rand(0, 3.2);
      cow.target.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    } else {
      const sp = cow.attacked > 0 ? 1.8 : 0.8;
      cow.pos.x += (dx / d) * sp * dt;
      cow.pos.z += (dz / d) * sp * dt;
      const want = Math.atan2(dx, dz);
      let diff = want - cow.mesh.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      cow.mesh.rotation.y += diff * Math.min(1, dt * 4);
    }
    cow.walking = d >= 0.3;
  } else cow.walking = false;
  cow.mesh.position.set(cow.pos.x, cow.lift * 8.2, cow.pos.z);
  cow.mesh.rotation.z = cow.lift > 0.02 ? Math.sin(S.t * 3) * 0.15 : 0;
  animateCow(cow.mesh, S.t, cow.walking || cow.lift > 0.02);

  if (S.state === 'play') {
    cow.layT -= dt;
    if (cow.layT <= 0 && cow.lift <= 0.02) {
      cow.layCount++;
      const lowAmmo = P.ammo[1].reserve + P.ammo[1].mag < 20;
      const kind = cow.layCount % 3 === 0 || (lowAmmo && cow.layCount % 2 === 0) ? 'ammo' : 'health';
      const rear = v3(-Math.sin(cow.mesh.rotation.y) * 0.9, 0, -Math.cos(cow.mesh.rotation.y) * 0.9).add(cow.pos);
      dropPickup(rear, kind, true);
      sfx.plop();
      cow.layT = P.hp < 50 ? 9 : 14;
    }
  }
}

function updatePickups(dt) {
  for (let i = S.pickups.length - 1; i >= 0; i--) {
    const pk = S.pickups[i];
    pk.life -= dt;
    if (pk.vy !== 0 || pk.pos.y > 0.5) {
      pk.vy -= 12 * dt;
      pk.pos.x += pk.vx * dt;
      pk.pos.z += pk.vz * dt;
      pk.pos.y += pk.vy * dt;
      if (pk.pos.y <= 0.5) {
        pk.pos.y = 0.5;
        pk.vy = 0;
      }
      resolveCircle(pk.pos, 0.3, colliders);
    } else {
      pk.mesh.position.y = 0.5 + Math.sin(S.t * 3 + i) * 0.08;
    }
    pk.mesh.rotation.y += dt * 2;
    pk.mesh.visible = pk.life > 5 || Math.floor(pk.life * 6) % 2 === 0;
    if (pk.life <= 0) {
      scene.remove(pk.mesh);
      S.pickups.splice(i, 1);
    }
  }
}

/* ================= parťačky ================= */

function damageGirl(g, d) {
  if (g.down > 0 || S.state !== 'play') return;
  g.hp -= d;
  if (g.hp <= 0) {
    g.hp = 0;
    g.down = 12;
    toast(`<b style="color:${g.color}">${g.name}</b> je k zemi! Dojdi k ní, ať vstane dřív.`);
  } else if (g.hp < 25) bark(g, ['Au! Potřebuju pomoc!', 'Ty zelený potvory!', 'Kryj mě!']);
}

function updateGirls(dt) {
  girls.forEach((g, i) => {
    g.barkCd -= dt;
    if (g.down > 0) {
      const near = Math.hypot(g.pos.x - P.pos.x, g.pos.z - P.pos.z) < 2.4;
      g.down -= dt * (near ? 4 : 1);
      if (g.down <= 0) {
        g.down = 0;
        g.hp = g.max * 0.6;
        g.barkCd = 0;
        bark(g, ['Jsem zpátky!', 'Díky! Jdeme na ně!', 'To nic, jen škrábnutí.']);
      }
      animateGirl(g.mesh, S.t, false, false, true);
      return;
    }
    // hlídková pozice u Bětky
    const a = g.baseAngle + Math.sin(S.t * 0.15 + i * 2) * 0.9;
    const gx = cow.pos.x + Math.cos(a) * 5.5;
    const gz = cow.pos.z + Math.sin(a) * 5.5;
    const dx = gx - g.pos.x;
    const dz = gz - g.pos.z;
    const d = Math.hypot(dx, dz);
    g.walking = d > 0.8;
    if (g.walking) {
      g.pos.x += (dx / d) * 3.8 * dt;
      g.pos.z += (dz / d) * 3.8 * dt;
      resolveCircle(g.pos, 0.35, colliders);
    }
    // cíl
    let target = null;
    let best = 26;
    for (const e of S.enemies) {
      if (e.spawnT > 0) continue;
      const de = e.pos.distanceTo(g.pos);
      if (de < best) {
        best = de;
        target = e;
      }
    }
    let ufoTarget = false;
    if (!target && S.ufo && S.ufo.phase === 'beam') ufoTarget = true;
    g.aiming = !!target || ufoTarget;
    let face = g.walking ? Math.atan2(dx, dz) : g.mesh.rotation.y;
    if (target) face = Math.atan2(target.pos.x - g.pos.x, target.pos.z - g.pos.z);
    else if (ufoTarget) face = Math.atan2(S.ufo.mesh.position.x - g.pos.x, S.ufo.mesh.position.z - g.pos.z);
    let diff = face - g.mesh.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    g.mesh.rotation.y += diff * Math.min(1, dt * 8);

    g.fireCd -= dt;
    if (g.fireCd <= 0 && (target || ufoTarget) && S.state === 'play' && Math.abs(diff) < 0.3) {
      g.fireCd = rand(0.45, 0.85);
      const from = v3(g.pos.x + Math.sin(g.mesh.rotation.y) * 0.5, 1.15, g.pos.z + Math.cos(g.mesh.rotation.y) * 0.5);
      const aim = target ? enemyCenter(target, v3()) : S.ufo.mesh.position.clone();
      const dist = aim.distanceTo(from);
      const err = 0.15 + dist * 0.025;
      aim.x += rand(-err, err);
      aim.y += rand(-err, err) + dist * dist * 0.0022;
      aim.z += rand(-err, err);
      spawnProj('ally', from, aim.sub(from).normalize(), 36, 'ally', 0.8, 5);
    }
    g.mesh.position.set(g.pos.x, 0, g.pos.z);
    animateGirl(g.mesh, S.t, g.walking, g.aiming, false);
  });
}

/* ================= vlny ================= */

function buildWave(n) {
  const q = [];
  const grunts = 3 + n * 2;
  const fast = n >= 2 ? Math.min(2 + n, 12) : 0;
  const tanks = n >= 3 ? Math.floor((n - 1) / 2) : 0;
  for (let i = 0; i < grunts; i++) q.push('grunt');
  for (let i = 0; i < fast; i++) q.push('fast');
  for (let i = 0; i < tanks; i++) q.push('tank');
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [q[i], q[j]] = [q[j], q[i]];
  }
  return q;
}

function startWave(n) {
  S.wave = n;
  S.queue = buildWave(n);
  S.spawnCd = 1.2;
  S.waveActive = true;
  sfx.horn();
  if (n % 5 === 0) spawnUfo();
  else {
    const subs = ['Ufoni jdou po Bětce!', 'Další várka zelených!', 'Bučí to!', 'Nabij vajíčkomet!', 'Drž se u Bětky!'];
    banner(`Vlna ${n}`, n === 1 ? 'Chraň Bětku!' : pick(subs));
  }
  if (n === 2) toast('Fialoví <b>skokani</b> jsou rychlí!');
  if (n === 3) toast('Oranžoví <b>tanci</b> vydrží hodně ran!');
}

function updateWaves(dt) {
  if (S.state !== 'play') return;
  if (S.waveActive) {
    S.spawnCd -= dt;
    const maxAlive = Math.min(16, 6 + S.wave * 1.5);
    if (S.queue.length && S.spawnCd <= 0 && S.enemies.length < maxAlive) {
      spawnEnemy(S.queue.shift());
      S.spawnCd = Math.max(0.5, 2.1 - S.wave * 0.13);
    }
    if (!S.queue.length && !S.enemies.length && !S.ufo) {
      S.waveActive = false;
      S.breakT = 6;
      const bonus = 250 * S.wave + Math.round(cow.hp) * 5;
      S.score += bonus;
      cow.hp = Math.min(cow.max, cow.hp + 35);
      banner('Vlna odražena!', `+${bonus} • Bětka se zotavuje`);
      sfx.level();
      setTimeout(() => sfx.moo(1), 400);
      girls.forEach((g) => {
        if (g.down <= 0) g.hp = Math.min(g.max, g.hp + 30);
        g.barkCd = 0;
      });
      bark(pick(girls), ['Tak to bylo dobrý!', 'Dejte si pauzu, za chvíli jsou zpátky.', 'Bětko, jsi v pořádku?', 'Nabíjím!']);
    }
  } else {
    S.breakT -= dt;
    if (S.breakT <= 0) startWave(S.wave + 1);
  }
}

/* ================= běh hry ================= */

function clearEntities() {
  for (const e of S.enemies) {
    scene.remove(e.mesh);
    if (e.beam) scene.remove(e.beam);
  }
  for (const p of S.projs) scene.remove(p.mesh);
  for (const p of S.pickups) scene.remove(p.mesh);
  for (const d of S.decals) scene.remove(d.mesh);
  if (S.ufo) scene.remove(S.ufo.mesh);
  S.enemies = [];
  S.projs = [];
  S.pickups = [];
  S.decals = [];
  S.ufo = null;
  ufoHum(false);
}

function resetGame() {
  clearEntities();
  S.score = 0;
  S.wave = 0;
  S.queue = [];
  S.waveActive = false;
  S.breakT = 2.5;
  cow.pos.set(0, 0, 0);
  cow.target.set(0, 0, 0);
  cow.hp = cow.max;
  cow.lift = 0;
  cow.layT = 8;
  cow.layCount = 0;
  girls.forEach((g) => {
    g.hp = g.max;
    g.down = 0;
    g.pos.set(Math.cos(g.baseAngle) * 5.5, 0, Math.sin(g.baseAngle) * 5.5);
    g.barkCd = 2;
  });
  Object.assign(P, { y: 0, vy: 0, yaw: 0, pitch: -0.08, hp: P.max, weapon: 0, reloadT: 0, fireCd: 0.3, swapT: 0, recoil: 0, kills: 0, shots: 0, hits: 0, eggsEaten: 0, hurtT: 0 });
  P.pos.set(0, 0, 13);
  P.vel.set(0, 0, 0);
  P.ammo = WEAPONS.map((w) => ({ mag: w.mag, reserve: w.reserve }));
  viewGuns.forEach((g, k) => (g.visible = k === 0));
  hud.c = {};
}

function startGame() {
  initAudio();
  resetGame();
  S.state = 'play';
  showScreen(null);
  $('hud').hidden = false;
  $('touch').hidden = !isTouch;
  requestLock();
  sfx.moo(1);
  toast(`<b style="color:${girls[0].color}">Kája:</b> Ufoni chtějí Bětku! Držíme se u ní!`);
}

function gameOver(reason) {
  if (S.state !== 'play') return;
  S.state = 'over';
  ufoHum(false);
  input.fire = false;
  if (document.pointerLockElement) document.exitPointerLock?.();
  $('hud').hidden = true;
  $('touch').hidden = true;
  const isBest = S.score > save.best;
  if (isBest) save.best = S.score;
  save.bestWave = Math.max(save.bestWave, S.wave);
  persist();
  sfx.over();
  const t = {
    player: ['Ufoni tě sejmuli!', 'Příště se víc kryj za balíky sena.'],
    cow: ['Bětka to nezvládla…', 'Nepouštěj ufony až k ní – střílej je cestou.'],
    ufo: ['Ufoni unesli Bětku!', 'Na UFO střílej hned, jak přiletí.'],
  }[reason];
  $('over-title').textContent = t[0];
  $('over-reason').textContent = t[1];
  $('over-score').textContent = S.score;
  $('over-best-badge').hidden = !isBest || S.score === 0;
  $('over-wave').textContent = S.wave;
  $('over-kills').textContent = P.kills;
  $('over-acc').textContent = P.shots ? Math.round((P.hits / P.shots) * 100) + ' %' : '–';
  $('over-eggs').textContent = P.eggsEaten;
  S.overT = 0;
  setTimeout(() => showScreen('scr-over'), 900);
}

function pause() {
  if (S.state !== 'play') return;
  S.state = 'paused';
  input.fire = false;
  input.keys.clear();
  ufoHum(false);
  showScreen('scr-pause');
}
function resume() {
  if (S.state !== 'paused') return;
  initAudio();
  S.state = 'play';
  if (S.ufo && S.ufo.phase !== 'dying') ufoHum(true);
  showScreen(null);
  requestLock();
  last = performance.now();
}

function goMenu() {
  clearEntities();
  S.state = 'menu';
  $('hud').hidden = true;
  $('touch').hidden = true;
  cow.lift = 0;
  cow.hp = cow.max;
  girls.forEach((g) => (g.down = 0));
  showScreen('scr-menu');
}

/* ================= smyčka ================= */

let last = performance.now();
let menuAngle = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (S.state !== 'paused') {
    S.t += dt;
    for (const c of world.clouds) {
      c.position.x += dt * 1.2;
      if (c.position.x > 110) c.position.x = -110;
    }
    if (S.state === 'play') {
      updatePlayer(dt);
      updateWaves(dt);
    } else if (S.state === 'menu') {
      menuAngle += dt * 0.12;
      camera.position.set(Math.sin(menuAngle) * 11, 3.4, Math.cos(menuAngle) * 11);
      camera.lookAt(0, 1.1, 0);
      viewGuns.forEach((g) => (g.visible = false));
    } else if (S.state === 'over') {
      S.overT += dt;
      camera.position.y += (5 - camera.position.y) * dt;
      camera.lookAt(cow.pos.x, 1 + cow.lift * 8, cow.pos.z);
      viewGuns.forEach((g) => (g.visible = false));
    }
    updateCow(dt);
    updateGirls(dt);
    updateEnemies(dt);
    updateUfo(dt);
    updateProjs(dt);
    updatePickups(dt);
    updateParticles(dt);
    for (let i = S.decals.length - 1; i >= 0; i--) {
      const d = S.decals[i];
      d.life -= dt;
      if (d.life < 1) d.mesh.scale.setScalar(Math.max(0.01, d.life));
      if (d.life <= 0) {
        scene.remove(d.mesh);
        S.decals.splice(i, 1);
      }
    }
  }
  if (S.state === 'play') updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* ================= obrazovky ================= */

const SCREENS = ['scr-menu', 'scr-pause', 'scr-over', 'scr-help', 'scr-settings'];
let settingsReturn = 'scr-menu';
function showScreen(id) {
  for (const s of SCREENS) $(s).hidden = s !== id;
  if (id === 'scr-menu') {
    $('menu-best').textContent = save.best;
    $('menu-wave').textContent = `vlna ${save.bestWave}`;
  }
}

function openSettings(from) {
  settingsReturn = from;
  $('set-sound').checked = save.sound;
  $('set-shadows').checked = save.shadows;
  $('set-sens').value = save.sens;
  $('set-sens-val').textContent = Number(save.sens).toFixed(1);
  $('set-assist').checked = save.assist;
  showScreen('scr-settings');
}
$('set-sound').addEventListener('change', (e) => {
  save.sound = e.target.checked;
  setSound(save.sound);
  persist();
});
$('set-shadows').addEventListener('change', (e) => {
  save.shadows = e.target.checked;
  setShadows(save.shadows);
  persist();
});
$('set-sens').addEventListener('input', (e) => {
  save.sens = Number(e.target.value);
  $('set-sens-val').textContent = save.sens.toFixed(1);
  persist();
});
$('set-assist').addEventListener('change', (e) => {
  save.assist = e.target.checked;
  persist();
});

const on = (id, fn) =>
  $(id).addEventListener('click', (e) => {
    initAudio();
    sfx.click();
    fn(e);
  });
on('btn-play', startGame);
on('btn-again', startGame);
on('btn-help', () => showScreen('scr-help'));
on('btn-help-close', () => showScreen('scr-menu'));
on('btn-settings', () => openSettings('scr-menu'));
on('btn-pause-settings', () => openSettings('scr-pause'));
on('btn-settings-close', () => showScreen(settingsReturn));
on('btn-menu', goMenu);
on('btn-pause', pause);
on('btn-resume', resume);
on('btn-quit', goMenu);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pause();
    suspendAudio();
  } else last = performance.now();
});

/* ================= start ================= */

setSound(save.sound);
setShadows(save.shadows);
resetGame();
cow.pos.set(0, 0, 0);
resize();
camera.position.set(0, 3.4, 11);
camera.lookAt(0, 1.1, 0);
showScreen('scr-menu');
renderer.render(scene, camera);
$('loading').hidden = true;
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// pro testy v prohlížeči
window.__krava = { S, P, cow, girls, save, startWave, spawnEnemy, spawnUfo, input, WEAPONS };
