// Moduł „Czaszka”: dane i logika niezależna od three.js (kolory, kierunki kamery, szwy).
// Siatki i materiały obsługuje malowanie.js, szwy — szwy.js; wspólna obsługa zestawów kości — zestawy.js.
import { SKULL_ORDER, SKULL_GROUP, SKULL_PARTS, SKULL_LABELS, SKULL_REGIONS } from '../content-czaszka.js';
import { SKULL_LANDMARKS } from '../landmarks-czaszka.js';

// Kolory kości po włączeniu „Kolory kości” (jak w atlasach: każda kość inna)
export const BONE_COLORS = {
  frontal: '#4a78c9', parietal: '#3f9a6e', occipital: '#8a5bb5', temporal: '#d08a2a', sphenoid: '#c4533f',
  ethmoid: '#c9b52e', nasal: '#d0628e', lacrimal: '#5aa9b8', zygomatic: '#7c9b2f', maxilla: '#cf7b56',
  mandible: '#6a7fa8', vomer: '#a0624a', palatine: '#58a58e', concha: '#b07cc6', teeth: '#e9e2cf',
};

// Kierunek kamery (x — lewa strona ciała, y — góra, z — przód), z którego najlepiej widać kość
export const BONE_VIEW = {
  frontal: [0.45, 0.3, 1], parietal: [1, 0.75, -0.15], occipital: [0.35, 0.15, -1], temporal: [1, 0.05, 0.2],
  sphenoid: [1, 0.05, 0.45], ethmoid: [0.55, 0.15, 1], nasal: [0.6, 0.15, 1], lacrimal: [0.75, 0.1, 1],
  zygomatic: [1, 0, 0.8], maxilla: [0.6, -0.1, 1], mandible: [0.9, -0.25, 0.75], vomer: [0.2, -0.75, -0.8],
  palatine: [0.15, -1, -0.25], concha: [0.35, -0.55, 1], teeth: [0.5, -0.15, 1],
};
// Małe albo schowane kości: kadr na samą kość; duże — na całą czaszkę
export const SMALL_BONES = new Set(['ethmoid', 'nasal', 'lacrimal', 'vomer', 'palatine', 'concha']);
// Kości leżące w większości wewnątrz czaszki — w opisie podpowiedź „Tylko wybrany”
export const INNER_BONES = new Set(['sphenoid', 'ethmoid', 'vomer', 'palatine', 'concha', 'lacrimal']);
// W quizie „Która kość?” pomijamy kości niewidoczne z zewnątrz (zostają jako odpowiedzi do wyboru)
export const HIDDEN_BONES = new Set(['vomer', 'palatine', 'concha']);

// Zestaw kości dla zestawy.js
export const SET = {
  order: SKULL_ORDER, group: SKULL_GROUP, parts: SKULL_PARTS, labels: SKULL_LABELS, regions: SKULL_REGIONS,
  landmarks: SKULL_LANDMARKS, overview: 'czaszka-przeglad', dir: 'czaszka',
  colors: BONE_COLORS, view: BONE_VIEW, small: SMALL_BONES, inner: INNER_BONES, hidden: HIDDEN_BONES,
};

// Które kości przylegają do linii (szwu) — do pokazywania linii przy widoku „Tylko wybrany”
export const LINE_BONES = {
  coronal: ['frontal', 'parietal'], sagittal: ['parietal'], lambdoid: ['parietal', 'occipital'],
  squamous: ['parietal', 'temporal'], temporal_line: ['frontal', 'parietal'],
};
export const lineGroup = (name) => name.replace(/_[LR]$/, '');
