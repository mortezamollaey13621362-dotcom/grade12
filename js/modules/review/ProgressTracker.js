// js/modules/review/ProgressTracker.js
// ✅ اضافه کردن import
import { ReviewStorage } from './ReviewStorage.js';

/**
 * سیستم ردیابی پیشرفت
 */
export class ProgressTracker {
    constructor(lessonId) {
        this.lessonId = lessonId;
        this.storage = new ReviewStorage(lessonId);
        this.initProgressData();
    }
    
    initProgressData() {
        this.progress = {
            daily: [],
            cards: []
        };
    }
    
    async recordDailyActivity(activity) {
        await this.loadProgressData();
        
        const today = this.getTodayKey();
        let dailyRecord = this.progress.daily.find(d => d.date === today);
        
        if (!dailyRecord) {
            dailyRecord = {
                date: today,
                reviewedCards: 0,
                correctAnswers: 0,
                incorrectAnswers: 0
            };
            this.progress.daily.push(dailyRecord);
        }
        
        dailyRecord.reviewedCards += activity.reviewedCards || 0;
        dailyRecord.correctAnswers += activity.correctAnswers || 0;
        dailyRecord.incorrectAnswers += activity.incorrectAnswers || 0;
        
        await this.saveProgressData();
        return dailyRecord;
    }
    
    async recordCardProgress(cardId, performance) {
        await this.loadProgressData();
        
        let cardProgress = this.progress.cards.find(c => c.cardId === cardId);
        
        if (!cardProgress) {
            cardProgress = {
                cardId: cardId,
                totalReviews: 0,
                correctCount: 0,
                incorrectCount: 0
            };
            this.progress.cards.push(cardProgress);
        }
        
        cardProgress.totalReviews++;
        
        if (performance.isCorrect) {
            cardProgress.correctCount++;
        } else {
            cardProgress.incorrectCount++;
        }
        
        await this.saveProgressData();
        return cardProgress;
    }
    
    async saveProgressData() {
        return this.storage.saveData(this.progress, 'progress');
    }
    
    async loadProgressData() {
        const data = await this.storage.loadData('progress');
        if (data && data.length > 0) {
            this.progress = data[0];
        }
        return this.progress;
    }
    
    getTodayKey() {
        return new Date().toISOString().split('T')[0];
    }
}