// Low-poly modely skládané z primitiv – žádné externí soubory.
import * as THREE from './vendor/three.module.min.js';

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts }));
  return matCache.get(key);
}
export function basic(color, opts = {}) {
  const key = 'b' + color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshBasicMaterial({ color, ...opts }));
  return matCache.get(key);
}

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 12, 9),
  sphereLo: new THREE.SphereGeometry(1, 8, 6),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  cylLo: new THREE.CylinderGeometry(1, 1, 1, 6),
  cone: new THREE.ConeGeometry(1, 1, 8),
  halfSphere: new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
};
export const GEO = G;

export function part(geo, material, sx, sy, sz, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  return m;
}

/* ================= kráva ================= */

export function makeCow() {
  const g = new THREE.Group();
  const white = mat('#ffffff');
  const black = mat('#262626');
  const pink = mat('#f7a8b8');
  const body = new THREE.Group();
  g.add(body);

  body.add(part(G.box, white, 1.0, 0.72, 1.6, 0, 1.02, 0));
  const spots = [
    [0.505, 1.1, 0.3, 0.02, 0.4, 0.5],
    [-0.505, 0.95, -0.35, 0.02, 0.35, 0.45],
    [0.505, 0.9, -0.5, 0.02, 0.3, 0.3],
    [-0.505, 1.15, 0.45, 0.02, 0.3, 0.35],
    [0.1, 1.385, -0.2, 0.45, 0.02, 0.5],
    [-0.2, 1.385, 0.5, 0.3, 0.02, 0.3],
  ];
  for (const [x, y, z, sx, sy, sz] of spots) body.add(part(G.box, black, sx, sy, sz, x, y, z, false));

  const legs = [];
  for (const [x, z] of [[-0.32, 0.6], [0.32, 0.6], [-0.32, -0.6], [0.32, -0.6]]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.7, z);
    leg.add(part(G.cylLo, white, 0.1, 0.62, 0.1, 0, -0.31, 0));
    leg.add(part(G.cylLo, mat('#4a3328'), 0.11, 0.1, 0.11, 0, -0.65, 0));
    g.add(leg);
    legs.push(leg);
  }
  body.add(part(G.sphereLo, pink, 0.2, 0.14, 0.22, 0, 0.64, -0.35));

  const head = new THREE.Group();
  head.position.set(0, 1.38, 0.95);
  head.add(part(G.box, white, 0.55, 0.5, 0.55));
  head.add(part(G.box, black, 0.3, 0.2, 0.02, -0.08, 0.12, 0.28, false));
  head.add(part(G.box, pink, 0.5, 0.28, 0.22, 0, -0.14, 0.33));
  for (const s of [-1, 1]) {
    head.add(part(G.sphereLo, black, 0.035, 0.05, 0.02, s * 0.1, -0.12, 0.45, false));
    head.add(part(G.sphereLo, mat('#ffffff'), 0.08, 0.08, 0.05, s * 0.17, 0.1, 0.27, false));
    head.add(part(G.sphereLo, black, 0.045, 0.045, 0.03, s * 0.17, 0.1, 0.31, false));
    const horn = part(G.cone, mat('#f3e6c4'), 0.06, 0.22, 0.06, s * 0.2, 0.33, -0.05);
    horn.rotation.z = -s * 0.4;
    head.add(horn);
    const ear = part(G.box, white, 0.22, 0.08, 0.14, s * 0.36, 0.1, -0.08);
    ear.rotation.z = s * 0.3;
    head.add(ear);
  }
  g.add(head);
  // obojek a zvonec
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 6, 14), mat('#e0453a'));
  collar.position.set(0, 1.12, 0.78);
  collar.rotation.x = Math.PI / 2.4;
  g.add(collar);
  g.add(part(G.sphereLo, mat('#ffcf3a'), 0.09, 0.1, 0.09, 0, 0.88, 0.95));
  // ocas
  const tail = new THREE.Group();
  tail.position.set(0, 1.3, -0.8);
  tail.add(part(G.cylLo, white, 0.03, 0.6, 0.03, 0, -0.3, -0.05));
  tail.add(part(G.sphereLo, black, 0.07, 0.11, 0.07, 0, -0.62, -0.05));
  tail.rotation.x = 0.25;
  g.add(tail);

  g.userData = { legs, head, tail, body };
  return g;
}

export function animateCow(cow, t, walking) {
  const { legs, head, tail } = cow.userData;
  const sw = walking ? Math.sin(t * 8) * 0.45 : 0;
  legs[0].rotation.x = sw;
  legs[3].rotation.x = sw;
  legs[1].rotation.x = -sw;
  legs[2].rotation.x = -sw;
  head.rotation.x = Math.sin(t * 1.3) * 0.08 + (walking ? 0 : 0.15);
  tail.rotation.z = Math.sin(t * 3) * 0.4;
}

/* ================= parťačky v kaskách ================= */

export function makeGirl({ hair = '#f2c14e', shirt = '#ff7aa8', helmet = '#5b7a3a', skin = '#f5c6a5' } = {}) {
  const g = new THREE.Group();
  const jeans = mat('#3f5fa8');
  const boots = mat('#4a3328');
  const skinM = mat(skin);
  const shirtM = mat(shirt);
  const hairM = mat(hair);
  const helmM = mat(helmet);

  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.1, 0.82, 0);
    leg.add(part(G.cylLo, jeans, 0.085, 0.72, 0.085, 0, -0.36, 0));
    leg.add(part(G.box, boots, 0.13, 0.12, 0.22, 0, -0.76, 0.04));
    g.add(leg);
    legs.push(leg);
  }
  g.add(part(G.box, jeans, 0.36, 0.14, 0.22, 0, 0.84, 0));
  g.add(part(G.box, shirtM, 0.4, 0.5, 0.24, 0, 1.15, 0));
  // vesta s kapsami
  g.add(part(G.box, mat('#6b7f45'), 0.42, 0.3, 0.26, 0, 1.2, 0));

  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.26, 1.36, 0);
    arm.add(part(G.cylLo, shirtM, 0.06, 0.3, 0.06, 0, -0.15, 0));
    arm.add(part(G.cylLo, skinM, 0.05, 0.28, 0.05, 0, -0.42, 0));
    g.add(arm);
    arms.push(arm);
  }
  // zbraň v rukou
  const gun = new THREE.Group();
  gun.position.set(0.08, 1.12, 0.38);
  gun.add(part(G.box, mat('#ffcf3a'), 0.07, 0.09, 0.32));
  gun.add(part(G.cylLo, mat('#ffffff'), 0.035, 0.18, 0.035, 0, 0.0, 0.22));
  gun.children[1].rotation.x = Math.PI / 2;
  g.add(gun);

  const head = new THREE.Group();
  head.position.set(0, 1.56, 0);
  head.add(part(G.sphere, skinM, 0.15, 0.16, 0.15));
  // vlasy + culík
  head.add(part(G.sphere, hairM, 0.155, 0.12, 0.16, 0, 0.03, -0.03));
  const pony = part(G.cone, hairM, 0.07, 0.32, 0.07, 0, -0.08, -0.2);
  pony.rotation.x = -2.6;
  head.add(pony);
  for (const s of [-1, 1]) {
    head.add(part(G.sphereLo, mat('#2a1f1a'), 0.022, 0.03, 0.02, s * 0.055, 0.0, 0.135, false));
    head.add(part(G.sphereLo, mat('#ff9aa8'), 0.03, 0.018, 0.01, s * 0.08, -0.05, 0.13, false));
  }
  head.add(part(G.box, mat('#c0485a'), 0.06, 0.012, 0.01, 0, -0.075, 0.145, false));
  // kaska
  head.add(part(G.halfSphere, helmM, 0.185, 0.17, 0.195, 0, 0.03, 0));
  head.add(part(G.cyl, helmM, 0.205, 0.02, 0.215, 0, 0.035, 0.01));
  head.add(part(G.box, mat('#2f3d20'), 0.2, 0.025, 0.05, 0, 0.08, 0.16, false));
  g.add(head);

  g.userData = { legs, arms, head, gun };
  return g;
}

export function animateGirl(girl, t, walking, aiming, down) {
  const { legs, arms, head } = girl.userData;
  const sw = walking ? Math.sin(t * 9) * 0.6 : 0;
  legs[0].rotation.x = sw;
  legs[1].rotation.x = -sw;
  const aim = aiming ? -1.35 : -0.9;
  arms[0].rotation.x = aim;
  arms[1].rotation.x = aim;
  arms[0].rotation.z = -0.35;
  arms[1].rotation.z = 0.35;
  head.rotation.y = Math.sin(t * 0.7) * (aiming ? 0.05 : 0.3);
  girl.rotation.x = down ? -Math.PI / 2 + 0.15 : 0;
  girl.position.y = down ? 0.18 : 0;
}

/* ================= ufoni ================= */

export const ALIEN_TYPES = {
  grunt: { color: '#6ad15a', belly: '#b7f0a0', scale: 1, hp: 3, speed: 2.6, score: 100, shoots: true, dmgCow: 7 },
  fast: { color: '#a96bff', belly: '#dcc4ff', scale: 0.72, hp: 2, speed: 5.2, score: 150, shoots: false, dmgCow: 6 },
  tank: { color: '#ff8a3d', belly: '#ffd2a8', scale: 1.6, hp: 14, speed: 1.6, score: 400, shoots: true, dmgCow: 14 },
};

export function makeAlien(type) {
  const T = ALIEN_TYPES[type];
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(T.scale);
  g.add(inner);
  const bodyMat = new THREE.MeshLambertMaterial({ color: T.color, flatShading: true, emissive: '#000000' });
  inner.add(part(G.sphere, bodyMat, 0.45, 0.52, 0.42, 0, 0.68, 0));
  inner.add(part(G.sphere, mat(T.belly), 0.32, 0.36, 0.1, 0, 0.6, 0.35, false));
  for (const s of [-1, 1]) {
    inner.add(part(G.sphere, mat('#ffffff'), 0.14, 0.17, 0.08, s * 0.16, 0.9, 0.36, false));
    inner.add(part(G.sphereLo, mat('#111111'), 0.07, 0.09, 0.04, s * 0.15, 0.89, 0.43, false));
    inner.add(part(G.sphereLo, bodyMat, 0.12, 0.08, 0.16, s * 0.16, 0.12, 0.05));
    const ant = part(G.cylLo, bodyMat, 0.02, 0.32, 0.02, s * 0.14, 1.28, 0, false);
    ant.rotation.z = -s * 0.35;
    inner.add(ant);
    inner.add(part(G.sphereLo, basic('#fff36b'), 0.06, 0.06, 0.06, s * 0.2, 1.43, 0, false));
  }
  inner.add(part(G.box, mat('#3a1030'), 0.18, 0.04, 0.03, 0, 0.66, 0.42, false));
  // ruce s blasterem
  if (T.shoots) inner.add(part(G.box, mat('#9aa4b5'), 0.08, 0.08, 0.34, 0.36, 0.55, 0.25));
  g.userData = { inner, bodyMat, type, T };
  return g;
}

/* ================= UFO ================= */

export function makeUfo() {
  const g = new THREE.Group();
  g.add(part(G.sphere, mat('#b8c2d4', { emissive: '#3a4250' }), 3.2, 0.55, 3.2, 0, 0, 0));
  g.add(part(G.cyl, mat('#7c879c', { emissive: '#7dff5a', emissiveIntensity: 0.35 }), 2.0, 0.3, 2.0, 0, -0.35, 0));
  const dome = part(G.halfSphere, new THREE.MeshLambertMaterial({ color: '#8ff7ff', transparent: true, opacity: 0.65 }), 1.4, 1.1, 1.4, 0, 0.3, 0);
  g.add(dome);
  // pilot
  const pilot = makeAlien('grunt');
  pilot.scale.setScalar(0.9);
  pilot.position.y = -0.2;
  g.add(pilot);
  const lights = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const l = part(G.sphereLo, basic(i % 2 ? '#ff5a8a' : '#fff36b'), 0.16, 0.16, 0.16, Math.cos(a) * 2.8, -0.05, Math.sin(a) * 2.8, false);
    g.add(l);
    lights.push(l);
  }
  const beamMat = new THREE.MeshBasicMaterial({ color: '#9dff8a', transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 2.6, 1, 16, 1, true), beamMat);
  beam.visible = false;
  g.add(beam);
  g.userData = { lights, beam, beamMat, pilot };
  return g;
}

/* ================= zbraně (pohled z první osoby) ================= */

export function makeViewGun(id) {
  const g = new THREE.Group();
  const muzzle = new THREE.Object3D();
  if (id === 'egg') {
    g.add(part(G.box, mat('#ffcf3a'), 0.09, 0.12, 0.34, 0, 0, 0, false));
    const barrel = part(G.cyl, mat('#ffffff'), 0.04, 0.22, 0.04, 0, 0.02, -0.26, false);
    barrel.rotation.x = Math.PI / 2;
    g.add(barrel);
    g.add(part(G.sphere, mat('#fff8ec'), 0.05, 0.065, 0.05, 0, 0.09, -0.02, false));
    const grip = part(G.box, mat('#8f5a26'), 0.07, 0.16, 0.08, 0, -0.12, 0.1, false);
    grip.rotation.x = 0.25;
    g.add(grip);
    g.add(part(G.box, mat('#ff5a5f'), 0.095, 0.03, 0.12, 0, 0.065, 0.08, false));
    muzzle.position.set(0, 0.02, -0.38);
  } else if (id === 'milk') {
    g.add(part(G.box, mat('#ffffff'), 0.13, 0.13, 0.36, 0, 0, 0, false));
    g.add(part(G.box, mat('#262626'), 0.135, 0.06, 0.12, 0, 0.03, 0.05, false));
    g.add(part(G.box, mat('#262626'), 0.135, 0.05, 0.08, 0, -0.03, -0.1, false));
    const can = part(G.cyl, mat('#bde7ff'), 0.08, 0.16, 0.08, 0, -0.12, 0.02, false);
    g.add(can);
    const barrels = new THREE.Group();
    barrels.position.set(0, 0, -0.25);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const b = part(G.cylLo, mat('#9aa4b5'), 0.022, 0.32, 0.022, Math.cos(a) * 0.035, Math.sin(a) * 0.035, -0.08, false);
      b.rotation.x = Math.PI / 2;
      barrels.add(b);
    }
    g.add(barrels);
    g.userData.spin = barrels;
    muzzle.position.set(0, 0, -0.5);
  } else {
    const gold = mat('#ffcf2e', { emissive: '#4a3300' });
    for (const s of [-1, 1]) {
      const b = part(G.cyl, gold, 0.035, 0.5, 0.035, s * 0.037, 0.02, -0.25, false);
      b.rotation.x = Math.PI / 2;
      g.add(b);
    }
    g.add(part(G.box, mat('#8f5a26'), 0.1, 0.1, 0.24, 0, -0.02, 0.1, false));
    const stock = part(G.box, mat('#6b4423'), 0.08, 0.14, 0.18, 0, -0.08, 0.26, false);
    stock.rotation.x = 0.3;
    g.add(stock);
    muzzle.position.set(0, 0.02, -0.52);
  }
  g.add(muzzle);
  const flash = new THREE.Mesh(G.sphereLo, basic(id === 'milk' ? '#ffffff' : '#ffe27a', { transparent: true, opacity: 0.9 }));
  flash.scale.setScalar(0.07);
  flash.position.copy(muzzle.position);
  flash.visible = false;
  g.add(flash);
  g.userData.muzzle = muzzle;
  g.userData.flash = flash;
  return g;
}

/* ================= projektily a sběratelné věci ================= */

export const PROJ_GEO = {
  egg: (() => {
    const geo = new THREE.SphereGeometry(0.07, 8, 6);
    geo.scale(1, 1, 1.35);
    return geo;
  })(),
  drop: new THREE.SphereGeometry(0.045, 6, 4),
  pellet: new THREE.SphereGeometry(0.045, 6, 4),
  plasma: new THREE.SphereGeometry(0.16, 8, 6),
};
export const PROJ_MAT = {
  egg: mat('#fff8ec'),
  drop: basic('#ffffff'),
  pellet: basic('#ffd23f'),
  plasma: basic('#7dff5a'),
  ally: mat('#ffe0b8'),
};

export function makePickup(kind) {
  const g = new THREE.Group();
  const egg = new THREE.Mesh(PROJ_GEO.egg, kind === 'ammo' ? mat('#ffcf2e', { emissive: '#664400' }) : mat('#ffffff', { emissive: '#333333' }));
  egg.scale.setScalar(3.2);
  egg.rotation.x = Math.PI / 2;
  egg.castShadow = true;
  g.add(egg);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 6, 20), basic(kind === 'ammo' ? '#ffd23f' : '#ff5a5f'));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.25;
  g.add(ring);
  g.userData = { egg, ring };
  return g;
}
