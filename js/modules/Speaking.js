// js/modules/Speaking.js
// 🎤 آزمایشگاه تلفظ پیشرفته (پایه هفتم تا دوازدهم)
// نسخه نهایی: سیستم صوتی 6 لایه‌ای + ضبط هوشمند + UI بهینه

export class Speaking {
    constructor(app) {
        this.app = app;
        this.container = null;
        
        // --- 🎤 Audio Recording & Visualizer ---
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.animationId = null;
        this.mediaStream = null;
        this.recognition = null;
        this.finalTranscript = '';
        this.isRecording = false;

        // --- 🎵 Smart Audio System (6 Layers) ---
        this.currentAudio = null;
        this.currentUtterance = null;
        this.speechSynthesis = window.speechSynthesis;
        this.audioCache = new Map();
        this.availableVoices = [];
        this.voicesLoaded = false;
        
        // --- 📊 Data State ---
        this.exercises = {};
        this.currentLevel = 'beginner';
        this.currentExercise = null;
        this.speakingData = null;
        this.lessonId = null;

        // --- 📈 Progress Tracking ---
        this.completedExercises = new Set();
        this.totalScore = 0;
        this.attemptCount = 0;

        // --- 🛡️ Browser Capabilities ---
        this.capabilities = {
            speechRecognition: false,
            getUserMedia: false,
            speechSynthesis: false,
            audioContext: false
        };

        // بارگذاری اولیه صداهای مرورگر
        this.loadVoices();
        console.log("🎤 Speaking Module Initialized");
    }

    // ==========================================
    // 🎤 بارگذاری لیست صداهای مرورگر
    // ==========================================
    loadVoices() {
        if (!this.speechSynthesis) return;

        const loadVoicesList = () => {
            this.availableVoices = this.speechSynthesis.getVoices();
            this.voicesLoaded = this.availableVoices.length > 0;
            if (this.voicesLoaded) {
                console.log(`✅ Loaded ${this.availableVoices.length} browser voices`);
            }
        };

        loadVoicesList();
        if (this.speechSynthesis.onvoiceschanged !== undefined) {
            this.speechSynthesis.onvoiceschanged = loadVoicesList;
        }
    }

    // ==========================================
    // 🔄 Initialize & Reset
    // ==========================================
    async init(data = {}) {
        console.log("🎤 Speaking.init() called");
        
        try {
            // 1️⃣ ریست وضعیت قبلی
            this.resetState();
            
            // 2️⃣ دریافت و تنظیم شناسه درس
            if (data.lessonId) {
                this.lessonId = data.lessonId;
            } else if (this.app?.lessonManager?.currentLessonId) {
                this.lessonId = this.app.lessonManager.currentLessonId;
            } else {
                this.lessonId = '1'; // پیش‌فرض
            }
            
            console.log(`📚 Lesson ID set to: ${this.lessonId}`);
            
            // 3️⃣ بررسی قابلیت‌های مرورگر
            this.checkBrowserCapabilities();
            
            // 4️⃣ بارگذاری داده‌های Speaking
            await this.loadSpeakingData();
            
            // 5️⃣ مقداردهی اولیه تشخیص گفتار
            this.initSpeechRecognition();
            
            console.log("✅ Speaking module initialized successfully");
            return this;
            
        } catch (error) {
            console.error("❌ Error initializing Speaking module:", error);
            
            // استفاده از داده‌های پیش‌فرض در صورت خطا
            this.useDefaultData();
            
            // نمایش پیام خطا به کاربر
            this.showNotification(
                '⚠️ خطا در بارگذاری ماژول Speaking. از داده‌های پیش‌فرض استفاده می‌شود.',
                'warning'
            );
            
            return this;
        }
    }

    // ==========================================
    // 🛡️ بررسی قابلیت‌های مرورگر
    // ==========================================
    checkBrowserCapabilities() {
        this.capabilities = {
            speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
            getUserMedia: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
            speechSynthesis: 'speechSynthesis' in window,
            audioContext: 'AudioContext' in window || 'webkitAudioContext' in window
        };
        
        console.log("🔍 Browser capabilities:", this.capabilities);
    }

    // ==========================================
    // 🔄 Reset State
    // ==========================================
    resetState() {
        console.log("🎤 Resetting Speaking state...");
        
        this.cleanup();
        this.stopAudioOnly();
        
        // ریست وضعیت داده‌ها
        this.currentLevel = 'beginner';
        this.currentExercise = null;
        this.speakingData = null;
        
        // ریست وضعیت پیشرفت
        this.completedExercises = new Set();
        this.totalScore = 0;
        this.attemptCount = 0;
        this.finalTranscript = '';
        this.isRecording = false;
        
        // ریست کش صداها
        this.audioCache.clear();
        
        console.log("🔄 Speaking state reset complete");
    }

    // ==========================================
    // 📥 Load Data & Preload Audio (نسخه اصلاح شده)
    // ==========================================
    async loadSpeakingData() {
        try {
            console.log(`📥 Loading speaking data for Lesson ${this.lessonId}...`);
            
            const response = await fetch(`data/lesson${this.lessonId}/speaking.json`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }
            
            this.speakingData = await response.json();
            
            // پردازش داده‌های بارگذاری شده با ساختار انعطاف‌پذیر
            this.processLoadedData();
            
            console.log("✅ Speaking data loaded successfully");
            
        } catch (error) {
            console.error("❌ Error loading speaking data:", error);
            // استفاده از داده‌های پیش‌فرض
            this.useDefaultData();
        }
    }

    processLoadedData() {
        console.log("📦 Processing loaded speaking data...");
        
        // حالت 1: ساختار استاندارد با levels
        if (this.speakingData && this.speakingData.levels) {
            this.exercises = this.speakingData.levels;
            console.log(`📊 Loaded ${Object.keys(this.exercises).length} levels from 'levels' property`);
        }
        // حالت 2: ساختار مستقیم (بدون levels)
        else if (this.speakingData && (this.speakingData.beginner || this.speakingData.intermediate || this.speakingData.advanced)) {
            this.exercises = this.speakingData;
            console.log(`📊 Loaded ${Object.keys(this.exercises).length} levels directly`);
        }
        // حالت 3: داده خام آرایه‌ای
        else if (Array.isArray(this.speakingData)) {
            this.exercises = { beginner: this.speakingData };
            console.log(`📊 Loaded array with ${this.speakingData.length} exercises as beginner level`);
        }
        // حالت 4: داده‌های پیش‌فرض
        else {
            console.warn("⚠️ Invalid or empty speaking data structure, using defaults");
            this.useDefaultData();
            return;
        }
        
        // تنظیم تمرین اول از سطح انتخاب‌شده
        const levelExercises = this.exercises[this.currentLevel];
        if (levelExercises && levelExercises.length > 0) {
            this.currentExercise = levelExercises[0];
            
            // پیش‌بارگذاری صداهای این سطح
            this.preloadAudioFiles(levelExercises);
            
            console.log(`📝 Initial exercise set to: ${this.currentExercise.id}`);
        }
        
        // لاگ جزئیات
        Object.keys(this.exercises).forEach(level => {
            const exercises = this.exercises[level];
            console.log(`   ${level}: ${Array.isArray(exercises) ? exercises.length : '?'} exercises`);
        });
    }

    useDefaultData() {
        console.log("🔄 Using default speaking data");
        
        this.exercises = {
            beginner: [
                { id: 'b1', text: "Hello", translation: "سلام", phonetic: "/həˈloʊ/" },
                { id: 'b2', text: "Good morning", translation: "صبح بخیر", phonetic: "/ɡʊd ˈmɔːrnɪŋ/" },
                { id: 'b3', text: "Thank you", translation: "متشکرم", phonetic: "/θæŋk juː/" },
                { id: 'b4', text: "How are you?", translation: "حال شما چطور است؟", phonetic: "/haʊ ɑːr juː/" }
            ],
            intermediate: [
                { id: 'i1', text: "I like learning English", translation: "من دوست دارم انگلیسی یاد بگیرم", phonetic: "/aɪ laɪk ˈlɜːrnɪŋ ˈɪŋɡlɪʃ/" },
                { id: 'i2', text: "Where is the library?", translation: "کتابخانه کجاست؟", phonetic: "/weər ɪz ðə ˈlaɪbreri/" }
            ],
            advanced: [
                { id: 'a1', text: "She sells seashells by the seashore", translation: "تمرین تلفظ پیشرفته", phonetic: "Tongue Twister" }
            ]
        };
        
        const levelData = this.exercises[this.currentLevel];
        if (levelData && levelData.length > 0) {
            this.currentExercise = levelData[0];
        }
    }

    async preloadAudioFiles(levelExercises) {
        if (!levelExercises || !this.lessonId) return;
        
        const basePath = `data/lesson${this.lessonId}/audio/speaking`;
        
        for (const exercise of levelExercises) {
            const audioPath = `${basePath}/${exercise.id}.mp3`;
            
            // اگر از قبل در کش نیست
            if (!this.audioCache.has(exercise.id)) {
                try {
                    const response = await fetch(audioPath, { method: 'HEAD' });
                    if (response.ok) {
                        this.audioCache.set(exercise.id, audioPath);
                        console.log(`🎵 Preloaded: ${exercise.id}`);
                    }
                } catch (e) {
                    // فایل وجود ندارد - این خطا نیست
                }
            }
        }
    }

    // ==========================================
    // 🎵 Smart 6-Layer Audio System
    // ==========================================
    async playSmartAudio(text, exerciseId) {
        if (this.isRecording) return;

        return new Promise(async (resolve) => {
            if (!text) {
                resolve();
                return;
            }

            this.stopAudioOnly();
            this.updatePlayButtonState(true);
            await new Promise(r => setTimeout(r, 50));

            let played = false;

            // 🎵 Layer 1: Local MP3 File
            if (exerciseId && this.audioCache.has(exerciseId)) {
                try {
                    await this.playLocalFile(this.audioCache.get(exerciseId));
                    played = true;
                    console.log("✅ Layer 1: Local File");
                } catch (e) {
                    console.warn('⚠️ Layer 1 failed');
                }
            }

            // 🎵 Layer 2: TTS Cache
            if (!played && this.lessonId) {
                const cachePath = `data/lesson${this.lessonId}/audio/tts-cache/${this.sanitizeFilename(text)}.mp3`;
                try {
                    const response = await fetch(cachePath, { method: 'HEAD' });
                    if (response.ok) {
                        await this.playLocalFile(cachePath);
                        played = true;
                        console.log("✅ Layer 2: TTS Cache");
                    }
                } catch (e) {
                    console.warn('⚠️ Layer 2 failed');
                }
            }

            // 🎵 Layer 3: ResponsiveVoice (Optional)
            if (!played && navigator.onLine && typeof responsiveVoice !== 'undefined') {
                try {
                    await this.playResponsiveVoice(text);
                    played = true;
                    console.log("✅ Layer 3: ResponsiveVoice");
                } catch (e) {
                    console.warn('⚠️ Layer 3 failed');
                }
            }

            // 🎵 Layer 4: Browser Native TTS
            if (!played) {
                try {
                    await this.playBrowserTTS(text);
                    played = true;
                    console.log("✅ Layer 4: Browser TTS");
                } catch (e) {
                    console.warn('⚠️ Layer 4 failed');
                }
            }

            // 🎵 Layer 5: Visual Feedback Only
            if (!played) {
                console.warn('🔇 All audio layers failed. Visual only.');
                await new Promise(r => setTimeout(r, 1000));
            }

            this.updatePlayButtonState(false);
            resolve();
        });
    }

    playLocalFile(path) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(path);
            this.currentAudio = audio;
            
            audio.onended = () => {
                this.currentAudio = null;
                resolve();
            };
            
            audio.onerror = (e) => {
                this.currentAudio = null;
                reject(e);
            };
            
            audio.play().catch(reject);
        });
    }

    playResponsiveVoice(text) {
        return new Promise((resolve, reject) => {
            if (typeof responsiveVoice === 'undefined') {
                reject(new Error('ResponsiveVoice not loaded'));
                return;
            }
            
            responsiveVoice.speak(text, 'US English Female', {
                pitch: 1,
                rate: 0.9,
                volume: 1,
                onend: resolve,
                onerror: () => reject(new Error('ResponsiveVoice error'))
            });
        });
    }

    playBrowserTTS(text) {
        return new Promise((resolve) => {
            if (!this.speechSynthesis) {
                resolve();
                return;
            }
            
            if (!this.voicesLoaded) {
                this.availableVoices = this.speechSynthesis.getVoices();
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.85;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            // انتخاب بهترین صدا
            const selectedVoice = this.selectBestVoice();
            if (selectedVoice) {
                utterance.voice = selectedVoice;
                console.log(`🎤 Using: ${selectedVoice.name}`);
            }

            utterance.onend = () => {
                this.currentUtterance = null;
                resolve();
            };
            
            utterance.onerror = () => {
                this.currentUtterance = null;
                resolve();
            };

            this.currentUtterance = utterance;
            this.speechSynthesis.speak(utterance);
        });
    }

    selectBestVoice() {
        if (this.availableVoices.length === 0) return null;

        const preferred = [
            'Google US English',
            'Samantha',
            'Microsoft Zira',
            'Alex',
            'Karen'
        ];

        for (const name of preferred) {
            const voice = this.availableVoices.find(v =>
                v.name.toLowerCase().includes(name.toLowerCase()) &&
                v.lang.startsWith('en')
            );
            if (voice) return voice;
        }

        return this.availableVoices.find(v => v.lang.startsWith('en-US')) ||
               this.availableVoices.find(v => v.lang.startsWith('en')) ||
               this.availableVoices[0];
    }

    stopAudioOnly() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio.src = '';
            this.currentAudio = null;
        }
        
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }
        
        if (typeof responsiveVoice !== 'undefined') {
            responsiveVoice.cancel();
        }
        
        this.currentUtterance = null;
        this.updatePlayButtonState(false);
    }

    updatePlayButtonState(isPlaying) {
        const btn = this.container?.querySelector('#play-native-btn');
        if (!btn) return;
        
        if (isPlaying) {
            btn.classList.add('playing');
            btn.innerHTML = '<i class="fas fa-stop"></i>';
        } else {
            btn.classList.remove('playing');
            btn.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
    }

    sanitizeFilename(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 50);
    }

    // ==========================================
    // 🎤 Speech Recognition
    // ==========================================
    initSpeechRecognition() {
        if (!this.capabilities.speechRecognition) {
            console.warn("⚠️ Speech Recognition not supported");
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => this.handleRecognitionResult(event);
        this.recognition.onerror = (event) => {
            if (event.error !== 'no-speech') {
                console.warn("🎤 Recognition error:", event.error);
            }
        };
        
        this.recognition.onend = () => {
            if (this.isRecording) {
                this.isRecording = false;
                this.updateUiState(false);
                console.log("🎤 Recognition ended");
            }
        };
        
        console.log("✅ Speech Recognition initialized");
    }

    async startRecording() {
        if (this.isRecording) return;
        
        // بررسی دسترسی میکروفون
        if (!this.capabilities.getUserMedia) {
            this.showNotification('مرورگر شما از میکروفون پشتیبانی نمی‌کند', 'error');
            return;
        }

        try {
            // توقف صداهای در حال پخش
            this.stopAudioOnly();
            
            // درخواست دسترسی به میکروفون
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            // راه‌اندازی آنالیزور صدا
            if (this.capabilities.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.analyser = this.audioContext.createAnalyser();
                
                const source = this.audioContext.createMediaStreamSource(this.mediaStream);
                source.connect(this.analyser);
                
                this.analyser.fftSize = 256;
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

                // راه‌اندازی ویژوالایزر
                this.drawVisualizer();
            }

            // شروع تشخیص گفتار
            if (this.recognition) {
                this.finalTranscript = '';
                try {
                    this.recognition.start();
                    this.isRecording = true;
                    this.updateUiState(true);
                    
                    console.log("🎤 Recording started successfully");
                    this.showNotification('ضبط صدا شروع شد', 'success');
                    
                } catch (e) {
                    console.error("❌ Failed to start recognition:", e);
                    this.showNotification('خطا در شروع ضبط صدا', 'error');
                }
            }

        } catch (err) {
            console.error("❌ Microphone access error:", err);
            
            if (err.name === 'NotAllowedError') {
                this.showNotification('دسترسی به میکروفون رد شد. لطفاً دسترسی را در تنظیمات مرورگر فعال کنید.', 'error');
            } else if (err.name === 'NotFoundError') {
                this.showNotification('هیچ میکروفونی یافت نشد.', 'error');
            } else {
                this.showNotification('خطا در دسترسی به میکروفون', 'error');
            }
        }
    }

    stopRecording() {
        if (!this.isRecording) return;

        console.log("⏹️ Stopping recording...");

        // توقف تشخیص گفتار
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) {
                console.warn("Recognition already stopped");
            }
        }

        // توقف استریم میکروفون
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        // بستن Audio Context
        if (this.audioContext) {
            this.audioContext.close().catch(e => console.warn("AudioContext close error:", e));
            this.audioContext = null;
        }
        
        // توقف انیمیشن ویژوالایزر
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.isRecording = false;
        this.updateUiState(false);

        // تحلیل نتیجه پس از تأخیر
        setTimeout(() => {
            this.analyzeResult();
        }, 500);
    }

    handleRecognitionResult(event) {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                this.finalTranscript += event.results[i][0].transcript + ' ';
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        const status = this.container?.querySelector('#status-text');
        if (status && interimTranscript) {
            status.textContent = `🎙️ "${interimTranscript.trim()}"`;
        }
    }

    // ==========================================
    // 📊 Analysis & Scoring
    // ==========================================
    analyzeResult() {
        if (!this.currentExercise) return;
        
        const targetText = this.normalize(this.currentExercise.text.toLowerCase());
        const spokenText = this.normalize(this.finalTranscript.trim().toLowerCase());

        let score = 0;
        let feedback = "";
        let detailedAnalysis = "";

        if (!spokenText) {
            feedback = "❌ صدایی تشخیص داده نشد. لطفاً واضح‌تر صحبت کنید و دوباره تلاش کنید.";
            score = 0;
        } else {
            const similarity = this.calculateSimilarity(targetText, spokenText);
            score = Math.floor(similarity);
            
            // بازخورد بر اساس نمره
            if (score >= 95) {
                feedback = "🎉 عالی! تلفظ شما تقریباً کامل بود!";
            } else if (score >= 85) {
                feedback = "✅ خیلی خوب! فقط چند خطای کوچک داشتید.";
            } else if (score >= 70) {
                feedback = "👍 خوب است! اما نیاز به تمرین بیشتر دارید.";
            } else if (score >= 50) {
                feedback = "⚠️ قابل فهم بود اما اشتباهات زیادی داشت. تمرین بیشتری لازم است.";
            } else {
                feedback = "❌ تلفظ شما با متن هدف تطابق کمی داشت. گوش دادن به نمونه صحیح کمک می‌کند.";
            }

            // تحلیل جزئیات
            const wordAnalysis = this.analyzeWords(targetText, spokenText);
            if (wordAnalysis.mistakes.length > 0) {
                detailedAnalysis = `
                    <div class="mistakes-list">
                        <strong>🔍 کلمات نیازمند توجه:</strong>
                        ${wordAnalysis.mistakes.slice(0, 3).map(m => `
                            <div class="mistake-item">
                                <span class="wrong">"${m.spoken}"</span>
                                <i class="fas fa-arrow-left"></i>
                                <span class="correct">"${m.expected}"</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            // ذخیره پیشرفت
            if (score >= 70) {
                this.completedExercises.add(this.currentExercise.id);
            }
            this.totalScore += score;
            this.attemptCount++;
        }

        // نمایش نتیجه
        this.showResultPanel(score, spokenText || "(سکوت)", feedback, detailedAnalysis);
    }

    normalize(text) {
        return text
            .toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    calculateSimilarity(s1, s2) {
        const distance = this.levenshteinDistance(s1, s2);
        const maxLength = Math.max(s1.length, s2.length);
        
        if (maxLength === 0) return 100;
        
        const similarity = ((maxLength - distance) / maxLength) * 100;
        return Math.max(0, Math.min(100, similarity));
    }

    levenshteinDistance(s1, s2) {
        const m = s1.length;
        const n = s2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (s1[i - 1] === s2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j] + 1,
                        dp[i][j - 1] + 1,
                        dp[i - 1][j - 1] + 1
                    );
                }
            }
        }

        return dp[m][n];
    }

    analyzeWords(target, spoken) {
        const targetWords = target.split(/\s+/);
        const spokenWords = spoken.split(/\s+/);
        
        const mistakes = [];
        const correctWords = [];

        targetWords.forEach((word, index) => {
            const spokenWord = spokenWords[index] || '';
            
            if (this.normalize(word) === this.normalize(spokenWord)) {
                correctWords.push(word);
            } else {
                mistakes.push({
                    expected: word,
                    spoken: spokenWord || '(حذف شده)',
                    position: index
                });
            }
        });

        return { mistakes, correctWords };
    }

    // ==========================================
    // 🎨 UI & Rendering
    // ==========================================
    getHtml() {
        const levelData = this.exercises[this.currentLevel] || [];
        if (!this.currentExercise && levelData.length > 0) {
            this.currentExercise = levelData[0];
        }

        if (!this.currentExercise) {
            return `
                <div class="speaking-container">
                    <div class="speaking-header">
                        <h1>🎤 آزمایشگاه تلفظ</h1>
                    </div>
                    <div class="speaking-content">
                        <div class="loader">⏳ در حال بارگذاری داده...</div>
                    </div>
                </div>
            `;
        }

        const totalExercises = levelData.length;
        const completedCount = Array.from(this.completedExercises).filter(id =>
            levelData.some(ex => ex.id === id)
        ).length;
        
        const progressPercent = totalExercises > 0 ? Math.floor((completedCount / totalExercises) * 100) : 0;
        const averageScore = this.attemptCount > 0 ? Math.floor(this.totalScore / this.attemptCount) : 0;

        return `
            <div class="speaking-container">
                
                <!-- Header -->
                <div class="speaking-header">
                    <div class="header-right">
                        <button id="home-btn" class="glass-btn" title="بازگشت به خانه">
                            <i class="fas fa-home"></i>
                            <span>خانه</span>
                        </button>
                    </div>
                    <div class="header-title">
                        <h1>🎤 آزمایشگاه تلفظ</h1>
                    </div>
                    <div class="header-left">
                        <div class="level-selector">
                            <label>سطح:</label>
                            <select id="level-select" class="glass-select">
                                <option value="beginner" ${this.currentLevel === 'beginner' ? 'selected' : ''}>مبتدی</option>
                                <option value="intermediate" ${this.currentLevel === 'intermediate' ? 'selected' : ''}>متوسط</option>
                                <option value="advanced" ${this.currentLevel === 'advanced' ? 'selected' : ''}>پیشرفته</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Stats Card -->
                <div class="stats-card">
                    <div class="stat-item">
                        <span class="stat-value">${completedCount}/${totalExercises}</span>
                        <span class="stat-label">تمرین‌های تکمیل شده</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${progressPercent}%</span>
                        <span class="stat-label">پیشرفت</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${averageScore}%</span>
                        <span class="stat-label">میانگین نمره</span>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="speaking-content">
                    <div class="exercise-card">
                        <div class="exercise-header">
                            <div class="exercise-number">تمرین ${levelData.findIndex(ex => ex.id === this.currentExercise.id) + 1 || 1}</div>
                        </div>

                        <h2 class="target-sentence" dir="ltr">${this.currentExercise.text}</h2>
                        ${this.currentExercise.phonetic ? `<p class="phonetic-guide" dir="ltr">${this.currentExercise.phonetic}</p>` : ''}
                        <p class="translation">${this.currentExercise.translation}</p>

                        <div class="control-panel">
                            <button id="play-native-btn" class="glass-btn">
                                <i class="fas fa-volume-up"></i>
                                <span>شنیدن تلفظ صحیح</span>
                            </button>
                        </div>

                        <div class="visualizer-container">
                            <canvas id="visualizer-canvas" width="600" height="120"></canvas>
                        </div>

                        <div class="recording-status">
                            <p id="status-text">🎤 برای شروع ضبط، دکمه میکروفون را بزنید</p>
                        </div>

                        <div class="control-panel">
                            <button id="record-toggle-btn" class="glass-btn primary">
                                <i class="fas fa-microphone"></i>
                            </button>
                        </div>

                        <div id="result-panel" class="result-panel hidden">
                            <div class="score-display">
                                <div class="score-circle-container">
                                    <svg viewBox="0 0 100 100">
                                        <circle class="score-circle-bg" cx="50" cy="50" r="45" 
                                                fill="none" stroke-width="8"></circle>
                                        <circle id="score-circle" class="score-circle" cx="50" cy="50" r="45" 
                                                fill="none" stroke-width="8" 
                                                stroke-dasharray="283" stroke-dashoffset="283"></circle>
                                    </svg>
                                    <div class="score-text" id="score-val">0%</div>
                                </div>
                            </div>

                            <p class="feedback-message" id="feedback-msg"></p>

                            <div class="comparison-section">
                                <div class="comparison-row">
                                    <span class="label">متن هدف:</span>
                                    <span class="expected-display" dir="ltr">${this.currentExercise.text}</span>
                                </div>
                                <div class="comparison-row">
                                    <span class="label">شما گفتید:</span>
                                    <span class="spoken-display" id="spoken-val" dir="ltr">-</span>
                                </div>
                            </div>

                            <div id="detailed-analysis"></div>

                            <div class="action-buttons">
                                <button id="try-again-btn" class="glass-btn">
                                    <i class="fas fa-redo"></i>
                                    <span>تلاش دوباره</span>
                                </button>
                                <button id="next-btn" class="glass-btn primary">
                                    <i class="fas fa-arrow-left"></i>
                                    <span>تمرین بعدی</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Hints -->
                <div class="hints-section">
                    <div class="hint-card">
                        <i class="fas fa-lightbulb"></i>
                        <span>ابتدا به تلفظ صحیح گوش دهید</span>
                    </div>
                    <div class="hint-card">
                        <i class="fas fa-headphones"></i>
                        <span>در محیطی آرام تمرین کنید</span>
                    </div>
                </div>
            </div>
        `;
    }

    render(targetElement) {
        console.log("🎨 Speaking.render() called");
        
        if (!targetElement) {
            console.error("❌ targetElement is null or undefined");
            return;
        }

        try {
            this.container = targetElement;
            
            // تولید HTML
            const htmlContent = this.getHtml();
            
            if (!htmlContent || htmlContent.length < 100) {
                console.error("❌ Generated HTML is too short or empty");
                return;
            }

            // تزریق HTML
            this.container.innerHTML = htmlContent;
            
            // اطمینان از رندر شدن کامل DOM
            requestAnimationFrame(() => {
                this.attachEventListeners();
                this.drawStaticVisualizer();
                console.log("✅ Speaking section rendered successfully");
            });

        } catch (error) {
            console.error("❌ Error in Speaking.render:", error);
            
            // نمایش پیام خطا در صفحه
            if (this.container) {
                this.container.innerHTML = `
                    <div class="speaking-container">
                        <div class="error-message">
                            <h2>❌ خطا در بارگذاری</h2>
                            <p>${error.message}</p>
                            <button onclick="location.reload()" class="glass-btn">
                                <i class="fas fa-redo"></i> تلاش مجدد
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    }

    attachEventListeners() {
        if (!this.container) {
            console.warn("⚠️ Cannot attach events: container is null");
            return;
        }

        console.log("🔗 Attaching event listeners...");

        // 🏠 Home Button
        const homeBtn = this.container.querySelector('#home-btn');
        if (homeBtn) {
            homeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("🏠 Home button clicked");
                this.cleanup();
                
                if (this.app && typeof this.app.goToHome === 'function') {
                    this.app.goToHome();
                }
            });
        }

        // 🎚️ Level Select
        const levelSelect = this.container.querySelector('#level-select');
        if (levelSelect) {
            levelSelect.addEventListener('change', (e) => this.changeLevel(e.target.value));
        }

        // 🔊 Play Native
        const playBtn = this.container.querySelector('#play-native-btn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (this.currentExercise) {
                    this.playSmartAudio(this.currentExercise.text, this.currentExercise.id);
                }
            });
        }

        // 🎤 Record Toggle
        const recordBtn = this.container.querySelector('#record-toggle-btn');
        if (recordBtn) {
            recordBtn.addEventListener('click', () => {
                if (this.isRecording) {
                    this.stopRecording();
                } else {
                    this.startRecording();
                }
            });
        }

        // 🔄 Try Again
        const tryAgainBtn = this.container.querySelector('#try-again-btn');
        if (tryAgainBtn) {
            tryAgainBtn.addEventListener('click', () => this.resetForRetry());
        }

        // ➡️ Next
        const nextBtn = this.container.querySelector('#next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.nextExercise();
                this.hideResultPanel();
            });
        }

        console.log("✅ All event listeners attached");
    }

    changeLevel(newLevel) {
        console.log(`📊 Changing level to: ${newLevel}`);
        this.currentLevel = newLevel;
        
        const levelData = this.exercises[newLevel];
        if (levelData && levelData.length > 0) {
            this.currentExercise = levelData[0];
            
            if (this.container) {
                this.render(this.container);
                this.preloadAudioFiles(levelData);
            }
        }
    }

    nextExercise() {
        const levelData = this.exercises[this.currentLevel];
        if (!levelData || levelData.length === 0) return;
        
        const currentIndex = levelData.findIndex(ex => ex.id === this.currentExercise?.id);
        const nextIndex = (currentIndex + 1) % levelData.length;
        
        this.currentExercise = levelData[nextIndex];
        
        if (this.container) {
            this.render(this.container);
        }
        
        this.showNotification('✅ تمرین بعدی بارگذاری شد', 'success');
    }

    resetForRetry() {
        this.finalTranscript = '';
        this.hideResultPanel();
        this.showNotification('🔄 آماده برای تلاش مجدد', 'info');
    }

    updateUiState(recording) {
        const recordBtn = this.container?.querySelector('#record-toggle-btn');
        const statusText = this.container?.querySelector('#status-text');
        
        if (recordBtn) {
            if (recording) {
                recordBtn.classList.add('recording');
                recordBtn.innerHTML = '<i class="fas fa-stop"></i>';
            } else {
                recordBtn.classList.remove('recording');
                recordBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            }
        }
        
        if (statusText && !recording) {
            statusText.textContent = '⏹️ در حال تحلیل...';
        }
    }

    showResultPanel(score, spokenText, feedback, detailedAnalysis) {
        const panel = this.container?.querySelector('#result-panel');
        if (!panel) return;
        
        panel.classList.remove('hidden');
        
        // Score Circle Animation
        const scoreCircle = this.container.querySelector('#score-circle');
        if (scoreCircle) {
            const circumference = 2 * Math.PI * 45;
            const offset = circumference - (score / 100) * circumference;
            scoreCircle.style.strokeDashoffset = offset;
            
            // رنگ بر اساس نمره
            if (score >= 85) {
                scoreCircle.style.stroke = '#10b981';
            } else if (score >= 70) {
                scoreCircle.style.stroke = '#f59e0b';
            } else {
                scoreCircle.style.stroke = '#ef4444';
            }
        }
        
        // Score Text
        const scoreVal = this.container.querySelector('#score-val');
        if (scoreVal) {
            scoreVal.textContent = `${score}%`;
        }
        
        // Feedback
        const feedbackMsg = this.container.querySelector('#feedback-msg');
        if (feedbackMsg) {
            feedbackMsg.innerHTML = feedback;
        }
        
        // Spoken Text
        const spokenVal = this.container.querySelector('#spoken-val');
        if (spokenVal) {
            spokenVal.textContent = spokenText;
        }
        
        // Detailed Analysis
        const analysisDiv = this.container.querySelector('#detailed-analysis');
        if (analysisDiv) {
            analysisDiv.innerHTML = detailedAnalysis;
        }
    }

    hideResultPanel() {
        const panel = this.container?.querySelector('#result-panel');
        if (panel) {
            panel.classList.add('hidden');
        }
    }

    showNotification(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        if (this.app && typeof this.app.showNotification === 'function') {
            this.app.showNotification(message, type);
        } else {
            // Fallback notification
            alert(`${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'} ${message}`);
        }
    }

    // ==========================================
    // 🎨 Audio Visualizer
    // ==========================================
    drawVisualizer() {
        if (!this.analyser || !this.dataArray) return;
        
        const canvas = this.container?.querySelector('#visualizer-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const width = canvas.width;
        const height = canvas.height;
        
        const draw = () => {
            if (!this.isRecording) {
                this.drawStaticVisualizer();
                return;
            }
            
            this.animationId = requestAnimationFrame(draw);
            
            this.analyser.getByteFrequencyData(this.dataArray);
            
            ctx.fillStyle = 'rgba(17, 24, 39, 0.2)';
            ctx.fillRect(0, 0, width, height);
            
            const barWidth = (width / this.dataArray.length) * 2.5;
            let x = 0;
            
            for (let i = 0; i < this.dataArray.length; i++) {
                const barHeight = (this.dataArray[i] / 255) * height * 0.8;
                
                const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
                gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
                gradient.addColorStop(1, 'rgba(139, 92, 246, 0.8)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
                
                x += barWidth;
            }
        };
        
        draw();
    }

    drawStaticVisualizer() {
        const canvas = this.container?.querySelector('#visualizer-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
        ctx.fillRect(0, 0, width, height);
        
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
    }

    // ==========================================
    // 🧹 Cleanup
    // ==========================================
    cleanup() {
        console.log("🧹 Speaking cleanup started...");
        
        // 1. توقف ضبط
        if (this.isRecording) {
            this.stopRecording();
        }
        
        // 2. توقف صداها
        this.stopAudioOnly();
        
        // 3. پاکسازی Audio Context
        if (this.audioContext) {
            try {
                this.audioContext.close();
            } catch (e) {
                console.warn("AudioContext close error:", e);
            }
            this.audioContext = null;
        }
        
        // 4. پاکسازی Media Stream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        // 5. لغو انیمیشن
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        console.log("✅ Speaking cleanup completed");
    }

    destroy() {
        console.log("🗑️ Speaking module destroyed");
        this.cleanup();
        this.container = null;
    }
}