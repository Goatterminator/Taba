#!/usr/bin/env python3
"""Taba játékszerver: kiszolgálja a játék fájljait, és nyilvántartja a nyitott szobákat.

Csak a Python standard könyvtárát használja. Indítás:  python3 server.py [port]
  GET    /api/rooms          -> a nyitott (nem privát) szobák listája
  POST   /api/rooms          -> a host jelenti a szobáját (10 mp-enként)
  DELETE /api/rooms/<KÓD>    -> a host bezárta a szobát
30 mp jelentés nélkül a szoba magától eltűnik.
"""
import json
import os
import re
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
TTL = 30
MAX_ROOMS = 60
MODES = {"tori", "fizika"}
CODE_RE = re.compile(r"^[A-Z]{4}$")

rooms = {}
lock = threading.Lock()


def clean_rooms():
    now = time.time()
    for code in [c for c, r in rooms.items() if now - r["seen"] > TTL]:
        del rooms[code]


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):  # csendes napló
        pass

    def end_headers(self):
        # a játék fájljai mindig frissen jöjjenek (a service worker gyorsítótáraz)
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def send_json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def blocked(self):
        # rejtett fájlok (pl. .git) és maga a szerver nem tölthető le
        parts = self.path.split("?", 1)[0].split("/")
        return any(p.startswith(".") for p in parts if p) or self.path.startswith("/server.py")

    def do_GET(self):
        if self.path.startswith("/api/rooms"):
            with lock:
                clean_rooms()
                out = [
                    {k: r[k] for k in ("code", "name", "mode", "players", "max", "playing")}
                    for r in sorted(rooms.values(), key=lambda r: -r["created"])
                ]
            return self.send_json(200, {"rooms": out})
        if self.blocked():
            return self.send_error(404)
        return super().do_GET()

    def do_HEAD(self):
        if self.blocked():
            return self.send_error(404)
        return super().do_HEAD()

    def do_POST(self):
        if not self.path.startswith("/api/rooms"):
            return self.send_error(404)
        try:
            n = int(self.headers.get("Content-Length") or 0)
            if n <= 0 or n > 2048:
                raise ValueError("size")
            d = json.loads(self.rfile.read(n).decode("utf-8"))
            code = str(d.get("code", "")).upper()
            if not CODE_RE.match(code):
                raise ValueError("code")
            mode = d.get("mode") if d.get("mode") in MODES else "tori"
            name = re.sub(r"\s+", " ", str(d.get("name", "Szoba")))[:24].strip() or "Szoba"
            mx = max(1, min(4, int(d.get("max", 4))))
            players = max(0, min(mx, int(d.get("players", 1))))
            playing = bool(d.get("playing", False))
        except (ValueError, TypeError, json.JSONDecodeError):
            return self.send_json(400, {"ok": False})
        with lock:
            clean_rooms()
            if code not in rooms and len(rooms) >= MAX_ROOMS:
                return self.send_json(503, {"ok": False})
            now = time.time()
            prev = rooms.get(code)
            rooms[code] = {
                "code": code, "name": name, "mode": mode, "players": players, "max": mx,
                "playing": playing, "seen": now, "created": prev["created"] if prev else now,
            }
        return self.send_json(200, {"ok": True})

    def do_DELETE(self):
        m = re.match(r"^/api/rooms/([A-Za-z]{4})$", self.path)
        if not m:
            return self.send_error(404)
        with lock:
            rooms.pop(m.group(1).upper(), None)
        return self.send_json(200, {"ok": True})


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    srv = ThreadingHTTPServer(("", port), Handler)
    print(f"Taba szerver: http://localhost:{port}  (szobalista: /api/rooms)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
