// Taba szövegei – helyzetenként több változat, hogy ne ismételje magát.
// {n} = diák neve, {c} = a számolás szava (EGY!/KETTŐ!/HÁROM!)

export const LINES = {
  greet: [
    'Sziasztok! Üljetek le, ma a feudalizmus jön. Igen, megint.',
    'Sziasztok! Telefonokat el. A tiéd is. Igen, a tiéd.',
    'Sziasztok! Ma egy izgalmas korszakról lesz szó. Legalábbis nekem izgalmas.',
    'Sziasztok! Aki ma rosszalkodik, az felel. Aki nem, az is.',
  ],
  lecture: [
    'A harcosok a vérükkel adóztak. Ti a türelmemmel.',
    'Bellatores. Ez a harcosok latin neve. Leírtátok? Persze, hogy nem.',
    'Monarchia: monosz, egy, arkhé, hatalom. Mint itt. Én vagyok a monosz.',
    'Nagy Károlyt nyolcszáz karácsonyán koronázták meg. Ő legalább kapott ajándékot.',
    'A hűbérúr birtokot ad, a vazallus hűséget. Én jegyet adok, ti semmit.',
    'A jobbágy hajnaltól estig dolgozott. Gondoljatok rá, mielőtt a házi miatt panaszkodtok.',
    'Isten kegyelméből uralkodott. Én a tanterv kegyelméből tanítok.',
    'Ez lesz a dolgozatban. Ez is. Igazából minden.',
    'Feudum. Senior. Vazallus. Mondjátok utánam. …Köszönöm a lelkesedést.',
    'A középkorban nem volt wifi. Mégis túlélték. Ti is fogjátok.',
    'A lovag páncélja harminc kiló volt. A ti táskátok negyven. Mégsem lovagoltok.',
  ],
  laptop: [
    'Egy pillanat, megkeresem a prezentációt. Végleges, harmadik, javított.',
    'Csak gyorsan beírom a hiányzókat. Gyorsan. Ezzel a géppel.',
    'Mindjárt, megnézek egy e-mailt. Csak egyet.',
    'Hol a jelszó… ja, a monitor alján, a cetlin. Biztonság.',
  ],
  projector: [
    'Na, ezen a dián látható a hűbéri lánc. Ha látható.',
    'Lapozok. Lapozok. Miért nem lapoz?',
    'Valaki tud egy kicsit élesíteni? Senki? Persze.',
  ],
  board: [
    'Felírom a táblára. Szépen. Olvashatóan. Majdnem.',
    'Ezt mindenki írja le. A füzetbe, nem a padra.',
    'Feudalizmus. Két l? Egy. Ne nézzetek így.',
  ],
  patrol: [
    'Na, lássuk, ki mit jegyzetel.',
    'Ez jegyzet, vagy egy bevásárlólista?',
    'Szép rajz. Most már csak a tananyag hiányzik mellőle.',
    'Csak sétálok. Teljesen véletlenül pont erre.',
  ],
  mumbleLaptop: [
    'Frissítés. Már megint frissítés.',
    'Hogy kell ezt nagyobbra húzni?',
    'Ki állította át angolra?',
    'Négyszázhuszonhárom olvasatlan levél. Remek.',
    'Miért van az asztalon egy Új mappa hetes?',
  ],
  mumbleProjector: [
    'Kék kép. Mindig kék kép.',
    'HDMI egy, HDMI kettő, HDMI pánik.',
    'Ez a projektor idősebb, mint ti.',
  ],
  mumbleBoard: [
    'Ez a kréta csikorog. Mint én hétfőn reggel.',
    'Szép kézírás. Nem az enyém, de szép.',
    'Ki tette a szivacsot a tábla tetejére? Mindegy.',
  ],
  mumbleFix: ['Mindent nekem kell megcsinálni.', 'Ezért nem fizetnek eleget.', 'Ezt is beírom a jegyzőkönyvbe.'],

  fixLights: ['Ki kapcsolta le a villanyt? Nem a középkorban vagyunk. Még.', 'Sötét van. Mint a középkor. Nagyon vicces.'],
  fixFuse: ['Már megint a biztosíték. Ez a terem többször esik le, mint Bizánc.', 'Biztosíték. Persze. Magától. Mint mindig.'],
  fixPlug: ['Ki húzta ki a projektort? Ő magától nem sétál el.', 'A konnektor nem dísz, emberek.'],
  fixDraw: ['Ki rajzolt a prezentációmra? Ez nem rajzóra. És nem is tehetség.', 'Ez állítólag én vagyok? Egyes. A rajzra is.', 'Nagyon szép. Ezt kitesszük a fogadóórán.'],
  fixDoodle: ['Ki firkált a táblára? A kézírásból úgyis rájövök.', 'Művészet. Le is törlöm. Ez a kritikám.'],
  fixWindow: ['Ki nyitotta ki az ablakot? Mínusz öt fok van.', 'Huzat van. A huzat a tanár legnagyobb ellensége. A második ti vagytok.'],
  fixHdmi: ['Nincs kép. Ki húzta ki a HDMI-t? A kábel nem tud járni.', 'A kábel magától nem unta meg. Valaki segített neki.'],
  fixUsb: ['Mi ez a vetítés? Ez nem a hűbéri lánc. Ez nem is történelem.', 'Ki dugott pendrive-ot a laptopomba? Elkobzom. És nem nézem meg otthon. Nem.'],
  fixScreen: ['A vásznat is? Ezt az iskola fizette. Vagyis én.', 'Lyukas a vászon. Mint a tudásotok.'],
  fixProjBroken: ['Ki lőtte szét a projektort? Huszonöt évig bírta. Huszonöt évig!'],
  fixPhone: ['Kinek csörög a telefonja? Nem kell felvenni. Felveszem én.', 'Halló? Nem, nem ér rá. Órán van. Viszonthallásra.'],
  usbTake: ['Ezt a pendrive-ot elkobzom. Történelmi lelet lesz belőle.'],

  // ha mérges: érettségi-szöveg
  eleg: [
    'Ebből már elég! Mindjárt itt az érettségi!',
    'Ebből már elég! Ez érettségi tantárgy, valaki figyelne végre?!',
    'Mindjárt itt az érettségi, és ti ezt csináljátok?!',
    'Ez érettségi tantárgy! Valaki figyelne?!',
    'Elég! Az érettségin nem fogok ott ülni mellettetek!',
  ],
  yell: [
    'EBBŐL MÁR ELÉG! MINDJÁRT ITT AZ ÉRETTSÉGI!',
    'EZ ÉRETTSÉGI TANTÁRGY! VALAKI FIGYELNE?!',
    'MI EZ A HANGZAVAR?!',
    'AZ ÉN FÜLEM IS FEUDÁLIS JOGOKAT ÉLVEZ!',
    'EZ NEM VÁSÁR, HANEM TÖRIÓRA!',
    'MEGSÜKETÜLÖK! AKKOR KI FOGJA HALLANI A FELELETEKET?!',
    'AKI MÉG EGYSZER KIABÁL, AZ FELEL! KIABÁLVA!',
  ],
  slip: ['Ki dobott el itt egy banánhéjat? A középkorban ezért lefejeztek volna.', 'Jól vagyok. Senki nem nevet. Senki.', 'Ez a gravitáció volt. Nem én.'],
  snake: ['KÍGYÓ! …Gumiból. Nagyon vicces. Majdnem szívrohamot kaptam.', 'Egy gumikígyó. Ennél még a fizetésem is valódibb.'],
  cushion: ['…Ez a szék volt. Esküszöm, a szék volt.', 'Ezt nem hallottátok. Senki nem hallott semmit.', 'Ez egy középkori hangszer volt. Dudának hívják.'],
  glue: ['Odaragadtam. Remek. Akkor innen tanítok tovább.', 'Pillanatragasztó. Most legalább tudom, ki nem érettségizik.'],
  glueChair: ['Senki nem mond semmit. Ez egy teljesen normális szék.', 'Igen, a szék velem jön. Ez egy mobil katedra.', 'Ne nézzetek így. Ez a legújabb pedagógiai módszer.'],
  stink: ['Mi ez a szag? Ki halt meg?', 'Ablakot! Nem, mégse, az is ti lennétek.', 'Ezt a szagot a jobbágyok is visszaküldenék.'],
  plane: ['Papírrepülő. Nagy találmány. Kár, hogy nem te találtad fel.', 'Aki ezt dobta, a dolgozatot is így adja be?'],
  shotHit: ['ÁÚ! Szivacs vagy nem szivacs, ez igazgatói!', 'ÁÚ! Ki lőtt rám?! Ezt a szüleitek is hallani fogják!'],

  lapMissing: ['Hol a laptopom? Itt volt. Az asztalon. Ahol a laptopok szoktak lenni.', 'Eltűnt a laptopom. Rajta volt a javítókulcs. Mindegy, fejből is tudom. Nagyjából.'],
  lapFound: ['Megvan! Ki tette ide? Mindegy, megtalálom. A laptopot is megtaláltam.', 'Itt van. Ahol szerintetek a helye van. Nagyon szellemes.'],
  lapGone: ['A LAPTOPOM! Azon volt a nyugdíjtervem!', 'Kirepült a laptopom az ablakon. Ez a nap már nem lesz jobb.'],
  lapBroken: ['Nem kapcsol be. Szétlőttétek. Négy évig törlesztettem.'],
  chalkMissing: ['Hol a kréta? Krétát loptok? Mi van, ostromállapot?', 'Elfogyott a kréta. Pont, mint a türelmem.'],

  react_clock: ['Lelőttétek az órát. Most már az idő sem telik. Ez nektek rossz.', 'Az óra. Most ki mondja meg, mikor van vége? Én. Soha.'],
  react_plant: ['A fikuszom! Tizenkét éve locsolom!', 'Ő volt az egyetlen, aki figyelt az órán.'],
  react_globe: ['Ott ment a Föld. Ez nagyobb pusztítás, mint a tatárjárás.'],
  react_glass: ['Az ablak! Ennek a gondnok úr nagyon fog örülni.'],

  strike1: ['{c} {n}. Ez még csak figyelmeztetés.', '{c} Igen, {n}, rád gondoltam.', '{c} {n}, vissza a helyedre. Feudalizmus van, mindenkinek megvan a helye.'],
  strike2: ['{c} {n}, ebből már elég! Mindjárt itt az érettségi!', '{c} {n}. Még egy, és megnézhetitek az igazgatói irodát belülről.', '{c} Szépen haladunk, {n}. Rossz irányba.', '{c} {n}. A jobbágyok sem szöktek el ennyiszer.'],
  strike3: ['{c} Ennyi volt. Mindenki az igazgatóiba. Sorban. Fegyelmezetten. Ahogy egész órán nem.', '{c} Vége. Ezt a napot elmesélem az unokáimnak. Elrettentő példaként.'],
  strikeWC: ['{c} {n}, a mosdó nem menedékjog. Gyere vissza.', '{c} {n}, húsz perce vagy itt. Jó, húsz másodperce. Ugyanaz.'],
  drag: ['Ülj le. És maradj ülve. Mint egy hűséges vazallus.', 'Itt a helyed. A hűbéri lánc legalsó szemén.'],
  wcHunt: ['Hol van már {n}? Megnézem. Ha a mosdóban telefonozik, abból felelés lesz.', '{n} még mindig nincs itt. A középkorban ezért elvették volna a birtokát.'],
  wcEmpty: ['Senki. Csak én és a csöpögő csap.', 'Üres. Akkor meg hol volt? Gyanús.'],
  combo: ['Ebből már elég! Mindjárt itt az érettségi!', 'Ez érettségi tantárgy! Valaki figyelne végre?!', 'Mi folyik itt? Ez nem óra, ez egy parasztfelkelés!', 'Dózsa György kevesebb káoszt okozott!', 'Ez összeesküvés. Tudom. Látom. Bizonyítani nem tudom.'],
  stress50: ['Ebből már elég. Mindjárt itt az érettségi.', 'Nyugodt vagyok. Teljesen nyugodt vagyok.', 'Mély levegő. Egy. Kettő. Nem, nem számolok. Még.'],
  stress75: ['Ebből már elég! Ez érettségi tantárgy, valaki figyelne!', 'Huszonkét év tanítás. Ezért.', 'Ha ez így megy tovább, kérem az áthelyezésemet. A középkorba.'],

  updStart: ['Ne… ne most frissíts. Kérlek. Csak most ne.', 'Windows frissítés. Na, ennyit az óráról.'],
  updMid: ['Ez lassabb, mint a népvándorlás.', 'Ne kapcsolja ki a számítógépet. Jó. Nem kapcsolom. Csak nézem.', 'Ezt a frissítést még Nagy Károly indította el.', 'Csak pár perc, azt írja. Ezt mondta a hűbérúr is.'],
  updEnd: ['Kész. Na. Hol is tartottunk? Ja, sehol.'],
  callStart: ['Bocsánat, ezt fel kell vennem. Anyukám.', 'Egy perc. Az édesanyám. Ő mindig órán hív.'],
  callMid: [
    'Szia anya! Igen, órán vagyok. Nem, nem zavarsz.',
    'Igen, megettem a pogácsát. Mindet.',
    'Nem, nem fázom. Anya, órán vagyok.',
    'Igen, felvettem a sálat. Nem, nem a pirosat.',
    'Jó, vasárnap megyek. Anya, figyelnek a gyerekek. Igen, ők is puszilnak.',
  ],
  callEnd: ['Puszi, szia. …Ezt senki nem hallotta. Ugye?'],
  paAnnounce: ['Figyelem! Taba tanár urat kérjük, fáradjon a titkárságra. Köszönjük.', 'Figyelem! Taba tanár úr, az autója a tornaterem bejáratánál áll. Kérjük, álljon arrébb.'],
  paLeave: ['Mindenki marad a helyén. Látok mindent. Akkor is, ha nem vagyok itt.', 'Két perc, és jövök. Aki addig rosszalkodik, megtudom. Mindig megtudom.'],
  paBack: ['Itt vagyok. Mi változott? Semmi? Gyanús.', 'Visszajöttem. Valami más. Nem tudom, mi, de más.'],

};

const recent = new Map();
// véletlen sor, de nem ugyanaz, mint az előző kettő ugyanabból a csoportból
export function line(key, vars) {
  const arr = LINES[key];
  if (!arr) return key;
  const last = recent.get(key) || [];
  let opts = arr.map((_, i) => i).filter((i) => !last.includes(i));
  if (!opts.length) opts = arr.map((_, i) => i);
  const i = opts[Math.floor(Math.random() * opts.length)];
  recent.set(key, [i, ...last].slice(0, Math.min(2, arr.length - 1)));
  let s = arr[i];
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s.replace(/\s+/g, ' ').trim();
}
