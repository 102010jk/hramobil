// Zápas: hráč, boti, střelba, kola, bomba, ekonomika, granáty, HUD.
import * as THREE from './vendor/three.module.min.js';
import { sfx, gunshot, initAudio } from './audio.js';
import { loadMap, CELL } from './maps.js';
import { WEAPONS, BY_ID, KNIFE, GRENADES, EQUIPMENT, CAT_NAMES, buildGun, buildKnife, buildGrenade } from './weapons.js';
import { buildSoldier, animateSoldier, buildCow, animateCow, buildArms } from './characters.js';
import { ITEMS, AGENTS, finishTexture, instName } from './skins.js';
import { P as PROFILE, equipped, save as saveProfile } from './profile.js';

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const T1 = v3();
const T2 = v3();
const T3 = v3();

export const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

const DIFF = {
  easy: { name: 'Lehká', react: 0.8, turn: 3.2, err: 0.11, hs: 0.1, strafe: 0, fov: 1.1 },
  normal: { name: 'Střední', react: 0.48, turn: 5.5, err: 0.065, hs: 0.25, strafe: 0.4, fov: 1.3 },
  hard: { name: 'Těžká', react: 0.3, turn: 8.5, err: 0.042, hs: 0.42, strafe: 0.8, fov: 1.45 },
  expert: { name: 'Expert', react: 0.19, turn: 12, err: 0.028, hs: 0.6, strafe: 1, fov: 1.6 },
};
export { DIFF };

const BOT_NAMES = ['Bučík', 'Žloutek', 'Skořápka', 'Telátko', 'Mlékař', 'Rohatý', 'Strakáč', 'Omeleta', 'Vemínko', 'Seník', 'Býček', 'Volek', 'Míchaňák', 'Volské oko', 'Kvočna', 'Pastevec', 'Smetana', 'Tvaroh', 'Máslo', 'Podmáslí'];
const TEAM_NAME = { T: 'Vaječníci', CT: 'Kravaři' };
const TEAM_COLOR = { T: '#ffc21a', CT: '#5ab8ff' };

const ROUND_TIME = 100;
const FREEZE_TIME = 6;
const BUY_TIME = 20;
const BOMB_TIME = 40;
const PLANT_TIME = 3.2;
const DEFUSE_TIME = 10;
const WIN_ROUNDS = 8;
const DM_TIME = 300;
const DM_KILLS = 60;

/* ================= stav ================= */

let env = null; // {renderer, scene, camera, vmScene, vmCamera, onEnd}
let map = null;
let cfg = null;
const S = {
  active: false,
  paused: false,
  phase: 'freeze', // freeze | live | planted | end | over
  phaseT: 0,
  round: 0,
  score: { T: 0, CT: 0 },
  lossStreak: { T: 0, CT: 0 },
  fighters: [],
  me: null,
  cows: [],
  eggs: [],
  nades: [],
  smokes: [],
  tracers: [],
  decals: [],
  drops: [],
  bomb: null,
  killfeed: [],
  roundWinner: null,
  spectate: null,
  t: 0,
  dmTime: 0,
  stSkinKills: 0,
};
export const MATCH = S;

/* ================= vstup ================= */

const IN = { fwd: 0, side: 0, jump: false, crouch: false, walk: false, fire: false, alt: false, use: false, lookDX: 0, lookDY: 0, keys: new Set() };
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const looks = new Map();
let fireId = null;
let inputBound = false;

function bindInput() {
  if (inputBound) return;
  inputBound = true;
  const cv = $('cv');
  const knob = $('knob');
  const stickEl = $('stick');
  const setStick = (dx, dy) => {
    const max = 55;
    const d = Math.hypot(dx, dy);
    const k = d > max ? max / d : 1;
    stick.x = (dx * k) / max;
    stick.y = (dy * k) / max;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  };
  cv.addEventListener('pointerdown', (e) => {
    if (!S.active || S.paused) return;
    initAudio();
    if (e.pointerType === 'mouse') {
      if (document.pointerLockElement !== cv) lockPointer();
      else if (e.button === 0) IN.fire = true;
      else if (e.button === 2) IN.alt = true;
      return;
    }
    const r = cv.getBoundingClientRect();
    if (e.clientX - r.left < r.width * 0.4 && stick.id === null) {
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
      if (S.spectate && !S.me.alive) nextSpectate();
    }
    try {
      cv.setPointerCapture(e.pointerId);
    } catch {
      /* nic */
    }
  });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('pointermove', (e) => {
    if (!S.active) return;
    const zoomK = S.me && S.me.scope ? 0.35 : 1;
    if (e.pointerType === 'mouse') {
      if (document.pointerLockElement === cv) {
        IN.lookDX += e.movementX * 0.0021 * PROFILE.settings.sens * zoomK;
        IN.lookDY += e.movementY * 0.0021 * PROFILE.settings.sens * zoomK;
      }
      return;
    }
    if (e.pointerId === stick.id) setStick(e.clientX - stick.ox, e.clientY - stick.oy);
    else if (looks.has(e.pointerId)) {
      const l = looks.get(e.pointerId);
      IN.lookDX += (e.clientX - l.x) * 0.0062 * PROFILE.settings.sens * zoomK;
      IN.lookDY += (e.clientY - l.y) * 0.0062 * PROFILE.settings.sens * zoomK;
      l.x = e.clientX;
      l.y = e.clientY;
    }
  });
  const end = (e) => {
    if (e.pointerType === 'mouse') {
      if (e.button === 0) IN.fire = false;
      return;
    }
    if (e.pointerId === stick.id) {
      stick.id = null;
      stick.x = stick.y = 0;
      knob.style.transform = '';
      stickEl.classList.remove('active');
      stickEl.style.left = stickEl.style.top = stickEl.style.bottom = '';
    }
    looks.delete(e.pointerId);
    if (e.pointerId === fireId) {
      fireId = null;
      IN.fire = false;
      $('t-fire').classList.remove('on');
    }
    if (e.pointerId === useId) {
      useId = null;
      IN.use = false;
    }
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);

  $('t-fire').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    initAudio();
    fireId = e.pointerId;
    IN.fire = true;
    looks.set(e.pointerId, { x: e.clientX, y: e.clientY });
    $('t-fire').classList.add('on');
    try {
      $('t-fire').setPointerCapture(e.pointerId);
    } catch {
      /* nic */
    }
  });
  let useId = null;
  $('t-use').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    useId = e.pointerId;
    IN.use = true;
    try {
      $('t-use').setPointerCapture(e.pointerId);
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
  tap('t-jump', () => (IN.jump = true));
  tap('t-reload', () => S.me && startReload(S.me));
  tap('t-crouch', () => {
    IN.crouch = !IN.crouch;
    $('t-crouch').classList.toggle('on', IN.crouch);
  });
  tap('t-swap', () => S.me && cycleWeapon(S.me));
  tap('t-nade', () => S.me && cycleNade(S.me));
  tap('t-scope', () => (IN.alt = true));
  tap('t-buy', () => toggleBuy());
  tap('t-score', () => toggleScoreboard());

  window.addEventListener('keydown', (e) => {
    if (!S.active) return;
    IN.keys.add(e.code);
    if (S.paused) return;
    const me = S.me;
    if (e.code === 'Space') {
      IN.jump = true;
      e.preventDefault();
    } else if (e.code === 'KeyR') startReload(me);
    else if (e.code === 'Digit1') selectSlot(me, 'primary');
    else if (e.code === 'Digit2') selectSlot(me, 'secondary');
    else if (e.code === 'Digit3') selectSlot(me, 'knife');
    else if (e.code === 'Digit4') cycleNade(me);
    else if (e.code === 'Digit5') me.hasBomb && selectSlot(me, 'bomb');
    else if (e.code === 'KeyQ') selectSlot(me, me.lastActive);
    else if (e.code === 'KeyB') toggleBuy();
    else if (e.code === 'Tab') {
      e.preventDefault();
      $('scoreboard').hidden = false;
      renderScoreboard();
    } else if (e.code === 'KeyC' || e.code === 'ControlLeft') IN.crouch = true;
    else if (e.code === 'KeyE') IN.use = true;
    else if (e.code === 'KeyG') dropActive(me);
    else if (e.code === 'Escape' && !$('buymenu').hidden) closeBuy();
  });
  window.addEventListener('keyup', (e) => {
    IN.keys.delete(e.code);
    if (e.code === 'Tab') $('scoreboard').hidden = true;
    else if (e.code === 'KeyC' || e.code === 'ControlLeft') IN.crouch = false;
    else if (e.code === 'KeyE') IN.use = false;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) IN.fire = false;
  });
  window.addEventListener(
    'wheel',
    (e) => {
      if (!S.active || S.paused || !S.me) return;
      cycleWeapon(S.me, e.deltaY > 0 ? 1 : -1);
    },
    { passive: true }
  );
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== $('cv') && S.active && !S.paused && !isTouch && $('buymenu').hidden && S.phase !== 'over') env.onPause?.();
  });
}

export function lockPointer() {
  if (isTouch) return;
  try {
    const p = $('cv').requestPointerLock?.();
    if (p && p.catch) p.catch(() => {});
  } catch {
    /* nic */
  }
}

function readMove() {
  const k = IN.keys;
  let f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
  let s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
  IN.walk = k.has('ShiftLeft') || k.has('ShiftRight');
  if (stick.id !== null) {
    f = -stick.y;
    s = stick.x;
    IN.walk = Math.hypot(stick.x, stick.y) < 0.45;
  }
  IN.fwd = f;
  IN.side = s;
}

/* ================= bojovníci ================= */

function skinFor(f, slot) {
  if (f.isBot) return f.botSkins?.[slot] || null;
  return equipped(slot);
}
function skinTexOf(inst) {
  if (!inst) return null;
  const d = ITEMS[inst.def];
  return finishTexture(d.finish, inst.seed, inst.wear);
}

function makeFighter(name, team, isBot) {
  const f = {
    name,
    team,
    isBot,
    alive: false,
    hp: 100,
    armor: 0,
    helmet: false,
    kit: false,
    money: 800,
    kills: 0,
    deaths: 0,
    assists: 0,
    hs: 0,
    mvps: 0,
    roundKills: 0,
    dmgBy: new Map(),
    pos: v3(),
    vel: v3(),
    y: 0,
    vy: 0,
    onGround: true,
    yaw: 0,
    pitch: 0,
    punchP: 0,
    punchY: 0,
    crouch: 0,
    walk: 0,
    slots: { primary: null, secondary: null },
    nades: { he: 0, flash: 0, smoke: 0 },
    active: 'secondary',
    lastActive: 'knife',
    hasBomb: false,
    fireCd: 0,
    reloadT: 0,
    drawT: 0,
    spray: 0,
    sprayT: 0,
    scope: 0,
    deadT: 0,
    flashT: 0,
    respawnT: 0,
    model: null,
    gunObj: null,
    bot: null,
  };
  if (isBot) {
    f.bot = { target: null, reactT: 0, aimErr: v3(), lastSeen: null, lastSeenT: -99, path: [], pathI: 0, goal: null, repathT: 0, thinkT: rand(0, 0.2), strafe: 1, strafeT: 0, burst: 0, burstPause: 0, stuckT: 0, lastPos: v3(), holdYaw: null, noiseT: 0, nadeUsed: false, role: null };
    f.agent = pickAgentForBot(team);
    // boti mají občas skiny
    f.botSkins = {};
  }
  return f;
}

function pickAgentForBot(team) {
  const opts = Object.entries(AGENTS).filter(([, a]) => a.side === team);
  return Math.random() < 0.35 ? pick(opts)[0] : team === 'T' ? 't_default' : 'ct_default';
}

function agentOf(f) {
  if (f.isBot) return f.agent;
  const inst = equipped(f.team === 'T' ? 'agentT' : 'agentCT');
  return inst ? ITEMS[inst.def].agent : f.team === 'T' ? 't_default' : 'ct_default';
}

function buildModel(f) {
  if (f.model) env.scene.remove(f.model);
  f.model = buildSoldier(agentOf(f), TEAM_COLOR[f.team]);
  env.scene.add(f.model);
  f.model.visible = f.alive;
  refreshGunModel(f);
}

function activeDef(f) {
  if (f.active === 'primary' || f.active === 'secondary') return f.slots[f.active]?.def || null;
  return null;
}

function refreshGunModel(f) {
  const mount = f.model.userData.gunMount;
  if (f.gunObj) mount.remove(f.gunObj);
  let obj;
  const def = activeDef(f);
  if (def) obj = buildGun(def, skinTexOf(f.slots[f.active].skin));
  else if (f.active === 'knife') obj = buildKnife(knifeModelOf(f), skinTexOf(knifeSkinOf(f)));
  else if (f.active === 'bomb') obj = bombMesh();
  else obj = buildGrenade(f.active);
  f.gunObj = obj;
  mount.add(obj);
  if (f === S.me) refreshViewModel();
}

function knifeSkinOf(f) {
  return f.isBot ? f.botSkins.knife || null : equipped('knife');
}
function knifeModelOf(f) {
  const s = knifeSkinOf(f);
  return s ? ITEMS[s.def].model : 'kravar';
}

function giveWeapon(f, id) {
  const def = BY_ID[id];
  const slot = def.slot;
  f.slots[slot] = { def, mag: def.mag, reserve: def.reserve, skin: skinFor(f, id) };
  f.active = slot;
  f.drawT = 0.4;
  f.reloadT = 0;
  f.scope = 0;
  if (f.model) refreshGunModel(f);
}

function defaultPistol(team) {
  return team === 'T' ? 'vajglock' : 'usp';
}

/* ================= start / konec ================= */

export function startMatch(config, environment) {
  env = environment;
  cfg = config;
  bindInput();
  if (map) map.dispose();
  map = loadMap(cfg.map, env.scene, { shadows: PROFILE.settings.shadows });
  env.setSky?.(map.def);
  clearEntities();
  S.fighters = [];
  S.score = { T: 0, CT: 0 };
  S.lossStreak = { T: 0, CT: 0 };
  S.round = 0;
  S.killfeed = [];
  S.active = true;
  S.paused = false;
  S.t = 0;
  S.dmTime = DM_TIME;
  S.dmKills = { T: 0, CT: 0 };

  const me = makeFighter('Ty', cfg.side, false);
  S.me = me;
  S.fighters.push(me);
  const names = [...BOT_NAMES].sort(() => Math.random() - 0.5);
  for (let i = 0; i < cfg.teamSize - 1; i++) S.fighters.push(makeFighter(names.pop(), cfg.side, true));
  const other = cfg.side === 'T' ? 'CT' : 'T';
  for (let i = 0; i < cfg.teamSize; i++) S.fighters.push(makeFighter(names.pop(), other, true));
  // skiny pro boty
  const skinDefs = Object.values(ITEMS).filter((d) => d.type === 'weapon');
  for (const f of S.fighters)
    if (f.isBot) {
      for (const d of skinDefs) if (Math.random() < 0.05) f.botSkins[d.weapon] = { def: d.id, seed: Math.floor(Math.random() * 999), wear: Math.random() };
      if (Math.random() < 0.15) {
        const k = pick(Object.values(ITEMS).filter((d) => d.type === 'knife'));
        f.botSkins.knife = { def: k.id, seed: 3, wear: Math.random() * 0.3 };
      }
    }
  for (const f of S.fighters) {
    giveWeapon(f, defaultPistol(f.team));
    buildModel(f);
  }
  spawnCows();
  setupViewModel();
  $('hud').hidden = false;
  $('touch').hidden = !isTouch;
  $('minimap').hidden = false;
  S.hudCache = {};
  if (cfg.mode === 'dm') startDM();
  else startRound();
  lockPointer();
}

export function stopMatch() {
  S.active = false;
  clearEntities();
  for (const f of S.fighters) if (f.model) env.scene.remove(f.model);
  S.fighters = [];
  if (vm.group) env.vmScene.remove(vm.group);
  $('hud').hidden = true;
  $('touch').hidden = true;
  $('buymenu').hidden = true;
  $('scoreboard').hidden = true;
  $('flash').style.opacity = 0;
  $('scope').hidden = true;
  if (document.pointerLockElement) document.exitPointerLock?.();
}

export function currentMap() {
  return map;
}
export function setMapForMenu(id, environment) {
  env = environment;
  if (map && map.id === id) return map;
  if (map) map.dispose();
  map = loadMap(id, env.scene, { shadows: PROFILE.settings.shadows });
  env.setSky?.(map.def);
  clearEntities();
  spawnCows();
  return map;
}

function clearEntities() {
  for (const c of S.cows) env.scene.remove(c.mesh);
  for (const e of S.eggs) env.scene.remove(e.mesh);
  for (const n of S.nades) env.scene.remove(n.mesh);
  for (const s of S.smokes) env.scene.remove(s.group);
  for (const t of S.tracers) env.scene.remove(t.line);
  for (const d of S.decals) env.scene.remove(d);
  for (const d of S.drops) env.scene.remove(d.mesh);
  if (S.bomb?.mesh) env.scene.remove(S.bomb.mesh);
  S.cows = [];
  S.eggs = [];
  S.nades = [];
  S.smokes = [];
  S.tracers = [];
  S.decals = [];
  S.drops = [];
  S.bomb = null;
}

/* ================= krávy a vejce ================= */

function spawnCows() {
  const skinInst = equipped('cow');
  const d = skinInst ? ITEMS[skinInst.def] : null;
  const n = 3;
  for (let i = 0; i < n; i++) {
    const p = pick(map.cowCells).clone();
    const mesh = buildCow(d ? d.finish : 'strakata', skinInst?.seed || i + 1, skinInst?.wear || 0);
    mesh.position.copy(p);
    env.scene.add(mesh);
    S.cows.push({ mesh, pos: mesh.position, target: p.clone(), layT: rand(15, 30), fleeT: 0, mooCd: 0, walking: false });
  }
}

function updateCows(dt) {
  for (const c of S.cows) {
    c.mooCd -= dt;
    c.fleeT -= dt;
    c.layT -= dt;
    const dx = c.target.x - c.pos.x;
    const dz = c.target.z - c.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.4) {
      if (Math.random() < dt * 0.5 || c.fleeT > 0) {
        const cand = pick(map.cowCells);
        if (cand.distanceTo(c.pos) < 14) c.target.copy(cand).add(v3(rand(-0.8, 0.8), 0, rand(-0.8, 0.8)));
      }
      c.walking = false;
    } else {
      const sp = c.fleeT > 0 ? 3.2 : 0.9;
      c.pos.x += (dx / d) * sp * dt;
      c.pos.z += (dz / d) * sp * dt;
      map.collide(c.pos, 0.6);
      const want = Math.atan2(dx, dz);
      c.mesh.rotation.y += angDiff(want, c.mesh.rotation.y) * Math.min(1, dt * 3);
      c.walking = true;
    }
    animateCow(c.mesh, S.t + c.layT, c.walking);
    if (c.layT <= 0 && S.active) {
      c.layT = rand(20, 35);
      const back = v3(-Math.sin(c.mesh.rotation.y), 0, -Math.cos(c.mesh.rotation.y)).multiplyScalar(1.1).add(c.pos);
      map.collide(back, 0.3);
      spawnEgg(back);
      if (camDist(c.pos) < 20) sfx.plop();
    }
  }
  for (let i = S.eggs.length - 1; i >= 0; i--) {
    const e = S.eggs[i];
    e.life -= dt;
    e.mesh.rotation.y += dt * 2;
    e.mesh.position.y = 0.25 + Math.sin(S.t * 3 + i) * 0.05;
    let taken = e.life <= 0;
    for (const f of S.fighters) {
      if (taken || !f.alive || f.hp >= 100) continue;
      if (Math.hypot(f.pos.x - e.mesh.position.x, f.pos.z - e.mesh.position.z) < 1) {
        f.hp = Math.min(100, f.hp + 20);
        taken = true;
        if (f === S.me) {
          sfx.pickup();
          toast('🥚 +20 zdraví');
        }
      }
    }
    if (taken) {
      env.scene.remove(e.mesh);
      S.eggs.splice(i, 1);
    }
  }
}

const eggGeo = new THREE.SphereGeometry(0.11, 14, 10).scale(1, 1.3, 1);
const eggMat = new THREE.MeshStandardMaterial({ color: '#fff8ec', roughness: 0.35, emissive: '#2a2010' });
function spawnEgg(p) {
  const mesh = new THREE.Mesh(eggGeo, eggMat);
  mesh.position.set(p.x, 0.25, p.z);
  mesh.castShadow = true;
  env.scene.add(mesh);
  S.eggs.push({ mesh, life: 45 });
  if (S.eggs.length > 8) env.scene.remove(S.eggs.shift().mesh);
}

/* ================= kola ================= */

function spawnFighter(f, p) {
  f.alive = true;
  f.hp = 100;
  f.pos.copy(p);
  f.y = 0;
  f.vy = 0;
  f.vel.set(0, 0, 0);
  f.deadT = 0;
  f.flashT = 0;
  f.dmgBy.clear();
  f.roundKills = 0;
  f.punchP = f.punchY = 0;
  f.scope = 0;
  // pohled ke středu mapy
  const c = map.siteCenter[f.team === 'T' ? 'A' : 'B'];
  f.yaw = Math.atan2(-(c.x * 0.3 - p.x), -(0 - p.z));
  f.pitch = 0;
  f.model.visible = true;
  if (f.bot) {
    Object.assign(f.bot, { target: null, path: [], pathI: 0, goal: null, repathT: 0, lastSeen: null, nadeUsed: false, holdYaw: null, plantT: 0 });
  }
}

function startRound() {
  S.round++;
  S.phase = 'freeze';
  S.phaseT = FREEZE_TIME;
  S.roundWinner = null;
  clearRoundStuff();
  const spT = [...map.spawns.T].sort(() => Math.random() - 0.5);
  const spCT = [...map.spawns.CT].sort(() => Math.random() - 0.5);
  for (const f of S.fighters) {
    if (!f.alive) {
      // padlí ztrácí zbraně
      f.slots.primary = null;
      f.nades = { he: 0, flash: 0, smoke: 0 };
      f.armor = 0;
      f.helmet = false;
      f.kit = false;
      giveWeapon(f, defaultPistol(f.team));
    } else {
      for (const s of ['primary', 'secondary']) if (f.slots[s]) f.slots[s].mag = f.slots[s].def.mag;
    }
    f.hasBomb = false;
    spawnFighter(f, (f.team === 'T' ? spT : spCT).pop() || map.spawns[f.team][0]);
    f.active = f.slots.primary ? 'primary' : 'secondary';
    refreshGunModel(f);
  }
  // bomba náhodnému Vaječníkovi
  const ts = S.fighters.filter((f) => f.team === 'T');
  const carrier = pick(ts);
  carrier.hasBomb = true;
  S.bomb = { state: 'carried', carrier, pos: v3(), timer: 0, defuser: null, defuseT: 0, plantT: 0, beepT: 0, site: null, mesh: null };
  // strategie Vaječníků
  S.tSite = Math.random() < 0.5 ? 'A' : 'B';
  S.ctRoles = {};
  S.fighters.filter((f) => f.team === 'CT' && f.isBot).forEach((f, i) => (f.bot.role = i % 2 ? 'A' : 'B'));
  S.fighters.filter((f) => f.team === 'T' && f.isBot).forEach((f) => (f.bot.role = Math.random() < 0.2 ? (S.tSite === 'A' ? 'B' : 'A') : S.tSite));
  for (const f of S.fighters) if (f.isBot) botBuy(f);
  centerMsg(`Kolo ${S.round}`, `${TEAM_NAME[S.me.team]} • nakupuj (B)`);
  if (S.me.hasBomb) toast('Máš <b>Zlaté vejce</b> (bombu)! Polož ho na místo A nebo B.');
  S.hudCache = {};
  if (S.round === 1) toast(isTouch ? 'Tlačítko 🛒 = nákup zbraní' : 'B = nákup, Tab = skóre, E = položit/zneškodnit');
}

function clearRoundStuff() {
  for (const n of S.nades) env.scene.remove(n.mesh);
  for (const s of S.smokes) env.scene.remove(s.group);
  for (const d of S.drops) env.scene.remove(d.mesh);
  if (S.bomb?.mesh) env.scene.remove(S.bomb.mesh);
  S.nades = [];
  S.smokes = [];
  S.drops = [];
  $('flash').style.opacity = 0;
}

function endRound(winner, reason) {
  if (S.phase === 'end' || S.phase === 'over') return;
  S.phase = 'end';
  S.phaseT = 5;
  S.roundWinner = winner;
  S.score[winner]++;
  const loser = winner === 'T' ? 'CT' : 'T';
  const winMoney = reason === 'bomb' || reason === 'defuse' ? 3500 : 3250;
  const lossMoney = Math.min(3400, 1400 + 500 * S.lossStreak[loser]);
  S.lossStreak[winner] = 0;
  S.lossStreak[loser] = Math.min(4, S.lossStreak[loser] + 1);
  for (const f of S.fighters) {
    let m = f.team === winner ? winMoney : lossMoney;
    if (f.team === 'T' && loser === 'T' && S.bomb?.state === 'planted') m += 800;
    f.money = Math.min(16000, f.money + m);
  }
  // MVP
  const mvp = S.fighters.filter((f) => f.team === winner).sort((a, b) => b.roundKills - a.roundKills)[0];
  if (mvp) mvp.mvps++;
  const texts = {
    elim: winner === 'T' ? 'Vaječníci vyhráli kolo' : 'Kravaři vyhráli kolo',
    bomb: 'Zlaté vejce vybuchlo!',
    defuse: 'Bomba zneškodněna!',
    time: 'Čas vypršel – Kravaři ubránili místa',
  };
  centerMsg(texts[reason], `${TEAM_NAME.T} ${S.score.T} : ${S.score.CT} ${TEAM_NAME.CT}${mvp ? ` • MVP: ${mvp.name}` : ''}`, winner === 'T' ? 't' : 'ct');
  if (winner === S.me.team) sfx.roundWin();
  else sfx.roundLose();
  if (S.score[winner] >= WIN_ROUNDS) {
    S.phaseT = 4;
    S.matchWinner = winner;
  }
}

function startDM() {
  S.phase = 'live';
  S.phaseT = DM_TIME;
  for (const f of S.fighters) {
    f.money = 16000;
    respawnDM(f);
  }
  centerMsg('Deathmatch', `Týmový • ${DM_KILLS} zabití nebo 5 minut`);
}

function respawnDM(f) {
  const cands = map.floorCells.filter((p) => S.fighters.every((o) => !o.alive || o.team === f.team || o.pos.distanceTo(p) > 14));
  const p = pick(cands.length ? cands : map.floorCells).clone();
  spawnFighter(f, p);
  f.armor = 100;
  f.helmet = true;
  if (f.isBot) {
    const list = WEAPONS.filter((w) => w.cat !== 'pistol' && (w.side === 'both' || w.side === f.team));
    const prefer = Math.random() < 0.5 ? (f.team === 'T' ? 'ak47' : 'm4a4') : pick(list).id;
    giveWeapon(f, prefer);
  } else if (S.lastDMWeapon) giveWeapon(f, S.lastDMWeapon);
  f.slots.secondary = { def: BY_ID[defaultPistol(f.team)], mag: BY_ID[defaultPistol(f.team)].mag, reserve: 120, skin: skinFor(f, defaultPistol(f.team)) };
  f.active = f.slots.primary ? 'primary' : 'secondary';
  f.spawnProtect = 1.5;
  f.buyT = 12;
  refreshGunModel(f);
}

function updateRound(dt) {
  S.phaseT -= dt;
  if (cfg.mode === 'dm') {
    for (const f of S.fighters)
      if (!f.alive) {
        f.respawnT -= dt;
        if (f.respawnT <= 0) respawnDM(f);
      }
    if (S.phaseT <= 0 || S.dmKills.T >= DM_KILLS || S.dmKills.CT >= DM_KILLS) {
      const w = S.dmKills.T === S.dmKills.CT ? S.me.team : S.dmKills.T > S.dmKills.CT ? 'T' : 'CT';
      finishMatch(w);
    }
    return;
  }
  if (S.phase === 'freeze' && S.phaseT <= 0) {
    S.phase = 'live';
    S.phaseT = ROUND_TIME;
    S.liveT = 0;
    centerMsg('Jdeme na to!', '');
  } else if (S.phase === 'live') {
    S.liveT += dt;
    if (S.phaseT <= 0) endRound('CT', 'time');
  } else if (S.phase === 'planted') {
    const b = S.bomb;
    b.timer -= dt;
    b.beepT -= dt;
    if (b.beepT <= 0) {
      b.beepT = b.timer > 10 ? 1 : b.timer > 4 ? 0.5 : 0.18;
      const d = camDist(b.pos);
      if (d < 40) sfx.bombBeep(b.timer < 5);
      b.light.visible = !b.light.visible;
    }
    if (b.timer <= 0) explodeBomb();
  } else if (S.phase === 'end' && S.phaseT <= 0) {
    if (S.matchWinner) finishMatch(S.matchWinner);
    else startRound();
  }
  if (S.phase === 'live' || S.phase === 'planted') {
    const aliveT = S.fighters.some((f) => f.alive && f.team === 'T');
    const aliveCT = S.fighters.some((f) => f.alive && f.team === 'CT');
    if (!aliveCT) endRound('T', 'elim');
    else if (!aliveT && S.phase === 'live') endRound('CT', 'elim');
  }
}

function finishMatch(winner) {
  if (S.phase === 'over') return;
  S.phase = 'over';
  const me = S.me;
  const myTeam = S.fighters.filter((f) => f.team === me.team).sort((a, b) => b.kills - a.kills);
  const mvp = myTeam[0] === me;
  if (document.pointerLockElement) document.exitPointerLock?.();
  env.onEnd?.({
    win: winner === me.team,
    winner,
    score: cfg.mode === 'dm' ? S.dmKills : S.score,
    kills: me.kills,
    deaths: me.deaths,
    assists: me.assists,
    hs: me.hs,
    mvp,
    mode: cfg.mode,
    fighters: S.fighters.map((f) => ({ name: f.name, team: f.team, kills: f.kills, deaths: f.deaths, assists: f.assists, hs: f.hs, me: f === me })),
  });
}

/* ================= nákup ================= */

function inBuyZone(f) {
  if (cfg.mode === 'dm') return (f.buyT || 0) > 0;
  if (S.phase === 'freeze') return true;
  if (S.phase !== 'live' || S.liveT > BUY_TIME) return false;
  return map.spawns[f.team].some((p) => p.distanceTo(f.pos) < 9);
}

function priceOf(f, price) {
  return cfg.mode === 'dm' ? 0 : price;
}

function buy(f, what) {
  const canSide = (w) => w.side === 'both' || w.side === f.team;
  if (BY_ID[what]) {
    const w = BY_ID[what];
    const p = priceOf(f, w.price);
    if (!canSide(w) || f.money < p) return false;
    if (f.slots[w.slot]?.def.id === w.id) return false;
    f.money -= p;
    if (f.slots[w.slot] && cfg.mode !== 'dm') dropWeapon(f, w.slot);
    giveWeapon(f, what);
    if (cfg.mode === 'dm' && f === S.me && w.slot === 'primary') S.lastDMWeapon = what;
  } else if (GRENADES[what]) {
    const p = priceOf(f, GRENADES[what].price);
    const total = f.nades.he + f.nades.flash + f.nades.smoke;
    if (f.money < p || f.nades[what] >= (what === 'flash' ? 2 : 1) || total >= 4) return false;
    f.money -= p;
    f.nades[what]++;
  } else if (what === 'kevlar') {
    const p = priceOf(f, 650);
    if (f.money < p || f.armor >= 100) return false;
    f.money -= p;
    f.armor = 100;
  } else if (what === 'helmet') {
    const p = priceOf(f, f.armor >= 100 ? 350 : 1000);
    if (f.money < p || (f.armor >= 100 && f.helmet)) return false;
    f.money -= p;
    f.armor = 100;
    f.helmet = true;
  } else if (what === 'kit') {
    if (f.team !== 'CT' || f.kit || f.money < priceOf(f, 400)) return false;
    f.money -= priceOf(f, 400);
    f.kit = true;
  }
  return true;
}

function botBuy(f) {
  const m = f.money;
  const side = f.team;
  const rifle = side === 'T' ? pick(['ak47', 'ak47', 'galil', 'sg553', 'groza']) : pick(['m4a4', 'm4a1s', 'm4a1s', 'famas', 'aug']);
  if (!f.slots.primary) {
    if (m >= 4750 + 1000 && Math.random() < 0.18) buy(f, 'awp');
    else if (m >= BY_ID[rifle].price + 1000) buy(f, rifle);
    else if (m >= 2700 && Math.random() < 0.5) buy(f, side === 'T' ? 'mac10' : 'mp9');
    else if (S.round === 1 || m < 2000) {
      if (m >= 700 && Math.random() < 0.4) buy(f, 'deagle');
      else if (m >= 500 && Math.random() < 0.3) buy(f, side === 'T' ? 'tec9' : 'fiveseven');
    } else if (m >= 1500) buy(f, pick(['ump', 'mp7', side === 'T' ? 'mac10' : 'mp9', 'nova']));
  }
  if (f.money >= 1000) buy(f, 'helmet');
  else if (f.money >= 650) buy(f, 'kevlar');
  if (f.money >= 600 && side === 'CT' && Math.random() < 0.6) buy(f, 'kit');
  if (f.money >= 1000) {
    buy(f, 'he');
    if (Math.random() < 0.5) buy(f, 'flash');
  }
  f.active = f.slots.primary ? 'primary' : 'secondary';
  refreshGunModel(f);
}

/* ================= zbraně hráče ================= */

function selectSlot(f, slot) {
  if (!f || !f.alive) return;
  if (slot === 'primary' || slot === 'secondary') {
    if (!f.slots[slot]) return;
  } else if (slot === 'bomb') {
    if (!f.hasBomb) return;
  } else if (slot !== 'knife' && !(f.nades[slot] > 0)) return;
  if (f.active === slot) return;
  f.lastActive = f.active;
  f.active = slot;
  f.drawT = slot === 'knife' ? 0.25 : 0.45;
  f.reloadT = 0;
  f.scope = 0;
  f.spray = 0;
  refreshGunModel(f);
  if (f === S.me) sfx.reload();
}

function cycleWeapon(f, dir = 1) {
  const order = ['primary', 'secondary', 'knife', 'he', 'flash', 'smoke', 'bomb'].filter(
    (s) => (s === 'primary' || s === 'secondary' ? f.slots[s] : s === 'knife' ? true : s === 'bomb' ? f.hasBomb : f.nades[s] > 0)
  );
  const i = order.indexOf(f.active);
  selectSlot(f, order[(i + dir + order.length) % order.length]);
}
function cycleNade(f) {
  const order = ['he', 'flash', 'smoke'].filter((s) => f.nades[s] > 0);
  if (!order.length) return;
  const i = order.indexOf(f.active);
  selectSlot(f, order[(i + 1) % order.length]);
}

function startReload(f) {
  if (!f || !f.alive) return;
  const w = f.slots[f.active];
  if (!w || f.reloadT > 0 || w.mag >= w.def.mag || w.reserve <= 0) return;
  f.reloadT = w.def.reload;
  f.scope = 0;
  if (f === S.me) sfx.reload();
}

function dropWeapon(f, slot) {
  const w = f.slots[slot];
  if (!w) return;
  f.slots[slot] = null;
  const mesh = buildGun(w.def, skinTexOf(w.skin));
  mesh.position.set(f.pos.x + rand(-0.3, 0.3), 0.06, f.pos.z + rand(-0.3, 0.3));
  mesh.rotation.set(0, rand(0, 6), Math.PI / 2);
  env.scene.add(mesh);
  S.drops.push({ mesh, w, t: 0.8 });
}
function dropActive(f) {
  if (!f.alive) return;
  if (f.active === 'primary' || f.active === 'secondary') {
    dropWeapon(f, f.active);
    selectSlot(f, f.slots.primary ? 'primary' : f.slots.secondary ? 'secondary' : 'knife');
    if (!f.slots[f.active] && f.active !== 'knife') f.active = 'knife';
    refreshGunModel(f);
  } else if (f.active === 'bomb') {
    dropBomb(f);
  }
}

function updateDrops(dt) {
  for (let i = S.drops.length - 1; i >= 0; i--) {
    const d = S.drops[i];
    d.t -= dt;
    if (d.t > 0) continue;
    for (const f of S.fighters) {
      if (!f.alive || f.slots[d.w.def.slot]) continue;
      if (Math.hypot(f.pos.x - d.mesh.position.x, f.pos.z - d.mesh.position.z) < 1.1) {
        f.slots[d.w.def.slot] = d.w;
        if (f.isBot || f.active === 'knife') {
          f.active = d.w.def.slot;
          refreshGunModel(f);
        }
        if (f === S.me) toast(`Sebráno: ${d.w.def.name}`);
        env.scene.remove(d.mesh);
        S.drops.splice(i, 1);
        break;
      }
    }
  }
  if (S.drops.length > 20) env.scene.remove(S.drops.shift().mesh);
}

/* ================= bomba ================= */

function bombMesh() {
  const g = new THREE.Group();
  const egg = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshStandardMaterial({ color: '#ffcf2e', metalness: 0.9, roughness: 0.25, emissive: '#3a2800' }));
  egg.scale.set(1, 1.3, 1);
  g.add(egg);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), new THREE.MeshStandardMaterial({ color: '#222' }));
  panel.position.set(0, 0, 0.12);
  g.add(panel);
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff2020' }));
  light.position.set(0.03, 0.02, 0.145);
  g.add(light);
  g.userData.light = light;
  return g;
}

function dropBomb(f) {
  if (!f.hasBomb) return;
  f.hasBomb = false;
  const b = S.bomb;
  b.state = 'dropped';
  b.carrier = null;
  b.pos.set(f.pos.x, 0.15, f.pos.z);
  b.mesh = bombMesh();
  b.mesh.position.copy(b.pos);
  env.scene.add(b.mesh);
  if (f.active === 'bomb') {
    f.active = f.slots.primary ? 'primary' : f.slots.secondary ? 'secondary' : 'knife';
    refreshGunModel(f);
  }
  if (f.team === S.me.team && f !== S.me) toast('Zlaté vejce leží na zemi!');
}

function updateBomb(dt) {
  const b = S.bomb;
  if (!b) return;
  if (b.state === 'dropped') {
    b.mesh.rotation.y += dt;
    for (const f of S.fighters) {
      if (!f.alive || f.team !== 'T') continue;
      if (Math.hypot(f.pos.x - b.pos.x, f.pos.z - b.pos.z) < 1) {
        f.hasBomb = true;
        b.state = 'carried';
        b.carrier = f;
        env.scene.remove(b.mesh);
        b.mesh = null;
        if (f === S.me) toast('Sebral jsi <b>Zlaté vejce</b>!');
        break;
      }
    }
  } else if (b.state === 'carried') {
    b.pos.copy(b.carrier.pos);
    // pokládání
    const f = b.carrier;
    const site = map.siteOf(f.pos);
    const wantPlant = f.isBot ? f.bot.wantPlant : IN.use || (f.active === 'bomb' && IN.fire);
    if (S.phase === 'live' && site && wantPlant && f.onGround && f.vel.length() < 1.2) {
      b.plantT += dt;
      if (f.active !== 'bomb') selectSlot(f, 'bomb');
      if (b.plantT >= PLANT_TIME) plantBomb(f, site);
    } else b.plantT = 0;
  } else if (b.state === 'planted') {
    // zneškodňování
    let defuser = null;
    for (const f of S.fighters) {
      if (!f.alive || f.team !== 'CT') continue;
      const near = Math.hypot(f.pos.x - b.pos.x, f.pos.z - b.pos.z) < 1.6;
      const wants = f.isBot ? f.bot.wantDefuse : IN.use;
      if (near && wants && f.vel.length() < 1) {
        defuser = f;
        break;
      }
    }
    if (defuser && defuser === b.defuser) {
      b.defuseT += dt;
      if (Math.floor(b.defuseT * 4) !== Math.floor((b.defuseT - dt) * 4) && camDist(b.pos) < 15) sfx.defuseTick();
      if (b.defuseT >= (defuser.kit ? DEFUSE_TIME / 2 : DEFUSE_TIME)) {
        b.state = 'defused';
        b.light.visible = false;
        defuser.money = Math.min(16000, defuser.money + 300);
        endRound('CT', 'defuse');
      }
    } else {
      b.defuser = defuser;
      b.defuseT = 0;
    }
  }
}

function plantBomb(f, site) {
  const b = S.bomb;
  f.hasBomb = false;
  b.state = 'planted';
  b.site = site;
  b.timer = BOMB_TIME;
  b.beepT = 0;
  b.carrier = null;
  b.pos.set(f.pos.x, 0.15, f.pos.z);
  b.mesh = bombMesh();
  b.mesh.position.copy(b.pos);
  b.mesh.rotation.x = Math.PI / 2;
  b.light = b.mesh.userData.light;
  env.scene.add(b.mesh);
  S.phase = 'planted';
  f.money = Math.min(16000, f.money + 300);
  sfx.plant();
  centerMsg('Zlaté vejce položeno!', `Místo ${site} • ${BOMB_TIME} s`, 't');
  f.active = f.slots.primary ? 'primary' : f.slots.secondary ? 'secondary' : 'knife';
  refreshGunModel(f);
}

function explodeBomb() {
  const b = S.bomb;
  b.state = 'exploded';
  sfx.boom();
  burst(b.pos.clone().setY(1), 120, ['#ffe27a', '#ff8a3d', '#ffffff', '#ffc21a'], 18, 0.35, 4, 2);
  for (const f of S.fighters) {
    if (!f.alive) continue;
    const d = f.pos.distanceTo(b.pos);
    const dmg = d < 12 ? 500 : d < 25 ? (1 - (d - 12) / 13) * 90 : 0;
    if (dmg > 0) damage(f, null, null, 'body', 0, dmg, 'bomb');
  }
  env.scene.remove(b.mesh);
  if (S.phase !== 'end') endRound('T', 'bomb');
}

/* ================= střelba a zásahy ================= */

function aimDir(yaw, pitch, out = v3()) {
  return out.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
}

function eyePos(f, out = v3()) {
  return out.set(f.pos.x, f.y + 1.62 - f.crouch * 0.42, f.pos.z);
}

function rayFighter(o, d, f) {
  const fy = f.y;
  const c = f.crouch;
  // hlava
  const hx = f.pos.x + Math.sin(f.yaw + Math.PI) * 0.0;
  const hy = fy + 1.66 - c * 0.42;
  const hz = f.pos.z;
  let best = null;
  {
    const ox = o.x - hx;
    const oy = o.y - hy;
    const oz = o.z - hz;
    const b = ox * d.x + oy * d.y + oz * d.z;
    const cc = ox * ox + oy * oy + oz * oz - 0.145 * 0.145;
    const disc = b * b - cc;
    if (disc >= 0) {
      const t = -b - Math.sqrt(disc);
      if (t > 0) best = { t, part: 'head' };
    }
  }
  // tělo – svislý válec
  const r = 0.26;
  const ox = o.x - f.pos.x;
  const oz = o.z - f.pos.z;
  const a = d.x * d.x + d.z * d.z;
  if (a > 1e-8) {
    const b = 2 * (ox * d.x + oz * d.z);
    const cc = ox * ox + oz * oz - r * r;
    const disc = b * b - 4 * a * cc;
    if (disc >= 0) {
      const t = (-b - Math.sqrt(disc)) / (2 * a);
      if (t > 0) {
        const y = o.y + d.y * t;
        const top = fy + 1.5 - c * 0.42;
        if (y >= fy && y <= top && (!best || t < best.t)) best = { t, part: y > fy + 0.9 - c * 0.3 ? 'body' : 'legs' };
      }
    }
  }
  return best;
}

function hitscan(f, o, d, def) {
  const wall = map.raycast(o, d, 300);
  let maxT = wall ? wall.t : 300;
  let best = null;
  for (const g of S.fighters) {
    if (!g.alive || g === f || g.team === f.team) continue;
    const h = rayFighter(o, d, g);
    if (h && h.t < maxT && (!best || h.t < best.t)) best = { ...h, g };
  }
  // krávy
  for (const c of S.cows) {
    T1.set(c.pos.x, 1.0, c.pos.z).sub(o);
    const t = T1.dot(d);
    if (t > 0 && t < (best ? best.t : maxT)) {
      T2.copy(d).multiplyScalar(t).add(o);
      if (T2.distanceTo(T1.add(o)) < 0.75) {
        cowHit(c, f);
        best = null;
        maxT = t;
        burst(T2, 6, ['#ffffff', '#f2a5b4'], 2, 0.05);
        break;
      }
    }
  }
  if (best) {
    const point = d.clone().multiplyScalar(best.t).add(o);
    const dmg = def.dmg * Math.pow(def.range, best.t / 10);
    damage(best.g, f, def, best.part, best.t, dmg);
    burst(point, best.part === 'head' ? 14 : 7, ['#ffc21a', '#fff3c4', '#ffe27a'], 3, 0.05, 6, 0.6);
    return point;
  }
  const end = d.clone().multiplyScalar(maxT).add(o);
  if (wall) {
    addDecal(end, wall.normal);
    burst(end, 5, ['#9a8a70', '#d9cbb0', '#555'], 2.5, 0.04, 9, 0.5);
  }
  return end;
}

function cowHit(c, by) {
  c.fleeT = 4;
  c.target.copy(pick(map.cowCells));
  if (c.mooCd <= 0) {
    c.mooCd = 1.5;
    if (camDist(c.pos) < 35) sfx.moo(rand(1.0, 1.25), 0.8);
  }
  if (by === S.me) toast('🐮 Bůůů! Krávy nestřílej!');
}

function damage(victim, attacker, def, part, dist, base, src = 'gun') {
  if (!victim.alive || (victim.spawnProtect || 0) > 0) return;
  let d = base;
  if (part === 'head') d *= def?.cat === 'shotgun' ? 2 : 4;
  else if (part === 'legs') d *= 0.75;
  if (victim.armor > 0 && src !== 'bomb' && (part === 'body' || (part === 'head' && victim.helmet))) {
    const pen = def ? def.pen ?? 0.5 : 0.5;
    const absorbed = d * (1 - pen);
    d -= absorbed;
    victim.armor = Math.max(0, victim.armor - absorbed);
  }
  victim.hp -= d;
  if (attacker) victim.dmgBy.set(attacker, (victim.dmgBy.get(attacker) || 0) + d);
  if (attacker === S.me) {
    hitmarker(part === 'head');
    if (part === 'head') sfx.headshot();
    else sfx.hitBody();
  }
  if (victim === S.me) {
    S.hurtT = Math.min(1, (S.hurtT || 0) + d / 60);
    if (attacker) showDamageDir(attacker.pos);
    victim.punchP += 0.03;
    sfx.playerHurt();
    try {
      navigator.vibrate?.(30);
    } catch {
      /* nic */
    }
  }
  if (victim.isBot && attacker && victim.hp > 0) {
    victim.bot.lastSeen = attacker.pos.clone();
    victim.bot.lastSeenT = S.t;
    victim.bot.alert = attacker;
  }
  if (victim.hp <= 0) kill(victim, attacker, def, part === 'head', src);
}

function kill(victim, attacker, def, hs, src) {
  victim.alive = false;
  victim.hp = 0;
  victim.deadT = 0;
  victim.deaths++;
  victim.scope = 0;
  victim.respawnT = 2.5;
  if (victim.slots.primary) dropWeapon(victim, 'primary');
  else if (victim.slots.secondary && victim.slots.secondary.def.price > 200) dropWeapon(victim, 'secondary');
  if (victim.hasBomb) dropBomb(victim);
  if (attacker && attacker !== victim) {
    if (attacker.team !== victim.team) {
      attacker.kills++;
      attacker.roundKills++;
      if (hs) attacker.hs++;
      if (cfg.mode !== 'dm') attacker.money = Math.min(16000, attacker.money + (def ? def.reward : src === 'knife' ? 1500 : 300));
      if (cfg.mode === 'dm') S.dmKills[attacker.team]++;
      // KravTrak
      if (attacker === S.me && def) {
        const sk = attacker.slots[def.slot]?.skin;
        if (sk && sk.st !== undefined && sk.uid) {
          sk.st++;
          saveProfile();
        }
      }
    }
  }
  for (const [who, dmg] of victim.dmgBy) if (who !== attacker && dmg >= 40 && who.team !== victim.team) who.assists++;
  const weaponName = src === 'bomb' ? 'Zlaté vejce' : src === 'he' ? 'Vaječný granát' : src === 'knife' ? 'Nůž' : def?.name || '?';
  addKillfeed(attacker, victim, weaponName, hs);
  burst(eyePos(victim).setY(victim.y + 1.2), 25, ['#ffc21a', '#fff3c4', '#ffffff'], 4, 0.08, 9, 1);
  if (victim === S.me) {
    S.spectate = null;
    S.deathCam = 2;
    S.killedBy = attacker;
    $('scope').hidden = true;
    if (cfg.mode !== 'dm') setTimeout(() => S.active && !S.me.alive && nextSpectate(), 2000);
  }
  if (attacker === S.me && victim !== S.me) {
    const n = S.me.roundKills;
    if (n >= 2 && cfg.mode !== 'dm') toast(['', '', 'Dvojité zabití!', 'Trojité zabití!', 'Ultra kill!', 'ACE! Celý tým!'][Math.min(n, 5)]);
  }
  if (attacker?.isBot && attacker.team === S.me.team && Math.random() < 0.25) botChat(attacker, ['Mám ho!', 'Jeden dole!', 'Bůů, další!', 'Hezky do hlavy.', 'Vajíčko v hlavě!']);
}

/* ================= střelba ================= */

function tryFire(f, dt) {
  if (!f.alive || f.drawT > 0) return false;
  if (f.active === 'knife') {
    if (f.fireCd > 0) return false;
    f.fireCd = 1 / KNIFE.rate;
    knifeAttack(f, KNIFE.dmg);
    return true;
  }
  if (GRENADES[f.active]) {
    if (f.fireCd > 0) return false;
    throwNade(f, f.active);
    f.fireCd = 0.8;
    return true;
  }
  if (f.active === 'bomb') return false;
  const w = f.slots[f.active];
  if (!w || f.reloadT > 0 || f.fireCd > 0) return false;
  if (w.mag <= 0) {
    if (w.reserve > 0) startReload(f);
    else {
      f.fireCd = 0.25;
      if (f === S.me) sfx.empty();
    }
    return false;
  }
  const def = w.def;
  w.mag--;
  f.fireCd = 1 / def.rate;
  f.spray++;
  f.sprayT = 0.35;
  const moving = Math.hypot(f.vel.x, f.vel.z) / 6;
  let spread = def.spread + def.moveSpread * clamp(moving - 0.15, 0, 1) + (f.onGround ? 0 : 0.12);
  if (def.cat === 'sniper' && !f.scope) spread = def.unscoped + def.moveSpread * moving;
  if (f.crouch > 0.5) spread *= 0.75;
  if (def.auto && def.cat !== 'sniper') spread += Math.min(f.spray, 12) * def.recoil * 0.12;
  const o = eyePos(f, v3());
  const muzzle = muzzlePos(f);
  const yaw = f.yaw + f.punchY * 2;
  const pitch = f.pitch + f.punchP * 2;
  let end = null;
  for (let i = 0; i < def.pellets; i++) {
    const d = aimDir(yaw, pitch);
    // náhodný kužel
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * spread;
    T1.set(-Math.cos(yaw), 0, Math.sin(yaw));
    T2.crossVectors(T1, d).normalize();
    d.addScaledVector(T1, Math.cos(a) * r).addScaledVector(T2, Math.sin(a) * r).normalize();
    end = hitscan(f, o, d, def);
    if (i < 3 && (f === S.me || Math.random() < 0.6)) addTracer(muzzle, end, def.cat === 'sniper');
  }
  // zpětný ráz
  const k = f.spray < 3 ? 0.6 : 1;
  f.punchP += def.recoil * k * (def.cat === 'sniper' ? 0.5 : 1);
  f.punchY += (Math.random() - 0.5) * def.recoil * (f.spray > 4 ? 1.4 : 0.4);
  if (def.cat === 'sniper') f.scope = 0;
  const vol = f === S.me ? 1 : clamp(1 - camDist(f.pos) / 70, 0, 1);
  gunshot(def.cat, def.sil, vol);
  f.flashT = 0.05;
  if (f === S.me) {
    S.shots = (S.shots || 0) + 1;
    vm.kick = Math.min(1.5, vm.kick + (def.cat === 'sniper' || def.cat === 'shotgun' ? 1.2 : 0.5));
  }
  // boti slyší výstřely
  if (!def.sil || Math.random() < 0.3)
    for (const b of S.fighters) {
      if (!b.isBot || !b.alive || b.team === f.team || b.bot.target) continue;
      if (b.pos.distanceTo(f.pos) < 35) {
        b.bot.heard = f.pos.clone();
        b.bot.heardT = S.t;
      }
    }
  if (w.mag === 0 && w.reserve > 0 && (f.isBot || !def.auto || true)) setTimeout(() => f.alive && startReload(f), 150);
  return true;
}

function knifeAttack(f, dmg) {
  sfx.knife();
  const o = eyePos(f, v3());
  const d = aimDir(f.yaw, f.pitch);
  if (f === S.me) vm.kick = 1.2;
  let best = null;
  for (const g of S.fighters) {
    if (!g.alive || g.team === f.team) continue;
    T1.set(g.pos.x, g.y + 1.1, g.pos.z).sub(o);
    const dist = T1.length();
    if (dist > KNIFE.range + 0.4) continue;
    if (T1.normalize().dot(d) < 0.75) continue;
    if (!best || dist < best.dist) best = { g, dist };
  }
  if (best) {
    // do zad = smrt
    const back = Math.cos(angDiff(best.g.yaw, f.yaw)) > 0.6;
    damage(best.g, f, null, 'body', best.dist, back ? 180 : dmg, 'knife');
  }
}

function muzzlePos(f) {
  if (f === S.me && vm.gun) {
    const m = vm.gun.userData.muzzle;
    if (m) {
      // přepočet z kamery viewmodelu do světa
      const p = m.getWorldPosition(v3());
      p.applyMatrix4(env.vmCamera.matrixWorldInverse);
      p.multiplyScalar(0.6);
      return p.applyMatrix4(env.camera.matrixWorld);
    }
  }
  if (f.gunObj?.userData.muzzle) return f.gunObj.userData.muzzle.getWorldPosition(v3());
  return eyePos(f);
}

/* ================= granáty ================= */

function throwNade(f, kind) {
  f.nades[kind]--;
  const d = aimDir(f.yaw, f.pitch + 0.12);
  const mesh = buildGrenade(kind);
  mesh.scale.setScalar(1.6);
  const o = eyePos(f).addScaledVector(d, 0.5);
  mesh.position.copy(o);
  env.scene.add(mesh);
  S.nades.push({ kind, owner: f, mesh, pos: mesh.position, vel: d.multiplyScalar(f.isBot ? 15 : 17).add(f.vel.clone().multiplyScalar(0.5)), t: kind === 'smoke' ? 1.8 : 1.6, rest: false });
  sfx.knife();
  if (f.nades[kind] <= 0) {
    const next = ['he', 'flash', 'smoke'].find((k) => f.nades[k] > 0);
    f.active = next || (f.slots.primary ? 'primary' : f.slots.secondary ? 'secondary' : 'knife');
    refreshGunModel(f);
  }
  if (f.isBot && f.team === S.me.team) botChat(f, [kind === 'he' ? 'Granát!' : kind === 'flash' ? 'Oslepuju!' : 'Kouř!']);
}

function updateNades(dt) {
  for (let i = S.nades.length - 1; i >= 0; i--) {
    const n = S.nades[i];
    n.t -= dt;
    if (!n.rest) {
      n.vel.y -= 15 * dt;
      const step = n.vel.length() * dt;
      if (step > 0) {
        T1.copy(n.vel).normalize();
        const hit = map.raycast(n.pos, T1, step + 0.08);
        if (hit) {
          n.pos.addScaledVector(T1, Math.max(0, hit.t - 0.08));
          const nrm = hit.normal;
          const vn = n.vel.dot(nrm);
          n.vel.addScaledVector(nrm, -2 * vn).multiplyScalar(0.42);
          if (nrm.y > 0.5 && n.vel.length() < 1.2) {
            n.rest = true;
            n.vel.set(0, 0, 0);
          }
        } else n.pos.addScaledVector(n.vel, dt);
      }
      n.mesh.rotation.x += dt * 8;
    }
    if (n.t <= 0) {
      detonate(n);
      env.scene.remove(n.mesh);
      S.nades.splice(i, 1);
    }
  }
  for (let i = S.smokes.length - 1; i >= 0; i--) {
    const s = S.smokes[i];
    s.life -= dt;
    const k = s.life < 2 ? s.life / 2 : Math.min(1, (16 - s.life) * 1.5);
    s.r = 3.8 * Math.min(1, (16.5 - s.life) * 0.8);
    for (const p of s.puffs) {
      p.sprite.material.opacity = 0.85 * k;
      p.sprite.position.y = p.y + Math.sin(S.t * 0.5 + p.ph) * 0.1;
    }
    if (s.life <= 0) {
      env.scene.remove(s.group);
      S.smokes.splice(i, 1);
    }
  }
}

let smokeTex = null;
function getSmokeTex() {
  if (smokeTex) return smokeTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(240,240,240,0.7)');
  g.addColorStop(1, 'rgba(230,230,230,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  smokeTex = new THREE.CanvasTexture(c);
  return smokeTex;
}

function detonate(n) {
  const p = n.pos.clone();
  if (n.kind === 'he') {
    sfx.boom();
    burst(p.clone().setY(p.y + 0.3), 50, ['#ffe27a', '#ff8a3d', '#fff8ec', '#ffc21a'], 10, 0.15, 6, 1);
    for (const f of S.fighters) {
      if (!f.alive) continue;
      const e = eyePos(f, v3()).setY(f.y + 1);
      const d = e.distanceTo(p);
      if (d > 8.5 || !map.los(p.clone().setY(p.y + 0.3), e)) continue;
      const dmg = 98 * (1 - d / 8.5);
      if (f.team === n.owner.team && f !== n.owner) continue;
      damage(f, n.owner, { dmg: 0, pen: 0.5, name: 'Vaječný granát' }, 'body', d, dmg, 'he');
    }
    addDecal(p.clone().setY(0.02), v3(0, 1, 0), 1.5);
  } else if (n.kind === 'flash') {
    sfx.flashbang();
    burst(p, 20, ['#ffffff', '#fff3c4'], 6, 0.06, 2, 0.4);
    for (const f of S.fighters) {
      if (!f.alive) continue;
      const e = eyePos(f, v3());
      const d = e.distanceTo(p);
      if (d > 30 || !map.los(p, e)) continue;
      const toFlash = p.clone().sub(e).normalize();
      const facing = toFlash.dot(aimDir(f.yaw, f.pitch));
      let blind = (facing > 0.3 ? 3.5 : facing > -0.3 ? 1.6 : 0.5) * (1 - d / 35);
      if (smokeBlocks(e, p)) blind *= 0.2;
      f.flashT = Math.max(f.flashT, blind);
    }
  } else if (n.kind === 'smoke') {
    sfx.smokePop();
    const group = new THREE.Group();
    const puffs = [];
    const mat = new THREE.SpriteMaterial({ map: getSmokeTex(), color: '#e8eef2', transparent: true, depthWrite: false, opacity: 0 });
    for (let k = 0; k < 26; k++) {
      const s = new THREE.Sprite(mat.clone());
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 3;
      const y = 0.6 + Math.random() * 2.6;
      s.position.set(p.x + Math.cos(a) * r, y, p.z + Math.sin(a) * r);
      s.scale.setScalar(3 + Math.random() * 2);
      group.add(s);
      puffs.push({ sprite: s, y, ph: Math.random() * 6 });
    }
    env.scene.add(group);
    S.smokes.push({ group, puffs, pos: p.clone().setY(1.5), r: 0.5, life: 16.5 });
  }
}

function smokeBlocks(a, b) {
  for (const s of S.smokes) {
    if (s.life < 1) continue;
    // vzdálenost středu od úsečky
    T1.subVectors(b, a);
    const len = T1.length();
    T1.divideScalar(len);
    T2.subVectors(s.pos, a);
    const t = clamp(T2.dot(T1), 0, len);
    T3.copy(a).addScaledVector(T1, t);
    if (T3.distanceTo(s.pos) < s.r * 0.95) return true;
  }
  return false;
}

/* ================= efekty ================= */

const particles = [];
const PGEO = new THREE.BoxGeometry(1, 1, 1);
let pIdx = 0;
function ensureParticles() {
  if (particles.length) return;
  for (let i = 0; i < 300; i++) {
    const m = new THREE.Mesh(PGEO, new THREE.MeshBasicMaterial({ color: '#fff' }));
    m.visible = false;
    env.scene.add(m);
    particles.push({ mesh: m, vel: v3(), life: 0, max: 1, grav: 9, active: false });
  }
}
function burst(pos, n, colors, speed = 4, size = 0.06, grav = 9, life = 0.8) {
  ensureParticles();
  for (let i = 0; i < n; i++) {
    const p = particles[pIdx];
    pIdx = (pIdx + 1) % particles.length;
    p.active = true;
    p.life = 0;
    p.max = rand(life * 0.4, life);
    p.grav = grav;
    p.mesh.visible = true;
    p.mesh.position.copy(pos);
    p.mesh.scale.setScalar(size * rand(0.5, 1.4));
    p.mesh.material.color.set(Array.isArray(colors) ? pick(colors) : colors);
    p.vel.set(rand(-1, 1), rand(-0.3, 1.2), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.3, 1));
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
  }
}

const tracerMat = new THREE.LineBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.8 });
function addTracer(a, b, thick) {
  const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
  const line = new THREE.Line(geo, tracerMat.clone());
  if (thick) line.material.color.set('#ffffff');
  env.scene.add(line);
  S.tracers.push({ line, life: thick ? 0.25 : 0.06 });
}

const decalGeo = new THREE.CircleGeometry(0.06, 8);
const decalMat = new THREE.MeshBasicMaterial({ color: '#1a1410', transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
function addDecal(p, normal, scale = 1) {
  const m = new THREE.Mesh(decalGeo, decalMat);
  m.position.copy(p).addScaledVector(normal, 0.01);
  m.lookAt(T1.copy(m.position).add(normal));
  m.scale.setScalar(scale * rand(0.8, 1.3));
  env.scene.add(m);
  S.decals.push(m);
  if (S.decals.length > 120) env.scene.remove(S.decals.shift());
}

function camDist(p) {
  return env.camera.position.distanceTo(p);
}

/* ================= pohyb ================= */

function moveFighter(f, wx, wz, speed, dt, jump) {
  const k = 1 - Math.exp(-dt * (f.onGround ? 11 : 1.5));
  f.vel.x += (wx * speed - f.vel.x) * k;
  f.vel.z += (wz * speed - f.vel.z) * k;
  f.pos.x += f.vel.x * dt;
  f.pos.z += f.vel.z * dt;
  // ostatní hráči
  for (const o of S.fighters) {
    if (o === f || !o.alive) continue;
    const dx = f.pos.x - o.pos.x;
    const dz = f.pos.z - o.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.6 && d > 1e-4) {
      f.pos.x += (dx / d) * (0.6 - d) * 0.5;
      f.pos.z += (dz / d) * (0.6 - d) * 0.5;
    }
  }
  const floor = map.collide(f.pos, 0.36, f.y);
  if (jump && f.onGround) {
    f.vy = 5.6;
    f.onGround = false;
  }
  f.vy -= 17 * dt;
  f.y += f.vy * dt;
  if (f.y <= floor) {
    f.y = floor;
    f.vy = 0;
    f.onGround = true;
  } else if (f.y > floor + 0.05) f.onGround = false;
}

function maxSpeed(f) {
  const def = activeDef(f);
  let s = 6.2 * (def ? def.speed : 1.05);
  if (f.scope) s *= 0.55;
  return s;
}

/* ================= hráč ================= */

function updateMe(dt) {
  const f = S.me;
  if (!f.alive) return;
  readMove();
  f.yaw -= IN.lookDX;
  f.pitch = clamp(f.pitch - IN.lookDY, -1.5, 1.5);
  IN.lookDX = IN.lookDY = 0;

  const frozen = S.phase === 'freeze' || S.phase === 'over';
  const planting = S.bomb?.carrier === f && S.bomb.plantT > 0;
  const defusing = S.bomb?.defuser === f;
  let fx = -Math.sin(f.yaw);
  let fz = -Math.cos(f.yaw);
  let wx = fx * IN.fwd + Math.cos(f.yaw) * IN.side;
  let wz = fz * IN.fwd - Math.sin(f.yaw) * IN.side;
  const l = Math.hypot(wx, wz);
  if (l > 1) {
    wx /= l;
    wz /= l;
  }
  if (frozen || planting || defusing) wx = wz = 0;
  f.crouch += ((IN.crouch || planting || defusing ? 1 : 0) - f.crouch) * Math.min(1, dt * 10);
  let sp = maxSpeed(f);
  if (IN.walk) sp *= 0.52;
  if (f.crouch > 0.5) sp *= 0.36;
  moveFighter(f, wx, wz, sp, dt, IN.jump && !frozen);
  IN.jump = false;
  f.walk += Math.hypot(f.vel.x, f.vel.z) * dt * 1.6;

  // míření / zoom
  if (IN.alt) {
    IN.alt = false;
    const def = activeDef(f);
    if (def?.scope && f.reloadT <= 0) {
      f.scope = (f.scope + 1) % (def.scope.length + 1);
      sfx.click();
    } else if (f.active === 'knife' && f.fireCd <= 0) {
      f.fireCd = 1;
      knifeAttack(f, KNIFE.stab);
    }
  }
  if (!frozen && IN.fire && !planting && !defusing && $('buymenu').hidden) {
    const def = activeDef(f);
    const fired = tryFire(f, dt);
    if (fired && def && !def.auto && !isTouch) S.semiLock = true;
  }
  if (!IN.fire) S.semiLock = false;
  // automaticky – u poloautomatů na PC vyžaduj nové stisknutí
  if (S.semiLock && !isTouch) {
    const def = activeDef(f);
    if (def && !def.auto) IN.fire = false;
  }
  if (f.buyT > 0) f.buyT -= dt;
  if (f.spawnProtect > 0) f.spawnProtect -= dt;
}

/* ================= boti ================= */

function botChat(f, lines) {
  if ((f.chatCd || 0) > S.t) return;
  f.chatCd = S.t + 8;
  toast(`<b style="color:${TEAM_COLOR[f.team]}">${f.name}:</b> ${pick(lines)}`);
}

function canSee(f, g) {
  const e = eyePos(f, v3());
  const head = eyePos(g, v3()).setY(g.y + 1.62 - g.crouch * 0.42);
  const chest = v3(g.pos.x, g.y + 1.15 - g.crouch * 0.4, g.pos.z);
  for (const p of [head, chest]) if (map.los(e, p) && !smokeBlocks(e, p)) return p;
  return null;
}

function botGoal(f) {
  const b = f.bot;
  if (cfg.mode === 'dm') {
    if (Math.random() < 0.5) {
      const enemies = S.fighters.filter((o) => o.alive && o.team !== f.team);
      if (enemies.length) return pick(enemies).pos.clone();
    }
    return pick(map.floorCells).clone();
  }
  const bomb = S.bomb;
  if (f.team === 'T') {
    if (bomb.state === 'dropped') {
      const ts = S.fighters.filter((o) => o.alive && o.team === 'T' && o.isBot).sort((a, c) => a.pos.distanceTo(bomb.pos) - c.pos.distanceTo(bomb.pos));
      if (ts[0] === f) return bomb.pos.clone();
    }
    if (bomb.state === 'planted') {
      const a = Math.random() * Math.PI * 2;
      const p = bomb.pos.clone().add(v3(Math.cos(a) * 4, 0, Math.sin(a) * 4));
      return p;
    }
    const site = f.hasBomb ? S.tSite : b.role;
    const cells = map.sites[site];
    return f.hasBomb ? map.siteCenter[site].clone() : pick(cells).clone();
  }
  // CT
  if (bomb.state === 'planted') return bomb.pos.clone();
  if (bomb.state === 'dropped' && Math.random() < 0.3) return bomb.pos.clone();
  return pick(map.sites[b.role || 'A']).clone();
}

function updateBot(f, dt) {
  const b = f.bot;
  const D = DIFF[cfg.difficulty] || DIFF.normal;
  b.thinkT -= dt;
  const frozen = S.phase === 'freeze' || S.phase === 'over';
  f.flashT = Math.max(0, f.flashT - dt);
  const blind = f.flashT > 0.6;

  // vnímání
  if (b.thinkT <= 0 && !frozen) {
    b.thinkT = rand(0.1, 0.18);
    let best = null;
    let bestD = 80;
    if (!blind)
      for (const g of S.fighters) {
        if (!g.alive || g.team === f.team) continue;
        const d = g.pos.distanceTo(f.pos);
        if (d > bestD) continue;
        const ang = Math.abs(angDiff(Math.atan2(-(g.pos.x - f.pos.x), -(g.pos.z - f.pos.z)), f.yaw));
        if (ang > D.fov && d > 4 && b.alert !== g) continue;
        const p = canSee(f, g);
        if (p) {
          best = g;
          bestD = d;
        }
      }
    if (best && best !== b.target) {
      b.reactT = D.react * rand(0.75, 1.3) * (b.alert === best ? 0.6 : 1);
      const e = D.err * (1 + bestD / 25);
      b.aimErr.set(rand(-e, e), rand(-e, e) * 0.6, 0);
      b.aimHead = Math.random() < D.hs;
    }
    b.target = best;
    if (best) {
      b.lastSeen = best.pos.clone();
      b.lastSeenT = S.t;
    }
    b.alert = null;
  }
  if (b.target && !b.target.alive) b.target = null;

  let wx = 0;
  let wz = 0;
  let speed = maxSpeed(f);
  const tgt = b.target;
  b.wantPlant = false;
  b.wantDefuse = false;

  if (tgt && !frozen) {
    // boj
    const aimP = eyePos(tgt, v3());
    if (!b.aimHead) aimP.y -= 0.42;
    const e = eyePos(f, v3());
    const dx = aimP.x - e.x;
    const dz = aimP.z - e.z;
    const dist = Math.hypot(dx, dz);
    let wantYaw = Math.atan2(-dx, -dz) + b.aimErr.x;
    let wantPitch = Math.atan2(aimP.y - e.y, dist) + b.aimErr.y;
    b.aimErr.multiplyScalar(Math.exp(-dt * 1.6));
    const dy = angDiff(wantYaw, f.yaw);
    const maxTurn = D.turn * dt;
    f.yaw += clamp(dy, -maxTurn, maxTurn);
    f.pitch += clamp(wantPitch - f.pitch, -maxTurn, maxTurn);
    b.reactT -= dt;
    // výběr zbraně
    const w = f.slots[f.active];
    if (f.active !== 'primary' && f.active !== 'secondary') selectSlot(f, f.slots.primary ? 'primary' : 'secondary');
    else if (w && w.mag === 0 && w.reserve === 0) selectSlot(f, f.active === 'primary' ? 'secondary' : 'knife');
    else if (w && w.mag === 0 && f.active === 'primary' && f.slots.secondary?.mag > 0 && dist < 15 && D.react < 0.4) selectSlot(f, 'secondary');
    const def = activeDef(f);
    if (def?.scope && def.cat === 'sniper' && !f.scope && dist > 6) f.scope = 1;
    // HE
    if (!b.nadeUsed && f.nades.he > 0 && dist > 10 && dist < 22 && Math.random() < dt * 0.6) {
      b.nadeUsed = true;
      const prev = f.active;
      f.active = 'he';
      f.pitch += 0.15;
      throwNade(f, 'he');
      f.active = f.slots.primary ? 'primary' : prev === 'he' ? 'secondary' : prev;
      refreshGunModel(f);
    }
    // střelba
    if (b.reactT <= 0 && Math.abs(dy) < 0.08 + (def ? def.spread * 2 : 0.1)) {
      if (b.burstPause > 0) b.burstPause -= dt;
      else {
        const shot = tryFire(f, dt);
        if (shot && def?.auto && dist > 16) {
          b.burst++;
          if (b.burst >= 3 + Math.floor(Math.random() * 3)) {
            b.burst = 0;
            b.burstPause = rand(0.2, 0.4);
            f.punchP *= 0.5;
          }
        } else if (shot && !def?.auto) b.burstPause = rand(0.05, 0.25) / (D.turn / 5);
      }
    }
    // pohyb v boji
    if (D.strafe > 0 && def?.cat !== 'sniper') {
      b.strafeT -= dt;
      if (b.strafeT <= 0) {
        b.strafeT = rand(0.3, 0.8);
        b.strafe = Math.random() < 0.5 ? -1 : 1;
      }
      const sx = Math.cos(f.yaw) * b.strafe;
      const sz = -Math.sin(f.yaw) * b.strafe;
      wx = sx * D.strafe;
      wz = sz * D.strafe;
      speed *= dist > 15 ? 0.45 : 0.8;
    }
    f.crouch += ((D.react < 0.35 && dist > 18 && def?.auto ? 1 : 0) - f.crouch) * Math.min(1, dt * 6);
    b.path = [];
  } else if (!frozen) {
    f.crouch += (0 - f.crouch) * Math.min(1, dt * 6);
    // reload v klidu
    const w = f.slots[f.active];
    if (w && w.mag < w.def.mag * 0.4 && w.reserve > 0) startReload(f);
    if (!(f.active === 'primary' || f.active === 'secondary') && f.active !== 'bomb') selectSlot(f, f.slots.primary ? 'primary' : 'secondary');
    // cíl cesty
    let goal = null;
    const recent = b.lastSeen && S.t - b.lastSeenT < 4;
    if (recent) goal = b.lastSeen;
    else if (b.heard && S.t - b.heardT < 3 && cfg.mode !== 'dm' && Math.random() < 0.02) goal = b.heard;
    b.repathT -= dt;
    if (!b.goal || b.repathT <= 0 || (goal && (!b.goalIsAlert || b.goal.distanceTo(goal) > 3))) {
      const g = goal || botGoal(f);
      if (!b.goal || b.goal.distanceTo(g) > 1.5 || b.repathT <= 0) {
        b.goal = g;
        b.goalIsAlert = !!goal;
        b.path = map.findPath(f.pos, g, f.team === 'T' ? 1.2 : 0.6);
        b.pathI = 0;
        b.repathT = cfg.mode === 'dm' ? rand(5, 9) : rand(8, 14);
      }
    }
    // následování cesty
    let moving = false;
    if (b.path.length && b.pathI < b.path.length) {
      // zkratky
      while (b.pathI < b.path.length - 1 && map.walkLine(f.pos, b.path[b.pathI + 1])) b.pathI++;
      const wp = b.path[b.pathI];
      const dx = wp.x - f.pos.x;
      const dz = wp.z - f.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.5) b.pathI++;
      else {
        wx = dx / d;
        wz = dz / d;
        moving = true;
        const wantYaw = Math.atan2(-dx, -dz);
        f.yaw += clamp(angDiff(wantYaw, f.yaw), -4 * dt, 4 * dt);
        f.pitch += (0 - f.pitch) * Math.min(1, dt * 3);
      }
    }
    if (!moving) {
      // na místě – hlídej
      if (b.heard && S.t - b.heardT < 2) {
        const want = Math.atan2(-(b.heard.x - f.pos.x), -(b.heard.z - f.pos.z));
        f.yaw += clamp(angDiff(want, f.yaw), -3 * dt, 3 * dt);
      } else {
        if (b.holdYaw === null || Math.random() < dt * 0.3) {
          const from = map.siteCenter[f.team === 'CT' ? 'A' : 'B'];
          const tsp = map.spawns[f.team === 'CT' ? 'T' : 'CT'][0];
          b.holdYaw = Math.atan2(-(tsp.x - f.pos.x), -(tsp.z - f.pos.z)) + rand(-0.8, 0.8);
          void from;
        }
        f.yaw += clamp(angDiff(b.holdYaw, f.yaw), -1.5 * dt, 1.5 * dt);
      }
      if (cfg.mode === 'dm' || (b.goal && f.pos.distanceTo(b.goal) > 2)) b.repathT = Math.min(b.repathT, 0.5);
      // pozdní kolo – Vaječníci tlačí
      if (f.team === 'T' && S.phase === 'live' && S.phaseT < 35 && !f.hasBomb) b.role = S.tSite;
    }
    // zaseknutí
    if (moving) {
      if (f.pos.distanceTo(b.lastPos) < 0.05) {
        b.stuckT += dt;
        if (b.stuckT > 0.8) {
          b.stuckT = 0;
          b.path = map.findPath(f.pos, b.goal || botGoal(f), 3);
          b.pathI = 0;
          wx += rand(-1, 1);
          wz += rand(-1, 1);
        }
      } else b.stuckT = 0;
    }
    b.lastPos.copy(f.pos);
    // bomba
    if (f.hasBomb && S.phase === 'live' && map.siteOf(f.pos) && f.pos.distanceTo(map.siteCenter[map.siteOf(f.pos)]) < 4.5) b.wantPlant = true;
    if (f.team === 'CT' && S.bomb?.state === 'planted' && f.pos.distanceTo(S.bomb.pos) < 1.5) b.wantDefuse = true;
    if (b.wantPlant || b.wantDefuse) wx = wz = 0;
    if (b.wantPlant || b.wantDefuse) f.crouch = Math.min(1, f.crouch + dt * 5);
  }
  if (frozen) wx = wz = 0;
  if (f.flashT > 0.6) {
    wx *= 0.3;
    wz *= 0.3;
  }
  const l = Math.hypot(wx, wz);
  if (l > 1) {
    wx /= l;
    wz /= l;
  }
  if (f.crouch > 0.5) speed *= 0.4;
  moveFighter(f, wx, wz, speed, dt, false);
  f.walk += Math.hypot(f.vel.x, f.vel.z) * dt * 1.6;
  if (f.spawnProtect > 0) f.spawnProtect -= dt;
}

/* ================= společná aktualizace ================= */

function updateFighterCommon(f, dt) {
  f.fireCd -= dt;
  f.drawT = Math.max(0, f.drawT - dt);
  f.sprayT -= dt;
  if (f.sprayT <= 0) f.spray = 0;
  const recover = f.isBot ? 6 : 5;
  if (!(f === S.me && IN.fire) || f.sprayT <= 0) {
    f.punchP *= Math.exp(-dt * recover);
    f.punchY *= Math.exp(-dt * recover);
  }
  if (f.reloadT > 0) {
    f.reloadT -= dt;
    if (f.reloadT <= 0) {
      const w = f.slots[f.active];
      if (w) {
        const take = Math.min(w.def.mag - w.mag, w.reserve);
        w.mag += take;
        w.reserve -= take;
      }
    }
  }
  // model
  const m = f.model;
  if (!m) return;
  if (f.alive) {
    m.visible = !(f === S.me) && !(S.spectate === f && S.specFirst);
    m.position.set(f.pos.x, f.y, f.pos.z);
    m.rotation.y = f.yaw + Math.PI;
    animateSoldier(m, { walk: f.walk, speed: clamp(Math.hypot(f.vel.x, f.vel.z) / 5, 0, 1), crouch: f.crouch, pitch: f.pitch, dead: 0 });
  } else {
    f.deadT += dt;
    animateSoldier(m, { walk: 0, speed: 0, crouch: 0, pitch: 0, dead: f.deadT * 2.5 });
    if (cfg?.mode === 'dm' && f.deadT > 2.3) m.visible = false;
  }
}

/* ================= pohled z první osoby ================= */

const vm = { group: null, gun: null, arms: null, kick: 0, bob: 0, swapT: 0 };

function setupViewModel() {
  if (vm.group) env.vmScene.remove(vm.group);
  vm.group = new THREE.Group();
  env.vmScene.add(vm.group);
  refreshViewModel();
}

function refreshViewModel() {
  if (!vm.group) return;
  const f = S.me;
  vm.group.clear();
  const def = activeDef(f);
  let gun;
  if (def) gun = buildGun(def, skinTexOf(f.slots[f.active].skin));
  else if (f.active === 'knife') gun = buildKnife(knifeModelOf(f), skinTexOf(knifeSkinOf(f)));
  else if (f.active === 'bomb') gun = bombMesh();
  else gun = buildGrenade(f.active);
  gun.traverse((o) => (o.castShadow = false));
  vm.gun = gun;
  const gloveInst = equipped('gloves');
  vm.arms = buildArms(agentOf(f), gloveInst ? ITEMS[gloveInst.def].finish : null);
  const holder = new THREE.Group();
  holder.add(gun);
  holder.add(vm.arms);
  const L = def?.m?.len || 0.2;
  vm.arms.userData.left.position.set(-0.03, -0.03, def && def.cat !== 'pistol' ? -Math.min(0.35, L * 0.38) : 0.0);
  vm.arms.userData.left.visible = !!def;
  vm.arms.userData.right.position.set(0, -0.06, 0.04);
  vm.group.add(holder);
  vm.holder = holder;
  vm.swapT = 0.35;
  const isPistol = !def || def.cat === 'pistol';
  vm.base = isPistol ? v3(0.1, -0.1, -0.24) : v3(0.1, -0.11, -0.19);
  if (f.active === 'knife') vm.base = v3(0.12, -0.11, -0.22);
  holder.scale.setScalar(0.58);
}

function updateViewModel(dt) {
  if (!vm.holder) return;
  const f = S.me;
  vm.group.visible = f.alive && !f.scope;
  vm.kick = Math.max(0, vm.kick - dt * 7);
  vm.swapT = Math.max(0, vm.swapT - dt);
  const sp = Math.hypot(f.vel.x, f.vel.z);
  vm.bob += dt * sp * 1.6;
  const def = activeDef(f);
  const rk = f.reloadT > 0 && def ? Math.sin((1 - f.reloadT / def.reload) * Math.PI) : 0;
  const b = vm.base;
  vm.holder.position.set(
    b.x + Math.sin(vm.bob) * 0.01 * Math.min(1, sp / 5),
    b.y - Math.abs(Math.cos(vm.bob)) * 0.01 * Math.min(1, sp / 5) - vm.swapT * 0.5 - rk * 0.08,
    b.z + vm.kick * 0.05
  );
  vm.holder.rotation.set(vm.kick * 0.1 - rk * 0.6, 0, rk * 0.5 + (f.active === 'knife' ? -0.3 - vm.kick * 0.6 : 0));
  env.vmCamera.fov = 62;
  env.vmCamera.aspect = env.camera.aspect;
  env.vmCamera.updateProjectionMatrix();
}

/* ================= kamera ================= */

function nextSpectate() {
  const mates = S.fighters.filter((o) => o.alive && o.team === S.me.team && o !== S.me);
  const pool = mates.length ? mates : S.fighters.filter((o) => o.alive);
  if (!pool.length) return;
  const i = pool.indexOf(S.spectate);
  S.spectate = pool[(i + 1) % pool.length];
  S.specFirst = true;
}

function updateCamera(dt) {
  const cam = env.camera;
  const me = S.me;
  let fov = PROFILE.settings.fov || 74;
  if (me.alive) {
    eyePos(me, cam.position);
    cam.rotation.set(me.pitch + me.punchP, me.yaw + me.punchY, 0, 'YXZ');
    const def = activeDef(me);
    if (me.scope && def?.scope) fov = def.scope[me.scope - 1];
    $('scope').hidden = !(me.scope && def?.cat === 'sniper');
  } else {
    $('scope').hidden = true;
    if (S.deathCam > 0) {
      S.deathCam -= dt;
      const k = S.killedBy;
      T1.set(me.pos.x, me.y + 2.5 + (2 - S.deathCam) * 0.8, me.pos.z + 0.01);
      cam.position.lerp(T1, Math.min(1, dt * 3));
      if (k) cam.lookAt(k.pos.x, k.y + 1.4, k.pos.z);
    } else if (S.spectate && S.spectate.alive) {
      const s = S.spectate;
      eyePos(s, cam.position);
      cam.rotation.set(s.pitch, s.yaw, 0, 'YXZ');
    } else if (cfg.mode !== 'dm') nextSpectate();
  }
  if (Math.abs(cam.fov - fov) > 0.1) {
    cam.fov = fov;
    cam.updateProjectionMatrix();
  }
  // oslepení
  const fl = me.alive ? me.flashT : 0;
  if (me.alive) me.flashT = Math.max(0, me.flashT - dt);
  $('flash').style.opacity = String(clamp(fl / 1.2, 0, 1));
}

/* ================= HUD ================= */

function fmtTime(t) {
  t = Math.max(0, Math.ceil(t));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function setT(id, v) {
  if (S.hudCache[id] !== v) {
    S.hudCache[id] = v;
    $(id).textContent = v;
  }
}

function updateHud(dt) {
  const me = S.me;
  const shown = me.alive ? me : S.spectate || me;
  if (cfg.mode === 'dm') {
    setT('hud-tscore', String(S.dmKills.T));
    setT('hud-ctscore', String(S.dmKills.CT));
    setT('hud-timer', fmtTime(S.phaseT));
  } else {
    setT('hud-tscore', String(S.score.T));
    setT('hud-ctscore', String(S.score.CT));
    setT('hud-timer', S.phase === 'planted' ? '💣 ' + fmtTime(S.bomb.timer) : S.phase === 'freeze' ? fmtTime(S.phaseT) : S.phase === 'end' ? '–' : fmtTime(S.phaseT));
  }
  $('hud-timer').classList.toggle('bomb', S.phase === 'planted');
  const aliveSig = S.fighters.map((f) => (f.alive ? 1 : 0)).join('');
  if (S.hudCache.alive !== aliveSig) {
    S.hudCache.alive = aliveSig;
    const pips = (team) => S.fighters.filter((f) => f.team === team).map((f) => `<i class="pip ${team.toLowerCase()}${f.alive ? '' : ' dead'}${f === me ? ' me' : ''}"></i>`).join('');
    $('hud-tpips').innerHTML = pips('T');
    $('hud-ctpips').innerHTML = pips('CT');
  }
  setT('hud-hp', String(Math.max(0, Math.ceil(shown.hp))));
  setT('hud-armor', String(Math.ceil(shown.armor)));
  $('hud-helmet').hidden = !shown.helmet;
  setT('hud-money', cfg.mode === 'dm' ? 'Zdarma' : `$${me.money}`);
  const def = activeDef(shown);
  const w = shown.slots[shown.active];
  const label = def ? def.name : shown.active === 'knife' ? KNIFE_NAME(shown) : shown.active === 'bomb' ? 'Zlaté vejce (bomba)' : GRENADES[shown.active]?.name || '';
  setT('hud-weapon', label);
  setT('hud-mag', w ? String(w.mag) : '');
  setT('hud-reserve', w ? `/ ${w.reserve}` : '');
  $('hud-reload').hidden = !(shown.reloadT > 0);
  setT('hud-nades', '🥚'.repeat(shown.nades.he) + '⚡'.repeat(shown.nades.flash) + '☁️'.repeat(shown.nades.smoke) + (shown.hasBomb ? ' 💣' : '') + (shown.kit ? ' 🔧' : ''));
  setT('hud-spec', !me.alive && S.spectate ? `Sleduješ: ${S.spectate.name} • ťukni/klikni pro dalšího` : !me.alive && cfg.mode === 'dm' ? `Oživení za ${Math.ceil(me.respawnT)} s` : '');
  // nákup
  const canBuy = me.alive && inBuyZone(me);
  $('t-buy').hidden = !canBuy;
  if (!canBuy && !$('buymenu').hidden) closeBuy();
  // pokládání / zneškodňování
  const b = S.bomb;
  let prog = null;
  if (b && b.carrier === me && b.plantT > 0) prog = { t: b.plantT / PLANT_TIME, label: 'Pokládám Zlaté vejce…' };
  else if (b && b.state === 'planted' && b.defuser === me) prog = { t: b.defuseT / (me.kit ? DEFUSE_TIME / 2 : DEFUSE_TIME), label: me.kit ? 'Zneškodňuji (sada)…' : 'Zneškodňuji…' };
  $('progress').hidden = !prog;
  if (prog) {
    $('progress-bar').style.width = `${clamp(prog.t, 0, 1) * 100}%`;
    setT('progress-label', prog.label);
  }
  const useCtx = me.alive && ((me.hasBomb && map.siteOf(me.pos) && S.phase === 'live') || (me.team === 'CT' && b?.state === 'planted' && me.pos.distanceTo(b.pos) < 1.8));
  $('t-use').hidden = !useCtx;
  if (useCtx && !isTouch) setT('hud-hint', me.hasBomb ? 'Drž E pro položení Zlatého vejce' : 'Drž E pro zneškodnění');
  else setT('hud-hint', '');
  // zaměřovač
  const moving = Math.hypot(me.vel.x, me.vel.z);
  const gap = 4 + (def ? (def.spread + def.moveSpread * clamp(moving / 6 - 0.15, 0, 1)) * 300 + me.spray * 1.2 : 2);
  $('crosshair').style.setProperty('--gap', `${Math.min(40, gap).toFixed(1)}px`);
  $('crosshair').hidden = !me.alive || (me.scope && def?.cat === 'sniper') || (def?.cat === 'sniper' && !me.scope && false);
  $('crosshair').style.setProperty('--cc', PROFILE.settings.crosshair || '#7dff5a');
  $('t-scope').hidden = !def?.scope;
  S.hurtT = Math.max(0, (S.hurtT || 0) - dt * 1.5);
  $('vignette').style.opacity = String(clamp(S.hurtT + (me.alive && me.hp < 25 ? 0.25 : 0), 0, 0.9));
  drawMinimap();
  // killfeed
  const now = S.t;
  if (S.killfeed.length && S.killfeed[0].t < now - 6) {
    S.killfeed.shift();
    renderKillfeed();
  }
}

function KNIFE_NAME(f) {
  const s = knifeSkinOf(f);
  return s ? ITEMS[s.def].name : 'Nůž';
}

function addKillfeed(a, v, weapon, hs) {
  S.killfeed.push({ a: a ? { n: a.name, t: a.team, me: a === S.me } : null, v: { n: v.name, t: v.team, me: v === S.me }, weapon, hs, t: S.t });
  if (S.killfeed.length > 5) S.killfeed.shift();
  renderKillfeed();
}
function renderKillfeed() {
  $('killfeed').innerHTML = S.killfeed
    .map(
      (k) =>
        `<div class="kf${k.a?.me || k.v.me ? ' mine' : ''}">${k.a ? `<span class="${k.a.t.toLowerCase()}">${k.a.n}</span>` : ''} <i>${k.weapon}${k.hs ? ' 🎯' : ''}</i> <span class="${k.v.t.toLowerCase()}">${k.v.n}</span></div>`
    )
    .join('');
}

let hitTimer = 0;
function hitmarker(head) {
  const h = $('hitmarker');
  h.classList.add('on');
  h.classList.toggle('head', head);
  clearTimeout(hitTimer);
  hitTimer = setTimeout(() => h.classList.remove('on', 'head'), 120);
}

function showDamageDir(from) {
  const me = S.me;
  const ang = Math.atan2(-(from.x - me.pos.x), -(from.z - me.pos.z)) - me.yaw;
  const el = $('dmgdir');
  el.style.transform = `translate(-50%,-50%) rotate(${-ang}rad)`;
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
}

let centerTimer = 0;
function centerMsg(title, sub = '', cls = '') {
  const el = $('center-msg');
  el.className = 'center-msg show ' + cls;
  el.innerHTML = `${title}${sub ? `<small>${sub}</small>` : ''}`;
  clearTimeout(centerTimer);
  centerTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

export function toast(html) {
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = html;
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => el.remove(), 3200);
}

function drawMinimap() {
  const c = $('minimap');
  const ctx = c.getContext('2d');
  const W = map.W;
  const H = map.H;
  const s = c.width / Math.max(W, H);
  if (!S.mmBg || S.mmBg.map !== map.id) {
    const bg = document.createElement('canvas');
    bg.width = c.width;
    bg.height = c.height;
    const b = bg.getContext('2d');
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        const ch = map.charAt(i, j);
        const h = map.hAt(i, j);
        b.fillStyle = h >= 4 ? 'rgba(20,22,28,0.85)' : h > 0 ? 'rgba(120,100,70,0.9)' : ch === 'A' || ch === 'B' ? 'rgba(200,70,50,0.55)' : 'rgba(200,200,190,0.45)';
        b.fillRect(i * s, j * s, s + 0.5, s + 0.5);
      }
    b.fillStyle = '#fff';
    b.font = `bold ${Math.round(s * 2.4)}px sans-serif`;
    b.textAlign = 'center';
    b.textBaseline = 'middle';
    for (const k of ['A', 'B']) {
      const p = map.siteCenter[k];
      b.fillText(k, (p.x / CELL + W / 2) * s, (p.z / CELL + H / 2) * s);
    }
    S.mmBg = { map: map.id, canvas: bg };
  }
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.drawImage(S.mmBg.canvas, 0, 0);
  const toMM = (p) => [(p.x / CELL + W / 2) * s, (p.z / CELL + H / 2) * s];
  for (const f of S.fighters) {
    if (!f.alive) continue;
    const mine = f.team === S.me.team;
    if (!mine) {
      // nepřátelé jen když je vidíme
      if (!S.fighters.some((m) => m.alive && m.team === S.me.team && canSeeCached(m, f))) continue;
    }
    const [x, y] = toMM(f.pos);
    ctx.fillStyle = mine ? (f === S.me ? '#ffffff' : TEAM_COLOR[f.team]) : '#ff3b3b';
    ctx.beginPath();
    ctx.arc(x, y, f === S.me ? 4 : 3.2, 0, Math.PI * 2);
    ctx.fill();
    if (f === S.me) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - Math.sin(f.yaw) * 10, y - Math.cos(f.yaw) * 10);
      ctx.stroke();
    }
  }
  const b = S.bomb;
  if (b && b.state !== 'exploded' && (S.me.team === 'T' || b.state === 'planted')) {
    const [x, y] = toMM(b.pos);
    ctx.fillStyle = b.state === 'planted' ? (Math.floor(S.t * 4) % 2 ? '#ff3b3b' : '#ffcf2e') : '#ffcf2e';
    ctx.fillRect(x - 3, y - 3, 6, 6);
  }
}
const seeCache = new Map();
function canSeeCached(a, b) {
  const key = a.name + '>' + b.name;
  const c = seeCache.get(key);
  if (c && S.t - c.t < 0.3) return c.v;
  const v = !!canSee(a, b) && Math.abs(angDiff(Math.atan2(-(b.pos.x - a.pos.x), -(b.pos.z - a.pos.z)), a.yaw)) < 1.2;
  seeCache.set(key, { v, t: S.t });
  return v;
}

/* ================= menu nákupu a skóre ================= */

let buyCat = 'pistol';
export function toggleBuy() {
  if (!S.active || !S.me.alive) return;
  if (!$('buymenu').hidden) return closeBuy();
  if (!inBuyZone(S.me)) {
    toast('Nakupovat můžeš jen na začátku kola u spawnu.');
    return;
  }
  $('buymenu').hidden = false;
  if (document.pointerLockElement) document.exitPointerLock?.();
  renderBuy();
}
function closeBuy() {
  $('buymenu').hidden = true;
  if (S.active && !S.paused) lockPointer();
}

function renderBuy() {
  const me = S.me;
  const cats = ['pistol', 'smg', 'rifle', 'sniper', 'shotgun', 'heavy', 'gear'];
  $('buy-money').textContent = cfg.mode === 'dm' ? 'Deathmatch – vše zdarma' : `$${me.money}`;
  $('buy-cats').innerHTML = cats.map((c) => `<button class="bcat${c === buyCat ? ' on' : ''}" data-c="${c}">${c === 'gear' ? 'Výbava' : CAT_NAMES[c]}</button>`).join('');
  let items = [];
  if (buyCat === 'gear') {
    items = [
      { id: 'kevlar', name: 'Vesta', price: 650 },
      { id: 'helmet', name: 'Vesta + helma', price: me.armor >= 100 ? 350 : 1000 },
      { id: 'he', name: GRENADES.he.name, price: 300 },
      { id: 'flash', name: GRENADES.flash.name, price: 200 },
      { id: 'smoke', name: GRENADES.smoke.name, price: 300 },
    ];
    if (me.team === 'CT') items.push({ id: 'kit', name: 'Zneškodňovací sada', price: 400 });
  } else {
    items = WEAPONS.filter((w) => w.cat === buyCat && (w.side === 'both' || w.side === me.team)).map((w) => ({ id: w.id, name: w.name, price: w.price, w }));
  }
  $('buy-items').innerHTML = items
    .map((it) => {
      const p = priceOf(me, it.price);
      const owned = it.w && me.slots[it.w.slot]?.def.id === it.id;
      const skin = it.w ? equipped(it.id) : null;
      return `<button class="bitem${me.money < p ? ' poor' : ''}${owned ? ' owned' : ''}" data-id="${it.id}">
        <b>${it.name}</b>
        ${it.w ? `<small>${it.w.dmg}${it.w.pellets > 1 ? '×' + it.w.pellets : ''} dmg • ${it.w.mag} nábojů${it.w.auto ? ' • auto' : ''}</small>` : ''}
        ${skin ? `<small class="skin">🎨 ${instName(skin).split('|')[1] || ''}</small>` : ''}
        <span>${cfg.mode === 'dm' ? 'zdarma' : '$' + p}</span></button>`;
    })
    .join('');
  for (const b of $('buy-cats').children)
    b.onclick = () => {
      buyCat = b.dataset.c;
      renderBuy();
    };
  for (const b of $('buy-items').children)
    b.onclick = () => {
      if (buy(me, b.dataset.id)) {
        sfx.buy();
        renderBuy();
      } else sfx.empty();
    };
}

export function toggleScoreboard() {
  const el = $('scoreboard');
  el.hidden = !el.hidden;
  if (!el.hidden) renderScoreboard();
}
function renderScoreboard() {
  const rows = (team) =>
    S.fighters
      .filter((f) => f.team === team)
      .sort((a, b) => b.kills - a.kills)
      .map(
        (f) =>
          `<tr class="${f === S.me ? 'me' : ''}${f.alive ? '' : ' dead'}"><td>${f.name}${f.hasBomb && f.team === S.me.team ? ' 💣' : ''}</td><td>${f.kills}</td><td>${f.deaths}</td><td>${f.assists}</td><td>${f.kills ? Math.round((f.hs / f.kills) * 100) : 0}%</td><td>${f.mvps ? '★' + f.mvps : ''}</td><td>${f.team === S.me.team && cfg.mode !== 'dm' ? '$' + f.money : ''}</td></tr>`
      )
      .join('');
  const sc = cfg.mode === 'dm' ? S.dmKills : S.score;
  $('sb-body').innerHTML = `
    <h3 class="t">${TEAM_NAME.T} <b>${sc.T}</b></h3><table><tr><th>Hráč</th><th>Z</th><th>S</th><th>A</th><th>HS</th><th>MVP</th><th>$</th></tr>${rows('T')}</table>
    <h3 class="ct">${TEAM_NAME.CT} <b>${sc.CT}</b></h3><table><tr><th>Hráč</th><th>Z</th><th>S</th><th>A</th><th>HS</th><th>MVP</th><th>$</th></tr>${rows('CT')}</table>`;
}

/* ================= hlavní smyčka zápasu ================= */

export function updateMatch(dt) {
  if (!S.active || S.paused) return;
  S.t += dt;
  if (S.phase !== 'over') updateRound(dt);
  updateMe(dt);
  for (const f of S.fighters) if (f.isBot && f.alive) updateBot(f, dt);
  for (const f of S.fighters) updateFighterCommon(f, dt);
  updateBomb(dt);
  updateNades(dt);
  updateDrops(dt);
  updateCows(dt);
  updateParticles(dt);
  for (let i = S.tracers.length - 1; i >= 0; i--) {
    const t = S.tracers[i];
    t.life -= dt;
    t.line.material.opacity = Math.max(0, t.life * 8);
    if (t.life <= 0) {
      env.scene.remove(t.line);
      t.line.geometry.dispose();
      S.tracers.splice(i, 1);
    }
  }
  for (const f of S.fighters) {
    if (f.flashT > 0 && f.gunObj) f.gunObj.visible = true;
  }
  updateCamera(dt);
  updateViewModel(dt);
  updateHud(dt);
}

/** Menu pozadí – jen krávy a efekty. */
export function updateIdle(dt) {
  S.t += dt;
  if (map) updateCows(dt);
  updateParticles(dt);
}

export function setPaused(p) {
  S.paused = p;
  if (p) {
    IN.fire = false;
    IN.keys.clear();
    IN.use = false;
  }
}
