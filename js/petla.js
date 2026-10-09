// Pętla rysowania: rysowanie na żądanie, rozdzielczość zależna od ruchu, płynne przybliżanie, licznik #debug (też przełącznik dokładnych modeli).
import * as THREE from 'three';
import { firstProxyHit, processHover, ptr, ray } from './celowanie.js';
import { layoutLabels, occl } from './etykiety.js';
import { setQuality } from './malowanie.js';
import { setFullDetail } from './moduly.js';
import { scheduleLod, wantHigh } from './paczki.js';
import { DEBUG, ctxMeshes, muscleMeshes, parts, ribMeshes, stageEl, state } from './stan.js';
import { LEVELS, R, applyRatio, camera, controls, invalidate, perf, renderer, scene, stepTween, view } from './widok.js';

/* ---------- Obniżona rozdzielczość bez przebudowy płótna ---------- */
// Poziomy 75% i 50% rysujemy do mniejszych buforów pośrednich i rozciągamy na ekran jednym prostokątem.
// Płótno zachowuje rozmiar, więc szybkie przełączanie poziomów nie powoduje kosztownej przebudowy bufora ekranu.
export const lowRT = [null, null, null];
export const blitScene = new THREE.Scene();
export const blitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
// NoBlending: bufor pośredni ma już kolory pomnożone przez alfę, tak jak oczekuje płótno
export const blitMat = new THREE.MeshBasicMaterial({ blending: THREE.NoBlending, depthTest: false, depthWrite: false });
blitScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMat));
export const _buf = new THREE.Vector2();
export function renderFrame() {
  const scale = LEVELS[perf.lvl];
  if (scale >= 0.999) {
    renderer.render(scene, camera);
    perf.tris = renderer.info.render.triangles; perf.calls = renderer.info.render.calls;
    return;
  }
  renderer.getDrawingBufferSize(_buf);
  const w = Math.max(1, Math.round(_buf.x * scale)), h = Math.max(1, Math.round(_buf.y * scale));
  let rt = lowRT[perf.lvl];
  if (!rt) rt = lowRT[perf.lvl] = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType });
  else if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  perf.tris = renderer.info.render.triangles; perf.calls = renderer.info.render.calls;
  renderer.setRenderTarget(null);
  blitMat.map = rt.texture;
  renderer.render(blitScene, blitCam);
}

/* ---------- Płynne przybliżanie kółkiem ---------- */
// OrbitControls przybliża kółkiem skokami (ok. 5% na „ząbek”), co wygląda jak klatkowanie.
// Przejmujemy kółko i dochodzimy do docelowej odległości płynnie; gest szczypania na telefonie zostaje bez zmian.
export function onWheel(e) {
  e.preventDefault();
  e.stopImmediatePropagation();
  const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
  const cur = view.zoomTarget ?? camera.position.distanceTo(controls.target);
  view.zoomTarget = THREE.MathUtils.clamp(cur * Math.exp(px * 0.0012), controls.minDistance, controls.maxDistance);
  view.tween = null;
  invalidate();
}
export const _dir = new THREE.Vector3();
export function stepZoom(dt) {
  if (view.zoomTarget === null) return false;
  const cur = camera.position.distanceTo(controls.target);
  const next = cur + (view.zoomTarget - cur) * (1 - Math.exp(-dt * 14));
  _dir.copy(camera.position).sub(controls.target).normalize();
  camera.position.copy(controls.target).addScaledVector(_dir, next);
  if (Math.abs(next - view.zoomTarget) < view.zoomTarget * 0.002) view.zoomTarget = null;
  return true;
}

/* ---------- Pętla: rysowanie na żądanie + rozdzielczość zależna od ruchu ---------- */
export const prevQ = new THREE.Quaternion();
export const prevP = new THREE.Vector3();
export function motionSpeed(dt) {
  // prędkość kątowa kamery + względna zmiana położenia (przesuwanie, przybliżanie) na sekundę
  const ang = prevQ.angleTo(camera.quaternion);
  const lin = prevP.distanceTo(camera.position) / Math.max(camera.position.distanceTo(controls.target), 1e-3);
  prevQ.copy(camera.quaternion);
  prevP.copy(camera.position);
  return (ang + lin * 0.6) / Math.max(dt, 1e-3);
}
export function updateResolution(now, speed, dt, rendered) {
  // 1) poziom z prędkości: w dół od razu, w górę dopiero po 150 ms spokoju (histereza)
  const target = speed > 3 ? 2 : speed > 0.8 ? 1 : 0;
  if (target > perf.lvl) { perf.lvl = target; perf.lowerSince = 0; perf.loweredAt = now; }
  else if (target < perf.lvl) {
    if (!perf.lowerSince) perf.lowerSince = now;
    else if (now - perf.lowerSince > 150 && now - perf.loweredAt > 300) { perf.lvl = target; perf.lowerSince = 0; }
  } else perf.lowerSince = 0;
  // 2) pułap z wydajności: mierzony tylko wtedy, gdy rysujemy klatka po klatce
  if (rendered && speed > 0.05) {
    perf.emaDt = perf.emaDt * 0.9 + dt * 1000 * 0.1;
    if (perf.emaDt > 24) {
      if (!perf.slowSince) perf.slowSince = now;
      else if (now - perf.slowSince > 1000) {
        perf.cap = Math.max(0.6, perf.cap * 0.85); perf.slowSince = 0;
        if (perf.cap <= 0.61 && perf.quality === 'high') setQuality('fast');   // dalej za wolno → tańszy materiał
      }
    } else perf.slowSince = 0;
    if (perf.emaDt < 15) {
      if (!perf.fastSince) perf.fastSince = now;
      else if (now - perf.fastSince > 3000) { perf.cap = Math.min(1, perf.cap / 0.85); perf.fastSince = 0; }
    } else perf.fastSince = 0;
  }
  applyRatio(Math.max(0.5, perf.base * LEVELS[perf.lvl] * perf.cap));
}

export const clock = new THREE.Clock();
export function initLoop() {
renderer.domElement.addEventListener('wheel', onWheel, { capture: true, passive: false });
if (DEBUG) initDebugTools();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t0 = performance.now();
  if (view.tween) { stepTween(dt); R.needsRender = true; }
  if (stepZoom(dt)) R.needsRender = true;
  if (controls.update()) R.needsRender = true;     // zwraca true, dopóki kamera się rusza (też bezwładność)
  processHover();
  const speed = motionSpeed(dt);
  perf.speed = speed;
  if (speed > 0.05) { perf.lastMove = t0; perf.settled = false; }
  else if (!perf.settled && t0 - perf.lastMove > 150) {
    perf.settled = true;     // kamera stanęła: jedna ostra klatka z aktualnym zasłanianiem etykiet
    occl.clear();
    R.needsRender = true;
    scheduleLod();           // i sprawdzenie, które kręgi są na tyle duże, żeby pobrać pełne siatki
  }
  const rendered = R.needsRender;
  updateResolution(t0, speed, dt, rendered);
  if (R.needsRender) {
    R.needsRender = false;
    const r0 = performance.now();
    renderFrame();
    const r1 = performance.now();
    layoutLabels();
    perf.renderMs = perf.renderMs * 0.8 + (r1 - r0) * 0.2;
    perf.renders++;
    perf.jsMs = perf.jsMs * 0.8 + (performance.now() - t0 - (r1 - r0)) * 0.2;
  }
  perf.frames++;
  if (DEBUG) updateDebug();
});
}

/* ---------- Licznik #debug ---------- */
export let dbgEl = null, dbgAt = 0, dbgR = 0, dbgF = 0;
export function updateDebug(force = false) {
  if (!DEBUG) return;
  const now = performance.now();
  if (!force && now - dbgAt < 500) return;
  if (!dbgEl) {
    dbgEl = document.createElement('div');
    dbgEl.id = 'dbg';
    dbgEl.className = 'dbg';
    stageEl.appendChild(dbgEl);
    dbgEl.addEventListener('click', (e) => {
      if (e.target.dataset.q) setQuality(e.target.dataset.q);
      if (e.target.dataset.full) setFullDetail(e.target.dataset.full === '1');
    });
  }
  const sec = Math.max((now - dbgAt) / 1000, 0.001);
  const fps = (perf.renders - dbgR) / sec, loop = (perf.frames - dbgF) / sec;
  dbgAt = now; dbgR = perf.renders; dbgF = perf.frames;
  const fullTris = Object.values(parts).concat(ribMeshes, muscleMeshes, ctxMeshes).filter((m) => m.visible).reduce((a, m) => a + (m.geometry.index?.count || 0) / 3, 0);
  dbgEl.innerHTML = `<b>${fps.toFixed(0)}</b> kl./s rysowane · pętla ${loop.toFixed(0)}/s<br>
    render ${perf.renderMs.toFixed(1)} ms · JS ${perf.jsMs.toFixed(1)} ms<br>
    trójkąty ${((perf.tris || 0) / 1000).toFixed(0)} tys. (widoczne ${(fullTris / 1000).toFixed(0)} tys.) · wywołania ${perf.calls || 0}<br>
    rozdz. ${(perf.current * LEVELS[perf.lvl]).toFixed(2)}× (poziom ${Math.round(LEVELS[perf.lvl] * 100)}%, pułap ${Math.round(perf.cap * 100)}%) · prędkość ${perf.speed.toFixed(2)}<br>
    celowanie: ${((perf.proxyTris || 0) / 1000).toFixed(0)} tys. tr. zamiast pełnych<br>
    jakość: <button type="button" data-q="high" aria-pressed="${perf.quality === 'high'}">wysoka</button> <button type="button" data-q="fast" aria-pressed="${perf.quality === 'fast'}">szybka</button><br>
    modele: <button type="button" data-full="1" aria-pressed="${state.fullDetail}">dokładne</button> <button type="button" data-full="0" aria-pressed="${!state.fullDetail}">automatycznie</button> · pełnych siatek ${wantHigh.size}`;
}
export function initDebugTools() {
  window.__atlasPerf = perf; window.__atlasCam = camera;
  window.__atlasPick = (x, y) => { const r = renderer.domElement.getBoundingClientRect(); ptr.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera); return firstProxyHit(ray, false)?.object.userData.target.name; };
  // porównanie: N promieni przez pełne siatki vs uproszczone bryły
  window.__atlasBench = (N = 200) => {
    const rc = new THREE.Raycaster();
    const full = [...Object.values(parts), ...ribMeshes.filter((m) => m.userData.kind === 'rib')].filter((m) => m.visible);
    const prox = full.map((m) => m.userData.proxy).filter(Boolean);
    const dirs = Array.from({ length: N }, () => new THREE.Vector2(Math.random() * 1.2 - 0.6, Math.random() * 1.6 - 0.8));
    const run = (list) => { const t = performance.now(); for (const d of dirs) { rc.setFromCamera(d, camera); rc.intersectObjects(list, false); } return (performance.now() - t) / N; };
    return { fullMsPerRay: +run(full).toFixed(3), proxyMsPerRay: +run(prox).toFixed(3), meshes: full.length };
  };
}
