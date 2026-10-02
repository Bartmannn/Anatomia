// Sprawdzenie plików z treściami i danymi (bez instalowania czegokolwiek, wystarczy Node.js 18+).
//
// Użycie:  node tools/check_content.mjs
//
// Wyłapuje błędy, które psują stronę albo jej fragment: zgubiony cudzysłów lub przecinek w content.js,
// brakujące pola (nazwa, opis), literówkę w kluczu kręgu, punkt bez współrzędnych, brakujący plik modelu.
// Uruchamia się też automatycznie na GitHubie przy każdej zmianie (.github/workflows/testy.yml).
import { readFileSync, existsSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
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
const KEYS = new Set([...ORDER, ...DISCS]);
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

/* ---------- punkty etykiet ---------- */
const LM = await load('landmarks.js');
const RL = await load('landmarks-ribs.js');
const FX = await load('landmarks-fix.js');
const checkPoints = (file, obj, path) => {
  for (const [k, parts] of Object.entries(obj || {})) {
    if (!KEYS.has(k)) { err(file, `${path}: nieznany kręg lub krążek "${k}"`); continue; }
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

/* ---------- wynik ---------- */
for (const w of warnings) console.log('Uwaga  ' + w);
if (errors.length) {
  console.log(`\nZnalezione błędy (${errors.length}):`);
  for (const e of errors) console.log('  ✗ ' + e);
  process.exit(1);
}
console.log('✓ Treści i dane w porządku.');
