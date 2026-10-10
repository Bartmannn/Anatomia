// Zestawy kości oglądanych jako osobne kości z nazwanymi częściami: czaszka i obręcz barkowa.
// Każdy zestaw ma treści (content-<zestaw>.js), punkty (landmarks-<zestaw>.js), paczki modeli (<dir>-przeglad, <dir>/<kość>)
// i ustawienia widoku (js/<zestaw>.js → SET). Ten plik łączy je w jedno, żeby reszta strony nie musiała ich rozróżniać.
// Nowy zestaw: plik js/<zestaw>.js z SET, wpis w SETS poniżej i moduł w MODULES (stan.js).
import * as CZ from './czaszka.js';
import * as OB from './obrecz.js';

export const SETS = { czaszka: CZ.SET, obrecz: OB.SET };

const all = Object.values(SETS);
const merged = (field) => Object.assign({}, ...all.map((S) => S[field] || {}));
const joined = (field) => new Set(all.flatMap((S) => [...(S[field] || [])]));

// kość -> zestaw
export const SET_OF = Object.fromEntries(Object.entries(SETS).flatMap(([id, S]) => S.order.map((k) => [k, id])));
export const isSetBone = (k) => k in SET_OF;
export const SET_ORDER = all.flatMap((S) => S.order);

export const GROUP = merged('group');           // kość -> grupa (NC, VC, OB); kolor grupy to zmienna CSS --nc, --vc, --ob
export const PARTS = merged('parts');
export const LABELS = merged('labels');
export const REGIONS = merged('regions');
export const LANDMARKS = merged('landmarks');
export const BONE_COLORS = merged('colors');     // „Kolory kości”
export const BONE_VIEW = merged('view');         // kierunek kamery, z którego najlepiej widać kość
export const SET_GROUPS = Object.keys(REGIONS);
// małe kości (kadr na samą kość), leżące głęboko (podpowiedź „Tylko wybrany”), niewidoczne z zewnątrz (bez pytania „Która kość?”)
export const SMALL_BONES = joined('small');
export const INNER_BONES = joined('inner');
export const HIDDEN_BONES = joined('hidden');
export const PAIRED_BONES = joined('paired');    // jedna siatka z kośćmi lewą i prawą (łopatki, obojczyki)

// paczki: przegląd zestawu (uproszczony) i pełna kość
export const OVERVIEWS = new Set(all.map((S) => S.overview));
export const SET_DIRS = all.map((S) => S.dir);
export const packOf = (k) => `${SETS[SET_OF[k]].dir}/${k}`;

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// Lewa kolumna: kości zestawów pogrupowane (np. mózgoczaszka i twarzoczaszka)
export function navHTML(setIds, esc) {
  return setIds.flatMap((id) => Object.entries(SETS[id].regions).map(([g, R]) => {
    const list = SETS[id].order.filter((k) => GROUP[k] === g);
    return `<div class="group sgroup" data-set-group="${g}" style="--rc: var(--${g.toLowerCase()})">
      <span class="glabel">${esc(R.name)}</span>
      ${list.map((k) => `<button type="button" id="r-${k}" data-key="${k}" title="${esc(PARTS[k].latin)}">${esc(cap(PARTS[k].name))}</button>`).join('')}
    </div>`;
  })).join('');
}
