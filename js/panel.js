// Lewa kolumna (kręgi albo mięśnie) i panel z opisem po prawej.
import * as MUS from './miesnie.js';
import * as CZ from './czaszka.js';
import { REGIONS, PARTS, DISC } from './tresci.js';
import { RIB_LINKS } from '../landmarks-ribs.js';
import { renderEditor, reportUrl } from './edytor.js';
import { paint, ribsOn } from './malowanie.js';
import { select, setMode, toggleRibs } from './moduly.js';
import { partList, reviewedOf } from './punkty.js';
import { ORDER, REGION_KEYS, bigcodeEl, discLabel, modKeys, muscleMode, panelEl, parts, regionOf, rulerEl, skullMode, state, ui } from './stan.js';
import { R, invalidate } from './widok.js';

/* ---------- Ruler ---------- */
export let rulerKind = null;
export function buildRuler() {
  const kind = muscleMode() ? 'muscles' : skullMode() ? 'skull' : 'bones';
  if (kind === rulerKind) return;
  rulerKind = kind;
  rulerEl.classList.toggle('mus', kind !== 'bones');       // lista nazw zamiast skrótów kręgów
  rulerEl.setAttribute('aria-label', { muscles: 'Mięśnie', skull: 'Kości czaszki', bones: 'Kręgi' }[kind]);
  if (kind !== 'bones') {
    rulerEl.innerHTML = kind === 'muscles' ? MUS.navHTML(esc) : CZ.navHTML(esc);
    rulerEl.querySelectorAll('button[data-key]').forEach((b) => b.addEventListener('click', () => select(b.dataset.key, true)));
    return;
  }
  const groups = { C: [], Th: [], L: [], S: [] };
  ORDER.forEach((k) => groups[regionOf(k)].push(k));
  rulerEl.innerHTML = '';
  for (const r of REGION_KEYS) {
    const g = document.createElement('div');
    g.className = 'group';
    g.dataset.region = r;
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
export function syncRuler() {
  const keys = new Set(modKeys());
  rulerEl.querySelectorAll('.group[data-region]').forEach((g) => { g.hidden = !ORDER.some((k) => regionOf(k) === g.dataset.region && keys.has(k)); });
  rulerEl.querySelectorAll('button').forEach((b) => {
    const k = b.id.slice(2);
    b.setAttribute('aria-current', String(state.mode !== 'quiz' && k === state.selected));
  });
  const cur = rulerEl.querySelector('[aria-current="true"]');
  if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

export function refreshPanel() {
  if (state.mode === 'atlas') renderPart(state.selected);
  else if (state.mode === 'edit') renderEditor();
}

/* ---------- Panel rendering ---------- */
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function metaBlock(fma) {
  return `<div class="meta">
    ${fma ? `<div>Model: <code>${fma}</code> · BodyParts3D</div>` : ''}
    <div>Modele 3D: <a href="https://doi.org/10.18908/lsdba.nbdc00837-000" target="_blank" rel="noopener">BodyParts3D</a>, © The Database Center for Life Science, licencja <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en" target="_blank" rel="noopener">CC BY-SA 2.1 JP</a>. Przetworzone (konwersja formatu, układ współrzędnych, uproszczenie siatek, kompresja).</div>
    <div>Opisy: wersja robocza do weryfikacji przez nauczyciela.</div>
  </div>`;
}
export function ribBlock(k) {
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

export function partsBlock(k) {
  const list = partList(k);
  if (!list.length) return '';
  const rv = reviewedOf(k);
  const status = `<div class="lmstatus${rv ? ' ok' : ''}"><span>${rv ? `Położenie etykiet sprawdzone ręcznie (${esc(rv)}).` : 'Położenie etykiet wyznaczone automatycznie, jeszcze niesprawdzone.'}</span>
    <span class="lmlinks"><button type="button" class="linkbtn" data-action="edit">Popraw lub dodaj punkty</button>
    <a class="linkbtn" href="${esc(reportUrl(k))}" target="_blank" rel="noopener">Zgłoś brak lub błąd</a></span></div>`;
  return `<div><h3>Części · najedź, aby wskazać na modelu</h3>${status}<dl class="parts">${list.map(({ part, def }) => `
    <div class="prow" data-part="${part}" tabindex="0">
      <dt><i class="pd${def.palp ? ' palp' : ''}" aria-hidden="true"></i>${esc(def.name)}${def.palp ? ' <em>wyczuwalny</em>' : ''}${def.extra ? ' <em class="added">dodany</em>' : ''}</dt>
      <dd>${esc(def.def || '')}${def.note ? ' ' + esc(def.note) : ''}</dd>
    </div>`).join('')}</dl></div>`;
}
export function bindParts() {
  panelEl.querySelector('[data-action=edit]')?.addEventListener('click', () => setMode('edit'));
  panelEl.querySelector('[data-action=ribs]')?.addEventListener('click', toggleRibs);
  panelEl.querySelector('[data-action=isolate]')?.addEventListener('click', () => document.getElementById('isolate').click());
  panelEl.querySelectorAll('.prow').forEach((r) => {
    // czaszka: wskazany szew albo kresa świeci na modelu (paint), w pozostałych — tylko etykieta (invalidate)
    const redraw = () => (skullMode() ? paint() : invalidate());
    const on = () => { state.focusPart = r.dataset.part; redraw(); };
    const off = () => { state.focusPart = null; redraw(); };
    r.addEventListener('mouseenter', on); r.addEventListener('focus', on);
    r.addEventListener('mouseleave', off); r.addEventListener('blur', off);
  });
}

export function renderMuscle(k) {
  panelEl.style.setProperty('--rc', 'var(--muscle)');
  document.documentElement.style.setProperty('--rc', 'var(--muscle)');
  bigcodeEl.textContent = '';
  panelEl.innerHTML = MUS.panelHTML(k, esc, metaBlock);
  panelEl.querySelectorAll('.prow').forEach((r) => {
    const on = () => { state.focusPart = r.dataset.part; paint(); };
    const off = () => { state.focusPart = null; paint(); };
    r.addEventListener('mouseenter', on); r.addEventListener('focus', on);
    r.addEventListener('mouseleave', off); r.addEventListener('blur', off);
  });
}
export function renderPart(k) {
  invalidate();
  ui.panelRibs = ribsOn(k);
  if (muscleMode()) { renderMuscle(k); return; }
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
  bigcodeEl.textContent = CZ.isSkull(k) ? '' : P.short === 'S1–S5' ? 'S' : P.short;
  panelEl.innerHTML = `
    <div>
      <div class="eyebrow"><span>${esc(R.name)}</span><span>·</span><span>${esc(R.curve)}</span></div>
      <h2>${esc(P.name)}</h2>
      <p class="latin">${esc(P.latin)}${CZ.isSkull(k) ? '' : ` · ${esc(P.short)}`}</p>
    </div>
    <div><h3>Cechy</h3><ul>${P.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>
    ${CZ.INNER_BONES.has(k) ? `<p class="small inner-tip">Ta kość leży w dużej części wewnątrz czaszki. <button type="button" class="linkbtn" data-action="isolate">${state.isolate ? 'Pokaż całą czaszkę' : 'Pokaż tylko tę kość'}</button></p>` : ''}
    ${ribBlock(k)}
    ${partsBlock(k)}
    <div class="note"><h3>Dla masażysty</h3><p>${esc(P.massage)}</p></div>
    <div><h3>${CZ.isSkull(k) ? 'Przyczepy mięśni' : 'Przyczepy mięśni (wybrane)'}</h3><p>${esc(P.muscles)}</p></div>
    <div><h3>${esc(R.name)} · ${esc(R.count)}</h3><p class="region-text">${esc(R.text)}</p></div>
    ${metaBlock(fma)}`;
  bindParts();
}
