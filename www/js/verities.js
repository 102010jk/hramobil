// Verity types: every colour region of a puzzle is home to one kind of
// verita (Cruelty, Lovity, Obesity, …). Each type is drawn from SVG parts:
// a body shape, eyes, mouth and accessories. viewBox is 0 0 100 100.

const INK = '#141627';
const S = `stroke="${INK}" stroke-width="5" stroke-linejoin="round"`;
const s3 = `stroke="${INK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"`;

// ------------------------------------------------------------------ bodies
// d: face offset (dy) so eyes sit nicely inside the shape
const BODIES = {
  gem: { d: -4, svg: `<path d="M30 14 H70 L90 38 L50 90 L10 38 Z" fill="var(--b)" ${S}/><path d="M30 14 L40 38 L50 14 L60 38 L70 14 M10 38 H90" fill="none" stroke="${INK}" stroke-opacity=".25" stroke-width="2.4"/>` },
  drop: { d: 6, svg: `<path d="M50 8 C62 28 84 44 84 62 A34 32 0 0 1 16 62 C16 44 38 28 50 8 Z" fill="var(--b)" ${S}/>` },
  blob: { d: 6, svg: `<rect x="14" y="26" width="72" height="64" rx="30" fill="var(--b)" ${S}/>` },
  star: { d: 2, svg: `<path d="M50 6 L62 34 L93 36 L69 56 L77 88 L50 71 L23 88 L31 56 L7 36 L38 34 Z" fill="var(--b)" ${S}/>` },
  hex: { d: 0, svg: `<path d="M50 6 L88 28 V72 L50 94 L12 72 V28 Z" fill="var(--b)" ${S}/>` },
  heart: { d: -4, svg: `<path d="M50 90 C14 66 6 46 10 32 C14 16 36 10 50 28 C64 10 86 16 90 32 C94 46 86 66 50 90 Z" fill="var(--b)" ${S}/>` },
  ghost: { d: -2, svg: `<path d="M16 90 V46 A34 34 0 0 1 84 46 V90 L72 80 L61 90 L50 80 L39 90 L28 80 Z" fill="var(--b)" ${S}/>` },
  orb: { d: 4, svg: `<circle cx="50" cy="56" r="36" fill="var(--b)" ${S}/>` },
  fat: { d: 8, svg: `<ellipse cx="50" cy="60" rx="45" ry="32" fill="var(--b)" ${S}/><path d="M24 80 Q50 90 76 80" fill="none" stroke="${INK}" stroke-opacity=".25" stroke-width="3"/>` },
  tall: { d: -6, svg: `<rect x="27" y="8" width="46" height="86" rx="23" fill="var(--b)" ${S}/>` },
  square: { d: 4, svg: `<rect x="14" y="20" width="72" height="72" rx="9" fill="var(--b)" ${S}/>` },
  shield: { d: 0, svg: `<path d="M50 8 L86 20 V50 C86 72 70 86 50 94 C30 86 14 72 14 50 V20 Z" fill="var(--b)" ${S}/>` },
  tooth: { d: -6, svg: `<path d="M20 22 C20 8 40 8 50 15 C60 8 80 8 80 22 C84 42 74 54 72 72 C70 92 60 94 57 80 C55 70 45 70 43 80 C40 94 30 92 28 72 C26 54 16 42 20 22 Z" fill="var(--b)" ${S}/>` },
  goo: { d: 0, svg: `<path d="M14 52 A36 36 0 0 1 86 52 V76 C86 82 79 82 78 76 C77 90 68 92 66 78 C64 94 54 94 53 80 C52 90 44 90 43 78 C41 88 33 88 32 78 C30 84 22 84 22 78 C16 78 14 72 14 66 Z" fill="var(--b)" ${S}/>` },
  cloud: { d: 4, svg: `<path d="M26 84 A17 17 0 0 1 18 52 A21 21 0 0 1 46 26 A23 23 0 0 1 84 42 A19 19 0 0 1 78 84 Z" fill="var(--b)" ${S}/>` },
  spiky: { d: 2, svg: `<path d="${spikes(50, 54, 42, 31, 12)}" fill="var(--b)" ${S}/>` },
  flame: { d: 8, svg: `<path d="M50 6 C56 22 70 26 72 14 C86 32 90 50 86 64 C82 82 68 92 50 92 C32 92 18 82 14 64 C10 48 20 34 30 26 C30 38 36 42 40 40 C38 26 44 16 50 6 Z" fill="var(--b)" ${S}/>` },
  bean: { d: 4, svg: `<path d="M30 20 C46 10 64 14 72 26 C84 42 90 64 78 80 C66 94 38 94 24 80 C10 66 14 30 30 20 Z" fill="var(--b)" ${S}/>` },
  diamond: { d: 2, svg: `<path d="M50 6 L92 50 L50 94 L8 50 Z" fill="var(--b)" ${S}/>` },
  moon: { d: 4, svg: `<circle cx="50" cy="56" r="38" fill="var(--b)" ${S}/><path d="M68 24 A38 38 0 0 1 68 88 A30 34 0 0 0 68 24 Z" fill="${INK}" opacity=".18"/><circle cx="30" cy="34" r="4" fill="${INK}" opacity=".15"/><circle cx="64" cy="80" r="3" fill="${INK}" opacity=".15"/>` },
};

function spikes(cx, cy, ro, ri, n) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = (Math.PI * i) / n - Math.PI / 2;
    d += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1) + ' ';
  }
  return d + 'Z';
}

// ------------------------------------------------------------------ eyes (around y=54)
const eye = (x, rx = 5.2, ry = 6.4) => `<ellipse cx="${x}" cy="54" rx="${rx}" ry="${ry}" fill="${INK}"/><circle cx="${x + rx * 0.35}" cy="${54 - ry * 0.38}" r="${Math.max(1.4, rx * 0.36)}" fill="#fff"/>`;
const heartP = (x) => `<path d="M${x} 60 C${x - 9} 54 ${x - 8} 46 ${x - 3.5} 47 C${x - 1.5} 47 ${x} 49 ${x} 50 C${x} 49 ${x + 1.5} 47 ${x + 3.5} 47 C${x + 8} 46 ${x + 9} 54 ${x} 60 Z" fill="#ff2d6f" stroke="${INK}" stroke-width="1.6"/>`;
const starP = (x) => `<path d="${spikes(x, 54, 8, 3.6, 5)}" fill="#ffd34d" stroke="${INK}" stroke-width="1.6"/>`;
const EYES = {
  normal: eye(38) + eye(62),
  big: eye(37, 8, 9.5) + eye(63, 8, 9.5),
  tiny: `<circle cx="40" cy="54" r="2.8" fill="${INK}"/><circle cx="60" cy="54" r="2.8" fill="${INK}"/>`,
  happy: `<path d="M32 56 Q38 47 44 56 M56 56 Q62 47 68 56" fill="none" ${s3}/>`,
  closed: `<path d="M32 53 Q38 59 44 53 M56 53 Q62 59 68 53" fill="none" ${s3}/>`,
  angry: eye(38) + eye(62) + `<path d="M29 43 L45 49 M71 43 L55 49" ${s3} stroke-width="4"/>`,
  worried: eye(38) + eye(62) + `<path d="M30 48 L45 42 M70 48 L55 42" ${s3} stroke-width="3.6"/>`,
  hearts: heartP(38) + heartP(62),
  stars: starP(38) + starP(62),
  spiral: `<path d="M38 54 m0 0 a1.5 1.5 0 1 1 3 0 a3 3 0 1 1 -6 0 a4.5 4.5 0 1 1 9 0 a6 6 0 1 1 -12 0 M62 54 m0 0 a1.5 1.5 0 1 0 -3 0 a3 3 0 1 0 6 0 a4.5 4.5 0 1 0 -9 0 a6 6 0 1 0 12 0" fill="none" stroke="${INK}" stroke-width="2.2"/>`,
  x: `<path d="M33 49 L43 59 M43 49 L33 59 M57 49 L67 59 M67 49 L57 59" ${s3} stroke-width="4"/>`,
  dollar: `<text x="38" y="61" font-size="20" font-weight="900" text-anchor="middle" fill="#0f7a35" font-family="Arial, sans-serif">$</text><text x="62" y="61" font-size="20" font-weight="900" text-anchor="middle" fill="#0f7a35" font-family="Arial, sans-serif">$</text>`,
  shades: `<path d="M24 48 H76 L74 52 C72 62 58 62 55 53 H45 C42 62 28 62 26 52 Z" fill="${INK}"/><path d="M30 51 L35 51" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>`,
  glasses: eye(38, 3.6, 4.4) + eye(62, 3.6, 4.4) + `<circle cx="38" cy="54" r="9.5" fill="#fff" fill-opacity=".25" stroke="${INK}" stroke-width="3"/><circle cx="62" cy="54" r="9.5" fill="#fff" fill-opacity=".25" stroke="${INK}" stroke-width="3"/><path d="M47.5 54 H52.5" stroke="${INK}" stroke-width="3"/>`,
  monocle: eye(38) + eye(62, 4, 5) + `<circle cx="62" cy="54" r="10" fill="#fff" fill-opacity=".3" stroke="#c9a227" stroke-width="3"/><path d="M71 58 Q78 70 72 84" fill="none" stroke="#c9a227" stroke-width="2"/>`,
  derp: eye(37, 7, 8.5) + `<circle cx="63" cy="57" r="3.2" fill="${INK}"/>`,
  wink: eye(38) + `<path d="M56 55 Q62 48 68 55" fill="none" ${s3}/>`,
  cyclops: `<circle cx="50" cy="52" r="12" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="52" cy="53" r="6" fill="${INK}"/><circle cx="54" cy="50" r="2" fill="#fff"/>`,
  infinity: `<path d="M50 54 C44 44 28 44 28 54 C28 64 44 64 50 54 C56 44 72 44 72 54 C72 64 56 64 50 54 Z" fill="none" stroke="${INK}" stroke-width="5"/><circle cx="36" cy="54" r="2.4" fill="${INK}"/><circle cx="64" cy="54" r="2.4" fill="${INK}"/>`,
  lashes: eye(38) + eye(62) + `<path d="M31 47 L28 43 M35 45 L34 40 M65 45 L66 40 M69 47 L72 43" ${s3} stroke-width="2.4"/>`,
  smug: `<path d="M31 52 H45 M55 52 H69" ${s3}/><path d="M33 52 A5 5 0 0 0 43 52 M57 52 A5 5 0 0 0 67 52" fill="${INK}"/>`,
  glow: `<ellipse cx="38" cy="54" rx="6" ry="4" fill="#fff36b"/><ellipse cx="62" cy="54" rx="6" ry="4" fill="#fff36b"/><ellipse cx="38" cy="54" rx="10" ry="7" fill="#fff36b" opacity=".25"/><ellipse cx="62" cy="54" rx="10" ry="7" fill="#fff36b" opacity=".25"/>`,
  domino: `<path d="M24 50 C30 42 44 44 50 48 C56 44 70 42 76 50 C74 60 62 62 56 56 H44 C38 62 26 60 24 50 Z" fill="${INK}"/><ellipse cx="37" cy="52" rx="4.5" ry="3.4" fill="#fff"/><ellipse cx="63" cy="52" rx="4.5" ry="3.4" fill="#fff"/>`,
  visor: `<rect x="24" y="45" width="52" height="17" rx="7" fill="${INK}"/><rect x="28" y="49" width="44" height="9" rx="4" fill="#5ee7ff" opacity=".85"/><path d="M32 52 H46" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  teary: eye(38) + eye(62) + `<path d="M34 62 C31 68 33 72 36 72 C39 72 40 68 34 62 Z M66 62 C63 68 65 72 68 72 C71 72 72 68 66 62 Z" fill="#7dd3fc" stroke="${INK}" stroke-width="1.4"/>`,
  sour: `<path d="M31 50 L44 55 L31 58 M69 50 L56 55 L69 58" fill="none" ${s3}/>`,
  dizzy: `<path d="${spikes(38, 54, 7, 2.5, 4)}" fill="${INK}"/><path d="${spikes(62, 54, 7, 2.5, 4)}" fill="${INK}"/>`,
  down: `<path d="M32 56 Q38 60 44 56 M56 56 Q62 60 68 56" fill="none" ${s3}/><path d="M33 50 L43 51 M57 51 L67 50" ${s3} stroke-width="2"/>`,
  hollow: `<ellipse cx="38" cy="54" rx="6" ry="8" fill="${INK}"/><ellipse cx="62" cy="54" rx="6" ry="8" fill="${INK}"/>`,
  focus: `<path d="M30 50 L46 50" ${s3} stroke-width="3.4"/><path d="M54 50 L70 50" ${s3} stroke-width="3.4"/>` + `<circle cx="38" cy="55" r="3.6" fill="${INK}"/><circle cx="62" cy="55" r="3.6" fill="${INK}"/>`,
  fire: `<path d="M38 46 C44 52 44 60 38 62 C32 60 32 52 38 46 Z M62 46 C68 52 68 60 62 62 C56 60 56 52 62 46 Z" fill="#ff7a1a" stroke="${INK}" stroke-width="2"/>`,
  mixed: eye(38) + `<path d="${spikes(62, 54, 7, 3, 5)}" fill="#ffd34d" stroke="${INK}" stroke-width="1.6"/>`,
};

// ------------------------------------------------------------------ mouths (around y=66)
const MOUTHS = {
  smile: `<path d="M44 66 Q50 72 56 66" fill="none" ${s3}/>`,
  grin: `<path d="M40 63 Q50 78 60 63 Z" fill="${INK}" ${s3}/><path d="M45 70 Q50 74 55 70" fill="#ff7a9a"/>`,
  laugh: `<path d="M37 61 Q50 84 63 61 Z" fill="${INK}" ${s3}/><path d="M43 72 Q50 79 57 72 Q50 69 43 72 Z" fill="#ff7a9a"/>`,
  frown: `<path d="M43 71 Q50 64 57 71" fill="none" ${s3}/>`,
  flat: `<path d="M44 68 H56" ${s3}/>`,
  o: `<ellipse cx="50" cy="69" rx="4.4" ry="5.6" fill="${INK}"/>`,
  fangs: `<path d="M40 65 Q50 72 60 65" fill="none" ${s3}/><path d="M43 66.5 L45.5 74 L48 68.5 Z M57 66.5 L54.5 74 L52 68.5 Z" fill="#fff" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`,
  tongue: `<path d="M42 65 Q50 71 58 65" fill="none" ${s3}/><path d="M47 68 V74 A3.5 3.5 0 0 0 54 74 V68" fill="#ff7a9a" stroke="${INK}" stroke-width="2"/>`,
  wavy: `<path d="M39 68 Q42 64 45 68 T51 68 T57 68 T61 68" fill="none" ${s3} stroke-width="2.8"/>`,
  teeth: `<rect x="39" y="63" width="22" height="9" rx="3" fill="#fff" stroke="${INK}" stroke-width="2.6"/><path d="M39 67.5 H61 M44.5 63 V72 M50 63 V72 M55.5 63 V72" stroke="${INK}" stroke-width="1.6"/>`,
  kiss: `<path d="M47 62 Q55 63 50 67 Q55 71 47 72" fill="none" ${s3} stroke-width="2.8"/>`,
  smirk: `<path d="M44 68 Q53 71 58 62" fill="none" ${s3}/>`,
  drool: `<path d="M43 65 Q50 71 57 65" fill="none" ${s3}/><path d="M55 68 C55 74 53 77 55 79 C57 81 59 78 57 72 Z" fill="#7dd3fc" stroke="${INK}" stroke-width="1.4"/>`,
  meh: `<path d="M43 69 L57 66" ${s3}/>`,
  monster: `<path d="M36 62 H64 Q62 78 50 78 Q38 78 36 62 Z" fill="${INK}"/><path d="M39 62 L42 67 L45 62 L48 67 L51 62 L54 67 L57 62 L60 67 L62 62 Z" fill="#fff"/>`,
  sad: `<path d="M44 70 Q50 66 56 70" fill="none" ${s3}/>`,
  tiny: `<path d="M47.5 67 Q50 69 52.5 67" fill="none" ${s3} stroke-width="2.6"/>`,
  shout: `<path d="M42 62 H58 L55 76 H45 Z" fill="${INK}" stroke-linejoin="round"/><path d="M45 72 H55" stroke="#ff7a9a" stroke-width="3"/>`,
  none: '',
};

// ------------------------------------------------------------------ accessories
const ACC = {
  crown: `<path d="M28 22 L33 4 L42 16 L50 2 L58 16 L67 4 L72 22 Z" fill="#ffd34d" ${s3}/><circle cx="50" cy="13" r="2.4" fill="#ff3d77"/>`,
  horns: `<path d="M26 30 C16 22 16 8 22 2 C24 14 30 18 36 22 Z M74 30 C84 22 84 8 78 2 C76 14 70 18 64 22 Z" fill="#9b1c31" ${s3}/>`,
  halo: `<ellipse cx="50" cy="8" rx="20" ry="5" fill="none" stroke="#ffd34d" stroke-width="4.5"/>`,
  tophat: `<path d="M34 24 V4 H66 V24 Z" fill="${INK}"/><rect x="26" y="22" width="48" height="6" rx="2" fill="${INK}"/><rect x="34" y="16" width="32" height="4" fill="#c0263a"/>`,
  bow: `<path d="M50 20 L34 10 L34 30 Z M50 20 L66 10 L66 30 Z" fill="#ff5fa2" ${s3}/><circle cx="50" cy="20" r="4" fill="#ff5fa2" stroke="${INK}" stroke-width="2.4"/>`,
  antenna: `<path d="M50 24 V8" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/><circle cx="50" cy="7" r="5.4" fill="#ff6b9a" stroke="${INK}" stroke-width="2.6"/>`,
  flame: `<path d="M50 2 C56 10 62 12 60 20 C66 16 66 10 66 8 C74 18 70 30 60 32 H40 C30 30 26 18 34 8 C34 12 36 16 40 18 C38 10 44 6 50 2 Z" fill="#ff7a1a" ${s3}/><path d="M50 14 C54 20 56 24 52 30 H48 C44 26 46 20 50 14 Z" fill="#ffd34d"/>`,
  bolt: `<path d="M80 4 L68 26 H78 L70 46 L92 18 H81 L88 4 Z" fill="#ffd34d" ${s3}/>`,
  sweat: `<path d="M80 30 C74 40 76 46 81 46 C86 46 88 40 80 30 Z" fill="#7dd3fc" stroke="${INK}" stroke-width="2"/>`,
  hearts: `<path d="M84 22 C76 16 78 8 82 9 C84 9 85 11 85 12 C85 11 86 9 88 9 C92 8 94 16 84 22 Z M14 34 C8 30 9 24 12 25 C13 25 14 26 14 27 C14 26 15 25 16 25 C19 24 20 30 14 34 Z" fill="#ff2d6f" stroke="${INK}" stroke-width="1.6"/>`,
  question: `<text x="84" y="26" font-size="30" font-weight="900" text-anchor="middle" fill="#ffd34d" stroke="${INK}" stroke-width="2" font-family="Arial, sans-serif">?</text>`,
  exclaim: `<text x="85" y="28" font-size="30" font-weight="900" text-anchor="middle" fill="#ff3d5a" stroke="${INK}" stroke-width="2" font-family="Arial, sans-serif">!</text>`,
  zzz: `<text x="80" y="22" font-size="16" font-weight="900" fill="#c4b5fd" stroke="${INK}" stroke-width="1.4" font-family="Arial, sans-serif">z</text><text x="88" y="12" font-size="12" font-weight="900" fill="#c4b5fd" stroke="${INK}" stroke-width="1.2" font-family="Arial, sans-serif">z</text>`,
  sprout: `<path d="M50 26 V12" stroke="#16a34a" stroke-width="3.4" stroke-linecap="round"/><path d="M50 14 C40 4 32 8 32 14 C40 16 46 16 50 14 Z M50 12 C58 2 68 6 68 12 C60 14 54 14 50 12 Z" fill="#4ade80" stroke="${INK}" stroke-width="2.2"/>`,
  gradcap: `<path d="M50 4 L88 16 L50 28 L12 16 Z" fill="${INK}"/><path d="M30 22 V30 H70 V22" fill="${INK}"/><path d="M82 18 V32" stroke="#ffd34d" stroke-width="2.6"/><circle cx="82" cy="33" r="3" fill="#ffd34d"/>`,
  helmet: `<path d="M16 40 A34 30 0 0 1 84 40 Z" fill="#475569" ${s3}/><rect x="44" y="12" width="12" height="28" rx="3" fill="#94a3b8" stroke="${INK}" stroke-width="2"/>`,
  hardhat: `<path d="M20 34 A30 26 0 0 1 80 34 Z" fill="#facc15" ${s3}/><rect x="12" y="32" width="76" height="7" rx="3" fill="#facc15" ${s3}/><path d="M50 10 V30" stroke="${INK}" stroke-width="2.4"/>`,
  headphones: `<path d="M14 54 V44 A36 36 0 0 1 86 44 V54" fill="none" stroke="${INK}" stroke-width="5"/><rect x="6" y="46" width="14" height="22" rx="6" fill="#ff3d77" ${s3}/><rect x="80" y="46" width="14" height="22" rx="6" fill="#ff3d77" ${s3}/>`,
  chefhat: `<path d="M30 30 C18 30 18 12 32 14 C34 2 66 2 68 14 C82 12 82 30 70 30 Z" fill="#fff" ${s3}/><rect x="30" y="28" width="40" height="8" fill="#fff" ${s3}/>`,
  partyhat: `<path d="M38 26 L54 0 L66 22 Z" fill="#a855f7" ${s3}/><path d="M43 18 L60 12 M48 24 L63 18" stroke="#ffd34d" stroke-width="2.6"/><circle cx="54" cy="2" r="4" fill="#ffd34d" stroke="${INK}" stroke-width="2"/>`,
  cheeks: `<ellipse cx="29" cy="64" rx="6" ry="4" fill="#ff5f8f" opacity=".55"/><ellipse cx="71" cy="64" rx="6" ry="4" fill="#ff5f8f" opacity=".55"/>`,
  mustache: `<path d="M50 63 C44 58 36 60 32 66 C38 64 44 68 50 65 C56 68 62 64 68 66 C64 60 56 58 50 63 Z" fill="#3b2314" stroke="${INK}" stroke-width="1.6"/>`,
  bulb: `<circle cx="80" cy="16" r="10" fill="#fff36b" ${s3}/><rect x="76" y="25" width="8" height="6" rx="1.5" fill="#94a3b8" stroke="${INK}" stroke-width="2"/><path d="M68 6 L64 2 M92 6 L96 2 M80 2 V-2" stroke="#ffd34d" stroke-width="2.4"/>`,
  ring: `<ellipse cx="50" cy="58" rx="48" ry="11" fill="none" stroke="#ffd34d" stroke-width="5" transform="rotate(-14 50 58)"/>`,
  ringfront: `<path d="M2 58 A48 11 0 0 0 98 58" fill="none" stroke="#ffd34d" stroke-width="5" transform="rotate(-14 50 58)"/>`,
  speed: `<path d="M2 40 H16 M0 54 H12 M4 68 H16" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9"/>`,
  drops: `<path d="M10 20 C6 27 8 31 11 31 C14 31 15 27 10 20 Z M88 34 C84 41 86 45 89 45 C92 45 93 41 88 34 Z M84 6 C81 11 82 14 85 14 C88 14 88 11 84 6 Z" fill="#7dd3fc" stroke="${INK}" stroke-width="1.6"/>`,
  snow: `<path d="M84 6 V26 M75 11 L93 21 M75 21 L93 11" stroke="#bae6fd" stroke-width="3" stroke-linecap="round"/>`,
  sun: `<path d="M50 2 V12 M18 12 L25 19 M82 12 L75 19 M4 40 H14 M86 40 H96" stroke="#ffd34d" stroke-width="4" stroke-linecap="round"/>`,
  facemask: `<path d="M30 60 H70 V72 C70 80 30 80 30 72 Z" fill="#e0f2fe" stroke="${INK}" stroke-width="2.4"/><path d="M30 62 L16 56 M70 62 L84 56 M36 66 H64 M36 71 H64" stroke="${INK}" stroke-width="1.6"/>`,
  cage: `<path d="M20 20 V92 M34 14 V94 M50 12 V94 M66 14 V94 M80 20 V92" stroke="#64748b" stroke-width="3.6"/><path d="M16 22 H84" stroke="#64748b" stroke-width="4"/>`,
  cracks: `<path d="M22 30 L32 42 L26 50 L36 60 M76 66 L68 74 L74 82" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`,
  bandage: `<rect x="54" y="24" width="24" height="9" rx="4" fill="#fde68a" stroke="${INK}" stroke-width="2" transform="rotate(30 66 28)"/><path d="M64 26 L68 30 M68 26 L64 30" stroke="#b45309" stroke-width="1.2" transform="rotate(30 66 28)"/>`,
  scar: `<path d="M64 38 L74 58 M64 44 L70 42 M67 50 L73 48 M69 55 L75 53" stroke="#7f1d1d" stroke-width="2.4" stroke-linecap="round"/>`,
  headband: `<path d="M16 40 Q50 30 84 40 L84 47 Q50 37 16 47 Z" fill="#e11d48" stroke="${INK}" stroke-width="2.2"/><path d="M84 42 L96 36 L94 46 L84 46" fill="#e11d48" stroke="${INK}" stroke-width="2"/>`,
  beret: `<path d="M18 30 C18 14 76 8 84 24 C86 30 76 32 50 32 C30 32 18 34 18 30 Z" fill="#dc2626" ${s3}/><path d="M50 12 V6" stroke="${INK}" stroke-width="3"/><circle cx="82" cy="40" r="6" fill="#3b82f6" stroke="${INK}" stroke-width="2"/><circle cx="90" cy="30" r="4" fill="#facc15" stroke="${INK}" stroke-width="2"/>`,
  bowtie: `<path d="M50 84 L36 76 V92 Z M50 84 L64 76 V92 Z" fill="#dc2626" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><circle cx="50" cy="84" r="3.4" fill="#dc2626" stroke="${INK}" stroke-width="2"/>`,
  wings: `<path d="M14 50 C0 40 -2 26 4 20 C8 30 14 34 20 36 Z M86 50 C100 40 102 26 96 20 C92 30 86 34 80 36 Z" fill="#fff" ${s3}/>`,
  ears: `<path d="M20 30 C4 32 4 60 14 66 C20 56 22 44 26 36 Z M80 30 C96 32 96 60 86 66 C80 56 78 44 74 36 Z" fill="#92400e" ${s3}/>`,
  confetti: `<rect x="8" y="10" width="6" height="3" fill="#ff3d77" transform="rotate(30 11 11)"/><rect x="84" y="8" width="6" height="3" fill="#5ee7ff" transform="rotate(-20 87 9)"/><rect x="88" y="34" width="6" height="3" fill="#ffd34d" transform="rotate(50 91 35)"/><rect x="4" y="38" width="6" height="3" fill="#4ade80" transform="rotate(-40 7 39)"/><circle cx="20" cy="4" r="2" fill="#a855f7"/>`,
  coin: `<circle cx="82" cy="18" r="11" fill="#facc15" ${s3}/><text x="82" y="24" font-size="15" font-weight="900" text-anchor="middle" fill="#a16207" font-family="Arial, sans-serif">$</text>`,
  torch: `<path d="M84 50 L78 22" stroke="#a16207" stroke-width="5" stroke-linecap="round"/><path d="M77 22 C70 14 76 6 78 2 C80 8 86 10 84 18 Z" fill="#ff7a1a" stroke="${INK}" stroke-width="2"/>`,
  libcrown: `<path d="M24 26 L18 8 L32 20 L36 2 L44 18 L50 0 L56 18 L64 2 L68 20 L82 8 L76 26 Z" fill="#5eead4" ${s3}/>`,
  skyline: `<path d="M18 28 V16 H26 V28 M30 28 V6 H40 V28 M44 28 V12 H52 V28 M56 28 V2 H66 V28 M70 28 V14 H80 V28" fill="#64748b" stroke="${INK}" stroke-width="2"/><path d="M33 10 H37 M33 16 H37 M59 8 H63 M59 14 H63 M59 20 H63" stroke="#fde68a" stroke-width="2"/>`,
  sparkle: `<path d="M84 8 L87 17 L96 20 L87 23 L84 32 L81 23 L72 20 L81 17 Z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>`,
  bubbles: `<circle cx="84" cy="22" r="6" fill="#a3e635" stroke="${INK}" stroke-width="2"/><circle cx="92" cy="8" r="4" fill="#a3e635" stroke="${INK}" stroke-width="1.8"/><circle cx="12" cy="24" r="4.5" fill="#a3e635" stroke="${INK}" stroke-width="1.8"/>`,
  radiation: `<circle cx="50" cy="82" r="9" fill="#facc15" stroke="${INK}" stroke-width="2"/><path d="M50 82 L45 74 A9 9 0 0 1 55 74 Z M50 82 L59 82 A9 9 0 0 1 54 90 Z M50 82 L46 90 A9 9 0 0 1 41 82 Z" fill="${INK}"/>`,
  pimples: `<circle cx="30" cy="42" r="2.6" fill="#ef4444"/><circle cx="70" cy="70" r="2.2" fill="#ef4444"/><circle cx="66" cy="36" r="2" fill="#ef4444"/>`,
  patch: `<rect x="62" y="70" width="16" height="14" rx="2" fill="#a16207" stroke="${INK}" stroke-width="2" transform="rotate(-10 70 77)"/><path d="M64 73 L76 72 M64 77 L76 76 M64 81 L76 80" stroke="#fde68a" stroke-width="1.2" stroke-dasharray="2 2" transform="rotate(-10 70 77)"/>`,
  split: `<path d="M50 0 V100 H100 V0 Z" fill="${INK}" opacity=".55"/>`,
  stripes: `<path d="M0 40 H100" stroke="#ff3d77" stroke-width="6" opacity=".55"/><path d="M0 50 H100" stroke="#ffd34d" stroke-width="6" opacity=".55"/><path d="M0 60 H100" stroke="#4ade80" stroke-width="6" opacity=".55"/><path d="M0 70 H100" stroke="#3b82f6" stroke-width="6" opacity=".55"/>`,
  rays: `<path d="M50 0 V8 M14 14 L20 20 M86 14 L80 20 M0 50 H8 M92 50 H100 M14 86 L20 80 M86 86 L80 80" stroke="#fff36b" stroke-width="4" stroke-linecap="round"/>`,
  ice: `<rect x="70" y="4" width="22" height="22" rx="4" fill="#bae6fd" fill-opacity=".85" stroke="${INK}" stroke-width="2.2" transform="rotate(12 81 15)"/><path d="M75 10 L80 9" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  fork: `<path d="M86 8 V40 M80 8 V20 Q80 26 86 26 Q92 26 92 20 V8" fill="none" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>`,
  lemon: `<ellipse cx="82" cy="16" rx="11" ry="8" fill="#fde047" stroke="${INK}" stroke-width="2" transform="rotate(-25 82 16)"/>`,
  shadow: `<path d="M0 0 H100 V100 H0 Z" fill="#05060f" opacity=".45"/>`,
  medal: `<path d="M44 74 L40 92 M56 74 L60 92" stroke="#3b82f6" stroke-width="4"/><circle cx="50" cy="80" r="7" fill="#cd7f32" stroke="${INK}" stroke-width="2"/><text x="50" y="84" font-size="9" font-weight="900" text-anchor="middle" fill="${INK}" font-family="Arial, sans-serif">3</text>`,
  hourglass: `<path d="M76 4 H92 L86 14 L92 24 H76 L82 14 Z" fill="#fde68a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
  tie: `<path d="M50 74 L45 80 L50 96 L55 80 Z" fill="#2563eb" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
  dumbbell: `<path d="M74 20 H94" stroke="${INK}" stroke-width="3"/><rect x="70" y="12" width="6" height="16" rx="2" fill="#64748b" stroke="${INK}" stroke-width="2"/><rect x="92" y="12" width="6" height="16" rx="2" fill="#64748b" stroke="${INK}" stroke-width="2"/>`,
  mirror: `<ellipse cx="84" cy="18" rx="9" ry="12" fill="#e0f2fe" stroke="#c9a227" stroke-width="3"/><path d="M84 30 V42" stroke="#c9a227" stroke-width="3"/>`,
  glass: `<path d="M76 6 H92 L89 34 H79 Z" fill="#bae6fd" fill-opacity=".7" stroke="${INK}" stroke-width="2"/><path d="M78 16 H90" stroke="#38bdf8" stroke-width="2"/>`,
  shield: `<path d="M84 4 L96 9 V18 C96 26 90 30 84 33 C78 30 72 26 72 18 V9 Z" fill="#22c55e" stroke="${INK}" stroke-width="2"/><path d="M79 18 L83 22 L90 13" fill="none" stroke="#fff" stroke-width="2.4"/>`,
  idcard: `<rect x="70" y="6" width="26" height="18" rx="3" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="77" cy="15" r="3.4" fill="#94a3b8"/><path d="M83 12 H92 M83 17 H90" stroke="${INK}" stroke-width="1.6"/>`,
  phone: `<rect x="76" y="4" width="16" height="28" rx="3" fill="${INK}"/><rect x="78.5" y="7" width="11" height="20" rx="1.5" fill="#5ee7ff"/><path d="M80 12 H88 M80 16 H86" stroke="#fff" stroke-width="1.6"/>`,
  note: `<path d="M84 26 V6 L94 4 V22" fill="none" stroke="${INK}" stroke-width="2.6"/><circle cx="81" cy="26" r="4" fill="${INK}"/><circle cx="91" cy="22" r="4" fill="${INK}"/>`,
  ghostlet: `<path d="M8 30 V14 A8 8 0 0 1 24 14 V30 L20 27 L16 30 L12 27 Z" fill="#fff" fill-opacity=".85" stroke="${INK}" stroke-width="1.6"/>`,
};

// ------------------------------------------------------------------ the types
// id must stay stable (saved progress refers to it)
export const VERITY_TYPES = [
  { id: 'verity', name: 'Verity', c: '#a78bfa', body: 'gem', eyes: 'normal', mouth: 'smile', acc: ['sparkle'], d: 'Původní verita. Pravdomluvná, třpytivá a trochu namyšlená.' },
  { id: 'cruelty', name: 'Cruelty', c: '#dc2626', body: 'spiky', eyes: 'angry', mouth: 'fangs', acc: ['horns'], d: 'Krutá. Když se jí dotkneš, kousne. Proto se verity nedotýkají.' },
  { id: 'lovity', name: 'Lovity', c: '#ff5fa2', body: 'heart', eyes: 'hearts', mouth: 'kiss', acc: ['hearts', 'cheeks'], d: 'Miluje všechny a všechno. Hlavně tebe.' },
  { id: 'obesity', name: 'Obesity', c: '#fb923c', body: 'fat', eyes: 'tiny', mouth: 'drool', acc: ['cheeks', 'fork'], d: 'Zabírá skoro celé políčko. Hladová je vždycky.' },
  { id: 'gravity', name: 'Gravity', c: '#6d28d9', body: 'orb', eyes: 'closed', mouth: 'flat', acc: ['ring', 'ringfront'], d: 'Těžká jako planeta. Všechno kolem ní padá.' },
  { id: 'velocity', name: 'Velocity', c: '#06b6d4', body: 'drop', eyes: 'focus', mouth: 'grin', acc: ['speed'], d: 'Než ji položíš, je už o dvě políčka dál.' },
  { id: 'electricity', name: 'Electricity', c: '#facc15', body: 'star', eyes: 'big', mouth: 'grin', acc: ['bolt'], d: 'Nabitá na 230 voltů. Nesahat mokrýma rukama.' },
  { id: 'toxicity', name: 'Toxicity', c: '#84cc16', body: 'goo', eyes: 'x', mouth: 'wavy', acc: ['bubbles'], d: 'Píše jedovaté komentáře pod každou mřížku.' },
  { id: 'curiosity', name: 'Curiosity', c: '#14b8a6', body: 'blob', eyes: 'big', mouth: 'o', acc: ['question'], d: 'Musí vědět, co je v každém políčku. Úplně v každém.' },
  { id: 'insanity', name: 'Insanity', c: '#d946ef', body: 'cloud', eyes: 'spiral', mouth: 'tongue', acc: ['exclaim'], d: 'Hrála level 100 bez nápovědy. Několikrát.' },
  { id: 'humidity', name: 'Humidity', c: '#38bdf8', body: 'drop', eyes: 'worried', mouth: 'wavy', acc: ['drops', 'sweat'], d: 'Pořád trochu vlhká. Ráda se schovává v rozích.' },
  { id: 'serenity', name: 'Serenity', c: '#c4b5fd', body: 'bean', eyes: 'closed', mouth: 'tiny', acc: ['halo', 'sprout'], d: 'Klid sám. Nic ji nerozhodí – ani tři chyby.' },
  { id: 'infinity', name: 'Infinity', c: '#7c3aed', body: 'hex', eyes: 'infinity', mouth: 'smile', acc: ['sparkle'], d: 'Nemá začátek ani konec. Jen smyčku.' },
  { id: 'celebrity', name: 'Celebrity', c: '#f59e0b', body: 'star', eyes: 'shades', mouth: 'smirk', acc: ['sparkle'], d: 'Autogramy jen po vyřešení levelu.' },
  { id: 'stupidity', name: 'Stupidity', c: '#d6b48c', body: 'bean', eyes: 'derp', mouth: 'tongue', acc: ['question'], d: 'Myslí si, že verity se mají dotýkat. Nemají.' },
  { id: 'ferocity', name: 'Ferocity', c: '#ea580c', body: 'flame', eyes: 'angry', mouth: 'monster', acc: [], d: 'Divoká šelma mezi veritami. Krmit opatrně.' },
  { id: 'hilarity', name: 'Hilarity', c: '#fde047', body: 'orb', eyes: 'happy', mouth: 'laugh', acc: ['cheeks'], d: 'Směje se tvým chybám. Ale myslí to dobře.' },
  { id: 'vanity', name: 'Vanity', c: '#f472b6', body: 'diamond', eyes: 'lashes', mouth: 'kiss', acc: ['bow', 'mirror'], d: 'Nejkrásnější verita v mřížce. Aspoň podle ní.' },
  { id: 'security', name: 'Security', c: '#1e3a8a', body: 'shield', eyes: 'focus', mouth: 'flat', acc: ['helmet'], d: 'Hlídá svou oblast. Nikdo jiný dovnitř nesmí.' },
  { id: 'royalty', name: 'Royalty', c: '#8b5cf6', body: 'gem', eyes: 'smug', mouth: 'smirk', acc: ['crown'], d: 'Modrá krev, fialové tělo, zlatá koruna.' },
  { id: 'loyalty', name: 'Loyalty', c: '#b45309', body: 'blob', eyes: 'happy', mouth: 'tongue', acc: ['ears'], d: 'Věrná jako pes. Zůstane ve své oblasti navždy.' },
  { id: 'anxiety', name: 'Anxiety', c: '#93c5fd', body: 'ghost', eyes: 'worried', mouth: 'wavy', acc: ['sweat', 'exclaim'], d: 'Co když je tu špatně? Co když tam? Co když…' },
  { id: 'calamity', name: 'Calamity', c: '#78716c', body: 'square', eyes: 'dizzy', mouth: 'o', acc: ['cracks', 'bandage'], d: 'Kudy chodí, tam se něco rozbije.' },
  { id: 'creativity', name: 'Creativity', c: '#f97316', body: 'cloud', eyes: 'stars', mouth: 'grin', acc: ['beret'], d: 'Kreslí fixami po mřížce. Hodně fixami.' },
  { id: 'productivity', name: 'Productivity', c: '#0ea5e9', body: 'square', eyes: 'glasses', mouth: 'flat', acc: ['tie', 'phone'], d: 'Vyřeší mřížku za 40 sekund a ještě odpoví na maily.' },
  { id: 'popularity', name: 'Popularity', c: '#ec4899', body: 'star', eyes: 'stars', mouth: 'grin', acc: ['partyhat', 'confetti'], d: 'Všichni ji chtějí ve své oblasti.' },
  { id: 'generosity', name: 'Generosity', c: '#eab308', body: 'blob', eyes: 'happy', mouth: 'smile', acc: ['coin', 'cheeks'], d: 'Rozdává nápovědy zadarmo. Vlastně jako tahle hra.' },
  { id: 'atrocity', name: 'Atrocity', c: '#4c1d95', body: 'spiky', eyes: 'cyclops', mouth: 'monster', acc: ['horns'], d: 'Ještě horší než Cruelty. Má jen jedno oko a všechno vidí.' },
  { id: 'prosperity', name: 'Prosperity', c: '#16a34a', body: 'diamond', eyes: 'dollar', mouth: 'grin', acc: ['coin'], d: 'Každá vyřešená mřížka = zisk.' },
  { id: 'sanity', name: 'Sanity', c: '#94a3b8', body: 'square', eyes: 'normal', mouth: 'flat', acc: [], d: 'Normální, rozumná, nudná. Vzácnější, než by sis myslel/a.' },
  { id: 'duality', name: 'Duality', c: '#e2e8f0', body: 'orb', eyes: 'wink', mouth: 'smirk', acc: ['split'], d: 'Napůl světlo, napůl tma. Napůl křížek, napůl verita.' },
  { id: 'density', name: 'Density', c: '#475569', body: 'square', eyes: 'closed', mouth: 'meh', acc: ['dumbbell'], d: 'Kilo na krychlový centimetr. Nepřenášet.' },
  { id: 'elasticity', name: 'Elasticity', c: '#a3e635', body: 'tall', eyes: 'happy', mouth: 'wavy', acc: [], d: 'Natáhne se přes celý sloupec. Skoro.' },
  { id: 'viscosity', name: 'Viscosity', c: '#d97706', body: 'goo', eyes: 'closed', mouth: 'o', acc: [], d: 'Pomalá jako med. Do políčka teče asi tři minuty.' },
  { id: 'radioactivity', name: 'Radioactivity', c: '#4ade80', body: 'orb', eyes: 'glow', mouth: 'grin', acc: ['radiation', 'rays'], d: 'Svítí ve tmě. Poločas rozpadu: jeden level.' },
  { id: 'ambiguity', name: 'Ambiguity', c: '#a78bfa', body: 'bean', eyes: 'mixed', mouth: 'meh', acc: ['question', 'exclaim'], d: 'Je tady? Není tady? Záleží, jak se díváš.' },
  { id: 'hostility', name: 'Hostility', c: '#b91c1c', body: 'spiky', eyes: 'angry', mouth: 'teeth', acc: ['scar'], d: 'Nemá ráda sousedy. Ani ty diagonální.' },
  { id: 'agility', name: 'Agility', c: '#10b981', body: 'drop', eyes: 'focus', mouth: 'smirk', acc: ['headband', 'speed'], d: 'Verita-ninja. Skočí kamkoli, jen ne vedle jiné verity.' },
  { id: 'fragility', name: 'Fragility', c: '#bae6fd', body: 'diamond', eyes: 'teary', mouth: 'sad', acc: ['cracks', 'bandage'], d: 'Ze skla. Klikej prosím jemně.' },
  { id: 'morality', name: 'Morality', c: '#f8fafc', body: 'blob', eyes: 'happy', mouth: 'smile', acc: ['wings', 'halo'], d: 'Nikdy nehádá. Řeší jen logikou.' },
  { id: 'mortality', name: 'Mortality', c: '#cbd5e1', body: 'ghost', eyes: 'hollow', mouth: 'o', acc: ['ghostlet'], d: 'Duch verity, která přišla o všechny tři životy.' },
  { id: 'brutality', name: 'Brutality', c: '#c2410c', body: 'square', eyes: 'angry', mouth: 'teeth', acc: ['headband', 'scar', 'dumbbell'], d: 'Posilovna, protein, verity. V tomhle pořadí.' },
  { id: 'novelty', name: 'Novelty', c: '#2dd4bf', body: 'star', eyes: 'stars', mouth: 'o', acc: ['sparkle', 'confetti'], d: 'Úplně nová verita! (Už zase.)' },
  { id: 'society', name: 'Society', c: '#065f46', body: 'gem', eyes: 'monocle', mouth: 'smirk', acc: ['tophat', 'mustache'], d: 'Vyšší společnost. Pije čaj s malíčkem nahoru.' },
  { id: 'charity', name: 'Charity', c: '#fdba74', body: 'heart', eyes: 'happy', mouth: 'smile', acc: ['halo', 'cheeks'], d: 'Dá ti svoje políčko, když ho potřebuješ víc.' },
  { id: 'clarity', name: 'Clarity', c: '#a5f3fc', body: 'diamond', eyes: 'glasses', mouth: 'smile', acc: ['sparkle'], d: 'Vidí řešení hned. Je trochu průhledná.' },
  { id: 'intensity', name: 'Intensity', c: '#ef4444', body: 'flame', eyes: 'fire', mouth: 'teeth', acc: [], d: 'Hraje na 300 %. Vždycky.' },
  { id: 'immunity', name: 'Immunity', c: '#6ee7b7', body: 'shield', eyes: 'normal', mouth: 'none', acc: ['facemask', 'shield'], d: 'Na ni chyby neplatí. Teda, skoro.' },
  { id: 'identity', name: 'Identity', c: '#334155', body: 'blob', eyes: 'domino', mouth: 'smirk', acc: ['idcard'], d: 'Tajná verita. Kdo to doopravdy je?' },
  { id: 'publicity', name: 'Publicity', c: '#fbbf24', body: 'star', eyes: 'big', mouth: 'shout', acc: ['exclaim', 'phone'], d: 'Musí o každé vyřešené mřížce dát příspěvek.' },
  { id: 'sobriety', name: 'Sobriety', c: '#7dd3fc', body: 'tall', eyes: 'normal', mouth: 'smile', acc: ['glass'], d: 'Pije jen vodu. Proto nikdy nedělá chyby.' },
  { id: 'puberty', name: 'Puberty', c: '#fda4af', body: 'bean', eyes: 'worried', mouth: 'wavy', acc: ['pimples', 'headphones'], d: 'Nic nechápeš. Prostě nech mě bejt v mý oblasti.' },
  { id: 'poverty', name: 'Poverty', c: '#a8a29e', body: 'blob', eyes: 'teary', mouth: 'sad', acc: ['patch'], d: 'Nemá ani na nápovědu. (Ta je ale zadarmo!)' },
  { id: 'liberty', name: 'Liberty', c: '#5eead4', body: 'tall', eyes: 'focus', mouth: 'smile', acc: ['libcrown', 'torch'], d: 'Svobodná verita. Může být kdekoli – podle pravidel.' },
  { id: 'honesty', name: 'Honesty', c: '#60a5fa', body: 'orb', eyes: 'big', mouth: 'smile', acc: ['sprout'], d: 'Nikdy nelže. Jestli tu není, řekne ti to.' },
  { id: 'safety', name: 'Safety', c: '#f97316', body: 'square', eyes: 'normal', mouth: 'smile', acc: ['hardhat'], d: 'Bezpečnost práce především. Křížky si dává dvakrát.' },
  { id: 'variety', name: 'Variety', c: '#f0abfc', body: 'cloud', eyes: 'mixed', mouth: 'grin', acc: ['stripes', 'confetti'], d: 'Od každé barvy trochu.' },
  { id: 'dynasty', name: 'Dynasty', c: '#7e22ce', body: 'shield', eyes: 'smug', mouth: 'flat', acc: ['crown', 'mustache'], d: 'Rod, který vládne levelům 90–100 už generace.' },
  { id: 'modesty', name: 'Modesty', c: '#e7d3b5', body: 'bean', eyes: 'down', mouth: 'tiny', acc: ['cheeks'], d: 'Ale no tak, to nic nebylo. Jen jsem vyřešila celou mřížku.' },
  { id: 'cavity', name: 'Cavity', c: '#f1f5f9', body: 'tooth', eyes: 'worried', mouth: 'o', acc: ['cracks'], d: 'Bolí ji zub. Moc sladkých nápověd.' },
  { id: 'city', name: 'City', c: '#64748b', body: 'square', eyes: 'normal', mouth: 'flat', acc: ['skyline'], d: 'Mřížka ulic, oblasti jako čtvrti. Celkem logické.' },
  { id: 'activity', name: 'Activity', c: '#22c55e', body: 'drop', eyes: 'happy', mouth: 'grin', acc: ['headband', 'sweat'], d: '10 000 kroků denně. Po mřížce.' },
  { id: 'reality', name: 'Reality', c: '#1f2937', body: 'blob', eyes: 'visor', mouth: 'o', acc: [], d: 'Je tohle skutečná mřížka, nebo jen simulace?' },
  { id: 'acidity', name: 'Acidity', c: '#fde047', body: 'drop', eyes: 'sour', mouth: 'wavy', acc: ['lemon'], d: 'Kyselá jako citron. Tvář má pořád stáhnutou.' },
  { id: 'solidity', name: 'Solidity', c: '#78716c', body: 'square', eyes: 'focus', mouth: 'flat', acc: ['cracks'], d: 'Pevná jako skála. Nehne se z políčka.' },
  { id: 'felicity', name: 'Felicity', c: '#fcd34d', body: 'orb', eyes: 'happy', mouth: 'laugh', acc: ['sun', 'cheeks'], d: 'Čistá radost. Září jako sluníčko.' },
  { id: 'audacity', name: 'Audacity', c: '#e11d48', body: 'gem', eyes: 'wink', mouth: 'tongue', acc: ['exclaim'], d: 'Má tu drzost položit se hned do prvního políčka.' },
  { id: 'captivity', name: 'Captivity', c: '#94a3b8', body: 'blob', eyes: 'teary', mouth: 'sad', acc: ['cage'], d: 'Zavřená ve své oblasti. Pusťte ji ven! (Nejde to.)' },
  { id: 'festivity', name: 'Festivity', c: '#f472b6', body: 'cloud', eyes: 'happy', mouth: 'laugh', acc: ['partyhat', 'confetti', 'note'], d: 'Párty po každém vyřešeném levelu.' },
  { id: 'tranquility', name: 'Tranquility', c: '#3b82f6', body: 'moon', eyes: 'closed', mouth: 'tiny', acc: ['zzz'], d: 'Spí. Prosím, neťukej na ni.' },
  { id: 'absurdity', name: 'Absurdity', c: '#bef264', body: 'tooth', eyes: 'derp', mouth: 'grin', acc: ['partyhat', 'mustache', 'note'], d: 'Zub s knírem na párty. Nedává to smysl. Přesně tak.' },
  { id: 'superiority', name: 'Superiority', c: '#ca8a04', body: 'diamond', eyes: 'smug', mouth: 'smirk', acc: ['crown', 'sparkle'], d: 'Je lepší než ostatní verity. Řekla to sama.' },
  { id: 'monstrosity', name: 'Monstrosity', c: '#65a30d', body: 'spiky', eyes: 'cyclops', mouth: 'monster', acc: ['horns', 'scar'], d: 'Ze stínu mezi oblastmi. Má hlad po verich.' },
  { id: 'mediocrity', name: 'Mediocrity', c: '#a1a1aa', body: 'blob', eyes: 'tiny', mouth: 'meh', acc: ['medal'], d: 'Třetí místo. Vždycky třetí.' },
  { id: 'obscurity', name: 'Obscurity', c: '#1e1b4b', body: 'ghost', eyes: 'glow', mouth: 'none', acc: ['shadow'], d: 'Vidíš jen oči. Možná ani to ne.' },
  { id: 'luminosity', name: 'Luminosity', c: '#fef08a', body: 'star', eyes: 'happy', mouth: 'smile', acc: ['rays', 'sparkle'], d: 'Svítí tak, že ani fixy nejsou potřeba.' },
  { id: 'hospitality', name: 'Hospitality', c: '#fde68a', body: 'blob', eyes: 'happy', mouth: 'smile', acc: ['chefhat', 'bowtie'], d: 'Vítej v mé oblasti! Dáš si něco?' },
  { id: 'eternity', name: 'Eternity', c: '#8b5cf6', body: 'moon', eyes: 'closed', mouth: 'smile', acc: ['hourglass', 'halo'], d: 'Čeká na tebe. Navždy. Klidně si dej pauzu.' },
  { id: 'chillity', name: 'Chillity', c: '#67e8f9', body: 'cloud', eyes: 'shades', mouth: 'smile', acc: ['ice'], d: 'Úplně v klidu. Prostě chill, kámo.' },
  { id: 'sleepity', name: 'Sleepity', c: '#a5b4fc', body: 'bean', eyes: 'closed', mouth: 'o', acc: ['zzz', 'bubbles'], d: 'Usnula uprostřed levelu 37.' },
  { id: 'hungrity', name: 'Hungrity', c: '#fb7185', body: 'fat', eyes: 'big', mouth: 'drool', acc: ['fork'], d: 'Kamarádka Obesity. Sní ti křížky.' },
  { id: 'gamerity', name: 'Gamerity', c: '#22d3ee', body: 'square', eyes: 'focus', mouth: 'grin', acc: ['headphones'], d: 'GG EZ. Level 100 na první pokus. (Prý.)' },
  { id: 'cringity', name: 'Cringity', c: '#c084fc', body: 'bean', eyes: 'x', mouth: 'teeth', acc: ['sweat'], d: 'Viděla tvůj první tah. Ještě se z toho nevzpamatovala.' },
  { id: 'memity', name: 'Memity', c: '#facc15', body: 'orb', eyes: 'shades', mouth: 'smirk', acc: ['phone'], d: 'Je z ní meme. Sdílej odpovědně.' },
  { id: 'spicity', name: 'Spicity', c: '#ef4444', body: 'flame', eyes: 'lashes', mouth: 'kiss', acc: ['sparkle'], d: 'Pálivá jako chilli. Opatrně.' },
  { id: 'chaosity', name: 'Chaosity', c: '#f43f5e', body: 'cloud', eyes: 'spiral', mouth: 'shout', acc: ['bolt', 'confetti'], d: 'Kde je ona, tam končí logika. Naštěstí ne v téhle hře.' },
];

const BY_ID = new Map(VERITY_TYPES.map((t) => [t.id, t]));
export function typeById(id) { return BY_ID.get(id) || VERITY_TYPES[0]; }

/** Inner SVG for a type (no outer <svg>). */
export function typeInner(t) {
  const b = BODIES[t.body] || BODIES.blob;
  const behind = (t.acc || []).filter((a) => ['wings', 'ears', 'ring', 'speed', 'rays'].includes(a));
  const front = (t.acc || []).filter((a) => !behind.includes(a));
  const overlay = front.filter((a) => a === 'split' || a === 'stripes' || a === 'shadow');
  const top = front.filter((a) => !overlay.includes(a));
  const clipId = 'clip-' + t.id;
  const ov = overlay.length
    ? `<clipPath id="${clipId}">${b.svg}</clipPath><g clip-path="url(#${clipId})">${overlay.map((a) => ACC[a]).join('')}</g>${b.svg.replace(/fill="var\(--b\)"/g, 'fill="none"')}`
    : '';
  return `<g style="--b:${t.c}">` +
    behind.map((a) => ACC[a]).join('') +
    b.svg + ov +
    `<g transform="translate(0 ${b.d})">${EYES[t.eyes] || EYES.normal}${MOUTHS[t.mouth] ?? MOUTHS.smile}</g>` +
    top.map((a) => ACC[a] || '').join('') +
    '</g>';
}

/** Inject <symbol id="vt-<id>"> for every type into the page once. */
export function installSprite() {
  if (document.getElementById('vt-sprite')) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('id', 'vt-sprite');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.innerHTML = VERITY_TYPES.map((t) => `<symbol id="vt-${t.id}" viewBox="-4 -4 108 108" overflow="visible">${typeInner(t)}</symbol>`).join('');
  document.body.prepend(svg);
}

/** Pick `count` distinct types for a puzzle, deterministically from a seed. */
export function pickTypes(count, seed) {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ids = VERITY_TYPES.map((t) => t.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, count);
}
