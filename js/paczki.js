// Pobieranie paczek modeli na żądanie, dekodowanie formatu .pak i poziomy szczegółów (LOD).
import * as THREE from 'three';
import { PACKS } from '../models/pakiety/spis.js';
import * as MUS from './miesnie.js';
import { buildProxy, proxyOf } from './celowanie.js';
import { occl } from './etykiety.js';
import { facetMat, paint, relatedRibs, ribMat, ribsOn } from './malowanie.js';
import { updateLoader } from './moduly.js';
import { refreshPanel } from './panel.js';
import { quizType } from './quiz.js';
import { $, MODULES, byName, ctxMeshes, currentKey, hasKey, modKeys, muscleMeshes, muscleMode, parts, ribByName, ribMeshes, single, state, ui } from './stan.js';
import { invalidate, newMat, projectedBox, renderer, root, view } from './widok.js';

/* ---------- Paczki modeli: pobieranie na żądanie ---------- */
// Format paczek opisuje tools/build_packs.py. Przegląd (przeglad-*, zebra-przeglad) to siatki uproszczone,
// a kregi/<kręg> i zebra/<n> — pełne, pobierane dopiero, gdy kręg jest wybrany albo duży na ekranie.
export const lowGeo = {}, highGeo = {};
export const packs = new Map();            // id -> { p, ctrl, done, keep, low }
export const net = { bytes: 0 };
export const wantHigh = new Set();
export const isOverview = (id) => id.startsWith('przeglad') || id === 'zebra-przeglad';
export const packForKey = (k) => `kregi/${k.startsWith('D_') ? k.slice(2) : k}`;
export const saveData = () => { const c = navigator.connection; return !!(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))); };
export const kB = (b) => `${b >= 1e6 ? (b / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1000)) + ' kB'}`;

// adres paczki z rozmiarem w zapytaniu: przebudowany model ma nowy adres, więc pamięć offline (sw.js) go nie pomyli
export const packUrl = (id) => `models/pakiety/${id}.pak?v=${PACKS[id]?.bajty || 0}`;
export async function gunzip(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('Ta przeglądarka jest zbyt stara, by rozpakować model. Zaktualizuj ją.');
  const out = new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')));
  return new Uint8Array(await out.arrayBuffer());
}
export async function fetchPack(id, signal, onProgress, low) {
  // podgląd w artefakcie: pliki binarne zakodowane base64
  const b64 = !!window.ATLAS_PACK_B64;
  const url = b64 ? `models/pakiety/${id}.pak.b64.txt` : packUrl(id);
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
export function decodePack(bytes) {
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
export function ensurePack(id, opts = {}) {
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
export function addGeometry({ name, extras, geometry }, low) {
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
export function useGeometry(mesh) {
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

export function afterPack() {
  occl.clear();
  paint();
  if (view.pendingFrame && hasKey(view.pendingFrame.key)) { const { fn } = view.pendingFrame; view.pendingFrame = null; fn(); }
  if (state.mode !== 'quiz' && ui.panelRibs !== ribsOn(state.selected)) refreshPanel();
  updateLoader();
  scheduleLod(60);   // np. pobranie sąsiadów, gdy wybrany kręg już jest
}

// Co pobrać teraz: przegląd modułu, wybrany kręg (i żebra przy nim), kręgi duże na ekranie,
// a w tle sąsiednie kręgi (chyba że włączone jest oszczędzanie danych).
export const LOD_DENSITY = 550;   // px na jednostkę modelu (10 cm): kręg Th7 ma ok. 0,27 j. wysokości → ok. 150 px
export let lodTimer = 0;
export function scheduleLod(ms = 120) { clearTimeout(lodTimer); lodTimer = setTimeout(updateLod, ms); }
export function updateLod() {
  if (!state.module) return;
  const need = new Set(MODULES[state.module].base);
  if (state.ribs && !single()) need.add('zebra-przeglad');
  if (muscleMode()) {
    // warstwa pobiera się dopiero, gdy jest włączona albo wybrano mięsień z tej warstwy
    const selLayer = MUS.MUSCLES[currentKey()]?.layer;
    for (const n of MUS.READY_LAYERS) if (state.layers[n] || n === selLayer) need.add(MUS.layerPack(n));
  }
  const sel = currentKey();
  const allowed = new Set(muscleMode() ? [] : modKeys());   // w module mięśni kręgi są tylko tłem (przegląd)
  // w quizie na całym kręgosłupie wystarczy podświetlony przegląd; w „Pojedynczych kręgach” trzeba pobrać kręg
  if (allowed.has(sel.replace('D_', '')) && (state.mode !== 'quiz' || single() || quizType() === 'czesc')) need.add(packForKey(sel));
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
export let netErr = '', netErrAt = 0;
export function netStatus(err) {
  if (err) { netErr = err; netErrAt = performance.now(); }
  const el = $('#net');
  if (!el) return;
  const busy = [...packs.values()].filter((st) => !st.done && !st.low).length;
  const showErr = netErr && performance.now() - netErrAt < 6000;
  const offline = !navigator.onLine;
  el.hidden = !busy && !showErr && !offline;
  el.textContent = showErr && !busy ? netErr : busy ? 'Pobieranie szczegółów…' : 'Bez internetu — działa z zapisanych plików';
  el.classList.toggle('err', !!(showErr && !busy));
  el.classList.toggle('off', offline && !busy && !showErr);
  if (showErr) setTimeout(() => netStatus(), 6100);
}
