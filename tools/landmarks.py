"""Wyznacza punkty zaczepienia etykiet (części kręgów) z geometrii BodyParts3D.

Użycie:  python tools/landmarks.py <folder_z_plikami_stl> [landmarks.js]
Wymaga: numpy. Układ współrzędnych i centrowanie są takie same jak w build_glb.py.

Punkty są wyznaczane automatycznie (skrajne wierzchołki, promienie przez
otwór kręgowy itp.), więc warto je obejrzeć na modelu i w razie potrzeby
poprawić ręcznie w wygenerowanym pliku.
"""
import numpy as np, json, os, sys

SRC = os.path.join(sys.argv[1] if len(sys.argv) > 1 else 'bodyparts3d/stl', '')
OUT = sys.argv[2] if len(sys.argv) > 2 else 'landmarks.js'

V = [('C1','FMA12519'),('C2','FMA12520'),('C3','FMA12521'),('C4','FMA12522'),('C5','FMA12523'),('C6','FMA12524'),('C7','FMA12525'),
('Th1','FMA9165'),('Th2','FMA9187'),('Th3','FMA9209'),('Th4','FMA9248'),('Th5','FMA9922'),('Th6','FMA9945'),('Th7','FMA9968'),('Th8','FMA9991'),('Th9','FMA10014'),('Th10','FMA10037'),('Th11','FMA10059'),('Th12','FMA10081'),
('L1','FMA13072'),('L2','FMA13073'),('L3','FMA13074'),('L4','FMA13075'),('L5','FMA13076'),('S','FMA16202')]
D = [('C2','FMA25058'),('C3','FMA13896'),('C4','FMA13897'),('C5','FMA13898'),('C6','FMA13899'),('C7','FMA13900'),
('Th1','FMA10458'),('Th2','FMA13495'),('Th3','FMA13500'),('Th4','FMA13501'),('Th5','FMA13502'),('Th6','FMA13503'),('Th7','FMA13504'),('Th8','FMA13505'),('Th9','FMA13506'),('Th10','FMA13507'),('Th11','FMA13508'),('Th12','FMA13509'),
('L1','FMA16033'),('L2','FMA16034'),('L3','FMA16035'),('L4','FMA16036'),('L5','FMA16037')]
PARTS = [(k, f) for k, f in V] + [('D_' + k, f) for k, f in D]


def load(fid):
    d = open(SRC + fid + '.stl', 'rb').read(); n = int.from_bytes(d[80:84], 'little')
    t = np.frombuffer(d[84:84 + n * 50], dtype=np.dtype([('n', '<f4', 3), ('v', '<f4', (3, 3)), ('a', '<u2')]))
    v = t['v'].reshape(-1, 3).astype(np.float64)
    v = np.stack([v[:, 0], v[:, 2], -v[:, 1]], 1) * 0.01
    u, inv = np.unique(np.round(v, 5), axis=0, return_inverse=True)
    return u, inv.reshape(-1, 3)


mesh = {k: load(f) for k, f in PARTS}
allv = np.concatenate([m[0] for m in mesh.values()])
center = (allv.min(0) + allv.max(0)) / 2
mesh = {k: (u - center, f) for k, (u, f) in mesh.items()}


def ray(u, f, o, d):
    """Wszystkie przecięcia promienia o + t*d z siatką; zwraca posortowane t."""
    a, b, c = u[f[:, 0]], u[f[:, 1]], u[f[:, 2]]
    e1, e2 = b - a, c - a
    p = np.cross(d, e2); det = (e1 * p).sum(1)
    ok = np.abs(det) > 1e-12
    inv = np.where(ok, 1 / np.where(ok, det, 1), 0)
    s = o - a
    uu = (s * p).sum(1) * inv
    q = np.cross(s, e1)
    vv = (q @ d) * inv
    t = (e2 * q).sum(1) * inv
    hit = ok & (uu >= 0) & (vv >= 0) & (uu + vv <= 1) & (t > 0)
    ts = np.sort(t[hit])
    # scal bardzo bliskie trafienia (krawędzie wspólne dla dwóch trójkątów)
    out = []
    for x in ts:
        if not out or x - out[-1] > 1e-4: out.append(x)
    return out


def intervals(ts):
    return [(ts[i], ts[i + 1]) for i in range(0, len(ts) - 1, 2)]


def foramen(u, f, xc, y0, y1, need_body=True):
    """Szuka poziomu y z największą przerwą (otworem) między trzonem a łukiem na linii środkowej.
    Pomija poziomy, na których promień ledwo muska brzeg trzonu (przy blaszce granicznej)."""
    zmax = u[:, 2].max()
    rows = []
    for y in np.linspace(y0, y1, 60):
        o = np.array([xc, y, zmax + 1.0]); ts = ray(u, f, o, np.array([0, 0, -1.0]))
        iv = intervals(ts)
        if len(iv) < 2: continue
        zs = [(o[2] - b, o[2] - a) for a, b in iv]  # (z_back, z_front) każdego odcinka, od przodu
        rows.append((zs[0][0] - zs[1][1], y, zs[0][1], zs[0][0], zs[1][1], zs[0][1] - zs[0][0]))
    if not rows: return None
    if need_body:
        dmax = max(r[5] for r in rows)
        rows = [r for r in rows if r[5] >= 0.75 * dmax]
    gap, y, zf, zb, za, _ = max(rows)
    return dict(y=y, z_body_front=zf, z_body_back=zb, z_arch_front=za)


def first_hit(u, f, o, d):
    ts = ray(u, f, np.array(o, float), np.array(d, float))
    return (np.array(o) + ts[0] * np.array(d)) if ts else None


P = lambda p: [round(float(x), 4) for x in p]


def vertebra(k, u, f):
    xc = (u[:, 0].min() + u[:, 0].max()) / 2
    half = (u[:, 0].max() - u[:, 0].min()) / 2
    ymin, ymax = u[:, 1].min(), u[:, 1].max()
    zmin = u[:, 2].min()
    mid = np.abs(u[:, 0] - xc) < 0.04
    L = {}
    fo = foramen(u, f, xc, ymin + 0.1 * (ymax - ymin), ymax - 0.1 * (ymax - ymin), need_body=(k != 'C1'))
    right = u[:, 0] > xc
    lat = lambda i: [P(u[i])]

    def pair(mask, fn):
        out = []
        for side in (right, ~right):
            m = mask & side
            if m.any(): out.append(P(u[np.where(m)[0][fn(u[m])]]))
        return out

    if k == 'S':
        h = ymax - ymin
        top = u[:, 1] > ymax - 0.18 * h
        L['promontorium'] = [P(u[np.where(top)[0][np.argmax(u[top][:, 2])]])]
        band = mid & (u[:, 1] < ymax - 0.3 * h) & (u[:, 1] > ymax - 0.45 * h)
        L['crista_mediana'] = [P(u[np.where(band)[0][np.argmin(u[band][:, 2])]])]
        L['apex'] = [P(u[np.argmin(u[:, 1])])]
        up = u[:, 1] > ymax - 0.35 * h
        L['ala'] = pair(up, lambda s: np.argmax(np.abs(s[:, 0] - xc)))
        zc = (u[:, 2].min() + u[:, 2].max()) / 2
        au = []
        for sgn in (1, -1):
            p = first_hit(u, f, [xc + sgn * 2, ymax - 0.32 * h, zc - 0.05], [-sgn, 0, 0])
            if p is not None: au.append(P(p))
        L['auricular'] = au
        fo = foramen(u, f, xc, ymax - 0.3 * h, ymax - 0.05 * h)
        if fo:
            L['canal'] = [P([xc, fo['y'], (fo['z_body_back'] + fo['z_arch_front']) / 2])]
            post = (u[:, 2] < fo['z_body_back'] - 0.01) & (np.abs(u[:, 0] - xc) > 0.06) & (np.abs(u[:, 0] - xc) < 0.5 * half)
            L['art_sup'] = pair(post, lambda s: np.argmax(s[:, 1]))
        return L

    if fo:
        L['foramen'] = [P([xc, fo['y'], (fo['z_body_back'] + fo['z_arch_front']) / 2])]
    # wyrostki kolczyste C2–C6 są rozdwojone, więc szukamy w szerszym pasie
    spm = np.abs(u[:, 0] - xc) < (0.08 if k in ('C2', 'C3', 'C4', 'C5', 'C6') else 0.04)
    L['spinous'] = [P(u[np.where(spm)[0][np.argmin(u[spm][:, 2])]])]
    L['transverse'] = [P(u[np.argmax(u[:, 0])]), P(u[np.argmin(u[:, 0])])]

    if k == 'C1':
        L['arcus_ant'] = [P(u[np.where(mid)[0][np.argmax(u[mid][:, 2])]])]
        L['arcus_post'] = L.pop('spinous')
        if fo: L['fovea_dentis'] = [P([xc, fo['y'], fo['z_body_back']])]
        lm = (np.abs(u[:, 0] - xc) > 0.08) & (np.abs(u[:, 0] - xc) < 0.62 * half)
        L['massa_lat'] = pair(lm, lambda s: np.argmax(s[:, 1]))
        return L

    zb = fo['z_body_back'] if fo else (u[:, 2].max() - 0.2)
    L['body'] = [P([xc, fo['y'], fo['z_body_front']])] if fo else []
    ax = np.abs(u[:, 0] - xc)
    post = (u[:, 2] < zb - 0.01) & (ax > 0.28 * half) & (ax < 0.62 * half)
    L['art_sup'] = pair(post, lambda s: np.argmax(s[:, 1]))
    L['art_inf'] = pair(post, lambda s: np.argmin(s[:, 1]))
    if k == 'C2':
        dm = ax < 0.06
        L['dens'] = [P(u[np.where(dm)[0][np.argmax(u[dm][:, 1])]])]
        sup = (ax > 0.1) & (ax < 0.62 * half) & (u[:, 2] > zb - 0.05)
        L['art_sup'] = pair(sup, lambda s: np.argmax(s[:, 1]))
    # blaszka łuku: tylna powierzchnia łuku w połowie odległości od linii środkowej do wyrostków stawowych
    lam = []
    if fo and L['art_inf'] and L['art_sup']:
        for ai, asup in zip(L['art_inf'], L['art_sup']):
            xt = xc + 0.5 * ((ai[0] + asup[0]) / 2 - xc)
            zsp = L['spinous'][0][2]
            zlim = zsp + 0.4 * (fo['z_arch_front'] - zsp)   # pomiń tylną część wyrostka kolczystego
            m = (np.abs(u[:, 0] - xt) < 0.012) & (u[:, 2] < fo['z_arch_front'] + 0.01) & (u[:, 2] > zlim) & (u[:, 1] < asup[1]) & (u[:, 1] > ai[1] - 0.05)
            if m.any(): lam.append(P(u[np.where(m)[0][np.argmin(u[m][:, 2])]]))
    L['lamina'] = lam
    # nasada łuku: promień z boku tuż za trzonem
    ped = []
    if fo:
        for sgn in (1, -1):
            ts = ray(u, f, np.array([xc + sgn * 2, fo['y'], zb - 0.025]), np.array([-sgn, 0, 0.0]))
            iv = intervals(ts)
            # wybierz odcinek najbliższy linii środkowej po tej stronie (ściana nasady od strony bocznej)
            cands = [xc + sgn * 2 - sgn * a for a, b in iv]
            cands = [c for c in cands if 0.03 < sgn * (c - xc) < 0.7 * half]
            if cands:
                c = min(cands, key=lambda c: abs(c - xc))
                ped.append(P([c, fo['y'], zb - 0.025]))
    L['pedicle'] = ped
    return L


def disc(u, f):
    xc = (u[:, 0].min() + u[:, 0].max()) / 2
    mid = np.abs(u[:, 0] - xc) < 0.03
    c = (u.min(0) + u.max(0)) / 2
    depth = u[:, 2].max() - u[:, 2].min()
    return {'anulus': [P(u[np.where(mid)[0][np.argmax(u[mid][:, 2])]])],
            'nucleus': [P([xc, c[1], c[2] - 0.08 * depth])]}


res = {}
for k, (u, f) in mesh.items():
    res[k] = disc(u, f) if k.startswith('D_') else vertebra(k, u, f)
    res[k] = {a: b for a, b in res[k].items() if b}

with open(OUT, 'w', encoding='utf-8') as fh:
    fh.write('// Wygenerowane przez tools/landmarks.py z geometrii BodyParts3D (CC BY-SA 2.1 JP).\n')
    fh.write('// Współrzędne w układzie models/kregoslup.glb. Punkty wyznaczone automatycznie.\n')
    fh.write('export const LANDMARKS = ' + json.dumps(res, separators=(',', ':')) + ';\n')
for k in ['C1', 'C2', 'C7', 'Th7', 'L4', 'S', 'D_L4']:
    print(k, {a: len(b) for a, b in res[k].items()})
