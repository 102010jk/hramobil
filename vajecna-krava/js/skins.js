// Skiny, vzácnosti, časky a jejich náhledy.
import * as THREE from './vendor/three.module.min.js';
import { canvas, mulberry, noiseField, hexToRgb, toTexture } from './textures.js';
import { WEAPONS, BY_ID } from './weapons.js';

export const RARITIES = {
  mil: { name: 'Armádní', color: '#4b69ff', weight: 7992 },
  res: { name: 'Omezená', color: '#8847ff', weight: 1598 },
  cla: { name: 'Utajená', color: '#d32ce6', weight: 320 },
  cov: { name: 'Tajná', color: '#eb4b4b', weight: 64 },
  gold: { name: 'Mimořádná ★', color: '#e4ae39', weight: 26 },
};
export const RARITY_ORDER = ['mil', 'res', 'cla', 'cov', 'gold'];

export const WEAR = [
  { max: 0.07, name: 'Továrně nové', short: 'FN' },
  { max: 0.15, name: 'Lehce opotřebené', short: 'MW' },
  { max: 0.38, name: 'Opotřebené z boje', short: 'FT' },
  { max: 0.45, name: 'Dobře opotřebené', short: 'WW' },
  { max: 1.01, name: 'Zničené bojem', short: 'BS' },
];
export const wearOf = (f) => WEAR.find((w) => f < w.max);

/* ================= povrchové úpravy ================= */

export const FINISHES = {
  strakata: { name: 'Strakatá', p: 'spots', c: ['#f4f1ea', '#1d1d1d'] },
  zloutek: { name: 'Žloutek', p: 'gradient', c: ['#fff3b0', '#ffb300', '#ff7a00'] },
  skorapka: { name: 'Skořápka', p: 'crackle', c: ['#efe6d8', '#8a7a66'] },
  kravinec: { name: 'Kravinec camo', p: 'camo', c: ['#4a3a22', '#6b5232', '#2e2414', '#8a6d3f'] },
  pastvina: { name: 'Pastvina', p: 'camo', c: ['#3f6b2a', '#6b8f3a', '#2a3d1c', '#a0b060'] },
  poust: { name: 'Pouštní stádo', p: 'camo', c: ['#c9ae7c', '#a68a5a', '#e2cfa0', '#7d6640'] },
  noc: { name: 'Noční pastva', p: 'stars', c: ['#0b1030', '#2a3170', '#ffffff'] },
  duha: { name: 'Duhová kráva', p: 'rainbow', c: [] },
  zlate: { name: 'Zlaté vejce', p: 'gold', c: ['#fff1a0', '#e0a800', '#7a5200'] },
  mleko: { name: 'Mléčná dráha', p: 'marble', c: ['#ffffff', '#cfd8e6', '#8fa3c0'] },
  mramor: { name: 'Černý mramor', p: 'marble', c: ['#1a1a1a', '#3a3a3a', '#c9ced6'] },
  tygr: { name: 'Tygří vejce', p: 'stripes', c: ['#ff9a1f', '#1a1208'] },
  zebra: { name: 'Zebrovka', p: 'stripes', c: ['#f2f2f2', '#111111'] },
  ohen: { name: 'Pálená kráva', p: 'flames', c: ['#1a0a05', '#ff4a00', '#ffd000'] },
  led: { name: 'Ledový žloutek', p: 'crackle', c: ['#d9f6ff', '#3a8fd6'] },
  pixel: { name: 'Pixelové stádo', p: 'digital', c: ['#2b3a55', '#4f6d8f', '#9fb6d0', '#1a2233'] },
  pixelzel: { name: 'Digitální seno', p: 'digital', c: ['#3f4a2a', '#6b7a3a', '#a8b070', '#2a3018'] },
  plastev: { name: 'Plástev', p: 'hex', c: ['#ffcf3a', '#8a5a00'] },
  karbon: { name: 'Karbon', p: 'carbon', c: ['#1a1a1a', '#3a3a3a'] },
  obvod: { name: 'Kravský obvod', p: 'circuit', c: ['#0d2a1a', '#3dff8a'] },
  velikonoce: { name: 'Velikonoce', p: 'eggs', c: ['#ffe1f0', '#ff7ab0', '#7ad0ff', '#ffe27a'] },
  sach: { name: 'Šachovnice', p: 'checker', c: ['#151515', '#e8e8e8'] },
  vlny: { name: 'Mléčné vlny', p: 'waves', c: ['#e8f4ff', '#5aa0e6'] },
  byk: { name: 'Červený býk', p: 'solid', c: ['#b0141c'] },
  modra: { name: 'Modré vemínko', p: 'solid', c: ['#1f4fd1'] },
  mata: { name: 'Mátová', p: 'solid', c: ['#4fd1a5'] },
  fade: { name: 'Fade', p: 'fade', c: ['#ffd23f', '#ff5aa8', '#6a4bff'] },
  rozbite: { name: 'Rozbité vejce', p: 'splatter', c: ['#2a2a2a', '#ffc21a', '#ffffff'] },
  damasek: { name: 'Damašek', p: 'damascus', c: ['#5a5f66', '#c9ced6'] },
  gama: { name: 'Gama doppler', p: 'doppler', c: ['#0aff8a', '#00594a', '#001a12'] },
  safir: { name: 'Safír', p: 'doppler', c: ['#3a6bff', '#001a66', '#000814'] },
  rubin: { name: 'Rubín', p: 'doppler', c: ['#ff2a4a', '#5a0010', '#14000a'] },
  hneda: { name: 'Hnědka', p: 'spots', c: ['#c98b55', '#6a3d1c'] },
  fialka: { name: 'Fialka', p: 'spots', c: ['#c9a7ff', '#ffffff'] },
  kosmos: { name: 'Kosmická', p: 'stars', c: ['#180838', '#5a2aa0', '#ffe9ff'] },
  lava: { name: 'Lávová', p: 'crackle', c: ['#2a0a00', '#ff6a00'] },
};

/* ================= kreslení vzorů ================= */

const S = 256;
const painters = {
  solid(ctx, c, r) {
    ctx.fillStyle = c[0];
    ctx.fillRect(0, 0, S, S);
    shade(ctx, r, 0.12);
  },
  spots(ctx, c, r) {
    ctx.fillStyle = c[0];
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = c[1];
    for (let i = 0; i < 9; i++) {
      const x = r() * S;
      const y = r() * S;
      const rad = 18 + r() * 34;
      ctx.beginPath();
      for (let k = 0; k <= 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        const rr = rad * (0.7 + r() * 0.5);
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8);
      }
      ctx.fill();
      // přes okraj kvůli dlaždicování
      for (const [dx, dy] of [[S, 0], [-S, 0], [0, S], [0, -S]]) {
        ctx.save();
        ctx.translate(dx, dy);
        ctx.beginPath();
        ctx.arc(x, y, rad * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  },
  gradient(ctx, c) {
    const g = ctx.createLinearGradient(0, 0, S, S);
    c.forEach((col, i) => g.addColorStop(i / (c.length - 1), col));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  },
  fade(ctx, c) {
    painters.gradient(ctx, c);
    const g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  },
  crackle(ctx, c, r) {
    ctx.fillStyle = c[0];
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = c[1];
    ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      let x = r() * S;
      let y = r() * S;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (r() - 0.5) * 40;
        y += (r() - 0.5) * 40;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  },
  camo(ctx, c, r) {
    ctx.fillStyle = c[0];
    ctx.fillRect(0, 0, S, S);
    for (let layer = 1; layer < c.length; layer++) {
      const n = noiseField(S, Math.floor(r() * 1e6), 3 + layer, 4);
      const img = ctx.getImageData(0, 0, S, S);
      const [cr, cg, cb] = hexToRgb(c[layer]);
      for (let i = 0; i < n.length; i++) {
        if (n[i] > 0.55) {
          img.data[i * 4] = cr;
          img.data[i * 4 + 1] = cg;
          img.data[i * 4 + 2] = cb;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
  },
  digital(ctx, c, r) {
    const px = 16;
    for (let y = 0; y < S; y += px)
      for (let x = 0; x < S; x += px) {
        ctx.fillStyle = c[Math.floor(r() * c.length)];
        ctx.fillRect(x, y, px, px);
      }
  },
  stars(ctx, c, r) {
    const g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, c[0]);
    g.addColorStop(0.5, c[1]);
    g.addColorStop(1, c[0]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = c[2];
    for (let i = 0; i < 140; i++) {
      ctx.globalAlpha = 0.3 + r() * 0.7;
      ctx.beginPath();
      ctx.arc(r() * S, r() * S, r() * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  rainbow(ctx, c, r) {
    const off = r() * 360;
    for (let x = 0; x < S; x++) {
      ctx.fillStyle = `hsl(${(off + (x / S) * 360) % 360} 85% 60%)`;
      ctx.fillRect(x, 0, 1, S);
    }
  },
  gold(ctx, c) {
    const g = ctx.createLinearGradient(0, 0, S, S * 0.6);
    g.addColorStop(0, c[0]);
    g.addColorStop(0.35, c[1]);
    g.addColorStop(0.5, c[0]);
    g.addColorStop(0.75, c[1]);
    g.addColorStop(1, c[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  },
  marble(ctx, c, r) {
    ctx.fillStyle = c[0];
    ctx.fillRect(0, 0, S, S);
    const n = noiseField(S, Math.floor(r() * 1e6), 4, 5);
    const img = ctx.getImageData(0, 0, S, S);
    const a = hexToRgb(c[1]);
    const b = hexToRgb(c[2]);
    for (let i = 0; i < n.length; i++) {
      const x = i % S;
      const v = Math.abs(Math.sin((x / S) * 8 + n[i] * 12));
      const col = v < 0.12 ? b : v < 0.4 ? a : null;
      if (col) {
        img.data[i * 4] = col[0];
        img.data[i * 4 + 1] = col[1];
        img.data[i * 4 + 2] = col[2];
      }
    }
    ctx.putImageData(img, 0, 0);
  },
  stripes(ctx, c, r) {
    ctx.fillStyle = c[0];
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = c[1];
    for (let i = 0; i < 12; i++) {
      const y = (i / 12) * S + r() * 8;
      ctx.beginPath();
      ctx.moveTo(-10, y);
      for (let x = 0; x <= S + 10; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 6 + r() * 3);
      for (let x = S + 10; x >= -10; x -= 16) ctx.lineTo(x, y + 5 + r() * 6 + Math.sin(x * 0.05 + i) * 6);
      ctx.fill();
    }
  },
  flames(ctx, c, r) {
    ctx.fillStyle = c[0];
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 16; i++) {
      const x = r() * S;
      const g = ctx.createLinearGradient(0, S, 0, S * 0.2);
      g.addColorStop(0, c[2]);
      g.addColorStop(0.5, c[1]);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 20, S);
      ctx.quadraticCurveTo(x - 30 + r() * 20, S * 0.5, x + (r() - 0.5) * 30, S * (0.1 + r() * 0.3));
      ctx.quadraticCurveTo(x + 30, S * 0.6, x + 20, S);
      ctx.fill();
    }
  },
  hex(ctx, c) {
    ctx.fillStyle = c[1];
    ctx.fillRect(0, 0, S, S);
    const R = 16;
    const h = Math.sqrt(3) * R;
    for (let row = -1; row < S / h + 1; row++)
      for (let col = -1; col < S / (R * 1.5) + 1; col++) {
        const x = col * R * 1.5;
        const y = row * h + (col % 2 ? h / 2 : 0);
        ctx.fillStyle = c[0];
        ctx.beginPath();
        for (let k = 0; k < 6; k++) ctx.lineTo(x + Math.cos((k * Math.PI) / 3) * (R - 2), y + Math.sin((k * Math.PI) / 3) * (R - 2));
        ctx.fill();
      }
  },
  carbon(ctx, c) {
    const t = 8;
    for (let y = 0; y < S; y += t)
      for (let x = 0; x < S; x += t) {
        const g = ctx.createLinearGradient(x, y, x + t, y + t);
        const flip = ((x + y) / t) % 2;
        g.addColorStop(0, flip ? c[0] : c[1]);
        g.addColorStop(1, flip ? c[1] : c[0]);
        ctx.fillStyle = g;
        ctx.fillRect(x, y, t, t);
      }
  },
  circuit(ctx, c, r) {
    ctx.fillStyle = c[0];
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = c[1];
    ctx.fillStyle = c[1];
    ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      let x = Math.round((r() * S) / 16) * 16;
      let y = Math.round((r() * S) / 16) * 16;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        if (r() < 0.5) x += (r() < 0.5 ? -1 : 1) * 32;
        else y += (r() < 0.5 ? -1 : 1) * 32;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  eggs(ctx, c, r) {
    ctx.fillStyle = c[0];
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = c[1 + Math.floor(r() * (c.length - 1))];
      ctx.save();
      ctx.translate(r() * S, r() * S);
      ctx.rotate(r() * 6);
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },
  checker(ctx, c) {
    const t = 32;
    for (let y = 0; y < S; y += t) for (let x = 0; x < S; x += t) {
      ctx.fillStyle = ((x + y) / t) % 2 ? c[0] : c[1];
      ctx.fillRect(x, y, t, t);
    }
  },
  waves(ctx, c) {
    ctx.fillStyle = c[0];
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = c[1];
    ctx.lineWidth = 6;
    for (let y = -20; y < S + 20; y += 22) {
      ctx.beginPath();
      for (let x = 0; x <= S; x += 8) ctx.lineTo(x, y + Math.sin((x / S) * Math.PI * 4) * 8);
      ctx.stroke();
    }
  },
  splatter(ctx, c, r) {
    ctx.fillStyle = c[0];
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 14; i++) {
      const x = r() * S;
      const y = r() * S;
      ctx.fillStyle = c[2];
      ctx.beginPath();
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const rr = 14 + r() * 14;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.fill();
      ctx.fillStyle = c[1];
      ctx.beginPath();
      ctx.arc(x, y, 8 + r() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  damascus(ctx, c, r) {
    ctx.fillStyle = c[0];
    ctx.fillRect(0, 0, S, S);
    const n = noiseField(S, Math.floor(r() * 1e6), 3, 4);
    const img = ctx.getImageData(0, 0, S, S);
    const b = hexToRgb(c[1]);
    for (let i = 0; i < n.length; i++) {
      const y = Math.floor(i / S);
      if (Math.sin(y * 0.25 + n[i] * 20) > 0.3) {
        img.data[i * 4] = b[0];
        img.data[i * 4 + 1] = b[1];
        img.data[i * 4 + 2] = b[2];
      }
    }
    ctx.putImageData(img, 0, 0);
  },
  doppler(ctx, c, r) {
    painters.marble(ctx, [c[2], c[1], c[0]], r);
    const g = ctx.createRadialGradient(S * 0.3, S * 0.3, 10, S / 2, S / 2, S * 0.8);
    g.addColorStop(0, c[0] + 'aa');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  },
};

function shade(ctx, r, k) {
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, `rgba(255,255,255,${k})`);
  g.addColorStop(1, `rgba(0,0,0,${k})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
}

function applyWear(ctx, wear, seed) {
  if (wear < 0.07) return;
  const r = mulberry(seed + 99);
  const n = Math.floor(wear * 260);
  ctx.strokeStyle = 'rgba(160,160,160,0.55)';
  for (let i = 0; i < n; i++) {
    ctx.lineWidth = 0.5 + r() * 1.5;
    const x = r() * S;
    const y = r() * S;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 8);
    ctx.stroke();
  }
  if (wear > 0.38) {
    const nf = noiseField(S, seed, 6, 4);
    const img = ctx.getImageData(0, 0, S, S);
    for (let i = 0; i < nf.length; i++) {
      if (nf[i] > 1.05 - wear * 0.9) {
        img.data[i * 4] = img.data[i * 4] * 0.4 + 70;
        img.data[i * 4 + 1] = img.data[i * 4 + 1] * 0.4 + 70;
        img.data[i * 4 + 2] = img.data[i * 4 + 2] * 0.4 + 72;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
}

const patCache = new Map();
/** Canvas se vzorem úpravy (cache). */
export function finishCanvas(finishId, seed = 1, wear = 0) {
  const wb = Math.round(wear * 10);
  const key = `${finishId}|${seed % 8}|${wb}`;
  if (patCache.has(key)) return patCache.get(key);
  const f = FINISHES[finishId] || FINISHES.strakata;
  const c = canvas(S);
  const ctx = c.getContext('2d');
  painters[f.p](ctx, f.c, mulberry(seed % 8 + 1 + finishId.length * 31));
  applyWear(ctx, wb / 10, seed);
  patCache.set(key, c);
  return c;
}
const texCache = new Map();
export function finishTexture(finishId, seed = 1, wear = 0) {
  const key = `${finishId}|${seed % 8}|${Math.round(wear * 10)}`;
  if (!texCache.has(key)) {
    const t = toTexture(finishCanvas(finishId, seed, wear), 1);
    texCache.set(key, t);
  }
  return texCache.get(key);
}

/* ================= agenti, nože, rukavice, krávy ================= */

export const AGENTS = {
  t_default: { name: 'Vaječník', side: 'T', uniform: '#e9e1c8', vest: '#8a7a50', head: 'balaclava', headColor: '#ffd23f', skin: '#e0b48f' },
  ct_default: { name: 'Kravař', side: 'CT', uniform: 'cow', vest: '#2f3640', head: 'helmet', headColor: '#2f3640', skin: '#e8c0a0' },
  farmarka: { name: 'Farmářka Jana', side: 'T', uniform: '#5a7ab8', vest: '#a0522d', head: 'hat', headColor: '#c9a46a', hair: '#7a3b14', ponytail: true, skin: '#f0c8a8' },
  kosmonaut: { name: 'Kosmonaut Bučislav', side: 'CT', uniform: '#f2f2f2', vest: '#d0d4da', head: 'astro', headColor: '#ffffff', skin: '#e8c0a0' },
  rytir: { name: 'Rytíř Rohatý', side: 'CT', uniform: '#8a95a6', vest: '#5a6170', head: 'horns', headColor: '#9aa4b5', skin: '#e8c0a0' },
  ninja: { name: 'Ninja Žloutek', side: 'T', uniform: '#1a1a1a', vest: '#2a2a2a', head: 'balaclava', headColor: '#111111', skin: '#e0b48f', accent: '#ffc21a' },
  hasic: { name: 'Hasič Mléko', side: 'CT', uniform: '#3a3f2a', vest: '#d6c24a', head: 'helmet', headColor: '#c0281c', skin: '#d8a882' },
  pilotka: { name: 'Pilotka Bětka', side: 'CT', uniform: '#4a5a3a', vest: '#6b4423', head: 'cap', headColor: '#3a4a2a', hair: '#e2b04a', ponytail: true, skin: '#f0c8a8' },
  kovboj: { name: 'Kovboj Strakáč', side: 'T', uniform: '#7a5530', vest: '#4a3320', head: 'hat', headColor: '#5a3a1a', skin: '#c99a72' },
  kuchar: { name: 'Kuchař Omeleta', side: 'T', uniform: '#ffffff', vest: '#e0e0e0', head: 'chef', headColor: '#ffffff', skin: '#e8c0a0' },
  potapecka: { name: 'Potápěčka Vemínko', side: 'CT', uniform: '#1f3f6a', vest: '#ff8a00', head: 'astro', headColor: '#ffe27a', hair: '#1a1a1a', ponytail: true, skin: '#c99a72' },
  robot: { name: 'Robot KRV-9', side: 'T', uniform: '#7d838c', vest: '#3a3d42', head: 'robot', headColor: '#9aa0a8', skin: '#9aa0a8', accent: '#ff3a3a' },
  vojacka: { name: 'Seržantka Strakatá', side: 'CT', uniform: 'cow', vest: '#3f4a2a', head: 'helmet', headColor: '#4a5a3a', hair: '#3b2416', ponytail: true, skin: '#e8c0a0' },
  saman: { name: 'Šaman Seník', side: 'T', uniform: '#8a6a3a', vest: '#d9b65a', head: 'horns', headColor: '#d9b65a', skin: '#c99a72' },
};

export const KNIFE_MODELS = { kravar: 'Nůž Kravař', karambit: 'Karambit', motylek: 'Motýlek', bajonet: 'Bajonet' };

/* ================= definice předmětů ================= */

export const ITEMS = {};
function addItem(id, o) {
  ITEMS[id] = { id, ...o };
  return id;
}
function wItem(weapon, finish, rarity) {
  const w = BY_ID[weapon];
  return addItem(`w_${weapon}_${finish}`, { type: 'weapon', weapon, finish, rarity, name: `${w.name} | ${FINISHES[finish].name}` });
}
function kItem(model, finish) {
  return addItem(`k_${model}_${finish}`, { type: 'knife', model, finish, rarity: 'gold', name: `★ ${KNIFE_MODELS[model]} | ${FINISHES[finish].name}` });
}
function gItem(finish) {
  return addItem(`g_${finish}`, { type: 'gloves', finish, rarity: 'gold', name: `★ Rukavice | ${FINISHES[finish].name}` });
}
function cItem(finish, rarity) {
  return addItem(`c_${finish}`, { type: 'cow', finish, rarity, name: `Kráva | ${FINISHES[finish].name}` });
}
function aItem(agent, rarity) {
  return addItem(`a_${agent}`, { type: 'agent', agent, rarity, name: `Agent | ${AGENTS[agent].name}` });
}

const goldKnives = ['karambit', 'motylek', 'bajonet', 'kravar'].flatMap((m) => ['fade', 'gama', 'safir', 'rubin', 'damasek', 'zlate', 'strakata'].map((f) => kItem(m, f)));
const goldGloves = ['karbon', 'kravinec', 'pastvina', 'fade', 'tygr', 'strakata'].map((f) => gItem(f));

export const CASES = {
  vajecna: {
    name: 'Vaječná časka',
    color: '#ffc21a',
    items: [
      wItem('vajglock', 'zloutek', 'mil'), wItem('mp9', 'skorapka', 'mil'), wItem('nova', 'pastvina', 'mil'), wItem('galil', 'pixelzel', 'mil'),
      wItem('famas', 'vlny', 'mil'), wItem('p250', 'velikonoce', 'mil'), wItem('mac10', 'plastev', 'mil'),
      wItem('ump', 'rozbite', 'res'), wItem('fiveseven', 'zloutek', 'res'), wItem('ssg08', 'noc', 'res'), wItem('mp7', 'fade', 'res'), wItem('sawedoff', 'ohen', 'res'),
      wItem('deagle', 'strakata', 'cla'), wItem('m4a1s', 'velikonoce', 'cla'), wItem('aug', 'obvod', 'cla'),
      wItem('ak47', 'zloutek', 'cov'), wItem('awp', 'zlate', 'cov'),
    ],
    gold: goldKnives,
  },
  kravi: {
    name: 'Kraví časka',
    color: '#f4f1ea',
    items: [
      cItem('hneda', 'mil'), cItem('zebra', 'mil'), cItem('pixel', 'mil'), cItem('pastvina', 'mil'), wItem('p2000', 'strakata', 'mil'), wItem('bizon', 'strakata', 'mil'),
      cItem('fialka', 'res'), cItem('mramor', 'res'), cItem('led', 'res'), wItem('xm1014', 'strakata', 'res'), wItem('tec9', 'hneda', 'res'),
      cItem('kosmos', 'cla'), cItem('ohen', 'cla'), wItem('m4a4', 'strakata', 'cla'),
      cItem('duha', 'cov'), cItem('zlate', 'cov'), wItem('awp', 'strakata', 'cov'),
    ],
    gold: goldGloves,
  },
  pastevecka: {
    name: 'Pastevecká časka',
    color: '#6b8f3a',
    items: [
      wItem('usp', 'pastvina', 'mil'), wItem('mag7', 'kravinec', 'mil'), wItem('p90', 'poust', 'mil'), wItem('g3sg1', 'pastvina', 'mil'), wItem('negev', 'kravinec', 'mil'),
      wItem('scar20', 'pixel', 'mil'), wItem('cz75', 'byk', 'mil'),
      wItem('sg553', 'tygr', 'res'), wItem('mp5', 'mata', 'res'), wItem('dualies', 'sach', 'res'), wItem('ar15', 'poust', 'res'), wItem('spas', 'karbon', 'res'),
      wItem('ak47', 'kravinec', 'cla'), wItem('groza', 'lava', 'cla'), wItem('r8', 'zebra', 'cla'),
      wItem('m4a4', 'ohen', 'cov'), wItem('m249', 'duha', 'cov'),
    ],
    gold: goldKnives,
  },
  agentni: {
    name: 'Agentní časka',
    color: '#4b69ff',
    items: [
      aItem('farmarka', 'res'), aItem('kovboj', 'res'), aItem('hasic', 'res'), aItem('kuchar', 'res'),
      aItem('pilotka', 'cla'), aItem('ninja', 'cla'), aItem('vojacka', 'cla'), aItem('saman', 'cla'),
      aItem('kosmonaut', 'cov'), aItem('rytir', 'cov'), aItem('potapecka', 'cov'), aItem('robot', 'cov'),
      wItem('skorpion', 'obvod', 'mil'), wItem('scar', 'modra', 'mil'), wItem('mosin', 'mramor', 'mil'),
    ],
    gold: goldGloves,
  },
  zlata: {
    name: 'Zlatá časka',
    color: '#e4ae39',
    items: [
      wItem('usp', 'fade', 'res'), wItem('vajglock', 'fade', 'res'), wItem('p250', 'safir', 'res'), wItem('mp9', 'rubin', 'res'),
      wItem('deagle', 'zlate', 'cla'), wItem('ak47', 'fade', 'cla'), wItem('m4a1s', 'kosmos', 'cla'), wItem('ssg08', 'zlate', 'cla'),
      wItem('awp', 'duha', 'cov'), wItem('ak47', 'duha', 'cov'), cItem('lava', 'cov'),
    ],
    gold: [...goldKnives, ...goldGloves],
    rare: true,
  },
};
for (const [id, c] of Object.entries(CASES)) {
  c.id = id;
  addItem(`case_${id}`, { type: 'case', case: id, rarity: 'mil', name: c.name });
}
addItem('key', { type: 'key', rarity: 'mil', name: 'Klíč ke čásce' });

/** Losování obsahu časky. */
export function rollCase(caseId, rnd = Math.random) {
  const c = CASES[caseId];
  const weights = { ...Object.fromEntries(RARITY_ORDER.map((r) => [r, RARITIES[r].weight])) };
  if (c.rare) {
    weights.mil = 0;
    weights.res *= 2;
    weights.gold *= 2;
  }
  const avail = RARITY_ORDER.filter((r) => (r === 'gold' ? c.gold.length : c.items.some((i) => ITEMS[i].rarity === r)) && weights[r] > 0);
  const total = avail.reduce((s, r) => s + weights[r], 0);
  let x = rnd() * total;
  let rar = avail[0];
  for (const r of avail) {
    x -= weights[r];
    if (x <= 0) {
      rar = r;
      break;
    }
  }
  const pool = rar === 'gold' ? c.gold : c.items.filter((i) => ITEMS[i].rarity === rar);
  const def = pool[Math.floor(rnd() * pool.length)];
  return makeInstance(def, rnd);
}

let uidCounter = Date.now() % 1e9;
export function makeInstance(def, rnd = Math.random) {
  const d = ITEMS[def];
  const inst = { uid: (uidCounter++).toString(36) + Math.floor(rnd() * 1e6).toString(36), def };
  if (['weapon', 'knife', 'gloves', 'cow'].includes(d.type)) {
    inst.wear = Math.round(Math.pow(rnd(), 1.4) * 1000) / 1000;
    inst.seed = Math.floor(rnd() * 1000);
    if ((d.type === 'weapon' || d.type === 'knife') && rnd() < 0.1) inst.st = 0;
  }
  return inst;
}

export function instName(inst) {
  const d = ITEMS[inst.def];
  return (inst.st !== undefined ? 'KravTrak™ ' : '') + d.name;
}

/* ================= tržní cena ================= */

const BASE_PRICE = { mil: 40, res: 220, cla: 900, cov: 3800, gold: 16000 };
export function basePrice(defId, wear = 0.2, st = false) {
  const d = ITEMS[defId];
  if (d.type === 'case') return CASES[d.case].rare ? 420 : 90;
  if (d.type === 'key') return 250;
  let p = BASE_PRICE[d.rarity];
  if (d.type === 'agent') p *= 1.3;
  if (wear !== undefined) p *= 1.6 - Math.min(wear, 1) * 1.1;
  if (st) p *= 2.2;
  // každý předmět má trochu jinou „oblibu“
  let h = 0;
  for (const ch of defId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  p *= 0.7 + (h % 1000) / 1000 * 0.8;
  return Math.max(5, Math.round(p));
}

/* ================= náhledy (2D karty) ================= */

function gunSilhouette(ctx, cat, w, h) {
  ctx.beginPath();
  const y = h * 0.42;
  if (cat === 'pistol') {
    ctx.rect(w * 0.25, y - 14, w * 0.5, 18);
    ctx.moveTo(w * 0.58, y);
    ctx.lineTo(w * 0.72, y);
    ctx.lineTo(w * 0.78, y + 40);
    ctx.lineTo(w * 0.64, y + 40);
    ctx.closePath();
  } else if (cat === 'knife') {
    ctx.moveTo(w * 0.15, y);
    ctx.quadraticCurveTo(w * 0.35, y - 26, w * 0.6, y - 6);
    ctx.lineTo(w * 0.6, y + 8);
    ctx.lineTo(w * 0.15, y + 6);
    ctx.closePath();
    ctx.rect(w * 0.6, y - 6, w * 0.25, 16);
  } else if (cat === 'gloves') {
    ctx.ellipse(w * 0.5, h * 0.5, w * 0.17, h * 0.24, 0, 0, Math.PI * 2);
    for (let i = 0; i < 4; i++) ctx.rect(w * 0.37 + i * w * 0.07, h * 0.12, w * 0.05, h * 0.2);
  } else {
    const L = cat === 'sniper' ? 0.86 : cat === 'smg' ? 0.6 : 0.78;
    const x0 = w * (0.5 - L / 2);
    ctx.rect(x0, y - 10, w * L * 0.62, 20);
    ctx.rect(x0 + w * L * 0.62, y - 4, w * L * 0.38, 8);
    ctx.moveTo(x0 + w * L * 0.18, y + 10);
    ctx.lineTo(x0 + w * L * 0.26, y + 10);
    ctx.lineTo(x0 + w * L * 0.22, y + 38);
    ctx.lineTo(x0 + w * L * 0.14, y + 38);
    ctx.closePath();
    ctx.moveTo(x0 + w * L * 0.36, y + 10);
    ctx.lineTo(x0 + w * L * 0.44, y + 10);
    ctx.lineTo(x0 + w * L * 0.48, y + 34);
    ctx.lineTo(x0 + w * L * 0.4, y + 36);
    ctx.closePath();
    ctx.moveTo(x0, y - 10);
    ctx.lineTo(x0 - w * 0.06, y + 22);
    ctx.lineTo(x0 + 6, y + 22);
    ctx.lineTo(x0 + 6, y + 10);
    ctx.closePath();
    if (cat === 'sniper') ctx.rect(x0 + w * L * 0.25, y - 22, w * L * 0.28, 10);
  }
}

function cowSilhouette(ctx, w, h) {
  ctx.beginPath();
  ctx.roundRect(w * 0.2, h * 0.3, w * 0.5, h * 0.3, 14);
  ctx.roundRect(w * 0.66, h * 0.2, w * 0.17, h * 0.22, 8);
  for (const x of [0.24, 0.34, 0.54, 0.62]) ctx.rect(w * x, h * 0.58, w * 0.05, h * 0.22);
}

export function drawItemPreview(c, inst) {
  const d = ITEMS[inst.def];
  const ctx = c.getContext('2d');
  const w = c.width;
  const h = c.height;
  ctx.clearRect(0, 0, w, h);
  const rar = RARITIES[d.rarity];
  const bg = ctx.createRadialGradient(w / 2, h / 2, 5, w / 2, h / 2, w * 0.7);
  bg.addColorStop(0, rar.color + '55');
  bg.addColorStop(1, 'rgba(20,22,30,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  if (d.type === 'case') {
    const cs = CASES[d.case];
    ctx.fillStyle = cs.color;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(w * 0.2, h * 0.25, w * 0.6, h * 0.5, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.fillRect(w * 0.2, h * 0.45, w * 0.6, 4);
    ctx.font = `${Math.round(h * 0.28)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.case === 'kravi' ? '🐮' : d.case === 'agentni' ? '🪖' : '🥚', w / 2, h * 0.62);
    return;
  }
  if (d.type === 'key') {
    ctx.font = `${Math.round(h * 0.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔑', w / 2, h / 2);
    return;
  }
  if (d.type === 'agent') {
    const a = AGENTS[d.agent];
    const cx = w / 2;
    ctx.fillStyle = a.uniform === 'cow' ? '#eeeeee' : a.uniform;
    ctx.fillRect(cx - 18, h * 0.32, 36, h * 0.34);
    ctx.fillStyle = a.vest;
    ctx.fillRect(cx - 20, h * 0.34, 40, h * 0.18);
    ctx.fillStyle = a.uniform === 'cow' ? '#333' : a.uniform;
    ctx.fillRect(cx - 16, h * 0.66, 13, h * 0.24);
    ctx.fillRect(cx + 3, h * 0.66, 13, h * 0.24);
    ctx.fillStyle = a.skin;
    ctx.beginPath();
    ctx.arc(cx, h * 0.24, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = a.headColor;
    ctx.beginPath();
    if (a.head === 'astro') {
      ctx.globalAlpha = 0.6;
      ctx.arc(cx, h * 0.24, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (a.head === 'hat') {
      ctx.fillRect(cx - 22, h * 0.17, 44, 5);
      ctx.fillRect(cx - 12, h * 0.08, 24, 12);
    } else ctx.arc(cx, h * 0.21, 14, Math.PI, 0);
    ctx.fill();
    if (a.ponytail) {
      ctx.fillStyle = a.hair;
      ctx.fillRect(cx + 9, h * 0.22, 6, 18);
    }
    return;
  }
  const pat = finishCanvas(d.finish, inst.seed || 1, inst.wear || 0);
  ctx.save();
  if (d.type === 'cow') cowSilhouette(ctx, w, h);
  else gunSilhouette(ctx, d.type === 'weapon' ? BY_ID[d.weapon].cat : d.type, w, h);
  ctx.clip();
  ctx.drawImage(pat, 0, 0, w, h);
  ctx.restore();
  ctx.save();
  if (d.type === 'cow') cowSilhouette(ctx, w, h);
  else gunSilhouette(ctx, d.type === 'weapon' ? BY_ID[d.weapon].cat : d.type, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

export function allWeaponSkinIds() {
  return Object.values(ITEMS).filter((i) => i.type === 'weapon').map((i) => i.id);
}
export { WEAPONS };
