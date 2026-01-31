// js/modules/Conversation.js
// -----------------------------------------------------------------------------
// 🌟 ماژول پیشرفته مدیریت مکالمه (Conversation Module)
// 🚀 ویژگی‌ها: سیستم صوتی هیبرید 7 لایه (Natural/Google/Browser)، مدیریت نقش‌ها (Role-play)،
//    کش هوشمند صدا، و رابط کاربری تعاملی برای یادگیری زبان.
// 📅 تاریخ آخرین ویرایش: 1404/11/10
// -----------------------------------------------------------------------------

export class Conversation {
    constructor() {
        // مخزن داده‌های درس
        this.lessonData = [];
        this.activeIndex = 0; // ایندکس تب فعال (کدام مکالمه)
        this.activeRole = 'all'; // نقش فعال کاربر (all = شنونده، [ID] = تمرین نقش)
        this.isPlaying = false; // وضعیت پخش کلی

        // 🎵 سیستم صوتی مستقل و پیشرفته
        this.currentAudio = null; // برای فایل‌های صوتی (Audio Object)
        this.currentUtterance = null; // برای SpeechSynthesis
        this.speechSynthesis = window.speechSynthesis;
        this.audioCache = new Map(); // کش فایل‌های صوتی محلی برای جلوگیری از درخواست مکرر
        this.currentLessonId = null;

        // 🎭 مدیریت صداهای مرورگر (Browser Voices)
        this.availableVoices = [];
        this.voicesLoaded = false;
        
        // راه‌اندازی اولیه لیست صداها
        this.initVoiceLoader();
    }

    // ==========================================
    // 🎤 بخش 1: بارگذاری و مدیریت صداهای سیستم
    // ==========================================
    
    /**
     * بارگذاری لیست صداهای موجود در مرورگر کاربر.
     * این متد تلاش می‌کند صداهای با کیفیت (مثل Google US English یا Microsoft Natural) را پیدا کند.
     */
    initVoiceLoader() {
        if (!this.speechSynthesis) {
            console.warn("⚠️ مرورگر شما از تبدیل متن به گفتار پشتیبانی نمی‌کند.");
            return;
        }

        const loadVoicesList = () => {
            this.availableVoices = this.speechSynthesis.getVoices();
            this.voicesLoaded = this.availableVoices.length > 0;

            if (this.voicesLoaded) {
                // جهت دیباگ: نمایش تعداد صداهای پیدا شده
                // console.log(`✅ ${this.availableVoices.length} voice(s) loaded available.`);
            }
        };

        // بارگذاری اولیه
        loadVoicesList();

        // هندل کردن بارگذاری async (مخصوصاً در کروم که صداها را با تاخیر لود می‌کند)
        if (this.speechSynthesis.onvoiceschanged !== undefined) {
            this.speechSynthesis.onvoiceschanged = loadVoicesList;
        }
    }

    // ==========================================
    // 📊 بخش 2: بارگذاری داده‌های درس
    // ==========================================

    /**
     * دریافت فایل JSON مربوط به مکالمه و آماده‌سازی اولیه
     * @param {string|number} lessonId - شناسه درس
     */
    async loadData(lessonId) {
        this.currentLessonId = lessonId;
        const url = `data/lesson${lessonId}/conversation.json`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Not found: ${url}`);

            this.lessonData = await response.json();

            if (this.lessonData.length > 0) {
                this.activeIndex = 0;
                // شروع دانلود فایل‌های صوتی در پس‌زمینه برای تجربه کاربری روان‌تر
                this.preloadAudioFiles(lessonId);
            }
        } catch (error) {
            console.error("❌ خطا در بارگذاری conversation:", error);
            const container = document.getElementById('conversation-content');
            if(container) {
                container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    خطا در بارگذاری محتوای مکالمه.<br>
                    <small>${error.message}</small>
                </div>`;
            }
        }
    }

    // ==========================================
    // 🎵 بخش 3: سیستم صوتی فوق هوشمند (7-Layer Hybrid Audio)
    // ==========================================

    /**
     * بررسی وجود فایل‌های صوتی ضبط شده (استودیویی) در سرور.
     * این متد فایل‌ها را دانلود نمی‌کند، فقط وجود آن‌ها را چک می‌کند (HEAD Request).
     */
    async preloadAudioFiles(lessonId) {
        if (!this.lessonData || this.lessonData.length === 0) return;

        const currentConv = this.lessonData[this.activeIndex];
        const basePath = `data/lesson${lessonId}/audio/conversation`;

        // فقط برای چند خط اول چک می‌کنیم تا سرعت لود پایین نیاید
        const limit = Math.min(currentConv.lines.length, 10); 

        for (let i = 0; i < limit; i++) {
            const audioPath = `${basePath}/line${i + 1}.mp3`;
            try {
                const response = await fetch(audioPath, { method: 'HEAD' });
                if (response.ok) {
                    this.audioCache.set(i, audioPath);
                }
            } catch (e) {
                // اگر فایل نبود، مشکلی نیست؛ لایه‌های بعدی سیستم صوتی فعال می‌شوند.
            }
        }
    }

    /**
     * 🧠 قلب تپنده سیستم صوتی: انتخاب بهترین منبع صدا
     * 
     * Layer 1: فایل صوتی محلی/استودیویی (بالاترین کیفیت - صدای واقعی انسان)
     * Layer 2: سرویس Google Translate TTS (بسیار طبیعی، نرم و آنلاین)
     * Layer 3: صداهای "Natural" مرورگر (Edge/Chrome Online Voices)
     * Layer 4: سرویس ResponsiveVoice (فال‌بک آنلاین استاندارد)
     * Layer 5: کش TTS از قبل تولید شده (Pre-generated TTS Cache)
     * Layer 6: صدای استاندارد مرورگر (Offline Robotic Fallback)
     * Layer 7: بازخورد بصری بی‌صدا (Silent Mode - آخرین سنگر)
     */
    async playSmartAudio(text, lineIndex = null, speakerName = 'Default') {
        return new Promise(async (resolve) => {
            if (!text) {
                resolve();
                return;
            }

            // توقف هر صدایی که در حال پخش است
            this.stopAudioOnly();
            await new Promise(r => setTimeout(r, 50)); // وقفه کوتاه برای جلوگیری از تداخل

            let played = false;

            // --- Layer 1: فایل استودیویی ---
            if (lineIndex !== null && this.audioCache.has(lineIndex)) {
                try {
                    await this.playLocalFile(this.audioCache.get(lineIndex));
                    played = true;
                    resolve();
                    return;
                } catch (e) {
                    console.warn('⚠️ Layer 1 (Local File) skipped.');
                }
            }

            // --- Layer 2: Google TTS API ---
            // این لایه صدای بسیار بهتری نسبت به پیش‌فرض مرورگر دارد
            if (!played && navigator.onLine) {
                try {
                    await this.playGoogleTTS(text);
                    played = true;
                    resolve();
                    return;
                } catch (e) {
                    // console.warn('⚠️ Layer 2 (Google TTS) skipped.');
                }
            }

            // --- Layer 3: Browser Natural Voices ---
            if (!played && this.hasNaturalVoice(speakerName)) {
                try {
                    await this.playBrowserTTS(text, speakerName, true); // true = force natural
                    played = true;
                    resolve();
                    return;
                } catch (e) {
                    // console.warn('⚠️ Layer 3 (Browser Natural) skipped.');
                }
            }

            // --- Layer 4: ResponsiveVoice JS ---
            if (!played && navigator.onLine && typeof responsiveVoice !== 'undefined') {
                try {
                    await this.playResponsiveVoice(text, speakerName);
                    played = true;
                    resolve();
                    return;
                } catch (e) {
                    // Fail silently
                }
            }

            // --- Layer 5: TTS Cache Files ---
            // بررسی فایل‌های TTS که شاید قبلا کش شده باشند
            if (!played && this.currentLessonId) {
                const safeName = this.sanitizeFilename(text);
                const cachePath = `data/lesson${this.currentLessonId}/audio/tts-cache/${safeName}.mp3`;
                try {
                    // چک سریع بدون دانلود
                    const response = await fetch(cachePath, { method: 'HEAD' });
                    if (response.ok) {
                        await this.playLocalFile(cachePath);
                        played = true;
                        resolve();
                        return;
                    }
                } catch (e) {}
            }

            // --- Layer 6: Standard Browser TTS (Offline) ---
            if (!played) {
                try {
                    await this.playBrowserTTS(text, speakerName, false); // false = any voice
                    played = true;
                    resolve();
                    return;
                } catch (e) {
                    console.warn('⚠️ All Audio Layers failed.');
                }
            }

            // --- Layer 7: Silent Visual Feedback ---
            if (!played) {
                this.showVisualFeedback();
                await new Promise(r => setTimeout(r, 2000)); // مکث مصنوعی برای خواندن متن
                resolve();
            }
        });
    }

    // ==========================================
    // 🔊 موتورهای پخش صدا (Audio Engines)
    // ==========================================

    /** موتور پخش فایل صوتی (MP3) */
    playLocalFile(path) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(path);
            this.currentAudio = audio;
            audio.onended = () => { this.currentAudio = null; resolve(); };
            audio.onerror = () => { this.currentAudio = null; reject(); };
            audio.play().catch(reject);
        });
    }

    /** موتور اتصال به API گوگل (غیر رسمی اما پایدار) */
    playGoogleTTS(text) {
        return new Promise((resolve, reject) => {
            // استفاده از کلاینت tw-ob گوگل که کیفیت بهتری ارائه می‌دهد
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;
            const audio = new Audio(url);

            // کاهش جزئی سرعت (0.95) برای شنیدار بهتر زبان‌آموز
            audio.playbackRate = 0.95;

            this.currentAudio = audio;
            audio.onended = () => { this.currentAudio = null; resolve(); };
            audio.onerror = (e) => { this.currentAudio = null; reject(e); };

            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    reject(error);
                });
            }
        });
    }

    /** موتور ResponsiveVoice (کتابخانه جانبی) */
    playResponsiveVoice(text, speakerName) {
        return new Promise((resolve, reject) => {
            if (typeof responsiveVoice === 'undefined') { reject(); return; }
            
            const isFemale = this.isFemaleCharacter(speakerName);
            const voiceName = isFemale ? 'US English Female' : 'US English Male';

            responsiveVoice.speak(text, voiceName, {
                pitch: 1, rate: 0.9, volume: 1,
                onend: () => resolve(),
                onerror: () => reject()
            });
        });
    }

    /** موتور استاندارد مرورگر (Web Speech API) */
    playBrowserTTS(text, speakerName, preferNatural = false) {
        return new Promise((resolve) => {
            if (!this.speechSynthesis) { resolve(); return; }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9; // کمی آهسته‌تر برای آموزش
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            const selectedVoice = this.selectBestVoice(speakerName, preferNatural);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }

            utterance.onend = () => { this.currentUtterance = null; resolve(); };
            utterance.onerror = () => { this.currentUtterance = null; resolve(); };

            this.currentUtterance = utterance;
            this.speechSynthesis.speak(utterance);
        });
    }

    // ==========================================
    // 🧠 هوش مصنوعی انتخاب صدا (Voice AI)
    // ==========================================

    /** آیا صدای نچرال برای این کاراکتر موجود است؟ */
    hasNaturalVoice(speakerName) {
        const voice = this.selectBestVoice(speakerName, true);
        return voice && (
            voice.name.includes('Natural') || 
            voice.name.includes('Google') || 
            voice.name.includes('Online')
        );
    }

    /**
     * الگوریتم انتخاب بهترین صدا بر اساس نام کاراکتر و کیفیت صدای موجود
     */
    selectBestVoice(speakerName, preferNaturalOnly = false) {
        if (this.availableVoices.length === 0) return null;

        const isFemale = this.isFemaleCharacter(speakerName);
        
        // فیلتر کردن صداهای انگلیسی
        let candidates = this.availableVoices.filter(v => v.lang.startsWith('en'));

        // امتیازدهی به صداها
        const scoredVoices = candidates.map(voice => {
            let score = 0;
            const name = voice.name.toLowerCase();

            // 1. امتیاز کیفیت (Quality Score)
            if (name.includes('natural')) score += 15; // صدای نچرال Edge/Azure
            if (name.includes('online')) score += 10;  // صداهای ابری
            if (name.includes('google')) score += 8;   // گوگل کروم
            if (name.includes('enhanced')) score += 6; // اپل با کیفیت بالا
            if (name.includes('samantha')) score += 5; // استاندارد مک

            // 2. امتیاز جنسیت (Gender Score)
            if (isFemale) {
                if (name.includes('female') || name.includes('woman') || name.includes('zira') || name.includes('jenny')) score += 5;
                if (name.includes('male') || name.includes('man') || name.includes('david')) score -= 20;
            } else {
                if (name.includes('male') || name.includes('man') || name.includes('david') || name.includes('ryan')) score += 5;
                if (name.includes('female') || name.includes('woman') || name.includes('zira')) score -= 20;
            }

            return { voice, score };
        });

        // مرتب‌سازی نزولی بر اساس امتیاز
        scoredVoices.sort((a, b) => b.score - a.score);

        if (scoredVoices.length > 0) {
            const bestMatch = scoredVoices[0];
            
            // اگر کاربر تاکید بر صدای نچرال داشته باشد اما بهترین گزینه کیفیت پایینی داشته باشد
            if (preferNaturalOnly && bestMatch.score < 8) {
                return null;
            }
            return bestMatch.voice;
        }

        return null;
    }

    /** تشخیص جنسیت از روی نام (برای تنظیم زیر و بمی صدا) */
    isFemaleCharacter(name) {
        const femaleNames = [
            'Sarah', 'Mary', 'Jane', 'Alice', 'Emily', 'Emma', 'Sophia',
            'Isabella', 'Olivia', 'Ava', 'Mia', 'Charlotte', 'Lisa',
            'Jennifer', 'Linda', 'Susan', 'Jessica', 'Ashley', 'Anna', 'Mom', 'Mother',
            'Teacher' // معمولا معلم‌ها را با صدای زن پخش می‌کنیم (شفاف‌تر است)
        ];
        if (!name) return true; // پیش‌فرض زن
        return femaleNames.some(fn => name.includes(fn));
    }

    // ==========================================
    // 🎮 منطق پخش مکالمه (Playback Logic)
    // ==========================================

    /**
     * پخش متوالی خطوط مکالمه با در نظر گرفتن نوبت کاربر
     */
    async playAllLines() {
        if (this.isPlaying) return; // جلوگیری از اجرای مجدد

        this.isPlaying = true;
        this.updatePlayButton(true);

        const currentConv = this.lessonData[this.activeIndex];
        const lines = currentConv.lines;
        const participants = currentConv.participants;
        
        let index = 0;

        // حلقه اصلی پخش
        while (this.isPlaying && index < lines.length) {
            const lineData = lines[index];
            const speakerInfo = participants.find(p => p.id === lineData.speakerId);
            const speakerName = speakerInfo ? speakerInfo.name : 'Unknown';

            // هایلایت کردن خط جاری
            this.highlightLine(index, lineData.speakerId);

            // بررسی: آیا نوبت کاربر است؟ (Role-play)
            const isUserTurn = (this.activeRole === lineData.speakerId);

            if (isUserTurn) {
                // 🎤 نوبت کاربر: سکوت می‌کنیم تا کاربر صحبت کند
                // مدت زمان سکوت = طول متن * ضریب تقریبی خواندن
                const waitTime = Math.max(2000, lineData.textEn.length * 80); 
                await this.waitWithProgress(waitTime);
            } else {
                // 🎧 نوبت سیستم: پخش صدا
                try {
                    if (this.isPlaying) {
                        await this.playSmartAudio(lineData.textEn, index, speakerName);
                    }
                } catch (e) {
                    console.log("⏸️ Playback interrupted/skipped");
                }
                
                // وقفه کوتاه بین دیالوگ‌ها (طبیعی‌تر شدن)
                if (this.isPlaying) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                }
            }
            index++;
        }
        
        // پایان مکالمه
        this.stopPlayback();
    }

    /** توقف کامل پخش و ریست کردن وضعیت */
    stopPlayback() {
        this.isPlaying = false;
        this.stopAudioOnly();
        
        // حذف کلاس‌های فعال
        document.querySelectorAll('.conv-line').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.stage-actor').forEach(a => a.classList.remove('is-talking'));
        
        this.updatePlayButton(false);
    }

    /** توقف فقط صدا (بدون تغییر UI) */
    stopAudioOnly() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }
        if (typeof responsiveVoice !== 'undefined') {
            responsiveVoice.cancel();
        }
        this.currentUtterance = null;
    }

    /** ایجاد وقفه با قابلیت کنسل شدن (برای نوبت کاربر) */
    async waitWithProgress(ms) {
        const step = 100;
        let elapsed = 0;
        while (elapsed < ms && this.isPlaying) {
            await new Promise(r => setTimeout(r, step));
            elapsed += step;
        }
    }

    // ==========================================
    // 🎨 رابط کاربری و رندرینگ (UI/UX)
    // ==========================================

    getHtml() {
        if (!this.lessonData || this.lessonData.length === 0) {
            return `<div class="loading-state"><div class="spinner"></div><p>درحال آماده‌سازی کلاس درس...</p></div>`;
        }

        const currentData = this.lessonData[this.activeIndex];
        const leftActor = currentData.participants.find(p => p.side === 'left');
        const rightActor = currentData.participants.find(p => p.side === 'right');

        return `
            <div class="conversation-section" id="conv-section">
                <!-- Tabs -->
                <div class="conv-tabs">
                    ${this.lessonData.map((conv, index) => `
                        <button class="conv-tab-btn ${index === this.activeIndex ? 'active' : ''}" data-index="${index}">
                            ${conv.tabTitle || `بخش ${index + 1}`}
                        </button>
                    `).join('')}
                </div>

                <!-- Stage (Actors) -->
                <div class="conv-stage">
                    <div class="stage-actor left-actor" id="actor-${leftActor?.id}">
                        <div class="avatar-wrapper">
                            <img src="${leftActor?.avatar || 'images/avatar-placeholder.png'}" alt="${leftActor?.name}">
                        </div>
                        <span class="actor-name-tag">${leftActor?.name}</span>
                    </div>
                    <div class="stage-actor right-actor" id="actor-${rightActor?.id}">
                        <div class="avatar-wrapper">
                            <img src="${rightActor?.avatar || 'images/avatar-placeholder.png'}" alt="${rightActor?.name}">
                        </div>
                        <span class="actor-name-tag">${rightActor?.name}</span>
                    </div>
                </div>

                <!-- Controls Header -->
                <div class="conv-header">
                    <h3>${currentData.title}</h3>
                </div>

                <div class="conv-controls">
                    <button class="btn-conv-control primary-btn" id="btn-play-conversation">
                        <i class="fas fa-play"></i> <span>پخش مکالمه</span>
                    </button>
                    
                    <div class="role-controls">
                        <span><i class="fas fa-microphone-alt"></i> تمرین نقش:</span>
                        <div class="role-buttons">
                            <button class="btn-role active" data-role="all">فقط شنونده</button>
                            ${currentData.participants.map(p => `
                                <button class="btn-role" data-role="${p.id}">به جای ${p.name}</button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Lines List -->
                <div class="conv-lines">
                    ${currentData.lines.map((line, index) => {
                        const speaker = currentData.participants.find(p => p.id === line.speakerId);
                        const isLeft = speaker.side === 'left';
                        return `
                        <div class="conv-line ${speaker.side}" id="line-${index}" data-speaker="${line.speakerId}">
                            ${isLeft ? `<div class="line-avatar">${speaker.name.charAt(0)}</div>` : ''}
                            
                            <div class="line-content hover-effect" data-index="${index}" data-text="${line.textEn}">
                                <span class="speaker-name">${speaker.name}</span>
                                <div class="english-text">${line.textEn}</div>
                                <div class="persian-text blurred" title="برای مشاهده کلیک کنید">${line.textFa}</div>
                                <div class="play-indicator"><i class="fas fa-volume-up"></i></div>
                            </div>
                            
                            ${!isLeft ? `<div class="line-avatar">${speaker.name.charAt(0)}</div>` : ''}
                        </div>`;
                    }).join('')}
                </div>

                <!-- Extras (Keywords & Tips) -->
                <div class="conv-extras">
                    ${currentData.keywords ? `
                    <div class="keywords-box">
                        <div class="section-label"><i class="fas fa-tags"></i> لغات کلیدی</div>
                        <div class="keywords-list">
                            ${currentData.keywords.map(k => `
                                <div class="keyword-item" onclick="this.classList.toggle('active')">
                                    <span class="kw-en">${k.en}</span>
                                    <span class="kw-divider"></span>
                                    <span class="kw-fa">${k.fa}</span>
                                </div>`).join('')}
                        </div>
                    </div>` : ''}

                    ${currentData.tip ? `
                    <div class="tip-box">
                        <div class="tip-icon"><i class="fas fa-lightbulb"></i></div>
                        <div class="tip-content">
                            <strong>نکته آموزشی:</strong>
                            <p>${currentData.tip.text}</p>
                        </div>
                    </div>` : ''}
                </div>
            </div>
        `;
    }

    // ==========================================
    // 🔗 اتصال رویدادها (Event Binding)
    // ==========================================

    bindEvents() {
        if (!this.lessonData || this.lessonData.length === 0) return;

        // 1. تغییر تب‌ها
        const tabBtns = document.querySelectorAll('.conv-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const newIndex = parseInt(btn.dataset.index);
                if (newIndex !== this.activeIndex) {
                    this.stopPlayback();
                    this.activeIndex = newIndex;
                    // آپدیت UI
                    const container = document.getElementById('conv-section').parentElement;
                    container.innerHTML = this.getHtml();
                    this.bindEvents(); // اتصال مجدد رویدادها
                    // شروع کش کردن صدای تب جدید
                    await this.preloadAudioFiles(this.currentLessonId);
                }
            });
        });

        // 2. دکمه اصلی پخش/توقف
        const playBtn = document.getElementById('btn-play-conversation');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.isPlaying ? this.stopPlayback() : this.playAllLines();
            });
        }

        // 3. انتخاب نقش (Role Play)
        document.querySelectorAll('.btn-role').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-role').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.activeRole = e.target.dataset.role;
                this.stopPlayback(); // تغییر نقش باعث توقف پخش می‌شود
            });
        });

        // 4. تعامل با خطوط (پخش تکی + نمایش ترجمه)
        document.querySelectorAll('.line-content').forEach(line => {
            // کلیک روی ترجمه فارسی (تار/شفاف)
            const faText = line.querySelector('.persian-text');
            if (faText) {
                faText.addEventListener('click', (e) => {
                    e.stopPropagation(); // جلوگیری از پخش صدا هنگام کلیک روی ترجمه
                    e.target.classList.toggle('blurred');
                });
            }

            // کلیک روی کل خط (پخش صدا)
            line.addEventListener('click', (e) => {
                // اگر روی ترجمه کلیک نشده بود
                if (!e.target.classList.contains('persian-text')) {
                    const index = parseInt(line.dataset.index);
                    const text = line.dataset.text;
                    const lineParent = line.closest('.conv-line');
                    const speakerId = lineParent.dataset.speaker;
                    const speakerName = line.querySelector('.speaker-name').innerText;
                    
                    this.stopPlayback(); // توقف پخش اتوماتیک
                    this.highlightLine(index, speakerId);
                    this.playSmartAudio(text, index, speakerName);
                }
            });
        });
    }

    // ==========================================
    // 🛠️ ابزارهای کمکی (Helpers)
    // ==========================================

    highlightLine(index, speakerId) {
        // حذف هایلایت قبلی
        document.querySelectorAll('.conv-line').forEach(l => l.classList.remove('active'));
        
        // افزودن هایلایت جدید
        const domLine = document.getElementById(`line-${index}`);
        if (domLine) {
            domLine.classList.add('active');
            // اسکرول نرم به خط در حال پخش
            domLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // انیمیشن آواتارها
        document.querySelectorAll('.stage-actor').forEach(actor => actor.classList.remove('is-talking'));
        if (speakerId) {
            const activeActor = document.getElementById(`actor-${speakerId}`);
            if (activeActor) activeActor.classList.add('is-talking');
        }
    }

    updatePlayButton(isPlaying) {
        const btn = document.getElementById('btn-play-conversation');
        if (!btn) return;
        if (isPlaying) {
            btn.classList.add('playing');
            btn.innerHTML = '<i class="fas fa-stop"></i> <span>توقف</span>';
        } else {
            btn.classList.remove('playing');
            btn.innerHTML = '<i class="fas fa-play"></i> <span>پخش مکالمه</span>';
        }
    }

    showVisualFeedback() {
        const indicator = document.querySelector('.conv-line.active .play-indicator');
        if (indicator) {
            indicator.innerHTML = '<i class="fas fa-volume-mute"></i>';
            indicator.style.color = '#ff6b6b';
        }
    }

    sanitizeFilename(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 50);
    }
}
