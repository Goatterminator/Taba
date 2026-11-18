// Grafikai minőség: felbontás, árnyékok, fények és színek, köd. Mindkét pálya ugyanezt használja.
import * as THREE from '../vendor/three.module.min.js';

export const PRESETS = {
  low: { res: 0.7, shadows: 0, pretty: false, fog: false },
  mid: { res: 1.0, shadows: 0, pretty: true, fog: true },
  high: { res: 1.0, shadows: 1024, pretty: true, fog: true },
  ultra: { res: 1.4, shadows: 2048, pretty: true, fog: true },
};
export const PRESET_NAMES = { low: 'Alacsony', mid: 'Közepes', high: 'Magas', ultra: 'Ultra' };
export const DEFAULTS = { preset: 'mid', ...PRESETS.mid, antialias: true, fov: 68, fps: false, master: 1, music: 0.6, sfx: 1, sens: 1 };

// a lapos felületek (falak, padló, plakátok) nem vetnek árnyékot, a tárgyak és emberek igen
const FLAT = new Set(['PlaneGeometry', 'CircleGeometry', 'RingGeometry']);
export function flagShadows(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    const lit = m && !m.isMeshBasicMaterial;
    o.receiveShadow = !!lit && !m.transparent;
    o.castShadow = !!lit && !m.transparent && !FLAT.has(o.geometry.type);
  });
}

// renderer-szintű beállítások (mindkét pályára egyszerre)
export function applyRenderer(renderer, cfg) {
  renderer.setPixelRatio(Math.max(0.5, Math.min(window.devicePixelRatio || 1, 2) * cfg.res));
  const sh = cfg.shadows > 0;
  const tone = cfg.pretty ? THREE.NeutralToneMapping : THREE.NoToneMapping;
  const changed = renderer.shadowMap.enabled !== sh || renderer.toneMapping !== tone || renderer.shadowMap.type !== (cfg.shadows >= 2048 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap);
  renderer.shadowMap.enabled = sh;
  renderer.shadowMap.type = cfg.shadows >= 2048 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.toneMapping = tone;
  renderer.toneMappingExposure = cfg.pretty ? 1.08 : 1;
  renderer.domElement.classList.toggle('grade', !!cfg.pretty && cfg.shadows > 0);
  return changed;
}

// pályaszintű beállítások; opt: { light, center: [x, z], half, lamps: [[x, y, z]...], fogColor }
export function applyWorld(world, cfg, opt, materialsDirty) {
  const L = opt.light;
  const sh = cfg.shadows > 0;
  L.castShadow = sh;
  if (sh) {
    if (L.shadow.mapSize.x !== cfg.shadows) {
      L.shadow.mapSize.set(cfg.shadows, cfg.shadows);
      if (L.shadow.map) { L.shadow.map.dispose(); L.shadow.map = null; }
    }
    const c = L.shadow.camera;
    c.left = -opt.half; c.right = opt.half; c.top = opt.half; c.bottom = -opt.half; c.near = 0.5; c.far = 80;
    c.updateProjectionMatrix();
    L.shadow.bias = -0.0006; L.shadow.normalBias = 0.03;
    L.shadow.radius = cfg.shadows >= 2048 ? 3 : 1;
    flagShadows(world.scene);
  }
  world.shadowsOn = sh;
  // árnyékkal kevesebb kitöltő fény, erősebb nap – különben az árnyék nem látszik
  world.hemiK = sh ? 0.62 : 1;
  world.sunK = sh ? 1.9 : 1;
  // mennyezeti lámpák lágy fénye
  if (!world.lampLights) {
    world.lampLights = (opt.lamps || []).map(([x, y, z]) => {
      const p = new THREE.PointLight(0xfff4e0, 5, 9, 1.6);
      p.position.set(x, y, z);
      world.scene.add(p);
      return p;
    });
  }
  for (const p of world.lampLights) p.visible = !!cfg.pretty;
  world.scene.fog = cfg.fog && opt.fogColor != null ? new THREE.Fog(opt.fogColor, 18, 60) : null;
  world.fovSetting = cfg.fov;
  if (world.resize) world.resize();
  if (materialsDirty) world.scene.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; }); });
}
