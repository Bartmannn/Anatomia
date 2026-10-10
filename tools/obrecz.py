"""Obręcz barkowa (łopatka i obojczyk): paczki modeli (models/pakiety/obrecz-*) i punkty etykiet (landmarks-obrecz.js).

Użycie:  python tools/obrecz.py <folder_z_plikami_stl> [--punkty]
Wymaga: numpy.  W folderze muszą być też pliki STL kręgów i krążków (środek układu liczony jak w build_glb.py,
więc łopatki leżą na żebrach z models/zebra.glb), najprościej trzymać wszystkie STL w jednym folderze.
--punkty: tylko punkty (bez przebudowy paczek).

Co powstaje:
  models/pakiety/obrecz-przeglad.pak    łopatki i obojczyki (uproszczone) oraz kości ramienne jako tło
  models/pakiety/obrecz/<kość>.pak      łopatki albo obojczyki (obie strony) w większej szczegółowości
  landmarks-obrecz.js                   punkty etykiet (OBRECZ_LANDMARKS)
  models/pakiety/spis.js                odświeżona lista paczek

Punkty są wyznaczane automatycznie z kształtu kości (najbardziej wysunięte miejsca i przekroje).
To przybliżenie — na stronie można je poprawić w trybie „Popraw lub dodaj punkty” (zapis w landmarks-fix.js).
Układ: x — w lewo (lewa strona ciała ma dodatnie x), y — w górę, z — do przodu; 1 jednostka = 10 cm.
Punkty parzyste: [lewa, prawa].
"""
import numpy as np, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from build_packs import simplify, write_pack, write_index, OUT  # noqa: E402

ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
SRC = os.path.join(ARGS[0] if ARGS else 'bodyparts3d/stl', '')
ONLY_POINTS = '--punkty' in sys.argv

SPINE = ['FMA12519', 'FMA12520', 'FMA12521', 'FMA12522', 'FMA12523', 'FMA12524', 'FMA12525', 'FMA9165', 'FMA9187', 'FMA9209',
         'FMA9248', 'FMA9922', 'FMA9945', 'FMA9968', 'FMA9991', 'FMA10014', 'FMA10037', 'FMA10059', 'FMA10081', 'FMA13072',
         'FMA13073', 'FMA13074', 'FMA13075', 'FMA13076', 'FMA16202', 'FMA25058', 'FMA13896', 'FMA13897', 'FMA13898', 'FMA13899',
         'FMA13900', 'FMA10458', 'FMA13495', 'FMA13500', 'FMA13501', 'FMA13502', 'FMA13503', 'FMA13504', 'FMA13505', 'FMA13506',
         'FMA13507', 'FMA13508', 'FMA13509', 'FMA16033', 'FMA16034', 'FMA16035', 'FMA16036', 'FMA16037']

# klucz: (pliki [lewa, prawa], trójkąty na stronę w przeglądzie, w paczce szczegółowej, grupa)
# W BodyParts3D prawa strona ciała ma ujemne x.
BONES = {
    'scapula':  (['FMA13396', 'FMA13395'], 3500, 24000, 'OB'),
    'clavicle': (['FMA13323', 'FMA13322'], 1200, 5200, 'OB'),
}
# tło: kości ramienne (głowa kości ramiennej leży w panewce łopatki); nazwy jak w kosci-tla.pak (tools/muscles.py)
CONTEXT = [('humerus_L', 'FMA23131', 2200, {'bone': 'humerus', 'side': 'L'}),
           ('humerus_R', 'FMA23130', 2200, {'bone': 'humerus', 'side': 'R'})]


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


def r4(p):
    return [round(float(x), 4) for x in p]


# ---------------------------------------------------------------- pomocnicze do punktów
class Bone:
    """Wierzchołki jednej kości po jednej stronie. Współrzędna `lat` rośnie w bok (od linii środkowej), niezależnie od strony."""

    def __init__(self, u, s):
        self.u, self.s = u, s
        self.sgn = 1 if s == 0 else -1
        self.lat = u[:, 0] * self.sgn

    def mask(self, lat=None, y=None, z=None):
        m = np.ones(len(self.u), bool)
        for v, r in ((self.lat, lat), (self.u[:, 1], y), (self.u[:, 2], z)):
            if r is not None: m &= (v >= r[0]) & (v <= r[1])
        return m

    def best(self, d, **kw):
        """Wierzchołek najdalej w kierunku d = (w bok, w górę, do przodu) spośród wybranych (lat/y/z: przedziały)."""
        m = self.mask(**kw)
        if not m.any(): raise ValueError(f'brak wierzchołków dla {kw}')
        c = self.u[m]
        q = np.stack([c[:, 0] * self.sgn, c[:, 1], c[:, 2]], 1)
        return c[np.argmax(q @ np.asarray(d, float))]

    def near(self, p, r):
        return self.u[np.linalg.norm(self.u - p, axis=1) < r]

    def surface(self, p):
        """Wierzchołek najbliższy punktowi p (punkt „przyklejony” do powierzchni kości)."""
        return self.u[np.argmin(((self.u - p) ** 2).sum(1))]


class Blade:
    """Układ współrzędnych trzonu łopatki: a — w bok (od brzegu przyśrodkowego), b — w górę, c — do tyłu (od żeber).
    Łopatka jest wygięta i leży skośnie na klatce piersiowej, więc „najbardziej z tyłu” w układzie ciała to nie grzebień,
    tylko dolna część trzonu. Płaszczyznę trzonu wyznacza analiza głównych składowych tylnej części kości."""

    def __init__(self, B):
        blade = B.u[B.u[:, 2] < np.percentile(B.u[:, 2], 70)]          # bez wyrostka kruczego (wystaje do przodu)
        m = blade.mean(0)
        w, V = np.linalg.eigh(np.cov((blade - m).T))
        n = V[:, 0] if V[2, 0] < 0 else -V[:, 0]                       # normalna w stronę pleców
        e_up = np.array([0, 1.0, 0]) - n * n[1]; e_up /= np.linalg.norm(e_up)
        e_lat = np.cross(e_up, n)
        if e_lat[0] * B.sgn < 0: e_lat = -e_lat
        self.B, self.L = B, np.stack([(B.u - m) @ e_lat, (B.u - m) @ e_up, (B.u - m) @ n], 1)

    def arg(self, score, mask=None):
        s = np.where(mask if mask is not None else True, score, -np.inf)
        return self.B.u[int(np.argmax(s))]

    def at(self, p):
        """Położenie (a, b, c) wierzchołka p."""
        return self.L[int(np.argmin(((self.B.u - p) ** 2).sum(1)))]

    def surface(self, a, b, back=True, r=0.03):
        """Punkt na powierzchni tylnej (back) albo przedniej (żebrowej) trzonu nad miejscem (a, b)."""
        m = np.hypot(self.L[:, 0] - a, self.L[:, 1] - b) < r
        return self.arg(self.L[:, 2] * (1 if back else -1), m)


def scapula_points(B):
    F = Blade(B)
    a, b, c = F.L[:, 0], F.L[:, 1], F.L[:, 2]
    inf = F.arg(-b)                                                              # kąt dolny
    sup = F.arg(b - 0.6 * a, a < 0)                                              # kąt górny: górny róg części przyśrodkowej
    cor = B.best((0, 0, 1))                                                      # wyrostek kruczy: najbardziej z przodu
    acr = B.best((1, 0.35, 0))                                                   # wyrostek barkowy: najdalej w bok i w górę
    acr_ang = B.best((1, 0.2, -1.2), y=(acr[1] - 0.25, B.u[:, 1].max()))         # kąt barkowy: tylno-boczny róg wyrostka barkowego
    # grzebień: w każdym przekroju trzonu najwyżej wystający (największe c) punkt; prosta b(a) przez szczyty
    crest = []
    for t in np.linspace(-0.2, 0.45, 14):
        m = np.abs(a - t) < 0.02
        if m.sum() > 5: crest.append(F.L[m][np.argmax(c[m])])
    crest = np.array(crest)
    k, b0 = np.polyfit(crest[:, 0], crest[:, 1], 1)
    on_line = np.abs(b - (k * a + b0)) < 0.03
    root = F.arg(-a, on_line)                                                    # trójkąt grzebienia: przyśrodkowy koniec grzebienia
    ar, br, _ = F.at(root)
    am = (ar + F.at(acr_ang)[0]) / 2
    spine = F.arg(c, on_line & (np.abs(a - am) < 0.04))                          # grzebień łopatki w połowie drogi do kąta barkowego
    _, bi, _ = F.at(inf)
    # panewka: najbardziej boczna część poniżej wyrostka barkowego, na wysokości wyrostka kruczego
    lat_of = lambda p: p[0] * B.sgn
    gl_band = dict(y=(cor[1] - 0.45, cor[1] - 0.05), z=(cor[2] - 0.75, cor[2] - 0.15))
    g_edge = B.best((1, 0, 0.25), **gl_band)
    m = B.mask(**gl_band) & (B.lat > lat_of(g_edge) - 0.06)
    gl_pts = B.u[m]
    gl = B.surface(gl_pts.mean(0) + np.array([B.sgn * 0.02, 0, 0]))
    supg = gl_pts[np.argmax(gl_pts[:, 1])]                                       # guzek nadpanewkowy: górny brzeg panewki
    infg = B.best((1, -0.4, 0), y=(gl_pts[:, 1].min() - 0.25, gl_pts[:, 1].min() - 0.05), lat=(lat_of(gl) - 0.4, lat_of(gl)))
    _, bg, _ = F.at(infg)
    bm = bg + 0.5 * (bi - bg)
    lat_b = F.arg(a, np.abs(b - bm) < 0.02)                                      # brzeg boczny: w połowie między guzkiem podpanewkowym a kątem dolnym
    bm = br + 0.5 * (bi - br)
    med_b = F.arg(-a, np.abs(b - bm) < 0.02)                                     # brzeg przyśrodkowy: w połowie między grzebieniem a kątem dolnym
    # doły: 35% szerokości od brzegu przyśrodkowego; nad grzebieniem i pod nim (tył), dół podłopatkowy (przód)
    af = ar + 0.35 * (a.max() - ar)
    bc = k * af + b0
    sup_fossa = F.surface(af, bc + 0.4 * (b[a < af + 0.05].max() - bc))
    inf_fossa = F.surface(af, bc - 0.45 * (bc - bi))
    sub_fossa = F.surface(af, bc - 0.35 * (bc - bi), back=False)
    # brzeg górny i wcięcie łopatki: najwyższy punkt przekrojów między kątem górnym a nasadą wyrostka kruczego (bez niego)
    a_sup, a_cor = F.at(sup)[0], F.at(cor)[0]
    tops = []
    for t in np.linspace(a_sup + 0.08, a_cor - 0.06, 16):
        mm = (np.abs(a - t) < 0.012) & (B.u[:, 2] < cor[2] - 0.25)
        if mm.sum() > 5: tops.append(F.arg(b, mm))
    tops = np.array(tops)
    notch_i = len(tops) // 2 + int(np.argmin(tops[len(tops) // 2:, 1]))          # wcięcie: najniższy szczyt w bocznej połowie
    notch, sup_border = tops[notch_i], tops[notch_i // 2]
    return {
        'angle_sup': sup, 'angle_inf': inf, 'margo_med': med_b, 'margo_lat': lat_b, 'margo_sup': sup_border,
        'notch': notch, 'spine': spine, 'trigonum': root, 'acromion': acr, 'acromial_angle': acr_ang,
        'coracoid': cor, 'glenoid': gl, 'supraglenoid': supg, 'infraglenoid': infg,
        'fossa_supra': sup_fossa, 'fossa_infra': inf_fossa, 'fossa_sub': sub_fossa,
    }


def clavicle_points(B):
    lat_of = lambda p: p[0] * B.sgn
    med = B.best((-1, 0, 0.2))                                                   # koniec mostkowy
    lat = B.best((1, 0, 0))                                                      # koniec barkowy
    span = lat_of(lat) - lat_of(med)
    body_l = lat_of(med) + 0.45 * span
    body = B.best((0, 1, 0.6), lat=(body_l - 0.04, body_l + 0.04))
    con_l = lat_of(med) + 0.78 * span
    conoid = B.best((0, -1, -0.8), lat=(con_l - 0.05, con_l + 0.05))             # guzek stożkowaty (dolna, tylna powierzchnia)
    return {'sternal': med, 'acromial': lat, 'body': body, 'conoid': conoid}


# ---------------------------------------------------------------- główny program
def main():
    allv = np.concatenate([load(f)[0] for f in SPINE])
    center = (allv.min(0) + allv.max(0)) / 2

    side = {}
    for k, (fids, *_) in BONES.items():
        for s, fid in enumerate(fids):
            u, f = load(fid); side[(k, s)] = (u - center, f)

    L = {}
    for k, fn in (('scapula', scapula_points), ('clavicle', clavicle_points)):
        pts = [fn(Bone(side[(k, s)][0], s)) for s in (0, 1)]
        L[k] = {p: [r4(pts[0][p]), r4(pts[1][p])] for p in pts[0]}
    write_js(L)
    if ONLY_POINTS: return

    over = []
    for k, (fids, low, high, grp) in BONES.items():
        ex = {'kind': 'bone', 'set': 'obrecz', 'fma': ' '.join(fids)}
        meshes = [side[(k, s)] for s in range(len(fids))]
        over.append((k, *merge([simplify(u, f, low) for u, f in meshes]), ex))
        u, f = merge([simplify(u, f, high) for u, f in meshes])
        size, tris = write_pack(os.path.join(OUT, 'obrecz', k + '.pak'), [(k, u, f, ex)])
        print(f'obrecz/{k}', size, tris, flush=True)
    for name, fid, target, ex in CONTEXT:
        u, f = load(fid)
        over.append((name, *simplify(u - center, f, target), {'kind': 'ctxbone', 'fma': fid, **ex}))
    size, tris = write_pack(os.path.join(OUT, 'obrecz-przeglad.pak'), over)
    print('obrecz-przeglad', size, tris)
    write_index()


def write_js(L):
    path = os.path.join(ROOT, 'landmarks-obrecz.js')
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write('// Wygenerowane przez tools/obrecz.py z geometrii BodyParts3D (CC BY-SA 2.1 JP). Punkty wyznaczone automatycznie.\n')
        fh.write('// Współrzędne w układzie modelu (1 j. = 10 cm); pary [lewa, prawa]. Poprawki: landmarks-fix.js (tryb „Popraw punkty”).\n')
        fh.write('export const OBRECZ_LANDMARKS = ' + json.dumps(L, separators=(',', ':')) + ';\n')
    print('landmarks-obrecz.js', os.path.getsize(path), 'B')


if __name__ == '__main__':
    main()
