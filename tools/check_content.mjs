// Sprawdzenie plików z treściami i danymi (bez instalowania czegokolwiek, wystarczy Node.js 18+).
//
// Użycie:  node tools/check_content.mjs
//
// Wyłapuje błędy, które psują stronę albo jej fragment: zgubiony cudzysłów lub przecinek w content.js,
// brakujące pola (nazwa, opis), literówkę w kluczu kręgu lub kości, punkt bez współrzędnych, brakujący plik modelu.
// Uruchamia się też automatycznie na GitHubie przy każdej zmianie (.github/workflows/testy.yml).
import { readFileSync, readdirSync, existsSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

// numer wiersza z błędem składni (import() go nie podaje, „node --check” na kopii .mjs — tak)
function syntaxWhere(file) {
  const dir = mkdtempSync(join(tmpdir(), 'anatomia-'));
  try {
    const copy = join(dir, 'plik.mjs');
    writeFileSync(copy, readFileSync(join(ROOT, file)));
    const r = spawnSync(process.execPath, ['--check', copy], { encoding: 'utf8' });
    const lines = (r.stderr || '').split('\n');
    const head = lines.findIndex((l) => l.startsWith(copy + ':'));
    if (head < 0) return '';
    const line = lines[head].slice(copy.length + 1);
    return `\n      wiersz ${line}:\n      ${lines[head + 1] || ''}\n      ${lines[head + 2] || ''}\n     `;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

async function load(file) {
  try {
    return await import(pathToFileURL(join(ROOT, file)).href);
  } catch (e) {
    err(file, `nie da się wczytać pliku — ${e.message}.${syntaxWhere(file)} ` +
      'Najczęściej to zgubiony cudzysłów, przecinek albo nawias; apostrof w tekście zapisz jako \\\'.');
    return null;
  }
}

const ORDER = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10',
  'Th11', 'Th12', 'L1', 'L2', 'L3', 'L4', 'L5', 'S'];
const DISCS = ORDER.slice(1, -1).map((k) => 'D_' + k);           // krążek pod kręgiem: D_C2 … D_L5
// zestawy kości: plik z treściami, plik z punktami i przedrostek nazw (SKULL_ORDER, OBRECZ_ORDER…), grupy (NC, VC, OB)
const SETS = [
  { content: 'content-czaszka.js', points: 'landmarks-czaszka.js', P: 'SKULL', groups: 'NC albo VC', script: 'tools/czaszka.py' },
  { content: 'content-obrecz.js', points: 'landmarks-obrecz.js', P: 'OBRECZ', groups: 'OB', script: 'tools/obrecz.py' },
];
for (const S of SETS) { S.C = await load(S.content); S.L = await load(S.points); S.order = S.C?.[`${S.P}_ORDER`] || []; }
const KEYS = new Set([...ORDER, ...DISCS, ...SETS.flatMap((S) => S.order)]);
const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const isPoint = (p) => p === null || (Array.isArray(p) && p.length === 3 && p.every((x) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 50));

/* ---------- content.js ---------- */
const C = await load('content.js');
if (C) {
  const F = 'content.js';
  for (const r of ['C', 'Th', 'L', 'S']) {
    const R = C.REGIONS?.[r];
    if (!R) { err(F, `REGIONS: brak odcinka "${r}"`); continue; }
    for (const f of ['name', 'latin', 'count', 'curve', 'text']) if (!isText(R[f])) err(F, `REGIONS.${r}: puste pole "${f}"`);
  }
  for (const k of ORDER) {
    const P = C.PARTS?.[k];
    if (!P) { err(F, `PARTS: brak opisu kręgu ${k}`); continue; }
    for (const f of ['name', 'latin', 'short', 'massage', 'muscles']) if (!isText(P[f])) err(F, `PARTS.${k}: puste pole "${f}"`);
    if (!Array.isArray(P.features) || !P.features.length || !P.features.every(isText)) err(F, `PARTS.${k}: "features" musi być listą zdań w [ … ]`);
  }
  for (const k of Object.keys(C.PARTS || {})) if (!ORDER.includes(k)) err(F, `PARTS: nieznany kręg "${k}" (literówka w kluczu?)`);
  if (!isText(C.DISC?.text) || !isText(C.DISC?.latin)) err(F, 'DISC: puste pole "text" albo "latin"');
  for (const k of Object.keys(C.DISC?.notes || {})) if (!DISCS.includes(k)) err(F, `DISC.notes: nieznany krążek "${k}"`);
  const checkLabels = (obj, path) => {
    for (const [p, d] of Object.entries(obj || {})) {
      if (!d || typeof d !== 'object') { err(F, `${path}.${p}: oczekiwano { name: …, latin: …, def: … }`); continue; }
      if ('name' in d && !isText(d.name)) err(F, `${path}.${p}: pusta nazwa`);
      if ('def' in d && !isText(d.def)) err(F, `${path}.${p}: pusty opis`);
    }
  };
  checkLabels(C.PART_LABELS, 'PART_LABELS');
  for (const [p, d] of Object.entries(C.PART_LABELS || {})) if (!isText(d?.name) || !isText(d?.def)) err(F, `PART_LABELS.${p}: każda część musi mieć "name" i "def"`);
  for (const [g, labels] of Object.entries(C.PART_LABELS_SPECIAL || {})) {
    if (!['L', 'S', 'D', ...ORDER].includes(g)) err(F, `PART_LABELS_SPECIAL: nieznana grupa "${g}"`);
    checkLabels(labels, `PART_LABELS_SPECIAL.${g}`);
  }
  // zestawy podpisów kręgów
  for (const [g, groups] of Object.entries(C.VERTEBRA_LABEL_GROUPS || {})) {
    if (g !== 'typowy' && !ORDER.includes(g)) { err(F, `VERTEBRA_LABEL_GROUPS: nieznany kręg "${g}" (dozwolone: typowy, C1…L5, S)`); continue; }
    if (!Array.isArray(groups)) { err(F, `VERTEBRA_LABEL_GROUPS.${g}: oczekiwano listy [ { name: …, parts: [ … ] }, … ]`); continue; }
    const seen = new Map();
    for (const z of groups) {
      if (!isText(z?.name) || !Array.isArray(z?.parts)) { err(F, `VERTEBRA_LABEL_GROUPS.${g}: każdy zestaw musi mieć "name" i listę "parts"`); continue; }
      for (const p of z.parts) {
        if (seen.has(p)) err(F, `VERTEBRA_LABEL_GROUPS.${g}: część "${p}" jest w dwóch zestawach („${seen.get(p)}” i „${z.name}”)`);
        seen.set(p, z.name);
      }
    }
  }
  for (const [i, l] of (C.PALPATION || []).entries()) {
    if (!ORDER.includes(l.key)) err(F, `PALPATION[${i}]: nieznany kręg "${l.key}"`);
    if (!isText(l.part) || !isText(l.label)) err(F, `PALPATION[${i}]: brak "part" albo "label"`);
  }
}

/* ---------- content-miesnie.js ---------- */
const M = await load('content-miesnie.js');
if (M) {
  const F = 'content-miesnie.js';
  const bones = new Set(Object.keys(M.CTX_BONES || {}));
  for (const [n, L] of Object.entries(M.LAYERS || {})) if (!isText(L.name) || !isText(L.short)) err(F, `LAYERS.${n}: brak "name" albo "short"`);
  for (const [k, m] of Object.entries(M.MUSCLES || {})) {
    for (const f of ['name', 'latin', 'shape', 'nerve', 'massage']) if (!isText(m[f])) err(F, `MUSCLES.${k}: puste pole "${f}"`);
    if (!M.LAYERS?.[m.layer]) err(F, `MUSCLES.${k}: nieznana warstwa ${m.layer}`);
    if (!m.parts || !Object.keys(m.parts).length) { err(F, `MUSCLES.${k}: brak części (parts)`); continue; }
    for (const [p, d] of Object.entries(m.parts)) {
      for (const f of ['name', 'latin', 'origin', 'insertion', 'action']) if (!isText(d[f])) err(F, `MUSCLES.${k}.parts.${p}: puste pole "${f}"`);
      const a = d.attach || {};
      for (const v of a.vertebrae || []) if (!ORDER.includes(v)) err(F, `MUSCLES.${k}.parts.${p}.attach: nieznany kręg "${v}"`);
      for (const b of a.bones || []) if (!bones.has(b)) err(F, `MUSCLES.${k}.parts.${p}.attach: nieznana kość "${b}" (dostępne: ${[...bones].join(', ')})`);
      for (const r of a.ribs || []) if (!Number.isInteger(r) || r < 1 || r > 12) err(F, `MUSCLES.${k}.parts.${p}.attach: zły numer żebra ${r}`);
    }
  }
}

/* ---------- zestawy kości: content-czaszka.js, content-obrecz.js i ich punkty ---------- */
for (const { C: Z, L: ZL, P, order, groups, content: F, points: FL, script } of SETS) {
  if (!Z) continue;
  for (const [g, R] of Object.entries(Z[`${P}_REGIONS`] || {})) for (const f of ['name', 'latin', 'count', 'curve', 'text']) if (!isText(R[f])) err(F, `${P}_REGIONS.${g}: puste pole "${f}"`);
  for (const k of order) {
    const B = Z[`${P}_PARTS`]?.[k];
    if (!B) { err(F, `${P}_PARTS: brak opisu kości "${k}"`); continue; }
    for (const f of ['name', 'latin', 'short', 'massage', 'muscles']) if (!isText(B[f])) err(F, `${P}_PARTS.${k}: puste pole "${f}"`);
    if (!Array.isArray(B.features) || !B.features.length || !B.features.every(isText)) err(F, `${P}_PARTS.${k}: "features" musi być listą zdań w [ … ]`);
    if (!Z[`${P}_REGIONS`]?.[Z[`${P}_GROUP`]?.[k]]) err(F, `${P}_GROUP.${k}: nieznana grupa (${groups})`);
  }
  for (const k of Object.keys(Z[`${P}_PARTS`] || {})) if (!order.includes(k)) err(F, `${P}_PARTS: kość "${k}" nie występuje w ${P}_ORDER`);
  for (const [k, labels] of Object.entries(Z[`${P}_LABELS`] || {})) {
    if (!order.includes(k)) { err(F, `${P}_LABELS: nieznana kość "${k}"`); continue; }
    for (const [p, d] of Object.entries(labels)) {
      if (!isText(d?.name) || !isText(d?.def)) err(F, `${P}_LABELS.${k}.${p}: każda część musi mieć "name" i "def"`);
      if (d?.group !== undefined && !Z[`${P}_LABEL_GROUPS`]?.[d.group]) err(F, `${P}_LABELS.${k}.${p}: nieznany zestaw podpisów "${d.group}" (dostępne: ${Object.keys(Z[`${P}_LABEL_GROUPS`] || {}).join(', ') || 'brak — dopisz ' + P + '_LABEL_GROUPS'})`);
      const pts = ZL?.[`${P}_LANDMARKS`]?.[k]?.[p];
      if (ZL && (!Array.isArray(pts) || !pts.every(isPoint))) err(FL, `brak punktu ${k}.${p} — uruchom ${script} albo dodaj punkt w trybie „Popraw punkty”`);
      else if (ZL && pts.length !== (d.pair ? 2 : 1)) err(F, `${P}_LABELS.${k}.${p}: ${d.pair ? 'część parzysta potrzebuje 2 punktów' : 'część nieparzysta potrzebuje 1 punktu'} (jest ${pts.length}) — zmień "pair" albo przelicz punkty`);
      if (d.line && ZL && !Object.keys(ZL[`${P}_LINES`] || {}).some((n) => n === d.line || n.startsWith(d.line + '_'))) err(F, `${P}_LABELS.${k}.${p}: nieznana linia "${d.line}"`);
    }
  }
  for (const [n, line] of Object.entries(ZL?.[`${P}_LINES`] || {})) if (!Array.isArray(line) || line.length < 4 || !line.every((q) => q && isPoint(q))) err(FL, `${P}_LINES.${n}: linia musi mieć postać [[x, y, z], …]`);
}

/* ---------- punkty etykiet ---------- */
const LM = await load('landmarks.js');
const RL = await load('landmarks-ribs.js');
const FX = await load('landmarks-fix.js');
const checkPoints = (file, obj, path) => {
  for (const [k, parts] of Object.entries(obj || {})) {
    if (!KEYS.has(k)) { err(file, `${path}: nieznany kręg, krążek lub kość "${k}"`); continue; }
    for (const [p, pts] of Object.entries(parts || {})) {
      if (pts === null) continue;                                  // punkt usunięty
      if (!Array.isArray(pts) || !pts.every(isPoint)) err(file, `${path}.${k}.${p}: punkty muszą mieć postać [[x, y, z], …]`);
    }
  }
};
if (LM) checkPoints('landmarks.js', LM.LANDMARKS, 'LANDMARKS');
if (RL) checkPoints('landmarks-ribs.js', RL.RIB_LANDMARKS, 'RIB_LANDMARKS');
if (FX) {
  const F = 'landmarks-fix.js';
  checkPoints(F, FX.FIXES, 'FIXES');
  for (const [k, d] of Object.entries(FX.REVIEWED || {})) {
    if (!KEYS.has(k)) err(F, `REVIEWED: nieznany kręg "${k}"`);
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) err(F, `REVIEWED.${k}: data w formacie RRRR-MM-DD`);
  }
  for (const [k, ex] of Object.entries(FX.EXTRA || {})) {
    if (!KEYS.has(k)) { err(F, `EXTRA: nieznany kręg "${k}"`); continue; }
    for (const [id, d] of Object.entries(ex || {})) {
      if (d === null) continue;
      if (!id.startsWith('x_')) err(F, `EXTRA.${k}: klucz "${id}" musi zaczynać się od x_`);
      if (!isText(d.name)) err(F, `EXTRA.${k}.${id}: brak nazwy (name)`);
      if (d.group) {
        const set = SETS.find((S) => S.order.includes(k));
        const names = set ? Object.keys(set.C?.[`${set.P}_LABEL_GROUPS`] || {}) : (C?.VERTEBRA_LABEL_GROUPS?.[k] || C?.VERTEBRA_LABEL_GROUPS?.typowy || []).map((z) => z.name);
        if (!names.includes(d.group)) err(F, `EXTRA.${k}.${id}: nieznany zestaw podpisów "${d.group}" (dostępne: ${names.join(', ') || 'brak'})`);
      }
      if (!Array.isArray(d.pts) || !d.pts.every(isPoint)) err(F, `EXTRA.${k}.${id}: "pts" musi mieć postać [[x, y, z], …]`);
      else if (!d.pts.some(Boolean)) warn(F, `EXTRA.${k}.${id}: punkt bez położenia — nie pojawi się na stronie`);
    }
  }
}

/* ---------- modele ---------- */
const SP = await load('models/pakiety/spis.js');
if (SP) {
  for (const [id, info] of Object.entries(SP.PACKS || {})) {
    const path = join(ROOT, 'models', 'pakiety', id + '.pak');
    if (!existsSync(path)) err('models/pakiety/spis.js', `brak pliku models/pakiety/${id}.pak`);
    else if (statSync(path).size !== info.bajty) err('models/pakiety/spis.js', `rozmiar ${id}.pak się nie zgadza — uruchom ponownie tools/build_packs.py`);
  }
}
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
for (const src of ['app.js', 'styles.css']) if (!html.includes(src)) err('index.html', `brak odwołania do ${src}`);
// strona nie łączy się z zewnętrznymi serwerami (prywatność, praca bez internetu)
for (const m of html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)) err('index.html', `zewnętrzny zasób ${m[1]} — pliki strony powinny być w repozytorium`);
for (const f of ['fonts/fonts.css', ...[...readFileSync(join(ROOT, 'fonts', 'fonts.css'), 'utf8').matchAll(/url\(([^)]+)\)/g)].map((m) => 'fonts/' + m[1])]) {
  if (!existsSync(join(ROOT, f))) err('fonts/fonts.css', `brak pliku ${f}`);
}

/* ---------- praca bez internetu (sw.js) i aplikacja ---------- */
{
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const list = (name) => {
    const m = sw.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
    return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : null;
  };
  const strony = list('PLIKI_STRONY'), stale = list('PLIKI_STALE');
  if (!strony || !stale) err('sw.js', 'nie znaleziono list PLIKI_STRONY / PLIKI_STALE');
  else {
    const all = new Set([...strony, ...stale]);
    for (const f of all) if (f !== './' && !existsSync(join(ROOT, f))) err('sw.js', `na liście jest ${f}, ale takiego pliku nie ma`);
    const wanted = ['app.js', 'index.html', 'styles.css', 'content.js', 'content-miesnie.js', 'landmarks.js', 'landmarks-ribs.js', 'landmarks-fix.js', 'models/pakiety/spis.js',
      ...SETS.flatMap((S) => [S.content, S.points]),
      ...readdirSync(join(ROOT, 'js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f)];
    for (const f of wanted) if (!all.has(f)) err('sw.js', `brak ${f} na liście PLIKI_STRONY — bez tego strona nie zadziała offline`);
  }
  const man = JSON.parse(readFileSync(join(ROOT, 'manifest.webmanifest'), 'utf8'));
  for (const ic of man.icons || []) if (!existsSync(join(ROOT, ic.src))) err('manifest.webmanifest', `brak ikony ${ic.src}`);
  const og = html.match(/property="og:image" content="[^"]*\/([^"/]+)"/);
  if (og && !existsSync(join(ROOT, og[1]))) err('index.html', `brak obrazka podglądu linku ${og[1]}`);
}

/* ---------- wynik ---------- */
for (const w of warnings) console.log('Uwaga  ' + w);
if (errors.length) {
  console.log(`\nZnalezione błędy (${errors.length}):`);
  for (const e of errors) console.log('  ✗ ' + e);
  process.exit(1);
}
console.log('✓ Treści i dane w porządku.');
