// Wejście strony: wczytuje moduły z folderu js/ i uruchamia atlas.
// Co jest w którym pliku — README, sekcja „Struktura projektu”.
import { MODULES, state } from './js/stan.js';
import { camera, renderer, resize } from './js/widok.js';
import { initTheme, readColors } from './js/malowanie.js';
import { buildRuler, renderPart, syncRuler } from './js/panel.js';
import { resetLabelSizes } from './js/etykiety.js';
import { initPicking } from './js/celowanie.js';
import { MOD_KEY, initControls, parseHash, setModule, showPicker, validKey } from './js/moduly.js';
import { initLoop } from './js/petla.js';

readColors();
buildRuler();
resize();
new ResizeObserver(() => { resize(); resetLabelSizes(); }).observe(renderer.domElement);
camera.position.set(9, 0.8, -5);
initTheme();
initPicking();
initControls();

// moduł z adresu (#kregi/Th7), z poprzedniej wizyty albo ekran wyboru
{
  const { mod, key } = parseHash();
  let stored = null;
  try { stored = localStorage.getItem(MOD_KEY); } catch (e) { /* brak dostępu do pamięci przeglądarki */ }
  if (key && validKey(key)) state.selected = key;
  renderPart(state.selected);
  syncRuler();
  const start = mod || (key ? 'kregoslup' : stored);
  if (MODULES[start]) setModule(start, key);
  else showPicker();
}

initLoop();

// Praca bez internetu (sw.js) — tylko na https albo localhost i nie w podglądzie z danymi base64
if ('serviceWorker' in navigator && !window.ATLAS_PACK_B64 && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Tryb offline niedostępny:', e));
}
