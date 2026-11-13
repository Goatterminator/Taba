// „Fizika – Napraforgó” pálya 3D-ben. Ugyanazt a renderert használja, mint a Taba-pálya.
import * as THREE from '../vendor/three.module.min.js';
import { makeHuman, poseHuman, makeItem, studentLook, box, put, mat, canvasTex, makeChair, NPC_LOOKS, NPC_IDLE, lerpAngle } from './world.js';
import { ROOM, GARDEN, DOOR, P, DESKS, seatPos, EYE, PLAYER_DESKS, inGarden, sunAt } from './fdata.js';

const PI = Math.PI;
const TEACHER_LOOK = { skin: 0xe9c4a6, hair: 0xa8a29e, shirt: 0x6d2846, sleeve: 0x6d2846, pants: 0x3f3f46, glasses: true, hand: true };
const BOARD_TEXT = 'A napraforgó a nappal ellentétesen forog!';
const BOARD_FIX = 'A napraforgó a nappal EGY IRÁNYBA forog.';

function makeTeacher() {
  const t = makeHuman(TEACHER_LOOK);
  const { body, head, arms } = t.userData;
  put(head, new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mat(0xa8a29e)), 0, 0.08, -0.2); // konty
  put(body, box(0.48, 0.45, 0.34, 0x3f3f46), 0, 0.62, 0); // szoknya
  // fakanál a jobb kézben
  const spoon = put(arms[1], new THREE.Group(), 0, -0.62, 0.04);
  put(spoon, new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.55, 8), mat(0xb7804a)), 0, -0.2, 0.05).rotation.x = 1.2;
  const bowl = put(spoon, new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mat(0xc58d55)), 0, -0.32, 0.31);
  bowl.scale.set(1, 0.4, 1.4);
  spoon.visible = false;
  // rakétavető a vállon
  const rl = put(body, new THREE.Group(), 0.3, 1.5, 0.05);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 12), mat(0x3f4a2e));
  tube.rotation.x = PI / 2; rl.add(tube);
  put(rl, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.12, 12), mat(0x2d3520)), 0, 0, 0.52).rotation.x = PI / 2;
  put(rl, box(0.05, 0.16, 0.06, 0x222222), 0, -0.12, 0.1);
  rl.visible = false;
  t.userData.spoon = spoon; t.userData.rl = rl;
  return t;
}

function makePlant() {
  const g = new THREE.Group();
  put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.18, 14), mat(0xb5562e)), 0, 0.09, 0);
  put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 14), mat(0x4a3320)), 0, 0.175, 0);
  const stem = put(g, new THREE.Group(), 0, 0.18, 0);
  const st = put(stem, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 1, 8), mat(0x4d7c2f)), 0, 0.5, 0);
  const leaves = [];
  for (let i = 0; i < 4; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(0x5f9e3a));
    l.scale.set(1.2, 0.18, 0.6);
    l.position.set(i % 2 ? 0.07 : -0.07, 0.25 + i * 0.2, 0);
    l.rotation.z = i % 2 ? -0.5 : 0.5;
    stem.add(l); leaves.push(l);
  }
  const head = put(stem, new THREE.Group(), 0, 1, 0);
  const petals = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16), mat(0xf5c518));
  petals.rotation.x = PI / 2; head.add(petals);
  put(head, new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 16), mat(0x5b3a1a)), 0, 0, 0.012).rotation.x = PI / 2;
  g.userData = { stem, st, head, leaves };
  return g;
}
function growPlant(g, growth, sunYaw) {
  const u = g.userData, h = 0.12 + growth * 1.0;
  u.st.scale.y = h; u.st.position.y = h / 2;
  u.head.position.y = h;
  u.head.visible = growth > 0.45;
  u.head.scale.setScalar(Math.min(1, (growth - 0.45) / 0.4) || 0.01);
  u.leaves.forEach((l, i) => { l.visible = growth > 0.08 + i * 0.12; l.position.y = Math.min(h - 0.05, 0.12 + i * 0.2 * (h / 1.1)); });
  u.head.rotation.y = sunYaw;
  u.head.rotation.x = -0.35;
}

function makeThing(type) {
  const g = new THREE.Group();
  if (type === 'vase') {
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.18, 14), mat(0xb5562e)), 0, 0.09, 0);
  } else if (type === 'can') {
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.2, 12), mat(0x2f855a)), 0, 0.1, 0);
    const sp = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.26, 8), mat(0x276749)), 0.13, 0.17, 0);
    sp.rotation.z = -1.0;
    const hd = put(g, new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 12, PI), mat(0x276749)), -0.03, 0.2, 0);
    hd.rotation.y = PI / 2;
  } else if (type === 'axe') {
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.75, 8), mat(0x8b5a2b)), 0, 0.37, 0);
    put(g, box(0.02, 0.12, 0.16, 0x9ca3af), 0, 0.68, 0.07);
  } else if (type === 'ball') {
    put(g, new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), mat(0xf5f5f4)), 0, 0.05, 0);
  } else if (type === 'beer') {
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 14), mat(0xc0c4c9)), 0, 0.06, 0);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.0335, 0.0335, 0.06, 14), mat(0x1f6f3f)), 0, 0.06, 0);
  } else return makeItem(type);
  return g;
}

export class FWorld {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9dc9ee);
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 90);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x8a7a60, 1.35);
    this.sunLight = new THREE.DirectionalLight(0xfff0cc, 1.3);
    this.scene.add(this.hemi, this.sunLight, this.sunLight.target);
    this.fx = []; this.avatars = new Map(); this.keys = {}; this.v = new THREE.Vector3();
    this.zoom = 1; this.zoomCur = 1; this.shakeA = 0; this.vmKick = 0;
    this.npcMood = null; this.npcMoodT = 0;
    this.beerT = -1; this.drunk = 0;
    this.buildRoom();
    this.buildGarden();
    this.taba = makeTeacher();
    this.scene.add(this.taba);
    this.tabaYaw = PI;
    this.coneMat = new THREE.MeshBasicMaterial({ color: 0x35d07f, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
    this.cone = new THREE.Mesh(new THREE.BufferGeometry(), this.coneMat);
    this.cone.position.y = 0.025; this.scene.add(this.cone);
    this.coneFov = -1; this.coneRange = 0;
    this.plant = makePlant(); this.plant.visible = false; this.scene.add(this.plant);
    this.vm = new THREE.Group(); this.vm.position.set(0.26, -0.26, -0.5); this.camera.add(this.vm); this.vmType = null;
    this.rockets = new Map();
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.baseFov = w < h ? 88 : 68;
    this.camera.aspect = w / h;
    this.camera.fov = this.baseFov / (this.zoomCur || 1);
    this.camera.updateProjectionMatrix();
    this.w = w; this.h = h;
  }

  // ---- terem ----------------------------------------------------------
  buildRoom() {
    const S = this.scene, H = ROOM.h, W = ROOM.x1 - ROOM.x0, D = ROOM.z1 - ROOM.z0;
    const floorTex = canvasTex(128, 128, (g) => {
      g.fillStyle = '#b9b3a8'; g.fillRect(0, 0, 128, 128);
      g.fillStyle = '#aaa398';
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2) g.fillRect(x * 32, y * 32, 32, 32);
    });
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(W / 1.2, D / 1.2);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ map: floorTex }));
    fl.rotation.x = -PI / 2; S.add(fl);
    const ce = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat(0xf4f4f0)); ce.rotation.x = PI / 2; ce.position.y = H; S.add(ce);
    const wallC = 0xe7e5df, lowC = 0x7c9fb5;
    const plane = (w, h, x, y, z, ry, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(c)); m.position.set(x, y, z); m.rotation.y = ry; S.add(m); return m; };
    const wallZ = (z, ry) => { plane(W, H, 0, H / 2, z, ry, wallC); plane(W, 0.9, 0, 0.45, z + (ry === 0 ? 0.004 : -0.004), ry, lowC); };
    wallZ(ROOM.z0, 0); wallZ(ROOM.z1, PI);
    // bal fal ablakokkal (alul és felül fal, köztük üveg)
    plane(D, 0.95, ROOM.x0, 0.475, 0, PI / 2, lowC);
    plane(D, H - 2.55, ROOM.x0, (H + 2.55) / 2, 0, PI / 2, wallC);
    const wz = P.windowsZ;
    let prev = ROOM.z0;
    for (const z of [...wz, ROOM.z1 + 0.85]) {
      const a = prev, b = z - 0.85;
      if (b > a) plane(b - a, 1.6, ROOM.x0, 1.75, (a + b) / 2, PI / 2, wallC);
      prev = z + 0.85;
    }
    for (const z of wz) {
      put(S, box(0.2, 0.06, 1.75, 0xe2e0d8), ROOM.x0 + 0.1, 0.96, z);
      put(S, box(0.06, 1.6, 0.06, 0xf5f5f4), ROOM.x0 + 0.02, 1.75, z);
      put(S, box(0.06, 0.06, 1.7, 0xf5f5f4), ROOM.x0 + 0.02, 2.55, z);
    }
    // jobb fal: ajtó a kertbe
    const dz0 = DOOR.z - DOOR.half, dz1 = DOOR.z + DOOR.half;
    plane(dz0 - ROOM.z0, H, ROOM.x1, H / 2, (ROOM.z0 + dz0) / 2, -PI / 2, wallC);
    plane(ROOM.z1 - dz1, H, ROOM.x1, H / 2, (dz1 + ROOM.z1) / 2, -PI / 2, wallC);
    plane(dz1 - dz0, H - 2.25, ROOM.x1, 2.25 + (H - 2.25) / 2, DOOR.z, -PI / 2, wallC);
    plane(dz0 - ROOM.z0, 0.9, ROOM.x1 - 0.004, 0.45, (ROOM.z0 + dz0) / 2, -PI / 2, lowC);
    plane(ROOM.z1 - dz1, 0.9, ROOM.x1 - 0.004, 0.45, (dz1 + ROOM.z1) / 2, -PI / 2, lowC);
    this.door = put(S, new THREE.Group(), ROOM.x1, 0, dz1);
    put(this.door, box(0.05, 2.2, 2 * DOOR.half, 0x6b4f35), 0, 1.1, -DOOR.half);
    put(this.door, box(0.14, 0.05, 0.12, 0xd4d4d8), 0, 1.05, -2 * DOOR.half + 0.14);
    this.doorOpen = 0;
    // lámpák
    this.lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const x of [-2.3, 2.3]) for (const z of [-5, 0, 5]) put(S, new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.04, 0.3), this.lampMat), x, H - 0.03, z);
    // okostábla
    const b = P.board;
    put(S, box(b.w + 0.12, b.h + 0.12, 0.06, 0x1f2937), b.x, b.y, ROOM.z0 + 0.03);
    this.boardTex = canvasTex(1024, 512, () => {});
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(b.w, b.h), new THREE.MeshBasicMaterial({ map: this.boardTex }));
    bm.position.set(b.x, b.y, ROOM.z0 + 0.065); S.add(bm);
    put(S, box(0.5, 0.06, 0.12, 0x374151), b.x + 1.5, b.y - b.h / 2 - 0.05, ROOM.z0 + 0.09);
    // tanári asztal, kísérleti asztal, generátor
    const td = P.tdesk;
    put(S, box(td.w, 0.05, td.d, 0x8b6b4a), td.x, 0.78, td.z);
    put(S, box(td.w - 0.1, 0.7, 0.04, 0x7a5c3e), td.x, 0.4, td.z + td.d / 2 - 0.05);
    put(S, makeChair(), P.tchair.x, 0, P.tchair.z);
    const lb = P.lab;
    put(S, box(lb.w, 0.06, lb.d, 0x1f2937), lb.x, 0.9, lb.z);
    for (const sx of [-1, 1]) put(S, box(0.06, 0.88, lb.d - 0.1, 0x374151), lb.x + sx * (lb.w / 2 - 0.06), 0.44, lb.z);
    put(S, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.45, 10), mat(0x9ca3af)), P.gen.x, 1.15, P.gen.z);
    this.genBall = put(S, new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshLambertMaterial({ color: 0xd1d5db, emissive: 0x000000 })), P.gen.x, 1.47, P.gen.z);
    put(S, new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 4), mat(0x6b7280)), P.lab.x - 0.4, 1.2, P.lab.z).rotation.z = 0.2; // inga-állvány
    // padok, székek, táskák
    this.bagMeshes = new Map();
    DESKS.forEach((d, i) => {
      put(S, box(1.2, 0.04, 0.6, 0xd6c3a0), d.x, 0.75, d.z);
      for (const sx of [-0.55, 0.55]) put(S, box(0.04, 0.73, 0.5, 0x52525b), d.x + sx, 0.365, d.z);
      const ch = put(S, new THREE.Group(), d.x, 0, d.z + 0.55);
      put(ch, box(0.42, 0.04, 0.4, 0x2f5d8a), 0, 0.45, 0);
      put(ch, box(0.42, 0.36, 0.04, 0x2f5d8a), 0, 0.72, 0.2);
      for (const sx of [-0.18, 0.18]) put(ch, box(0.03, 0.45, 0.03, 0x52525b), sx, 0.225, 0);
      const bag = put(S, new THREE.Group(), d.x + 0.45, 0, d.z + 0.38);
      put(bag, box(0.3, 0.32, 0.16, PLAYER_DESKS.includes(i) ? 0x111827 : [0x7f1d1d, 0x1e3a8a, 0x14532d, 0x4b5563][i % 4]), 0, 0.16, 0);
      const flap = put(bag, box(0.31, 0.04, 0.17, 0x0f172a), 0, 0.33, 0);
      bag.userData.flap = flap;
      this.bagMeshes.set(i, bag);
    });
    // ablakpárkányon kanna és cserepes virágok (díszlet)
    this.can = put(S, makeThing('can'), 0, 0, 0);
    for (let i = 0; i < 4; i++) {
      const pot = put(S, new THREE.Group(), ROOM.x0 + 0.12, 0.99, P.windowsZ[i] + 0.55);
      put(pot, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.12, 10), mat(0xb5562e)), 0, 0.06, 0);
      put(pot, new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(0x4d7c2f)), 0, 0.18, 0);
    }
    // kapcsoló, tűzjelző, óra, polc
    put(S, box(0.02, 0.16, 0.12, 0xffffff), ROOM.x1 - 0.01, P.switch.y, P.switch.z);
    put(S, box(0.06, 0.2, 0.2, 0xb91c1c), ROOM.x1 - 0.03, P.alarm.y, P.alarm.z);
    this.alarmLight = put(S, new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0x551111 })), ROOM.x1 - 0.06, 2.6, P.alarm.z);
    const sh = put(S, new THREE.Group(), -2.5, 0, ROOM.z1 - 0.25);
    for (const y of [0.05, 0.6, 1.15, 1.7]) put(sh, box(2.2, 0.04, 0.4, 0x8f6238), 0, y, 0);
    for (let i = 0; i < 14; i++) put(sh, box(0.1, 0.3, 0.26, [0x7f1d1d, 0x1e3a8a, 0x14532d, 0xa16207][i % 4]), -1 + i * 0.15, 0.22 + 0.55 * (i % 3), 0);
    // napfoltok a padlón
    this.sunPatches = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.5), new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.0, depthWrite: false }));
      m.rotation.x = -PI / 2; m.position.y = 0.012; S.add(m); this.sunPatches.push(m);
    }
    this.npcs = []; this.npcKey = '';
    this.smokeMeshes = []; this.pingMeshes = [];
    this.phoneMesh = put(S, makeItem('phone'), 0, 0.02, 0); this.phoneMesh.visible = false;
  }

  // ---- kert -----------------------------------------------------------
  buildGarden() {
    const S = this.scene;
    const grass = canvasTex(64, 64, (g) => { g.fillStyle = '#5f9e3a'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#558f34'; for (let i = 0; i < 60; i++) g.fillRect((i * 37) % 64, (i * 23) % 64, 3, 6); });
    grass.wrapS = grass.wrapT = THREE.RepeatWrapping; grass.repeat.set(24, 24);
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshLambertMaterial({ map: grass }));
    gr.rotation.x = -PI / 2; gr.position.set(10, -0.01, 2); S.add(gr);
    // az épület külső fala
    const ext = 0xd6cfc2;
    const dz0 = DOOR.z - DOOR.half, dz1 = DOOR.z + DOOR.half, H = ROOM.h;
    const pl = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(ext)); m.position.set(x, y, z); m.rotation.y = ry; S.add(m); };
    pl(dz0 + 9, H + 1, ROOM.x1 + 0.01, (H + 1) / 2, (dz0 - 9) / 2, PI / 2);
    pl(14 - dz1, H + 1, ROOM.x1 + 0.01, (H + 1) / 2, (dz1 + 14) / 2, PI / 2);
    pl(dz1 - dz0, H + 1 - 2.25, ROOM.x1 + 0.01, 2.25 + (H + 1 - 2.25) / 2, DOOR.z, PI / 2);
    // kerítés
    const fence = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 0.5);
      for (let i = 0; i <= n; i++) put(S, box(0.08, 1.1, 0.08, 0xe7e5e4), x0 + ((x1 - x0) * i) / n, 0.55, z0 + ((z1 - z0) * i) / n);
      const r = put(S, box(len, 0.06, 0.04, 0xe7e5e4), (x0 + x1) / 2, 0.85, (z0 + z1) / 2); r.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    };
    fence(GARDEN.x0, GARDEN.z0, GARDEN.x1, GARDEN.z0); fence(GARDEN.x1, GARDEN.z0, GARDEN.x1, GARDEN.z1); fence(GARDEN.x0, GARDEN.z1, GARDEN.x1, GARDEN.z1);
    // fészer
    const sh = P.shed;
    put(S, box(sh.x1 - sh.x0, 2.2, sh.z1 - sh.z0, 0x7c5a3c), (sh.x0 + sh.x1) / 2, 1.1, (sh.z0 + sh.z1) / 2);
    const roof = put(S, box(sh.x1 - sh.x0 + 0.4, 0.1, sh.z1 - sh.z0 + 0.4, 0x3f3f46), (sh.x0 + sh.x1) / 2, 2.3, (sh.z0 + sh.z1) / 2); roof.rotation.x = 0.08;
    put(S, box(0.9, 1.8, 0.04, 0x5b3f28), (sh.x0 + sh.x1) / 2, 0.9, sh.z1 + 0.02);
    this.axe = put(S, makeThing('axe'), P.axe.x, 0, P.axe.z); this.axe.rotation.z = 0.25;
    // pad, ágyás napraforgókkal
    const bn = P.bench;
    put(S, box(bn.x1 - bn.x0, 0.06, bn.z1 - bn.z0, 0x8b5a2b), (bn.x0 + bn.x1) / 2, 0.45, (bn.z0 + bn.z1) / 2);
    for (const sx of [bn.x0 + 0.1, bn.x1 - 0.1]) put(S, box(0.06, 0.45, 0.4, 0x3f3f46), sx, 0.22, (bn.z0 + bn.z1) / 2);
    const bd = P.bed;
    put(S, box(bd.x1 - bd.x0, 0.2, bd.z1 - bd.z0, 0x4a3320), (bd.x0 + bd.x1) / 2, 0.1, (bd.z0 + bd.z1) / 2);
    this.bedFlowers = [];
    for (let i = 0; i < 10; i++) {
      const f = makePlant();
      f.children[0].visible = false; f.children[1].visible = false;
      f.scale.setScalar(1.5);
      f.position.set(bd.x0 + 0.35 + (i % 5) * 0.7, 0.2, bd.z0 + 0.5 + Math.floor(i / 5) * 1.0);
      S.add(f); this.bedFlowers.push(f);
    }
    // bokrok
    for (const b of P.bushes) {
      const g = put(S, new THREE.Group(), b.x, 0, b.z);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; put(g, new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), mat(0x3d7a32)), Math.cos(a) * b.r * 0.5, 0.45 + (i % 2) * 0.25, Math.sin(a) * b.r * 0.5); }
    }
    // kísérleti állomások
    this.stations = P.stations.map((st) => {
      const g = put(S, new THREE.Group(), st.x, 0, st.z);
      put(g, box(0.6, 0.8, 0.6, 0x6b7280), 0, 0.4, 0);
      if (st.id === 'inga') {
        for (const sx of [-0.3, 0.3]) put(g, box(0.05, 1.4, 0.05, 0x374151), sx, 1.5, 0);
        put(g, box(0.65, 0.05, 0.05, 0x374151), 0, 2.2, 0);
        const pv = put(g, new THREE.Group(), 0, 2.2, 0);
        put(pv, new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.0, 4), mat(0x111111)), 0, -0.5, 0);
        put(pv, new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), mat(0xb45309)), 0, -1.0, 0);
        g.userData.pv = pv;
      } else if (st.id === 'emelo') {
        put(g, new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 3), mat(0x374151)), 0, 0.9, 0);
        const lv = put(g, new THREE.Group(), 0, 1.0, 0);
        put(lv, box(1.4, 0.04, 0.14, 0x8b5a2b), 0, 0, 0);
        put(lv, box(0.16, 0.16, 0.14, 0x1f2937), -0.55, 0.1, 0);
        g.userData.lv = lv;
      } else {
        put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 20), mat(0xd6d3d1)), 0, 0.82, 0);
        const gn = put(g, box(0.02, 0.18, 0.2, 0x44403c), 0, 0.92, 0); gn.rotation.x = 0.5;
      }
      return g;
    });
    // égbolt és nap
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }));
    S.add(this.sun);
  }

  // ---- szöveg az okostáblán -------------------------------------------
  drawBoard(s, t) {
    const { g, c } = this.boardTex.userData;
    const W = c.width, H = c.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#f8fafc'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1e293b'; g.font = '600 26px Arial, sans-serif'; g.textAlign = 'left';
    g.fillText('Fizika · 11. évfolyam', 30, 46);
    g.fillStyle = '#94a3b8'; g.fillRect(30, 60, W - 60, 2);
    const intro = s.phase === 'intro';
    const prog = intro ? Math.max(0, Math.min(1, (9 - s.introT) / 5.5)) : 1;
    const txt = BOARD_TEXT.slice(0, Math.round(BOARD_TEXT.length * prog));
    g.font = '700 48px "Comic Sans MS", "Segoe Print", cursive, sans-serif';
    g.fillStyle = '#b91c1c';
    const outroFix = s.phase === 'outro' && s.outroT < 5 || s.phase === 'won';
    this.wrap(g, txt, 40, 160, W - 80, 62);
    if (outroFix) {
      g.strokeStyle = '#111827'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(36, 150); g.lineTo(W - 60, 140); g.stroke();
      g.beginPath(); g.moveTo(36, 215); g.lineTo(W - 220, 205); g.stroke();
      g.fillStyle = '#15803d'; g.font = '700 46px "Comic Sans MS", "Segoe Print", cursive, sans-serif';
      this.wrap(g, BOARD_FIX, 40, 330, W - 80, 60);
    } else if (!intro) {
      g.fillStyle = '#334155'; g.font = '28px Arial, sans-serif';
      ['F = m · a', 'Fototropizmus: a növény a fény felé fordul', 'Heliotropizmus: ?'].forEach((l, i) => g.fillText(l, 40, 330 + i * 44));
    }
    if (s.boardBroken) {
      g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3;
      for (let i = 0; i < 14; i++) { const a = (i / 14) * PI * 2; g.beginPath(); g.moveTo(W / 2, H / 2); g.lineTo(W / 2 + Math.cos(a) * 140, H / 2 + Math.sin(a) * 90); g.lineTo(W / 2 + Math.cos(a + 0.2) * 520, H / 2 + Math.sin(a + 0.2) * 300); g.stroke(); }
      g.fillStyle = Math.floor(t * 3) % 2 ? '#22d3ee' : '#a855f7'; g.fillRect(0, 90 + ((t * 120) % 300), W, 6);
    }
    this.boardTex.needsUpdate = true;
  }
  wrap(g, text, x, y, maxW, lh) {
    const words = text.split(' ');
    let lineTxt = '';
    for (const w of words) {
      const test = lineTxt ? lineTxt + ' ' + w : w;
      if (g.measureText(test).width > maxW && lineTxt) { g.fillText(lineTxt, x, y); y += lh; lineTxt = w; } else lineTxt = test;
    }
    if (lineTxt) g.fillText(lineTxt, x, y);
  }

  setCone(fov, range) {
    if (Math.abs(fov - this.coneFov) > 0.01) {
      this.coneFov = fov;
      this.cone.geometry.dispose();
      const geo = new THREE.CircleGeometry(1, 28, -PI / 2 - fov / 2, fov);
      geo.rotateX(-PI / 2);
      this.cone.geometry = geo;
    }
    this.coneRange += (range - this.coneRange) * 0.25;
    this.cone.visible = this.coneRange > 0.15 && this.taba.visible;
    this.cone.scale.setScalar(Math.max(0.01, this.coneRange));
  }

  avatar(id, p) {
    let a = this.avatars.get(id);
    const key = (p.skin || 'alap') + '|' + p.seat;
    if (a && a.userData.key !== key) { this.scene.remove(a); this.avatars.delete(id); a = null; }
    if (!a) {
      a = makeHuman(studentLook(p.skin, p.seat));
      a.userData.key = key; a.scale.setScalar(0.9);
      a.userData.x = p.x; a.userData.z = p.z; a.userData.yaw = p.yaw; a.userData.sp = 0;
      this.scene.add(a); this.avatars.set(id, a);
    }
    return a;
  }

  npcReact(mood, dur) { this.npcMood = mood; this.npcMoodT = dur; this.npcDur = dur; }
  shake(a) { this.shakeA = Math.max(this.shakeA, a); }
  kick() { this.vmKick = 1; }
  startBeer() { this.beerT = 0; }

  setViewModel(type) {
    if (type === this.vmType) return;
    this.vmType = type;
    this.vm.clear();
    if (!type) return;
    const m = type === 'plant' ? makePlant() : makeThing(type);
    if (type === 'plant') { m.scale.setScalar(0.45); m.position.set(-0.05, -0.15, -0.05); growPlant(m, this.lastGrowth || 0.5, 0); }
    else if (type === 'axe') { m.rotation.set(0.3, 0.4, -0.3); m.position.set(0, -0.25, 0); }
    else { m.rotation.set(0.3, PI + 0.4, 0); m.scale.setScalar(1.4); }
    this.vm.add(m);
  }

  // sörnyitás: első személyű, két kézzel (kb. 3,2 mp)
  stepBeer(dt) {
    if (this.beerT < 0) return false;
    if (!this.beerGroup) {
      const g = new THREE.Group();
      const can = put(g, new THREE.Group(), 0.06, -0.2, -0.42);
      put(can, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.13, 16), mat(0xc0c4c9)), 0, 0, 0);
      put(can, new THREE.Mesh(new THREE.CylinderGeometry(0.0355, 0.0355, 0.07, 16), mat(0x1f6f3f)), 0, -0.005, 0);
      const tab = put(can, new THREE.Group(), 0, 0.066, 0.01);
      put(tab, box(0.014, 0.003, 0.03, 0x9ca3af), 0, 0, 0.012);
      const hand = put(g, box(0.07, 0.09, 0.05, 0xf0c8a0), 0.11, -0.24, -0.4);
      const finger = put(g, box(0.016, 0.05, 0.016, 0xf0c8a0), -0.05, -0.1, -0.42);
      const foam = [];
      for (let i = 0; i < 10; i++) { const f = put(can, new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), mat(0xffffff)), 0, 0.07, 0.01); f.visible = false; foam.push(f); }
      g.userData = { can, tab, hand, finger, foam };
      this.camera.add(g); this.beerGroup = g;
    }
    const u = this.beerGroup.userData, t = (this.beerT += dt);
    const ease = (x) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
    u.can.position.y = -0.36 + 0.24 * ease(t / 0.5) - (t > 2.7 ? 0.3 * ease((t - 2.7) / 0.5) : 0);
    u.hand.position.y = u.can.position.y - 0.04;
    // ujj a fülre, felpattintás
    const f = ease((t - 0.5) / 0.4);
    u.finger.position.set(-0.05 + 0.11 * f, -0.1 - 0.06 * (1 - f) + (t > 1.0 ? 0.03 * ease((t - 1.0) / 0.2) : 0), -0.42);
    u.finger.visible = t < 1.5;
    u.tab.rotation.x = t > 1.0 ? -1.4 * ease((t - 1.0) / 0.15) : 0;
    if (t > 1.05 && !this.beerHiss) { this.beerHiss = true; this.onHiss && this.onHiss(); }
    u.foam.forEach((m, i) => {
      const ft = t - 1.05 - i * 0.03;
      m.visible = ft > 0 && ft < 0.8;
      if (m.visible) m.position.set(Math.sin(i * 2.1) * 0.02 * ft * 3, 0.07 + ft * 0.12, 0.01 + Math.cos(i * 1.7) * 0.015);
    });
    // ivás: a doboz a kamera felé billen
    u.can.rotation.x = t > 1.6 && t < 2.7 ? -1.1 * ease((t - 1.6) / 0.35) : t >= 2.7 ? -1.1 * (1 - ease((t - 2.7) / 0.3)) : 0;
    u.can.position.z = -0.42 + (t > 1.6 && t < 2.7 ? 0.17 * ease((t - 1.6) / 0.35) : 0);
    if (t > 3.3) { this.camera.remove(this.beerGroup); this.beerGroup = null; this.beerT = -1; this.beerHiss = false; return false; }
    return true;
  }

  // ---- állapot -> látvány -----------------------------------------------
  update(s, meId, dt, t, me) {
    const k = 1 - Math.exp(-dt * 12);
    const T = s.teacher;
    const sun = s.phase === 'outro' ? Math.max(0, Math.min(1, (10.5 - s.outroT) / 6)) : (s.sun || 0);
    // nap: keletről nyugatra; a nyugati oldal a bal fal (x<0)
    const az = PI * (0.15 + 0.7 * sun);
    const sx = Math.cos(az) * 40, sz = -Math.sin(az) * 10 + 20 - sun * 40, sy = 14 + Math.sin(sun * PI) * 16;
    this.sun.position.set(-sx - 15, sy, sz);
    this.sunLight.position.copy(this.sun.position); this.sunLight.target.position.set(0, 0, 0);
    const sunYaw = Math.atan2(this.sun.position.x - 0, this.sun.position.z - 0);
    const dark = s.phase === 'play' && (!s.lights || s.power === false);
    const b = this.bright = (this.bright ?? 1) + ((dark ? 0.35 : 1) - (this.bright ?? 1)) * (1 - Math.exp(-dt * 8));
    this.hemi.intensity = 0.45 + 0.95 * b;
    const alarm = (s.alarm || 0) > 0;
    this.hemi.color.setRGB(1, alarm ? 0.75 + 0.25 * Math.sin(t * 12) : 1, alarm ? 0.75 + 0.25 * Math.sin(t * 12) : 1);
    this.lampMat.color.setScalar(0.3 + 0.7 * b);
    this.alarmLight.material.color.setHex(alarm && Math.floor(t * 4) % 2 ? 0xff2222 : 0x551111);
    // napfoltok
    const beamZ = 7 - sun * 14;
    this.sunPatches.forEach((m, i) => { m.position.set(-3.4 + (i % 2) * 2.4, 0.012, beamZ + (i < 2 ? -0.8 : 0.8)); m.material.opacity = 0.22 * b; });

    // okostábla
    const bk = s.phase + '|' + (s.phase === 'intro' ? Math.round(s.introT * 8) : '') + '|' + (s.phase === 'outro' && s.outroT < 5) + '|' + s.boardBroken + '|' + (s.boardBroken ? Math.floor(t * 6) : '');
    if (bk !== this.keys.board) { this.keys.board = bk; this.drawBoard(s, t); }

    if (s.bags) {
      s.bags.forEach((bg) => { const m = this.bagMeshes.get(bg.desk); if (m) { m.userData.flap.rotation.x = bg.searched ? -1.2 : 0; m.userData.flap.position.z = bg.searched ? -0.08 : 0; } });
      const cs = s.canSill;
      this.can.visible = !s.canTaken && cs != null;
      if (cs != null) { const sp = P.sill(cs); this.can.position.set(sp.x + 0.05, sp.y, sp.z - 0.4); }
      this.axe.visible = !s.axeTaken;
      this.genBall.material.emissive.setHex((s.genOn || 0) > 0 && Math.random() < 0.5 ? 0x60a5fa : 0x000000);
      this.phoneMesh.visible = !!s.phone;
      if (s.phone) { this.phoneMesh.position.set(s.phone.x, 0.02, s.phone.z); this.phoneMesh.rotation.y = s.phone.ring ? Math.sin(t * 40) * 0.3 : 0; }
    }
    // kísérleti állomások animációja
    const pv = this.stations[0].userData.pv; if (pv) pv.rotation.z = Math.sin(t * 2.4) * 0.5;
    const lv = this.stations[1].userData.lv; if (lv) lv.rotation.z = Math.sin(t * 0.9) * 0.12;
    for (const f of this.bedFlowers) { growPlant(f, 1, sunYaw); }

    // napraforgó
    const pl = s.plant;
    const outroPlant = s.phase === 'outro' || (pl && pl.desk === -1);
    this.plant.visible = !!pl && pl.carried !== meId;
    if (pl) {
      this.lastGrowth = pl.growth;
      if (pl.carried) {
        const av = this.avatars.get(pl.carried);
        if (av) { this.plant.position.set(av.position.x + Math.sin(av.rotation.y) * 0.35, 0.95, av.position.z + Math.cos(av.rotation.y) * 0.35); }
      } else if (outroPlant) this.plant.position.set(P.tdesk.x + 0.5, 0.8, P.tdesk.z);
      else { const d = DESKS[pl.desk]; this.plant.position.set(d.x - 0.25, 0.77, d.z); }
      growPlant(this.plant, pl.growth, outroPlant ? sunYaw : sunYaw);
      this.plant.scale.setScalar(pl.covered ? 0.001 : 1);
    }

    // füst, jelzések
    while (this.smokeMeshes.length < (s.smoke || []).length) {
      const g = new THREE.Group();
      for (let i = 0; i < 6; i++) put(g, new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd4d4d8, transparent: true, opacity: 0.35, depthWrite: false })), Math.sin(i) * 0.3, 0.9 + i * 0.18, Math.cos(i * 1.3) * 0.25);
      this.scene.add(g); this.smokeMeshes.push(g);
    }
    this.smokeMeshes.forEach((g, i) => {
      const sm = (s.smoke || [])[i];
      g.visible = !!sm;
      if (sm) { g.position.set(sm.x, 0, sm.z); g.scale.setScalar((sm.big ? 1.8 : 1) * Math.min(1, sm.t / 2)); g.rotation.y = t * 0.4; }
    });
    while (this.pingMeshes.length < (s.pings || []).length) {
      const g = new THREE.Group();
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3, 6), new THREE.MeshBasicMaterial({ color: 0xffd84d, transparent: true, opacity: 0.8 })), 0, 1.5, 0);
      const r = put(g, new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 24), new THREE.MeshBasicMaterial({ color: 0xffd84d, side: THREE.DoubleSide })), 0, 0.03, 0);
      r.rotation.x = -PI / 2;
      this.scene.add(g); this.pingMeshes.push(g);
    }
    this.pingMeshes.forEach((g, i) => { const pg = (s.pings || [])[i]; g.visible = !!pg; if (pg) { g.position.set(pg.x, 0, pg.z); g.scale.setScalar(1 + 0.15 * Math.sin(t * 8)); } });

    // rakéták
    const seen = new Set();
    for (const r of s.rockets || []) {
      seen.add(r.id);
      let m = this.rockets.get(r.id);
      if (!m) {
        m = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 10), mat(0x4b5320));
        body.rotation.x = PI / 2; m.add(body);
        put(m, new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 10), mat(0x3f3f46)), 0, 0, 0.3).rotation.x = PI / 2;
        put(m, new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 8), new THREE.MeshBasicMaterial({ color: 0xffa53b })), 0, 0, -0.35).rotation.x = -PI / 2;
        this.scene.add(m); this.rockets.set(r.id, m);
      }
      m.position.set(r.x, r.y, r.z);
      m.lookAt(r.x + r.vx, r.y + r.vy, r.z + r.vz);
      if (Math.random() < 0.6) this.spawnFx({ e: 'trail', x: r.x, y: r.y, z: r.z });
    }
    for (const [id, m] of this.rockets) if (!seen.has(id)) { this.scene.remove(m); this.rockets.delete(id); }

    // Fizika néni
    const tg = this.taba;
    tg.position.x += (T.x - tg.position.x) * k;
    tg.position.z += (T.z - tg.position.z) * k;
    this.tabaYaw = lerpAngle(this.tabaYaw, T.yaw, 1 - Math.exp(-dt * 16));
    tg.rotation.y = this.tabaYaw;
    const pose = { write: 'board', board: 'board', lab: 'fix', grade: 'laptop', roll: 'lecture', run: 'run' }[T.st] || T.st;
    poseHuman(tg, pose, T.st === 'run' ? t * 1.6 : t, T.sit, 0);
    tg.visible = !T.hidden;
    tg.userData.spoon.visible = T.weapon === 'spoon';
    tg.userData.rl.visible = T.weapon === 'rocket';
    this.cone.position.set(tg.position.x, 0.025, tg.position.z);
    this.cone.rotation.y = this.tabaYaw;
    this.setCone(T.fov, s.phase === 'play' ? T.range : 0);
    let alert = 0;
    for (const p of Object.values(s.players)) alert = Math.max(alert, p.sus || 0);
    this.coneMat.color.setHex(alert > 0.05 || T.weapon !== 'none' && T.st !== 'walk' ? 0xff3b3b : T.st === 'warn' ? 0xffd23b : T.range > 3.5 ? 0xffa53b : 0x35d07f);

    // ajtó
    let near = Math.hypot(tg.position.x - DOOR.x, tg.position.z - DOOR.z) < 1.8;
    if (me && Math.hypot(me.x - DOOR.x, me.z - DOOR.z) < 1.8) near = true;
    for (const a of this.avatars.values()) if (Math.hypot(a.position.x - DOOR.x, a.position.z - DOOR.z) < 1.8) near = true;
    this.doorOpen += ((near ? 1 : 0) - this.doorOpen) * (1 - Math.exp(-dt * 7));
    this.door.rotation.y = -1.45 * this.doorOpen;

    // játékosok
    for (const [id, p] of Object.entries(s.players)) {
      if (id === meId) continue;
      const a = this.avatar(id, p);
      const u = a.userData;
      const px = a.position.x, pz = a.position.z;
      u.x += (p.x - u.x) * k; u.z += (p.z - u.z) * k;
      const seated = p.seated != null;
      a.position.set(u.x, 0, seated ? u.z - 0.08 : u.z);
      u.yaw = lerpAngle(u.yaw, seated ? PI : p.yaw, k);
      a.rotation.y = u.yaw;
      const sp = Math.hypot(a.position.x - px, a.position.z - pz) / Math.max(dt, 1e-3);
      u.sp += (sp - u.sp) * 0.2;
      const mode = p.down > 0 ? 'npcSleep' : seated ? (p.act ? 'npcWrite' : 'watch') : p.crouch ? (u.sp > 0.3 ? 'crouchWalk' : 'crouch') : u.sp > 3.8 ? 'run' : u.sp > 0.3 ? 'walk' : p.act ? 'fix' : '';
      poseHuman(a, mode, mode === 'run' ? t * 1.4 : t, seated);
    }
    for (const [id, a] of this.avatars) if (!s.players[id] || id === meId) { this.scene.remove(a); this.avatars.delete(id); }
    this.updateNpcs(s, dt, t);

    // nézet: átvezető jelenet vagy belső nézet
    this.shakeA *= Math.exp(-dt * 6);
    if (s.phase === 'intro') {
      this.camera.position.set(0.5, 1.55, -4.15);
      this.camera.rotation.set(0.0, 0.03, 0);
    } else if (s.phase === 'outro') {
      const o = s.outroT;
      if (o > 4.5) { this.camera.position.set(-0.9, 1.3, -4.2); this.camera.lookAt(P.tdesk.x + 0.4, 1.2, P.tdesk.z - 0.1); }
      else { this.camera.position.set(0.3, 1.55, -3.0 - (4.5 - o) * 0.15); this.camera.lookAt(0, 1.6, -8); }
    } else if (me) {
      const sh = this.shakeA * 0.07;
      this.camera.position.set(me.x + (Math.random() - 0.5) * sh, (me.eye ?? EYE) + (me.bob || 0) + (Math.random() - 0.5) * sh, me.z + (Math.random() - 0.5) * sh);
      this.camera.rotation.set(me.pitch, me.yaw + PI, 0);
      if (this.drunk > 0) {
        this.drunk -= dt;
        const w = Math.min(1, this.drunk / 4);
        this.camera.rotation.z = Math.sin(t * 1.3) * 0.07 * w;
        this.camera.rotation.x += Math.sin(t * 0.9) * 0.04 * w;
        this.camera.position.x += Math.sin(t * 0.7) * 0.06 * w;
      }
    }
    this.zoomCur += (this.zoom - this.zoomCur) * (1 - Math.exp(-dt * 6));
    const fov = this.baseFov / this.zoomCur;
    if (Math.abs(fov - this.camera.fov) > 0.01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    this.vmKick *= Math.exp(-dt * 14);
    this.vm.position.z = -0.5 + this.vmKick * 0.12;
    this.vm.visible = !this.stepBeer(dt) && s.phase === 'play';

    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      if (f.step(Math.min(1, f.t / f.dur)) === false || f.t >= f.dur) { this.scene.remove(f.obj); this.fx.splice(i, 1); }
    }
  }

  updateNpcs(s, dt, t) {
    const key = (s.npcDesks || []).join(',') + '|' + (s.snitch ? s.snitch.desk : '');
    if (key !== this.npcKey) {
      this.npcKey = key;
      for (const n of this.npcs) this.scene.remove(n);
      this.npcs = [];
      for (const i of s.npcDesks || []) {
        const sn = s.snitch && s.snitch.desk === i;
        const h = makeHuman(sn ? { shirt: 0xf1f5f9, vest: 0x334155, pants: 0x1e293b, hair: 0x5b4636, glasses: true } : NPC_LOOKS[i % NPC_LOOKS.length]);
        h.scale.setScalar(0.88);
        const sp = seatPos(i);
        h.position.set(sp.x, 0, sp.z - 0.08); h.rotation.y = PI;
        h.userData.idle = NPC_IDLE[i % NPC_IDLE.length]; h.userData.seed = i * 1.37; h.userData.snitch = sn;
        this.scene.add(h); this.npcs.push(h);
      }
    }
    if (this.npcMoodT > 0) this.npcMoodT -= dt;
    const tp = this.taba.position;
    for (const h of this.npcs) {
      const u = h.userData;
      let mode = this.npcMoodT > 0 ? this.npcMood : u.idle;
      if (u.snitch && s.snitch) mode = s.snitch.raise > 0 ? 'raise' : s.snitch.off > 0 ? 'npcPhone' : 'watch';
      poseHuman(h, mode, t + u.seed, true);
      if (mode === 'watch' || mode === 'raise' || this.npcMoodT > 0 || u.idle === 'npcLook') {
        let a = Math.atan2(tp.x - h.position.x, tp.z - h.position.z) - h.rotation.y;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        u.head.rotation.y = Math.max(-1.1, Math.min(1.1, a));
      }
    }
  }

  spawnFx(ev) {
    const S = this.scene;
    if (ev.e === 'boom') {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.9, depthWrite: false }));
      m.position.set(ev.x, ev.y, ev.z); S.add(m);
      this.fx.push({ obj: m, t: 0, dur: 0.6, step: (u) => { m.scale.setScalar(1 + u * 6); m.material.opacity = 0.9 * (1 - u); m.material.color.setHex(u < 0.3 ? 0xfff1b0 : 0x9ca3af); } });
    } else if (ev.e === 'trail') {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshBasicMaterial({ color: 0xd4d4d8, transparent: true, opacity: 0.6, depthWrite: false }));
      m.position.set(ev.x, ev.y, ev.z); S.add(m);
      this.fx.push({ obj: m, t: 0, dur: 0.8, step: (u) => { m.scale.setScalar(1 + u * 3); m.material.opacity = 0.6 * (1 - u); } });
    } else if (ev.e === 'lob') {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), mat(0xf5f5f4));
      S.add(m);
      const a = ev.from, b = ev.to, len = Math.hypot(a[0] - b[0], a[2] - b[2]);
      this.fx.push({ obj: m, t: 0, dur: Math.max(0.25, len / 10), step: (u) => m.position.set(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + Math.sin(u * PI) * 0.8, a[2] + (b[2] - a[2]) * u) });
    }
  }

  project(x, y, z) {
    const v = this.v.set(x, y, z).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.w, y: (-v.y * 0.5 + 0.5) * this.h, ok: v.z > -1 && v.z < 1 };
  }
  render() { this.renderer.render(this.scene, this.camera); }
}
