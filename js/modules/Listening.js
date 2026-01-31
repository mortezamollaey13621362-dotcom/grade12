// js/modules/Listening.js
// -----------------------------------------------------------------------------
// 🎧 ماژول پیشرفته تمرین شنیداری (Listening Module)
// 🚀 ویژگی‌ها: پخش‌کننده استاندارد امتحانی، پشتیبانی از سوالات MCQ/TF/Gap-Fill،
//    فیدبک صوتی/بصری و سیستم هوشمند انتخاب منبع صدا (Hybrid Audio).
// 📅 تاریخ ویرایش: 1404/11/10
// -----------------------------------------------------------------------------

export class Listening {
    constructor() {
        this.data = null;
        this.activeTabId = null;
        this.currentLessonId = null;
        
        // 🎵 سیستم صوتی
        this.currentAudio = null;     // برای فایل MP3
        this.currentUtterance = null; // برای TTS مرورگر
        this.isPlaying = false;
        
        // تنظیمات استاندارد امتحان
        this.examSpeedRate = 0.85; // سرعت استاندارد و شمرده (نه خیلی کند، نه خیلی تند)
        
        // کش فایل‌های صوتی
        this.audioCache = new Map();
        
        // راه‌اندازی صداهای مرورگر
        this.availableVoices = [];
        this.initVoiceLoader();
    }

    // ==========================================
    // 🎤 بخش 1: مدیریت صداها
    // ==========================================
    
    initVoiceLoader() {
        if (!window.speechSynthesis) return;
        const loadVoices = () => {
            this.availableVoices = window.speechSynthesis.getVoices();
        };
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }

    // ==========================================
    // 📊 بخش 2: بارگذاری داده‌ها
    // ==========================================

    async loadData(lessonId) {
        this.currentLessonId = lessonId;
        try {
            const url = `data/lesson${lessonId}/listening.json`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Listening data not found`);
            this.data = await response.json();
            
            if (this.data.tabs && this.data.tabs.length > 0) {
                this.activeTabId = this.data.tabs[0].id;
                // تلاش برای کش کردن فایل‌های صوتی اصلی
                this.preloadTabAudio(this.activeTabId);
            }
        } catch (error) {
            console.error('Error loading listening data:', error);
            this.data = { tabs: [] };
        }
    }

    async preloadTabAudio(tabId) {
        const tab = this.data.tabs.find(t => t.id === tabId);
        if (!tab || !tab.exercises) return;

        // چک کردن فایل صوتی برای هر تمرین
        for (const ex of tab.exercises) {
            const audioPath = `data/lesson${this.currentLessonId}/audio/listening/${ex.id}.mp3`;
            try {
                const response = await fetch(audioPath, { method: 'HEAD' });
                if (response.ok) {
                    this.audioCache.set(ex.id, audioPath);
                }
            } catch (e) { /* فایل موجود نیست، از TTS استفاده خواهد شد */ }
        }
    }

    // ==========================================
    // 🎵 بخش 3: سیستم صوتی هوشمند (Exam Mode)
    // ==========================================

    /**
     * پخش هوشمند با اولویت فایل ضبط شده (برای کیفیت امتحان واقعی)
     * و فال‌بک به TTS با کیفیت بالا در صورت نبود فایل.
     */
    async playSmartAudio(text, exerciseId, btnElement, visualizerElement) {
        // 1. توقف هر صدایی که در حال پخش است
        this.stopPlayback();

        // 2. آپدیت UI به حالت "در حال پخش"
        this.updatePlayerUI(btnElement, visualizerElement, true);
        this.isPlaying = true;

        const onEndCallback = () => {
            this.isPlaying = false;
            this.updatePlayerUI(btnElement, visualizerElement, false);
        };

        // --- Layer 1: فایل صوتی اختصاصی (MP3) ---
        // این بهترین گزینه برای لیسنینگ است چون شامل افکت محیطی و صدای چند نفر است
        if (this.audioCache.has(exerciseId)) {
            try {
                await this.playLocalFile(this.audioCache.get(exerciseId), onEndCallback);
                return;
            } catch (e) { console.warn("Audio file failed, falling back to TTS"); }
        } else {
            // چک کردن لحظه‌ای شاید فایل باشد و کش نشده باشد
            const path = `data/lesson${this.currentLessonId}/audio/listening/${exerciseId}.mp3`;
            try {
                await this.playLocalFile(path, onEndCallback);
                // اگر موفق بود به کش اضافه کن
                this.audioCache.set(exerciseId, path); 
                return;
            } catch(e) {}
        }

        // --- Layer 2: Google TTS (برای متون کوتاه/متوسط) ---
        // گوگل محدودیت کاراکتر دارد، برای متون خیلی طولانی لیسنینگ مناسب نیست
        if (navigator.onLine && text.length < 180) {
            try {
                await this.playGoogleTTS(text, onEndCallback);
                return;
            } catch(e) {}
        }

        // --- Layer 3: Browser Natural TTS (Exam Standard) ---
        // استفاده از موتور داخلی مرورگر با سرعت تنظیم شده برای امتحان
        this.playBrowserTTS(text, onEndCallback);
    }

    playLocalFile(path, onEnd) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(path);
            this.currentAudio = audio;
            audio.onended = () => { this.currentAudio = null; onEnd(); resolve(); };
            audio.onerror = (e) => { this.currentAudio = null; reject(e); };
            audio.play().catch(reject);
        });
    }

    playGoogleTTS(text, onEnd) {
        return new Promise((resolve, reject) => {
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;
            const audio = new Audio(url);
            audio.playbackRate = this.examSpeedRate; // سرعت استاندارد
            
            this.currentAudio = audio;
            audio.onended = () => { this.currentAudio = null; onEnd(); resolve(); };
            audio.onerror = reject;
            audio.play().catch(reject);
        });
    }

    playBrowserTTS(text, onEnd) {
        if (!window.speechSynthesis) { onEnd(); return; }
        
        // کنسل کردن قبلی‌ها
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        // سرعت حیاتی برای لیسنینگ: 0.8 تا 0.9 بهترین حالت برای وضوح است
        utterance.rate = this.examSpeedRate; 
        utterance.pitch = 1.0;

        // تلاش برای پیدا کردن صدای "Google US English" یا "Microsoft Natural"
        const preferredVoice = this.availableVoices.find(v => 
            (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Online')) && 
            v.lang.startsWith('en')
        );

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.onend = () => { this.currentUtterance = null; onEnd(); };
        utterance.onerror = (e) => { 
            // خطاهای قطعی معمولا 'interrupted' هستند که نادیده می‌گیریم
            if (e.error !== 'interrupted') {
                this.currentUtterance = null; 
                onEnd(); 
            }
        };

        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
    }

    stopPlayback() {
        this.isPlaying = false;
        
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        this.currentUtterance = null;

        // ریست تمام دکمه‌ها در صفحه
        document.querySelectorAll('.play-audio-btn').forEach(btn => {
            this.updatePlayerUI(btn, btn.nextElementSibling, false);
        });
    }

    // ==========================================
    // 🎨 بخش 4: رندرینگ رابط کاربری (UI)
    // ==========================================

    getHtml() {
        if (!this.data || !this.data.tabs || this.data.tabs.length === 0) {
            return `<div class="empty-state"><i class="fas fa-headphones-alt"></i> تمرین شنیداری یافت نشد.</div>`;
        }

        // 1. تب‌ها
        let tabsHtml = `<div class="listening-tabs">`;
        this.data.tabs.forEach(tab => {
            const isActive = tab.id === this.activeTabId ? 'active' : '';
            tabsHtml += `<button class="listening-tab-btn ${isActive}" data-tab-id="${tab.id}">${tab.title}</button>`;
        });
        tabsHtml += `</div>`;

        // 2. محتوای فعال
        const activeTab = this.data.tabs.find(t => t.id === this.activeTabId) || this.data.tabs[0];
        let contentHtml = `<div class="listening-content-container">`;

        if (activeTab && activeTab.exercises) {
            activeTab.exercises.forEach((ex, index) => {
                contentHtml += this._renderTaskCard(ex, index);
            });
        }
        contentHtml += `</div>`;

        return `
            <div class="listening-wrapper">
                <div class="tabs-container">${tabsHtml}</div>
                ${contentHtml}
            </div>
        `;
    }

    /** ساخت کارت تمرین شامل پلیر و سوالات */
    _renderTaskCard(exercise, index) {
        let questionsHtml = `<div class="questions-list">`;
        if (exercise.questions) {
            exercise.questions.forEach((q, qIndex) => {
                questionsHtml += this._renderQuestionItem(q, exercise.id, qIndex);
            });
        }
        questionsHtml += `</div>`;

        return `
            <div class="exercise-card fade-in-up" style="animation-delay: ${index * 0.1}s">
                <div class="exercise-header">
                    <div class="task-icon"><i class="fas fa-headphones"></i></div>
                    <div class="task-info">
                        <span class="task-title">${exercise.title || 'Listen to the audio and answer:'}</span>
                        <span class="task-subtitle">Audio Track #${index + 1}</span>
                    </div>
                </div>
                
                <!-- Audio Player Zone -->
                <div class="audio-player-zone">
                    <div class="visualizer-container">
                        <div class="visualizer">
                            <span></span><span></span><span></span><span></span><span></span>
                            <span></span><span></span><span></span><span></span><span></span>
                        </div>
                    </div>
                    <button class="play-audio-btn" data-text="${exercise.audio_text}" data-ex-id="${exercise.id}">
                        <i class="fas fa-play"></i>
                        <span>Play Audio</span>
                    </button>
                </div>

                ${questionsHtml}
            </div>
        `;
    }

    /** رندر کردن سوالات بر اساس نوع (MCQ, True/False, Gap-Fill) */
    _renderQuestionItem(question, exerciseId, index) {
        let optionsHtml = '';
        
        // کلاس‌بندی بر اساس نوع سوال برای استایل‌دهی متفاوت
        let gridClass = 'options-grid'; // پیش‌فرض: چند گزینه‌ای
        if (question.type === 'tf') gridClass = 'tf-grid'; // صحیح غلط
        if (question.type === 'gap') gridClass = 'gap-grid'; // جای خالی

        optionsHtml += `<div class="${gridClass}">`;
        
        question.options.forEach(opt => {
            optionsHtml += `
                <button class="option-btn" 
                        data-exercise-id="${exerciseId}" 
                        data-question-id="${question.id}"
                        data-correct="${opt.isCorrect}">
                    ${question.type === 'tf' ? this._getTFIcon(opt.text) : ''}
                    <span class="opt-text">${opt.text}</span>
                    <span class="feedback-icon"></span>
                </button>
            `;
        });
        optionsHtml += `</div>`;

        // مدیریت متن سوال برای "جای خالی"
        let questionText = question.text;
        if (question.type === 'gap') {
            // تبدیل ________ به المان HTML قابل تغییر
            questionText = questionText.replace(/_+/g, `<span class="gap-blank" id="gap-${question.id}">_______</span>`);
        }

        return `
            <div class="question-item type-${question.type}">
                <div class="q-number">${index + 1}</div>
                <div class="q-content">
                    <p class="q-text">${questionText}</p>
                    ${optionsHtml}
                </div>
            </div>
        `;
    }

    _getTFIcon(text) {
        const t = text.toLowerCase();
        if (t === 'true' || t === 'yes') return '<i class="fas fa-check-circle"></i> ';
        if (t === 'false' || t === 'no') return '<i class="fas fa-times-circle"></i> ';
        return '';
    }

    // ==========================================
    // 🔗 بخش 5: رویدادها (Events)
    // ==========================================

    bindEvents() {
        const container = document.querySelector('.listening-wrapper');
        if (!container) return;

        // 1. تغییر تب‌ها
        container.querySelectorAll('.listening-tab-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const newId = btn.dataset.tabId;
                if (newId !== this.activeTabId) {
                    this.stopPlayback();
                    this.activeTabId = newId;
                    await this.preloadTabAudio(newId);
                    
                    // رندر مجدد
                    const parent = document.getElementById('section-container'); 
                    // فرض بر این است که متد getHtml درون کانتینر والد صدا زده می‌شود
                    if(parent) {
                        parent.innerHTML = this.getHtml();
                        this.bindEvents();
                    }
                }
            });
        });

        // 2. دکمه پخش صدا
        container.querySelectorAll('.play-audio-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.dataset.text;
                const exId = btn.dataset.exId;
                const visualizer = btn.parentElement.querySelector('.visualizer');
                
                if (btn.classList.contains('playing')) {
                    this.stopPlayback();
                } else {
                    this.playSmartAudio(text, exId, btn, visualizer);
                }
            });
        });

        // 3. کلیک روی گزینه‌ها (منطق آزمون)
        container.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // جلوگیری از تغییر جواب
                if (btn.classList.contains('checked') || btn.classList.contains('disabled')) return;

                const isCorrect = btn.dataset.correct === 'true';
                const parent = btn.closest(`.${btn.parentElement.className}`); // کانتینر گزینه‌ها
                const questionId = btn.dataset.questionId;

                // غیرفعال کردن همه گزینه‌های این سوال
                parent.querySelectorAll('.option-btn').forEach(b => {
                    b.classList.add('disabled');
                    // نمایش جواب صحیح به کاربر (آموزشی)
                    if (b.dataset.correct === 'true') {
                        b.classList.add('show-correct');
                    }
                });

                btn.classList.add('checked');
                
                if (isCorrect) {
                    btn.classList.add('correct');
                    btn.querySelector('.feedback-icon').innerHTML = '<i class="fas fa-check"></i>';
                    this._playSFX('correct');
                    
                    // انیمیشن پر شدن جای خالی
                    const gapEl = document.getElementById(`gap-${questionId}`);
                    if (gapEl) {
                        gapEl.textContent = btn.querySelector('.opt-text').innerText;
                        gapEl.classList.add('filled-correct');
                    }

                } else {
                    btn.classList.add('wrong');
                    btn.querySelector('.feedback-icon').innerHTML = '<i class="fas fa-times"></i>';
                    this._playSFX('wrong');
                    
                    // اگر غلط بود، جای خالی قرمز شود (اختیاری)
                    const gapEl = document.getElementById(`gap-${questionId}`);
                    if (gapEl) {
                        gapEl.classList.add('filled-wrong');
                    }
                }
            });
        });
    }

    // ==========================================
    // 🛠️ ابزارهای کمکی (Helpers)
    // ==========================================

    updatePlayerUI(btn, visualizer, isPlaying) {
        if (!btn) return;
        
        if (isPlaying) {
            btn.innerHTML = '<i class="fas fa-stop"></i> <span>Stop Audio</span>';
            btn.classList.add('playing');
            if(visualizer) visualizer.classList.add('active');
        } else {
            btn.innerHTML = '<i class="fas fa-play"></i> <span>Play Audio</span>';
            btn.classList.remove('playing');
            if(visualizer) visualizer.classList.remove('active');
        }
    }

    /** پخش افکت صوتی کوتاه برای بازخورد */
    _playSFX(type) {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'correct') {
                // صدای دینگ نرم (Sine Wave)
                osc.type = 'sine';
                osc.frequency.setValueAtTime(500, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
            } else {
                // صدای بازر خطا (Sawtooth)
                osc.type = 'sawtooth'; // صدای تیزتر
                osc.frequency.setValueAtTime(150, ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
            }
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) { /* AudioContext not supported */ }
    }
}
