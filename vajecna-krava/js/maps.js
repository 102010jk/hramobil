// Mapy: grid, kolize, raycast pro střelbu a A* navigace pro boty.
import * as THREE from './vendor/three.module.min.js';
import { surface, tex, canvas, mulberry } from './textures.js';

export const MAP_ROWS = {
  kravin: [
      '##################################',
      '#KKKKKK.....#######....AAAAAAA...#',
      '#KKKKKK.....#     #....AAcAAAA...#',
      '#KKKKKK.....#######....AAAAAAc...#',
      '#..........................AA....#',
      '#...C.....#####...h.....#####....#',
      '###..###..#   #.........#   #....#',
      '#B.....#..#####.........#####....#',
      '#BBcBB.#.........C...............#',
      '#BBBBB.#..................h......#',
      '#BBBBBh######..######..#####.....#',
      '#BBBBB......#..#    #..#   #..c..#',
      '#...........#..######..#####.....#',
      '####........#....................#',
      '#  ######.###....kkkkkk....h.....#',
      '#       #...#....kkkkkk....#######',
      '#       #...#..c.kkkkkk....#     #',
      '#       #..........c.......#     #',
      '#       #...#####......#####     #',
      '#       #...#   #......#         #',
      '#       #...#####......#         #',
      '#       #.........TTTTTTTT.......#',
      '#       #.........TTTTTTTT.......#',
      '#       #.........TTTTTTTT.......#',
      '#       ##########################',
      '##################################',
    ],
  lihen: [
      '##################################',
      '#TTTTTT.....#.........#....BBBBBB#',
      '#TTTTTT.....#...c.....#....BBcBBB#',
      '#TTTTTT.....C.........#....BBBBBB#',
      '#...........####..#####....BBBBhB#',
      '#....c...........................#',
      '#######..####...........####.....#',
      '#     #..#  #....C......#  #..c..#',
      '#     #..####...........####.....#',
      '#     #..........######..........#',
      '#######..........#    #....#######',
      '#...c............######....#     #',
      '#......####..............c.#     #',
      '#......#  #....kkkkkk......#######',
      '#.h....####....kkkkkk............#',
      '#..............kkkkkk.....C......#',
      '####.....C...........######......#',
      '#  #.........#####...#    #......#',
      '#  #.........#   #...######...c..#',
      '#  #####.....#####...............#',
      '#      #AAAAAA..........KKKKKK...#',
      '#      #AAcAAA..........KKKKKK...#',
      '#      #AAAAAA......h...KKKKKK...#',
      '#      #AAAAAA...................#',
      '#      ###########################',
      '##################################',
    ],
  pastvina: [
      '##################################',
      '#KKKKK....h.....#.......AAAAAAA..#',
      '#KKKKK..........#...c...AAAhAAA..#',
      '#KKKKK....###...#.......AAAAAAA..#',
      '#.........# #.......C...AAAAAAc..#',
      '#..c......###....................#',
      '#.................hh.....###.....#',
      '###...######.............# #.....#',
      '#.....#    #....kkkkkk...###..h..#',
      '#.h...######....kkkkkk...........#',
      '#...............kkkkkk.....c.....#',
      '#BBBBBB.....c...kkkkkk...######..#',
      '#BBhBBB..................#    #..#',
      '#BBBBBB.....######.......######..#',
      '#BBBBBc.....#    #..h............#',
      '#...........######.........C.....#',
      '#....C...........................#',
      '#......####.......c.....####.....#',
      '#..h...#  #.............#  #..h..#',
      '#......####....TTTTTT...####.....#',
      '#..............TTTTTT............#',
      '#........c.....TTTTTT......c.....#',
      '#................................#',
      '##################################',
    ],
};

// Legenda: # zeď, ' ' plná výplň, . podlaha, A/B místo pro bombu, T spawn Vaječníků, K spawn Kravařů,
// k pastvina pro krávy, c bedna, C vysoká bedna, h balík sena.
export const MAPS = {
  kravin: {
    name: 'Kravín',
    desc: 'Prašná farma se stodolami. Klasika pro každého kravaře.',
    floor: 'sand',
    wall: 'plaster',
    wallColor: '#d8c39a',
    wall2: 'brick',
    sky: ['#4f8fe0', '#f2e3c4'],
    fog: '#e8dcc0',
    sun: [0.6, 0.75, 0.35],
  },
  lihen: {
    name: 'Líheň',
    desc: 'Průmyslová líheň vajec. Beton, plech a úzké chodby.',
    floor: 'concrete',
    floorColor: '#8f8a82',
    wall: 'corrugated',
    wall2: 'concrete',
    sky: ['#5a7aa8', '#c8d2dc'],
    fog: '#b8c2cc',
    sun: [-0.4, 0.7, 0.5],
  },
  pastvina: {
    name: 'Pastvina',
    desc: 'Vesnice uprostřed luk. Hodně krav a málo krytů.',
    floor: 'grass',
    wall: 'planks',
    wallColor: '#7a5530',
    wall2: 'brick',
    sky: ['#3f7fd6', '#d6ecff'],
    fog: '#cfe3f2',
    sun: [0.3, 0.8, -0.5],
  },
};
for (const id of Object.keys(MAPS)) MAPS[id].rows = MAP_ROWS[id];

export const CELL = 2.5;
export const WALL_H = 4.6;
const HEIGHTS = { '#': WALL_H, ' ': WALL_H, c: 0.95, h: 1.0, C: 2.2 };

/** Načte mapu do gridu a postaví 3D scénu. */
export function loadMap(id, scene, opts = {}) {
  const def = MAPS[id];
  const rows = def.rows;
  const H = rows.length;
  const W = rows[0].length;
  const heights = new Float32Array(W * H);
  const chars = [];
  const spawns = { T: [], CT: [] };
  const sites = { A: [], B: [] };
  const cowCells = [];
  const floorCells = [];
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const ch = rows[j][i];
      chars.push(ch);
      heights[j * W + i] = HEIGHTS[ch] || 0;
      const p = cellCenter(i, j);
      if (ch === 'T') spawns.T.push(p);
      else if (ch === 'K') spawns.CT.push(p);
      else if (ch === 'A') sites.A.push(p);
      else if (ch === 'B') sites.B.push(p);
      else if (ch === 'k') cowCells.push(p);
      if (!HEIGHTS[ch]) floorCells.push(p);
    }

  function cellCenter(i, j) {
    return new THREE.Vector3((i - W / 2 + 0.5) * CELL, 0, (j - H / 2 + 0.5) * CELL);
  }
  const toCell = (x, z) => [Math.floor(x / CELL + W / 2), Math.floor(z / CELL + H / 2)];
  const hAt = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? WALL_H : heights[j * W + i]);
  const charAt = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? '#' : chars[j * W + i]);

  /* ---------- kolize ---------- */
  /** Vytlačí kruh z buněk vyšších než feetY + step. Vrací výšku podlahy pod hráčem. */
  function collide(pos, r, feetY = 0, step = 0.4) {
    let floor = 0;
    const [ci, cj] = toCell(pos.x, pos.z);
    for (let pass = 0; pass < 2; pass++)
      for (let j = cj - 1; j <= cj + 1; j++)
        for (let i = ci - 1; i <= ci + 1; i++) {
          const h = hAt(i, j);
          if (h <= 0) continue;
          const minX = (i - W / 2) * CELL;
          const minZ = (j - H / 2) * CELL;
          const nx = Math.max(minX, Math.min(pos.x, minX + CELL));
          const nz = Math.max(minZ, Math.min(pos.z, minZ + CELL));
          const dx = pos.x - nx;
          const dz = pos.z - nz;
          const d2 = dx * dx + dz * dz;
          if (d2 >= r * r) continue;
          if (h <= feetY + step) {
            floor = Math.max(floor, h);
            continue;
          }
          const d = Math.sqrt(d2);
          if (d > 1e-5) {
            pos.x = nx + (dx / d) * r;
            pos.z = nz + (dz / d) * r;
          } else {
            // uvnitř buňky – vytlačit nejkratší cestou
            const cx = minX + CELL / 2;
            const cz = minZ + CELL / 2;
            if (Math.abs(pos.x - cx) > Math.abs(pos.z - cz)) pos.x = pos.x > cx ? minX + CELL + r : minX - r;
            else pos.z = pos.z > cz ? minZ + CELL + r : minZ - r;
          }
        }
    return floor;
  }

  /* ---------- raycast (Amanatides–Woo v rovině XZ s výškami buněk) ---------- */
  const _n = new THREE.Vector3();
  function raycast(o, d, maxDist = 200) {
    let tGround = d.y < -1e-6 ? -o.y / d.y : Infinity;
    const tLimit = Math.min(maxDist, tGround);
    let gx = o.x / CELL + W / 2;
    let gz = o.z / CELL + H / 2;
    let i = Math.floor(gx);
    let j = Math.floor(gz);
    const stepX = d.x > 0 ? 1 : -1;
    const stepZ = d.z > 0 ? 1 : -1;
    const tDX = Math.abs(d.x) > 1e-9 ? CELL / Math.abs(d.x) : Infinity;
    const tDZ = Math.abs(d.z) > 1e-9 ? CELL / Math.abs(d.z) : Infinity;
    let tMX = Math.abs(d.x) > 1e-9 ? ((d.x > 0 ? i + 1 - gx : gx - i) * CELL) / Math.abs(d.x) : Infinity;
    let tMZ = Math.abs(d.z) > 1e-9 ? ((d.z > 0 ? j + 1 - gz : gz - j) * CELL) / Math.abs(d.z) : Infinity;
    let tEnter = 0;
    _n.set(0, 0, 0);
    for (let guard = 0; guard < 400; guard++) {
      const h = hAt(i, j);
      const tExit = Math.min(tMX, tMZ);
      if (h > 0) {
        const yEnter = o.y + d.y * tEnter;
        if (yEnter < h) return { t: tEnter, normal: _n.clone(), ground: false, cell: [i, j] };
        const yExit = o.y + d.y * Math.min(tExit, tLimit);
        if (yExit < h && d.y < 0) {
          const t = (h - o.y) / d.y;
          if (t <= tLimit) return { t, normal: new THREE.Vector3(0, 1, 0), ground: false, cell: [i, j] };
        }
      }
      if (tExit > tLimit) break;
      if (tMX < tMZ) {
        tEnter = tMX;
        tMX += tDX;
        i += stepX;
        _n.set(-stepX, 0, 0);
      } else {
        tEnter = tMZ;
        tMZ += tDZ;
        j += stepZ;
        _n.set(0, 0, -stepZ);
      }
    }
    if (tGround <= maxDist) return { t: tGround, normal: new THREE.Vector3(0, 1, 0), ground: true };
    return null;
  }

  const _d = new THREE.Vector3();
  function los(a, b) {
    _d.subVectors(b, a);
    const dist = _d.length();
    _d.divideScalar(dist);
    const hit = raycast(a, _d, dist);
    return !hit || hit.t >= dist - 0.05;
  }

  /* ---------- navigace (A*) ---------- */
  const walkable = (i, j) => hAt(i, j) <= 0;
  function findPath(from, to, noise = 0, rnd = Math.random) {
    const [si, sj] = toCell(from.x, from.z);
    let [ti, tj] = toCell(to.x, to.z);
    let exact = true;
    if (!walkable(ti, tj)) {
      exact = false;
      // nejbližší průchozí
      let best = null;
      for (let r = 1; r < 4 && !best; r++)
        for (let dj = -r; dj <= r; dj++)
          for (let di = -r; di <= r; di++) if (walkable(ti + di, tj + dj)) best = best || [ti + di, tj + dj];
      if (!best) return [];
      [ti, tj] = best;
    }
    const N = W * H;
    const g = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const extra = noise ? new Float32Array(N).map(() => rnd() * noise) : null;
    const heap = [];
    const push = (n, f) => {
      heap.push([f, n]);
      let k = heap.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (heap[p][0] <= heap[k][0]) break;
        [heap[p], heap[k]] = [heap[k], heap[p]];
        k = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let k = 0;
        for (;;) {
          const l = 2 * k + 1;
          const r = l + 1;
          let m = k;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === k) break;
          [heap[m], heap[k]] = [heap[k], heap[m]];
          k = m;
        }
      }
      return top;
    };
    const start = sj * W + si;
    const goal = tj * W + ti;
    const hfn = (i, j) => Math.hypot(i - ti, j - tj);
    g[start] = 0;
    push(start, hfn(si, sj));
    while (heap.length) {
      const [, n] = pop();
      if (closed[n]) continue;
      closed[n] = 1;
      if (n === goal) break;
      const ci = n % W;
      const cj = (n / W) | 0;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = ci + di;
          const nj = cj + dj;
          if (!walkable(ni, nj)) continue;
          if (di && dj && (!walkable(ci + di, cj) || !walkable(ci, cj + dj))) continue;
          const nn = nj * W + ni;
          const cost = g[n] + (di && dj ? 1.414 : 1) + (extra ? extra[nn] : 0);
          if (cost < g[nn]) {
            g[nn] = cost;
            came[nn] = n;
            push(nn, cost + hfn(ni, nj));
          }
        }
    }
    if (came[goal] < 0 && goal !== start) return [];
    const path = [];
    let n = goal;
    while (n !== start && n >= 0) {
      path.push(cellCenter(n % W, (n / W) | 0));
      n = came[n];
    }
    path.reverse();
    if (path.length && exact) path[path.length - 1] = new THREE.Vector3(to.x, 0, to.z);
    return path;
  }

  /** Lze jít přímo z a do b (kruh poloměru r)? */
  function walkLine(a, b, r = 0.45) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const n = Math.ceil(len / 0.6);
    const px = (-dz / (len || 1)) * r;
    const pz = (dx / (len || 1)) * r;
    for (let k = 1; k <= n; k++) {
      const x = a.x + (dx * k) / n;
      const z = a.z + (dz * k) / n;
      for (const s of [-1, 0, 1]) {
        const [i, j] = toCell(x + px * s, z + pz * s);
        if (!walkable(i, j)) return false;
      }
    }
    return true;
  }

  const meshes = buildScene(scene, def, { W, H, heights, chars, cellCenter, hAt, charAt }, opts);

  const center = (arr) => arr.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(arr.length || 1);
  return {
    id,
    def,
    W,
    H,
    heights,
    spawns,
    sites,
    siteCenter: { A: center(sites.A), B: center(sites.B) },
    cowCells: cowCells.length ? cowCells : floorCells,
    floorCells,
    toCell,
    hAt,
    charAt,
    cellCenter,
    collide,
    raycast,
    los,
    findPath,
    walkLine,
    walkable,
    meshes,
    siteOf(p) {
      const [i, j] = toCell(p.x, p.z);
      const ch = charAt(i, j);
      if (ch === 'A' || ch === 'B') return ch;
      // tolerance – vedle místa
      for (const s of ['A', 'B']) if (this.siteCenter[s].distanceTo(p) < 5.5) return s;
      return null;
    },
    dispose() {
      for (const m of meshes) {
        scene.remove(m);
        m.traverse?.((o) => {
          if (o.geometry) o.geometry.dispose();
        });
      }
    },
  };
}

/* ================= stavba scény ================= */

function letterTexture(letter, color) {
  const c = canvas(256);
  const ctx = c.getContext('2d');
  ctx.font = 'bold 220px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.fillText(letter, 128, 140);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildScene(scene, def, g, opts) {
  const { W, H, chars, cellCenter, hAt } = g;
  const meshes = [];
  const add = (m) => {
    scene.add(m);
    meshes.push(m);
    return m;
  };
  const shadows = !!opts.shadows;

  // podlaha
  const floorMat = surface(def.floor, { repeat: 1, color: def.floorColor, seed: 3, bump: 1.5 });
  floorMat.map.repeat.set(W / 2, H / 2);
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(W * CELL, H * CELL), floorMat));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;

  // venkovní terén za zdmi
  const outer = add(new THREE.Mesh(new THREE.PlaneGeometry(900, 900), surface('grass', { seed: 9 })));
  outer.material.map.repeat.set(150, 150);
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = -0.02;

  // zdi – jen ty, které sousedí s podlahou
  const isSolid = (i, j) => hAt(i, j) >= WALL_H - 0.01;
  const wallCells = [];
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      if (!isSolid(i, j)) continue;
      let edge = false;
      for (let dj = -1; dj <= 1 && !edge; dj++) for (let di = -1; di <= 1 && !edge; di++) if (!isSolid(i + di, j + dj) && i + di >= 0 && j + dj >= 0 && i + di < W && j + dj < H) edge = true;
      if (edge) wallCells.push([i, j]);
    }
  const wallMats = [surface(def.wall, { color: def.wallColor, seed: 5 }), surface(def.wall2, { seed: 6 })];
  for (const m of wallMats) m.map.repeat.set(1, WALL_H / CELL);
  const wallGeo = new THREE.BoxGeometry(CELL, WALL_H, CELL);
  const buckets = [[], []];
  for (const [i, j] of wallCells) buckets[(i * 7 + j * 3) % 5 === 0 ? 1 : 0].push([i, j]);
  buckets.forEach((cells, k) => {
    if (!cells.length) return;
    const im = new THREE.InstancedMesh(wallGeo, wallMats[k], cells.length);
    const m4 = new THREE.Matrix4();
    cells.forEach(([i, j], n) => {
      const p = cellCenter(i, j);
      m4.makeTranslation(p.x, WALL_H / 2, p.z);
      im.setMatrixAt(n, m4);
    });
    im.castShadow = shadows;
    im.receiveShadow = true;
    add(im);
  });
  // lišta na zdech
  const trimMat = new THREE.MeshStandardMaterial({ color: '#5a4a3a', roughness: 0.8 });
  const trim = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL + 0.06, 0.18, CELL + 0.06), trimMat, wallCells.length);
  const m4 = new THREE.Matrix4();
  wallCells.forEach(([i, j], n) => {
    const p = cellCenter(i, j);
    m4.makeTranslation(p.x, WALL_H + 0.09, p.z);
    trim.setMatrixAt(n, m4);
  });
  add(trim);

  // bedny a seno
  const crateMat = new THREE.MeshStandardMaterial({ map: tex('crate', 1, 2), bumpMap: tex('crate', 1, 2), bumpScale: 1.5, roughness: 0.85 });
  const hayMat = new THREE.MeshStandardMaterial({ map: tex('hay', 1, 4), bumpMap: tex('hay', 1, 4), bumpScale: 2, roughness: 1 });
  const crateGeo = new THREE.BoxGeometry(1, 1, 1);
  const hayGeo = new THREE.CylinderGeometry(0.55, 0.55, 2.3, 16);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const ch = chars[j * W + i];
      const p = cellCenter(i, j);
      if (ch === 'c' || ch === 'C') {
        const b = new THREE.Mesh(crateGeo, crateMat);
        b.scale.set(CELL - 0.1, 0.95, CELL - 0.1);
        b.position.set(p.x, 0.475, p.z);
        b.castShadow = shadows;
        b.receiveShadow = true;
        add(b);
        if (ch === 'C') {
          const t = new THREE.Mesh(crateGeo, crateMat);
          t.scale.set(CELL - 0.3, 1.25, CELL - 0.3);
          t.position.set(p.x, 0.95 + 0.625, p.z);
          t.rotation.y = 0.15;
          t.castShadow = shadows;
          t.receiveShadow = true;
          add(t);
        }
      } else if (ch === 'h') {
        for (const s of [-0.55, 0.55]) {
          const b = new THREE.Mesh(hayGeo, hayMat);
          b.rotation.z = Math.PI / 2;
          b.position.set(p.x, 0.5, p.z + s);
          b.castShadow = shadows;
          b.receiveShadow = true;
          add(b);
        }
      }
    }

  // značky A/B
  for (const s of ['A', 'B']) {
    const cells = [];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (chars[j * W + i] === s) cells.push(cellCenter(i, j));
    if (!cells.length) continue;
    const c = cells.reduce((acc, p) => acc.add(p), new THREE.Vector3()).divideScalar(cells.length);
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 4),
      new THREE.MeshBasicMaterial({ map: letterTexture(s, s === 'A' ? '#ff5a3a' : '#ff5a3a'), transparent: true, depthWrite: false })
    );
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(c.x, 0.02, c.z);
    add(decal);
  }

  // dekorace za zdmi (stodoly, silo, kopce)
  const rnd = mulberry(def.name.length * 17);
  const hillMat = new THREE.MeshStandardMaterial({ color: '#5f8f3a', roughness: 1 });
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const r = 110 + rnd() * 60;
    const hill = add(new THREE.Mesh(new THREE.SphereGeometry(40 + rnd() * 30, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), hillMat));
    hill.scale.y = 0.35 + rnd() * 0.25;
    hill.position.set(Math.cos(a) * r, -2, Math.sin(a) * r);
  }
  const barnMat = surface('planks', { color: '#9c2a1c', seed: 8 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#4a4440', roughness: 0.7, metalness: 0.3 });
  for (let k = 0; k < 5; k++) {
    const a = rnd() * Math.PI * 2;
    const r = (Math.max(W, H) * CELL) / 2 + 12 + rnd() * 25;
    const grp = new THREE.Group();
    const w = 10 + rnd() * 8;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, 7, 9), barnMat);
    body.position.y = 3.5;
    grp.add(body);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, w + 0.4, 3, 1, false, Math.PI / 2), roofMat);
    roof.rotation.z = Math.PI / 2;
    roof.scale.set(0.6, 1, 1);
    roof.position.y = 7 + 5.6 * 0.3;
    grp.add(roof);
    grp.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    grp.rotation.y = rnd() * Math.PI;
    add(grp);
  }
  const silo = add(new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 16, 20), new THREE.MeshStandardMaterial({ color: '#b9c0c8', metalness: 0.6, roughness: 0.4 })));
  silo.position.set((W * CELL) / 2 + 10, 8, -10);

  return meshes;
}
