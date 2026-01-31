// js/modules/review/LeitnerEngine.js
/**
 * موتور سیستم لایتنر 5 سطحی
 */

export class LeitnerEngine {
    
    /**
     * تولید شناسه منحصر به فرد برای هر کاربر
     */
    getUserId() {
        // ایجاد شناسه منحصر به فرد برای هر کاربر
        let userId = localStorage.getItem('english7_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
            localStorage.setItem('english7_user_id', userId);
            console.log('👤 شناسه کاربر جدید:', userId);
        }
        return userId;
    }
    
    constructor(lessonId) {
        this.lessonId = lessonId;
        this.cards = [];
        this.boxes = [
            { id: 1, name: 'جعبه 1', interval: 1, color: '#FF6B6B' },
            { id: 2, name: 'جعبه 2', interval: 3, color: '#4ECDC4' },
            { id: 3, name: 'جعبه 3', interval: 7, color: '#45B7D1' },
            { id: 4, name: 'جعبه 4', interval: 14, color: '#96CEB4' },
            { id: 5, name: 'جعبه 5', interval: 30, color: '#FFEAA7' }
        ];
        
        // ✅ تغییر مهم: اضافه کردن شناسه کاربری به کلید ذخیره‌سازی
        this.storageKey = `leitner_${this.getUserId()}_lesson_${lessonId}`;
    }
    
    /**
     * بارگذاری و راه‌اندازی اولیه
     */
    async initialize() {
        console.log('🔧 LeitnerEngine.initialize() called');
        
        try {
            // 1️⃣ تلاش برای بارگذاری از localStorage
            const savedData = this.loadFromStorage();
            
            if (savedData && savedData.cards && savedData.cards.length > 0) {
                console.log('💾 Loading from localStorage:', savedData.cards.length, 'cards');
                this.cards = savedData.cards;
                
                // ✅ اطمینان از تبدیل ساختار قدیمی به جدید
                this.cards = this.cards.map(card => this.migrateCard(card));
                
                return true;
            }
            
            // 2️⃣ اگر localStorage خالی بود، از JSON لود کن
            console.log('📂 localStorage empty, loading from review.json');
            const dataPath = `data/lesson${this.lessonId}/review.json`;
            console.log('📥 Fetching from:', dataPath);
            
            const response = await fetch(dataPath);
            
            if (!response.ok) {
                throw new Error(`Failed to load review data: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📥 Raw data loaded:', data);
            
            // ✅ بررسی و تبدیل داده‌های لود شده
            if (!data.cards || !Array.isArray(data.cards)) {
                console.error('❌ Invalid data format:', data);
                throw new Error('فرمت داده نامعتبر است');
            }
            
            // ✅ تبدیل تمام کارت‌ها به ساختار جدید
            this.cards = data.cards.map(card => this.migrateCard(card));
            
            console.log('✅ Cards migrated:', this.cards.length);
            console.log('📋 Sample card:', this.cards[0]);
            
            // ✅ ذخیره در localStorage
            this.saveToStorage();
            
            return true;
            
        } catch (error) {
            console.error('❌ Error in initialize:', error);
            return false;
        }
    }
    
    /**
     * تبدیل ساختار قدیمی به جدید
     */
    migrateCard(card) {
        let question = card.question;
        let answer = card.answer;
        
        // ✅ اگر question نداره، از word استفاده کن
        if (!question && card.word) {
            console.warn(`🔄 Converting card ${card.id}: word -> question`);
            question = card.word;
        }
        
        // ✅ اگر answer نداره، به ترتیب از translation, meaning, definition استفاده کن
        if (!answer) {
            if (card.translation) {
                console.warn(`🔄 Converting card ${card.id}: translation -> answer`);
                answer = card.translation;
            } else if (card.meaning) {
                console.warn(`🔄 Converting card ${card.id}: meaning -> answer`);
                answer = card.meaning;
            } else if (card.definition) {
                console.warn(`🔄 Converting card ${card.id}: definition -> answer`);
                answer = card.definition;
            }
        }
        
        // ✅ اگر هنوز question یا answer نداره، خطا بده
        if (!question || !answer) {
            console.error('❌ Card missing required fields:', {
                id: card.id,
                hasQuestion: !!question,
                hasAnswer: !!answer,
                hasWord: !!card.word,
                hasTranslation: !!card.translation,
                hasMeaning: !!card.meaning,
                hasDefinition: !!card.definition,
                rawCard: card
            });
            throw new Error(`کارت ${card.id} فاقد question یا answer است`);
        }
        
        // ✅ ساخت کارت با ساختار استاندارد
        return {
            id: card.id,
            question: question,
            answer: answer,
            box: card.box || 1,
            nextReview: card.nextReview || new Date().toISOString(),
            reviewCount: card.reviewCount || 0,
            correctCount: card.correctCount || 0,
            lastReviewed: card.lastReviewed || null,
            // ✅ اضافه کردن فیلدهای قدیمی برای سازگاری
            word: card.word,
            translation: card.translation,
            meaning: card.meaning,
            definition: card.definition
        };
    }
    
    /**
     * دریافت کارت‌های آماده برای مرور
     */
    getDueCards() {
        const now = new Date();
        const dueCards = this.cards.filter(card => {
            const nextReview = new Date(card.nextReview);
            return nextReview <= now;
        });
        
        console.log('📊 Due cards:', dueCards.length, '/', this.cards.length);
        
        return dueCards;
    }
    
    /**
     * پردازش پاسخ دانش‌آموز
     */
    processAnswer(cardId, isCorrect) {
        const card = this.cards.find(c => c.id === cardId);
        
        if (!card) {
            throw new Error('کارت پیدا نشد');
        }
        
        const oldBox = card.box;
        
        // تعیین جعبه جدید
        let newBox;
        if (isCorrect) {
            newBox = Math.min(5, card.box + 1);
        } else {
            newBox = 1;
        }
        
        // به‌روزرسانی کارت
        card.box = newBox;
        card.lastReviewed = new Date().toISOString();
        card.reviewCount = (card.reviewCount || 0) + 1;
        
        if (isCorrect) {
            card.correctCount = (card.correctCount || 0) + 1;
        }
        
        // محاسبه تاریخ مرور بعدی
        const boxInfo = this.boxes.find(b => b.id === newBox);
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + boxInfo.interval);
        card.nextReview = nextReview.toISOString();
        
        // محاسبه امتیاز
        const points = isCorrect ? newBox * 10 : 0;
        
        // ✅ ذخیره خودکار در localStorage
        this.saveToStorage();
        
        return {
            oldBox,
            newBox,
            points,
            nextReview: card.nextReview
        };
    }
    
    /**
     * دریافت آمار
     */
    getStatistics() {
        const totalCards = this.cards.length;
        const dueCards = this.getDueCards();
        const mastered = this.cards.filter(c => c.box === 5).length;
        
        const boxStats = this.boxes.map(box => ({
            ...box,
            count: this.cards.filter(c => c.box === box.id).length
        }));
        
        return {
            totalCards,
            dueToday: dueCards.length,
            mastered,
            progress: totalCards > 0 ? Math.round((mastered / totalCards) * 100) : 0,
            boxes: boxStats,
            nextReview: this.getNextReviewDate()
        };
    }
    
    /**
     * دریافت تاریخ مرور بعدی
     */
    getNextReviewDate() {
        const futureCards = this.cards.filter(card => {
            const nextReview = new Date(card.nextReview);
            return nextReview > new Date();
        });
        
        if (futureCards.length === 0) {
            return null;
        }
        
        const nextReview = futureCards.reduce((earliest, card) => {
            const cardDate = new Date(card.nextReview);
            return cardDate < earliest ? cardDate : earliest;
        }, new Date(futureCards[0].nextReview));
        
        return nextReview.toISOString();
    }
    
    /**
     * ذخیره در localStorage
     */
    saveToStorage() {
        try {
            const data = {
                cards: this.cards,
                lastUpdate: new Date().toISOString(),
                lessonId: this.lessonId,
                version: '1.0',
                userId: this.getUserId() // ✅ اضافه کردن شناسه کاربر
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            console.log('💾 Data saved to localStorage');
        } catch (error) {
            console.error('❌ Error saving to localStorage:', error);
        }
    }
    
    /**
     * بارگذاری از localStorage
     */
    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) {
                return null;
            }
            
            const parsed = JSON.parse(data);
            
            // ✅ بررسی نسخه و مهاجرت اگر لازم باشد
            if (!parsed.version) {
                console.warn('🔄 Migrating old storage format');
                // تبدیل به فرمت جدید
                parsed.version = '1.0';
                parsed.lastUpdate = new Date().toISOString();
            }
            
            return parsed;
        } catch (error) {
            console.error('❌ Error loading from localStorage:', error);
            return null;
        }
    }
    
    /**
     * ریست کامل
     */
    reset() {
        localStorage.removeItem(this.storageKey);
        this.cards = [];
        console.log('🔄 Engine reset');
    }
    
    /**
     * پشتیبان‌گیری از داده‌ها
     */
    exportData() {
        const data = {
            cards: this.cards,
            boxes: this.boxes,
            lessonId: this.lessonId,
            userId: this.getUserId(),
            exportDate: new Date().toISOString(),
            totalCards: this.cards.length
        };
        return JSON.stringify(data, null, 2);
    }
    
    /**
     * وارد کردن داده‌ها
     */
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            this.cards = data.cards.map(card => this.migrateCard(card));
            this.saveToStorage();
            console.log('✅ Data imported successfully');
            return true;
        } catch (error) {
            console.error('❌ Error importing data:', error);
            return false;
        }
    }
    
    /**
     * دریافت شناسه کاربر فعلی (مفید برای دیباگ)
     */
    getCurrentUserId() {
        return this.getUserId();
    }
    
    /**
     * تغییر کاربر (برای حالت چند کاربره)
     */
    switchUser(newUserId) {
        localStorage.setItem('english7_user_id', newUserId);
        // بازنشانی storageKey با شناسه کاربر جدید
        this.storageKey = `leitner_${newUserId}_lesson_${this.lessonId}`;
        console.log('🔄 Switched to user:', newUserId);
        // بارگذاری مجدد داده‌ها
        this.loadFromStorage();
    }
}