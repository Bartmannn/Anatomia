// Treści modułu „Kończyna górna” (na razie kość ramienna). Plik można edytować bez znajomości reszty kodu.
// Klucze kości (humerus) odpowiadają nazwom siatek w models/pakiety/konczyna-*.pak (tools/konczyna.py),
// klucze części — punktom w landmarks-konczyna.js.
// WERSJA ROBOCZA: nazwy części według zajęć, opisy wymagają weryfikacji przez nauczyciela anatomii.

export const KONCZYNA_REGIONS = {
  RA: { name: 'Ramię', latin: 'Brachium', count: '1 kość po każdej stronie', curve: 'Kończyna górna',
        text: 'Szkieletem ramienia jest kość ramienna. U góry łączy się z łopatką w stawie ramiennym (barkowym), u dołu z kośćmi przedramienia — łokciową i promieniową — w stawie łokciowym. Razem z obręczą barkową tworzy szkielet barku.' },
};

// Kości: name, latin, short (skrót w quizie), features (cechy), massage (dla masażysty), muscles (przyczepy)
export const KONCZYNA_PARTS = {
  humerus: {
    name: 'Kość ramienna', latin: 'Humerus', short: 'Humerus',
    features: [
      'Parzysta kość długa — najdłuższa i najmocniejsza kość kończyny górnej. Ma trzon i dwie nasady: bliższą (górną) i dalszą (dolną).',
      'Nasada bliższa: głowa kości ramiennej (łączy się z panewką łopatki), szyjka anatomiczna, guzki większy i mniejszy rozdzielone bruzdą międzyguzkową. Niżej, na granicy z trzonem, leży szyjka chirurgiczna.',
      'Trzon: w górnej części okrągły, w dolnej trójgraniasty — trzy brzegi (przedni, przyśrodkowy, boczny) i trzy powierzchnie (przednia przyśrodkowa, przednia boczna, tylna). W połowie długości, z boku, leży guzowatość naramienna, a z tyłu skośnie biegnie bruzda nerwu promieniowego.',
      'Nasada dalsza jest szeroka i spłaszczona: kłykieć kości ramiennej z bloczkiem (przyśrodkowo, dla kości łokciowej) i główką (bocznie, dla kości promieniowej), nad nim doły dziobiasty i promieniowy (z przodu) oraz łokciowy (z tyłu), po bokach nadkłykcie przyśrodkowy i boczny.',
    ],
    massage: 'Wyczuwalne są: guzek większy (poniżej wyrostka barkowego, pod mięśniem naramiennym), bruzda międzyguzkowa ze ścięgnem głowy długiej mięśnia dwugłowego (przy obracaniu ramienia), guzowatość naramienna i oba nadkłykcie. Nadkłykieć boczny to przyczep prostowników nadgarstka i palców („łokieć tenisisty”), przyśrodkowy — zginaczy („łokieć golfisty”). Uważamy na nerwy: łokciowy biegnie w bruździe za nadkłykciem przyśrodkowym (nie uciskamy), promieniowy — w bruździe na tylnej powierzchni trzonu. Po przyśrodkowej stronie ramienia, wzdłuż mięśnia dwugłowego, leżą tętnica ramienna i nerw pośrodkowy — tam pracujemy delikatnie.',
    muscles: 'Guzek większy: nadgrzebieniowy, podgrzebieniowy, obły mniejszy. Guzek mniejszy: podłopatkowy. Grzebień guzka większego: piersiowy większy. Grzebień guzka mniejszego: najszerszy grzbietu i obły większy. Bruzda międzyguzkowa: ścięgno głowy długiej dwugłowego ramienia. Guzowatość naramienna: naramienny. Trzon: kruczo-ramienny (przyśrodkowo, w połowie), ramienny (dolna połowa z przodu), głowy boczna i przyśrodkowa trójgłowego (z tyłu). Brzeg boczny nad nadkłykciem: ramienno-promieniowy i prostownik promieniowy długi nadgarstka. Nadkłykieć przyśrodkowy: nawrotny obły i zginacze nadgarstka i palców. Nadkłykieć boczny: prostowniki nadgarstka i palców, odwracacz, łokciowy.',
  },
};

// Zestawy podpisów (pole group przy części): na modelu podpisany jest jeden zestaw naraz, pozostałe części to kropki.
// Kolejność tutaj = kolejność przycisków; kolory zestawów są w styles.css (--lg1, --lg2…).
export const KONCZYNA_LABEL_GROUPS = {
  ogolne: 'Ogólne',
  gora: 'Część górna',
  dol: 'Część dolna',
};

// Części kości: name, latin, def (opis), palp — wyczuwalna pod palcami, pair — parzysta (dwa punkty: [lewa, prawa]),
// group — zestaw podpisów (KONCZYNA_LABEL_GROUPS)
export const KONCZYNA_LABELS = {
  humerus: {
    // ogólne — widoczne z daleka
    corpus:         { name: 'Trzon kości ramiennej', latin: 'corpus humeri', group: 'ogolne', palp: false, pair: true,
                      def: 'Długa środkowa część kości. U góry okrągła, w dolnej części trójgraniasta — ma trzy brzegi i trzy powierzchnie.' },
    epiph_prox:     { name: 'Nasada bliższa', latin: 'epiphysis proximalis', group: 'ogolne', palp: false, pair: true,
                      def: 'Górny koniec kości (bliżej tułowia): głowa, szyjka anatomiczna i guzki. Tworzy staw ramienny z łopatką.' },
    epiph_dist:     { name: 'Nasada dalsza', latin: 'epiphysis distalis', group: 'ogolne', palp: false, pair: true,
                      def: 'Dolny koniec kości (dalej od tułowia), szeroki i spłaszczony: kłykieć, doły i nadkłykcie. Tworzy staw łokciowy z kośćmi przedramienia.' },
    margo_ant:      { name: 'Brzeg przedni', latin: 'margo anterior', group: 'ogolne', palp: false, pair: true,
                      def: 'Biegnie przez środek przedniej strony trzonu, przedłużenie grzebienia guzka większego w dół. Oddziela powierzchnię przednią przyśrodkową od przedniej bocznej.' },
    margo_med:      { name: 'Brzeg przyśrodkowy', latin: 'margo medialis', group: 'ogolne', palp: true, pair: true,
                      def: 'Od strony tułowia. W dole przechodzi w grzebień nadkłykciowy przyśrodkowy i kończy się na nadkłykciu przyśrodkowym. Oddziela powierzchnię przednią przyśrodkową od tylnej.' },
    margo_lat:      { name: 'Brzeg boczny', latin: 'margo lateralis', group: 'ogolne', palp: true, pair: true,
                      def: 'Od strony zewnętrznej. W dole przechodzi w grzebień nadkłykciowy boczny (wyczuwalny nad łokciem) i kończy się na nadkłykciu bocznym. Oddziela powierzchnię przednią boczną od tylnej.' },
    facies_am:      { name: 'Powierzchnia przednia przyśrodkowa', latin: 'facies anterior medialis', group: 'ogolne', palp: false, pair: true,
                      def: 'Między brzegiem przednim a przyśrodkowym. W połowie długości przyczepia się do niej mięsień kruczo-ramienny, niżej — ramienny.' },
    facies_al:      { name: 'Powierzchnia przednia boczna', latin: 'facies anterior lateralis', group: 'ogolne', palp: false, pair: true,
                      def: 'Między brzegiem przednim a bocznym. Leży na niej guzowatość naramienna, a w dolnej połowie przyczepia się mięsień ramienny.' },
    facies_post:    { name: 'Powierzchnia tylna', latin: 'facies posterior', group: 'ogolne', palp: false, pair: true,
                      def: 'Między brzegiem przyśrodkowym a bocznym. Skośnie przecina ją bruzda nerwu promieniowego; powyżej przyczepia się głowa boczna, poniżej głowa przyśrodkowa mięśnia trójgłowego.' },
    tub_deltoid:    { name: 'Guzowatość naramienna', latin: 'tuberositas deltoidea', group: 'ogolne', palp: true, pair: true,
                      def: 'Chropowate wzniesienie na bocznej stronie trzonu, w połowie jego długości. Przyczep mięśnia naramiennego — wyczuwalna tam, gdzie mięsień zwęża się w ścięgno.' },
    sulcus_radial:  { name: 'Bruzda nerwu promieniowego', latin: 'sulcus nervi radialis', group: 'ogolne', palp: false, pair: true,
                      def: 'Płytka bruzda biegnąca skośnie w dół i w bok po tylnej powierzchni trzonu. Leżą w niej nerw promieniowy i naczynia głębokie ramienia — przy złamaniach trzonu nerw łatwo uszkodzić.' },
    // część górna (nasada bliższa)
    caput:          { name: 'Głowa kości ramiennej', latin: 'caput humeri', group: 'gora', palp: false, pair: true,
                      def: 'Półkulista, gładka powierzchnia stawowa zwrócona przyśrodkowo, ku górze i ku tyłowi. Łączy się z panewką łopatki w stawie ramiennym.' },
    collum_anat:    { name: 'Szyjka anatomiczna', latin: 'collum anatomicum', group: 'gora', palp: false, pair: true,
                      def: 'Płytkie przewężenie tuż przy brzegu głowy, oddziela ją od guzków. Przyczepia się tu torebka stawu ramiennego.' },
    tub_major:      { name: 'Guzek większy', latin: 'tuberculum majus', group: 'gora', palp: true, pair: true,
                      def: 'Najbardziej boczna część nasady bliższej, wyczuwalny pod mięśniem naramiennym poniżej wyrostka barkowego. Przyczep mięśni nadgrzebieniowego, podgrzebieniowego i obłego mniejszego.' },
    tub_minor:      { name: 'Guzek mniejszy', latin: 'tuberculum minus', group: 'gora', palp: true, pair: true,
                      def: 'Mniejsze wzniesienie na przedniej stronie nasady bliższej, przyśrodkowo od bruzdy międzyguzkowej. Przyczep mięśnia podłopatkowego.' },
    sulcus_it:      { name: 'Bruzda międzyguzkowa', latin: 'sulcus intertubercularis', group: 'gora', palp: true, pair: true,
                      def: 'Rowek między guzkiem większym a mniejszym, dalej między ich grzebieniami. Biegnie w nim ścięgno głowy długiej mięśnia dwugłowego ramienia — wyczuwalne przy obracaniu ramienia.' },
    crista_major:   { name: 'Grzebień guzka większego', latin: 'crista tuberculi majoris', group: 'gora', palp: false, pair: true,
                      def: 'Listewka biegnąca w dół od guzka większego, boczny brzeg bruzdy międzyguzkowej. Przyczep mięśnia piersiowego większego.' },
    crista_minor:   { name: 'Grzebień guzka mniejszego', latin: 'crista tuberculi minoris', group: 'gora', palp: false, pair: true,
                      def: 'Listewka biegnąca w dół od guzka mniejszego, przyśrodkowy brzeg bruzdy międzyguzkowej. Przyczep mięśni najszerszego grzbietu i obłego większego.' },
    collum_chir:    { name: 'Szyjka chirurgiczna', latin: 'collum chirurgicum', group: 'gora', palp: false, pair: true,
                      def: 'Przewężenie poniżej guzków, na granicy nasady bliższej i trzonu. Częste miejsce złamań u osób starszych; obok biegnie nerw pachowy.' },
    // część dolna (nasada dalsza)
    condylus:       { name: 'Kłykieć kości ramiennej', latin: 'condylus humeri', group: 'dol', palp: false, pair: true,
                      def: 'Dolna, stawowa część nasady dalszej. Składa się z bloczka (przyśrodkowo) i główki (bocznie); tworzy staw łokciowy.' },
    trochlea:       { name: 'Bloczek kości ramiennej', latin: 'trochlea humeri', group: 'dol', palp: false, pair: true,
                      def: 'Przyśrodkowa część kłykcia w kształcie szpulki. Łączy się z wcięciem bloczkowym kości łokciowej (staw ramienno-łokciowy).' },
    capitulum:      { name: 'Główka kości ramiennej', latin: 'capitulum humeri', group: 'dol', palp: false, pair: true,
                      def: 'Boczna, półkulista część kłykcia, zwrócona do przodu. Łączy się z dołkiem głowy kości promieniowej (staw ramienno-promieniowy).' },
    fossa_coronoid: { name: 'Dół dziobiasty', latin: 'fossa coronoidea', group: 'dol', palp: false, pair: true,
                      def: 'Zagłębienie na przedniej powierzchni nad bloczkiem. Przy pełnym zgięciu łokcia wchodzi w nie wyrostek dziobiasty kości łokciowej.' },
    fossa_radial:   { name: 'Dół promieniowy', latin: 'fossa radialis', group: 'dol', palp: false, pair: true,
                      def: 'Płytkie zagłębienie na przedniej powierzchni nad główką. Przy pełnym zgięciu łokcia wchodzi w nie brzeg głowy kości promieniowej.' },
    fossa_olecrani: { name: 'Dół łokciowy', latin: 'fossa olecrani', group: 'dol', palp: false, pair: true,
                      def: 'Głębokie zagłębienie na tylnej powierzchni nad bloczkiem. Przy wyprostowanym łokciu leży w nim wyrostek łokciowy kości łokciowej.' },
    epicond_med:    { name: 'Nadkłykieć przyśrodkowy', latin: 'epicondylus medialis', group: 'dol', palp: true, pair: true,
                      def: 'Duże, wyraźnie wystające wzniesienie po przyśrodkowej stronie łokcia. Przyczep zginaczy nadgarstka i palców oraz nawrotnego obłego. Za nim, w bruździe, biegnie nerw łokciowy („prąd” przy uderzeniu łokciem).' },
    epicond_lat:    { name: 'Nadkłykieć boczny', latin: 'epicondylus lateralis', group: 'dol', palp: true, pair: true,
                      def: 'Mniejsze wzniesienie po bocznej stronie łokcia, łatwo wyczuwalne. Przyczep prostowników nadgarstka i palców, odwracacza i mięśnia łokciowego; ból w tym miejscu to typowo „łokieć tenisisty”.' },
  },
};

// Kolejność kości w menu i grupy (RA — ramię)
export const KONCZYNA_ORDER = ['humerus'];
export const KONCZYNA_GROUP = { humerus: 'RA' };
