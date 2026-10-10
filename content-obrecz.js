// Treści modułu „Obręcz barkowa” (łopatka i obojczyk). Plik można edytować bez znajomości reszty kodu.
// Klucze kości (scapula, clavicle) odpowiadają nazwom siatek w models/pakiety/obrecz-*.pak (tools/obrecz.py),
// klucze części — punktom w landmarks-obrecz.js.
// WERSJA ROBOCZA: opisy wymagają weryfikacji przez nauczyciela anatomii.

export const OBRECZ_REGIONS = {
  OB: { name: 'Obręcz barkowa', latin: 'Cingulum membri superioris', count: '2 kości po każdej stronie', curve: 'Kończyna górna',
        text: 'Łopatka i obojczyk łączą kończynę górną z tułowiem. Jedynym stawem między nimi a tułowiem jest staw mostkowo-obojczykowy — łopatka przylega do klatki piersiowej tylko przez mięśnie. Dzięki temu bark jest bardzo ruchomy, ale jego ustawienie zależy od napięcia mięśni.' },
};

// Kości: name, latin, short (skrót w quizie), features (cechy), massage (dla masażysty), muscles (przyczepy)
export const OBRECZ_PARTS = {
  scapula: {
    name: 'Łopatka', latin: 'Scapula', short: 'Scapula',
    features: [
      'Parzysta, płaska, trójkątna kość. Leży na tylnej ścianie klatki piersiowej, na wysokości żeber 2–7.',
      'Ma trzy brzegi (przyśrodkowy, boczny i górny) i trzy kąty (górny, dolny i boczny). Na kącie bocznym leży panewka stawowa.',
      'Grzebień łopatki dzieli powierzchnię tylną na dół nadgrzebieniowy i podgrzebieniowy. Powierzchnia żebrowa (przednia) tworzy dół podłopatkowy.',
      'Grzebień przechodzi w bok w wyrostek barkowy, który łączy się z obojczykiem. Do przodu wystaje wyrostek kruczy.',
      'Z klatką piersiową łopatka nie tworzy stawu — przesuwa się po niej na mięśniach, dlatego jest bardzo ruchoma.',
    ],
    massage: 'Punkty orientacyjne przy rękach opuszczonych wzdłuż tułowia: kąt górny — na wysokości Th2, przyśrodkowy koniec grzebienia — Th3, kąt dolny — Th7. Wzdłuż brzegu przyśrodkowego rozcieramy przyczepy mięśni równoległobocznych. Gdy pacjent położy rękę na plecach (na lędźwiach), brzeg przyśrodkowy odstaje od żeber i łatwiej się pod niego dostać. Na grzebień i wyrostek barkowy nie uciskamy mocno — kość leży tuż pod skórą.',
    muscles: 'Powierzchnia tylna: nadgrzebieniowy, podgrzebieniowy, obły mniejszy i większy. Powierzchnia żebrowa: podłopatkowy. Brzeg przyśrodkowy: równoległoboczne (od tyłu) i zębaty przedni (od strony żeber); kąt górny: dźwigacz łopatki. Grzebień i wyrostek barkowy: czworoboczny i naramienny. Wyrostek kruczy: piersiowy mniejszy, kruczo-ramienny i głowa krótka dwugłowego ramienia. Guzek nadpanewkowy: głowa długa dwugłowego, podpanewkowy: głowa długa trójgłowego. Brzeg górny: łopatkowo-gnykowy.',
  },
  clavicle: {
    name: 'Obojczyk', latin: 'Clavicula', short: 'Clavicula',
    features: [
      'Parzysta, esowato wygięta kość długa. Leży poziomo między mostkiem a wyrostkiem barkowym łopatki.',
      'Koniec mostkowy łączy się z rękojeścią mostka w stawie mostkowo-obojczykowym — to jedyne stawowe połączenie kończyny górnej z tułowiem.',
      'Spłaszczony koniec barkowy łączy się z wyrostkiem barkowym łopatki w stawie barkowo-obojczykowym.',
      'Przyśrodkowe dwie trzecie są wypukłe do przodu, boczna jedna trzecia — wklęsła.',
    ],
    massage: 'Obojczyk jest wyczuwalny na całej długości i oddziela okolicę szyi od klatki piersiowej. Opracowujemy mięśnie, które się do niego przyczepiają, ale nie uciskamy dołu nadobojczykowego — leżą w nim splot ramienny i naczynia podobojczykowe.',
    muscles: 'Mostkowo-obojczykowo-sutkowy (przyśrodkowa część, góra), czworoboczny (boczna jedna trzecia, tył), naramienny (boczna jedna trzecia, przód), piersiowy większy (przyśrodkowa połowa, przód), podobojczykowy (powierzchnia dolna).',
  },
};

// Zestawy podpisów: części kości z dużą liczbą punktów są podzielone na zestawy (pole group przy części).
// Na modelu podpisany jest jeden zestaw naraz, pozostałe części to kropki w kolorze swojego zestawu.
// Kolejność tutaj = kolejność przycisków; kolory zestawów są w styles.css (--lg1, --lg2…).
export const OBRECZ_LABEL_GROUPS = {
  katy: 'Kąty i brzegi',
  wyrostki: 'Grzebień i wyrostki',
  doly: 'Panewka i doły',
};

// Części kości: name, latin, def (opis), palp — wyczuwalna pod palcami, pair — parzysta (dwa punkty: [lewa, prawa]),
// group — zestaw podpisów (OBRECZ_LABEL_GROUPS)
export const OBRECZ_LABELS = {
  scapula: {
    angle_sup:      { name: 'Kąt górny', latin: 'angulus superior', group: 'katy', palp: true, pair: true,
                      def: 'Górny róg brzegu przyśrodkowego, na wysokości Th2. Przyczep dźwigacza łopatki. Leży pod mięśniem czworobocznym — wyczuwalny przy rozluźnionych mięśniach.' },
    angle_inf:      { name: 'Kąt dolny', latin: 'angulus inferior', group: 'katy', palp: true, pair: true,
                      def: 'Najniższy punkt łopatki, przy rękach opuszczonych na wysokości wyrostka kolczystego Th7. Przy unoszeniu ręki przesuwa się w bok (łopatka się obraca).' },
    margo_med:      { name: 'Brzeg przyśrodkowy', latin: 'margo medialis', group: 'katy', palp: true, pair: true,
                      def: 'Biegnie wzdłuż kręgosłupa, kilka centymetrów od wyrostków kolczystych. Od tyłu przyczepiają się do niego mięśnie równoległoboczne, od strony żeber — zębaty przedni.' },
    margo_lat:      { name: 'Brzeg boczny', latin: 'margo lateralis', group: 'katy', palp: true, pair: true,
                      def: 'Gruby brzeg od panewki do kąta dolnego, zwrócony w stronę pachy. Przyczep mięśni obłych: mniejszego (wyżej) i większego (przy kącie dolnym).' },
    margo_sup:      { name: 'Brzeg górny', latin: 'margo superior', group: 'katy', palp: false, pair: true,
                      def: 'Najkrótszy i najcieńszy brzeg, od kąta górnego do wyrostka kruczego. Leży głęboko pod mięśniami.' },
    notch:          { name: 'Wcięcie łopatki', latin: 'incisura scapulae', group: 'katy', palp: false, pair: true,
                      def: 'Wcięcie w brzegu górnym przy nasadzie wyrostka kruczego. Zamyka je więzadło poprzeczne łopatki, pod którym przechodzi nerw nadłopatkowy.' },
    spine:          { name: 'Grzebień łopatki', latin: 'spina scapulae', group: 'wyrostki', palp: true, pair: true,
                      def: 'Wał kostny na tylnej powierzchni, biegnący skośnie w górę i w bok. Wyczuwalny pod skórą na całej długości. Przyczep części poprzecznej i wstępującej czworobocznego oraz tylnej części naramiennego.' },
    trigonum:       { name: 'Trójkąt grzebienia', latin: 'trigonum spinae scapulae', group: 'wyrostki', palp: true, pair: true,
                      def: 'Gładkie, trójkątne miejsce, w którym grzebień dochodzi do brzegu przyśrodkowego — przy rękach opuszczonych na wysokości Th3. Punkt orientacyjny przy liczeniu kręgów.' },
    acromion:       { name: 'Wyrostek barkowy', latin: 'acromion', group: 'wyrostki', palp: true, pair: true,
                      def: 'Boczne przedłużenie grzebienia, tworzy „dach” nad stawem ramiennym. Najwyżej położony kostny punkt barku. Łączy się z obojczykiem w stawie barkowo-obojczykowym.' },
    acromial_angle: { name: 'Kąt barkowy', latin: 'angulus acromialis', group: 'wyrostki', palp: true, pair: true,
                      def: 'Miejsce, w którym tylny brzeg wyrostka barkowego zakręca w grzebień łopatki. Dobrze wyczuwalny punkt z tyłu barku.' },
    coracoid:       { name: 'Wyrostek kruczy', latin: 'processus coracoideus', group: 'wyrostki', palp: true, pair: true,
                      def: 'Hakowaty wyrostek skierowany do przodu. Wyczuwalny z przodu, kilka centymetrów pod obojczykiem, w bruździe między mięśniem naramiennym a piersiowym większym. Przyczep piersiowego mniejszego, kruczo-ramiennego i głowy krótkiej dwugłowego. Ucisk bywa bolesny.' },
    glenoid:        { name: 'Panewka stawowa', latin: 'cavitas glenoidalis', group: 'doly', palp: false, pair: true,
                      def: 'Płytkie, owalne zagłębienie na kącie bocznym. Z głową kości ramiennej tworzy staw ramienny — najbardziej ruchomy staw ciała. Panewka jest mała w porównaniu z głową kości, dlatego staw łatwo się zwichnąć.' },
    supraglenoid:   { name: 'Guzek nadpanewkowy', latin: 'tuberculum supraglenoidale', group: 'doly', palp: false, pair: true,
                      def: 'Nad panewką. Przyczep głowy długiej mięśnia dwugłowego ramienia.' },
    infraglenoid:   { name: 'Guzek podpanewkowy', latin: 'tuberculum infraglenoidale', group: 'doly', palp: false, pair: true,
                      def: 'Pod panewką, na początku brzegu bocznego. Przyczep głowy długiej mięśnia trójgłowego ramienia.' },
    fossa_supra:    { name: 'Dół nadgrzebieniowy', latin: 'fossa supraspinata', group: 'doly', palp: true, pair: true,
                      def: 'Zagłębienie nad grzebieniem. Wypełnia je mięsień nadgrzebieniowy (część stożka rotatorów), przykryty mięśniem czworobocznym.' },
    fossa_infra:    { name: 'Dół podgrzebieniowy', latin: 'fossa infraspinata', group: 'doly', palp: true, pair: true,
                      def: 'Duże zagłębienie pod grzebieniem, wypełnione mięśniem podgrzebieniowym. Przy przeciążeniach barku mięsień bywa tu tkliwy.' },
    fossa_sub:      { name: 'Dół podłopatkowy', latin: 'fossa subscapularis', group: 'doly', palp: false, pair: true,
                      def: 'Wklęsła powierzchnia żebrowa (przednia) łopatki, zwrócona do żeber. Wypełnia ją mięsień podłopatkowy.' },
  },
  clavicle: {
    sternal:        { name: 'Koniec mostkowy', latin: 'extremitas sternalis', palp: true, pair: true,
                      def: 'Gruby, przyśrodkowy koniec obojczyka. Łączy się z rękojeścią mostka w stawie mostkowo-obojczykowym — wyczuwalny po bokach wcięcia szyjnego mostka.' },
    body:           { name: 'Trzon obojczyka', latin: 'corpus claviculae', palp: true, pair: true,
                      def: 'Esowato wygięta część między końcami. Leży tuż pod skórą na całej długości.' },
    acromial:       { name: 'Koniec barkowy', latin: 'extremitas acromialis', palp: true, pair: true,
                      def: 'Spłaszczony, boczny koniec. Łączy się z wyrostkiem barkowym łopatki w stawie barkowo-obojczykowym — szparę stawu czuć jako małe zagłębienie.' },
    conoid:         { name: 'Guzek stożkowaty', latin: 'tuberculum conoideum', palp: false, pair: true,
                      def: 'Na dolnej powierzchni bocznej części obojczyka. Przyczep więzadła stożkowatego, które łączy obojczyk z wyrostkiem kruczym łopatki.' },
  },
};

// Kolejność kości w menu i grupy (OB — obręcz barkowa)
export const OBRECZ_ORDER = ['scapula', 'clavicle'];
export const OBRECZ_GROUP = { scapula: 'OB', clavicle: 'OB' };
