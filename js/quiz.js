// Quiz: rodzaje pytań, odpowiedzi i wynik.
import * as THREE from 'three';
import * as MUS from './miesnie.js';
import { HIDDEN_BONES, isSetBone } from './zestawy.js';
import { PARTS } from './tresci.js';
import { paint } from './malowanie.js';
import { boneDir, updateLoader } from './moduly.js';
import { updateLod } from './paczki.js';
import { esc, metaBlock } from './panel.js';
import { lm, partDef } from './punkty.js';
import { $, MODULES, ORDER, bigcodeEl, boneSetMode, modKeys, muscleMode, panelEl, single, state } from './stan.js';
import { VIEWS, boxOf, closeFrame, frame, frameWhenReady, neighbors, view } from './widok.js';

/* ---------- Quiz ---------- */
// Rodzaje pytań zależą od modułu: kręgi, zestaw kości albo mięśnie (moduł może je zawęzić polem quiz, np. łopatka i obojczyk
// to za mało kości na „Która kość?” z czterema odpowiedziami)
export const QUIZ_TYPES = {
  bones: [['kreg', 'Który kręg?'], ['czesc', 'Która część?']],
  set: [['kosc', 'Która kość?'], ['czesc', 'Która część?']],
  muscles: [['miesien', 'Który mięsień?'], ['przyczepy', 'Czyje przyczepy?']],
};
export const quizKind = () => (muscleMode() ? 'muscles' : boneSetMode() ? 'set' : 'bones');
export const quizTypes = () => {
  const only = MODULES[state.module]?.quiz;
  return QUIZ_TYPES[quizKind()].filter(([t]) => !only || only.includes(t));
};
const whichBone = (t) => t === 'kreg' || t === 'kosc';
export const pickRand = (a) => a[Math.floor(Math.random() * a.length)];
export const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// części kręgu z punktem i nazwą (bez części żeber), do pytań „Która część?”
export function quizPartsOf(k) {
  const L = lm(k);
  const seen = new Set();
  return Object.keys(L).filter((p) => {
    const name = partDef(k, p)?.name;
    if (p.startsWith('rib_') || !name || !L[p].some(Boolean) || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}
export const quizType = () => state.quiz?.type;
export function newQuestion() {
  const q = state.quiz;
  const types = quizTypes();
  if (!types.some(([t]) => t === q.type)) { q.type = types[0][0]; q.good = 0; q.total = 0; }
  let target, opts, part = null, point = null;
  if (whichBone(q.type)) {
    const keys = modKeys();
    target = pickRand(keys.filter((k) => !HIDDEN_BONES.has(k)));
    const i = keys.indexOf(target);
    const pool = keys.filter((k) => k !== target && Math.abs(keys.indexOf(k) - i) <= 4);
    opts = [target];
    while (opts.length < 4 && pool.length) opts.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    shuffle(opts);
  } else if (q.type === 'czesc') {
    const keys = modKeys().filter((k) => quizPartsOf(k).length >= 4);
    target = pickRand(keys);
    const ps = quizPartsOf(target);
    part = pickRand(ps);
    point = pickRand(lm(target)[part].filter(Boolean));      // część parzysta: raz lewa, raz prawa
    opts = shuffle([part, ...shuffle(ps.filter((p) => p !== part)).slice(0, 3)]);
  } else {
    // mięśnie z włączonych warstw (gdy jest ich za mało — ze wszystkich)
    let pool = MUS.MUSCLE_KEYS.filter((k) => state.layers[MUS.MUSCLES[k].layer]);
    if (pool.length < 4) pool = MUS.MUSCLE_KEYS.slice();
    target = pickRand(pool);
    opts = shuffle([target, ...shuffle(MUS.MUSCLE_KEYS.filter((k) => k !== target)).slice(0, 3)]);
  }
  Object.assign(q, { target, opts, part, point, answered: false });
  renderQuiz();
  updateLod();
  paint();
  updateLoader();
  if (q.type === 'czesc') frameWhenReady(target, () => framePoint(target, point));
  else if (q.type === 'miesien') frameWhenReady(target, () => frame([target], VIEWS.back, 1.35));
  else if (q.type === 'przyczepy') { view.pendingFrame = null; frame([...modKeys(), ...ORDER], VIEWS.back, 1.12); }
  else if (boneSetMode()) { view.pendingFrame = null; frame(modKeys(), boneDir(target), 1.05); }
  else if (single()) frameWhenReady(target, () => closeFrame(target, VIEWS.three));
  else { view.pendingFrame = null; frame(neighbors(target, 3), VIEWS.three); }
}
// kamera po tej stronie kręgu, po której leży zaznaczony punkt
export function framePoint(k, p) {
  const box = boxOf([k]);
  const c = box.getCenter(new THREE.Vector3());
  const v = new THREE.Vector3(...p).sub(c);
  const dir = v.length() < 0.05 ? VIEWS.three : v.normalize().add(new THREE.Vector3(0, 0.35, 0)).normalize();
  closeFrame(k, dir);
}
export function quizOption(k) {
  const q = state.quiz;
  if (q.type === 'czesc') { const d = partDef(q.target, k); return [d?.name || k, d?.latin || '']; }
  if (whichBone(q.type)) return [PARTS[k].name, PARTS[k].short];
  const M = MUS.MUSCLES[k];
  return [M.name, `W${M.layer}`];
}
export function renderQuiz() {
  const q = state.quiz;
  bigcodeEl.textContent = '?';
  document.documentElement.style.setProperty('--rc', 'var(--ink)');
  panelEl.style.setProperty('--rc', 'var(--focus)');
  const question = {
    kreg: single() ? 'Który to kręg? Rozpoznaj go po kształcie.' : 'Który to kręg? Jest podświetlony na modelu.',
    kosc: 'Która to kość? Jest podświetlona na modelu.',
    czesc: `Jak nazywa się zaznaczona część? To ${q.target ? esc(PARTS[q.target]?.name.toLowerCase() || '') : ''} (${esc(PARTS[q.target]?.short || '')}).`,
    miesien: 'Który mięsień jest podświetlony?',
    przyczepy: 'Na kościach świecą przyczepy jednego mięśnia. Który to mięsień?',
  }[q.type];
  panelEl.innerHTML = `
    <div>
      <div class="eyebrow"><span>Quiz</span><span>·</span><span class="score">Wynik ${q.good}/${q.total}</span></div>
      <div class="qtypes" role="group" aria-label="Rodzaj pytań">${quizTypes().map(([t, label]) => `<button type="button" data-qt="${t}" aria-pressed="${t === q.type}">${label}</button>`).join('')}</div>
      <p class="quiz-q">${question}</p>
    </div>
    <div class="answers">${q.opts.map((k) => { const [a, b] = quizOption(k); return `<button type="button" data-k="${k}"><span>${esc(a)}</span><span class="code">${esc(b)}</span></button>`; }).join('')}</div>
    <p class="feedback" id="feedback" aria-live="polite">Obracaj model, aby lepiej się przyjrzeć. Liczy się pierwsza odpowiedź.</p>
    <button type="button" class="btn" id="next" hidden>Następne pytanie</button>
    ${metaBlock()}`;
  panelEl.querySelectorAll('.answers button').forEach((b) => b.addEventListener('click', () => answer(b.dataset.k)));
  panelEl.querySelectorAll('[data-qt]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.qt === q.type) return;
    Object.assign(q, { type: b.dataset.qt, good: 0, total: 0 });
    newQuestion();
  }));
  $('#next').addEventListener('click', newQuestion);
}
export function answer(k) {
  const q = state.quiz;
  if (q.answered) return;
  q.answered = true;
  q.total++;
  const right = q.type === 'czesc' ? q.part : q.target;
  const ok = k === right;
  if (ok) q.good++;
  panelEl.querySelectorAll('.answers button').forEach((b) => {
    b.disabled = true;
    if (b.dataset.k === right) b.classList.add('ok');
    else if (b.dataset.k === k) b.classList.add('bad');
  });
  const head = ok ? '<strong>Dobrze.</strong>' : '<strong>Nie tym razem.</strong>';
  let text;
  if (whichBone(q.type)) {
    const P = PARTS[q.target];
    text = `To ${esc(P.name.toLowerCase())} (${esc(P.short)}). ${esc(P.massage)}`;
    bigcodeEl.textContent = isSetBone(q.target) ? '' : P.short === 'S1–S5' ? 'S' : P.short;
  } else if (q.type === 'czesc') {
    const d = partDef(q.target, q.part);
    text = `To ${esc(d.name.toLowerCase())}${d.latin ? ` (${esc(d.latin)})` : ''}. ${esc(d.def || '')}`;
  } else {
    const M = MUS.MUSCLES[q.target];
    const att = MUS.attachSet(q.target);
    const where = [att.vertebrae.size ? `kręgi ${MUS.rangeText([...att.vertebrae])}` : '', ...[...att.bones].map((b) => MUS.CTX_BONES[b]?.toLowerCase()), att.ribs.size ? `żebra ${Math.min(...att.ribs)}–${Math.max(...att.ribs)}` : ''].filter(Boolean);
    text = `To ${esc(M.name.toLowerCase())} (${esc(MUS.LAYERS[M.layer].name.toLowerCase())}). Przyczepy: ${esc(where.join(', '))}.`;
  }
  $('#feedback').innerHTML = `${head} ${text}`;
  panelEl.querySelector('.score').textContent = `Wynik ${q.good}/${q.total}`;
  $('#next').hidden = false;
  $('#next').focus();
  paint();            // po odpowiedzi: nazwa punktu, mięsień i jego przyczepy
}
