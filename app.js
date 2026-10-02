import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PACKS } from './models/pakiety/spis.js';
import * as MUS from './miesnie.js';
import { REGIONS, PARTS, DISC, PART_LABELS, PART_LABELS_SPECIAL, PALPATION } from './content.js';
import { LANDMARKS } from './landmarks.js';
import { FIXES, REVIEWED } from './landmarks-fix.js';
import { RIB_LANDMARKS, RIB_LINKS } from './landmarks-ribs.js';

const ORDER = ['C1','C2','C3','C4','C5','C6','C7',
  'Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12',
  'L1','L2','L3','L4','L5','S'];
const REGION_KEYS = ['C', 'Th', 'L', 'S'];
const regionOf = (key) => {
  const k = key.startsWith('D_') ? key.slice(2) : key;
  return k.startsWith('Th') ? 'Th' : k[0];
};
const discLabel = (key) => {
  const k = key.slice(2);
  const next = ORDER[ORDER.indexOf(k) + 1];
  return `${k}/${next === 'S' ? 'S1' : next}`;
};

const $ = (s) => document.querySelector(s);
const stageEl = $('#stage');
const panelEl = $('#panel');
const rulerEl = $('#ruler');
const bigcodeEl = $('#bigcode');

/* ---------- Theme colors ---------- */
let COLORS = {};
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const dark = cs.colorScheme.includes('dark');
  COLORS = {
    C: new THREE.Color(cs.getPropertyValue('--c').trim()),
    Th: new THREE.Color(cs.getPropertyValue('--th').trim()),
    L: new THREE.Color(cs.getPropertyValue('--l').trim()),
    S: new THREE.Color(cs.getPropertyValue('--s').trim()),
    focus: new THREE.Color(cs.getPropertyValue('--focus').trim()),
    bone: new THREE.Color(dark ? '#d9d2c4' : '#ebe5d8'),
    disc: new THREE.Color(dark ? '#7f99ad' : '#a8bccb'),
    facet: new THREE.Color(cs.getPropertyValue('--facet').trim() || '#0f7f8a'),
    muscle: new THREE.Color(cs.getPropertyValue('--muscle').trim() || '#b8432f'),
    muscleSoft: new THREE.Color(cs.getPropertyValue('--muscle-soft').trim() || '#c98478'),
  };
  for (const r of REGION_KEYS) document.documentElement.style.setProperty(`--rc-${r}`, cs.getPropertyValue(`--${r.toLowerCase()}`));
}

/* ---------- State ---------- */
const state = {
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
const TH_KEYS = ORDER.filter((k) => k.startsWith('Th'));
const MODULES = {
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
const muscleMode = () => MODULES[state.module]?.kind === 'muscles';
const modKeys = () => MODULES[state.module]?.keys || ORDER;
const single = () => state.module === 'kregi';
// widok z bliska jednego kręgu (pozostałe przezroczyste albo ukryte)
const closeUp = () => (state.isolate && state.mode === 'atlas') || state.mode === 'edit' || single();
const currentKey = () => (state.mode === 'quiz' ? state.quiz?.target : state.selected) || state.selected;

/* ---------- Ruler ---------- */
let rulerKind = null;
function buildRuler() {
  const kind = muscleMode() ? 'muscles' : 'bones';
  if (kind === rulerKind) return;
  rulerKind = kind;
  rulerEl.classList.toggle('mus', kind === 'muscles');
  rulerEl.setAttribute('aria-label', kind === 'muscles' ? 'Mięśnie' : 'Kręgi');
  if (kind === 'muscles') {
    rulerEl.innerHTML = MUS.navHTML(esc);
    rulerEl.querySelectorAll('button[data-key]').forEach((b) => b.addEventListener('click', () => select(b.dataset.key, true)));
    return;
  }
  const groups = { C: [], Th: [], L: [], S: [] };
  ORDER.forEach((k) => groups[regionOf(k)].push(k));
  rulerEl.innerHTML = '';
  for (const r of REGION_KEYS) {
    const g = document.createElement('div');
    g.className = 'group';
    g.dataset.region = r;
    g.style.setProperty('--rc', `var(--${r.toLowerCase()})`);
    g.innerHTML = `<span class="glabel">${r === 'S' ? 'Krzyż' : r === 'Th' ? 'Pierś' : r === 'C' ? 'Szyja' : 'Lędźwie'}</span>`;
    for (const k of groups[r]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.id = `r-${k}`;
      b.textContent = k === 'S' ? 'S' : k;
      b.title = PARTS[k].name;
      b.addEventListener('click', () => select(k, true));
      g.appendChild(b);
    }
    rulerEl.appendChild(g);
  }
}
function syncRuler() {
  const keys = new Set(modKeys());
  rulerEl.querySelectorAll('.group[data-region]').forEach((g) => { g.hidden = !ORDER.some((k) => regionOf(k) === g.dataset.region && keys.has(k)); });
  rulerEl.querySelectorAll('button').forEach((b) => {
    const k = b.id.slice(2);
    b.setAttribute('aria-current', String(state.mode !== 'quiz' && k === state.selected));
  });
  const cur = rulerEl.querySelector('[aria-current="true"]');
  if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/* ---------- Three.js scene ---------- */
/* ---------- Wydajność: stan ---------- */
// #debug w adresie pokazuje licznik (kl./s, czas klatki, trójkąty, rozdzielczość, jakość).
const DEBUG = /(^|[#&?])debug\b/.test(location.hash + location.search);
const COARSE = matchMedia('(pointer: coarse)').matches;      // telefon / tablet
const perf = {
  base: Math.min(window.devicePixelRatio || 1, COARSE ? 1.5 : 2),   // najwyższa używana gęstość pikseli
  lvl: 0,              // 0 = pełna, 1 = 75%, 2 = 50% (zależnie od prędkości obrotu)
  lowerSince: 0,       // od kiedy prędkość pozwala wrócić do ostrzejszego poziomu
  loweredAt: 0,        // kiedy ostatnio obniżono rozdzielczość (min. 300 ms na niższym poziomie)
  cap: 1,              // pułap z pomiaru wydajności urządzenia (0.6–1)
  current: 0,          // aktualnie ustawiony pixel ratio
  quality: COARSE ? 'fast' : 'high',
  lastMove: 0, settled: true,
  emaDt: 16, slowSince: 0, fastSince: 0,
  frames: 0, renders: 0, renderMs: 0, jsMs: 0, speed: 0,
};
const LEVELS = [1, 0.75, 0.5];
let needsRender = true;
const invalidate = () => { needsRender = true; };

const renderer = new THREE.WebGLRenderer({ antialias: !COARSE, alpha: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.NeutralToneMapping;
stageEl.prepend(renderer.domElement);
function applyRatio(r) {
  if (Math.abs(r - perf.current) < 0.01) return;
  perf.current = r;
  renderer.setPixelRatio(r);
  invalidate();
}
applyRatio(perf.base);

const scene = new THREE.Scene();
let envTex = null;
function ensureEnv() {           // oświetlenie otoczenia tylko dla trybu „wysoka jakość”
  if (!envTex) envTex = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  return envTex;
}
if (perf.quality === 'high') scene.environment = ensureEnv();
scene.environmentIntensity = 0.55;

// Matcap: gotowe „światło” w jednej teksturze — kilka razy tańsze od materiału PBR.
let matcapTex = null;
function matcap() {
  if (matcapTex) return matcapTex;
  const s = 256, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(s * 0.36, s * 0.3, s * 0.04, s * 0.5, s * 0.52, s * 0.52);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, '#e9e9e9');
  grad.addColorStop(0.75, '#a9a9a9');
  grad.addColorStop(1, '#6f6f6f');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  matcapTex = new THREE.CanvasTexture(c);
  matcapTex.colorSpace = THREE.SRGBColorSpace;
  return matcapTex;
}
function newMat(kind) {
  const extra = kind === 'rib' || kind === 'muscle' ? { side: THREE.DoubleSide }
    : kind === 'facet' ? { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 } : {};
  if (perf.quality === 'fast') return new THREE.MeshMatcapMaterial({ matcap: matcap(), ...extra });
  return new THREE.MeshStandardMaterial({ roughness: kind === 'disc' ? 0.55 : kind === 'facet' ? 0.45 : kind === 'muscle' ? 0.6 : 0.82, metalness: 0, ...extra });
}

const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(3, 6, 4);
scene.add(key);
const rim = new THREE.DirectionalLight(0xffffff, 0.6);
rim.position.set(-4, 2, -5);
scene.add(rim);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f8c, 0.5));

const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.6;
controls.maxDistance = 30;

const parts = {};   // key -> mesh (kręgi i krążki)
const muscleMeshes = [];   // części mięśni (obie strony)
const ctxMeshes = [];      // kości tła: łopatka, obojczyk, kość ramienna, biodrowa, potyliczna
const byName = {};         // nazwa siatki -> mesh (mięśnie i kości tła)
const objectsOf = (k) => (parts[k] ? [parts[k]] : muscleMeshes.filter((m) => m.userData.muscle === k));
const hasKey = (k) => objectsOf(k).length > 0;
const root = new THREE.Group();
scene.add(root);

function resize() {
  const r = renderer.domElement.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / Math.max(r.height, 1);
  camera.updateProjectionMatrix();
  for (const n of nodes.values()) n.h = undefined;   // etykiety zmierzą się na nowo
  invalidate();
}
new ResizeObserver(resize).observe(renderer.domElement);

/* ---------- Camera framing ---------- */
const VIEWS = {
  side:  new THREE.Vector3(1, 0.08, 0),
  front: new THREE.Vector3(0, 0.08, 1),
  back:  new THREE.Vector3(0, 0.08, -1),
  three: new THREE.Vector3(0.85, 0.12, -0.55),
  top:   new THREE.Vector3(0.0001, 1, -0.45),
};
let tween = null;
let zoomTarget = null;   // płynne przybliżanie kółkiem myszy
function boxOf(keys) {
  const box = new THREE.Box3();
  // ukryte części (inny moduł, wyłączone krążki) nie wpływają na kadr
  for (const k of keys) for (const o of objectsOf(k)) if (o.visible || keys.length === 1) box.union(o.geometry.boundingBox);
  return box;
}
const isoPad = () => (renderer.domElement.clientWidth < 520 ? 2.4 : 1.9);
const closeFrame = (k, dir = null) => frame([k], dir, isoPad() * (state.ribs && k.startsWith('Th') ? 2.1 : 1));
// kadr po wczytaniu części (moduł „Pojedyncze kręgi” pobiera kręg dopiero po wybraniu)
let pendingFrame = null;
function frameWhenReady(key, fn) {
  pendingFrame = null;
  if (hasKey(key)) fn(); else pendingFrame = { key, fn };
}
function frame(keys, dir, pad = 1.1) {
  zoomTarget = null;
  const box = boxOf(keys);
  // moduł żeber: przegląd obejmuje całą klatkę
  if (state.module === 'zebra' && keys.length > 1) for (const m of ribMeshes) if (m.visible && m.userData.kind === 'rib') box.union(m.geometry.boundingBox);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const fitH = size.y / (2 * Math.tan(fov / 2));
  const fitW = Math.max(size.x, size.z) / (2 * Math.tan(fov / 2) * camera.aspect);
  const dist = Math.max(fitH, fitW) * pad + Math.max(size.x, size.z) * 0.35;
  const d = (dir || camera.position.clone().sub(controls.target)).clone().normalize();
  const toPos = center.clone().add(d.multiplyScalar(dist));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  tween = { t: reduce ? 1 : 0, fromPos: camera.position.clone(), toPos, fromT: controls.target.clone(), toT: center };
}
function stepTween(dt) {
  if (!tween) return;
  tween.t = Math.min(1, tween.t + dt / 0.7);
  const e = 1 - Math.pow(1 - tween.t, 3);
  camera.position.lerpVectors(tween.fromPos, tween.toPos, e);
  controls.target.lerpVectors(tween.fromT, tween.toT, e);
  if (tween.t >= 1) tween = null;
}
const neighbors = (k, n) => {
  const keys = modKeys();
  const i = keys.indexOf(k);
  return keys.slice(Math.max(0, i - n), i + n + 1);
};

/* ---------- Materials ---------- */
const tmp = new THREE.Color();
const BLACK = new THREE.Color(0);
function moduleVisible(k) {
  if (single()) return k === currentKey();
  if (state.module === 'zebra') return regionOf(k) === 'Th';
  return true;
}
function setFade(m, faded, op = 0.09) {
  if (m.material.transparent !== faded) m.material.needsUpdate = true;
  m.material.transparent = faded;
  m.material.opacity = faded ? op : 1;
  m.material.depthWrite = !faded;
}
// Moduł mięśni: kości jako tło, przyczepy wybranego mięśnia (albo jego części) na kolor dołków
function paintMuscles() {
  const sel = state.selected;
  const att = state.attach ? MUS.attachSet(sel, state.focusPart) : null;
  const iso = state.isolate && state.mode === 'atlas';
  const selLayer = MUS.MUSCLES[sel]?.layer;
  const plain = (m, on, base = COLORS.bone) => {
    m.material.color.copy(on ? COLORS.facet : base);
    if (m.material.emissive) m.material.emissive.copy(BLACK);
    setFade(m, false);
  };
  for (const [k, m] of Object.entries(parts)) {
    const disc = k.startsWith('D_');
    m.visible = !disc || state.showDiscs;
    plain(m, !!att?.vertebrae.has(k), disc ? COLORS.disc : COLORS.bone);
  }
  for (const m of ctxMeshes) { m.visible = true; plain(m, !!att?.bones.has(m.userData.bone)); }
  for (const m of muscleMeshes) {
    const e = m.userData;
    m.visible = !!state.layers[e.layer];
    const isSel = e.muscle === sel;
    tmp.copy(isSel ? COLORS.muscle : COLORS.muscleSoft);
    if (isSel && state.focusPart && state.focusPart !== e.part) tmp.lerp(COLORS.muscleSoft, 0.65);
    const hov = e.muscle === state.hovered && !isSel;
    if (m.material.emissive) { m.material.emissive.copy(hov ? COLORS.muscle : BLACK); m.material.emissiveIntensity = 0.25; }
    else if (hov) tmp.lerp(COLORS.muscle, 0.4);
    m.material.color.copy(tmp);
    // wybrany mięsień leży głębiej: warstwy nad nim prześwitują, żeby było go widać (i dało się go kliknąć)
    const above = selLayer && e.layer < selLayer;
    setFade(m, (iso && !isSel) || above, iso && !isSel ? 0.12 : 0.16);
  }
  for (const mat of [ribMat, ribMatHi]) if (mat.clippingPlanes?.length) { mat.clippingPlanes = null; mat.needsUpdate = true; }
  ribMat.color.copy(COLORS.bone);
  ribMatHi.color.copy(COLORS.facet);
  for (const m of ribMeshes) {
    const e = m.userData;
    m.visible = e.kind === 'rib' && state.ribs;
    if (e.kind === 'rib') m.material = att?.ribs.has(e.rib) ? ribMatHi : ribMat;
  }
  invalidate();
}
function paint() {
  if (muscleMode()) { paintMuscles(); return; }
  for (const m of muscleMeshes) m.visible = false;
  for (const m of ctxMeshes) m.visible = false;
  const sel = state.mode === 'quiz' ? state.quiz?.target : state.selected;
  for (const [k, m] of Object.entries(parts)) {
    const isDisc = k.startsWith('D_');
    const reg = regionOf(k);
    const base = isDisc ? COLORS.disc : COLORS.bone;
    tmp.copy(base);
    if (state.tint && state.mode === 'atlas') tmp.lerp(COLORS[reg], isDisc ? 0.15 : 0.38);
    const isSel = k === sel;
    if (isSel) tmp.copy(state.mode === 'quiz' ? COLORS.focus : COLORS[reg]);
    const hov = k === state.hovered && !isSel;
    if (m.material.emissive) {
      m.material.emissive.copy(hov ? COLORS[reg] : BLACK);
      m.material.emissiveIntensity = 0.18;
    } else if (hov) tmp.lerp(COLORS[reg], 0.3);
    m.material.color.copy(tmp);
    m.visible = moduleVisible(k) && (!isDisc || state.showDiscs);
    const faded = !isSel && closeUp();
    if (m.material.transparent !== faded) m.material.needsUpdate = true;
    m.material.transparent = faded;
    m.material.opacity = faded ? 0.09 : 1;
    m.material.depthWrite = !faded;
  }
  paintRibs();
  invalidate();
}

/* ---------- Żebra i dołki żebrowe ---------- */
const ribMeshes = [];      // żebra (rib), dołki na kręgach (facet) i powierzchnie stawowe żeber (ribfacet)
const ribByName = {};
renderer.localClippingEnabled = true;
const clipPlanes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)];
let ribMat = newMat('rib');
let ribMatHi = newMat('rib');
let facetMat = newMat('facet');
const relatedRibs = (k) => [...new Set(Object.values(RIB_LINKS[k] || {}))];
const ribsLoadedFor = (k) => { const r = relatedRibs(k); return r.length > 0 && r.every((n) => ribByName[`rib_L${n}`] && ribByName[`rib_R${n}`]); };
// żebra przy kręgu k są włączone i już wczytane (etykiety głowy i guzka żebra, edytor)
const ribsOn = (k) => state.ribs && state.mode !== 'quiz' && k.startsWith('Th') && ribsLoadedFor(k);
function paintRibs() {
  const k = state.selected;
  const isTh = k.startsWith('Th') && state.mode !== 'quiz';
  const related = new Set(relatedRibs(k));
  const close = closeUp();
  const box = parts[k] ? new THREE.Box3().setFromObject(parts[k]) : null;
  const xc = box ? (box.min.x + box.max.x) / 2 : 0;
  clipPlanes[0].constant = xc + 0.9;
  clipPlanes[1].constant = -(xc - 0.9);
  for (const mat of [ribMat, ribMatHi]) {
    const want = close ? clipPlanes : null;
    if ((mat.clippingPlanes?.length || 0) !== (want?.length || 0)) { mat.clippingPlanes = want; mat.needsUpdate = true; }
  }
  ribMat.color.copy(COLORS.bone);
  ribMatHi.color.copy(COLORS.bone).lerp(COLORS.Th, 0.35);
  facetMat.color.copy(COLORS.facet);
  const vis = moduleVisible(k);
  for (const m of ribMeshes) {
    const e = m.userData;
    if (e.kind === 'rib') {
      const rel = isTh && related.has(e.rib);
      m.visible = state.ribs && state.mode !== 'quiz' && (!close || rel);
      m.material = rel ? ribMatHi : ribMat;
    } else if (e.kind === 'facet') {
      m.visible = vis && isTh && e.vertebra === k;
    } else {
      m.visible = vis && state.ribs && isTh && e.vertebra === k;
    }
  }
}
function toggleRibs() { setRibs(!state.ribs); }
function setRibs(on, reframe = true) {
  state.ribs = on;
  $('#ribs').setAttribute('aria-pressed', String(on));
  occl.clear();
  updateLod();
  paint();
  refreshPanel();
  if (reframe && closeUp() && state.selected.startsWith('Th')) closeFrame(state.selected);
}

/* ---------- Paczki modeli: pobieranie na żądanie ---------- */
// Format paczek opisuje tools/build_packs.py. Przegląd (przeglad-*, zebra-przeglad) to siatki uproszczone,
// a kregi/<kręg> i zebra/<n> — pełne, pobierane dopiero, gdy kręg jest wybrany albo duży na ekranie.
const lowGeo = {}, highGeo = {};
const packs = new Map();            // id -> { p, ctrl, done, keep, low }
const net = { bytes: 0 };
const wantHigh = new Set();
const isOverview = (id) => id.startsWith('przeglad') || id === 'zebra-przeglad';
const packForKey = (k) => `kregi/${k.startsWith('D_') ? k.slice(2) : k}`;
const saveData = () => { const c = navigator.connection; return !!(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))); };
const kB = (b) => `${b >= 1e6 ? (b / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1000)) + ' kB'}`;

async function gunzip(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('Ta przeglądarka jest zbyt stara, by rozpakować model. Zaktualizuj ją.');
  const out = new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')));
  return new Uint8Array(await out.arrayBuffer());
}
async function fetchPack(id, signal, onProgress, low) {
  // podgląd w artefakcie: pliki binarne zakodowane base64
  const b64 = !!window.ATLAS_PACK_B64;
  const url = `models/pakiety/${id}.pak${b64 ? '.b64.txt' : ''}`;
  const res = await fetch(url, { signal, priority: low ? 'low' : 'auto' });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const total = (PACKS[id]?.bajty || 0) * (b64 ? 4 / 3 : 1);
  const chunks = [];
  let got = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); got += value.length; net.bytes += value.length;
    onProgress?.(Math.min(got, total), total);
  }
  let bytes = new Uint8Array(got);
  let o = 0;
  for (const c of chunks) { bytes.set(c, o); o += c.length; }
  if (b64) bytes = Uint8Array.from(atob(new TextDecoder().decode(bytes).trim()), (c) => c.charCodeAt(0));
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = await gunzip(bytes);   // serwer mógł już rozpakować
  return bytes;
}
function decodePack(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== 'ATL1') throw new Error('Nieznany format paczki');
  const hl = dv.getUint32(4, true);
  const head = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + hl)));
  const body = bytes.subarray(8 + hl);
  let o = 0;
  const vint = () => { let x = 0, m = 1, b; do { b = body[o++]; x += (b & 127) * m; m *= 128; } while (b & 128); return x; };
  return head.meshes.map((h) => {
    const pos = new Float32Array(h.n * 3);
    o = h.p[0];
    for (let c = 0; c < 3; c++) {
      let acc = 0;
      for (let i = 0; i < h.n; i++) { const z = vint(); acc += (z & 1) ? -(z + 1) / 2 : z / 2; pos[i * 3 + c] = (acc + h.base[c]) * h.s; }
    }
    const idx = h.n < 65536 ? new Uint16Array(h.t * 3) : new Uint32Array(h.t * 3);
    const fifo = new Int32Array(16);
    let fl = 0, next = 0;
    o = h.i[0];
    for (let k = 0; k < idx.length; k++) {
      const c = vint();
      const j = c === 0 ? next++ : c <= 16 ? fifo[c - 1] : next - 1 - (c - 17);
      let q = fifo.indexOf(j);
      if (q < 0 || q >= fl) { q = Math.min(fl, 15); if (fl < 16) fl++; }
      for (; q > 0; q--) fifo[q] = fifo[q - 1];
      fifo[0] = j;
      idx[k] = j;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return { name: h.name, extras: h.extras || {}, geometry: g };
  });
}
function ensurePack(id, opts = {}) {
  if (!PACKS[id]) return Promise.resolve();
  let st = packs.get(id);
  if (st) {
    if (opts.keep) st.keep = true;
    if (!opts.low) st.low = false;
    return st.p;
  }
  const ctrl = new AbortController();
  st = { ctrl, done: false, keep: !!opts.keep, low: !!opts.low };
  packs.set(id, st);
  st.p = fetchPack(id, ctrl.signal, opts.onProgress, opts.low).then((bytes) => {
    for (const m of decodePack(bytes)) addGeometry(m, isOverview(id));
    st.done = true;
    afterPack();
  }).catch((err) => {
    if (packs.get(id) === st) packs.delete(id);
    if (err.name !== 'AbortError') { console.warn('Paczka', id, err); netStatus(`Nie udało się pobrać części modelu (${id}).`); updateLoader(err); }
    throw err;
  });
  st.p.catch(() => {}).finally(() => netStatus());
  netStatus();
  return st.p;
}
function addGeometry({ name, extras, geometry }, low) {
  (low ? lowGeo : highGeo)[name] = geometry;
  let mesh = parts[name] || ribByName[name] || byName[name];
  if (!mesh) {
    const kind = extras.kind;
    const bone = kind === 'bone' || kind === 'disc';
    const own = bone || kind === 'muscle' || kind === 'ctxbone';      // własny materiał (własny kolor)
    mesh = new THREE.Mesh(geometry, own ? newMat(kind === 'ctxbone' ? 'bone' : kind) : kind === 'rib' ? ribMat : facetMat);
    mesh.name = name;
    mesh.userData = { ...extras };
    mesh.visible = false;               // o widoczności decyduje paint()
    if (bone) parts[name] = mesh;
    else if (kind === 'muscle') { muscleMeshes.push(mesh); byName[name] = mesh; mesh.renderOrder = 2; }
    else if (kind === 'ctxbone') { ctxMeshes.push(mesh); byName[name] = mesh; }
    else { mesh.renderOrder = kind === 'rib' ? 0 : 1; ribMeshes.push(mesh); ribByName[name] = mesh; }
    root.add(mesh);
  }
  useGeometry(mesh);
}
// pełna siatka, gdy jest potrzebna i już pobrana; w przeciwnym razie uproszczona
function useGeometry(mesh) {
  const n = mesh.name, lo = lowGeo[n], hi = highGeo[n];
  const g = hi && (!lo || wantHigh.has(n)) ? hi : (lo || hi);
  if (mesh.geometry !== g) { mesh.geometry = g; invalidate(); }
  const kind = mesh.userData.kind;
  if (kind === 'facet' || kind === 'ribfacet') return;
  // celowanie: siatka uproszczona, a gdy jej nie ma — bryła zbudowana z pełnej
  const src = lo ? 'low' : 'high';
  if (mesh.userData.proxySrc !== src) {
    mesh.userData.proxy = lo ? proxyOf(lo, mesh) : buildProxy(mesh);
    mesh.userData.proxySrc = src;
  }
}
let panelRibs = null;   // czy panel pokazuje już części żeber
function refreshPanel() {
  if (state.mode === 'atlas') renderPart(state.selected);
  else if (state.mode === 'edit') renderEditor();
}
function afterPack() {
  occl.clear();
  paint();
  if (pendingFrame && hasKey(pendingFrame.key)) { const { fn } = pendingFrame; pendingFrame = null; fn(); }
  if (state.mode !== 'quiz' && panelRibs !== ribsOn(state.selected)) refreshPanel();
  updateLoader();
  scheduleLod(60);   // np. pobranie sąsiadów, gdy wybrany kręg już jest
}

// Co pobrać teraz: przegląd modułu, wybrany kręg (i żebra przy nim), kręgi duże na ekranie,
// a w tle sąsiednie kręgi (chyba że włączone jest oszczędzanie danych).
const LOD_DENSITY = 550;   // px na jednostkę modelu (10 cm): kręg Th7 ma ok. 0,27 j. wysokości → ok. 150 px
let lodTimer = 0;
function scheduleLod(ms = 120) { clearTimeout(lodTimer); lodTimer = setTimeout(updateLod, ms); }
function updateLod() {
  if (!state.module) return;
  const need = new Set(MODULES[state.module].base);
  if (state.ribs && !single()) need.add('zebra-przeglad');
  if (muscleMode()) {
    // warstwa pobiera się dopiero, gdy jest włączona albo wybrano mięsień z tej warstwy
    const selLayer = MUS.MUSCLES[state.selected]?.layer;
    for (const n of MUS.READY_LAYERS) if (state.layers[n] || n === selLayer) need.add(MUS.layerPack(n));
  }
  const sel = currentKey();
  const allowed = new Set(muscleMode() ? [] : modKeys());   // w module mięśni kręgi są tylko tłem (przegląd)
  // w quizie na całym kręgosłupie wystarczy podświetlony przegląd; w „Pojedynczych kręgach” trzeba pobrać kręg
  if (allowed.has(sel.replace('D_', '')) && (state.mode !== 'quiz' || single())) need.add(packForKey(sel));
  if (state.ribs && state.mode !== 'quiz' && state.selected.startsWith('Th') && !muscleMode()) for (const n of relatedRibs(state.selected)) need.add(`zebra/${n}`);
  if (!single() && !muscleMode()) {
    const W = renderer.domElement.clientWidth, H = renderer.domElement.clientHeight;
    const big = [];
    const consider = (obj, id, minPx, dim) => {
      if (!obj.visible || obj.material.opacity < 0.5) return;
      const r = projectedBox(obj.geometry.boundingBox);
      if (!r || r.x1 < 0 || r.x0 > W || r.y1 < 0 || r.y0 > H) return;
      const size = dim(r);
      if (size > minPx) big.push([size, id]);
    };
    // kryterium: ile pikseli ekranu przypada na 10 cm kości (duże kości, np. krzyżowa, nie wymuszają pobrania wcześniej)
    const density = (m) => (r) => (r.y1 - r.y0) / Math.max(m.geometry.boundingBox.max.y - m.geometry.boundingBox.min.y, 0.05);
    for (const [k, m] of Object.entries(parts)) if (lowGeo[k]) consider(m, packForKey(k), LOD_DENSITY, density(m));
    for (const m of ribMeshes) if (m.userData.kind === 'rib' && lowGeo[m.name]) consider(m, `zebra/${m.userData.rib}`, LOD_DENSITY * 0.8, density(m));
    big.sort((a, b) => b[0] - a[0]);
    for (const [, id] of big.slice(0, 8)) need.add(id);
  }
  const pre = new Set();
  // sąsiedzi dopiero, gdy potrzebne paczki są już pobrane (żeby nie zabierały im łącza)
  const needDone = [...need].every((id) => packs.get(id)?.done || !PACKS[id]);
  if (needDone && !saveData() && state.mode === 'atlas' && !muscleMode()) {
    const keys = modKeys();
    const i = keys.indexOf(sel.replace('D_', ''));
    for (const j of [i + 1, i - 1]) if (keys[j]) pre.add(packForKey(keys[j]));
  }
  wantHigh.clear();
  for (const id of need) {
    if (id.startsWith('kregi/')) { const k = id.slice(6); wantHigh.add(k); wantHigh.add('D_' + k); }
    else if (id.startsWith('zebra/')) { const n = id.slice(6); wantHigh.add(`rib_L${n}`); wantHigh.add(`rib_R${n}`); }
  }
  for (const m of Object.values(parts)) useGeometry(m);
  for (const m of ribMeshes) useGeometry(m);
  for (const id of need) ensurePack(id, { keep: isOverview(id) }).catch(() => {});
  for (const id of pre) if (!need.has(id)) ensurePack(id, { low: true }).catch(() => {});
  for (const [id, st] of packs) {
    if (!st.done && !st.keep && !need.has(id) && !pre.has(id)) { st.ctrl.abort(); packs.delete(id); }
  }
  netStatus();
}

// Mały napis „Pobieranie…” na scenie (pobrania w tle z wyprzedzeniem się nie liczą)
let netErr = '', netErrAt = 0;
function netStatus(err) {
  if (err) { netErr = err; netErrAt = performance.now(); }
  const el = $('#net');
  if (!el) return;
  const busy = [...packs.values()].filter((st) => !st.done && !st.low).length;
  const showErr = netErr && performance.now() - netErrAt < 6000;
  el.hidden = !busy && !showErr;
  el.textContent = showErr && !busy ? netErr : 'Pobieranie szczegółów…';
  el.classList.toggle('err', !!(showErr && !busy));
  if (showErr) setTimeout(() => netStatus(), 6100);
}

/* ---------- Landmarks: automatic points + fixes from file + local edits ---------- */
const LS_KEY = 'atlas-landmark-edits-v1';
let local = { fixes: {}, reviewed: {} };
try { local = { fixes: {}, reviewed: {}, ...(JSON.parse(localStorage.getItem(LS_KEY)) || {}) }; } catch (e) { /* no storage */ }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// drop local edits that are already saved in landmarks-fix.js
for (const [k, fx] of Object.entries(local.fixes)) {
  for (const p of Object.keys(fx)) if (FIXES[k] && p in FIXES[k] && same(FIXES[k][p], fx[p])) delete fx[p];
  if (!Object.keys(fx).length) delete local.fixes[k];
}
for (const k of Object.keys(local.reviewed)) if ((REVIEWED[k] || false) === local.reviewed[k]) delete local.reviewed[k];
function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(local)); } catch (e) { /* no storage */ } }
const autoLm = (k) => ({ ...(LANDMARKS[k] || {}), ...(RIB_LANDMARKS[k] || {}) });
function lm(k) {
  const out = autoLm(k);
  for (const src of [FIXES[k], local.fixes[k]]) {
    if (!src) continue;
    for (const [p, v] of Object.entries(src)) { if (v === null) delete out[p]; else out[p] = v; }
  }
  for (const p of Object.keys(out)) { out[p] = (out[p] || []).map((x) => x || null); if (!out[p].some(Boolean)) delete out[p]; }
  return out;
}
const slotChanged = (k, part, i) => {
  const a = autoLm(k)[part]?.[i], b = lm(k)[part]?.[i];
  return !a || !b || a.some((v, j) => Math.abs(v - b[j]) > 1e-4);
};
const reviewedOf = (k) => (k in local.reviewed ? local.reviewed[k] : REVIEWED[k]) || null;
const fixedIn = (k, p) => (local.fixes[k] && p in local.fixes[k]) ? 'local' : (FIXES[k] && p in FIXES[k]) ? 'file' : null;

/* ---------- Labels (names of bone parts, palpable landmarks) ---------- */
const labelsEl = $('#labels');
const svgNS = 'http://www.w3.org/2000/svg';
const svg = document.createElementNS(svgNS, 'svg');
labelsEl.appendChild(svg);
const nodes = new Map();   // id -> {el, dot, line}

function partDef(k, part) {
  const S = PART_LABELS_SPECIAL;
  const reg = regionOf(k);
  const group = k.startsWith('D_') ? S.D : k === 'S' ? S.S : null;
  const base = group ? group[part] : PART_LABELS[part];
  const over = (!group && S[k]?.[part]) || (!group && reg === 'L' && S.L[part]) || null;
  if (!base && !over) return null;
  const d = { ...(base || {}), ...(over || {}) };
  if (d.ribs) {
    const lk = RIB_LINKS[k] || {};
    const num = +k.slice(2);
    const rib = { fov_sup: lk.fov_sup, fov_inf: lk.fov_inf, fov_tp: lk.fov_tp, rib_head: lk.fov_sup, rib_neck: lk.fov_tp ?? lk.fov_sup, rib_tub: lk.fov_tp, rib_head_next: lk.fov_inf }[part] ?? '';
    const fill = (t) => t && t.replaceAll('{rib}', rib).replaceAll('{prev}', `Th${num - 1}`).replaceAll('{next}', `Th${num + 1}`);
    d.name = fill(d.name); d.def = fill(d.def);
  }
  return d;
}

const PART_ORDER = ['dens', 'body', 'arcus_ant', 'fovea_dentis', 'massa_lat', 'arcus_post', 'pedicle', 'lamina', 'foramen',
  'spinous', 'transverse', 'art_sup', 'art_inf', 'fov_sup', 'fov_inf', 'fov_tp', 'rib_head', 'rib_neck', 'rib_tub', 'rib_head_next', 'promontorium', 'canal', 'ala', 'auricular', 'crista_mediana', 'apex', 'anulus', 'nucleus'];
const RIB_VIEW_PARTS = new Set(['body', 'transverse', 'fov_sup', 'fov_inf', 'fov_tp', 'rib_head', 'rib_neck', 'rib_tub', 'rib_head_next']);
function partList(k, forLabels = false) {
  const L = lm(k);
  const withRibs = ribsOn(k);
  return Object.keys(L)
    .filter((p) => !forLabels || (withRibs ? RIB_VIEW_PARTS.has(p) : !p.startsWith('rib_')))
    .filter((p) => forLabels || !p.startsWith('rib_') || withRibs)
    .sort((a, b) => PART_ORDER.indexOf(a) - PART_ORDER.indexOf(b))
    .map((p) => ({ part: p, def: partDef(k, p) })).filter((x) => x.def?.name);
}

const _v = new THREE.Vector3();
function project(p) {
  _v.set(p[0], p[1], p[2]).project(camera);
  const r = renderer.domElement.getBoundingClientRect();
  return { x: (_v.x + 1) / 2 * r.width, y: (1 - _v.y) / 2 * r.height, behind: _v.z > 1 };
}
function projectedRect(keys) { return projectedBox(boxOf(keys)); }
function projectedBox(box) {
  if (!box || box.isEmpty()) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    const q = project([i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z]);
    x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
  }
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2 };
}

// occlusion is recomputed at most ~8x per second
const occl = new Map();
let occlAt = 0;
const occRay = new THREE.Raycaster();
function occluded(id, p) {
  const now = performance.now();
  if (occl.has(id) && (now - occlAt < 120 || perf.lvl === 2)) return occl.get(id);   // przy szybkim ruchu bez przeliczania
  const target = new THREE.Vector3(...p);
  const dir = target.clone().sub(camera.position);
  const dist = dir.length();
  occRay.set(camera.position, dir.normalize());
  occRay.far = dist;
  const hit = firstProxyHit(occRay);
  const res = !!hit && hit.distance < dist - 0.05;
  occl.set(id, res);
  return res;
}

let labelMode = 'palp';
function labelItems() {
  if (muscleMode()) {
    if (!state.labels || state.mode !== 'atlas' || !muscleMeshes.length) return { items: [], ref: null };
    const shown = MUS.READY_LAYERS.filter((n) => state.layers[n]);
    const maxLayer = Math.max(MUS.MUSCLES[state.selected]?.layer || 0, shown.length ? Math.min(...shown) : 0);
    const items = MUS.labelItems(muscleMeshes, state.selected, state.focusPart, camera.position, maxLayer);
    return { items, ref: projectedRect(modKeys()), kind: 'parts' };
  }
  if (!Object.keys(parts).length) return { items: [], ref: null };
  const k = state.selected;
  if (state.mode === 'edit') {
    const L = lm(k);
    const items = [];
    for (const part of editableParts(k)) {
      const def = partDef(k, part);
      (L[part] || []).forEach((p, i) => {
        if (!p) return;
        const pair = PAIRED.has(part);
        items.push({ id: `e:${k}:${part}:${i}`, p, title: `${def?.name || part}${pair ? ` (${SIDE_SHORT[i]})` : ''}`, sub: slotChanged(k, part, i) ? 'poprawiony' : 'automatyczny',
          palp: !!def?.palp, part, focus: state.edit.part === part && (!pair || state.edit.slot === i),
          // with a part selected, only its points get labels; the rest stay as dots
          dotOnly: !!state.edit.part && state.edit.part !== part });
      });
    }
    return { items, ref: projectedRect([k]), kind: 'parts' };
  }
  if (!state.labels || state.mode !== 'atlas') return { items: [], ref: null };
  const rect = projectedRect([k]);
  // histereza: z nazw części na punkty wyczuwalne wracamy dopiero przy wyraźnie mniejszym kręgu
  const thr = (renderer.domElement.clientWidth < 520 ? 70 : 95) * (labelMode === 'parts' ? 0.8 : 1);
  const big = rect && (closeUp() || (rect.y1 - rect.y0) > thr);
  labelMode = big ? 'parts' : 'palp';
  if (big) {
    const items = [];
    const L = lm(k);
    for (const { part, def } of partList(k, true)) {
      const pts = L[part].filter(Boolean);
      // paired structures: label the one nearer to the camera
      const p = pts.length > 1
        ? pts.reduce((a, b) => (camera.position.distanceTo(new THREE.Vector3(...a)) <= camera.position.distanceTo(new THREE.Vector3(...b)) ? a : b))
        : pts[0];
      items.push({ id: `${k}:${part}`, p, title: def.name, sub: def.latin, palp: !!def.palp, part });
    }
    return { items, ref: rect, kind: 'parts' };
  }
  if (closeUp()) return { items: [], ref: null };
  const items = PALPATION.filter((l) => parts[l.key]?.visible !== false && lm(l.key)[l.part]).map((l) => ({
    id: `palp:${l.key}`, p: lm(l.key)[l.part].find(Boolean), title: l.label, sub: l.note, palp: true, key: l.key,
  }));
  return { items, ref: projectedRect(modKeys()), kind: 'palp' };
}

function layoutLabels() {
  const { items, ref, kind } = labelItems();
  const W = renderer.domElement.clientWidth, H = renderer.domElement.clientHeight;
  const bottomLimit = H - (window.innerWidth <= 640 ? 14 : 64);
  const used = new Set();
  const cols = { left: [], right: [] };
  if (!ref) items.length = 0;
  const dots = [];
  for (const it of items) {
    const q = project(it.p);
    if (q.behind) continue;
    it.q = q;
    it.hidden = occluded(it.id, it.p);
    if (it.dotOnly) { dots.push(it); continue; }
    (q.x >= ref.cx ? cols.right : cols.left).push(it);
  }
  const narrow = W < 520;
  const lineH = narrow ? 30 : 36;
  const getNode = (it) => {
    let n = nodes.get(it.id);
    if (!n) {
      const el = document.createElement('div');
      el.className = 'lbl';
      el.innerHTML = `<b></b><span></span>`;
      labelsEl.appendChild(el);
      const line = document.createElementNS(svgNS, 'polyline');
      const dot = document.createElementNS(svgNS, 'circle');
      dot.setAttribute('r', '4');
      svg.append(line, dot);
      n = { el, line, dot };
      nodes.set(it.id, n);
    }
    return n;
  };
  const gap = narrow ? 14 : 28;
  const lw = narrow ? 128 : 190;
  for (const [side, list] of Object.entries(cols)) {
    if (!list.length) continue;
    list.sort((a, b) => a.q.y - b.q.y);
    for (const it of list) {
      const n = getNode(it);
      n.el.hidden = false;
      n.el.style.maxWidth = `${lw}px`;
      if (n.el.dataset.t !== it.title + it.sub) {
        n.el.querySelector('b').textContent = it.title;
        n.el.querySelector('span').textContent = it.sub || '';
        n.el.dataset.t = it.title + it.sub;
      }
      if (n.h === undefined || n.el.dataset.t !== n.measured) { n.h = n.el.offsetHeight || lineH; n.measured = n.el.dataset.t; }
      it.h = n.h;
    }
    let y = 40;
    for (const it of list) { it.ly = Math.max(it.q.y, y + it.h / 2); y = it.ly + it.h / 2 + 4; }
    const last = list.at(-1);
    let over = last.ly + last.h / 2 - bottomLimit;
    if (over > 0) {
      for (let i = list.length - 1; i >= 0; i--) {
        const it = list[i];
        const maxY = i === list.length - 1 ? bottomLimit - it.h / 2 : list[i + 1].ly - list[i + 1].h / 2 - 4 - it.h / 2;
        if (it.ly > maxY) it.ly = maxY; else break;
      }
    }
    const x = side === 'right' ? Math.min(ref.x1 + gap, W - lw - 8) : Math.max(ref.x0 - gap, lw + 8);
    for (const it of list) {
      used.add(it.id);
      const n = nodes.get(it.id);
      n.el.classList.toggle('left', side === 'left');
      n.el.classList.toggle('behind', it.hidden);
      const foc = it.focus ?? (state.focusPart === it.part);
      n.el.classList.toggle('focus', foc);
      n.el.classList.toggle('palp-kind', kind === 'palp');
      n.el.style.transform = side === 'right'
        ? `translate(${x}px, ${it.ly}px) translateY(-50%)`
        : `translate(${x}px, ${it.ly}px) translate(-100%, -50%)`;
      const ex = side === 'right' ? x - 4 : x + 4;
      const knee = side === 'right' ? ex - 10 : ex + 10;
      n.line.setAttribute('points', `${it.q.x},${it.q.y} ${knee},${it.ly} ${ex},${it.ly}`);
      n.line.setAttribute('class', `ll${it.hidden ? ' behind' : ''}${foc ? ' focus' : ''}`);
      n.dot.setAttribute('cx', it.q.x);
      n.dot.setAttribute('cy', it.q.y);
      n.dot.setAttribute('class', `ld${it.palp ? ' palp' : ''}${it.hidden ? ' behind' : ''}${foc ? ' focus' : ''}`);
      n.line.style.display = ''; n.dot.style.display = '';
    }
  }
  for (const it of dots) {
    used.add(it.id);
    let n = nodes.get(it.id);
    if (!n) {
      const el = document.createElement('div'); el.className = 'lbl'; el.innerHTML = '<b></b><span></span>'; labelsEl.appendChild(el);
      const line = document.createElementNS(svgNS, 'polyline'); const dot = document.createElementNS(svgNS, 'circle'); dot.setAttribute('r', '4');
      svg.append(line, dot); n = { el, line, dot }; nodes.set(it.id, n);
    }
    n.el.hidden = true; n.line.style.display = 'none'; n.dot.style.display = '';
    n.dot.setAttribute('cx', it.q.x); n.dot.setAttribute('cy', it.q.y);
    n.dot.setAttribute('class', `ld mini${it.hidden ? ' behind' : ''}`);
  }
  for (const [id, n] of nodes) {
    if (!used.has(id)) { n.el.hidden = true; n.line.style.display = 'none'; n.dot.style.display = 'none'; }
  }
  if (performance.now() - occlAt >= 120) occlAt = performance.now();
  const hint = $('#zoomhint');
  if (hint) hint.hidden = !(state.labels && state.mode === 'atlas' && kind === 'palp');
}

/* ---------- Panel rendering ---------- */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function metaBlock(fma) {
  return `<div class="meta">
    ${fma ? `<div>Model: <code>${fma}</code> · BodyParts3D</div>` : ''}
    <div>Modele 3D: <a href="https://doi.org/10.18908/lsdba.nbdc00837-000" target="_blank" rel="noopener">BodyParts3D</a>, © The Database Center for Life Science, licencja <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en" target="_blank" rel="noopener">CC BY-SA 2.1 JP</a>. Przetworzone (konwersja formatu, układ współrzędnych, uproszczenie siatek, kompresja).</div>
    <div>Opisy: wersja robocza do weryfikacji przez nauczyciela.</div>
  </div>`;
}
function ribBlock(k) {
  if (!k.startsWith('Th')) return '';
  const n = +k.slice(2);
  const lk = RIB_LINKS[k] || {};
  const prev = RIB_LINKS[`Th${n - 1}`] || {};
  const items = [];
  if (lk.fov_sup) {
    const r = lk.fov_sup;
    const where = prev.fov_inf === r ? `dołek żebrowy górny ${k} i dołek żebrowy dolny Th${n - 1}` : `dołek żebrowy ${k}${[1, 11, 12].includes(n) ? ' (pełny)' : ''}`;
    items.push(`<li><b>Głowa żebra ${r}</b> → ${where} · <i>staw głowy żebra</i></li>`);
  }
  if (lk.fov_inf) items.push(`<li><b>Głowa żebra ${lk.fov_inf}</b> → dołek żebrowy dolny ${k} i dołek żebrowy górny Th${n + 1} · <i>staw głowy żebra</i></li>`);
  if (lk.fov_tp) items.push(`<li><b>Guzek żebra ${lk.fov_tp}</b> → dołek żebrowy wyrostka poprzecznego ${k} · <i>staw żebrowo-poprzeczny</i></li>`);
  else if (n >= 11) items.push(`<li>Wyrostek poprzeczny ${k} nie ma dołka żebrowego — żebro ${n} nie tworzy stawu żebrowo-poprzecznego (żebra 11 i 12 to żebra wolne).</li>`);
  return `<div class="ribs-block"><h3>Połączenia z żebrami</h3><ul>${items.join('')}</ul>
    <p class="small"><i class="swatch" aria-hidden="true"></i>Dołki żebrowe są zaznaczone kolorem na kręgu.
    <button type="button" class="linkbtn" data-action="ribs">${state.ribs ? 'Ukryj żebra' : 'Pokaż żebra przy kręgu'}</button></p></div>`;
}

function partsBlock(k) {
  const list = partList(k);
  if (!list.length) return '';
  const rv = reviewedOf(k);
  const status = `<div class="lmstatus${rv ? ' ok' : ''}"><span>${rv ? `Położenie etykiet sprawdzone ręcznie (${esc(rv)}).` : 'Położenie etykiet wyznaczone automatycznie, jeszcze niesprawdzone.'}</span>
    <button type="button" class="linkbtn" data-action="edit">Popraw punkty</button></div>`;
  return `<div><h3>Części · najedź, aby wskazać na modelu</h3>${status}<dl class="parts">${list.map(({ part, def }) => `
    <div class="prow" data-part="${part}" tabindex="0">
      <dt><i class="pd${def.palp ? ' palp' : ''}" aria-hidden="true"></i>${esc(def.name)}${def.palp ? ' <em>wyczuwalny</em>' : ''}</dt>
      <dd>${esc(def.def || '')}${def.note ? ' ' + esc(def.note) : ''}</dd>
    </div>`).join('')}</dl></div>`;
}
function bindParts() {
  panelEl.querySelector('[data-action=edit]')?.addEventListener('click', () => setMode('edit'));
  panelEl.querySelector('[data-action=ribs]')?.addEventListener('click', toggleRibs);
  panelEl.querySelectorAll('.prow').forEach((r) => {
    const on = () => { state.focusPart = r.dataset.part; invalidate(); };
    const off = () => { state.focusPart = null; invalidate(); };
    r.addEventListener('mouseenter', on); r.addEventListener('focus', on);
    r.addEventListener('mouseleave', off); r.addEventListener('blur', off);
  });
}

function renderMuscle(k) {
  panelEl.style.setProperty('--rc', 'var(--muscle)');
  document.documentElement.style.setProperty('--rc', 'var(--muscle)');
  bigcodeEl.textContent = '';
  panelEl.innerHTML = MUS.panelHTML(k, esc, metaBlock);
  panelEl.querySelectorAll('.prow').forEach((r) => {
    const on = () => { state.focusPart = r.dataset.part; paint(); };
    const off = () => { state.focusPart = null; paint(); };
    r.addEventListener('mouseenter', on); r.addEventListener('focus', on);
    r.addEventListener('mouseleave', off); r.addEventListener('blur', off);
  });
}
function renderPart(k) {
  invalidate();
  panelRibs = ribsOn(k);
  if (muscleMode()) { renderMuscle(k); return; }
  const reg = regionOf(k);
  const R = REGIONS[reg];
  panelEl.style.setProperty('--rc', `var(--${reg.toLowerCase()})`);
  document.documentElement.style.setProperty('--rc', `var(--${reg.toLowerCase()})`);
  const fma = parts[k]?.userData?.fma;
  if (k.startsWith('D_')) {
    const lbl = discLabel(k);
    bigcodeEl.textContent = lbl;
    const note = DISC.notes[k];
    panelEl.innerHTML = `
      <div>
        <div class="eyebrow"><span>${esc(R.name)}</span><span>·</span><span>Krążek</span></div>
        <h2>Krążek międzykręgowy ${lbl}</h2>
        <p class="latin">${DISC.latin}</p>
      </div>
      <div><h3>Budowa</h3><p>${esc(DISC.text)}</p></div>
      ${partsBlock(k)}
      ${note ? `<div class="note"><h3>Warto wiedzieć</h3><p>${esc(note)}</p></div>` : ''}
      ${metaBlock(fma)}`;
    bindParts();
    return;
  }
  const P = PARTS[k];
  bigcodeEl.textContent = P.short === 'S1–S5' ? 'S' : P.short;
  panelEl.innerHTML = `
    <div>
      <div class="eyebrow"><span>${esc(R.name)}</span><span>·</span><span>${esc(R.curve)}</span></div>
      <h2>${esc(P.name)}</h2>
      <p class="latin">${esc(P.latin)} · ${esc(P.short)}</p>
    </div>
    <div><h3>Cechy</h3><ul>${P.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>
    ${ribBlock(k)}
    ${partsBlock(k)}
    <div class="note"><h3>Dla masażysty</h3><p>${esc(P.massage)}</p></div>
    <div><h3>Przyczepy mięśni (wybrane)</h3><p>${esc(P.muscles)}</p></div>
    <div><h3>${esc(R.name)} · ${esc(R.count)}</h3><p class="region-text">${esc(R.text)}</p></div>
    ${metaBlock(fma)}`;
  bindParts();
}

function select(k, doFrame) {
  if (state.mode === 'quiz') return;
  if (!modKeys().includes(k.replace('D_', ''))) return;
  if (single() && k.startsWith('D_')) k = k.slice(2);
  if (k !== state.selected) state.focusPart = null;
  state.selected = k;
  if (!muscleMode()) state.lastBone = k;
  const ml = MUS.MUSCLES[k]?.layer;
  if (muscleMode() && ml && !state.layers[ml]) { state.layers[ml] = true; syncLayerChips(); }
  if (state.mode === 'edit') { state.edit = { part: null, slot: 0 }; renderEditor(); } else renderPart(k);
  syncRuler();
  updateLod();
  paint();
  updateLoader();
  if (muscleMode()) { if (doFrame) frameWhenReady(k, () => frame([k], null, state.isolate ? 1.4 : 1.15)); }
  else if (doFrame || single()) {
    const keys = k.startsWith('D_') ? [k.slice(2)] : [k];
    if (closeUp()) frameWhenReady(k, () => closeFrame(k));
    else { pendingFrame = null; frame(neighbors(keys[0], 3)); }
  }
  writeHash();
}

/* ---------- Quiz ---------- */
function newQuestion() {
  const q = state.quiz;
  const keys = modKeys();
  const target = keys[Math.floor(Math.random() * keys.length)];
  const i = keys.indexOf(target);
  const pool = keys.filter((k) => k !== target && Math.abs(keys.indexOf(k) - i) <= 4);
  const opts = [target];
  while (opts.length < 4 && pool.length) opts.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  opts.sort(() => Math.random() - 0.5);
  Object.assign(q, { target, opts, answered: false });
  bigcodeEl.textContent = '?';
  document.documentElement.style.setProperty('--rc', 'var(--ink)');
  panelEl.style.setProperty('--rc', 'var(--focus)');
  panelEl.innerHTML = `
    <div>
      <div class="eyebrow"><span>Quiz</span><span>·</span><span class="score">Wynik ${q.good}/${q.total}</span></div>
      <p class="quiz-q">${single() ? 'Który to kręg? Rozpoznaj go po kształcie.' : 'Który to kręg? Jest podświetlony na modelu.'}</p>
    </div>
    <div class="answers">${opts.map((k) => `<button type="button" data-k="${k}"><span>${esc(PARTS[k].name)}</span><span class="code">${PARTS[k].short}</span></button>`).join('')}</div>
    <p class="feedback" id="feedback" aria-live="polite">Obracaj model, aby lepiej się przyjrzeć. Liczy się pierwsza odpowiedź.</p>
    <button type="button" class="btn" id="next" hidden>Następne pytanie</button>
    ${metaBlock()}`;
  panelEl.querySelectorAll('.answers button').forEach((b) => b.addEventListener('click', () => answer(b.dataset.k)));
  $('#next').addEventListener('click', newQuestion);
  updateLod();
  paint();
  updateLoader();
  if (single()) frameWhenReady(target, () => closeFrame(target, VIEWS.three));
  else { pendingFrame = null; frame(neighbors(target, 3), VIEWS.three); }
}
function answer(k) {
  const q = state.quiz;
  if (q.answered) return;
  q.answered = true;
  q.total++;
  const ok = k === q.target;
  if (ok) q.good++;
  panelEl.querySelectorAll('.answers button').forEach((b) => {
    b.disabled = true;
    if (b.dataset.k === q.target) b.classList.add('ok');
    else if (b.dataset.k === k) b.classList.add('bad');
  });
  const P = PARTS[q.target];
  $('#feedback').innerHTML = `${ok ? '<strong>Dobrze.</strong>' : '<strong>Nie tym razem.</strong>'} To ${esc(P.name)} (${P.short}). ${esc(P.massage)}`;
  panelEl.querySelector('.score').textContent = `Wynik ${q.good}/${q.total}`;
  bigcodeEl.textContent = P.short === 'S1–S5' ? 'S' : P.short;
  $('#next').hidden = false;
  $('#next').focus();
}
function syncModeButtons() {
  const mode = state.mode;
  document.querySelectorAll('.modes button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  rulerEl.style.opacity = mode === 'quiz' ? '.35' : '';
  rulerEl.style.pointerEvents = mode === 'quiz' ? 'none' : '';
  rulerEl.toggleAttribute('inert', mode === 'quiz');
  $('#isolate').disabled = mode !== 'atlas';
  document.body.classList.toggle('editing', mode === 'edit');
}
function setMode(mode) {
  if (mode !== 'atlas' && muscleMode()) return;
  state.mode = mode;
  syncModeButtons();
  if (mode === 'quiz') {
    state.quiz = state.quiz || { good: 0, total: 0 };
    newQuestion();
  } else {
    select(state.selected, true);
  }
  if (mode === 'edit') closeFrame(state.selected, VIEWS.side);
  syncRuler();
}


/* ---------- Edit mode: fix label points by hand ---------- */
const PAIRED = new Set(['pedicle', 'lamina', 'transverse', 'art_sup', 'art_inf', 'massa_lat', 'ala', 'auricular',
  'fov_sup', 'fov_inf', 'fov_tp', 'rib_head', 'rib_neck', 'rib_tub', 'rib_head_next']);
// kolejność punktów w parach: [lewa, prawa] (strona ciała, nie ekranu)
const SIDE_NAMES = ['lewa', 'prawa'];
const SIDE_SHORT = ['L', 'P'];
function editableParts(k) {
  if (k.startsWith('D_')) return ['anulus', 'nucleus'];
  if (k === 'S') return ['promontorium', 'canal', 'art_sup', 'ala', 'auricular', 'crista_mediana', 'apex'];
  if (k === 'C1') return ['arcus_ant', 'fovea_dentis', 'massa_lat', 'arcus_post', 'foramen', 'transverse'];
  const base = ['body', 'pedicle', 'lamina', 'foramen', 'spinous', 'transverse', 'art_sup', 'art_inf'];
  if (k.startsWith('Th')) {
    const n = +k.slice(2);
    const extra = ['fov_sup', ...(n <= 9 ? ['fov_inf'] : []), ...(n <= 10 ? ['fov_tp'] : [])];
    if (ribsOn(k)) extra.push('rib_head', ...(n <= 10 ? ['rib_neck', 'rib_tub'] : []), ...(n <= 9 ? ['rib_head_next'] : []));
    return [...base, ...extra];
  }
  return k === 'C2' ? ['dens', ...base] : base;
}
const r4 = (v) => Math.round(v * 1e4) / 1e4;
function setPoint(k, part, slot, p) {
  const arr = (lm(k)[part] || []).slice();
  while (arr.length < slot) arr.push(null);
  arr[slot] = p.map(r4);
  (local.fixes[k] ||= {})[part] = arr;
  saveLocal();
}
function placePoint(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const targets = [parts[state.selected], ...ribMeshes.filter((m) => m.visible)];
  const hit = ray.intersectObjects(targets, false)[0];
  if (!hit) { editMsg('Kliknij na podświetloną kość — punkt musi leżeć na jej powierzchni.'); return; }
  setPoint(state.selected, state.edit.part, state.edit.slot, hit.point.toArray());
  occl.clear();
  renderEditor();
}
function nudge(dx, dy, dz) {
  const { part, slot } = state.edit;
  const cur = lm(state.selected)[part]?.[slot];
  if (!cur) { editMsg('Najpierw kliknij na modelu, żeby ustawić punkt.'); return; }
  const m = camera.matrixWorld;
  const right = new THREE.Vector3().setFromMatrixColumn(m, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(m, 1);
  const back = new THREE.Vector3().setFromMatrixColumn(m, 2);   // towards the viewer
  const mm = 0.01; // 1 jednostka = 10 cm
  const p = new THREE.Vector3(...cur).addScaledVector(right, dx * mm).addScaledVector(up, dy * mm).addScaledVector(back, -dz * mm);
  setPoint(state.selected, part, slot, p.toArray());
  occl.clear();
  renderEditor();
}
function editMsg(t) { const el = $('#editmsg'); if (el) el.textContent = t; }

function mergedFixes() {
  const out = JSON.parse(JSON.stringify(FIXES));
  for (const [k, fx] of Object.entries(local.fixes)) out[k] = { ...(out[k] || {}), ...fx };
  return out;
}
function exportText() {
  const rev = { ...REVIEWED, ...local.reviewed };
  for (const k of Object.keys(rev)) if (!rev[k]) delete rev[k];
  const order = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => [...ORDER, ...ORDER.map((x) => 'D_' + x)].indexOf(a[0]) - [...ORDER, ...ORDER.map((x) => 'D_' + x)].indexOf(b[0])));
  const fx = order(mergedFixes());
  const lines = Object.entries(fx).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
  return `// Ręczne poprawki punktów etykiet. Plik tworzy tryb „Popraw punkty” na stronie (przycisk „Pobierz landmarks-fix.js”).
// Współrzędne w układzie models/kregoslup.glb (1 jednostka = 10 cm). null = punkt usunięty.
// REVIEWED: data sprawdzenia punktów danego kręgu.
export const FIXES = {${lines ? '\n' + lines + '\n' : ''}};
export const REVIEWED = ${JSON.stringify(order(rev), null, 2)};
`;
}
const localCount = () => new Set([...Object.keys(local.fixes), ...Object.keys(local.reviewed)]).size;

function renderEditor() {
  invalidate();
  panelRibs = ribsOn(state.selected);
  const k = state.selected;
  const reg = regionOf(k);
  panelEl.style.setProperty('--rc', `var(--${reg.toLowerCase()})`);
  document.documentElement.style.setProperty('--rc', `var(--${reg.toLowerCase()})`);
  const title = k.startsWith('D_') ? `Krążek ${discLabel(k)}` : `${PARTS[k].name} · ${PARTS[k].short}`;
  bigcodeEl.textContent = k.startsWith('D_') ? discLabel(k) : (k === 'S' ? 'S' : k);
  const L = lm(k);
  const rv = reviewedOf(k);
  const { part: ap, slot: as } = state.edit;
  const activeDef = ap ? partDef(k, ap) : null;
  const ctl = ap ? `<div class="ectl">
      <p id="editmsg" class="feedback" aria-live="polite">${lm(k)[ap]?.[as] ? 'Kliknij na kości, aby przenieść punkt, albo przesuń go przyciskami.' : 'Kliknij na kości, aby ustawić punkt.'}</p>
      <div class="nudge" role="group" aria-label="Przesuń punkt">
        <button type="button" data-n="0,1,0" title="W górę ekranu">↑</button>
        <button type="button" data-n="-1,0,0" title="W lewo">←</button>
        <button type="button" data-n="1,0,0" title="W prawo">→</button>
        <button type="button" data-n="0,-1,0" title="W dół ekranu">↓</button>
        <button type="button" data-n="0,0,-1" title="Bliżej mnie">do mnie</button>
        <button type="button" data-n="0,0,1" title="W głąb">w głąb</button>
      </div>
      <div class="erow-actions">
        <button type="button" class="linkbtn" id="del">Usuń punkt</button>
        ${fixedIn(k, ap) ? '<button type="button" class="linkbtn" id="reset">Przywróć automatyczny</button>' : ''}
        <button type="button" class="linkbtn" id="stop">Gotowe</button>
      </div>
    </div>` : '';
  const rows = editableParts(k).map((part) => {
    const def = partDef(k, part);
    const pts = L[part] || [];
    const n = PAIRED.has(part) ? 2 : 1;
    const changed = Array.from({ length: n }, (_, i) => pts[i] && slotChanged(k, part, i)).some(Boolean);
    const unsaved = local.fixes[k] && part in local.fixes[k];
    const tag = !pts.length ? 'brak punktu' : changed ? (unsaved ? 'poprawiony · niezapisany w pliku' : 'poprawiony') : 'automatyczny';
    const slots = Array.from({ length: n }, (_, i) => `<button type="button" class="slot${ap === part && as === i ? ' on' : ''}${pts[i] ? '' : ' empty'}" data-part="${part}" data-slot="${i}" aria-pressed="${ap === part && as === i}">${n > 1 ? SIDE_NAMES[i] : 'wybierz'}</button>`).join('');
    return `<div class="erow${ap === part ? ' active' : ''}"><div><b>${esc(def?.name || part)}</b><small class="${changed ? 'fx' : ''}">${tag}</small></div><div class="slots">${slots}</div></div>${ap === part ? ctl : ''}`;
  }).join('');
  const n = localCount();
  panelEl.innerHTML = `
    <div>
      <div class="eyebrow"><span>Popraw punkty</span><span>·</span><span>${esc(REGIONS[reg].name)}</span></div>
      <h2>${esc(title)}</h2>
      <p class="latin">Zmiany zapisują się w tej przeglądarce. Na koniec pobierz plik i podmień go w repozytorium.</p>
    </div>
    <label class="check"><input type="checkbox" id="rev" ${rv ? 'checked' : ''}> <span>Sprawdziłem punkty tego ${k.startsWith('D_') ? 'krążka' : 'kręgu'}${rv ? ` <small>(${esc(rv)})</small>` : ''}</span></label>
    <div><h3>Jak poprawić punkt</h3><ol class="steps">
      <li>Wybierz część (przy parzystych — stronę lewą lub prawą, czyli stronę ciała). Na modelu jej etykieta zostanie obwiedziona.</li>
      <li>Obróć model tak, żeby widzieć to miejsce, i kliknij na kości w miejscu, gdzie powinien być punkt.</li>
      <li>Dopracuj strzałkami na klawiaturze lub przyciskami: 1 mm, z Shift 5 mm. PgUp / PgDn przesuwa w głąb (np. do środka otworu kręgowego).</li>
    </ol></div>
    <div class="elist">${rows}</div>
    <div class="export">
      <h3>Zapis do projektu</h3>
      <p>${n ? `Niezapisane w pliku zmiany: <b>${n}</b> ${n === 1 ? 'kręg' : 'kręgi/krążki'}.` : 'Wszystkie poprawki są już w pliku landmarks-fix.js.'}</p>
      <div class="ebtns">
        <button type="button" class="btn" id="dl">Pobierz landmarks-fix.js</button>
        <button type="button" class="chip" id="copy">Kopiuj zawartość</button>
        ${n ? '<button type="button" class="linkbtn" id="discard">Odrzuć moje zmiany</button>' : ''}
      </div>
      <p class="small">Pobrany plik wstaw do folderu projektu w miejsce istniejącego <code>landmarks-fix.js</code>, a potem zrób commit.</p>
      <textarea id="exportText" readonly hidden></textarea>
    </div>
    <button type="button" class="btn ghost" id="done">Zakończ edycję</button>`;

  panelEl.querySelectorAll('.slot').forEach((b) => b.addEventListener('click', () => {
    state.edit = { part: b.dataset.part, slot: +b.dataset.slot };
    renderEditor();
  }));
  panelEl.querySelectorAll('[data-n]').forEach((b) => b.addEventListener('click', () => nudge(...b.dataset.n.split(',').map(Number))));
  $('#rev').addEventListener('change', (e) => {
    const d = new Date();
    local.reviewed[k] = e.target.checked ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : false;
    if ((REVIEWED[k] || false) === local.reviewed[k]) delete local.reviewed[k];
    saveLocal(); renderEditor();
  });
  $('#del')?.addEventListener('click', () => {
    const arr = (lm(k)[ap] || []).slice();
    arr[as] = null;
    (local.fixes[k] ||= {})[ap] = arr.some(Boolean) ? arr : null;
    saveLocal(); renderEditor();
  });
  $('#reset')?.addEventListener('click', () => {
    if (local.fixes[k]) delete local.fixes[k][ap];
    if (local.fixes[k] && !Object.keys(local.fixes[k]).length) delete local.fixes[k];
    if (FIXES[k] && ap in FIXES[k]) (local.fixes[k] ||= {})[ap] = autoLm(k)[ap] || null;
    saveLocal(); renderEditor();
  });
  $('#stop')?.addEventListener('click', () => { state.edit.part = null; renderEditor(); });
  $('#done').addEventListener('click', () => setMode('atlas'));
  $('#dl').addEventListener('click', () => {
    try {
      const url = URL.createObjectURL(new Blob([exportText()], { type: 'text/javascript' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: 'landmarks-fix.js' });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) { /* fall through */ }
    const ta = $('#exportText');
    ta.value = exportText(); ta.hidden = false;
    $('#dl').textContent = 'Pobrano? Jeśli nie — skopiuj tekst poniżej';
  });
  $('#copy').addEventListener('click', async () => {
    const ta = $('#exportText');
    ta.value = exportText(); ta.hidden = false;
    try { await navigator.clipboard.writeText(ta.value); $('#copy').textContent = 'Skopiowano'; }
    catch (e) { ta.focus(); ta.select(); $('#copy').textContent = 'Zaznaczono — Ctrl+C'; }
  });
  const disc = $('#discard');
  disc?.addEventListener('click', () => {
    if (disc.dataset.sure) { local = { fixes: {}, reviewed: {} }; saveLocal(); state.edit.part = null; renderEditor(); return; }
    disc.dataset.sure = '1'; disc.textContent = 'Na pewno? Kliknij jeszcze raz';
  });
  syncRuler();
  paint();
}

/* ---------- Uproszczone bryły do celowania (raycast) ---------- */
// Trafienia i zasłanianie etykiet liczymy na siatkach uproszczonych ok. 10× (łączenie wierzchołków co 2,5 mm),
// a nie na pełnych modelach. Dokładna siatka jest używana tylko przy stawianiu punktów w edytorze.
const proxyMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
function buildProxy(mesh, cell = 0.04) {
  mesh.updateWorldMatrix(true, false);
  const pos = mesh.geometry.attributes.position;
  const v = new THREE.Vector3();
  const map = new Map();
  const sums = [];
  const remap = new Uint32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    const key = `${Math.floor(v.x / cell)},${Math.floor(v.y / cell)},${Math.floor(v.z / cell)}`;
    let id = map.get(key);
    if (id === undefined) { id = sums.length / 4; map.set(key, id); sums.push(0, 0, 0, 0); }
    sums[id * 4] += v.x; sums[id * 4 + 1] += v.y; sums[id * 4 + 2] += v.z; sums[id * 4 + 3]++;
    remap[i] = id;
  }
  const n = sums.length / 4;
  const P = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const c = sums[i * 4 + 3]; P[i * 3] = sums[i * 4] / c; P[i * 3 + 1] = sums[i * 4 + 1] / c; P[i * 3 + 2] = sums[i * 4 + 2] / c; }
  const src = mesh.geometry.index.array;
  const idx = [];
  for (let t = 0; t < src.length; t += 3) {
    const a = remap[src[t]], b = remap[src[t + 1]], c = remap[src[t + 2]];
    if (a !== b && b !== c && a !== c) idx.push(a, b, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setIndex(n < 65536 ? new THREE.Uint16BufferAttribute(idx, 1) : new THREE.Uint32BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  const proxy = new THREE.Mesh(g, proxyMat);
  proxy.userData.target = mesh;
  proxy.matrixAutoUpdate = false;
  proxy.updateMatrixWorld(true);
  perf.proxyTris = (perf.proxyTris || 0) + idx.length / 3;
  return proxy;
}
// siatka uproszczona z paczki przeglądu jest od razu bryłą do celowania
function proxyOf(geo, mesh) {
  const p = new THREE.Mesh(geo, proxyMat);
  p.userData.target = mesh;
  p.matrixAutoUpdate = false;
  p.updateMatrixWorld(true);
  perf.proxyTris = (perf.proxyTris || 0) + geo.index.count / 3;
  return p;
}
function activeProxies(bonesOnly) {
  const list = [];
  for (const m of Object.values(parts)) if (m.visible && m.material.opacity > 0.5 && m.userData.proxy) list.push(m.userData.proxy);
  if (!bonesOnly) for (const m of ribMeshes) if (m.visible && m.userData.proxy) list.push(m.userData.proxy);
  for (const m of muscleMeshes) if (m.visible && m.material.opacity > 0.5 && m.userData.proxy) list.push(m.userData.proxy);
  for (const m of ctxMeshes) if (m.visible && m.userData.proxy) list.push(m.userData.proxy);
  return list;
}
// Pierwsze trafienie, z pominięciem części żeber odciętych w widoku „Tylko wybrany”.
function firstProxyHit(rc, bonesOnly = false) {
  const hits = rc.intersectObjects(activeProxies(bonesOnly), false);
  const clipped = ribMat.clippingPlanes?.length;
  for (const h of hits) {
    if (clipped && h.object.userData.target.userData.kind === 'rib' && !clipPlanes.every((pl) => pl.distanceToPoint(h.point) >= 0)) continue;
    return h;
  }
  return null;
}

/* ---------- Picking ---------- */
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let downAt = null;
function pick(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  if (muscleMode()) {                     // w module mięśni wybiera się tylko mięśnie (kości są tłem)
    const t = firstProxyHit(ray, false)?.object.userData.target;
    return t?.userData.kind === 'muscle' ? t.userData.muscle : null;
  }
  const hit = firstProxyHit(ray, true);
  const t = hit?.object.userData.target;
  return t && parts[t.name] ? t.name : null;
}
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  if (state.mode === 'edit' && state.edit.part) { placePoint(e); return; }
  const k = pick(e);
  if (k && state.mode !== 'quiz') select(k, false);
});
// Podświetlanie pod kursorem: najwyżej raz na klatkę i nie podczas obracania.
let hoverEv = null;
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons) return;
  hoverEv = e;
});
renderer.domElement.addEventListener('pointerleave', () => { hoverEv = null; if (state.hovered) { state.hovered = null; paint(); } });
function processHover() {
  if (!hoverEv) return;
  const e = hoverEv; hoverEv = null;
  const k = state.mode !== 'quiz' ? pick(e) : null;
  renderer.domElement.style.cursor = state.mode === 'edit' && state.edit.part ? 'crosshair' : (k ? 'pointer' : '');
  if (k !== state.hovered) {
    state.hovered = k;
    paint();
  }
}

/* ---------- Toolbar ---------- */
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  const v = b.dataset.view;
  const k = currentKey();
  if (single()) closeFrame(k, VIEWS[v === 'all' ? 'three' : v]);
  else if (v === 'all') frame(muscleMode() ? [...modKeys(), ...ORDER] : modKeys(), muscleMode() ? VIEWS.back : VIEWS.side);
  else if (closeUp()) closeFrame(k, VIEWS[v]);
  else frame(modKeys(), VIEWS[v]);
}));
function toggle(id, prop) {
  const b = $(id);
  b.addEventListener('click', () => {
    state[prop] = !state[prop];
    b.setAttribute('aria-pressed', String(state[prop]));
    if (prop === 'isolate') select(state.selected, true);
    paint();
    scheduleLod(0);
  });
}
// Moduł mięśni: przełączniki warstw (każda warstwa to osobna paczka) i podświetlania przyczepów
function renderLayerChips() {
  const box = $('#layers');
  box.innerHTML = MUS.READY_LAYERS.map((n) => `<button type="button" class="chip" data-layer="${n}" aria-pressed="${!!state.layers[n]}"><span class="box"></span>${MUS.LAYERS[n].short}</button>`).join('');
  box.querySelectorAll('[data-layer]').forEach((b) => b.addEventListener('click', () => {
    const n = +b.dataset.layer;
    state.layers[n] = !state.layers[n];
    b.setAttribute('aria-pressed', String(state.layers[n]));
    occl.clear();
    updateLod();
    paint();
  }));
}
function syncLayerChips() {
  document.querySelectorAll('#layers [data-layer]').forEach((b) => b.setAttribute('aria-pressed', String(!!state.layers[+b.dataset.layer])));
}
toggle('#attach', 'attach');
toggle('#discs', 'showDiscs');
toggle('#tint', 'tint');
toggle('#isolate', 'isolate');
toggle('#names', 'labels');
$('#ribs').addEventListener('click', toggleRibs);
document.querySelectorAll('.modes button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea')) return;
  if (state.mode === 'edit' && state.edit.part) {
    const st = e.shiftKey ? 5 : 1;
    const m = { ArrowLeft: [-st, 0, 0], ArrowRight: [st, 0, 0], ArrowUp: [0, st, 0], ArrowDown: [0, -st, 0], PageUp: [0, 0, -st], PageDown: [0, 0, st] }[e.key];
    if (m) { e.preventDefault(); nudge(...m); return; }
    if (e.key === 'Escape') { state.edit.part = null; renderEditor(); return; }
  }
  if (state.mode === 'quiz') return;
  if (e.key === 'Escape' && !pickerEl.hidden && state.module) { hidePicker(); return; }
  if (!state.module || !pickerEl.hidden) return;
  const keys = modKeys();
  const k = state.selected.replace('D_', '');
  const i = keys.indexOf(k);
  if (e.key === 'ArrowDown' && i < keys.length - 1) { e.preventDefault(); select(keys[i + 1], true); }
  if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); select(keys[i - 1], true); }
});

window.addEventListener('hashchange', () => {
  const { mod, key } = parseHash();
  if (mod && mod !== state.module) setModule(mod, key);
  else if (key && key !== state.selected && state.mode !== 'quiz') select(key, true);
});

/* ---------- Theme reactivity ---------- */
const reTheme = () => { readColors(); paint(); };
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', reTheme);
new MutationObserver(reTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

/* ---------- Wybór modułu ---------- */
const MOD_KEY = 'atlas-module-v1';
const pickerEl = $('#picker');
const loaderEl = $('#loader');
const validKey = (k) => ORDER.includes(k) || (/^D_/.test(k) && ORDER.includes(k.slice(2)) && k !== 'D_S' && k !== 'D_C1');
function parseHash() {
  const h = decodeURIComponent(location.hash.slice(1)).replace(/[&?]?debug\b/, '');
  const [a, b] = h.split('/');
  if (MODULES[a]) return { mod: a, key: validKey(b) || MUS.MUSCLES[b] ? b : null };
  if (validKey(a)) return { mod: null, key: a };   // stare linki: #C7
  return {};
}
function writeHash() {
  if (!state.module) return;
  const h = `#${state.module}/${state.selected}${DEBUG ? '&debug' : ''}`;
  if (location.hash !== h) try { history.replaceState(null, '', h); } catch (e) { /* ignore */ }
}
const ICONS = {
  kregoslup: '<svg viewBox="0 0 40 56" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6">' +
    Array.from({ length: 9 }, (_, i) => `<rect x="${15 + Math.sin(i / 2.6) * 4}" y="${3 + i * 5.6}" width="${8 + i * 0.6}" height="3.6" rx=".6"/>`).join('') + '</g></svg>',
  kregi: '<svg viewBox="0 0 40 56" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6"><ellipse cx="20" cy="19" rx="10" ry="7.5"/><path d="M12 25 L8 31 M28 25 L32 31 M14 27 Q20 33 26 27 M20 33 L20 47"/><circle cx="20" cy="28.5" r="2.6"/></g></svg>',
  grzbiet: '<svg viewBox="0 0 40 56" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 4 L20 52" stroke-dasharray="2 2.5"/><path d="M15 6 L20 5 L25 6 L35 13 L36 17 L20 30 L4 17 L5 13 Z" fill="currentColor" fill-opacity=".18"/><path d="M20 30 L20 46 L10 50 L7 30 Z M20 30 L20 46 L30 50 L33 30 Z" fill="currentColor" fill-opacity=".08"/></g></svg>',
  zebra: '<svg viewBox="0 0 40 56" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6">' +
    Array.from({ length: 5 }, (_, i) => `<rect x="17" y="${6 + i * 9}" width="6" height="4.5" rx=".6"/><path d="M17 ${9 + i * 9} Q5 ${10 + i * 9} 4 ${19 + i * 9} M23 ${9 + i * 9} Q35 ${10 + i * 9} 36 ${19 + i * 9}"/>`).join('') + '</g></svg>',
};
function moduleSize(mod) {
  const base = MODULES[mod].base.reduce((a, id) => a + (PACKS[id]?.bajty || 0), 0);
  const per = ORDER.map((k) => PACKS[packForKey(k)]?.bajty || 0).filter(Boolean);
  const range = `${kB(Math.min(...per))}–${kB(Math.max(...per))}`;
  if (mod === 'kregi') return { big: range.replace(/ kB–/, '–'), small: 'za każdy oglądany kręg' };
  return { big: kB(base), small: 'na start' };
}
function showPicker() {
  const first = !state.module;
  pickerEl.innerHTML = `<div class="pk" role="dialog" aria-modal="${!first}" aria-labelledby="pkTitle">
    <div class="pk-head">
      <div><span class="pk-eyebrow">Moduły</span><h2 id="pkTitle">Co chcesz oglądać?</h2></div>
      ${first ? '' : '<button type="button" class="pk-close" id="pkClose" aria-label="Zamknij">×</button>'}
    </div>
    <p class="pk-lead">Pobierane jest tylko to, co wybierzesz. Na start wystarcza model uproszczony; pełny kręg (${moduleSize('kregi').big}) dochodzi, gdy go wybierzesz albo przybliżysz.</p>
    ${[...new Set(Object.values(MODULES).map((m) => m.group))].map((g) => `<div class="pk-group"><h3 class="pk-gtitle">${g}</h3><div class="pk-list">${Object.entries(MODULES).filter(([, m]) => m.group === g).map(([id, m]) => {
      const sz = moduleSize(id);
      return `<button type="button" class="pk-card" data-mod="${id}" aria-current="${state.module === id}">
        <span class="pk-icon">${ICONS[id]}</span>
        <span class="pk-text"><b>${m.name}</b><span>${m.desc}</span></span>
        <span class="pk-size"><b>${sz.big}</b><span>${sz.small}</span></span>
      </button>`;
    }).join('')}</div></div>`).join('')}
    <p class="pk-foot">${net.bytes ? `Pobrano w tej sesji: <b>${kB(net.bytes)}</b> · ` : ''}${saveData() ? 'Oszczędzanie danych włączone: bez pobierania z wyprzedzeniem.' : 'Sąsiednie kręgi pobierają się w tle, chyba że w telefonie włączysz oszczędzanie danych.'}</p>
  </div>`;
  pickerEl.hidden = false;
  loaderEl.hidden = true;
  pickerEl.querySelectorAll('[data-mod]').forEach((b) => b.addEventListener('click', () => setModule(b.dataset.mod)));
  $('#pkClose')?.addEventListener('click', hidePicker);
  (pickerEl.querySelector('[aria-current="true"]') || pickerEl.querySelector('.pk-card')).focus({ preventScroll: true });
}
function hidePicker() {
  pickerEl.hidden = true;
  updateLoader();
  $('#modbtn').focus({ preventScroll: true });
}
$('#modbtn').addEventListener('click', () => (pickerEl.hidden ? showPicker() : state.module && hidePicker()));

// Zasłona „Wczytywanie…”: dopóki nie ma przeglądu modułu albo (w „Pojedynczych kręgach”) oglądanego kręgu
const baseProgress = {};
function updateLoader(err) {
  if (!pickerEl.hidden || !state.module) { loaderEl.hidden = true; return; }
  const base = MODULES[state.module].base;
  const waiting = base.some((id) => !packs.get(id)?.done) || (single() && !parts[currentKey()]);
  if (err && waiting) {
    loaderEl.hidden = false;
    loaderEl.innerHTML = `<div>Nie udało się pobrać modelu.<br><small>${esc(err.message || err)}</small><br><button type="button" class="btn" id="retry">Spróbuj ponownie</button></div>`;
    $('#retry').addEventListener('click', () => { loaderEl.innerHTML = loaderHTML; setModule(state.module, state.selected); });
    return;
  }
  if (loaderEl.querySelector('#retry')) loaderEl.innerHTML = loaderHTML;
  loaderEl.hidden = !waiting;
  if (waiting) {
    const total = base.reduce((a, id) => a + (PACKS[id]?.bajty || 0), 0);
    const got = base.reduce((a, id) => a + (packs.get(id)?.done ? PACKS[id]?.bajty || 0 : baseProgress[id] || 0), 0);
    const lbl = loaderEl.querySelector('.ltext');
    if (lbl) lbl.textContent = single() && !base.length ? `Wczytywanie: ${PARTS[currentKey()]?.name || currentKey()}…` : `Wczytywanie modelu… ${kB(got)} z ${kB(total)}`;
    $('#loadbar').style.width = total ? `${Math.round((got / total) * 100)}%` : '60%';
  }
}
const loaderHTML = loaderEl.innerHTML;

let framedOnce = false;
function setModule(mod, key = null) {
  if (!MODULES[mod]) return;
  state.module = mod;
  try { localStorage.setItem(MOD_KEY, mod); } catch (e) { /* no storage */ }
  pickerEl.hidden = true;
  labelMode = 'palp';
  $('#modname').textContent = MODULES[mod].name;
  document.body.dataset.module = mod;
  const keys = modKeys();
  const mus = muscleMode();
  if (mus && state.mode !== 'atlas') { state.mode = 'atlas'; syncModeButtons(); }
  if (!mus && keys.includes(state.lastBone.replace('D_', ''))) state.selected = state.lastBone;
  if (key && keys.includes(key.replace('D_', ''))) state.selected = key;
  if (!keys.includes(state.selected.replace('D_', ''))) state.selected = mus ? keys[0] : mod === 'zebra' ? 'Th7' : 'C7';
  if (single() && state.selected.startsWith('D_')) state.selected = state.selected.slice(2);
  state.focusPart = null;
  if (state.isolate) { state.isolate = false; $('#isolate').setAttribute('aria-pressed', 'false'); }
  $('#isolate').hidden = single();
  $('#discs').hidden = single() || mus;
  $('#tint').hidden = mus;
  $('#attach').hidden = !mus;
  $('#layers').hidden = !mus;
  if (mus) {
    const ml = MUS.MUSCLES[state.selected]?.layer;      // link prosto do głębszego mięśnia: jego warstwa musi być widoczna
    if (ml) state.layers[ml] = true;
    renderLayerChips();
  }
  document.querySelector('.modes [data-mode="quiz"]').hidden = mus;   // quiz z mięśni — później
  buildRuler();
  $('.brand h1').textContent = mus ? 'Mięśnie' : 'Kręgosłup';
  $('.stage .hint').innerHTML = `Przeciągnij, aby obrócić · kółko lub dwa palce, aby przybliżyć<br>${mus ? 'Kliknij mięsień, aby go wybrać' : 'Kliknij kość, aby ją wybrać'} · strzałki ↑ ↓`;
  $('.brand .sub').textContent = mus ? `Atlas 3D · grzbiet · warstwy 1–${MUS.READY_LAYERS.at(-1)}` : mod === 'zebra' ? 'Atlas 3D · 12 kręgów · 24 żebra' : mod === 'kregi' ? 'Atlas 3D · jeden kręg naraz' : 'Atlas 3D · 25 kości · 23 krążki';
  for (const id of MODULES[mod].base) {
    ensurePack(id, { keep: true, onProgress: (g) => { baseProgress[id] = g; updateLoader(); } }).catch(() => {});
  }
  setRibs(mod === 'zebra' || mus, false);   // także updateLod(), paint() i panel
  syncRuler();
  updateLoader();
  const snap = !framedOnce;
  const done = () => { framedOnce = true; if (snap && tween) { tween.t = 1; stepTween(0); } };
  if (state.mode === 'quiz') newQuestion();
  else if (single()) frameWhenReady(state.selected, () => { closeFrame(state.selected, VIEWS.three); done(); });
  else {
    pendingFrame = null;
    Promise.all(MODULES[mod].base.map((id) => ensurePack(id))).then(() => {
      if (state.module !== mod) return;
      paint();
      if (mus) frame([...modKeys(), ...ORDER], VIEWS.back, 1.12);
      else if (state.mode === 'edit' || state.isolate) closeFrame(state.selected); else frame(modKeys(), VIEWS.three);
      done();
    }).catch((e) => { if (e?.name !== 'AbortError') console.warn(e); });
  }
  writeHash();
}

/* ---------- Start ---------- */
readColors();
buildRuler();
resize();
camera.position.set(9, 0.8, -5);
{
  const { mod, key } = parseHash();
  let stored = null;
  try { stored = localStorage.getItem(MOD_KEY); } catch (e) { /* no storage */ }
  if (key && validKey(key)) state.selected = key;
  renderPart(state.selected);
  syncRuler();
  const start = mod || (key ? 'kregoslup' : stored);
  if (MODULES[start]) setModule(start, key);
  else showPicker();
}

/* ---------- Obniżona rozdzielczość bez przebudowy płótna ---------- */
// Poziomy 75% i 50% rysujemy do mniejszych buforów pośrednich i rozciągamy na ekran jednym prostokątem.
// Płótno zachowuje rozmiar, więc szybkie przełączanie poziomów nie powoduje kosztownej przebudowy bufora ekranu.
const lowRT = [null, null, null];
const blitScene = new THREE.Scene();
const blitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
// NoBlending: bufor pośredni ma już kolory pomnożone przez alfę, tak jak oczekuje płótno
const blitMat = new THREE.MeshBasicMaterial({ blending: THREE.NoBlending, depthTest: false, depthWrite: false });
blitScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMat));
const _buf = new THREE.Vector2();
function renderFrame() {
  const scale = LEVELS[perf.lvl];
  if (scale >= 0.999) {
    renderer.render(scene, camera);
    perf.tris = renderer.info.render.triangles; perf.calls = renderer.info.render.calls;
    return;
  }
  renderer.getDrawingBufferSize(_buf);
  const w = Math.max(1, Math.round(_buf.x * scale)), h = Math.max(1, Math.round(_buf.y * scale));
  let rt = lowRT[perf.lvl];
  if (!rt) rt = lowRT[perf.lvl] = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType });
  else if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  perf.tris = renderer.info.render.triangles; perf.calls = renderer.info.render.calls;
  renderer.setRenderTarget(null);
  blitMat.map = rt.texture;
  renderer.render(blitScene, blitCam);
}

/* ---------- Płynne przybliżanie kółkiem ---------- */
// OrbitControls przybliża kółkiem skokami (ok. 5% na „ząbek”), co wygląda jak klatkowanie.
// Przejmujemy kółko i dochodzimy do docelowej odległości płynnie; gest szczypania na telefonie zostaje bez zmian.
renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();
  const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
  const cur = zoomTarget ?? camera.position.distanceTo(controls.target);
  zoomTarget = THREE.MathUtils.clamp(cur * Math.exp(px * 0.0012), controls.minDistance, controls.maxDistance);
  tween = null;
  invalidate();
}, { capture: true, passive: false });
const _dir = new THREE.Vector3();
function stepZoom(dt) {
  if (zoomTarget === null) return false;
  const cur = camera.position.distanceTo(controls.target);
  const next = cur + (zoomTarget - cur) * (1 - Math.exp(-dt * 14));
  _dir.copy(camera.position).sub(controls.target).normalize();
  camera.position.copy(controls.target).addScaledVector(_dir, next);
  if (Math.abs(next - zoomTarget) < zoomTarget * 0.002) zoomTarget = null;
  return true;
}

/* ---------- Pętla: rysowanie na żądanie + rozdzielczość zależna od ruchu ---------- */
const prevQ = new THREE.Quaternion();
const prevP = new THREE.Vector3();
function motionSpeed(dt) {
  // prędkość kątowa kamery + względna zmiana położenia (przesuwanie, przybliżanie) na sekundę
  const ang = prevQ.angleTo(camera.quaternion);
  const lin = prevP.distanceTo(camera.position) / Math.max(camera.position.distanceTo(controls.target), 1e-3);
  prevQ.copy(camera.quaternion);
  prevP.copy(camera.position);
  return (ang + lin * 0.6) / Math.max(dt, 1e-3);
}
function updateResolution(now, speed, dt, rendered) {
  // 1) poziom z prędkości: w dół od razu, w górę dopiero po 150 ms spokoju (histereza)
  const target = speed > 3 ? 2 : speed > 0.8 ? 1 : 0;
  if (target > perf.lvl) { perf.lvl = target; perf.lowerSince = 0; perf.loweredAt = now; }
  else if (target < perf.lvl) {
    if (!perf.lowerSince) perf.lowerSince = now;
    else if (now - perf.lowerSince > 150 && now - perf.loweredAt > 300) { perf.lvl = target; perf.lowerSince = 0; }
  } else perf.lowerSince = 0;
  // 2) pułap z wydajności: mierzony tylko wtedy, gdy rysujemy klatka po klatce
  if (rendered && speed > 0.05) {
    perf.emaDt = perf.emaDt * 0.9 + dt * 1000 * 0.1;
    if (perf.emaDt > 24) {
      if (!perf.slowSince) perf.slowSince = now;
      else if (now - perf.slowSince > 1000) {
        perf.cap = Math.max(0.6, perf.cap * 0.85); perf.slowSince = 0;
        if (perf.cap <= 0.61 && perf.quality === 'high') setQuality('fast');   // dalej za wolno → tańszy materiał
      }
    } else perf.slowSince = 0;
    if (perf.emaDt < 15) {
      if (!perf.fastSince) perf.fastSince = now;
      else if (now - perf.fastSince > 3000) { perf.cap = Math.min(1, perf.cap / 0.85); perf.fastSince = 0; }
    } else perf.fastSince = 0;
  }
  applyRatio(Math.max(0.5, perf.base * LEVELS[perf.lvl] * perf.cap));
}
function setQuality(q) {
  if (perf.quality === q) return;
  perf.quality = q;
  scene.environment = q === 'high' ? ensureEnv() : null;
  for (const m of Object.values(parts)) { const old = m.material; m.material = newMat(m.name.startsWith('D_') ? 'disc' : 'bone'); old.dispose(); }
  const [a, b, c] = [ribMat, ribMatHi, facetMat];
  ribMat = newMat('rib'); ribMatHi = newMat('rib'); facetMat = newMat('facet');
  for (const m of ribMeshes) if (m.userData.kind !== 'rib') m.material = facetMat;
  for (const m of [...muscleMeshes, ...ctxMeshes]) { const old = m.material; m.material = newMat(m.userData.kind === 'muscle' ? 'muscle' : 'bone'); old.dispose(); }
  a.dispose(); b.dispose(); c.dispose();
  paint();
  updateDebug(true);
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t0 = performance.now();
  if (tween) { stepTween(dt); needsRender = true; }
  if (stepZoom(dt)) needsRender = true;
  if (controls.update()) needsRender = true;     // zwraca true, dopóki kamera się rusza (też bezwładność)
  processHover();
  const speed = motionSpeed(dt);
  perf.speed = speed;
  if (speed > 0.05) { perf.lastMove = t0; perf.settled = false; }
  else if (!perf.settled && t0 - perf.lastMove > 150) {
    perf.settled = true;     // kamera stanęła: jedna ostra klatka z aktualnym zasłanianiem etykiet
    occl.clear();
    needsRender = true;
    scheduleLod();           // i sprawdzenie, które kręgi są na tyle duże, żeby pobrać pełne siatki
  }
  const rendered = needsRender;
  updateResolution(t0, speed, dt, rendered);
  if (needsRender) {
    needsRender = false;
    const r0 = performance.now();
    renderFrame();
    const r1 = performance.now();
    layoutLabels();
    perf.renderMs = perf.renderMs * 0.8 + (r1 - r0) * 0.2;
    perf.renders++;
    perf.jsMs = perf.jsMs * 0.8 + (performance.now() - t0 - (r1 - r0)) * 0.2;
  }
  perf.frames++;
  if (DEBUG) updateDebug();
});

/* ---------- Licznik #debug ---------- */
let dbgEl = null, dbgAt = 0, dbgR = 0, dbgF = 0;
function updateDebug(force = false) {
  if (!DEBUG) return;
  const now = performance.now();
  if (!force && now - dbgAt < 500) return;
  if (!dbgEl) {
    dbgEl = document.createElement('div');
    dbgEl.id = 'dbg';
    dbgEl.className = 'dbg';
    stageEl.appendChild(dbgEl);
    dbgEl.addEventListener('click', (e) => { if (e.target.dataset.q) setQuality(e.target.dataset.q); });
  }
  const sec = Math.max((now - dbgAt) / 1000, 0.001);
  const fps = (perf.renders - dbgR) / sec, loop = (perf.frames - dbgF) / sec;
  dbgAt = now; dbgR = perf.renders; dbgF = perf.frames;
  const fullTris = Object.values(parts).concat(ribMeshes, muscleMeshes, ctxMeshes).filter((m) => m.visible).reduce((a, m) => a + (m.geometry.index?.count || 0) / 3, 0);
  dbgEl.innerHTML = `<b>${fps.toFixed(0)}</b> kl./s rysowane · pętla ${loop.toFixed(0)}/s<br>
    render ${perf.renderMs.toFixed(1)} ms · JS ${perf.jsMs.toFixed(1)} ms<br>
    trójkąty ${((perf.tris || 0) / 1000).toFixed(0)} tys. (widoczne ${(fullTris / 1000).toFixed(0)} tys.) · wywołania ${perf.calls || 0}<br>
    rozdz. ${(perf.current * LEVELS[perf.lvl]).toFixed(2)}× (poziom ${Math.round(LEVELS[perf.lvl] * 100)}%, pułap ${Math.round(perf.cap * 100)}%) · prędkość ${perf.speed.toFixed(2)}<br>
    celowanie: ${((perf.proxyTris || 0) / 1000).toFixed(0)} tys. tr. zamiast pełnych<br>
    jakość: <button type="button" data-q="high" aria-pressed="${perf.quality === 'high'}">wysoka</button> <button type="button" data-q="fast" aria-pressed="${perf.quality === 'fast'}">szybka</button>`;
}
if (DEBUG) {
  window.__atlasPerf = perf; window.__atlasCam = camera;
  window.__atlasPick = (x, y) => { const r = renderer.domElement.getBoundingClientRect(); ptr.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera); return firstProxyHit(ray, false)?.object.userData.target.name; };
  // porównanie: N promieni przez pełne siatki vs uproszczone bryły
  window.__atlasBench = (N = 200) => {
    const rc = new THREE.Raycaster();
    const full = [...Object.values(parts), ...ribMeshes.filter((m) => m.userData.kind === 'rib')].filter((m) => m.visible);
    const prox = full.map((m) => m.userData.proxy).filter(Boolean);
    const dirs = Array.from({ length: N }, () => new THREE.Vector2(Math.random() * 1.2 - 0.6, Math.random() * 1.6 - 0.8));
    const run = (list) => { const t = performance.now(); for (const d of dirs) { rc.setFromCamera(d, camera); rc.intersectObjects(list, false); } return (performance.now() - t) / N; };
    return { fullMsPerRay: +run(full).toFixed(3), proxyMsPerRay: +run(prox).toFixed(3), meshes: full.length };
  };
}
