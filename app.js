import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { REGIONS, PARTS, DISC } from './content.js';

const ORDER = ['C1','C2','C3','C4','C5','C6','C7',
  'Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12',
  'L1','L2','L3','L4','L5','S'];
const REGION_KEYS = ['C', 'Th', 'L', 'S'];
const regionOf = (key) => {
  const k = key.startsWith('D_') ? key.slice(2) : key;
  return k.startsWith('Th') ? 'Th' : k[0];
};
const discLabel = (key) => {
  const k = key.slice(2);
  const next = ORDER[ORDER.indexOf(k) + 1];
  return `${k}/${next === 'S' ? 'S1' : next}`;
};

const $ = (s) => document.querySelector(s);
const stageEl = $('#stage');
const panelEl = $('#panel');
const rulerEl = $('#ruler');
const bigcodeEl = $('#bigcode');

/* ---------- Theme colors ---------- */
let COLORS = {};
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const dark = cs.colorScheme.includes('dark');
  COLORS = {
    C: new THREE.Color(cs.getPropertyValue('--c').trim()),
    Th: new THREE.Color(cs.getPropertyValue('--th').trim()),
    L: new THREE.Color(cs.getPropertyValue('--l').trim()),
    S: new THREE.Color(cs.getPropertyValue('--s').trim()),
    focus: new THREE.Color(cs.getPropertyValue('--focus').trim()),
    bone: new THREE.Color(dark ? '#d9d2c4' : '#ebe5d8'),
    disc: new THREE.Color(dark ? '#7f99ad' : '#a8bccb'),
  };
  for (const r of REGION_KEYS) document.documentElement.style.setProperty(`--rc-${r}`, cs.getPropertyValue(`--${r.toLowerCase()}`));
}

/* ---------- State ---------- */
const state = {
  mode: 'atlas',          // 'atlas' | 'quiz'
  selected: 'C7',
  hovered: null,
  showDiscs: true,
  tint: false,
  isolate: false,
  quiz: null,
};

/* ---------- Ruler ---------- */
function buildRuler() {
  const groups = { C: [], Th: [], L: [], S: [] };
  ORDER.forEach((k) => groups[regionOf(k)].push(k));
  rulerEl.innerHTML = '';
  for (const r of REGION_KEYS) {
    const g = document.createElement('div');
    g.className = 'group';
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
function syncRuler() {
  rulerEl.querySelectorAll('button').forEach((b) => {
    const k = b.id.slice(2);
    b.setAttribute('aria-current', String(state.mode === 'atlas' && k === state.selected));
  });
  const cur = rulerEl.querySelector('[aria-current="true"]');
  if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/* ---------- Three.js scene ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
stageEl.prepend(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(3, 6, 4);
scene.add(key);
const rim = new THREE.DirectionalLight(0xffffff, 0.6);
rim.position.set(-4, 2, -5);
scene.add(rim);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f8c, 0.5));

const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.6;
controls.maxDistance = 30;

const parts = {};   // key -> mesh
const root = new THREE.Group();
scene.add(root);

function resize() {
  const r = stageEl.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / Math.max(r.height, 1);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stageEl);

/* ---------- Camera framing ---------- */
const VIEWS = {
  side:  new THREE.Vector3(1, 0.08, 0),
  front: new THREE.Vector3(0, 0.08, 1),
  back:  new THREE.Vector3(0, 0.08, -1),
  three: new THREE.Vector3(0.85, 0.12, -0.55),
};
let tween = null;
function boxOf(keys) {
  const box = new THREE.Box3();
  keys.forEach((k) => parts[k] && box.expandByObject(parts[k]));
  return box;
}
function frame(keys, dir) {
  const box = boxOf(keys);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const fitH = size.y / (2 * Math.tan(fov / 2));
  const fitW = Math.max(size.x, size.z) / (2 * Math.tan(fov / 2) * camera.aspect);
  const dist = Math.max(fitH, fitW) * 1.1 + Math.max(size.x, size.z) * 0.35;
  const d = (dir || camera.position.clone().sub(controls.target)).clone().normalize();
  const toPos = center.clone().add(d.multiplyScalar(dist));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  tween = { t: reduce ? 1 : 0, fromPos: camera.position.clone(), toPos, fromT: controls.target.clone(), toT: center };
}
function stepTween(dt) {
  if (!tween) return;
  tween.t = Math.min(1, tween.t + dt / 0.7);
  const e = 1 - Math.pow(1 - tween.t, 3);
  camera.position.lerpVectors(tween.fromPos, tween.toPos, e);
  controls.target.lerpVectors(tween.fromT, tween.toT, e);
  if (tween.t >= 1) tween = null;
}
const neighbors = (k, n) => {
  const i = ORDER.indexOf(k);
  return ORDER.slice(Math.max(0, i - n), i + n + 1);
};

/* ---------- Materials ---------- */
const tmp = new THREE.Color();
function paint() {
  const sel = state.mode === 'quiz' ? state.quiz?.target : state.selected;
  for (const [k, m] of Object.entries(parts)) {
    const isDisc = k.startsWith('D_');
    const reg = regionOf(k);
    const base = isDisc ? COLORS.disc : COLORS.bone;
    tmp.copy(base);
    if (state.tint && state.mode === 'atlas') tmp.lerp(COLORS[reg], isDisc ? 0.15 : 0.38);
    const isSel = k === sel;
    if (isSel) tmp.copy(state.mode === 'quiz' ? COLORS.focus : COLORS[reg]);
    m.material.color.copy(tmp);
    m.material.emissive.copy(k === state.hovered && !isSel ? COLORS[reg] : new THREE.Color(0));
    m.material.emissiveIntensity = 0.18;
    m.visible = !isDisc || state.showDiscs;
    const faded = state.isolate && state.mode === 'atlas' && !isSel;
    m.material.transparent = faded;
    m.material.opacity = faded ? 0.09 : 1;
    m.material.depthWrite = !faded;
  }
}

/* ---------- Panel rendering ---------- */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function metaBlock(fma) {
  return `<div class="meta">
    ${fma ? `<div>Model: <code>${fma}</code> · BodyParts3D</div>` : ''}
    <div>Modele 3D: <a href="https://doi.org/10.18908/lsdba.nbdc00837-000" target="_blank" rel="noopener">BodyParts3D</a>, © The Database Center for Life Science, licencja <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en" target="_blank" rel="noopener">CC BY-SA 2.1 JP</a>. Przetworzone (konwersja formatu, układ współrzędnych, kompresja).</div>
    <div>Opisy: wersja robocza do weryfikacji przez nauczyciela.</div>
  </div>`;
}
function renderPart(k) {
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
      ${note ? `<div class="note"><h3>Warto wiedzieć</h3><p>${esc(note)}</p></div>` : ''}
      ${metaBlock(fma)}`;
    return;
  }
  const P = PARTS[k];
  bigcodeEl.textContent = P.short === 'S1–S5' ? 'S' : P.short;
  panelEl.innerHTML = `
    <div>
      <div class="eyebrow"><span>${esc(R.name)}</span><span>·</span><span>${esc(R.curve)}</span></div>
      <h2>${esc(P.name)}</h2>
      <p class="latin">${esc(P.latin)} · ${esc(P.short)}</p>
    </div>
    <div><h3>Cechy</h3><ul>${P.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>
    <div class="note"><h3>Dla masażysty</h3><p>${esc(P.massage)}</p></div>
    <div><h3>Przyczepy mięśni (wybrane)</h3><p>${esc(P.muscles)}</p></div>
    <div><h3>${esc(R.name)} · ${esc(R.count)}</h3><p class="region-text">${esc(R.text)}</p></div>
    ${metaBlock(fma)}`;
}

function select(k, doFrame) {
  if (state.mode !== 'atlas') return;
  state.selected = k;
  renderPart(k);
  syncRuler();
  paint();
  if (doFrame) {
    const keys = k.startsWith('D_') ? [k.slice(2)] : [k];
    frame(state.isolate ? keys : neighbors(keys[0], 3));
  }
  try { history.replaceState(null, '', `#${k}`); } catch (e) { /* ignore */ }
}

/* ---------- Quiz ---------- */
function newQuestion() {
  const q = state.quiz;
  const target = ORDER[Math.floor(Math.random() * ORDER.length)];
  const i = ORDER.indexOf(target);
  const pool = ORDER.filter((k) => k !== target && Math.abs(ORDER.indexOf(k) - i) <= 4);
  const opts = [target];
  while (opts.length < 4 && pool.length) opts.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  opts.sort(() => Math.random() - 0.5);
  Object.assign(q, { target, opts, answered: false });
  bigcodeEl.textContent = '?';
  document.documentElement.style.setProperty('--rc', 'var(--ink)');
  panelEl.style.setProperty('--rc', 'var(--focus)');
  panelEl.innerHTML = `
    <div>
      <div class="eyebrow"><span>Quiz</span><span>·</span><span class="score">Wynik ${q.good}/${q.total}</span></div>
      <p class="quiz-q">Który to kręg? Jest podświetlony na modelu.</p>
    </div>
    <div class="answers">${opts.map((k) => `<button type="button" data-k="${k}"><span>${esc(PARTS[k].name)}</span><span class="code">${PARTS[k].short}</span></button>`).join('')}</div>
    <p class="feedback" id="feedback" aria-live="polite">Obracaj model, aby lepiej się przyjrzeć. Liczy się pierwsza odpowiedź.</p>
    <button type="button" class="btn" id="next" hidden>Następne pytanie</button>
    ${metaBlock()}`;
  panelEl.querySelectorAll('.answers button').forEach((b) => b.addEventListener('click', () => answer(b.dataset.k)));
  $('#next').addEventListener('click', newQuestion);
  paint();
  frame(neighbors(target, 3), VIEWS.three);
}
function answer(k) {
  const q = state.quiz;
  if (q.answered) return;
  q.answered = true;
  q.total++;
  const ok = k === q.target;
  if (ok) q.good++;
  panelEl.querySelectorAll('.answers button').forEach((b) => {
    b.disabled = true;
    if (b.dataset.k === q.target) b.classList.add('ok');
    else if (b.dataset.k === k) b.classList.add('bad');
  });
  const P = PARTS[q.target];
  $('#feedback').innerHTML = `${ok ? '<strong>Dobrze.</strong>' : '<strong>Nie tym razem.</strong>'} To ${esc(P.name)} (${P.short}). ${esc(P.massage)}`;
  panelEl.querySelector('.score').textContent = `Wynik ${q.good}/${q.total}`;
  bigcodeEl.textContent = P.short === 'S1–S5' ? 'S' : P.short;
  $('#next').hidden = false;
  $('#next').focus();
}
function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.modes button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  rulerEl.style.opacity = mode === 'quiz' ? '.35' : '';
  rulerEl.style.pointerEvents = mode === 'quiz' ? 'none' : '';
  rulerEl.toggleAttribute('inert', mode === 'quiz');
  $('#isolate').disabled = mode === 'quiz';
  if (mode === 'quiz') {
    state.quiz = state.quiz || { good: 0, total: 0 };
    newQuestion();
  } else {
    select(state.selected, true);
  }
  syncRuler();
}

/* ---------- Picking ---------- */
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let downAt = null;
function pick(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(Object.values(parts).filter((m) => m.visible && m.material.opacity > 0.5), false);
  return hits[0]?.object.name || null;
}
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  const k = pick(e);
  if (k && state.mode === 'atlas') select(k, false);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons) return;
  const k = state.mode === 'atlas' ? pick(e) : null;
  if (k !== state.hovered) {
    state.hovered = k;
    renderer.domElement.style.cursor = k ? 'pointer' : '';
    paint();
  }
});

/* ---------- Toolbar ---------- */
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  const v = b.dataset.view;
  if (v === 'all') frame(ORDER, VIEWS.side);
  else frame(state.isolate && state.mode === 'atlas' ? [state.selected.replace('D_', '')] : ORDER, VIEWS[v]);
}));
function toggle(id, prop) {
  const b = $(id);
  b.addEventListener('click', () => {
    state[prop] = !state[prop];
    b.setAttribute('aria-pressed', String(state[prop]));
    if (prop === 'isolate') select(state.selected, true);
    paint();
  });
}
toggle('#discs', 'showDiscs');
toggle('#tint', 'tint');
toggle('#isolate', 'isolate');
document.querySelectorAll('.modes button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

window.addEventListener('keydown', (e) => {
  if (state.mode !== 'atlas' || e.target.closest('input, textarea')) return;
  const k = state.selected.replace('D_', '');
  const i = ORDER.indexOf(k);
  if (e.key === 'ArrowDown' && i < ORDER.length - 1) { e.preventDefault(); select(ORDER[i + 1], true); }
  if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); select(ORDER[i - 1], true); }
});

/* ---------- Theme reactivity ---------- */
const reTheme = () => { readColors(); paint(); };
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', reTheme);
new MutationObserver(reTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

/* ---------- Load ---------- */
readColors();
buildRuler();
renderPart(state.selected);
syncRuler();
resize();
camera.position.set(9, 0.8, -5);

const bar = $('#loadbar');
function onModel(gltf) {
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    o.material = new THREE.MeshStandardMaterial({
      roughness: o.name.startsWith('D_') ? 0.55 : 0.82,
      metalness: 0,
    });
    parts[o.name] = o;
  });
  root.add(gltf.scene);
  $('#loader').hidden = true;
  const hash = decodeURIComponent(location.hash.slice(1));
  if (parts[hash]) state.selected = hash;
  renderPart(state.selected);
  syncRuler();
  paint();
  frame(ORDER, VIEWS.three);
  tween.t = 1;
  stepTween(0);
}
function onError(err) {
  $('#loader').innerHTML = `<div>Nie udało się wczytać modelu. Odśwież stronę.<br><small>${esc(err?.message || err)}</small></div>`;
}
const loader = new GLTFLoader();
// Domyślnie plik GLB. Wersja podglądu może podać model zakodowany base64 (window.ATLAS_MODEL_B64).
if (window.ATLAS_MODEL_B64) {
  fetch(window.ATLAS_MODEL_B64).then((r) => r.text()).then((t) => {
    bar.style.width = '70%';
    const bin = Uint8Array.from(atob(t.trim()), (c) => c.charCodeAt(0));
    loader.parse(bin.buffer, '', onModel, onError);
  }).catch(onError);
} else {
  loader.load('models/kregoslup.glb', onModel, (ev) => {
    if (ev.total) bar.style.width = `${Math.round((ev.loaded / ev.total) * 100)}%`;
  }, onError);
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  stepTween(clock.getDelta());
  controls.update();
  renderer.render(scene, camera);
});
