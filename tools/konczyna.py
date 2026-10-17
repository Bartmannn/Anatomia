"""Kończyna górna (na razie kość ramienna): paczki modeli (models/pakiety/konczyna-*) i punkty etykiet (landmarks-konczyna.js).

Użycie:  python tools/konczyna.py <folder_z_plikami_stl> [--punkty]
Wymaga: numpy.  W folderze muszą być też pliki STL kręgów i krążków (środek układu liczony jak w build_glb.py,
więc kość ramienna leży przy łopatce z obrecz-przeglad.pak), najprościej trzymać wszystkie STL w jednym folderze.
--punkty: tylko punkty (bez przebudowy paczek).

Co powstaje:
  models/pakiety/konczyna-przeglad.pak    kości ramienne (uproszczone)
  models/pakiety/konczyna/<kość>.pak      kości ramienne (obie strony) w większej szczegółowości
  landmarks-konczyna.js                   punkty etykiet (KONCZYNA_LANDMARKS)
  models/pakiety/spis.js                  odświeżona lista paczek

Punkty są wyznaczane automatycznie z kształtu kości (przekroje poprzeczne wzdłuż osi kości: najbardziej wystające
i najbardziej wklęsłe miejsca w danym kierunku). To przybliżenie — na stronie można je poprawić w trybie
„Popraw lub dodaj punkty” (zapis w landmarks-fix.js).
Układ: x — w lewo (lewa strona ciała ma dodatnie x), y — w górę, z — do przodu; 1 jednostka = 10 cm.
Punkty parzyste: [lewa, prawa].
"""
import numpy as np, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from build_packs import simplify, write_pack, write_index, OUT  # noqa: E402
from obrecz import SPINE, load, merge, r4  # noqa: E402

ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
SRC = os.path.join(ARGS[0] if ARGS else 'bodyparts3d/stl', '')
ONLY_POINTS = '--punkty' in sys.argv

# klucz: (pliki [lewa, prawa], trójkąty na stronę w przeglądzie, w paczce szczegółowej, grupa)
BONES = {
    'humerus': (['FMA23131', 'FMA23130'], 2400, 14000, 'RA'),
}


class Long:
    """Kość długa w układzie jej osi: t — od końca dalszego (0) do bliższego (1), kąt wokół osi:
    0° — w bok (od tułowia), 90° — do przodu, 180° — przyśrodkowo, 270° — do tyłu. Niezależnie od strony ciała."""

    def __init__(self, u, f, s):
        self.u = u
        sgn = 1 if s == 0 else -1                               # lewa strona ciała ma dodatnie x
        m = u.mean(0)
        w, V = np.linalg.eigh(np.cov((u - m).T))
        up = V[:, 2] if V[1, 2] > 0 else -V[:, 2]               # najdłuższa oś, zwrócona w górę
        ant = np.array([0, 0, 1.0]) - up * up[2]; ant /= np.linalg.norm(ant)
        lat = np.cross(up, ant)
        if lat[0] * sgn < 0: lat = -lat
        self.e = (lat, up, ant)
        h = (u - m) @ up
        self.t = (h - h.min()) / (h.max() - h.min())
        self.len = h.max() - h.min()
        self.x, self.z = (u - m) @ lat, (u - m) @ ant
        self.sgn = sgn
        # normalne wierzchołków (suma normalnych trójkątów) w układzie kości: nx — w bok, ny — w górę, nz — do przodu
        fn = np.cross(u[f[:, 1]] - u[f[:, 0]], u[f[:, 2]] - u[f[:, 0]])
        n = np.zeros_like(u)
        for i in range(3): np.add.at(n, f[:, i], fn)
        n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
        if (n * (u - m)).sum() < 0: n = -n                       # na zewnątrz
        self.n = np.stack([n @ lat, n @ up, n @ ant], 1)

    def ring(self, t, dt=0.02):
        """Przekrój na wysokości t: indeksy wierzchołków, ich kąt (stopnie) i odległość od środka przekroju."""
        idx = np.nonzero(np.abs(self.t - t) < dt)[0]
        x, z = self.x[idx], self.z[idx]
        cx, cz = (x.min() + x.max()) / 2, (z.min() + z.max()) / 2
        ang = np.degrees(np.arctan2(z - cz, x - cx)) % 360
        return idx, ang, np.hypot(x - cx, z - cz)

    def outer(self, t, a0, a1, step=6):
        """Zewnętrzny obrys przekroju t w przedziale kątów [a0, a1]: lista (kąt, promień, indeks wierzchołka)."""
        idx, ang, r = self.ring(t)
        out = []
        for a in np.arange(a0, a1 + 1e-6, step):
            d = (ang - a % 360 + 180) % 360 - 180
            m = np.abs(d) < step / 2
            if m.any():
                j = np.argmax(np.where(m, r, -1))
                out.append((a, r[j], idx[j]))
        return out

    def ridge(self, t, a0, a1):
        """Najbardziej wystające miejsce przekroju w przedziale kątów (brzeg, grzebień, guzek)."""
        return self.u[max(self.outer(t, a0, a1), key=lambda o: o[1])[2]]

    def groove(self, t, a0, a1):
        """Najgłębsze miejsce obrysu w przedziale kątów (bruzda, dół)."""
        return self.u[min(self.outer(t, a0, a1), key=lambda o: o[1])[2]]

    def at(self, t, a):
        """Punkt na powierzchni przekroju t w kierunku a."""
        idx, ang, r = self.ring(t)
        d = np.abs((ang - a % 360 + 180) % 360 - 180)
        m = d < d.min() + 6                                   # wierzchołki w kierunku a — z nich najbardziej zewnętrzny
        return self.u[idx[np.argmax(np.where(m, r, -1))]]

    def best(self, d, t=(0, 1)):
        """Wierzchołek najdalej w kierunku d = (w bok, w górę, do przodu) w przedziale wysokości t."""
        m = (self.t >= t[0]) & (self.t <= t[1])
        q = np.stack([self.x, self.t * self.len, self.z], 1)
        s = np.where(m, q @ np.asarray(d, float), -np.inf)
        return self.u[int(np.argmax(s))]

    def T(self, p):
        return float(self.t[int(np.argmin(((self.u - p) ** 2).sum(1)))])

    def A(self, p, t):
        """Kąt punktu p w przekroju t."""
        idx, ang, r = self.ring(t, 0.03)
        x, z = self.x[idx], self.z[idx]
        cx, cz = (x.min() + x.max()) / 2, (z.min() + z.max()) / 2
        j = int(np.argmin(((self.u - p) ** 2).sum(1)))
        return float(np.degrees(np.arctan2(self.z[j] - cz, self.x[j] - cx)) % 360)


def humerus_points(B):
    P = {}
    idx = lambda p: int(np.argmin(((B.u - p) ** 2).sum(1)))
    # koniec bliższy: głowa patrzy przyśrodkowo, w górę i nieco do tyłu; guzek większy — w bok, mniejszy — do przodu
    P['caput'] = B.best((-1, 0.5, 0.15), (0.85, 1))
    P['tub_major'] = B.best((1, 0.25, 0.1), (0.86, 1))
    P['tub_minor'] = B.best((-0.25, 0, 1), (0.84, 0.95))
    tl = B.T(P['tub_minor'])
    a_mi = B.A(P['tub_minor'], tl)
    # bruzda międzyguzkowa: najgłębsze miejsce przedniego obrysu między guzkami
    tb = min(tl, 0.92) - 0.02
    P['sulcus_it'] = B.groove(tb, 50, a_mi - 8)
    a_s = B.A(P['sulcus_it'], tb)
    # grzebienie guzków: brzegi bruzdy niżej, w przedłużeniu guzków (po obu stronach bruzdy)
    tc = tb - 0.08
    P['crista_major'] = B.at(tc, a_s - 28)
    P['crista_minor'] = B.at(tc, a_s + 28)
    # szyjka anatomiczna: brzeg powierzchni stawowej głowy. Kula dopasowana do głowy; punkt ok. 70° od osi głowy, w dół
    near = np.linalg.norm(B.u - P['caput'], axis=1) < 0.18
    A = np.c_[2 * B.u[near], np.ones(near.sum())]
    sol = np.linalg.lstsq(A, (B.u[near] ** 2).sum(1), rcond=None)[0]
    C, R = sol[:3], np.sqrt(sol[3] + sol[:3] @ sol[:3])
    ax = (P['caput'] - C) / np.linalg.norm(P['caput'] - C)
    down = -B.e[1] - ax * (-B.e[1] @ ax); down /= np.linalg.norm(down)
    tgt = np.cos(np.radians(70)) * ax + np.sin(np.radians(70)) * down
    d = B.u - C
    cos = (d @ tgt) / (np.linalg.norm(d, axis=1) + 1e-9)
    P['collum_anat'] = B.u[int(np.argmax(np.where(np.linalg.norm(d, axis=1) < R * 1.4, cos, -2)))]
    # szyjka chirurgiczna: zwężenie pod guzkami (przyśrodkowo)
    P['collum_chir'] = B.at(0.80, 180)
    # trzon i nasady (widoczne od przodu: przód trzonu, bok nasady bliższej pod guzkiem większym, przód nasady dalszej nad dołami)
    P['corpus'] = B.at(0.5, 100)
    P['epiph_prox'] = B.at(0.9, 0)
    P['epiph_dist'] = B.at(0.17, 90)
    # guzowatość naramienna (boczna powierzchnia w połowie trzonu), bruzda nerwu promieniowego (tył, skośnie w dół i w bok)
    P['tub_deltoid'] = B.best((1, 0, 0.3), (0.55, 0.68))
    P['sulcus_radial'] = B.groove(0.52, 280, 340)
    # brzegi dolnej połowy trzonu (przekrój trójkątny): przedni, przyśrodkowy, boczny; między nimi trzy powierzchnie
    P['margo_ant'] = B.best((0, 0, 1), (0.38, 0.46))
    P['margo_med'] = B.best((-1, 0, 0), (0.25, 0.32))
    P['margo_lat'] = B.best((1, 0, 0), (0.25, 0.32))
    a_ant, a_med, a_lat = B.A(P['margo_ant'], 0.36), B.A(P['margo_med'], 0.36), B.A(P['margo_lat'], 0.36)
    if a_lat > 180: a_lat -= 360
    P['facies_am'] = B.at(0.36, (a_ant + a_med) / 2)
    P['facies_al'] = B.at(0.36, (a_ant + a_lat) / 2 % 360)
    P['facies_post'] = B.at(0.36, 270)
    # koniec dalszy: nadkłykcie (najdalej przyśrodkowo i w bok), kłykieć z bloczkiem (przyśrodkowo) i główką (w bok)
    P['epicond_med'] = B.best((-1, 0, 0), (0, 0.2))
    P['epicond_lat'] = B.best((1, 0, 0), (0, 0.2))
    xm, xl = B.x[idx(P['epicond_med'])], B.x[idx(P['epicond_lat'])]
    w = xl - xm
    q = np.stack([B.x, B.t * B.len, B.z], 1)

    def pick(d, x0, x1, t1=0.1):
        m = (B.t < t1) & (B.x > xm + x0 * w) & (B.x < xm + x1 * w)
        return B.u[int(np.argmax(np.where(m, q @ np.asarray(d, float), -np.inf)))]
    P['trochlea'] = pick((0, -1, 0.6), 0.2, 0.45)
    P['capitulum'] = pick((0.2, -0.3, 1), 0.62, 0.9)
    P['condylus'] = pick((0, -1, 0), 0.45, 0.6)

    # doły tuż nad kłykciem: dziobiasty (przód, nad bloczkiem), promieniowy (przód, nad główką), łokciowy (tył, pośrodku).
    # Punkt na powierzchni zwróconej do przodu (albo do tyłu) nad danym miejscem
    def face(x0, t0, sign):
        m = (np.abs(B.t - t0) < 0.015) & (np.abs(B.x - x0) < 0.04) & (B.n[:, 2] * sign > 0.3)
        return B.u[int(np.argmax(np.where(m, B.z * sign, -np.inf)))]
    xt, xc = B.x[idx(P['trochlea'])], B.x[idx(P['capitulum'])]
    P['fossa_coronoid'] = face(xt, 0.085, 1)
    P['fossa_radial'] = face(xc - 0.08 * w, 0.085, 1)
    P['fossa_olecrani'] = face((xt + xc) / 2 - 0.05 * w, 0.075, -1)
    return P


def main():
    allv = np.concatenate([load(f)[0] for f in SPINE])
    center = (allv.min(0) + allv.max(0)) / 2

    side = {}
    for k, (fids, *_) in BONES.items():
        for s, fid in enumerate(fids):
            u, f = load(fid); side[(k, s)] = (u - center, f)

    L = {}
    for k, fn in (('humerus', humerus_points),):
        pts = [fn(Long(*side[(k, s)], s)) for s in (0, 1)]
        L[k] = {p: [r4(pts[0][p]), r4(pts[1][p])] for p in pts[0]}
    write_js(L)
    if ONLY_POINTS: return

    over = []
    for k, (fids, low, high, grp) in BONES.items():
        ex = {'kind': 'bone', 'set': 'konczyna', 'fma': ' '.join(fids)}
        meshes = [side[(k, s)] for s in range(len(fids))]
        over.append((k, *merge([simplify(u, f, low) for u, f in meshes]), ex))
        u, f = merge([simplify(u, f, high) for u, f in meshes])
        size, tris = write_pack(os.path.join(OUT, 'konczyna', k + '.pak'), [(k, u, f, ex)])
        print(f'konczyna/{k}', size, tris, flush=True)
    size, tris = write_pack(os.path.join(OUT, 'konczyna-przeglad.pak'), over)
    print('konczyna-przeglad', size, tris)
    write_index()


def write_js(L):
    path = os.path.join(ROOT, 'landmarks-konczyna.js')
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write('// Wygenerowane przez tools/konczyna.py z geometrii BodyParts3D (CC BY-SA 2.1 JP). Punkty wyznaczone automatycznie.\n')
        fh.write('// Współrzędne w układzie modelu (1 j. = 10 cm); pary [lewa, prawa]. Poprawki: landmarks-fix.js (tryb „Popraw punkty”).\n')
        fh.write('export const KONCZYNA_LANDMARKS = ' + json.dumps(L, separators=(',', ':')) + ';\n')
    print('landmarks-konczyna.js', os.path.getsize(path), 'B')


if __name__ == '__main__':
    main()
