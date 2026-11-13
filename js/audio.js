// Hangok: minden hang szintetizált (WebAudio), nincs külön hangfájl.
let ctx = null;
let muted = false;

export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* nincs hang */ }
}
export function setMuted(m) { muted = m; }

function tone(freq, dur, { type = 'sine', vol = 0.2, to = null, delay = 0 } = {}) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, { vol = 0.3, freq = 1200, q = 0.8, delay = 0, type = 'bandpass' } = {}) {
  const t = ctx.currentTime + delay;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t);
}

const SOUNDS = {
  click: () => tone(900, 0.05, { type: 'square', vol: 0.12 }),
  pick: () => { tone(520, 0.07, { vol: 0.15 }); tone(780, 0.09, { vol: 0.15, delay: 0.06 }); },
  gain: () => { tone(660, 0.08, { type: 'triangle', vol: 0.18 }); tone(990, 0.14, { type: 'triangle', vol: 0.18, delay: 0.07 }); },
  shot: () => { noise(0.12, { vol: 0.5, freq: 900 }); tone(240, 0.12, { type: 'square', vol: 0.2, to: 70 }); },
  crash: () => { noise(0.35, { vol: 0.5, freq: 2600, q: 0.4 }); tone(140, 0.25, { type: 'sawtooth', vol: 0.2, to: 50 }); },
  whoosh: () => noise(0.25, { vol: 0.2, freq: 600, q: 1.5 }),
  zap: () => { tone(110, 0.4, { type: 'sawtooth', vol: 0.25, to: 40 }); noise(0.3, { vol: 0.25, freq: 4000 }); },
  fart: () => { for (let i = 0; i < 7; i++) tone(95 - i * 5 + Math.random() * 16, 0.13, { type: 'sawtooth', vol: 0.3, delay: i * 0.085 }); },
  meow: () => { tone(520, 0.3, { type: 'triangle', vol: 0.2, to: 900 }); tone(900, 0.35, { type: 'triangle', vol: 0.2, to: 430, delay: 0.3 }); },
  cough: () => { for (let i = 0; i < 3; i++) noise(0.12, { vol: 0.35, freq: 500, q: 2, delay: i * 0.22 }); },
  ring: () => { for (let i = 0; i < 4; i++) tone(i % 2 ? 1320 : 1100, 0.09, { type: 'square', vol: 0.1, delay: i * 0.1 }); },
  megaphone: () => {
    // torzított, nagyon hangos sziréna
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), sh = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 6); }
    sh.curve = curve;
    o.type = 'sawtooth'; o2.type = 'square';
    for (let i = 0; i < 6; i++) {
      o.frequency.setValueAtTime(i % 2 ? 620 : 470, t + i * 0.2);
      o2.frequency.setValueAtTime(i % 2 ? 931 : 705, t + i * 0.2);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55, t + 0.04);
    g.gain.setValueAtTime(0.55, t + 1.1);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
    o.connect(sh); o2.connect(sh); sh.connect(g).connect(ctx.destination);
    o.start(t); o2.start(t); o.stop(t + 1.35); o2.stop(t + 1.35);
    noise(1.2, { vol: 0.25, freq: 1800, q: 0.5 });
  },
  scream: () => { tone(700, 0.7, { type: 'sawtooth', vol: 0.22, to: 1300 }); tone(720, 0.7, { type: 'square', vol: 0.1, to: 1250 }); },
  slip: () => { tone(300, 0.35, { type: 'sine', vol: 0.3, to: 1400 }); noise(0.25, { vol: 0.5, freq: 200, q: 0.7, delay: 0.4 }); tone(90, 0.3, { type: 'sine', vol: 0.45, to: 40, delay: 0.4 }); },
  pa: () => { tone(784, 0.35, { type: 'sine', vol: 0.2 }); tone(622, 0.5, { type: 'sine', vol: 0.2, delay: 0.32 }); },
  chime: () => { tone(523, 0.12, { type: 'triangle', vol: 0.15 }); tone(659, 0.12, { type: 'triangle', vol: 0.15, delay: 0.1 }); tone(392, 0.25, { type: 'triangle', vol: 0.15, delay: 0.2 }); },
  ringtone: () => { for (let i = 0; i < 6; i++) tone([988, 784, 659, 784, 988, 1319][i], 0.12, { type: 'square', vol: 0.08, delay: i * 0.13 }); },
  combo: () => { tone(880, 0.06, { type: 'square', vol: 0.1 }); tone(1320, 0.1, { type: 'square', vol: 0.1, delay: 0.06 }); },
  ouch: () => { tone(420, 0.25, { type: 'sawtooth', vol: 0.2, to: 900 }); tone(300, 0.2, { type: 'square', vol: 0.08, to: 600 }); },
  pour: () => noise(0.7, { vol: 0.25, freq: 900, q: 0.6 }),
  alarm: () => { for (let i = 0; i < 4; i++) tone(i % 2 ? 960 : 760, 0.22, { type: 'square', vol: 0.14, delay: i * 0.22 }); },
  heart: () => { tone(58, 0.11, { type: 'sine', vol: 0.55 }); tone(52, 0.13, { type: 'sine', vol: 0.45, delay: 0.17 }); },
  tick: () => tone(1800, 0.025, { type: 'square', vol: 0.05 }),
  snitch: () => { tone(880, 0.1, { type: 'triangle', vol: 0.18 }); tone(1175, 0.16, { type: 'triangle', vol: 0.18, delay: 0.1 }); },
  lock: () => { tone(1400, 0.04, { type: 'square', vol: 0.12 }); tone(700, 0.08, { type: 'square', vol: 0.14, delay: 0.09 }); },
  knock: () => { for (let i = 0; i < 3; i++) { tone(130, 0.07, { type: 'sine', vol: 0.4, to: 70, delay: i * 0.16 }); noise(0.04, { vol: 0.15, freq: 400, q: 1, delay: i * 0.16 }); } },
  quiz: () => { tone(659, 0.14, { type: 'triangle', vol: 0.2 }); tone(523, 0.14, { type: 'triangle', vol: 0.2, delay: 0.15 }); tone(392, 0.3, { type: 'triangle', vol: 0.2, delay: 0.3 }); },
  goal: () => [659, 784, 988].forEach((f, i) => tone(f, 0.16, { type: 'triangle', vol: 0.18, delay: i * 0.09 })),
  hiss: () => { noise(0.45, { vol: 0.35, freq: 5000, q: 0.4, type: 'highpass' }); tone(1800, 0.05, { type: 'square', vol: 0.05 }); },
  zip: () => { for (let i = 0; i < 6; i++) noise(0.03, { vol: 0.12, freq: 3000 + i * 300, q: 2, delay: i * 0.035 }); },
  thwack: () => { tone(180, 0.12, { type: 'square', vol: 0.3, to: 60 }); noise(0.08, { vol: 0.4, freq: 1200, q: 0.7 }); },
  boom: () => { noise(0.9, { vol: 0.5, freq: 160, q: 0.5, type: 'lowpass' }); tone(70, 0.6, { type: 'sine', vol: 0.5, to: 30 }); },
  launch: () => { noise(0.5, { vol: 0.3, freq: 900, q: 0.6 }); tone(300, 0.4, { type: 'sawtooth', vol: 0.08, to: 120 }); },
  smash: () => { noise(0.6, { vol: 0.5, freq: 3000, q: 0.3 }); tone(90, 0.3, { type: 'square', vol: 0.25, to: 40 }); for (let i = 0; i < 5; i++) tone(2000 + Math.random() * 2000, 0.06, { type: 'triangle', vol: 0.08, delay: 0.05 + i * 0.07 }); },
  chase: () => { tone(220, 0.15, { type: 'sawtooth', vol: 0.15 }); tone(233, 0.3, { type: 'sawtooth', vol: 0.15, delay: 0.15 }); },
  ping: () => tone(1320, 0.12, { type: 'sine', vol: 0.15 }),
  bell: () => { for (let i = 0; i < 10; i++) tone(1568, 0.09, { type: 'square', vol: 0.09, delay: i * 0.1 }); },
  strike: () => { tone(196, 0.5, { type: 'sawtooth', vol: 0.3 }); tone(207, 0.5, { type: 'sawtooth', vol: 0.3 }); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.22, delay: i * 0.13 })),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, { type: 'sawtooth', vol: 0.18, delay: i * 0.18 })),
};

export function play(name) {
  if (muted || !ctx || ctx.state !== 'running') return;
  try { SOUNDS[name]?.(); } catch { /* ignore */ }
}

// ---- háttérzene: generált, „lopakodós” téma, ami a feszültséggel együtt sűrűsödik ----
const M = { on: true, mode: 'off', tension: 0, hurry: false, step: 0, next: 0, gain: null, timer: null };
const D2 = 73.42, D4 = 293.66;
const st = (base, semis) => base * Math.pow(2, semis / 12);
const _ = null;
const BASS = [
  [0, _, _, 0, _, _, 3, _, 5, _, _, 5, _, 3, _, _],
  [0, _, _, 0, _, _, 3, _, 5, _, 6, _, 5, _, 3, _],
  [-4, _, _, -4, _, _, -2, _, 0, _, _, 0, _, -2, _, _],
  [-5, _, _, -5, _, _, -1, _, 2, _, _, 2, _, 1, _, -1],
];
const LEAD = [
  [_, _, _, _, _, _, _, _, 0, _, 3, _, 5, _, 3, _],
  [_, _, 7, _, 5, _, 3, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, -4, _, 0, _, 3, _, 0, _],
  [_, _, 4, _, 1, _, -1, _, _, _, -5, _, -1, _, 1, _],
];
const PADS = [[12, 15, 19], [12, 15, 19], [8, 12, 15], [7, 11, 14]]; // Dm, Dm, B, A (D2-höz képest)

function mNote(freq, t, dur, { type = 'triangle', vol = 0.1, lp = 0, attack = 0.005 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  let node = o;
  if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
  node.connect(g).connect(M.gain);
  o.start(t); o.stop(t + dur + 0.03);
}
let noiseBuf = null;
function mNoise(t, dur, vol, freq, type = 'highpass') {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  src.connect(f).connect(g).connect(M.gain);
  src.start(t); src.stop(t + dur + 0.02);
}
function mKick(t, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.2);
  o.connect(g).connect(M.gain); o.start(t); o.stop(t + 0.22);
}
// Fizika-téma: e-moll, pengetős, „settenkedő” basszus
const F_BASS = [
  [0, _, 7, _, 0, _, 7, _, 3, _, 10, _, 3, _, 2, _],
  [0, _, 7, _, 0, _, 7, _, 5, _, 12, _, 5, _, 3, _],
  [-4, _, 3, _, -4, _, 3, _, -2, _, 5, _, -2, _, -1, _],
  [-5, _, 2, _, -5, _, 2, _, -1, _, 6, _, -1, _, -2, _],
];
const F_LEAD = [
  [12, _, _, 15, _, _, 14, _, 12, _, _, _, 10, _, 11, _],
  [_, _, _, _, 12, _, 15, _, 19, _, 17, _, 15, _, _, _],
  [8, _, _, 12, _, _, 11, _, 8, _, _, _, 7, _, 8, _],
  [7, _, _, 11, _, _, 14, _, 13, _, 11, _, 10, _, _, _],
];
const E2 = 82.41, E4 = 329.63;
function playStepF(step, t, dur) {
  const bar = (step >> 4) % 4, i = step & 15, ten = M.tension;
  const b = F_BASS[bar][i];
  if (b != null) mNote(st(E2, b), t, dur * 0.9, { type: 'square', vol: 0.1, lp: 700 + ten * 900 });
  if (i === 0 || i === 8 || (ten > 0.4 && (i === 6 || i === 14))) mKick(t, 0.26);
  if (i === 4 || i === 12) mNoise(t, 0.05, 0.05, 2500, 'bandpass');
  if (i % 2 === 1 && ten > 0.3) mNoise(t, 0.02, 0.02, 9000);
  const l = F_LEAD[bar][i];
  if (l != null && (ten > 0.15 || bar % 2 === 0)) mNote(st(E4, l - 12), t, 0.16, { type: 'triangle', vol: 0.05 + ten * 0.03 });
  if (ten > 0.7 && i % 2 === 0) mNote(st(E4, (i % 4 ? 1 : 0)), t, dur * 0.7, { type: 'sawtooth', vol: 0.02, lp: 2000 });
  if (M.hurry && i % 4 === 0) mNote(st(E4, 12), t, 0.05, { type: 'square', vol: 0.03 });
}
function playStep(step, t, dur) {
  if (M.theme === 'fizika' && M.mode === 'play') return playStepF(step, t, dur);
  const bar = (step >> 4) % 4, i = step & 15;
  const ten = M.tension;
  if (M.mode === 'menu') {
    if (i === 0) for (const s of PADS[bar]) mNote(st(D2, s), t, dur * 15, { type: 'sine', vol: 0.045, attack: 0.3 });
    if (i === 0 || i === 6 || i === 8) mNote(st(D2, BASS[bar][0]), t, dur * 3, { type: 'sine', vol: 0.14 });
    if (i === 4 || i === 12) mNoise(t, 0.04, 0.02, 7000);
    const l = LEAD[bar][i];
    if (l != null && bar % 2 === 0) mNote(st(D4, l), t, 0.3, { type: 'triangle', vol: 0.035 });
    return;
  }
  // játék: basszus + ütősök mindig, a többi a feszültségtől függ
  const b = BASS[bar][i];
  if (b != null) mNote(st(D2, b), t, dur * 1.8, { type: 'triangle', vol: 0.2, lp: 500 + ten * 500 });
  if (i === 0 || i === 8 || (ten > 0.5 && i === 10)) mKick(t, 0.3);
  if (i === 4 || i === 12) mNoise(t, 0.07, 0.06, 1800, 'bandpass');
  if (i % 2 === 0) mNoise(t, i === 14 ? 0.09 : 0.03, i % 4 === 2 ? 0.035 : 0.02, 8000);
  else if (ten > 0.45) mNoise(t, 0.02, 0.015, 9000);
  const l = LEAD[bar][i];
  if (l != null && ten > 0.2) mNote(st(D4, l), t, 0.22, { type: 'triangle', vol: 0.06 + ten * 0.03 });
  if (ten > 0.6) mNote(st(D4, i % 2 ? 8 : 7), t, dur * 0.8, { type: 'square', vol: 0.018 + (ten - 0.6) * 0.03, lp: 2500 });
  if (M.hurry && i % 4 === 0) mNote(st(D4, 12), t, 0.05, { type: 'square', vol: 0.03 });
}
function sched() {
  if (!ctx || ctx.state !== 'running') return;
  if (muted || !M.on || M.mode === 'off' || document.hidden) { M.next = ctx.currentTime + 0.12; return; }
  if (M.next < ctx.currentTime) M.next = ctx.currentTime + 0.05;
  while (M.next < ctx.currentTime + 0.25) {
    const bpm = M.mode === 'menu' ? 76 : (M.theme === 'fizika' ? 108 + 30 * M.tension : 98 + 16 * M.tension) + (M.hurry ? 14 : 0);
    const dur = 60 / bpm / 4;
    playStep(M.step, M.next, dur);
    M.next += dur;
    M.step = (M.step + 1) % 64;
  }
}
// mode: 'menu' | 'play' | 'off'; tension: 0..1
export function music(mode, tension = 0, hurry = false, theme = 'tori') {
  if ((mode !== M.mode && (mode === 'play' || M.mode === 'play')) || theme !== M.theme) M.step = 0;
  M.mode = mode; M.hurry = hurry; M.theme = theme;
  M.tension += (Math.max(0, Math.min(1, tension)) - M.tension) * 0.05;
  if (!M.timer && ctx) {
    M.gain = ctx.createGain();
    M.gain.gain.value = 0.55;
    M.gain.connect(ctx.destination);
    M.timer = setInterval(sched, 50);
  }
}
export function setMusicEnabled(v) { M.on = !!v; }
