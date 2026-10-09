// Punkty etykiet: automatyczne, poprawione, dodane ręcznie (landmarks-fix.js + przeglądarka) i nazwy części.
import * as FIX from '../landmarks-fix.js';
import { LANDMARKS } from '../landmarks.js';
import { PART_LABELS, PART_LABELS_SPECIAL } from '../content.js';
import { SKULL_LANDMARKS } from '../landmarks-czaszka.js';
import { RIB_LANDMARKS, RIB_LINKS } from '../landmarks-ribs.js';
import { SKULL_LABELS, isSkull } from './czaszka.js';
import { ribsOn } from './malowanie.js';
import { regionOf } from './stan.js';

/* ---------- Landmarks: automatic points + fixes from file + local edits ---------- */
// landmarks-fix.js: FIXES (poprawione punkty), REVIEWED (sprawdzone kręgi), EXTRA (punkty dodane ręcznie)
export const { FIXES, REVIEWED } = FIX;
export const EXTRA = FIX.EXTRA || {};
export const LS_KEY = 'atlas-landmark-edits-v1';
export let local = { fixes: {}, reviewed: {}, extra: {} };
try { local = { fixes: {}, reviewed: {}, extra: {}, ...(JSON.parse(localStorage.getItem(LS_KEY)) || {}) }; } catch (e) { /* no storage */ }
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// drop local edits that are already saved in landmarks-fix.js
for (const [k, fx] of Object.entries(local.fixes)) {
  for (const p of Object.keys(fx)) if (FIXES[k] && p in FIXES[k] && same(FIXES[k][p], fx[p])) delete fx[p];
  if (!Object.keys(fx).length) delete local.fixes[k];
}
for (const k of Object.keys(local.reviewed)) if ((REVIEWED[k] || false) === local.reviewed[k]) delete local.reviewed[k];
for (const [k, ex] of Object.entries(local.extra)) {
  for (const id of Object.keys(ex)) if (EXTRA[k] && id in EXTRA[k] && same(EXTRA[k][id], ex[id])) delete ex[id];
  if (!Object.keys(ex).length) delete local.extra[k];
}
// Punkty dodane ręcznie (id zaczyna się od x_): z pliku + lokalne zmiany (null = usunięty)
export function extrasOf(k) {
  const out = { ...(EXTRA[k] || {}), ...(local.extra[k] || {}) };
  for (const id of Object.keys(out)) if (!out[id]) delete out[id];
  return out;
}
export const extraDef = (k, id) => (id.startsWith('x_') ? extrasOf(k)[id] || null : null);
export const isPaired = (k, part) => (isSkull(k) ? !!SKULL_LABELS[k]?.[part]?.pair : PAIRED.has(part)) || !!extraDef(k, part)?.pair;
export function resetLocal() { local = { fixes: {}, reviewed: {}, extra: {} }; }
export function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(local)); } catch (e) { /* no storage */ } }
export const autoLm = (k) => (isSkull(k) ? { ...(SKULL_LANDMARKS[k] || {}) } : { ...(LANDMARKS[k] || {}), ...(RIB_LANDMARKS[k] || {}) });
export function lm(k) {
  const out = autoLm(k);
  for (const src of [FIXES[k], local.fixes[k]]) {
    if (!src) continue;
    for (const [p, v] of Object.entries(src)) { if (v === null) delete out[p]; else out[p] = v; }
  }
  for (const [id, d] of Object.entries(extrasOf(k))) out[id] = d.pts || [];
  for (const p of Object.keys(out)) { out[p] = (out[p] || []).map((x) => x || null); if (!out[p].some(Boolean)) delete out[p]; }
  return out;
}
export const slotChanged = (k, part, i) => {
  const a = autoLm(k)[part]?.[i], b = lm(k)[part]?.[i];
  return !a || !b || a.some((v, j) => Math.abs(v - b[j]) > 1e-4);
};
export const reviewedOf = (k) => (k in local.reviewed ? local.reviewed[k] : REVIEWED[k]) || null;
export const fixedIn = (k, p) => (local.fixes[k] && p in local.fixes[k]) ? 'local' : (FIXES[k] && p in FIXES[k]) ? 'file' : null;

export function partDef(k, part) {
  if (part.startsWith('x_')) {
    const d = extraDef(k, part);
    return d ? { name: d.name, latin: d.latin || '', def: d.def || '', palp: !!d.palp, extra: true } : null;
  }
  if (isSkull(k)) { const d = SKULL_LABELS[k]?.[part]; return d ? { ...d } : null; }
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

export const PART_ORDER = ['dens', 'body', 'arcus_ant', 'fovea_dentis', 'massa_lat', 'arcus_post', 'pedicle', 'lamina', 'foramen',
  'spinous', 'transverse', 'art_sup', 'art_inf', 'fov_sup', 'fov_inf', 'fov_tp', 'rib_head', 'rib_neck', 'rib_tub', 'rib_head_next', 'promontorium', 'canal', 'ala', 'auricular', 'crista_mediana', 'apex', 'anulus', 'nucleus'];
// kolejność części w opisie; dodane punkty na końcu
export const partRank = (p, k = null) => {
  const order = k && isSkull(k) ? Object.keys(SKULL_LABELS[k] || {}) : PART_ORDER;
  const i = order.indexOf(p); return i < 0 ? 999 : i;
};
export const RIB_VIEW_PARTS = new Set(['body', 'transverse', 'fov_sup', 'fov_inf', 'fov_tp', 'rib_head', 'rib_neck', 'rib_tub', 'rib_head_next']);
export function partList(k, forLabels = false) {
  const L = lm(k);
  const withRibs = ribsOn(k);
  return Object.keys(L)
    .filter((p) => !forLabels || (withRibs ? RIB_VIEW_PARTS.has(p) : !p.startsWith('rib_')))
    .filter((p) => forLabels || !p.startsWith('rib_') || withRibs)
    .sort((a, b) => partRank(a, k) - partRank(b, k))
    .map((p) => ({ part: p, def: partDef(k, p) })).filter((x) => x.def?.name);
}

export const PAIRED = new Set(['pedicle', 'lamina', 'transverse', 'art_sup', 'art_inf', 'massa_lat', 'ala', 'auricular',
  'fov_sup', 'fov_inf', 'fov_tp', 'rib_head', 'rib_neck', 'rib_tub', 'rib_head_next']);
// kolejność punktów w parach: [lewa, prawa] (strona ciała, nie ekranu)
export const SIDE_NAMES = ['lewa', 'prawa'];
export const SIDE_SHORT = ['L', 'P'];
