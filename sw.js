// Praca bez internetu (service worker).
//
// Kod strony i treści (HTML, JS, CSS, content*.js, landmarks*.js): najpierw sieć, a gdy jej nie ma albo
// odpowiada dłużej niż kilka sekund — wersja zapisana w przeglądarce. Dzięki temu poprawki widać od razu,
// a na zajęciach bez Wi-Fi atlas i tak się otworzy.
// three.js, czcionki i ikony: z pamięci (zmieniają się rzadko; po zmianie podnieś WERSJA).
// Modele (.pak): z pamięci, a adres zawiera rozmiar pliku (?v=…), więc przebudowany model pobierze się od nowa.
// Każdy obejrzany kręg czy warstwa mięśni zostaje zapisany; cały moduł można też zapisać z menu „Moduł”.
//
const WERSJA = 'v1';
const PAMIEC_STRONY = `anatomia-strona-${WERSJA}`;
const PAMIEC_DANYCH = 'anatomia-dane';        // wspólna z przyciskiem „Zapisz na tym urządzeniu” (js/moduly.js)

const PLIKI_STRONY = [
  './', 'index.html', 'app.js', 'styles.css', 'manifest.webmanifest',
  'content.js', 'content-miesnie.js', 'content-czaszka.js', 'content-obrecz.js',
  'landmarks.js', 'landmarks-ribs.js', 'landmarks-czaszka.js', 'landmarks-obrecz.js', 'landmarks-fix.js',
  'models/pakiety/spis.js',
  'js/stan.js', 'js/widok.js', 'js/malowanie.js', 'js/paczki.js', 'js/punkty.js', 'js/etykiety.js',
  'js/panel.js', 'js/quiz.js', 'js/edytor.js', 'js/celowanie.js', 'js/moduly.js', 'js/petla.js', 'js/miesnie.js',
  'js/czaszka.js', 'js/obrecz.js', 'js/zestawy.js', 'js/szwy.js', 'js/tresci.js',
];
const PLIKI_STALE = [
  'vendor/three/three.module.min.js', 'vendor/three/addons/controls/OrbitControls.js',
  'vendor/three/addons/environments/RoomEnvironment.js',
  'fonts/fonts.css', 'fonts/archivo-latin.woff2', 'fonts/archivo-latin-ext.woff2',
  'fonts/hanken-grotesk-latin.woff2', 'fonts/hanken-grotesk-latin-ext.woff2',
  'fonts/hanken-grotesk-italic-latin.woff2', 'fonts/hanken-grotesk-italic-latin-ext.woff2',
  'fonts/jetbrains-mono-latin.woff2', 'fonts/jetbrains-mono-latin-ext.woff2',
  'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    await (await caches.open(PAMIEC_STRONY)).addAll([...PLIKI_STRONY, ...PLIKI_STALE]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('anatomia-strona-') && k !== PAMIEC_STRONY) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('.pak')) e.respondWith(model(req, url));
  else if (/\.(woff2|png)$/.test(url.pathname) || url.pathname.includes('/vendor/') || url.pathname.endsWith('/fonts/fonts.css')) e.respondWith(zPamieci(req));
  else e.respondWith(najpierwSiec(req));
});

// Kod strony: sieć (najwyżej 4 s), potem pamięć
async function najpierwSiec(req) {
  const cache = await caches.open(PAMIEC_STRONY);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
    ]);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' && await cache.match('index.html'));
    if (hit) return hit;
    throw err;
  }
}

// three.js, czcionki, ikony: pamięć, a gdy ich brak — sieć
async function zPamieci(req) {
  const cache = await caches.open(PAMIEC_STRONY);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

// Modele: pamięć (dokładnie ta wersja, ?v=rozmiar), a gdy jej brak — sieć; starsze wersje tego pliku są usuwane
async function model(req, url) {
  const cache = await caches.open(PAMIEC_DANYCH);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone());
    for (const old of await cache.keys()) {
      const u = new URL(old.url);
      if (u.pathname === url.pathname && u.search !== url.search) cache.delete(old);
    }
  }
  return res;
}
