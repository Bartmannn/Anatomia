"""Mięśnie i kości „tła” (łopatka, obojczyk, kość ramienna, kość biodrowa, potyliczna) do models/pakiety/.

Użycie:  python tools/muscles.py <folder_z_plikami_stl>
Wymaga: numpy.  W folderze muszą być też pliki STL kręgów i krążków (do wyznaczenia środka układu,
tak jak w build_glb.py i ribs.py), więc najprościej trzymać wszystkie pliki STL w jednym folderze.

Co powstaje:
  models/pakiety/kosci-tla.pak          kości, do których przyczepiają się mięśnie grzbietu (uproszczone)
  models/pakiety/miesnie/warstwa-<n>.pak mięśnie danej warstwy (obie strony), uproszczone
  models/pakiety/spis.js                 odświeżona lista paczek (build_packs.write_index)

Każda siatka mięśnia ma w extras: kind='muscle', muscle, part, side (L/R), layer, fma
oraz lbl — punkt etykiety na tylnej powierzchni mięśnia (współrzędne modelu, 1 j. = 10 cm).
"""
import numpy as np, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_packs import simplify, write_pack, write_index, OUT  # noqa: E402

SRC = os.path.join(sys.argv[1] if len(sys.argv) > 1 else 'bodyparts3d/stl', '')

# te same pliki co w build_glb.py: środek układu liczony z kręgów i krążków
SPINE = ['FMA12519', 'FMA12520', 'FMA12521', 'FMA12522', 'FMA12523', 'FMA12524', 'FMA12525', 'FMA9165', 'FMA9187', 'FMA9209',
         'FMA9248', 'FMA9922', 'FMA9945', 'FMA9968', 'FMA9991', 'FMA10014', 'FMA10037', 'FMA10059', 'FMA10081', 'FMA13072',
         'FMA13073', 'FMA13074', 'FMA13075', 'FMA13076', 'FMA16202', 'FMA25058', 'FMA13896', 'FMA13897', 'FMA13898', 'FMA13899',
         'FMA13900', 'FMA10458', 'FMA13495', 'FMA13500', 'FMA13501', 'FMA13502', 'FMA13503', 'FMA13504', 'FMA13505', 'FMA13506',
         'FMA13507', 'FMA13508', 'FMA13509', 'FMA16033', 'FMA16034', 'FMA16035', 'FMA16036', 'FMA16037']

# (nazwa siatki, FMA, docelowa liczba trójkątów, extras). Strona: R = prawa strona ciała (ujemne x), L = lewa.
BONES = [
    ('scapula_R', 'FMA13395', 3200, {'bone': 'scapula', 'side': 'R'}),
    ('scapula_L', 'FMA13396', 3200, {'bone': 'scapula', 'side': 'L'}),
    ('clavicle_R', 'FMA13322', 900, {'bone': 'clavicle', 'side': 'R'}),
    ('clavicle_L', 'FMA13323', 900, {'bone': 'clavicle', 'side': 'L'}),
    ('humerus_R', 'FMA23130', 2200, {'bone': 'humerus', 'side': 'R'}),
    ('humerus_L', 'FMA23131', 2200, {'bone': 'humerus', 'side': 'L'}),
    ('hip_R', 'FMA16586', 2800, {'bone': 'hip', 'side': 'R'}),
    ('hip_L', 'FMA16587', 2800, {'bone': 'hip', 'side': 'L'}),
    ('occipital', 'FMA52735', 2600, {'bone': 'occipital'}),
]

LAYERS = {
    1: [  # warstwa powierzchowna
        ('trapezius_desc_R', 'FMA33586', 2600, {'muscle': 'trapezius', 'part': 'desc', 'side': 'R'}),
        ('trapezius_desc_L', 'FMA33587', 2600, {'muscle': 'trapezius', 'part': 'desc', 'side': 'L'}),
        ('trapezius_trans_R', 'FMA33584', 1800, {'muscle': 'trapezius', 'part': 'trans', 'side': 'R'}),
        ('trapezius_trans_L', 'FMA33585', 1800, {'muscle': 'trapezius', 'part': 'trans', 'side': 'L'}),
        ('trapezius_asc_R', 'FMA33581', 2600, {'muscle': 'trapezius', 'part': 'asc', 'side': 'R'}),
        ('trapezius_asc_L', 'FMA33583', 2600, {'muscle': 'trapezius', 'part': 'asc', 'side': 'L'}),
        ('latissimus_R', 'FMA13358', 5200, {'muscle': 'latissimus', 'part': 'all', 'side': 'R'}),
        ('latissimus_L', 'FMA13359', 5200, {'muscle': 'latissimus', 'part': 'all', 'side': 'L'}),
    ],
    # Do zrobienia (pliki są w paczce źródłowej anatomia-miesnie-zrodla.zip):
    # 2 (pośrednia): równoległoboczny większy FMA13381/13382, mniejszy FMA13383/13384, dźwigacz łopatki FMA32540/32541,
    #    zębaty tylny górny FMA13403/13404, zębaty tylny dolny FMA13405/13406
    # 3 (głęboka): biodrowo-żebrowy FMA22740–22745, najdłuższy FMA22751/22753/22754/22756/22757/22758,
    #    kolcowy FMA22779–22782, płatowaty FMA22726–22729
}


def load(fid):
    d = open(SRC + fid + '.stl', 'rb').read(); n = int.from_bytes(d[80:84], 'little')
    t = np.frombuffer(d[84:84 + n * 50], dtype=np.dtype([('n', '<f4', 3), ('v', '<f4', (3, 3)), ('a', '<u2')]))
    v = t['v'].reshape(-1, 3).astype(np.float64)
    v = np.stack([v[:, 0], v[:, 2], -v[:, 1]], 1) * 0.01      # jak w build_glb.py: Y w górę, 1 j. = 10 cm
    u, inv = np.unique(np.round(v, 5), axis=0, return_inverse=True)
    f = inv.reshape(-1, 3)
    return u, f[(f[:, 0] != f[:, 1]) & (f[:, 1] != f[:, 2]) & (f[:, 0] != f[:, 2])]


def label_point(u):
    """Punkt na tylnej (z ujemne) powierzchni, blisko środka mięśnia — tam stoi etykieta."""
    lo, hi = u.min(0), u.max(0); c = (lo + hi) / 2; r = (hi - lo) / 2
    near = (np.abs(u[:, 0] - c[0]) < 0.35 * r[0] + 1e-6) & (np.abs(u[:, 1] - c[1]) < 0.35 * r[1] + 1e-6)
    cand = u[near] if near.sum() > 10 else u
    p = cand[np.argmin(cand[:, 2])]
    return [round(float(x), 4) for x in p]


def main():
    allv = np.concatenate([load(f)[0] for f in SPINE])
    center = (allv.min(0) + allv.max(0)) / 2

    def build(items, kind, layer=None):
        out = []
        for name, fid, target, ex in items:
            u, f = load(fid); u = u - center
            su, sf = simplify(u, f, target)
            extras = {'kind': kind, 'fma': fid, **ex}
            if layer: extras['layer'] = layer
            if kind == 'muscle': extras['lbl'] = label_point(su)
            out.append((name, su, sf, extras))
            print(f'  {name}: {len(f)} -> {len(sf)}', flush=True)
        return out

    size, tris = write_pack(os.path.join(OUT, 'kosci-tla.pak'), build(BONES, 'ctxbone'))
    print('kosci-tla', size, tris)
    for n, items in LAYERS.items():
        size, tris = write_pack(os.path.join(OUT, 'miesnie', f'warstwa-{n}.pak'), build(items, 'muscle', n))
        print(f'miesnie/warstwa-{n}', size, tris)
    write_index()


if __name__ == '__main__':
    main()
