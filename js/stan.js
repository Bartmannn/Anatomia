// Stan aplikacji, stałe (kolejność kręgów, moduły) i wspólne zbiory siatek.
// Importuje tylko części niezależne od reszty strony: miesnie.js i zestawy.js (czaszka, obręcz barkowa).
import * as MUS from './miesnie.js';
import { GROUP, SETS, isSetBone } from './zestawy.js';

export const ORDER = ['C1','C2','C3','C4','C5','C6','C7',
  'Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12',
  'L1','L2','L3','L4','L5','S'];
export const REGION_KEYS = ['C', 'Th', 'L', 'S'];
export const regionOf = (key) => {
  if (isSetBone(key)) return GROUP[key];          // NC — mózgoczaszka, VC — twarzoczaszka, OB — obręcz barkowa
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
  module: null,           // klucz z MODULES (null = jeszcze nie wybrano)
  fullDetail: false,      // pełne siatki wszystkich widocznych kości (do poprawiania punktów), zapamiętywane w przeglądarce
  side: 1,                // „Sama kość”: która z kości parzystych (0 — lewa, 1 — prawa strona ciała)
};

/* ---------- Moduły: co oglądamy i co trzeba pobrać ---------- */
export const TH_KEYS = ORDER.filter((k) => k.startsWith('Th'));
export const C_KEYS = ORDER.filter((k) => k.startsWith('C'));
// kind: bones (kręgi), set (zestaw kości z zestawy.js), muscles. keys — co można wybrać; title, sub — nagłówek strony.
// context — kręgi widoczne jako tło (nie do wybrania), ctxBones — kości tła z paczek (np. kość ramienna),
// ribs — żebra włączone na start, quiz — dozwolone rodzaje pytań (domyślnie wszystkie dla danego kind),
// solo — „Tylko wybrany” działa jako „Sama kość”: jedna kość (z pary: lewa albo prawa), bez tła.
export const MODULES = {
  kregoslup: { group: 'Kości', kind: 'bones', name: 'Cały kręgosłup', desc: 'Wszystkie kręgi i krążki. Szczegóły kręgu pobierają się po wybraniu go albo przybliżeniu.',
    title: 'Kręgosłup', sub: 'Atlas 3D · 25 kości · 23 krążki',
    base: ['przeglad-C', 'przeglad-Th', 'przeglad-L', 'przeglad-S'], keys: ORDER },
  kregi: { group: 'Kości', kind: 'bones', name: 'Pojedyncze kręgi', desc: 'Jeden kręg naraz, w pełnej szczegółowości. Pobiera tylko oglądany kręg.',
    title: 'Kręgosłup', sub: 'Atlas 3D · jeden kręg naraz',
    base: [], keys: ORDER },
  zebra: { group: 'Kości', kind: 'bones', name: 'Kręgi piersiowe i żebra', desc: 'Th1–Th12 z żebrami, dołki żebrowe i stawy żebrowo-kręgowe.',
    title: 'Kręgosłup', sub: 'Atlas 3D · 12 kręgów · 24 żebra',
    base: ['przeglad-Th', 'zebra-przeglad'], keys: TH_KEYS, ribs: true },
  obrecz: { group: 'Kości', kind: 'set', sets: ['obrecz'], name: 'Obręcz barkowa',
    desc: 'Łopatka i obojczyk na tle żeber i kręgosłupa — widać, na wysokości których kręgów leży łopatka. Pełna szczegółowość kości pobiera się po jej wybraniu.',
    title: 'Obręcz barkowa', sub: 'Atlas 3D · łopatka i obojczyk',
    base: ['przeglad-C', 'przeglad-Th', 'zebra-przeglad', SETS.obrecz.overview], keys: SETS.obrecz.order,
    context: [...C_KEYS, ...TH_KEYS], ctxBones: ['humerus'], ribs: true, quiz: ['czesc'], solo: true },
  czaszka: { group: 'Kości', kind: 'set', sets: ['czaszka'], name: 'Czaszka',
    desc: 'Kości mózgo- i twarzoczaszki, szwy i kresa skroniowa. Pełna szczegółowość kości pobiera się po jej wybraniu.',
    title: 'Czaszka', sub: 'Atlas 3D · 22 kości · szwy',
    base: [SETS.czaszka.overview], keys: SETS.czaszka.order },
  grzbiet: { group: 'Mięśnie', kind: 'muscles', name: 'Mięśnie grzbietu',
    desc: 'Warstwami, z przyczepami zaznaczonymi na kościach. Na start warstwa powierzchowna; głębsze pobierają się po włączeniu.',
    title: 'Mięśnie',
    base: ['przeglad-C', 'przeglad-Th', 'przeglad-L', 'przeglad-S', 'kosci-tla', 'zebra-przeglad', MUS.layerPack(MUS.READY_LAYERS[0])],
    keys: MUS.MUSCLE_KEYS },
};
export const muscleMode = () => MODULES[state.module]?.kind === 'muscles';
export const boneSetMode = () => MODULES[state.module]?.kind === 'set';
export const skullMode = () => state.module === 'czaszka';          // szwy i kresa skroniowa
export const modKeys = () => MODULES[state.module]?.keys || ORDER;
export const contextKeys = () => MODULES[state.module]?.context || [];
// kręgi i krążki, które można wybrać w tym module (D_C7 → C7)
export const selectable = (k) => modKeys().includes(k.startsWith('D_') ? k.slice(2) : k);
export const single = () => state.module === 'kregi';
// widok z bliska jednego kręgu (pozostałe przezroczyste albo ukryte)
export const closeUp = () => (state.isolate && state.mode === 'atlas') || state.mode === 'edit' || single() || (state.mode === 'quiz' && state.quiz?.type === 'czesc');
// „Sama kość” (moduły z solo): widać tylko wybraną kość, z kości parzystych jedną stronę
export const soloMode = () => state.isolate && state.mode === 'atlas' && !!MODULES[state.module]?.solo;
export const currentKey = () => (state.mode === 'quiz' ? state.quiz?.target : state.selected) || state.selected;

export const parts = {};   // key -> mesh (kręgi i krążki)
export const muscleMeshes = [];   // części mięśni (obie strony)
export const ctxMeshes = [];      // kości tła: łopatka, obojczyk, kość ramienna, biodrowa, potyliczna (moduł mięśni), kość ramienna (obręcz)
export const lineMeshes = [];     // szwy czaszki i kresa skroniowa (szwy.js)
export const byName = {};         // nazwa siatki -> mesh (mięśnie i kości tła)
export const objectsOf = (k) => (parts[k] ? [parts[k]] : muscleMeshes.filter((m) => m.userData.muscle === k));
export const hasKey = (k) => objectsOf(k).length > 0;

export const ribMeshes = [];      // żebra (rib), dołki na kręgach (facet) i powierzchnie stawowe żeber (ribfacet)
export const ribByName = {};

// #debug w adresie pokazuje licznik (kl./s, czas klatki, trójkąty, rozdzielczość, jakość).
export const DEBUG = /(^|[#&?/])debug\b/i.test(location.hash + location.search);
export const FULL_KEY = 'atlas-full-detail-v1';
try { state.fullDetail = localStorage.getItem(FULL_KEY) === '1'; } catch (e) { /* brak dostępu do pamięci przeglądarki */ }
export const COARSE = matchMedia('(pointer: coarse)').matches;      // telefon / tablet

// stan interfejsu współdzielony między modułami
export const ui = {
  panelRibs: null,      // czy panel pokazuje już części żeber
  labelMode: 'palp',    // etykiety: punkty wyczuwalne (palp) albo części kręgu (parts)
  labelGroup: {},       // kość -> wybrany zestaw podpisów (id albo 'all'); bez wpisu — pierwszy zestaw
  peek: null,           // część, której podpis widać chwilowo (kursor albo palec na kropce innego zestawu)
};
