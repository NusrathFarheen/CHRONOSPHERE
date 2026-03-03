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
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});
