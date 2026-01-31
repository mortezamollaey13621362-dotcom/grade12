// js/app.js - نسخه نهایی و صحیح
import { LessonManager } from './modules/LessonManager.js';
import { Vocabulary } from './modules/Vocabulary.js';
import { Grammar } from './modules/Grammar.js';
import { Conversation } from './modules/Conversation.js';
import { Speaking } from './modules/Speaking.js';
import { Listening } from './modules/Listening.js';
import { ReviewManager } from './modules/review/ReviewManager.js';
import { Quiz } from './modules/Quiz.js';
import { Games } from './modules/Games.js';
import { Flashcards } from './modules/Flashcards.js';
import { AudioManager } from './modules/AudioManager.js';
import { ProgressManager } from './modules/ProgressManager.js';
import { SectionRenderer } from './modules/SectionRenderer.js';
import { UI } from './utils/UI.js';

const SECTIONS_CONFIG = [
    { id: 'vocab', name: 'واژگان', icon: 'fas fa-book' },
    { id: 'grammar', name: 'گرامر', icon: 'fas fa-code' },
    { id: 'conversation', name: 'مکالمه', icon: 'fas fa-comments' },
    { id: 'speaking', name: 'گفتار', icon: 'fas fa-microphone' },
    { id: 'listening', name: 'شنیدار', icon: 'fas fa-headphones' },
    { id: 'review', name: 'مرور', icon: 'fas fa-redo' },
    { id: 'quiz', name: 'آزمون', icon: 'fas fa-clipboard-list' },
    { id: 'games', name: 'بازی‌ها', icon: 'fas fa-gamepad' },
    { id: 'flashcard', name: 'فلش‌کارت', icon: 'fas fa-clone' }
];

export class English7App {
    constructor() {
        console.time('AppInitialization');
        this.lessonManager = new LessonManager(this);
        this.audioManager = new AudioManager();
        this.progressManager = new ProgressManager(this.lessonManager);
        
        // ماژول‌ها (بدون ایجاد Grammar در کنسترکتور)
        this.vocabulary = new Vocabulary(this.lessonManager);
        // ✅ اصلاح: حذف خط اشتباه (این خط حذف شد)
        // this.grammar = new Grammar(this.audioManager);
        this.conversation = new Conversation();
        this.listening = new Listening();
        this.reviewManager = null;
        this.quiz = new Quiz(this.lessonManager);
        this.games = new Games();
        this.speaking = new Speaking(this);
        this.flashcards = new Flashcards(this.lessonManager, this.audioManager);
        this.sectionRenderer = new SectionRenderer(this);
        
        this.state = {
            currentSection: 'vocab',
            isLessonActive: false,
            isReviewMode: false
        };
        this.sectionHandlers = {};
        this.dom = {};
        this.staticTemplates = {};
        this.scrollToTopBtn = null;
        window.app = this;
        window.conversationModule = this.conversation;
        console.log('🎯 English7App instanced successfully.');
        this.setupReviewEventDelegation();
    }

    async init() {
        try {
            await this.waitForDOM();
            this.cacheDOM();
            await Promise.all([
                this.lessonManager.loadConfig(),
            ]);
            this.lessonManager.loadUserData();
            this.registerSectionHandlers();
            this.initNavigation();
            this.setupEventListeners();
            this.renderHomePage();
            UI.showSuccess('برنامه آماده است!');
            console.timeEnd('AppInitialization');
        } catch (error) {
            console.error('❌ Critical Error during initialization:', error);
            UI.showError('خطا در بارگذاری برنامه. لطفاً صفحه را رفرش کنید.');
        }
    }

    waitForDOM() {
        return new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    cacheDOM() {
        this.dom = {
            homePage: document.getElementById('home-page'),
            lessonPage: document.getElementById('lesson-page'),
            lessonTitle: document.getElementById('lesson-title'),
            lessonSubtitle: document.getElementById('lesson-subtitle'),
            lessonsContainer: document.getElementById('lessons-container'),
            sectionContainer: document.getElementById('section-container'),
            navButtons: document.querySelectorAll('.nav-btn'),
            backButton: document.querySelector('.btn-back'),
            reviewSection: document.getElementById('review-section')
        };
        console.log('🔍 DOM elements cached:', {
            sectionContainer: !!this.dom.sectionContainer,
            reviewSection: !!this.dom.reviewSection
        });
        
        if (!this.dom.reviewSection && this.dom.lessonPage) {
            console.log('🛠️ Creating review-section dynamically');
            this.dom.reviewSection = document.createElement('div');
            this.dom.reviewSection.id = 'review-section';
            this.dom.reviewSection.className = 'review-section';
            this.dom.reviewSection.style.display = 'none';
            this.dom.lessonPage.appendChild(this.dom.reviewSection);
        }
        
        const quizModule = document.getElementById('quiz-module');
        if (quizModule) {
            this.staticTemplates.quiz = quizModule.outerHTML;
            quizModule.remove();
        }
    }

    setupReviewEventDelegation() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#startReviewBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.startReview();
                return;
            }
            if (e.target.closest('#showAnswerBtn')) {
                e.preventDefault();
                e.stopPropagation();
                if (this.reviewManager && typeof this.reviewManager.handleShowAnswer === 'function') {
                    this.reviewManager.handleShowAnswer();
                }
                return;
            }
            if (e.target.closest('.quality-btn')) {
                const qualityBtn = e.target.closest('.quality-btn');
                const quality = parseInt(qualityBtn.dataset.quality);
                e.preventDefault();
                e.stopPropagation();
                if (this.reviewManager && typeof this.reviewManager.handleQualitySelection === 'function') {
                    this.reviewManager.handleQualitySelection(quality);
                }
                return;
            }
            if (e.target.closest('#continueReviewBtn')) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            if (e.target.closest('#backToDashboardBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.switchSection('review');
                return;
            }
        });
    }

    registerSectionHandlers() {
        console.log('📝 Registering section handlers...');
        this.sectionHandlers = {
            vocab: {
                module: this.vocabulary,
                dataKey: 'vocabulary',
                requiresInit: true
            },
            grammar: {
                module: this.grammar,
                dataKey: 'grammar',
                requiresInit: true
            },
            speaking: {
                module: this.speaking,
                dataKey: 'speaking',
                requiresInit: true
            },
            games: {
                module: this.games,
                dataKey: 'games',
                requiresInit: true
            },
            flashcard: {
                module: this.flashcards,
                dataKey: 'flashcards',
                requiresInit: true
            }
        };
        console.log('✅ Registered handlers:', Object.keys(this.sectionHandlers));
    }

    initNavigation() {
        this.createScrollToTopButton();
        this.setupScrollEvents();
    }

    createScrollToTopButton() {
        const existingBtn = document.getElementById('scroll-to-top');
        if (existingBtn) existingBtn.remove();
        this.scrollToTopBtn = document.createElement('button');
        this.scrollToTopBtn.id = 'scroll-to-top';
        this.scrollToTopBtn.className = 'scroll-to-top-btn';
        this.scrollToTopBtn.innerHTML = `
            <i class="fas fa-chevron-up"></i>
            <span class="btn-text">بالا</span>
        `;
        this.scrollToTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
        document.body.appendChild(this.scrollToTopBtn);
    }

    setupScrollEvents() {
        let isScrolling = false;
        const handleScroll = () => {
            if (!isScrolling) {
                window.requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY;
                    if (this.scrollToTopBtn) {
                        this.scrollToTopBtn.classList.toggle('visible', currentScrollY > 300);
                    }
                    isScrolling = false;
                });
                isScrolling = true;
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
    }

    setupEventListeners() {
        this.dom.navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                if(section) this.switchSection(section);
            });
        });
        this.dom.backButton?.addEventListener('click', () => this.goToHome());
    }

    renderHomePage() {
        if (!this.dom.homePage) return;
        this._cleanupModals();
        this.dom.homePage.classList.add('active');
        this.dom.lessonPage?.classList.remove('active');
        this.state.isLessonActive = false;
        const lessons = this.lessonManager.getAllLessons();
        if (!lessons || lessons.length === 0) {
            if(this.dom.lessonsContainer) this.dom.lessonsContainer.innerHTML = '<div class="no-lessons">هیچ درسی یافت نشد</div>';
            return;
        }
        const html = lessons.map(lesson => {
            const progress = this.progressManager.getLessonProgress(lesson.id);
            return `
                <div class="lesson-card">
                    <div class="lesson-icon">${lesson.icon}</div>
                    <h3>درس ${lesson.id}: ${lesson.title}</h3>
                    <p class="subtitle">${lesson.subtitle}</p>
                    <div class="lesson-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-text">${progress}% تکمیل</span>
                    </div>
                    <button class="btn-gradient start-lesson-btn" data-lesson-id="${lesson.id}">
                        <i class="fas fa-play-circle"></i>
                        ${progress > 0 ? 'ادامه' : 'شروع یادگیری'}
                    </button>
                </div>
            `;
        }).join('');
        if (this.dom.lessonsContainer) {
            this.dom.lessonsContainer.innerHTML = html;
            this.dom.lessonsContainer.onclick = (e) => {
                const btn = e.target.closest('.start-lesson-btn');
                if (btn) {
                    this.openLesson(btn.dataset.lessonId);
                }
            };
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async openLesson(lessonId) {
        const lesson = this.lessonManager.setCurrentLesson(lessonId);
        if (!lesson) {
            UI.showError('درس یافت نشد');
            return;
        }
        this._cleanupModals();
        this.dom.homePage?.classList.remove('active');
        this.dom.lessonPage?.classList.add('active');
        this.state.isLessonActive = true;
        if (this.dom.lessonTitle) this.dom.lessonTitle.textContent = `درس ${lesson.id}: ${lesson.title}`;
        if (this.dom.lessonSubtitle) this.dom.lessonSubtitle.textContent = lesson.subtitle;
        try {
            UI.showLoading(true);
            this.reviewManager = new ReviewManager(lessonId);
            const reviewInitResult = await this.reviewManager.initialize();
            if (!reviewInitResult.success) {
                console.warn('⚠️ Review initialization failed:', reviewInitResult.error);
            } else {
                console.log('✅ ReviewManager initialized successfully');
            }
            
            // ✅ تغییر اصلی: ایجاد Grammar با lessonId (بدون loadFromVocab اضافی)
            this.grammar = new Grammar({ lessonId: lessonId }); // ✅ این خط کلیدی است
            
            await Promise.all([
                this.lessonManager.loadLessonData(lessonId),
                this.conversation.loadData(lessonId),
                this.listening.loadData(lessonId),
                this.quiz.loadData ? this.quiz.loadData(lessonId) : Promise.resolve()
            ]);
            
            UI.showLoading(false);
        } catch (e) {
            console.warn('Error loading module data for lesson', lessonId, e);
            UI.showLoading(false);
        }
        await this.switchSection('vocab');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        UI.showSuccess(`درس ${lessonId} باز شد`);
    }

    async switchSection(sectionId) {
        if (!sectionId) return;
        console.log(`🔄 Switching to section: ${sectionId}`);
        if (this.state.currentSection === 'speaking' && this.speaking) {
            console.log('🧹 Cleaning up Speaking module...');
            this.speaking.cleanup();
        }
        if (this.state.currentSection === 'conversation' && this.conversation) this.conversation.stopPlayback();
        if (this.state.currentSection === 'listening' && this.listening) this.listening.stopPlayback();
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        this.state.currentSection = sectionId;
        this.dom.navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === sectionId);
        });
        if (!this.dom.sectionContainer && sectionId !== 'review') {
            console.error('❌ sectionContainer not found!');
            return;
        }
        this.hideAllModules();
        try {
            if (sectionId === 'review') {
                await this.handleReviewSection();
            } else {
                await this.handleOtherSections(sectionId);
            }
        } catch (error) {
            console.error(`❌ Failed to render section ${sectionId}:`, error);
            this.showSectionError(sectionId);
        }
    }

    async handleReviewSection() {
        console.log('🎯 Handling Review section with ReviewManager...');
        if (!this.dom.reviewSection || !document.getElementById('review-section')) {
            console.log('🔄 Review section not ready, creating...');
            this.createReviewSection();
            await new Promise(resolve => setTimeout(resolve, 100));
            this.dom.reviewSection = document.getElementById('review-section');
            if (!this.dom.reviewSection) {
                console.error('❌ Failed to create review section!');
                this.showReviewSectionError();
                return;
            }
        }
        if (this.dom.sectionContainer) {
            this.dom.sectionContainer.style.display = 'none';
        }
        this.dom.reviewSection.style.display = 'block';
        if (!this.reviewManager) {
            this.dom.reviewSection.innerHTML = `
                <div class="error-section">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>سیستم مرور آماده نیست</h3>
                    <p>لطفاً ابتدا یک درس را انتخاب کنید</p>
                </div>
            `;
            return;
        }
        if (!this.reviewManager.isReady()) {
            this.dom.reviewSection.innerHTML = `
                <div class="loading-section">
                    <div class="loader"></div>
                    <p>در حال بارگذاری سیستم مرور...</p>
                </div>
            `;
            try {
                await this.reviewManager.initialize();
            } catch (error) {
                console.error('❌ خطا در Initialize کردن ReviewManager:', error);
                this.dom.reviewSection.innerHTML = `
                    <div class="error-section">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>خطا در بارگذاری سیستم مرور</p>
                        <p class="error-details">${error.message}</p>
                    </div>
                `;
                return;
            }
        }
        this.renderReviewDashboard();
        console.log('✅ Review section rendered');
    }

    renderReviewDashboard() {
        if (!this.reviewManager) return;
        const todayStatus = this.reviewManager.getTodayStatus();
        const progress = this.reviewManager.getProgress();
        const sessionStats = this.reviewManager.getSessionStats();
        console.log('📊 Rendering dashboard with updated stats:', {
            dueCount: todayStatus.dueCount,
            reviewedToday: todayStatus.totalReviewed,
            sessionStats: sessionStats
        });
        const accuracy = sessionStats.reviewed > 0 ?
            Math.round((sessionStats.correct / sessionStats.reviewed) * 100) : 0;
        const html = `
            <div class="review-dashboard">
                <div class="dashboard-header">
                    <h2>📚 سیستم مرور لایتنر</h2>
                    <p class="subtitle">تکرار فاصله‌دار هوشمند</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.round(progress.overall)}%"></div>
                        <span>${Math.round(progress.overall)}% پیشرفت کلی</span>
                    </div>
                </div>
                <div class="today-stats">
                    <div class="stat-card">
                        <span class="stat-icon">🎯</span>
                        <div class="stat-info">
                            <div class="stat-value">${todayStatus.dueCount}</div>
                            <div class="stat-label">کارت امروز</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-icon">✅</span>
                        <div class="stat-info">
                            <div class="stat-value">${todayStatus.totalReviewed}</div>
                            <div class="stat-label">مرور شده امروز</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-icon">🏆</span>
                        <div class="stat-info">
                            <div class="stat-value">${progress.mastered}</div>
                            <div class="stat-label">تسلط کامل</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-icon">📊</span>
                        <div class="stat-info">
                            <div class="stat-value">${progress.totalCards}</div>
                            <div class="stat-label">کل کارت‌ها</div>
                        </div>
                    </div>
                </div>
                ${sessionStats.reviewed > 0 ? `
                <div class="session-summary">
                    <h3><i class="fas fa-chart-line"></i> خلاصه جلسه اخیر</h3>
                    <div class="summary-grid">
                        <div class="summary-item correct">
                            <span class="summary-label">✅ پاسخ صحیح:</span>
                            <span class="summary-value">${sessionStats.correct}</span>
                        </div>
                        <div class="summary-item total">
                            <span class="summary-label">📝 کل مرور:</span>
                            <span class="summary-value">${sessionStats.reviewed}</span>
                        </div>
                        <div class="summary-item accuracy">
                            <span class="summary-label">🎯 دقت:</span>
                            <span class="summary-value">${accuracy}%</span>
                        </div>
                        <div class="summary-item points">
                            <span class="summary-label">⭐ امتیاز:</span>
                            <span class="summary-value">${sessionStats.points}</span>
                        </div>
                    </div>
                    <p class="remaining-text">
                        <i class="fas fa-clock"></i>
                        ${todayStatus.remaining} کارت باقی مانده برای امروز
                    </p>
                </div>
                ` : ''}
                <div class="leitner-boxes">
                    <h3>وضعیت باکس‌های لایتنر</h3>
                    <div class="boxes-grid">
                        ${progress.boxes.map(box => `
                            <div class="leitner-box" style="border-color: ${box.color}">
                                <div class="box-header">
                                    <span class="box-icon">${box.icon || '📦'}</span>
                                    <span class="box-name">${box.name}</span>
                                </div>
                                <div class="box-count" style="color: ${box.color}">${box.count} کارت</div>
                                <div class="box-interval">${box.interval}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="review-actions">
                    ${todayStatus.hasCards ? `
                        <button class="btn-gradient btn-start-review" id="startReviewBtn">
                            <i class="fas fa-play-circle"></i>
                            شروع مرور (${todayStatus.dueCount} کارت)
                        </button>
                     `:`
                        <div class="no-review-message">
                            <i class="fas fa-check-circle"></i>
                            <p>${todayStatus.message}</p>
                            ${todayStatus.remaining > 0 ? `<small>${todayStatus.remaining} کارت برای فردا باقی مانده</small>` : ''}
                        </div>
                    `}
                </div>
            </div>
        `;
        if (this.dom.reviewSection) {
            this.dom.reviewSection.innerHTML = html;
        }
        console.log('✅ Dashboard rendered with session summary');
    }

    async startReview() {
        console.log('🚀 Starting review session...');
        if (!this.reviewManager) {
            UI.showError('سیستم مرور آماده نیست');
            return;
        }
        try {
            const firstCard = this.reviewManager.startReviewSession();
            if (!firstCard) {
                UI.showError('کارتی برای مرور وجود ندارد');
                return;
            }
            console.log('✅ Review session started with card:', firstCard.question);
        } catch (error) {
            console.error('❌ خطا در شروع مرور:', error);
            UI.showError('خطا در شروع مرور: ' + error.message);
        }
    }

    showReviewSectionError() {
        if (this.dom.sectionContainer) {
            this.dom.sectionContainer.style.display = 'block';
            this.dom.sectionContainer.innerHTML = `
                <div class="error-section">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>خطا در نمایش بخش مرور</h3>
                    <p>عنصر review-section یافت نشد</p>
                    <div class="debug-info">
                        <p><strong>Debug Info:</strong></p>
                        <p>Lesson Page: ${!!document.getElementById('lesson-page')}</p>
                        <p>Review Section: ${!!document.getElementById('review-section')}</p>
                        <p>Section Container: ${!!this.dom.sectionContainer}</p>
                    </div>
                    <button class="btn-gradient" onclick="app.forceCreateReviewSection()">
                        ایجاد اجباری بخش مرور
                    </button>
                </div>
            `;
        }
    }

    forceCreateReviewSection() {
        console.log('🚀 Force creating review section...');
        const existing = document.getElementById('review-section');
        if (existing) existing.remove();
        this.createReviewSection();
        if (this.state.currentSection === 'review') {
            this.switchSection('review');
        }
    }

    createReviewSection() {
        console.log('🛠️ Creating review-section element...');
        let reviewSection = document.getElementById('review-section');
        if (reviewSection) {
            console.log('✅ Review section already exists, reusing...');
            this.dom.reviewSection = reviewSection;
            return reviewSection;
        }
        const lessonPage = document.getElementById('lesson-page');
        if (!lessonPage) {
            console.error('❌ lessonPage not found! Cannot create review-section');
            setTimeout(() => {
                const lessonPageRetry = document.getElementById('lesson-page');
                if (lessonPageRetry) {
                    this.createReviewSection();
                } else {
                    console.error('❌ lessonPage still not found after retry');
                }
            }, 500);
            return;
        }
        reviewSection = document.createElement('div');
        reviewSection.id = 'review-section';
        reviewSection.className = 'review-section';
        reviewSection.style.display = 'none';
        lessonPage.appendChild(reviewSection);
        console.log('✅ review-section created successfully at:', {
            parent: lessonPage.id,
            child: reviewSection.id,
            position: 'after section-container'
        });
        this.dom.reviewSection = reviewSection;
        return reviewSection;
    }

    debugReviewDashboard() {
        console.log('🔍 Debugging Review Dashboard...');
        const reviewSection = document.getElementById('review-section');
        const startReviewBtn = document.getElementById('startReviewBtn');
        console.log('Review Section:', {
            exists: !!reviewSection,
            id: reviewSection?.id,
            className: reviewSection?.className
        });
        console.log('Start Review Button:', {
            exists: !!startReviewBtn,
            id: startReviewBtn?.id,
            text: startReviewBtn?.textContent
        });
        if (startReviewBtn) {
            console.log('✅ Start review button found!');
        }
    }

    async handleOtherSections(sectionId) {
        console.log(`🎯 Handling ${sectionId} section...`);
        if (this.dom.reviewSection) {
            this.dom.reviewSection.style.display = 'none';
        }
        if (this.dom.sectionContainer) {
            this.dom.sectionContainer.style.display = 'block';
            this.dom.sectionContainer.innerHTML = `
                <div class="loading-section">
                    <div class="loader"></div>
                    <p>در حال بارگذاری ${this.getSectionName(sectionId)}...</p>
                </div>
            `;
        }
        let content = '';
        switch (sectionId) {
            case 'conversation':
                content = this.conversation.getHtml();
                this.dom.sectionContainer.innerHTML = content;
                this.conversation.bindEvents();
                break;
            case 'listening':
                content = this.listening.getHtml();
                this.dom.sectionContainer.innerHTML = content;
                this.listening.bindEvents();
                break;
            case 'quiz':
                content = await this.handleQuizSection();
                this.dom.sectionContainer.innerHTML = content;
                break;
            case 'speaking':
                await this.handleSpeakingSection();
                break;
            case 'grammar':
                if (!this.grammar) {
                    content = `
                        <div class="error-section">
                            <i class="fas fa-exclamation-triangle"></i>
                            <h3>گرامر بارگذاری نشده</h3>
                            <p>لطفاً ابتدا یک درس را انتخاب کنید</p>
                            <button class="btn-gradient" onclick="app.goToHome()">
                                <i class="fas fa-home"></i> بازگشت به خانه
                            </button>
                        </div>
                    `;
                    this.dom.sectionContainer.innerHTML = content;
                    break;
                }
                try {
                    console.log('📖 Rendering Grammar section...');
                    if (!this.grammar.data) {
                        const lessonId = this.lessonManager.currentLesson?.id || '1';
                        console.log('🔄 Loading grammar data for lesson:', lessonId);
                        await this.grammar.loadFromVocab(lessonId);
                    }
                    content = this.grammar.render();
                    if (content) {
                        this.dom.sectionContainer.innerHTML = content;
                        setTimeout(() => {
                            if (this.grammar.setupTabs) {
                                this.grammar.setupTabs();
                            }
                            if (this.grammar.initEventListeners) {
                                this.grammar.initEventListeners();
                            }
                            console.log('✅ Grammar rendered and initialized successfully');
                        }, 100);
                    } else {
                        throw new Error('گرامر محتوایی برای نمایش ندارد');
                    }
                } catch (error) {
                    console.error('❌ Grammar render failed:', error);
                    content = `
                        <div class="error-section">
                            <i class="fas fa-exclamation-circle"></i>
                            <h3>خطا در نمایش گرامر</h3>
                            <p>${error.message}</p>
                            <p><small>درس: ${this.lessonManager.currentLesson?.id || 'نامشخص'}</small></p>
                            <button class="btn-gradient" onclick="app.switchSection('grammar')">
                                <i class="fas fa-redo"></i> تلاش مجدد
                            </button>
                        </div>
                    `;
                    this.dom.sectionContainer.innerHTML = content;
                }
                break;
            case 'vocab':
                try {
                    console.log('📦 Loading vocabulary section...');
                    const lessonId = this.lessonManager.currentLesson?.id || '1';
                    console.log('Current lesson ID from object:', lessonId);
                    let vocabData = null;
                    if (this.lessonManager.currentLessonData) {
                        vocabData = this.lessonManager.currentLessonData.vocabulary ||
                                   this.lessonManager.currentLessonData.vocab;
                    }
                    if (!vocabData) {
                        try {
                            console.log(`📥 Loading vocab.json for lesson ${lessonId}...`);
                            const response = await fetch(`data/lesson${lessonId}/vocab.json`);
                            if (response.ok) {
                                vocabData = await response.json();
                                console.log('✅ Loaded from file:', vocabData.length, 'words');
                            }
                        } catch (error) {
                            console.error('❌ Failed to load vocab file:', error);
                        }
                    }
                    if (!vocabData && this.sectionRenderer) {
                        console.log('Trying via sectionRenderer...');
                        try {
                            const sectionData = await this.sectionRenderer.loadSectionData('vocab', lessonId);
                            vocabData = sectionData?.vocabulary || sectionData?.vocab || sectionData;
                        } catch (error) {
                            console.error('SectionRenderer failed:', error);
                        }
                    }
                    if (this.vocabulary && vocabData) {
                        this.vocabulary.init(vocabData);
                        console.log('✅ Vocabulary initialized with', vocabData.length, 'words');
                        content = this.vocabulary.render();
                        this.dom.sectionContainer.innerHTML = content;
                        setTimeout(() => {
                            if (this.vocabulary.afterRender) {
                                this.vocabulary.afterRender();
                            }
                            console.log('✅ Vocabulary ready');
                            setTimeout(() => {
                                const input = document.getElementById('vocab-search-input');
                                const cards = document.querySelectorAll('.vocab-card');
                                console.log(`🔍 Search input: ${!!input}, Cards: ${cards.length}`);
                            }, 200);
                        }, 100);
                    } else {
                        throw new Error(`Vocabulary data not found for lesson ${lessonId}`);
                    }
                } catch (error) {
                    console.error('❌ Error in vocabulary section:', error);
                    content = `
                        <div class="error-section">
                            <i class="fas fa-exclamation-triangle"></i>
                            <h3>خطا در بارگذاری واژگان</h3>
                            <p>${error.message}</p>
                            <p><small>Lesson: ${this.lessonManager.currentLesson?.id || 'unknown'}</small></p>
                            <button class="btn-gradient" onclick="app.switchSection('vocab')">
                                <i class="fas fa-redo"></i> تلاش مجدد
                            </button>
                        </div>
                    `;
                    this.dom.sectionContainer.innerHTML = content;
                }
                break;
            default:
                content = await this.sectionRenderer.renderSection(sectionId);
                content = this._sanitizeLegacyContent(content);
                this.dom.sectionContainer.innerHTML = content;
                break;
        }
        console.log(`✅ ${sectionId} section rendered`);
    }

    async handleQuizSection() {
        if (typeof this.quiz.getHtml === 'function') {
            const content = this.quiz.getHtml();
            setTimeout(() => {
                if (this.quiz && typeof this.quiz.init === 'function') {
                    const lessonId = this.lessonManager.currentLessonId || '1';
                    this.quiz.init(lessonId);
                }
            }, 100);
            return content;
        } else if (this.staticTemplates.quiz) {
            return this.staticTemplates.quiz;
        }
        return '<div class="error-section">آزمون در دسترس نیست</div>';
    }

    async handleSpeakingSection() {
        console.log('🎤 Loading Speaking section...');
        if (!this.dom.sectionContainer) {
            console.error('❌ sectionContainer not found!');
            return;
        }
        try {
            this.dom.sectionContainer.innerHTML = '';
            this.dom.sectionContainer.style.display = 'block';
            let speakingContainer = document.getElementById('speaking-container');
            if (!speakingContainer) {
                console.log('🔧 Creating speaking-container...');
                speakingContainer = document.createElement('div');
                speakingContainer.id = 'speaking-container';
                speakingContainer.className = 'speaking-wrapper';
                this.dom.sectionContainer.appendChild(speakingContainer);
            } else {
                speakingContainer.innerHTML = '';
            }
            if (this.speaking && typeof this.speaking.init === 'function') {
                console.log('⏳ Awaiting speaking.init()...');
                await this.speaking.init(this.lessonManager.currentLessonData);
                console.log('✅ speaking.init() completed');
            }
            if (this.speaking && typeof this.speaking.render === 'function') {
                console.log('🎨 Calling speaking.render()...');
                this.speaking.render(speakingContainer);
                console.log('✅ Speaking section rendered successfully');
            } else {
                throw new Error('Speaking module or render method not available');
            }
        } catch (error) {
            console.error('❌ Error loading Speaking section:', error);
            this.dom.sectionContainer.innerHTML = `
                <div class="error-section">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>خطا در بارگذاری بخش گفتار</h3>
                    <p class="error-message">${error.message}</p>
                    <button class="btn-gradient" onclick="app.switchSection('speaking')">
                        <i class="fas fa-redo"></i> تلاش مجدد
                    </button>
                </div>
            `;
        }
    }

    showSectionError(sectionId) {
        if (this.dom.sectionContainer) {
            this.dom.sectionContainer.innerHTML = `
                <div class="error-section">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>خطا در بارگذاری بخش ${this.getSectionName(sectionId)}.</p>
                    <button class="btn-gradient" onclick="app.switchSection('${sectionId}')">
                        تلاش مجدد
                    </button>
                </div>
            `;
        }
    }

    hideAllModules() {
        if (this.dom.sectionContainer) {
            this.dom.sectionContainer.style.display = 'none';
        }
        const reviewSection = this.dom.reviewSection || document.getElementById('review-section');
        if (reviewSection) {
            reviewSection.style.display = 'none';
        }
        const moduleContents = document.querySelectorAll('.module-content');
        moduleContents.forEach(module => {
            module.style.display = 'none';
        });
        const defaultMessage = document.getElementById('default-message');
        if (defaultMessage) {
            defaultMessage.style.display = 'none';
        }
    }

    _sanitizeLegacyContent(htmlContent) {
        if (!htmlContent) return '';
        if (typeof htmlContent !== 'string') return htmlContent;
        let cleanHtml = htmlContent.replace(/<center>[\s\S]*?<\/center>/gi, '');
        cleanHtml = cleanHtml.replace(/<div[^>]*class=["']nav-links["'][^>]*>[\s\S]*?<\/div>/gi, '');
        cleanHtml = cleanHtml.replace(/^\s*(<a\s+href=["']#[^"']*["'][^>]*>.*?<\/a>\s*\|?\s*)+/gim, '');
        return cleanHtml;
    }

    getSectionName(sectionId) {
        const section = SECTIONS_CONFIG.find(s => s.id === sectionId);
        return section ? section.name : sectionId;
    }

    goToHome() {
        console.log('Navigating to Home');
        if (this.speaking) {
            this.speaking.cleanup();
        }
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (this.conversation) this.conversation.stopPlayback();
        if (this.listening) this.listening.stopPlayback();
        this._cleanupModals();
        this.renderHomePage();
    }

    _cleanupModals() {
        document.querySelectorAll('.word-modal').forEach(modal => modal.remove());
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    }

    resetProgress() {
        if(confirm('آیا مطمئن هستید که می‌خواهید پیشرفت را بازنشانی کنید؟')) {
            this.progressManager.resetAll();
            UI.showSuccess('پیشرفت بازنشانی شد');
            this.renderHomePage();
        }
    }

    exitReviewMode() {
        if (this.dom.reviewSection) {
            this.dom.reviewSection.style.display = 'none';
        }
        if (this.dom.sectionContainer) {
            this.dom.sectionContainer.style.display = 'block';
        }
        this.state.isReviewMode = false;
    }

    async playWordAudio(word, accent = 'us') {
        if (!this.audioManager) {
            console.error('❌ AudioManager بارگذاری نشده است!');
            this.showNotification('⚠️ سیستم صوتی آماده نیست', 'warning');
            return;
        }
        if (!word || typeof word !== 'string') {
            console.warn('⚠️ کلمه نامعتبر است:', word);
            return;
        }
        try {
            console.log(`🔊 Playing audio: "${word}" (${accent})`);
            await this.audioManager.playWord(word.trim(), accent);
        } catch (error) {
            console.error('❌ خطای پخش صوت:', error);
            this.showNotification(
                `⚠️ خطا در پخش تلفظ "${word}"`,
                'warning'
            );
        }
    }

    showNotification(message, type = 'info') {
        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#F44336'
        };
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        const notification = document.createElement('div');
        notification.className = 'app-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 100000;
            animation: slideInRight 0.3s ease;
            font-family: 'Vazirmatn', sans-serif;
            direction: rtl;
            min-width: 250px;
            max-width: 400px;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        notification.innerHTML = `
            <span style="font-size: 1.2em;">${icons[type] || icons.info}</span>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    showMainMenu() {
        console.log('🏠 showMainMenu called - navigating to home');
        this.goToHome();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting English7App...');
    console.log('🔍 Initial HTML check:');
    console.log('- lesson-page exists:', !!document.getElementById('lesson-page'));
    console.log('- review-section exists:', !!document.getElementById('review-section'));
    const app = new English7App();
    app.init();
});