// Procedurální textury (kreslené na canvas) – beton, cihly, dřevo, kov, tráva…
import * as THREE from './vendor/three.module.min.js';

export function mulberry(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Dlaždicový value-noise (0..1), velikost size×size. */
export function noiseField(size, seed, cells = 8, octaves = 4) {
  const out = new Float32Array(size * size);
  const r = mulberry(seed);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = cells << o;
    const grid = new Float32Array(n * n);
    for (let i = 0; i < grid.length; i++) grid[i] = r();
    for (let y = 0; y < size; y++) {
      const gy = (y / size) * n;
      const y0 = Math.floor(gy);
      const fy = gy - y0;
      const sy = fy * fy * (3 - 2 * fy);
      const y1 = (y0 + 1) % n;
      for (let x = 0; x < size; x++) {
        const gx = (x / size) * n;
        const x0 = Math.floor(gx);
        const fx = gx - x0;
        const sx = fx * fx * (3 - 2 * fx);
        const x1 = (x0 + 1) % n;
        const a = grid[y0 * n + x0] + (grid[y0 * n + x1] - grid[y0 * n + x0]) * sx;
        const b = grid[y1 * n + x0] + (grid[y1 * n + x1] - grid[y1 * n + x0]) * sx;
        out[y * size + x] += (a + (b - a) * sy) * amp;
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

export function hexToRgb(h) {
  const n = parseInt(h.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Přes celý canvas přidá šum (zesvětlení/ztmavení). */
export function grain(ctx, size, seed, strength = 0.25, cells = 8, octaves = 4) {
  const n = noiseField(size, seed, cells, octaves);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < n.length; i++) {
    const k = 1 + (n[i] - 0.5) * 2 * strength;
    d[i * 4] = Math.min(255, d[i * 4] * k);
    d[i * 4 + 1] = Math.min(255, d[i * 4 + 1] * k);
    d[i * 4 + 2] = Math.min(255, d[i * 4 + 2] * k);
  }
  ctx.putImageData(img, 0, 0);
}

export function toTexture(c, repeat = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.repeat.set(repeat, repeat);
  return t;
}

const S = 256;

function base(color) {
  const c = canvas(S);
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, S, S);
  return [c, ctx];
}

function stains(ctx, seed, color, n = 6, max = 60) {
  const r = mulberry(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * S;
    const y = r() * S;
    const rad = 10 + r() * max;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}

const painters = {
  concrete(seed, color = '#a29c92') {
    const [c, ctx] = base(color);
    grain(ctx, S, seed, 0.18, 6, 5);
    stains(ctx, seed + 1, 'rgba(60,50,40,0.18)', 8);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, S / 2);
    ctx.lineTo(S, S / 2);
    ctx.moveTo(S / 2, 0);
    ctx.lineTo(S / 2, S);
    ctx.stroke();
    return c;
  },
  plaster(seed, color = '#d8c9a8') {
    const [c, ctx] = base(color);
    grain(ctx, S, seed, 0.12, 4, 5);
    stains(ctx, seed + 7, 'rgba(110,80,40,0.16)', 10, 70);
    const r = mulberry(seed);
    ctx.fillStyle = 'rgba(160,80,50,0.5)';
    for (let i = 0; i < 4; i++) {
      // opadaná omítka s cihlami
      const x = r() * S;
      const y = r() * S;
      ctx.fillRect(x, y, 18 + r() * 20, 9);
    }
    return c;
  },
  brick(seed, color = '#9c4a32') {
    const [c, ctx] = base('#8a8278');
    const r = mulberry(seed);
    const bh = 16;
    const bw = 42;
    for (let y = 0; y < S; y += bh) {
      const off = (y / bh) % 2 ? bw / 2 : 0;
      for (let x = -bw; x < S + bw; x += bw) {
        const [cr, cg, cb] = hexToRgb(color);
        const k = 0.8 + r() * 0.35;
        ctx.fillStyle = `rgb(${cr * k},${cg * k},${cb * k})`;
        ctx.fillRect(x + off + 1.5, y + 1.5, bw - 3, bh - 3);
      }
    }
    grain(ctx, S, seed + 3, 0.2, 16, 3);
    stains(ctx, seed + 4, 'rgba(30,20,10,0.2)', 6);
    return c;
  },
  planks(seed, color = '#8a6038') {
    const [c, ctx] = base(color);
    const r = mulberry(seed);
    const pw = 32;
    for (let x = 0; x < S; x += pw) {
      const k = 0.85 + r() * 0.3;
      const [cr, cg, cb] = hexToRgb(color);
      ctx.fillStyle = `rgb(${cr * k},${cg * k},${cb * k})`;
      ctx.fillRect(x, 0, pw, S);
      ctx.strokeStyle = 'rgba(40,20,5,0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const gx = x + 4 + r() * (pw - 8);
        ctx.moveTo(gx, 0);
        for (let y = 0; y <= S; y += 16) ctx.lineTo(gx + Math.sin(y * 0.05 + i) * 2, y);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(20,10,0,0.6)';
      ctx.fillRect(x, 0, 2, S);
      ctx.fillStyle = '#3a3a3a';
      for (const y of [12, S - 12]) {
        ctx.beginPath();
        ctx.arc(x + pw / 2, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    grain(ctx, S, seed + 5, 0.15, 8, 3);
    return c;
  },
  crate(seed) {
    const c = painters.planks(seed, '#a87a45');
    const ctx = c.getContext('2d');
    ctx.strokeStyle = '#5e3e1c';
    ctx.lineWidth = 22;
    ctx.strokeRect(11, 11, S - 22, S - 22);
    ctx.beginPath();
    ctx.moveTo(22, 22);
    ctx.lineTo(S - 22, S - 22);
    ctx.stroke();
    ctx.strokeStyle = '#7a5530';
    ctx.lineWidth = 14;
    ctx.strokeRect(11, 11, S - 22, S - 22);
    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = 'rgba(30,20,10,0.55)';
    ctx.textAlign = 'center';
    ctx.fillText('VEJCE', S / 2, S / 2 - 30);
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('KŘEHKÉ ↑', S / 2, S / 2 + 60);
    return c;
  },
  metal(seed, color = '#7d838c') {
    const [c, ctx] = base(color);
    const r = mulberry(seed);
    for (let y = 0; y < S; y++) {
      ctx.fillStyle = `rgba(255,255,255,${r() * 0.06})`;
      ctx.fillRect(0, y, S, 1);
    }
    grain(ctx, S, seed, 0.12, 4, 4);
    stains(ctx, seed + 2, 'rgba(120,60,20,0.25)', 5, 40);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (const [x, y] of [[10, 10], [S - 10, 10], [10, S - 10], [S - 10, S - 10]]) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    return c;
  },
  corrugated(seed, color = '#8d9aa3') {
    const [c, ctx] = base(color);
    for (let x = 0; x < S; x++) {
      const k = Math.sin((x / S) * Math.PI * 16);
      ctx.fillStyle = k > 0 ? `rgba(255,255,255,${k * 0.18})` : `rgba(0,0,0,${-k * 0.25})`;
      ctx.fillRect(x, 0, 1, S);
    }
    grain(ctx, S, seed, 0.15, 6, 4);
    stains(ctx, seed + 3, 'rgba(140,70,20,0.3)', 7, 50);
    return c;
  },
  tiles(seed, color = '#b9b3a8') {
    const [c, ctx] = base('#6e6a63');
    const r = mulberry(seed);
    const t = 64;
    for (let y = 0; y < S; y += t)
      for (let x = 0; x < S; x += t) {
        const k = 0.9 + r() * 0.15;
        const [cr, cg, cb] = hexToRgb(color);
        ctx.fillStyle = `rgb(${cr * k},${cg * k},${cb * k})`;
        ctx.fillRect(x + 2, y + 2, t - 4, t - 4);
      }
    grain(ctx, S, seed + 1, 0.14, 8, 4);
    stains(ctx, seed + 9, 'rgba(40,30,20,0.18)', 8);
    return c;
  },
  grass(seed) {
    const [c, ctx] = base('#4f7a2e');
    grain(ctx, S, seed, 0.35, 8, 5);
    const r = mulberry(seed + 1);
    for (let i = 0; i < 1400; i++) {
      const x = r() * S;
      const y = r() * S;
      ctx.strokeStyle = r() < 0.5 ? 'rgba(130,170,70,0.5)' : 'rgba(30,60,15,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 5);
      ctx.stroke();
    }
    return c;
  },
  dirt(seed, color = '#8a6a48') {
    const [c, ctx] = base(color);
    grain(ctx, S, seed, 0.3, 6, 5);
    const r = mulberry(seed + 2);
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = `rgba(${r() < 0.5 ? '40,30,20' : '200,180,150'},${0.3 + r() * 0.3})`;
      ctx.beginPath();
      ctx.arc(r() * S, r() * S, 1 + r() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    return c;
  },
  sand(seed) {
    return painters.dirt(seed, '#c9ae7c');
  },
  hay(seed) {
    const [c, ctx] = base('#d9b65a');
    const r = mulberry(seed);
    for (let i = 0; i < 900; i++) {
      ctx.strokeStyle = r() < 0.5 ? 'rgba(255,230,140,0.6)' : 'rgba(140,100,30,0.5)';
      ctx.lineWidth = 1 + r();
      const x = r() * S;
      const y = r() * S;
      const a = (r() - 0.5) * 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * 20, y + Math.sin(a) * 20);
      ctx.stroke();
    }
    return c;
  },
  asphalt(seed) {
    const [c, ctx] = base('#4a4a4c');
    grain(ctx, S, seed, 0.25, 32, 3);
    stains(ctx, seed + 1, 'rgba(0,0,0,0.25)', 6);
    return c;
  },
};

const cache = new Map();
export function tex(kind, repeat = 1, seed = 1, color) {
  const key = `${kind}|${seed}|${color}`;
  if (!cache.has(key)) cache.set(key, painters[kind](seed, color));
  const t = toTexture(cache.get(key), 1);
  t.repeat.set(repeat, repeat);
  return t;
}

/** PBR materiál s procedurální texturou a jemným reliéfem. */
export function surface(kind, opts = {}) {
  const map = tex(kind, opts.repeat || 1, opts.seed || 1, opts.color);
  if (opts.repeatX) map.repeat.set(opts.repeatX, opts.repeatY || opts.repeatX);
  return new THREE.MeshStandardMaterial({
    map,
    bumpMap: map,
    bumpScale: opts.bump ?? 1.2,
    roughness: opts.roughness ?? 0.9,
    metalness: opts.metalness ?? 0,
  });
}

/** Obloha s gradientem a sluncem. */
export function makeSky(top = '#3f7fd6', horizon = '#cfe6ff', sunDir = new THREE.Vector3(0.5, 0.6, 0.3)) {
  const geo = new THREE.SphereGeometry(400, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(top) },
      horizon: { value: new THREE.Color(horizon) },
      sun: { value: sunDir.clone().normalize() },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sun; varying vec3 vDir;
      void main(){ float h = clamp(vDir.y, 0.0, 1.0); vec3 c = mix(horizon, top, pow(h, 0.55));
      float s = max(dot(normalize(vDir), sun), 0.0); c += vec3(1.0,0.9,0.7) * (pow(s, 400.0) * 3.0 + pow(s, 12.0) * 0.25);
      if (vDir.y < 0.0) c = mix(horizon, horizon * 0.8, clamp(-vDir.y * 4.0, 0.0, 1.0));
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = -1;
  return m;
}
