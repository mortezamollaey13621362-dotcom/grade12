// ثبت Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/grade12/sw.js')
      .then(registration => {
        console.log('✅ Service Worker registered:', registration.scope);
        
        // بررسی به‌روزرسانی
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 New Service Worker found');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✨ New version available! Refresh to update.');
              // می‌توانید نوتیفیکیشن نمایش دهید
            }
          });
        });
      })
      .catch(error => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}

// مدیریت نصب PWA
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('📱 Install prompt fired');
  e.preventDefault();
  deferredPrompt = e;
  
  // نمایش دکمه نصب
  if (installBtn) {
    installBtn.style.display = 'block';
  }
});

// کلیک روی دکمه نصب
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      console.log('❌ No install prompt available');
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`📊 User response: ${outcome}`);
    deferredPrompt = null;
    installBtn.style.display = 'none';
  });
}

// زمانی که نصب شد
window.addEventListener('appinstalled', () => {
  console.log('🎉 PWA installed successfully!');
  deferredPrompt = null;
});

// بررسی حالت Standalone
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('📱 Running in PWA mode');
} else {
  console.log('🌐 Running in browser mode');
}
