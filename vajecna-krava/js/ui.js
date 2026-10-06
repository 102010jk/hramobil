// Menu: hraní, inventář, časky, trh, nastavení, detail předmětu, výsledky zápasu.
import * as THREE from './vendor/three.module.min.js';
import { sfx, initAudio } from './audio.js';
import { MAPS, CELL } from './maps.js';
import { BY_ID, buildGun, buildKnife } from './weapons.js';
import { buildSoldier, buildCow, buildArms } from './characters.js';
import { ITEMS, CASES, RARITIES, RARITY_ORDER, wearOf, instName, drawItemPreview, finishTexture, rollCase } from './skins.js';
import {
  P,
  save,
  findInst,
  isEquipped,
  isListed,
  equip,
  equipSlotOf,
  countOf,
  openCase,
  marketListings,
  marketPrice,
  priceHistory,
  buyListing,
  listItem,
  unlist,
  quickSell,
  processMarket,
  matchReward,
  buyKey,
} from './profile.js';
import { makeSky } from './textures.js';

const $ = (id) => document.getElementById(id);
let api = null;
const opts = { mode: 'comp', side: 'CT', difficulty: P.settings.difficulty || 'normal', teamSize: P.settings.teamSize || 5, map: 'kravin' };

export function initUI(a) {
  api = a;
  // záložky
  for (const b of $('tabs').children) b.addEventListener('click', () => showTab(b.dataset.tab));
  // volby hraní
  const seg = (id, key, conv = (v) => v) => {
    const el = $(id);
    for (const b of el.children) {
      b.classList.toggle('on', String(opts[key]) === b.dataset.v);
      b.addEventListener('click', () => {
        opts[key] = conv(b.dataset.v);
        for (const x of el.children) x.classList.toggle('on', x === b);
        sfx.click();
        if (key === 'difficulty') P.settings.difficulty = opts.difficulty;
        if (key === 'teamSize') P.settings.teamSize = opts.teamSize;
        save();
      });
    }
  };
  seg('opt-mode', 'mode');
  seg('opt-side', 'side');
  seg('opt-diff', 'difficulty');
  seg('opt-size', 'teamSize', Number);
  renderMaps();
  $('btn-start').addEventListener('click', () => {
    initAudio();
    sfx.click();
    api.playMatch({ ...opts });
  });
  // inventář
  for (const b of $('inv-filters').children)
    b.addEventListener('click', () => {
      invFilter = b.dataset.f;
      for (const x of $('inv-filters').children) x.classList.toggle('on', x === b);
      renderInv();
    });
  // trh
  for (const b of $('mk-tabs').children)
    b.addEventListener('click', () => {
      mkTab = b.dataset.m;
      for (const x of $('mk-tabs').children) x.classList.toggle('on', x === b);
      renderMarket();
    });
  $('mk-search').addEventListener('input', () => renderMarket());
  $('btn-buykey').addEventListener('click', () => {
    if (buyKey()) {
      sfx.buy();
      menuToast('🔑 Klíč koupen');
    } else menuToast('Nemáš dost vajíček.');
    refresh();
  });
  // modály
  for (const m of ['mod-item', 'mod-case'])
    $(m).addEventListener('click', (e) => {
      if (e.target.dataset.close !== undefined || e.target === $(m)) closeModal(m);
    });
  $('btn-open').addEventListener('click', () => doOpenCase());
  initSettings();
  showTab('play');
  refresh();
  const sold = processMarket();
  for (const s of sold) menuToast(`💰 Prodáno: ${s.name} (+${s.price} 🥚)`);
}

function closeModal(id) {
  if (id === 'mod-case' && rolling) return;
  $(id).hidden = true;
  if (id === 'mod-item') stopInspect();
  refresh();
}

export function showMenu() {
  $('menu').hidden = false;
  $('mod-post').hidden = true;
  refresh();
}

let tab = 'play';
function showTab(t) {
  tab = t;
  for (const b of $('tabs').children) b.classList.toggle('on', b.dataset.tab === t);
  for (const id of ['play', 'inv', 'cases', 'market', 'settings']) $('tab-' + id).hidden = id !== t;
  if (t === 'market') {
    const sold = processMarket();
    for (const s of sold) menuToast(`💰 Prodáno: ${s.name} (+${s.price} 🥚)`);
  }
  refresh();
}

function refresh() {
  $('w-coins').textContent = P.coins.toLocaleString('cs');
  $('w-keys').textContent = countOf('key');
  if (tab === 'play') renderStats();
  if (tab === 'inv') renderInv();
  if (tab === 'cases') renderCases();
  if (tab === 'market') renderMarket();
}

let marketTimer = 0;
export function uiTick(dt) {
  marketTimer += dt;
  if (marketTimer > 20) {
    marketTimer = 0;
    const sold = processMarket();
    for (const s of sold) menuToast(`💰 Prodáno: ${s.name} (+${s.price} 🥚)`);
    if (sold.length) refresh();
  }
  if (inspect.active) renderInspect(dt);
}

export function menuToast(html) {
  const box = $('menu-toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = html;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3300);
}

/* ================= hrát ================= */

function renderMaps() {
  const box = $('opt-map');
  box.innerHTML = '';
  for (const [id, m] of Object.entries(MAPS)) {
    const b = document.createElement('button');
    b.className = 'map-card' + (opts.map === id ? ' on' : '');
    const c = document.createElement('canvas');
    c.width = 340;
    c.height = 200;
    drawMapPreview(c, m);
    b.appendChild(c);
    b.insertAdjacentHTML('beforeend', `<b>${m.name}</b><small>${m.desc}</small>`);
    b.addEventListener('click', () => {
      opts.map = id;
      sfx.click();
      for (const x of box.children) x.classList.toggle('on', x === b);
      api.onMenuMap(id);
    });
    box.appendChild(b);
  }
}

function drawMapPreview(c, m) {
  const ctx = c.getContext('2d');
  const rows = m.rows;
  const H = rows.length;
  const W = rows[0].length;
  const s = Math.min(c.width / W, c.height / H);
  const ox = (c.width - W * s) / 2;
  const oy = (c.height - H * s) / 2;
  const col = { '#': '#262b35', ' ': '#11141a', c: '#8a6038', C: '#6a4a2a', h: '#d9b65a', A: '#a8402e', B: '#a8402e', T: '#a8851a', K: '#2a6aa8' };
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      ctx.fillStyle = col[rows[j][i]] || (m.floor === 'grass' ? '#4f7a2e' : m.floor === 'sand' ? '#b89b6a' : '#7d7870');
      ctx.fillRect(ox + i * s, oy + j * s, s + 0.5, s + 0.5);
    }
}

function renderStats() {
  const s = P.stats;
  const kd = s.deaths ? (s.kills / s.deaths).toFixed(2) : s.kills ? s.kills.toFixed(2) : '–';
  $('stats').innerHTML = [
    ['Zápasy', s.matches],
    ['Výhry', s.wins],
    ['Zabití', s.kills],
    ['K/D', kd],
    ['HS %', s.kills ? Math.round((s.hs / s.kills) * 100) + ' %' : '–'],
    ['Nejvíc zabití', s.bestKills],
  ]
    .map(([a, b]) => `<div><b>${b}</b><span>${a}</span></div>`)
    .join('');
}

/* ================= karty předmětů ================= */

function itemCard(inst, extra = {}) {
  const d = ITEMS[inst.def];
  const b = document.createElement('button');
  b.className = 'item';
  b.style.setProperty('--rc', RARITIES[d.rarity].color);
  const c = document.createElement('canvas');
  c.width = 200;
  c.height = 120;
  drawItemPreview(c, inst);
  b.appendChild(c);
  const w = inst.wear !== undefined ? wearOf(inst.wear) : null;
  b.insertAdjacentHTML(
    'beforeend',
    `<div class="nm">${inst.st !== undefined ? '<span class="st">KravTrak™ </span>' : ''}${d.name}</div>
     <div class="sub"><span>${w ? w.short : d.type === 'case' ? 'Časka' : d.type === 'key' ? 'Klíč' : RARITIES[d.rarity].name}</span>${extra.right || ''}</div>`
  );
  if (extra.badge) b.insertAdjacentHTML('beforeend', `<span class="badge ${extra.badgeCls || ''}">${extra.badge}</span>`);
  if (extra.count) b.insertAdjacentHTML('beforeend', `<span class="count">×${extra.count}</span>`);
  if (extra.onClick) b.addEventListener('click', extra.onClick);
  return b;
}

/* ================= inventář ================= */

let invFilter = 'all';
function renderInv() {
  const g = $('inv-grid');
  g.innerHTML = '';
  const list = P.inv
    .filter((i) => ITEMS[i.def])
    .filter((i) => invFilter === 'all' || ITEMS[i.def].type === invFilter || (invFilter === 'case' && ITEMS[i.def].type === 'key'))
    .sort((a, b) => RARITY_ORDER.indexOf(ITEMS[b.def].rarity) - RARITY_ORDER.indexOf(ITEMS[a.def].rarity));
  if (!list.length) g.innerHTML = '<p class="muted">Nic tu není. Otevři časku nebo nakup na trhu.</p>';
  // časky a klíče seskupit
  const grouped = new Set();
  for (const inst of list) {
    const d = ITEMS[inst.def];
    if (d.type === 'case' || d.type === 'key') {
      if (grouped.has(inst.def)) continue;
      grouped.add(inst.def);
      const n = P.inv.filter((i) => i.def === inst.def).length;
      g.appendChild(itemCard(inst, { count: n, onClick: () => (d.type === 'case' ? openCaseModal(d.case) : openItem(inst)) }));
      continue;
    }
    g.appendChild(
      itemCard(inst, {
        badge: isEquipped(inst.uid) ? 'VYBAVENO' : isListed(inst.uid) ? 'NA TRHU' : '',
        badgeCls: isListed(inst.uid) ? 'listed' : '',
        right: inst.st !== undefined ? `<span class="st">${inst.st} zabití</span>` : '',
        onClick: () => openItem(inst),
      })
    );
  }
}

/* ================= detail předmětu + 3D náhled ================= */

const inspect = { active: false, renderer: null, scene: null, camera: null, obj: null, rotY: 0, rotX: 0.2, drag: null };

function setupInspect() {
  if (inspect.renderer) return;
  const c = $('inspect');
  inspect.renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true });
  inspect.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  inspect.renderer.outputColorSpace = THREE.SRGBColorSpace;
  inspect.scene = new THREE.Scene();
  inspect.camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.01, 50);
  inspect.scene.add(new THREE.HemisphereLight('#ffffff', '#445', 1.4));
  const d = new THREE.DirectionalLight('#fff', 2.5);
  d.position.set(2, 3, 2);
  inspect.scene.add(d);
  const d2 = new THREE.DirectionalLight('#9fc8ff', 1.2);
  d2.position.set(-3, 1, -2);
  inspect.scene.add(d2);
  const pm = new THREE.PMREMGenerator(inspect.renderer);
  const es = new THREE.Scene();
  es.add(makeSky('#3f6fb6', '#e8eef5'));
  inspect.scene.environment = pm.fromScene(es, 0.03).texture;
  c.addEventListener('pointerdown', (e) => {
    inspect.drag = { x: e.clientX, y: e.clientY };
    c.setPointerCapture(e.pointerId);
  });
  c.addEventListener('pointermove', (e) => {
    if (!inspect.drag) return;
    inspect.rotY += (e.clientX - inspect.drag.x) * 0.01;
    inspect.rotX = Math.max(-1, Math.min(1, inspect.rotX + (e.clientY - inspect.drag.y) * 0.01));
    inspect.drag = { x: e.clientX, y: e.clientY };
  });
  c.addEventListener('pointerup', () => (inspect.drag = null));
}

function buildInspectObject(inst) {
  const d = ITEMS[inst.def];
  const tex = d.finish ? finishTexture(d.finish, inst.seed || 1, inst.wear || 0) : null;
  let obj;
  let dist = 1.6;
  if (d.type === 'weapon') {
    const g = buildGun(BY_ID[d.weapon], tex);
    obj = new THREE.Group();
    g.rotation.y = Math.PI / 2;
    const box = new THREE.Box3().setFromObject(g);
    const c = box.getCenter(new THREE.Vector3());
    g.position.sub(c);
    obj.add(g);
    dist = Math.max(0.5, box.getSize(new THREE.Vector3()).length() * 1.5);
  } else if (d.type === 'knife') {
    obj = new THREE.Group();
    const k = buildKnife(d.model, tex);
    k.rotation.y = Math.PI / 2;
    k.position.x = 0.05;
    obj.add(k);
    dist = 0.6;
  } else if (d.type === 'gloves') {
    obj = buildArms('t_default', d.finish);
    obj.rotation.y = Math.PI / 2;
    dist = 0.8;
  } else if (d.type === 'cow') {
    obj = buildCow(d.finish, inst.seed, inst.wear);
    obj.position.y = -1;
    dist = 4.2;
  } else if (d.type === 'agent') {
    obj = buildSoldier(d.agent);
    obj.position.y = -0.95;
    dist = 3.4;
  } else return null;
  return { obj, dist };
}

function startInspect(inst) {
  setupInspect();
  if (inspect.obj) inspect.scene.remove(inspect.obj);
  const r = buildInspectObject(inst);
  $('inspect').hidden = !r;
  if (!r) return;
  inspect.obj = r.obj;
  inspect.scene.add(r.obj);
  inspect.camera.position.set(0, 0.2 * r.dist, r.dist);
  inspect.camera.lookAt(0, 0, 0);
  inspect.rotY = 0.5;
  inspect.rotX = 0.15;
  inspect.active = true;
}
function stopInspect() {
  inspect.active = false;
}
function renderInspect(dt) {
  const c = $('inspect');
  const w = c.clientWidth;
  const h = c.clientHeight;
  if (!w || !h) return;
  if (c.width !== Math.round(w * devicePixelRatio)) {
    inspect.renderer.setPixelRatio(devicePixelRatio);
    inspect.renderer.setSize(w, h, false);
    inspect.camera.aspect = w / h;
    inspect.camera.updateProjectionMatrix();
  }
  if (!inspect.drag) inspect.rotY += dt * 0.4;
  inspect.obj.rotation.set(inspect.rotX, inspect.rotY, 0);
  inspect.renderer.render(inspect.scene, inspect.camera);
}

function sparkline(vals) {
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * 300},${55 - ((v - min) / (max - min || 1)) * 50}`).join(' ');
  return `<svg viewBox="0 0 300 60" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="#7dff5a" stroke-width="2"/></svg>`;
}

function openItem(inst, listing = null) {
  const d = ITEMS[inst.def];
  const rar = RARITIES[d.rarity];
  const w = inst.wear !== undefined ? wearOf(inst.wear) : null;
  const price = marketPrice(inst.def, inst.wear, inst.st !== undefined);
  const hist = priceHistory(inst.def, inst.wear, inst.st !== undefined);
  $('item-info').innerHTML = `
    <h2>${instName(inst)}</h2>
    <div class="rar" style="color:${rar.color}">${rar.name}${d.type === 'weapon' ? ' • ' + BY_ID[d.weapon].name : ''}</div>
    <table>
      ${w ? `<tr><td>Opotřebení</td><td>${w.name} (${inst.wear.toFixed(3)})</td></tr>` : ''}
      ${inst.seed !== undefined ? `<tr><td>Vzor</td><td>#${inst.seed}</td></tr>` : ''}
      ${inst.st !== undefined ? `<tr><td>KravTrak™ zabití</td><td>${inst.st}</td></tr>` : ''}
      ${listing ? `<tr><td>Prodejce</td><td>${listing.seller}</td></tr>` : ''}
      <tr><td>Tržní cena</td><td>${price.toLocaleString('cs')} 🥚</td></tr>
    </table>
    ${sparkline(hist)}<div class="muted">Vývoj ceny za 30 dní</div>`;
  const act = $('item-actions');
  act.innerHTML = '';
  const btn = (label, cls, fn) => {
    const b = document.createElement('button');
    b.className = 'btn ' + cls;
    b.textContent = label;
    b.addEventListener('click', fn);
    act.appendChild(b);
    return b;
  };
  if (listing) {
    btn(`Koupit za ${listing.price.toLocaleString('cs')} 🥚`, 'primary', () => {
      const got = buyListing(listing);
      if (got) {
        sfx.buy();
        menuToast(`Koupeno: ${instName(got)}`);
        closeModal('mod-item');
      } else menuToast('Nemáš dost vajíček.');
    }).disabled = P.coins < listing.price;
  } else if (d.type === 'case') {
    btn('Otevřít časku', 'primary', () => {
      closeModal('mod-item');
      openCaseModal(d.case);
    });
  } else if (findInst(inst.uid)) {
    const slot = equipSlotOf(inst);
    if (slot && !isListed(inst.uid))
      btn(isEquipped(inst.uid) ? 'Sundat' : 'Vybavit', 'primary', () => {
        equip(inst.uid);
        sfx.click();
        openItem(inst);
        refresh();
      });
    if (isListed(inst.uid)) {
      btn('Stáhnout z trhu', '', () => {
        unlist(inst.uid);
        openItem(inst);
        refresh();
      });
    } else {
      const input = document.createElement('input');
      input.type = 'number';
      input.min = 1;
      input.value = price;
      act.appendChild(input);
      btn('Vystavit na trh', '', () => {
        listItem(inst.uid, Number(input.value) || price);
        menuToast('Předmět je na trhu. Za férovou cenu se rychle prodá.');
        closeModal('mod-item');
      });
      btn(`Rychle prodat (${Math.round(price * 0.7)} 🥚)`, 'small', () => {
        const got = quickSell(inst.uid);
        sfx.buy();
        menuToast(`Prodáno za ${got} 🥚`);
        closeModal('mod-item');
      });
    }
  }
  $('mod-item').hidden = false;
  startInspect(inst);
}

/* ================= časky ================= */

function renderCases() {
  const g = $('cases-grid');
  g.innerHTML = '';
  for (const [id, c] of Object.entries(CASES)) {
    const n = countOf(`case_${id}`);
    const inst = { def: `case_${id}` };
    g.appendChild(itemCard(inst, { count: n || '0', right: `<span>${marketPrice(`case_${id}`)} 🥚</span>`, onClick: () => openCaseModal(id) }));
  }
}

let currentCase = null;
let rolling = false;
function openCaseModal(id) {
  currentCase = id;
  const c = CASES[id];
  $('case-title').textContent = c.name;
  $('case-result').innerHTML = '';
  $('strip').innerHTML = '';
  $('strip').style.transition = 'none';
  $('strip').style.transform = 'translateX(0)';
  const content = $('case-content');
  content.innerHTML = '';
  const all = [...c.items].sort((a, b) => RARITY_ORDER.indexOf(ITEMS[b].rarity) - RARITY_ORDER.indexOf(ITEMS[a].rarity));
  for (const def of all) content.appendChild(itemCard({ def, seed: 1, wear: 0.05 }));
  const gold = { def: c.gold[0], seed: 1, wear: 0.02 };
  const gc = itemCard(gold);
  gc.querySelector('.nm').textContent = '★ Mimořádně vzácný předmět (nůž / rukavice)';
  content.prepend(gc);
  updateOpenBtn();
  $('mod-case').hidden = false;
}
function updateOpenBtn() {
  const hasCase = countOf(`case_${currentCase}`) > 0;
  const hasKey = countOf('key') > 0;
  const b = $('btn-open');
  if (!hasCase) {
    const price = marketPrice(`case_${currentCase}`);
    b.textContent = `Koupit časku (${price} 🥚)`;
    b.disabled = P.coins < price;
    b.dataset.action = 'buycase';
  } else if (!hasKey) {
    b.textContent = 'Koupit klíč (250 🥚)';
    b.disabled = P.coins < 250;
    b.dataset.action = 'buykey';
  } else {
    b.textContent = `Otevřít (máš ${countOf(`case_${currentCase}`)})`;
    b.disabled = false;
    b.dataset.action = 'open';
  }
}

function doOpenCase() {
  if (rolling) return;
  const b = $('btn-open');
  if (b.dataset.action === 'buykey') {
    buyKey();
    sfx.buy();
    updateOpenBtn();
    refresh();
    return;
  }
  if (b.dataset.action === 'buycase') {
    const price = marketPrice(`case_${currentCase}`);
    if (P.coins >= price) {
      P.coins -= price;
      P.inv.push({ uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), def: `case_${currentCase}` });
      save();
      sfx.buy();
    }
    updateOpenBtn();
    refresh();
    return;
  }
  const won = openCase(currentCase);
  if (!won) return;
  rolling = true;
  b.disabled = true;
  $('case-result').innerHTML = '';
  const strip = $('strip');
  strip.innerHTML = '';
  const N = 56;
  const WIN = 48;
  for (let i = 0; i < N; i++) {
    const inst = i === WIN ? won : rollCase(currentCase);
    strip.appendChild(itemCard(inst));
  }
  strip.style.transition = 'none';
  strip.style.transform = 'translateX(0)';
  void strip.offsetWidth;
  const cardW = 156;
  const rollW = $('roll').clientWidth;
  const target = WIN * cardW + 75 - rollW / 2 + (Math.random() - 0.5) * 120;
  strip.style.transition = 'transform 6s cubic-bezier(0.08, 0.6, 0.12, 1)';
  strip.style.transform = `translateX(${-target}px)`;
  let lastIdx = -1;
  const t0 = performance.now();
  const tick = () => {
    const m = new DOMMatrixReadOnly(getComputedStyle(strip).transform);
    const x = -m.m41 + rollW / 2;
    const idx = Math.floor(x / cardW);
    if (idx !== lastIdx) {
      lastIdx = idx;
      sfx.caseTick();
    }
    if (performance.now() - t0 < 6100) requestAnimationFrame(tick);
    else finishRoll(won);
  };
  requestAnimationFrame(tick);
}

function finishRoll(won) {
  rolling = false;
  const d = ITEMS[won.def];
  const rar = RARITIES[d.rarity];
  sfx.unbox(d.rarity);
  const box = $('case-result');
  box.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'won';
  div.style.setProperty('--rc', rar.color);
  const c = document.createElement('canvas');
  c.width = 300;
  c.height = 180;
  drawItemPreview(c, won);
  div.appendChild(c);
  const w = won.wear !== undefined ? wearOf(won.wear) : null;
  div.insertAdjacentHTML('beforeend', `<div><b style="color:${rar.color}">${instName(won)}</b><span>${rar.name}${w ? ' • ' + w.name : ''}</span><div class="row" style="justify-content:flex-start;margin-top:8px"></div></div>`);
  const row = div.querySelector('.row');
  const mk = (label, cls, fn) => {
    const b = document.createElement('button');
    b.className = 'btn small ' + cls;
    b.textContent = label;
    b.addEventListener('click', fn);
    row.appendChild(b);
  };
  if (equipSlotOf(won))
    mk('Vybavit', 'primary', () => {
      if (!isEquipped(won.uid)) equip(won.uid);
      menuToast('Vybaveno!');
    });
  mk('Prohlédnout', '', () => {
    closeModal('mod-case');
    openItem(won);
  });
  box.appendChild(div);
  updateOpenBtn();
  refresh();
  if (d.rarity === 'gold' || d.rarity === 'cov') menuToast(`🔥 ${instName(won)}!`);
}

/* ================= trh ================= */

let mkTab = 'buy';
function renderMarket() {
  const g = $('mk-grid');
  g.innerHTML = '';
  const q = $('mk-search').value.trim().toLowerCase();
  const match = (inst) => !q || instName(inst).toLowerCase().includes(q);
  if (mkTab === 'buy') {
    const list = marketListings().filter((l) => match(l.inst));
    for (const l of list)
      g.appendChild(
        itemCard(l.inst, {
          right: `<span class="price">${l.price.toLocaleString('cs')} 🥚</span>`,
          onClick: () => openItem(l.inst, l),
        })
      );
  } else if (mkTab === 'mine') {
    if (!P.listings.length) g.innerHTML = '<p class="muted">Nemáš nic na prodej. Vystav předmět v záložce Prodat.</p>';
    for (const l of P.listings) {
      const inst = findInst(l.uid);
      if (!inst || !match(inst)) continue;
      const fair = marketPrice(inst.def, inst.wear, inst.st !== undefined);
      g.appendChild(
        itemCard(inst, {
          badge: 'NA TRHU',
          badgeCls: 'listed',
          right: `<span class="price" title="Férová cena ${fair}">${l.price.toLocaleString('cs')} 🥚</span>`,
          onClick: () => openItem(inst),
        })
      );
    }
  } else {
    const list = P.inv.filter((i) => ITEMS[i.def] && !isListed(i.uid) && match(i));
    if (!list.length) g.innerHTML = '<p class="muted">Nemáš co prodat.</p>';
    for (const inst of list)
      g.appendChild(
        itemCard(inst, {
          badge: isEquipped(inst.uid) ? 'VYBAVENO' : '',
          right: `<span class="price">~${marketPrice(inst.def, inst.wear, inst.st !== undefined).toLocaleString('cs')} 🥚</span>`,
          onClick: () => openItem(inst),
        })
      );
  }
}

/* ================= nastavení ================= */

function initSettings() {
  const s = P.settings;
  const bind = (id, key, ev, get, after) => {
    const el = $(id);
    el.addEventListener(ev, () => {
      s[key] = get(el);
      save();
      after?.();
    });
  };
  $('s-sound').checked = s.sound;
  $('s-shadows').checked = s.shadows;
  $('s-quality').value = String(s.quality);
  $('s-sens').value = s.sens;
  $('s-fov').value = s.fov;
  $('s-cross').value = s.crosshair;
  $('s-assist').checked = s.assist;
  $('s-sens-v').textContent = Number(s.sens).toFixed(2);
  $('s-fov-v').textContent = s.fov;
  bind('s-sound', 'sound', 'change', (e) => e.checked, () => api.setSound(s.sound));
  bind('s-shadows', 'shadows', 'change', (e) => e.checked, () => api.applyQuality());
  bind('s-quality', 'quality', 'change', (e) => Number(e.value), () => api.applyQuality());
  bind('s-sens', 'sens', 'input', (e) => Number(e.value), () => ($('s-sens-v').textContent = Number(s.sens).toFixed(2)));
  bind('s-fov', 'fov', 'input', (e) => Number(e.value), () => ($('s-fov-v').textContent = s.fov));
  bind('s-cross', 'crosshair', 'input', (e) => e.value);
  bind('s-assist', 'assist', 'change', (e) => e.checked);
}

/* ================= po zápase ================= */

export function showPostMatch(res) {
  const reward = matchReward(res);
  const body = $('post-body');
  const sc = res.score;
  const rows = (team) =>
    res.fighters
      .filter((f) => f.team === team)
      .sort((a, b) => b.kills - a.kills)
      .map((f) => `<tr class="${f.me ? 'me' : ''}"><td>${f.name}</td><td>${f.kills}</td><td>${f.deaths}</td><td>${f.assists}</td></tr>`)
      .join('');
  body.innerHTML = `
    <h2 style="color:${res.win ? '#7dff5a' : '#ff4d4d'}">${res.win ? 'VÍTĚZSTVÍ' : 'PROHRA'}</h2>
    <div style="font:700 28px var(--head)"><span style="color:var(--t)">Vaječníci ${sc.T}</span> : <span style="color:var(--ct)">${sc.CT} Kravaři</span></div>
    <div class="stats"><div><b>${res.kills}</b><span>Zabití</span></div><div><b>${res.deaths}</b><span>Smrti</span></div><div><b>${res.assists}</b><span>Asistence</span></div><div><b>${res.kills ? Math.round((res.hs / res.kills) * 100) : 0} %</b><span>Headshoty</span></div>${res.mvp ? '<div><b>★</b><span>MVP týmu</span></div>' : ''}</div>
    <div class="sb" style="width:100%;background:none;border:0;padding:0"><table><tr><th>Vaječníci</th><th>Z</th><th>S</th><th>A</th></tr>${rows('T')}</table><table><tr><th>Kravaři</th><th>Z</th><th>S</th><th>A</th></tr>${rows('CT')}</table></div>
    <h3>Odměny</h3>
    <div style="font:700 22px var(--head);color:var(--green)">+${reward.coins} 🥚</div>
    <div class="grid small" id="post-drops"></div>
    <div class="row"><button class="btn primary" id="post-again">Hrát znovu</button><button class="btn" id="post-menu">Menu</button></div>`;
  const dg = $('post-drops');
  for (const inst of reward.drops) dg.appendChild(itemCard(inst));
  $('mod-post').hidden = false;
  $('menu').hidden = false;
  refresh();
  $('post-again').addEventListener('click', () => {
    $('mod-post').hidden = true;
    api.playMatch({ ...opts });
  });
  $('post-menu').addEventListener('click', () => {
    $('mod-post').hidden = true;
    showMenu();
  });
}
