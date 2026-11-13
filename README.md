# Taba – Szabotáld a töriórát!

3D-s, többjátékos osztálytermi játék, ami telefonon böngészőben fut, és appként telepíthető (PWA).

Törióra van. **Taba** tanár úr sokszor el van foglalva a laptopjával, a projektorral vagy a táblával.
A cél: 5 perc alatt 100%-ra tölteni a **SZÍVATÁS**-mérőt, mielőtt kicsengetnek – úgy, hogy ne bukjatok le háromszor.

## Szabályok

- **Nyertek**, ha a szívatás-mérő megtelik.
- **Vesztetek**, ha
  - lejár az 5 perces óra,
  - Taba háromszor rajtakap valakit („EGY!… KETTŐ!… HÁROM!”),
  - valaki eltalálja Tabát az airsoft AK-val (azonnali vége).
- Taba akkor kap el, ha a látókúpjában (a padlón látszik) épp szabotálsz, vagy laptop / AK / megafon van a kezedben.
  Ilyenkor a feje mellett felemelt kezén mutatja (a kamera rá is közelít), hányadik lebukás („EGY!” – 1 ujj, „KETTŐ!” – 2 ujj, „HÁROM!” – 3 ujj).
- **Mosdó:** az ajtón kimenve a mosdóba jutsz, ott nem lehet szabotálni. Ha 15 mp-nél tovább maradsz, Taba utánad jön
  (addig a többiek szabadon szívathatnak). Ha a mosdóban elkap, visszavonszol a helyedre, és ez egy lebukás.
  Zöld kúp = el van foglalva, alig lát. Narancs = figyel. Sárga = mindjárt felnéz!

## Mit lehet csinálni?

| Szabotázs | Hogyan |
|---|---|
| Villany lekapcsolása | kapcsoló az ajtó mellett (sötétben Taba alig lát) |
| Biztosíték lecsapása | szürke doboz a hátsó falon |
| Projektor kihúzása | konnektor a vászon mellett |
| Tábla letörlése / firka | a táblánál; firkához kréta kell |
| Laptop ellopása | amikor Taba nem ül ott – aztán kuka, szekrény, vagy ki az ablakon |
| Rajzszög / ragasztó | Taba székére |
| Jegyek átírása | Taba laptopján, az e-naplóban – sokat ér, de 6 mp-ig tart |
| Tűzjelző | az ajtó mellett, egyszer – Taba kirohan, utána sokáig éber |
| Bűzbomba, papírrepülő | dobd Taba felé |
| Csörgő telefon | tedd le valahol, Taba odamegy elkobozni |
| Airsoft AK | az egyik szekrényben van; projektor, vászon, óra, virág, földgömb, ablak, laptop lőhető |
| HDMI kihúzása | Taba laptopjánál – a vásznon „Nincs jel” |
| Rajzolás a PPT-re | Taba laptopjánál – a rajzod fehér háttérrel megjelenik a vásznon |
| Mémes pendrive | dugd a laptopba – mémek a PPT helyett |
| Megafon | óriási zaj, Taba ordibálni kezd, aztán odanéz |
| Vizes palack | öntsd ki Taba útjába – elcsúszik |

A tárgyak minden órán máshol vannak. Többen játszva több pont kell, cserébe el lehet terelni Taba figyelmét.

## Új játékelemek

- **Guggolás:** guggolva a padok eltakarnak Taba elől, és a stréber is csak közelről vesz észre – cserébe lassabb vagy.
- **Felelés:** Taba néha kihív valakit. Ha téged, 8 másodperced van visszaérni a helyedre (különben lebukás), aztán válaszolni kell
  egy kérdésre a diákról. Jó válasz után 30 mp-ig kevésbé gyanakszik rád, rossz után jobban figyel. Ha egy osztálytársat hív ki, addig nem rád figyel.
- **Kizárás:** ha Taba kiment a teremből (hangosbemondó, tűzriadó, mosdó), rá lehet zárni az ajtót – amíg kopog, szabad a pálya.
- **Kihívások:** minden órán három véletlen bónuszfeladat (jobb oldalt fent), pontot és érmét érnek.
- **Háttérzene:** generált, „lopakodós” téma, ami a feszültséggel együtt sűrűsödik; a főmenüben ki-be kapcsolható.

## Nehézség

- Taba elfoglaltan is lát kb. 3 métert, gyakran felnéz, és a hangos dolgokra odafordul.
- A stréber osztálytárs beárul, ha a közelében szabotálsz (papírgalacsinnal elhallgattatható).
- Szívverés jelzi, ha veszélyben vagy; az utolsó 30 mp-ben ketyeg az óra.

## Hangulat

- Taba helyzethez illő, száraz humorú szövegekkel reagál mindenre (sok változat, `js/lines.js`), szövegbuborékban.
- Minél nagyobb a káosz, annál idegesebb: kipirul, gyorsabban mozog, gyakrabban néz fel.
- Véletlen események: Windows-frissítés, anyukája telefonál, a hangosbemondó kihívja a teremből.
- Kombó: a gyors egymásutáni szívatások egyre több pontot érnek.
- Az üres helyeken osztálytársak ülnek (írnak, alszanak, telefonoznak), és odanéznek, ha valami történik.
- Az óra végén beírás az osztálynaplóba: mi történt, és ki milyen címet kapott.

## Bolt és érmék

Minden óra végén érmét kapsz (szívatás-mérő, saját szabotázsaid, győzelem, megmaradt idő alapján).
A főmenü **Bolt** gombjában skineket vehetsz a karakteredre, ezeket a többi játékos is látja. Az érmék a telefonon tárolódnak.

## Irányítás

- **Telefon:** bal oldalon mozgás, jobb oldalon nézelődés, gombok jobbra lent (AKCIÓ-t nyomva kell tartani).
- **Gép:** WASD + egér, `E` akció (tartsd), `F` vagy kattintás: tárgy használata, `Q`: eldobás.

## Többjátékos mód

Valaki megnyomja a **Szoba létrehozása** gombot, a többiek beírják a 4 betűs kódot (vagy megnyitják a meghívó linket).
A kapcsolat közvetlenül a telefonok között megy (WebRTC, PeerJS), a szoba gazdájának telefonja futtatja a játékot –
ő ne zárja be / tegye háttérbe a játékot óra közben.

## Fizika – Napraforgó mód

Fizika néni felírja az okostáblára: „A napraforgó a nappal ellentétesen forog!” Bizonyítsátok be, hogy nem igaz:
szökjetek ki a kertbe, a kísérletekért (inga, emelő, napóra) magot kaptok; a táskákban a váza és a vizes palack,
az ablakpárkányon a kanna; üljetek be egy napos padba, és neveljétek fel a napraforgót úgy, hogy Fizika néni ne
vegye észre (ELTAKAR gomb). A kész növényt vigyétek oda neki. Fizika néni fakanállal üldöz, két találat után
rakétavetővel; három találat vagy 15 perc után vége. Elterelés: fejszével az okostábla, generátor, villany,
tűzjelző, papírgalacsin, telefon. Többen: közös életek, több mag kell, tárgyakat át lehet adni (ÁTAD),
a kiütött játékos JELEZ-ni tud. A játék nem támogatja a káros szerek fogyasztását és a fegyverek használatát –
ezek csak a játékélmény miatt szerepelnek.

## Szobalista (server.py)

A `server.py` (csak Python standard könyvtár) kiszolgálja a játékot és a `/api/rooms` szobalistát.
A Pi-n a mostani `python3 -m http.server` helyett ezt kell futtatni:

```bash
cd ~/taba && git pull
sudo sed -i "s#^ExecStart=.*#ExecStart=/usr/bin/python3 $HOME/taba/server.py 8080#" /etc/systemd/system/taba.service
sudo systemctl daemon-reload && sudo systemctl restart taba
curl -s http://127.0.0.1:8080/api/rooms
```

Az utolsó parancsnak `{"rooms": []}`-t kell kiírnia. A Tailscale Funnel beállításán nem kell változtatni.

## Futtatás és telepítés

Nincs build lépés, sima statikus weboldal:

```bash
python3 server.py 8000   # majd http://localhost:8000
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
