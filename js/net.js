// Hálózat: a host egy „szobát” nyit, a többiek szobakóddal csatlakoznak.
// Éles módban PeerJS (WebRTC, közvetlen kapcsolat a telefonok között),
// ?net=local esetén BroadcastChannel (ugyanazon böngésző fülei között – teszteléshez).

const PREFIX = 'taba-tori-ora-';
const LOCAL = new URLSearchParams(location.search).get('net') === 'local';

export function makeCode() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c = '';
  for (let i = 0; i < 4; i++) c += abc[Math.floor(Math.random() * abc.length)];
  return c;
}

// Közös felület: onOpen(), onJoin(pid), onLeave(pid), onMsg(pid, msg), onError(text), onClose()
class Base {
  constructor() {
    this.onOpen = this.onJoin = this.onLeave = this.onMsg = this.onError = this.onClose = () => {};
  }
}

// ---- PeerJS ---------------------------------------------------------------
class PeerNet extends Base {
  constructor(code, isHost) {
    super();
    this.isHost = isHost;
    this.conns = new Map();
    if (typeof Peer === 'undefined') { setTimeout(() => this.onError('A hálózati modul nem töltődött be.'), 0); return; }
    const peer = (this.peer = isHost ? new Peer(PREFIX + code, { debug: 1 }) : new Peer({ debug: 1 }));
    peer.on('open', () => {
      if (isHost) { this.onOpen(); return; }
      const c = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      this.wire(c, 'host');
      this.joinTimer = setTimeout(() => { if (!this.opened) this.onError('Nem sikerült csatlakozni. Jó a kód? Fut még a szoba?'); }, 12000);
    });
    peer.on('connection', (c) => { if (isHost) this.wire(c, c.peer); });
    peer.on('disconnected', () => { if (!this.dead) try { peer.reconnect(); } catch { /* ignore */ } });
    peer.on('error', (err) => {
      const t = err && err.type;
      if (t === 'unavailable-id') this.onError('Ez a szobakód már foglalt, próbáld újra.');
      else if (t === 'peer-unavailable') this.onError('Nincs ilyen szoba. Ellenőrizd a kódot!');
      else if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') this.onError('Nincs kapcsolat a szobaszerverrel. Van internet?');
      else if (t === 'browser-incompatible') this.onError('Ez a böngésző nem támogatja a többjátékos módot.');
      else console.warn('peer error', err);
    });
  }
  wire(c, pid) {
    c.on('open', () => {
      this.conns.set(pid, c);
      if (this.isHost) this.onJoin(pid);
      else { this.opened = true; clearTimeout(this.joinTimer); this.onOpen(); }
    });
    c.on('data', (d) => this.onMsg(pid, d));
    const gone = () => {
      if (!this.conns.has(pid)) return;
      this.conns.delete(pid);
      if (this.isHost) this.onLeave(pid);
      else if (!this.dead) this.onClose();
    };
    c.on('close', gone);
    c.on('error', gone);
  }
  send(pid, msg) { const c = this.conns.get(pid); if (c && c.open) try { c.send(msg); } catch { /* ignore */ } }
  broadcast(msg) { for (const pid of this.conns.keys()) this.send(pid, msg); }
  close() { this.dead = true; clearTimeout(this.joinTimer); try { this.peer && this.peer.destroy(); } catch { /* ignore */ } }
}

// ---- BroadcastChannel (teszt) ---------------------------------------------
class LocalNet extends Base {
  constructor(code, isHost) {
    super();
    this.isHost = isHost;
    this.id = isHost ? 'host' : 'c' + Math.random().toString(36).slice(2, 8);
    this.peers = new Set();
    this.ch = new BroadcastChannel(PREFIX + code);
    this.ch.onmessage = (e) => {
      const { from, to, k, d } = e.data;
      if (to !== this.id) return;
      if (k === 'hi' && isHost) { this.peers.add(from); this.raw(from, 'ok'); this.onJoin(from); }
      else if (k === 'ok' && !isHost) { this.peers.add('host'); this.host = from; clearTimeout(this.timer); this.onOpen(); }
      else if (k === 'bye') { if (this.peers.delete(isHost ? from : 'host')) (isHost ? this.onLeave(from) : this.onClose()); }
      else if (k === 'm') this.onMsg(isHost ? from : 'host', d);
    };
    if (isHost) setTimeout(() => this.onOpen(), 0);
    else {
      this.raw('host', 'hi');
      this.timer = setTimeout(() => this.onError('Nincs ilyen szoba. Ellenőrizd a kódot!'), 2500);
    }
    addEventListener('pagehide', () => this.close());
  }
  raw(to, k, d) { this.ch.postMessage({ from: this.id, to, k, d }); }
  send(pid, msg) { this.raw(pid, 'm', msg); }
  broadcast(msg) { for (const p of this.peers) this.raw(p, 'm', msg); }
  close() {
    if (this.dead) return;
    this.dead = true; clearTimeout(this.timer);
    for (const p of this.peers) this.raw(p, 'bye');
    this.ch.close();
  }
}

export function createNet(code, isHost) {
  return LOCAL ? new LocalNet(code, isHost) : new PeerNet(code, isHost);
}
