// js/modules/AudioManager.js - نسخه ۶ لایه‌ای کامل + پشتیبانی کامل US/UK
export class AudioManager {
    constructor() {
        this.audioCache = new Map();
        this.localStorageCache = new Map();
        this.isOnline = navigator.onLine;
        this.userInteracted = false;
        this.currentAudio = null;
        this.preferBrowserTTS = true;
        this.failedLayers = new Set(); // ردیابی لایه‌های خراب
        this.layerStats = {
            layer1: 0, // localStorage cache
            layer2: 0, // local files
            layer3: 0, // TTS Premium
            layer4: 0, // TTS Fallback
            layer5: 0, // Basic TTS
            layer6: 0  // Silent fallback
        };
        
        this.initInteractivity();
        this.initCache();
        this.setupOnlineListener();
        this.loadVoices();
        this.checkLocalAudioFiles();
        
        console.log('🎵 AudioManager ۶ لایه‌ای راه‌اندازی شد');
    }

    // ========================================
    // راه‌اندازی اولیه
    // ========================================
    initInteractivity() {
        const events = ['click', 'touchstart', 'keydown'];
        events.forEach(event => {
            document.addEventListener(event, () => {
                this.userInteracted = true;
                console.log('✅ تعامل کاربر فعال شد');
            }, { once: true });
        });
    }

    setupOnlineListener() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.failedLayers.clear(); // ریست خطاها
            console.log('✅ اینترنت متصل شد - لایه‌ها ریست شدند');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('⚠️ حالت آفلاین فعال شد');
        });
    }

    loadVoices() {
        if ('speechSynthesis' in window) {
            speechSynthesis.getVoices();
            
            speechSynthesis.onvoiceschanged = () => {
                const voices = speechSynthesis.getVoices();
                console.log(`🎤 ${voices.length} صدا بارگذاری شد`);
            };
        }
    }

    checkLocalAudioFiles() {
        // بررسی وجود پوشه audio
        this.hasLocalAudioSupport = true; // فرض می‌کنیم فایل‌ها هستند
        console.log('📁 پشتیبانی از فایل‌های محلی فعال است');
    }

    initCache() {
        try {
            const cached = localStorage.getItem('english7_audio_cache');
            if (cached) {
                const cacheData = JSON.parse(cached);
                
                cacheData.forEach(item => {
                    if (item.key && item.type) {
                        this.audioCache.set(item.key, {
                            type: item.type,
                            timestamp: item.timestamp || Date.now()
                        });
                    }
                });
                
                console.log(`🎵 ${this.audioCache.size} آیتم از کش بازیابی شد`);
            }

            // بارگذاری کش صوتی localStorage
            this.loadLocalStorageAudioCache();
        } catch (e) {
            console.warn('⚠️ خطا در بازیابی کش:', e);
        }
    }

    loadLocalStorageAudioCache() {
        try {
            const keys = Object.keys(localStorage);
            const audioKeys = keys.filter(k => k.startsWith('audio_'));
            
            audioKeys.forEach(key => {
                const data = localStorage.getItem(key);
                if (data) {
                    this.localStorageCache.set(key, data);
                }
            });
            
            console.log(`🎧 ${audioKeys.length} فایل صوتی از localStorage بارگذاری شد`);
        } catch (e) {
            console.warn('⚠️ خطا در بارگذاری کش صوتی:', e);
        }
    }

    // ========================================
    // فرمت‌بندی متن انگلیسی
    // ========================================
    _formatEnglishText(text) {
        if (!text || typeof text !== 'string') return text;
        
        let formatted = text.trim();
        if (!formatted) return formatted;

        const punctuationMarks = ['.', '!', '?', ',', ';', ':'];
        const hasPunctuation = punctuationMarks.some(mark => formatted.endsWith(mark));
        
        if (hasPunctuation) {
            return formatted;
        }

        const questionWords = /^(what|who|where|when|why|how|do|does|did|are|is|am|can|could|will|would|should|may|might)\b/i;
        
        if (questionWords.test(formatted)) {
            return formatted + '?';
        }

        if (/^[A-Z]/.test(formatted) && formatted.includes(' ')) {
            return formatted + '.';
        }

        return formatted;
    }

    // ========================================
    // 🎯 متد اصلی: پخش ۶ لایه‌ای + رفع تداخل + پشتیبانی کامل US/UK
    // ========================================
    async playWord(word, accent = 'us') {
        if (!word) {
            console.warn('⚠️ کلمه خالی است');
            return;
        }

        // 🔴 توقف صدای قبلی
        this.stopAudio();
        
        // 🔴 تاخیر کوتاه برای اطمینان از توقف کامل
        await new Promise(resolve => setTimeout(resolve, 50));

        const formattedWord = this._formatEnglishText(word);
        const cacheKey = `${formattedWord}_${accent}`;
        
        const accentFlag = accent === 'uk' ? '🇬🇧' : '🇺🇸';
        console.log(`\n🔊 ${accentFlag} درخواست پخش: "${formattedWord}" (${accent})`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // 🎯 تلاش در تمام لایه‌ها به ترتیب
        const layers = [
            { name: 'Layer 1', method: () => this.tryLayer1_LocalStorageCache(cacheKey, formattedWord, accent) },
            { name: 'Layer 2', method: () => this.tryLayer2_LocalAudioFile(formattedWord, accent) },
            { name: 'Layer 3', method: () => this.tryLayer3_PremiumTTS(formattedWord, accent) },
            { name: 'Layer 4', method: () => this.tryLayer4_FallbackTTS(formattedWord, accent) },
            { name: 'Layer 5', method: () => this.tryLayer5_BasicTTS(formattedWord, accent) },
            { name: 'Layer 6', method: () => this.tryLayer6_SilentFallback(formattedWord, accent) } // ✅ اضافه شد
        ];

        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            
            // اگر این لایه قبلاً خراب شده، رد کن
            if (this.failedLayers.has(layer.name)) {
                console.log(`⏭️  ${layer.name} قبلاً خراب شده - رد می‌شود`);
                continue;
            }

            try {
                console.log(`\n🔄 تلاش با ${layer.name}...`);
                await layer.method();
                
                // ✅ موفق شد!
                this.layerStats[`layer${i + 1}`]++;
                console.log(`✅ ${layer.name} موفق شد!`);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                
                // ذخیره در کش
                this.updateCache(cacheKey, formattedWord, `layer${i + 1}`);
                return;
                
            } catch (error) {
                console.warn(`❌ ${layer.name} ناموفق: ${error.message}`);
                
                // علامت‌گذاری به عنوان خراب (موقتی)
                this.failedLayers.add(layer.name);
                
                // ادامه به لایه بعدی
                continue;
            }
        }

        // 🚨 اگر همه لایه‌ها شکست خوردند (نباید اتفاق بیفته!)
        console.error('🚨 تمام لایه‌ها شکست خوردند! (غیرممکن)');
    }

    // ========================================
    // 🎯 Layer 1: کش localStorage
    // ========================================
    async tryLayer1_LocalStorageCache(cacheKey, word, accent) {
        const audioKey = `audio_${cacheKey}`;
        
        if (!this.localStorageCache.has(audioKey)) {
            throw new Error('موجود نیست در کش');
        }

        const accentFlag = accent === 'uk' ? '🇬🇧' : '🇺🇸';
        console.log(`💾 ${accentFlag} یافت شد در کش localStorage`);
        
        const audioData = this.localStorageCache.get(audioKey);
        
        return new Promise((resolve, reject) => {
            try {
                const audio = new Audio(audioData);
                this.currentAudio = audio;
                audio.volume = 0.8;

                audio.onended = () => {
                    this.currentAudio = null;
                    resolve();
                };

                audio.onerror = (e) => {
                    this.currentAudio = null;
                    reject(new Error('خطا در پخش از کش'));
                };

                audio.play()
                    .then(() => console.log(`▶️ ${accentFlag} پخش از کش شروع شد`))
                    .catch(reject);
                    
            } catch (e) {
                reject(e);
            }
        });
    }

    // ========================================
    // 🎯 Layer 2: فایل‌های محلی audio/
    // ========================================
    async tryLayer2_LocalAudioFile(word, accent) {
        if (!this.hasLocalAudioSupport) {
            throw new Error('پشتیبانی از فایل محلی غیرفعال است');
        }

        // فرمت نام فایل: word_us.mp3 یا word_uk.mp3
        const filename = `${word.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${accent}.mp3`;
        const audioPath = `audio/words/${filename}`;
        
        const accentFlag = accent === 'uk' ? '🇬🇧' : '🇺🇸';
        console.log(`📁 ${accentFlag} جستجوی فایل: ${audioPath}`);

        return new Promise((resolve, reject) => {
            const audio = new Audio(audioPath);
            this.currentAudio = audio;
            audio.volume = 0.8;

            // تایمر برای timeout
            const timeout = setTimeout(() => {
                audio.pause();
                this.currentAudio = null;
                reject(new Error('تایم‌اوت بارگذاری فایل'));
            }, 3000); // 3 ثانیه

            audio.onloadeddata = () => {
                clearTimeout(timeout);
                console.log(`✅ ${accentFlag} فایل محلی بارگذاری شد`);
            };

            audio.onended = () => {
                clearTimeout(timeout);
                this.currentAudio = null;
                
                // ذخیره در کش برای دفعه بعد
                this.saveAudioToCache(word, accent, audioPath);
                resolve();
            };

            audio.onerror = (e) => {
                clearTimeout(timeout);
                this.currentAudio = null;
                reject(new Error('فایل محلی یافت نشد'));
            };

            audio.play()
                .then(() => console.log(`▶️ ${accentFlag} پخش فایل محلی شروع شد`))
                .catch(reject);
        });
    }

    // ========================================
    // 🎯 Layer 3: Web Speech API (Premium)
    // ========================================
    async tryLayer3_PremiumTTS(word, accent) {
        if (!('speechSynthesis' in window)) {
            throw new Error('TTS پشتیبانی نمی‌شود');
        }

        return new Promise((resolve, reject) => {
            speechSynthesis.cancel();

            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(word);
                utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
                utterance.rate = 0.9;
                utterance.volume = 1.0;
                utterance.pitch = 1.0;

                const voices = speechSynthesis.getVoices();
                const targetLang = utterance.lang;
                
                // فقط Google Voice
                let preferredVoice = voices.find(v => 
                    v.lang.startsWith(targetLang.substring(0, 2)) && 
                    v.lang.includes(targetLang) && 
                    v.name.includes('Google')
                );
                
                if (!preferredVoice) {
                    throw new Error('صدای Google یافت نشد');
                }
                
                utterance.voice = preferredVoice;
                const accentFlag = accent === 'uk' ? '🇬🇧' : '🇺🇸';
                console.log(`🎤 ${accentFlag} صدای Premium: ${preferredVoice.name}`);

                utterance.onstart = () => {
                    console.log(`▶️ ${accentFlag} پخش Premium TTS: ${word}`);
                };
                
                utterance.onend = () => {
                    console.log('✅ پخش Premium TTS تمام شد');
                    resolve();
                };
                
                utterance.onerror = (e) => {
                    if (e.error === 'interrupted') {
                        resolve();
                    } else {
                        reject(new Error(`TTS Premium خطا: ${e.error}`));
                    }
                };
                
                speechSynthesis.speak(utterance);
                
            }, 100);
        });
    }

    // ========================================
    // 🎯 Layer 4: Web Speech API (Fallback)
    // ========================================
    async tryLayer4_FallbackTTS(word, accent) {
        if (!('speechSynthesis' in window)) {
            throw new Error('TTS پشتیبانی نمی‌شود');
        }

        return new Promise((resolve, reject) => {
            speechSynthesis.cancel();

            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(word);
                utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
                utterance.rate = 0.9;
                utterance.volume = 1.0;
                utterance.pitch = 1.0;

                const voices = speechSynthesis.getVoices();
                const targetLang = utterance.lang;
                
                // Microsoft یا Mac voices
                let preferredVoice = voices.find(v => 
                    v.lang.startsWith(targetLang.substring(0, 2)) && 
                    v.name.includes('Microsoft')
                );
                
                if (!preferredVoice) {
                    preferredVoice = voices.find(v => 
                        v.lang.startsWith(targetLang.substring(0, 2)) && 
                        (v.name.includes('Samantha') || v.name.includes('Daniel'))
                    );
                }
                
                if (!preferredVoice) {
                    preferredVoice = voices.find(v => v.lang.startsWith(targetLang.substring(0, 2)));
                }
                
                if (!preferredVoice) {
                    throw new Error('صدای Fallback یافت نشد');
                }
                
                utterance.voice = preferredVoice;
                const accentFlag = accent === 'uk' ? '🇬🇧' : '🇺🇸';
                console.log(`🎤 ${accentFlag} صدای Fallback: ${preferredVoice.name}`);

                utterance.onend = () => resolve();
                utterance.onerror = (e) => {
                    if (e.error === 'interrupted') {
                        resolve();
                    } else {
                        reject(new Error(`TTS Fallback خطا: ${e.error}`));
                    }
                };
                
                speechSynthesis.speak(utterance);
                
            }, 150);
        });
    }

    // ========================================
    // 🎯 Layer 5: Basic Speech Synthesis
    // ========================================
    async tryLayer5_BasicTTS(word, accent) {
        if (!('speechSynthesis' in window)) {
            throw new Error('TTS پشتیبانی نمی‌شود');
        }

        return new Promise((resolve, reject) => {
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
            utterance.rate = 0.85;
            utterance.volume = 1.0;
            
            // بدون انتخاب صدا - از پیش‌فرض سیستم استفاده می‌کند
            const accentFlag = accent === 'uk' ? '🇬🇧' : '🇺🇸';
            console.log(`🔊 ${accentFlag} استفاده از صدای پیش‌فرض سیستم`);

            utterance.onend = () => {
                console.log('✅ پخش Basic TTS تمام شد');
                resolve();
            };
            
            utterance.onerror = (e) => {
                reject(new Error(`Basic TTS خطا: ${e.error}`));
            };
            
            speechSynthesis.speak(utterance);
        });
    }

    // ========================================
    // 🎯 Layer 6: Silent Fallback (آخرین راهکار) - ✅ اصلاح شده
    // ========================================
    async tryLayer6_SilentFallback(word, accent = 'us') {
        console.warn('⚠️ تمام لایه‌های صوتی ناموفق - استفاده از Fallback بی‌صدا');
        
        // نمایش اعلان بصری با لهجه
        this.showVisualFeedback(word, accent);
        
        return new Promise((resolve) => {
            const accentFlag = accent === 'uk' ? '🇬🇧' : '🇺🇸';
            console.log(`📝 ${accentFlag} نمایش متنی: ${word}`);
            setTimeout(() => {
                console.log('✅ Fallback بی‌صدا کامل شد');
                resolve();
            }, 800);
        });
    }

    // ========================================
    // نمایش بصری برای حالت بدون صدا - ✅ اصلاح شده
    // ========================================
    showVisualFeedback(word, accent = 'us') {
        const accentLabel = accent === 'uk' ? '🇬🇧 UK' : '🇺🇸 US';
        
        // ایجاد المان موقت برای نمایش
        const feedback = document.createElement('div');
        feedback.innerHTML = `
            <div style="font-size: 18px; margin-bottom: 5px; opacity: 0.8;">${accentLabel}</div>
            <div style="font-size: 28px;">🔇 "${word}"</div>
        `;
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 25px 50px;
            border-radius: 15px;
            text-align: center;
            z-index: 10000;
            animation: fadeInOut 1.5s ease-in-out;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        `;
        
        // افزودن استایل انیمیشن
        if (!document.getElementById('audio-feedback-style')) {
            const style = document.createElement('style');
            style.id = 'audio-feedback-style';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                    50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 1500);
    }

    // ========================================
    // ذخیره در کش
    // ========================================
    updateCache(cacheKey, word, layerUsed) {
        this.audioCache.set(cacheKey, {
            type: layerUsed,
            timestamp: Date.now()
        });
        this.saveCacheMetadata();
    }

    async saveAudioToCache(word, accent, audioUrl) {
        try {
            const response = await fetch(audioUrl);
            const blob = await response.blob();
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result;
                const cacheKey = `audio_${word}_${accent}`;
                
                try {
                    localStorage.setItem(cacheKey, base64);
                    this.localStorageCache.set(cacheKey, base64);
                    const accentFlag = accent === 'uk' ? '🇬🇧' : '🇺🇸';
                    console.log(`💾 ${accentFlag} فایل ذخیره شد در localStorage: ${cacheKey}`);
                } catch (e) {
                    if (e.name === 'QuotaExceededError') {
                        console.warn('⚠️ فضای localStorage پر است - پاکسازی...');
                        this.cleanOldCache();
                    }
                }
            };
            
            reader.readAsDataURL(blob);
        } catch (e) {
            console.warn('⚠️ خطا در ذخیره فایل:', e);
        }
    }

    // ========================================
    // توقف پخش - اصلاح شده برای رفع تداخل
    // ========================================
    stopAudio() {
        // 🔴 متوقف کردن Audio tag
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0; // ریست به ابتدا
                this.currentAudio.src = ''; // آزاد کردن منبع
                this.currentAudio = null;
            } catch (e) {
                console.warn('⚠️ خطا در توقف Audio:', e);
                this.currentAudio = null;
            }
        }
        
        // 🔴 متوقف کردن Speech Synthesis
        if ('speechSynthesis' in window) {
            try {
                speechSynthesis.cancel();
            } catch (e) {
                console.warn('⚠️ خطا در توقف TTS:', e);
            }
        }
        
        console.log('⏹️ تمام صداها متوقف شدند');
    }

    // ========================================
    // مدیریت کش
    // ========================================
    saveCacheMetadata() {
        const cacheArray = Array.from(this.audioCache.entries()).map(([key, value]) => ({
            key,
            type: value.type,
            timestamp: value.timestamp
        }));
        
        try {
            localStorage.setItem('english7_audio_cache', JSON.stringify(cacheArray));
        } catch (e) {
            console.warn('⚠️ خطا در ذخیره metadata کش');
        }
    }

    cleanOldCache() {
        const keys = Object.keys(localStorage);
        const audioKeys = keys.filter(k => k.startsWith('audio_'));
        
        const toRemove = Math.ceil(audioKeys.length * 0.3);
        
        console.log(`🗑️ پاک کردن ${toRemove} فایل صوتی قدیمی`);
        
        for (let i = 0; i < toRemove && i < audioKeys.length; i++) {
            localStorage.removeItem(audioKeys[i]);
            this.localStorageCache.delete(audioKeys[i]);
        }
    }

    // ========================================
    // پیش‌بارگذاری کلمات - ✅ اصلاح شده
    // ========================================
    async preloadLessonAudio(words = [], accent = 'us') {
        if (!this.userInteracted) {
            console.log('⏳ پیش‌بارگذاری بعد از تعامل کاربر');
            return;
        }

        const accentFlag = accent === 'uk' ? '🇬🇧' : '🇺🇸';
        console.log(`🔄 ${accentFlag} پیش‌بارگذاری ${words.length} کلمه (${accent})...`);
        
        for (let i = 0; i < words.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (this.userInteracted) {
                await this.playWord(words[i], accent).catch(() => {});
            }
        }
        
        console.log(`✅ ${accentFlag} پیش‌بارگذاری کامل شد`);
    }

    // ========================================
    // پخش فایل مکالمه
    // ========================================
    async playConversation(audioFile, accent = 'us') {
        if (!audioFile) {
            console.warn('⚠️ فایل صوتی مشخص نشده');
            return;
        }

        if (!this.userInteracted) {
            console.log('⏳ منتظر تعامل کاربر...');
            return;
        }

        // 🔴 توقف صدای قبلی
        this.stopAudio();
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const audioPath = `audio/${audioFile}`;
            const accentFlag = accent === 'uk' ? '🇬🇧' : '🇺🇸';
            console.log(`🎧 ${accentFlag} پخش مکالمه: ${audioPath}`);
            
            return new Promise((resolve, reject) => {
                const audio = new Audio(audioPath);
                this.currentAudio = audio;
                audio.volume = 0.8;

                audio.onended = () => {
                    this.currentAudio = null;
                    console.log('✅ پخش مکالمه تمام شد');
                    resolve();
                };

                audio.onerror = (e) => {
                    this.currentAudio = null;
                    console.warn('❌ خطا در پخش مکالمه:', e);
                    reject(e);
                };

                audio.play()
                    .then(() => console.log(`▶️ ${accentFlag} پخش مکالمه شروع شد`))
                    .catch(reject);
            });

        } catch (error) {
            console.error('❌ خطای پخش مکالمه:', error);
            throw error;
        }
    }

    // ========================================
    // پاکسازی کامل کش
    // ========================================
    clearCache() {
        this.audioCache.clear();
        this.localStorageCache.clear();
        
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('audio_') || key === 'english7_audio_cache') {
                localStorage.removeItem(key);
            }
        });
        
        console.log('🗑️ تمام کش صوتی پاک شد');
    }

    // ========================================
    // آمار کش
    // ========================================
    getCacheStats() {
        const voices = 'speechSynthesis' in window ? speechSynthesis.getVoices().length : 0;
        
        return {
            memoryCache: this.audioCache.size,
            localStorageCache: this.localStorageCache.size,
            userInteracted: this.userInteracted,
            isOnline: this.isOnline,
            availableVoices: voices,
            ttsSupported: 'speechSynthesis' in window,
            failedLayers: Array.from(this.failedLayers),
            layerStats: this.layerStats
        };
    }

    // ========================================
    // گزارش عملکرد
    // ========================================
    printPerformanceReport() {
        console.log('\n📊 گزارش عملکرد سیستم صوتی:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Layer 1 (Cache):         ${this.layerStats.layer1} بار`);
        console.log(`Layer 2 (Local Files):   ${this.layerStats.layer2} بار`);
        console.log(`Layer 3 (Premium TTS):   ${this.layerStats.layer3} بار`);
        console.log(`Layer 4 (Fallback TTS):  ${this.layerStats.layer4} بار`);
        console.log(`Layer 5 (Basic TTS):     ${this.layerStats.layer5} بار`);
        console.log(`Layer 6 (Silent):        ${this.layerStats.layer6} بار`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const total = Object.values(this.layerStats).reduce((a, b) => a + b, 0);
        console.log(`Total Plays: ${total}`);
        console.log(`Failed Layers: ${this.failedLayers.size > 0 ? Array.from(this.failedLayers).join(', ') : 'هیچکدام'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    // ========================================
    // ریست لایه‌های خراب
    // ========================================
    resetFailedLayers() {
        this.failedLayers.clear();
        console.log('🔄 تمام لایه‌ها ریست شدند');
    }

    // ========================================
    // لیست صداهای موجود
    // ========================================
    getAvailableVoices() {
        if (!('speechSynthesis' in window)) {
            return [];
        }

        const voices = speechSynthesis.getVoices();
        
        return voices.map(v => ({
            name: v.name,
            lang: v.lang,
            isDefault: v.default,
            isLocal: v.localService
        }));
    }

    // ========================================
    // تنظیم اولویت TTS
    // ========================================
    setTTSPreference(useBrowserTTS = true) {
        this.preferBrowserTTS = useBrowserTTS;
        console.log(`🔧 اولویت TTS تغییر کرد: ${useBrowserTTS ? 'مرورگر' : 'آنلاین'}`);
    }

    // ========================================
    // تست سیستم (برای دیباگ) - ✅ اصلاح شده
    // ========================================
    async testAllLayers(accent = 'us') {
        const accentFlag = accent === 'uk' ? '🇬🇧' : '🇺🇸';
        console.log(`\n🧪 ${accentFlag} شروع تست تمام لایه‌ها (${accent})...\n`);
        
        const testWord = 'test';
        
        // تست هر لایه به صورت جداگانه
        const tests = [
            { name: 'Layer 1', method: () => this.tryLayer1_LocalStorageCache(`${testWord}_${accent}`, testWord, accent) },
            { name: 'Layer 2', method: () => this.tryLayer2_LocalAudioFile(testWord, accent) },
            { name: 'Layer 3', method: () => this.tryLayer3_PremiumTTS(testWord, accent) },
            { name: 'Layer 4', method: () => this.tryLayer4_FallbackTTS(testWord, accent) },
            { name: 'Layer 5', method: () => this.tryLayer5_BasicTTS(testWord, accent) },
            { name: 'Layer 6', method: () => this.tryLayer6_SilentFallback(testWord, accent) }
        ];

        for (const test of tests) {
            try {
                console.log(`\n🔍 تست ${test.name}...`);
                await test.method();
                console.log(`✅ ${test.name}: موفق`);
            } catch (error) {
                console.log(`❌ ${test.name}: ناموفق - ${error.message}`);
            }
            
            // تاخیر بین تست‌ها
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`\n✅ ${accentFlag} تست تمام لایه‌ها کامل شد\n`);
    }
}
