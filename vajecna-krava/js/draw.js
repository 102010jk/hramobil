// Kreslení postaviček a předmětů na canvas. Souřadnice jsou ve "virtuálních" jednotkách hry.

export const OUTLINE = '#2a1f1a';

export const SKINS = {
  strakata: { name: 'Bětka', body: '#ffffff', spot: '#2b2b2b', snout: '#f7a8b8', horn: '#f3e6c4', price: 0 },
  hneda: { name: 'Hnědka', body: '#d39a62', spot: '#7a4a24', snout: '#f2b4a6', horn: '#fff4dc', price: 150 },
  fialova: { name: 'Fialka', body: '#c9a7ff', spot: '#ffffff', snout: '#ffb3d1', horn: '#fff4dc', price: 400 },
  nocni: { name: 'Noční Bára', body: '#3a3a4d', spot: '#f4f4ff', snout: '#d98aa0', horn: '#e8dcc0', price: 700 },
  duhova: { name: 'Duhovka', body: 'rainbow', spot: '#ffffff', snout: '#ffb3d1', horn: '#fff4dc', price: 1200 },
  zlata: { name: 'Zlatá kráva', body: '#ffd84a', spot: '#f0a500', snout: '#ffb38a', horn: '#fffbe6', crown: true, price: 2500 },
};

const SPOTS = [
  [-30, -54, 15, 11, 0.3],
  [4, -38, 17, 10, -0.2],
  [30, -60, 11, 8, 0.5],
  [-12, -28, 9, 6, 0],
  [44, -36, 8, 11, 0.2],
  [-46, -38, 8, 9, 0],
];

function bodyFill(ctx, sk, t, x0, x1) {
  if (sk.body !== 'rainbow') return sk.body;
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  const h = (t * 60) % 360;
  for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${(h + i * 60) % 360} 90% 72%)`);
  return g;
}

function shade(hex, k) {
  if (!hex.startsWith('#')) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
}

/**
 * Kráva bokem; počátek = střed mezi kopyty na zemi.
 * o: {x, y, s, dir, walk, squash, blink, moo, skin, t, tail}
 */
export function drawCow(ctx, o) {
  const sk = SKINS[o.skin] || SKINS.strakata;
  const t = o.t || 0;
  const sq = o.squash || 0;
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(o.s * (o.dir || 1), o.s);
  ctx.scale(1 + sq * 0.1, 1 - sq * 0.14);
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE;

  const sw = Math.sin(o.walk || 0) * 0.38;
  const farBody = sk.body === 'rainbow' ? '#d9c8ff' : shade(sk.body, 0.85);

  const leg = (x, ang, fill) => {
    ctx.save();
    ctx.translate(x, -26);
    ctx.rotate(ang);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(-5.5, 0, 11, 24, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4a3328';
    ctx.beginPath();
    ctx.roundRect(-6.5, 18, 13, 8, 3);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  // vzdálenější nohy
  leg(-28, -sw, farBody);
  leg(30, sw, farBody);

  // ocas
  const tailSwing = Math.sin(t * 3.1) * 5 + (o.tail || 0) * -14;
  ctx.beginPath();
  ctx.moveTo(-50, -58);
  ctx.quadraticCurveTo(-68, -52 + (o.tail || 0) * -10, -64 + tailSwing * 0.4, -30 + (o.tail || 0) * -22);
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = sk.spot === '#ffffff' || sk.spot === '#f4f4ff' ? '#6b5a50' : sk.spot;
  ctx.beginPath();
  ctx.ellipse(-64 + tailSwing * 0.4, -27 + (o.tail || 0) * -22, 5, 7, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.lineWidth = 3;

  // tělo
  ctx.beginPath();
  ctx.roundRect(-53, -68, 106, 46, 23);
  ctx.fillStyle = bodyFill(ctx, sk, t, -53, 53);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = sk.spot;
  for (const [x, y, rx, ry, r] of SPOTS) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // jemný stín pod břichem
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(-53, -32, 106, 12);
  ctx.restore();
  ctx.stroke();

  // vemeno
  ctx.fillStyle = sk.snout;
  ctx.beginPath();
  ctx.ellipse(-14, -22, 12, 7 + sq * 2, 0, 0, Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 2.5;
  for (const tx of [-21, -14, -7]) {
    ctx.beginPath();
    ctx.moveTo(tx, -17);
    ctx.lineTo(tx, -12);
    ctx.stroke();
  }
  ctx.lineWidth = 3;

  // bližší nohy
  leg(-40, sw, sk.body === 'rainbow' ? '#ffd1e8' : sk.body);
  leg(40, -sw, sk.body === 'rainbow' ? '#c8f5ff' : sk.body);

  // obojek a zvonec
  ctx.strokeStyle = '#e0453a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(40, -60);
  ctx.quadraticCurveTo(50, -44, 44, -34);
  ctx.stroke();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  const bellSwing = Math.sin(t * 5) * 0.25;
  ctx.save();
  ctx.translate(44, -33);
  ctx.rotate(bellSwing);
  ctx.fillStyle = '#ffcf3a';
  ctx.beginPath();
  ctx.moveTo(-6, 9);
  ctx.quadraticCurveTo(-6, -2, 0, -2);
  ctx.quadraticCurveTo(6, -2, 6, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.arc(0, 10, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 3;

  // hlava
  ctx.save();
  ctx.translate(58, -72);
  ctx.rotate(Math.sin((o.walk || 0) * 2) * 0.04 - (o.moo || 0) * 0.18);

  // ucho
  ctx.save();
  ctx.translate(-15, -6);
  ctx.rotate(-0.55 + Math.sin(t * 2.3) * 0.08);
  ctx.fillStyle = sk.body === 'rainbow' ? '#ffe08a' : sk.body;
  ctx.beginPath();
  ctx.ellipse(-6, 0, 11, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = sk.snout;
  ctx.beginPath();
  ctx.ellipse(-6, 0, 6, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // rohy
  ctx.fillStyle = sk.horn;
  for (const [hx, lean] of [[-9, -1], [6, 1]]) {
    ctx.beginPath();
    ctx.moveTo(hx - 4, -14);
    ctx.quadraticCurveTo(hx + lean * 2, -30, hx + lean * 6, -28);
    ctx.quadraticCurveTo(hx + lean * 3, -22, hx + 4, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // hlava
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 18, 0, 0, Math.PI * 2);
  ctx.fillStyle = bodyFill(ctx, sk, t + 1, -19, 19);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = sk.spot;
  ctx.beginPath();
  ctx.ellipse(-8, -9, 10, 8, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.stroke();

  // čumák
  ctx.fillStyle = sk.snout;
  ctx.beginPath();
  ctx.ellipse(13, 8, 14, 11, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.ellipse(9, 5, 2, 3, 0.2, 0, Math.PI * 2);
  ctx.ellipse(19, 4, 2, 3, -0.2, 0, Math.PI * 2);
  ctx.fill();
  const moo = o.moo || 0;
  if (moo > 0.05) {
    ctx.fillStyle = '#7a2b35';
    ctx.beginPath();
    ctx.ellipse(14, 14, 5 + moo * 2, 2 + moo * 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(14, 11, 5, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
  ctx.lineWidth = 3;

  // tvářička
  ctx.fillStyle = 'rgba(255,120,150,0.35)';
  ctx.beginPath();
  ctx.ellipse(-4, 7, 5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // oko
  if (o.blink) {
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(3, -4, 4.5, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(3, -4, 5.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.arc(4.5, -3, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(5.5, -4.5, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 3;

  if (sk.crown) {
    ctx.fillStyle = '#ffe34d';
    ctx.beginPath();
    ctx.moveTo(-10, -16);
    ctx.lineTo(-12, -31);
    ctx.lineTo(-5, -24);
    ctx.lineTo(0, -34);
    ctx.lineTo(5, -24);
    ctx.lineTo(12, -31);
    ctx.lineTo(10, -16);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#ff5a8a';
    ctx.beginPath();
    ctx.arc(0, -21, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.restore();
}

export function drawCloud(ctx, x, y, w, alpha = 1, shadow = true) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const s = w / 140;
  ctx.translate(x, y);
  ctx.scale(s, s);
  const puffs = [
    [-48, 2, 24],
    [-22, -10, 30],
    [12, -14, 34],
    [44, -2, 26],
    [0, 8, 30],
    [-34, 12, 20],
    [34, 12, 20],
  ];
  if (shadow) {
    ctx.fillStyle = 'rgba(80,110,160,0.25)';
    ctx.beginPath();
    for (const [px, py, r] of puffs) {
      ctx.moveTo(px + r, py + 6);
      ctx.arc(px, py + 6, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (const [px, py, r] of puffs) {
    ctx.moveTo(px + r, py);
    ctx.arc(px, py, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

function eggPath(ctx, r) {
  const w = r * 0.8;
  const h = r;
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.bezierCurveTo(w * 0.62, -h, w, -h * 0.25, w, h * 0.22);
  ctx.bezierCurveTo(w, h * 0.75, w * 0.56, h, 0, h);
  ctx.bezierCurveTo(-w * 0.56, h, -w, h * 0.75, -w, h * 0.22);
  ctx.bezierCurveTo(-w, -h * 0.25, -w * 0.62, -h, 0, -h);
  ctx.closePath();
}

export function drawEgg(ctx, x, y, r, rot, kind = 'egg', t = 0, tint = 0) {
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'golden') {
    const glow = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.2);
    glow.addColorStop(0, 'rgba(255,215,64,0.55)');
    glow.addColorStop(1, 'rgba(255,215,64,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.rotate(rot);
  eggPath(ctx, r);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.2);
  if (kind === 'golden') {
    g.addColorStop(0, '#fffbd0');
    g.addColorStop(0.5, '#ffcf2e');
    g.addColorStop(1, '#e09000');
  } else if (tint) {
    g.addColorStop(0, '#fbe3c8');
    g.addColorStop(1, '#d9a679');
  } else {
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#efdcc0');
  }
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.28, -r * 0.45, r * 0.13, r * 0.22, 0.4, 0, Math.PI * 2);
  ctx.fill();
  if (kind === 'golden') {
    ctx.rotate(-rot);
    const a = t * 4;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 2; i++) {
      const ang = a + i * Math.PI;
      const sx = Math.cos(ang) * r * 1.2;
      const sy = Math.sin(ang * 1.3) * r * 1.1;
      star(ctx, sx, sy, 3.5 + Math.sin(a * 2 + i) * 1.5);
    }
  }
  ctx.restore();
}

export function star(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

export function drawPoop(ctx, x, y, r, rot, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot * 0.3);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  const layers = [
    [0, r * 0.45, r * 1.0, r * 0.42],
    [0, r * 0.0, r * 0.75, r * 0.36],
    [r * 0.05, -r * 0.4, r * 0.48, r * 0.3],
  ];
  layers.forEach(([lx, ly, rx, ry], i) => {
    const g = ctx.createRadialGradient(lx - rx * 0.3, ly - ry * 0.5, 1, lx, ly, rx);
    g.addColorStop(0, i === 2 ? '#a8754a' : '#94643b');
    g.addColorStop(1, '#5a3a1e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(lx, ly, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(r * 0.05, -r * 0.65);
  ctx.quadraticCurveTo(r * 0.25, -r * 0.95, r * 0.4, -r * 0.85);
  ctx.stroke();
  // oči – je to zlobivý kravinec
  ctx.fillStyle = '#fff';
  for (const ex of [-r * 0.28, r * 0.22]) {
    ctx.beginPath();
    ctx.arc(ex, r * 0.02, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = OUTLINE;
  for (const ex of [-r * 0.24, r * 0.26]) {
    ctx.beginPath();
    ctx.arc(ex, r * 0.04, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.rotate(-rot * 0.3);
  // mouchy
  for (let i = 0; i < 2; i++) {
    const a = t * (5 + i) + i * 2.4;
    const fx = Math.cos(a) * r * 1.35;
    const fy = -r * 0.6 + Math.sin(a * 1.7) * r * 0.6;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(fx - 2, fy - 3, 2.5, 1.6, -0.6, 0, Math.PI * 2);
    ctx.ellipse(fx + 2, fy - 3, 2.5, 1.6, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.arc(fx, fy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // zápach
  ctx.strokeStyle = 'rgba(120,170,60,0.6)';
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i += 2) {
    ctx.beginPath();
    const ph = t * 4 + i;
    ctx.moveTo(i * r * 0.5, -r * 0.9);
    ctx.bezierCurveTo(i * r * 0.5 + Math.sin(ph) * 4, -r * 1.2, i * r * 0.5 - Math.sin(ph) * 4, -r * 1.4, i * r * 0.5, -r * 1.7);
    ctx.stroke();
  }
  ctx.restore();
}

export const POWERS = {
  slow: { icon: '🥛', name: 'Mléko', color: '#bde7ff' },
  magnet: { icon: '🧲', name: 'Magnet', color: '#ffc2c2' },
  big: { icon: '🧺', name: 'Obří košík', color: '#ffe3a3' },
  heart: { icon: '❤️', name: 'Život', color: '#ffd0dc' },
};

export function drawPower(ctx, x, y, r, kind, t) {
  const p = POWERS[kind];
  ctx.save();
  ctx.translate(x, y);
  const pulse = 1 + Math.sin(t * 8) * 0.06;
  ctx.scale(pulse, pulse);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 3;
  ctx.setLineDash([5, 6]);
  ctx.lineDashOffset = -t * 30;
  ctx.beginPath();
  ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.color;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.font = `${Math.round(r * 1.15)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.icon, 0, 1);
  ctx.restore();
}

/** Košík; (x, rimY) = střed horního okraje. */
export function drawBasket(ctx, x, rimY, w, h, o = {}) {
  const bump = o.bump || 0;
  ctx.save();
  ctx.translate(x, rimY + h);
  ctx.scale(1 + bump * 0.08, 1 - bump * 0.12);
  ctx.translate(0, -h);
  ctx.lineWidth = 3;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';

  // vajíčka uvnitř
  const n = Math.min(o.eggs || 0, 7);
  for (let i = 0; i < n; i++) {
    const ex = ((i * 0.618) % 1 - 0.5) * (w - 26);
    const ey = 2 - (i % 3) * 3;
    drawEgg(ctx, ex, ey, 11, (i % 2 ? 0.4 : -0.3), o.goldenIn > i ? 'golden' : 'egg', o.t || 0, i % 3 === 1);
  }

  const bw = w * 0.82;
  const bodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(-w / 2, 4);
    ctx.lineTo(w / 2, 4);
    ctx.lineTo(bw / 2, h - 6);
    ctx.quadraticCurveTo(bw / 2, h, bw / 2 - 6, h);
    ctx.lineTo(-bw / 2 + 6, h);
    ctx.quadraticCurveTo(-bw / 2, h, -bw / 2, h - 6);
    ctx.closePath();
  };
  bodyPath();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#e1a25a');
  g.addColorStop(1, '#b36f2f');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(90,50,20,0.45)';
  ctx.lineWidth = 2;
  for (let yy = 12; yy < h; yy += 9) {
    ctx.beginPath();
    ctx.moveTo(-w / 2, yy);
    ctx.lineTo(w / 2, yy);
    ctx.stroke();
  }
  ctx.lineWidth = 3;
  const step = 12;
  for (let xx = -w / 2 + step / 2; xx < w / 2; xx += step) {
    for (let yy = 8, k = 0; yy < h; yy += 9, k++) {
      if ((Math.round((xx + w) / step) + k) % 2) continue;
      ctx.strokeStyle = 'rgba(255,220,160,0.35)';
      ctx.beginPath();
      ctx.moveTo(xx * (1 - (yy / h) * 0.18), yy + 2);
      ctx.lineTo(xx * (1 - (yy / h) * 0.18), yy + 7);
      ctx.stroke();
    }
  }
  if (o.dirty > 0) {
    ctx.globalAlpha = Math.min(1, o.dirty);
    ctx.fillStyle = '#6b4423';
    ctx.beginPath();
    ctx.ellipse(-w * 0.15, h * 0.35, 14, 9, 0.3, 0, Math.PI * 2);
    ctx.ellipse(w * 0.2, h * 0.55, 10, 7, -0.2, 0, Math.PI * 2);
    ctx.ellipse(-w * 0.05, h * 0.7, 6, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  bodyPath();
  ctx.stroke();

  // okraj
  ctx.fillStyle = '#8f5a26';
  ctx.beginPath();
  ctx.roundRect(-w / 2 - 4, -2, w + 8, 10, 5);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,220,160,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 2, 1);
  ctx.lineTo(w / 2 - 2, 1);
  ctx.stroke();

  if (o.magnet) {
    ctx.strokeStyle = `rgba(255,80,80,${0.35 + Math.sin((o.t || 0) * 10) * 0.2})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, h / 2, w * 0.75, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  ctx.restore();
}
