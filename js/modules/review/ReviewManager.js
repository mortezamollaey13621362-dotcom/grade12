// js/modules/review/ReviewManager.js
/**
 * مدیر مرور و تکرار
 * مدیریت فرآیند مرور کارت‌ها و ارتباط با UI
 */

import { LeitnerEngine } from './LeitnerEngine.js';

export class ReviewManager {
    constructor(lessonId) {
        console.log('🏗️ ReviewManager constructor called with lessonId:', lessonId);
        this.lessonId = lessonId;
        this.engine = new LeitnerEngine(lessonId);
        this.currentCard = null;
        this.sessionStats = {
            reviewed: 0,
            correct: 0,
            incorrect: 0,
            points: 0,
            startTime: null
        };
        this.isInitialized = false;
        this.sessionComplete = false; // ✅ FIX: اضافه کردن flag برای وضعیت جلسه
    }
    
    /**
     * راه‌اندازی اولیه
     */
    async initialize() {
        console.log('🔄 ReviewManager.initialize() called');
        try {
            const success = await this.engine.initialize();
            console.log('📊 Engine initialized:', success);
            
            if (success) {
                this.isInitialized = true;
                this.sessionComplete = false; // ✅ FIX: ریست کردن وضعیت جلسه
                
                // لاگ وضعیت کارت‌ها بعد از initialize
                const stats = this.engine.getStatistics();
                console.log('📈 Initial stats:', stats);
                
                return { success: true };
            } else {
                console.error('❌ Engine initialization failed');
                return { 
                    success: false, 
                    error: 'خطا در بارگذاری دیتا' 
                };
            }
        } catch (error) {
            console.error('💥 Error in initialize:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }
    
    /**
     * شروع جلسه مرور
     */
    startReviewSession() {
        console.log('🚀 startReviewSession() called');
        console.log('✅ isInitialized:', this.isInitialized);
        
        if (!this.isInitialized) {
            console.error('❌ ReviewManager not initialized!');
            throw new Error('ReviewManager هنوز initialize نشده');
        }
        
        this.sessionStats = {
            reviewed: 0,
            correct: 0,
            incorrect: 0,
            points: 0,
            startTime: new Date()
        };
        this.sessionComplete = false; // ✅ FIX: ریست کردن وضعیت جلسه
        
        console.log('📊 Session stats reset:', this.sessionStats);
        
        const nextCard = this.getNextCard();
        console.log('🎴 First card:', nextCard);
        
        if (nextCard) {
            // نمایش کارت در UI
            this.renderReviewCard(nextCard);
        }
        
        return nextCard;
    }
    
    /**
     * رندر کارت مرور در UI
     */
    renderReviewCard(card) {
        console.log('🎨 renderReviewCard() called with:', card);
        
        const reviewSection = document.getElementById('review-section');
        if (!reviewSection) {
            console.error('❌ review-section not found in DOM!');
            return false;
        }
        
        // HTML کارت مرور
        reviewSection.innerHTML = `
            <div class="review-container active">
                <div class="review-card">
                    <div class="card-header" style="border-color: ${card.boxInfo.color}">
                        <span class="box-badge" style="background: ${card.boxInfo.color}">
                            ${card.boxInfo.name}
                        </span>
                        <span class="card-counter">
                            ${this.sessionStats.reviewed + 1} از ${card.remaining}
                        </span>
                    </div>
                    
                    <div class="card-content">
                        <div class="card-question">
                            <h3><i class="fas fa-question-circle"></i> سوال:</h3>
                            <div class="question-text">
                                ${card.question}
                            </div>
                        </div>
                        
                        <div class="card-actions">
                            <button id="showAnswerBtn" class="btn-show-answer">
                                <i class="fas fa-eye"></i> نمایش پاسخ
                            </button>
                            
                            <div id="answerSection" class="answer-section" style="display: none;">
                                <div class="card-answer">
                                    <h3><i class="fas fa-check-circle"></i> پاسخ:</h3>
                                    <div class="answer-text">
                                        ${card.answer}
                                    </div>
                                </div>
                                
                                <div class="quality-buttons">
                                    <p class="quality-prompt">
                                        <i class="fas fa-brain"></i> چقدر پاسخ را به خاطر آوردید؟
                                    </p>
                                    <div class="quality-grid">
                                        <button class="quality-btn btn-hard" data-quality="0">
                                            <i class="fas fa-times"></i>
                                            <span>به خاطر نیاوردم</span>
                                        </button>
                                        <button class="quality-btn btn-medium" data-quality="3">
                                            <i class="fas fa-check"></i>
                                            <span>با دشواری</span>
                                        </button>
                                        <button class="quality-btn btn-easy" data-quality="5">
                                            <i class="fas fa-star"></i>
                                            <span>به راحتی</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        console.log('✅ Review card rendered successfully!');
        
        // اضافه کردن event listener برای دکمه نمایش پاسخ
        setTimeout(() => {
            const showAnswerBtn = document.getElementById('showAnswerBtn');
            if (showAnswerBtn) {
                showAnswerBtn.addEventListener('click', () => this.handleShowAnswer());
            }
            
            // اضافه کردن event listener برای دکمه‌های کیفیت
            const qualityBtns = document.querySelectorAll('.quality-btn');
            qualityBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const quality = parseInt(e.target.closest('.quality-btn').dataset.quality);
                    this.handleQualitySelection(quality);
                });
            });
        }, 100);
        
        return true;
    }
    
    /**
     * مدیریت نمایش پاسخ
     */
    handleShowAnswer() {
        console.log('👁️ handleShowAnswer() called');
        const answerSection = document.getElementById('answerSection');
        const showAnswerBtn = document.getElementById('showAnswerBtn');
        
        if (answerSection && showAnswerBtn) {
            answerSection.style.display = 'block';
            showAnswerBtn.style.display = 'none';
            console.log('✅ Answer shown');
        } else {
            console.error('❌ Answer section or button not found');
        }
    }
    
    /**
     * مدیریت انتخاب کیفیت پاسخ
     */
    handleQualitySelection(quality) {
        console.log('📝 handleQualitySelection() called with quality:', quality);
        
        // ✅ FIX: بررسی اینکه جلسه تمام نشده باشد
        if (this.sessionComplete || !this.currentCard) {
            console.warn('⏸️ جلسه تمام شده - پاسخ ثبت نمی‌شود');
            return;
        }
        
        // محاسبه correct بودن بر اساس کیفیت
        const isCorrect = quality > 0;
        
        // ثبت پاسخ
        const result = this.submitAnswer(isCorrect);
        console.log('📊 Answer submitted:', result);
        
        // نمایش کارت بعدی یا پایان جلسه
        const nextCard = this.getNextCard();
        if (nextCard) {
            this.renderReviewCard(nextCard);
        } else {
            this.renderSessionComplete();
        }
    }
    
    /**
     * رندر صفحه پایان جلسه
     */
    renderSessionComplete() {
        console.log('🏁 renderSessionComplete() called');
        
        const reviewSection = document.getElementById('review-section');
        if (!reviewSection) {
            console.error('❌ review-section not found');
            return;
        }
        
        this.sessionComplete = true; // ✅ FIX: علامت‌گذاری جلسه به عنوان تمام شده
        
        const sessionStats = this.getSessionStats();
        const stats = this.engine.getStatistics();
        
        reviewSection.innerHTML = `
            <div class="session-complete">
                <div class="complete-header">
                    <div class="celebration-icon">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <h2>جلسه مرور به پایان رسید!</h2>
                    <p class="subtitle">آفرین! امروز رو عالی کار کردی</p>
                </div>
                
                <div class="session-stats">
                    <div class="stat-item">
                        <div class="stat-icon correct">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-label">پاسخ‌های صحیح</span>
                            <span class="stat-value">${sessionStats.correct} کارت</span>
                        </div>
                    </div>
                    
                    <div class="stat-item">
                        <div class="stat-icon total">
                            <i class="fas fa-chart-bar"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-label">کل مرور شده</span>
                            <span class="stat-value">${sessionStats.reviewed} کارت</span>
                        </div>
                    </div>
                    
                    <div class="stat-item">
                        <div class="stat-icon accuracy">
                            <i class="fas fa-percentage"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-label">دقت</span>
                            <span class="stat-value">${sessionStats.accuracy}%</span>
                        </div>
                    </div>
                    
                    <div class="stat-item">
                        <div class="stat-icon points">
                            <i class="fas fa-star"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-label">امتیاز کسب شده</span>
                            <span class="stat-value">${sessionStats.points} امتیاز</span>
                        </div>
                    </div>
                </div>
                
                <div class="remaining-info">
                    <h3><i class="fas fa-calendar-check"></i> وضعیت باقی‌مانده</h3>
                    <p class="remaining-text">
                        ${Math.max(0, stats.dueToday - sessionStats.reviewed)} کارت برای مرور فردا باقی مانده
                    </p>
                </div>
                
                <div class="action-buttons">
                    <button id="continueReviewBtn" class="btn-primary">
                        <i class="fas fa-sync-alt"></i> ادامه مرور
                    </button>
                    <button id="backToDashboardBtn" class="btn-secondary">
                        <i class="fas fa-arrow-left"></i> بازگشت به داشبورد
                    </button>
                </div>
            </div>
        `;
        
        // اضافه کردن event listeners
        setTimeout(() => {
            const continueBtn = document.getElementById('continueReviewBtn');
            const backBtn = document.getElementById('backToDashboardBtn');
            
            if (continueBtn) {
                continueBtn.addEventListener('click', () => {
                    this.sessionComplete = false; // ✅ FIX: ریست کردن وضعیت جلسه
                    const nextCard = this.getNextCard();
                    if (nextCard) {
                        this.renderReviewCard(nextCard);
                    } else {
                        this.renderSessionComplete(); // اگر هنوز کارتی نبود
                    }
                });
            }
            
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    this.sessionComplete = false; // ✅ FIX: ریست کردن وضعیت جلسه
                    // بازگشت به داشبورد
                    if (window.app && typeof window.app.showReviewDashboard === 'function') {
                        window.app.showReviewDashboard();
                    } else {
                        const event = new CustomEvent('sectionChange', { 
                            detail: { section: 'review' } 
                        });
                        document.dispatchEvent(event);
                    }
                });
            }
        }, 100);
    }
    
    /**
     * دریافت کارت بعدی برای مرور
     */
    getNextCard() {
        console.log('🎴 getNextCard() called');
        
        const dueCards = this.engine.getDueCards();
        console.log('📊 Due cards count:', dueCards.length);
        console.log('📋 Due cards sample:', dueCards.slice(0, 2));
        
        if (dueCards.length === 0) {
            console.warn('⚠️ No due cards available');
            this.currentCard = null;
            return null;
        }
        
        // انتخاب تصادفی از کارت‌های آماده
        const randomIndex = Math.floor(Math.random() * dueCards.length);
        this.currentCard = dueCards[randomIndex];
        
        console.log('🎯 Selected card index:', randomIndex);
        console.log('🎴 Current card raw:', this.currentCard);
        
        // بررسی وجود فیلدهای ضروری
        if (!this.currentCard.question || !this.currentCard.answer) {
            console.error('❌ Card missing question/answer:', {
                id: this.currentCard.id,
                question: this.currentCard.question,
                answer: this.currentCard.answer,
                hasWord: !!this.currentCard.word,
                hasTranslation: !!this.currentCard.translation
            });
            
            // fallback: اگر ساختار قدیمی دارد، تبدیل کن
            if (this.currentCard.word && this.currentCard.translation) {
                console.warn('⚠️ Converting old format to new format on the fly');
                this.currentCard.question = this.currentCard.word;
                this.currentCard.answer = this.currentCard.translation;
            } else {
                throw new Error('کارت انتخاب شده معتبر نیست - question یا answer ندارد');
            }
        }
        
        const boxInfo = this.engine.boxes.find(b => b.id === this.currentCard.box);
        console.log('📦 Box info:', boxInfo);
        
        // اطمینان از ارسال همه فیلدهای ضروری
        const cardData = {
            id: this.currentCard.id,
            question: this.currentCard.question,
            answer: this.currentCard.answer,
            box: this.currentCard.box,
            boxInfo: boxInfo,
            reviewCount: this.currentCard.reviewCount || 0,
            remaining: dueCards.length
        };
        
        console.log('✅ Returning card data:', cardData);
        
        return cardData;
    }
    
    /**
     * نمایش پاسخ کارت فعلی
     */
    showAnswer() {
        console.log('👁️ showAnswer() called');
        console.log('🎴 Current card:', this.currentCard);
        
        if (!this.currentCard) {
            console.error('❌ No active card!');
            throw new Error('هیچ کارت فعالی وجود ندارد');
        }
        
        const answerData = {
            answer: this.currentCard.answer,
            box: this.currentCard.box,
            boxInfo: this.engine.boxes.find(b => b.id === this.currentCard.box)
        };
        
        console.log('✅ Answer data:', answerData);
        return answerData;
    }
    
    /**
     * ثبت پاسخ دانش‌آموز
     */
    submitAnswer(isCorrect) {
        console.log('📝 submitAnswer() called with:', isCorrect);
        console.log('🎴 Current card:', this.currentCard);
        
        // ✅ FIX: بررسی اینکه کارت فعال وجود دارد
        if (!this.currentCard) {
            console.warn('⚠️ No active card! جلسه تمام شده است.');
            return {
                error: 'جلسه تمام شده است',
                session: this.getSessionStats()
            };
        }
        
        // پردازش در موتور لایتنر
        const result = this.engine.processAnswer(this.currentCard.id, isCorrect);
        console.log('⚙️ Engine result:', result);
        
        // به‌روزرسانی آمار جلسه
        this.sessionStats.reviewed++;
        this.sessionStats.points += result.points;
        
        if (isCorrect) {
            this.sessionStats.correct++;
        } else {
            this.sessionStats.incorrect++;
        }
        
        console.log('📊 Updated session stats:', this.sessionStats);
        
        // آماده‌سازی نتیجه برای UI
        const response = {
            result: {
                isCorrect,
                oldBox: result.oldBox,
                newBox: result.newBox,
                points: result.points,
                boxChange: result.newBox - result.oldBox,
                nextReview: this.formatDate(result.nextReview)
            },
            session: { ...this.sessionStats },
            boxes: {
                old: this.engine.boxes.find(b => b.id === result.oldBox),
                new: this.engine.boxes.find(b => b.id === result.newBox)
            }
        };
        
        console.log('✅ Submit response:', response);
        
        // پاک کردن کارت فعلی
        this.currentCard = null;
        
        return response;
    }
    
    /**
     * دریافت آمار کامل
     */
    getStatistics() {
        const stats = this.engine.getStatistics();
        console.log('📊 Statistics:', stats);
        return stats;
    }
    
    /**
     * دریافت آمار جلسه فعلی
     */
    getSessionStats() {
        const duration = this.sessionStats.startTime ? 
            Math.floor((new Date() - this.sessionStats.startTime) / 1000) : 0;
        
        return {
            ...this.sessionStats,
            duration,
            accuracy: this.sessionStats.reviewed > 0 ? 
                Math.round((this.sessionStats.correct / this.sessionStats.reviewed) * 100) : 0
        };
    }
    
    /**
     * دریافت پیشرفت کلی
     */
    getProgress() {
        const stats = this.engine.getStatistics();
        
        return {
            overall: stats.progress,
            boxes: stats.boxes,
            totalCards: stats.totalCards,
            dueToday: stats.dueToday,
            mastered: stats.mastered,
            nextReview: stats.nextReview ? this.formatDate(stats.nextReview) : null
        };
    }
    
    /**
     * دریافت وضعیت امروز
     */
    getTodayStatus() {
        const stats = this.engine.getStatistics();
        const dueCards = this.engine.getDueCards();
        
        return {
            dueCount: dueCards.length,
            hasCards: dueCards.length > 0,
            totalReviewed: this.sessionStats.reviewed,
            remaining: Math.max(0, dueCards.length - this.sessionStats.reviewed),
            message: this.getStatusMessage(dueCards.length, this.sessionStats.reviewed)
        };
    }
    
    /**
     * تولید پیام وضعیت
     */
    getStatusMessage(total, reviewed) {
        if (total === 0) {
            return "آفرین! امروز کارت جدیدی برای مرور نداری 🎉";
        }
        
        if (reviewed === 0) {
            return `${total} کارت آماده مرور است`;
        }
        
        const remaining = total - reviewed;
        if (remaining === 0) {
            return "عالی! تمام کارت‌های امروز رو مرور کردی! 🏆";
        }
        
        return `${reviewed} مرور شده، ${remaining} کارت باقی مانده`;
    }
    
    /**
     * ریست جلسه فعلی
     */
    resetSession() {
        console.log('🔄 resetSession() called');
        this.currentCard = null;
        this.sessionStats = {
            reviewed: 0,
            correct: 0,
            incorrect: 0,
            points: 0,
            startTime: null
        };
        this.sessionComplete = false; // ✅ FIX: ریست کردن وضعیت جلسه
    }
    
    /**
     * ریست کامل سیستم لایتنر
     */
    resetAll() {
        console.log('🔄 resetAll() called');
        this.engine.reset();
        this.resetSession();
        this.isInitialized = false;
    }
    
    /**
     * فرمت‌دهی تاریخ
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        
        if (targetDate.getTime() === today.getTime()) {
            return 'امروز';
        } else if (targetDate.getTime() === tomorrow.getTime()) {
            return 'فردا';
        } else {
            const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
            return `${diffDays} روز دیگر`;
        }
    }
    
    /**
     * بررسی آماده بودن سیستم
     */
    isReady() {
        const ready = this.isInitialized;
        console.log('✅ isReady():', ready);
        return ready;
    }
}