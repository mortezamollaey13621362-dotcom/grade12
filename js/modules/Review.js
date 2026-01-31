// js/modules/Review.js - نسخه اصلاح شده با question/answer
export default class Review {
    constructor(app, containerEl) {
        this.app = app;
        this.containerEl = containerEl;
        
        this.session = {
            lessonId: null,
            cards: [],
            dueCards: [],
            currentIndex: 0,
            showingAnswer: false,
            stats: {
                reviewed: 0,
                correct: 0,
                incorrect: 0
            }
        };
        
        this.elements = {};
        
        console.log('🎯 Review System Initialized');
    }
    
    // ============ Core Methods ============
    
    async loadData(lessonId) {
        console.log(`📚 Loading lesson ${lessonId}...`);
        
        try {
            this.session.lessonId = lessonId;
            
            // بارگذاری از JSON
            const jsonUrl = `./data/lesson${lessonId}/review.json`;
            console.log(`🔗 Fetching from: ${jsonUrl}`);
            
            const response = await fetch(jsonUrl);
            
            if (response.ok) {
                const jsonData = await response.json();
                console.log('✅ JSON file loaded successfully');
                console.log('📊 JSON data structure:', {
                    hasCards: !!jsonData.cards,
                    cardCount: jsonData.cards?.length,
                    firstCard: jsonData.cards?.[0]
                });
                
                // **تبدیل صحیح JSON به کارت‌ها**
                this.session.cards = this.convertJsonToCards(jsonData);
                console.log(`🔄 Converted to ${this.session.cards.length} system cards`);
                
            } else {
                console.warn('⚠️ JSON file not found, using sample cards');
                this.session.cards = this.createSampleCards();
            }
            
            // محاسبه کارت‌های due
            this.calculateDueCards();
            
            console.log(`✅ Final: ${this.session.cards.length} cards, ${this.session.dueCards.length} due`);
            
            // نمایش در کنسول برای دیباگ
            if (this.session.cards.length > 0) {
                console.log('📋 Sample converted card:', this.session.cards[0]);
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Error in loadData:', error);
            
            // حالت fallback
            this.session.cards = this.createSampleCards();
            this.calculateDueCards();
            
            return false;
        }
    }
    
    // **تابع جدید برای تبدیل صحیح JSON با question/answer**
    convertJsonToCards(jsonData) {
        const today = new Date().toISOString().split('T')[0];
        
        if (!jsonData.cards || !Array.isArray(jsonData.cards)) {
            console.warn('❌ No cards array in JSON data');
            return this.createSampleCards();
        }
        
        return jsonData.cards.map((card, index) => {
            // دیباگ: نمایش ساختار کارت
            console.log(`🔄 Converting card ${index + 1}:`, {
                id: card.id,
                word: card.word,
                translation: card.translation,
                hasLeitner: !!card.leitner
            });
            
            // ✨ ساختار کارت نهایی با question/answer
            return {
                id: card.id || `card-${Date.now()}-${index}`,
                question: card.word || card.question || card.front || 'کلمه',
                answer: card.translation || card.answer || card.back || 'ترجمه',
                example: card.example || '',
                phonetic: card.phonetic || '',
                category: card.category || 'general',
                box: card.leitner?.box || card.box || 1,
                nextReview: card.leitner?.nextReview || card.nextReview || today,
                due: card.leitner?.due !== undefined ? card.leitner.due : 
                     card.due !== undefined ? card.due : true,
                isNew: card.leitner?.isNew || card.isNew || true,
                stats: {
                    totalReviews: 0,
                    correct: 0,
                    wrong: 0
                }
            };
        });
    }
    
    createSampleCards() {
        const today = new Date().toISOString().split('T')[0];
        
        return [
            {
                id: "sample_1",
                question: "Hello",
                answer: "سلام",
                example: "Hello everyone!",
                box: 1,
                nextReview: today,
                due: true,
                isNew: true,
                stats: { totalReviews: 0, correct: 0, wrong: 0 }
            },
            {
                id: "sample_2", 
                question: "Goodbye",
                answer: "خداحافظ",
                example: "Goodbye my friend!",
                box: 1,
                nextReview: today,
                due: true,
                isNew: true,
                stats: { totalReviews: 0, correct: 0, wrong: 0 }
            }
        ];
    }
    
    calculateDueCards() {
        const today = new Date().toISOString().split('T')[0];
        
        this.session.dueCards = this.session.cards.filter(card => {
            // کارت‌هایی که due هستند
            if (card.due === true) return true;
            
            // یا تاریخ مرورشان رسیده
            if (card.nextReview && card.nextReview <= today) return true;
            
            return false;
        });
        
        console.log(`📅 Due cards calculation:`);
        console.log(`- Total cards: ${this.session.cards.length}`);
        console.log(`- Due cards: ${this.session.dueCards.length}`);
        
        if (this.session.dueCards.length > 0) {
            console.log(`- First due card:`, this.session.dueCards[0]);
        }
        
        this.session.currentIndex = 0;
        this.session.showingAnswer = false;
    }
    
    // ============ UI Methods ============
    
    getHtml() {
        const stats = this.session.stats;
        const hasCards = this.session.dueCards.length > 0;
        const currentCard = hasCards ? this.session.dueCards[0] : null;
        
        const accuracy = this.calculateSessionAccuracy();
        
        return `
            <div class="review-container">
                <!-- Header -->
                <div class="review-header">
                    <h3><i class="fas fa-redo"></i> سیستم مرور لایتنر</h3>
                    <div class="stats" id="reviewStats">
                        <div class="stat-item">
                            <span>امروز:</span>
                            <strong id="todayCount">${this.session.dueCards.length}</strong>
                        </div>
                        <div class="stat-item">
                            <span>مرور شده:</span>
                            <strong id="reviewedCount">${stats.reviewed || 0}</strong>
                        </div>
                        <div class="stat-item">
                            <span>دقت:</span>
                            <strong id="accuracy">${accuracy}%</strong>
                        </div>
                    </div>
                </div>
                
                <!-- Progress -->
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill" style="width: 0%"></div>
                    </div>
                    <div class="progress-text" id="progressText">۰ از ${this.session.dueCards.length}</div>
                </div>
                
                ${hasCards ? `
                <!-- Card -->
                <div class="review-card" id="reviewCard">
                    <div class="card-box" id="cardBox">
                        📝 جعبه ${currentCard.box || 1}
                    </div>
                    
                    <div class="card-content">
                        <div class="card-front" id="cardFront">
                            <h2 id="cardWord">${currentCard.question}</h2>
                            ${currentCard.phonetic ? `<div class="phonetic">${currentCard.phonetic}</div>` : ''}
                        </div>
                        
                        <div class="card-back" id="cardBack" style="display: none;">
                            <div class="translation" id="cardTranslation">${currentCard.answer}</div>
                            ${currentCard.example ? `<div class="example">${currentCard.example}</div>` : ''}
                            <div class="card-stats">
                                <span>مرور: ${currentCard.stats?.totalReviews || 0}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-actions">
                        <button class="btn-show" id="showAnswerBtn">
                            <i class="fas fa-eye"></i> نمایش پاسخ
                        </button>
                        
                        <div class="answer-buttons" id="answerButtons" style="display: none;">
                            <button class="btn-wrong" id="wrongBtn">
                                <i class="fas fa-times"></i> نمی‌دانم
                            </button>
                            <button class="btn-correct" id="correctBtn">
                                <i class="fas fa-check"></i> می‌دانم
                            </button>
                        </div>
                    </div>
                </div>
                ` : `
                <!-- No Cards -->
                <div class="no-cards">
                    <div class="no-cards-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3>آفرین!</h3>
                    <p>هیچ کارتی برای مرور امروز ندارید.</p>
                    <p class="next-review">مرور بعدی: فردا</p>
                </div>
                `}
            </div>
        `;
    }
    
    calculateSessionAccuracy() {
        const stats = this.session.stats;
        if (!stats.reviewed || stats.reviewed === 0) return 0;
        return Math.round((stats.correct / stats.reviewed) * 100);
    }
    
    bindEvents() {
        console.log('🔗 Binding review events...');
        
        setTimeout(() => {
            this.elements = {
                showAnswerBtn: document.getElementById('showAnswerBtn'),
                wrongBtn: document.getElementById('wrongBtn'),
                correctBtn: document.getElementById('correctBtn'),
                cardBack: document.getElementById('cardBack'),
                answerButtons: document.getElementById('answerButtons')
            };
            
            console.log('🔍 Elements found:', Object.keys(this.elements).filter(k => this.elements[k]));
            
            if (this.elements.showAnswerBtn) {
                this.elements.showAnswerBtn.onclick = () => this.showAnswer();
            }
            
            if (this.elements.wrongBtn) {
                this.elements.wrongBtn.onclick = () => this.answer(false);
            }
            
            if (this.elements.correctBtn) {
                this.elements.correctBtn.onclick = () => this.answer(true);
            }
            
            this.updateStatsDisplay();
            this.updateProgressBar();
            
            console.log('✅ Events bound successfully');
        }, 100);
    }
    
    showAnswer() {
        console.log('🎯 Showing answer');
        
        if (this.elements.cardBack) {
            this.elements.cardBack.style.display = 'block';
        }
        
        if (this.elements.showAnswerBtn) {
            this.elements.showAnswerBtn.style.display = 'none';
        }
        
        if (this.elements.answerButtons) {
            this.elements.answerButtons.style.display = 'flex';
        }
        
        this.session.showingAnswer = true;
    }
    
    answer(isCorrect) {
        console.log(`📝 Answer: ${isCorrect ? 'Correct' : 'Wrong'}`);
        
        if (this.session.currentIndex >= this.session.dueCards.length) {
            return;
        }
        
        const card = this.session.dueCards[this.session.currentIndex];
        
        // Update stats
        if (!card.stats) card.stats = { totalReviews: 0, correct: 0, wrong: 0 };
        card.stats.totalReviews++;
        
        if (isCorrect) {
            card.stats.correct++;
            this.session.stats.correct++;
            if (card.box < 5) card.box++;
        } else {
            card.stats.wrong++;
            this.session.stats.incorrect++;
            card.box = 1;
        }
        
        // Calculate next review
        const intervals = [0, 1, 3, 7, 15];
        const days = intervals[card.box - 1] || 1;
        
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + days);
        card.nextReview = nextDate.toISOString().split('T')[0];
        card.due = false;
        
        // Update session
        this.session.stats.reviewed++;
        this.session.currentIndex++;
        
        // Update UI
        if (this.session.currentIndex < this.session.dueCards.length) {
            this.showCurrentCard();
        } else {
            this.showSessionComplete();
        }
        
        this.updateStatsDisplay();
    }
    
    showCurrentCard() {
        if (this.session.currentIndex >= this.session.dueCards.length) {
            this.showSessionComplete();
            return;
        }
        
        const card = this.session.dueCards[this.session.currentIndex];
        
        if (this.elements.cardWord) {
            this.elements.cardWord.textContent = card.question;
        }
        
        if (this.elements.cardTranslation) {
            this.elements.cardTranslation.textContent = card.answer;
        }
        
        // Reset display
        if (this.elements.cardBack) {
            this.elements.cardBack.style.display = 'none';
        }
        
        if (this.elements.showAnswerBtn) {
            this.elements.showAnswerBtn.style.display = 'block';
        }
        
        if (this.elements.answerButtons) {
            this.elements.answerButtons.style.display = 'none';
        }
        
        this.updateProgressBar();
    }
    
    showSessionComplete() {
        console.log('🏁 Session complete');
        
        const accuracy = this.calculateSessionAccuracy();
        const completeHTML = `
            <div class="session-complete">
                <div class="complete-icon">
                    <i class="fas fa-trophy"></i>
                </div>
                <h3>جلسه تکمیل شد!</h3>
                <div class="complete-stats">
                    <div class="stat-row">
                        <div class="stat-col">
                            <span class="stat-number">${this.session.stats.reviewed}</span>
                            <span class="stat-label">کارت مرور شده</span>
                        </div>
                        <div class="stat-col">
                            <span class="stat-number">${accuracy}%</span>
                            <span class="stat-label">دقت</span>
                        </div>
                    </div>
                </div>
                <button class="btn-restart" id="restartBtn" onclick="location.reload()">
                    <i class="fas fa-redo"></i> شروع مجدد
                </button>
            </div>
        `;
        
        const container = document.querySelector('.review-container');
        if (container) {
            container.innerHTML = completeHTML;
        }
    }
    
    updateStatsDisplay() {
        const reviewedCount = document.getElementById('reviewedCount');
        const accuracy = document.getElementById('accuracy');
        
        if (reviewedCount) reviewedCount.textContent = this.session.stats.reviewed;
        if (accuracy) accuracy.textContent = `${this.calculateSessionAccuracy()}%`;
    }
    
    updateProgressBar() {
        const total = this.session.dueCards.length;
        const current = this.session.currentIndex;
        const progress = total > 0 ? Math.round((current / total) * 100) : 0;
        
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${current} از ${total}`;
    }
}

// Global access
if (typeof window !== 'undefined') {
    window.Review = Review;
}
