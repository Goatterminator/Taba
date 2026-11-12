// Közös adatok: a terem elrendezése, tárgyak, interakciók.
// Ezt a fájlt a szimuláció (host) és a kliens is használja.

export const ROUND_TIME = 300; // 5 perces óra
export const METER_MAX = 100;
export const MAX_STRIKES = 3;
export const EYE = 1.55;
export const PLAYER_R = 0.28;
export const ROOM = { x0: -5, x1: 5, z0: -6, z1: 6, h: 3.2 };

// Irány-konvenció: yaw = 0 -> +z felé néz (az osztály felé), irány = (sin yaw, cos yaw)
export const P = {
  switch: { x: 4.95, y: 1.3, z: -3.3 },
  door: { x: 5, z: -4.6 },
  outlet: { x: 4.55, y: 0.35, z: -5.95 },
  board: { x: -0.8, y: 1.55, z: -5.94, w: 3.6, h: 1.3 },
  screen: { x: 3.0, y: 1.75, z: -5.9, w: 2.3, h: 1.5 },
  projector: { x: 3.0, y: 2.72, z: -3.4 },
  tdesk: { x: -3.6, z: -4.0, w: 1.8, d: 0.8, h: 0.78 },
  chair: { x: -3.6, y: 0.5, z: -4.85 },
  laptop: { x: -3.6, y: 0.8, z: -4.05 },
  window: { x: -4.95, y: 1.5, z: 0 },
  windowsZ: [-2.6, 0, 2.6],
  bin: { x: 4.45, y: 0.4, z: 5.35 },
  lockers: [
    { x: -2.6, y: 1.0, z: 5.62 },
    { x: -1.8, y: 1.0, z: 5.62 },
    { x: -1.0, y: 1.0, z: 5.62 },
  ],
  shelf: { x: 1.0, z: 5.72 },
  globe: { x: 1.0, y: 1.58, z: 5.7 },
  fuse: { x: 2.6, y: 1.45, z: 5.95 },
  clock: { x: -0.8, y: 2.74, z: -5.93 },
  plant: { x: -4.4, y: 0.8, z: 5.3 },
  chalkTray: { x: -0.1, y: 0.93, z: -5.84 },
};

export const DESK_COLS = [-2.6, 0, 2.6];
export const DESK_ROWS = [-1.8, -0.1, 1.6, 3.3];
export const DESKS = [];
for (const z of DESK_ROWS) for (const x of DESK_COLS) DESKS.push({ x, z });

// Ülőhelyek (hátulról előre töltjük fel)
export const SEATS = [];
for (const z of [3.3, 1.6, -0.1]) for (const x of [0, -2.6, 2.6]) SEATS.push({ x, z: z + 0.8, yaw: Math.PI });

export const PLAYER_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xe67e22, 0x1abc9c, 0xff6fb1, 0x95a5a6];

// Játékos-ütközés dobozai
export const OBS = [];
for (const d of DESKS) OBS.push({ x0: d.x - 0.6, x1: d.x + 0.6, z0: d.z - 0.3, z1: d.z + 0.3 });
OBS.push({ x0: P.tdesk.x - 0.9, x1: P.tdesk.x + 0.9, z0: P.tdesk.z - 0.4, z1: P.tdesk.z + 0.4 });
OBS.push({ x0: -3.0, x1: -0.6, z0: 5.37, z1: 6 }); // szekrények
OBS.push({ x0: 0.4, x1: 1.6, z0: 5.5, z1: 6 }); // polc
OBS.push({ x0: -4.65, x1: -4.15, z0: 5.05, z1: 5.55 }); // növény
OBS.push({ x0: 4.25, x1: 4.65, z0: 5.15, z1: 5.55 }); // kuka

// Taba útkeresésének akadályai (felfújva) és csomópontjai
const TR = 0.35;
export const TOBS = [];
for (const d of DESKS) TOBS.push({ x0: d.x - 0.6 - TR, x1: d.x + 0.6 + TR, z0: d.z - 0.3 - TR, z1: d.z + 0.75 + TR });
TOBS.push({ x0: P.tdesk.x - 0.9 - TR, x1: P.tdesk.x + 0.9 + TR, z0: P.tdesk.z - 0.4 - TR, z1: P.tdesk.z + 0.4 + TR });
TOBS.push({ x0: -3.0 - TR, x1: -0.6 + TR, z0: 5.37 - TR, z1: 6 });
TOBS.push({ x0: 0.4 - TR, x1: 1.6 + TR, z0: 5.5 - TR, z1: 6 });

export const AISLES = [-4.1, -1.3, 1.3, 4.1];
export const FRONT_Z = -3.0;
export const BACK_Z = 4.75;
export const NAV = [];
for (const x of AISLES) { NAV.push({ x, z: FRONT_Z }); NAV.push({ x, z: BACK_Z }); }
NAV.push({ x: -2.2, z: -4.9 }); // a tanári szék megközelítése

export const ITEMS = {
  laptop: { name: 'Taba laptopja', icon: '💻', hint: 'Rejtsd el: kuka, szekrény, vagy ki az ablakon!', contraband: true },
  ak: { name: 'Szivacslövő AK', icon: '🔫', hint: 'Lődd szét a termet – de Tabát NE találd el!', contraband: true, use: 'LŐ' },
  remote: { name: 'Távirányító', icon: '📺', hint: 'Kapcsold át a kivetítőt', use: 'KAPCS' },
  chalk: { name: 'Kréta', icon: '🖍️', hint: 'Firkálj vele a táblára' },
  cushion: { name: 'Pukipárna', icon: '🎈', hint: 'Tedd Taba székére' },
  glue: { name: 'Pillanatragasztó', icon: '🧴', hint: 'Kend Taba székére' },
  stink: { name: 'Bűzbomba', icon: '🧪', hint: 'Dobd Taba közelébe', use: 'DOB' },
  phone: { name: 'Csörgő telefon', icon: '📱', hint: 'Tedd le valahol – elcsalja Tabát', use: 'LETESZ' },
  plane: { name: 'Papírrepülő', icon: '✈️', hint: 'Dobd meg vele Tabát', use: 'DOB' },
};

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Tárgyak véletlenszerű elhelyezése az óra elején
export function makeItems() {
  const items = [];
  const add = (type, x, y, z, extra) => items.push({ id: items.length, type, x, y, z, held: null, gone: false, ...extra });
  add('laptop', P.laptop.x, P.laptop.y, P.laptop.z);
  add('chalk', P.chalkTray.x, P.chalkTray.y, P.chalkTray.z, { home: true });

  const pool = shuffle(['stink', 'glue', 'remote', 'cushion', 'phone']);
  const lockerTypes = shuffle(['ak', pool.pop(), pool.pop()]);
  lockerTypes.forEach((t, i) => {
    const L = P.lockers[i];
    add(t, L.x, 0.95, L.z + 0.05, { loc: 'L' + i, ...(t === 'ak' ? { ammo: 6 } : {}), ...(t === 'remote' ? { ammo: 3 } : {}) });
  });

  const deskSpots = shuffle(DESKS.map((d) => ({ x: d.x + (Math.random() - 0.5) * 0.6, y: 0.8, z: d.z })));
  const spots = shuffle([
    { x: 0.55, y: 1.36, z: 5.7 },
    { x: 1.42, y: 1.36, z: 5.7 },
    { x: -4.82, y: 1.0, z: 2.6 },
    { x: -4.82, y: 1.0, z: -2.6 },
    { x: 4.5, y: 0.06, z: 0.8 },
    deskSpots.pop(),
    deskSpots.pop(),
  ]);
  for (const t of [...pool, 'stink']) {
    const s = spots.pop();
    add(t, s.x, s.y, s.z, t === 'remote' ? { ammo: 3 } : {});
  }
  for (let i = 0; i < 3; i++) {
    const s = deskSpots.pop();
    add('plane', s.x, s.y, s.z);
  }
  return items;
}

// A kivetítő tényleges állapota (áram + kábel figyelembevételével)
export function projState(s) {
  if (s.proj === 'broken') return 'broken';
  if (!s.power || !s.plug) return 'off';
  return s.proj;
}
export const isDark = (s) => !s.lights || !s.power;

// Milyen akciókat tud most elvégezni a játékos? (kliens: felirat; host: ellenőrzés)
export function interactions(s, p) {
  const out = [];
  const held = p.held != null ? s.items[p.held] : null;
  const ht = held ? held.type : null;
  const cd = s.cd || {};
  const add = (id, label, pos, hold, r = 1.6) => out.push({ id, label, x: pos.x, y: pos.y ?? 1, z: pos.z, hold, r });

  if (s.lights && s.power && !(cd.switch > 0)) add('switch', 'Villany lekapcsolása', P.switch, 0.5);
  if (s.power && !(cd.fuse > 0)) add('fuse', 'Biztosíték lecsapása', P.fuse, 3.2);
  if (s.plug && s.proj !== 'broken' && !(cd.outlet > 0)) add('outlet', 'Projektor kihúzása', P.outlet, 2.2);
  if (!s.doodle && !(cd.board > 0)) {
    if (ht === 'chalk') add('doodle', 'Firkálás a táblára', P.board, 3, 2.3);
    else if (s.board > 0.25) add('wipe', 'Tábla letörlése', P.board, 2.4, 2.3);
  }
  if (ht === 'laptop' && s.win) add('throwlap', 'Laptop ki az ablakon!', P.window, 1.0);
  else if (!s.win && !(cd.window > 0)) add('window', 'Ablak kinyitása', P.window, 1.2);
  if (ht === 'laptop') add('bin', 'Laptop a kukába', P.bin, 1.0);
  P.lockers.forEach((L, i) => {
    if (!s.lockers[i]) add('locker:' + i, 'Szekrény kinyitása', L, 0.7, 1.5);
    else if (ht === 'laptop') add('lockhide:' + i, 'Laptop a szekrénybe', L, 1.0, 1.5);
  });
  if ((ht === 'cushion' || ht === 'glue') && !s.chairTrap && !s.taba.sit) {
    add('chair', ht === 'cushion' ? 'Pukipárna a székre' : 'Ragasztó a székre', P.chair, 1.6);
  }
  for (const it of s.items) {
    if (it.gone || it.held != null || it.placed) continue;
    if (it.loc && !s.lockers[+it.loc[1]]) continue;
    if (it.type === 'laptop' && s.laptop === 'desk' && s.taba.sit) continue;
    add('item:' + it.id, 'Felvesz: ' + ITEMS[it.type].name, it, it.type === 'laptop' ? 1.2 : 0.25, 1.5);
  }
  return out;
}

export function collide(x, z, r = PLAYER_R) {
  for (let pass = 0; pass < 2; pass++) {
    for (const b of OBS) {
      if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) {
        const dx0 = x - (b.x0 - r), dx1 = b.x1 + r - x, dz0 = z - (b.z0 - r), dz1 = b.z1 + r - z;
        const m = Math.min(dx0, dx1, dz0, dz1);
        if (m === dx0) x = b.x0 - r; else if (m === dx1) x = b.x1 + r; else if (m === dz0) z = b.z0 - r; else z = b.z1 + r;
      }
    }
  }
  x = Math.max(ROOM.x0 + r, Math.min(ROOM.x1 - r, x));
  z = Math.max(ROOM.z0 + r, Math.min(ROOM.z1 - r, z));
  return [x, z];
}
