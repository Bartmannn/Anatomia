// Wybór modułu, zasłona wczytywania, adres strony, przyciski paska i klawiatura.
import { PACKS } from '../models/pakiety/spis.js';
import * as MUS from './miesnie.js';
import { PARTS } from '../content.js';
import { nudge, renderEditor } from './edytor.js';
import { occl } from './etykiety.js';
import { paint } from './malowanie.js';
import { ensurePack, kB, net, netStatus, packForKey, packUrl, packs, saveData, scheduleLod, updateLod } from './paczki.js';
import { buildRuler, esc, refreshPanel, renderPart, syncRuler } from './panel.js';
import { newQuestion } from './quiz.js';
import { $, DEBUG, MODULES, ORDER, closeUp, currentKey, modKeys, muscleMode, parts, rulerEl, single, state, ui } from './stan.js';
import { VIEWS, closeFrame, frame, frameWhenReady, neighbors, stepTween, view } from './widok.js';

export function toggleRibs() { setRibs(!state.ribs); }
export function setRibs(on, reframe = true) {
  state.ribs = on;
  $('#ribs').setAttribute('aria-pressed', String(on));
  occl.clear();
  updateLod();
  paint();
  refreshPanel();
  if (reframe && closeUp() && state.selected.startsWith('Th')) closeFrame(state.selected);
}

export function select(k, doFrame) {
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
    else { view.pendingFrame = null; frame(neighbors(keys[0], 3)); }
  }
  writeHash();
}

export function syncModeButtons() {
  const mode = state.mode;
  document.querySelectorAll('.modes button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  rulerEl.style.opacity = mode === 'quiz' ? '.35' : '';
  rulerEl.style.pointerEvents = mode === 'quiz' ? 'none' : '';
  rulerEl.toggleAttribute('inert', mode === 'quiz');
  $('#isolate').disabled = mode !== 'atlas';
  document.body.classList.toggle('editing', mode === 'edit');
}
export function setMode(mode) {
  if (mode === 'edit' && muscleMode()) return;
  state.mode = mode;
  syncModeButtons();
  if (mode === 'quiz') {
    state.quiz = state.quiz || { good: 0, total: 0, type: null };
    newQuestion();
  } else {
    select(state.selected, true);
  }
  if (mode === 'edit') closeFrame(state.selected, VIEWS.side);
  syncRuler();
}

/* ---------- Toolbar ---------- */
export function initControls() {
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  const v = b.dataset.view;
  const k = currentKey();
  if (single()) closeFrame(k, VIEWS[v === 'all' ? 'three' : v]);
  else if (v === 'all') frame(muscleMode() ? [...modKeys(), ...ORDER] : modKeys(), muscleMode() ? VIEWS.back : VIEWS.side);
  else if (closeUp()) closeFrame(k, VIEWS[v]);
  else frame(modKeys(), VIEWS[v]);
}));
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
$('#modbtn').addEventListener('click', () => (pickerEl.hidden ? showPicker() : state.module && hidePicker()));
window.addEventListener('online', () => netStatus());
window.addEventListener('offline', () => netStatus());
}

export function toggle(id, prop) {
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
export function renderLayerChips() {
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
export function syncLayerChips() {
  document.querySelectorAll('#layers [data-layer]').forEach((b) => b.setAttribute('aria-pressed', String(!!state.layers[+b.dataset.layer])));
}

/* ---------- Wybór modułu ---------- */
export const MOD_KEY = 'atlas-module-v1';
export const pickerEl = $('#picker');
export const loaderEl = $('#loader');
export const validKey = (k) => ORDER.includes(k) || (/^D_/.test(k) && ORDER.includes(k.slice(2)) && k !== 'D_S' && k !== 'D_C1');
export function parseHash() {
  const h = decodeURIComponent(location.hash.slice(1)).replace(/[&?]?debug\b/, '');
  const [a, b] = h.split('/');
  if (MODULES[a]) return { mod: a, key: validKey(b) || MUS.MUSCLES[b] ? b : null };
  if (validKey(a)) return { mod: null, key: a };   // stare linki: #C7
  return {};
}
export function writeHash() {
  if (!state.module) return;
  const h = `#${state.module}/${state.selected}${DEBUG ? '&debug' : ''}`;
  if (location.hash !== h) try { history.replaceState(null, '', h); } catch (e) { /* ignore */ }
}
export const ICONS = {
  kregoslup: '<svg viewBox="0 0 40 56" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6">' +
    Array.from({ length: 9 }, (_, i) => `<rect x="${15 + Math.sin(i / 2.6) * 4}" y="${3 + i * 5.6}" width="${8 + i * 0.6}" height="3.6" rx=".6"/>`).join('') + '</g></svg>',
  kregi: '<svg viewBox="0 0 40 56" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6"><ellipse cx="20" cy="19" rx="10" ry="7.5"/><path d="M12 25 L8 31 M28 25 L32 31 M14 27 Q20 33 26 27 M20 33 L20 47"/><circle cx="20" cy="28.5" r="2.6"/></g></svg>',
  grzbiet: '<svg viewBox="0 0 40 56" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 4 L20 52" stroke-dasharray="2 2.5"/><path d="M15 6 L20 5 L25 6 L35 13 L36 17 L20 30 L4 17 L5 13 Z" fill="currentColor" fill-opacity=".18"/><path d="M20 30 L20 46 L10 50 L7 30 Z M20 30 L20 46 L30 50 L33 30 Z" fill="currentColor" fill-opacity=".08"/></g></svg>',
  zebra: '<svg viewBox="0 0 40 56" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6">' +
    Array.from({ length: 5 }, (_, i) => `<rect x="17" y="${6 + i * 9}" width="6" height="4.5" rx=".6"/><path d="M17 ${9 + i * 9} Q5 ${10 + i * 9} 4 ${19 + i * 9} M23 ${9 + i * 9} Q35 ${10 + i * 9} 36 ${19 + i * 9}"/>`).join('') + '</g></svg>',
};
export function moduleSize(mod) {
  const base = MODULES[mod].base.reduce((a, id) => a + (PACKS[id]?.bajty || 0), 0);
  const per = ORDER.map((k) => PACKS[packForKey(k)]?.bajty || 0).filter(Boolean);
  const range = `${kB(Math.min(...per))}–${kB(Math.max(...per))}`;
  if (mod === 'kregi') return { big: range.replace(/ kB–/, '–'), small: 'za każdy oglądany kręg' };
  return { big: kB(base), small: 'na start' };
}
export function showPicker() {
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
    ${OFFLINE_OK ? `<div class="pk-offline"><h3 class="pk-gtitle">Bez internetu</h3>
      <p class="pk-note">Zapisz moduł na tym urządzeniu przed zajęciami — zadziała bez Wi-Fi. Strona zapamiętuje też wszystko, co już było oglądane.</p>
      <div class="pk-offlist">${Object.entries(MODULES).map(([id, m]) => `<div class="pk-off"><span>${m.name}</span><span class="pk-offsize">${kB(offlineIds(id).reduce((a, p) => a + (PACKS[p]?.bajty || 0), 0))}</span><button type="button" class="chip" data-save="${id}">Zapisz</button></div>`).join('')}</div>
    </div>` : ''}
    <p class="pk-foot">${net.bytes ? `Pobrano w tej sesji: <b>${kB(net.bytes)}</b> · ` : ''}${saveData() ? 'Oszczędzanie danych włączone: bez pobierania z wyprzedzeniem.' : 'Sąsiednie kręgi pobierają się w tle, chyba że w telefonie włączysz oszczędzanie danych.'}</p>
  </div>`;
  pickerEl.hidden = false;
  loaderEl.hidden = true;
  pickerEl.querySelectorAll('[data-mod]').forEach((b) => b.addEventListener('click', () => setModule(b.dataset.mod)));
  pickerEl.querySelectorAll('[data-save]').forEach((b) => { refreshSaveButton(b); b.addEventListener('click', () => saveOffline(b)); });
  $('#pkClose')?.addEventListener('click', hidePicker);
  (pickerEl.querySelector('[aria-current="true"]') || pickerEl.querySelector('.pk-card')).focus({ preventScroll: true });
}
export function hidePicker() {
  pickerEl.hidden = true;
  updateLoader();
  $('#modbtn').focus({ preventScroll: true });
}

// Zasłona „Wczytywanie…”: dopóki nie ma przeglądu modułu albo (w „Pojedynczych kręgach”) oglądanego kręgu
export const baseProgress = {};
export function updateLoader(err) {
  if (!pickerEl.hidden || !state.module) { loaderEl.hidden = true; return; }
  const base = MODULES[state.module].base;
  const waiting = base.some((id) => !packs.get(id)?.done) || (single() && !parts[currentKey()]);
  if (err && waiting) {
    loaderEl.hidden = false;
    const why = navigator.onLine ? `<small>${esc(err.message || err)}</small>` : 'Brak internetu, a ten moduł nie był jeszcze zapisany na tym urządzeniu.';
    loaderEl.innerHTML = `<div>Nie udało się pobrać modelu.<br>${why}<br><button type="button" class="btn" id="retry">Spróbuj ponownie</button></div>`;
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
export const loaderHTML = loaderEl.innerHTML;

/* ---------- Zapis modułu do pracy bez internetu ---------- */
// Paczki trafiają do tej samej pamięci, z której korzysta sw.js („anatomia-dane”).
export const OFFLINE_OK = 'caches' in window && 'serviceWorker' in navigator && !window.ATLAS_PACK_B64;
const OFFLINE_CACHE = 'anatomia-dane';
const allOf = (prefix) => Object.keys(PACKS).filter((id) => id.startsWith(prefix));
// wszystko, czego moduł może potrzebować: przegląd, pełne kręgi, żebra, wszystkie warstwy mięśni
export function offlineIds(mod) {
  const M = MODULES[mod];
  const ids = new Set(M.base);
  if (mod === 'kregoslup' || mod === 'kregi') { allOf('kregi/').forEach((id) => ids.add(id)); allOf('zebra/').forEach((id) => ids.add(id)); }
  if (mod === 'kregoslup') ids.add('zebra-przeglad');
  if (mod === 'zebra') { M.keys.forEach((k) => ids.add(packForKey(k))); allOf('zebra/').forEach((id) => ids.add(id)); }
  if (M.kind === 'muscles') allOf('miesnie/').forEach((id) => ids.add(id));
  return [...ids].filter((id) => PACKS[id]);
}
async function offlineMissing(mod) {
  const cache = await caches.open(OFFLINE_CACHE);
  const out = [];
  for (const id of offlineIds(mod)) if (!(await cache.match(packUrl(id)))) out.push(id);
  return out;
}
async function refreshSaveButton(b) {
  try {
    const missing = await offlineMissing(b.dataset.save);
    b.disabled = !missing.length;
    b.textContent = missing.length ? 'Zapisz' : 'Zapisany ✓';
  } catch (e) { b.hidden = true; }
}
async function saveOffline(b) {
  const mod = b.dataset.save;
  b.disabled = true;
  try {
    navigator.storage?.persist?.().catch(() => {});      // prośba, żeby przeglądarka nie czyściła zapisanych plików
    const cache = await caches.open(OFFLINE_CACHE);
    const missing = await offlineMissing(mod);
    const total = missing.reduce((a, id) => a + (PACKS[id]?.bajty || 0), 0) || 1;
    let done = 0;
    const queue = missing.slice();
    const worker = async () => {
      while (queue.length) {
        const id = queue.shift();
        await cache.add(packUrl(id));
        done += PACKS[id]?.bajty || 0;
        net.bytes += PACKS[id]?.bajty || 0;
        b.textContent = `Zapisywanie… ${Math.round((done / total) * 100)}%`;
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    b.textContent = 'Zapisany ✓';
  } catch (e) {
    b.disabled = false;
    b.textContent = navigator.onLine ? 'Błąd — spróbuj ponownie' : 'Brak internetu';
  }
}

export let framedOnce = false;
export function setModule(mod, key = null) {
  if (!MODULES[mod]) return;
  state.module = mod;
  try { localStorage.setItem(MOD_KEY, mod); } catch (e) { /* no storage */ }
  pickerEl.hidden = true;
  ui.labelMode = 'palp';
  $('#modname').textContent = MODULES[mod].name;
  document.body.dataset.module = mod;
  const keys = modKeys();
  const mus = muscleMode();
  if (mus && state.mode === 'edit') { state.mode = 'atlas'; syncModeButtons(); }
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
  const done = () => { framedOnce = true; if (snap && view.tween) { view.tween.t = 1; stepTween(0); } };
  if (state.mode === 'quiz') newQuestion();
  else if (single()) frameWhenReady(state.selected, () => { closeFrame(state.selected, VIEWS.three); done(); });
  else {
    view.pendingFrame = null;
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
