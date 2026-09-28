// Treści opisowe atlasu. Plik można edytować bez znajomości reszty kodu.
// Klucze części odpowiadają nazwom węzłów w models/kregoslup.glb.
// WERSJA ROBOCZA: opisy wymagają weryfikacji przez nauczyciela anatomii.

export const REGIONS = {
  C:  { name: 'Odcinek szyjny',    latin: 'Pars cervicalis', count: '7 kręgów (C1–C7)',
        curve: 'Lordoza szyjna',
        text: 'Najbardziej ruchomy odcinek kręgosłupa. Kręgi mają małe trzony, otwory w wyrostkach poprzecznych (przez otwory C6–C1 biegnie tętnica kręgowa) i zwykle rozdwojone wyrostki kolczyste. C1 i C2 mają budowę nietypową.' },
  Th: { name: 'Odcinek piersiowy', latin: 'Pars thoracica', count: '12 kręgów (Th1–Th12)',
        curve: 'Kifoza piersiowa',
        text: 'Kręgi łączą się z żebrami, dlatego mają dołki żebrowe na trzonach i (Th1–Th10) na wyrostkach poprzecznych. Długie wyrostki kolczyste skierowane są skośnie w dół i zachodzą na siebie dachówkowato, co ogranicza wyprost. W palpacji przydaje się „reguła trójek”: im niżej w odcinku piersiowym (do ok. Th9), tym bardziej wierzchołek wyrostka kolczystego leży poniżej trzonu własnego kręgu.' },
  L:  { name: 'Odcinek lędźwiowy', latin: 'Pars lumbalis', count: '5 kręgów (L1–L5)',
        curve: 'Lordoza lędźwiowa',
        text: 'Największe, najbardziej obciążone trzony. Wyrostki kolczyste są szerokie, czworoboczne i ustawione poziomo, więc łatwo je wyczuć. Zamiast wyrostków poprzecznych mają wyrostki żebrowe (processus costales) — pozostałość żeber.' },
  S:  { name: 'Kość krzyżowa',     latin: 'Os sacrum', count: '5 zrośniętych kręgów (S1–S5)',
        curve: 'Kifoza krzyżowa',
        text: 'Łączy kręgosłup z miednicą przez stawy krzyżowo-biodrowe. Kości guzicznej (os coccygis) nie ma w tym modelu — nie ma jej w użytym zbiorze danych.' },
};

// Wspólny opis krążka
export const DISC = {
  latin: 'Discus intervertebralis',
  text: 'Chrzęstno-włóknista „poduszka” między trzonami. Na zewnątrz pierścień włóknisty (anulus fibrosus), w środku galaretowate jądro miażdżyste (nucleus pulposus). Nie ma krążka między potylicą a C1 ani między C1 a C2. Krążki odpowiadają za ok. 1/4 długości kręgosłupa powyżej kości krzyżowej i są najgrubsze w odcinku lędźwiowym.',
  notes: {
    'D_L4': 'Razem z L5/S1 najczęstsze miejsce przepukliny (dyskopatii) w odcinku lędźwiowym.',
    'D_L5': 'Krążek lędźwiowo-krzyżowy (L5/S1). Obok L4/L5 najczęstsze miejsce przepukliny.',
    'D_C5': 'W odcinku szyjnym zmiany zwyrodnieniowe najczęściej dotyczą poziomów C5/C6 i C6/C7.',
    'D_C6': 'W odcinku szyjnym zmiany zwyrodnieniowe najczęściej dotyczą poziomów C5/C6 i C6/C7.',
  },
};

// Opisy poszczególnych kręgów
export const PARTS = {
  C1: {
    name: 'Kręg szczytowy', latin: 'Atlas', short: 'C1',
    features: [
      'Nie ma trzonu ani wyrostka kolczystego — tworzy go pierścień z łuku przedniego i tylnego oraz dwóch mas bocznych.',
      'Na łuku przednim od tyłu leży dołek zęba, w którym obraca się ząb kręgu C2.',
      'Górne powierzchnie stawowe łączą się z kłykciami kości potylicznej — ruch „tak” (zginanie i prostowanie głowy).',
      'Ma najdłuższe wyrostki poprzeczne w odcinku szyjnym.',
    ],
    massage: 'Wyrostek poprzeczny można delikatnie wyczuć między wyrostkiem sutkowatym a kątem żuchwy — okolica wrażliwa, bez silnego ucisku.',
    muscles: 'Dźwigacz łopatki (wyrostki poprzeczne C1–C4), płat szyi, mięśnie podpotyliczne.',
  },
  C2: {
    name: 'Kręg obrotowy', latin: 'Axis', short: 'C2',
    features: [
      'Charakterystyczny ząb (dens axis) skierowany ku górze — oś obrotu dla kręgu szczytowego.',
      'Staw szczytowo-obrotowy odpowiada za dużą część rotacji głowy — ruch „nie”.',
      'Duży, masywny, rozdwojony wyrostek kolczysty.',
    ],
    massage: 'Pierwszy wyraźnie wyczuwalny wyrostek kolczysty poniżej guzowatości potylicznej zewnętrznej. Dobry punkt startowy do liczenia kręgów szyjnych od góry.',
    muscles: 'Prosty tylny większy głowy i skośny dolny głowy (wyrostek kolczysty), mięśnie przykręgosłupowe.',
  },
  C3: {
    name: 'Trzeci kręg szyjny', latin: 'Vertebra cervicalis III', short: 'C3',
    features: [
      'Typowy kręg szyjny: mały, poprzecznie wydłużony trzon z haczykami trzonu (processus uncinati).',
      'Otwory wyrostków poprzecznych, przez które biegnie tętnica kręgowa.',
      'Krótki, rozdwojony wyrostek kolczysty.',
    ],
    massage: 'Wyrostki kolczyste C3–C5 leżą głęboko w lordozie i są przykryte więzadłem karkowym — trudno je wyczuć pojedynczo.',
    muscles: 'Dźwigacz łopatki (wyrostek poprzeczny), mięśnie pochyłe, półkolcowy.',
  },
  C4: {
    name: 'Czwarty kręg szyjny', latin: 'Vertebra cervicalis IV', short: 'C4',
    features: [
      'Typowy kręg szyjny z haczykami trzonu i otworami wyrostków poprzecznych.',
      'Wyrostki poprzeczne kończą się guzkiem przednim i tylnym, między którymi biegną nerwy rdzeniowe.',
    ],
    massage: 'Z boku szyi wyrostki poprzeczne leżą blisko naczyń i splotu ramiennego — masujemy płasko, bez punktowego ucisku.',
    muscles: 'Dźwigacz łopatki (wyrostek poprzeczny), mięśnie pochyłe.',
  },
  C5: {
    name: 'Piąty kręg szyjny', latin: 'Vertebra cervicalis V', short: 'C5',
    features: [
      'Typowy kręg szyjny.',
      'Poziom C5/C6 jest jednym z najbardziej obciążonych w szyi.',
    ],
    massage: 'Okolica częstych dolegliwości przeciążeniowych szyi (np. praca przy komputerze).',
    muscles: 'Mięśnie pochyłe, mięśnie przykręgosłupowe.',
  },
  C6: {
    name: 'Szósty kręg szyjny', latin: 'Vertebra cervicalis VI', short: 'C6',
    features: [
      'Guzek przedni wyrostka poprzecznego jest duży — to guzek szyjny (tuberculum caroticum).',
      'Do guzka szyjnego można docisnąć tętnicę szyjną wspólną.',
      'Tętnica kręgowa zwykle wchodzi w otwory poprzeczne właśnie na poziomie C6.',
    ],
    massage: 'Na przedniej i bocznej stronie szyi nie wywieramy silnego ucisku (tętnica szyjna, zatoka szyjna). Przy wyproście szyi wyrostek kolczysty C6 „ucieka” do przodu, a C7 pozostaje wyczuwalny — sposób na odróżnienie tych kręgów.',
    muscles: 'Mięśnie pochyłe, długi szyi.',
  },
  C7: {
    name: 'Kręg wystający', latin: 'Vertebra prominens', short: 'C7',
    features: [
      'Najdłuższy wyrostek kolczysty w odcinku szyjnym, zwykle nierozdwojony.',
      'Otwory wyrostków poprzecznych są małe; tętnica kręgowa zwykle przez nie nie przechodzi.',
      'Przejście szyjno-piersiowe — zmiana lordozy w kifozę.',
    ],
    massage: 'Najważniejszy punkt orientacyjny do liczenia kręgów. Uwaga: u części osób wyrostek kolczysty Th1 wystaje równie mocno.',
    muscles: 'Czworoboczny (część zstępująca i więzadło karkowe), równoległoboczny mniejszy (C7–Th1), zębaty tylny górny.',
  },
  Th1: {
    name: 'Pierwszy kręg piersiowy', latin: 'Vertebra thoracica I', short: 'Th1',
    features: [
      'Na trzonie pełny dołek żebrowy dla 1. żebra i połowa dołka dla 2. żebra.',
      'Wyrostek kolczysty długi i niemal poziomy, podobny do C7.',
    ],
    massage: 'Wraz z C7 tworzy wyraźne uwypuklenie u podstawy karku.',
    muscles: 'Czworoboczny, równoległoboczny mniejszy, zębaty tylny górny, płatowaty głowy.',
  },
  Th2: {
    name: 'Drugi kręg piersiowy', latin: 'Vertebra thoracica II', short: 'Th2',
    features: ['Typowy kręg piersiowy: trzon w kształcie serca, okrągły otwór kręgowy, dołki żebrowe na trzonie i wyrostkach poprzecznych.'],
    massage: 'Poziom górnej części łopatki.',
    muscles: 'Równoległoboczny większy (Th2–Th5), czworoboczny, zębaty tylny górny.',
  },
  Th3: {
    name: 'Trzeci kręg piersiowy', latin: 'Vertebra thoracica III', short: 'Th3',
    features: ['Typowy kręg piersiowy.'],
    massage: 'Wyrostek kolczysty leży mniej więcej na wysokości przyśrodkowego końca grzebienia łopatki (przy swobodnie opuszczonych ramionach).',
    muscles: 'Równoległoboczny większy, czworoboczny (część poprzeczna).',
  },
  Th4: {
    name: 'Czwarty kręg piersiowy', latin: 'Vertebra thoracica IV', short: 'Th4',
    features: ['Typowy kręg piersiowy.'],
    massage: 'Obszar między łopatkami — częste napięcia mięśni równoległobocznych.',
    muscles: 'Równoległoboczny większy, czworoboczny.',
  },
  Th5: {
    name: 'Piąty kręg piersiowy', latin: 'Vertebra thoracica V', short: 'Th5',
    features: ['Typowy kręg piersiowy.'],
    massage: 'Dolna granica przyczepu mięśnia równoległobocznego większego.',
    muscles: 'Równoległoboczny większy, czworoboczny.',
  },
  Th6: {
    name: 'Szósty kręg piersiowy', latin: 'Vertebra thoracica VI', short: 'Th6',
    features: ['Typowy kręg piersiowy; wyrostki kolczyste w środkowej części odcinka są najbardziej pochylone.'],
    massage: 'Pamiętaj o „regule trójek” — wyrostek kolczysty leży niżej niż trzon tego kręgu.',
    muscles: 'Czworoboczny, mięśnie przykręgosłupowe.',
  },
  Th7: {
    name: 'Siódmy kręg piersiowy', latin: 'Vertebra thoracica VII', short: 'Th7',
    features: ['Typowy kręg piersiowy, z mocno pochylonym wyrostkiem kolczystym.'],
    massage: 'Wyrostek kolczysty leży mniej więcej na wysokości kątów dolnych łopatek.',
    muscles: 'Najszerszy grzbietu (od Th7 w dół), czworoboczny.',
  },
  Th8: {
    name: 'Ósmy kręg piersiowy', latin: 'Vertebra thoracica VIII', short: 'Th8',
    features: ['Typowy kręg piersiowy.'],
    massage: 'Środkowa część pleców; pod dłonią czuć wyraźnie pasma prostownika grzbietu.',
    muscles: 'Najszerszy grzbietu, czworoboczny.',
  },
  Th9: {
    name: 'Dziewiąty kręg piersiowy', latin: 'Vertebra thoracica IX', short: 'Th9',
    features: ['Typowy kręg piersiowy.'],
    massage: 'Poniżej tego poziomu wyrostki kolczyste znów zbliżają się do poziomu trzonów.',
    muscles: 'Najszerszy grzbietu, czworoboczny.',
  },
  Th10: {
    name: 'Dziesiąty kręg piersiowy', latin: 'Vertebra thoracica X', short: 'Th10',
    features: ['Zwykle pojedynczy dołek żebrowy na trzonie dla 10. żebra.'],
    massage: 'Dolna część klatki piersiowej od tyłu.',
    muscles: 'Najszerszy grzbietu, czworoboczny.',
  },
  Th11: {
    name: 'Jedenasty kręg piersiowy', latin: 'Vertebra thoracica XI', short: 'Th11',
    features: [
      'Pełny dołek żebrowy na trzonie dla 11. żebra.',
      'Brak dołków żebrowych na wyrostkach poprzecznych (żebra wolne nie łączą się z nimi).',
    ],
    massage: 'Okolica żeber wolnych — żebra 11. i 12. kończą się swobodnie, ucisk wykonuj ostrożnie.',
    muscles: 'Zębaty tylny dolny (Th11–L2), najszerszy grzbietu, czworoboczny.',
  },
  Th12: {
    name: 'Dwunasty kręg piersiowy', latin: 'Vertebra thoracica XII', short: 'Th12',
    features: [
      'Kręg przejściowy: górna część jak kręg piersiowy, dolne wyrostki stawowe jak w kręgach lędźwiowych.',
      'Pełny dołek żebrowy dla 12. żebra.',
    ],
    massage: 'Przejście piersiowo-lędźwiowe. Dolna granica przyczepu mięśnia czworobocznego.',
    muscles: 'Czworoboczny (część wstępująca), zębaty tylny dolny, lędźwiowy większy (od Th12), czworoboczny lędźwi (12. żebro).',
  },
  L1: {
    name: 'Pierwszy kręg lędźwiowy', latin: 'Vertebra lumbalis I', short: 'L1',
    features: [
      'Duży trzon w kształcie nerki, trójkątny otwór kręgowy.',
      'U dorosłych rdzeń kręgowy kończy się zwykle na poziomie L1/L2 (stożek rdzeniowy).',
    ],
    massage: 'Górna granica okolicy lędźwiowej.',
    muscles: 'Lędźwiowy większy, odnogi przepony (L1–L3), zębaty tylny dolny, najszerszy grzbietu (przez powięź piersiowo-lędźwiową).',
  },
  L2: {
    name: 'Drugi kręg lędźwiowy', latin: 'Vertebra lumbalis II', short: 'L2',
    features: ['Typowy kręg lędźwiowy: wyrostki żebrowe, wyrostki suteczkowate na wyrostkach stawowych górnych.'],
    massage: 'Nerki leżą mniej więcej między Th12 a L3, bocznie od kręgosłupa — w tej okolicy nie stosujemy mocnego, punktowego ucisku ani oklepywania.',
    muscles: 'Lędźwiowy większy, czworoboczny lędźwi (wyrostki żebrowe), zębaty tylny dolny.',
  },
  L3: {
    name: 'Trzeci kręg lędźwiowy', latin: 'Vertebra lumbalis III', short: 'L3',
    features: [
      'Zwykle najdłuższe wyrostki żebrowe w odcinku lędźwiowym.',
      'Leży w szczycie lordozy lędźwiowej.',
    ],
    massage: 'Wyrostki żebrowe L3 to ważny przyczep mięśni i powięzi — często tkliwa okolica.',
    muscles: 'Czworoboczny lędźwi, lędźwiowy większy, wielodzielny.',
  },
  L4: {
    name: 'Czwarty kręg lędźwiowy', latin: 'Vertebra lumbalis IV', short: 'L4',
    features: ['Typowy kręg lędźwiowy.'],
    massage: 'Linia łącząca najwyższe punkty grzebieni biodrowych (linia międzygrzebieniowa) przechodzi zwykle przez wyrostek kolczysty L4 lub przestrzeń L4/L5. Najpewniejszy punkt orientacyjny w lędźwiach.',
    muscles: 'Czworoboczny lędźwi, lędźwiowy większy, wielodzielny.',
  },
  L5: {
    name: 'Piąty kręg lędźwiowy', latin: 'Vertebra lumbalis V', short: 'L5',
    features: [
      'Trzon klinowaty — wyższy z przodu niż z tyłu.',
      'Grube, stożkowate wyrostki żebrowe.',
      'Tworzy z kością krzyżową połączenie lędźwiowo-krzyżowe.',
    ],
    massage: 'Wyrostek kolczysty jest mniejszy i leży głębiej niż L4. Do wyrostków żebrowych przyczepia się więzadło biodrowo-lędźwiowe.',
    muscles: 'Wielodzielny, prostownik grzbietu, więzadło biodrowo-lędźwiowe.',
  },
  S: {
    name: 'Kość krzyżowa', latin: 'Os sacrum', short: 'S1–S5',
    features: [
      'Powstaje ze zrośnięcia pięciu kręgów krzyżowych.',
      'Wzgórek (promontorium) — wystający do przodu brzeg podstawy.',
      'Powierzchnie uchowate tworzą z kośćmi biodrowymi stawy krzyżowo-biodrowe.',
      'Grzebień krzyżowy pośrodkowy to pozostałość wyrostków kolczystych; po bokach otwory krzyżowe grzbietowe i miedniczne.',
    ],
    massage: 'Kolce biodrowe tylne górne (widoczne jako „dołeczki” lędźwiowe) leżą na wysokości S2. Kość krzyżowa to punkt przyczepu powięzi piersiowo-lędźwiowej i mięśnia pośladkowego wielkiego.',
    muscles: 'Pośladkowy wielki, prostownik grzbietu, wielodzielny, gruszkowaty (powierzchnia miedniczna), najszerszy grzbietu (przez powięź).',
  },
};

// Nazwy części kości pokazywane jako etykiety na modelu.
// palp: true = część wyczuwalna pod palcami (czarna kropka), false = niewyczuwalna (pusta kropka).
export const PART_LABELS = {
  body:       { name: 'Trzon', latin: 'corpus vertebrae', palp: false,
                def: 'Przednia, najmasywniejsza część kręgu. Przenosi ciężar ciała; między trzonami leżą krążki międzykręgowe.' },
  foramen:    { name: 'Otwór kręgowy', latin: 'foramen vertebrale', palp: false,
                def: 'Otwory wszystkich kręgów ułożone jeden nad drugim tworzą kanał kręgowy, w którym leży rdzeń kręgowy.' },
  pedicle:    { name: 'Nasada łuku', latin: 'pediculus arcus vertebrae', palp: false,
                def: 'Łączy łuk z trzonem. Między nasadami sąsiednich kręgów są otwory międzykręgowe, przez które wychodzą nerwy rdzeniowe.' },
  lamina:     { name: 'Blaszka łuku', latin: 'lamina arcus vertebrae', palp: false,
                def: 'Tylna część łuku kręgu, między wyrostkiem kolczystym a wyrostkami stawowymi. Nasady i blaszki razem tworzą łuk kręgu.' },
  spinous:    { name: 'Wyrostek kolczysty', latin: 'processus spinosus', palp: true,
                def: 'Skierowany do tyłu. Jego wierzchołki wyczuwamy pod palcami wzdłuż linii środkowej pleców. Przyczep mięśni i więzadeł.' },
  transverse: { name: 'Wyrostek poprzeczny', latin: 'processus transversus', palp: false,
                def: 'Odchodzi na boki. Przyczep mięśni; w odcinku piersiowym łączy się z guzkiem żebra.' },
  art_sup:    { name: 'Wyrostek stawowy górny', latin: 'processus articularis superior', palp: false,
                def: 'Tworzy staw międzywyrostkowy z wyrostkiem stawowym dolnym kręgu leżącego powyżej.' },
  art_inf:    { name: 'Wyrostek stawowy dolny', latin: 'processus articularis inferior', palp: false,
                def: 'Tworzy staw międzywyrostkowy z wyrostkiem stawowym górnym kręgu leżącego poniżej.' },

  // Połączenia z żebrami (tylko kręgi piersiowe). {rib} = numer żebra, {prev}/{next} = sąsiedni kręg.
  fov_sup:       { name: 'Dołek żebrowy górny', latin: 'fovea costalis superior', palp: false, ribs: true,
                   def: 'Półdołek na górnym brzegu trzonu, przy nasadzie łuku. Przyjmuje dolną połowę głowy żebra {rib}; górną połowę przyjmuje dołek żebrowy dolny kręgu {prev}.' },
  fov_inf:       { name: 'Dołek żebrowy dolny', latin: 'fovea costalis inferior', palp: false, ribs: true,
                   def: 'Półdołek na dolnym brzegu trzonu. Przyjmuje górną połowę głowy żebra {rib}; razem z dołkiem żebrowym górnym kręgu {next} tworzy panewkę stawu głowy żebra.' },
  fov_tp:        { name: 'Dołek żebrowy wyrostka poprzecznego', latin: 'fovea costalis processus transversi', palp: false, ribs: true,
                   def: 'Na przedniej stronie końca wyrostka poprzecznego. Łączy się z guzkiem żebra {rib} w stawie żebrowo-poprzecznym.' },
  rib_head:      { name: 'Głowa żebra {rib}', latin: 'caput costae', palp: false, ribs: true, rib: true,
                   def: 'Tylny koniec żebra. Łączy się z trzonami kręgów w stawie głowy żebra (articulatio capitis costae).' },
  rib_neck:      { name: 'Szyjka żebra {rib}', latin: 'collum costae', palp: false, ribs: true, rib: true,
                   def: 'Zwężony odcinek między głową a guzkiem żebra, leży przed wyrostkiem poprzecznym.' },
  rib_tub:       { name: 'Guzek żebra {rib}', latin: 'tuberculum costae', palp: false, ribs: true, rib: true,
                   def: 'Wyniosłość na tylnej powierzchni żebra. Jego powierzchnia stawowa łączy się z dołkiem żebrowym wyrostka poprzecznego (staw żebrowo-poprzeczny).' },
  rib_head_next: { name: 'Głowa żebra {rib}', latin: 'caput costae', palp: false, ribs: true, rib: true,
                   def: 'Głowa żebra leżącego niżej. Opiera się o dołek żebrowy dolny tego kręgu i dołek żebrowy górny kręgu poniżej.' },
};

// Nadpisania dla kręgów o nietypowej budowie
export const PART_LABELS_SPECIAL = {
  C1: {
    arcus_ant:    { name: 'Łuk przedni', latin: 'arcus anterior atlantis', palp: false,
                    def: 'Przednia część pierścienia kręgu szczytowego. Z przodu ma guzek przedni.' },
    arcus_post:   { name: 'Łuk tylny', latin: 'arcus posterior atlantis', palp: false,
                    def: 'Tylna część pierścienia. Zamiast wyrostka kolczystego ma guzek tylny, leżący głęboko pod mięśniami.' },
    massa_lat:    { name: 'Masa boczna', latin: 'massa lateralis atlantis', palp: false,
                    def: 'Najgrubsza część kręgu szczytowego. U góry ma powierzchnię stawową dla kłykcia kości potylicznej (ruch „tak”).' },
    fovea_dentis: { name: 'Dołek zęba', latin: 'fovea dentis', palp: false,
                    def: 'Powierzchnia stawowa na tylnej stronie łuku przedniego. Obraca się w niej ząb kręgu C2.' },
    transverse:   { name: 'Wyrostek poprzeczny', latin: 'processus transversus', palp: true,
                    def: 'Najdłuższy w odcinku szyjnym. Można go delikatnie wyczuć między wyrostkiem sutkowatym a kątem żuchwy.' },
  },
  C2: {
    dens:    { name: 'Ząb', latin: 'dens axis', palp: false,
               def: 'Wystaje z trzonu ku górze. Wokół niego kręg szczytowy razem z głową obraca się w stawie szczytowo-obrotowym (ruch „nie”).' },
    art_sup: { name: 'Powierzchnia stawowa górna', latin: 'facies articularis superior', palp: false,
               def: 'Łączy się z masą boczną kręgu szczytowego.' },
  },
  Th1: {
    fov_sup: { name: 'Dołek żebrowy górny (pełny)', def: 'Pełny, okrągły dołek dla całej głowy żebra 1 — pierwsze żebro łączy się tylko z kręgiem Th1.' },
  },
  Th10: {
    fov_sup: { def: 'Dołek dla głowy żebra 10. Często jest to pojedynczy dołek, bo żebro 10 łączy się głównie z trzonem Th10.' },
  },
  Th11: {
    fov_sup: { name: 'Dołek żebrowy (pełny)', def: 'Pełny dołek dla głowy żebra 11 — żebro łączy się tylko z tym kręgiem. Wyrostek poprzeczny Th11 nie ma dołka żebrowego.' },
  },
  Th12: {
    fov_sup: { name: 'Dołek żebrowy (pełny)', def: 'Pełny dołek dla głowy żebra 12. Wyrostek poprzeczny Th12 nie ma dołka żebrowego.' },
  },
  C3: { spinous: { palp: false, note: 'Głęboko w lordozie — trudno wyczuwalny.' } },
  C4: { spinous: { palp: false, note: 'Głęboko w lordozie — trudno wyczuwalny.' } },
  C5: { spinous: { palp: false, note: 'Głęboko w lordozie — trudno wyczuwalny.' } },
  L: {
    transverse: { name: 'Wyrostek żebrowy', latin: 'processus costalis', palp: false,
                  def: 'W kręgach lędźwiowych odpowiednik wyrostka poprzecznego — pozostałość żebra. Przyczep mięśnia czworobocznego lędźwi.' },
  },
  S: {
    promontorium:  { name: 'Wzgórek', latin: 'promontorium', palp: false,
                     def: 'Wystający do przodu brzeg podstawy kości krzyżowej, na granicy z L5.' },
    art_sup:       { name: 'Wyrostek stawowy górny', latin: 'processus articularis superior', palp: false,
                     def: 'Tworzy staw z wyrostkiem stawowym dolnym kręgu L5.' },
    canal:         { name: 'Kanał krzyżowy', latin: 'canalis sacralis', palp: false,
                     def: 'Przedłużenie kanału kręgowego. Biegną w nim korzenie nerwów krzyżowych.' },
    ala:           { name: 'Część boczna', latin: 'pars lateralis (ala)', palp: false,
                     def: 'Boczne „skrzydła” kości krzyżowej, powstałe ze zrośnięcia wyrostków poprzecznych i żeber.' },
    auricular:     { name: 'Powierzchnia uchowata', latin: 'facies auricularis', palp: false,
                     def: 'Łączy się z kością biodrową w stawie krzyżowo-biodrowym.' },
    crista_mediana:{ name: 'Grzebień krzyżowy pośrodkowy', latin: 'crista sacralis mediana', palp: true,
                     def: 'Pozostałość zrośniętych wyrostków kolczystych. Dobrze wyczuwalny w linii środkowej.' },
    apex:          { name: 'Wierzchołek', latin: 'apex ossis sacri', palp: false,
                     def: 'Dolny koniec kości krzyżowej, łączy się z kością guziczną (brak w modelu).' },
  },
  D: {
    anulus:  { name: 'Pierścień włóknisty', latin: 'anulus fibrosus', palp: false,
               def: 'Zewnętrzna część krążka z koncentrycznych warstw włókien. Twarda i wytrzymała.' },
    nucleus: { name: 'Jądro miażdżyste', latin: 'nucleus pulposus', palp: false,
               def: 'Galaretowaty środek krążka, leży nieco bliżej tyłu. Rozkłada nacisk jak poduszka wodna.' },
  },
};

// Punkty orientacyjne pokazywane na całym kręgosłupie (widok z daleka)
export const PALPATION = [
  { key: 'C2',  part: 'spinous', label: 'C2',  note: 'pierwszy wyczuwalny wyrostek pod potylicą' },
  { key: 'C7',  part: 'spinous', label: 'C7',  note: 'kręg wystający, podstawa szyi' },
  { key: 'Th3', part: 'spinous', label: 'Th3', note: 'wysokość grzebieni łopatek' },
  { key: 'Th7', part: 'spinous', label: 'Th7', note: 'dolne kąty łopatek' },
  { key: 'L4',  part: 'spinous', label: 'L4',  note: 'linia grzebieni biodrowych' },
  { key: 'S',   part: 'crista_mediana', label: 'S2', note: 'kolce biodrowe tylne górne (dołeczki)' },
];
