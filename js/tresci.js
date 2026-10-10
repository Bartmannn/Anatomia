// Treści wszystkich kości w jednym miejscu: kręgosłup (content.js) i zestawy kości (czaszka, obręcz barkowa — zestawy.js).
import * as C from '../content.js';
import * as Z from './zestawy.js';

export const REGIONS = { ...C.REGIONS, ...Z.REGIONS };
export const PARTS = { ...C.PARTS, ...Z.PARTS };
export const { DISC, PALPATION, PART_LABELS, PART_LABELS_SPECIAL } = C;
