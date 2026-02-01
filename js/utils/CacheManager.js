// مدیریت کش برای داده‌های درس‌ها
export class CacheManager {
    constructor() {
        this.cacheName = 'english-app-data';
    }
    
    // کش کردن یک درس
    async cacheLesson(lessonId) {
        try {
            const urls = [
                `data/lesson${lessonId}/vocab.json`,
                `lessons/lesson${lessonId}/vocab.json`
            ];
            
            const cache = await caches.open(this.cacheName);
            
            for (const url of urls) {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        await cache.put(url, response.clone());
                        console.log(`✅ کش شد: ${url}`);
                        return true;
                    }
                } catch (error) {
                    console.warn(`⚠️ خطا در کش کردن ${url}:`, error);
                }
            }
            return false;
        } catch (error) {
            console.error('❌ خطا در کش کردن درس:', error);
            return false;
        }
    }
    
    // دریافت داده‌های کش شده
    async getCachedLesson(lessonId) {
        try {
            const cache = await caches.open(this.cacheName);
            const urls = [
                `data/lesson${lessonId}/vocab.json`,
                `lessons/lesson${lessonId}/vocab.json`
            ];
            
            for (const url of urls) {
                const response = await cache.match(url);
                if (response) {
                    return await response.json();
                }
            }
            return null;
        } catch (error) {
            console.error('❌ خطا در خواندن از کش:', error);
            return null;
        }
    }
    
    // بررسی کش بودن درس
    async isLessonCached(lessonId) {
        try {
            const cache = await caches.open(this.cacheName);
            const urls = [
                `data/lesson${lessonId}/vocab.json`,
                `lessons/lesson${lessonId}/vocab.json`
            ];
            
            for (const url of urls) {
                const response = await cache.match(url);
                if (response) return true;
            }
            return false;
        } catch (error) {
            console.error('❌ خطا در بررسی کش:', error);
            return false;
        }
    }
    
    // پیش‌بارگذاری تمام درس‌ها
    async preloadAllLessons() {
        console.log('📚 شروع پیش‌بارگذاری درس‌ها...');
        const results = [];
        
        for (let i = 1; i <= 8; i++) {
            const success = await this.cacheLesson(i);
            results.push({
                lesson: i,
                cached: success
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const successCount = results.filter(r => r.cached).length;
        console.log(`✅ ${successCount}/8 درس پیش‌بارگذاری شدند`);
        return results;
    }
}