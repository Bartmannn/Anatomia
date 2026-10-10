// Celowanie i wybór myszką: uproszczone bryły do raycastu, podświetlanie pod kursorem.
import * as THREE from 'three';
import { placePoint } from './edytor.js';
import { paint } from './malowanie.js';
import { select } from './moduly.js';
import { ctxMeshes, muscleMeshes, muscleMode, parts, ribMeshes, selectable, state, ui } from './stan.js';
import { dotNear } from './etykiety.js';
import { camera, invalidate, perf, renderer } from './widok.js';

/* ---------- Uproszczone bryły do celowania (raycast) ---------- */
// Trafienia i zasłanianie etykiet liczymy na siatkach uproszczonych ok. 10× (łączenie wierzchołków co 2,5 mm),
// a nie na pełnych modelach. Dokładna siatka jest używana tylko przy stawianiu punktów w edytorze.
export const proxyMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
export function buildProxy(mesh, cell = 0.04) {
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
export function proxyOf(geo, mesh) {
  const p = new THREE.Mesh(geo, proxyMat);
  p.userData.target = mesh;
  p.matrixAutoUpdate = false;
  p.updateMatrixWorld(true);
  perf.proxyTris = (perf.proxyTris || 0) + geo.index.count / 3;
  return p;
}
export function activeProxies(bonesOnly) {
  const list = [];
  for (const m of Object.values(parts)) if (m.visible && m.material.opacity > 0.5 && m.userData.proxy) list.push(m.userData.proxy);
  if (!bonesOnly) for (const m of ribMeshes) if (m.visible && m.userData.proxy) list.push(m.userData.proxy);
  for (const m of muscleMeshes) if (m.visible && m.material.opacity > 0.5 && m.userData.proxy) list.push(m.userData.proxy);
  for (const m of ctxMeshes) if (m.visible && m.material.opacity > 0.5 && m.userData.proxy) list.push(m.userData.proxy);
  return list;
}
// Pierwsze trafienie, z pominięciem części odciętych płaszczyzną (żebra w „Tylko wybrany”, druga kość z pary w „Sama kość”).
export function firstProxyHit(rc, bonesOnly = false) {
  const hits = rc.intersectObjects(activeProxies(bonesOnly), false);
  for (const h of hits) {
    const planes = h.object.userData.target.material.clippingPlanes;
    if (planes?.length && !planes.every((pl) => pl.distanceToPoint(h.point) >= 0)) continue;
    return h;
  }
  return null;
}

/* ---------- Picking ---------- */
export const ray = new THREE.Raycaster();
export const ptr = new THREE.Vector2();
export let downAt = null;
// Podświetlanie pod kursorem: najwyżej raz na klatkę i nie podczas obracania.
export let hoverEv = null;
export function pick(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  if (muscleMode()) {                     // w module mięśni wybiera się tylko mięśnie (kości są tłem)
    const t = firstProxyHit(ray, false)?.object.userData.target;
    return t?.userData.kind === 'muscle' ? t.userData.muscle : null;
  }
  // kręgi będące tylko tłem modułu (np. przy łopatce) zasłaniają, ale nie dają się wybrać
  const hit = firstProxyHit(ray, true);
  const t = hit?.object.userData.target;
  return t && parts[t.name] && selectable(t.name) ? t.name : null;
}
export function initPicking() {
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  if (state.mode === 'edit' && state.edit.part) { placePoint(e); return; }
  // dotknięcie (kliknięcie) kropki bez podpisu: pokazuje jej nazwę, drugie dotknięcie chowa
  const dot = state.mode === 'atlas' ? dotAt(e) : null;
  if (dot) { ui.peek = ui.peek === dot ? null : dot; invalidate(); return; }
  const k = pick(e);
  if (k && state.mode !== 'quiz') select(k, false);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons) return;
  hoverEv = e;
});
renderer.domElement.addEventListener('pointerleave', () => {
  hoverEv = null;
  if (ui.peek) { ui.peek = null; invalidate(); }
  if (state.hovered) { state.hovered = null; paint(); }
});
}
const dotAt = (e) => { const r = renderer.domElement.getBoundingClientRect(); return dotNear(e.clientX - r.left, e.clientY - r.top); };
export function processHover() {
  if (!hoverEv) return;
  const e = hoverEv; hoverEv = null;
  // kursor na kropce bez podpisu: jej nazwa widoczna, dopóki kursor jest blisko
  const dot = state.mode === 'atlas' ? dotAt(e) : null;
  if (dot !== ui.peek && (dot || ui.peek)) { ui.peek = dot; invalidate(); }
  const k = state.mode !== 'quiz' ? pick(e) : null;
  renderer.domElement.style.cursor = state.mode === 'edit' && state.edit.part ? 'crosshair' : (k ? 'pointer' : '');
  if (k !== state.hovered) {
    state.hovered = k;
    paint();
  }
}
