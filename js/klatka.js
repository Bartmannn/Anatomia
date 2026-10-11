// Moduł „Klatka piersiowa”: mostek, żebra i chrząstki żebrowe (treści: content-klatka.js, punkty: landmarks-klatka.js,
// model: tools/klatka.py). Chrząstki to osobne siatki (kind 'cart'), przypisane do żebra (key: rib1…rib10).
import { KLATKA_ORDER, KLATKA_GROUP, KLATKA_PARTS, KLATKA_LABELS, KLATKA_REGIONS } from '../content-klatka.js';
import { KLATKA_LANDMARKS } from '../landmarks-klatka.js';

export const RIB_KEYS = KLATKA_ORDER.filter((k) => k.startsWith('rib'));
const ribNo = (k) => +k.slice(3);
// „Podział żeber” (Kolory kości): mostek, żebra prawdziwe, rzekome, wolne
const TINT = { MO: '#8a5bb5', ZP: '#3f9a6e', ZR: '#d08a2a', ZW: '#c4533f' };
export const FLOATING_TINT = TINT.ZW;     // żebro X jako wolne (odmiana)

// Zestaw kości dla zestawy.js
export const SET = {
  order: KLATKA_ORDER, group: KLATKA_GROUP, parts: KLATKA_PARTS, labels: KLATKA_LABELS, regions: KLATKA_REGIONS,
  landmarks: KLATKA_LANDMARKS, overview: 'klatka-przeglad', dir: 'klatka',
  colors: Object.fromEntries(KLATKA_ORDER.map((k) => [k, TINT[KLATKA_GROUP[k]]])),
  // kierunek kamery (x — lewa strona ciała, y — góra, z — przód): mostek z przodu, żebra skośnie z przodu, wolne — z tyłu
  view: Object.fromEntries(KLATKA_ORDER.map((k) => [k, k === 'sternum' ? [0.15, 0.15, 1] : ribNo(k) >= 11 ? [0.6, 0.2, -1] : [0.75, 0.25, 0.8]])),
  paired: new Set(RIB_KEYS),
};
