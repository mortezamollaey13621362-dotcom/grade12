// scripts/preload-cache.js
console.log('🔄 اسکریپت پیش‌بارگذاری کش...');

// این تابع در مرورگر اجرا می‌شود
async function preloadAllLessons() {
    console.log('📚 شروع پیش‌بارگذاری درس‌ها...');
    
    if (!window.cacheManager) {
        console.error('❌ CacheManager موجود نیست');
        return;
    }
    
    try {
        // پیش‌بارگذاری درس‌های 1 تا 8
        const results = [];
        for (let i = 1; i <= 8; i++) {
            try {
                const response = await fetch(`data/lesson${i}/vocab.json`);
                if (response.ok) {
                    results.push({
                        lesson: i,
                        status: 'success'
                    });
                    console.log(`✅ درس ${i} بارگذاری شد`);
                } else {
                    results.push({
                        lesson: i,
                        status: 'failed',
                        error: 'فایل یافت نشد'
                    });
                }
            } catch (error) {
                results.push({
                    lesson: i,
                    status: 'failed',
                    error: error.message
                });
            }
        }
        
        const successCount = results.filter(r => r.status === 'success').length;
        console.log(`🎯 ${successCount}/8 درس با موفقیت بارگذاری شدند`);
        
        // ذخیره وضعیت در localStorage
        localStorage.setItem('preload_status', JSON.stringify({
            timestamp: new Date().toISOString(),
            results: results,
            successCount: successCount
        }));
        
        return results;
        
    } catch (error) {
        console.error('❌ خطا در پیش‌بارگذاری:', error);
        return null;
    }
}

// اجرای خودکار وقتی اسکریپت لود شد
if (typeof window !== 'undefined') {
    // فقط زمانی اجرا شود که کاربر آنلاین است و قبلاً اجرا نشده
    const lastPreload = localStorage.getItem('preload_timestamp');
    const now = Date.now();
    
    if (!lastPreload || (now - parseInt(lastPreload)) > 24 * 60 * 60 * 1000) {
        // بیش از 24 ساعت گذشته یا اولین بار است
        if (navigator.onLine) {
            console.log('🚀 شروع خودکار پیش‌بارگذاری...');
            setTimeout(() => {
                preloadAllLessons().then(results => {
                    if (results) {
                        localStorage.setItem('preload_timestamp', now.toString());
                    }
                });
            }, 3000); // 3 ثانیه تأخیر
        }
    }
}

// صادر کردن تابع برای استفاده در ماژول‌ها
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { preloadAllLessons };
} else {
    window.preloadAllLessons = preloadAllLessons;
}