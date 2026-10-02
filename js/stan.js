// Stan aplikacji, stałe (kolejność kręgów, moduły) i wspólne zbiory siatek. Nie importuje innych modułów strony.
import * as MUS from './miesnie.js';

export const ORDER = ['C1','C2','C3','C4','C5','C6','C7',
  'Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12',
  'L1','L2','L3','L4','L5','S'];
export const REGION_KEYS = ['C', 'Th', 'L', 'S'];
export const regionOf = (key) => {
  const k = key.startsWith('D_') ? key.slice(2) : key;
  return k.startsWith('Th') ? 'Th' : k[0];
};
export const discLabel = (key) => {
  const k = key.slice(2);
  const next = ORDER[ORDER.indexOf(k) + 1];
  return `${k}/${next === 'S' ? 'S1' : next}`;
};

export const $ = (s) => document.querySelector(s);
export const stageEl = $('#stage');
export const panelEl = $('#panel');
export const rulerEl = $('#ruler');
export const bigcodeEl = $('#bigcode');

/* ---------- State ---------- */
export const state = {
  mode: 'atlas',          // 'atlas' | 'quiz'
  selected: 'C7',
  hovered: null,
  showDiscs: true,
  tint: false,
  isolate: false,
  labels: true,
  quiz: null,
  focusPart: null,
  edit: { part: null, slot: 0 },
  ribs: false,
  layers: Object.fromEntries(MUS.READY_LAYERS.map((n, i) => [n, i === 0])),   // widoczne warstwy mięśni (głębsze po włączeniu)
  attach: true,           // podświetlanie przyczepów na kościach
  lastBone: 'C7',         // ostatnio wybrany kręg (po powrocie z modułu mięśni)
  module: null,           // 'kregoslup' | 'kregi' | 'zebra' (null = jeszcze nie wybrano)
};

/* ---------- Moduły: co oglądamy i co trzeba pobrać ---------- */
export const TH_KEYS = ORDER.filter((k) => k.startsWith('Th'));
export const MODULES = {
  kregoslup: { group: 'Kości', kind: 'bones', name: 'Cały kręgosłup', desc: 'Wszystkie kręgi i krążki. Szczegóły kręgu pobierają się po wybraniu go albo przybliżeniu.',
    base: ['przeglad-C', 'przeglad-Th', 'przeglad-L', 'przeglad-S'], keys: ORDER },
  kregi: { group: 'Kości', kind: 'bones', name: 'Pojedyncze kręgi', desc: 'Jeden kręg naraz, w pełnej szczegółowości. Pobiera tylko oglądany kręg.',
    base: [], keys: ORDER },
  zebra: { group: 'Kości', kind: 'bones', name: 'Kręgi piersiowe i żebra', desc: 'Th1–Th12 z żebrami, dołki żebrowe i stawy żebrowo-kręgowe.',
    base: ['przeglad-Th', 'zebra-przeglad'], keys: TH_KEYS },
  grzbiet: { group: 'Mięśnie', kind: 'muscles', name: 'Mięśnie grzbietu',
    desc: 'Warstwami, z przyczepami zaznaczonymi na kościach. Na start warstwa powierzchowna; głębsze pobierają się po włączeniu.',
    base: ['przeglad-C', 'przeglad-Th', 'przeglad-L', 'przeglad-S', 'kosci-tla', 'zebra-przeglad', MUS.layerPack(MUS.READY_LAYERS[0])],
    keys: MUS.MUSCLE_KEYS },
};
export const muscleMode = () => MODULES[state.module]?.kind === 'muscles';
export const modKeys = () => MODULES[state.module]?.keys || ORDER;
export const single = () => state.module === 'kregi';
// widok z bliska jednego kręgu (pozostałe przezroczyste albo ukryte)
export const closeUp = () => (state.isolate && state.mode === 'atlas') || state.mode === 'edit' || single() || (state.mode === 'quiz' && state.quiz?.type === 'czesc');
export const currentKey = () => (state.mode === 'quiz' ? state.quiz?.target : state.selected) || state.selected;

export const parts = {};   // key -> mesh (kręgi i krążki)
export const muscleMeshes = [];   // części mięśni (obie strony)
export const ctxMeshes = [];      // kości tła: łopatka, obojczyk, kość ramienna, biodrowa, potyliczna
export const byName = {};         // nazwa siatki -> mesh (mięśnie i kości tła)
export const objectsOf = (k) => (parts[k] ? [parts[k]] : muscleMeshes.filter((m) => m.userData.muscle === k));
export const hasKey = (k) => objectsOf(k).length > 0;

export const ribMeshes = [];      // żebra (rib), dołki na kręgach (facet) i powierzchnie stawowe żeber (ribfacet)
export const ribByName = {};

// #debug w adresie pokazuje licznik (kl./s, czas klatki, trójkąty, rozdzielczość, jakość).
export const DEBUG = /(^|[#&?])debug\b/.test(location.hash + location.search);
export const COARSE = matchMedia('(pointer: coarse)').matches;      // telefon / tablet

// stan interfejsu współdzielony między modułami
export const ui = {
  panelRibs: null,      // czy panel pokazuje już części żeber
  labelMode: 'palp',    // etykiety: punkty wyczuwalne (palp) albo części kręgu (parts)
};
