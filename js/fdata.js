// „Fizika – Napraforgó” mód: pálya (hosszabb terem + iskolakert), tárgyak, interakciók.
export const F_TIME = 900; // 15 perc
export const F_LIVES = 3;
export const EYE = 1.55;
export const PLAYER_R = 0.28;
export const ROOM = { x0: -5, x1: 5, z0: -8, z1: 8, h: 3.2 };
export const GARDEN = { x0: 5, x1: 16, z0: -1, z1: 11 };
export const DOOR = { x: 5, z: 6.2, half: 0.6 };
export const inGarden = (x) => x > ROOM.x1;

export const P = {
  board: { x: 0, y: 1.6, z: -7.94, w: 3.4, h: 1.7 },
  tdesk: { x: -2.8, z: -6.2, w: 1.8, d: 0.8 },
  tchair: { x: -2.8, z: -6.95 },
  lab: { x: 2.8, z: -6.3, w: 1.7, d: 0.7 }, // kísérleti asztal, rajta a Van de Graaff-generátor
  gen: { x: 3.3, y: 1.1, z: -6.3 },
  switch: { x: 4.95, y: 1.3, z: 4.6 },
  alarm: { x: 4.95, y: 1.4, z: 7.5 },
  windowsZ: [-5, -1.5, 2, 5.5],
  sill: (i) => ({ x: -4.78, y: 0.98, z: [-5, -1.5, 2, 5.5][i] }),
  // kert
  axe: { x: 13.0, y: 0.5, z: 2.9 },
  shed: { x0: 13.4, x1: 16, z0: -1, z1: 2.6 },
  bench: { x0: 9.2, x1: 10.8, z0: 0.0, z1: 0.5 },
  bed: { x0: 12.2, x1: 15.6, z0: 8.4, z1: 10.6 }, // napraforgó-ágyás
  stations: [
    { id: 'inga', name: 'Inga', x: 7.8, z: 1.6 },
    { id: 'emelo', name: 'Emelő', x: 11.6, z: 4.6 },
    { id: 'napora', name: 'Napóra', x: 8.4, z: 9.6 },
  ],
  bushes: [
    { x: 6.3, z: 3.4, r: 1.0 },
    { x: 9.9, z: 7.2, r: 1.0 },
    { x: 14.6, z: 5.6, r: 1.0 },
    { x: 6.4, z: 9.9, r: 0.9 },
  ],
  assembly: { x: 6.6, z: 6.2 }, // tűzriadó gyülekezőhely
};

export const DESK_COLS = [-2.8, 0, 2.8];
export const DESK_ROWS = [-3.4, -1.2, 1.0, 3.2, 5.4];
export const DESKS = [];
for (const z of DESK_ROWS) for (const x of DESK_COLS) DESKS.push({ x, z });
// ülőhely a pad mögött (a padtól +0.6-ra), arccal a tábla felé
export const seatPos = (d) => ({ x: DESKS[d].x, z: DESKS[d].z + 0.62 });
// a játékosok padjai (hátulról), a többin osztálytársak ülnek, három üres marad
export const PLAYER_DESKS = [13, 12, 14, 10];
export const EMPTY_DESKS = [11, 9, 5];
export const SNITCH_DESK = 7;

// a táskák tartalma (a padokon); a játékosok saját padján a „rossz táska” van
export function makeBags() {
  const desks = DESKS.map((_, i) => i).filter((i) => !PLAYER_DESKS.includes(i));
  const shuffled = desks.sort(() => Math.random() - 0.5);
  const contents = ['vase', 'bottle', 'ball', 'ball', 'phone', 'junk', 'junk', 'junk', 'junk', 'junk', 'junk'];
  return shuffled.map((d, i) => ({ desk: d, content: contents[i] || 'junk', searched: false }));
}
export const JUNK = ['Matekfüzet, üres', 'Egy szendvics, tegnapi', 'Telefontöltő, kábel nélkül', 'Fizikakönyv, bontatlan', 'Három radír', 'Egy fél banán', 'Kalkulátor, lemerült'];

export const ITEMS = {
  seeds: 'Napraforgómag', vase: 'Váza', can: 'Locsolókanna', bottle: 'Vizes palack', axe: 'Fejsze', ball: 'Papírgalacsin', phone: 'Telefon', plant: 'Napraforgó (cserépben)',
};

// ---- ütközés ----------------------------------------------------------------
export const OBS = [];
for (const d of DESKS) OBS.push({ x0: d.x - 0.6, x1: d.x + 0.6, z0: d.z - 0.3, z1: d.z + 0.3 });
OBS.push({ x0: P.tdesk.x - 0.9, x1: P.tdesk.x + 0.9, z0: P.tdesk.z - 0.4, z1: P.tdesk.z + 0.4 });
OBS.push({ x0: P.lab.x - 0.85, x1: P.lab.x + 0.85, z0: P.lab.z - 0.35, z1: P.lab.z + 0.35 });
OBS.push(P.shed, P.bench, P.bed);
for (const s of P.stations) OBS.push({ x0: s.x - 0.35, x1: s.x + 0.35, z0: s.z - 0.35, z1: s.z + 0.35 });
export const COVER = OBS.slice(0, DESKS.length + 2); // padok + tanári asztal + kísérleti asztal

function regions(r, locked) {
  const R = [
    { x0: ROOM.x0 + r, x1: ROOM.x1 - r, z0: ROOM.z0 + r, z1: ROOM.z1 - r },
    { x0: GARDEN.x0 + r, x1: GARDEN.x1 - r, z0: GARDEN.z0 + r, z1: GARDEN.z1 - r },
  ];
  if (!locked) R.push({ x0: ROOM.x1 - r - 0.05, x1: GARDEN.x0 + r + 0.05, z0: DOOR.z - DOOR.half + r, z1: DOOR.z + DOOR.half - r });
  return R;
}
const inside = (R, x, z) => R.some((b) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1);
export function walkable(x, z, r = PLAYER_R) { return inside(regions(r), x, z); }

export function collide(x, z, ox = x, oz = z, r = PLAYER_R) {
  for (let pass = 0; pass < 2; pass++) {
    for (const b of OBS) {
      if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) {
        const dx0 = x - (b.x0 - r), dx1 = b.x1 + r - x, dz0 = z - (b.z0 - r), dz1 = b.z1 + r - z;
        const m = Math.min(dx0, dx1, dz0, dz1);
        if (m === dx0) x = b.x0 - r; else if (m === dx1) x = b.x1 + r; else if (m === dz0) z = b.z0 - r; else z = b.z1 + r;
      }
    }
  }
  const R = regions(r);
  if (inside(R, x, z)) return [x, z];
  if (inside(R, x, oz)) return [x, oz];
  if (inside(R, ox, z)) return [ox, z];
  if (inside(R, ox, oz)) return [ox, oz];
  const b = inGarden(ox) ? R[1] : R[0];
  return [Math.max(b.x0, Math.min(b.x1, x)), Math.max(b.z0, Math.min(b.z1, z))];
}

// Fizika néni útkeresése
const TR = 0.4;
export const TOBS = [];
for (const d of DESKS) TOBS.push({ x0: d.x - 0.6 - TR, x1: d.x + 0.6 + TR, z0: d.z - 0.3 - TR, z1: d.z + 0.9 + TR });
for (const b of OBS.slice(DESKS.length)) TOBS.push({ x0: b.x0 - TR, x1: b.x1 + TR, z0: b.z0 - TR, z1: b.z1 + TR });
TOBS.push({ x0: 4.9, x1: 5.1, z0: -9, z1: DOOR.z - 0.5 }, { x0: 4.9, x1: 5.1, z0: DOOR.z + 0.5, z1: 12 });
export const AISLES = [-4.25, -1.4, 1.4, 4.25];
export const FRONT_Z = -4.7;
export const BACK_Z = 7.1;
export const NAV = [];
for (const x of AISLES) { NAV.push({ x, z: FRONT_Z }); NAV.push({ x, z: BACK_Z }); NAV.push({ x, z: 1.0 }); }
NAV.push({ x: -1.4, z: -6.9 }, { x: 4.4, z: DOOR.z }, { x: 5.7, z: DOOR.z });
NAV.push({ x: 8, z: 6 }, { x: 11.3, z: 6.6 }, { x: 8.6, z: 3.3 }, { x: 12, z: 2.4 }, { x: 15.2, z: 4 }, { x: 11, z: 9.6 }, { x: 7.2, z: 7.8 });

// a napsugár sávja a padokon: hátulról előre vándorol az óra alatt (sun: 0..1)
export function sunAt(sun, x, z) {
  const beamZ = 7 - sun * 14;
  const along = Math.max(0, 1 - Math.abs(z - beamZ) / 4.2);
  const side = x < -1 ? 1 : x < 1.5 ? 0.7 : 0.45;
  return Math.max(0.2, along * side);
}

// ---- interakciók --------------------------------------------------------------
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
export function interactions(s, p) {
  const out = [];
  const add = (id, label, pos, hold, r = 1.4) => out.push({ id, label, x: pos.x, y: pos.y ?? 1, z: pos.z, hold, r });
  if (!s.players || p.down > 0 || s.phase !== 'play') return out;
  const inv = p.inv || {};
  const pl = s.plant;
  const cd = s.cd || {};
  if (p.seated != null) {
    const d = p.seated, dp = { x: DESKS[d].x, y: 0.85, z: DESKS[d].z };
    if (!pl && inv.vase && inv.seeds >= s.needSeeds) add('plant', 'Elültetés', dp, 1.5, 9);
    if (pl && pl.desk === d) {
      if (inv.can > 0 && pl.water < 0.85) add('water', 'Öntözés', dp, 1.0, 9);
      if (!pl.carried) add('pick', 'Váza felvétele', dp, 0.6, 9);
    }
    const v = p.vices || {};
    if (!v.cigi) add('cigi', 'Cigi (a táskából)', dp, 0.8, 9);
    if (!v.vape) add('vape', 'Vape (a táskából)', dp, 0.8, 9);
    if (!v.beer) add('beer', 'Sör (a táskából)', dp, 0.6, 9);
    return out;
  }
  if (inGarden(p.x)) {
    P.stations.forEach((st, i) => { if (!((cd['st' + i] || 0) > 0)) add('st:' + i, `${st.name}-kísérlet`, { x: st.x, y: 1, z: st.z }, 0.3, 1.5); });
    if (!s.axeTaken) add('axe', 'Fejsze felvétele', P.axe, 0.6, 1.5);
    return out;
  }
  // terem
  DESKS.forEach((d, i) => {
    const sp = seatPos(i);
    const free = !s.npcDesks.includes(i) && !Object.values(s.players).some((q) => q !== p && q.seated === i);
    if (free && dist(p.x, p.z, sp.x, sp.z) < 1.0) add('sit:' + i, 'Leülés', { x: sp.x, y: 0.8, z: sp.z }, 0.3, 1.0);
    if (pl && pl.carried === p.id && free && !(pl.desk === i)) add('place:' + i, 'Váza letétele ide', { x: d.x, y: 0.85, z: d.z }, 0.6, 1.2);
  });
  for (let i = 0; i < s.bags.length; i++) {
    const b = s.bags[i];
    if (b.searched) continue;
    const d = DESKS[b.desk];
    add('bag:' + i, 'Táska átkutatása', { x: d.x + 0.45, y: 0.5, z: d.z + 0.35 }, 2.2, 1.2);
  }
  if (!inv.hasCan && s.canSill != null && !s.canTaken) add('can', 'Locsolókanna felvétele', P.sill(s.canSill), 0.5, 1.4);
  if (inv.hasCan && inv.bottle > 0 && inv.can < 3) add('fill', 'Víz a kannába a palackból', { x: p.x, y: 1, z: p.z }, 1.8, 9);
  if (inv.axe && !s.boardBroken) add('smash', 'Okostábla betörése', { x: P.board.x, y: 1.2, z: P.board.z + 0.6 }, 1.5, 1.8);
  if (!(cd.gen > 0)) add('gen', 'Generátor bekapcsolása', P.gen, 1.0, 1.5);
  if (s.lights && !(cd.switch > 0)) add('switch', 'Villany lekapcsolása', P.switch, 0.5, 1.4);
  if (!s.alarmUsed) add('alarm', 'Tűzjelző benyomása', P.alarm, 1.5, 1.4);
  const T = s.teacher;
  if (pl && pl.carried === p.id && pl.growth >= 1 && !T.hidden && dist(p.x, p.z, T.x, T.z) < 2.2) add('deliver', 'Napraforgó átadása Fizika néninek', { x: T.x, y: 1.2, z: T.z }, 0.6, 2.4);
  return out;
}

// felelés-szerű kérdések nincsenek, helyette kísérlet-minijátékok (js/minigames.js)
