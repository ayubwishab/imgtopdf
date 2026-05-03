const CACHE_NAME = 'pro-scanner-ayub-v2026';
const ASSETS = [
    './',
    './index.html',
    './app.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://docs.opencv.org/4.5.4/opencv.js'
];

// Menghapus cache versi lama saat update dilakukan
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            );
        })
    );
});

// Strategi: Utamakan ambil dari internet agar tampilan selalu baru
self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
