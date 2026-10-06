// Profil hráče: vajíčka (měna), inventář, vybavení skinů, nastavení, trh.
import { ITEMS, CASES, AGENTS, makeInstance, basePrice, rollCase, instName } from './skins.js';
import { mulberry } from './textures.js';

const KEY = 'vajecna-krava-strike-v1';

const DEFAULTS = () => ({
  coins: 1000,
  inv: [],
  equip: {}, // weaponId|knife|gloves|cow|agentT|agentCT -> uid
  stats: { matches: 0, wins: 0, kills: 0, deaths: 0, hs: 0, bestKills: 0 },
  settings: { sound: true, shadows: null, sens: 1, fov: 74, assist: true, quality: null, crosshair: '#7dff5a', difficulty: 'normal', teamSize: 5 },
  bought: {}, // id nabídky -> true
  listings: [], // moje nabídky na trhu {uid, price, at}
  lastMarketCheck: Date.now(),
  started: false,
});

export const P = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s) {
      const d = DEFAULTS();
      return { ...d, ...s, stats: { ...d.stats, ...s.stats }, settings: { ...d.settings, ...s.settings } };
    }
  } catch {
    /* poškozené uložení – začni znovu */
  }
  return DEFAULTS();
})();

if (!P.started) {
  P.started = true;
  // startovní balíček
  P.inv.push(makeInstance('case_vajecna'), makeInstance('case_kravi'), makeInstance('case_agentni'), makeInstance('key'), makeInstance('key'));
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(P));
  } catch {
    /* bez ukládání */
  }
}

export const findInst = (uid) => P.inv.find((i) => i.uid === uid);
export const isListed = (uid) => P.listings.some((l) => l.uid === uid);
export function isEquipped(uid) {
  return Object.values(P.equip).includes(uid);
}

export function equipSlotOf(inst) {
  const d = ITEMS[inst.def];
  if (d.type === 'weapon') return d.weapon;
  if (d.type === 'knife') return 'knife';
  if (d.type === 'gloves') return 'gloves';
  if (d.type === 'cow') return 'cow';
  if (d.type === 'agent') return AGENTS[d.agent].side === 'T' ? 'agentT' : 'agentCT';
  return null;
}

export function equip(uid) {
  const inst = findInst(uid);
  const slot = equipSlotOf(inst);
  if (!slot) return;
  if (P.equip[slot] === uid) delete P.equip[slot];
  else P.equip[slot] = uid;
  save();
}

/** Skin pro danou zbraň/slot (instance nebo null). */
export function equipped(slot) {
  const uid = P.equip[slot];
  return uid ? findInst(uid) || null : null;
}

export function countOf(defId) {
  return P.inv.filter((i) => i.def === defId && !isListed(i.uid)).length;
}

export function removeInst(uid) {
  const i = P.inv.findIndex((x) => x.uid === uid);
  if (i >= 0) P.inv.splice(i, 1);
  for (const [k, v] of Object.entries(P.equip)) if (v === uid) delete P.equip[k];
  P.listings = P.listings.filter((l) => l.uid !== uid);
}

/** Otevře časku: spotřebuje časku + klíč, vrátí novou instanci. */
export function openCase(caseId) {
  const c = P.inv.find((i) => i.def === `case_${caseId}` && !isListed(i.uid));
  const k = P.inv.find((i) => i.def === 'key' && !isListed(i.uid));
  if (!c || !k) return null;
  removeInst(c.uid);
  removeInst(k.uid);
  const inst = rollCase(caseId);
  P.inv.push(inst);
  save();
  return inst;
}

/* ================= komunitní trh (simulovaný – hra je offline) ================= */

const SELLERS = ['BučíkCZ', 'VajecnyPan', 'KravskaMafie', 'Žloutek99', 'Mlékař_007', 'Strakáč', 'Omeleta_Pro', 'TeleTubbie', 'SenoVSene', 'ProFarmář', 'Vemínko', 'xX_Býk_Xx', 'Kvočna', 'Skořápka', 'KravTrader', 'HnědáBára'];

export function marketPrice(defId, wear, st, t = Date.now()) {
  const base = basePrice(defId, wear, st);
  // pomalý trend v čase (den) + rychlé výkyvy (hodina)
  let h = 0;
  for (const ch of defId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const day = t / 864e5;
  const trend = 1 + 0.15 * Math.sin(day * 0.9 + (h % 100)) + 0.05 * Math.sin(day * 7 + (h % 37));
  return Math.max(3, Math.round(base * trend));
}

export function priceHistory(defId, wear, st, points = 30) {
  const now = Date.now();
  return Array.from({ length: points }, (_, k) => marketPrice(defId, wear, st, now - (points - 1 - k) * 864e5));
}

/** Nabídky ostatních hráčů – generované podle aktuální hodiny. */
export function marketListings() {
  const hour = Math.floor(Date.now() / 36e5);
  const rnd = mulberry(hour * 7919);
  const ids = Object.keys(ITEMS).filter((id) => ITEMS[id].type !== 'key');
  const list = [];
  for (let n = 0; n < 48; n++) {
    let id;
    // levné věci častěji
    for (let tries = 0; tries < 4; tries++) {
      id = ids[Math.floor(rnd() * ids.length)];
      const r = ITEMS[id].rarity;
      if (r === 'mil' || rnd() < (r === 'res' ? 0.6 : r === 'cla' ? 0.35 : r === 'cov' ? 0.2 : 0.12)) break;
    }
    const inst = makeInstance(id, rnd);
    const lid = `${hour}-${n}`;
    if (P.bought[lid]) continue;
    const price = Math.round(marketPrice(id, inst.wear, inst.st !== undefined) * (0.88 + rnd() * 0.3));
    list.push({ lid, inst, price, seller: SELLERS[Math.floor(rnd() * SELLERS.length)] });
  }
  return list.sort((a, b) => b.price - a.price);
}

export function buyListing(l) {
  if (P.coins < l.price) return false;
  P.coins -= l.price;
  P.bought[l.lid] = true;
  // staré záznamy pryč
  const hour = Math.floor(Date.now() / 36e5);
  for (const k of Object.keys(P.bought)) if (+k.split('-')[0] < hour - 2) delete P.bought[k];
  const inst = { ...l.inst, uid: makeInstance(l.inst.def).uid };
  P.inv.push(inst);
  save();
  return inst;
}

export function listItem(uid, price) {
  if (isListed(uid)) return;
  for (const [k, v] of Object.entries(P.equip)) if (v === uid) delete P.equip[k];
  P.listings.push({ uid, price: Math.max(1, Math.round(price)), at: Date.now() });
  save();
}
export function unlist(uid) {
  P.listings = P.listings.filter((l) => l.uid !== uid);
  save();
}
export function quickSell(uid) {
  const inst = findInst(uid);
  if (!inst) return 0;
  const p = Math.max(1, Math.round(marketPrice(inst.def, inst.wear, inst.st !== undefined) * 0.7));
  removeInst(uid);
  P.coins += p;
  save();
  return p;
}

/** Simulace kupců: vrací seznam prodaných {name, price}. */
export function processMarket() {
  const now = Date.now();
  const mins = Math.min(600, (now - P.lastMarketCheck) / 6e4);
  P.lastMarketCheck = now;
  const sold = [];
  for (const l of [...P.listings]) {
    const inst = findInst(l.uid);
    if (!inst) {
      unlist(l.uid);
      continue;
    }
    const fair = marketPrice(inst.def, inst.wear, inst.st !== undefined);
    const ratio = l.price / fair;
    const perMin = ratio <= 0.8 ? 0.9 : ratio <= 1 ? 0.35 : ratio <= 1.15 ? 0.12 : ratio <= 1.4 ? 0.03 : 0.004;
    const age = (now - l.at) / 6e4;
    const pSold = 1 - Math.pow(1 - perMin, Math.max(mins, age < 0.5 ? 0 : 0.5));
    if (Math.random() < pSold) {
      const gain = Math.floor(l.price * 0.95);
      P.coins += gain;
      sold.push({ name: instName(inst), price: gain });
      removeInst(l.uid);
    }
  }
  save();
  return sold;
}

/** Odměna po zápase. */
export function matchReward({ kills, deaths, hs, win, mvp }) {
  const coins = 30 + kills * 15 + hs * 5 + (win ? 150 : 40) + (mvp ? 50 : 0);
  P.coins += coins;
  P.stats.matches++;
  if (win) P.stats.wins++;
  P.stats.kills += kills;
  P.stats.deaths += deaths;
  P.stats.hs += hs;
  P.stats.bestKills = Math.max(P.stats.bestKills, kills);
  const drops = [];
  const ids = Object.keys(CASES);
  const pickCase = () => {
    const r = Math.random();
    return r < 0.06 ? 'zlata' : ids.filter((i) => i !== 'zlata')[Math.floor(Math.random() * (ids.length - 1))];
  };
  drops.push(makeInstance(`case_${pickCase()}`));
  if (win) drops.push(makeInstance(`case_${pickCase()}`));
  if (Math.random() < 0.35 || kills >= 15) drops.push(makeInstance('key'));
  P.inv.push(...drops);
  save();
  return { coins, drops };
}

export function buyKey() {
  if (P.coins < 250) return false;
  P.coins -= 250;
  P.inv.push(makeInstance('key'));
  save();
  return true;
}
