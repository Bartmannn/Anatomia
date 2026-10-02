// Opisy mięśni (moduł „Mięśnie grzbietu”). Plik można edytować bez znajomości reszty kodu.
// Klucze części (desc, trans, asc, all) odpowiadają nazwom siatek w models/pakiety/miesnie/warstwa-<n>.pak
// (np. trapezius_desc_L). Strony: L = lewa, R = prawa strona ciała.
// WERSJA ROBOCZA: opisy wymagają weryfikacji przez nauczyciela anatomii.
//
// attach — co podświetlić na modelu jako przyczepy:
//   vertebrae: klucze kręgów (C1…L5, S), bones: kości tła (occipital, clavicle, scapula, humerus, hip), ribs: numery żeber.

export const LAYERS = {
  1: { name: 'Warstwa powierzchowna', short: 'Warstwa 1', text: 'Mięśnie leżące tuż pod skórą i powięzią powierzchowną. Łączą tułów z obręczą barkową i kończyną górną (mięśnie kolcowo-ramienne).' },
  2: { name: 'Warstwa pośrednia', short: 'Warstwa 2', soon: true },
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

// Nazwy kości tła (do opisów przyczepów i etykiet)
export const CTX_BONES = {
  occipital: 'Kość potyliczna',
  clavicle: 'Obojczyk',
  scapula: 'Łopatka',
  humerus: 'Kość ramienna',
  hip: 'Kość biodrowa',
};
