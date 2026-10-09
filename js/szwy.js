// Szwy czaszki i kresa skroniowa: cienkie rurki na powierzchni kości (dane: landmarks-czaszka.js, tools/czaszka.py).
import * as THREE from 'three';
import { SKULL_LINES } from '../landmarks-czaszka.js';
import * as CZ from './czaszka.js';
import { closeUp, currentKey, lineMeshes, parts, skullMode, state } from './stan.js';
import { root } from './widok.js';

const R_SUTURE = 0.0045;          // 0,45 mm (1 j. = 10 cm)
const R_TEMPORAL = 0.0035;

// tworzone dopiero w module czaszki (przy pierwszym malowaniu)
function buildLines() {
  for (const [name, pts] of Object.entries(SKULL_LINES)) {
    const group = CZ.lineGroup(name);
    const dashed = group === 'temporal_line';
    const v = pts.map((p) => new THREE.Vector3(...p));
    // kresa skroniowa przerywana (to nie szew, tylko linia przyczepu), szwy — ciągłe
    const pieces = dashed ? Array.from({ length: Math.floor(v.length / 4) }, (_, i) => v.slice(i * 4, i * 4 + 3)).filter((a) => a.length > 1) : [v];
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    for (const seg of pieces) {
      const curve = new THREE.CatmullRomCurve3(seg);
      const geo = new THREE.TubeGeometry(curve, Math.max(4, seg.length * 3), dashed ? R_TEMPORAL : R_SUTURE, 6, false);
      const m = new THREE.Mesh(geo, mat);
      m.name = `line:${name}`;
      m.userData = { kind: 'line', group, dashed };
      m.renderOrder = 3;
      m.visible = false;
      root.add(m);
      lineMeshes.push(m);
    }
  }
}

// activeLine — grupa linii do podświetlenia (np. 'coronal'), gdy wskazana jest część, która ją opisuje
export function paintLines(colors, activeLine) {
  if (!skullMode()) { for (const m of lineMeshes) m.visible = false; return; }
  if (!lineMeshes.length) buildLines();
  const sel = currentKey();
  const close = closeUp();
  for (const m of lineMeshes) {
    const { group, dashed } = m.userData;
    const bones = CZ.LINE_BONES[group] || [];
    // linia jest widoczna, gdy widać którąś z kości, przy której leży (w „Tylko wybrany” — przy wybranej)
    const anyVisible = bones.some((b) => parts[b]?.visible && parts[b].material.opacity > 0.5);
    m.visible = close ? bones.includes(sel) : anyVisible;
    const hot = activeLine === group;
    m.material.color.copy(hot ? colors.L : dashed ? colors.tline : colors.suture);      // wskazana linia: czerwona (kontrast z kolorami kości)
  }
}
