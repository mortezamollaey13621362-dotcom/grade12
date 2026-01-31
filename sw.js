const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `english-app-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `english-app-dynamic-${CACHE_VERSION}`;
const AUDIO_CACHE = `english-app-audio-${CACHE_VERSION}`;

// فایل‌های استاتیک
const STATIC_FILES = [
  '/grade12/',
  '/grade12/index.html',
  '/grade12/offline.html',
  '/grade12/app.js',
  '/grade12/modules/AudioManager.js',
  '/grade12/modules/Games.js',
  '/grade12/modules/Speaking.js',
  '/grade12/modules/Vocabulary.js',
  '/grade12/modules/Grammar.js',
  '/grade12/modules/Flashcards.js',
  '/grade12/modules/Quiz.js',
  '/grade12/modules/LessonManager.js',
  '/grade12/modules/ProgressManager.js',
  '/grade12/modules/SectionRenderer.js',
  '/grade12/modules/Review.js',
  '/grade12/modules/Listening.js',
  '/grade12/modules/Conversation.js',
  '/grade12/modules/QuizGenerator.js',
  '/grade12/modules/QuizHistoryManager.js',
  '/grade12/offline-audio.js',
  '/grade12/audio-system.css',
  '/grade12/audio-system.js',
  '/grade12/lesson-ui.js'
];

// نصب
self.addEventListener('install', event => {
  console.log('🔧 Service Worker Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Caching static files...');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('❌ Cache failed:', err))
  );
});

// فعال‌سازی
self.addEventListener('activate', event => {
  console.log('✅ Service Worker Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('english-app-'))
          .filter(name => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== AUDIO_CACHE)
          .map(name => {
            console.log('🗑️ Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// درخواست‌ها
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // فقط درخواست‌های same-origin
  if (url.origin !== location.origin) {
    return;
  }

  // درخواست‌های صوتی
  if (url.pathname.includes('/audio/') || request.destination === 'audio') {
    event.respondWith(handleAudioRequest(request));
    return;
  }

  // استراتژی Cache First برای استاتیک، Network First برای دینامیک
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          console.log('💾 Serving from cache:', request.url);
          return response;
        }
        
        return fetch(request).then(fetchResponse => {
          if (!fetchResponse || fetchResponse.status !== 200) {
            return fetchResponse;
          }
          
          // کش کردن پاسخ‌های موفق
          const responseToCache = fetchResponse.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, responseToCache);
          });
          
          return fetchResponse;
        });
      })
      .catch(() => {
        // اگر آفلاین است و درخواست صفحه است
        if (request.destination === 'document') {
          return caches.match('/grade12/offline.html');
        }
      })
  );
});

// مدیریت صوت
async function handleAudioRequest(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('🎵 Playing cached audio:', request.url);
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      console.log('🎵 Caching new audio:', request.url);
      cache.put(request, response.clone());
      return response;
    }
  } catch (error) {
    console.log('❌ Audio fetch failed:', error);
  }
  
  // سیگنال استفاده از صدای آفلاین
  return new Response(JSON.stringify({ error: 'USE_OFFLINE_AUDIO' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 503
  });
}

// پیام‌های کلاینت
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
