// Moduł „Mięśnie grzbietu”: dane i widok niezależny od three.js (panel, nawigacja, etykiety, przyczepy).
// Siatki, materiały i kolory obsługuje app.js — tu tylko logika specyficzna dla mięśni.
import { MUSCLES, LAYERS, CTX_BONES } from '../content-miesnie.js';

export { MUSCLES, LAYERS, CTX_BONES };
export const MUSCLE_KEYS = Object.keys(MUSCLES);
export const layerPack = (n) => `miesnie/warstwa-${n}`;
export const READY_LAYERS = Object.entries(LAYERS).filter(([, l]) => !l.soon).map(([n]) => +n);
const short = (name) => name.replace(/^Mię(sień|śnie) /, '');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Przyczepy wybranego mięśnia (albo jednej jego części) — do podświetlenia kości
export function attachSet(key, part = null) {
  const out = { vertebrae: new Set(), bones: new Set(), ribs: new Set() };
  const M = MUSCLES[key];
  if (!M) return out;
  for (const [p, d] of Object.entries(M.parts)) {
    if (part && p !== part) continue;
    d.attach.vertebrae.forEach((v) => out.vertebrae.add(v));
    d.attach.bones.forEach((b) => out.bones.add(b));
    d.attach.ribs.forEach((r) => out.ribs.add(r));
  }
  return out;
}

// Lewa kolumna: warstwy i mięśnie (zamiast linijki kręgów)
export function navHTML(esc) {
  return Object.entries(LAYERS).map(([n, L]) => {
    const list = MUSCLE_KEYS.filter((k) => MUSCLES[k].layer === +n);
    return `<div class="group mgroup" data-layer="${n}" style="--rc: var(--muscle)">
      <span class="glabel">${esc(L.short)}${L.soon ? ' · wkrótce' : ''}</span>
      ${list.map((k) => `<button type="button" id="r-${k}" data-key="${k}" title="${esc(MUSCLES[k].latin)}">${esc(cap(short(MUSCLES[k].name)))}</button>`).join('')}
    </div>`;
  }).join('');
}

const row = (label, text, esc) => (text ? `<div class="mrow"><dt>${label}</dt><dd>${esc(text)}</dd></div>` : '');

// Panel z opisem mięśnia
export function panelHTML(key, esc, metaBlock) {
  const M = MUSCLES[key];
  const L = LAYERS[M.layer];
  const parts = Object.entries(M.parts);
  const many = parts.length > 1;
  const partBlocks = parts.map(([p, d]) => {
    const where = d.attach.bones.map((b) => CTX_BONES[b]?.toLowerCase()).filter(Boolean);
    return `<div class="prow mpart" data-part="${p}" tabindex="0">
      ${many ? `<h4>${esc(d.name)} <i>${esc(d.latin)}</i></h4>` : ''}
      <dl class="mdl">
        ${row('Przyczep początkowy', d.origin, esc)}
        ${row('Przyczep końcowy', d.insertion, esc)}
        ${row('Działanie', d.action, esc)}
      </dl>
      ${where.length ? `<p class="small attach-note"><i class="swatch" aria-hidden="true"></i>Na modelu: ${esc(where.join(', '))}${d.attach.vertebrae.length ? `, kręgi ${esc(rangeText(d.attach.vertebrae))}` : ''}${d.attach.ribs.length ? `, żebra ${esc(d.attach.ribs[0] + '–' + d.attach.ribs.at(-1))}` : ''}.</p>` : ''}
    </div>`;
  }).join('');
  return `
    <div>
      <div class="eyebrow"><span>${esc(L.name)}</span><span>·</span><span>Mięśnie grzbietu</span></div>
      <h2>${esc(M.name)}</h2>
      <p class="latin">${esc(M.latin)}</p>
    </div>
    <p>${esc(M.shape)}</p>
    <div><h3>${many ? 'Części · najedź, aby wskazać na modelu' : 'Przyczepy i działanie · przyczepy są zaznaczone na kościach'}</h3>${partBlocks}</div>
    <div><h3>Unerwienie</h3><p>${esc(M.nerve)}</p></div>
    <div class="note"><h3>Dla masażysty</h3><p>${esc(M.massage)}</p>${M.palpation ? `<p><b>Palpacja:</b> ${esc(M.palpation)}</p>` : ''}</div>
    <div><h3>${esc(L.name)}</h3><p class="region-text">${esc(L.text || '')}</p></div>
    ${metaBlock()}`;
}

// „Th4, Th5 … Th12, L1 …” → „Th4–Th12, L1–L5, S”
const ORDER = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12', 'L1', 'L2', 'L3', 'L4', 'L5', 'S'];
export function rangeText(keys) {
  const idx = keys.map((k) => ORDER.indexOf(k)).filter((i) => i >= 0).sort((a, b) => a - b);
  const runs = [];
  const region = (i) => ORDER[i].replace(/\d+$/, '');
  for (const i of idx) {
    const last = runs.at(-1);
    if (last && i === last[1] + 1 && region(i) === region(last[0])) last[1] = i; else runs.push([i, i]);
  }
  return runs.map(([a, b]) => (a === b ? ORDER[a] : `${ORDER[a]}–${ORDER[b]}`)).join(', ');
}

// Etykiety: po jednej na część mięśnia, po stronie bliższej kamerze
// maxLayer: głębsze warstwy (przykryte przez widoczne wyżej) nie dostają etykiet
export function labelItems(meshes, selected, focusPart, camPos, maxLayer = Infinity) {
  const groups = new Map();
  for (const m of meshes) {
    const e = m.userData;
    if (!m.visible || !e.lbl || m.material.opacity < 0.5 || e.layer > maxLayer) continue;
    const id = `${e.muscle}:${e.part}`;
    const d = (e.lbl[0] - camPos.x) ** 2 + (e.lbl[1] - camPos.y) ** 2 + (e.lbl[2] - camPos.z) ** 2;
    const g = groups.get(id);
    if (!g || d < g.d) groups.set(id, { d, e });
  }
  const items = [];
  for (const [id, { e }] of groups) {
    const M = MUSCLES[e.muscle];
    const P = M?.parts[e.part];
    if (!M || !P) continue;
    const many = Object.keys(M.parts).length > 1;
    items.push({
      id: `m:${id}`, p: e.lbl, part: e.part, key: e.muscle,
      // części z własną nazwą mięśnia (np. równoległoboczny mniejszy) vs części jednego mięśnia (czworoboczny, część zstępująca)
      title: !many ? cap(short(M.name)) : /^Mięsień /.test(P.name) ? cap(short(P.name)) : `${cap(short(M.name))}, ${P.name.toLowerCase()}`,
      sub: many ? P.latin : M.latin,
      focus: e.muscle === selected && (!focusPart || focusPart === e.part),
    });
  }
  return items;
}
