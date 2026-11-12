// A játék szabályai és Taba viselkedése. Csak a host (vagy egyjátékos mód) futtatja;
// a többiek az innen kiküldött állapotot rajzolják ki.
import {
  ROUND_TIME, METER_MAX, MAX_STRIKES, WC_LIMIT, ROOM, WC, P, SEATS, ITEMS, TOBS, NAV, AISLES, FRONT_Z, BACK_Z,
  makeItems, interactions, projState, isDark, collide, inWC, skinById,
} from './data.js';
import { LINES, line } from './lines.js';

const PI = Math.PI;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const yawTo = (ax, az, bx, bz) => Math.atan2(bx - ax, bz - az);
const angDiff = (a, b) => {
  let d = (a - b) % (2 * PI);
  if (d > PI) d -= 2 * PI;
  if (d < -PI) d += 2 * PI;
  return d;
};

function segHits(ax, az, bx, bz, b) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  for (const [p, d, lo, hi] of [[ax, dx, b.x0, b.x1], [az, dz, b.z0, b.z1]]) {
    if (Math.abs(d) < 1e-9) { if (p <= lo || p >= hi) return false; }
    else {
      let a = (lo - p) / d, c = (hi - p) / d;
      if (a > c) [a, c] = [c, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, c);
      if (t0 >= t1 - 1e-9) return false;
    }
  }
  return true;
}
const inBox = (x, z) => TOBS.some((b) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1);
const clear = (a, b) => !TOBS.some((o) => segHits(a.x, a.z, b.x, b.z, o));
const nearestNav = (x, z) => NAV.reduce((b, q) => (dist(q.x, q.z, x, z) < dist(b.x, b.z, x, z) ? q : b), NAV[0]);

// Láthatósági gráf a padok között
export function findPath(ax, az, bx, bz) {
  const goal = inBox(bx, bz) ? nearestNav(bx, bz) : { x: bx, z: bz };
  const nodes = [{ x: ax, z: az }, ...NAV, goal];
  const n = nodes.length, G = n - 1;
  const d = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false);
  d[0] = 0;
  for (let k = 0; k < n; k++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || d[i] < d[u])) u = i;
    if (u < 0 || d[u] === Infinity) break;
    done[u] = true;
    if (u === G) break;
    for (let v = 0; v < n; v++) {
      if (done[v]) continue;
      if (!clear(nodes[u], nodes[v]) && !(u === 0 && inBox(ax, az))) continue;
      const nd = d[u] + dist(nodes[u].x, nodes[u].z, nodes[v].x, nodes[v].z);
      if (nd < d[v]) { d[v] = nd; prev[v] = u; }
    }
  }
  if (d[G] === Infinity) return [goal];
  const path = [];
  for (let u = G; u > 0; u = prev[u]) path.unshift({ x: nodes[u].x, z: nodes[u].z });
  return path;
}

function raySphere(o, d, c, r) {
  const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2];
  const b = ox * d[0] + oy * d[1] + oz * d[2];
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - cc;
  if (disc < 0) return -1;
  const t = -b - Math.sqrt(disc);
  return t > 0 ? t : -1;
}
function rayRoom(o, d) {
  let t = 60;
  const lim = [[ROOM.x0, ROOM.x1], [0, ROOM.h], [ROOM.z0, ROOM.z1]];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-6) continue;
    const tt = ((d[i] > 0 ? lim[i][1] : lim[i][0]) - o[i]) / d[i];
    if (tt > 0 && tt < t) t = tt;
  }
  return t;
}

const CHAIR_SPOT = { x: P.chair.x, z: P.chair.z, yaw: 0 };
const FIX = {
  lights: { spot: { x: 4.5, z: -3.3, yaw: PI / 2 }, dur: 0.9, say: 'fixLights' },
  fuse: { spot: { x: 2.6, z: 5.25, yaw: 0 }, dur: 4, say: 'fixFuse' },
  plug: { spot: { x: 4.3, z: -5.35, yaw: PI * 0.75 }, dur: 2.5, say: 'fixPlug' },
  draw: { spot: CHAIR_SPOT, dur: 2.2, say: 'fixDraw' },
  doodle: { spot: { x: P.board.x, z: -5.3, yaw: PI }, dur: 3.5, say: 'fixDoodle' },
  window: { spot: { x: -4.4, z: 0, yaw: -PI / 2 }, dur: 1.5, say: 'fixWindow' },
  hdmi: { spot: CHAIR_SPOT, dur: 1.8, say: 'fixHdmi' },
  usb: { spot: CHAIR_SPOT, dur: 2.2, say: 'fixUsb' },
  screen: { spot: { x: 3.0, z: -4.6, yaw: PI }, dur: 2.5, say: 'fixScreen' },
  projbroken: { spot: { x: 3.0, z: -4.6, yaw: PI }, dur: 6, say: 'fixProjBroken' },
};
const BUSY = ['laptop', 'board', 'projector', 'lecture', 'patrol'];
const EVENT_KINDS = ['update', 'call', 'away'];

const COUNT = ['EGY!', 'KETTŐ!', 'HÁROM!'];

export class Sim {
  constructor(emit) {
    this.emit = emit || (() => {});
    this.s = { phase: 'lobby', reason: '', t: ROUND_TIME, meter: 0, strikes: 0, players: {}, items: [], lockers: [0, 0, 0], cd: {}, taba: { x: 0, z: -4.2, yaw: 0, st: 'lecture', fov: 1.5, range: 0, say: '', sit: false, count: 0 } };
  }

  // ---- játékosok -------------------------------------------------------
  addPlayer(id, name, skin) {
    const s = this.s;
    const used = new Set(Object.values(s.players).map((p) => p.seat));
    let seat = 0;
    while (used.has(seat)) seat++;
    const st = SEATS[seat % SEATS.length];
    s.players[id] = { id, name: String(name || 'Diák').slice(0, 14), skin: skinById(skin).id, seat, x: st.x, z: st.z, yaw: st.yaw, pitch: 0, held: null, act: null, sus: 0, immune: 0, seen: false, hot: 0, wc: 0, score: 0, caught: 0, dragged: false, drawing: false };
    this.emit({ e: 'toast', m: `${s.players[id].name} belépett a terembe`, k: 'info' });
  }
  removePlayer(id) {
    const p = this.s.players[id];
    if (!p) return;
    this.dropHeld(p);
    delete this.s.players[id];
    if (this.hunt === id) this.hunt = null;
    this.emit({ e: 'toast', m: `${p.name} kilépett`, k: 'info' });
  }
  scale() { return 1 + 0.45 * (Math.max(1, Object.keys(this.s.players).length) - 1); }

  // ---- óra indítása ----------------------------------------------------
  start() {
    const old = this.s.players;
    this.s = {
      phase: 'play', reason: '', t: ROUND_TIME, meter: 0, strikes: 0,
      lights: true, power: true, plug: true, proj: 'on', hdmi: true, usb: false, screenTorn: false, drawOn: false, drawId: 0,
      board: 0.4, doodle: false,
      laptop: 'desk', lapBroken: false, win: false, chairTrap: null, deskTrap: null,
      clock: true, plant: true, globe: true, glass: [1, 1],
      lockers: [0, 0, 0], cd: {}, cloud: null, winUpdate: null, final: '', endKind: '',
      stats: { slips: 0, farts: 0, glued: 0, snakes: 0, stinks: 0, megas: 0, shots: 0, broken: 0, lapOut: 0, draws: 0, doodles: 0, wcHunts: 0, planes: 0, events: 0, maxCombo: 0 },
      taba: { x: P.chair.x, z: P.chair.z, yaw: 0, st: 'laptop', fov: 1.0, range: 2.2, say: '', sit: true, count: 0, stress: 0, chair: 0, green: 0, hidden: false },
      players: old, items: makeItems(),
    };
    for (const p of Object.values(old)) {
      const st = SEATS[p.seat % SEATS.length];
      Object.assign(p, { x: st.x, z: st.z, yaw: st.yaw, held: null, act: null, sus: 0, immune: 3, seen: false, hot: 0, wc: 0, wcTotal: 0, score: 0, caught: 0, dragged: false, drawing: false });
      this.emit({ e: 'tp', pid: p.id, x: p.x, z: p.z, yaw: p.yaw });
    }
    this.counts = {};
    this.tasks = [];
    this.notices = [];
    this.look = null;
    this.stun = 0; this.stunKind = 'stun';
    this.countT = 0;
    this.endT = 0; this.endInfo = null;
    this.hunt = null;
    this.sayT = 0;
    this.wantYaw = 0;
    this.lapLost = false; this.projLost = false; this.searches = 0;
    this.last = 'lecture';
    this.reacts = [];
    this.combo = 0; this.lastHit = -99; this.comboSaid = -99;
    this.eventT = rnd(28, 40); this.lastEvent = null;
    this.saidStress = {};
    this.chairLineT = 6;
    this.act = { kind: 'laptop', phase: 'do', t: 8, dur: 8, spot: { ...CHAIR_SPOT }, g: rnd(5, 8), m: 5 };
    this.say(line('greet'), 3.5);
    this.emit({ e: 'snd', n: 'bell' });
  }

  end(phase, reason, kind = phase) {
    if (this.s.phase !== 'play') return;
    this.s.phase = phase;
    this.s.reason = reason;
    this.s.endKind = kind;
    this.s.final = line(phase === 'won' ? 'endWin' : 'endLose');
    for (const p of Object.values(this.s.players)) { p.act = null; p.dragged = false; }
    this.emit({ e: 'end', phase });
  }
  endSoon(t, phase, reason, kind) {
    if (this.endT > 0) return;
    this.endT = t;
    this.endInfo = [phase, reason, kind];
  }

  say(text, t = 2.6, mood = 'normal') {
    this.s.taba.say = text;
    this.sayT = Math.max(t, 1 + text.length / 16);
    this.emit({ e: 'say', m: text, mood, stress: Math.round(this.s.taba.stress * 100) / 100 });
  }
  // hangosbemondó (nem Taba beszél)
  announce(text) {
    this.emit({ e: 'snd', n: 'pa' });
    this.emit({ e: 'say', m: text, mood: 'pa' });
  }
  // késleltetett reakció egy sorral
  react(key, delay = 1, mood = 'angry', vars) {
    this.reacts.push({ key, t: delay, mood, vars, life: 7 });
  }
  shake(a = 0.5) { this.emit({ e: 'shake', a }); }

  canStun() { return this.stun <= 0 && this.countT <= 0 && this.endT <= 0 && !this.s.taba.hidden && !(this.act && this.act.kind === 'drag'); }
  doStun(t, kind, line, mood = 'yell') {
    this.stun = t; this.stunKind = kind; this.look = null;
    if (line) this.say(line, Math.min(t, 4), mood);
  }

  gain(base, label, key, by) {
    const s = this.s;
    if (s.phase !== 'play' || this.endT > 0) return;
    let dim = 1;
    if (key) {
      const n = (this.counts[key] = (this.counts[key] || 0) + 1);
      dim = Math.max(0.3, Math.pow(0.7, n - 1));
    }
    let v = (base * dim) / this.scale();
    const p = typeof by === 'string' ? s.players[by] : by;
    if (p) {
      // kombó: gyors egymásutánban jövő szívatások többet érnek
      const now = ROUND_TIME - s.t;
      this.combo = now - this.lastHit < 7 ? this.combo + 1 : 1;
      this.lastHit = now;
      if (this.combo >= 2) {
        v *= 1 + Math.min(1, 0.25 * (this.combo - 1));
        this.emit({ e: 'combo', n: this.combo });
        s.stats.maxCombo = Math.max(s.stats.maxCombo, this.combo);
        if (this.combo >= 3 && now - this.comboSaid > 20) { this.comboSaid = now; this.react('combo', 0.6, 'yell'); }
      }
      p.score += v;
    }
    s.meter = Math.min(METER_MAX, s.meter + v);
    this.emit({ e: 'gain', v: Math.round(v * 10) / 10, m: label });
    this.checkWin();
  }
  checkWin() {
    if (this.s.meter >= METER_MAX - 1e-6) this.end('won', 'Az óra teljesen szétesett – Taba feladta.', 'won');
  }

  noise(x, z, delay = 0.5, t = 2.6) {
    if (this.stun > 0 || this.countT > 0) return;
    if (inWC(x) !== inWC(this.s.taba.x)) return;
    this.look = { x, z, d: delay, t };
  }

  notice(id, delay, extra) {
    const has = this.notices.some((n) => n.id === id) || this.tasks.some((n) => n.id === id) || (this.act && this.act.task && this.act.task.id === id);
    if (has) return;
    this.notices.push({ id, t: delay, ...extra });
  }

  // ---- bemenet a játékosoktól -----------------------------------------
  handle(pid, m) {
    const s = this.s, p = s.players[pid];
    if (!p || !m) return;
    if (m.t === 'pos') {
      if (p.dragged || ![m.x, m.z, m.yaw].every(Number.isFinite)) return;
      p.x = Math.max(ROOM.x0, Math.min(WC.x1, m.x));
      p.z = Math.max(ROOM.z0, Math.min(ROOM.z1, m.z));
      p.yaw = m.yaw; p.pitch = +m.pitch || 0;
      return;
    }
    if (s.phase !== 'play' || this.endT > 0 || p.dragged) return;
    if (m.t === 'draw') { this.receiveDrawing(p, m.strokes); return; }
    if (m.t === 'drawcancel') { p.drawing = false; return; }
    if (m.t === 'act') {
      const it = interactions(s, p).find((i) => i.id === m.id);
      if (it && dist(p.x, p.z, it.x, it.z) <= it.r + 0.7) p.act = { id: it.id, p: 0, hold: it.hold };
    } else if (m.t === 'stop') {
      p.act = null;
    } else if (m.t === 'drop') {
      this.dropHeld(p);
    } else if (m.t === 'use') {
      if (inWC(p.x)) { this.emit({ e: 'toast', m: 'A mosdóban nem lehet szabotálni!', k: 'bad', pid }); return; }
      if ([m.ox, m.oy, m.oz, m.dx, m.dy, m.dz].every(Number.isFinite)) this.useItem(p, [m.ox, m.oy, m.oz], [m.dx, m.dy, m.dz]);
    }
  }

  // a laptopon rajzolt kép a vászonra kerül (fehér háttérrel)
  receiveDrawing(p, strokes) {
    const s = this.s;
    if (!p.drawing) return;
    p.drawing = false;
    if (!Array.isArray(strokes)) return;
    const clean = [];
    let total = 0;
    for (const st of strokes.slice(0, 80)) {
      if (!st || !Array.isArray(st.p)) continue;
      const pts = st.p.slice(0, 400).map((v) => Math.max(0, Math.min(255, Math.round(+v) || 0)));
      if (pts.length < 2) continue;
      total += pts.length;
      if (total > 3000) break;
      clean.push({ c: Math.max(0, Math.min(5, st.c | 0)), w: Math.max(1, Math.min(3, st.w | 0 || 1)), p: pts.length % 2 ? pts.slice(0, -1) : pts });
    }
    if (!clean.length || s.drawOn || s.laptop !== 'desk' || s.lapBroken) return;
    this.drawSeq = (this.drawSeq || 0) + 1;
    s.drawId = this.drawSeq;
    s.drawOn = true;
    this.lastDrawing = { e: 'drawing', id: s.drawId, strokes: clean };
    this.emit(this.lastDrawing);
    p.hot = 0.6;
    s.stats.draws++;
    this.gain(14, `${p.name} műalkotása a vásznon`, 'draw', p);
    this.notice('draw', rnd(4, 7));
  }

  dropHeld(p) {
    const s = this.s;
    if (p.held == null) return;
    const it = s.items[p.held];
    p.held = null;
    if (!it) return;
    it.held = null;
    const [x, z] = collide(p.x + Math.sin(p.yaw) * 0.5, p.z + Math.cos(p.yaw) * 0.5, p.x, p.z, 0.15);
    it.x = x; it.y = 0.06; it.z = z; it.loc = null;
    if (it.type === 'laptop') s.laptop = 'floor';
    return it;
  }

  useItem(p, o, d) {
    const s = this.s, T = s.taba;
    if (p.held == null) return;
    const it = s.items[p.held];
    const len = Math.hypot(d[0], d[1], d[2]) || 1;
    d = [d[0] / len, d[1] / len, d[2] / len];
    const consume = () => { it.gone = true; it.held = null; p.held = null; };

    if (it.type === 'ak') {
      if (!(it.ammo > 0)) { this.emit({ e: 'snd', n: 'click' }); return; }
      it.ammo--;
      p.hot = 0.8;
      const targets = [];
      if (!inWC(T.x)) {
        targets.push({ id: 'taba', c: [T.x, T.sit ? 0.85 : 1.1, T.z], r: 0.36 }, { id: 'taba', c: [T.x, T.sit ? 1.32 : 1.62, T.z], r: 0.24 });
      }
      if (s.proj !== 'broken') targets.push({ id: 'projector', c: [P.projector.x, P.projector.y, P.projector.z], r: 0.38 });
      if (!s.screenTorn) targets.push({ id: 'screen', c: [P.screen.x, P.screen.y, ROOM.z0 + 0.35], r: 0.8 });
      if (s.clock) targets.push({ id: 'clock', c: [P.clock.x, P.clock.y, P.clock.z], r: 0.32 });
      if (s.plant) targets.push({ id: 'plant', c: [P.plant.x, P.plant.y, P.plant.z], r: 0.48 });
      if (s.globe) targets.push({ id: 'globe', c: [P.globe.x, P.globe.y, P.globe.z], r: 0.26 });
      [0, 2].forEach((wi, gi) => { if (s.glass[gi]) targets.push({ id: 'glass' + gi, c: [-4.97, 1.6, P.windowsZ[wi]], r: 0.62 }); });
      const lap = s.items[0];
      if (!lap.gone && lap.held == null && !s.lapBroken && !(lap.loc && !s.lockers[+lap.loc[1]])) targets.push({ id: 'laptop', c: [lap.x, lap.y + 0.1, lap.z], r: 0.3 });
      for (const q of Object.values(s.players)) if (q !== p && !inWC(q.x)) targets.push({ id: 'p:' + q.id, c: [q.x, 1.0, q.z], r: 0.36 });
      let best = null, bt = rayRoom(o, d);
      for (const t of targets) {
        const tt = raySphere(o, d, t.c, t.r);
        if (tt > 0 && tt < bt) { bt = tt; best = t; }
      }
      const to = [o[0] + d[0] * bt, o[1] + d[1] * bt, o[2] + d[2] * bt];
      this.emit({ e: 'dart', from: [o[0] + d[0] * 0.5, o[1] - 0.15, o[2] + d[2] * 0.5], to });
      this.emit({ e: 'snd', n: 'shot' });
      this.noise(p.x, p.z, 0.55, 3);
      if (!best) return;
      const id = best.id;
      s.stats.shots++;
      const crash = (label, pts, key) => { this.gain(pts, label, key, p); this.emit({ e: 'snd', n: 'crash' }); s.stats.broken++; };
      if (id === 'taba') {
        this.stun = 3; this.stunKind = 'yell';
        this.say(line('shotHit'), 4, 'yell');
        this.emit({ e: 'strike', n: 3, m: 'TALÁLAT!', hit: true });
        this.endSoon(2.4, 'lost', 'Eltaláltátok Tabát a szivacslövővel. Azonnali igazgatói.', 'hit');
      } else if (id === 'projector') {
        s.proj = 'broken'; crash('Projektor kilőve!', 18);
        this.notice('projbroken', rnd(1, 2.5));
      } else if (id === 'screen') {
        s.screenTorn = true; crash('Vászon szétlőve!', 10);
        this.notice('screen', rnd(2, 4));
      } else if (id === 'clock') { s.clock = false; crash('Falióra lelőve', 8); this.react('react_clock', 1.2); }
      else if (id === 'plant') { s.plant = false; crash('A fikusz kidőlt', 6); this.react('react_plant', 1.2, 'yell'); }
      else if (id === 'globe') { s.globe = false; crash('Földgömb lelőve', 5); this.react('react_globe', 1.2); }
      else if (id.startsWith('glass')) { s.glass[+id[5]] = 0; crash('Ablak megrepedt', 6); this.react('react_glass', 1.2); }
      else if (id === 'laptop') { s.lapBroken = true; crash('Laptop szétlőve!', 15); this.react('lapBroken', 1.2, 'yell'); }
      else if (id.startsWith('p:')) this.emit({ e: 'toast', m: `${s.players[id.slice(2)]?.name || 'Valaki'}: „Áú! Ne engem!”`, k: 'info' });
      this.emit({ e: 'puff', x: to[0], y: to[1], z: to[2], c: 0xffaa33 });
    } else if (it.type === 'megaphone') {
      if (!(it.ammo > 0)) { this.emit({ e: 'snd', n: 'click' }); return; }
      it.ammo--;
      p.hot = 1.2;
      this.emit({ e: 'snd', n: 'megaphone' });
      this.emit({ e: 'mega', x: p.x, z: p.z, yaw: p.yaw });
      this.gain(11, 'Megafon – Taba kiborult', 'mega', p);
      s.stats.megas++;
      this.shake(0.6);
      if (this.canStun()) {
        this.doStun(3.2, 'yell', line('yell'));
        if (!inWC(T.x)) this.look = { x: p.x, z: p.z, d: 0, t: 2.6 };
      } else if (this.endT <= 0 && !T.hidden) this.say(line('yell'), 3, 'yell');
      if (it.ammo <= 0) consume();
    } else if (it.type === 'plane') {
      p.hot = 0.5;
      const c = [T.x, T.sit ? 1.0 : 1.3, T.z];
      const tca = (c[0] - o[0]) * d[0] + (c[1] - o[1]) * d[1] + (c[2] - o[2]) * d[2];
      const maxT = Math.min(rayRoom(o, d), 11);
      let hit = false, tEnd = maxT;
      if (tca > 0.5 && tca < maxT && !inWC(T.x)) {
        const q = [o[0] + d[0] * tca, o[1] + d[1] * tca, o[2] + d[2] * tca];
        if (Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]) < 0.6) { hit = true; tEnd = tca; }
      }
      this.emit({ e: 'plane', from: [o[0], o[1] - 0.1, o[2]], to: [o[0] + d[0] * tEnd, Math.max(0.05, o[1] + d[1] * tEnd), o[2] + d[2] * tEnd] });
      this.emit({ e: 'snd', n: 'whoosh' });
      consume();
      if (hit) {
        this.gain(5, 'Papírrepülő – telitalálat', 'plane', p);
        s.stats.planes++;
        if (this.stun <= 0 && this.countT <= 0) this.say(line('plane'), 2.4, 'angry');
        this.noise(p.x, p.z, 0.6, 2.4);
      }
    } else if (it.type === 'stink') {
      p.hot = 0.5;
      let t = d[1] < -0.02 ? -o[1] / d[1] : 9;
      t = Math.min(t, 9, rayRoom(o, d) - 0.3);
      const x = Math.max(ROOM.x0 + 0.4, Math.min(ROOM.x1 - 0.4, o[0] + d[0] * t));
      const z = Math.max(ROOM.z0 + 0.4, Math.min(ROOM.z1 - 0.4, o[2] + d[2] * t));
      s.cloud = { x, z, t: 9, hit: false, by: p.id };
      this.emit({ e: 'lob', from: [o[0], o[1] - 0.1, o[2]], to: [x, 0.1, z], c: 0x6fd13f });
      this.emit({ e: 'snd', n: 'whoosh' });
      consume();
      this.gain(4, 'Bűzbomba eldobva', 'stink', p);
      this.noise(x, z, 1.0, 2);
    } else if (it.type === 'phone') {
      p.hot = 0.4;
      this.dropHeld(p);
      it.placed = true; it.ring = 3; it.ringing = false; it.by = p.id;
      this.emit({ e: 'toast', m: 'Telefon letéve – 3 mp múlva csörög!', k: 'info', pid: p.id });
    } else if (it.type === 'banana') {
      p.hot = 0.3;
      this.dropHeld(p);
      it.placed = true; it.by = p.id;
      this.emit({ e: 'toast', m: 'Banánhéj letéve – ha Taba rálép…', k: 'info', pid: p.id });
    }
  }

  complete(p, id) {
    const s = this.s;
    const held = p.held != null ? s.items[p.held] : null;
    const [kind, arg] = id.split(':');
    const use = () => { held.gone = true; held.held = null; p.held = null; };
    switch (kind) {
      case 'switch':
        s.lights = false; this.gain(6, 'Villany lekapcsolva', 'switch', p); this.emit({ e: 'snd', n: 'click' });
        this.notice('lights', rnd(1.2, 2.5));
        break;
      case 'fuse':
        s.power = false; this.gain(12, 'Biztosíték lecsapva – nincs áram!', 'fuse', p); this.emit({ e: 'snd', n: 'zap' });
        this.notice('fuse', rnd(2, 3.5));
        break;
      case 'outlet':
        s.plug = false; this.gain(8, 'Projektor kihúzva', 'outlet', p); this.emit({ e: 'snd', n: 'click' });
        this.notice('plug', this.act && this.act.kind === 'projector' ? 0.8 : rnd(2.5, 5));
        break;
      case 'hdmi':
        s.hdmi = false; this.gain(8, 'HDMI kihúzva – fekete a vászon', 'hdmi', p); this.emit({ e: 'snd', n: 'click' });
        this.notice('hdmi', rnd(3, 6));
        break;
      case 'draw':
        p.drawing = true;
        break;
      case 'usb':
        if (!held || held.type !== 'usb') break;
        use(); s.usb = true;
        this.gain(12, 'Mémes PPT a vásznon!', 'usb', p); this.emit({ e: 'snd', n: 'pick' });
        this.notice('usb', rnd(4, 7));
        break;
      case 'snake':
        if (!held || held.type !== 'snake') break;
        use(); s.deskTrap = 'snake'; s.deskTrapBy = p.id;
        this.gain(3, 'Gumikígyó az asztalon', null, p);
        break;
      case 'wipe':
        s.board = 0; this.gain(8, 'Tábla letörölve', 'wipe', p); this.emit({ e: 'snd', n: 'whoosh' });
        s.cd.board = 6;
        break;
      case 'doodle':
        s.doodle = true; s.stats.doodles++; this.gain(12, 'Firka a táblán', 'doodle', p); this.emit({ e: 'snd', n: 'whoosh' });
        this.notice('doodle', rnd(4, 8));
        break;
      case 'window':
        s.win = true; this.gain(3, 'Ablak kinyitva', 'window', p); this.emit({ e: 'snd', n: 'click' });
        this.notice('window', rnd(7, 12));
        break;
      case 'throwlap':
        if (!held || held.type !== 'laptop') break;
        use(); s.laptop = 'gone'; p.hot = 0.4;
        this.gain(22, 'A laptop elhagyta az épületet', null, p); this.emit({ e: 'snd', n: 'crash' });
        s.stats.lapOut++;
        this.react('lapGone', 1.0, 'yell');
        this.noise(P.window.x, P.window.z, 0.9, 2.5);
        break;
      case 'bin':
        if (!held || held.type !== 'laptop') break;
        held.held = null; p.held = null; held.x = P.bin.x; held.y = 0.35; held.z = P.bin.z; s.laptop = 'bin';
        this.gain(10, 'Laptop a kukában', 'laphide', p);
        break;
      case 'lockhide': {
        if (!held || held.type !== 'laptop') break;
        const L = P.lockers[+arg];
        held.held = null; p.held = null; held.x = L.x; held.y = 0.3; held.z = L.z + 0.05; s.laptop = 'locker';
        this.gain(10, 'Laptop a szekrényben', 'laphide', p);
        break;
      }
      case 'chair':
        if (!held || (held.type !== 'cushion' && held.type !== 'glue')) break;
        s.chairTrap = held.type; s.chairTrapBy = p.id; use();
        this.gain(3, held.type === 'cushion' ? 'Pukipárna a széken' : 'Ragasztó a széken', null, p);
        break;
      case 'locker':
        s.lockers[+arg] = 1; this.emit({ e: 'snd', n: 'click' });
        break;
      case 'item': {
        const it = s.items[+arg];
        if (!it || it.gone || it.held != null) break;
        this.dropHeld(p);
        it.held = p.id; p.held = it.id; it.loc = null; it.home = false;
        this.emit({ e: 'snd', n: 'pick' });
        if (it.type === 'laptop') {
          s.laptop = 'taken';
          this.gain(8, 'Laptop ellopva!', 'lapsteal', p);
        }
        break;
      }
    }
  }

  // ---- lebukás ---------------------------------------------------------
  confiscate(p) {
    const s = this.s;
    if (p.held == null) return;
    const it = s.items[p.held];
    p.held = null; it.held = null;
    if (it.type === 'laptop') {
      s.laptop = 'desk';
      it.x = P.laptop.x; it.y = P.laptop.y; it.z = P.laptop.z;
    } else {
      it.gone = true;
      this.emit({ e: 'toast', m: `Elkobozva: ${ITEMS[it.type].name}`, k: 'bad' });
    }
  }
  toSeat(p) {
    const st = SEATS[p.seat % SEATS.length];
    p.x = st.x; p.z = st.z; p.yaw = st.yaw; p.dragged = false;
    this.emit({ e: 'tp', pid: p.id, x: p.x, z: p.z, yaw: p.yaw });
  }
  releaseDrag() {
    const a = this.act;
    if (a && a.kind === 'drag') {
      const q = this.s.players[a.pid];
      if (q) this.toSeat(q);
      this.act = null;
    }
  }

  strike(p) {
    const s = this.s, T = s.taba;
    s.strikes++;
    p.caught++;
    const n = s.strikes;
    const inToilet = inWC(p.x) && inWC(T.x);
    this.countT = 2.8;
    T.count = Math.min(n, 3);
    this.look = null;
    this.stun = 0;
    T.sit = false;
    this.wantYaw = T.yaw = yawTo(T.x, T.z, p.x, p.z);
    const word = COUNT[Math.min(n, 3) - 1];
    const key = n >= MAX_STRIKES ? 'strike3' : inToilet ? 'strikeWC' : n === 1 ? 'strike1' : 'strike2';
    this.say(line(key, { n: p.name, c: word }), 3.2, 'angry');
    T.hidden = false;
    if (this.act && EVENT_KINDS.includes(this.act.kind)) this.finish(this.act);
    this.emit({ e: 'strike', n, pid: p.id, name: p.name, m: word, wc: inToilet });
    this.confiscate(p);
    p.act = null; p.sus = 0; p.immune = inToilet ? 9 : 5; p.hot = 0; p.wc = 0; p.drawing = false;
    if (inToilet) {
      // visszavonszolja a terembe
      this.releaseDrag();
      this.hunt = null;
      if (this.act && this.act.kind === 'fix') this.finish(this.act);
      const st = SEATS[p.seat % SEATS.length];
      p.dragged = true;
      this.act = { kind: 'drag', phase: 'go', pid: p.id, path: findPath(T.x, T.z, st.x, st.z), spot: { ...nearestNav(st.x, st.z), yaw: PI }, dur: 0.3, t: 0 };
    } else {
      this.toSeat(p);
    }
    if (n >= MAX_STRIKES) this.endSoon(3.2, 'lost', 'Taba harmadszor is rajtakapott valakit. Irány az igazgatói.', 'strikes');
  }

  // ---- Taba ------------------------------------------------------------
  startAct(kind, task) {
    const T = this.s.taba;
    const a = { kind, phase: 'go', t: 0, g: rnd(4, 8) };
    if (kind === 'laptop') { a.spot = { ...CHAIR_SPOT }; a.dur = rnd(12, 18); }
    else if (kind === 'projector') { a.spot = { x: 3.0, z: -4.7, yaw: PI }; a.dur = rnd(10, 14); }
    else if (kind === 'board') { a.spot = { x: P.board.x + rnd(-1, 1), z: -5.3, yaw: PI }; a.dur = rnd(10, 14); }
    else if (kind === 'lecture') { a.spot = { x: rnd(-1, 1.5), z: -4.2, yaw: 0 }; a.dur = rnd(5, 8); }
    else if (kind === 'fix') { a.task = task; a.spot = task.spot; a.dur = task.dur; if (task.say) this.say(LINES[task.say] ? line(task.say) : task.say, 3, task.mood || 'angry'); }
    T.sit = false;
    if (kind === 'patrol' || kind === 'search') {
      const a1 = pick(AISLES);
      const a2 = pick(AISLES.filter((x) => x !== a1));
      const route = [{ x: a1, z: FRONT_Z }, { x: a1, z: BACK_Z }, { x: a2, z: BACK_Z }, { x: a2, z: FRONT_Z }];
      a.path = [];
      let cx = T.x, cz = T.z;
      for (const r of route) { a.path.push(...findPath(cx, cz, r.x, r.z)); cx = r.x; cz = r.z; }
      a.spot = { x: a2, z: FRONT_Z, yaw: 0 };
      a.dur = 0.3;
      if (kind === 'patrol') this.say(line('patrol'));
    } else {
      a.path = findPath(T.x, T.z, a.spot.x, a.spot.z);
    }
    this.act = a;
  }

  // véletlen események: Windows-frissítés, anyuka hív, hangosbemondó
  startEvent() {
    const s = this.s, T = s.taba;
    let opts = ['call', 'away'];
    if (s.laptop === 'desk' && !s.lapBroken) opts.push('update', 'update');
    opts = opts.filter((k) => k !== this.lastEvent) ;
    const kind = pick(opts.length ? opts : ['call']);
    this.lastEvent = kind;
    this.eventT = rnd(40, 60);
    s.stats.events++;
    T.sit = false;
    const a = { kind, phase: 'go', t: 0, g: 99, m: 4, li: 0 };
    if (kind === 'update') {
      a.spot = { ...CHAIR_SPOT }; a.dur = 15;
      s.winUpdate = 0;
      this.emit({ e: 'evt', t: 'Windows-frissítés', d: 'Taba 15 másodpercig csak a töltőcsíkot bámulja.' });
      this.emit({ e: 'snd', n: 'chime' });
      this.say(line('updStart'), 3, 'angry');
    } else if (kind === 'call') {
      a.spot = { x: -4.3, z: 1.3, yaw: -PI / 2 }; a.dur = 15;
      this.emit({ e: 'evt', t: 'Bejövő hívás: Anyukám', d: 'Taba az ablaknál telefonál, háttal az osztálynak.' });
      this.emit({ e: 'snd', n: 'ringtone' });
      this.say(line('callStart'), 3);
    } else {
      a.spot = { x: P.wcCenter.x, z: P.wcCenter.z, yaw: PI / 2 }; a.dur = 15; a.pre = 4;
      this.emit({ e: 'evt', t: 'Hangosbemondó', d: 'Taba kimegy a teremből – kb. 15 másodperc szabad pálya.' });
      this.announce(line('paAnnounce'));
    }
    a.path = findPath(T.x, T.z, a.spot.x, a.spot.z);
    this.act = a;
  }

  startNext() {
    if (this.tasks.length) return this.startAct('fix', this.tasks.shift());
    const busy = [];
    if (!this.lapLost) busy.push('laptop', 'laptop');
    if (!this.projLost) busy.push('projector');
    busy.push('board');
    const watch = ['lecture', 'lecture', 'patrol'];
    const lastWatch = this.last === 'lecture' || this.last === 'patrol' || this.last === 'search';
    let kind;
    if (lastWatch || Math.random() < 0.6) {
      const opts = busy.filter((k) => k !== this.last);
      kind = pick(opts.length ? opts : busy);
    } else kind = pick(watch);
    this.startAct(kind);
  }

  arrive(a) {
    const s = this.s, T = s.taba;
    T.x = a.spot.x; T.z = a.spot.z;
    a.phase = 'do'; a.t = a.dur;
    this.wantYaw = a.spot.yaw;

    if (a.kind === 'drag') {
      const q = s.players[a.pid];
      if (q) this.toSeat(q);
      this.say(line('drag'), 2.6, 'angry');
      this.last = 'drag'; this.act = null;
      return;
    }
    // gumikígyó az asztalon
    if (s.deskTrap === 'snake' && dist(a.spot.x, a.spot.z, P.chair.x, P.chair.z) < 0.8 && this.canStun()) {
      s.deskTrap = null;
      this.emit({ e: 'snd', n: 'scream' });
      this.gain(14, 'Taba sikított a gumikígyótól', null, s.deskTrapBy);
      s.stats.snakes++;
      this.shake(0.3);
      this.doStun(4.5, 'scared', line('snake'));
      if (a.kind === 'fix') this.tasks.unshift(a.task);
      if (a.kind === 'update') s.winUpdate = null;
      this.act = null;
      return;
    }

    if (a.kind === 'update') {
      T.sit = true;
      if (this.sitTraps()) s.winUpdate = null;
    } else if (a.kind === 'call') {
      // csak áll és telefonál
    } else if (a.kind === 'away') {
      T.hidden = true;
    } else if (a.kind === 'laptop') {
      if (s.laptop !== 'desk') {
        this.say(line('lapMissing'), 3, 'angry');
        this.gain(6, 'Taba keresi a laptopját', 'lapmiss');
        this.last = 'search';
        this.startAct('search');
        return;
      } else if (s.lapBroken) {
        this.say(line('lapBroken'), 3.5, 'angry');
        this.lapLost = true; a.t = 6;
      } else this.say(line('laptop'));
      T.sit = true;
      this.sitTraps();
    } else if (a.kind === 'board') {
      const chalk = s.items[1];
      if (s.doodle) { this.notice('doodle', 0); this.act = null; return; }
      if (!chalk.home) {
        this.say(line('chalkMissing'), 2.6, 'angry');
        this.gain(5, 'Taba nem találja a krétát', 'chalkmiss');
        this.last = 'board'; this.act = null; return;
      }
      this.say(line('board'));
    } else if (a.kind === 'projector') {
      const ps = projState(s);
      if (ps === 'broken') {
        this.say(line('fixProjBroken'), 3.5, 'angry');
        this.projLost = true; a.t = 5;
      } else if (ps === 'off') {
        this.notice(!s.power ? 'fuse' : 'plug', 0);
        this.last = 'projector'; this.act = null; return;
      } else if (ps === 'nosignal') {
        if (s.laptop !== 'desk') {
          this.say(line('lapMissing'), 3, 'angry');
          this.last = 'search'; this.startAct('search'); return;
        }
        if (s.lapBroken) { this.say('A laptop halott, nincs mit kivetíteni…', 3); this.projLost = true; this.lapLost = true; a.t = 3; }
        else { this.notice('hdmi', 0); this.last = 'projector'; this.act = null; return; }
      } else if (ps === 'hack') {
        this.notice('usb', 0); this.last = 'projector'; this.act = null; return;
      } else if (ps === 'drawing') {
        this.notice('draw', 0); this.last = 'projector'; this.act = null; return;
      } else this.say(line('projector'));
    } else if (a.kind === 'lecture') {
      this.say(line('lecture'));
    } else if (a.kind === 'search') {
      const st = s.laptop;
      const lap = s.items[0];
      if (st === 'bin' || st === 'locker' || st === 'floor') {
        this.tasks.unshift({ id: 'lapget', spot: this.reach(lap.x, lap.z), dur: 2, say: 'Aha! Ott van valami…', mood: 'normal' });
      } else if (st === 'taken' && ++this.searches < 3) {
        this.say('Valaki elvitte! Ki volt az?!', 2.6, 'angry');
      } else if (st === 'gone' || st === 'taken') {
        this.say(line('lapGone'), 3.5, 'angry');
        if (st === 'gone') this.lapLost = true;
      }
    }
  }

  // ráül a székére: pukipárna / ragasztó
  sitTraps() {
    const s = this.s;
    if (s.chairTrap === 'cushion') {
      s.chairTrap = null;
      this.emit({ e: 'snd', n: 'fart' });
      this.gain(14, 'Taba ráült a pukipárnára', null, s.chairTrapBy);
      s.stats.farts++;
      this.shake(0.4);
      this.doStun(4, 'stun', line('cushion'), 'normal');
      return true;
    }
    if (s.chairTrap === 'glue') {
      s.chairTrap = null;
      this.gain(12, 'Taba odaragadt a székhez', null, s.chairTrapBy);
      s.stats.glued++;
      this.doStun(12, 'stuck', line('glue'), 'angry');
      return true;
    }
    return false;
  }

  // Elérhető pont egy célhoz közel (a padok közé nem megy be)
  reach(x, z) {
    x = Math.max(ROOM.x0 + 0.5, Math.min(ROOM.x1 - 0.5, x));
    z = Math.max(ROOM.z0 + 0.5, Math.min(ROOM.z1 - 0.5, z));
    if (z > 5.0) z = 5.0;
    if (inBox(x, z)) {
      const n = nearestNav(x, z);
      return { x: n.x, z: n.z, yaw: yawTo(n.x, n.z, x, z) };
    }
    return { x, z, yaw: yawTo(this.s.taba.x, this.s.taba.z, x, z) };
  }

  finish(a) {
    const T = this.s.taba;
    if (a.kind === 'fix') this.fixDone(a.task);
    if (a.kind === 'laptop' || a.kind === 'update') T.sit = false;
    if (a.kind === 'update') { this.s.winUpdate = null; if (a.phase === 'do' && a.t <= 0) this.say(line('updEnd')); }
    if (a.kind === 'call' && a.phase === 'do' && a.t <= 0) this.say(line('callEnd'));
    if (a.kind === 'away') { if (T.hidden && a.t <= 0) this.say(line('paBack'), 3); T.hidden = false; }
    this.last = a.kind;
    this.act = null;
  }

  fixDone(task) {
    const s = this.s;
    switch (task.id) {
      case 'lights': s.lights = true; s.cd.switch = 18; break;
      case 'fuse': s.power = true; s.cd.fuse = 40; break;
      case 'plug': s.plug = true; s.cd.outlet = 25; break;
      case 'draw': s.drawOn = false; s.cd.draw = 20; break;
      case 'hdmi': s.hdmi = true; s.cd.hdmi = 25; break;
      case 'usb': s.usb = false; this.say(line('usbTake')); break;
      case 'doodle': s.doodle = false; s.board = 0; s.cd.board = 15; break;
      case 'window': s.win = false; s.cd.window = 25; break;
      case 'lapget': {
        const lap = s.items[0];
        if (['bin', 'locker', 'floor'].includes(s.laptop) && lap.held == null) {
          s.laptop = 'desk'; lap.x = P.laptop.x; lap.y = P.laptop.y; lap.z = P.laptop.z; lap.loc = null;
          this.say(line('lapFound'), 2.6, 'angry');
          this.searches = 0;
        }
        break;
      }
      case 'phone': {
        const it = s.items[task.item];
        if (it && !it.gone) { it.gone = true; it.ring = 0; it.ringing = false; }
        this.say('Elkobzom! Óra után sem kapod vissza!', 2.6, 'angry');
        break;
      }
      case 'projbroken': this.projLost = true; break;
      case 'wc':
        if (this.hunt) this.say(line('wcEmpty'));
        this.hunt = null;
        for (const p of Object.values(s.players)) p.wc = 0;
        break;
    }
  }

  stepTaba(dt) {
    const s = this.s, T = s.taba;
    let vis = 'none';
    this.sayT -= dt;
    if (this.sayT <= 0) T.say = '';

    // észrevett szabotázsok -> javítási feladatok
    for (let i = this.notices.length - 1; i >= 0; i--) {
      const n = this.notices[i];
      n.t -= dt;
      if (n.t > 0) continue;
      this.notices.splice(i, 1);
      if (n.id === 'phone') this.tasks.push({ id: 'phone', item: n.item, spot: this.reach(n.x, n.z), dur: 1.5, say: 'fixPhone' });
      else if (n.id === 'lights' && s.lights) continue;
      else if (FIX[n.id]) this.tasks.push({ id: n.id, ...FIX[n.id] });
    }

    // késleltetett reakciók (pl. „A fikuszom!”)
    for (let i = this.reacts.length - 1; i >= 0; i--) {
      const r = this.reacts[i];
      r.t -= dt; r.life -= dt;
      if (r.life <= 0) { this.reacts.splice(i, 1); continue; }
      if (r.t <= 0 && this.countT <= 0 && !T.hidden && this.sayT < 0.6 && this.endT <= 0) {
        this.reacts.splice(i, 1);
        this.say(line(r.key, r.vars), 3, r.mood);
        break;
      }
    }

    if (this.stun > 0) {
      this.stun -= dt;
      T.st = this.stunKind;
      if (this.stun <= 0) {
        if (this.act && this.act.kind === 'fix') this.tasks.unshift(this.act.task);
        if (this.stunKind === 'stuck') { T.chair = 40; this.chairLineT = 2; }
        if (this.act && EVENT_KINDS.includes(this.act.kind)) this.finish(this.act);
        T.sit = false; this.last = 'laptop'; this.act = null;
      }
    } else if (this.countT > 0) {
      this.countT -= dt;
      T.st = 'count';
      if (this.countT <= 0) T.count = 0;
    } else if (this.look && (this.look.d -= dt) <= 0) {
      const L = this.look;
      this.wantYaw = yawTo(T.x, T.z, L.x, L.z);
      T.st = 'look'; vis = 'full';
      L.t -= dt;
      if (L.t <= 0) { this.look = null; if (this.act && this.act.phase === 'do') this.wantYaw = this.act.spot.yaw; }
    } else {
      let a = this.act;
      if (a && this.tasks.length && !['fix', 'search', 'drag', ...EVENT_KINDS].includes(a.kind)) { this.finish(a); a = null; }
      if (this.eventT <= 0 && !this.tasks.length && this.endT <= 0 && !inWC(T.x) && (!a || BUSY.includes(a.kind))) {
        if (a) this.finish(a);
        this.startEvent(); a = this.act;
      }
      if (!a) { this.startNext(); a = this.act; }
      if (a.pre > 0) {
        // a hangosbemondót hallgatja
        a.pre -= dt;
        T.st = 'warn'; vis = 'busy';
        if (a.pre <= 0) this.say(line('paLeave'), 3);
      } else if (a.phase === 'go') {
        T.st = a.kind === 'drag' ? 'drag' : 'walk'; vis = 'full';
        let left = (a.kind === 'fix' || a.kind === 'search' ? 2.3 : 1.7) * (1 + 0.35 * T.stress) * (T.chair > 0 ? 0.7 : 1) * dt;
        while (left > 0 && a.path.length) {
          const t = a.path[0];
          const d = dist(T.x, T.z, t.x, t.z);
          if (d < 0.03) { a.path.shift(); continue; }
          this.wantYaw = yawTo(T.x, T.z, t.x, t.z);
          const m = Math.min(d, left);
          T.x += ((t.x - T.x) / d) * m; T.z += ((t.z - T.z) / d) * m;
          left -= m;
        }
        // banánhéj!
        for (const it of s.items) {
          if (it.type !== 'banana' || !it.placed || it.gone || a.kind === 'drag') continue;
          if (dist(T.x, T.z, it.x, it.z) < 0.5 && this.canStun()) {
            it.gone = true;
            this.emit({ e: 'snd', n: 'slip' });
            this.gain(13, 'Taba elcsúszott a banánhéjon', null, it.by);
            s.stats.slips++;
            this.shake(0.5);
            if (a.kind === 'fix') this.tasks.unshift(a.task);
            if (EVENT_KINDS.includes(a.kind)) this.finish(a);
            this.act = null;
            this.doStun(4, 'slip', line('slip'));
            break;
          }
        }
        if (this.act === a && !a.path.length) this.arrive(a);
      } else {
        a.t -= dt;
        const hunting = a.kind === 'fix' && a.task.id === 'wc';
        if (a.kind === 'lecture' || hunting) {
          T.st = hunting ? 'look' : 'lecture'; vis = 'full';
          this.wantYaw = a.spot.yaw + (hunting ? 1.3 : 0.95) * Math.sin((a.dur - a.t) * (hunting ? 1.8 : 0.9));
        } else if (a.kind === 'patrol' || a.kind === 'search') {
          T.st = 'walk'; vis = 'full';
        } else if (a.kind === 'update') {
          T.st = 'laptop'; vis = 'none'; T.sit = true;
          s.winUpdate = Math.min(99, Math.floor(100 * (1 - a.t / a.dur) * 0.9 + (a.t < 3 ? 9 : 0)));
          if ((a.m -= dt) <= 0) { a.m = 5; this.say(line('updMid'), 3); }
        } else if (a.kind === 'call') {
          T.st = 'phone'; vis = 'none';
          if ((a.m -= dt) <= 0) { a.m = 3; this.say(LINES.callMid[a.li++ % LINES.callMid.length], 2.8); }
        } else if (a.kind === 'away') {
          T.st = 'walk'; vis = 'none';
        } else {
          // elfoglalt: háttal van / lefelé néz, de néha felpillant
          T.st = a.kind === 'fix' ? 'fix' : a.kind; vis = 'busy';
          if (a.kind === 'board') s.board = Math.min(1, s.board + dt * 0.07);
          // motyogás munka közben
          a.m = (a.m ?? rnd(3, 6)) - dt;
          if (a.m <= 0 && this.sayT < 0) {
            a.m = rnd(7, 11);
            const mk = { laptop: 'mumbleLaptop', projector: 'mumbleProjector', board: 'mumbleBoard' }[a.kind] || 'mumbleFix';
            this.say(line(mk), 2.6);
          }
          a.g -= dt;
          if (a.g <= 0) {
            if (a.g > -0.75) { T.st = 'warn'; }
            else if (a.g > -2.4) { T.st = 'glance'; vis = 'full'; this.wantYaw = yawTo(T.x, T.z, 0, 1.2); }
            else { a.g = rnd(5, 9) * (1 - 0.45 * T.stress); this.wantYaw = a.spot.yaw; }
          }
        }
        if (a.t <= 0 && this.act === a) this.finish(a);
      }
    }

    // forgás
    const dy = angDiff(this.wantYaw, T.yaw);
    const maxTurn = 7 * dt;
    T.yaw += Math.abs(dy) < maxTurn ? dy : Math.sign(dy) * maxTurn;

    // látómező
    if (vis === 'full') { T.fov = 1.55; T.range = 14; }
    else if (vis === 'busy') { T.fov = 1.0; T.range = 2.0; }
    else { T.fov = 1.0; T.range = 0; }
    if (isDark(s) && T.range > 3.2 && !inWC(T.x)) T.range = 3.2;
  }

  // ---- fő lépés --------------------------------------------------------
  step(dt) {
    const s = this.s;
    if (s.phase !== 'play') return;
    const T = s.taba;

    if (this.endT > 0) {
      this.stepTaba(dt);
      this.endT -= dt;
      if (this.endT <= 0) this.end(...this.endInfo);
      return;
    }

    s.t -= dt;
    if (s.t <= 0) { s.t = 0; this.end('lost', 'Kicsengettek. Taba megtartotta az órát.', 'time'); return; }
    for (const k in s.cd) if (s.cd[k] > 0) s.cd[k] -= dt;
    this.eventT -= dt;
    T.stress = Math.min(1, s.meter / 100);
    if (T.green > 0) T.green -= dt;
    if (T.chair > 0) {
      T.chair -= dt;
      if ((this.chairLineT -= dt) <= 0) { this.chairLineT = rnd(9, 13); this.react('glueChair', 0, 'normal'); }
    }
    for (const [lvl, key] of [[50, 'stress50'], [75, 'stress75']]) {
      if (s.meter >= lvl && !this.saidStress[lvl]) { this.saidStress[lvl] = true; this.react(key, 0.5, 'angry'); }
    }

    this.stepTaba(dt);
    if (s.phase !== 'play') return;

    // vonszolt diák Taba mögött (a számolás után indulnak)
    if (this.act && this.act.kind === 'drag' && this.countT <= 0) {
      const q = s.players[this.act.pid];
      if (q) { q.x = T.x - Math.sin(T.yaw) * 1.1; q.z = T.z - Math.cos(T.yaw) * 1.1; q.yaw = T.yaw; }
    }

    // tárgyak: telefon, bűzfelhő
    let ringing = false;
    for (const it of s.items) {
      if (it.gone || !it.placed || it.type !== 'phone') continue;
      if (!it.ringing) {
        it.ring -= dt;
        if (it.ring <= 0) {
          it.ringing = true; it.ring = 14;
          this.gain(8, 'Megcsörrent a telefon', 'phone', it.by);
          this.noise(it.x, it.z, 0.4, 1.2);
          this.notice('phone', 1.6, { item: it.id, x: it.x, z: it.z });
        }
      } else {
        ringing = true;
        it.ring -= dt;
        if (it.ring <= 0) { it.gone = true; it.ringing = false; }
      }
    }
    if (s.cloud) {
      s.cloud.t -= dt;
      if (!s.cloud.hit && this.canStun() && dist(T.x, T.z, s.cloud.x, s.cloud.z) < 3.2) {
        s.cloud.hit = true;
        this.doStun(6, 'stun', line('stink'), 'angry');
        T.green = 14;
        s.stats.stinks++;
        this.emit({ e: 'snd', n: 'cough' });
        this.gain(12, 'Taba fuldoklik a bűztől', 'stinkhit', s.cloud.by);
      }
      if (s.cloud.t <= 0) s.cloud = null;
    }

    // folyamatos káosz-pontok, amíg valami nincs rendben
    let rate = 0;
    if (isDark(s)) rate += 0.4;
    const ps = projState(s);
    if (ps === 'off' || ps === 'nosignal') rate += 0.3;
    if (ps === 'drawing' || ps === 'hack') rate += 0.45;
    if (['taken', 'bin', 'locker', 'floor'].includes(s.laptop)) rate += 0.25;
    if (s.doodle) rate += 0.2;
    if (ringing) rate += 0.5;
    if (this.stun > 0) rate += 0.6;
    if (s.win) rate += 0.1;
    if (inWC(T.x)) rate += 0.3;
    if (T.chair > 0) rate += 0.25;
    if (rate > 0) { s.meter = Math.min(METER_MAX, s.meter + (rate * dt) / this.scale()); this.checkWin(); }
    if (s.phase !== 'play') return;

    // játékosok
    const dirX = Math.sin(T.yaw), dirZ = Math.cos(T.yaw);
    const tabaWC = inWC(T.x);
    for (const p of Object.values(s.players)) {
      if (p.immune > 0) p.immune -= dt;
      if (p.hot > 0) p.hot -= dt;
      const pWC = inWC(p.x);

      // mosdó: ha valaki túl sokáig van kint, Taba utánamegy
      if (pWC && !p.dragged) {
        p.wc += dt;
        p.wcTotal = (p.wcTotal || 0) + dt;
        if (p.wc > WC_LIMIT && !this.hunt && this.endT <= 0) {
          this.hunt = p.id;
          if (this.act && ['laptop', 'board', 'projector', 'lecture', 'patrol'].includes(this.act.kind)) this.finish(this.act);
          this.tasks.unshift({ id: 'wc', spot: { x: P.wcCenter.x, z: P.wcCenter.z, yaw: PI / 2 }, dur: 3.5, say: line('wcHunt', { n: p.name }), mood: 'angry' });
          s.stats.wcHunts++;
          this.gain(4, 'Taba kiment a teremből – szabad a pálya!', null);
        }
      } else if (!pWC) p.wc = 0;

      if (p.act) {
        const it = interactions(s, p).find((i) => i.id === p.act.id);
        if (!it || dist(p.x, p.z, it.x, it.z) > it.r + 0.9) p.act = null;
        else {
          p.act.p += dt / it.hold;
          if (p.act.p >= 1) { const id = p.act.id; p.act = null; this.complete(p, id); }
        }
      }
      const dx = p.x - T.x, dz = p.z - T.z;
      const d = Math.hypot(dx, dz);
      let seen = false;
      if (T.range > 0 && d <= T.range && pWC === tabaWC && !p.dragged) {
        seen = d < 0.4 || Math.acos(Math.max(-1, Math.min(1, (dx * dirX + dz * dirZ) / d))) <= T.fov / 2;
      }
      p.seen = seen;
      const held = p.held != null ? s.items[p.held] : null;
      if (p.drawing && (dist(p.x, p.z, P.laptop.x, P.laptop.z) > 2.4 || s.laptop !== 'desk' || s.drawOn)) p.drawing = false;
      const sus = !!p.act || p.drawing || p.hot > 0 || (held && ITEMS[held.type].contraband) || (pWC && tabaWC);
      if (seen && sus && p.immune <= 0) p.sus += dt / (pWC ? 0.35 : 0.45);
      else p.sus = Math.max(0, p.sus - dt / 1.2);
      if (p.sus >= 1) { this.strike(p); if (s.phase !== 'play' || this.endT > 0) return; }
    }
  }
}
