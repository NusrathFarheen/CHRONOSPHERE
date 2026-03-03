const CACHE_NAME = 'chronosphere-v1';
const ASSETS = [
    './',
    './index.html',
    './styles/main.css',
    './js/app.js',
    './data/africa.json',
    './data/asia.json',
    './data/americas.json',
    './data/europe.json',
    './data/oceania.json',
    './data/global.json'
];

self.addEventListener('install', event => {
    // Force immediate takeover
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    // SILENT ASSASSIN: Destroy all caches from all versions instantly
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Bypass cache entirely to guarantee the user sees the true V4 files
    event.respondWith(fetch(event.request)
        .catch(() => caches.match(event.request))
    );
});
