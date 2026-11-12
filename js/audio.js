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
  bell: () => { for (let i = 0; i < 10; i++) tone(1568, 0.09, { type: 'square', vol: 0.09, delay: i * 0.1 }); },
  strike: () => { tone(196, 0.5, { type: 'sawtooth', vol: 0.3 }); tone(207, 0.5, { type: 'sawtooth', vol: 0.3 }); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.22, delay: i * 0.13 })),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, { type: 'sawtooth', vol: 0.18, delay: i * 0.18 })),
};

export function play(name) {
  if (muted || !ctx || ctx.state !== 'running') return;
  try { SOUNDS[name]?.(); } catch { /* ignore */ }
}
