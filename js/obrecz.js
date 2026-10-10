// Moduł „Obręcz barkowa”: łopatka i obojczyk (treści: content-obrecz.js, punkty: landmarks-obrecz.js, model: tools/obrecz.py).
import { OBRECZ_ORDER, OBRECZ_GROUP, OBRECZ_PARTS, OBRECZ_LABELS, OBRECZ_REGIONS } from '../content-obrecz.js';
import { OBRECZ_LANDMARKS } from '../landmarks-obrecz.js';

// Zestaw kości dla zestawy.js
export const SET = {
  order: OBRECZ_ORDER, group: OBRECZ_GROUP, parts: OBRECZ_PARTS, labels: OBRECZ_LABELS, regions: OBRECZ_REGIONS,
  landmarks: OBRECZ_LANDMARKS, overview: 'obrecz-przeglad', dir: 'obrecz',
  // „Kolory kości”
  colors: { scapula: '#3f8f9a', clavicle: '#b0703f' },
  // kierunek kamery (x — lewa strona ciała, y — góra, z — przód): łopatkę widać od tyłu, obojczyk od przodu i z góry
  view: { scapula: [0.35, 0.25, -1], clavicle: [0.3, 0.6, 1] },
  // siatki z obiema kośćmi pary (lewą i prawą) — w widoku „Sama kość” widać jedną z nich
  paired: new Set(['scapula', 'clavicle']),
};
