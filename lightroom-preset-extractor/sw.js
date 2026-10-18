// Caches the app shell so it opens offline once installed.
const CACHE = 'preset-extractor-v1';
const ASSETS = ['./', 'index.html', 'manifest.json', 'icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request).then(hit => hit || fetch(e.request))));
