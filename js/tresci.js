// Treści wszystkich kości w jednym miejscu: kręgosłup (content.js) i czaszka (content-czaszka.js).
import * as C from '../content.js';
import { SKULL_PARTS, SKULL_REGIONS } from '../content-czaszka.js';

export const REGIONS = { ...C.REGIONS, ...SKULL_REGIONS };
export const PARTS = { ...C.PARTS, ...SKULL_PARTS };
export const { DISC, PALPATION, PART_LABELS, PART_LABELS_SPECIAL } = C;
