# Taba – Szabotáld a töriórát!

3D-s, többjátékos osztálytermi játék, ami telefonon böngészőben fut, és appként telepíthető (PWA).

Törióra van. **Taba** tanár úr sokszor el van foglalva a laptopjával, a projektorral vagy a táblával.
A cél: 5 perc alatt 100%-ra tölteni a **SZÍVATÁS**-mérőt, mielőtt kicsengetnek – úgy, hogy ne bukjatok le háromszor.

## Szabályok

- **Nyertek**, ha a szívatás-mérő megtelik.
- **Vesztetek**, ha
  - lejár az 5 perces óra,
  - Taba háromszor rajtakap valakit („EGY!… KETTŐ!… HÁROM!”),
  - valaki eltalálja Tabát a szivacslövő AK-val (azonnali vége).
- Taba akkor kap el, ha a látókúpjában (a padlón látszik) épp szabotálsz, vagy laptop / AK van a kezedben.
  Zöld kúp = el van foglalva, alig lát. Narancs = figyel. Sárga = mindjárt felnéz!

## Mit lehet csinálni?

| Szabotázs | Hogyan |
|---|---|
| Villany lekapcsolása | kapcsoló az ajtó mellett (sötétben Taba alig lát) |
| Biztosíték lecsapása | szürke doboz a hátsó falon |
| Projektor kihúzása | konnektor a vászon mellett |
| Tábla letörlése / firka | a táblánál; firkához kréta kell |
| Laptop ellopása | amikor Taba nem ül ott – aztán kuka, szekrény, vagy ki az ablakon |
| Pukipárna / ragasztó | Taba székére |
| Bűzbomba, papírrepülő | dobd Taba felé |
| Csörgő telefon | tedd le valahol, Taba odamegy elkobozni |
| Távirányító | cicás videó a kivetítőre |
| Szivacslövő AK | az egyik szekrényben van; projektor, óra, virág, földgömb, ablak, laptop lőhető |

A tárgyak minden órán máshol vannak. Többen játszva több pont kell, cserébe el lehet terelni Taba figyelmét.

## Irányítás

- **Telefon:** bal oldalon mozgás, jobb oldalon nézelődés, gombok jobbra lent (AKCIÓ-t nyomva kell tartani).
- **Gép:** WASD + egér, `E` akció (tartsd), `F` vagy kattintás: tárgy használata, `Q`: eldobás.

## Többjátékos mód

Valaki megnyomja a **Szoba létrehozása** gombot, a többiek beírják a 4 betűs kódot (vagy megnyitják a meghívó linket).
A kapcsolat közvetlenül a telefonok között megy (WebRTC, PeerJS), a szoba gazdájának telefonja futtatja a játékot –
ő ne zárja be / tegye háttérbe a játékot óra közben.

## Futtatás és telepítés

Nincs build lépés, sima statikus weboldal:

```bash
python3 -m http.server 8000   # majd http://localhost:8000
```

Telefonra: a repó **Settings → Pages** menüjében válaszd ki az ágat és a `/ (root)` mappát. A kapott
`https://<felhasználó>.github.io/Taba/` címet megnyitva Androidon megjelenik a „Telepítés a telefonra” gomb
(iPhone-on: Megosztás → Főképernyőhöz adás). Telepítve az egyjátékos mód internet nélkül is megy.

## Felépítés

- `js/sim.js` – szabályok és Taba viselkedése (csak a szoba gazdája futtatja)
- `js/world.js` – 3D megjelenítés (Three.js)
- `js/main.js` – menük, játékhurok · `js/net.js` – hálózat · `js/controls.js` – irányítás · `js/audio.js` – hangok
- `js/data.js` – a terem elrendezése, tárgyak, akciók
- `vendor/` – three.js és PeerJS (MIT licenc)
