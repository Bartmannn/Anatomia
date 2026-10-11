"""Klatka piersiowa: mostek, żebra i chrząstki żebrowe — paczki modeli (models/pakiety/klatka-*) i punkty (landmarks-klatka.js).

Użycie:  python tools/klatka.py <folder_z_plikami_stl> [--punkty]
Wymaga: numpy, scipy.  Żebra pochodzą z models/zebra.glb (tools/ribs.py), mostek i chrząstki z plików STL BodyParts3D;
w folderze muszą być też pliki STL kręgów i krążków (środek układu liczony jak w build_glb.py).
--punkty: tylko punkty (bez przebudowy paczek).

Co powstaje:
  models/pakiety/klatka-przeglad.pak   mostek, 12 par żeber i chrząstki żebrowe (uproszczone)
  models/pakiety/klatka/<kość>.pak     mostek albo para żeber (rib1…rib12) z chrząstkami w pełnej szczegółowości
  landmarks-klatka.js                  punkty etykiet (KLATKA_LANDMARKS)
  models/pakiety/spis.js               odświeżona lista paczek

Chrząstki żeber 1–7 są w BodyParts3D osobno. Chrząstki 8–10 jednej strony to jedna bryła (łuk żebrowy, BP24 / BP28) —
skrypt dzieli ją na chrząstki poszczególnych żeber (każdy wierzchołek należy do żebra, do którego końca ma najbliżej
po powierzchni bryły). Chrząstka żebra 10 ma dwie siatki: przy żebrze i łącznik z chrząstką żebra 9 — bez łącznika
widać odmianę „żebro 10 wolne” (costa decima fluctuans).
Układ: x — w lewo (lewa strona ciała ma dodatnie x), y — w górę, z — do przodu; 1 jednostka = 10 cm. Pary: [lewa, prawa].
"""
import numpy as np, json, os, sys
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components, dijkstra
from scipy.spatial import cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from build_packs import read_glb, simplify, write_pack, write_index, OUT  # noqa: E402

ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
SRC = os.path.join(ARGS[0] if ARGS else 'bodyparts3d/stl', '')
ONLY_POINTS = '--punkty' in sys.argv

SPINE = ['FMA12519', 'FMA12520', 'FMA12521', 'FMA12522', 'FMA12523', 'FMA12524', 'FMA12525', 'FMA9165', 'FMA9187', 'FMA9209',
         'FMA9248', 'FMA9922', 'FMA9945', 'FMA9968', 'FMA9991', 'FMA10014', 'FMA10037', 'FMA10059', 'FMA10081', 'FMA13072',
         'FMA13073', 'FMA13074', 'FMA13075', 'FMA13076', 'FMA16202', 'FMA25058', 'FMA13896', 'FMA13897', 'FMA13898', 'FMA13899',
         'FMA13900', 'FMA10458', 'FMA13495', 'FMA13500', 'FMA13501', 'FMA13502', 'FMA13503', 'FMA13504', 'FMA13505', 'FMA13506',
         'FMA13507', 'FMA13508', 'FMA13509', 'FMA16033', 'FMA16034', 'FMA16035', 'FMA16036', 'FMA16037']
STERNUM = {'manubrium': 'FMA7486', 'body': 'FMA7487', 'xiphoid': 'FMA7488'}
# chrząstki żeber 1–7: (lewa, prawa); 8–10: łuk żebrowy jednej strony w jednej bryle
CART = {1: ('FMA8005', 'FMA7875'), 2: ('FMA8031', 'FMA7886'), 3: ('FMA8058', 'FMA7913'), 4: ('FMA8167', 'FMA7976'),
        5: ('FMA8112', 'FMA8070'), 6: ('FMA8221', 'FMA8194'), 7: ('FMA8275', 'FMA8248')}
ARCH = ('BP24', 'BP28')
SIDES = 'LR'
LINK_FROM = 0.55      # chrząstka żebra 10: dalej niż 55% drogi od końca żebra — łącznik z chrząstką żebra 9


def load(fid):
    d = open(SRC + fid + '.stl', 'rb').read(); n = int.from_bytes(d[80:84], 'little')
    t = np.frombuffer(d[84:84 + n * 50], dtype=np.dtype([('n', '<f4', 3), ('v', '<f4', (3, 3)), ('a', '<u2')]))
    v = t['v'].reshape(-1, 3).astype(np.float64)
    v = np.stack([v[:, 0], v[:, 2], -v[:, 1]], 1) * 0.01      # jak w build_glb.py: Y w górę, 1 j. = 10 cm
    u, inv = np.unique(np.round(v, 5), axis=0, return_inverse=True)
    f = inv.reshape(-1, 3)
    return u, f[(f[:, 0] != f[:, 1]) & (f[:, 1] != f[:, 2]) & (f[:, 0] != f[:, 2])]


def merge(meshes):
    us, fs, o = [], [], 0
    for u, f in meshes:
        us.append(u); fs.append(f + o); o += len(u)
    return np.concatenate(us), np.concatenate(fs)


def compact(u, f):
    used = np.unique(f); rm = -np.ones(len(u), np.int64); rm[used] = np.arange(len(used))
    return u[used], rm[f]


def edges_graph(u, f):
    a = np.concatenate([f[:, 0], f[:, 1], f[:, 2]]); b = np.concatenate([f[:, 1], f[:, 2], f[:, 0]])
    w = np.linalg.norm(u[a] - u[b], axis=1) + 1e-9
    return coo_matrix((w, (a, b)), shape=(len(u), len(u))).tocsr()


def main_part(u, f, min_verts=50):
    """Bez drobnych odłamków siatki (osobne bryłki poniżej min_verts wierzchołków)."""
    _, lab = connected_components(edges_graph(u, f), directed=False)
    keep = np.bincount(lab)[lab] >= min_verts
    return compact(u, f[keep[f[:, 0]]])


def r4(p):
    return [round(float(x), 4) for x in p]


# ---------------------------------------------------------------- łuk żebrowy -> chrząstki 8, 9, 10
def split_arch(u, f, ribs):
    """ribs: {n: wierzchołki żebra n}. Zwraca {n: (u, f)} oraz łącznik żebra 10 osobno: {10: …, '10x': …}."""
    g = edges_graph(u, f)
    tree = cKDTree(u)
    dist = {}
    for n, rv in ribs.items():
        d, _ = cKDTree(rv).query(u)
        seeds = np.where(d < d.min() + 0.006)[0]                 # wierzchołki chrząstki stykające się z końcem żebra
        dist[n] = dijkstra(g, directed=False, indices=seeds, min_only=True)
    order = sorted(ribs)
    D = np.stack([dist[n] for n in order], 1)
    lab = np.array(order)[np.argmin(D, 1)]
    out = {}
    face_lab = lab[f[:, 0]]
    for n in order:
        ff = f[face_lab == n]
        if n == 10:
            d10 = dist[10]; lim = LINK_FROM * d10[lab == 10].max()
            link = d10[ff].mean(1) > lim
            out['10x'] = compact(u, ff[link]); ff = ff[~link]
        out[n] = compact(u, ff)
    return out


# ---------------------------------------------------------------- punkty
def rib_points(n, u, s, cart):
    """Punkty żebra n jednej strony. cart: wierzchołki jego chrząstki (albo None)."""
    sgn = 1 if s == 0 else -1
    lat = u[:, 0] * sgn
    zmid = (u[:, 2].min() + u[:, 2].max()) / 2
    post = u[:, 2] < zmid
    back = u[:, 2] < 0.25                                             # bez przedniego końca (żebra 1–10 dochodzą do mostka)
    head = u[back][np.argmin(lat[back])]                              # głowa: najbliżej kręgosłupa
    hl = head[0] * sgn
    P = {'head': head}
    if n <= 10:
        m = (lat > hl + 0.12) & (lat < hl + 0.35) & post
        tub = u[m][np.argmin(u[m][:, 2])]                             # guzek: z tyłu, 1–3 cm bocznie od głowy
        P['tubercle'] = tub
        mid = (head + tub) / 2
        P['neck'] = u[np.argmin(((u - mid) ** 2).sum(1))]
        if n >= 2:
            m = (lat > tub[0] * sgn + 0.2) & post
            if m.any(): P['angle'] = u[m][np.argmin(u[m][:, 2] - 0.3 * lat[m])]   # kąt: najbardziej z tyłu, bocznie od guzka
    else:
        P['neck'] = u[np.argmin(((u - (head + np.array([sgn * 0.12, 0, -0.03]))) ** 2).sum(1))]
    body = u[np.argmax(lat)]                                          # trzon: najbardziej bocznie
    P['body'] = body
    if 2 <= n <= 11:
        m = lat > lat.max() - 0.06
        P['sulcus'] = u[m][np.argmin(u[m][:, 1] - 0.5 * lat[m])]      # bruzda żebra: dolny brzeg trzonu, od środka
    if cart is not None:
        d, _ = cKDTree(cart).query(u)
        P['end'] = u[np.argmin(d)]                                    # koniec przedni: styk z chrząstką
        c = cart.mean(0)
        P['cartilage'] = cart[np.argmin(((cart - c) ** 2).sum(1))]
    else:
        far = ((u - head) ** 2).sum(1)
        P['end'] = u[np.argmax(far)]                                  # żebra 11–12: wolny koniec, najdalej od głowy
    if n == 1:
        # guzek mięśnia pochyłego przedniego: górna powierzchnia, przy brzegu wewnętrznym, w przedniej części żebra
        e = P['end']
        m = (u[:, 2] > e[2] - 0.25) & (u[:, 2] < e[2] - 0.08)
        P['scalene'] = u[m][np.argmax(u[m][:, 1] - 0.6 * lat[m])]
    return P


def sternum_points(parts):
    man, body, xi = (parts[k] for k in ('manubrium', 'body', 'xiphoid'))
    allv = np.concatenate([man, body, xi]); cx = (allv[:, 0].min() + allv[:, 0].max()) / 2
    near = lambda U, x, y, r=0.03: U[(np.abs(U[:, 0] - x) < r) & (np.abs(U[:, 1] - y) < r)]
    front = lambda U: U[np.argmax(U[:, 2])]
    jug = man[np.abs(man[:, 0] - cx) < 0.02]; jug = jug[np.argmax(jug[:, 1])]
    clav = lambda s: man[np.argmax((man[:, 0] - cx) * (1 if s == 0 else -1) + man[:, 1])]
    ym = (man[:, 1].min() + man[:, 1].max()) / 2
    yb = (body[:, 1].min() + body[:, 1].max()) / 2
    top = body[(body[:, 1] > body[:, 1].max() - 0.04) & (np.abs(body[:, 0] - cx) < 0.04)]
    costal = lambda s: body[np.argmax((body[:, 0] - cx) * (1 if s == 0 else -1) - 2 * np.abs(body[:, 1] - yb))]
    pair = lambda fn: [r4(fn(0)), r4(fn(1))]
    return {
        'manubrium': [r4(front(near(man, cx, ym)))],
        'jugular': [r4(jug)],
        'clavicular': pair(clav),
        'angle': [r4(front(top))],
        'body': [r4(front(near(body, cx, yb)))],
        'costal': pair(costal),
        'xiphoid': [r4(xi[np.argmin(xi[:, 1])])],
    }


# ---------------------------------------------------------------- główny program
def main():
    allv = np.concatenate([load(f)[0] for f in SPINE])
    center = (allv.min(0) + allv.max(0)) / 2
    ld = lambda fid: (lambda uf: (uf[0] - center, uf[1]))(load(fid))

    ribs = {(e['side'], e['rib']): (u, f, e) for n, u, f, e in read_glb(os.path.join(ROOT, 'models', 'zebra.glb')) if e.get('kind') == 'rib'}
    st = {k: ld(fid) for k, fid in STERNUM.items()}
    cart = {}                                   # (strona, n) -> (u, f); (strona, '10x') — łącznik żebra 10
    for n, fids in CART.items():
        for s, fid in enumerate(fids): cart[(SIDES[s], n)] = main_part(*ld(fid))
    for s, fid in enumerate(ARCH):
        u, f = main_part(*ld(fid))
        parts = split_arch(u, f, {n: ribs[(SIDES[s], n)][0] for n in (8, 9, 10)})
        for n, uf in parts.items(): cart[(SIDES[s], n)] = uf

    # punkty
    L = {'sternum': sternum_points({k: uf[0] for k, uf in st.items()})}
    for n in range(1, 13):
        pts = []
        for s in (0, 1):
            c = cart.get((SIDES[s], n))
            if n == 10: c = (np.concatenate([c[0], cart[(SIDES[s], '10x')][0]]), None)
            pts.append(rib_points(n, ribs[(SIDES[s], n)][0], s, c[0] if c else None))
        L[f'rib{n}'] = {p: [r4(pts[0][p]), r4(pts[1][p])] for p in pts[0] if p in pts[1]}
    write_js(L)
    if ONLY_POINTS: return

    over = []
    ex = {'kind': 'bone', 'set': 'klatka', 'fma': ' '.join(STERNUM.values())}
    over.append(('sternum', *merge([simplify(*st[k], t) for k, t in (('manubrium', 900), ('body', 1400), ('xiphoid', 300))]), ex))
    put('klatka/sternum', [('sternum', *merge([simplify(*st[k], t) for k, t in (('manubrium', 5000), ('body', 8000), ('xiphoid', 2000))]), ex)])

    for n in range(1, 13):
        lo, hi, fma = [], [], []
        for s in SIDES:
            u, f, e = ribs[(s, n)]
            lo.append(simplify(u, f, 700 if n > 1 else 500)); hi.append((u, f)); fma.append(e['fma'])
        ex = {'kind': 'bone', 'set': 'klatka', 'rib': n, 'fma': ' '.join(fma)}
        over.append((f'rib{n}', *merge(lo), ex))
        full = [(f'rib{n}', *merge(hi), ex)]
        for s in SIDES:
            for key in ([n, '10x'] if n == 10 else [n]):
                if (s, key) not in cart: continue
                u, f = cart[(s, key)]
                name = f'cart_{s}{key}'
                cex = {'kind': 'cart', 'key': f'rib{n}', 'rib': n, 'side': s, **({'link': True} if key == '10x' else {})}
                over.append((name, *simplify(u, f, 350), cex))
                full.append((name, *simplify(u, f, 3000), cex))
        put(f'klatka/rib{n}', full)
    put('klatka-przeglad', over)
    write_index()


def put(pid, meshes):
    size, tris = write_pack(os.path.join(OUT, pid + '.pak'), meshes)
    print(pid, size, tris, flush=True)


def write_js(L):
    path = os.path.join(ROOT, 'landmarks-klatka.js')
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write('// Wygenerowane przez tools/klatka.py z geometrii BodyParts3D (CC BY-SA 2.1 JP). Punkty wyznaczone automatycznie.\n')
        fh.write('// Współrzędne w układzie modelu (1 j. = 10 cm); pary [lewa, prawa]. Poprawki: landmarks-fix.js (tryb „Popraw punkty”).\n')
        fh.write('export const KLATKA_LANDMARKS = ' + json.dumps(L, separators=(',', ':')) + ';\n')
    print('landmarks-klatka.js', os.path.getsize(path), 'B')


if __name__ == '__main__':
    main()
