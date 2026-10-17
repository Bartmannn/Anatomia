// Moduł „Kończyna górna”: na razie kość ramienna (treści: content-konczyna.js, punkty: landmarks-konczyna.js, model: tools/konczyna.py).
import { KONCZYNA_ORDER, KONCZYNA_GROUP, KONCZYNA_PARTS, KONCZYNA_LABELS, KONCZYNA_LABEL_GROUPS, KONCZYNA_REGIONS } from '../content-konczyna.js';
import { KONCZYNA_LANDMARKS } from '../landmarks-konczyna.js';

// Zestaw kości dla zestawy.js
export const SET = {
  order: KONCZYNA_ORDER, group: KONCZYNA_GROUP, parts: KONCZYNA_PARTS, labels: KONCZYNA_LABELS, regions: KONCZYNA_REGIONS,
  labelGroups: KONCZYNA_LABEL_GROUPS,
  landmarks: KONCZYNA_LANDMARKS, overview: 'konczyna-przeglad', dir: 'konczyna',
  // „Kolory kości”
  colors: { humerus: '#5a86b8' },
  // kierunek kamery (x — lewa strona ciała, y — góra, z — przód): kość ramienna od przodu (widać oba nadkłykcie)
  view: { humerus: [0.1, 0.1, 1] },
  // jedna siatka z kośćmi lewą i prawą — w widoku „Sama kość” widać jedną z nich
  paired: new Set(['humerus']),
  // podpisy części po niewidocznej stronie kości chowają się (np. dół łokciowy, gdy patrzymy od przodu)
  hideBack: true,
  // w „Sama kość” wybór zestawu „Część górna” albo „Część dolna” przybliża ten koniec kości
  frameGroups: true,
};
