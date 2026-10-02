// Opisy mięśni (moduł „Mięśnie grzbietu”). Plik można edytować bez znajomości reszty kodu.
// Klucze części (desc, trans, asc, all) odpowiadają nazwom siatek w models/pakiety/miesnie/warstwa-<n>.pak
// (np. trapezius_desc_L). Strony: L = lewa, R = prawa strona ciała.
// WERSJA ROBOCZA: opisy wymagają weryfikacji przez nauczyciela anatomii.
//
// attach — co podświetlić na modelu jako przyczepy:
//   vertebrae: klucze kręgów (C1…L5, S), bones: kości tła (occipital, clavicle, scapula, humerus, hip), ribs: numery żeber.

export const LAYERS = {
  1: { name: 'Warstwa powierzchowna', short: 'Warstwa 1', text: 'Mięśnie leżące tuż pod skórą i powięzią powierzchowną. Łączą tułów z obręczą barkową i kończyną górną (mięśnie kolcowo-ramienne).' },
  2: { name: 'Warstwa pośrednia', short: 'Warstwa 2', text: 'Leży pod mięśniem czworobocznym i najszerszym grzbietu. Mięśnie równoległoboczne i dźwigacz łopatki łączą kręgosłup z łopatką; cienkie mięśnie zębate tylne biegną od kręgosłupa do żeber i poruszają nimi przy oddychaniu.' },
  3: { name: 'Warstwa głęboka', short: 'Warstwa 3', soon: true },
};

const th = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => `Th${a + i}`);
const lumbar = ['L1', 'L2', 'L3', 'L4', 'L5'];

export const MUSCLES = {
  trapezius: {
    name: 'Mięsień czworoboczny', latin: 'Musculus trapezius', layer: 1,
    shape: 'Płaski, trójkątny mięsień; oba razem tworzą trapez od potylicy do Th12 i barków.',
    parts: {
      desc: {
        name: 'Część zstępująca', latin: 'pars descendens',
        origin: 'Kresa karkowa górna i guzowatość potyliczna zewnętrzna kości potylicznej, więzadło karkowe.',
        insertion: 'Boczna 1/3 obojczyka.',
        action: 'Unosi łopatkę i bark, obraca łopatkę (kąt dolny na zewnątrz) przy unoszeniu ramienia powyżej poziomu. Przy ustalonej obręczy prostuje głowę; działając jednostronnie zgina ją w swoją stronę i obraca w stronę przeciwną.',
        attach: { vertebrae: [], bones: ['occipital', 'clavicle'], ribs: [] },
      },
      trans: {
        name: 'Część poprzeczna', latin: 'pars transversa',
        origin: 'Wyrostki kolczyste C7–Th3 i więzadło nadkolcowe.',
        insertion: 'Wyrostek barkowy i grzebień łopatki.',
        action: 'Przywodzi łopatkę — ściąga ją do kręgosłupa i cofa bark.',
        attach: { vertebrae: ['C7', 'Th1', 'Th2', 'Th3'], bones: ['scapula'], ribs: [] },
      },
      asc: {
        name: 'Część wstępująca', latin: 'pars ascendens',
        origin: 'Wyrostki kolczyste Th4–Th12 i więzadło nadkolcowe.',
        insertion: 'Przyśrodkowa część grzebienia łopatki.',
        action: 'Obniża i przywodzi łopatkę; razem z częścią zstępującą obraca ją tak, że panewka kieruje się ku górze.',
        attach: { vertebrae: th(4, 12), bones: ['scapula'], ribs: [] },
      },
    },
    nerve: 'Nerw dodatkowy (XI nerw czaszkowy) oraz gałęzie splotu szyjnego (C2–C4).',
    massage: 'Część zstępująca to wyraźny wał między szyją a barkiem. Często jest napięta (praca przy biurku, stres), łatwo ją uchwycić między kciuk i palce przy ugniataniu. Części poprzeczna i wstępująca są cienkie, leżą na mięśniach równoległobocznych i prostowniku grzbietu — opracowuje się je głaskaniem i rozcieraniem wzdłuż przebiegu włókien.',
    palpation: 'Górny brzeg części zstępującej i jej przyczep na obojczyku. Przy ściąganiu łopatek do siebie napina się część poprzeczna.',
  },
  latissimus: {
    name: 'Mięsień najszerszy grzbietu', latin: 'Musculus latissimus dorsi', layer: 1,
    shape: 'Największy powierzchniowo mięsień ciała. Szeroki i płaski w dole pleców, zbiega się w wąskie ścięgno pod pachą.',
    parts: {
      all: {
        name: 'Mięsień najszerszy grzbietu', latin: 'm. latissimus dorsi',
        origin: 'Wyrostki kolczyste Th7–Th12, kręgów lędźwiowych i kości krzyżowej (przez powięź piersiowo-lędźwiową), tylna część grzebienia biodrowego, dolne 3–4 żebra; często także kąt dolny łopatki.',
        insertion: 'Grzebień guzka mniejszego kości ramiennej (dno bruzdy międzyguzkowej).',
        action: 'Przywodzi ramię, prostuje je (cofa) i obraca do wewnątrz. Przy ustalonym ramieniu podciąga tułów (podciąganie na drążku). Pomocniczo przy wydechu i kaszlu.',
        attach: { vertebrae: [...th(7, 12), ...lumbar, 'S'], bones: ['hip', 'humerus', 'scapula'], ribs: [9, 10, 11, 12] },
      },
    },
    nerve: 'Nerw piersiowo-grzbietowy (C6–C8).',
    massage: 'Tworzy tylny fałd pachowy — można go chwycić między palce i ugniatać. W dolnej części pleców jest cienki i rozcięgnisty; opracowuje się go głaskaniem i rozcieraniem od miednicy w stronę pachy.',
    palpation: 'Tylny fałd pachowy, najlepiej przy oporowanym przywodzeniu ramienia. Boczny brzeg mięśnia widać przy napięciu (np. przy podciąganiu).',
  },
};

MUSCLES.rhomboid = {
  name: 'Mięśnie równoległoboczne', latin: 'Musculi rhomboidei', layer: 2,
  shape: 'Dwa płaskie, czworoboczne mięśnie (mniejszy powyżej, większy poniżej) między kręgosłupem a brzegiem przyśrodkowym łopatki. Leżą pod mięśniem czworobocznym.',
  parts: {
    minor: {
      name: 'Mięsień równoległoboczny mniejszy', latin: 'm. rhomboideus minor',
      origin: 'Wyrostki kolczyste C6–C7 (w części podręczników C7–Th1) i dolna część więzadła karkowego.',
      insertion: 'Brzeg przyśrodkowy łopatki na wysokości grzebienia łopatki.',
      action: 'Przywodzi łopatkę do kręgosłupa i unosi ją.',
      attach: { vertebrae: ['C6', 'C7'], bones: ['scapula'], ribs: [] },
    },
    major: {
      name: 'Mięsień równoległoboczny większy', latin: 'm. rhomboideus major',
      origin: 'Wyrostki kolczyste Th1–Th4 (w części podręczników Th2–Th5) i więzadło nadkolcowe.',
      insertion: 'Brzeg przyśrodkowy łopatki od grzebienia do kąta dolnego.',
      action: 'Przywodzi i unosi łopatkę, obraca ją tak, że panewka kieruje się w dół; razem z zębatym przednim dociska łopatkę do klatki piersiowej.',
      attach: { vertebrae: ['Th1', 'Th2', 'Th3', 'Th4'], bones: ['scapula'], ribs: [] },
    },
  },
  nerve: 'Nerw grzbietowy łopatki (C4–C5).',
  massage: 'Opracowuje się je przez mięsień czworoboczny, w przestrzeni między kręgosłupem a brzegiem przyśrodkowym łopatki — rozcieranie i ugniatanie wzdłuż brzegu łopatki. Łatwiej do nich dotrzeć, gdy ręka pacjenta leży na plecach (łopatka odstaje).',
  palpation: 'Przy ściąganiu łopatek do siebie (z oporem) napinają się pod częścią poprzeczną mięśnia czworobocznego.',
};

MUSCLES.levator_scapulae = {
  name: 'Mięsień dźwigacz łopatki', latin: 'Musculus levator scapulae', layer: 2,
  shape: 'Wąski, taśmowaty mięsień w bocznej części szyi, biegnący od górnych kręgów szyjnych do kąta górnego łopatki. W dolnej części przykryty mięśniem czworobocznym.',
  parts: {
    all: {
      name: 'Mięsień dźwigacz łopatki', latin: 'm. levator scapulae',
      origin: 'Guzki tylne wyrostków poprzecznych C1–C4.',
      insertion: 'Kąt górny łopatki i górna część jej brzegu przyśrodkowego.',
      action: 'Unosi łopatkę i obraca ją tak, że panewka kieruje się w dół. Przy ustalonej łopatce zgina szyję w swoją stronę i lekko ją obraca.',
      attach: { vertebrae: ['C1', 'C2', 'C3', 'C4'], bones: ['scapula'], ribs: [] },
    },
  },
  nerve: 'Nerw grzbietowy łopatki (C5) i gałęzie splotu szyjnego (C3–C4).',
  massage: 'Częste źródło bólu „karku i barku” przy pracy siedzącej. Bolesny bywa przyczep przy kącie górnym łopatki — opracowuje się go rozcieraniem okrężnym, ostrożnie, bez silnego ucisku.',
  palpation: 'Kąt górny łopatki (przez mięsień czworoboczny) i boczna część szyi przy pochyleniu głowy w stronę przeciwną.',
};

MUSCLES.serratus_post = {
  name: 'Mięśnie zębate tylne', latin: 'Musculi serrati posteriores', layer: 2,
  shape: 'Dwa cienkie, płaskie mięśnie z „ząbkami” przyczepionymi do żeber: górny pod mięśniami równoległobocznymi, dolny pod najszerszym grzbietu. Należą do mięśni kolcowo-żebrowych.',
  parts: {
    sup: {
      name: 'Mięsień zębaty tylny górny', latin: 'm. serratus posterior superior',
      origin: 'Wyrostki kolczyste C6–Th2 i więzadło karkowe.',
      insertion: 'Żebra II–V, bocznie od kątów żeber.',
      action: 'Unosi żebra — pomocniczy mięsień wdechowy.',
      attach: { vertebrae: ['C6', 'C7', 'Th1', 'Th2'], bones: [], ribs: [2, 3, 4, 5] },
    },
    inf: {
      name: 'Mięsień zębaty tylny dolny', latin: 'm. serratus posterior inferior',
      origin: 'Wyrostki kolczyste Th11–L2 (przez powięź piersiowo-lędźwiową).',
      insertion: 'Dolne brzegi żeber IX–XII.',
      action: 'Obniża i przytrzymuje dolne żebra (pomocniczo przy wydechu, stabilizuje żebra przy pracy przepony).',
      attach: { vertebrae: ['Th11', 'Th12', 'L1', 'L2'], bones: [], ribs: [9, 10, 11, 12] },
    },
  },
  nerve: 'Nerwy międzyżebrowe: górny Th1–Th4, dolny Th9–Th12.',
  massage: 'Są cienkie i leżą głęboko pod innymi mięśniami, więc nie opracowuje się ich osobno. Warto pamiętać o nich przy masażu oddechowym i przy bólu w okolicy dolnych żeber.',
  palpation: 'Praktycznie niewyczuwalne osobno — przykryte grubszymi mięśniami.',
};

// Nazwy kości tła (do opisów przyczepów i etykiet)
export const CTX_BONES = {
  occipital: 'Kość potyliczna',
  clavicle: 'Obojczyk',
  scapula: 'Łopatka',
  humerus: 'Kość ramienna',
  hip: 'Kość biodrowa',
};
