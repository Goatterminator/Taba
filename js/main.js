// Fő vezérlés: menük, játékhurok, hálózat összekötése a szimulációval és a megjelenítéssel.
import { World, studentLook } from './world.js';
import { Sim } from './sim.js';
import { Controls } from './controls.js';
import { createNet, makeCode } from './net.js';
import { play, speak, unlockAudio, setMuted } from './audio.js';
import { ITEMS, EYE, METER_MAX, WC_LIMIT, SKINS, skinById, coinReward, inWC, interactions, collide } from './data.js';

const $ = (id) => document.getElementById(id);
const PI = Math.PI;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* privát mód */ } },
};

const world = new World($('c'));
const ctl = new Controls($('touch'), $('joy'), $('joyKnob'));

// háttér a menü mögé: egy „néma” óra
let preview = makePreview();
function makePreview() {
  const p = new Sim();
  p.addPlayer('_', '');
  p.start();
  return p;
}

let mode = 'menu'; // menu | lobby | play | end
let role = null; // solo | host | client
let sim = null, net = null, code = '';
let view = preview.s;
let myId = '_';
const me = { x: 0, z: 4, yaw: PI, pitch: 0, bob: 0 };
let target = null, actDown = false;
let lastSim = performance.now(), lastSnap = 0, lastPos = 0, lastRing = 0, walkT = 0;
let muted = store.get('taba.muted') === '1';
let faceT = 0, shopSel = null;

// ---- érmék és skinek (a készüléken tárolva) ----------------------------------
const wallet = {
  coins: Math.max(0, parseInt(store.get('taba.coins') || '0', 10) || 0),
  owned: (() => { try { const o = JSON.parse(store.get('taba.owned') || '[]'); return Array.isArray(o) ? o : []; } catch { return []; } })(),
  skin: store.get('taba.skin') || 'alap',
};
if (!wallet.owned.includes('alap')) wallet.owned.push('alap');
if (!wallet.owned.includes(wallet.skin)) wallet.skin = 'alap';
function saveWallet() {
  store.set('taba.coins', String(wallet.coins));
  store.set('taba.owned', JSON.stringify(wallet.owned));
  store.set('taba.skin', wallet.skin);
  $('menuCoins').textContent = wallet.coins;
  $('shopCoins').textContent = wallet.coins;
}
setMuted(muted);

// ---- menü ---------------------------------------------------------------
const nameInput = $('name'), codeInput = $('code');
nameInput.value = store.get('taba.name') || '';
const urlRoom = new URLSearchParams(location.search).get('room');
if (urlRoom) codeInput.value = urlRoom.toUpperCase().slice(0, 4);
const myName = () => {
  const n = nameInput.value.trim() || 'Diák' + Math.floor(Math.random() * 90 + 10);
  store.set('taba.name', nameInput.value.trim());
  return n;
};
function show(id) {
  for (const s of ['menu', 'lobby', 'end', 'help', 'shop']) $(s).hidden = s !== id;
}
function menuMsg(t) { $('menuMsg').textContent = t || ''; $('menuMsg').hidden = !t; }

$('btnSolo').onclick = () => {
  unlockAudio();
  role = 'solo'; myId = 'me';
  sim = new Sim(onSimEvent);
  sim.addPlayer(myId, myName(), wallet.skin);
  sim.start();
  view = sim.s;
};
$('btnHost').onclick = () => {
  unlockAudio();
  menuMsg('Szoba létrehozása…');
  code = makeCode();
  const n = createNet(code, true);
  net = n;
  n.onOpen = () => {
    role = 'host'; myId = 'host';
    sim = new Sim(onSimEvent);
    sim.addPlayer(myId, myName(), wallet.skin);
    view = sim.s;
    enterLobby();
  };
  n.onMsg = (pid, m) => {
    if (!sim || !m) return;
    if (m.t === 'hello') {
      if (!sim.s.players[pid]) sim.addPlayer(pid, m.name, m.skin);
      n.send(pid, { t: 'hi', pid });
      n.send(pid, { t: 's', s: sim.s });
    } else sim.handle(pid, m);
  };
  n.onLeave = (pid) => sim && sim.removePlayer(pid);
  n.onError = (t) => { if (net === n) { leave(); menuMsg(t); } };
};
$('btnJoin').onclick = () => {
  unlockAudio();
  const c = codeInput.value.trim().toUpperCase();
  if (c.length !== 4) { menuMsg('Írd be a 4 betűs szobakódot!'); return; }
  menuMsg('Csatlakozás…');
  code = c;
  const n = createNet(code, false);
  net = n;
  n.onOpen = () => n.send('host', { t: 'hello', name: myName(), skin: wallet.skin });
  n.onMsg = (_, m) => {
    if (!m) return;
    if (m.t === 'hi') { myId = m.pid; role = 'client'; }
    else if (m.t === 's' && role === 'client') { view = m.s; if (mode === 'menu') enterLobby(); }
    else if (m.t === 'ev') handleEvent(m.ev);
  };
  n.onError = (t) => { if (net === n) { leave(); menuMsg(t); } };
  n.onClose = () => { if (net === n) { leave(); menuMsg('A szoba megszűnt (a gazdája kilépett).'); } };
};
$('btnHelp').onclick = () => show('help');

// ---- bolt ---------------------------------------------------------------
function renderShop() {
  const grid = $('skinGrid');
  grid.textContent = '';
  for (const sk of SKINS) {
    const b = document.createElement('button');
    const owned = wallet.owned.includes(sk.id);
    b.className = 'skin' + (sk.id === shopSel ? ' sel' : '') + (sk.id === wallet.skin ? ' eq' : '') + (!owned && sk.price > wallet.coins ? ' poor' : '');
    const col = '#' + studentLook(sk.id, 0).shirt.toString(16).padStart(6, '0');
    b.innerHTML = `<span class="ic" style="--c:${col}"></span><span class="nm"></span><span class="pr"></span>`;
    b.querySelector('.ic').textContent = sk.icon;
    b.querySelector('.nm').textContent = sk.name;
    b.querySelector('.pr').textContent = sk.id === wallet.skin ? '✔ Rajtad' : owned ? 'Megvan' : `🪙 ${sk.price}`;
    b.onclick = () => { shopSel = sk.id; renderShop(); };
    grid.appendChild(b);
  }
  const sel = skinById(shopSel);
  const btn = $('btnShopBuy');
  const owned = wallet.owned.includes(sel.id);
  btn.disabled = sel.id === wallet.skin || (!owned && sel.price > wallet.coins);
  btn.textContent = sel.id === wallet.skin ? `✔ ${sel.name} rajtad van` : owned ? `Felveszem: ${sel.name}` : sel.price > wallet.coins ? `Még ${sel.price - wallet.coins} 🪙 kell` : `Megveszem: ${sel.name} (🪙 ${sel.price})`;
  $('shopCoins').textContent = wallet.coins;
}
$('btnShop').onclick = () => { unlockAudio(); shopSel = wallet.skin; mode = 'shop'; show('shop'); renderShop(); };
$('btnShopClose').onclick = () => { mode = 'menu'; show('menu'); };
$('btnShopBuy').onclick = () => {
  const sk = skinById(shopSel);
  if (!wallet.owned.includes(sk.id)) {
    if (sk.price > wallet.coins) return;
    wallet.coins -= sk.price;
    wallet.owned.push(sk.id);
    play('win');
  } else play('pick');
  wallet.skin = sk.id;
  saveWallet();
  renderShop();
};
saveWallet();
$('btnHelpClose').onclick = () => show('menu');
$('btnLeave').onclick = () => leave();
$('btnEndExit').onclick = () => leave();
$('btnStart').onclick = () => { if (sim) sim.start(); };
$('btnAgain').onclick = () => { if (sim) sim.start(); };
$('btnExit').onclick = () => { ctl.release(); if (confirm('Kilépsz az óráról?')) leave(); };
$('btnMute').onclick = () => {
  muted = !muted; setMuted(muted); store.set('taba.muted', muted ? '1' : '0');
  $('btnMute').textContent = muted ? '🔇' : '🔊';
};
$('btnMute').textContent = muted ? '🔇' : '🔊';
$('btnShare').onclick = async () => {
  const url = `${location.origin}${location.pathname}?room=${code}`;
  try {
    if (navigator.share && ctl.touch) await navigator.share({ title: 'Taba', text: `Gyere szívatni! Szobakód: ${code}`, url });
    else { await navigator.clipboard.writeText(url); $('lobbyMsg').textContent = 'Link a vágólapon!'; }
  } catch { $('lobbyMsg').textContent = url; }
};
codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btnJoin').click(); });

// telepítés (PWA)
let installEvt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
$('btnInstall').onclick = async () => { if (installEvt) { installEvt.prompt(); installEvt = null; $('btnInstall').hidden = true; } };
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

function enterLobby() {
  mode = 'lobby';
  menuMsg('');
  show('lobby');
  $('lobbyCode').textContent = code;
  $('btnStart').hidden = role !== 'host';
  $('lobbyMsg').textContent = role === 'host' ? 'Add meg a kódot a többieknek, aztán csengess be!' : 'Várakozás a becsengetésre…';
}
function enterPlay() {
  mode = 'play';
  show(null);
  $('hud').hidden = false;
  const p = view.players[myId];
  if (p) { me.x = p.x; me.z = p.z; ctl.yaw = p.yaw; ctl.pitch = 0; }
  ctl.enabled = true;
  $('toasts').textContent = '';
  actDown = false;
  lastSim = performance.now();
  if (ctl.touch) {
    try { document.documentElement.requestFullscreen?.({ navigationUI: 'hide' })?.catch(() => {}); } catch { /* ignore */ }
    try { screen.orientation?.lock?.('landscape')?.catch(() => {}); } catch { /* ignore */ }
  }
}
function enterEnd() {
  mode = 'end';
  ctl.enabled = false; ctl.release();
  $('hud').hidden = true;
  const won = view.phase === 'won';
  $('endTitle').textContent = won ? 'GYŐZELEM! 🎉' : 'LEBUKTATOK! 😬';
  $('endReason').textContent = view.reason;
  const left = Math.ceil(view.t);
  const mine = view.players[myId];
  const reward = coinReward(view, mine);
  wallet.coins += reward;
  saveWallet();
  $('endStats').innerHTML = `<div><b>${Math.floor(view.meter)}%</b>szívatás</div><div><b>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b>maradt</div><div><b>${view.strikes}/3</b>lebukás</div><div><b>+${reward} 🪙</b>érme (össz.: ${wallet.coins})</div>`;
  $('btnAgain').hidden = role === 'client';
  $('endWait').hidden = role !== 'client';
  show('end');
  play(won ? 'win' : 'lose');
}
function leave() {
  if (net) { const n = net; net = null; n.close(); }
  sim = null; role = null; myId = '_';
  preview = makePreview();
  view = preview.s;
  mode = 'menu';
  ctl.enabled = false; ctl.release();
  $('hud').hidden = true;
  show('menu');
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* ignore */ }
}

// ---- események -----------------------------------------------------------
function onSimEvent(ev) {
  handleEvent(ev);
  if (net) net.broadcast({ t: 'ev', ev });
}
function toast(text, kind = 'info') {
  const box = $('toasts');
  const d = document.createElement('div');
  d.className = 'toast ' + kind;
  d.textContent = text;
  box.appendChild(d);
  while (box.children.length > 5) box.firstChild.remove();
  setTimeout(() => d.remove(), 3300);
}
let bannerTimer = 0;
// rajzolt kéz: n ujj felemelve
function handSvg(n) {
  let f = '';
  for (let i = 0; i < 4; i++) {
    const up = i < n;
    f += `<rect x="${20 + i * 21}" y="${up ? 8 : 52}" width="19" height="${up ? 78 : 30}" rx="9.5"/>`;
  }
  return `<svg class="hand" viewBox="0 0 124 150" aria-hidden="true"><g fill="#f0c8a0" stroke="#5a3a20" stroke-width="4">${f}<rect x="14" y="62" width="92" height="76" rx="22"/><rect x="88" y="82" width="20" height="42" rx="10" transform="rotate(-35 98 103)"/></g></svg>`;
}
function banner(big, small, fingers = 0) {
  const b = $('banner');
  b.hidden = true;
  void b.offsetWidth;
  b.textContent = big;
  if (fingers) b.insertAdjacentHTML('afterbegin', handSvg(fingers));
  if (small) { const s = document.createElement('small'); s.textContent = small; b.appendChild(s); }
  b.hidden = false;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => (b.hidden = true), 1900);
}
function handleEvent(ev) {
  if (!ev) return;
  switch (ev.e) {
    case 'gain': toast(`+${ev.v}  ${ev.m}`, 'good'); play('gain'); break;
    case 'toast': if (!ev.pid || ev.pid === myId) toast(ev.m, ev.k); break;
    case 'say': {
      if (mode !== 'play') break;
      const T = view.taba;
      let vol = 1 - Math.hypot(T.x - me.x, T.z - me.z) / 16;
      if (inWC(T.x) !== inWC(me.x)) vol *= 0.55;
      speak(ev.m, ev.mood, ev.mood === 'yell' ? 1 : vol);
      break;
    }
    case 'snd': play(ev.n); break;
    case 'strike':
      banner(ev.m, ev.hit ? 'Eltaláltátok Tabát!' : ev.name ? `Taba elkapta: ${ev.name}${ev.wc ? ' a mosdóban' : ''}` : '', ev.hit ? 0 : Math.min(ev.n, 3));
      play('strike');
      if (ev.pid === myId) faceT = 2.8;
      try { navigator.vibrate?.(ev.pid === myId ? [120, 60, 200] : 80); } catch { /* ignore */ }
      break;
    case 'tp':
      if (ev.pid === myId) { me.x = ev.x; me.z = ev.z; ctl.yaw = ev.yaw; ctl.pitch = 0; }
      break;
    case 'dart': case 'puff': case 'plane': case 'lob': world.spawnFx(ev); break;
  }
}

// ---- játékos bemenet -----------------------------------------------------
function send(msg) {
  if (role === 'client') net && net.send('host', msg);
  else if (sim) sim.handle(myId, msg);
}
function setAct(down) {
  if (mode !== 'play') return;
  if (down && !actDown) {
    actDown = true;
    if (target) send({ t: 'act', id: target.id });
  } else if (!down && actDown) {
    actDown = false;
    send({ t: 'stop' });
  }
}
function useItem() {
  if (mode !== 'play') return;
  const p = view.players[myId];
  const it = p && p.held != null ? view.items[p.held] : null;
  if (!it) return;
  const def = ITEMS[it.type];
  if (!def.use) { toast(`${def.name}: ${def.hint}`); return; }
  const cp = Math.cos(me.pitch);
  send({ t: 'use', ox: me.x, oy: EYE, oz: me.z, dx: Math.sin(me.yaw) * cp, dy: Math.sin(me.pitch), dz: Math.cos(me.yaw) * cp });
  if (it.type === 'ak' && it.ammo > 0) world.kick();
}
ctl.onAct = setAct;
ctl.onUse = useItem;
ctl.onDrop = () => { if (mode === 'play') send({ t: 'drop' }); };
const hold = (el, fn) => {
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ } fn(true); });
  for (const n of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(n, (e) => { e.preventDefault(); fn(false); });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
};
hold($('btnAct'), setAct);
hold($('btnUse'), (d) => d && useItem());
hold($('btnDrop'), (d) => d && send({ t: 'drop' }));

// ---- HUD ----------------------------------------------------------------
const ST = {
  laptop: '💻 laptopozik', projector: '📽️ a projektorral babrál', board: '✍️ a táblára ír', fix: '🔧 javít valamit',
  lecture: '🗣️ magyaráz – figyel!', walk: '🚶 járkál – figyel!', warn: '❓ gyanakszik…', glance: '👀 FELNÉZ!', look: '👀 odanéz!',
  count: '😡 számol!', stun: '😵 kiakadt', stuck: '🪑 odaragadt a székhez',
  yell: '🤬 ORDIBÁL!', slip: '🍌 elcsúszott!', scared: '🐍 sikít!', drag: '😠 visszavonszol valakit',
};
const cache = {};
function setText(el, key, v) { if (cache[key] !== v) { cache[key] = v; el.textContent = v; } }
const tags = new Map();

function updateHud() {
  const s = view, p = s.players[myId];
  const tl = Math.ceil(s.t);
  setText($('timer'), 'timer', `${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}`);
  $('timer').classList.toggle('low', tl <= 30);
  const pct = Math.floor((s.meter / METER_MAX) * 100);
  if (cache.pct !== pct) { cache.pct = pct; $('meterFill').style.width = pct + '%'; $('meterPct').textContent = pct + '%'; }
  if (cache.strikes !== s.strikes) {
    cache.strikes = s.strikes;
    [...$('strikes').children].forEach((el, i) => el.classList.toggle('on', i < s.strikes));
  }
  const seen = p && p.seen, sus = p ? p.sus : 0;
  const meWC = inWC(me.x), tabaWC = inWC(s.taba.x);
  let stText = `Taba ${ST[s.taba.st] || ''}${seen ? ' · LÁT TÉGED' : ''}`;
  if (p && p.dragged) stText = '😩 Taba visszavonszol a helyedre…';
  else if (meWC && !tabaWC) stText = `🚽 Mosdó – itt nem tudsz szabotálni · ${Math.floor(p ? p.wc : 0)}/${WC_LIMIT} mp`;
  else if (meWC) stText = `🚽 Taba a mosdóban van!${seen ? ' · LÁT TÉGED' : ''}`;
  else if (tabaWC) stText = '🚽 Taba kiment a mosdóba – most szívass!';
  setText($('tabaSt'), 'st', stText);
  const cls = 'pill ' + (sus > 0.05 ? 'caught' : seen || (meWC && p && p.wc > WC_LIMIT - 6) ? 'seen' : 'safe');
  if (cache.stCls !== cls) { cache.stCls = cls; $('status').className = cls; }
  $('vignette').style.opacity = Math.min(1, sus * 1.2).toFixed(2);

  // akció-célpont
  target = null;
  if (p) {
    let best = 1e9;
    for (const it of interactions(s, { ...p, x: me.x, z: me.z })) {
      const dx = it.x - me.x, dz = it.z - me.z, d = Math.hypot(dx, dz);
      if (d > it.r) continue;
      let a = Math.atan2(dx, dz) - me.yaw;
      a = Math.abs(((a + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI);
      if (d > 0.6 && a > 1.15) continue;
      const sc = d + a * 1.4;
      if (sc < best) { best = sc; target = it; }
    }
  }
  const prog = p && p.act ? Math.min(1, p.act.p) : 0;
  setText($('promptText'), 'prompt', target ? target.label + (ctl.touch ? '' : '  [E]') : '');
  $('prompt').hidden = !target && !prog;
  $('promptBar').firstElementChild.style.width = prog * 100 + '%';
  $('btnAct').disabled = !target && !prog;
  $('btnAct').style.setProperty('--p', prog.toFixed(3));
  setText($('actLabel'), 'act', prog ? '…' : target ? target.label : 'AKCIÓ');

  // kézben tartott tárgy
  const it = p && p.held != null ? s.items[p.held] : null;
  const hk = it ? it.id + '|' + (it.ammo ?? '') : '';
  if (cache.held !== hk) {
    cache.held = hk;
    const h = $('held');
    h.hidden = !it;
    $('btnDrop').hidden = !it;
    $('btnUse').hidden = !(it && ITEMS[it.type].use);
    if (it) {
      const d = ITEMS[it.type];
      h.textContent = `${d.icon} ${d.name}${it.ammo != null ? ` ×${it.ammo}` : ''}`;
      const sm = document.createElement('small');
      sm.textContent = d.contraband ? '⚠ Taba ne lássa nálad! · ' + d.hint : d.hint;
      h.appendChild(sm);
      if (d.use) $('btnUse').textContent = d.use;
    }
  }

  // szövegbuborék + névtáblák
  const T = s.taba, bub = $('bubble');
  if (T.say) {
    const pos = world.project(world.taba.position.x, T.sit ? 1.75 : 2.05, world.taba.position.z);
    bub.hidden = !pos.ok;
    setText(bub, 'say', T.say);
    bub.classList.toggle('angry', T.st === 'count' || T.st === 'yell' || T.st === 'scared');
    bub.style.transform = `translate(${pos.x.toFixed(0)}px, ${pos.y.toFixed(0)}px) translate(-50%, -100%)`;
  } else bub.hidden = true;
  for (const [id, q] of Object.entries(s.players)) {
    if (id === myId) continue;
    let el = tags.get(id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'tag';
      el.style.color = '#' + studentLook(q.skin, q.seat).shirt.toString(16).padStart(6, '0');
      $('labels').appendChild(el);
      tags.set(id, el);
    }
    const av = world.avatars.get(id);
    const pos = av ? world.project(av.position.x, 1.85, av.position.z) : { ok: false };
    el.hidden = !pos.ok;
    if (pos.ok) {
      if (el.textContent !== q.name) el.textContent = q.name;
      el.style.transform = `translate(${pos.x.toFixed(0)}px, ${pos.y.toFixed(0)}px) translate(-50%, -100%)`;
    }
  }
  for (const [id, el] of tags) if (!s.players[id]) { el.remove(); tags.delete(id); }

  // csörgő telefon hangja
  if (s.items.some((i) => i.ringing && !i.gone) && performance.now() - lastRing > 900) { lastRing = performance.now(); play('ring'); }
}

function updateLobby() {
  const key = Object.values(view.players).map((p) => p.seat + p.name + p.skin).join('|');
  if (cache.lobby === key) return;
  cache.lobby = key;
  const ul = $('lobbyList');
  ul.textContent = '';
  for (const p of Object.values(view.players)) {
    const li = document.createElement('li');
    li.textContent = `${skinById(p.skin).icon} ${p.name}${p.id === myId ? ' (te)' : ''}`;
    li.style.setProperty('--c', '#' + studentLook(p.skin, p.seat).shirt.toString(16).padStart(6, '0'));
    ul.appendChild(li);
  }
}

// ---- játékhurok ----------------------------------------------------------
function tickSim(now) {
  let dt = Math.min(1, (now - lastSim) / 1000);
  lastSim = now;
  const s = role === 'solo' || role === 'host' ? sim : mode === 'menu' ? preview : null;
  if (!s) return;
  while (dt > 0) { const h = Math.min(0.05, dt); s.step(h); dt -= h; }
  if (s === preview && preview.s.phase !== 'play') { preview = makePreview(); view = preview.s; }
  if (role === 'host' && net && now - lastSnap > (sim.s.phase === 'play' ? 90 : 300)) {
    lastSnap = now;
    net.broadcast({ t: 's', s: sim.s });
  }
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  tickSim(now);
  if (sim) view = sim.s;

  if (role && view.phase === 'play' && mode !== 'play' && view.players[myId]) enterPlay();
  else if (role && (view.phase === 'won' || view.phase === 'lost') && mode === 'play') enterEnd();

  if (mode === 'play') {
    ctl.update();
    const mp = view.players[myId];
    if (faceT > 0) {
      // lebukáskor odanézünk Tabára, hogy lássuk, hányat mutat
      faceT -= dt;
      const tp = world.taba.position;
      const want = Math.atan2(tp.x - me.x, tp.z - me.z);
      let d = want - ctl.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      ctl.yaw += d * Math.min(1, dt * 8);
      const wantP = Math.atan2(2.2 - EYE, Math.max(0.5, Math.hypot(tp.x - me.x, tp.z - me.z)));
      ctl.pitch += (wantP - ctl.pitch) * Math.min(1, dt * 8);
    }
    me.yaw = ctl.yaw; me.pitch = ctl.pitch;
    const dragged = mp && mp.dragged;
    if (dragged) {
      me.x += (mp.x - me.x) * Math.min(1, dt * 10);
      me.z += (mp.z - me.z) * Math.min(1, dt * 10);
    }
    const f = dragged ? 0 : ctl.move.y, r = dragged ? 0 : ctl.move.x;
    if (f || r) {
      const sp = 3.3 * dt;
      const nx = me.x + (Math.sin(me.yaw) * f - Math.cos(me.yaw) * r) * sp;
      const nz = me.z + (Math.cos(me.yaw) * f + Math.sin(me.yaw) * r) * sp;
      [me.x, me.z] = collide(nx, nz, me.x, me.z);
      walkT += dt * 9 * Math.min(1, Math.hypot(f, r));
      me.bob = Math.sin(walkT) * 0.025;
    } else me.bob *= 0.85;
    if (now - lastPos > 66) {
      lastPos = now;
      send({ t: 'pos', x: me.x, z: me.z, yaw: me.yaw, pitch: me.pitch });
    }
    updateHud();
    world.update(view, myId, dt, t, me);
  } else {
    if (mode === 'lobby') updateLobby();
    // lassan pásztázó kamera a menü mögött; a boltban a kiválasztott skin látszik
    let cam;
    if (mode === 'shop') {
      cam = innerWidth > innerHeight
        ? { x: 0.95, z: -1.0, yaw: PI, pitch: -0.12, bob: -0.3 }
        : { x: 0, z: -0.5, yaw: PI, pitch: -0.5, bob: 0.25 };
    } else cam = { x: Math.sin(t * 0.12) * 2.6, z: 5.2, yaw: PI + Math.sin(t * 0.12) * 0.25, pitch: -0.1, bob: 0 };
    world.setPreview(mode === 'shop' ? shopSel : null);
    world.update(view, myId, dt, t, cam);
  }
  world.render();
}
requestAnimationFrame(frame);

// a host akkor is léptesse a játékot, ha a füle a háttérbe kerül
setInterval(() => { if (document.hidden && role === 'host') tickSim(performance.now()); }, 250);
document.addEventListener('visibilitychange', () => { if (!document.hidden && role !== 'host') lastSim = performance.now(); });

// tesztekhez / hibakereséshez
window.__taba = { world, ctl, me, wallet, get sim() { return sim; }, get view() { return view; }, get mode() { return mode; }, get role() { return role; }, get myId() { return myId; }, send };
