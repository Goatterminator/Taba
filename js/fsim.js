// „Fizika – Napraforgó” mód szabályai és Fizika néni viselkedése (a host futtatja).
import {
  F_TIME, F_LIVES, ROOM, GARDEN, DOOR, P, DESKS, seatPos, PLAYER_DESKS, EMPTY_DESKS, SNITCH_DESK,
  makeBags, JUNK, COVER, TOBS, NAV, AISLES, FRONT_Z, BACK_Z, interactions, collide, inGarden, walkable, sunAt,
} from './fdata.js?v=15';
import { skinById } from './data.js?v=15';
import { line } from './lines.js?v=15';
import './flines.js?v=15';

const PI = Math.PI;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const yawTo = (ax, az, bx, bz) => Math.atan2(bx - ax, bz - az);
const angDiff = (a, b) => { let d = (a - b) % (2 * PI); if (d > PI) d -= 2 * PI; if (d < -PI) d += 2 * PI; return d; };

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
const clearSeg = (a, b) => !TOBS.some((o) => segHits(a.x, a.z, b.x, b.z, o));
// a kiindulópontot tartalmazó akadályból ki lehet lépni, de a többit (pl. falat) nem lehet átszelni
const clearFrom = (a, b) => !TOBS.some((o) => !(a.x > o.x0 && a.x < o.x1 && a.z > o.z0 && a.z < o.z1) && segHits(a.x, a.z, b.x, b.z, o));
const nearestNav = (x, z) => NAV.reduce((b, q) => (dist(q.x, q.z, x, z) < dist(b.x, b.z, x, z) ? q : b), NAV[0]);
export function findPath(ax, az, bx, bz) {
  const goal = inBox(bx, bz) ? nearestNav(bx, bz) : { x: bx, z: bz };
  if (clearFrom({ x: ax, z: az }, goal)) return [goal];
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
      if (u === 0 ? !clearFrom(nodes[0], nodes[v]) : !clearSeg(nodes[u], nodes[v])) continue;
      const nd = d[u] + dist(nodes[u].x, nodes[u].z, nodes[v].x, nodes[v].z);
      if (nd < d[v]) { d[v] = nd; prev[v] = u; }
    }
  }
  if (d[G] === Infinity) return [goal];
  const path = [];
  for (let u = G; u > 0; u = prev[u]) path.unshift({ x: nodes[u].x, z: nodes[u].z });
  return path;
}

// nehézség alapértékek
const D = { walk: 1.8, rush: 2.4, chase: 2.75, rocketChase: 2.3, susFill: 0.42, busyRange: 2.9, busyFov: 1.15, glance: [4.2, 8], warn: 0.8, glanceLen: 1.8, plantSee: 5, hear: 4.5 };
const BUSY = ['board', 'lab', 'grade', 'lecture', 'patrol'];
const SPOTS = {
  board: () => ({ x: rnd(-1.2, 1.2), z: -7.3, yaw: PI }),
  lab: () => ({ x: P.lab.x - 0.2, z: -5.55, yaw: PI }),
  grade: () => ({ x: P.tchair.x, z: P.tchair.z, yaw: 0 }),
  lecture: () => ({ x: rnd(-1.5, 1.5), z: -5.2, yaw: 0 }),
};

export class FSim {
  constructor(emit) {
    this.emit = emit || (() => {});
    this.s = {
      mode: 'fizika', phase: 'lobby', reason: '', t: F_TIME, hits: 0, lives: F_LIVES, players: {},
      teacher: { x: 0, z: -7.2, yaw: 0, st: 'board', fov: 1.5, range: 0, say: '', sit: false, hidden: false, weapon: 'none', count: 0 },
      bags: [], npcDesks: [], cd: {}, plant: null, rockets: [], smoke: [], pings: [], sun: 0, lights: true,
    };
  }

  // ---- játékosok -------------------------------------------------------
  addPlayer(id, name, skin) {
    const s = this.s;
    const used = new Set(Object.values(s.players).map((p) => p.desk));
    const desk = PLAYER_DESKS.find((d) => !used.has(d)) ?? PLAYER_DESKS[0];
    const sp = seatPos(desk);
    s.players[id] = {
      id, name: String(name || 'Diák').slice(0, 14), skin: skinById(skin).id, desk, seat: PLAYER_DESKS.indexOf(desk),
      x: sp.x, z: sp.z, yaw: PI, pitch: 0, act: null, sus: 0, immune: 0, seen: false, hot: 0, crouch: false,
      inv: this.emptyInv(), seated: desk, down: 0, vices: {}, mg: null, watch: 0, drunk: 0, outT: 0, missT: 0, score: 0, caught: 0, wcTotal: 0,
    };
    this.emit({ e: 'toast', m: `${s.players[id].name} belépett a terembe`, k: 'info' });
  }
  emptyInv() { return { seeds: 0, vase: false, hasCan: false, can: 0, bottle: 0, axe: false, ball: 0, phone: 0 }; }
  removePlayer(id) {
    const p = this.s.players[id];
    if (!p) return;
    this.dropAll(p);
    delete this.s.players[id];
    if (this.chase && this.chase.pid === id) this.endChase();
    this.emit({ e: 'toast', m: `${p.name} kilépett`, k: 'info' });
  }
  n() { return Math.max(1, Object.keys(this.s.players).length); }
  k() { return Math.min(3, this.n() - 1); }

  // ---- kezdés ------------------------------------------------------------
  start() {
    const old = this.s.players;
    const n = Math.max(1, Object.keys(old).length);
    const k = Math.min(3, n - 1);
    const npc = [];
    for (let i = 0; i < DESKS.length; i++) if (!PLAYER_DESKS.includes(i) && !EMPTY_DESKS.includes(i)) npc.push(i);
    this.s = {
      mode: 'fizika', phase: 'intro', reason: '', endKind: '', t: F_TIME, introT: 9, outroT: 0,
      hits: 0, lives: F_LIVES, needSeeds: 1 + Math.floor(n / 2), growNeed: 1 + 0.18 * k,
      teacher: { x: 0, z: -7.25, yaw: PI, st: 'write', fov: 1.2, range: 0, say: '', sit: false, hidden: false, weapon: 'none', count: 0, swing: 0 },
      bags: makeBags(), npcDesks: npc, snitch: { desk: SNITCH_DESK, raise: 0, cd: 20, off: 0 },
      canSill: Math.floor(Math.random() * 4), canTaken: false, axeTaken: false,
      cd: {}, plant: null, rockets: [], smoke: [], pings: [], sun: 0, lights: true, power: true, genOn: 0,
      boardBroken: false, alarmUsed: false, alarm: 0, roll: null,
      stats: { hits: 0, rockets: 0, bags: 0, seeds: 0, distract: 0, confiscated: 0, vices: 0, beer: 0, rolls: 0, smash: 0 },
      players: old,
    };
    for (const p of Object.values(old)) {
      const sp = seatPos(p.desk);
      Object.assign(p, { x: sp.x, z: sp.z, yaw: PI, act: null, sus: 0, immune: 3, seen: false, hot: 0, inv: this.emptyInv(), seated: p.desk, down: 0, vices: {}, mg: null, watch: 0, drunk: 0, outT: 0, missT: 0, score: 0, caught: 0 });
      this.emit({ e: 'tp', pid: p.id, x: p.x, z: p.z, yaw: PI });
    }
    this.mode = 'cut';
    this.act = null; this.tasks = []; this.look = null; this.stun = 0; this.stunKind = 'stun';
    this.chase = null; this.alertT = 0; this.sayT = 0; this.wantYaw = PI;
    this.rollT = rnd(110, 140); this.blackT = rnd(70, 90); this.endT = 0; this.endInfo = null;
    this.rocketId = 0; this.pingT = {}; this.saidIntro = false; this.saidOutro = false; this.powerT = 0; this.last = null;
    this.emit({ e: 'snd', n: 'bell' });
  }

  end(phase, reason, kind = phase) {
    if (this.s.phase !== 'play' && this.s.phase !== 'outro') return;
    this.s.phase = phase; this.s.reason = reason; this.s.endKind = kind;
    for (const p of Object.values(this.s.players)) { p.act = null; p.mg = null; }
    this.emit({ e: 'end', phase });
  }
  endSoon(t, ...info) { if (this.endT <= 0) { this.endT = t; this.endInfo = info; } }

  say(text, t = 2.8, mood = 'normal') {
    this.s.teacher.say = text;
    this.sayT = Math.max(t, 1 + text.length / 16);
    this.emit({ e: 'say', m: text, mood });
  }

  // ---- bemenet -----------------------------------------------------------
  handle(pid, m) {
    const s = this.s, p = s.players[pid];
    if (!p || !m) return;
    if (m.t === 'pos') {
      if (p.down > 0 || p.seated != null || ![m.x, m.z, m.yaw].every(Number.isFinite)) { if (Number.isFinite(m.yaw)) { p.yaw = m.yaw; p.pitch = +m.pitch || 0; } return; }
      p.x = Math.max(ROOM.x0, Math.min(GARDEN.x1, m.x));
      p.z = Math.max(ROOM.z0, Math.min(GARDEN.z1, m.z));
      p.yaw = m.yaw; p.pitch = +m.pitch || 0; p.crouch = !!m.c;
      if (p.mg && dist(p.x, p.z, P.stations[p.mg.st].x, P.stations[p.mg.st].z) > 2.2) { p.mg = null; this.emit({ e: 'mgEnd', pid }); }
      return;
    }
    if (s.phase !== 'play' || this.endT > 0) return;
    if (m.t === 'ping') {
      if ((this.pingT[pid] || 0) > Date.now() - 900 || ![m.x, m.z].every(Number.isFinite)) return;
      this.pingT[pid] = Date.now();
      s.pings.push({ x: m.x, z: m.z, t: 4, by: p.name });
      if (s.pings.length > 6) s.pings.shift();
      this.emit({ e: 'snd', n: 'ping' });
      return;
    }
    if (p.down > 0) return;
    if (m.t === 'act') {
      const it = interactions(s, p).find((i) => i.id === m.id);
      if (it && (it.r > 5 || dist(p.x, p.z, it.x, it.z) <= it.r + 0.7)) p.act = { id: it.id, p: 0, hold: it.hold };
    } else if (m.t === 'stop') p.act = null;
    else if (m.t === 'stand') { if (p.seated != null) this.standUp(p); }
    else if (m.t === 'cover') {
      const pl = s.plant;
      if (pl && p.seated === pl.desk && !pl.carried) {
        pl.covered = !pl.covered;
        const T = s.teacher;
        if (!T.hidden && dist(p.x, p.z, T.x, T.z) < 3.5) p.hot = Math.max(p.hot, 0.4); // közelről látja a mozdulatot
      }
    } else if (m.t === 'mg') {
      if (p.mg && m.ok === true && p.mg.t > 0) this.mgDone(p);
      else if (p.mg) { p.mg = null; }
    } else if (m.t === 'give') {
      const q = s.players[m.to];
      if (q && q !== p && q.down <= 0 && dist(p.x, p.z, q.x, q.z) < 1.8) this.give(p, q);
    } else if (m.t === 'use') {
      if ([m.ox, m.oz, m.dx, m.dy, m.dz].every(Number.isFinite)) this.useItem(p, m);
    }
  }

  standUp(p) {
    const sp = seatPos(p.seated);
    p.seated = null;
    const [x, z] = collide(sp.x + 0.9, sp.z, sp.x, sp.z);
    p.x = x; p.z = z;
    this.emit({ e: 'tp', pid: p.id, x, z, yaw: p.yaw, keepYaw: true });
  }
  sitDown(p, d) {
    const sp = seatPos(d);
    p.seated = d; p.x = sp.x; p.z = sp.z; p.crouch = false;
    this.emit({ e: 'tp', pid: p.id, x: sp.x, z: sp.z, yaw: PI });
  }

  give(p, q) {
    const a = p.inv, b = q.inv;
    b.seeds += a.seeds; b.vase = b.vase || a.vase; b.axe = b.axe || a.axe;
    b.bottle += a.bottle; b.ball += a.ball; b.phone += a.phone;
    if (a.hasCan) { b.hasCan = true; b.can = Math.max(b.can, a.can); }
    const pl = this.s.plant;
    if (pl && pl.carried === p.id) pl.carried = q.id;
    p.inv = this.emptyInv();
    this.emit({ e: 'toast', m: `${p.name} átadta a tárgyait neki: ${q.name}`, k: 'good' });
    this.emit({ e: 'snd', n: 'pick' });
  }

  useItem(p, m) {
    const s = this.s, inv = p.inv;
    const len = Math.hypot(m.dx, m.dy, m.dz) || 1;
    const d = [m.dx / len, m.dy / len, m.dz / len];
    if (inv.ball > 0) {
      // papírgalacsin: zajt csap ott, ahol földet ér; a strébert elhallgattatja
      inv.ball--;
      let t = d[1] < -0.05 ? -1.55 / d[1] : 8;
      t = Math.min(t, 9);
      const [x, z] = collide(m.ox + d[0] * t, m.oz + d[2] * t, p.x, p.z, 0.1);
      this.emit({ e: 'lob', from: [m.ox, 1.45, m.oz], to: [x, 0.1, z], c: 0xf5f5f4 });
      this.emit({ e: 'snd', n: 'whoosh' });
      const sn = s.snitch, sd = DESKS[sn.desk];
      const tca = (sd.x - m.ox) * d[0] + (sd.z - m.oz) * d[2];
      const qx = m.ox + d[0] * tca, qz = m.oz + d[2] * tca;
      if (tca > 0.4 && tca < t + 0.5 && dist(qx, qz, sd.x, sd.z + 0.6) < 0.7) {
        sn.off = 30; sn.raise = 0;
        this.emit({ e: 'toast', m: 'A stréber egy ideig nem figyel', k: 'good' });
      } else this.noise(x, z, 0.4, 3, true);
      p.hot = 0.4;
    } else if (inv.phone > 0) {
      inv.phone--;
      const [x, z] = collide(p.x + Math.sin(p.yaw) * 0.6, p.z + Math.cos(p.yaw) * 0.6, p.x, p.z, 0.1);
      s.phone = { x, z, t: 3, ring: false };
      this.emit({ e: 'toast', m: 'Telefon letéve – 3 mp múlva csörög', k: 'info', pid: p.id });
    }
  }

  // tárgyak visszakerülnek a helyükre, ha valaki elveszíti őket
  dropAll(p) {
    const s = this.s, inv = p.inv;
    if (inv.vase) this.hideInBag('vase');
    if (inv.bottle > 0) this.hideInBag('bottle');
    if (inv.hasCan) { s.canTaken = false; s.canSill = Math.floor(Math.random() * 4); }
    if (inv.axe) s.axeTaken = false;
    const pl = s.plant;
    if (pl && pl.carried === p.id) this.confiscatePlant(true);
    p.inv = this.emptyInv();
  }
  hideInBag(what) {
    const bags = this.s.bags.filter((b) => b.searched || b.content === 'junk');
    const b = pick(bags.length ? bags : this.s.bags);
    b.content = what; b.searched = false;
  }
  confiscatePlant(silent) {
    const s = this.s, pl = s.plant;
    if (!pl) return;
    const owner = s.players[pl.by] || Object.values(s.players)[0];
    if (owner) owner.inv.seeds += pl.seeds; // a magokat visszakapja, a váza egy táskába kerül
    this.hideInBag('vase');
    s.plant = null;
    s.stats.confiscated++;
    if (!silent) this.emit({ e: 'toast', m: 'Fizika néni elkobozta a napraforgót – a váza egy táskába került', k: 'bad' });
  }

  // ---- akciók befejezése ---------------------------------------------
  complete(p, id) {
    const s = this.s, inv = p.inv, T = s.teacher;
    const [kind, arg] = id.split(':');
    const near = (snd) => { if (!T.hidden && inGarden(p.x) === inGarden(T.x) && dist(p.x, p.z, T.x, T.z) < D.hear) { p.hot = Math.max(p.hot, 0.7); this.noise(p.x, p.z, 0.4, 2.2); } if (snd) this.emit({ e: 'snd', n: snd }); };
    switch (kind) {
      case 'sit': this.sitDown(p, +arg); break;
      case 'bag': {
        const b = s.bags[+arg];
        if (!b || b.searched) break;
        b.searched = true; s.stats.bags++;
        near('zip');
        const c = b.content;
        if (c === 'vase') { inv.vase = true; this.emit({ e: 'toast', m: 'Megvan a váza!', k: 'good', pid: p.id }); }
        else if (c === 'bottle') { inv.bottle += 2; this.emit({ e: 'toast', m: 'Vizes palack (2 kannára elég)', k: 'good', pid: p.id }); }
        else if (c === 'ball') { inv.ball += 2; this.emit({ e: 'toast', m: 'Két papírgalacsin – dobással zajt csaphatsz', k: 'good', pid: p.id }); }
        else if (c === 'phone') { inv.phone += 1; this.emit({ e: 'toast', m: 'Egy telefon – letéve elcsalja Fizika nénit', k: 'good', pid: p.id }); }
        else this.emit({ e: 'toast', m: pick(JUNK), k: 'info', pid: p.id });
        b.content = 'junk';
        break;
      }
      case 'can': if (!s.canTaken) { s.canTaken = true; inv.hasCan = true; inv.can = 2; this.emit({ e: 'snd', n: 'pick' }); } break;
      case 'fill': if (inv.hasCan && inv.bottle > 0) { inv.bottle--; inv.can = 3; near('pour'); } break;
      case 'axe': if (!s.axeTaken) { s.axeTaken = true; inv.axe = true; this.emit({ e: 'snd', n: 'pick' }); } break;
      case 'st': this.startMg(p, +arg); break;
      case 'plant':
        if (!s.plant && inv.vase && inv.seeds >= s.needSeeds) {
          inv.vase = false; inv.seeds -= s.needSeeds;
          s.plant = { desk: p.seated, growth: 0, water: 1, carried: null, covered: false, seeds: s.needSeeds, by: p.id };
          this.emit({ e: 'toast', m: 'Elültetve. Öntözd, és tartsd a napon!', k: 'good' });
          this.emit({ e: 'snd', n: 'pick' });
        }
        break;
      case 'water': if (s.plant && inv.can > 0) { inv.can--; s.plant.water = 1; near('pour'); } break;
      case 'pick':
        if (s.plant && s.plant.desk === p.seated) {
          this.standUp(p);
          s.plant.carried = p.id; s.plant.covered = false;
        }
        break;
      case 'place':
        if (s.plant && s.plant.carried === p.id) { s.plant.carried = null; s.plant.desk = +arg; this.sitDown(p, +arg); }
        break;
      case 'smash':
        if (!inv.axe || s.boardBroken) break;
        inv.axe = false; s.boardBroken = true; s.stats.smash++; s.stats.distract++;
        this.emit({ e: 'snd', n: 'smash' }); this.emit({ e: 'shake', a: 0.7 });
        p.hot = 1.0;
        this.distract('smash');
        break;
      case 'gen':
        s.cd.gen = 45; s.genOn = 6; s.stats.distract++;
        this.emit({ e: 'snd', n: 'zap' });
        p.hot = 0.6;
        this.distract('gen');
        break;
      case 'switch':
        s.lights = false; s.cd.switch = 35; s.stats.distract++;
        near('click');
        this.distract('lights');
        break;
      case 'alarm':
        if (s.alarmUsed) break;
        s.alarmUsed = true; s.stats.distract++; p.hot = 1.0;
        this.startAlarm();
        break;
      case 'cigi': case 'vape': {
        p.vices[kind] = true; s.stats.vices++;
        const d = DESKS[p.seated];
        s.smoke.push({ x: d.x, z: d.z + 0.4, t: kind === 'vape' ? 8 : 11, big: kind === 'vape', desk: p.seated });
        this.emit({ e: 'snd', n: 'cough' });
        this.tasks.push({ id: 'smoke', delay: kind === 'vape' ? 2.5 : 5.5, desk: p.seated, pid: p.id });
        break;
      }
      case 'beer':
        p.vices.beer = true; p.drunk = 30; s.stats.beer++; s.stats.vices++;
        this.emit({ e: 'beer', pid: p.id });
        this.emit({ e: 'snd', n: 'hiss' });
        if (!T.hidden && dist(p.x, p.z, T.x, T.z) < 7 && !inGarden(T.x)) this.tasks.push({ id: 'smoke', delay: 1.2, desk: p.seated, pid: p.id, beer: true });
        break;
      case 'deliver':
        if (s.plant && s.plant.carried === p.id && s.plant.growth >= 1) this.startOutro(p);
        break;
    }
  }

  // ---- kert: kísérlet-minijátékok -----------------------------------
  startMg(p, i) {
    const s = this.s;
    if ((s.cd['st' + i] || 0) > 0) return;
    p.mg = { st: i, t: 25 };
    this.emit({ e: 'mg', pid: p.id, st: i, kind: P.stations[i].id, hard: this.k() });
  }
  mgDone(p) {
    const s = this.s, i = p.mg.st;
    p.mg = null;
    if (dist(p.x, p.z, P.stations[i].x, P.stations[i].z) > 2.4) return;
    s.cd['st' + i] = 10 + 3 * this.k();
    p.inv.seeds++; s.stats.seeds++; p.score += 3;
    this.emit({ e: 'toast', m: `Kísérlet kész – kaptál egy napraforgómagot (${this.teamSeeds()}/${s.needSeeds})`, k: 'good', pid: p.id });
    this.emit({ e: 'snd', n: 'goal' });
  }
  teamSeeds() { return Object.values(this.s.players).reduce((a, p) => a + p.inv.seeds, 0); }

  // ---- figyelemelterelés ---------------------------------------------
  distract(kind) {
    if (this.chase || this.mode === 'alarm') return;
    const T = this.s.teacher;
    T.sit = false;
    if (this.act) this.finishAct(this.act);
    if (kind === 'smash') {
      this.stun = 2.5; this.stunKind = 'scared';
      this.say(line('f_smash'), 3, 'yell');
      this.tasks.unshift({ id: 'repair', spot: { x: 0, z: -7.2, yaw: PI }, dur: 24, say: 'f_repair', busy: true });
    } else if (kind === 'gen') {
      this.tasks.unshift({ id: 'gen', spot: { x: P.lab.x, z: -5.55, yaw: PI }, dur: 8, say: 'f_gen', busy: true, rush: true });
    } else if (kind === 'lights') {
      this.tasks.unshift({ id: 'lights', spot: { x: 4.45, z: P.switch.z, yaw: PI / 2 }, dur: 1, say: 'f_lights', delay: 2, rush: true });
    }
    this.alertT = Math.max(this.alertT, 12);
  }
  startAlarm() {
    const s = this.s, T = s.teacher;
    this.endChase(true);
    if (this.act) this.finishAct(this.act);
    this.tasks = this.tasks.filter((t) => t.id === 'smoke');
    this.mode = 'alarm';
    s.alarm = 14;
    T.sit = false;
    this.emit({ e: 'evt', t: 'Tűzriadó', d: 'Fizika néni kimegy a kertbe – a terem szabad, de a kertben vigyázz!' });
    this.emit({ e: 'snd', n: 'alarm' });
    this.say(line('f_alarmStart'), 3, 'yell');
    this.act = { kind: 'alarm', phase: 'go', t: 0, dur: 11, spot: { x: P.assembly.x, z: P.assembly.z, yaw: PI / 2 }, path: findPath(T.x, T.z, P.assembly.x, P.assembly.z) };
  }

  noise(x, z, delay = 0.5, t = 2.5, lure = false) {
    const T = this.s.teacher;
    if (this.stun > 0 || this.chase || T.hidden || this.mode === 'cut') return;
    if (inGarden(x) !== inGarden(T.x)) return;
    // két zaj közül a közelebbit választja
    if (this.look && this.look.t > 0.5 && dist(T.x, T.z, this.look.x, this.look.z) < dist(T.x, T.z, x, z)) return;
    this.look = { x, z, d: delay, t };
    if (lure && dist(T.x, T.z, x, z) < 9 && !this.tasks.some((k) => k.id === 'noise')) {
      this.tasks.push({ id: 'noise', spot: { x, z, yaw: 0 }, dur: 3, say: 'f_noise', rush: true, look: true });
    }
  }

  // hiányzót vett észre: az ajtóhoz siet és kinéz a kertbe
  checkAbsent(p) {
    if (this.chase || this.tasks.some((t) => t.id === 'absent')) return;
    this.say(line('f_absent', { n: p.name }), 3, 'angry');
    this.emit({ e: 'evt', t: `${p.name} hiányzik`, d: 'Fizika néni az ajtóhoz indul – érj vissza a padodba, mielőtt kinéz!', pid: p.id });
    if (this.act && this.act.kind !== 'task' && this.act.kind !== 'alarm') this.finishAct(this.act);
    this.tasks.unshift({ id: 'absent', pid: p.id, spot: { x: 4.4, z: DOOR.z, yaw: PI / 2 }, dur: 2.5, rush: true, look: true });
  }

  // ---- üldözés -------------------------------------------------------
  startChase(p, why) {
    const s = this.s, T = s.teacher;
    if (this.chase || p.down > 0 || p.immune > 0) return;
    if (this.act) this.finishAct(this.act);
    this.act = null; this.look = null; this.stun = 0;
    T.sit = false; T.hidden = false;
    this.mode = 'chase';
    T.weapon = s.hits >= 2 ? 'rocket' : 'spoon';
    this.chase = { pid: p.id, lx: p.x, lz: p.z, lost: 0, fire: 1.4, swing: 0, repath: 0, path: [] };
    T.target = p.id;
    if (why === 'absent') this.say(line('f_absent', { n: p.name }), 3, 'angry');
    else this.say(line(T.weapon === 'rocket' ? 'f_chaseRocket' : 'f_chase', { n: p.name }), 3, 'yell');
    this.emit({ e: 'evt', t: T.weapon === 'rocket' ? 'Rakétavető!' : 'Fizika néni üldöz', d: T.weapon === 'rocket' ? `${p.name}, fuss és térj ki a lövedékek elől!` : `${p.name}, a fakanál elől: vissza a padodba, vagy fuss!`, pid: p.id });
    this.emit({ e: 'snd', n: 'chase' });
  }
  endChase(silent) {
    const T = this.s.teacher;
    if (!this.chase) return;
    this.chase = null;
    this.mode = 'class';
    T.st = 'walk'; T.target = null; T.weapon = 'none';
    if (!silent) this.act = null;
  }
  hit(p, kind) {
    const s = this.s, T = s.teacher;
    if (p.down > 0 || p.immune > 0) return;
    s.hits++; s.stats.hits++; p.caught++;
    if (kind === 'rocket') s.stats.rockets++;
    this.emit({ e: 'hit', pid: p.id, kind, name: p.name, n: s.hits });
    this.emit({ e: 'snd', n: kind === 'rocket' ? 'boom' : 'thwack' });
    this.say(line(kind === 'rocket' ? 'f_hitRocket' : 'f_hit', { n: p.name }), 3, 'angry');
    this.dropAll(p);
    p.mg = null; p.act = null; p.sus = 0; p.hot = 0; p.watch = 25; p.drunk = 0;
    p.down = this.n() > 1 ? 12 : 2.5;
    p.immune = p.down + 5;
    this.sitDown(p, p.desk);
    this.endChase();
    if (s.hits >= F_LIVES) this.endSoon(2.5, 'lost', 'Fizika néni harmadszor is elkapott. Vége az órának.', 'lives');
  }
  stepChase(dt) {
    const s = this.s, T = s.teacher, c = this.chase;
    const p = s.players[c.pid];
    if (!p || p.down > 0) { this.endChase(); return; }
    // a padjában ülőt nem üti meg, csak elkobozza, ami nála van
    if (p.seated === p.desk && !inGarden(p.x)) {
      if (dist(T.x, T.z, p.x, p.z) < 3 || c.lost > 1) {
        const inv = p.inv;
        if (inv.axe || (s.plant && s.plant.carried === p.id)) { this.dropAll(p); this.emit({ e: 'toast', m: 'Fizika néni elkobozta, ami nálad volt', k: 'bad', pid: p.id }); }
        p.watch = 30;
        this.say(line('f_seatedSafe', { n: p.name }), 3, 'angry');
        this.endChase();
        return;
      }
    }
    const same = inGarden(p.x) === inGarden(T.x);
    const d = dist(T.x, T.z, p.x, p.z);
    const hidden = p.crouch && P.bushes.some((b) => dist(p.x, p.z, b.x, b.z) < b.r) && d > 1.6;
    const sees = same && !hidden && d < 18 && (d < 2 || !COVER.some((b) => p.crouch && segHits(T.x, T.z, p.x, p.z, b)));
    if (sees) { c.lx = p.x; c.lz = p.z; c.lost = 0; c.via = null; }
    else {
      c.lost += dt;
      // ha a diák átment a másik helyiségbe, az ajtón át követi
      if (!same && !c.via) { c.via = true; c.lx = inGarden(T.x) ? 5.7 : 4.4; c.lz = DOOR.z; c.repath = 0; }
      else if (c.via && dist(T.x, T.z, c.lx, c.lz) < 0.5 && !same) { c.lx = inGarden(p.x) ? 6.6 : 3.6; c.lz = DOOR.z; c.repath = 0; }
    }
    const rocket = T.weapon === 'rocket';
    // mozgás
    let tx = c.lx, tz = c.lz;
    const keep = rocket && sees && d < 6 && d > 2.2;
    const speed = (rocket ? D.rocketChase : D.chase) * (1 + 0.06 * this.k());
    if (!keep) {
      c.repath -= dt;
      if (c.repath <= 0 || !c.path.length) { c.repath = 0.5; c.path = findPath(T.x, T.z, tx, tz); }
      let left = speed * dt;
      while (left > 0 && c.path.length) {
        const w = c.path[0];
        const dd = dist(T.x, T.z, w.x, w.z);
        if (dd < 0.05) { c.path.shift(); continue; }
        const m = Math.min(dd, left);
        T.x += ((w.x - T.x) / dd) * m; T.z += ((w.z - T.z) / dd) * m;
        left -= m;
        this.wantYaw = yawTo(T.x, T.z, w.x, w.z);
      }
      // az útvonal végén (pl. ha a diák padok közé vagy asztal mellé bújt) egyenesen odamegy, ütközéssel
      const fd = dist(T.x, T.z, tx, tz);
      if (left > 0 && !c.path.length && fd > 0.7) {
        const m = Math.min(left, fd - 0.6);
        const [nx, nz] = collide(T.x + ((tx - T.x) / fd) * m, T.z + ((tz - T.z) / fd) * m, T.x, T.z, 0.3);
        if (Math.hypot(nx - T.x, nz - T.z) < m * 0.2) c.repath = 0; // beakadt: új útvonal
        T.x = nx; T.z = nz;
        this.wantYaw = yawTo(T.x, T.z, tx, tz);
      }
    }
    if (sees) this.wantYaw = yawTo(T.x, T.z, p.x, p.z);
    T.st = c.swing > 0 ? 'swing' : rocket && sees && d > 2.2 ? 'aim' : 'run';
    // elvesztette: körbenéz ott, ahol utoljára látta
    if (!sees && dist(T.x, T.z, c.lx, c.lz) < 0.8) { T.st = 'look'; this.wantYaw = T.yaw + 1.2 * Math.sin(c.lost * 2.2) * dt * 4 + 2.5 * dt; }
    // fakanál
    if (c.swing > 0) {
      c.swing -= dt;
      if (c.swing <= 0) {
        if (dist(T.x, T.z, p.x, p.z) < 1.5 && same) this.hit(p, 'spoon');
        else { c.cool = 0.8; this.emit({ e: 'snd', n: 'whoosh' }); }
        return;
      }
    } else if ((c.cool = (c.cool || 0) - dt) <= 0 && d < 1.15 && same) {
      c.swing = 0.38;
      this.emit({ e: 'swing' });
    }
    // rakéta
    if (rocket && sees && d > 2.2) {
      c.fire -= dt;
      if (c.fire <= 0) {
        c.fire = 2.7 - 0.2 * this.k();
        const v = 7.2;
        const dx = p.x - T.x, dz = p.z - T.z, dl = Math.hypot(dx, dz) || 1;
        s.rockets.push({ id: ++this.rocketId, x: T.x + (dx / dl) * 0.6, y: 1.45, z: T.z + (dz / dl) * 0.6, vx: (dx / dl) * v, vy: (1.0 - 1.45) / (dl / v), vz: (dz / dl) * v, t: 0 });
        this.emit({ e: 'snd', n: 'launch' });
      }
    }
    if (c.lost > 9) {
      this.say(line('f_giveUp'), 3);
      p.watch = 20;
      this.endChase();
    }
  }
  stepRockets(dt) {
    const s = this.s;
    for (let i = s.rockets.length - 1; i >= 0; i--) {
      const r = s.rockets[i];
      r.t += dt;
      r.x += r.vx * dt; r.y += r.vy * dt; r.z += r.vz * dt;
      let boom = r.t > 4 || r.y < 0.15 || !walkable(r.x, r.z, 0.05);
      if (!boom) for (const p of Object.values(s.players)) if (p.down <= 0 && dist(p.x, p.z, r.x, r.z) < 0.6) boom = true;
      if (boom) {
        s.rockets.splice(i, 1);
        this.emit({ e: 'boom', x: r.x, y: Math.max(0.3, r.y), z: r.z });
        this.emit({ e: 'shake', a: 0.8 });
        for (const p of Object.values(s.players)) {
          if (p.down <= 0 && inGarden(p.x) === inGarden(r.x) && dist(p.x, p.z, r.x, r.z) < 1.5) { this.hit(p, 'rocket'); break; }
        }
      }
    }
  }

  // ---- óra menete ----------------------------------------------------
  startAct(kind, task) {
    const T = this.s.teacher;
    const a = { kind, phase: 'go', t: 0, g: rnd(...D.glance), m: rnd(8, 14) };
    if (kind === 'task') { a.task = task; a.spot = task.spot; a.dur = task.dur; if (task.say) this.say(line(task.say), 2.8, 'angry'); }
    else if (kind === 'patrol') {
      const a1 = pick(AISLES.slice(0, 3)), a2 = pick(AISLES.filter((x) => x !== a1));
      a.path = [];
      let cx = T.x, cz = T.z;
      for (const r of [{ x: a1, z: FRONT_Z }, { x: a1, z: BACK_Z }, { x: a2, z: BACK_Z }, { x: a2, z: FRONT_Z }]) { a.path.push(...findPath(cx, cz, r.x, r.z)); cx = r.x; cz = r.z; }
      a.spot = { x: cx, z: cz, yaw: 0 }; a.dur = 0.3;
      this.say(line('f_patrol'));
    } else { a.spot = SPOTS[kind](); a.dur = kind === 'lecture' ? rnd(6, 9) : rnd(11, 16); }
    if (!a.path) a.path = findPath(T.x, T.z, a.spot.x, a.spot.z);
    T.sit = false;
    this.act = a;
  }
  startNext() {
    const k = this.k();
    const opts = this.alertT > 0 ? ['lecture', 'patrol', 'patrol'] : ['board', 'board', 'lab', 'grade', 'grade', 'lecture', 'patrol', ...(k > 1 ? ['patrol'] : [])];
    let kind = pick(opts);
    if (kind === this.last && Math.random() < 0.6) kind = pick(opts);
    this.startAct(kind);
  }
  arrive(a) {
    const s = this.s, T = s.teacher;
    T.x = a.spot.x; T.z = a.spot.z;
    a.phase = 'do'; a.t = a.dur;
    this.wantYaw = a.spot.yaw;
    if (a.kind === 'grade') { T.sit = true; this.say(line('f_grade')); }
    else if (a.kind === 'board') this.say(line('f_board'));
    else if (a.kind === 'lab') this.say(line('f_lab'));
    else if (a.kind === 'lecture') this.say(line('f_lecture'));
    else if (a.kind === 'alarm') { T.hidden = false; }
    else if (a.kind === 'task') {
      const tk = a.task;
      if (tk.id === 'plant') {
        const pl = s.plant;
        if (pl && !pl.covered && !pl.carried && pl.desk === tk.desk) {
          this.say(line('f_plantFound'), 3, 'angry');
          for (const q of Object.values(s.players)) if (q.seated === pl.desk) q.watch = 25;
          this.confiscatePlant();
        }
      } else if (tk.id === 'smoke') {
        const q = s.players[tk.pid];
        this.say(line(tk.beer ? 'f_beerHeard' : 'f_smoke'), 3, 'angry');
        if (q && q.seated === tk.desk) { q.watch = 35; if (q.inv.axe) this.dropAll(q); }
        if (s.plant && s.plant.desk === tk.desk && !s.plant.covered) this.confiscatePlant();
      } else if (tk.id === 'absent') {
        const q = s.players[tk.pid];
        if (q && inGarden(q.x) && q.down <= 0) this.startChase(q, 'absent');
        else if (q) { q.watch = 25; this.say(line('f_seatedSafe', { n: q.name }), 3, 'angry'); }
      } else if (tk.id === 'lights') { s.lights = true; }
      else if (tk.id === 'phone') { s.phone = null; this.say(line('f_phone'), 2.5, 'angry'); }
    }
  }
  finishAct(a) {
    const s = this.s, T = s.teacher;
    if (a.kind === 'grade') T.sit = false;
    if (a.kind === 'task' && a.task.id === 'repair') this.say('Na. Nem működik. Akkor krétával.', 2.5);
    if (a.kind === 'task' && a.task.id === 'gen') s.genOn = 0;
    if (a.kind === 'alarm') { this.mode = 'class'; this.say(line('f_alarmBack'), 3, 'angry'); this.alertT = 25; }
    this.last = a.kind;
    this.act = null;
  }

  stepTeacher(dt) {
    const s = this.s, T = s.teacher;
    let vis = 'none';
    this.sayT -= dt;
    if (this.sayT <= 0) T.say = '';
    T.count = 0;

    // késleltetett feladatok (pl. füstszag)
    for (const tk of this.tasks) if (tk.delay > 0) tk.delay -= dt;

    if (this.chase) {
      this.stepChase(dt);
      vis = 'full';
    } else if (this.stun > 0) {
      this.stun -= dt; T.st = this.stunKind;
    } else if (this.look && (this.look.d -= dt) <= 0) {
      this.wantYaw = yawTo(T.x, T.z, this.look.x, this.look.z);
      T.st = 'look'; vis = 'full';
      if ((this.look.t -= dt) <= 0) this.look = null;
    } else {
      let a = this.act;
      const ready = this.tasks.findIndex((tk) => !(tk.delay > 0));
      if (a && ready >= 0 && (a.kind !== 'task' && a.kind !== 'alarm')) { this.finishAct(a); a = null; }
      if (!a) {
        if (ready >= 0) {
          const tk = this.tasks.splice(ready, 1)[0];
          if (tk.id === 'smoke') tk.spot = { x: DESKS[tk.desk].x + 1.3, z: DESKS[tk.desk].z + 0.4, yaw: -PI / 2 }, tk.dur = 2;
          if (tk.id === 'plant') tk.spot = { x: DESKS[tk.desk].x + 1.3, z: DESKS[tk.desk].z, yaw: -PI / 2 }, tk.dur = 1.5;
          this.startAct('task', tk);
        } else if (this.rollT <= 0 && !s.roll) this.startRoll();
        else this.startNext();
        a = this.act;
      }
      if (a) {
        if (a.phase === 'go') {
          T.st = 'walk'; vis = 'full';
          const sp = (a.kind === 'alarm' || (a.task && a.task.rush) ? D.rush : D.walk) * (1 + 0.07 * this.k());
          let left = sp * dt;
          while (left > 0 && a.path.length) {
            const w = a.path[0];
            const dd = dist(T.x, T.z, w.x, w.z);
            if (dd < 0.03) { a.path.shift(); continue; }
            this.wantYaw = yawTo(T.x, T.z, w.x, w.z);
            const m = Math.min(dd, left);
            T.x += ((w.x - T.x) / dd) * m; T.z += ((w.z - T.z) / dd) * m;
            left -= m;
          }
          if (!a.path.length) this.arrive(a);
        } else {
          a.t -= dt;
          if (a.kind === 'lecture' || s.roll) {
            T.st = s.roll ? 'roll' : 'lecture'; vis = 'full';
            this.wantYaw = 0 + 0.85 * Math.sin((a.dur - a.t) * 0.8);
          } else if (a.kind === 'patrol') { T.st = 'walk'; vis = 'full'; }
          else if (a.kind === 'alarm') {
            T.st = 'look'; vis = 'full';
            this.wantYaw = PI / 2 + 1.2 * Math.sin((a.dur - a.t) * 1.1);
          } else if (a.kind === 'task' && a.task.look) { T.st = 'look'; vis = 'full'; }
          else {
            T.st = a.kind === 'task' ? (a.task.id === 'repair' ? 'phone' : 'fix') : a.kind;
            vis = 'busy';
            a.g -= dt;
            if (a.g <= 0) {
              if (a.g > -D.warn) T.st = 'warn';
              else if (a.g > -D.warn - D.glanceLen) { T.st = 'glance'; vis = 'full'; this.wantYaw = yawTo(T.x, T.z, 0, 3); }
              else { a.g = rnd(...D.glance) * (1 - 0.12 * this.k()) * (this.alertT > 0 ? 0.7 : 1); this.wantYaw = a.spot.yaw; }
            }
          }
          if (a.t <= 0 && this.act === a) this.finishAct(a);
        }
      }
    }
    const dy = angDiff(this.wantYaw, T.yaw);
    const mt = 7 * dt;
    T.yaw += Math.abs(dy) < mt ? dy : Math.sign(dy) * mt;
    if (vis === 'full') { T.fov = 1.6; T.range = 15; }
    else if (vis === 'busy') { T.fov = D.busyFov; T.range = D.busyRange + 0.4 * this.k(); }
    else { T.fov = 1.0; T.range = 0; }
    if ((!s.lights || !s.power) && !inGarden(T.x) && T.range > 4) T.range = 4;
  }

  startRoll() {
    const s = this.s;
    this.rollT = rnd(120, 150);
    s.roll = { t: 8 };
    s.stats.rolls++;
    this.say(line('f_roll'), 3, 'angry');
    this.emit({ e: 'evt', t: 'Névsorolvasás', d: '8 másodperc – mindenki legyen a saját padjánál!' });
    this.emit({ e: 'snd', n: 'quiz' });
    this.startAct('lecture');
    this.act.dur = 9;
  }
  stepRoll(dt) {
    const s = this.s;
    if (!s.roll) return;
    if ((s.roll.t -= dt) > 0) return;
    s.roll = null;
    if (this.chase || this.mode !== 'class') return;
    let chased = false;
    for (const p of Object.values(s.players)) {
      if (p.down > 0) continue;
      const sp = seatPos(p.desk);
      if (inGarden(p.x)) {
        if (!chased) { this.say(line('f_rollMissing', { n: p.name }), 3, 'angry'); this.startChase(p, 'absent'); chased = true; }
        else p.watch = 30;
      } else if (dist(p.x, p.z, sp.x, sp.z) > 1.4) {
        p.watch = 25;
        this.say(line('f_rollAway', { n: p.name }), 3, 'angry');
      }
    }
  }

  // ---- átvezető jelenetek --------------------------------------------
  startOutro(p) {
    const s = this.s, T = s.teacher;
    this.endChase(true);
    s.plant.carried = null; s.plant.desk = -1; // a tanári asztalra kerül
    s.phase = 'outro'; s.outroT = 13;
    s.rockets = [];
    T.x = P.tchair.x + 0.9; T.z = P.tdesk.z - 0.9; T.yaw = -PI / 2; T.hidden = false; T.weapon = 'none'; T.st = 'look';
    this.act = null; this.tasks = []; this.chase = null; this.mode = 'cut';
    p.score += 10;
    this.say(line('f_deliver'), 2.5);
    this.emit({ e: 'cut', kind: 'outro' });
  }

  // ---- fő lépés ------------------------------------------------------
  step(dt) {
    const s = this.s;
    const T = s.teacher;
    if (s.phase === 'intro') {
      s.introT -= dt;
      T.x = 0.3; T.z = -7.25; T.yaw = PI; T.st = s.introT > 3 ? 'write' : 'lecture';
      if (s.introT < 2.6 && !this.saidIntro) { this.saidIntro = true; T.yaw = 0; this.say(line('f_intro'), 3); }
      if (s.introT < 2.6) T.yaw = 0;
      if (s.introT <= 0) { s.phase = 'play'; this.mode = 'class'; this.wantYaw = 0; }
      return;
    }
    if (s.phase === 'outro') {
      s.outroT -= dt;
      this.sayT -= dt;
      if (s.outroT < 4.5 && !this.saidOutro) { this.saidOutro = true; this.say(line('f_outro'), 4.5); }
      if (s.outroT <= 0) this.end('won', 'Bebizonyítottátok: a napraforgó a nappal együtt fordul.', 'won');
      return;
    }
    if (s.phase !== 'play') return;
    if (this.endT > 0) { this.endT -= dt; this.stepTeacher(dt); if (this.endT <= 0) this.end(...this.endInfo); return; }

    s.t -= dt;
    if (s.t <= 0) { s.t = 0; this.end('lost', 'Kicsengettek, a napraforgó nem nőtt ki.', 'time'); return; }
    s.sun = Math.min(1, 1 - s.t / F_TIME);
    for (const kk in s.cd) if (s.cd[kk] > 0) s.cd[kk] -= dt;
    if (this.alertT > 0) this.alertT -= dt;
    if (s.alarm > 0) s.alarm -= dt;
    if (s.genOn > 0) s.genOn -= dt;
    this.rollT -= dt;
    // áramszünet a generátortól (mini-esemény)
    if ((this.blackT -= dt) <= 0 && !this.chase && this.mode === 'class') {
      this.blackT = rnd(95, 125);
      s.power = false; this.powerT = 7;
      this.emit({ e: 'evt', t: 'Áramszünet', d: 'A generátor leverte az áramot – Fizika néni pár másodpercig vele bajlódik.' });
      this.emit({ e: 'snd', n: 'zap' });
      this.say(line('f_blackout'), 3);
      if (this.act) this.finishAct(this.act);
      this.tasks.unshift({ id: 'gen', spot: { x: P.lab.x, z: -5.55, yaw: PI }, dur: 6, busy: true, rush: true });
    }
    if (this.powerT > 0 && (this.powerT -= dt) <= 0) s.power = true;
    for (let i = s.smoke.length - 1; i >= 0; i--) if ((s.smoke[i].t -= dt) <= 0) s.smoke.splice(i, 1);
    for (let i = s.pings.length - 1; i >= 0; i--) if ((s.pings[i].t -= dt) <= 0) s.pings.splice(i, 1);
    if (s.phone) {
      if (!s.phone.ring && (s.phone.t -= dt) <= 0) {
        s.phone.ring = true;
        this.emit({ e: 'snd', n: 'ringtone' });
        this.noise(s.phone.x, s.phone.z, 0.3, 2);
        if (!this.chase && this.mode === 'class') this.tasks.push({ id: 'phone', spot: { x: s.phone.x, z: s.phone.z, yaw: 0 }, dur: 1.5, rush: true });
      }
    }

    this.stepTeacher(dt);
    if (s.phase !== 'play' || this.endT > 0) return;
    this.stepRockets(dt);
    this.stepRoll(dt);

    // napraforgó
    const pl = s.plant;
    if (pl) {
      const tender = Object.values(s.players).find((q) => q.seated === pl.desk && q.down <= 0);
      if (tender && !pl.covered && !pl.carried && pl.water > 0 && pl.desk >= 0) {
        pl.water = Math.max(0, pl.water - dt / 90); // csak növekedés közben fogy
        const d = DESKS[pl.desk];
        const rate = (sunAt(s.sun, d.x, d.z) / 65) / s.growNeed * (tender.drunk > 0 ? 0.65 : 1);
        pl.growth = Math.min(1, pl.growth + rate * dt);
        pl.sunNow = sunAt(s.sun, d.x, d.z);
      }
      if (pl.growth >= 1 && !pl.doneSaid) { pl.doneSaid = true; this.emit({ e: 'toast', m: 'Kinőtt a napraforgó! Vidd oda Fizika néninek.', k: 'good' }); this.emit({ e: 'snd', n: 'goal' }); }
    }

    // stréber
    const sn = s.snitch;
    if (sn.cd > 0) sn.cd -= dt;
    if (sn.off > 0) sn.off -= dt;
    if (sn.raise > 0) sn.raise -= dt;

    // játékosok
    const dirX = Math.sin(T.yaw), dirZ = Math.cos(T.yaw);
    const tg = inGarden(T.x);
    for (const p of Object.values(s.players)) {
      if (p.down > 0) { p.down -= dt; p.sus = 0; continue; }
      if (p.immune > 0) p.immune -= dt;
      if (p.hot > 0) p.hot -= dt;
      if (p.watch > 0) p.watch -= dt;
      if (p.drunk > 0) p.drunk -= dt;
      if (p.mg && (p.mg.t -= dt) <= 0) { p.mg = null; this.emit({ e: 'mgEnd', pid: p.id }); }
      const pg = inGarden(p.x);
      p.outT = pg ? p.outT + dt : 0;
      // stréber: ha valaki 10 mp-nél tovább kint van
      if (pg && p.outT > 18 && sn.off <= 0 && sn.cd <= 0 && !this.chase && this.mode === 'class' && !T.hidden) {
        sn.cd = 25; sn.raise = 3;
        this.emit({ e: 'snitch', m: line('f_snitch', { n: p.name }), pid: p.id });
        this.checkAbsent(p);
      }
      if (p.act) {
        const it = interactions(s, p).find((i) => i.id === p.act.id);
        if (!it || (it.r < 5 && dist(p.x, p.z, it.x, it.z) > it.r + 0.9)) p.act = null;
        else if ((p.act.p += dt / it.hold) >= 1) { const id = p.act.id; p.act = null; this.complete(p, id); if (s.phase !== 'play') return; }
      }
      // látás
      const dx = p.x - T.x, dz = p.z - T.z, d = Math.hypot(dx, dz);
      let seen = false;
      if (!T.hidden && T.range > 0 && d <= T.range && pg === tg) {
        seen = d < 0.5 || Math.acos(Math.max(-1, Math.min(1, (dx * dirX + dz * dirZ) / d))) <= T.fov / 2;
        if (seen && p.crouch && d > 1.2 && (COVER.some((b) => segHits(T.x, T.z, p.x, p.z, b)) || P.bushes.some((b) => dist(p.x, p.z, b.x, b.z) < b.r))) seen = false;
      }
      p.seen = seen;
      if (this.chase || this.mode === 'cut') { p.sus = Math.max(0, p.sus - dt); continue; }
      if (seen && pg) { this.startChase(p, 'garden'); continue; }
      // hiányzás: a tanár az üres padra néz
      if (!pg) p.missT = 0;
      else if (T.range > 5 && !tg) {
        const sp = seatPos(p.desk);
        const ex = sp.x - T.x, ez = sp.z - T.z, ed = Math.hypot(ex, ez);
        const look = ed < T.range && Math.acos(Math.max(-1, Math.min(1, (ex * dirX + ez * dirZ) / ed))) <= T.fov / 2;
        p.missT = look && (T.st === 'lecture' || T.st === 'walk' || T.st === 'roll') ? p.missT + dt : Math.max(0, p.missT - dt);
        if (p.missT > 3.5) { p.missT = 0; this.checkAbsent(p); continue; }
      }
      const pl2 = s.plant;
      const carrying = pl2 && pl2.carried === p.id && pl2.growth < 1; // a kész növényt már nyugodtan viheted
      const away = p.seated == null && dist(p.x, p.z, seatPos(p.desk).x, seatPos(p.desk).z) > 1.4;
      const strong = (p.act && !p.act.id.startsWith('sit')) || p.hot > 0 || p.inv.axe || carrying;
      // a helyén kívül járkáló diák csak magyarázás közben és a közelében gyanús (névsorolvasáskor szabad a helyére sietni)
      const weak = away && T.st === 'lecture' && !s.roll && d < 6;
      // padban ülve messziről nem látszik, mit csinálsz a kezeddel
      const rate = strong && !(p.seated != null && d > 8 && !carrying) ? 1 : weak ? 0.3 : 0;
      const mul = (p.watch > 0 ? 1.5 : 1) / (D.susFill * (1 - 0.08 * this.k()));
      if (seen && rate > 0 && p.immune <= 0) p.sus += dt * rate * mul;
      else p.sus = Math.max(0, p.sus - dt / 1.2);
      if (p.sus >= 1) { p.sus = 0; this.startChase(p, 'caught'); }
    }

    // a növény észrevétele
    if (pl && !pl.covered && !pl.carried && pl.growth > 0.08 && pl.desk >= 0 && !this.chase && this.mode === 'class' && !T.hidden && !this.tasks.some((t) => t.id === 'plant')) {
      const d = DESKS[pl.desk];
      const ex = d.x - T.x, ez = d.z - T.z, ed = Math.hypot(ex, ez);
      const lim = T.range > 5 ? D.plantSee + 0.5 * this.k() : T.range;
      if (ed < lim && Math.acos(Math.max(-1, Math.min(1, (ex * dirX + ez * dirZ) / ed))) <= T.fov / 2) {
        this.tasks.unshift({ id: 'plant', desk: pl.desk, rush: true });
        if (this.act && this.act.kind !== 'task') this.finishAct(this.act);
      }
    }
  }
}
