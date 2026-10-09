// Tryb „Popraw lub dodaj punkty”: poprawianie, dodawanie i eksport punktów, zgłoszenia.
import * as THREE from 'three';
import { REGIONS, PARTS } from './tresci.js';
import { SKULL_LABELS, SKULL_ORDER, isSkull } from './czaszka.js';
import { ptr, ray } from './celowanie.js';
import { occl } from './etykiety.js';
import { paint, ribsOn } from './malowanie.js';
import { setMode } from './moduly.js';
import { esc, syncRuler } from './panel.js';
import { EXTRA, FIXES, REVIEWED, SIDE_NAMES, autoLm, extraDef, extrasOf, fixedIn, isPaired, lm, local, partDef, resetLocal, reviewedOf, saveLocal, slotChanged } from './punkty.js';
import { $, ORDER, bigcodeEl, discLabel, panelEl, parts, regionOf, ribMeshes, state, ui } from './stan.js';
import { camera, invalidate, renderer } from './widok.js';

/* ---------- Edit mode: fix label points by hand ---------- */

export function editableParts(k) { return [...builtinParts(k), ...Object.keys(extrasOf(k))]; }
export function builtinParts(k) {
  if (isSkull(k)) return Object.keys(SKULL_LABELS[k] || {});
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
export const r4 = (v) => Math.round(v * 1e4) / 1e4;
export function setPoint(k, part, slot, p) {
  const arr = (lm(k)[part] || []).slice();
  while (arr.length < slot) arr.push(null);
  arr[slot] = p ? p.map(r4) : null;
  if (part.startsWith('x_')) (local.extra[k] ||= {})[part] = { ...extraDef(k, part), pts: arr };
  else (local.fixes[k] ||= {})[part] = arr;
  saveLocal();
}
// Nowy punkt dodany ręcznie (np. część kości, o której zapomnieliśmy)
export function slugify(t) {
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32) || 'punkt';
}
export function saveExtra(k, id, fields) {
  const d = { ...(extraDef(k, id) || { pts: [] }), ...fields };
  for (const f of ['latin', 'def']) if (!d[f]) delete d[f];
  for (const f of ['pair', 'palp']) if (!d[f]) delete d[f];
  (local.extra[k] ||= {})[id] = d;
  saveLocal();
}
export function addExtra(k, fields) {
  let id = 'x_' + slugify(fields.name);
  for (let i = 2; extraDef(k, id) || lm(k)[id]; i++) id = `x_${slugify(fields.name)}_${i}`;
  saveExtra(k, id, { ...fields, pts: [] });
  return id;
}
export function removeExtra(k, id) {
  if (EXTRA[k]?.[id]) (local.extra[k] ||= {})[id] = null;      // jest w pliku: oznacz jako usunięty
  else if (local.extra[k]) { delete local.extra[k][id]; if (!Object.keys(local.extra[k]).length) delete local.extra[k]; }
  saveLocal();
}
// Zgłoszenie na GitHubie (dla osób bez dostępu do repozytorium): gotowy tytuł i treść, wysyła sam użytkownik
export const REPO_ISSUES = 'https://github.com/Bartmannn/Anatomia/issues/new';
export const issueUrl = (title, body) => `${REPO_ISSUES}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
export function reportUrl(k, id = null) {
  const where = k.startsWith('D_') ? `krążek ${discLabel(k)}` : `${PARTS[k]?.name || k} (${k})`;
  if (!id) return issueUrl(`Brakujący lub błędny punkt: ${k}`, `Kość / krążek: ${where}\n\nCzego brakuje albo co jest nie tak (nazwa części, opis, położenie):\n\n\nŹródło (podręcznik, notatki z zajęć):\n`);
  const d = extraDef(k, id);
  const pts = (d.pts || []).map((p, i) => (p ? `${d.pair ? SIDE_NAMES[i] + ': ' : ''}[${p.join(', ')}]` : null)).filter(Boolean).join('; ') || 'jeszcze nie wskazany';
  return issueUrl(`Propozycja punktu: ${d.name} (${k})`, `Kość / krążek: ${where}\nNazwa: ${d.name}\nNazwa łacińska: ${d.latin || '—'}\nOpis: ${d.def || '—'}\nParzysty: ${d.pair ? 'tak' : 'nie'} · wyczuwalny: ${d.palp ? 'tak' : 'nie'}\nPołożenie (współrzędne modelu): ${pts}\n\nŹródło (podręcznik, notatki z zajęć):\n`);
}
export function placePoint(ev) {
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
export function nudge(dx, dy, dz) {
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
export function editMsg(t) { const el = $('#editmsg'); if (el) el.textContent = t; }

export function mergedFixes() {
  const out = JSON.parse(JSON.stringify(FIXES));
  for (const [k, fx] of Object.entries(local.fixes)) out[k] = { ...(out[k] || {}), ...fx };
  return out;
}
export function exportText() {
  const rev = { ...REVIEWED, ...local.reviewed };
  for (const k of Object.keys(rev)) if (!rev[k]) delete rev[k];
  const all = [...ORDER, ...ORDER.map((x) => 'D_' + x), ...SKULL_ORDER];
  const order = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => all.indexOf(a[0]) - all.indexOf(b[0])));
  const fx = order(mergedFixes());
  const lines = Object.entries(fx).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
  const ex = {};
  for (const k of new Set([...Object.keys(EXTRA), ...Object.keys(local.extra)])) { const e = extrasOf(k); if (Object.keys(e).length) ex[k] = e; }
  const exLines = Object.entries(order(ex)).map(([k, v]) => `  ${JSON.stringify(k)}: {\n${Object.entries(v).map(([id, d]) => `    ${JSON.stringify(id)}: ${JSON.stringify(d)},`).join('\n')}\n  },`).join('\n');
  return `// Ręczne poprawki punktów etykiet. Plik tworzy tryb „Popraw punkty” na stronie (przycisk „Pobierz landmarks-fix.js”).
// Współrzędne w układzie modeli (1 jednostka = 10 cm). null = punkt usunięty.
// REVIEWED: data sprawdzenia punktów danego kręgu albo kości.
// EXTRA: punkty dodane ręcznie (części, których brakowało). name — nazwa (można ją tu poprawić), latin, def — opis,
//        pair — parzysty ([lewa, prawa]), palp — wyczuwalny pod palcami, pts — współrzędne.
export const FIXES = {${lines ? '\n' + lines + '\n' : ''}};
export const REVIEWED = ${JSON.stringify(order(rev), null, 2)};
export const EXTRA = {${exLines ? '\n' + exLines + '\n' : ''}};
`;
}
export const localCount = () => new Set([...Object.keys(local.fixes), ...Object.keys(local.reviewed), ...Object.keys(local.extra)]).size;

export function extraForm(d, id, submit) {
  return `<form class="exform" id="${id}">
    <label>Nazwa <input name="name" required maxlength="60" value="${esc(d.name || '')}" placeholder="np. Wyrostek dodatkowy"></label>
    <label>Nazwa łacińska <small>(opcjonalnie)</small> <input name="latin" maxlength="80" value="${esc(d.latin || '')}" placeholder="np. processus accessorius"></label>
    <label>Opis <small>(opcjonalnie)</small> <textarea name="def" rows="2" maxlength="400">${esc(d.def || '')}</textarea></label>
    <label class="check"><input type="checkbox" name="pair" ${d.pair ? 'checked' : ''}> <span>Parzysty (osobno lewa i prawa strona)</span></label>
    <label class="check"><input type="checkbox" name="palp" ${d.palp ? 'checked' : ''}> <span>Wyczuwalny pod palcami</span></label>
    <button type="submit" class="btn">${submit}</button>
  </form>`;
}
export function renderEditor() {
  invalidate();
  ui.panelRibs = ribsOn(state.selected);
  const k = state.selected;
  const reg = regionOf(k);
  panelEl.style.setProperty('--rc', `var(--${reg.toLowerCase()})`);
  document.documentElement.style.setProperty('--rc', `var(--${reg.toLowerCase()})`);
  const title = k.startsWith('D_') ? `Krążek ${discLabel(k)}` : isSkull(k) ? PARTS[k].name : `${PARTS[k].name} · ${PARTS[k].short}`;
  bigcodeEl.textContent = isSkull(k) ? '' : k.startsWith('D_') ? discLabel(k) : (k === 'S' ? 'S' : k);
  const L = lm(k);
  const rv = reviewedOf(k);
  const { part: ap, slot: as } = state.edit;
  const activeDef = ap ? partDef(k, ap) : null;
  const apExtra = ap ? extraDef(k, ap) : null;
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
      ${apExtra ? `<details class="exedit"><summary>Nazwa i opis tego punktu</summary>${extraForm(apExtra, 'exform', 'Zapisz')}
        <div class="erow-actions"><button type="button" class="linkbtn" id="exdel">Usuń ten punkt z listy</button>
        <a class="linkbtn" href="${esc(reportUrl(k, ap))}" target="_blank" rel="noopener">Zgłoś ten punkt na GitHubie</a></div></details>` : ''}
    </div>` : '';
  const rows = editableParts(k).map((part) => {
    const def = partDef(k, part);
    const pts = L[part] || [];
    const n = isPaired(k, part) ? 2 : 1;
    const changed = Array.from({ length: n }, (_, i) => pts[i] && slotChanged(k, part, i)).some(Boolean);
    const isExtra = part.startsWith('x_');
    const unsaved = isExtra ? !!(local.extra[k] && part in local.extra[k]) : !!(local.fixes[k] && part in local.fixes[k]);
    const tag = isExtra ? `dodany${pts.some(Boolean) ? '' : ' · wskaż na modelu'}${unsaved ? ' · niezapisany w pliku' : ''}`
      : !pts.length ? 'brak punktu' : changed ? (unsaved ? 'poprawiony · niezapisany w pliku' : 'poprawiony') : 'automatyczny';
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
    <label class="check"><input type="checkbox" id="rev" ${rv ? 'checked' : ''}> <span>Sprawdziłem punkty ${k.startsWith('D_') ? 'tego krążka' : isSkull(k) ? 'tej kości' : 'tego kręgu'}${rv ? ` <small>(${esc(rv)})</small>` : ''}</span></label>
    <div><h3>Jak poprawić punkt</h3><ol class="steps">
      <li>Wybierz część (przy parzystych — stronę lewą lub prawą, czyli stronę ciała). Na modelu jej etykieta zostanie obwiedziona.</li>
      <li>Obróć model tak, żeby widzieć to miejsce, i kliknij na kości w miejscu, gdzie powinien być punkt.</li>
      <li>Dopracuj strzałkami na klawiaturze lub przyciskami: 1 mm, z Shift 5 mm. PgUp / PgDn przesuwa w głąb (np. do środka otworu kręgowego).</li>
    </ol></div>
    <div class="elist">${rows}</div>
    <div class="addpt">
      <h3>Brakuje punktu?</h3>
      <p class="small">Dodaj część, o której zapomnieliśmy — pojawi się w opisie i na modelu z dopiskiem „dodany”. Nie masz dostępu do repozytorium? <a href="${esc(reportUrl(k))}" target="_blank" rel="noopener">Zgłoś to na GitHubie</a>.</p>
      ${extraForm({}, 'addform', 'Dodaj i wskaż na modelu')}
    </div>
    <div class="export">
      <h3>Zapis do projektu</h3>
      <p>${n ? `Niezapisane w pliku zmiany: <b>${n}</b> ${n === 1 ? 'kość' : 'kości/krążki'}.` : 'Wszystkie poprawki są już w pliku landmarks-fix.js.'}</p>
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
    if (apExtra) { setPoint(k, ap, as, null); renderEditor(); return; }
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
  const formFields = (f) => ({ name: f.name.value.trim(), latin: f.latin.value.trim(), def: f.def.value.trim(), pair: f.pair.checked, palp: f.palp.checked });
  $('#addform').addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = formFields(e.target);
    if (!fields.name) return;
    const id = addExtra(k, fields);
    state.edit = { part: id, slot: 0 };
    renderEditor();
    editMsg('Obróć model i kliknij na kości w miejscu tej części.');
  });
  $('#exform')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = formFields(e.target);
    if (!fields.name) return;
    const pts = extraDef(k, ap).pts || [];
    saveExtra(k, ap, { ...fields, pts: fields.pair ? pts : pts.slice(0, 1) });
    if (!fields.pair) state.edit.slot = 0;
    renderEditor();
  });
  $('#exdel')?.addEventListener('click', () => { removeExtra(k, ap); state.edit.part = null; occl.clear(); renderEditor(); });
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
    if (disc.dataset.sure) { resetLocal(); saveLocal(); state.edit.part = null; renderEditor(); return; }
    disc.dataset.sure = '1'; disc.textContent = 'Na pewno? Kliknij jeszcze raz';
  });
  syncRuler();
  paint();
}
