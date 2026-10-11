// Treści modułu „Klatka piersiowa” (mostek, żebra, chrząstki żebrowe). Plik można edytować bez znajomości reszty kodu.
// Klucze kości (sternum, rib1…rib12) odpowiadają nazwom siatek w models/pakiety/klatka-*.pak (tools/klatka.py),
// klucze części — punktom w landmarks-klatka.js.
// WERSJA ROBOCZA: opisy wymagają weryfikacji przez nauczyciela anatomii.

// Grupy w lewej kolumnie i kolory (zmienne CSS --mo, --zp, --zr, --zw)
export const KLATKA_REGIONS = {
  MO: { name: 'Mostek', latin: 'Sternum', count: '1 kość z 3 części', curve: 'Klatka piersiowa',
        text: 'Mostek zamyka klatkę piersiową z przodu. Łączy się z obojczykami i — przez chrząstki żebrowe — z żebrami I–VII.' },
  ZP: { name: 'Żebra prawdziwe', latin: 'Costae verae', count: '7 par (I–VII)', curve: 'Klatka piersiowa',
        text: 'Każde z żeber I–VII łączy się z mostkiem własną chrząstką żebrową.' },
  ZR: { name: 'Żebra rzekome', latin: 'Costae spuriae', count: '3 pary (VIII–X)', curve: 'Klatka piersiowa',
        text: 'Chrząstki żeber VIII–X nie dochodzą do mostka: każda łączy się z chrząstką żebra powyżej i razem tworzą łuk żebrowy. W wielu podręcznikach do żeber rzekomych zalicza się też żebra XI i XII (jako żebra wolne). Żebro X bywa wolne — jego chrząstka nie dochodzi wtedy do łuku (przycisk „Żebro X wolne”).' },
  ZW: { name: 'Żebra wolne', latin: 'Costae fluctuantes', count: '2 pary (XI–XII)', curve: 'Klatka piersiowa',
        text: 'Żebra XI i XII (chwiejne) są krótkie i kończą się wolno między mięśniami bocznej i tylnej ściany brzucha — nie łączą się z mostkiem ani z łukiem żebrowym.' },
};

// Kości: name, latin, short (skrót w quizie), features (cechy), massage (dla masażysty), muscles (przyczepy)
export const KLATKA_PARTS = {
  sternum: {
    name: 'Mostek', latin: 'Sternum', short: 'Sternum',
    features: [
      'Płaska, nieparzysta kość w przedniej ścianie klatki piersiowej.',
      'Trzy części: rękojeść, trzon i wyrostek mieczykowaty.',
      'Rękojeść łączy się z obojczykami (stawy mostkowo-obojczykowe) i z chrząstkami żeber I.',
      'Rękojeść i trzon tworzą kąt mostka — na jego wysokości do mostka dochodzi chrząstka żebra II.',
      'Na bocznych brzegach leżą wcięcia żebrowe dla chrząstek żeber I–VII.',
      'Wyrostek mieczykowaty jest najmniejszy i długo pozostaje chrzęstny.',
    ],
    massage: 'Mostek przykrywa tylko skóra i cienka powięź — nie uciskamy kości, opracowujemy przyczepy mięśnia piersiowego większego wzdłuż jego brzegów. Wcięcie szyjne i kąt mostka to punkty orientacyjne: kąt mostka wyczuwamy jako poprzeczny wał kilka centymetrów poniżej wcięcia szyjnego, obok niego leży chrząstka żebra II — od niej liczymy żebra z przodu. Na wyrostek mieczykowaty nie naciskamy.',
    muscles: 'Piersiowy większy (część mostkowo-żebrowa), mostkowo-obojczykowo-sutkowy (głowa mostkowa, rękojeść), mostkowo-gnykowy i mostkowo-tarczowy (tylna powierzchnia rękojeści), poprzeczny klatki piersiowej (tylna powierzchnia trzonu), prosty brzucha i przepona (wyrostek mieczykowaty).',
  },
};

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const NUMERAL = ['', 'pierwsze', 'drugie', 'trzecie', 'czwarte', 'piąte', 'szóste', 'siódme', 'ósme', 'dziewiąte', 'dziesiąte', 'jedenaste', 'dwunaste'];
// z którymi kręgami łączy się głowa żebra
const headJoint = (n) => (n === 1 || n >= 10 ? `trzonem kręgu Th${n}` : `trzonami kręgów Th${n - 1} i Th${n}`);

function ribFeatures(n) {
  const f = [];
  if (n <= 7) f.push(`Żebro prawdziwe: łączy się z mostkiem własną chrząstką żebrową${n === 1 ? ' (chrząstkozrost)' : ''}.`);
  else if (n <= 10) f.push('Żebro rzekome: jego chrząstka łączy się z chrząstką żebra powyżej i tworzy łuk żebrowy.');
  else f.push('Żebro wolne (chwiejne): krótkie, kończy się wolno między mięśniami ściany brzucha.');
  f.push(`Głowa łączy się z ${headJoint(n)} (staw głowy żebra)${n <= 10 ? `, a guzek — z wyrostkiem poprzecznym Th${n} (staw żebrowo-poprzeczny)` : ''}.`);
  if (n === 1) f.push('Najkrótsze, najszersze i najbardziej płaskie żebro; leży niemal poziomo pod obojczykiem. Na górnej powierzchni ma guzek mięśnia pochyłego przedniego, przed nim bruzdę żyły, a za nim bruzdę tętnicy podobojczykowej.');
  if (n === 2) f.push('Jego chrząstka dochodzi do mostka na wysokości kąta mostka. Na zewnętrznej powierzchni ma guzowatość mięśnia zębatego przedniego.');
  if (n >= 3 && n <= 9) f.push('Typowe żebro: głowa, szyjka, guzek i długi, wygięty trzon z kątem żebra i bruzdą żebra na dolnym brzegu.');
  if (n === 10) f.push('Odmiana: chrząstka żebra X bywa krótka i zakończona wolno — wtedy żebro X jest żebrem wolnym, jak XI i XII (costa decima fluctuans). Przycisk „Żebro X wolne” pokazuje to na modelu.');
  if (n >= 11) f.push(`Nie ma guzka ani stawu żebrowo-poprzecznego${n === 12 ? '; jest najkrótsze i bywa trudno wyczuwalne' : ''}.`);
  return f;
}
function ribMassage(n) {
  if (n === 1) return 'Leży głęboko za obojczykiem; wyczuwalne tylko w dole nadobojczykowym. Nie uciskamy tu mocno — nad żebrem przebiegają splot ramienny i tętnica podobojczykowa.';
  if (n === 2) return 'Punkt wyjścia do liczenia żeber z przodu: kąt mostka → chrząstka żebra II, poniżej druga przestrzeń międzyżebrowa.';
  if (n <= 7) return 'W przestrzeniach międzyżebrowych leżą mięśnie międzyżebrowe. Rozcieramy je opuszkami palców wzdłuż przebiegu żeber, od mostka ku bokom. Na dolnym brzegu żebra biegną nerw i naczynia międzyżebrowe — ucisk umiarkowany.';
  if (n <= 10) return 'Łuk żebrowy to granica klatki piersiowej i brzucha. Wzdłuż niego rozcieramy przyczepy mięśni brzucha. Ucisk delikatny — pod łukiem leżą wątroba (po prawej) oraz żołądek i śledziona (po lewej).';
  return `Wolny koniec żebra ${ROMAN[n]} wyczuwamy z boku, w okolicy lędźwiowej. Głęboko leżą nerki — nie wykonujemy tu silnego oklepywania.`;
}
function ribMuscles(n) {
  const m = ['międzyżebrowe zewnętrzne i wewnętrzne'];
  if (n === 1) m.push('pochyły przedni i środkowy', 'podobojczykowy (chrząstka)');
  if (n === 2) m.push('pochyły tylny');
  if (n <= 6) m.push('piersiowy większy (chrząstka)');
  if (n >= 3 && n <= 5) m.push('piersiowy mniejszy');
  if (n <= 8) m.push('zębaty przedni');
  if (n >= 2 && n <= 5) m.push('zębaty tylny górny');
  if (n >= 9) m.push('zębaty tylny dolny');
  if (n >= 5 && n <= 7) m.push('prosty brzucha (chrząstka)');
  if (n >= 5) m.push('skośny zewnętrzny brzucha');
  if (n >= 10) m.push('skośny wewnętrzny brzucha');
  if (n >= 7) m.push('przepona i poprzeczny brzucha (od wewnątrz)');
  if (n >= 9) m.push('najszerszy grzbietu');
  if (n === 12) m.push('czworoboczny lędźwi');
  m.push('biodrowo-żebrowy (kąty żeber)');
  if (n >= 2) m.push('najdłuższy');
  const t = m.join(', ');
  return t.charAt(0).toUpperCase() + t.slice(1) + '.';
}
for (let n = 1; n <= 12; n++) {
  KLATKA_PARTS[`rib${n}`] = {
    name: `Żebro ${ROMAN[n]}`, latin: `Costa ${ROMAN[n]}`, short: `Costa ${ROMAN[n]}`,
    features: [`Żebro ${NUMERAL[n]}, parzyste.`, ...ribFeatures(n)],
    massage: ribMassage(n),
    muscles: ribMuscles(n),
  };
}

// Części kości: name, latin, def (opis), palp — wyczuwalna pod palcami, pair — parzysta (dwa punkty: [lewa, prawa])
export const KLATKA_LABELS = {
  sternum: {
    jugular:    { name: 'Wcięcie szyjne', latin: 'incisura jugularis', palp: true,
                  def: 'Górny brzeg rękojeści między końcami obojczyków — zagłębienie u dołu szyi.' },
    clavicular: { name: 'Wcięcie obojczykowe', latin: 'incisura clavicularis', palp: true, pair: true,
                  def: 'Powierzchnia stawowa dla końca mostkowego obojczyka (staw mostkowo-obojczykowy). Wyczuwalna po bokach wcięcia szyjnego.' },
    manubrium:  { name: 'Rękojeść mostka', latin: 'manubrium sterni', palp: true,
                  def: 'Górna, najszersza część mostka. Łączy się z obojczykami i chrząstkami żeber I.' },
    angle:      { name: 'Kąt mostka', latin: 'angulus sterni', palp: true,
                  def: 'Połączenie rękojeści z trzonem, wyczuwalne jako poprzeczny wał. Na jego wysokości do mostka dochodzi chrząstka żebra II — od niej liczymy żebra z przodu.' },
    body:       { name: 'Trzon mostka', latin: 'corpus sterni', palp: true,
                  def: 'Najdłuższa część mostka. Do jego brzegów przyczepiają się chrząstki żeber II–VII.' },
    costal:     { name: 'Wcięcia żebrowe', latin: 'incisurae costales', palp: false, pair: true,
                  def: 'Wcięcia na bocznych brzegach mostka dla chrząstek żeber I–VII (stawy mostkowo-żebrowe).' },
    xiphoid:    { name: 'Wyrostek mieczykowaty', latin: 'processus xiphoideus', palp: true,
                  def: 'Najniższa i najmniejsza część mostka, w dołku podsercowym. Wyczuwalny, ale wrażliwy — nie uciskamy.' },
  },
};
function ribLabels(n) {
  const L = {
    head: { name: 'Głowa żebra', latin: 'caput costae', palp: false, pair: true,
            def: `Tylny koniec żebra. Łączy się z ${headJoint(n)} (staw głowy żebra).` },
    neck: { name: 'Szyjka żebra', latin: 'collum costae', palp: false, pair: true,
            def: 'Zwężenie między głową a guzkiem żebra, leży przed wyrostkiem poprzecznym kręgu.' },
  };
  if (n <= 10) L.tubercle = { name: 'Guzek żebra', latin: 'tuberculum costae', palp: false, pair: true,
    def: `Łączy się z dołkiem żebrowym wyrostka poprzecznego Th${n} (staw żebrowo-poprzeczny).` };
  if (n >= 2 && n <= 10) L.angle = { name: 'Kąt żebra', latin: 'angulus costae', palp: true, pair: true,
    def: 'Miejsce, w którym żebro zakręca do przodu — najbardziej wysunięta do tyłu część żebra, bocznie od prostownika grzbietu. Przyczep mięśnia biodrowo-żebrowego.' };
  if (n === 1) L.scalene = { name: 'Guzek mięśnia pochyłego przedniego', latin: 'tuberculum musculi scaleni anterioris', palp: false, pair: true,
    def: 'Na górnej powierzchni żebra I, przy brzegu wewnętrznym. Przed nim bruzda żyły podobojczykowej, za nim — tętnicy podobojczykowej.' };
  L.body = { name: 'Trzon żebra', latin: 'corpus costae', palp: true, pair: true,
    def: 'Najdłuższa, łukowato wygięta część żebra. Z boku klatki piersiowej wyczuwalna przez skórę i mięśnie.' };
  if (n >= 2 && n <= 11) L.sulcus = { name: 'Bruzda żebra', latin: 'sulcus costae', palp: false, pair: true,
    def: 'Rowek na dolnym brzegu wewnętrznej powierzchni trzonu. Biegną w nim nerw, tętnica i żyła międzyżebrowe.' };
  L.end = n <= 10
    ? { name: 'Koniec przedni', latin: 'extremitas anterior costae', palp: n <= 7, pair: true,
        def: 'Przedni koniec kostnej części żebra — przechodzi w chrząstkę żebrową.' }
    : { name: 'Wolny koniec', latin: 'extremitas anterior costae', palp: true, pair: true,
        def: `Kończy się wolno między mięśniami ściany brzucha; wyczuwalny z boku${n === 12 ? ', w okolicy lędźwiowej' : ''}.` };
  if (n <= 10) L.cartilage = { name: 'Chrząstka żebrowa', latin: 'cartilago costalis', palp: true, pair: true,
    def: n <= 7 ? `Łączy żebro bezpośrednio z mostkiem${n === 1 ? ' (chrząstkozrost)' : ' (staw mostkowo-żebrowy)'}.`
      : n <= 9 ? `Łączy się z chrząstką żebra ${ROMAN[n - 1]} — razem tworzą łuk żebrowy.`
        : 'Łączy się z chrząstką żebra IX (łuk żebrowy). Bywa krótka i zakończona wolno — wtedy żebro X jest wolne.' };
  return L;
}
for (let n = 1; n <= 12; n++) KLATKA_LABELS[`rib${n}`] = ribLabels(n);

// Kolejność kości w menu i grupy (MO — mostek, ZP — żebra prawdziwe, ZR — rzekome, ZW — wolne)
export const KLATKA_ORDER = ['sternum', ...Array.from({ length: 12 }, (_, i) => `rib${i + 1}`)];
export const KLATKA_GROUP = Object.fromEntries(KLATKA_ORDER.map((k, i) => [k, i === 0 ? 'MO' : i <= 7 ? 'ZP' : i <= 10 ? 'ZR' : 'ZW']));
