// audio-system.js - سیستم پخش صوت چندلایه
class AudioSystem {
    constructor() {
        this.isOnline = navigator.onLine;
        this.supportsTTS = 'speechSynthesis' in window;
        this.currentAudio = null;
        this.voices = [];
        
        if (this.supportsTTS) {
            this.loadVoices();
        }
        
        // رویدادهای آنلاین/آفلاین
        window.addEventListener('online', () => this.isOnline = true);
        window.addEventListener('offline', () => this.isOnline = false);
    }
    
    loadVoices() {
        // بارگیری صداهای TTS
        this.voices = speechSynthesis.getVoices();
        if (this.voices.length === 0) {
            speechSynthesis.onvoiceschanged = () => {
                this.voices = speechSynthesis.getVoices();
            };
        }
    }
    
    async playWord(word, options = {}) {
        /* پخش یک کلمه
        options = {
            accent: 'us' or 'uk',
            slow: true/false,
            localPath: 'audio/word.mp3'
        }
        */
        const strategies = [
            () => this.tryLocal(options.localPath),
            () => this.tryWebTTS(word, options),
            () => this.tryFallbackTTS(word, options),
            () => this.showText(word)
        ];
        
        for (let i = 0; i < strategies.length; i++) {
            try {
                const result = await this.executeStrategy(strategies[i], i + 1);
                if (result.success) return result;
            } catch (err) {
                console.warn(`استراتژی ${i + 1} ناموفق:`, err);
                continue;
            }
        }
        return { success: false };
    }
    
    async executeStrategy(strategy, strategyNumber) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                strategy().then(resolve).catch(reject);
            }, strategyNumber * 100); // تأخیر برای جلوگیری از تداخل
        });
    }
    
    async tryLocal(path) {
        if (!path) throw new Error('مسیر فایل وجود ندارد');
        
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.src = path;
            audio.preload = 'auto';
            
            audio.oncanplaythrough = () => {
                audio.play()
                    .then(() => resolve({ success: true, method: 'local' }))
                    .catch(reject);
            };
            
            audio.onerror = () => reject(new Error('خطای پخش فایل'));
            audio.load();
        });
    }
    
    async tryWebTTS(text, options) {
        if (!this.supportsTTS) throw new Error('TTS پشتیبانی نمی‌شود');
        
        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);
            
            // تنظیمات صدا
            utterance.lang = options.accent === 'uk' ? 'en-GB' : 'en-US';
            utterance.rate = options.slow ? 0.7 : 1.0;
            utterance.pitch = 1.0;
            
            // انتخاب صدا
            const voice = this.voices.find(v => v.lang.startsWith(utterance.lang));
            if (voice) utterance.voice = voice;
            
            utterance.onstart = () => resolve({ success: true, method: 'web-tts' });
            utterance.onerror = () => { throw new Error('خطای TTS') };
            
            speechSynthesis.cancel();
            speechSynthesis.speak(utterance);
        });
    }
    
    async tryFallbackTTS(text, options) {
        if (!this.isOnline) throw new Error('آفلاین است');
        
        // استفاده از Google Translate TTS (رایگان)
        const lang = options.accent === 'uk' ? 'en-gb' : 'en-us';
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text)}`;
        
        return new Promise((resolve, reject) => {
            const audio = new Audio(url);
            audio.crossOrigin = 'anonymous';
            
            audio.oncanplaythrough = () => {
                audio.play()
                    .then(() => resolve({ success: true, method: 'google-tts' }))
                    .catch(reject);
            };
            
            audio.onerror = reject;
            audio.load();
        });
    }
    
    showText(text) {
        // نمایش متن به عنوان آخرین راه‌حل
        const bubble = document.createElement('div');
        bubble.textContent = `🔊 ${text}`;
        bubble.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #3498db;
            color: white;
            padding: 10px 15px;
            border-radius: 20px;
            z-index: 10000;
            font-size: 16px;
            animation: fadeInOut 2s;
        `;
        
        document.body.appendChild(bubble);
        setTimeout(() => bubble.remove(), 2000);
        
        return Promise.resolve({ success: true, method: 'text-display' });
    }
    
    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        speechSynthesis.cancel();
    }
}

// ایجاد نمونه سراسری
window.AudioPlayer = new AudioSystem();