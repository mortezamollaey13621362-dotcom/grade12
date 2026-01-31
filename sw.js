const CACHE_NAME = 'english12-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/modern-ui.css',
  '/js/app.js',
  '/js/lesson-ui.js',
  '/data/vocab.json'
];

// نصب Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('فایل‌ها کش شدند');
        return cache.addAll(urlsToCache);
      })
  );
});

// فعال‌سازی و پاک‌سازی کش قدیمی
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// دریافت فایل‌ها
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // اگر در کش بود برگردان
        if (response) {
          return response;
        }
        // وگرنه از شبکه بگیر
        return fetch(event.request);
      })
  );
});
