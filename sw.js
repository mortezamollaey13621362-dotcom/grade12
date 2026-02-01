const APP_VERSION = '1.1.0'; // 🔄 نسخه را افزایش دادم
const CACHE_NAMES = {
  static: `english-app-static-${APP_VERSION}-${Date.now()}`, // 🔄 timestamp اضافه شد
  data: `english-app-data-${APP_VERSION}-${Date.now()}`
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
  console.log('📱 نصب اپلیکیشن آموزش زبان - نسخه ' + APP_VERSION);
  
  event.waitUntil(
    Promise.all([
      // کش کردن فایل‌های ثابت
      caches.open(CACHE_NAMES.static).then(cache => {
        console.log('📦 کش کردن فایل‌های اصلی...');
        return cache.addAll(STATIC_ASSETS.map(url => `${url}?v=${APP_VERSION}`));
      }),
      
      // کش کردن خودکار ماژول‌ها
      cacheDynamicModules()
    ]).then(() => {
      console.log('🚀 پرش از مرحله انتظار...');
      return self.skipWaiting(); // فوراً فعال شو
    })
  );
});

// ==================== فعال‌سازی ====================
self.addEventListener('activate', event => {
  console.log('✅ فعال‌سازی نسخه جدید: ' + APP_VERSION);
  
  event.waitUntil(
    Promise.all([
      // حذف تمام کش‌های قدیمی
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('english-app-') && !name.includes(CACHE_NAMES.static) && !name.includes(CACHE_NAMES.data))
            .map(name => {
              console.log(`🗑️ حذف کش قدیمی: ${name}`);
              return caches.delete(name);
            })
        );
      }),
      
      // کنترل تمام کلاینت‌ها را بگیر
      self.clients.claim().then(() => {
        console.log('🎯 کنترل تمام تب‌ها گرفته شد');
      }),
      
      // به تمام کلاینت‌ها پیام رفرش بده
      notifyClientsToRefresh()
    ])
  );
});

// ==================== مدیریت درخواست‌ها ====================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // درخواست‌های غیر GET را رد کن
  if (request.method !== 'GET') return;
  
  // برای فایل‌های لوکال
  if (url.origin === location.origin) {
    // استراتژی: Cache First (با پارامتر version)
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
      // پارامتر version اضافه کن
      const moduleWithVersion = `${module}?v=${APP_VERSION}`;
      await cache.add(moduleWithVersion);
      successCount++;
      console.log(`✅ ${module}`);
    } catch (error) {
      console.log(`⚠️ خطا در کش کردن ${module}:`, error.message);
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
  const url = new URL(request.url);
  
  // اگر درخواست اصلی بدون پارامتر version است، آن را اضافه کن
  if (!url.searchParams.has('v') && 
      (url.pathname.endsWith('.js') || 
       url.pathname.endsWith('.css') || 
       url.pathname.endsWith('.html'))) {
    url.searchParams.set('v', APP_VERSION);
    const versionedRequest = new Request(url.toString());
    
    // اول از کش با نسخه چک کن
    const cache = await caches.open(CACHE_NAMES.static);
    const cached = await cache.match(versionedRequest);
    
    if (cached) {
      console.log(`📦 بازگردانی با نسخه: ${url.pathname}`);
      return cached;
    }
  }
  
  // جستجوی معمولی
  const cache = await caches.open(CACHE_NAMES.static);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log(`📦 بازگردانی: ${url.pathname}`);
    return cached;
  }
  
  try {
    const response = await fetch(request);
    
    // اگر فایل مهمی بود، در کش ذخیره کن
    if (response.ok && isImportantFile(request.url)) {
      // با پارامتر version ذخیره کن
      const cacheUrl = new URL(request.url);
      if (!cacheUrl.searchParams.has('v')) {
        cacheUrl.searchParams.set('v', APP_VERSION);
      }
      const cacheRequest = new Request(cacheUrl.toString());
      cache.put(cacheRequest, response.clone());
    }
    
    return response;
  } catch (error) {
    // اگر صفحه اصلی بود، offline.html برگردان
    if (request.destination === 'document') {
      const offlineUrl = new URL('./offline.html', location.href);
      offlineUrl.searchParams.set('v', APP_VERSION);
      const offline = await caches.match(offlineUrl);
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
    /\.ico$/,
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

// اطلاع‌رسانی به کلاینت‌ها برای رفرش
async function notifyClientsToRefresh() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    console.log(`📨 اطلاع‌رسانی به کلاینت: ${client.url}`);
    client.postMessage({
      type: 'NEW_VERSION_AVAILABLE',
      version: APP_VERSION,
      action: 'refresh'
    });
  });
}

// ==================== پیام‌های سیستم ====================
self.addEventListener('message', event => {
  const { data, source } = event;
  
  switch (data?.type) {
    case 'SKIP_WAITING':
      console.log('⏩ پرش از مرحله انتظار درخواست شد');
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      console.log('🧹 پاک کردن کش درخواست شد');
      caches.delete(CACHE_NAMES.data).then(() => {
        console.log('✅ کش داده‌ها پاک شد');
        source?.postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
      
    case 'GET_STATUS':
      caches.keys().then(cacheNames => {
        source?.postMessage({
          type: 'STATUS',
          version: APP_VERSION,
          caches: cacheNames,
          ready: true,
          timestamp: Date.now()
        });
      });
      break;
      
    case 'FORCE_REFRESH':
      console.log('🔄 رفرش اجباری درخواست شد');
      notifyClientsToRefresh();
      break;
  }
});

// ==================== مدیریت خطاها ====================
self.addEventListener('error', event => {
  console.error('❌ خطا در Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('❌ خطای Promise در Service Worker:', event.reason);
});

console.log('🚀 Service Worker برای English 12 App بارگذاری شد - نسخه ' + APP_VERSION);