// Irányítás: érintés (bal oldalon joystick, jobb oldalon nézelődés) és billentyűzet + egér.
export class Controls {
  constructor(layer, joy, knob) {
    this.move = { x: 0, y: 0 }; // x: jobbra, y: előre
    this.yaw = Math.PI; this.pitch = 0;
    this.enabled = false;
    this.touch = matchMedia('(pointer: coarse)').matches;
    this.onUse = () => {}; this.onDrop = () => {}; this.onAct = () => {};
    this.keys = new Set();
    this.joyId = null; this.lookId = null;
    this.layer = layer;

    const R = 52;
    layer.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      if (e.pointerType === 'mouse') {
        if (document.pointerLockElement !== layer) layer.requestPointerLock?.();
        else if (e.button === 0) this.onUse();
        return;
      }
      e.preventDefault();
      if (e.clientX < innerWidth * 0.42 && this.joyId === null) {
        this.joyId = e.pointerId;
        this.jx = e.clientX; this.jy = e.clientY;
        joy.style.left = this.jx + 'px'; joy.style.top = this.jy + 'px';
        joy.classList.add('on');
        knob.style.transform = 'translate(-50%,-50%)';
      } else if (this.lookId === null) {
        this.lookId = e.pointerId;
        this.lx = e.clientX; this.ly = e.clientY;
      }
    });
    layer.addEventListener('pointermove', (e) => {
      if (!this.enabled) return;
      if (e.pointerType === 'mouse') {
        if (document.pointerLockElement === layer) this.look(e.movementX * 0.0024, e.movementY * 0.0024);
        return;
      }
      if (e.pointerId === this.joyId) {
        let dx = e.clientX - this.jx, dy = e.clientY - this.jy;
        const d = Math.hypot(dx, dy);
        if (d > R) { dx *= R / d; dy *= R / d; }
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        this.tmove = { x: dx / R, y: -dy / R };
      } else if (e.pointerId === this.lookId) {
        this.look((e.clientX - this.lx) * 0.0055, (e.clientY - this.ly) * 0.0055);
        this.lx = e.clientX; this.ly = e.clientY;
      }
    });
    const up = (e) => {
      if (e.pointerId === this.joyId) { this.joyId = null; this.tmove = null; joy.classList.remove('on'); }
      if (e.pointerId === this.lookId) this.lookId = null;
    };
    layer.addEventListener('pointerup', up);
    layer.addEventListener('pointercancel', up);
    layer.addEventListener('contextmenu', (e) => e.preventDefault());

    addEventListener('keydown', (e) => {
      if (!this.enabled || e.repeat || e.target.tagName === 'INPUT') return;
      const k = e.code;
      this.keys.add(k);
      if (k === 'KeyE') this.onAct(true);
      if (k === 'KeyF') this.onUse();
      if (k === 'KeyQ' || k === 'KeyG') this.onDrop();
    });
    addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'KeyE') this.onAct(false);
    });
    addEventListener('blur', () => { this.keys.clear(); this.onAct(false); });
  }

  look(dx, dy) {
    this.yaw -= dx;
    this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch - dy));
  }

  update() {
    if (this.tmove) { this.move.x = this.tmove.x; this.move.y = this.tmove.y; return; }
    const k = this.keys;
    let x = 0, y = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    const d = Math.hypot(x, y) || 1;
    this.move.x = x / d; this.move.y = y / d;
  }

  release() {
    if (document.pointerLockElement) document.exitPointerLock?.();
    this.keys.clear(); this.tmove = null; this.joyId = this.lookId = null;
    this.move.x = this.move.y = 0;
  }
}
