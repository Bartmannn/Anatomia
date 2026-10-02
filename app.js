import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
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
};

/* ---------- Ruler ---------- */
function buildRuler() {
  const groups = { C: [], Th: [], L: [], S: [] };
  ORDER.forEach((k) => groups[regionOf(k)].push(k));
  rulerEl.innerHTML = '';
  for (const r of REGION_KEYS) {
    const g = document.createElement('div');
    g.className = 'group';
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
  const extra = kind === 'rib' ? { side: THREE.DoubleSide }
    : kind === 'facet' ? { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 } : {};
  if (perf.quality === 'fast') return new THREE.MeshMatcapMaterial({ matcap: matcap(), ...extra });
  return new THREE.MeshStandardMaterial({ roughness: kind === 'disc' ? 0.55 : kind === 'facet' ? 0.45 : 0.82, metalness: 0, ...extra });
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

const parts = {};   // key -> mesh
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
function boxOf(keys) {
  const box = new THREE.Box3();
  keys.forEach((k) => parts[k] && box.expandByObject(parts[k]));
  return box;
}
const isoPad = () => (renderer.domElement.clientWidth < 520 ? 2.4 : 1.9);
const closeFrame = (k, dir = null) => frame([k], dir, isoPad() * (state.ribs && k.startsWith('Th') ? 2.1 : 1));
function frame(keys, dir, pad = 1.1) {
  const box = boxOf(keys);
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
  const i = ORDER.indexOf(k);
  return ORDER.slice(Math.max(0, i - n), i + n + 1);
};

/* ---------- Materials ---------- */
const tmp = new THREE.Color();
const BLACK = new THREE.Color(0);
function paint() {
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
    m.visible = !isDisc || state.showDiscs;
    const faded = !isSel && ((state.isolate && state.mode === 'atlas') || state.mode === 'edit');
    if (m.material.transparent !== faded) m.material.needsUpdate = true;
    m.material.transparent = faded;
    m.material.opacity = faded ? 0.09 : 1;
    m.material.depthWrite = !faded;
  }
  paintRibs();
  invalidate();
}

/* ---------- Ribs (models/zebra.glb, loaded in the background) ---------- */
const ribMeshes = [];
let ribsReady = false, ribsLoading = false;
renderer.localClippingEnabled = true;
const clipPlanes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)];
let ribMat = newMat('rib');
let ribMatHi = newMat('rib');
let facetMat = newMat('facet');
function paintRibs() {
  if (!ribsReady) return;
  const k = state.selected;
  const isTh = k.startsWith('Th') && state.mode !== 'quiz';
  const related = new Set(Object.values(RIB_LINKS[k] || {}));
  const closeUp = (state.isolate && state.mode === 'atlas') || state.mode === 'edit';
  const box = parts[k] ? new THREE.Box3().setFromObject(parts[k]) : null;
  const xc = box ? (box.min.x + box.max.x) / 2 : 0;
  clipPlanes[0].constant = xc + 0.9;
  clipPlanes[1].constant = -(xc - 0.9);
  for (const mat of [ribMat, ribMatHi]) {
    const want = closeUp ? clipPlanes : null;
    if ((mat.clippingPlanes?.length || 0) !== (want?.length || 0)) { mat.clippingPlanes = want; mat.needsUpdate = true; }
  }
  ribMat.color.copy(COLORS.bone);
  ribMatHi.color.copy(COLORS.bone).lerp(COLORS.Th, 0.35);
  facetMat.color.copy(COLORS.facet);
  for (const m of ribMeshes) {
    const e = m.userData;
    if (e.kind === 'rib') {
      const rel = isTh && related.has(e.rib);
      m.visible = state.ribs && state.mode !== 'quiz' && (!closeUp || rel);
      m.material = rel ? ribMatHi : ribMat;
    } else if (e.kind === 'facet') {
      m.visible = isTh && e.vertebra === k;
    } else {
      m.visible = state.ribs && isTh && e.vertebra === k;
    }
  }
}
function onRibs(gltf) {
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    o.material = o.userData.kind === 'rib' ? ribMat : facetMat;
    o.renderOrder = o.userData.kind === 'rib' ? 0 : 1;
    ribMeshes.push(o);
    if (o.userData.kind === 'rib') o.userData.proxy = buildProxy(o);
  });
  root.add(gltf.scene);
  ribsReady = true;
  occl.clear();
  paint();
  if (state.mode === 'atlas') renderPart(state.selected); else if (state.mode === 'edit') renderEditor();
}
function loadRibs() {
  if (ribsReady || ribsLoading) return;
  ribsLoading = true;
  const fail = () => { ribsLoading = false; };
  if (window.ATLAS_RIBS_B64) {
    fetch(window.ATLAS_RIBS_B64).then((r) => r.text()).then((t) => {
      const bin = Uint8Array.from(atob(t.trim()), (c) => c.charCodeAt(0));
      new GLTFLoader().parse(bin.buffer, '', onRibs, fail);
    }).catch(fail);
  } else {
    new GLTFLoader().load('models/zebra.glb', onRibs, undefined, fail);
  }
}
function toggleRibs() {
  state.ribs = !state.ribs;
  $('#ribs').setAttribute('aria-pressed', String(state.ribs));
  loadRibs();
  occl.clear();
  paint();
  if (state.mode === 'atlas') renderPart(state.selected); else if (state.mode === 'edit') renderEditor();
  if (((state.isolate && state.mode === 'atlas') || state.mode === 'edit') && state.selected.startsWith('Th')) closeFrame(state.selected);
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
  const ribsOn = state.ribs && ribsReady && k.startsWith('Th');
  return Object.keys(L)
    .filter((p) => !forLabels || (ribsOn ? RIB_VIEW_PARTS.has(p) : !p.startsWith('rib_')))
    .filter((p) => forLabels || !p.startsWith('rib_') || ribsOn)
    .sort((a, b) => PART_ORDER.indexOf(a) - PART_ORDER.indexOf(b))
    .map((p) => ({ part: p, def: partDef(k, p) })).filter((x) => x.def?.name);
}

const _v = new THREE.Vector3();
function project(p) {
  _v.set(p[0], p[1], p[2]).project(camera);
  const r = renderer.domElement.getBoundingClientRect();
  return { x: (_v.x + 1) / 2 * r.width, y: (1 - _v.y) / 2 * r.height, behind: _v.z > 1 };
}
function projectedRect(keys) {
  const box = boxOf(keys);
  if (box.isEmpty()) return null;
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
  if (occl.has(id) && now - occlAt < 120) return occl.get(id);
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

function labelItems() {
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
  const big = rect && (state.isolate || (rect.y1 - rect.y0) > (renderer.domElement.clientWidth < 520 ? 70 : 95));
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
  if (state.isolate) return { items: [], ref: null };
  const items = PALPATION.filter((l) => parts[l.key]?.visible !== false && lm(l.key)[l.part]).map((l) => ({
    id: `palp:${l.key}`, p: lm(l.key)[l.part].find(Boolean), title: l.label, sub: l.note, palp: true, key: l.key,
  }));
  return { items, ref: projectedRect(ORDER), kind: 'palp' };
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
    <div>Modele 3D: <a href="https://doi.org/10.18908/lsdba.nbdc00837-000" target="_blank" rel="noopener">BodyParts3D</a>, © The Database Center for Life Science, licencja <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en" target="_blank" rel="noopener">CC BY-SA 2.1 JP</a>. Przetworzone (konwersja formatu, układ współrzędnych, kompresja).</div>
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

function renderPart(k) {
  invalidate();
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
  state.selected = k;
  if (state.mode === 'edit') { state.edit = { part: null, slot: 0 }; renderEditor(); } else renderPart(k);
  syncRuler();
  paint();
  if (doFrame) {
    const keys = k.startsWith('D_') ? [k.slice(2)] : [k];
    if (state.isolate || state.mode === 'edit') closeFrame(k);
    else frame(neighbors(keys[0], 3));
  }
  try { history.replaceState(null, '', `#${k}`); } catch (e) { /* ignore */ }
}

/* ---------- Quiz ---------- */
function newQuestion() {
  const q = state.quiz;
  const target = ORDER[Math.floor(Math.random() * ORDER.length)];
  const i = ORDER.indexOf(target);
  const pool = ORDER.filter((k) => k !== target && Math.abs(ORDER.indexOf(k) - i) <= 4);
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
      <p class="quiz-q">Który to kręg? Jest podświetlony na modelu.</p>
    </div>
    <div class="answers">${opts.map((k) => `<button type="button" data-k="${k}"><span>${esc(PARTS[k].name)}</span><span class="code">${PARTS[k].short}</span></button>`).join('')}</div>
    <p class="feedback" id="feedback" aria-live="polite">Obracaj model, aby lepiej się przyjrzeć. Liczy się pierwsza odpowiedź.</p>
    <button type="button" class="btn" id="next" hidden>Następne pytanie</button>
    ${metaBlock()}`;
  panelEl.querySelectorAll('.answers button').forEach((b) => b.addEventListener('click', () => answer(b.dataset.k)));
  $('#next').addEventListener('click', newQuestion);
  paint();
  frame(neighbors(target, 3), VIEWS.three);
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
function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.modes button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  rulerEl.style.opacity = mode === 'quiz' ? '.35' : '';
  rulerEl.style.pointerEvents = mode === 'quiz' ? 'none' : '';
  rulerEl.toggleAttribute('inert', mode === 'quiz');
  $('#isolate').disabled = mode !== 'atlas';
  document.body.classList.toggle('editing', mode === 'edit');
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
    if (state.ribs && ribsReady) extra.push('rib_head', ...(n <= 10 ? ['rib_neck', 'rib_tub'] : []), ...(n <= 9 ? ['rib_head_next'] : []));
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
function activeProxies(bonesOnly) {
  const list = [];
  for (const m of Object.values(parts)) if (m.visible && m.material.opacity > 0.5 && m.userData.proxy) list.push(m.userData.proxy);
  if (!bonesOnly) for (const m of ribMeshes) if (m.visible && m.userData.proxy) list.push(m.userData.proxy);
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
  const hit = firstProxyHit(ray, true);
  return hit?.object.userData.target.name || null;
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
  if (v === 'all') frame(ORDER, VIEWS.side);
  else if ((state.isolate && state.mode === 'atlas') || state.mode === 'edit') closeFrame(state.selected, VIEWS[v]);
  else frame(ORDER, VIEWS[v]);
}));
function toggle(id, prop) {
  const b = $(id);
  b.addEventListener('click', () => {
    state[prop] = !state[prop];
    b.setAttribute('aria-pressed', String(state[prop]));
    if (prop === 'isolate') select(state.selected, true);
    paint();
  });
}
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
  const k = state.selected.replace('D_', '');
  const i = ORDER.indexOf(k);
  if (e.key === 'ArrowDown' && i < ORDER.length - 1) { e.preventDefault(); select(ORDER[i + 1], true); }
  if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); select(ORDER[i - 1], true); }
});

window.addEventListener('hashchange', () => {
  const k = decodeURIComponent(location.hash.slice(1));
  if (parts[k] && k !== state.selected && state.mode !== 'quiz') select(k, true);
});

/* ---------- Theme reactivity ---------- */
const reTheme = () => { readColors(); paint(); };
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', reTheme);
new MutationObserver(reTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

/* ---------- Load ---------- */
readColors();
buildRuler();
renderPart(state.selected);
syncRuler();
resize();
camera.position.set(9, 0.8, -5);

const bar = $('#loadbar');
function onModel(gltf) {
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    o.material = newMat(o.name.startsWith('D_') ? 'disc' : 'bone');
    parts[o.name] = o;
    o.userData.proxy = buildProxy(o);
  });
  root.add(gltf.scene);
  $('#loader').hidden = true;
  const hash = decodeURIComponent(location.hash.slice(1));
  if (parts[hash]) state.selected = hash;
  renderPart(state.selected);
  syncRuler();
  paint();
  frame(ORDER, VIEWS.three);
  tween.t = 1;
  stepTween(0);
  setTimeout(loadRibs, 400);   // żebra i dołki żebrowe doczytują się w tle
}
function onError(err) {
  $('#loader').innerHTML = `<div>Nie udało się wczytać modelu. Odśwież stronę.<br><small>${esc(err?.message || err)}</small></div>`;
}
const loader = new GLTFLoader();
// Domyślnie plik GLB. Wersja podglądu może podać model zakodowany base64 (window.ATLAS_MODEL_B64).
if (window.ATLAS_MODEL_B64) {
  fetch(window.ATLAS_MODEL_B64).then((r) => r.text()).then((t) => {
    bar.style.width = '70%';
    const bin = Uint8Array.from(atob(t.trim()), (c) => c.charCodeAt(0));
    loader.parse(bin.buffer, '', onModel, onError);
  }).catch(onError);
} else {
  loader.load('models/kregoslup.glb', onModel, (ev) => {
    if (ev.total) bar.style.width = `${Math.round((ev.loaded / ev.total) * 100)}%`;
  }, onError);
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
  return (ang + lin) / Math.max(dt, 1e-3);
}
function updateResolution(now, speed, dt, rendered) {
  // 1) poziom z prędkości: w dół od razu, w górę dopiero po 150 ms spokoju (histereza)
  const target = speed > 3 ? 2 : speed > 0.8 ? 1 : 0;
  if (target > perf.lvl) { perf.lvl = target; perf.lowerSince = 0; }
  else if (target < perf.lvl) {
    if (!perf.lowerSince) perf.lowerSince = now;
    else if (now - perf.lowerSince > 150) { perf.lvl = target; perf.lowerSince = 0; }
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
  a.dispose(); b.dispose(); c.dispose();
  paint();
  updateDebug(true);
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t0 = performance.now();
  if (tween) { stepTween(dt); needsRender = true; }
  if (controls.update()) needsRender = true;     // zwraca true, dopóki kamera się rusza (też bezwładność)
  processHover();
  const speed = motionSpeed(dt);
  perf.speed = speed;
  if (speed > 0.05) { perf.lastMove = t0; perf.settled = false; }
  else if (!perf.settled && t0 - perf.lastMove > 150) {
    perf.settled = true;     // kamera stanęła: jedna ostra klatka z aktualnym zasłanianiem etykiet
    occl.clear();
    needsRender = true;
  }
  const rendered = needsRender;
  updateResolution(t0, speed, dt, rendered);
  if (needsRender) {
    needsRender = false;
    const r0 = performance.now();
    renderer.render(scene, camera);
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
  const info = renderer.info.render;
  const fullTris = Object.values(parts).concat(ribMeshes).filter((m) => m.visible).reduce((a, m) => a + (m.geometry.index?.count || 0) / 3, 0);
  dbgEl.innerHTML = `<b>${fps.toFixed(0)}</b> kl./s rysowane · pętla ${loop.toFixed(0)}/s<br>
    render ${perf.renderMs.toFixed(1)} ms · JS ${perf.jsMs.toFixed(1)} ms<br>
    trójkąty ${(info.triangles / 1000).toFixed(0)} tys. (widoczne ${(fullTris / 1000).toFixed(0)} tys.) · wywołania ${info.calls}<br>
    rozdz. ${perf.current.toFixed(2)}× (poziom ${Math.round(LEVELS[perf.lvl] * 100)}%, pułap ${Math.round(perf.cap * 100)}%) · prędkość ${perf.speed.toFixed(2)}<br>
    celowanie: ${((perf.proxyTris || 0) / 1000).toFixed(0)} tys. tr. zamiast pełnych<br>
    jakość: <button type="button" data-q="high" aria-pressed="${perf.quality === 'high'}">wysoka</button> <button type="button" data-q="fast" aria-pressed="${perf.quality === 'fast'}">szybka</button>`;
}
if (DEBUG) {
  window.__atlasPerf = perf; window.__atlasCam = camera;
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
