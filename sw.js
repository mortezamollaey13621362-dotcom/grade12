const APP_VERSION = '1.0.0';
const CACHE_NAMES = {
  static: `english-app-static-${APP_VERSION}`,
  data: `english-app-data-${APP_VERSION}`
};

// فایل‌های ضروری (ثابت)
const STATIC_ASSETS = [
  './',
  './index.html',
  './lesson.html',
  './offline.html',
  './manifest.json',
  './favicon.ico'
];

// ==================== نصب ====================
self.addEventListener('install', event => {
  console.log('📱 نصب اپلیکیشن آموزش زبان');
  
  event.waitUntil(
    Promise.all([
      // کش کردن فایل‌های ثابت
      caches.open(CACHE_NAMES.static).then(cache => {
        console.log('📦 کش کردن فایل‌های اصلی...');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // کش کردن خودکار ماژول‌ها
      cacheDynamicModules()
    ]).then(() => self.skipWaiting())
  );
});

// ==================== فعال‌سازی ====================
self.addEventListener('activate', event => {
  console.log('✅ فعال‌سازی کامل');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('english-app-') && !Object.values(CACHE_NAMES).includes(name))
          .map(name => {
            console.log(`🗑️ حذف کش قدیمی: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('🎯 آماده برای درس‌های جدید');
      return self.clients.claim();
    })
  );
});

// ==================== مدیریت درخواست‌ها ====================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  if (request.method !== 'GET') return;
  
  // برای فایل‌های لوکال
  if (url.origin === location.origin) {
    // استراتژی: Cache First
    event.respondWith(
      handleFetch(request)
    );
    return;
  }
  
  // سایر درخواست‌ها
  event.respondWith(fetch(request));
});

// ==================== توابع کمکی ====================

// کش کردن خودکار ماژول‌ها
async function cacheDynamicModules() {
  console.log('🔍 جستجوی خودکار ماژول‌ها...');
  
  // ماژول‌های اصلی
  const coreModules = [
    './js/app.js',
    './js/utils/UI.js',
    './js/utils/Storage.js',
    './js/store.js',
    './js/modules/LessonManager.js',
    './js/modules/ProgressManager.js',
    './js/modules/SectionRenderer.js',
    './js/modules/AudioManager.js',
    './js/modules/Vocabulary.js',
    './js/modules/Grammar.js',
    './js/modules/Conversation.js',
    './js/modules/Listening.js',
    './js/modules/Speaking.js',
    './js/modules/Flashcards.js',
    './js/modules/Quiz.js',
    './js/modules/Games.js',
    './css/style.css',
    './css/modern-ui.css'
  ];
  
  const cache = await caches.open(CACHE_NAMES.static);
  let successCount = 0;
  
  for (const module of coreModules) {
    try {
      await cache.add(module);
      successCount++;
      console.log(`✅ ${module}`);
    } catch (error) {
      // نادیده بگیر
    }
  }
  
  console.log(`✅ ${successCount} ماژول کش شدند`);
}

// مدیریت درخواست
async function handleFetch(request) {
  const url = new URL(request.url);
  
  // اگر درس است
  if (url.pathname.includes('/data/lesson') && url.pathname.endsWith('.json')) {
    return handleLessonRequest(request);
  }
  
  // اگر فایل استاتیک است
  return handleStaticRequest(request);
}

// مدیریت درخواست درس
async function handleLessonRequest(request) {
  const cache = await caches.open(CACHE_NAMES.data);
  const cached = await cache.match(request);
  
  // اگر در کش بود
  if (cached) {
    console.log(`📚 خواندن از کش: ${getLessonName(request.url)}`);
    return cached;
  }
  
  // از شبکه بگیر
  try {
    const response = await fetch(request);
    
    // اگر موفق بود
    if (response.ok) {
      console.log(`📥 دریافت جدید: ${getLessonName(request.url)}`);
      // ذخیره در کش
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // اگر خطا 404 بود (درس وجود ندارد)
    console.log(`⚠️ ${getLessonName(request.url)} هنوز اضافه نشده`);
    
    // پیام مناسب برگردان
    return new Response(JSON.stringify({
      error: 'این درس هنوز اضافه نشده است',
      available: 'درس‌های فعلی: ۱، ۲، ۳',
      tip: 'می‌توانید بعداً این درس را اضافه کنید'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 404
    });
  }
}

// مدیریت فایل‌های استاتیک
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAMES.static);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    
    // اگر فایل مهمی بود، در کش ذخیره کن
    if (response.ok && isImportantFile(request.url)) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // اگر صفحه اصلی بود، offline.html برگردان
    if (request.destination === 'document') {
      const offline = await caches.match('./offline.html');
      if (offline) return offline;
    }
    
    return new Response('خطا در بارگذاری', { status: 500 });
  }
}

// تشخیص فایل مهم
function isImportantFile(url) {
  const importantPatterns = [
    /\.css$/,
    /\.js$/,
    /\.woff2$/,
    /\.png$/,
    /\/images\//,
    /\/fonts\//
  ];
  
  return importantPatterns.some(pattern => pattern.test(url));
}

// استخراج نام درس از URL
function getLessonName(url) {
  const match = url.match(/lesson(\d+)/);
  if (match) {
    return `درس ${match[1]}`;
  }
  return 'نامشخص';
}

// ==================== پیام‌های سیستم ====================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAMES.data).then(() => {
      console.log('🧹 کش داده‌ها پاک شد');
    });
  }
  
  if (event.data && event.data.type === 'GET_STATUS') {
    caches.keys().then(cacheNames => {
      event.ports[0].postMessage({
        type: 'STATUS',
        version: APP_VERSION,
        caches: cacheNames,
        ready: true
      });
    });
  }
});

console.log('🚀 Service Worker برای English 12 App بارگذاری شد');