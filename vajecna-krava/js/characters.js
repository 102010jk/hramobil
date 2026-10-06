// Postavy: vojáci (agenti) a krávy. Skládané z primitiv s PBR materiály.
import * as THREE from './vendor/three.module.min.js';
import { AGENTS, finishTexture } from './skins.js';

const geo = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cap: new THREE.CapsuleGeometry(1, 1, 4, 10),
  sph: new THREE.SphereGeometry(1, 18, 12),
  half: new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  cone: new THREE.ConeGeometry(1, 1, 12),
};

const matCache = new Map();
function std(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o }));
  return matCache.get(key);
}

function mesh(g, m, sx, sy, sz, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m);
  o.scale.set(sx, sy, sz);
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
}

function limb(m, len, r) {
  // kapsle s počátkem nahoře, visí dolů
  const grp = new THREE.Group();
  const c = mesh(geo.cap, m, r, len / 2 - r * 0.2, r, 0, -len / 2, 0);
  grp.add(c);
  return grp;
}

/** Voják/agent. Počátek = mezi chodidly. */
export function buildSoldier(agentId, teamColor) {
  const a = AGENTS[agentId] || AGENTS.t_default;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const uni = a.uniform === 'cow' ? new THREE.MeshStandardMaterial({ map: finishTexture('strakata', 3, 0.1), roughness: 0.9 }) : std(a.uniform);
  const vest = std(a.vest, { roughness: 0.7 });
  const skin = std(a.skin, { roughness: 0.6 });
  const boots = std('#2a2420', { roughness: 0.6 });
  const gloves = std('#26282c', { roughness: 0.7 });
  const headM = std(a.headColor, { roughness: 0.5, metalness: a.head === 'robot' || a.head === 'horns' ? 0.6 : 0.05 });

  // nohy
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.11, 0.92, 0);
    const thigh = limb(uni, 0.46, 0.085);
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.45;
    thigh.add(knee);
    knee.add(limb(uni, 0.44, 0.07));
    knee.add(mesh(geo.box, std('#1f2226'), 0.15, 0.1, 0.12, 0, -0.05, 0.03)); // chránič kolena
    const boot = mesh(geo.box, boots, 0.13, 0.1, 0.27, 0, -0.44, 0.05);
    knee.add(boot);
    body.add(hip);
    legs.push({ hip, knee });
  }
  // pánev a trup
  const hips = new THREE.Group();
  hips.position.y = 0.95;
  body.add(hips);
  hips.add(mesh(geo.box, uni, 0.34, 0.16, 0.22, 0, 0, 0));
  const torso = new THREE.Group();
  torso.position.y = 0.06;
  hips.add(torso);
  torso.add(mesh(geo.cap, uni, 0.17, 0.2, 0.12, 0, 0.27, 0));
  torso.add(mesh(geo.box, vest, 0.38, 0.4, 0.27, 0, 0.3, 0));
  for (const x of [-0.11, 0, 0.11]) torso.add(mesh(geo.box, std('#3a3a30'), 0.08, 0.1, 0.04, x, 0.2, 0.15)); // sumky
  if (teamColor) torso.add(mesh(geo.box, std(teamColor, { emissive: teamColor, emissiveIntensity: 0.25 }), 0.1, 0.06, 0.01, -0.12, 0.42, 0.14)); // týmová nášivka
  if (a.accent) torso.add(mesh(geo.box, std(a.accent, { emissive: a.accent, emissiveIntensity: 0.4 }), 0.39, 0.03, 0.28, 0, 0.35, 0));

  // hlava
  const neck = new THREE.Group();
  neck.position.y = 0.55;
  torso.add(neck);
  neck.add(mesh(geo.cyl, skin, 0.06, 0.1, 0.06, 0, 0.03, 0));
  const head = new THREE.Group();
  head.position.y = 0.17;
  neck.add(head);
  head.add(mesh(geo.sph, a.head === 'balaclava' || a.head === 'robot' ? headM : skin, 0.11, 0.13, 0.12));
  if (a.head !== 'robot' && a.head !== 'balaclava') {
    head.add(mesh(geo.sph, std('#1a1a1a'), 0.015, 0.015, 0.01, -0.04, 0.02, 0.11));
    head.add(mesh(geo.sph, std('#1a1a1a'), 0.015, 0.015, 0.01, 0.04, 0.02, 0.11));
    head.add(mesh(geo.box, skin, 0.03, 0.04, 0.04, 0, -0.02, 0.12));
  }
  if (a.head === 'balaclava') {
    head.add(mesh(geo.box, skin, 0.15, 0.04, 0.02, 0, 0.02, 0.11));
    head.add(mesh(geo.sph, std('#111'), 0.016, 0.016, 0.01, -0.04, 0.02, 0.122));
    head.add(mesh(geo.sph, std('#111'), 0.016, 0.016, 0.01, 0.04, 0.02, 0.122));
  }
  if (a.hair) {
    head.add(mesh(geo.sph, std(a.hair), 0.115, 0.1, 0.125, 0, 0.04, -0.015));
    if (a.ponytail) {
      const pt = mesh(geo.cap, std(a.hair), 0.035, 0.08, 0.035, 0, -0.06, -0.14);
      pt.rotation.x = 0.4;
      head.add(pt);
    }
  }
  if (a.head === 'helmet' || a.head === 'horns') {
    head.add(mesh(geo.half, headM, 0.135, 0.12, 0.145, 0, 0.03, 0));
    head.add(mesh(geo.box, std('#111', { metalness: 0.5 }), 0.18, 0.035, 0.03, 0, 0.06, 0.125));
    if (a.head === 'horns' || a === AGENTS.ct_default)
      for (const s of [-1, 1]) {
        const h = mesh(geo.cone, std('#f3e6c4', { roughness: 0.5 }), 0.025, 0.12, 0.025, s * 0.11, 0.14, 0);
        h.rotation.z = -s * 0.6;
        head.add(h);
      }
  } else if (a.head === 'cap') {
    head.add(mesh(geo.half, headM, 0.12, 0.08, 0.13, 0, 0.05, 0));
    head.add(mesh(geo.box, headM, 0.13, 0.01, 0.08, 0, 0.055, 0.13));
  } else if (a.head === 'hat') {
    head.add(mesh(geo.cyl, headM, 0.21, 0.015, 0.21, 0, 0.08, 0));
    head.add(mesh(geo.cyl, headM, 0.1, 0.11, 0.1, 0, 0.14, 0));
  } else if (a.head === 'astro') {
    head.add(mesh(geo.sph, new THREE.MeshStandardMaterial({ color: a.headColor, transparent: true, opacity: 0.35, metalness: 0.9, roughness: 0.05 }), 0.17, 0.18, 0.17, 0, 0.0, 0));
  } else if (a.head === 'chef') {
    head.add(mesh(geo.cyl, headM, 0.11, 0.18, 0.11, 0, 0.15, 0));
    head.add(mesh(geo.sph, headM, 0.13, 0.08, 0.13, 0, 0.25, 0));
  } else if (a.head === 'robot') {
    head.add(mesh(geo.box, std('#ff3a3a', { emissive: '#ff3a3a', emissiveIntensity: 1 }), 0.16, 0.025, 0.02, 0, 0.02, 0.115));
    head.add(mesh(geo.cyl, headM, 0.006, 0.12, 0.006, 0.06, 0.16, 0));
  }

  // ruce
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(s * 0.23, 0.46, 0);
    torso.add(sh);
    const upper = limb(uni, 0.3, 0.06);
    sh.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.29;
    upper.add(elbow);
    elbow.add(limb(uni, 0.27, 0.05));
    const hand = new THREE.Group();
    hand.position.y = -0.28;
    elbow.add(hand);
    hand.add(mesh(geo.box, gloves, 0.07, 0.09, 0.05, 0, -0.03, 0));
    arms.push({ sh, elbow, hand });
  }

  const gunMount = new THREE.Group();
  arms[1].hand.add(gunMount);
  gunMount.position.set(0, -0.05, 0);
  gunMount.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)));

  root.userData = { legs, arms, torso, head, hips, body, gunMount };
  return root;
}

/**
 * Animace vojáka.
 * s: { walk (fáze), speed 0..1, crouch 0..1, pitch, dead (0..1 pád) }
 */
export function animateSoldier(m, s) {
  const u = m.userData;
  const sw = Math.sin(s.walk) * 0.7 * s.speed;
  const crouch = s.crouch || 0;
  u.body.position.y = -crouch * 0.38;
  u.legs.forEach((l, i) => {
    const k = i ? -sw : sw;
    l.hip.rotation.x = k - crouch * 1.1;
    l.knee.rotation.x = Math.max(0, -k) * 1.1 + crouch * 2.0;
  });
  u.hips.position.y = 0.95;
  u.torso.rotation.x = crouch * 0.25;
  // zbraň v rukou – míření
  const p = s.pitch || 0;
  const [l, r] = u.arms;
  r.sh.rotation.set(-1.25 - p, 0, -0.1);
  r.elbow.rotation.set(-0.35, 0, 0);
  l.sh.rotation.set(-1.35 - p, 0, 0.55);
  l.elbow.rotation.set(-0.5, 0, 0);
  u.head.rotation.x = -p * 0.6 - crouch * 0.2;
  if (s.dead > 0) {
    m.rotation.x = -Math.min(1, s.dead) * (Math.PI / 2 - 0.1);
    m.position.y = Math.min(1, s.dead) * 0.15;
  } else {
    m.rotation.x = 0;
  }
}

/* ================= kráva ================= */

export function buildCow(finish = 'strakata', seed = 1, wear = 0) {
  const g = new THREE.Group();
  const tex = finishTexture(finish, seed, wear * 0.3);
  const hide = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
  const pink = std('#f2a5b4', { roughness: 0.6 });
  const dark = std('#2a2420');
  const body = mesh(geo.cap, hide, 0.42, 0.75, 0.42, 0, 1.0, 0);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const legs = [];
  for (const [x, z] of [[-0.25, 0.55], [0.25, 0.55], [-0.25, -0.55], [0.25, -0.55]]) {
    const l = new THREE.Group();
    l.position.set(x, 0.8, z);
    l.add(mesh(geo.cap, hide, 0.08, 0.32, 0.08, 0, -0.38, 0));
    l.add(mesh(geo.cyl, dark, 0.085, 0.08, 0.085, 0, -0.76, 0));
    g.add(l);
    legs.push(l);
  }
  g.add(mesh(geo.sph, pink, 0.17, 0.12, 0.18, 0, 0.62, -0.3));
  const head = new THREE.Group();
  head.position.set(0, 1.3, 0.95);
  head.add(mesh(geo.box, hide, 0.36, 0.38, 0.45, 0, 0, 0.05));
  head.add(mesh(geo.box, pink, 0.38, 0.22, 0.18, 0, -0.12, 0.3));
  for (const s of [-1, 1]) {
    head.add(mesh(geo.sph, std('#111'), 0.04, 0.045, 0.03, s * 0.17, 0.06, 0.18));
    head.add(mesh(geo.sph, std('#111'), 0.025, 0.035, 0.01, s * 0.08, -0.12, 0.395));
    const horn = mesh(geo.cone, std('#efe2c0', { roughness: 0.4 }), 0.04, 0.2, 0.04, s * 0.15, 0.27, -0.05);
    horn.rotation.z = -s * 0.5;
    head.add(horn);
    const ear = mesh(geo.sph, hide, 0.12, 0.05, 0.07, s * 0.26, 0.1, -0.08);
    ear.rotation.z = s * 0.3;
    head.add(ear);
  }
  g.add(head);
  const bell = mesh(geo.sph, std('#e0b23a', { metalness: 0.9, roughness: 0.3 }), 0.07, 0.08, 0.07, 0, 0.82, 0.85);
  g.add(bell);
  const tail = new THREE.Group();
  tail.position.set(0, 1.25, -0.85);
  tail.add(mesh(geo.cyl, hide, 0.02, 0.6, 0.02, 0, -0.3, 0));
  tail.add(mesh(geo.sph, dark, 0.05, 0.09, 0.05, 0, -0.62, 0));
  tail.rotation.x = 0.2;
  g.add(tail);
  g.userData = { legs, head, tail };
  return g;
}

export function animateCow(cow, t, walking) {
  const { legs, head, tail } = cow.userData;
  const sw = walking ? Math.sin(t * 7) * 0.4 : 0;
  legs[0].rotation.x = sw;
  legs[3].rotation.x = sw;
  legs[1].rotation.x = -sw;
  legs[2].rotation.x = -sw;
  head.rotation.x = walking ? Math.sin(t * 3.5) * 0.05 : 0.35 + Math.sin(t * 1.2) * 0.1;
  tail.rotation.z = Math.sin(t * 2.5) * 0.4;
}

/* ================= ruce v pohledu z první osoby ================= */

export function buildArms(agentId, gloveFinish) {
  const a = AGENTS[agentId] || AGENTS.t_default;
  const g = new THREE.Group();
  const sleeve = a.uniform === 'cow' ? new THREE.MeshStandardMaterial({ map: finishTexture('strakata', 3, 0.1), roughness: 0.9 }) : std(a.uniform);
  const glove = gloveFinish ? new THREE.MeshStandardMaterial({ map: finishTexture(gloveFinish, 2, 0.05), roughness: 0.6 }) : std('#26282c', { roughness: 0.7 });
  const mk = (x, z, rz) => {
    const arm = new THREE.Group();
    const s = new THREE.Mesh(geo.cap, sleeve);
    s.scale.set(0.045, 0.16, 0.045);
    s.rotation.x = Math.PI / 2;
    s.position.z = 0.16;
    arm.add(s);
    const h = new THREE.Mesh(geo.box, glove);
    h.scale.set(0.06, 0.05, 0.09);
    arm.add(h);
    arm.position.set(x, -0.04, z);
    arm.rotation.z = rz;
    return arm;
  };
  const right = mk(0, 0.04, 0);
  const left = mk(-0.02, -0.18, 0.3);
  g.add(right, left);
  g.userData = { right, left };
  return g;
}
