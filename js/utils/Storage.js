// js/utils/Storage.js
export class Storage {
    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('خطا در ذخیره‌سازی:', e);
            return false;
        }
    }

    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('خطا در بازیابی:', e);
            return defaultValue;
        }
    }

    static remove(key) {
        localStorage.removeItem(key);
    }

    static clear() {
        localStorage.clear();
    }

    static getAudioBlob(key) {
        const dataUrl = localStorage.getItem(`audio_${key}`);
        if (!dataUrl) return null;
        
        // تبدیل data URL به Blob
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)[1];
        const binary = atob(parts[1]);
        const array = [];
        for (let i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
        }
        return new Blob([new Uint8Array(array)], { type: mime });
    }

    static saveAudioBlob(key, blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                localStorage.setItem(`audio_${key}`, reader.result);
                resolve(true);
            };
            reader.readAsDataURL(blob);
        });
    }
}