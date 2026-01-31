// js/modules/Grammar.js
export class Grammar {
    constructor(lessonData) {
        console.log('📥 Grammar constructor called with:', lessonData);
        // نگهداری ارجاع به توابع برای حذف Event Listenerها
        this.boundHandlers = {};
        this.activeEventListeners = [];
        // ✅ حالت سازگاری: اگر lessonId داده شده، از grammar.json بارگذاری کن
        if (lessonData && typeof lessonData === 'object' && lessonData.lessonId) {
            console.log('📥 حالت جدید: بارگذاری از فایل برای درس:', lessonData.lessonId);
            this.lessonId = lessonData.lessonId;
            this.loadFromVocab(lessonData.lessonId);
            return;
        }
        // حالت قدیمی: داده مستقیم
        console.log('📥 حالت قدیمی: استفاده از داده مستقیم');
        this.initWithData(lessonData);
    }
    // ✅ متد جدید: بارگذاری از grammar.json
// ✅ متد جدید: بارگذاری از grammar.json با تبدیل lessonId به عدد
// ✅ متد جدید: بارگذاری از grammar.json با استخراج عدد از lessonId
// ✅ متد جدید: بارگذاری از grammar.json با پشتیبانی از number و string
// ✅ متد جدید: بارگذاری از grammar.json با پشتیبانی از 1-10
// ✅ متد جدید: بارگذاری از grammar.json با مسیرهای lesson1 تا lesson10
async loadFromVocab(lessonId) {
    try {
        // ✅ تبدیل lessonId به عدد (بدون صفر اول)
        const lessonNumber = Number(String(lessonId).replace(/\D/g, ''));
        const validLessonNumber = Math.max(1, Math.min(10, lessonNumber));
        
        console.log(`🔍 در حال بارگذاری grammar.json برای درس ${validLessonNumber} (مسیر: data/lesson${validLessonNumber}/grammar.json)`);
        const response = await fetch(`data/lesson${validLessonNumber}/grammar.json`);
        
        if (!response.ok) {
            throw new Error(`فایل grammar.json برای درس ${validLessonNumber} یافت نشد (${response.status})`);
        }
        
        const grammarData = await response.json();
        console.log('✅ grammar.json بارگذاری شد:', grammarData.title);
        this.initWithData(grammarData);
    } catch (error) {
        console.error('❌ خطا در بارگذاری گرامر:', error);
        this.initWithData(this.getDefaultData());
    }
}
    // ✅ متد جدید: مقداردهی اولیه با داده
    initWithData(lessonData) {
        console.log('🎯 initWithData called with:', lessonData?.title);
        // اگر داده آرایه است، اولین آیتم را بگیر
        if (Array.isArray(lessonData) && lessonData.length > 0) {
            console.log('📌 داده آرایه است، اولین آیتم را می‌گیرم');
            lessonData = lessonData[0];
        }
        if (!lessonData || typeof lessonData !== 'object') {
            console.error('❌ Invalid grammar data provided:', lessonData);
            this.data = this.getDefaultData();
        } else {
            this.data = lessonData;
            console.log('✅ داده‌های گرامر تنظیم شد:', this.data.title);
        }
        // مقداردهی اولیه متغیرها
        this.activeTopicIndex = 0;
        this.currentQIndex = 0;
        this.score = 0;
        this.totalPoints = 0;
        this.userAnswers = [];
        this.timerInterval = null;
        // ✅ استفاده از ساختار جدید quiz
        this.quizQuestions = this.data.quiz?.questions || [];
        // ✅ نرمال‌سازی سوالات آزمون
        this.normalizeQuizQuestions();
        this.resultsCategories = this.data.quiz?.results_categories || [];
        // ✅ دسترسی به AudioManager
        this.audioManager = window.app?.audioManager || null;
        // ✅ سیستم صوتی چند لایه با cache
        this.audioCache = new Map();
        this.currentAccent = 'us'; // لهجه پیش‌فرض
        this.audioRetries = 0;
        this.maxAudioRetries = 3;
        // بایند کردن متدها برای حفظ context
        this.boundHandlers = {
            handleGlobalClick: this.handleGlobalClick.bind(this),
            handleQuizAction: this.handleQuizAction.bind(this),
            handleAudioClick: this.handleAudioClick.bind(this)
        };
        console.log('✅ Grammar class initialized');
    }
    // ✅ متد init برای اتصال صحیح event listenerها
    init() {
        console.log('🎯 Grammar.init() called - شروع فعال‌سازی');
        this.cleanup(); // پاکسازی قبل از شروع
        this.initEventListeners();
        // تنظیم تب فعال اول
        setTimeout(() => {
            this.setupTabs();
            this.bindAudioEvents(); // فقط برای دکمه‌های صوتی عمومی
            console.log('✅ تمام event listenerها وصل شدند');
        }, 100);
    }
    // ✅ متد جدید: پاکسازی حافظه و Event Listenerها
    cleanup() {
        console.log('🧹 پاکسازی منابع...');
        if (this.timerInterval) clearInterval(this.timerInterval);
        // حذف Event Listenerهای سراسری
        if (this.boundHandlers.handleGlobalClick) {
            document.removeEventListener('click', this.boundHandlers.handleGlobalClick);
        }
        // پاک کردن آرایه‌های ردیابی
        this.activeEventListeners = [];
        console.log('✅ پاکسازی انجام شد');
    }
    // ✅ متد جدید: تنظیم تب‌ها
    setupTabs() {
        console.log('🔄 تنظیم تب‌ها...');
        this.ensureTabsRendered();
        const container = document.getElementById('grammar-dynamic-content');
        if (container) {
            container.innerHTML = this.renderSections();
        }
        this.updateTabStates();
    }
    // ✅ متد جدید: اطمینان از رندر شدن تب‌ها
    ensureTabsRendered() {
        const tabsContainer = document.querySelector('.grammar-tabs-container');
        const grammarContainer = document.querySelector('.grammar-container');
        if (!tabsContainer && grammarContainer) {
            const newTabsContainer = document.createElement('div');
            newTabsContainer.className = 'grammar-tabs-container';
            const tabsInner = document.createElement('div');
            tabsInner.className = 'grammar-tabs';
            tabsInner.innerHTML = this.renderTabs();
            newTabsContainer.appendChild(tabsInner);
            const contentDiv = document.getElementById('grammar-dynamic-content');
            if (contentDiv) {
                grammarContainer.insertBefore(newTabsContainer, contentDiv);
            } else {
                grammarContainer.appendChild(newTabsContainer);
            }
            console.log('✅ Tabs container created and added');
        } else if (tabsContainer) {
            tabsContainer.querySelector('.grammar-tabs').innerHTML = this.renderTabs();
            console.log('✅ Tabs updated');
        }
    }
    // ✅ متد جدید: به‌روزرسانی وضعیت تب‌ها
    updateTabStates() {
        const tabButtons = document.querySelectorAll('.grammar-tab');
        if (tabButtons.length === 0) return;
        tabButtons.forEach((btn, i) => {
            if (i === this.activeTopicIndex) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    // ✅ اصلاح کامل متد fixQuestionText
    fixQuestionText(text) {
        if (!text || typeof text !== 'string') return text;
        let fixed = text.trim();
        // حذف اعداد اول
        fixed = fixed.replace(/^[0-9]+\s*/, '');
        // حل مشکل نقطه و علامت سوال در اول جمله
        if (fixed.match(/^[.?!]/)) {
            const punctuation = fixed.charAt(0);
            fixed = fixed.substring(1).trim();
            if (fixed.length > 0 && !fixed.match(/^[A-Z]/)) {
                fixed = fixed.charAt(0).toUpperCase() + fixed.slice(1);
            }
            if (!fixed.endsWith(punctuation)) {
                fixed = fixed + punctuation;
            }
        }
        // بررسی پایان جمله
        const lastChar = fixed.charAt(fixed.length - 1);
        if (!['.', '?', '!'].includes(lastChar)) {
            const isQuestion = fixed.match(/^(am|is|are|do|does|did|can|could|will|would|shall|should|have|has|had)\s+[a-z]/i)
                             || fixed.includes('?')
                             || fixed.match(/\b(what|when|where|who|whom|which|whose|why|how)\b/i);
            if (isQuestion) {
                fixed = fixed.replace(/[.?!]*$/, '') + '?';
            } else {
                fixed = fixed.replace(/[.?!]*$/, '') + '.';
            }
        }
        // اصلاح جای خالی
        if (fixed.includes('_____') || fixed.includes('___')) {
            fixed = fixed.replace(/^\./, '').trim();
            if (fixed.length > 0 && !fixed.match(/^[A-Z]/)) {
                fixed = fixed.charAt(0).toUpperCase() + fixed.slice(1);
            }
        }
        // حذف علائم اضافی
        fixed = fixed.replace(/\?+/g, '?');
        return fixed;
    }
    // ✅ متد جدید: نرمال‌سازی سوالات آزمون
    normalizeQuizQuestions() {
        this.quizQuestions = this.quizQuestions.map((q, index) => {
            const normalized = { ...q };
            if (normalized.q || normalized.question) {
                const text = normalized.q || normalized.question;
                normalized.q = this.fixQuestionText(text);
            }
            if (normalized.options && Array.isArray(normalized.options)) {
                normalized.options = normalized.options.map(opt => this.fixOptionText(opt));
            }
            if (normalized.correct_answer && typeof normalized.correct_answer === 'string') {
                normalized.correct_answer = this.fixAnswerText(normalized.correct_answer);
            }
            if (!normalized.id) {
                normalized.id = `grammar_q_${index + 1}`;
            }
            return normalized;
        });
    }
    // ✅ اصلاح متن گزینه
    fixOptionText(text) {
        if (!text || typeof text !== 'string') return text;
        let fixed = text.trim();
        fixed = fixed.replace(/^[0-9]+\s*/, '');
        if (fixed.startsWith('.')) {
            fixed = fixed.substring(1).trim();
        }
        return fixed;
    }
    // ✅ اصلاح پاسخ
    fixAnswerText(text) {
        if (!text || typeof text !== 'string') return text;
        return text.toLowerCase().trim();
    }
    getDefaultData() {
        return {
            title: "گرامر",
            topics: [{
                title: "محتوا در دسترس نیست",
                sections: [{
                    type: 'text',
                    value: 'لطفاً دوباره تلاش کنید.'
                }]
            }],
            quiz: { questions: [] }
        };
    }
    // متد کمکی برای استخراج متن
    extractText(value) {
        if (!value) return '';
        if (typeof value === 'string') return this.fixPersianText(value);
        if (typeof value === 'object') {
            if (value.en || value.english) {
                const englishText = value.en || value.english;
                return this.fixExampleEnglish(englishText); // اینجا اصلاح شد
            }
            const text = value.fa || value.text || value.value || '';
            return this.fixPersianText(text);
        }
        return String(value);
    }
    // ✅ اصلاح متن فارسی
    fixPersianText(text) {
        if (!text || typeof text !== 'string') return text;
        let fixed = text;
        const corrections = {
            'تعریق سریع': 'تمرین سریع',
            'تکات': 'نکات',
            'مقاصیم': 'مفاهیم',
            'فراس': 'فراگیری',
            'هستید': 'هستیم',
            'اثر': 'او'
        };
        Object.entries(corrections).forEach(([wrong, correct]) => {
            fixed = fixed.replace(new RegExp(wrong, 'g'), correct);
        });
        return fixed;
    }
    // ✅ اصلاح جدید: فرمت‌دهی صحیح جملات انگلیسی
    fixExampleEnglish(text) {
        if (!text || typeof text !== 'string') return text;
        return this.fixQuestionText(text); // اینجا اصلاح شد
    }
    normalizeSection(section) {
        if (!section) return { type: 'text', value: 'محتوا نامعتبر' };
        if (typeof section === 'string') {
            return { type: 'text', value: this.fixPersianText(section) };
        }
        if (!section.type) {
            if (section.value) return { ...section, type: 'text', value: this.fixPersianText(section.value) };
            if (section.content) return { ...section, type: 'text', content: this.fixPersianText(section.content) };
            if (section.text) return { ...section, type: 'text', text: this.fixPersianText(section.text) };
            return { type: 'text', ...section };
        }
        return section;
    }
    // ✅ سیستم صوتی چند لایه پیشرفته
    async playAudioWithFallback(text, accent = this.currentAccent, element = null) {
        if (!text || text.trim() === '') return null;
        const cleanText = text.replace(/[^\w\s.,?!'-]/g, '').trim();
        if (!cleanText) return null;
        if (element) {
            element.classList.add('playing');
            element.innerHTML = '<span class="loading-spinner">⏳</span>';
            element.disabled = true;
        }
        // لایه 1: TTS آنلاین
        if (this.audioManager) {
            try {
                const audioBlob = await this.audioManager.playWord(cleanText, accent);
                if (audioBlob) {
                    if (element) this.resetAudioButton(element);
                    this.audioRetries = 0;
                    return audioBlob;
                }
            } catch (error) {
                console.warn(`⚠️ لایه 1 شکست خورد: ${error.message}`);
            }
        }
        // لایه 2: لهجه مخالف
        if (this.audioRetries < this.maxAudioRetries) {
            try {
                const fallbackAccent = accent === 'us' ? 'uk' : 'us';
                if (this.audioManager) {
                    const audioBlob = await this.audioManager.playWord(cleanText, fallbackAccent);
                    if (audioBlob) {
                        if (element) this.resetAudioButton(element);
                        this.audioRetries = 0;
                        return audioBlob;
                    }
                }
            } catch (error) {
                console.warn(`⚠️ لایه 2 شکست خورد: ${error.message}`);
                this.audioRetries++;
            }
        }
        // لایه 3: SpeechSynthesis مرورگر
        try {
            if ('speechSynthesis' in window) {
                return new Promise((resolve) => {
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance(cleanText);
                    utterance.lang = accent === 'us' ? 'en-US' : 'en-GB';
                    utterance.rate = 0.8;
                    utterance.pitch = 1;
                    utterance.volume = 1;
                    utterance.onend = () => {
                        if (element) this.resetAudioButton(element);
                        resolve({ type: 'synthesis', text: cleanText });
                    };
                    utterance.onerror = () => {
                        if (element) this.resetAudioButton(element);
                        resolve(null);
                    };
                    window.speechSynthesis.speak(utterance);
                });
            }
        } catch (error) {
            console.error('❌ خطا در SpeechSynthesis:', error);
        }
        if (element) {
            element.innerHTML = '🔇';
            element.title = 'سرویس صوتی در دسترس نیست';
            setTimeout(() => this.resetAudioButton(element), 2000);
        }
        return null;
    }
    // ✅ پخش فایل صوتی
    async playAudioFile(url, element = null) {
        if (!url) return false;
        if (element) {
            element.classList.add('playing');
            element.innerHTML = '<span class="loading-spinner">⏳</span>';
            element.disabled = true;
        }
        try {
            let audioUrl = url;
            if (!url.startsWith('http') && !url.startsWith('/') && !url.startsWith('data/')) {
                audioUrl = `data/audio/${url}`;
            }
            const audio = new Audio(audioUrl);
            return new Promise((resolve) => {
                audio.onended = () => {
                    if (element) {
                        setTimeout(() => {
                            element.classList.remove('playing');
                            this.resetAudioButton(element);
                        }, 300);
                    }
                    resolve(true);
                };
                audio.onerror = () => {
                    // تلاش برای TTS در صورت خطا
                    const parent = element?.closest('.example-item');
                    if (parent) {
                        const englishText = parent.querySelector('.example-english')?.textContent;
                        if (englishText && this.audioManager) {
                            setTimeout(async () => {
                                await this.playAudioWithFallback(englishText, this.currentAccent, element);
                            }, 500);
                        }
                    }
                    if (element) {
                        element.classList.remove('playing');
                        this.resetAudioButton(element);
                    }
                    resolve(false);
                };
                audio.play().catch(() => {
                    if (element) this.resetAudioButton(element);
                    resolve(false);
                });
            });
        } catch (error) {
            console.error(`❌ خطا در دسترسی به فایل:`, error);
            if (element) this.resetAudioButton(element);
            return false;
        }
    }
    // ✅ ریست دکمه صوتی
    resetAudioButton(element) {
        if (!element) return;
        const accent = element.dataset.accent || this.currentAccent;
        element.innerHTML = `
            <span class="audio-icon">🔊</span>
            <span class="accent-badge">${accent === 'uk' ? '🇬🇧' : '🇺🇸'}</span>
        `;
        element.classList.remove('playing');
        element.disabled = false;
        element.title = `پخش تلفظ (${accent === 'uk' ? 'British' : 'American'})`;
    }
    // ✅ اصلاح کامل initEventListeners
    initEventListeners() {
        console.log('🔗 وصل کردن event listenerهای گرامر');
        // استفاده از Event Delegation برای کلیک‌های سراسری
        document.addEventListener('click', this.boundHandlers.handleGlobalClick);
        console.log('✅ Event listenerهای اصلی وصل شدند');
    }
    // ✅ متد جدید: مدیریت کلیک‌های global (بهینه شده)
    handleGlobalClick(e) {
        const target = e.target;
        // 1. مدیریت تب‌ها
        const tabBtn = target.closest('.grammar-tab');
        if (tabBtn) {
            e.preventDefault();
            const index = parseInt(tabBtn.dataset.index);
            if (!isNaN(index)) this.switchTab(index);
            return;
        }
        // 2. مدیریت دکمه‌های آزمون
        if (target.closest('.btn-quiz-start')) {
            this.startQuiz();
            return;
        }
        if (target.id === 'btnCloseQuiz' || target.id === 'btnCloseFinal' || target.closest('.modal-close')) {
            this.closeModal();
            return;
        }
        if (target.id === 'btnRestartQuiz') {
            this.restartQuiz();
            return;
        }
        // 3. مدیریت دکمه‌های صوتی (Delegation)
        if (target.matches('.play-tts-btn') || target.closest('.play-tts-btn')) {
            const btn = target.matches('.play-tts-btn') ? target : target.closest('.play-tts-btn');
            this.handleAudioClick(btn, 'tts');
            return;
        }
        if (target.matches('.play-audio-file-btn') || target.closest('.play-audio-file-btn')) {
            const btn = target.matches('.play-audio-file-btn') ? target : target.closest('.play-audio-file-btn');
            this.handleAudioClick(btn, 'file');
            return;
        }
        // 4. مدیریت تمرین سریع (Quick Practice)
        const checkBtn = target.closest('.check-practice-btn');
        if (checkBtn) {
            this.handlePracticeCheck(checkBtn);
            return;
        }
        // 5. مدیریت آزمون
        if (target.closest('.btn-submit-answer')) {
            this.handleQuizAction(e);
            return;
        }
        if (target.closest('.btn-next-question')) {
            this.handleQuizAction(e);
            return;
        }
        if (target.closest('.btn-skip-question')) {
            this.handleQuizAction(e);
            return;
        }
        // ✅ 6. مدیریت دکمه ارسال تمرین تعاملی (جدید)
        if (target.closest('.btn-submit-interactive')) {
            const container = target.closest('.interactive-container');
            // پیدا کردن سکشن مربوطه از طریق داده‌های دام یا جستجو
            const sectionId = container.dataset.sectionId;
            if (sectionId) {
                const section = this.findSectionById(sectionId);
                if (section) {
                    this.submitInteractiveAnswer(section);
                }
            }
            return;
        }
    }
    // متد کمکی برای پیدا کردن سکشن بر اساس ID
    findSectionById(id) {
        if (!this.data || !this.data.topics) return null;
        for (const topic of this.data.topics) {
            if (topic.sections) {
                const found = topic.sections.find(s => s.id === id);
                if (found) return found;
            }
        }
        return null;
    }
    // ✅ متد جدید: مدیریت کلیک صدا
    async handleAudioClick(btn, type) {
        if (!btn) return;
        if (type === 'tts') {
            const text = btn.dataset.audioText;
            const accent = btn.dataset.accent || this.currentAccent;
            if (text) await this.playAudioWithFallback(text, accent, btn);
        } else if (type === 'file') {
            const url = btn.dataset.src || btn.dataset.audioUrl;
            if (url) await this.playAudioFile(url, btn);
        }
    }
    // ✅ متد جدید: بررسی تمرین سریع
    handlePracticeCheck(btn) {
        const parent = btn.closest('.practice-item');
        const selected = parent.querySelector('input[name^="practice_"]:checked');
        const correctIndex = parseInt(btn.dataset.correct);
        const explanation = btn.dataset.explanation;
        if (!selected) {
            alert('لطفاً یک گزینه انتخاب کنید');
            return;
        }
        const selectedIndex = parseInt(selected.value);
        const isCorrect = selectedIndex === correctIndex;
        const feedback = parent.querySelector('.practice-feedback');
        feedback.innerHTML = `
            <div class="feedback ${isCorrect ? 'correct' : 'incorrect'}">
                ${isCorrect ? '✅ پاسخ صحیح!' : '❌ پاسخ نادرست'}
                ${explanation ? `<p class="explanation">${explanation}</p>` : ''}
            </div>
        `;
        feedback.style.display = 'block';
        parent.querySelectorAll('input[type="radio"]').forEach(inp => inp.disabled = true);
        btn.disabled = true;
    }
    // ✅ اصلاح کامل متد switchTab
    switchTab(index) {
        if (!this.data?.topics || index < 0 || index >= this.data.topics.length) return;
        this.activeTopicIndex = index;
        const container = document.getElementById('grammar-dynamic-content');
        if (container) {
            container.innerHTML = this.renderSections();
            this.updateTabStates();
        }
    }
    // ✅ متد رندر تب‌ها
    renderTabs() {
        if (!this.data.topics || !Array.isArray(this.data.topics)) return '';
        return this.data.topics.map((topic, index) => {
            const isActive = index === this.activeTopicIndex;
            const title = this.extractText(topic.title);
            const icon = topic.icon || '📚';
            return `
                <button class="grammar-tab ${isActive ? 'active' : ''}"
                        data-index="${index}"
                        title="${this.extractText(topic.description) || ''}">
                    <span class="tab-icon">${icon}</span>
                    <span class="tab-title">${title}</span>
                </button>
            `;
        }).join('');
    }
    // ✅ متد رندر بخش‌ها
    renderSections() {
        if (!this.data.topics || !this.data.topics[this.activeTopicIndex]) {
            return '<div class="no-content">محتوایی برای نمایش وجود ندارد</div>';
        }
        const sections = this.data.topics[this.activeTopicIndex].sections;
        if (!sections || !Array.isArray(sections)) {
            return '<div class="no-sections">بخشی یافت نشد</div>';
        }
        return sections.map((rawSection, sectionIndex) => {
            const section = this.normalizeSection(rawSection);
            if (!section || !section.type) return '';
            const sectionId = section.id || `section-${this.activeTopicIndex}-${sectionIndex}`;
            const sectionClass = `grammar-section ${section.type}-section`;
            let html = `<div id="${sectionId}" class="${sectionClass}" data-section-id="${sectionId}">`;
            const sectionTitle = this.extractText(section.title);
            if (sectionTitle) html += `<h4 class="section-title">${sectionTitle}</h4>`;
            const sectionDesc = this.extractText(section.description);
            if (sectionDesc) html += `<p class="section-description">${sectionDesc}</p>`;
            html += this.renderSectionContent(section);
            html += '</div>';
            return html;
        }).join('');
    }
    // ✅ متد رندر محتوای بخش
    renderSectionContent(section) {
        switch(section.type) {
            case 'mixed': return this.renderMixedContent(section.content);
            case 'intro': return `<div class="intro-content">${section.icon ?` <span class="intro-icon">${section.icon}</span>` : ''}<p class="intro-text">${this.extractText(section.text)}</p></div>`;
            case 'formula': return `<div class="formula-content"><code class="formula-code">${this.extractText(section.content)}</code>${section.examples ? this.renderExamples(section.examples) : ''}</div>`;
            case 'table': return this.renderTable(section);
            case 'warning': return `<div class="warning-content warning-${section.severity || 'medium'}"><div class="warning-header"><span class="warning-icon">⚠️</span><h5>${this.extractText(section.title) || 'نکته مهم'}</h5></div><div class="warning-body">${this.extractText(section.text || section.content)}</div></div>`;
            case 'examples': return this.renderExamples(section);
            case 'interactive': return this.renderInteractive(section);
            case 'comparison': return this.renderComparison(section);
            case 'text': return `<div class="text-content">${this.extractText(section.value || section.content || section.text)}</div>`;
            case 'quick_practice': return this.renderQuickPractice(section);
            default:
                const fallbackContent = this.extractText(section.value || section.content || section.text);
                return fallbackContent ? `<div class="general-content">${fallbackContent}</div>` : '';
        }
    }
    // ✅ سایر متدهای رندرینگ (Table, Examples, Mixed, etc.) - بدون تغییر منطقی، فقط تمیزکاری
    renderTable(section) {
        if (!section.headers || !section.rows) return '<p>جدول نامعتبر است</p>';
        const headers = section.headers.map(h => `<th>${this.extractText(h)}</th>`).join('');
        const rows = section.rows.map(row => {
            const cells = row.cols ? row.cols.map(c => `<td>${this.extractText(c)}</td>`).join('') :
                         `<td>${this.extractText(row.col1)}</td><td>${this.extractText(row.col2)}</td><td>${this.extractText(row.col3)}</td>`;
            return `<tr class="${row.highlight ? 'highlight-row' : ''}">${cells}</tr>`;
        }).join('');
        return `
            <div class="table-container">
                <table class="grammar-table">
                    <thead><tr>${headers}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }
    renderExamples(section) {
        const items = section.items || section.examples || [];
        if (!items.length) return '';
        return `
            <div class="examples-container">
                <ul class="examples-list">
                    ${items.map((item, index) => {
                        const englishText = this.fixExampleEnglish(item.en || item.english || '');
                        const persianText = this.extractText(item.fa || item.persian || '');
                        const audioUrl = item.audio_file ? `data/audio/${item.audio_file}` : null;
                        return `
                            <li class="example-item">
                                <div class="example-content">
                                    <div class="example-english">${englishText}</div>
                                    <div class="example-persian">${persianText}</div>
                                </div>
                                <div class="audio-controls">
                                    ${audioUrl ? `<button class="play-audio-file-btn" data-src="${audioUrl}">🎵</button>` : ''}
                                    ${this.audioManager ? `<button class="play-tts-btn" data-audio-text="${englishText.replace(/"/g, '&quot;')}">🔊</button>` : ''}
                                </div>
                            </li>`;
                    }).join('')}
                </ul>
            </div>`;
    }
    renderMixedContent(content) {
        if (!content || !Array.isArray(content)) return '';
        return content.map(item => {
            if (!item || !item.type) return `<div class="text-content">${this.extractText(item)}</div>`;
            switch(item.type) {
                case 'text': return `<div class="text-content">${this.extractText(item.value)}</div>`;
                case 'audio': return `<div class="audio-content"><button class="play-audio-file-btn" data-src="${item.src}">🔊 پخش</button></div>`;
                case 'image': return `<div class="image-content"><img src="${item.src}" alt="${item.alt || ''}" loading="lazy" /></div>`;
                default: return '';
            }
        }).join('');
    }
    renderQuickPractice(section) {
        const items = section.items || section.practice || [];
        if (!items.length) return '';
        return `
            <div class="quick-practice-container">
                <h4>${this.extractText(section.title) || 'تمرین سریع'}</h4>
                <div class="practice-items">
                    ${items.map((item, index) => {
                        const question = this.fixQuestionText(item.question || item.q || '');
                        const options = (item.options || []).map(opt => this.fixOptionText(opt));
                        const correctIndex = item.correct_index !== undefined ? item.correct_index : 0;
                        const explanation = this.extractText(item.explanation);
                        return `
                            <div class="practice-item">
                                <div class="practice-question">${index + 1}. ${question}</div>
                                <div class="practice-options">
                                    ${options.map((opt, optIndex) => `
                                        <label class="practice-option">
                                            <input type="radio" name="practice_${index}" value="${optIndex}" />
                                            <span>${opt}</span>
                                        </label>
                                    `).join('')}
                                </div>
                                <button class="check-practice-btn" data-correct="${correctIndex}" data-explanation="${explanation || ''}">بررسی پاسخ</button>
                                <div class="practice-feedback" style="display: none;"></div>
                            </div>`;
                    }).join('')}
                </div>
            </div>`;
    }
    // ==================== اصلاحات جدید Comparison و Interactive ====================
    renderComparison(section) {
        if (!section.columns || !section.rows) return '<p>داده‌های مقایسه‌ای ناقص است</p>';
        const headers = section.columns.map(h => `<th>${this.extractText(h)}</th>`).join('');
        const rows = section.rows.map(row => {
            const cells = row.cols ? row.cols.map(c => `<td>${this.extractText(c)}</td>`).join('') :
                         `<td>${this.extractText(row.col1)}</td><td>${this.extractText(row.col2)}</td>`;
            return `<tr>${cells}</tr>`;
        }).join('');
        return `
            <div class="comparison-container">
                <h4 class="section-title">${this.extractText(section.title) || 'مقایسه'}</h4>
                <div class="comparison-description">
                    ${this.extractText(section.description) || ''}
                </div>
                <table class="comparison-table">
                    <thead><tr>${headers}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }
    renderInteractive(section) {
        const activityType = section.activity_type || 'default';
        const prompt = this.extractText(section.prompt || 'تمرین تعاملی');
        const hint = this.extractText(section.hint || '');
        let html = `
            <div class="interactive-container">
                <div class="interactive-header">
                    <h4 class="section-title">${this.extractText(section.title) || 'تمرین تعاملی'}</h4>
                    <div class="interactive-prompt">${prompt}</div>
                </div>
        `;
        if (hint) {
            html += `<div class="interactive-hint"><strong>راهنمایی:</strong> ${hint}</div>`;
        }
        if (activityType === 'question_conversion') {
            html += this.renderQuestionConversion(section);
        } else if (activityType === 'collocation_identification') {
            html += this.renderCollocationIdentification(section);
        } else if (activityType === 'passive_voice_conversion') {
            html += this.renderPassiveVoiceConversion(section);
        } else if (activityType === 'error_correction') {
            html += this.renderErrorCorrection(section);
        } else if (activityType === 'sentence_transformation') {
            html += this.renderSentenceTransformation(section);
        } else {
            html += this.renderDefaultInteractive(section);
        }
        html += `
                <div class="interactive-actions">
                    <button class="btn-submit-interactive">ارسال پاسخ</button>
                </div>
            </div>
        `;
        return html;
    }
    renderQuestionConversion(section) {
        const baseSentence = this.extractText(section.base_sentence || '');
        return `
            <div class="interactive-question-conversion">
                <div class="base-sentence">جمله اصلی: <strong>${baseSentence}</strong></div>
                <div class="input-group">
                    <label for="interactive-answer">پاسخ شما:</label>
                    <input type="text" id="interactive-answer" class="interactive-input" placeholder="پاسخ خود را بنویسید...">
                </div>
            </div>
        `;
    }
    renderCollocationIdentification(section) {
        const options = section.options || [];
        return `
            <div class="interactive-collocation-identification">
                <div class="options-list">
                    ${options.map((option, index) => `
                        <label class="option-label">
                            <input type="radio" name="collocation-option" value="${index}">
                            <span class="option-text">${this.extractText(option)}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    }
    renderPassiveVoiceConversion(section) {
        const baseSentence = this.extractText(section.base_sentence || '');
        return `
            <div class="interactive-passive-voice">
                <div class="base-sentence">جمله اصلی: <strong>${baseSentence}</strong></div>
                <div class="input-group">
                    <label for="passive-answer">جمله مجهول:</label>
                    <input type="text" id="passive-answer" class="interactive-input" placeholder="جمله مجهول را بنویسید...">
                </div>
            </div>
        `;
    }
    renderErrorCorrection(section) {
        const sentence = this.extractText(section.sentence || '');
        return `
            <div class="interactive-error-correction">
                <div class="error-sentence">جمله اشتباه: <strong>${sentence}</strong></div>
                <div class="input-group">
                    <label for="error-answer">جمله اصلاح شده:</label>
                    <input type="text" id="error-answer" class="interactive-input" placeholder="جمله اصلاح شده را بنویسید...">
                </div>
            </div>
        `;
    }
    renderSentenceTransformation(section) {
        const baseSentence = this.extractText(section.base_sentence || '');
        return `
            <div class="interactive-sentence-transformation">
                <div class="base-sentence">جمله اصلی: <strong>${baseSentence}</strong></div>
                <div class="input-group">
                    <label for="transformation-answer">جمله تبدیل شده:</label>
                    <input type="text" id="transformation-answer" class="interactive-input" placeholder="جمله تبدیل شده را بنویسید...">
                </div>
            </div>
        `;
    }
    renderDefaultInteractive(section) {
        return `
            <div class="interactive-default">
                <p>این تمرین تعاملی نیاز به پیاده‌سازی خاص دارد.</p>
            </div>
        `;
    }
    submitInteractiveAnswer(section) {
        const activityType = section.activity_type || 'default';
        let userAnswer = '';
        if (activityType === 'question_conversion' ||
            activityType === 'passive_voice_conversion' ||
            activityType === 'error_correction' ||
            activityType === 'sentence_transformation') {
            userAnswer = document.getElementById('interactive-answer')?.value.trim() ||
                        document.getElementById('passive-answer')?.value.trim() ||
                        document.getElementById('error-answer')?.value.trim() ||
                        document.getElementById('transformation-answer')?.value.trim();
        } else if (activityType === 'collocation_identification') {
            const selected = document.querySelector('input[name="collocation-option"]:checked');
            userAnswer = selected ? selected.value : '';
        }
        let isCorrect = false;
        let correctAnswer = '';
        if (section.solutions && section.solutions.length > 0) {
            correctAnswer = section.solutions[0];
            isCorrect = this.isAnswerCorrect(userAnswer, correctAnswer);
        }
        const feedback = document.createElement('div');
        feedback.className = `interactive-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
        feedback.innerHTML = `
            <h5>${isCorrect ? '✅ پاسخ صحیح' : '❌ پاسخ نادرست'}</h5>
            <p>${isCorrect ? 'پاسخ شما صحیح است!' : 'پاسخ صحیح: ' + correctAnswer}</p>
            <p>${this.extractText(section.explanation)}</p>
        `;
        const container = document.querySelector('.interactive-container');
        if (container) {
            const existingFeedback = container.querySelector('.interactive-feedback');
            if (existingFeedback) {
                existingFeedback.remove();
            }
            container.appendChild(feedback);
            document.querySelector('.btn-submit-interactive').disabled = true;
        }
    }
    // متد کمکی برای بررسی صحت پاسخ (اگر قبلاً وجود ندارد)
    isAnswerCorrect(userAnswer, correctAnswer) {
        if (!userAnswer || !correctAnswer) return false;
        return userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    }
    // ✅ اصلاح جدید: اطمینان از نمایش تمام سوالات آزمون
    renderQuestion() {
        if (this.currentQIndex >= this.quizQuestions.length) {
            this.endQuiz();
            return;
        }
        const question = this.quizQuestions[this.currentQIndex];
        const quizContent = document.getElementById('quizContent');
        if (!quizContent) return;
        const questionText = this.extractText(question.q || question.question || '');
        const questionType = question.type || 'multiple_choice';
        // ایجاد کانتینر سوال
        const questionContainer = document.createElement('div');
        questionContainer.className = 'quiz-question-container';
        questionContainer.dataset.questionId = question.id || this.currentQIndex;
        // رندر پیشرفت سوال
        const progressHTML = `
            <div class="quiz-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(this.currentQIndex / this.quizQuestions.length) * 100}%"></div>
                </div>
                <span>سوال ${this.currentQIndex + 1} از ${this.quizQuestions.length}</span>
            </div>
        `;
        // رندر سربرگ سوال
        const headerHTML = `
            <div class="question-header">
                <h3>${questionText}</h3>
                ${this.audioManager && questionText ? `
                    <button class="play-tts-btn" data-audio-text="${questionText.replace(/"/g, '&quot;')}">🔊</button>
                ` : ''}
            </div>
        `;
        // رندر بدنه سوال
        const bodyHTML = `
            <div class="question-body">
                ${this.renderQuestionBody(question)}
            </div>
        `;
        // رندر اقدامات سوال
        const actionsHTML = `
            <div class="question-actions">
                <button class="btn-skip-question">رد کردن</button>
                <button class="btn-submit-answer">ارسال پاسخ</button>
                <button class="btn-next-question" style="display: none;">سوال بعدی</button>
            </div>
        `;
        // ترکیب تمام بخش‌ها
        questionContainer.innerHTML = `
            ${progressHTML}
            ${headerHTML}
            ${bodyHTML}
            ${actionsHTML}
        `;
        quizContent.innerHTML = '';
        quizContent.appendChild(questionContainer);
    }
    // ==================== بخش آزمون پیشرفته (Optimized) ====================
    startQuiz() {
        this.currentQIndex = 0;
        this.score = 0;
        this.totalPoints = 0;
        this.userAnswers = [];
        this.startTime = new Date();
        this.showQuizModal();
        this.renderQuestion();
        if (this.data.quiz?.time_limit_seconds) {
            this.startTimer(this.data.quiz.time_limit_seconds);
        }
    }
    showQuizModal() {
        const modal = document.getElementById('grammarQuizModal');
        const modalBody = document.getElementById('quizModalBody');
        modal.style.display = 'block';
        modalBody.innerHTML = `
            <div class="quiz-header">
                <h2>${this.data.quiz?.title || 'آزمون گرامر'}</h2>
                ${this.data.quiz?.time_limit_seconds ? `
                    <div id="quizTimer" class="quiz-timer">
                        ⏰ <span id="timeRemaining">${this.formatTime(this.data.quiz.time_limit_seconds)}</span>
                    </div>
                ` : ''}
            </div>
            <div id="quizContent"></div>
        `;
    }
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    startTimer(seconds) {
        let timeLeft = seconds;
        const timeDisplay = document.getElementById('timeRemaining');
        if (!timeDisplay) return;
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            timeLeft--;
            timeDisplay.textContent = this.formatTime(timeLeft);
            const timerElement = document.getElementById('quizTimer');
            if (timeLeft <= 60) timerElement?.classList.add('danger');
            else if (timeLeft <= 180) timerElement?.classList.add('warning');
            if (timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.endQuiz();
            }
        }, 1000);
    }
    renderQuestionBody(question) {
        switch(question.type) {
            case 'multiple_choice': return this.renderMultipleChoice(question);
            case 'fill_blank': return this.renderFillBlank(question);
            case 'true_false': return this.renderTrueFalse(question);
            case 'matching': return this.renderMatching(question);
            case 'error_correction': return this.renderErrorCorrection(question);
            case 'sentence_transformation': return this.renderSentenceTransformation(question);
            case 'multiple_select': return this.renderMultipleSelect(question);
            case 'contextual_example': return this.renderContextualExample(question);
            default: return this.renderMultipleChoice(question);
        }
    }
    renderMultipleChoice(question) {
        const options = question.options || [];
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        return `
            <div class="multiple-choice-options">
                ${options.map((opt, i) => `
                    <label class="option-label">
                        <input type="radio" name="quiz_answer" value="${i}">
                        <span class="option-letter">${letters[i]}</span>
                        <span class="option-text">${this.extractText(opt)}</span>
                    </label>
                `).join('')}
            </div>`;
    }
    renderFillBlank(question) {
        return `
            <div class="fill-blank-container">
                <div class="blank-question">${this.extractText(question.question)}</div>
                <input type="text" class="blank-input" placeholder="پاسخ را بنویسید...">
            </div>`;
    }
    renderTrueFalse(question) {
        return `
            <div class="true-false-options">
                <label class="option-label">
                    <input type="radio" name="quiz_answer" value="true">
                    <span class="option-text">صحیح</span>
                </label>
                <label class="option-label">
                    <input type="radio" name="quiz_answer" value="false">
                    <span class="option-text">غلط</span>
                </label>
            </div>`;
    }
    renderMatching(question) {
        return `
            <div class="matching-container">
                <div class="matching-header">
                    <p>${question.instruction || 'نیمه اول جملات را به نیمه دوم منطبق کنید:'}</p>
                </div>
                <div class="matching-rows">
                    ${question.pairs.map((pair, index) => `
                        <div class="matching-row">
                            <div class="matching-item">${this.extractText(pair[0])}</div>
                            <select class="matching-select">
                                ${question.pairs.map((_, i) => `
                                    <option value="${i}">${this.extractText(question.pairs[i][1])}</option>
                                `).join('')}
                            </select>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }
    renderErrorCorrection(question) {
        return `
            <div class="error-correction-container">
                <div class="error-sentence">${this.extractText(question.sentence)}</div>
                <div class="error-input">
                    <input type="text" class="error-input-field" placeholder="جمله اصلاح شده">
                </div>
            </div>`;
    }
    renderSentenceTransformation(question) {
        return `
            <div class="transformation-container">
                <div class="transformation-instruction">${this.extractText(question.instruction)}</div>
                <div class="transformation-base">${this.extractText(question.base_sentence)}</div>
                <div class="transformation-input">
                    <input type="text" class="transformation-input-field" placeholder="جمله تبدیل شده">
                </div>
            </div>`;
    }
    renderMultipleSelect(question) {
        const options = question.options || [];
        return `
            <div class="multiple-select-options">
                ${options.map((opt, i) => `
                    <label class="option-label">
                        <input type="checkbox" name="quiz_answer" value="${i}">
                        <span class="option-text">${this.extractText(opt)}</span>
                    </label>
                `).join('')}
            </div>`;
    }
    renderContextualExample(question) {
        return `
            <div class="contextual-example-container">
                <div class="example-instruction">${this.extractText(question.instruction)}</div>
                <div class="example-input">
                    <input type="text" class="example-input-field" placeholder="جمله کامل">
                </div>
            </div>`;
    }
    // ✅ مدیریت رویدادهای آزمون (Delegation)
    handleQuizAction(e) {
        const target = e.target;
        // ارسال پاسخ
        if (target.closest('.btn-submit-answer')) {
            this.submitAnswer();
            return;
        }
        // سوال بعدی
        if (target.closest('.btn-next-question') || target.closest('.btn-continue-quiz')) {
            this.nextQuestion();
            return;
        }
        // رد کردن
        if (target.closest('.btn-skip-question')) {
            this.nextQuestion();
            return;
        }
    }
    submitAnswer() {
        const question = this.quizQuestions[this.currentQIndex];
        let userAnswer = null;
        let isCorrect = false;
        // دریافت پاسخ کاربر
        const selected = document.querySelector('input[name="quiz_answer"]:checked');
        const inputField = document.querySelector('.blank-input, .error-input-field, .transformation-input-field, .example-input-field');
        if (selected) {
            userAnswer = selected.value;
        } else if (inputField) {
            userAnswer = inputField.value.trim();
        }
        // بررسی صحت پاسخ
        if (question.type === 'multiple_choice') {
            isCorrect = parseInt(userAnswer) === question.correct_index;
        } else if (question.type === 'true_false') {
            isCorrect = userAnswer === (question.correct_answer ? 'true' : 'false');
        } else if (question.type === 'fill_blank') {
            isCorrect = this.isAnswerCorrect(userAnswer, question.correct_answer);
        } else if (question.type === 'matching') {
            const selectedValues = Array.from(document.querySelectorAll('.matching-select'))
                .map(select => parseInt(select.value));
            isCorrect = JSON.stringify(selectedValues) === JSON.stringify(question.pairs.map((_, i) => i));
        } else if (question.type === 'error_correction') {
            isCorrect = this.isAnswerCorrect(userAnswer, question.corrected_sentence);
        } else if (question.type === 'sentence_transformation') {
            isCorrect = this.isAnswerCorrect(userAnswer, question.correct_answer);
        } else if (question.type === 'multiple_select') {
            const selectedIndices = Array.from(document.querySelectorAll('input[name="quiz_answer"]:checked'))
                .map(cb => parseInt(cb.value));
            isCorrect = JSON.stringify(selectedIndices.sort((a, b) => a - b)) ===
                       JSON.stringify(question.correct_indices.sort((a, b) => a - b));
        } else if (question.type === 'contextual_example') {
            isCorrect = this.isAnswerCorrect(userAnswer, question.correct_answer);
        }
        // ذخیره نتیجه
        this.userAnswers.push({
            questionId: question.id,
            userAnswer,
            isCorrect,
            points: isCorrect ? (question.points || 10) : 0
        });
        if (isCorrect) {
            this.score++;
            this.totalPoints += (question.points || 10);
        }
        // نمایش بازخورد
        this.showFeedback(question, isCorrect);
    }
    showFeedback(question, isCorrect) {
        const quizContent = document.getElementById('quizContent');
        if (!quizContent) return;
        const feedbackHTML = `
            <div class="question-feedback ${isCorrect ? 'correct' : 'incorrect'}">
                <div class="feedback-header">
                    <h3>${isCorrect ? '✅ پاسخ صحیح' : '❌ پاسخ نادرست'}</h3>
                    <div class="feedback-points">+${isCorrect ? (question.points || 10) : '0'} امتیاز</div>
                </div>
                <div class="feedback-explanation">
                    <p>${this.extractText(question.explanation)}</p>
                    ${!isCorrect && question.correct_answer !== undefined ? `
                        <div class="feedback-correct">
                            <strong>پاسخ صحیح:</strong> ${question.options ? question.options[question.correct_index] : question.correct_answer}
                        </div>
                    ` : ''}
                </div>
                <div class="feedback-actions">
                    <button class="btn-continue-quiz">ادامه به سوال بعدی</button>
                    ${question.type === 'multiple_choice' ? `
                        <button class="btn-review-question">بررسی سوال</button>
                    ` : ''}
                </div>
            </div>
        `;
        quizContent.innerHTML = feedbackHTML;
        // اضافه کردن رویداد برای دکمه‌ها
        document.querySelector('.btn-continue-quiz').addEventListener('click', () => this.nextQuestion());
        document.querySelector('.btn-review-question')?.addEventListener('click', () => this.reviewQuestion(question));
    }
   reviewQuestion(question) {
    const quizContent = document.getElementById('quizContent');
    if (!quizContent) return;
    const reviewHTML = `
        <div class="question-review">
            <div class="review-header">
                <h3>بررسی سوال</h3>
                <button class="btn-close-review">بستن</button>
            </div>
            <div class="review-content">
                <div class="review-question">${this.extractText(question.q || question.question)}</div>
                <div class="review-explanation">
                    <h4>تحلیل:</h4>
                    <p>${this.extractText(question.explanation)}</p>
                </div>
                <div class="review-correct">
                    <h4>پاسخ صحیح:</h4>
                    <p>${question.options ? question.options[question.correct_index] : question.correct_answer}</p>
                </div>
            </div>
        </div>
    `;
    quizContent.innerHTML = reviewHTML;
    document.querySelector('.btn-close-review').addEventListener('click', () => {
        this.renderQuestion();
    });
}
nextQuestion() {
    this.currentQIndex++;
    if (this.currentQIndex >= this.quizQuestions.length) {
        this.endQuiz();
    } else {
        this.renderQuestion();
    }
}
endQuiz() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    const modalBody = document.getElementById('quizModalBody');
    if (!modalBody) return;
    const percentage = Math.round((this.score / this.quizQuestions.length) * 100);
    const category = this.getResultsCategory(percentage);
    modalBody.innerHTML = `
        <div class="quiz-results">
            <div class="results-header">
                <h2>نتایج آزمون</h2>
                <div class="results-score">
                    <div class="score-circle">${percentage}%</div>
                    <div class="score-details">
                        <span>${this.score} از ${this.quizQuestions.length} سوال</span>
                        <span>${this.totalPoints} از ${this.data.quiz?.total_points || this.quizQuestions.length * 10} امتیاز</span>
                    </div>
                </div>
            </div>
            <div class="results-category">
                <h3>${category.title}</h3>
                <p>${category.message}</p>
            </div>
            <div class="results-actions">
                <button id="btnRestartQuiz" class="btn-restart">🔄 آزمون مجدد</button>
                <button id="btnViewDetails" class="btn-details">مشاهده جزئیات</button>
                <button id="btnCloseFinal" class="btn-close">بستن</button>
            </div>
            <div class="results-summary" id="results-summary" style="display: none;">
                <h3>جزئیات آزمون</h3>
                <div class="summary-table">
                    ${this.userAnswers.map((ans, i) => `
                        <div class="summary-row ${ans.isCorrect ? 'correct' : 'incorrect'}">
                            <span class="summary-question">سوال ${i + 1}</span>
                            <span class="summary-result">${ans.isCorrect ? '✅ صحیح' : '❌ غلط'}</span>
                            <span class="summary-points">${ans.isCorrect ? '+' + (this.quizQuestions[i].points || 10) : '0'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    // اضافه کردن رویدادها
    document.getElementById('btnViewDetails').addEventListener('click', () => {
        document.getElementById('results-summary').style.display = 'block';
        document.getElementById('btnViewDetails').style.display = 'none';
    });
    document.getElementById('btnRestartQuiz').addEventListener('click', () => {
        this.closeModal();
        setTimeout(() => this.startQuiz(), 300);
    });
    document.getElementById('btnCloseFinal').addEventListener('click', () => {
        this.closeModal();
    });
}
getResultsCategory(score) {
    for (const category of this.resultsCategories) {
        const [min, max] = category.range.split('-').map(Number);
        if (score >= min && score <= max) {
            return category;
        }
    }
    return this.resultsCategories[this.resultsCategories.length - 1];
}
restartQuiz() {
    this.closeModal();
    setTimeout(() => this.startQuiz(), 300);
}
closeModal() {
    const modal = document.getElementById('grammarQuizModal');
    if (modal) modal.style.display = 'none';
    if (this.timerInterval) clearInterval(this.timerInterval);
}
// ✅ متد جدید: رندر کامل بخش گرامر
render() {
    if (!this.data) return '<div class="error-message">داده‌های گرامر بارگذاری نشده است</div>';
    const hasQuiz = this.quizQuestions.length > 0;
    const titleText = this.extractText(this.data.title) || 'گرامر';
    return `
        <div class="grammar-container">
            <div class="grammar-header">
                <div class="grammar-title-row">
                    <h3>${titleText}</h3>
                    ${this.audioManager ? `
                        <div class="accent-switcher">
                            <button class="accent-btn ${this.currentAccent === 'us' ? 'active' : ''}" data-accent="us">🇺🇸 US</button>
                            <button class="accent-btn ${this.currentAccent === 'uk' ? 'active' : ''}" data-accent="uk">🇬🇧 UK</button>
                        </div>
                    ` : ''}
                </div>
            </div>
            ${this.data.topics && this.data.topics.length > 0 ? `
                <div class="grammar-tabs-container">
                    <div class="grammar-tabs">${this.renderTabs()}</div>
                </div>
                <div id="grammar-dynamic-content" class="grammar-content">
                    ${this.renderSections()}
                </div>
            ` : '<div class="no-content">محتوایی وجود ندارد</div>'}
            ${hasQuiz ? `
                <div class="quiz-section">
                    <button class="btn-quiz-start">🎮 شروع آزمون گرامر (${this.quizQuestions.length} سوال)</button>
                </div>
            ` : ''}
            <div id="grammarQuizModal" class="modal" style="display:none;">
                <div class="modal-content">
                    <span class="modal-close">&times;</span>
                    <div id="quizModalBody"></div>
                </div>
            </div>
        </div>
    `;
}
// ✅ متد جدید: اطمینان از وجود متد render
ensureRenderMethod() {
    if (typeof this.render !== 'function') {
        console.error('❌ Grammar class is missing render method!');
        // ایجاد متد render به صورت پیش‌فرض
        this.render = function() {
            return '<div class="error-message">متد render در کلاس Grammar وجود ندارد</div>';
        };
    }
}
}
// اطمینان از وجود متد render
window.Grammar = Grammar;