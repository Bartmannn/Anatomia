"""Czaszka: paczki modeli (models/pakiety/czaszka-*) i punkty etykiet (landmarks-czaszka.js).

Użycie:  python tools/czaszka.py <folder_z_plikami_stl> [--punkty]
Wymaga: numpy, scipy.  W folderze muszą być też pliki STL kręgów i krążków (środek układu liczony jak
w build_glb.py, więc czaszka leży na kręgu szczytowym), najprościej trzymać wszystkie STL w jednym folderze.
--punkty: tylko punkty i szwy (bez przebudowy paczek).

Co powstaje:
  models/pakiety/czaszka-przeglad.pak    wszystkie kości czaszki i zęby, uproszczone
  models/pakiety/czaszka/<kość>.pak      jedna kość w pełnej rozdzielczości (kości parzyste: obie strony)
  landmarks-czaszka.js                   punkty etykiet (SKULL_LANDMARKS) i przebieg szwów oraz kresy skroniowej (SKULL_LINES)
  models/pakiety/spis.js                 odświeżona lista paczek

Punkty są wyznaczane automatycznie z kształtu kości (najbardziej wysunięte miejsca, przekroje, styki kości).
To przybliżenie — na stronie można je poprawić w trybie „Popraw lub dodaj punkty” (zapis w landmarks-fix.js).
Układ: x — w lewo (lewa strona ciała ma dodatnie x), y — w górę, z — do przodu; 1 jednostka = 10 cm.
Punkty parzyste: [lewa, prawa].
"""
import numpy as np, json, os, sys
from scipy.spatial import cKDTree

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

# klucz: (pliki [lewa, prawa] albo [jedna], trójkąty w przeglądzie na stronę, grupa)
# W BodyParts3D prawa strona ciała ma ujemne x.
BONES = {
    'frontal':   (['FMA52734'], 7000, 'NC'),
    'parietal':  (['FMA52789', 'FMA52788'], 6000, 'NC'),
    'occipital': (['FMA52735'], 6000, 'NC'),
    'temporal':  (['FMA52739', 'FMA52738'], 4500, 'NC'),
    'sphenoid':  (['FMA52736'], 5000, 'NC'),
    'ethmoid':   (['FMA52740'], 2500, 'NC'),
    'nasal':     (['FMA53648', 'FMA53647'], 400, 'VC'),
    'lacrimal':  (['FMA53646', 'FMA53645'], 400, 'VC'),
    'zygomatic': (['FMA52893', 'FMA52892'], 1500, 'VC'),
    'maxilla':   (['FMA53650', 'FMA53649'], 4500, 'VC'),
    'mandible':  (['FMA52748'], 5500, 'VC'),
    'vomer':     (['FMA9710'], 600, 'VC'),
    'palatine':  (['FMA53656', 'FMA53655'], 900, 'VC'),
    'concha':    (['FMA54738', 'FMA54737'], 700, 'VC'),
}
# zęby stałe (bez ósemek — nie ma ich w BodyParts3D): (FMA, szczęka górna?, strona L/R, rodzaj)
TEETH = [
    ('FMA55682', 1, 'L', 'incisor'), ('FMA55683', 1, 'L', 'incisor'), ('FMA55681', 1, 'R', 'incisor'), ('FMA55680', 1, 'R', 'incisor'),
    ('FMA55799', 1, 'L', 'canine'), ('FMA55798', 1, 'R', 'canine'),
    ('FMA55690', 1, 'L', 'premolar'), ('FMA55691', 1, 'L', 'premolar'), ('FMA55689', 1, 'R', 'premolar'), ('FMA55688', 1, 'R', 'premolar'),
    ('FMA55699', 1, 'L', 'molar'), ('FMA55700', 1, 'L', 'molar'), ('FMA55698', 1, 'R', 'molar'), ('FMA55697', 1, 'R', 'molar'),
    ('FMA57143', 0, 'L', 'incisor'), ('FMA57141', 0, 'L', 'incisor'), ('FMA57142', 0, 'R', 'incisor'), ('FMA57140', 0, 'R', 'incisor'),
    ('FMA55687', 0, 'L', 'canine'), ('FMA55686', 0, 'R', 'canine'),
    ('FMA55693', 0, 'L', 'premolar'), ('FMA55692', 0, 'L', 'premolar'), ('FMA55694', 0, 'R', 'premolar'), ('FMA55695', 0, 'R', 'premolar'),
    ('FMA55704', 0, 'L', 'molar'), ('FMA55703', 0, 'L', 'molar'), ('FMA55705', 0, 'R', 'molar'), ('FMA55706', 0, 'R', 'molar'),
]
TOOTH_LOW, TOOTH_HIGH = 250, 1400       # trójkąty na ząb: przegląd / paczka „zęby”


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
class Pts:
    """Wierzchołki jednej kości (jednej strony) z wygodnymi zapytaniami."""

    def __init__(self, u):
        self.u = u
        self.lo, self.hi = u.min(0), u.max(0)

    def sel(self, x=None, y=None, z=None, ax=None):
        """Wierzchołki w przedziałach (None = bez ograniczenia); ax: przedział |x - CX| (odległość od linii środkowej)."""
        m = np.ones(len(self.u), bool)
        for i, r in enumerate((x, y, z)):
            if r is not None: m &= (self.u[:, i] >= r[0]) & (self.u[:, i] <= r[1])
        if ax is not None:
            d = np.abs(self.u[:, 0] - CX); m &= (d >= ax[0]) & (d <= ax[1])
        return self.u[m]

    def best(self, d, **kw):
        """Wierzchołek najdalej w kierunku d (spośród wybranych)."""
        c = self.sel(**kw) if kw else self.u
        if not len(c): raise ValueError(f'brak wierzchołków dla {kw}')
        return c[np.argmax(c @ np.asarray(d, float))]


def side_dir(s, d):
    """Kierunek d=(x,y,z) z x odbitym dla prawej strony (s=1)."""
    return np.array([d[0] * (1 if s == 0 else -1), d[1], d[2]], float)


def at_x(s, off):
    """Przedział x dla odległości off od linii środkowej po stronie s (0 = lewa, +x)."""
    c = CX + (off if s == 0 else -off)
    return (c - 0.025, c + 0.025)


def nearest_on(P, p):
    return P.u[np.argmin(((P.u - p) ** 2).sum(1))]


def outward(p, amount=0.0):
    """Punkt odsunięty od środka mózgoczaszki (żeby linia leżała nad powierzchnią)."""
    v = p - CC
    return p + v / np.linalg.norm(v) * amount


def lateral_hit(tris, y, z, sgn):
    """Pierwsze trafienie promienia biegnącego z boku (od strony sgn) w punkcie (y, z): współrzędna x powierzchni."""
    a, b, c = tris[:, 0], tris[:, 1], tris[:, 2]
    # trójkąty, których rzut na (y, z) zawiera punkt — współrzędne barycentryczne w 2D
    v0, v1 = b[:, 1:] - a[:, 1:], c[:, 1:] - a[:, 1:]
    v2 = np.array([y, z]) - a[:, 1:]
    den = v0[:, 0] * v1[:, 1] - v1[:, 0] * v0[:, 1]
    ok = np.abs(den) > 1e-12
    den = np.where(ok, den, 1)
    u = (v2[:, 0] * v1[:, 1] - v1[:, 0] * v2[:, 1]) / den
    v = (v0[:, 0] * v2[:, 1] - v2[:, 0] * v0[:, 1]) / den
    m = ok & (u >= 0) & (v >= 0) & (u + v <= 1)
    if not m.any(): return None
    x = a[m, 0] + u[m] * (b[m, 0] - a[m, 0]) + v[m] * (c[m, 0] - a[m, 0])
    return float(x.max() if sgn > 0 else x.min())


# ---------------------------------------------------------------- szwy
def suture(A, B, param, n=40, thr=0.025):
    """Przebieg szwu między kośćmi A i B: punkty A blisko B, w każdym przedziale parametru najdalszy od środka."""
    tb = cKDTree(B); d, _ = tb.query(A)
    pts = A[d < thr]
    ta = cKDTree(A); d2, _ = ta.query(B)
    pts = np.concatenate([pts, B[d2 < thr]])
    t = param(pts)
    edges = np.linspace(t.min(), t.max(), n + 1)
    out = []
    for a, b in zip(edges[:-1], edges[1:]):
        m = (t >= a) & (t <= b)
        if m.sum() < 2: continue
        q = pts[m]; r = np.linalg.norm(q - CC, axis=1)
        out.append(q[np.argmax(r)])
    out = np.array(out)
    # wygładzenie (średnia ruchoma) i odsunięcie 0,8 mm nad powierzchnię
    k = 2
    sm = np.array([out[max(0, i - k):i + k + 1].mean(0) for i in range(len(out))])
    return np.array([outward(p, 0.008) for p in sm])


def resample(line, n):
    seg = np.linalg.norm(np.diff(line, axis=0), axis=1); s = np.concatenate([[0], np.cumsum(seg)])
    t = np.linspace(0, s[-1], n)
    return np.stack([np.interp(t, s, line[:, i]) for i in range(3)], 1)


def point_along(line, frac):
    return resample(line, 101)[int(round(frac * 100))]


# ---------------------------------------------------------------- główny program
def main():
    global CX, CC
    allv = np.concatenate([load(f)[0] for f in SPINE])
    center = (allv.min(0) + allv.max(0)) / 2

    side = {}     # (klucz, s) -> (u, f) po wycentrowaniu
    for k, (fids, _, _) in BONES.items():
        for s, fid in enumerate(fids):
            u, f = load(fid); side[(k, s)] = (u - center, f)
    teeth = []
    for fid, up, sd, kind in TEETH:
        u, f = load(fid); teeth.append((fid, up, sd, kind, u - center, f))

    cran = np.concatenate([side[(k, s)][0] for k in ('frontal', 'parietal', 'occipital') for s in range(len(BONES[k][0]))])
    CX = float((cran[:, 0].min() + cran[:, 0].max()) / 2)
    CC = (cran.min(0) + cran.max(0)) / 2
    CC[1] -= 0.15           # środek „kuli” mózgoczaszki trochę niżej niż środek pudełka

    P = {key: Pts(side[key][0]) for key in side}
    lm, lines = landmarks(P, side, teeth)
    write_js(lm, lines)

    if ONLY_POINTS: return
    over = []
    for k, (fids, target, grp) in BONES.items():
        meshes = [side[(k, s)] for s in range(len(fids))]
        lows = [simplify(u, f, target) for u, f in meshes]
        ex = {'kind': 'bone', 'skull': grp, 'fma': ' '.join(fids)}
        over.append((k, *merge(lows), ex))
        u, f = merge(meshes)
        size, tris = write_pack(os.path.join(OUT, 'czaszka', k + '.pak'), [(k, u, f, ex)])
        print(f'czaszka/{k}', size, tris, flush=True)
    ex = {'kind': 'bone', 'skull': 'VC', 'fma': 'zęby'}
    over.append(('teeth', *merge([simplify(u, f, TOOTH_LOW) for *_, u, f in teeth]), ex))
    hi = merge([simplify(u, f, TOOTH_HIGH) for *_, u, f in teeth])
    size, tris = write_pack(os.path.join(OUT, 'czaszka', 'teeth.pak'), [('teeth', *hi, ex)])
    print('czaszka/teeth', size, tris)
    size, tris = write_pack(os.path.join(OUT, 'czaszka-przeglad.pak'), over)
    print('czaszka-przeglad', size, tris)
    write_index()


def landmarks(P, side, teeth):
    L = {}
    pair = lambda fn: [r4(fn(0)), r4(fn(1))]
    one = lambda p: [r4(p)]
    F, O, E, S, V, MD = P[('frontal', 0)], P[('occipital', 0)], P[('ethmoid', 0)], P[('sphenoid', 0)], P[('vomer', 0)], P[('mandible', 0)]
    U = lambda k: np.concatenate([side[(k, s)][0] for s in range(len(BONES[k][0]))])

    # ---- kość skroniowa
    tem = {}
    for s in (0, 1):
        T = P[('temporal', s)]
        latx = abs(T.best(side_dir(s, (1, 0, 0)))[0] - CX)
        mast = T.best((0, -1, -0.15), ax=(latx - 0.12, 9))
        # dół żuchwowy: nad głową żuchwy
        cond = MD.best((0, 1, -0.3), x=(CX, 9) if s == 0 else (-9, CX), z=(MD.lo[2], MD.lo[2] + 0.3))
        fossa = nearest_on(T, cond + np.array([0, 0.05, 0]))
        # otwór słuchowy zewnętrzny: najgłębsze miejsce bocznej powierzchni między wyrostkiem sutkowatym a dołem żuchwowym
        sgn = 1 if s == 0 else -1
        u_, f_ = side[('temporal', s)]
        tri = u_[f_]
        dense = np.concatenate([u_, tri.mean(1), (tri[:, 0] + tri[:, 1]) / 2, (tri[:, 1] + tri[:, 2]) / 2, (tri[:, 0] + tri[:, 2]) / 2])
        m = ((dense[:, 2] > mast[2] - 0.02) & (dense[:, 2] < fossa[2] - 0.06) &
             (dense[:, 1] > mast[1] + 0.05) & (dense[:, 1] < fossa[1] + 0.01))
        win = dense[m]
        cell = 0.012
        keys = np.floor(win[:, 1:] / cell).astype(int)
        best = {}
        for kk, p in zip(map(tuple, keys), win):
            lat = (p[0] - CX) * sgn
            if kk not in best or lat > best[kk][0]: best[kk] = (lat, p)
        # najgłębsza komórka otoczona innymi komórkami (wnętrze otworu, nie brzeg kości)
        cands = [v for kk, v in best.items() if sum((kk[0] + a, kk[1] + b) in best for a in (-1, 0, 1) for b in (-1, 0, 1)) >= 8]
        lim = np.percentile([c[0] for c in cands], 12)
        pm = np.mean([c[1] for c in cands if c[0] <= lim], axis=0)        # środek najgłębszego obszaru
        rimx = np.percentile([v[0] for v in best.values()], 75)
        meatus = np.array([CX + sgn * rimx, pm[1], pm[2]])
        zyg_tip = T.best((0, 0, 1))
        zyg = T.best(side_dir(s, (1, 0, 0)), z=(zyg_tip[2] - 0.14, zyg_tip[2] - 0.06))
        styl = T.best((0, -1, 0.3), ax=(0, latx - 0.18), z=(mast[2], 9))
        squama = T.best(side_dir(s, (1, 0, 0)), y=(meatus[1] + 0.2, meatus[1] + 0.3), z=(meatus[2] - 0.08, meatus[2] + 0.08))
        tem[s] = dict(mastoid=mast, meatus=meatus, fossa=fossa, zyg_proc=zyg, styloid=styl, squama=squama)
    # ---- szwy i kresa skroniowa
    par = [side[('parietal', s)][0] for s in (0, 1)]
    ang_lr = lambda q: np.arctan2(q[:, 0] - CX, q[:, 1] - CC[1])          # od prawej (−) przez szczyt do lewej (+)
    lines = {}
    lines['coronal'] = suture(side[('frontal', 0)][0], np.concatenate(par), ang_lr, n=56)
    lines['sagittal'] = suture(par[0], par[1], lambda q: q[:, 2], n=40)
    lines['lambdoid'] = suture(side[('occipital', 0)][0], np.concatenate(par), ang_lr, n=56)
    for s, nm in ((0, 'squamous_L'), (1, 'squamous_R')):
        lines[nm] = suture(side[('temporal', s)][0], par[s], lambda q: q[:, 2], n=30, thr=0.03)
    for k in lines: lines[k] = resample(lines[k], 64)

    def temporal_line(s):
        """Kresa skroniowa: łuk od wyrostka jarzmowego kości czołowej, pod guzem ciemieniowym, do tyłu nad otwór słuchowy."""
        T = P[('temporal', s)]
        a = F.best(side_dir(s, (0.6, 0.5, 0.2)), y=(F.lo[1], F.lo[1] + 0.25), ax=(0.3, 9))       # tył wyrostka jarzmowego k. czołowej
        tub = P[('parietal', s)].best(side_dir(s, (1, 0.25, 0)))
        me = tem[s]['meatus']
        c = np.array([0, me[1] + 0.15, me[2] - 0.08])                                           # koniec: grzebień nadsutkowy, nad otworem słuchowym
        p1 = np.array([0, tub[1] + 0.05, a[2] - 0.12])                                          # łuk w górę i do tyłu…
        p2 = np.array([0, tub[1] + 0.02, tub[2] - 0.55])                                        # …pod guzem ciemieniowym, potem w dół i do przodu
        # krzywa Béziera a → c (punkty kontrolne p1, p2) w rzucie bocznym (y, z), potem rzut na powierzchnię kości (promień z boku)
        sgn = 1 if s == 0 else -1
        meshes = [side[('frontal', 0)], side[('parietal', s)], side[('temporal', s)], side[('sphenoid', 0)]]
        tris = np.concatenate([u[f] for u, f in meshes])
        tris = tris[((tris[:, :, 0] - CX) * sgn).max(1) > 0.05]
        out = []
        for t in np.linspace(0, 1, 70):
            q = (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * c
            x = lateral_hit(tris, q[1], q[2], sgn)
            if x is not None: out.append(np.array([x + sgn * 0.005, q[1], q[2]]))
        out = np.array(out)
        k = 2
        sm = np.array([out[max(0, i - k):i + k + 1].mean(0) for i in range(len(out))])
        sm[:, 0] = np.where(sgn > 0, np.maximum(sm[:, 0], out[:, 0]), np.minimum(sm[:, 0], out[:, 0]))   # wygładzanie nie może wcisnąć linii w kość
        return resample(sm, 64)

    lines['temporal_line_L'] = temporal_line(0)
    lines['temporal_line_R'] = temporal_line(1)

    # ---- kość czołowa
    mid = (-0.02, 0.02)
    yb = F.lo[1]
    nasion_f = F.best((0, -0.3, 1), x=(CX - 0.02, CX + 0.02), y=(yb, yb + 0.08))
    glab = F.best((0, 0, 1), x=(CX - 0.02, CX + 0.02), y=(yb + 0.08, yb + 0.3))

    def supraorb(s, off):
        sl = F.sel(x=at_x(s, off))
        zmax = sl[:, 2].max()
        front = sl[sl[:, 2] > zmax - 0.12]
        return front[np.argmin(front[:, 1])]
    L['frontal'] = {
        'squama': one(F.best((0, 0.35, 1), x=(CX - 0.02, CX + 0.02), y=(yb + 0.45, yb + 0.75))),
        'tuber': pair(lambda s: F.best((0, 0, 1), x=at_x(s, 0.27), y=(yb + 0.5, yb + 0.6))),
        'glabella': one(glab),
        'arcus': pair(lambda s: F.best((0, 0, 1), x=at_x(s, 0.2), y=(yb + 0.15, yb + 0.25))),
        'margo_so': pair(lambda s: supraorb(s, 0.32)),
        'incisura_so': pair(lambda s: supraorb(s, 0.22)),
        'zyg_proc': pair(lambda s: F.best(side_dir(s, (1, -1.2, 0.3)))),
        'temporal_line': pair(lambda s: point_along(lines[f'temporal_line_{"LR"[s]}'], 0.12)),
        'coronal': pair(lambda s: point_along(lines['coronal'], 0.72 if s == 0 else 0.28)),
        'sinus': one(glab + np.array([0, 0.06, -0.12])),
    }

    # ---- kość ciemieniowa
    L['parietal'] = {
        'tuber': pair(lambda s: P[('parietal', s)].best(side_dir(s, (1, 0.25, 0)))),
        'temporal_line': pair(lambda s: point_along(lines[f'temporal_line_{"LR"[s]}'], 0.55)),
        'coronal': pair(lambda s: point_along(lines['coronal'], 0.72 if s == 0 else 0.28)),
        'sagittal': one(point_along(lines['sagittal'], 0.5)),
        'lambdoid': pair(lambda s: point_along(lines['lambdoid'], 0.72 if s == 0 else 0.28)),
        'squamous': pair(lambda s: point_along(lines[f'squamous_{"LR"[s]}'], 0.5)),
    }

    # ---- kość potyliczna
    ytop = O.hi[1]
    inion = O.best((0, -0.15, -1), x=(CX - 0.02, CX + 0.02), y=(ytop - 0.85, ytop - 0.45))
    midv = O.sel(x=(CX - 0.015, CX + 0.015), y=(O.lo[1], inion[1] - 0.15))
    zs = np.sort(midv[:, 2]); gaps = np.diff(zs); g = np.argmax(gaps)
    fm_z = (zs[g] + zs[g + 1]) / 2
    rim = midv[(np.abs(midv[:, 2] - zs[g]) < 0.01) | (np.abs(midv[:, 2] - zs[g + 1]) < 0.01)]
    fm = np.array([CX, rim[:, 1].min() + 0.01, fm_z])
    L['occipital'] = {
        'protuberance': one(inion),
        'nuchal_sup': pair(lambda s: O.best((0, 0, -1), x=at_x(s, 0.22), y=(inion[1] - 0.06, inion[1] + 0.0))),
        'squama': one(O.best((0, 0, -1), x=(CX - 0.02, CX + 0.02), y=(inion[1] + 0.25, inion[1] + 0.35))),
        'foramen_magnum': one(fm),
        'condyle': pair(lambda s: O.best((0, -1, 0), ax=(0.08, 0.3), z=(fm_z - 0.05, fm_z + 0.3), x=(CX, 9) if s == 0 else (-9, CX))),
        'lambdoid': pair(lambda s: point_along(lines['lambdoid'], 0.72 if s == 0 else 0.28)),
    }

    L['temporal'] = {k: [r4(tem[0][k]), r4(tem[1][k])] for k in ('squama', 'zyg_proc', 'fossa', 'meatus', 'mastoid', 'styloid')}
    L['temporal']['squamous'] = pair(lambda s: point_along(lines[f'squamous_{"LR"[s]}'], 0.5))

    # ---- kość klinowa
    Fu, Pu, Tu = U('frontal'), U('parietal'), U('temporal')
    tf, tp, tt = cKDTree(Fu), cKDTree(Pu), cKDTree(Tu)

    def pterion(s):
        c = S.sel(x=(CX + 0.2, 9) if s == 0 else (-9, CX - 0.2))
        d = np.max([tf.query(c)[0], tp.query(c)[0], tt.query(c)[0]], axis=0)
        return outward(c[np.argmin(d)], 0.004)
    body = S.sel(ax=(0, 0.04))
    sella = body[np.argmax(body[:, 1] - 2.0 * np.abs(body[:, 2] - np.median(body[:, 2])))]
    L['sphenoid'] = {
        'greater_wing': pair(lambda s: S.best(side_dir(s, (1, 0.1, 0.15)))),
        'pterion': pair(pterion),
        'lesser_wing': pair(lambda s: S.best((0, 0.6, 1), ax=(0.1, 0.25), x=(CX, 9) if s == 0 else (-9, CX))),
        'sella': one(sella),
        'pterygoid': pair(lambda s: S.best((0, -1, 0), x=(CX + 0.03, 9) if s == 0 else (-9, CX - 0.03))),
    }

    # ---- kość sitowa
    L['ethmoid'] = {
        'crista_galli': one(E.best((0, 1, 0), ax=(0, 0.02))),
        'cribriform': one(E.best((0, 1, 0), ax=(0.03, 0.07), x=(CX, 9))),
        'perpendicular': one(E.best((0, -1, 0.3), ax=(0, 0.02))),
        'labyrinth': pair(lambda s: E.best(side_dir(s, (1, 0, 0.2)), y=(E.u[:, 1].mean() - 0.04, E.u[:, 1].mean() + 0.06))),
    }

    # ---- twarzoczaszka
    NS = Pts(U('nasal'))
    nas_mid = (NS.lo[1] + NS.hi[1]) / 2
    L['nasal'] = {
        'nasion': one(NS.best((0, 1, 0.2), ax=(0, 0.015))),
        'nasal_dorsum': one(NS.best((0, 0.2, 1), ax=(0, 0.02), y=(nas_mid - 0.03, nas_mid + 0.03))),
    }
    def lac(s):
        La = P[('lacrimal', s)]; c = La.u.mean(0)
        return La.best(side_dir(s, (1, 0, 0.2)), y=(c[1] - 0.03, c[1] + 0.03), z=(c[2], 9))    # przednia połowa powierzchni bocznej
    L['lacrimal'] = {'lacrimal_fossa': pair(lac)}
    def zyg_body(s):
        Z = P[('zygomatic', s)]
        c = Z.u.mean(0)
        return Z.best(side_dir(s, (0.75, 0, 0.65)), y=(c[1] - 0.06, c[1] + 0.04), z=(c[2] - 0.05, c[2] + 0.12))
    L['zygomatic'] = {
        'prominence': pair(lambda s: zyg_body(s)),
        'temporal_proc': pair(lambda s: P[('zygomatic', s)].best((0, 0, -1))),
        'frontal_proc': pair(lambda s: P[('zygomatic', s)].best((0, 1, 0))),
    }

    def infraorb(s):
        M = P[('maxilla', s)]
        sl = M.sel(x=at_x(s, 0.24))
        top = sl[np.argmax(sl[:, 1] + 0.5 * sl[:, 2])]          # brzeg oczodołu nad otworem
        return M.best((0, 0, 1), x=at_x(s, 0.24), y=(top[1] - 0.095, top[1] - 0.055))
    Mx = [P[('maxilla', s)] for s in (0, 1)]
    mx_all = Pts(U('maxilla'))
    prost = mx_all.best((0, -0.5, 1), ax=(0, 0.02))
    L['maxilla'] = {
        'frontal_proc': pair(lambda s: Mx[s].best((0, 1, 0))),
        'infraorbital': pair(infraorb),
        'zyg_proc': pair(lambda s: Mx[s].best(side_dir(s, (1, 0.3, 0)))),
        'sinus': pair(lambda s: infraorb(s) + np.array([(-0.02 if s == 0 else 0.02), -0.12, -0.16])),
        'ans': one(mx_all.best((0, 0, 1), ax=(0, 0.02), y=(prost[1] + 0.12, prost[1] + 0.3))),
        'alveolar': pair(lambda s: Mx[s].best((0, -1, 0.2), x=at_x(s, 0.17))),
        'palatine_proc': one(mx_all.best((0, -1, 0), ax=(0, 0.03), z=(prost[2] - 0.32, prost[2] - 0.15))),
    }

    # żuchwa
    def mside(s): return dict(x=(CX, 9) if s == 0 else (-9, CX))
    cond = lambda s: MD.best((0, 1, -0.3), z=(MD.lo[2], MD.lo[2] + 0.3), **mside(s))
    def coronoid(s):
        c = cond(s)
        return MD.best((0, 1, 0.2), z=(c[2] + 0.12, c[2] + 0.45), ax=(abs(c[0] - CX) - 0.12, 9), **mside(s))
    def ramus(s):
        c, a = cond(s), MD.best(side_dir(s, (0.4, -0.7, -0.6)), **mside(s))
        m = (c + a) / 2 + np.array([0, 0, 0.08])
        return MD.best(side_dir(s, (1, 0, 0)), y=(m[1] - 0.03, m[1] + 0.03), z=(m[2] - 0.05, m[2] + 0.05))
    def mental_for(s):
        sl = MD.sel(x=at_x(s, 0.23))
        ylo, yhi = sl[:, 1].min(), sl[:, 1].max()
        return MD.best(side_dir(s, (0.45, 0, 0.9)), x=at_x(s, 0.23), y=(ylo + 0.4 * (yhi - ylo), ylo + 0.55 * (yhi - ylo)))
    L['mandible'] = {
        'body': pair(lambda s: MD.best(side_dir(s, (0.7, 0, 0.7)), x=at_x(s, 0.3), y=(MD.lo[1] + 0.1, MD.lo[1] + 0.25))),
        'ramus': pair(ramus),
        'angle': pair(lambda s: MD.best(side_dir(s, (0.4, -0.7, -0.6)), **mside(s))),
        'condyle': pair(cond),
        'coronoid': pair(coronoid),
        'mental_foramen': pair(mental_for),
        'mental_prot': one(MD.best((0, -0.4, 1), ax=(0, 0.02))),
        'alveolar': one(MD.best((0, 1, 0.3), ax=(0, 0.03))),
    }
    L['vomer'] = {'vomer': one(V.best((0, -1, -0.6)))}          # tylny brzeg między nozdrzami tylnymi
    L['palatine'] = {'horizontal': pair(lambda s: P[('palatine', s)].best((0, -1, -0.2)))}
    L['concha'] = {'concha': pair(lambda s: P[('concha', s)].best(side_dir(s, (-0.3, 0, 1))))}

    # zęby: punkt na przedniej (zewnętrznej) powierzchni korony zęba górnego danego rodzaju, po stronie L / P
    arch = np.mean([u.mean(0) for *_, u, f in teeth], axis=0)
    def tooth(kind, s, up=1):
        for fid, u_, sd, kd, u, f in teeth:
            if kd == kind and sd == 'LR'[s] and u_ == up:
                c = u.mean(0); d = c - arch; d[1] = 0; d /= np.linalg.norm(d)
                crown = u[u[:, 1] < u[:, 1].min() + 0.045] if up else u[u[:, 1] > u[:, 1].max() - 0.045]
                return crown[np.argmax(crown @ d)]
    L['teeth'] = {k: pair(lambda s, k=k: tooth(k, s)) for k in ('incisor', 'canine', 'premolar', 'molar')}
    return L, lines


def write_js(L, lines):
    path = os.path.join(ROOT, 'landmarks-czaszka.js')
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write('// Wygenerowane przez tools/czaszka.py z geometrii BodyParts3D (CC BY-SA 2.1 JP). Punkty wyznaczone automatycznie.\n')
        fh.write('// Współrzędne w układzie modelu (1 j. = 10 cm); pary [lewa, prawa]. Poprawki: landmarks-fix.js (tryb „Popraw punkty”).\n')
        fh.write('export const SKULL_LANDMARKS = ' + json.dumps(L, separators=(',', ':')) + ';\n')
        fh.write('// Przebieg szwów i kresy skroniowej (linie na modelu).\n')
        fh.write('export const SKULL_LINES = ' + json.dumps({k: [r4(p) for p in v] for k, v in lines.items()}, separators=(',', ':')) + ';\n')
    print('landmarks-czaszka.js', os.path.getsize(path), 'B')


CX, CC = 0.0, np.zeros(3)
if __name__ == '__main__':
    main()
