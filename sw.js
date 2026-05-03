const CACHE_NAME = 'pro-scanner-ayub-v2026';
const ASSETS = [
    './',
    './index.html',
    './app.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://docs.opencv.org/4.5.4/opencv.js'
];

// Menghapus cache lama saat Service Worker baru diaktifkan
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Menghapus cache lama...');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Strategi Network First: Ambil dari internet dulu, kalau offline baru ambil cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
