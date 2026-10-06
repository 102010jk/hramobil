// 40 zbraní + nůž + granáty. Statistiky volně podle CS, jména na téma Vaječná kráva.
import * as THREE from './vendor/three.module.min.js';

// cat: pistol | smg | rifle | sniper | shotgun | heavy
// side: T (Vaječníci) | CT (Kravaři) | both
const W = (id, name, cat, side, o) => ({ id, name, cat, side, ...o });

export const WEAPONS = [
  // ---------- pistole ----------
  W('vajglock', 'Vajglock-18', 'pistol', 'T', { price: 200, dmg: 30, rate: 6.6, mag: 20, reserve: 120, spread: 0.01, recoil: 0.012, pen: 0.47, reload: 2.2, m: { type: 'pistol', len: 0.19, color: '#2b2d31' } }),
  W('usp', 'USP-S Bučák', 'pistol', 'CT', { price: 200, dmg: 35, rate: 5.7, mag: 12, reserve: 24, spread: 0.006, recoil: 0.016, pen: 0.5, reload: 2.2, sil: true, m: { type: 'pistol', len: 0.21, sil: true, color: '#1f2226' } }),
  W('p2000', 'P2000 Telátko', 'pistol', 'CT', { price: 200, dmg: 35, rate: 5.7, mag: 13, reserve: 52, spread: 0.008, recoil: 0.016, pen: 0.5, reload: 2.2, m: { type: 'pistol', len: 0.19, color: '#2b2d31' } }),
  W('p250', 'P250 Žloutek', 'pistol', 'both', { price: 300, dmg: 38, rate: 6.6, mag: 13, reserve: 26, spread: 0.011, recoil: 0.02, pen: 0.64, reload: 2.2, m: { type: 'pistol', len: 0.18, color: '#3a3a3a' } }),
  W('fiveseven', 'Five-Kráva', 'pistol', 'CT', { price: 500, dmg: 32, rate: 6.6, mag: 20, reserve: 100, spread: 0.009, recoil: 0.018, pen: 0.91, reload: 2.2, m: { type: 'pistol', len: 0.2, color: '#4a4f57' } }),
  W('tec9', 'Tec-9 Skořápka', 'pistol', 'T', { price: 500, dmg: 33, rate: 8.3, mag: 18, reserve: 90, spread: 0.014, recoil: 0.02, pen: 0.9, reload: 2.5, m: { type: 'machinepistol', len: 0.28, color: '#2f3134' } }),
  W('cz75', 'CZ75 Kravíček', 'pistol', 'both', { price: 500, dmg: 31, rate: 10, auto: true, mag: 12, reserve: 12, spread: 0.012, recoil: 0.02, pen: 0.78, reload: 2.7, m: { type: 'pistol', len: 0.2, color: '#26282c' } }),
  W('dualies', 'Dvojčata Vajíčka', 'pistol', 'both', { price: 300, dmg: 38, rate: 8.3, mag: 30, reserve: 120, spread: 0.014, recoil: 0.02, pen: 0.58, reload: 3.8, m: { type: 'dual', len: 0.2, color: '#9aa0a8' } }),
  W('deagle', 'Pouštní Kráva', 'pistol', 'both', { price: 700, dmg: 63, rate: 3.75, mag: 7, reserve: 35, spread: 0.008, recoil: 0.06, pen: 0.93, reload: 2.2, m: { type: 'pistol', len: 0.26, big: true, color: '#7d838c' } }),
  W('r8', 'R8 Rančer', 'pistol', 'both', { price: 600, dmg: 86, rate: 2, mag: 8, reserve: 8, spread: 0.006, recoil: 0.07, pen: 0.93, reload: 2.3, m: { type: 'revolver', len: 0.27, color: '#5a5f66' } }),
  // ---------- samopaly ----------
  W('mac10', 'MAC-10 Míchanice', 'smg', 'T', { price: 1050, dmg: 29, rate: 13.3, auto: true, mag: 30, reserve: 100, spread: 0.02, recoil: 0.01, pen: 0.57, reload: 2.6, m: { type: 'smg', len: 0.32, mag: 'straight', stock: 'wire', color: '#2b2d31' } }),
  W('mp9', 'MP9 Mlékař', 'smg', 'CT', { price: 1250, dmg: 26, rate: 14.3, auto: true, mag: 30, reserve: 120, spread: 0.018, recoil: 0.01, pen: 0.6, reload: 2.1, m: { type: 'smg', len: 0.42, mag: 'straight', stock: 'fold', color: '#2f3134' } }),
  W('mp7', 'MP7 Mléčňák', 'smg', 'both', { price: 1500, dmg: 29, rate: 13.3, auto: true, mag: 30, reserve: 120, spread: 0.014, recoil: 0.01, pen: 0.62, reload: 3.1, m: { type: 'smg', len: 0.45, mag: 'straight', stock: 'wire', color: '#3a3a3a' } }),
  W('mp5', 'MP5-SD Šepot pastvin', 'smg', 'both', { price: 1500, dmg: 27, rate: 13.3, auto: true, mag: 30, reserve: 120, spread: 0.013, recoil: 0.009, pen: 0.62, reload: 2.6, sil: true, m: { type: 'smg', len: 0.55, mag: 'curved', stock: 'solid', sil: true, color: '#26282c' } }),
  W('ump', 'UMP-45 Vemeno', 'smg', 'both', { price: 1200, dmg: 35, rate: 11.1, auto: true, mag: 25, reserve: 100, spread: 0.015, recoil: 0.012, pen: 0.65, reload: 3.5, m: { type: 'smg', len: 0.6, mag: 'straight', stock: 'solid', color: '#3d3f42' } }),
  W('p90', 'P90 Pastevec', 'smg', 'both', { price: 2350, dmg: 26, rate: 14.3, auto: true, mag: 50, reserve: 100, spread: 0.016, recoil: 0.009, pen: 0.69, reload: 3.3, reward: 300, m: { type: 'p90', len: 0.5, color: '#4a4c3f' } }),
  W('bizon', 'Bizon Býček', 'smg', 'both', { price: 1400, dmg: 27, rate: 13.3, auto: true, mag: 64, reserve: 120, spread: 0.017, recoil: 0.009, pen: 0.57, reload: 2.4, m: { type: 'smg', len: 0.62, mag: 'helical', stock: 'fold', color: '#2b2d31' } }),
  W('skorpion', 'Škorpion Býk', 'smg', 'T', { price: 1300, dmg: 25, rate: 15, auto: true, mag: 30, reserve: 90, spread: 0.019, recoil: 0.01, pen: 0.55, reload: 2.4, m: { type: 'smg', len: 0.35, mag: 'curved', stock: 'wire', color: '#353535' } }),
  // ---------- pušky ----------
  W('galil', 'Galil Gazdina', 'rifle', 'T', { price: 1800, dmg: 30, rate: 11.1, auto: true, mag: 35, reserve: 90, spread: 0.006, recoil: 0.018, pen: 0.77, reload: 3, m: { type: 'rifle', len: 0.95, mag: 'curved', stock: 'solid', color: '#3f4436' } }),
  W('famas', 'FAMAS Farmář', 'rifle', 'CT', { price: 2050, dmg: 30, rate: 11.1, auto: true, mag: 25, reserve: 90, spread: 0.006, recoil: 0.016, pen: 0.7, reload: 3.3, m: { type: 'bullpup', len: 0.76, mag: 'straight', handle: true, color: '#2f3134' } }),
  W('ak47', 'AK-47 Bučák', 'rifle', 'T', { price: 2700, dmg: 36, rate: 10, auto: true, mag: 30, reserve: 90, spread: 0.0035, recoil: 0.022, pen: 0.775, reload: 2.5, m: { type: 'rifle', len: 0.88, mag: 'curved', stock: 'solid', wood: true, color: '#2b2d31' } }),
  W('m4a4', 'M4A4 Mléčný', 'rifle', 'CT', { price: 3100, dmg: 33, rate: 11.1, auto: true, mag: 30, reserve: 90, spread: 0.0035, recoil: 0.017, pen: 0.7, reload: 3.1, m: { type: 'rifle', len: 0.84, mag: 'straight', stock: 'solid', rail: true, color: '#26282c' } }),
  W('m4a1s', 'M4A1-S Tichá Bětka', 'rifle', 'CT', { price: 2900, dmg: 38, rate: 10, auto: true, mag: 20, reserve: 80, spread: 0.003, recoil: 0.015, pen: 0.7, reload: 3.1, sil: true, m: { type: 'rifle', len: 0.84, mag: 'straight', stock: 'solid', sil: true, rail: true, color: '#26282c' } }),
  W('sg553', 'SG 553 Senoseč', 'rifle', 'T', { price: 3000, dmg: 30, rate: 9.4, auto: true, mag: 30, reserve: 90, spread: 0.003, recoil: 0.018, pen: 1, reload: 2.8, scope: [55], m: { type: 'rifle', len: 0.92, mag: 'curved', stock: 'fold', scope: 'short', color: '#4a4c3f' } }),
  W('aug', 'AUG Ovčák', 'rifle', 'CT', { price: 3300, dmg: 28, rate: 9.4, auto: true, mag: 30, reserve: 90, spread: 0.003, recoil: 0.016, pen: 0.9, reload: 3.8, scope: [55], m: { type: 'bullpup', len: 0.79, mag: 'straight', scope: 'short', color: '#5a6b4a' } }),
  W('ar15', 'AR-15 Pastvina', 'rifle', 'both', { price: 2500, dmg: 32, rate: 10.5, auto: true, mag: 30, reserve: 90, spread: 0.0045, recoil: 0.018, pen: 0.72, reload: 3, m: { type: 'rifle', len: 0.86, mag: 'straight', stock: 'wire', rail: true, color: '#7a6a50' } }),
  W('groza', 'Groza Hromová kráva', 'rifle', 'T', { price: 2600, dmg: 34, rate: 11.7, auto: true, mag: 30, reserve: 90, spread: 0.005, recoil: 0.02, pen: 0.75, reload: 2.8, m: { type: 'bullpup', len: 0.62, mag: 'curved', handle: false, color: '#3a3d33' } }),
  W('scar', 'SCAR Stádo', 'rifle', 'both', { price: 2800, dmg: 40, rate: 8.3, auto: true, mag: 20, reserve: 80, spread: 0.004, recoil: 0.024, pen: 0.8, reload: 3, m: { type: 'rifle', len: 0.9, mag: 'straight', stock: 'fold', rail: true, color: '#b59a6a' } }),
  // ---------- odstřelovačky ----------
  W('awp', 'AWP Vaječný drak', 'sniper', 'both', { price: 4750, dmg: 115, rate: 0.68, mag: 5, reserve: 30, spread: 0.0006, unscoped: 0.09, recoil: 0.09, pen: 0.97, reload: 3.6, speed: 0.78, reward: 100, scope: [40, 15], m: { type: 'sniper', len: 1.15, mag: 'box', stock: 'thumb', scope: 'long', color: '#3f5a3a' } }),
  W('ssg08', 'SSG 08 Skřivan', 'sniper', 'both', { price: 1700, dmg: 88, rate: 0.8, mag: 10, reserve: 90, spread: 0.001, unscoped: 0.04, recoil: 0.05, pen: 0.85, reload: 3.7, speed: 0.96, scope: [40, 15], m: { type: 'sniper', len: 1.0, mag: 'box', stock: 'solid', scope: 'long', color: '#5a6170' } }),
  W('scar20', 'SCAR-20 Senník', 'sniper', 'CT', { price: 5000, dmg: 80, rate: 4, auto: true, mag: 20, reserve: 90, spread: 0.0012, unscoped: 0.06, recoil: 0.03, pen: 0.83, reload: 3.1, speed: 0.8, scope: [40, 15], m: { type: 'sniper', len: 1.05, mag: 'straight', stock: 'solid', scope: 'long', rail: true, color: '#2b2d31' } }),
  W('g3sg1', 'G3SG1 Gazda', 'sniper', 'T', { price: 5000, dmg: 80, rate: 4, auto: true, mag: 20, reserve: 90, spread: 0.0012, unscoped: 0.06, recoil: 0.03, pen: 0.83, reload: 4.7, speed: 0.8, scope: [40, 15], m: { type: 'sniper', len: 1.08, mag: 'straight', stock: 'solid', scope: 'long', color: '#3a3d33' } }),
  W('mosin', 'Mosin Mléčná dráha', 'sniper', 'both', { price: 2000, dmg: 95, rate: 0.9, mag: 5, reserve: 30, spread: 0.0008, unscoped: 0.07, recoil: 0.07, pen: 0.9, reload: 3.4, speed: 0.88, scope: [40], m: { type: 'sniper', len: 1.2, mag: 'none', stock: 'solid', scope: 'long', wood: true, color: '#2b2d31' } }),
  // ---------- brokovnice ----------
  W('nova', 'Nova Novotelé', 'shotgun', 'both', { price: 1050, dmg: 26, pellets: 9, rate: 1.1, mag: 8, reserve: 32, spread: 0.07, recoil: 0.05, pen: 0.5, reload: 3.6, reward: 900, m: { type: 'shotgun', len: 0.95, mag: 'tube', stock: 'solid', color: '#2b2d31' } }),
  W('xm1014', 'XM1014 Vejcomet', 'shotgun', 'both', { price: 2000, dmg: 20, pellets: 6, rate: 2.85, auto: true, mag: 7, reserve: 32, spread: 0.06, recoil: 0.04, pen: 0.8, reload: 3.4, reward: 900, m: { type: 'shotgun', len: 1.0, mag: 'tube', stock: 'solid', rail: true, color: '#26282c' } }),
  W('mag7', 'MAG-7 Máselnice', 'shotgun', 'CT', { price: 1300, dmg: 30, pellets: 8, rate: 1.2, mag: 5, reserve: 32, spread: 0.055, recoil: 0.06, pen: 0.75, reload: 2.5, reward: 900, m: { type: 'shotgun', len: 0.7, mag: 'straight', stock: 'fold', color: '#3d3f42' } }),
  W('sawedoff', 'Upilovaná Kravka', 'shotgun', 'T', { price: 1100, dmg: 32, pellets: 8, rate: 1.2, mag: 7, reserve: 32, spread: 0.1, recoil: 0.06, pen: 0.75, reload: 3.6, reward: 900, m: { type: 'shotgun', len: 0.6, mag: 'tube', stock: 'none', wood: true, color: '#3a3a3a' } }),
  W('spas', 'SPAS Stádník', 'shotgun', 'both', { price: 1800, dmg: 24, pellets: 8, rate: 1.5, mag: 8, reserve: 32, spread: 0.065, recoil: 0.05, pen: 0.7, reload: 3.8, reward: 900, m: { type: 'shotgun', len: 0.95, mag: 'tube', stock: 'fold', color: '#1f2226' } }),
  // ---------- těžké ----------
  W('m249', 'M249 Mlékovod', 'heavy', 'both', { price: 5200, dmg: 32, rate: 12.5, auto: true, mag: 100, reserve: 200, spread: 0.02, recoil: 0.014, pen: 0.8, reload: 5.7, speed: 0.75, m: { type: 'lmg', len: 1.0, mag: 'box', stock: 'solid', color: '#3a3d33' } }),
  W('negev', 'Negev Neděle', 'heavy', 'both', { price: 1700, dmg: 35, rate: 13.3, auto: true, mag: 150, reserve: 300, spread: 0.03, recoil: 0.012, pen: 0.71, reload: 5.7, speed: 0.72, m: { type: 'lmg', len: 1.0, mag: 'drum', stock: 'solid', color: '#2b2d31' } }),
];

export const BY_ID = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));

const SPEED = { pistol: 1, smg: 0.97, rifle: 0.88, sniper: 0.8, shotgun: 0.9, heavy: 0.75 };
const REWARD = { pistol: 300, smg: 600, rifle: 300, sniper: 300, shotgun: 900, heavy: 300 };
for (const w of WEAPONS) {
  w.speed ??= SPEED[w.cat];
  w.reward ??= REWARD[w.cat];
  w.slot = w.cat === 'pistol' ? 'secondary' : 'primary';
  w.range ??= w.cat === 'shotgun' ? 0.7 : w.cat === 'pistol' ? 0.88 : w.cat === 'smg' ? 0.85 : 0.97; // násobek poškození na 10 m
  w.pellets ??= 1;
  w.auto ??= false;
  w.moveSpread = w.cat === 'sniper' ? 0.12 : w.cat === 'rifle' ? 0.06 : w.cat === 'heavy' ? 0.07 : 0.03;
}

export const KNIFE = { id: 'knife', name: 'Nůž', cat: 'knife', slot: 'knife', dmg: 40, stab: 65, rate: 2.5, range: 1.9, speed: 1.05 };

export const GRENADES = {
  he: { id: 'he', name: 'Vaječný granát', price: 300 },
  flash: { id: 'flash', name: 'Žloutkový záblesk', price: 200 },
  smoke: { id: 'smoke', name: 'Mléčný dým', price: 300 },
};

export const EQUIPMENT = {
  kevlar: { name: 'Vesta', price: 650 },
  helmet: { name: 'Vesta + helma', price: 1000 },
  kit: { name: 'Zneškodňovací sada', price: 400 },
};

export const CAT_NAMES = { pistol: 'Pistole', smg: 'Samopaly', rifle: 'Pušky', sniper: 'Odstřelovačky', shotgun: 'Brokovnice', heavy: 'Těžké' };

/* ================= 3D modely zbraní ================= */

const darkMetal = new THREE.MeshStandardMaterial({ color: '#1d1f22', metalness: 0.85, roughness: 0.35 });
const polymer = new THREE.MeshStandardMaterial({ color: '#2a2b2d', metalness: 0.1, roughness: 0.75 });
const woodMat = new THREE.MeshStandardMaterial({ color: '#7a4a24', metalness: 0, roughness: 0.6 });
const glass = new THREE.MeshStandardMaterial({ color: '#6fb7ff', metalness: 0.9, roughness: 0.05, emissive: '#0a2040' });
const boxG = new THREE.BoxGeometry(1, 1, 1);
const cylG = new THREE.CylinderGeometry(1, 1, 1, 14);

function box(mat, sx, sy, sz, x, y, z, rx = 0) {
  const m = new THREE.Mesh(boxG, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.rotation.x = rx;
  return m;
}
function cyl(mat, r, len, x, y, z, axis = 'z') {
  const m = new THREE.Mesh(cylG, mat);
  m.scale.set(r, len, r);
  m.position.set(x, y, z);
  if (axis === 'z') m.rotation.x = Math.PI / 2;
  return m;
}

function bodyMat(def, skinTex) {
  if (skinTex) return new THREE.MeshStandardMaterial({ map: skinTex, metalness: 0.35, roughness: 0.45 });
  return new THREE.MeshStandardMaterial({ color: def.m?.color || '#2b2d31', metalness: 0.5, roughness: 0.5 });
}

/**
 * Model zbraně, hlaveň míří do -Z, počátek = rukojeť.
 * userData.muzzle = místo výstřelu.
 */
export function buildGun(def, skinTex = null) {
  const g = new THREE.Group();
  const m = def.m || {};
  const body = bodyMat(def, skinTex);
  const furn = m.wood ? (skinTex ? body : woodMat) : body;
  const muzzle = new THREE.Object3D();
  const L = m.len || 0.8;

  if (m.type === 'pistol' || m.type === 'revolver' || m.type === 'dual' || m.type === 'machinepistol') {
    const mk = (ox) => {
      const p = new THREE.Group();
      const big = m.big ? 1.25 : 1;
      p.add(box(body, 0.034 * big, 0.038 * big, L, ox, 0.03, -L / 2 + 0.03));
      p.add(box(polymer, 0.03, 0.03, L * 0.75, ox, 0.0, -L * 0.4 + 0.03));
      const grip = box(skinTex ? body : polymer, 0.032, 0.11, 0.05, ox, -0.05, 0.02, 0.25);
      p.add(grip);
      if (m.type === 'revolver') p.add(cyl(darkMetal, 0.028, 0.05, ox, 0.03, -0.06));
      if (m.type === 'machinepistol') p.add(box(darkMetal, 0.025, 0.14, 0.035, ox, -0.06, -0.12));
      p.add(cyl(darkMetal, 0.008, 0.04, ox, 0.035, -L + 0.01));
      if (m.sil) p.add(cyl(darkMetal, 0.017, 0.13, ox, 0.035, -L - 0.05));
      return p;
    };
    g.add(mk(0));
    if (m.type === 'dual') g.add(mk(-0.22));
    muzzle.position.set(0, 0.035, -L - (m.sil ? 0.12 : 0.02));
  } else {
    const recLen = m.type === 'bullpup' ? L * 0.6 : m.type === 'p90' ? L * 0.8 : L * 0.42;
    const recH = m.type === 'lmg' ? 0.09 : m.type === 'shotgun' ? 0.065 : 0.07;
    const recZ = m.type === 'bullpup' ? -recLen * 0.35 : -recLen * 0.5 + 0.06;
    // tělo
    g.add(box(body, 0.05, recH, recLen, 0, 0.03, recZ));
    if (m.type === 'p90') g.add(box(skinTex ? body : polymer, 0.055, 0.03, recLen * 0.9, 0, 0.08, recZ));
    // hlaveň
    const barrelLen = m.type === 'bullpup' ? L * 0.35 : m.type === 'p90' ? 0.1 : L * 0.42;
    const barrelZ = recZ - recLen / 2 - barrelLen / 2;
    const bR = m.type === 'shotgun' ? 0.014 : m.type === 'sniper' ? 0.011 : 0.009;
    g.add(cyl(darkMetal, bR, barrelLen, 0, 0.045, barrelZ));
    if (m.type === 'shotgun' && m.mag === 'tube') g.add(cyl(darkMetal, 0.012, barrelLen * 0.85, 0, 0.018, barrelZ + barrelLen * 0.07));
    // předpažbí
    if (m.type !== 'p90' && m.type !== 'bullpup') g.add(box(furn, 0.055, 0.055, barrelLen * 0.55, 0, 0.035, recZ - recLen / 2 - barrelLen * 0.275));
    let tip = barrelZ - barrelLen / 2;
    if (m.sil) {
      g.add(cyl(darkMetal, 0.02, 0.16, 0, 0.045, tip - 0.08));
      tip -= 0.16;
    } else g.add(cyl(darkMetal, 0.014, 0.035, 0, 0.045, tip - 0.015));
    muzzle.position.set(0, 0.045, tip - 0.03);
    // rukojeť
    const gripZ = m.type === 'bullpup' ? recZ - recLen * 0.25 : 0.02;
    g.add(box(skinTex ? body : polymer, 0.035, 0.1, 0.045, 0, -0.05, gripZ, 0.25));
    // zásobník
    const magZ = m.type === 'bullpup' ? recZ + recLen * 0.25 : recZ - recLen * 0.15;
    if (m.mag === 'curved') {
      for (let i = 0; i < 3; i++) g.add(box(darkMetal, 0.03, 0.06, 0.045, 0, -0.02 - i * 0.05, magZ - i * 0.018, -0.3 - i * 0.12));
    } else if (m.mag === 'straight') g.add(box(darkMetal, 0.03, 0.14, 0.04, 0, -0.06, magZ, -0.1));
    else if (m.mag === 'box') g.add(box(m.type === 'lmg' ? polymer : darkMetal, 0.06, 0.09, 0.08, m.type === 'lmg' ? 0.03 : 0, -0.04, magZ));
    else if (m.mag === 'drum') g.add(cyl(polymer, 0.07, 0.06, 0.04, -0.05, magZ, 'x'));
    else if (m.mag === 'helical') g.add(cyl(polymer, 0.03, recLen * 0.9, 0, -0.01, recZ - 0.05));
    // pažba
    const back = recZ + recLen / 2;
    if (m.stock === 'solid' || m.stock === 'thumb') {
      g.add(box(furn, 0.045, 0.08, 0.26, 0, 0.0, back + 0.13));
      if (m.stock === 'thumb') g.add(box(furn, 0.045, 0.04, 0.12, 0, -0.06, back + 0.08));
    } else if (m.stock === 'wire' || m.stock === 'fold') {
      g.add(box(darkMetal, 0.012, 0.012, 0.22, 0.018, 0.02, back + 0.11));
      g.add(box(darkMetal, 0.012, 0.012, 0.22, -0.018, -0.02, back + 0.11));
      g.add(box(darkMetal, 0.045, 0.07, 0.02, 0, 0, back + 0.22));
    }
    if (m.type === 'bullpup') g.add(box(skinTex ? body : polymer, 0.05, 0.08, 0.14, 0, 0.0, back + 0.04));
    // lišta, rukojeť nahoře, puškohled
    if (m.rail) g.add(box(darkMetal, 0.025, 0.015, recLen * 0.9, 0, 0.073, recZ));
    if (m.handle) g.add(box(body, 0.03, 0.03, recLen * 0.7, 0, 0.09, recZ));
    if (m.scope) {
      const sl = m.scope === 'long' ? 0.3 : 0.16;
      g.add(cyl(darkMetal, m.scope === 'long' ? 0.025 : 0.02, sl, 0, 0.11, recZ));
      g.add(cyl(glass, 0.022, 0.005, 0, 0.11, recZ - sl / 2 - 0.003));
      g.add(box(darkMetal, 0.015, 0.04, 0.02, 0, 0.08, recZ - sl * 0.25));
      g.add(box(darkMetal, 0.015, 0.04, 0.02, 0, 0.08, recZ + sl * 0.25));
    } else {
      g.add(box(darkMetal, 0.01, 0.025, 0.01, 0, 0.08, tip + 0.06));
    }
    if (m.type === 'lmg') {
      const bp = box(darkMetal, 0.008, 0.16, 0.008, 0.03, -0.04, barrelZ - barrelLen * 0.3, 0.5);
      g.add(bp);
      const bp2 = bp.clone();
      bp2.position.x = -0.03;
      g.add(bp2);
    }
  }
  g.add(muzzle);
  g.userData.muzzle = muzzle;
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}

/** Nože – tvar čepele podle modelu. */
export function buildKnife(model = 'kravar', skinTex = null) {
  const g = new THREE.Group();
  const bladeMat = skinTex
    ? new THREE.MeshStandardMaterial({ map: skinTex, metalness: 0.8, roughness: 0.25 })
    : new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: 0.95, roughness: 0.2 });
  const s = new THREE.Shape();
  if (model === 'karambit') {
    s.moveTo(0, 0);
    s.quadraticCurveTo(0.02, -0.12, -0.08, -0.17);
    s.quadraticCurveTo(-0.02, -0.1, -0.015, 0);
  } else if (model === 'motylek') {
    s.moveTo(0, 0);
    s.lineTo(0.012, -0.15);
    s.lineTo(-0.005, -0.18);
    s.lineTo(-0.018, -0.02);
  } else if (model === 'bajonet') {
    s.moveTo(0.015, 0);
    s.lineTo(0.015, -0.2);
    s.lineTo(-0.012, -0.24);
    s.lineTo(-0.018, 0);
  } else {
    s.moveTo(0.012, 0);
    s.lineTo(0.014, -0.15);
    s.quadraticCurveTo(0.0, -0.19, -0.02, -0.16);
    s.lineTo(-0.018, 0);
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1 });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0, 0);
  const blade = new THREE.Mesh(geo, bladeMat);
  blade.rotation.x = -Math.PI / 2;
  blade.position.set(0, 0.03, -0.06);
  g.add(blade);
  const handleMat = skinTex && model !== 'kravar' ? bladeMat : new THREE.MeshStandardMaterial({ color: model === 'motylek' ? '#9aa0a8' : '#2b2b2b', roughness: 0.6, metalness: 0.3 });
  g.add(box(handleMat, 0.025, 0.03, 0.11, 0, 0.02, 0.0));
  if (model === 'karambit') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 14), handleMat);
    ring.position.set(0, 0.02, 0.07);
    ring.rotation.y = Math.PI / 2;
    g.add(ring);
  }
  g.add(box(darkMetal, 0.04, 0.035, 0.008, 0, 0.025, -0.055));
  g.userData.muzzle = new THREE.Object3D();
  g.userData.muzzle.position.set(0, 0.03, -0.25);
  g.add(g.userData.muzzle);
  return g;
}

export function buildGrenade(kind) {
  const g = new THREE.Group();
  const color = kind === 'he' ? '#f4efe4' : kind === 'flash' ? '#ffc21a' : '#dfe8f0';
  const egg = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), new THREE.MeshStandardMaterial({ color, roughness: 0.4 }));
  egg.scale.set(1, 1.3, 1);
  g.add(egg);
  g.add(box(darkMetal, 0.02, 0.02, 0.02, 0, 0.05, 0));
  const pin = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.002, 6, 12), darkMetal);
  pin.position.set(0.015, 0.06, 0);
  g.add(pin);
  return g;
}
