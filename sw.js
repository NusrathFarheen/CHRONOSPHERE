const CACHE_NAME = 'chronosphere-v3';
const ASSETS = [
    './',
    './index.html',
    './styles/main.css',
    './styles/simulator.css',
    './js/app.js',
    './data/africa.json',
    './data/asia.json',
    './data/americas.json',
    './data/europe.json',
    './data/oceania.json',
    './data/global.json'
];

// Install: Cache all assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting(); // Force activation
});

// Activate: Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
    self.clients.claim(); // Take control immediately
});

// Fetch: Network-first for app logic, Cache-first for data
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Check if it's a project logic file
    const isLogicFile = url.pathname.endsWith('app.js') ||
        url.pathname.endsWith('main.css') ||
        url.pathname.endsWith('simulator.css');

    if (isLogicFile) {
        // Network first, fallback to cache
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
    } else {
        // Cache first, fallback to network
        event.respondWith(
            caches.match(event.request).then(response => response || fetch(event.request))
        );
    }
});
