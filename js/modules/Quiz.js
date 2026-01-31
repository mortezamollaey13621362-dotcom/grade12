// js/modules/Quiz.js - نسخه‌ی اصلاح‌شده با پشتیبانی از دسته‌بندی‌های مختلف
import { QuizHistoryManager } from './QuizHistoryManager.js';
import { ProgressManager } from './ProgressManager.js';
import { QuizGenerator } from './QuizGenerator.js';

class Quiz {
    constructor(lessonManager = null) {
        this.lessonManager = lessonManager;
        this.container = null;
        
        // وضعیت کلی
        this.teacherPin = '3192';
        this.currentView = 'landing';
        this.currentMode = 'standard';
        this.currentCategories = [];
        this.questionCount = 10;
        
        // داده‌های آزمون جاری
        this.activeQuestions = [];
        this.studentAnswers = {};
        this.currentQuizId = null;
        this.currentQuizStartIndex = 0;
        this.currentExamForPrint = null;
        this.currentAnswerKeyForPrint = null;
        this.lastGeneratedConfig = null;
        
        // مدیریت کاربران/تاریخچه/پیشرفت
        this.currentUser = this.getCurrentUser();
        this.historyManager = new QuizHistoryManager(this.currentUser);
        this.generator = new QuizGenerator();
        this.progressManager = new ProgressManager(lessonManager);
        
        // بایند متدها
        this.renderLanding = this.renderLanding.bind(this);
        this.handleTeacherLogin = this.handleTeacherLogin.bind(this);
        this.selectStudentMode = this.selectStudentMode.bind(this);
        this.renderCustomQuizBuilder = this.renderCustomQuizBuilder.bind(this);
        this.startStudentQuiz = this.startStudentQuiz.bind(this);
        this.renderStudentQuestion = this.renderStudentQuestion.bind(this);
        this.finishStudentQuiz = this.finishStudentQuiz.bind(this);
        this.viewQuizResult = this.viewQuizResult.bind(this);
        this.showDetailedAnswers = this.showDetailedAnswers.bind(this);
        this.resumeQuiz = this.resumeQuiz.bind(this);
        this.renderStudentHistory = this.renderStudentHistory.bind(this);
        this.showExitDialog = this.showExitDialog.bind(this);
    }

    /* -------------------------------------------------------------------------- */
    /*                                بارگذاری داده                              */
    /* -------------------------------------------------------------------------- */
    getCurrentUser() {
        let userId = localStorage.getItem('english7_user_id');
        if (!userId) {
            userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            localStorage.setItem('english7_user_id', userId);
        }
        return userId;
    }

    /**
     * ✅ تغییر کلیدی: بارگذاری تمام سوالات از quiz.json
     * - استفاده از فیلد category برای فیلتر کردن
     * - حذف تبدیل داده‌ها (همه سوالات به صورت اصلی بارگذاری می‌شوند)
     */
    async loadData(lessonId = 1) {
        const lessonPath = `./data/lesson${lessonId}/quiz.json`;
        
        try {
            const response = await fetch(lessonPath, { cache: 'no-store' });
            if (!response.ok) throw new Error('فایل quiz.json یافت نشد');
            
            const data = await response.json();
            
            // بارگذاری تمام سوالات (بدون فیلتر)
            this.generator.loadQuestionBank(data.questions || []);
            console.log(`✅ داده‌های درس ${lessonId} با موفقیت بارگذاری شد (${data.questions?.length || 0} سوال)`);
            return data;
        } catch (error) {
            console.error('❌ خطا در بارگذاری quiz.json:', error.message);
            throw error;
        }
    }

    init(lessonId = 1) {
        this.loadData(lessonId).then(() => {
            setTimeout(() => this.bindEvents(), 100);
        });
        return this;
    }

    bindEvents() {
        this.container = document.getElementById('quiz-module-root');
        if (!this.container) {
            setTimeout(() => this.bindEvents(), 100);
            return;
        }
        this.renderLanding();
    }

    getHtml() {
        return `<div id="quiz-module-root" class="quiz-wrapper"></div>`;
    }

    formatMixedText(text = '') {
        if (!text.includes('(')) return text;
        const parts = text.split('(');
        const englishPart = parts[0];
        const persianPart = '(' + parts.slice(1).join('(');
        return `${englishPart}<br><span class="fa-translation" dir="rtl">${persianPart}</span>`;
    }

    /* -------------------------------------------------------------------------- */
    /*                                صفحه اصلی                                  */
    /* -------------------------------------------------------------------------- */
    renderLanding() {
        this.currentView = 'landing';
        const incompleteQuiz = this.historyManager.getIncompleteQuiz();
        
        const notificationHtml = incompleteQuiz
            ? `
            <div class="incomplete-notification animate-pop-in">
                <div class="notif-icon">⚠️</div>
                <div class="notif-content">
                    <h4>آزمون ناتمام شما</h4>
                    <p>${this.getModeNameByType(incompleteQuiz.mode)} (${incompleteQuiz.currentIndex}/${incompleteQuiz.totalQuestions})</p>
                </div>
                <div class="notif-actions">
                    <button id="btn-resume-quiz" class="btn-notif primary">ادامه</button>
                    <button id="btn-discard-quiz" class="btn-notif secondary">حذف</button>
                </div>
            </div>`
            : '';

        this.container.innerHTML = `
            <div class="quiz-landing animate-fade-in">
                ${notificationHtml}
                <div class="quiz-card student-card">
                    <div class="icon-wrapper"><i class="fas fa-user-graduate"></i></div>
                    <h3>ورود دانش‌آموز</h3>
                    <p>انتخاب آزمون و مشاهده تاریخچه</p>
                    <button id="btn-student-entry" class="btn-primary">شروع آزمون جدید</button>
                    <button id="btn-custom-quiz" class="btn-outline" style="margin-top:10px;">
                        <i class="fas fa-sliders-h"></i> ساخت آزمون سفارشی
                    </button>
                    <button id="btn-student-history" class="btn-outline" style="margin-top:10px;">
                        <i class="fas fa-history"></i> تاریخچه آزمون‌ها
                    </button>
                </div>
                <div class="quiz-division-line"></div>
                <div class="quiz-card teacher-card">
                    <div class="icon-wrapper"><i class="fas fa-chalkboard-teacher"></i></div>
                    <h3>پنل دبیر</h3>
                    <p>ساخت و مدیریت آزمون‌ها</p>
                    <button id="btn-teacher-login" class="btn-outline">ورود به پنل</button>
                </div>
            </div>
        `;

        this.container.querySelector('#btn-student-entry')?.addEventListener('click', this.selectStudentMode);
        this.container.querySelector('#btn-custom-quiz')?.addEventListener('click', () => this.renderCustomQuizBuilder(false));
        this.container.querySelector('#btn-student-history')?.addEventListener('click', this.renderStudentHistory);
        this.container.querySelector('#btn-teacher-login')?.addEventListener('click', this.handleTeacherLogin);

        if (incompleteQuiz) {
            this.container.querySelector('#btn-resume-quiz')?.addEventListener('click', () => this.resumeQuiz(incompleteQuiz));
            this.container.querySelector('#btn-discard-quiz')?.addEventListener('click', () => {
                if (confirm('آیا مطمئن هستید؟')) {
                    this.historyManager.deleteQuiz(incompleteQuiz.id);
                    this.renderLanding();
                }
            });
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                 پنل دبیر                                   */
    /* -------------------------------------------------------------------------- */
    handleTeacherLogin() {
        const input = prompt('لطفاً کد امنیتی دبیر را وارد کنید:');
        if (input === this.teacherPin) this.renderTeacherPanel();
        else alert('رمز عبور اشتباه است!');
    }

    renderTeacherPanel() {
        this.currentView = 'teacher-panel';
        const teacherHistory = this.historyManager.getTeacherHistory();
        
        const customExamsHtml = teacherHistory?.length
            ? `
            <div class="teacher-section">
                <h3><i class="fas fa-history"></i> آزمون‌های ذخیره شده</h3>
                <div class="teacher-history-list" id="teacher-history-list-container">
                    ${teacherHistory
                        .map(
                            (exam) => `
                        <div class="teacher-history-item animate-slide-up">
                            <div class="history-item-header">
                                <div>
                                    <h4>${exam.config?.title || 'آزمون سفارشی'}</h4>
                                    <small class="en-num">${exam.timestamp}</small>
                                    <small>${exam.config?.categories?.join('، ') || 'همه موضوعات'}</small>
                                </div>
                                <span class="question-count-badge">${exam.questionCount} سوال</span>
                            </div>
                            <div class="history-item-actions">
                                <button class="btn-hist-action primary" data-action="start-online" data-id="${exam.id}">
                                    <i class="fas fa-play"></i> شروع
                                </button>
                                <button class="btn-hist-action" data-action="view-q" data-id="${exam.id}">
                                    <i class="fas fa-file-alt"></i> سوال
                                </button>
                                <button class="btn-hist-action" data-action="view-a" data-id="${exam.id}">
                                    <i class="fas fa-key"></i> پاسخ
                                </button>
                                <button class="btn-hist-action" data-action="both" data-id="${exam.id}">
                                    <i class="fas fa-download"></i> دانلود
                                </button>
                                <button class="btn-hist-action danger" data-action="delete" data-id="${exam.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>`
                        )
                        .join('')}
                </div>
            </div>`
            : `<div class="teacher-section empty-state"><p>هنوز آزمونی ذخیره نکرده‌اید.</p></div>`;

        this.container.innerHTML = `
            <div class="teacher-dashboard animate-fade-in">
                <div class="dashboard-header">
                    <h2>میز کار دبیر</h2>
                    <button id="btn-back-home" class="btn-small">خروج</button>
                </div>
                ${customExamsHtml}
                <div class="teacher-section">
                    <h3><i class="fas fa-plus-circle"></i> تولید آزمون جدید</h3>
                    <div class="teacher-controls">
                        <div class="control-group">
                            <label><i class="fas fa-sliders-h"></i> آزمون کاملاً سفارشی</label>
                            <p class="control-hint">انتخاب موضوعات و تعداد سؤال دلخواه</p>
                            <button class="btn-gen new-custom-exam">
                                <i class="fas fa-cogs"></i> ساخت آزمون سفارشی
                            </button>
                        </div>
                        <div class="control-group">
                            <label><i class="fas fa-bolt"></i> کوییز (۵ سؤال)</label>
                            <div class="btn-row">
                                <button class="btn-gen new-exam" data-mode="quiz" data-type="exam">آزمون</button>
                                <button class="btn-gen secondary new-exam" data-mode="quiz" data-type="key">پاسخنامه</button>
                            </div>
                        </div>
                        <div class="control-group">
                            <label><i class="fas fa-file-alt"></i> آزمون (۱۰ سؤال)</label>
                            <div class="btn-row">
                                <button class="btn-gen new-exam" data-mode="standard" data-type="exam">آزمون</button>
                                <button class="btn-gen secondary new-exam" data-mode="standard" data-type="key">پاسخنامه</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container.querySelector('#btn-back-home')?.addEventListener('click', this.renderLanding);
        this.container.querySelector('.new-custom-exam')?.addEventListener('click', () => this.renderCustomQuizBuilder(true));
        
        this.container.querySelectorAll('.new-exam').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const { mode, type } = e.currentTarget.dataset;
                this.generateBalancedQuiz(mode, true);
                if (type === 'exam') {
                    this.printMode(this.currentExamForPrint, false, () => this.renderTeacherPanel());
                } else {
                    this.printMode(this.currentAnswerKeyForPrint, true, () => this.renderTeacherPanel());
                }
            });
        });

        const historyList = this.container.querySelector('#teacher-history-list-container');
        if (historyList) {
            historyList.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-hist-action');
                if (!btn) return;
                const { action, id } = btn.dataset;
                const exam = teacherHistory.find((ex) => ex.id === id);
                if (!exam) return;

                if (action === 'start-online') {
                    this.activeQuestions = exam.questions;
                    this.currentMode = exam.mode;
                    this.studentAnswers = {};
                    this.startStudentQuiz('teacher');
                } else if (action === 'view-q') {
                    this.printMode(exam.examHtml, false, () => this.renderTeacherPanel());
                } else if (action === 'view-a') {
                    this.printMode(exam.keyHtml, true, () => this.renderTeacherPanel());
                } else if (action === 'both') {
                    this.printModeBoth(exam.examHtml, exam.keyHtml);
                } else if (action === 'delete' && confirm('آیا مطمئن هستید؟')) {
                    this.historyManager.deleteTeacherExam(id);
                    this.renderTeacherPanel();
                }
            });
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                 تولید آزمون                               */
    /* -------------------------------------------------------------------------- */
    generateBalancedQuiz(mode, isTeacher = false) {
        this.currentMode = mode;
        const countMap = { quiz: 5, standard: 10, full: this.generator.getTotalQuestions() };
        const targetCount = countMap[mode] || 10;
        
        // انتخاب دسته‌بندی‌ها (در اینجا فقط Vocabulary است)
        const categories = this.currentCategories.length > 0 ? this.currentCategories : this.generator.getAvailableCategories();
        
        this.activeQuestions = this.generator.generateQuiz({
            categories: categories,
            count: targetCount,
            randomize: true
        });

        this.preparePrintVersions();

        if (isTeacher) {
            const examData = {
                id: this.historyManager.generateExamId(),
                timestamp: this.historyManager.getCurrentTimestamp(),
                mode,
                config: { 
                    title: this.getModeNameByType(mode),
                    categories: categories
                },
                questionCount: this.activeQuestions.length,
                examHtml: this.currentExamForPrint,
                keyHtml: this.currentAnswerKeyForPrint,
                questions: this.activeQuestions
            };
            this.historyManager.saveTeacherExam(examData);
            this.lastGeneratedConfig = examData;
        }
        return this.activeQuestions;
    }

    generateCustomQuiz(isTeacher = false) {
        // اگر کاربر هیچ دسته‌بندی را انتخاب نکرد، تمام دسته‌ها را انتخاب کن
        if (!this.currentCategories.length) {
            this.currentCategories = this.generator.getAvailableCategories();
        }

        this.activeQuestions = this.generator.generateQuiz({
            categories: this.currentCategories,
            count: this.questionCount,
            randomize: true
        });

        if (!this.activeQuestions.length) {
            alert('⚠️ سوالی با معیارهای انتخابی یافت نشد.');
            return;
        }

        this.currentMode = 'custom';
        this.currentQuizId = null;
        this.studentAnswers = {};
        
        const config = {
            title: 'آزمون سفارشی',
            categories: [...this.currentCategories],
            questionCount: this.questionCount,
            generatedAt: new Date().toISOString()
        };

        this.preparePrintVersions(config.title);

        if (isTeacher) {
            const examData = {
                id: this.historyManager.generateExamId(),
                timestamp: this.historyManager.getCurrentTimestamp(),
                mode: 'custom',
                config,
                questionCount: this.activeQuestions.length,
                examHtml: this.currentExamForPrint,
                keyHtml: this.currentAnswerKeyForPrint,
                questions: this.activeQuestions
            };
            this.historyManager.saveTeacherExam(examData);
            this.printModeBoth(this.currentExamForPrint, this.currentAnswerKeyForPrint);
        } else {
            this.showStudentQuizOptions();
        }
    }

    preparePrintVersions(customTitle = null) {
        let title = customTitle;
        if (!title) {
            const titles = {
                quiz: 'کوییز کلاسی (کوتاه)',
                standard: 'آزمون استاندارد',
                full: 'آزمون جامع',
                custom: 'آزمون سفارشی'
            };
            title = titles[this.currentMode] || 'آزمون';
        }
        this.currentExamForPrint = this.generateExamPaperHtml(title, false);
        this.currentAnswerKeyForPrint = this.generateExamPaperHtml(title, true);
    }

    /* -------------------------------------------------------------------------- */
    /*                             چاپ و دانلود آزمون                            */
    /* -------------------------------------------------------------------------- */
    printModeBoth(examHtml, keyHtml) {
        this.printMode(examHtml, false, () => {
            setTimeout(() => this.printMode(keyHtml, true), 1000);
        });
    }

    printMode(htmlContent, isKey = false, onClose = null) {
        const existingLayer = document.getElementById('print-layer-container');
        if (existingLayer) existingLayer.remove();

        const printLayer = document.createElement('div');
        printLayer.id = 'print-layer-container';
        printLayer.innerHTML = `
            <div class="printable-paper">
                ${htmlContent}
            </div>
            <div class="print-controls-overlay">
                <button id="btn-close-print" class="btn-big-close">
                    <i class="fas fa-times"></i> بستن
                </button>
                <button id="btn-do-print" class="btn-big-print">
                    <i class="fas fa-print"></i> چاپ / ذخیره PDF
                </button>
            </div>
        `;
        document.body.appendChild(printLayer);
        document.body.classList.add('printing-mode');

        const closePrint = () => {
            if (!confirm('آیا می‌خواهید از حالت چاپ خارج شوید؟')) return;
            printLayer.remove();
            document.body.classList.remove('printing-mode');
            if (onClose) onClose();
            else if (this.currentView === 'teacher-panel') this.renderTeacherPanel();
        };

        document.getElementById('btn-do-print')?.addEventListener('click', () => window.print());
        document.getElementById('btn-close-print')?.addEventListener('click', closePrint);
    }

    generateExamPaperHtml(title, withAnswers) {
        const date = new Date().toLocaleDateString('fa-IR');
        return `
            <div class="paper-header">
                <div class="header-right">
                    <h1>${title} - زبان انگلیسی</h1>
                    <p>نام و نام خانوادگی: .............................</p>
                </div>
                <div class="header-left">
                    <p>تاریخ: ${date}</p>
                    <p>تعداد سوالات: ${this.activeQuestions.length}</p>
                    ${withAnswers ? '<span class="key-badge">پاسخنامه تشریحی</span>' : ''}
                </div>
            </div>
            <div class="paper-body">
                ${this.activeQuestions
                    .map(
                        (q, idx) => `
                    <div class="paper-question">
                        <div class="q-row">
                            <span class="q-num en-num">${idx + 1}.</span>
                            <div class="q-content">
                                ${this.formatMixedText(q.question)}
                                <span class="q-cat">[${q.category}]</span>
                            </div>
                        </div>
                        ${this.renderPaperOptions(q, withAnswers)}
                        ${
                            withAnswers
                                ? `
                            <div class="answer-key-box">
                                <div class="ltr-content">
                                    <strong>Answer:</strong> <span class="correct-val">${this.formatCorrectAnswer(q)}</span><br>
                                    <em>${q.explanation}</em>
                                </div>
                                <div class="fa-explanation-box">
                                    <strong>توضیح:</strong> ${q.explanationFa}
                                </div>
                            </div>`
                                : ''
                        }
                    </div>`
                    )
                    .join('')}
            </div>
            <div class="paper-footer">Generated by English7App</div>
        `;
    }

    renderPaperOptions(q, withAnswers) {
        if (q.type === 'multiple-choice' || q.type === 'true-false') {
            return `
                <div class="paper-options ltr-content">
                    ${q.options
                        .map(
                            (opt, i) => `
                        <div class="paper-opt-item ${withAnswers && i === q.correct ? 'highlight-correct' : ''}">
                            <span class="circle en-num">${String.fromCharCode(65 + i)}</span> ${opt}
                        </div>`
                        )
                        .join('')}
                </div>
            `;
        }
        return `<div class="paper-lines">.......................................................................................</div>`;
    }

    formatCorrectAnswer(q) {
        if (q.type === 'multiple-choice' || q.type === 'true-false') return q.options[q.correct];
        return q.correct;
    }

    /* -------------------------------------------------------------------------- */
    /*                           جریان دانش‌آموز / آنلاین                        */
    /* -------------------------------------------------------------------------- */
    selectStudentMode() {
        this.currentView = 'student-mode-select';
        
        const renderActions = (mode) => `
            <div class="mode-actions">
                <button class="btn-mode-action btn-start-online" data-action="start" data-mode="${mode}">
                    <i class="fas fa-play"></i> شروع آنلاین
                </button>
                <button class="btn-mode-action btn-dl-pdf" data-action="pdf-q" data-mode="${mode}">
                    <i class="fas fa-file-pdf"></i> دانلود سوال
                </button>
                <button class="btn-mode-action btn-dl-pdf" data-action="pdf-a" data-mode="${mode}">
                    <i class="fas fa-key"></i> کلید پاسخ
                </button>
            </div>
        `;

        this.container.innerHTML = `
            <div class="mode-select-container animate-slide-up">
                <h2>نوع آزمون را انتخاب کنید:</h2>
                <div class="mode-buttons">
                    <div class="mode-card" data-mode="quiz">
                        <i class="fas fa-stopwatch"></i>
                        <span>کوییز کلاسی</span>
                        <small>۵ سوال سریع</small>
                        ${renderActions('quiz')}
                    </div>
                    <div class="mode-card featured" data-mode="standard">
                        <i class="fas fa-clipboard-list"></i>
                        <span>آزمون ۱۰ سوالی</span>
                        <small>متوازن و استاندارد</small>
                        ${renderActions('standard')}
                    </div>
                    <div class="mode-card" data-mode="custom">
                        <i class="fas fa-sliders-h"></i>
                        <span>آزمون سفارشی</span>
                        <small>انتخاب موضوع و تعداد</small>
                        ${renderActions('custom')}
                    </div>
                </div>
                <button id="btn-back-landing" class="btn-text">
                    <i class="fas fa-arrow-right"></i> بازگشت
                </button>
            </div>
        `;

        this.container.querySelectorAll('.btn-mode-action').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const { mode, action } = e.currentTarget.dataset;
                if (mode === 'custom') {
                    this.renderCustomQuizBuilder(false);
                    return;
                }
                this.generateBalancedQuiz(mode, false);
                if (action === 'start') this.startStudentQuiz(mode);
                else if (action === 'pdf-q') this.printMode(this.currentExamForPrint, false, () => this.selectStudentMode());
                else if (action === 'pdf-a' && confirm('آیا مطمئن هستید؟')) {
                    this.printMode(this.currentAnswerKeyForPrint, true, () => this.selectStudentMode());
                }
            });
        });

        this.container.querySelector('#btn-back-landing')?.addEventListener('click', this.renderLanding);
    }

    renderCustomQuizBuilder(isTeacher = false) {
        this.currentView = 'custom-builder';
        // دریافت دسته‌بندی‌های موجود از داده‌ها
        const availableCategories = this.generator.getAvailableCategories();
        const categoryStats = this.generator.getCategoryStats();
        
        const categoryHtml = availableCategories
            .map((cat) => {
                const count = categoryStats[cat] || 0;
                const checked = this.currentCategories.includes(cat) ? 'checked' : '';
                return `
                <div class="category-checkbox">
                    <input type="checkbox" id="cat-${cat}" value="${cat}" ${checked}>
                    <label for="cat-${cat}" class="category-label">
                        <div class="category-info">
                            <span class="category-icon">${this.getCategoryIcon(cat)}</span>
                            <span class="category-name">${this.getCategoryName(cat)}</span>
                            <span class="category-count">${count}</span>
                        </div>
                        <span class="check-icon">✓</span>
                    </label>
                </div>
            `;
            })
            .join('');

        this.container.innerHTML = `
            <div class="custom-quiz-builder animate-fade-in">
                <div class="builder-header">
                    <h2><i class="fas fa-sliders-h"></i> ساخت آزمون سفارشی</h2>
                </div>
                <div class="category-selection">
                    <div class="category-grid">${categoryHtml}</div>
                </div>
                <div class="quantity-selection">
                    <h3>تعداد سوالات: <span id="q-count-display">${this.questionCount}</span></h3>
                    <input type="range" min="5" max="${this.generator.getTotalQuestions()}" value="${this.questionCount}" id="q-range">
                </div>
                <div class="builder-actions">
                    <button class="btn-builder btn-generate" id="btn-generate-quiz">تولید آزمون</button>
                    <button class="btn-builder btn-exit" id="btn-exit-builder">بازگشت</button>
                </div>
            </div>
        `;

        this.setupBuilderEvents(isTeacher);
    }

    setupBuilderEvents(isTeacher) {
        const updateCount = (val) => {
            this.questionCount = parseInt(val, 10);
            document.getElementById('q-count-display').textContent = this.questionCount;
            document.getElementById('q-range').value = this.questionCount;
        };

        this.container.querySelectorAll('.category-checkbox input').forEach((cb) => {
            cb.addEventListener('change', (e) => {
                const cat = e.target.value;
                if (e.target.checked) {
                    if (!this.currentCategories.includes(cat)) this.currentCategories.push(cat);
                } else {
                    this.currentCategories = this.currentCategories.filter((c) => c !== cat);
                }
            });
        });

        const range = this.container.querySelector('#q-range');
        range?.addEventListener('input', (e) => updateCount(e.target.value));

        this.container.querySelector('#btn-generate-quiz')?.addEventListener('click', () => this.generateCustomQuiz(isTeacher));
        this.container.querySelector('#btn-exit-builder')?.addEventListener('click', () => {
            if (isTeacher) this.renderTeacherPanel();
            else this.renderLanding();
        });
    }

    showStudentQuizOptions() {
        this.currentView = 'student-quiz-options';
        this.container.innerHTML = `
            <div class="quiz-options-modal animate-fade-in">
                <div class="options-header">
                    <h2><i class="fas fa-graduation-cap"></i> آزمون شما آماده است!</h2>
                    <p>لطفاً یکی از روش‌های زیر را انتخاب کنید:</p>
                </div>
                <div class="options-grid">
                    <div class="option-card online-card">
                        <div class="option-icon"><i class="fas fa-laptop"></i></div>
                        <h3>آزمون آنلاین</h3>
                        <button id="btn-start-online" class="btn-option-primary">شروع آزمون آنلاین</button>
                    </div>
                    <div class="option-card pdf-card">
                        <div class="option-icon"><i class="fas fa-file-pdf"></i></div>
                        <h3>دانلود PDF</h3>
                        <button id="btn-download-questions" class="btn-option-secondary">دانلود سوالات</button>
                        <button id="btn-download-answer-key" class="btn-option-secondary">دانلود پاسخنامه</button>
                    </div>
                </div>
                <div class="options-footer">
                    <button id="btn-back-to-mode" class="btn-text">بازگشت</button>
                </div>
            </div>
        `;

        document.getElementById('btn-start-online')?.addEventListener('click', () => this.startStudentQuiz());
        document.getElementById('btn-download-questions')?.addEventListener('click', () =>
            this.printMode(this.currentExamForPrint, false, () => this.showStudentQuizOptions())
        );
        document.getElementById('btn-download-answer-key')?.addEventListener('click', () => {
            if (confirm('آیا مطمئن هستید؟')) {
                this.printMode(this.currentAnswerKeyForPrint, true, () => this.showStudentQuizOptions());
            }
        });
        document.getElementById('btn-back-to-mode')?.addEventListener('click', () => this.selectStudentMode());
    }

    startStudentQuiz(mode = 'custom') {
        this.studentAnswers = {};
        this.currentQuizId = this.historyManager.generateQuizId();
        this.currentQuizStartIndex = 0;
        this.currentMode = mode;
        this.renderStudentQuestion(0);
    }

    renderStudentQuestion(index) {
        if (index >= this.activeQuestions.length) {
            this.finishStudentQuiz();
            return;
        }

        const q = this.activeQuestions[index];
        const isLast = index === this.activeQuestions.length - 1;

        const mcTemplate = `
            <div class="options-grid ltr-content">
                ${q.options.map((opt, i) => `<button class="btn-option" data-idx="${i}">${opt}</button>`).join('')}
            </div>
        `;

        const textTemplate = `
            <div class="text-answer-wrapper">
                <input type="text" class="input-text-answer" placeholder="Answer here...">
                <button class="btn-submit-text">ثبت</button>
            </div>
        `;

        const inputHtml = q.type === 'multiple-choice' || q.type === 'true-false' ? mcTemplate : textTemplate;

        this.container.innerHTML = `
            <div class="student-quiz-ui animate-slide-up">
                <div class="quiz-header">
                    <span class="quiz-progress">سوال ${index + 1} از ${this.activeQuestions.length}</span>
                    <button id="btn-quiz-exit" class="btn-text" style="color:red">خروج</button>
                </div>
                <div class="question-card">
                    <span class="q-category">${q.category}</span>
                    <h3>${this.formatMixedText(q.question)}</h3>
                    <div id="answer-area">${inputHtml}</div>
                    <div id="feedback-box" class="feedback-box hidden"></div>
                </div>
                <div class="quiz-footer">
                    <button id="btn-next-q" class="btn-next hidden">${isLast ? 'پایان' : 'بعدی'}</button>
                </div>
            </div>
        `;

        document.getElementById('btn-quiz-exit')?.addEventListener('click', () => this.showExitDialog(index));

        const handleAnswer = (ans) => {
            this.studentAnswers[q.id] = ans;
            const isCorrect =
                q.type === 'multiple-choice' || q.type === 'true-false'
                    ? ans === q.correct
                    : String(ans).trim().toLowerCase() === String(q.correct).trim().toLowerCase();

            this.container.querySelectorAll('.btn-option, .btn-submit-text, input').forEach((el) => (el.disabled = true));

            const fb = document.getElementById('feedback-box');
            fb.innerHTML = `
                <div class="${isCorrect ? 'fb-success' : 'fb-error'}">
                    ${isCorrect ? '✅ صحیح' : '❌ غلط'}<br>
                    <small>${q.explanationFa}</small>
                </div>`;
            fb.classList.remove('hidden');

            document.getElementById('btn-next-q')?.classList.remove('hidden');

            this.historyManager.saveProgress({
                id: this.currentQuizId,
                mode: this.currentMode,
                currentIndex: index + 1,
                totalQuestions: this.activeQuestions.length,
                questions: this.activeQuestions,
                answers: this.studentAnswers,
                isCompleted: false
            });
        };

        if (q.type === 'multiple-choice' || q.type === 'true-false') {
            this.container.querySelectorAll('.btn-option').forEach((btn) => {
                btn.addEventListener('click', (e) => handleAnswer(parseInt(e.currentTarget.dataset.idx, 10)));
            });
        } else {
            this.container.querySelector('.btn-submit-text')?.addEventListener('click', () => {
                const val = this.container.querySelector('.input-text-answer').value;
                if (val.trim()) handleAnswer(val.trim());
            });
        }

        document.getElementById('btn-next-q')?.addEventListener('click', () => this.renderStudentQuestion(index + 1));
    }

    finishStudentQuiz() {
        let score = 0;
        this.activeQuestions.forEach((q) => {
            const ans = this.studentAnswers[q.id];
            const isCorrect =
                q.type === 'multiple-choice' || q.type === 'true-false'
                    ? ans === q.correct
                    : ans && String(ans).trim().toLowerCase() === String(q.correct).trim().toLowerCase();
            if (isCorrect) score += 1;
        });

        this.historyManager.saveProgress({
            id: this.currentQuizId,
            mode: this.currentMode,
            currentIndex: this.activeQuestions.length,
            totalQuestions: this.activeQuestions.length,
            questions: this.activeQuestions,
            answers: this.studentAnswers,
            score,
            isCompleted: true
        });

        this.container.innerHTML = `
            <div class="quiz-result animate-fade-in">
                <h3>پایان آزمون</h3>
                <div class="score-circle"><span>${score}</span> / ${this.activeQuestions.length}</div>
                <button id="btn-retry" class="btn-primary">بازگشت به منو</button>
            </div>
        `;
        document.getElementById('btn-retry')?.addEventListener('click', this.renderLanding);
    }

    showExitDialog() {
        if (confirm('آیا می‌خواهید خارج شوید؟ پیشرفت ذخیره می‌شود.')) this.renderLanding();
    }

    /* -------------------------------------------------------------------------- */
    /*                         تاریخچه و گزارش‌های دانش‌آموز                     */
    /* -------------------------------------------------------------------------- */
    renderStudentHistory() {
        const history = this.historyManager.getHistory();
        if (!history.length) {
            this.container.innerHTML = `
                <div class="empty-state animate-fade-in">
                    <i class="fas fa-inbox empty-icon"></i>
                    <h3>هنوز آزمونی ثبت نشده</h3>
                    <button id="btn-back-landing" class="btn-primary">بازگشت</button>
                </div>
            `;
            document.getElementById('btn-back-landing')?.addEventListener('click', this.renderLanding);
            return;
        }

        const historyItems = history
            .map((quiz) => {
                const statusBadge = quiz.isCompleted
                    ? `<span class="status-badge completed">✅ تکمیل شده</span>`
                    : `<span class="status-badge incomplete">⚠️ ناتمام (${quiz.currentIndex}/${quiz.totalQuestions})</span>`;
                const scoreDisplay = quiz.isCompleted
                    ? `<div class="score-display">${quiz.score} / ${quiz.totalQuestions}</div>`
                    : `<div class="score-display incomplete-score">-</div>`;

                return `
                <div class="history-item animate-slide-up">
                    <div class="history-header">
                        <div>
                            <h4>${this.getModeNameByType(quiz.mode)}</h4>
                            <small>${quiz.timestamp}</small>
                        </div>
                        ${statusBadge}
                    </div>
                    <div class="history-body">
                        ${scoreDisplay}
                        <div class="history-actions-grid">
                            ${
                                quiz.isCompleted
                                    ? `
                                <button class="btn-hist-action" data-action="view" data-id="${quiz.id}">
                                    <i class="fas fa-eye"></i> مشاهده نتایج
                                </button>
                                <button class="btn-hist-action" data-action="pdf-q" data-id="${quiz.id}">
                                    <i class="fas fa-file-pdf"></i> سوال
                                </button>
                                <button class="btn-hist-action" data-action="pdf-a" data-id="${quiz.id}">
                                    <i class="fas fa-key"></i> پاسخنامه
                                </button>`
                                    : `
                                <button class="btn-hist-action primary" data-action="resume" data-id="${quiz.id}">
                                    <i class="fas fa-play"></i> ادامه آزمون
                                </button>
                                <button class="btn-hist-action danger" data-action="delete" data-id="${quiz.id}">
                                    <i class="fas fa-trash"></i> حذف
                                </button>`
                            }
                        </div>
                    </div>
                </div>`;
            })
            .join('');

        this.container.innerHTML = `
            <div class="history-page animate-fade-in">
                <div class="page-header">
                    <h2><i class="fas fa-history"></i> تاریخچه آزمون‌های من</h2>
                    <button id="btn-back-landing" class="btn-text">
                        <i class="fas fa-arrow-right"></i> بازگشت
                    </button>
                </div>
                <div class="history-list" id="student-history-list">
                    ${historyItems}
                </div>
            </div>
        `;

        document.getElementById('btn-back-landing')?.addEventListener('click', this.renderLanding);

        const list = this.container.querySelector('#student-history-list');
        list?.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-hist-action');
            if (!btn) return;
            const { action, id } = btn.dataset;
            const quiz = history.find((q) => q.id === id);
            if (!quiz) return;

            if (action === 'view') this.viewQuizResult(quiz);
            else if (action === 'resume') this.resumeQuiz(quiz);
            else if (action === 'delete' && confirm('آیا مطمئن هستید؟')) {
                this.historyManager.deleteQuiz(id);
                this.renderStudentHistory();
            } else if (action === 'pdf-q') {
                const html = this.generateExamPaperFromHistory(quiz, false);
                this.printMode(html, false);
            } else if (action === 'pdf-a') {
                const html = this.generateExamPaperFromHistory(quiz, true);
                this.printMode(html, true);
            }
        });
    }

    viewQuizResult(quiz) {
        const percent = Math.round((quiz.score / quiz.totalQuestions) * 100);
        let msg = 'تلاش خوبی بود!';
        if (percent === 100) msg = 'فوق‌العاده بود!';
        else if (percent >= 80) msg = 'عالی!';
        else if (percent < 50) msg = 'نیاز به تمرین بیشتر.';

        this.container.innerHTML = `
            <div class="quiz-result animate-fade-in">
                <div class="result-header">
                    <h3>${this.getModeNameByType(quiz.mode)} - ${quiz.timestamp}</h3>
                    <p class="result-msg">${msg}</p>
                </div>
                <div class="score-circle">
                    <span class="score-val en-num">${quiz.score}</span>
                    <span class="score-total en-num">/ ${quiz.totalQuestions}</span>
                </div>
                <div class="result-actions">
                    <button id="btn-view-details" class="btn-primary">مشاهده پاسخ‌های من</button>
                    <button id="btn-print-report" class="btn-outline">دانلود کارنامه (PDF)</button>
                    <button id="btn-back-history" class="btn-text">بازگشت به تاریخچه</button>
                </div>
            </div>
        `;

        document.getElementById('btn-back-history')?.addEventListener('click', () => this.renderStudentHistory());
        document.getElementById('btn-print-report')?.addEventListener('click', () => {
            const reportHtml = this.generateStudentAnalysisHtmlFromHistory(quiz);
            this.printMode(reportHtml, true);
        });
        document.getElementById('btn-view-details')?.addEventListener('click', () => this.showDetailedAnswers(quiz));
    }

    showDetailedAnswers(quiz) {
        const detailsHtml = quiz.questions
            .map((q, idx) => {
                const userAnswer = quiz.answers[q.id];
                let isCorrect = false;
                if (q.type === 'multiple-choice' || q.type === 'true-false') isCorrect = userAnswer === q.correct;
                else if (userAnswer) isCorrect = userAnswer.trim().toLowerCase() === q.correct.trim().toLowerCase();

                return `
                <div class="detail-question ${isCorrect ? 'correct-answer' : 'wrong-answer'}">
                    <div class="detail-header">
                        <span class="q-num en-num">${idx + 1}.</span>
                        <span class="detail-status">${isCorrect ? '✅ صحیح' : '❌ نادرست'}</span>
                    </div>
                    <div class="detail-content">
                        <p class="detail-q-text">${this.formatMixedText(q.question)}</p>
                        <div class="detail-answer-row">
                            <strong>پاسخ شما:</strong>
                            <span class="user-ans">${this.formatUserAnswer(q, userAnswer)}</span>
                        </div>
                        ${
                            isCorrect
                                ? ''
                                : `
                            <div class="detail-answer-row correct-ans-row">
                                <strong>پاسخ صحیح:</strong>
                                <span class="correct-ans">${this.formatCorrectAnswer(q)}</span>
                            </div>`
                        }
                        <div class="detail-explanation">
                            <p class="en-exp ltr-content">${q.explanation}</p>
                            <p class="fa-exp">${q.explanationFa}</p>
                        </div>
                    </div>
                </div>`;
            })
            .join('');

        this.container.innerHTML = `
            <div class="detailed-view animate-fade-in">
                <div class="page-header">
                    <h2>پاسخ‌های جزئی</h2>
                    <button id="btn-back-result" class="btn-text">
                        <i class="fas fa-arrow-right"></i> بازگشت
                    </button>
                </div>
                <div class="details-list">${detailsHtml}</div>
            </div>
        `;

        document.getElementById('btn-back-result')?.addEventListener('click', () => this.viewQuizResult(quiz));
    }

    resumeQuiz(quiz) {
        this.currentQuizId = quiz.id;
        this.currentMode = quiz.mode;
        this.activeQuestions = quiz.questions;
        this.studentAnswers = { ...quiz.answers };
        this.currentQuizStartIndex = quiz.currentIndex;
        this.renderStudentQuestion(quiz.currentIndex);
    }

    generateExamPaperFromHistory(quiz, withAnswers) {
        const date = quiz.timestamp;
        const title = this.getModeNameByType(quiz.mode);
        return `
            <div class="printable-paper">
                <div class="paper-header">
                    <div class="header-right">
                        <h1>${title} - زبان انگلیسی</h1>
                        <p>نام و نام خانوادگی: .............................</p>
                    </div>
                    <div class="header-left">
                        <p>تاریخ: ${date}</p>
                        <p>تعداد سوالات: ${quiz.totalQuestions}</p>
                        ${withAnswers ? '<span class="key-badge">پاسخنامه تشریحی</span>' : ''}
                    </div>
                </div>
                <div class="paper-body">
                    ${quiz.questions
                        .map(
                            (q, idx) => `
                        <div class="paper-question">
                            <div class="q-row">
                                <span class="q-num en-num">${idx + 1}.</span>
                                <div class="q-content">
                                    ${this.formatMixedText(q.question)}
                                    <span class="q-cat">[${q.category}]</span>
                                </div>
                            </div>
                            ${this.renderPaperOptions(q, withAnswers)}
                            ${
                                withAnswers
                                    ? `
                            <div class="answer-key-box">
                                <div class="ltr-content">
                                    <strong>Answer:</strong> <span class="correct-val">${this.formatCorrectAnswer(q)}</span><br>
                                    <em>${q.explanation}</em>
                                </div>
                                <div class="fa-explanation-box">
                                    <strong>توضیح:</strong> ${q.explanationFa}
                                </div>
                            </div>`
                                    : ''
                            }
                        </div>`
                        )
                        .join('')}
                </div>
                <div class="paper-footer">Generated by English7App</div>
            </div>
        `;
    }

    generateStudentAnalysisHtmlFromHistory(quiz) {
        const date = quiz.timestamp;
        return `
            <div class="printable-paper">
                <div class="paper-header">
                    <div class="header-right">
                        <h1>کارنامه تحلیلی دانش‌آموز</h1>
                        <p>نتیجه: ${quiz.score} از ${quiz.totalQuestions}</p>
                    </div>
                    <div class="header-left">
                        <p>تاریخ: ${date}</p>
                        <p>نوع آزمون: ${this.getModeNameByType(quiz.mode)}</p>
                    </div>
                </div>
                <div class="paper-body">
                    ${quiz.questions
                        .map((q, idx) => {
                            const userAnswer = quiz.answers[q.id];
                            const isCorrect =
                                q.type === 'multiple-choice' || q.type === 'true-false'
                                    ? userAnswer === q.correct
                                    : userAnswer &&
                                      userAnswer.trim().toLowerCase() === q.correct.trim().toLowerCase();
                            return `
                        <div class="paper-question">
                            <div class="q-row">
                                <span class="q-num en-num">${idx + 1}.</span>
                                <div class="q-content">${this.formatMixedText(q.question)}</div>
                            </div>
                            <div class="student-analysis">
                                <div class="analysis-row ${isCorrect ? 'correct' : 'wrong'}">
                                    <span class="analysis-label">پاسخ شما:</span>
                                    <span class="analysis-value">${this.formatUserAnswer(q, userAnswer)}</span>
                                    <span class="analysis-icon">${isCorrect ? '✅' : '❌'}</span>
                                </div>
                                ${
                                    isCorrect
                                        ? ''
                                        : `
                                <div class="analysis-row correct">
                                    <span class="analysis-label">پاسخ صحیح:</span>
                                    <span class="analysis-value">${this.formatCorrectAnswer(q)}</span>
                                </div>`
                                }
                                <div class="explanation-box">
                                    <div class="fa-explanation-box">${q.explanationFa}</div>
                                </div>
                            </div>
                        </div>`;
                        })
                        .join('')}
                </div>
            </div>
        `;
    }

    formatUserAnswer(q, ans) {
        if (ans === undefined || ans === '') return '(بدون پاسخ)';
        if (q.type === 'multiple-choice' || q.type === 'true-false') return q.options[ans];
        return ans;
    }

    /* -------------------------------------------------------------------------- */
    /*                              متدهای کمکی عمومی                             */
    /* -------------------------------------------------------------------------- */
    getCategoryIcon(category) {
        const icons = {
            Vocabulary: '📚',
            Grammar: '📝',
            Reading: '📖',
            Conversation: '💬',
            Listening: '🎧'
        };
        return icons[category] || '📌';
    }

    getCategoryName(category) {
        const names = {
            Vocabulary: 'واژگان',
            Grammar: 'گرامر',
            Reading: 'درک مطلب',
            Conversation: 'مکالمه',
            Listening: 'شنیداری'
        };
        return names[category] || category;
    }

    getModeNameFA() {
        const names = {
            quiz: 'کوییز',
            standard: 'آزمون استاندارد',
            full: 'آزمون جامع',
            custom: 'آزمون سفارشی'
        };
        return names[this.currentMode] || this.currentMode;
    }

    getModeNameByType(mode) {
        const names = {
            quiz: 'کوییز کلاسی',
            standard: 'آزمون ۱۰ سوالی',
            full: 'آزمون جامع',
            custom: 'آزمون سفارشی'
        };
        return names[mode] || mode;
    }
}

export { Quiz };
export default Quiz;