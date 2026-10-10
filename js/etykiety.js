// Etykiety na modelu: wybór punktów, zasłanianie i rozkład w kolumnach.
import * as THREE from 'three';
import * as MUS from './miesnie.js';
import { PALPATION } from './tresci.js';
import { firstProxyHit } from './celowanie.js';
import { editableParts } from './edytor.js';
import { SIDE_SHORT, isPaired, lm, partDef, partList, slotChanged } from './punkty.js';
import { $, boneSetMode, closeUp, modKeys, muscleMeshes, muscleMode, parts, state, ui } from './stan.js';
import { camera, perf, project, projectedRect, renderer } from './widok.js';

/* ---------- Labels (names of bone parts, palpable landmarks) ---------- */
export const labelsEl = $('#labels');
export const svgNS = 'http://www.w3.org/2000/svg';
export const svg = document.createElementNS(svgNS, 'svg');
labelsEl.appendChild(svg);
export const nodes = new Map();   // id -> {el, dot, line}
// po zmianie rozmiaru okna etykiety zmierzą się na nowo
export function resetLabelSizes() { for (const n of nodes.values()) n.h = undefined; }

export const occl = new Map();
export let occlAt = 0;
export const occRay = new THREE.Raycaster();
export function occluded(id, p) {
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

const NARROW_MAX = 7;      // najwięcej podpisanych części kości na telefonie
export function labelItems() {
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
        const pair = isPaired(k, part);
        items.push({ id: `e:${k}:${part}:${i}`, p, title: `${def?.name || part}${pair ? ` (${SIDE_SHORT[i]})` : ''}`, sub: part.startsWith('x_') ? 'dodany' : slotChanged(k, part, i) ? 'poprawiony' : 'automatyczny',
          palp: !!def?.palp, part, focus: state.edit.part === part && (!pair || state.edit.slot === i),
          // with a part selected, only its points get labels; the rest stay as dots
          dotOnly: !!state.edit.part && state.edit.part !== part });
      });
    }
    return { items, ref: projectedRect([k]), kind: 'parts' };
  }
  if (state.mode === 'quiz' && state.quiz?.type === 'czesc' && state.quiz.point && parts[state.quiz.target]) {
    const q = state.quiz;
    const d = partDef(q.target, q.part);
    return { items: [{ id: 'quiz:pt', p: q.point, title: q.answered ? d.name : '?', sub: q.answered ? d.latin : 'jak nazywa się ta część?', palp: false, focus: true }],
      ref: projectedRect([q.target]), kind: 'parts' };
  }
  if (!state.labels || state.mode !== 'atlas') return { items: [], ref: null };
  const rect = projectedRect([k]);
  // histereza: z nazw części na punkty wyczuwalne wracamy dopiero przy wyraźnie mniejszym kręgu
  const thr = (renderer.domElement.clientWidth < 520 ? 70 : 95) * (ui.labelMode === 'parts' ? 0.8 : 1);
  // zestawy kości (czaszka, obręcz): zawsze części wybranej kości (kości są duże na ekranie albo — małe — i tak warto znać ich części)
  const big = rect && (closeUp() || boneSetMode() || (rect.y1 - rect.y0) > thr);
  ui.labelMode = big ? 'parts' : 'palp';
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
    // wąski ekran i dużo części (np. łopatka): podpisane są pierwsze części wyczuwalne (w kolejności z pliku z opisami)
    // i część wskazana w opisie; pozostałe to same kropki
    if (renderer.domElement.clientWidth < 520 && items.length > NARROW_MAX) {
      const keep = new Set(items.filter((it) => it.palp).slice(0, NARROW_MAX).map((it) => it.part));
      for (const it of items) it.dotOnly = !keep.has(it.part) && it.part !== state.focusPart;
    }
    return { items, ref: rect, kind: 'parts' };
  }
  if (closeUp()) return { items: [], ref: null };
  const keys = new Set(modKeys());
  const items = PALPATION.filter((l) => keys.has(l.key) && parts[l.key]?.visible !== false && lm(l.key)[l.part]).map((l) => ({
    id: `palp:${l.key}`, p: lm(l.key)[l.part].find(Boolean), title: l.label, sub: l.note, palp: true, key: l.key,
  }));
  return { items, ref: projectedRect(modKeys()), kind: 'palp' };
}

export function layoutLabels() {
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
