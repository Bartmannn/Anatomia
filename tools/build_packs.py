"""Podział modeli na małe paczki do pobierania „na żądanie” (models/pakiety/).

Użycie:  python tools/build_packs.py
Wymaga: numpy.  Wejście: models/kregoslup.glb (tools/build_glb.py) i models/zebra.glb (tools/ribs.py).

Co powstaje:
  models/pakiety/przeglad-<odcinek>.pak  odcinek kręgosłupa w wersji uproszczonej (ok. 2 tys. trójkątów na kręg)
  models/pakiety/zebra-przeglad.pak  24 żebra w wersji uproszczonej
  models/pakiety/kregi/<kręg>.pak    pełny kręg + krążek pod nim + dołki żebrowe (kręgi piersiowe)
  models/pakiety/zebra/<n>.pak       para żeber nr n (lewe i prawe) w pełnej rozdzielczości
  models/pakiety/spis.js             lista paczek z rozmiarami (dla menu na stronie)

Upraszczanie: ściąganie krawędzi z miarą błędu kwadrykowego (Garland–Heckbert),
z blokadą odwracania trójkątów i zmian topologii.

Format .pak (prosty, bez zewnętrznych bibliotek; całość skompresowana gzipem):
  'ATL1', uint32 długość nagłówka, nagłówek JSON, dane.
  Dla każdej siatki w nagłówku: name, extras, n (wierzchołki), t (trójkąty), base [x,y,z], s (krok siatki),
  p [offset, długość X, długość Y, długość Z], i [offset, długość].
  Pozycje: współrzędne całkowite (krok s jednostek), różnice kolejnych wierzchołków, zigzag, varint, osobno X, Y, Z.
  Indeksy: dla każdego wierzchołka trójkąta kod varint: 0 = nowy wierzchołek, 1..16 = pozycja w kolejce
  ostatnio użytych, >16 = odległość wstecz od ostatniego nowego wierzchołka. Normalne liczy przeglądarka.
Dekoder: funkcja decodePack w app.js.
"""
import numpy as np, json, struct, os, sys, gzip, heapq

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MODELS = os.path.join(ROOT, 'models')
OUT = os.path.join(MODELS, 'pakiety')
STEP = 2e-4          # 0,02 mm
FIFO = 16

# ---------------------------------------------------------------- odczyt GLB
CT = {5120: 'i1', 5121: 'u1', 5122: '<i2', 5123: '<u2', 5125: '<u4', 5126: '<f4'}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
NORM = {5120: 127, 5121: 255, 5122: 32767, 5123: 65535}


def read_glb(path):
    d = open(path, 'rb').read()
    jl, _ = struct.unpack('<II', d[12:20]); g = json.loads(d[20:20 + jl]); body = d[20 + jl + 8:]

    def acc(i):
        a = g['accessors'][i]; v = g['bufferViews'][a['bufferView']]
        dt = np.dtype(CT[a['componentType']]); n = NC[a['type']]
        stride = v.get('byteStride', dt.itemsize * n); off = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        rows = [np.frombuffer(body, dtype=dt, count=n, offset=off + r * stride) for r in range(a['count'])] if stride != dt.itemsize * n else None
        arr = np.array(rows) if rows is not None else np.frombuffer(body, dtype=dt, count=n * a['count'], offset=off).reshape(-1, n)
        if a.get('normalized'): arr = arr.astype(np.float64) / NORM[a['componentType']]
        return arr

    out = []
    for nd in g['nodes']:
        p = g['meshes'][nd['mesh']]['primitives'][0]
        pos = acc(p['attributes']['POSITION']).astype(np.float64)
        pos = pos * np.array(nd.get('scale', [1, 1, 1])) + np.array(nd.get('translation', [0, 0, 0]))
        out.append((nd['name'], pos, acc(p['indices']).reshape(-1, 3).astype(np.int64), nd.get('extras', {})))
    return out


# ---------------------------------------------------------------- upraszczanie (QEM)
def simplify(u, f, target):
    """Ściąganie krawędzi do ok. `target` trójkątów. Zwraca (u, f)."""
    if len(f) <= target: return u, f
    u = [list(map(float, p)) for p in u]
    faces = [list(map(int, t)) for t in f]
    alive = [True] * len(faces)
    vf = [set() for _ in u]
    for i, t in enumerate(faces):
        for v in t: vf[v].add(i)
    # kwadryki: [a2, ab, ac, ad, b2, bc, bd, c2, cd, d2]
    Q = [[0.0] * 10 for _ in u]

    def addq(q, a, b, c, d, w):
        q[0] += w * a * a; q[1] += w * a * b; q[2] += w * a * c; q[3] += w * a * d; q[4] += w * b * b
        q[5] += w * b * c; q[6] += w * b * d; q[7] += w * c * c; q[8] += w * c * d; q[9] += w * d * d

    def fnormal(p0, p1, p2):
        ax, ay, az = p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]
        bx, by, bz = p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]
        return ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx

    edges = {}
    for t in faces:
        p0, p1, p2 = u[t[0]], u[t[1]], u[t[2]]
        nx, ny, nz = fnormal(p0, p1, p2); l = (nx * nx + ny * ny + nz * nz) ** .5
        if l < 1e-18: continue
        a, b, c = nx / l, ny / l, nz / l; d = -(a * p0[0] + b * p0[1] + c * p0[2])
        for v in t: addq(Q[v], a, b, c, d, l / 2)
        for e in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
            k = (min(e), max(e)); edges[k] = edges.get(k, 0) + 1
    # krawędzie brzegowe: płaszczyzna prostopadła, duża waga
    for (a_, b_), cnt in edges.items():
        if cnt != 1: continue
        fi = next(iter(vf[a_] & vf[b_]))
        t = faces[fi]; nx, ny, nz = fnormal(u[t[0]], u[t[1]], u[t[2]])
        ex, ey, ez = (u[b_][i] - u[a_][i] for i in range(3))
        px, py, pz = ey * nz - ez * ny, ez * nx - ex * nz, ex * ny - ey * nx
        l = (px * px + py * py + pz * pz) ** .5
        if l < 1e-18: continue
        px, py, pz = px / l, py / l, pz / l; d = -(px * u[a_][0] + py * u[a_][1] + pz * u[a_][2])
        el = (ex * ex + ey * ey + ez * ez) ** .5
        for v in (a_, b_): addq(Q[v], px, py, pz, d, 100 * el * el)

    ver = [0] * len(u)

    def qerr(q, x, y, z):
        return (q[0] * x * x + 2 * q[1] * x * y + 2 * q[2] * x * z + 2 * q[3] * x + q[4] * y * y
                + 2 * q[5] * y * z + 2 * q[6] * y + q[7] * z * z + 2 * q[8] * z + q[9])

    def plan(a, b):
        q = [Q[a][i] + Q[b][i] for i in range(10)]
        A = ((q[0], q[1], q[2]), (q[1], q[4], q[5]), (q[2], q[5], q[7])); B = (-q[3], -q[6], -q[8])
        det = (A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
               + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]))
        pa, pb = u[a], u[b]
        el2 = sum((pa[i] - pb[i]) ** 2 for i in range(3))
        cands = [pa, pb, [(pa[i] + pb[i]) / 2 for i in range(3)]]
        if abs(det) > 1e-30:
            def col(i):
                M = [list(r) for r in A]
                for r in range(3): M[r][i] = B[r]
                return (M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
                        + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]))
            p = [col(0) / det, col(1) / det, col(2) / det]
            m = cands[2]
            if sum((p[i] - m[i]) ** 2 for i in range(3)) < el2: cands.insert(0, p)
        best = min(cands, key=lambda p: qerr(q, *p))
        return max(qerr(q, *best), 0.0), best

    heap = []

    def push(a, b):
        if a > b: a, b = b, a
        c, p = plan(a, b)
        heapq.heappush(heap, (c, a, b, ver[a], ver[b], p))

    for (a, b) in edges: push(a, b)
    nf = len(faces)

    def nbrs(v):
        s = set()
        for fi in vf[v]: s.update(faces[fi])
        s.discard(v); return s

    while nf > target and heap:
        c, a, b, va, vb, p = heapq.heappop(heap)
        if ver[a] != va or ver[b] != vb or not vf[a] or not vf[b]: continue
        shared = vf[a] & vf[b]
        if not shared: continue
        # warunek łącza: wspólni sąsiedzi = wierzchołki trójkątów wspólnych
        common = nbrs(a) & nbrs(b)
        opp = set()
        for fi in shared: opp.update(faces[fi])
        opp -= {a, b}
        if common != opp: continue
        # odwracanie trójkątów
        ok = True
        for v in (a, b):
            for fi in vf[v] - shared:
                t = faces[fi]
                o = [u[x] for x in t]
                n0 = fnormal(*o)
                nn = fnormal(*[p if x in (a, b) else u[x] for x in t])
                l0 = (n0[0] ** 2 + n0[1] ** 2 + n0[2] ** 2) ** .5; l1 = (nn[0] ** 2 + nn[1] ** 2 + nn[2] ** 2) ** .5
                if l1 < 1e-18 or (n0[0] * nn[0] + n0[1] * nn[1] + n0[2] * nn[2]) < 0.2 * l0 * l1: ok = False; break
            if not ok: break
        if not ok: continue
        # ściągnięcie b -> a
        for fi in shared:
            alive[fi] = False; nf -= 1
            for x in faces[fi]: vf[x].discard(fi)
        for fi in list(vf[b]):
            t = faces[fi]; t[t.index(b)] = a; vf[a].add(fi)
        vf[b] = set()
        u[a] = list(p)
        Q[a] = [Q[a][i] + Q[b][i] for i in range(10)]
        ver[a] += 1; ver[b] += 1
        for w in nbrs(a): push(a, w)

    fa = np.array([faces[i] for i in range(len(faces)) if alive[i]], dtype=np.int64)
    used = np.unique(fa); rm = -np.ones(len(u), np.int64); rm[used] = np.arange(len(used))
    return np.array(u)[used], rm[fa]


# ---------------------------------------------------------------- kodowanie
def varint(vals, out):
    for x in vals:
        x = int(x)
        while x >= 128: out.append((x & 127) | 128); x >>= 7
        out.append(x)


def encode_mesh(u, f, body):
    ren = {}; fifo = []; codes = []
    for t in f.tolist():
        def key(i):
            if i in ren:
                j = ren[i]; return fifo.index(j) if j in fifo else 50
            return 99
        r = min(range(3), key=lambda s: key(t[s])); t = t[r:] + t[:r]
        for i in t:
            if i not in ren:
                j = ren[i] = len(ren); codes.append(0)
            else:
                j = ren[i]
                codes.append(1 + fifo.index(j) if j in fifo else 1 + FIFO + (len(ren) - 1 - j))
            if j in fifo: fifo.remove(j)
            fifo.insert(0, j); del fifo[FIFO:]
    order = np.empty(len(ren), np.int64)
    for i, j in ren.items(): order[j] = i
    q = np.round(u[order] / STEP).astype(np.int64)
    base = q.min(0); q -= base
    dq = np.diff(q, axis=0, prepend=np.zeros((1, 3), np.int64))
    z = (dq << 1) ^ (dq >> 63)
    p0 = len(body); lens = []
    for i in range(3):
        s = len(body); varint(z[:, i], body); lens.append(len(body) - s)
    i0 = len(body); varint(codes, body)
    return {'n': len(order), 't': len(f), 'base': [int(x) for x in base], 's': STEP,
            'p': [p0] + lens, 'i': [i0, len(body) - i0]}


def write_pack(path, meshes):
    body = bytearray(); head = []
    for name, u, f, extras in meshes:
        h = encode_mesh(u, f, body); h['name'] = name; h['extras'] = extras; head.append(h)
    j = json.dumps({'meshes': head}, separators=(',', ':'), ensure_ascii=False).encode()
    raw = b'ATL1' + struct.pack('<I', len(j)) + j + bytes(body)
    data = gzip.compress(raw, 9, mtime=0)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(data)
    return len(data), sum(len(f) for _, _, f, _ in meshes)


# ---------------------------------------------------------------- paczki
REGIONS = {'C': 'przeglad-C', 'Th': 'przeglad-Th', 'L': 'przeglad-L', 'S': 'przeglad-S'}
def region(name):
    k = name[2:] if name.startswith('D_') else name
    return 'Th' if k.startswith('Th') else k[0]


def main():
    spine = read_glb(os.path.join(MODELS, 'kregoslup.glb'))
    ribs = read_glb(os.path.join(MODELS, 'zebra.glb'))
    S = {n: (u, f, e) for n, u, f, e in spine}
    R = {n: (u, f, e) for n, u, f, e in ribs}
    order = [n for n, *_ in spine if not n.startswith('D_')]
    spis = {}

    def put(pid, meshes):
        size, tris = write_pack(os.path.join(OUT, pid + '.pak'), meshes)
        spis[pid] = {'bajty': size, 'trojkaty': tris}
        print(pid, size, tris, flush=True)

    # przegląd: osobno szyjny, piersiowy, lędźwiowy, kość krzyżowa (moduł „Kręgi piersiowe” bierze tylko swój)
    ov = {r: [] for r in REGIONS}
    for n, u, f, e in spine:
        tgt = 700 if n.startswith('D_') else max(900, int(len(f) * 0.18))
        su, sf = simplify(u, f, tgt)
        ov[region(n)].append((n, su, sf, e))
    for r, pid in REGIONS.items(): put(pid, ov[r])

    # pełne kręgi: kręg + krążek pod nim (uproszczony do 2400 tr., jest gładki) + dołki żebrowe
    for k in order:
        u, f, e = S[k]
        meshes = [(k, u, f, e)]
        if 'D_' + k in S:
            du, df, de = S['D_' + k]
            su, sf = simplify(du, df, 2400)
            meshes.append(('D_' + k, su, sf, de))
        meshes += [(n, ru, rf, re) for n, (ru, rf, re) in R.items() if re.get('vertebra') == k]
        put('kregi/' + k, meshes)

    # żebra: pary w pełnej rozdzielczości + przegląd wszystkich
    rov = []
    for n in range(1, 13):
        meshes = sorted([(nm, u, f, e) for nm, (u, f, e) in R.items() if e.get('kind') == 'rib' and e.get('rib') == n], key=lambda m: m[0])
        put(f'zebra/{n}', meshes)
        for nm, u, f, e in meshes:
            su, sf = simplify(u, f, max(500, int(len(f) * 0.15)))
            rov.append((nm, su, sf, e))
    put('zebra-przeglad', rov)

    with open(os.path.join(OUT, 'spis.js'), 'w', encoding='utf-8') as fh:
        fh.write('// Wygenerowane przez tools/build_packs.py: paczki w models/pakiety/<nazwa>.pak,\n')
        fh.write('// rozmiar po kompresji (bajty) i liczba trójkątów. Modele: BodyParts3D (DBCLS), CC BY-SA 2.1 JP.\n')
        fh.write('export const PACKS = {\n' + ''.join(f'  {json.dumps(k)}: {json.dumps(v)},\n' for k, v in spis.items()) + '};\n')
    print('razem', sum(v['bajty'] for v in spis.values()))


if __name__ == '__main__':
    main()
