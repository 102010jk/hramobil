// Všechny zvuky jsou syntetizované přes WebAudio – žádné soubory ke stažení.

let ac = null;
let master = null;
let noiseBuf = null;
let enabled = true;
const VOLUME = 0.55;

export function initAudio() {
  if (ac) {
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = enabled ? VOLUME : 0;
  master.connect(ac.destination);

  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

export function setSound(on) {
  enabled = on;
  if (master) master.gain.setTargetAtTime(on ? VOLUME : 0, ac.currentTime, 0.02);
}

export function suspendAudio() {
  if (ac && ac.state === 'running') ac.suspend().catch(() => {});
}

function ready() {
  return ac && enabled && ac.state === 'running';
}

function tone({ type = 'sine', f0, f1 = f0, dur = 0.15, vol = 0.3, delay = 0, attack = 0.005 }) {
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise({ dur = 0.2, vol = 0.3, f = 1200, f1 = f, q = 1, type = 'bandpass', delay = 0 }) {
  const t = ac.currentTime + delay;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const flt = ac.createBiquadFilter();
  flt.type = type;
  flt.frequency.setValueAtTime(f, t);
  if (f1 !== f) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
  flt.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(flt).connect(g).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

export const sfx = {
  moo(pitch = 1, len = 1) {
    if (!ready()) return;
    const t = ac.currentTime;
    const dur = 0.95 * len;
    const out = ac.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.32, t + 0.1);
    out.gain.setValueAtTime(0.32, t + dur * 0.7);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    const flt = ac.createBiquadFilter();
    flt.type = 'lowpass';
    flt.Q.value = 5;
    flt.frequency.setValueAtTime(380, t);
    flt.frequency.linearRampToValueAtTime(950, t + dur * 0.35);
    flt.frequency.linearRampToValueAtTime(450, t + dur);
    flt.connect(out).connect(master);

    const lfo = ac.createOscillator();
    const lfoG = ac.createGain();
    lfo.frequency.value = 5.5;
    lfoG.gain.value = 3;
    lfo.connect(lfoG);

    for (const det of [0, 1.8]) {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      const base = 118 * pitch + det;
      o.frequency.setValueAtTime(base * 0.92, t);
      o.frequency.linearRampToValueAtTime(base * 1.18, t + dur * 0.25);
      o.frequency.linearRampToValueAtTime(base * 0.86, t + dur);
      lfoG.connect(o.frequency);
      o.connect(flt);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  },
  plop() {
    if (!ready()) return;
    tone({ type: 'sine', f0: 520, f1: 180, dur: 0.12, vol: 0.18 });
  },
  pff() {
    if (!ready()) return;
    noise({ dur: 0.28, vol: 0.25, f: 220, f1: 90, q: 3 });
    tone({ type: 'square', f0: 90, f1: 60, dur: 0.22, vol: 0.05 });
  },
  catch(combo = 0) {
    if (!ready()) return;
    const f = 520 * Math.pow(2, Math.min(combo, 14) / 12);
    tone({ type: 'triangle', f0: f, f1: f * 1.5, dur: 0.1, vol: 0.22 });
    tone({ type: 'sine', f0: f * 2, dur: 0.08, vol: 0.06, delay: 0.03 });
  },
  golden() {
    if (!ready()) return;
    [784, 988, 1175, 1568].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.16, vol: 0.18, delay: i * 0.06 }));
  },
  crack() {
    if (!ready()) return;
    noise({ dur: 0.09, vol: 0.5, f: 3200, q: 0.8 });
    noise({ dur: 0.25, vol: 0.3, f: 900, f1: 300, q: 1.2, delay: 0.03 });
    tone({ type: 'sine', f0: 160, f1: 70, dur: 0.18, vol: 0.2 });
  },
  splat() {
    if (!ready()) return;
    noise({ dur: 0.35, vol: 0.45, f: 500, f1: 120, q: 1.5, type: 'lowpass' });
    tone({ type: 'sine', f0: 140, f1: 50, dur: 0.3, vol: 0.3 });
  },
  softLand() {
    if (!ready()) return;
    noise({ dur: 0.12, vol: 0.12, f: 300, q: 1, type: 'lowpass' });
  },
  power() {
    if (!ready()) return;
    tone({ type: 'sawtooth', f0: 300, f1: 1200, dur: 0.3, vol: 0.08 });
    [660, 880, 1320].forEach((f, i) => tone({ type: 'sine', f0: f, dur: 0.14, vol: 0.14, delay: 0.05 + i * 0.07 }));
  },
  heart() {
    if (!ready()) return;
    [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'sine', f0: f, dur: 0.18, vol: 0.18, delay: i * 0.07 }));
  },
  hurt() {
    if (!ready()) return;
    tone({ type: 'square', f0: 220, f1: 110, dur: 0.25, vol: 0.08 });
  },
  level() {
    if (!ready()) return;
    [523, 659, 784].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.14, vol: 0.18, delay: i * 0.09 }));
    tone({ type: 'triangle', f0: 1046, dur: 0.4, vol: 0.2, delay: 0.27 });
  },
  frenzy() {
    if (!ready()) return;
    for (let i = 0; i < 8; i++) tone({ type: 'square', f0: 400 + i * 90, dur: 0.07, vol: 0.06, delay: i * 0.05 });
  },
  over() {
    if (!ready()) return;
    [392, 330, 262, 196].forEach((f, i) => tone({ type: 'triangle', f0: f, f1: f * 0.97, dur: 0.3, vol: 0.2, delay: i * 0.2 }));
  },
  click() {
    if (!ready()) return;
    tone({ type: 'sine', f0: 700, f1: 500, dur: 0.06, vol: 0.12 });
  },
  buy() {
    if (!ready()) return;
    [880, 1320].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.12, vol: 0.16, delay: i * 0.08 }));
  },
};
