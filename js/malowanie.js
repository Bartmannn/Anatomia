// Kolory z motywu i malowanie siatek (kręgi, krążki, żebra, mięśnie, przyczepy) oraz jakość materiałów.
import * as THREE from 'three';
import * as MUS from './miesnie.js';
import { RIB_LINKS } from '../landmarks-ribs.js';
import { updateDebug } from './petla.js';
import { REGION_KEYS, closeUp, ctxMeshes, currentKey, muscleMeshes, muscleMode, parts, regionOf, ribByName, ribMeshes, single, state } from './stan.js';
import { ensureEnv, invalidate, newMat, perf, renderer, scene } from './widok.js';

/* ---------- Theme colors ---------- */
export const COLORS = {};
export function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const dark = cs.colorScheme.includes('dark');
  Object.assign(COLORS, {
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
  });
  for (const r of REGION_KEYS) document.documentElement.style.setProperty(`--rc-${r}`, cs.getPropertyValue(`--${r.toLowerCase()}`));
}

/* ---------- Materials ---------- */
export const tmp = new THREE.Color();
export const BLACK = new THREE.Color(0);
export function moduleVisible(k) {
  if (single()) return k === currentKey();
  if (state.module === 'zebra') return regionOf(k) === 'Th';
  return true;
}
export function setFade(m, faded, op = 0.09) {
  if (m.material.transparent !== faded) m.material.needsUpdate = true;
  m.material.transparent = faded;
  m.material.opacity = faded ? op : 1;
  m.material.depthWrite = !faded;
}
// Moduł mięśni: kości jako tło, przyczepy wybranego mięśnia (albo jego części) na kolor dołków
export function paintMuscles() {
  const quiz = state.mode === 'quiz' ? state.quiz : null;
  const sel = currentKey();
  // w quizie przyczepy widać przy pytaniu „Czyje przyczepy?” i po odpowiedzi
  const showAtt = quiz ? (quiz.type === 'przyczepy' || quiz.answered) : state.attach;
  const att = showAtt ? MUS.attachSet(sel, quiz ? null : state.focusPart) : null;
  const hideMuscles = quiz?.type === 'przyczepy' && !quiz.answered;
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
    m.visible = !hideMuscles && (!!state.layers[e.layer] || (quiz && e.layer === selLayer));
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
export function paint() {
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
    if (isSel) {
      if (state.mode !== 'quiz') tmp.copy(COLORS[reg]);
      else if (state.quiz?.type === 'czesc') tmp.copy(base).lerp(COLORS.focus, 0.18);   // jasny kręg, żeby punkt był dobrze widoczny
      else tmp.copy(COLORS.focus);
    }
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

renderer.localClippingEnabled = true;
export const clipPlanes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)];
export let ribMat = newMat('rib');
export let ribMatHi = newMat('rib');
export let facetMat = newMat('facet');
export const relatedRibs = (k) => [...new Set(Object.values(RIB_LINKS[k] || {}))];
export const ribsLoadedFor = (k) => { const r = relatedRibs(k); return r.length > 0 && r.every((n) => ribByName[`rib_L${n}`] && ribByName[`rib_R${n}`]); };
// żebra przy kręgu k są włączone i już wczytane (etykiety głowy i guzka żebra, edytor)
export const ribsOn = (k) => state.ribs && state.mode !== 'quiz' && k.startsWith('Th') && ribsLoadedFor(k);
export function paintRibs() {
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

/* ---------- Theme reactivity ---------- */
export const reTheme = () => { readColors(); paint(); };
export function initTheme() {
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', reTheme);
new MutationObserver(reTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

export function setQuality(q) {
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
