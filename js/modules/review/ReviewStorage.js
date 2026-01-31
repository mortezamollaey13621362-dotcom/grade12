// js/modules/review/ReviewStorage.js
/**
 * سیستم ذخیره‌سازی پیشرفته و ضدخطا برای داده‌های مرور
 */
export class ReviewStorage {
    constructor(lessonId) {
        this.lessonId = lessonId;
        this.STORAGE_VERSION = '1.0';
        this.initStorage();
    }
    
    initStorage() {
        this.supportsLocalStorage = typeof localStorage !== 'undefined';
        this.supportsIndexedDB = typeof indexedDB !== 'undefined';
    }
    
    getStorageKey(type = 'leitner') {
        return `english7-${this.lessonId}-${type}-v${this.STORAGE_VERSION}`;
    }
    
    async saveData(data, type = 'leitner') {
        try {
            const key = this.getStorageKey(type);
            
            const storageData = {
                data: data,
                metadata: {
                    version: this.STORAGE_VERSION,
                    lastSaved: new Date().toISOString(),
                    lessonId: this.lessonId
                }
            };
            
            if (this.supportsLocalStorage) {
                localStorage.setItem(key, JSON.stringify(storageData));
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Save failed:', error);
            return false;
        }
    }
    
    async loadData(type = 'leitner') {
        try {
            const key = this.getStorageKey(type);
            
            if (this.supportsLocalStorage) {
                const stored = localStorage.getItem(key);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    return parsed.data || [];
                }
            }
            
            return [];
            
        } catch (error) {
            console.error('❌ Load failed:', error);
            return [];
        }
    }
    
    async clearData(type = 'leitner') {
        try {
            const key = this.getStorageKey(type);
            
            if (this.supportsLocalStorage) {
                localStorage.removeItem(key);
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Clear failed:', error);
            return false;
        }
    }
}