// Renderer, scena, kamera, sterowanie, materiały i kadrowanie. Zależy tylko od stan.js.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { COARSE, hasKey, modKeys, objectsOf, ribMeshes, stageEl, state } from './stan.js';

/* ---------- Three.js scene ---------- */
/* ---------- Wydajność: stan ---------- */
// #debug w adresie pokazuje licznik (kl./s, czas klatki, trójkąty, rozdzielczość, jakość).
export const perf = {
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
export const LEVELS = [1, 0.75, 0.5];
export const R = { needsRender: true };           // czy trzeba narysować nową klatkę
export const invalidate = () => { R.needsRender = true; };

export const renderer = new THREE.WebGLRenderer({ antialias: !COARSE, alpha: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.NeutralToneMapping;
stageEl.prepend(renderer.domElement);
export function applyRatio(r) {
  if (Math.abs(r - perf.current) < 0.01) return;
  perf.current = r;
  renderer.setPixelRatio(r);
  invalidate();
}
applyRatio(perf.base);

export const scene = new THREE.Scene();
export let envTex = null;
export function ensureEnv() {           // oświetlenie otoczenia tylko dla trybu „wysoka jakość”
  if (!envTex) envTex = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  return envTex;
}
if (perf.quality === 'high') scene.environment = ensureEnv();
scene.environmentIntensity = 0.55;

// Matcap: gotowe „światło” w jednej teksturze — kilka razy tańsze od materiału PBR.
export let matcapTex = null;
export function matcap() {
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
export function newMat(kind) {
  const extra = kind === 'rib' || kind === 'muscle' ? { side: THREE.DoubleSide }
    : kind === 'facet' ? { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 } : {};
  if (perf.quality === 'fast') return new THREE.MeshMatcapMaterial({ matcap: matcap(), ...extra });
  return new THREE.MeshStandardMaterial({ roughness: kind === 'disc' ? 0.55 : kind === 'facet' ? 0.45 : kind === 'muscle' ? 0.6 : 0.82, metalness: 0, ...extra });
}

export const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
keyLight.position.set(3, 6, 4);
scene.add(keyLight);
export const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
rimLight.position.set(-4, 2, -5);
scene.add(rimLight);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f8c, 0.5));

export const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.6;
controls.maxDistance = 30;

export const root = new THREE.Group();
scene.add(root);

export function resize() {
  const r = renderer.domElement.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / Math.max(r.height, 1);
  camera.updateProjectionMatrix();
  invalidate();
}

/* ---------- Camera framing ---------- */
export const VIEWS = {
  side:  new THREE.Vector3(1, 0.08, 0),
  front: new THREE.Vector3(0, 0.08, 1),
  back:  new THREE.Vector3(0, 0.08, -1),
  three: new THREE.Vector3(0.85, 0.12, -0.55),
  top:   new THREE.Vector3(0.0001, 1, -0.45),
};
// stan kamery: animacja przejścia, płynne przybliżanie kółkiem, kadr czekający na wczytanie części
export const view = { tween: null, zoomTarget: null, pendingFrame: null };
export function boxOf(keys) {
  const box = new THREE.Box3();
  // ukryte części (inny moduł, wyłączone krążki) nie wpływają na kadr; z kości parzystej w „Sama kość” — tylko widoczna strona
  for (const k of keys) for (const o of objectsOf(k)) if (o.visible || keys.length === 1) box.union(o.userData.side != null ? halfBox(o, o.userData.side) : o.geometry.boundingBox);
  return box;
}
// Pudełko jednej strony siatki, w której są obie kości z pary (0 — lewa strona ciała, x > 0; 1 — prawa)
export function halfBox(o, side) {
  const g = o.geometry;
  const cache = (o.userData.halfBoxes ||= {});
  const key = `${g.uuid}:${side}`;
  if (!cache[key]) {
    const b = new THREE.Box3(), v = new THREE.Vector3(), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); if ((v.x > 0) === (side === 0)) b.expandByPoint(v); }
    cache[key] = b;
  }
  return cache[key];
}
export const isoPad = () => (renderer.domElement.clientWidth < 520 ? 2.4 : 1.9);
export const closeFrame = (k, dir = null) => frame([k], dir, isoPad() * (state.ribs && k.startsWith('Th') ? 2.1 : 1));
// kadr po wczytaniu części (moduł „Pojedyncze kręgi” pobiera kręg dopiero po wybraniu)
export function frameWhenReady(key, fn) {
  view.pendingFrame = null;
  if (hasKey(key)) fn(); else view.pendingFrame = { key, fn };
}
export function frame(keys, dir, pad = 1.1) {
  view.zoomTarget = null;
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
  view.tween = { t: reduce ? 1 : 0, fromPos: camera.position.clone(), toPos, fromT: controls.target.clone(), toT: center };
}
export function stepTween(dt) {
  if (!view.tween) return;
  view.tween.t = Math.min(1, view.tween.t + dt / 0.7);
  const e = 1 - Math.pow(1 - view.tween.t, 3);
  camera.position.lerpVectors(view.tween.fromPos, view.tween.toPos, e);
  controls.target.lerpVectors(view.tween.fromT, view.tween.toT, e);
  if (view.tween.t >= 1) view.tween = null;
}
export const neighbors = (k, n) => {
  const keys = modKeys();
  const i = keys.indexOf(k);
  return keys.slice(Math.max(0, i - n), i + n + 1);
};

export const _v = new THREE.Vector3();
export function project(p) {
  _v.set(p[0], p[1], p[2]).project(camera);
  const r = renderer.domElement.getBoundingClientRect();
  return { x: (_v.x + 1) / 2 * r.width, y: (1 - _v.y) / 2 * r.height, behind: _v.z > 1 };
}
export function projectedRect(keys) { return projectedBox(boxOf(keys)); }
export function projectedBox(box) {
  if (!box || box.isEmpty()) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    const q = project([i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z]);
    x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
  }
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2 };
}

// occlusion is recomputed at most ~8x per second
