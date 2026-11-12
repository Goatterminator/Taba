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
- Taba akkor kap el, ha a látókúpjában (a padlón látszik) épp szabotálsz, vagy laptop / AK / megafon van a kezedben.
  Ilyenkor a feje mellett felemelt kezén mutatja (a kamera rá is közelít), hányadik lebukás („EGY!” – 1 ujj, „KETTŐ!” – 2 ujj, „HÁROM!” – 3 ujj).
- **Mosdó:** az ajtón kimenve a mosdóba jutsz, ott nem lehet szabotálni. Ha 20 mp-nél tovább maradsz, Taba utánad jön
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
| Pukipárna / ragasztó | Taba székére |
| Bűzbomba, papírrepülő | dobd Taba felé |
| Csörgő telefon | tedd le valahol, Taba odamegy elkobozni |
| Szivacslövő AK | az egyik szekrényben van; projektor, vászon, óra, virág, földgömb, ablak, laptop lőhető |
| HDMI kihúzása | Taba laptopjánál – a vásznon „Nincs jel” |
| Rajzolás a PPT-re | Taba laptopjánál – a rajzod fehér háttérrel megjelenik a vásznon |
| Mémes pendrive | dugd a laptopba – mémek a PPT helyett |
| Megafon | óriási zaj, Taba ordibálni kezd, aztán odanéz |
| Banánhéj | tedd le Taba útjába – elcsúszik |
| Gumikígyó | Taba asztalára – sikítva felugrik |

A tárgyak minden órán máshol vannak. Többen játszva több pont kell, cserébe el lehet terelni Taba figyelmét.

## Taba hangja

Taba a telefon beépített magyar felolvasóhangján beszél (köszön, magyaráz, számol, ordibál – helyzettől függően).
Ha a készüléken nincs magyar hang, „blablázó” gépi hang szól helyette. Androidon: Beállítások → Szövegfelolvasás → magyar hang letöltése.

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
