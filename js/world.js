// 3D-s megjelenítés (Three.js): a terem, Taba, a diákok, tárgyak és effektek.
import * as THREE from '../vendor/three.module.min.js';
import { ROOM, P, DESKS, EYE, PLAYER_COLORS, projState, isDark } from './data.js';

const PI = Math.PI;
const matCache = new Map();
function mat(color, opt) {
  const key = color + JSON.stringify(opt || 0);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, ...opt }));
  return matCache.get(key);
}
const geoCache = new Map();
function boxGeo(w, h, d) {
  const k = `${w}|${h}|${d}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(k);
}
function box(w, h, d, color, opt) { return new THREE.Mesh(boxGeo(w, h, d), mat(color, opt)); }
function put(parent, obj, x, y, z) { obj.position.set(x, y, z); parent.add(obj); return obj; }
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData = { c, g };
  return t;
}
const lerpAngle = (a, b, k) => {
  let d = (b - a) % (2 * PI);
  if (d > PI) d -= 2 * PI;
  if (d < -PI) d += 2 * PI;
  return a + d * k;
};

// ---- emberkék -----------------------------------------------------------
const SKIN = 0xf0c8a0;
function makeHuman(o) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const legs = [], arms = [];
  for (const side of [-1, 1]) {
    const hip = put(body, new THREE.Group(), side * 0.11, 0.82, 0);
    put(hip, box(0.17, 0.8, 0.19, o.pants), 0, -0.4, 0);
    put(hip, box(0.18, 0.09, 0.28, 0x222222), 0, -0.78, 0.04);
    legs.push(hip);
    const sh = put(body, new THREE.Group(), side * 0.33, 1.4, 0);
    put(sh, box(0.13, 0.58, 0.14, o.sleeve ?? o.shirt), 0, -0.27, 0);
    put(sh, box(0.11, 0.11, 0.11, SKIN), 0, -0.61, 0);
    arms.push(sh);
  }
  put(body, box(0.52, 0.62, 0.3, o.shirt), 0, 1.13, 0);
  if (o.vest) put(body, box(0.54, 0.5, 0.32, o.vest), 0, 1.1, 0);
  const head = put(body, new THREE.Group(), 0, 1.63, 0);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(SKIN)));
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.215, 16, 10, 0, PI * 2, 0, PI * 0.5), mat(o.hair));
  hair.rotation.x = -0.25;
  head.add(hair);
  for (const side of [-1, 1]) put(head, box(0.035, 0.035, 0.02, 0x222222), side * 0.075, 0.02, 0.19);
  put(head, box(0.04, 0.05, 0.05, 0xe2b48c), 0, -0.03, 0.2);
  if (o.glasses) {
    for (const side of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.012, 6, 14), mat(0x1a1a1a));
      put(head, r, side * 0.078, 0.02, 0.2);
    }
    put(head, box(0.05, 0.012, 0.012, 0x1a1a1a), 0, 0.03, 0.2);
  }
  if (o.mustache) put(head, box(0.15, 0.035, 0.03, o.hair), 0, -0.085, 0.19);
  if (o.tie) put(body, box(0.07, 0.3, 0.02, o.tie), 0, 1.24, 0.17);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.36, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  shadow.rotation.x = -PI / 2;
  put(g, shadow, 0, 0.012, 0);
  g.userData = { body, legs, arms, head };
  return g;
}

function poseHuman(h, mode, t, sit) {
  const { body, legs, arms, head } = h.userData;
  let ly = 0, la = [0, 0], aa = [0, 0], hx = 0, hy = 0, by = 0, bz = 0;
  const w = Math.sin(t * 9);
  switch (mode) {
    case 'walk': la = [w * 0.6, -w * 0.6]; aa = [-w * 0.5, w * 0.5]; break;
    case 'laptop': aa = [-1.05 + Math.sin(t * 17) * 0.06, -1.05 + Math.cos(t * 15) * 0.06]; hx = 0.45; break;
    case 'board': aa = [0, -2.5 + Math.sin(t * 7) * 0.22]; break;
    case 'projector': aa = [0, -2.1 + Math.sin(t * 2) * 0.1]; hx = -0.3; break;
    case 'fix': aa = [-1.3 + Math.sin(t * 8) * 0.2, -1.3 + Math.cos(t * 8) * 0.2]; hx = 0.25; break;
    case 'lecture': aa = [0, -0.9 + Math.sin(t * 3) * 0.4]; break;
    case 'warn': hy = Math.sin(t * 6) * 0.3; aa = [0, -0.4]; break;
    case 'glance': case 'look': aa = [-0.2, -0.2]; hx = -0.05; break;
    case 'count': aa = [0, -1.55]; by = Math.sin(t * 30) * 0.012; break;
    case 'stun': aa = [-2.4, -2.4]; hy = Math.sin(t * 14) * 0.35; hx = 0.2; break;
    case 'stuck': aa = [-2.9 + w * 0.4, -2.9 - w * 0.4]; bz = Math.sin(t * 12) * 0.05; break;
  }
  if (sit) { ly = -0.3; la = [-PI / 2, -PI / 2]; }
  body.position.y = ly + by;
  body.rotation.z = bz;
  legs[0].rotation.x = la[0]; legs[1].rotation.x = la[1];
  arms[0].rotation.x = aa[0]; arms[1].rotation.x = aa[1];
  head.rotation.x = hx; head.rotation.y = hy;
}

// ---- tárgyak ------------------------------------------------------------
export function makeItem(type) {
  const g = new THREE.Group();
  switch (type) {
    case 'laptop': {
      put(g, box(0.36, 0.025, 0.26, 0x9aa0a8), 0, 0.012, 0);
      const lid = put(g, new THREE.Group(), 0, 0.025, -0.13);
      put(lid, box(0.36, 0.24, 0.018, 0x8a9098), 0, 0.12, 0);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.2), new THREE.MeshBasicMaterial({ color: 0x7fc8ff }));
      put(lid, scr, 0, 0.12, 0.011);
      lid.rotation.x = -0.25;
      g.userData.screen = scr;
      break;
    }
    case 'ak': {
      // játékfegyver: narancs–kék szivacslövő
      put(g, box(0.07, 0.1, 0.46, 0xff7a1a), 0, 0.06, 0);
      put(g, box(0.05, 0.05, 0.3, 0x2a6fdb), 0, 0.075, 0.36);
      put(g, box(0.06, 0.06, 0.05, 0xffd21a), 0, 0.075, 0.53);
      put(g, box(0.06, 0.12, 0.26, 0x2a6fdb), 0, 0.04, -0.34);
      const mag = put(g, box(0.055, 0.2, 0.09, 0x2a6fdb), 0, -0.07, 0.08);
      mag.rotation.x = 0.3;
      put(g, box(0.05, 0.12, 0.06, 0xff7a1a), 0, -0.04, -0.12);
      put(g, box(0.02, 0.04, 0.02, 0x222222), 0, 0.13, 0.42);
      break;
    }
    case 'remote':
      put(g, box(0.07, 0.03, 0.2, 0x25282e), 0, 0.015, 0);
      put(g, box(0.025, 0.012, 0.025, 0xe23b3b), 0, 0.034, 0.07);
      put(g, box(0.04, 0.01, 0.06, 0x777777), 0, 0.033, -0.02);
      break;
    case 'chalk':
      put(g, box(0.035, 0.035, 0.14, 0xffffff), 0, 0.02, 0);
      put(g, box(0.035, 0.035, 0.1, 0xffe27a), 0.06, 0.02, 0.01);
      break;
    case 'cushion': {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 10), mat(0xe85d75));
      m.scale.y = 0.3;
      put(g, m, 0, 0.045, 0);
      put(g, box(0.05, 0.03, 0.1, 0xc94560), 0, 0.04, 0.17);
      break;
    }
    case 'glue':
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.14, 10), mat(0xf4f4f4)), 0, 0.07, 0);
      put(g, new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 10), mat(0xff8a1a)), 0, 0.175, 0);
      break;
    case 'stink':
      put(g, new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), mat(0x6fd13f, { transparent: true, opacity: 0.85 })), 0, 0.075, 0);
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.07, 8), mat(0xdfeedd)), 0, 0.17, 0);
      put(g, box(0.035, 0.02, 0.035, 0x8a5a2b), 0, 0.21, 0);
      break;
    case 'phone': {
      put(g, box(0.085, 0.015, 0.17, 0x1d1f24), 0, 0.008, 0);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.14), new THREE.MeshBasicMaterial({ color: 0x3ddc84 }));
      s.rotation.x = -PI / 2;
      put(g, s, 0, 0.017, 0);
      break;
    }
    case 'plane': {
      const geo = new THREE.BufferGeometry();
      const v = new Float32Array([0, 0.02, 0.16, -0.11, 0.03, -0.12, 0, 0.02, -0.1, 0, 0.02, 0.16, 0, 0.02, -0.1, 0.11, 0.03, -0.12, 0, 0.02, 0.16, 0, 0.02, -0.1, 0, -0.03, -0.1]);
      geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
      geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo, mat(0xffffff, { side: THREE.DoubleSide })));
      g.position.y = 0.03;
      const wrap = new THREE.Group();
      wrap.add(g);
      return wrap;
    }
  }
  return g;
}

// ---- világ --------------------------------------------------------------
export class World {
  constructor(canvas) {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x10151c);
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 60);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x9a8468, 1.5);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 1.3);
    this.sun.position.set(-6, 5, 1);
    this.scene.add(this.hemi, this.sun);
    this.bright = 1;
    this.fx = [];
    this.itemMeshes = new Map();
    this.avatars = new Map();
    this.keys = {};
    this.v = new THREE.Vector3();
    this.buildRoom();
    this.buildTaba();
    this.buildViewModel();
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 88 : 68;
    this.camera.updateProjectionMatrix();
    this.w = w; this.h = h;
  }

  buildRoom() {
    const S = this.scene;
    const W = ROOM.x1 - ROOM.x0, D = ROOM.z1 - ROOM.z0, H = ROOM.h;

    // padló (parketta)
    const floorTex = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#c69c63'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 2; x++) {
        const sh = 150 + ((x * 37 + y * 53) % 40);
        g.fillStyle = `rgb(${sh + 48},${sh + 8},${sh - 50})`;
        g.fillRect(x * 128 + (y % 2) * 64 - 64, y * 32, 126, 30);
        g.fillRect(x * 128 + (y % 2) * 64 + 192, y * 32, 126, 30);
      }
    });
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(5, 6);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ map: floorTex }));
    floor.rotation.x = -PI / 2;
    S.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat(0xf6f4ee));
    ceil.rotation.x = PI / 2; ceil.position.y = H;
    S.add(ceil);

    // falak
    const wallC = 0xefe4cc, dadoC = 0x8fb9a3;
    const wall = (w, x, z, ry) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, H), mat(wallC));
      m.position.set(x, H / 2, z); m.rotation.y = ry; S.add(m);
      const d = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.95), mat(dadoC));
      d.position.set(x, 0.475, z); d.rotation.y = ry;
      d.translateZ(0.004); S.add(d);
    };
    wall(W, 0, ROOM.z0, 0);
    wall(W, 0, ROOM.z1, PI);
    wall(D, ROOM.x0, 0, PI / 2);
    wall(D, ROOM.x1, 0, -PI / 2);

    // mennyezeti lámpák
    this.lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const x of [-2.4, 2.4]) for (const z of [-2.6, 2.2]) {
      put(S, box(1.5, 0.05, 0.42, 0xd8d8d8), x, H - 0.03, z);
      put(S, new THREE.Mesh(boxGeo(1.4, 0.02, 0.32), this.lampMat), x, H - 0.065, z);
    }

    // ablakok (bal fal)
    const skyTex = canvasTex(128, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#6db7f2'); gr.addColorStop(0.75, '#cfeaff'); gr.addColorStop(0.76, '#6fae5a'); gr.addColorStop(1, '#4e8a43');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.9)';
      for (const [x, y, r] of [[30, 30, 14], [46, 34, 12], [92, 52, 11], [104, 50, 9]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    });
    this.skyMat = new THREE.MeshBasicMaterial({ map: skyTex });
    this.glassMat = new THREE.MeshBasicMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.22, depthWrite: false });
    const crackTex = canvasTex(128, 128, (g, w, h) => {
      g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 2;
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * PI * 2;
        g.beginPath(); g.moveTo(64, 64);
        g.lineTo(64 + Math.cos(a + 0.2) * 30, 64 + Math.sin(a + 0.2) * 30);
        g.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62); g.stroke();
      }
      g.fillStyle = '#123'; g.beginPath(); g.arc(64, 64, 7, 0, 7); g.fill();
    });
    this.crackMat = new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, depthWrite: false });
    this.cracks = [];
    P.windowsZ.forEach((z, i) => {
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.5), this.skyMat);
      sky.rotation.y = PI / 2; sky.position.set(ROOM.x0 + 0.012, 1.75, z); S.add(sky);
      const fr = 0x6b4a2b;
      put(S, box(0.07, 0.07, 1.74, fr), ROOM.x0 + 0.04, 2.53, z);
      put(S, box(0.16, 0.06, 1.8, 0xe8e2d2), ROOM.x0 + 0.08, 0.98, z);
      put(S, box(0.07, 1.5, 0.07, fr), ROOM.x0 + 0.04, 1.75, z - 0.83);
      put(S, box(0.07, 1.5, 0.07, fr), ROOM.x0 + 0.04, 1.75, z + 0.83);
      // nyitható szárny (zsanér a z-0.8 élen)
      const sash = new THREE.Group();
      sash.position.set(ROOM.x0 + 0.05, 1.75, z - 0.8);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.5), this.glassMat);
      glass.rotation.y = PI / 2; glass.position.z = 0.8;
      sash.add(glass);
      put(sash, box(0.04, 0.05, 1.6, fr), 0, 0, 0.8);
      put(sash, box(0.04, 1.5, 0.05, fr), 0, 0, 0.8);
      S.add(sash);
      if (i === 1) this.sash = sash;
      else {
        const c = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.4), this.crackMat);
        c.rotation.y = PI / 2; c.position.set(ROOM.x0 + 0.06, 1.75, z); c.visible = false; S.add(c);
        this.cracks.push(c);
      }
    });

    // ajtó + villanykapcsoló (jobb fal)
    put(S, box(0.06, 2.1, 1.0, 0x8a5a2b), ROOM.x1 - 0.03, 1.05, P.door.z);
    put(S, box(0.08, 2.2, 0.08, 0x5e3c1c), ROOM.x1 - 0.04, 1.1, P.door.z - 0.54);
    put(S, box(0.08, 2.2, 0.08, 0x5e3c1c), ROOM.x1 - 0.04, 1.1, P.door.z + 0.54);
    put(S, box(0.1, 0.05, 0.14, 0xd9c36a), ROOM.x1 - 0.09, 1.05, P.door.z + 0.36);
    put(S, box(0.02, 0.16, 0.12, 0xffffff), ROOM.x1 - 0.012, P.switch.y, P.switch.z);
    this.rocker = put(S, box(0.03, 0.08, 0.05, 0xdedede), ROOM.x1 - 0.03, P.switch.y, P.switch.z);

    // tábla
    put(S, box(P.board.w + 0.16, P.board.h + 0.16, 0.05, 0x7a5330), P.board.x, P.board.y, ROOM.z0 + 0.03);
    this.boardTex = canvasTex(512, 192, () => {});
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(P.board.w, P.board.h), new THREE.MeshLambertMaterial({ map: this.boardTex }));
    bm.position.set(P.board.x, P.board.y, ROOM.z0 + 0.06); S.add(bm);
    put(S, box(P.board.w, 0.04, 0.12, 0x7a5330), P.board.x, P.board.y - P.board.h / 2 - 0.06, ROOM.z0 + 0.1);
    put(S, box(0.16, 0.06, 0.09, 0xd9b36a), P.board.x - 1.2, P.board.y - P.board.h / 2 - 0.01, ROOM.z0 + 0.1); // szivacs

    // falióra
    this.clock = new THREE.Group();
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 24), mat(0xffffff));
    face.rotation.x = PI / 2; this.clock.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 8, 24), mat(0x333333));
    this.clock.add(rim);
    this.clockHand = new THREE.Group();
    put(this.clockHand, box(0.025, 0.2, 0.01, 0xd22b2b), 0, 0.1, 0);
    this.clockHand.position.z = 0.03;
    this.clock.add(this.clockHand);
    put(this.clock, box(0.03, 0.12, 0.01, 0x222222), 0, 0.06, 0.028);
    put(S, this.clock, P.clock.x, P.clock.y, ROOM.z0 + 0.04);

    // vetítővászon + projektor
    put(S, box(P.screen.w + 0.14, 0.1, 0.1, 0xdadada), P.screen.x, P.screen.y + P.screen.h / 2 + 0.05, ROOM.z0 + 0.06);
    this.screenTex = canvasTex(384, 256, () => {});
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(P.screen.w, P.screen.h), new THREE.MeshBasicMaterial({ map: this.screenTex }));
    sm.position.set(P.screen.x, P.screen.y, ROOM.z0 + 0.05); S.add(sm);
    this.projector = new THREE.Group();
    put(this.projector, box(0.05, 0.36, 0.05, 0x888888), 0, 0.3, 0);
    put(this.projector, box(0.42, 0.14, 0.34, 0xeeeeee), 0, 0.06, 0);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 12), mat(0x223344));
    lens.rotation.x = PI / 2; put(this.projector, lens, 0.08, 0.05, -0.19);
    put(S, this.projector, P.projector.x, P.projector.y - 0.06, P.projector.z);
    const bFrom = new THREE.Vector3(P.projector.x, P.projector.y, P.projector.z - 0.2);
    const bTo = new THREE.Vector3(P.screen.x, P.screen.y, ROOM.z0 + 0.07);
    const beamGeo = new THREE.ConeGeometry(1, bFrom.distanceTo(bTo), 4, 1, true);
    beamGeo.rotateY(PI / 4);
    this.beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }));
    this.beam.position.copy(bFrom).add(bTo).multiplyScalar(0.5);
    this.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bFrom.clone().sub(bTo).normalize());
    this.beam.scale.set(P.screen.w / 2 / 0.707, 1, P.screen.h / 2 / 0.707);
    S.add(this.beam);

    // konnektor + kábel
    put(S, box(0.12, 0.12, 0.02, 0xffffff), P.outlet.x, P.outlet.y, ROOM.z0 + 0.012);
    this.plug = put(S, box(0.07, 0.07, 0.08, 0x222222), P.outlet.x, P.outlet.y, ROOM.z0 + 0.06);
    put(S, box(0.025, ROOM.h - P.outlet.y - 0.1, 0.025, 0x333333), P.outlet.x + 0.12, (ROOM.h + P.outlet.y) / 2, ROOM.z0 + 0.03);

    // tanári asztal, szék
    const td = P.tdesk;
    put(S, box(td.w, 0.05, td.d, 0xb07a45), td.x, td.h, td.z);
    put(S, box(td.w - 0.1, td.h - 0.1, 0.04, 0x9a6836), td.x, td.h / 2, td.z + td.d / 2 - 0.06);
    put(S, box(0.05, td.h, td.d - 0.1, 0x9a6836), td.x - td.w / 2 + 0.05, td.h / 2, td.z);
    put(S, box(0.05, td.h, td.d - 0.1, 0x9a6836), td.x + td.w / 2 - 0.05, td.h / 2, td.z);
    put(S, new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 10), mat(0xffffff)), td.x + 0.6, td.h + 0.075, td.z + 0.1);
    put(S, box(0.3, 0.05, 0.22, 0x355c9a), td.x - 0.55, td.h + 0.05, td.z + 0.08);
    const ch = new THREE.Group();
    put(ch, box(0.5, 0.07, 0.48, 0x2c3440), 0, 0.5, 0);
    put(ch, box(0.5, 0.55, 0.07, 0x2c3440), 0, 0.85, -0.24);
    put(ch, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 8), mat(0x666666)), 0, 0.25, 0);
    put(ch, box(0.5, 0.04, 0.06, 0x444444), 0, 0.03, 0);
    put(ch, box(0.06, 0.04, 0.5, 0x444444), 0, 0.03, 0);
    put(S, ch, P.chair.x, 0, P.chair.z);
    this.trap = { cushion: makeItem('cushion'), glue: box(0.3, 0.012, 0.28, 0xfff7c2, { transparent: true, opacity: 0.8 }) };
    put(S, this.trap.cushion, P.chair.x, 0.54, P.chair.z + 0.02);
    put(S, this.trap.glue, P.chair.x, 0.545, P.chair.z + 0.02);

    // diákpadok
    const topC = 0xe3c48d, legC = 0x5d6670, seatC = 0x3f7fbf;
    for (const d of DESKS) {
      put(S, box(1.2, 0.04, 0.6, topC), d.x, 0.75, d.z);
      put(S, box(1.1, 0.12, 0.02, 0xcaa46a), d.x, 0.66, d.z - 0.26);
      for (const sx of [-0.55, 0.55]) put(S, box(0.04, 0.73, 0.5, legC), d.x + sx, 0.365, d.z);
      put(S, box(0.42, 0.04, 0.4, seatC), d.x, 0.45, d.z + 0.55);
      put(S, box(0.42, 0.38, 0.04, seatC), d.x, 0.75, d.z + 0.75);
      for (const sx of [-0.19, 0.19]) put(S, box(0.03, 0.94, 0.03, legC), d.x + sx, 0.47, d.z + 0.75);
      for (const sx of [-0.19, 0.19]) put(S, box(0.03, 0.45, 0.03, legC), d.x + sx, 0.225, d.z + 0.38);
    }

    // szekrények
    this.lockerDoors = [];
    P.lockers.forEach((L) => {
      const g = new THREE.Group();
      put(g, box(0.76, 1.9, 0.03, 0x3c6f8f), 0, 0.95, 0.24);
      put(g, box(0.03, 1.9, 0.5, 0x4b83a6), -0.365, 0.95, 0);
      put(g, box(0.03, 1.9, 0.5, 0x4b83a6), 0.365, 0.95, 0);
      put(g, box(0.76, 0.03, 0.5, 0x4b83a6), 0, 1.89, 0);
      put(g, box(0.72, 0.03, 0.46, 0x35627f), 0, 0.9, 0);
      put(g, box(0.72, 0.03, 0.46, 0x35627f), 0, 0.25, 0);
      const door = new THREE.Group();
      door.position.set(-0.36, 0.95, -0.25);
      put(door, box(0.72, 1.86, 0.03, 0x5b9bc4), 0.36, 0, 0);
      put(door, box(0.04, 0.14, 0.03, 0xdddddd), 0.62, 0, -0.03);
      put(door, box(0.3, 0.02, 0.012, 0x35627f), 0.36, 0.7, -0.02);
      put(door, box(0.3, 0.02, 0.012, 0x35627f), 0.36, 0.64, -0.02);
      g.add(door);
      this.lockerDoors.push(door);
      put(S, g, L.x, 0, 5.72);
    });

    // könyvespolc + földgömb
    const sh = new THREE.Group();
    put(sh, box(1.2, 1.3, 0.03, 0x7a5330), 0, 0.65, 0.2);
    for (const y of [0.03, 0.45, 0.87, 1.3]) put(sh, box(1.2, 0.04, 0.42, 0x8f6238), 0, y, 0);
    for (const x of [-0.6, 0.6]) put(sh, box(0.04, 1.3, 0.42, 0x8f6238), x, 0.65, 0);
    const bc = [0xc0392b, 0x2980b9, 0x27ae60, 0xf39c12, 0x8e44ad, 0x16a085, 0xd35400];
    for (const y of [0.05, 0.47, 0.89]) for (let i = 0; i < 9; i++) {
      const hgt = 0.26 + ((i * 7 + y * 10) % 3) * 0.04;
      put(sh, box(0.09, hgt, 0.26, bc[(i + Math.round(y * 10)) % bc.length]), -0.48 + i * 0.12, y + hgt / 2 + 0.02, 0);
    }
    put(S, sh, P.shelf.x, 0, P.shelf.z);
    this.globe = new THREE.Group();
    put(this.globe, new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), mat(0x3b8fd9)), 0, 0, 0);
    put(this.globe, new THREE.Mesh(new THREE.SphereGeometry(0.172, 7, 5), mat(0x58b368, { wireframe: true })), 0, 0, 0);
    put(this.globe, new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.04, 12), mat(0x333333)), 0, -0.2, 0);
    put(S, this.globe, P.globe.x, P.globe.y, P.globe.z);

    // biztosítékszekrény
    put(S, box(0.5, 0.6, 0.08, 0x8e979f), P.fuse.x, P.fuse.y, ROOM.z1 - 0.04);
    put(S, box(0.16, 0.16, 0.02, 0xf5c518), P.fuse.x, P.fuse.y + 0.14, ROOM.z1 - 0.09);
    this.fuseLever = put(S, box(0.06, 0.16, 0.05, 0xd22b2b), P.fuse.x, P.fuse.y - 0.12, ROOM.z1 - 0.1);

    // kuka
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.42, 14, 1, true), mat(0x3f6b4f, { side: THREE.DoubleSide }));
    put(S, bin, P.bin.x, 0.21, P.bin.z);
    const binB = new THREE.Mesh(new THREE.CircleGeometry(0.16, 14), mat(0x2c4a37));
    binB.rotation.x = -PI / 2; put(S, binB, P.bin.x, 0.02, P.bin.z);

    // növény
    this.plant = new THREE.Group();
    put(this.plant, new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.36, 12), mat(0xb5562e)), 0, 0.18, 0);
    for (const [x, y, z, r] of [[0, 0.75, 0, 0.3], [0.18, 0.6, 0.1, 0.2], [-0.16, 0.62, -0.08, 0.22], [0.02, 1.02, 0.04, 0.2]]) {
      put(this.plant, new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat(0x3d9a4a)), x, y, z);
    }
    put(S, this.plant, P.plant.x, 0, P.plant.z);

    // plakát (jobb fal)
    const poster = canvasTex(256, 192, (g, w, h) => {
      g.fillStyle = '#f6edd2'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#7b2d26'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center';
      g.fillText('TÖRTÉNELEM', w / 2, 34);
      g.fillStyle = '#d8b46a'; g.beginPath(); g.ellipse(128, 110, 96, 48, -0.1, 0, 7); g.fill();
      g.fillStyle = '#b8563d'; g.beginPath(); g.ellipse(100, 104, 40, 26, 0.3, 0, 7); g.fill();
      g.fillStyle = '#5d8a5a'; g.beginPath(); g.ellipse(168, 118, 36, 20, -0.4, 0, 7); g.fill();
      g.fillStyle = '#333'; g.font = '15px sans-serif'; g.fillText('Magyarország a XVI. században', w / 2, 180);
    });
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshLambertMaterial({ map: poster }));
    pm.rotation.y = -PI / 2; pm.position.set(ROOM.x1 - 0.015, 1.9, 1.2); S.add(pm);

    // bűzfelhő
    this.cloud = new THREE.Group();
    const cm = new THREE.MeshBasicMaterial({ color: 0x8fd94a, transparent: true, opacity: 0.28, depthWrite: false });
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.6 + (i % 3) * 0.2, 10, 8), cm);
      const a = (i / 9) * PI * 2;
      m.position.set(Math.cos(a) * (0.6 + (i % 2) * 0.9), 0.5 + (i % 4) * 0.3, Math.sin(a) * (0.6 + (i % 2) * 0.9));
      this.cloud.add(m);
    }
    this.cloud.visible = false;
    S.add(this.cloud);
  }

  buildTaba() {
    this.taba = makeHuman({ shirt: 0xdfe6ee, sleeve: 0xdfe6ee, vest: 0x7a2e3a, pants: 0x2b2f3a, hair: 0x5a5148, glasses: true, mustache: true, tie: 0x1f3a6b });
    this.scene.add(this.taba);
    this.tabaYaw = 0;
    this.coneMat = new THREE.MeshBasicMaterial({ color: 0x35d07f, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
    this.cone = new THREE.Mesh(new THREE.BufferGeometry(), this.coneMat);
    this.cone.position.y = 0.025;
    this.cone.renderOrder = 2;
    this.scene.add(this.cone);
    this.coneFov = -1;
    this.coneRange = 0;
  }

  buildViewModel() {
    this.vm = new THREE.Group();
    this.vm.position.set(0.26, -0.24, -0.5);
    this.camera.add(this.vm);
    this.vmType = null;
    this.vmKick = 0;
  }

  setViewModel(type) {
    if (type === this.vmType) return;
    this.vmType = type;
    this.vm.clear();
    if (!type) return;
    const m = makeItem(type);
    if (type === 'ak') { m.rotation.y = PI; m.scale.setScalar(0.9); m.position.set(0, -0.02, -0.1); }
    else if (type === 'laptop') { m.rotation.y = PI; m.scale.setScalar(0.8); m.position.set(-0.05, -0.05, 0); }
    else { m.rotation.set(0.3, PI + 0.4, 0); m.scale.setScalar(1.5); }
    this.vm.add(m);
  }

  drawBoard(s) {
    const { g, c } = this.boardTex.userData;
    g.fillStyle = '#1f5a3d'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(255,255,255,.05)';
    for (let i = 0; i < 14; i++) g.fillRect((i * 97) % 500, (i * 41) % 180, 60, 5);
    const lines = ['Törióra – A mohácsi csata', '1526. augusztus 29.', 'II. Lajos  †  Csele-patak', '1541 – Buda eleste', 'Három részre szakadt ország', 'HF: tk. 112–118. oldal'];
    const n = Math.round(s.board * lines.length);
    g.fillStyle = 'rgba(255,255,255,.92)'; g.textAlign = 'left';
    for (let i = 0; i < n; i++) {
      g.font = (i === 0 ? 'bold 26px' : '21px') + ' "Comic Sans MS", "Segoe Print", cursive, sans-serif';
      g.fillText(lines[i], 18, 34 + i * 29);
    }
    if (s.doodle) {
      g.strokeStyle = '#ffe66b'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.arc(390, 92, 52, 0, 7); g.stroke();
      g.beginPath(); g.arc(372, 78, 5, 0, 7); g.arc(408, 78, 5, 0, 7); g.stroke();
      g.beginPath(); g.arc(390, 96, 28, 0.2, PI - 0.2); g.stroke();
      g.beginPath(); g.moveTo(376, 108); g.lineTo(380, 126); g.lineTo(390, 110); g.stroke();
      g.fillStyle = '#ffe66b'; g.font = 'bold 30px "Comic Sans MS", cursive, sans-serif'; g.textAlign = 'center';
      g.fillText('TÖRI = ZZZ', 380, 180);
      g.save(); g.translate(150, 120); g.rotate(-0.15); g.font = 'bold 40px "Comic Sans MS", cursive, sans-serif';
      g.fillStyle = '#ff9ecb'; g.fillText('SZÜNET!!!', 0, 0); g.restore();
    }
    this.boardTex.needsUpdate = true;
  }

  drawScreen(st, t) {
    const { g, c } = this.screenTex.userData;
    const w = c.width, h = c.height;
    if (st === 'on') {
      g.fillStyle = '#fdfdf6'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#7b2d26'; g.fillRect(0, 0, w, 54);
      g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'left';
      g.fillText('A mohácsi csata (1526)', 16, 36);
      g.fillStyle = '#333'; g.font = '19px sans-serif';
      ['• II. Lajos serege: kb. 25 000 fő', '• I. Szulejmán: kb. 60 000 fő', '• A csata 2 óra alatt eldőlt', '• Következmény: kettős', '   királyválasztás'].forEach((l, i) => g.fillText(l, 18, 92 + i * 30));
      g.fillStyle = '#d8b46a'; g.fillRect(300, 170, 64, 64);
      g.fillStyle = '#7b2d26'; g.font = '34px sans-serif'; g.fillText('⚔', 314, 214);
    } else if (st === 'meme') {
      g.fillStyle = '#ffd1e8'; g.fillRect(0, 0, w, h);
      const b = Math.sin(t * 8) * 6;
      g.fillStyle = '#f4a640';
      g.beginPath(); g.arc(192, 138 + b, 70, 0, 7); g.fill();
      g.beginPath(); g.moveTo(132, 100 + b); g.lineTo(140, 40 + b); g.lineTo(178, 78 + b); g.fill();
      g.beginPath(); g.moveTo(252, 100 + b); g.lineTo(244, 40 + b); g.lineTo(206, 78 + b); g.fill();
      g.fillStyle = '#222';
      g.beginPath(); g.arc(166, 128 + b, 9, 0, 7); g.arc(218, 128 + b, 9, 0, 7); g.fill();
      g.fillStyle = '#e8627a'; g.beginPath(); g.arc(192, 150 + b, 7, 0, 7); g.fill();
      g.strokeStyle = '#222'; g.lineWidth = 3;
      g.beginPath(); g.arc(180, 158 + b, 12, 0.1, PI - 0.4); g.stroke();
      g.beginPath(); g.arc(204, 158 + b, 12, 0.4, PI - 0.1); g.stroke();
      g.fillStyle = '#c2185b'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center';
      g.fillText('MIAÚ MIAÚ MIAÚ', 192, 40);
      g.font = 'bold 20px sans-serif'; g.fillText('▶ Vicces cicák 10 órán át', 192, 240);
    } else if (st === 'broken') {
      g.fillStyle = '#1a1d22'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#39424d'; g.font = 'bold 24px sans-serif'; g.textAlign = 'center';
      g.fillText('NINCS JEL', w / 2, h / 2);
    } else {
      g.fillStyle = '#c9ccd0'; g.fillRect(0, 0, w, h);
    }
    this.screenTex.needsUpdate = true;
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
    this.cone.visible = this.coneRange > 0.15;
    this.cone.scale.setScalar(Math.max(0.01, this.coneRange));
  }

  avatar(id, p) {
    let a = this.avatars.get(id);
    if (!a) {
      const col = PLAYER_COLORS[p.seat % PLAYER_COLORS.length];
      const hairs = [0x3b2a1a, 0x111111, 0xc79a3a, 0x7a4a22, 0x9a3b1a];
      a = makeHuman({ shirt: col, pants: 0x34495e, hair: hairs[p.seat % hairs.length] });
      a.scale.setScalar(0.9);
      a.userData.x = p.x; a.userData.z = p.z; a.userData.yaw = p.yaw; a.userData.sp = 0;
      this.scene.add(a);
      this.avatars.set(id, a);
    }
    return a;
  }

  // ---- állapot -> látvány --------------------------------------------
  update(s, meId, dt, t, me) {
    const k = 1 - Math.exp(-dt * 12);
    const dark = s.phase === 'lobby' ? false : isDark(s);

    // fények
    this.bright += ((dark ? 0.06 : 1) - this.bright) * (1 - Math.exp(-dt * 8));
    const b = this.bright;
    this.hemi.intensity = 0.1 + 1.45 * b;
    this.sun.intensity = 0.06 + 1.25 * b;
    this.lampMat.color.setScalar(0.2 + 0.8 * b);
    this.skyMat.color.setScalar(0.55 + 0.45 * b);
    this.scene.background.setRGB(0.06 * b, 0.08 * b, 0.11 * b);

    if (s.items && s.phase !== 'lobby') {
      this.rocker.rotation.z = s.lights ? 0.25 : -0.25;
      this.fuseLever.position.y = P.fuse.y - 0.12 + (s.power ? 0.06 : -0.06);
      this.plug.position.set(P.outlet.x + (s.plug ? 0 : 0.1), s.plug ? P.outlet.y : 0.04, ROOM.z0 + (s.plug ? 0.06 : 0.25));
      this.sash.rotation.y += ((s.win ? 0.9 : 0) - this.sash.rotation.y) * k;
      this.cracks[0].visible = !s.glass[0]; this.cracks[1].visible = !s.glass[1];
      s.lockers.forEach((o, i) => { const d = this.lockerDoors[i]; d.rotation.y += ((o ? 1.9 : 0) - d.rotation.y) * k; });
      this.trap.cushion.visible = s.chairTrap === 'cushion';
      this.trap.glue.visible = s.chairTrap === 'glue';
      this.clock.visible = s.clock;
      this.clockHand.rotation.z = -(1 - s.t / 300) * PI * 2;
      this.globe.visible = s.globe;
      this.plant.rotation.z += ((s.plant ? 0 : 1.45) - this.plant.rotation.z) * k;

      const ps = projState(s);
      this.beam.visible = ps === 'on' || ps === 'meme';
      this.projector.rotation.z = s.proj === 'broken' ? 0.5 : 0;
      this.projector.rotation.x = s.proj === 'broken' ? 0.3 : 0;
      const sk = ps + (ps === 'meme' ? Math.floor(t * 12) : '');
      if (sk !== this.keys.screen) { this.keys.screen = sk; this.drawScreen(ps, t); }
      const bk = Math.round(s.board * 6) + '|' + s.doodle;
      if (bk !== this.keys.board) { this.keys.board = bk; this.drawBoard(s); }

      this.cloud.visible = !!s.cloud;
      if (s.cloud) {
        this.cloud.position.set(s.cloud.x, 0, s.cloud.z);
        this.cloud.rotation.y = t * 0.3;
        this.cloud.scale.setScalar(Math.min(1, (9 - s.cloud.t) * 2, s.cloud.t));
      }

      // tárgyak
      let myType = null;
      for (const it of s.items) {
        let m = this.itemMeshes.get(it.id);
        if (!m || m.userData.type !== it.type) {
          if (m) this.scene.remove(m);
          m = new THREE.Group();
          const model = makeItem(it.type);
          m.add(model);
          const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 20), new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
          ring.rotation.x = -PI / 2; ring.position.y = 0.008;
          m.add(ring);
          m.userData = { type: it.type, model, ring };
          this.scene.add(m);
          this.itemMeshes.set(it.id, m);
        }
        const hidden = it.gone || (it.loc && !s.lockers[+it.loc[1]]) || it.held === meId;
        m.visible = !hidden;
        if (it.held === meId) myType = it.type;
        if (hidden) continue;
        const u = m.userData;
        if (it.held != null) {
          const av = this.avatars.get(it.held);
          u.ring.visible = false;
          if (av) {
            const yaw = av.rotation.y;
            m.position.set(av.position.x + Math.sin(yaw) * 0.3 - Math.cos(yaw) * 0.25, 1.0, av.position.z + Math.cos(yaw) * 0.3 + Math.sin(yaw) * 0.25);
            m.rotation.y = yaw;
          }
          u.model.position.y = 0;
        } else {
          m.position.set(it.x, it.y, it.z);
          u.ring.visible = !(it.type === 'laptop' && s.laptop === 'desk') && !it.placed;
          u.ring.scale.setScalar(1 + Math.sin(t * 4 + it.id) * 0.12);
          u.model.position.y = it.type === 'laptop' || it.placed ? 0 : 0.03 + Math.sin(t * 2.5 + it.id) * 0.02;
          m.rotation.y = it.type === 'laptop' ? 0 : it.ringing ? Math.sin(t * 40) * 0.25 : it.id * 1.7;
          if (it.type === 'laptop' && u.model.userData.screen) u.model.userData.screen.material.color.setHex(s.lapBroken ? 0x111111 : 0x7fc8ff);
        }
      }
      for (const [id, m] of this.itemMeshes) if (!s.items[id]) { this.scene.remove(m); this.itemMeshes.delete(id); }
      this.setViewModel(myType);
    } else {
      this.setViewModel(null);
    }

    // Taba
    const T = s.taba;
    const tg = this.taba;
    tg.position.x += (T.x - tg.position.x) * k;
    tg.position.z += (T.z - tg.position.z) * k;
    this.tabaYaw = lerpAngle(this.tabaYaw, T.yaw, 1 - Math.exp(-dt * 16));
    tg.rotation.y = this.tabaYaw;
    poseHuman(tg, T.st, t, T.sit);
    this.cone.position.x = tg.position.x; this.cone.position.z = tg.position.z;
    this.cone.rotation.y = this.tabaYaw;
    this.setCone(T.fov, s.phase === 'play' ? T.range : 0);
    let alert = 0;
    for (const p of Object.values(s.players)) alert = Math.max(alert, p.sus || 0);
    this.coneMat.color.setHex(alert > 0.05 ? 0xff3b3b : T.st === 'warn' ? 0xffd23b : T.range > 3.5 ? 0xffa53b : 0x35d07f);
    this.coneMat.opacity = alert > 0.05 ? 0.4 : 0.2;

    // többi játékos
    for (const [id, p] of Object.entries(s.players)) {
      if (id === meId) continue;
      const a = this.avatar(id, p);
      const u = a.userData;
      const px = a.position.x, pz = a.position.z;
      u.x += (p.x - u.x) * k; u.z += (p.z - u.z) * k;
      a.position.set(u.x, 0, u.z);
      u.yaw = lerpAngle(u.yaw, p.yaw, k);
      a.rotation.y = u.yaw;
      const sp = Math.hypot(a.position.x - px, a.position.z - pz) / Math.max(dt, 1e-3);
      u.sp += (sp - u.sp) * 0.2;
      poseHuman(a, u.sp > 0.3 ? 'walk' : p.act ? 'fix' : '', t, false);
    }
    for (const [id, a] of this.avatars) if (!s.players[id] || id === meId) { this.scene.remove(a); this.avatars.delete(id); }

    // kamera
    if (me) {
      this.camera.position.set(me.x, EYE + (me.bob || 0), me.z);
      this.camera.rotation.set(me.pitch, me.yaw + PI, 0);
    }
    this.vmKick *= Math.exp(-dt * 14);
    this.vm.position.z = -0.5 + this.vmKick * 0.12;
    this.vm.rotation.x = this.vmKick * 0.25;

    // effektek
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      if (f.step(Math.min(1, f.t / f.dur)) === false || f.t >= f.dur) {
        this.scene.remove(f.obj);
        this.fx.splice(i, 1);
      }
    }
  }

  spawnFx(ev) {
    const S = this.scene;
    const lerp3 = (obj, a, b, u, arc = 0) => obj.position.set(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + Math.sin(u * PI) * arc, a[2] + (b[2] - a[2]) * u);
    const len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    if (ev.e === 'dart') {
      const m = new THREE.Group();
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8), new THREE.MeshBasicMaterial({ color: 0xff7a1a }));
      d.rotation.x = PI / 2; m.add(d);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0x2a6fdb }));
      tip.position.z = 0.12; m.add(tip);
      S.add(m);
      m.position.set(...ev.from);
      m.lookAt(...ev.to);
      this.fx.push({ obj: m, t: 0, dur: Math.max(0.06, len(ev.from, ev.to) / 45), step: (u) => lerp3(m, ev.from, ev.to, u) });
    } else if (ev.e === 'puff') {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: ev.c || 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }));
      m.position.set(ev.x, ev.y, ev.z);
      S.add(m);
      this.fx.push({ obj: m, t: 0, dur: 0.45, step: (u) => { m.scale.setScalar(1 + u * 3); m.material.opacity = 0.8 * (1 - u); } });
    } else if (ev.e === 'plane') {
      const m = makeItem('plane');
      m.scale.setScalar(1.6);
      S.add(m);
      m.position.set(...ev.from);
      m.lookAt(...ev.to);
      this.fx.push({ obj: m, t: 0, dur: Math.max(0.2, len(ev.from, ev.to) / 9), step: (u) => lerp3(m, ev.from, ev.to, u, 0.25) });
    } else if (ev.e === 'lob') {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: ev.c || 0x6fd13f }));
      S.add(m);
      this.fx.push({ obj: m, t: 0, dur: Math.max(0.25, len(ev.from, ev.to) / 12), step: (u) => lerp3(m, ev.from, ev.to, u, 0.8) });
    }
  }

  kick() { this.vmKick = 1; }

  // világ -> képernyő (feliratokhoz)
  project(x, y, z) {
    const v = this.v.set(x, y, z).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.w, y: (-v.y * 0.5 + 0.5) * this.h, ok: v.z > -1 && v.z < 1 };
  }

  render() { this.renderer.render(this.scene, this.camera); }
}
