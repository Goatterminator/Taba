// Kerti kísérletek: inga (időzítés), emelő (egyensúly), napóra (beállítás).
// openMg(kind, hard, done) – done(true) siker, done(false) feladás/kudarc.
const $ = (id) => document.getElementById(id);
let cur = null;

export function mgOpen() { return !!cur; }
export function closeMg() {
  if (!cur) return;
  cancelAnimationFrame(cur.raf);
  $('mgUI').hidden = true;
  cur = null;
}

export function openMg(kind, hard, done) {
  closeMg();
  const ui = $('mgUI'), cv = $('mgCanvas'), g = cv.getContext('2d');
  const W = 360, H = 220, dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr;
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  ui.hidden = false;
  const btn = $('mgBtn'), info = $('mgInfo'), title = $('mgTitle');
  const st = { kind, t0: performance.now(), last: performance.now(), ok: 0, fail: false, hold: 0, v: 0, ang: 0, x: 0.5, dial: 0, won: false };
  cur = st;
  const finish = (ok) => { if (!cur || cur !== st) return; st.won = ok; info.textContent = ok ? 'Sikerült – kaptál egy magot!' : 'Nem sikerült. Próbáld újra később.'; setTimeout(() => { if (cur === st) { closeMg(); done(ok); } }, 700); st.done = true; };
  $('mgQuit').onclick = () => { closeMg(); done(false); };
  const limit = 18 - hard;
  $('mgBtnL').hidden = $('mgBtnR').hidden = kind !== 'emelo';
  $('mgBtn').hidden = kind === 'emelo';

  if (kind === 'inga') {
    title.textContent = 'Inga – időzítés';
    info.textContent = 'Koppints, amikor a súly a zöld sávban van. Háromszor egymás után!';
    btn.textContent = 'MOST';
    btn.onclick = () => {
      if (st.done) return;
      const zone = 0.3 - hard * 0.03;
      if (Math.abs(st.ang) < zone) { st.ok++; st.flash = 'ok'; if (st.ok >= 3) finish(true); }
      else { st.ok = 0; st.flash = 'bad'; }
      st.flashT = 0.25;
    };
  } else if (kind === 'emelo') {
    title.textContent = 'Emelő – egyensúly';
    info.textContent = 'Húzd a súlyt (vagy tartsd a gombokat), amíg a rúd vízszintes. Tartsd 2 mp-ig!';
    btn.textContent = 'KÉSZ';
    btn.onclick = () => {};
    st.target = 0.25 + Math.random() * 0.5;
    const drag = (e) => { const r = cv.getBoundingClientRect(); st.x = Math.max(0.05, Math.min(0.95, (e.clientX - r.left) / r.width)); };
    cv.onpointerdown = (e) => { st.dragging = true; drag(e); cv.setPointerCapture?.(e.pointerId); };
    cv.onpointermove = (e) => { if (st.dragging) drag(e); };
    cv.onpointerup = () => { st.dragging = false; };
  } else {
    title.textContent = 'Napóra – beállítás';
    info.textContent = 'Forgasd a számlapot, hogy az árnyék a jelzett órára essen, aztán nyomd meg a gombot.';
    btn.textContent = 'RÖGZÍT';
    st.goal = (Math.floor(Math.random() * 6) + 9);
    st.dial = (Math.random() - 0.5) * 2;
    let lx = null;
    cv.onpointerdown = (e) => { lx = e.clientX; cv.setPointerCapture?.(e.pointerId); };
    cv.onpointermove = (e) => { if (lx != null) { st.dial += (e.clientX - lx) * 0.01; lx = e.clientX; } };
    cv.onpointerup = () => { lx = null; };
    btn.onclick = () => {
      if (st.done) return;
      const err = Math.abs(Math.atan2(Math.sin(st.shadow - st.goalAng), Math.cos(st.shadow - st.goalAng)));
      if (err < 0.18 - hard * 0.02) finish(true); else { st.flash = 'bad'; st.flashT = 0.3; info.textContent = 'Nem pontos – az árnyék vándorol, próbáld újra!'; }
    };
  }

  const frame = (now) => {
    if (cur !== st) return;
    const dt = Math.min(0.05, (now - st.last) / 1000); st.last = now;
    const el = (now - st.t0) / 1000;
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#0f2a1d'; g.fillRect(0, 0, W, H);
    if (st.flashT > 0) { st.flashT -= dt; g.fillStyle = st.flash === 'ok' ? 'rgba(74,222,128,.25)' : 'rgba(248,113,113,.25)'; g.fillRect(0, 0, W, H); }
    if (kind === 'inga') {
      const speed = 1.8 + st.ok * 0.35 + hard * 0.2;
      st.ang = Math.sin(el * speed) * 0.9;
      const px = W / 2, py = 20, L = 150;
      const zone = 0.3 - hard * 0.03;
      g.fillStyle = 'rgba(74,222,128,.25)';
      g.beginPath(); g.moveTo(px, py); g.arc(px, py, L + 20, PI2(0.5) - zone, PI2(0.5) + zone); g.fill();
      const bx = px + Math.sin(st.ang) * L, by = py + Math.cos(st.ang) * L;
      g.strokeStyle = '#e5e7eb'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py); g.lineTo(bx, by); g.stroke();
      g.fillStyle = '#d97706'; g.beginPath(); g.arc(bx, by, 14, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.font = '700 16px sans-serif'; g.fillText(`${st.ok}/3`, 12, 24);
    } else if (kind === 'emelo') {
      if (!st.dragging) st.x += (($('mgBtnL').pressed ? -1 : 0) + ($('mgBtnR').pressed ? 1 : 0)) * dt * 0.35;
      st.x = Math.max(0.05, Math.min(0.95, st.x));
      const want = (st.x - st.target) * 1.6 + Math.sin(el * 3.1) * 0.03 * (1 + hard);
      st.v += (want - st.ang) * dt * 6; st.v *= 0.9; st.ang += st.v * dt * 6;
      const cx = W / 2, cy = 130;
      g.fillStyle = '#6b7280'; g.beginPath(); g.moveTo(cx - 16, cy + 30); g.lineTo(cx + 16, cy + 30); g.lineTo(cx, cy); g.fill();
      g.save(); g.translate(cx, cy); g.rotate(st.ang);
      g.fillStyle = '#b7804a'; g.fillRect(-150, -5, 300, 10);
      g.fillStyle = '#1f2937'; g.fillRect(-140, -32, 30, 27);
      g.fillStyle = '#facc15'; g.fillRect(-10 + (st.x - 0.5) * 280, -24, 20, 19);
      g.restore();
      const ok = Math.abs(st.ang) < 0.09;
      st.hold = ok ? st.hold + dt : 0;
      g.fillStyle = ok ? '#4ade80' : '#fff'; g.font = '700 15px sans-serif';
      g.fillText(ok ? `Egyensúly: ${(2 - st.hold).toFixed(1)} mp` : 'Billeg…', 12, 24);
      if (st.hold >= 2 && !st.done) finish(true);
    } else {
      const cx = W / 2, cy = 150, R = 110;
      const hourAng = (h) => -Math.PI + ((h - 6) / 12) * Math.PI; // 6 balra, 12 fent, 18 jobbra
      st.goalAng = hourAng(st.goal);
      st.shadow = hourAng(12) + Math.sin(el * 0.7) * 0.25 + st.dial;
      g.fillStyle = '#d6d3d1'; g.beginPath(); g.arc(cx, cy, R, Math.PI, 0); g.fill();
      g.fillStyle = '#44403c'; g.font = '12px sans-serif'; g.textAlign = 'center';
      for (let h = 6; h <= 18; h += 2) { const a = hourAng(h); g.fillText(String(h), cx + Math.cos(a) * (R - 14), cy + Math.sin(a) * (R - 14) + 4); }
      g.strokeStyle = '#b91c1c'; g.lineWidth = 3;
      g.beginPath(); g.arc(cx, cy, R + 6, st.goalAng - 0.06, st.goalAng + 0.06); g.stroke();
      g.textAlign = 'left';
      g.strokeStyle = '#1c1917'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(st.shadow) * (R - 26), cy + Math.sin(st.shadow) * (R - 26)); g.stroke();
      g.fillStyle = '#fff'; g.font = '700 15px sans-serif'; g.fillText(`Állítsd az árnyékot ${st.goal} órára (piros jel)`, 12, 24);
    }
    const left = limit - el;
    g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(0, H - 6, W, 6);
    g.fillStyle = '#ffd84d'; g.fillRect(0, H - 6, W * Math.max(0, left / limit), 6);
    if (left <= 0 && !st.done) finish(false);
    st.raf = requestAnimationFrame(frame);
  };
  st.raf = requestAnimationFrame(frame);
}
const PI2 = (x) => Math.PI * x;

// tartható gombok (emelő)
for (const id of ['mgBtnL', 'mgBtnR']) {
  const b = document.getElementById(id);
  if (!b) continue;
  const on = (v) => (e) => { e.preventDefault(); b.pressed = v; };
  b.addEventListener('pointerdown', on(true));
  for (const n of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(n, on(false));
}
