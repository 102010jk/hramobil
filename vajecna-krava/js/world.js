// Farma: terén, budovy, kryty a kolizní tvary.
import * as THREE from './vendor/three.module.min.js';
import { mat, part, GEO } from './models.js';

export const ARENA_R = 40;

export function buildWorld(scene) {
  const colliders = [];
  const addBox = (cx, cz, w, d, h) => colliders.push({ type: 'box', minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, h });
  const addCircle = (x, z, r, h) => colliders.push({ type: 'circle', x, z, r, h });

  const sky = new THREE.Color('#8fd3ff');
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 45, 130);

  scene.add(new THREE.HemisphereLight('#dff4ff', '#4c7a2e', 1.6));
  const sun = new THREE.DirectionalLight('#fff3d6', 1.9);
  sun.position.set(25, 40, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -45;
  sc.right = 45;
  sc.top = 45;
  sc.bottom = -45;
  sc.near = 5;
  sc.far = 110;
  sun.shadow.bias = -0.0015;
  scene.add(sun);
  scene.add(sun.target);

  // tráva s barevnými odstíny
  const groundGeo = new THREE.PlaneGeometry(220, 220, 60, 60);
  groundGeo.rotateX(-Math.PI / 2);
  const colors = [];
  const pos = groundGeo.attributes.position;
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d = Math.hypot(x, z);
    const n = Math.sin(x * 0.31) * Math.cos(z * 0.27) * 0.5 + Math.sin(x * 0.07 + z * 0.11) * 0.5;
    if (d > 4.5 && d < 6) c.set('#b08a55');
    else c.setHSL(0.27 + n * 0.03, 0.55, 0.42 + n * 0.06);
    colors.push(c.r, c.g, c.b);
    if (d > ARENA_R + 8) pos.setY(i, Math.min(14, (d - ARENA_R - 8) * 0.25 + Math.sin(x * 0.2) * Math.cos(z * 0.15) * 2));
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  ground.receiveShadow = true;
  scene.add(ground);

  // stodola
  {
    const g = new THREE.Group();
    g.position.set(-17, 0, -15);
    g.rotation.y = 0.3;
    g.add(part(GEO.box, mat('#c0392b'), 10, 6, 8, 0, 3, 0));
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(4.85, 4.85, 10.4, 3, 1, false, Math.PI / 2), mat('#5b4636'));
    roof.rotation.z = Math.PI / 2;
    roof.scale.set(0.5, 1, 1);
    roof.position.y = 6 + 4.85 * 0.25;
    roof.castShadow = true;
    g.add(roof);
    for (const s of [-1, 1]) {
      g.add(part(GEO.box, mat('#ffffff'), 3.6, 4.2, 0.1, 0, 2.1, s * 4.02, false));
      const x1 = part(GEO.box, mat('#c0392b'), 0.25, 5.2, 0.12, 0, 2.1, s * 4.05, false);
      x1.rotation.z = 0.7;
      g.add(x1);
      const x2 = x1.clone();
      x2.rotation.z = -0.7;
      g.add(x2);
    }
    g.traverse((o) => {
      if (o.isMesh) o.receiveShadow = true;
    });
    scene.add(g);
    // rotovaný box -> přibližně kruhy podél delší osy
    const cos = Math.cos(0.3);
    const sin = Math.sin(0.3);
    for (let k = -1; k <= 1; k++) {
      const lx = k * 3.2;
      addCircle(-17 + lx * cos, -15 - lx * sin, 4.3, 9);
    }
  }

  // silo
  {
    const g = new THREE.Group();
    g.position.set(-27, 0, -3);
    g.add(part(GEO.cyl, mat('#c9ced6'), 2.2, 10, 2.2, 0, 5, 0));
    g.add(part(GEO.halfSphere, mat('#8a95a6'), 2.25, 1.6, 2.25, 0, 10, 0));
    for (let y = 1.5; y < 10; y += 2) g.add(part(GEO.cyl, mat('#9aa4b5'), 2.25, 0.12, 2.25, 0, y, 0, false));
    scene.add(g);
    addCircle(-27, -3, 2.3, 11);
  }

  // statek
  {
    const g = new THREE.Group();
    g.position.set(19, 0, -19);
    g.rotation.y = -0.4;
    g.add(part(GEO.box, mat('#fff1d6'), 8, 4.5, 6, 0, 2.25, 0));
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(3.85, 3.85, 8.6, 3, 1, false, Math.PI / 2), mat('#a33b2b'));
    roof.rotation.z = Math.PI / 2;
    roof.scale.set(0.55, 1, 1);
    roof.position.y = 4.5 + 3.85 * 0.275;
    roof.castShadow = true;
    g.add(roof);
    for (const x of [-2.2, 2.2]) g.add(part(GEO.box, mat('#6ec6ff'), 1.2, 1.2, 0.1, x, 2.8, 3.02, false));
    g.add(part(GEO.box, mat('#6b4423'), 1.2, 2.2, 0.1, 0, 1.1, 3.02, false));
    g.add(part(GEO.box, mat('#8a6e5a'), 0.8, 2, 0.8, 2.5, 6, -1));
    scene.add(g);
    const cos = Math.cos(-0.4);
    const sin = Math.sin(-0.4);
    for (const lx of [-2.2, 0, 2.2]) addCircle(19 + lx * cos, -19 - lx * sin, 3.4, 7);
  }

  // traktor
  {
    const g = new THREE.Group();
    g.position.set(15, 0, 13);
    g.rotation.y = 0.9;
    g.add(part(GEO.box, mat('#2f9e44'), 1.6, 1.1, 2.6, 0, 1.3, 0));
    g.add(part(GEO.box, mat('#2f9e44'), 1.4, 1.4, 1.2, 0, 2.3, -0.5));
    g.add(part(GEO.box, mat('#bde7ff'), 1.3, 0.8, 1.1, 0, 2.5, -0.5, false));
    const wheel = (x, z, r) => {
      const w = part(GEO.cyl, mat('#262626'), r, 0.45, r, x, r, z);
      w.rotation.z = Math.PI / 2;
      g.add(w);
      const hub = part(GEO.cyl, mat('#ffcf3a'), r * 0.45, 0.47, r * 0.45, x, r, z, false);
      hub.rotation.z = Math.PI / 2;
      g.add(hub);
    };
    wheel(-0.95, -0.7, 1.0);
    wheel(0.95, -0.7, 1.0);
    wheel(-0.85, 1.0, 0.6);
    wheel(0.85, 1.0, 0.6);
    g.add(part(GEO.cylLo, mat('#555'), 0.08, 1, 0.08, 0.3, 2.3, 0.9));
    scene.add(g);
    addCircle(15, 13, 1.9, 3);
  }

  // balíky sena kolem Bětky (kryt s mezerami)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.cos(a) * 9;
    const z = Math.sin(a) * 9;
    const bale = part(GEO.cyl, mat('#e7c35a'), 0.75, 1.3, 0.75, x, 0.75, z);
    bale.rotation.z = Math.PI / 2;
    bale.rotation.y = -a;
    bale.receiveShadow = true;
    scene.add(bale);
    addCircle(x, z, 0.85, 1.0);
  }

  // bedny jako kryty
  const crates = [
    [-8, 15, 0.2],
    [-9.3, 15.6, 0.5],
    [6, -14, 0],
    [24, 2, 0.3],
    [-20, 8, 0.7],
    [2, 22, 0.1],
    [-4, -25, 0.4],
    [28, -6, 0.9],
  ];
  for (const [x, z, r] of crates) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = r;
    g.add(part(GEO.box, mat('#b77b3e'), 1.3, 1.3, 1.3, 0, 0.65, 0));
    g.add(part(GEO.box, mat('#8f5a26'), 1.34, 0.18, 1.34, 0, 0.65, 0, false));
    g.add(part(GEO.box, mat('#8f5a26'), 0.18, 1.34, 1.34, 0, 0.65, 0, false));
    g.children[0].receiveShadow = true;
    scene.add(g);
    addCircle(x, z, 0.9, 1.3);
  }

  // napáječka
  scene.add(part(GEO.box, mat('#8a95a6'), 3, 0.8, 1, 5, 0.4, 6));
  scene.add(part(GEO.box, mat('#4aa3ff'), 2.8, 0.05, 0.8, 5, 0.78, 6, false));
  addBox(5, 6, 3, 1, 0.8);

  // stromy
  const rnd = mulberry(7);
  const treePositions = [];
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const d = i < 10 ? 22 + rnd() * 14 : ARENA_R + 4 + rnd() * 25;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (colliders.some((cl) => cl.type === 'circle' && Math.hypot(cl.x - x, cl.z - z) < cl.r + 3)) continue;
    treePositions.push([x, z, 0.8 + rnd() * 0.6]);
  }
  for (const [x, z, s] of treePositions) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.add(part(GEO.cylLo, mat('#7a4a24'), 0.3 * s, 3 * s, 0.3 * s, 0, 1.5 * s, 0));
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9 * s, 0), mat(rnd() < 0.5 ? '#3f9b3a' : '#5cb848'));
    leaves.position.y = 3.6 * s;
    leaves.castShadow = true;
    g.add(leaves);
    const l2 = leaves.clone();
    l2.scale.setScalar(0.7);
    l2.position.set(0.6 * s, 4.8 * s, 0.3 * s);
    g.add(l2);
    scene.add(g);
    if (Math.hypot(x, z) < ARENA_R + 1) addCircle(x, z, 0.45 * s, 6);
  }

  // obvodový plot
  const fenceMat = mat('#e7c79a');
  const posts = 64;
  for (let i = 0; i < posts; i++) {
    const a = (i / posts) * Math.PI * 2;
    scene.add(part(GEO.box, fenceMat, 0.2, 1.4, 0.2, Math.cos(a) * (ARENA_R + 1), 0.7, Math.sin(a) * (ARENA_R + 1), false));
    const a2 = ((i + 0.5) / posts) * Math.PI * 2;
    const len = (2 * Math.PI * (ARENA_R + 1)) / posts;
    for (const y of [0.55, 1.05]) {
      const rail = part(GEO.box, fenceMat, 0.1, 0.14, len + 0.1, Math.cos(a2) * (ARENA_R + 1), y, Math.sin(a2) * (ARENA_R + 1), false);
      rail.rotation.y = -a2;
      scene.add(rail);
    }
  }

  // mraky
  const clouds = [];
  const cloudMat = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false });
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const p = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + rnd() * 2, 1), cloudMat);
      p.position.set(k * 3.2 - 5, rnd() * 1.5, rnd() * 2);
      p.scale.y = 0.55;
      g.add(p);
    }
    const a = rnd() * Math.PI * 2;
    const d = 40 + rnd() * 50;
    g.position.set(Math.cos(a) * d, 32 + rnd() * 12, Math.sin(a) * d);
    scene.add(g);
    clouds.push(g);
  }

  const spawnPoints = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    spawnPoints.push(new THREE.Vector3(Math.cos(a) * (ARENA_R - 3), 0, Math.sin(a) * (ARENA_R - 3)));
  }

  return { colliders, spawnPoints, sun, clouds };
}

function mulberry(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Vytlačí kruh (x, z, r) z kolizních tvarů. Vrací true, pokud došlo ke kolizi. */
export function resolveCircle(p, r, colliders, maxY = 0) {
  let hit = false;
  for (const c of colliders) {
    if (maxY > c.h) continue;
    if (c.type === 'circle') {
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + r;
      if (d < min) {
        const k = d > 1e-4 ? (min - d) / d : 1;
        p.x += dx * k;
        p.z += dz * k;
        hit = true;
      }
    } else {
      const cx = Math.max(c.minX, Math.min(p.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
      const dx = p.x - cx;
      const dz = p.z - cz;
      const d = Math.hypot(dx, dz);
      if (d < r) {
        if (d > 1e-4) {
          p.x += (dx / d) * (r - d);
          p.z += (dz / d) * (r - d);
        } else p.x = c.maxX + r;
        hit = true;
      }
    }
  }
  const d = Math.hypot(p.x, p.z);
  if (d > ARENA_R - r) {
    p.x *= (ARENA_R - r) / d;
    p.z *= (ARENA_R - r) / d;
    hit = true;
  }
  return hit;
}

export function pointBlocked(p, colliders) {
  for (const c of colliders) {
    if (p.y > c.h) continue;
    if (c.type === 'circle') {
      if (Math.hypot(p.x - c.x, p.z - c.z) < c.r) return true;
    } else if (p.x > c.minX && p.x < c.maxX && p.z > c.minZ && p.z < c.maxZ) return true;
  }
  return false;
}
