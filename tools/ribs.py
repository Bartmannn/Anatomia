"""Żebra: model models/zebra.glb + punkty połączeń żebrowo-kręgowych (landmarks-ribs.js).

Użycie:  python tools/ribs.py <folder_z_plikami_stl>
Wymaga: numpy, scipy. Układ współrzędnych i centrowanie jak w build_glb.py
(środek liczony z kręgów i krążków, więc żebra pasują do models/kregoslup.glb).

Co robi:
  * upraszcza siatki 24 żeber (łączenie wierzchołków w siatce ok. 1,2 mm) i zapisuje je do models/zebra.glb,
  * dla każdego kręgu piersiowego szuka miejsc, w których żebro styka się z kręgiem
    (odległość powierzchni < kilka mm) — to dołki żebrowe trzonu i wyrostka poprzecznego,
  * zapisuje fragmenty powierzchni tych dołków jako osobne, małe siatki (podświetlenie na stronie)
    oraz punkty etykiet (dołki, głowa, szyjka i guzek żebra) do landmarks-ribs.js.
"""
import numpy as np, json, struct, os, sys
from scipy.spatial import cKDTree

SRC = os.path.join(sys.argv[1] if len(sys.argv) > 1 else 'bodyparts3d/stl', '')
OUT_GLB = 'models/zebra.glb'
OUT_JS = 'landmarks-ribs.js'

SPINE = ['FMA12519', 'FMA12520', 'FMA12521', 'FMA12522', 'FMA12523', 'FMA12524', 'FMA12525', 'FMA9165', 'FMA9187', 'FMA9209',
         'FMA9248', 'FMA9922', 'FMA9945', 'FMA9968', 'FMA9991', 'FMA10014', 'FMA10037', 'FMA10059', 'FMA10081', 'FMA13072',
         'FMA13073', 'FMA13074', 'FMA13075', 'FMA13076', 'FMA16202', 'FMA25058', 'FMA13896', 'FMA13897', 'FMA13898', 'FMA13899',
         'FMA13900', 'FMA10458', 'FMA13495', 'FMA13500', 'FMA13501', 'FMA13502', 'FMA13503', 'FMA13504', 'FMA13505', 'FMA13506',
         'FMA13507', 'FMA13508', 'FMA13509', 'FMA16033', 'FMA16034', 'FMA16035', 'FMA16036', 'FMA16037']
TH = {1: 'FMA9165', 2: 'FMA9187', 3: 'FMA9209', 4: 'FMA9248', 5: 'FMA9922', 6: 'FMA9945', 7: 'FMA9968', 8: 'FMA9991',
      9: 'FMA10014', 10: 'FMA10037', 11: 'FMA10059', 12: 'FMA10081'}
# L = żebro lewe, R = prawe (w BodyParts3D prawa strona ciała ma ujemne x)
RIBS = {('R', 1): 'FMA7857', ('R', 2): 'FMA7882', ('R', 3): 'FMA7909', ('R', 4): 'FMA7957', ('R', 5): 'FMA8066', ('R', 6): 'FMA8175',
        ('R', 7): 'FMA8229', ('R', 8): 'FMA8283', ('R', 9): 'FMA8364', ('R', 10): 'FMA8445', ('R', 11): 'FMA8531', ('R', 12): 'FMA8533',
        ('L', 1): 'FMA7987', ('L', 2): 'FMA8012', ('L', 3): 'FMA8039', ('L', 4): 'FMA8148', ('L', 5): 'FMA8093', ('L', 6): 'FMA8202',
        ('L', 7): 'FMA8256', ('L', 8): 'FMA8310', ('L', 9): 'FMA8391', ('L', 10): 'FMA8472', ('L', 11): 'FMA8532', ('L', 12): 'FMA8534'}


def load(fid):
    d = open(SRC + fid + '.stl', 'rb').read(); n = int.from_bytes(d[80:84], 'little')
    t = np.frombuffer(d[84:84 + n * 50], dtype=np.dtype([('n', '<f4', 3), ('v', '<f4', (3, 3)), ('a', '<u2')]))
    v = t['v'].reshape(-1, 3).astype(np.float64)
    v = np.stack([v[:, 0], v[:, 2], -v[:, 1]], 1) * 0.01
    u, inv = np.unique(np.round(v, 5), axis=0, return_inverse=True)
    f = inv.reshape(-1, 3)
    return u, f[(f[:, 0] != f[:, 1]) & (f[:, 1] != f[:, 2]) & (f[:, 0] != f[:, 2])]


allv = np.concatenate([load(f)[0] for f in SPINE])
center = (allv.min(0) + allv.max(0)) / 2


def cluster_simplify(u, f, h):
    """Upraszczanie przez łączenie wierzchołków w komórkach siatki o boku h."""
    key = np.floor(u / h).astype(np.int64)
    _, cell, counts = np.unique(key, axis=0, return_inverse=True, return_counts=True)
    cell = cell.ravel()
    nu = np.zeros((counts.size, 3)); np.add.at(nu, cell, u); nu /= counts[:, None]
    nf = cell[f]
    nf = nf[(nf[:, 0] != nf[:, 1]) & (nf[:, 1] != nf[:, 2]) & (nf[:, 0] != nf[:, 2])]
    _, first = np.unique(np.sort(nf, 1), axis=0, return_index=True)
    nf = nf[np.sort(first)]
    used = np.unique(nf); remap = -np.ones(len(nu), int); remap[used] = np.arange(len(used))
    return nu[used], remap[nf]


def normals(u, f):
    fn = np.cross(u[f[:, 1]] - u[f[:, 0]], u[f[:, 2]] - u[f[:, 0]])
    n = np.zeros_like(u)
    for i in range(3): np.add.at(n, f[:, i], fn)
    return n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-12)


P = lambda p: [round(float(x), 4) for x in p]

# --- wczytanie ---
verts = {n: load(fid) for n, fid in TH.items()}
verts = {n: (u - center, f) for n, (u, f) in verts.items()}
ribs = {k: load(fid) for k, fid in RIBS.items()}
ribs = {k: (u - center, f) for k, (u, f) in ribs.items()}

meshes = []   # (name, u, f, extras)
landmarks, links = {}, {}
for (side, n), (u, f) in sorted(ribs.items(), key=lambda x: (x[0][1], x[0][0])):
    su, sf = cluster_simplify(u, f, 0.016)
    meshes.append((f'rib_{side}{n}', su, sf, {'kind': 'rib', 'rib': n, 'side': side, 'fma': RIBS[(side, n)]}))

for n, (u, f) in verts.items():
    k = f'Th{n}'
    xc = (u[:, 0].min() + u[:, 0].max()) / 2
    vtree = cKDTree(u)
    L = {}
    link = {}
    for side in ('L', 'R'):   # kolejność punktów: [lewa, prawa] — tak jak w landmarks.js
        # (rib number, region, part name on vertebra, part name on rib)
        wanted = [(n, 'body', 'fov_sup', 'rib_head'), (n + 1, 'body', 'fov_inf', 'rib_head_next')]
        if n <= 10: wanted.append((n, 'tp', 'fov_tp', 'rib_tub'))
        for rn, region, vpart, rpart in wanted:
            if (side, rn) not in ribs: continue
            ru, rf = ribs[(side, rn)]
            d, _ = vtree.query(ru, distance_upper_bound=0.2)
            ax = np.abs(ru[:, 0] - xc)
            reg = (ax < 0.245) if region == 'body' else (ax >= 0.245)
            dm = d[reg].min() if reg.any() else np.inf
            if dm > 0.05: continue            # brak kontaktu (> 5 mm)
            rnear = np.where(reg & (d < dm + 0.022))[0]
            if len(rnear) < 15: continue      # przypadkowe zbliżenie, nie staw
            # powierzchnia dołka na kręgu
            rtree = cKDTree(ru[rnear])
            dv, _ = rtree.query(u, distance_upper_bound=0.2)
            vnear = dv < dm + 0.022
            tri = f[vnear[f].all(1)]
            if len(tri) < 3: continue
            c = u[np.unique(tri)].mean(0)
            fac = u[np.unique(tri)][np.argmin(np.linalg.norm(u[np.unique(tri)] - c, axis=1))]
            rc = ru[rnear].mean(0)
            rpt = ru[rnear][np.argmin(np.linalg.norm(ru[rnear] - rc, axis=1))]
            L.setdefault(vpart, {})[side] = P(fac)
            L.setdefault(rpart, {})[side] = P(rpt)
            link.setdefault(vpart, rn)
            vi = np.unique(tri); rm = -np.ones(len(u), int); rm[vi] = np.arange(len(vi))
            meshes.append((f'facet_{k}_{vpart}_{side}', u[vi], rm[tri], {'kind': 'facet', 'vertebra': k, 'part': vpart, 'side': side, 'rib': rn}))
            # powierzchnia stawowa na żebrze (głowa / guzek)
            rtri = rf[np.isin(rf, rnear).all(1)]
            if len(rtri) >= 3:
                ri = np.unique(rtri); rm2 = -np.ones(len(ru), int); rm2[ri] = np.arange(len(ri))
                meshes.append((f'ribfacet_{k}_{rpart}_{side}', ru[ri], rm2[rtri], {'kind': 'ribfacet', 'vertebra': k, 'part': rpart, 'side': side, 'rib': rn}))
        # szyjka żebra n: punkt żebra najbliższy środkowi odcinka głowa–guzek
        if 'rib_head' in L and side in L['rib_head'] and 'rib_tub' in L and side in L['rib_tub']:
            ru, _ = ribs[(side, n)]
            mid = (np.array(L['rib_head'][side]) + np.array(L['rib_tub'][side])) / 2
            L.setdefault('rib_neck', {})[side] = P(ru[np.argmin(np.linalg.norm(ru - mid, axis=1))])
    landmarks[k] = {p: [v.get('L'), v.get('R')] for p, v in L.items()}   # None = brak po tej stronie
    links[k] = link

# --- zapis GLB (ta sama kwantyzacja co build_glb.py) ---
buf = bytearray(); views = []; accs = []; gm = []; nodes = []
def add(b, target):
    while len(buf) % 4: buf.append(0)
    off = len(buf); buf.extend(b); views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(b), 'target': target}); return len(views) - 1
tris = 0
for name, u, f, extras in meshes:
    n = normals(u, f)
    lo, hi = u.min(0), u.max(0); mid = (lo + hi) / 2; half = (hi - lo) / 2 + 1e-9
    q = np.round((u - mid) / half * 32767).clip(-32767, 32767).astype('<i2')
    q4 = np.zeros((len(q), 4), '<i2'); q4[:, :3] = q
    nq = np.zeros((len(n), 4), 'i1'); nq[:, :3] = np.round(n * 127).clip(-127, 127)
    idx = f.astype('<u2' if len(u) < 65536 else '<u4')
    pv = add(q4.tobytes(), 34962); views[pv]['byteStride'] = 8
    nv = add(nq.tobytes(), 34962); views[nv]['byteStride'] = 4
    iv = add(idx.tobytes(), 34963)
    a0 = len(accs)
    accs.append({'bufferView': pv, 'componentType': 5122, 'normalized': True, 'count': len(u), 'type': 'VEC3', 'min': [int(x) for x in q.min(0)], 'max': [int(x) for x in q.max(0)]})
    accs.append({'bufferView': nv, 'componentType': 5120, 'normalized': True, 'count': len(u), 'type': 'VEC3'})
    accs.append({'bufferView': iv, 'componentType': 5123 if idx.dtype == np.dtype('<u2') else 5125, 'count': idx.size, 'type': 'SCALAR'})
    gm.append({'name': name, 'primitives': [{'attributes': {'POSITION': a0, 'NORMAL': a0 + 1}, 'indices': a0 + 2}]})
    nodes.append({'name': name, 'mesh': len(gm) - 1, 'translation': [float(x) for x in mid], 'scale': [float(x) for x in half], 'extras': extras})
    tris += len(f)
while len(buf) % 4: buf.append(0)
gltf = {'asset': {'version': '2.0', 'generator': 'Anatomia tools/ribs.py', 'copyright': 'BodyParts3D, (c) The Database Center for Life Science, CC BY-SA 2.1 JP. Processed by Anatomia (CC BY-SA 2.1 JP).'},
        'extensionsUsed': ['KHR_mesh_quantization'], 'extensionsRequired': ['KHR_mesh_quantization'],
        'scene': 0, 'scenes': [{'nodes': list(range(len(nodes)))}], 'nodes': nodes, 'meshes': gm, 'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(buf)}]}
j = json.dumps(gltf, separators=(',', ':')).encode(); j += b' ' * ((4 - len(j) % 4) % 4)
out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(j) + 8 + len(buf)) + struct.pack('<II', len(j), 0x4E4F534A) + j + struct.pack('<II', len(buf), 0x004E4942) + bytes(buf)
open(OUT_GLB, 'wb').write(out)

with open(OUT_JS, 'w', encoding='utf-8') as fh:
    fh.write('// Wygenerowane przez tools/ribs.py z geometrii BodyParts3D (CC BY-SA 2.1 JP).\n')
    fh.write('// Punkty połączeń żeber z kręgami piersiowymi, kolejność [lewa, prawa]. RIB_LINKS: numer żebra dla każdego dołka.\n')
    fh.write('export const RIB_LANDMARKS = ' + json.dumps(landmarks, separators=(',', ':')) + ';\n')
    fh.write('export const RIB_LINKS = ' + json.dumps(links, separators=(',', ':')) + ';\n')
print('meshes', len(meshes), 'tris', tris, 'glb MB', round(len(out) / 1e6, 2))
for k in ('Th1', 'Th7', 'Th10', 'Th11', 'Th12'):
    print(k, links[k], {p: len(v) for p, v in landmarks[k].items()})
