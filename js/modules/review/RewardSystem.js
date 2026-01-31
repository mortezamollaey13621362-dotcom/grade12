// js/modules/review/RewardSystem.js
/**
 * سیستم پاداش و گیمیفیکیشن برای انگیزه بخشیدن به دانش‌آموزان
 */
export class RewardSystem {
    constructor(lessonId) {
        this.lessonId = lessonId;
        this.storage = new ReviewStorage(lessonId);
        this.initRewards();
        this.loadAchievements();
    }
    
    initRewards() {
        // سطوح پیشرفت
        this.levels = [
            { level: 1, name: "تازه‌کار", points: 0, badge: "🥚" },
            { level: 2, name: "یادگیرنده", points: 100, badge: "🐣" },
            { level: 3, name: "ماهر", points: 300, badge: "🐥" },
            { level: 4, name: "استاد", points: 600, badge: "🐔" },
            { level: 5, name: "قهرمان", points: 1000, badge: "🦅" },
            { level: 6, name: "اسطوره", points: 1500, badge: "🏆" },
            { level: 7, name: "افسانه", points: 2200, badge: "👑" },
            { level: 8, name: "جادوگر کلمات", points: 3000, badge: "🧙" }
        ];
        
        // دستاوردها
        this.achievements = [
            {
                id: 'first_review',
                name: 'شروع سفر',
                description: 'اولین مرور خودت رو انجام بده',
                icon: '🚀',
                points: 50,
                condition: (stats) => stats.totalReviews >= 1,
                unlocked: false
            },
            {
                id: 'streak_3',
                name: 'تداوم',
                description: '۳ روز متوالی مطالعه کن',
                icon: '🔥',
                points: 100,
                condition: (stats) => stats.streak >= 3,
                unlocked: false
            },
            {
                id: 'streak_7',
                name: 'تعهد',
                description: 'یک هفته متوالی مطالعه کن',
                icon: '🌟',
                points: 250,
                condition: (stats) => stats.streak >= 7,
                unlocked: false
            },
            {
                id: 'accuracy_90',
                name: 'دقت بالا',
                description: 'به دقت ۹۰٪ برس',
                icon: '🎯',
                points: 150,
                condition: (stats) => stats.accuracy >= 90,
                unlocked: false
            },
            {
                id: 'master_5_cards',
                name: 'تسلط',
                description: '۵ کارت رو به جعبه استادی برسون',
                icon: '👑',
                points: 200,
                condition: (stats) => stats.masteredCards >= 5,
                unlocked: false
            },
            {
                id: 'fast_learner',
                name: 'یادگیرنده سریع',
                description: '۱۰ کارت رو در یک روز مرور کن',
                icon: '⚡',
                points: 180,
                condition: (stats) => stats.cardsPerDay >= 10,
                unlocked: false
            },
            {
                id: 'persistent',
                name: 'پشتکار',
                description: '۵۰ کارت رو مرور کن',
                icon: '💪',
                points: 300,
                condition: (stats) => stats.totalReviews >= 50,
                unlocked: false
            },
            {
                id: 'vocab_master',
                name: 'استاد واژگان',
                description: 'تمام کارت‌های درس رو مرور کن',
                icon: '📚',
                points: 500,
                condition: (stats) => stats.reviewedAllCards,
                unlocked: false
            }
        ];
        
        // مدال‌های ویژه
        this.specialBadges = [
            {
                id: 'early_bird',
                name: 'پرنده سحرخیز',
                description: 'صبح‌ها مطالعه کن',
                icon: '🌅',
                condition: () => new Date().getHours() < 10
            },
            {
                id: 'night_owl',
                name: 'جغد شب',
                description: 'شب‌ها مطالعه کن',
                icon: '🌙',
                condition: () => new Date().getHours() > 20
            },
            {
                id: 'weekend_warrior',
                name: 'مبارز آخر هفته',
                description: 'آخر هفته مطالعه کن',
                icon: '🎉',
                condition: () => {
                    const day = new Date().getDay();
                    return day === 5 || day === 6; // جمعه یا شنبه
                }
            },
            {
                id: 'marathon',
                name: 'ماراتن',
                description: 'بیش از ۳۰ دقیقه مطالعه کن',
                icon: '🏃',
                condition: (stats) => stats.studyTime >= 30
            }
        ];
    }
    
    /**
     * بارگذاری دستاوردهای ذخیره شده
     */
    async loadAchievements() {
        const saved = await this.storage.loadData('achievements');
        if (saved && saved.length > 0) {
            this.userAchievements = saved[0];
        } else {
            this.userAchievements = {
                points: 0,
                level: 1,
                unlockedAchievements: [],
                unlockedBadges: [],
                dailyStats: {
                    pointsEarned: 0,
                    achievementsUnlocked: 0
                },
                history: []
            };
        }
        return this.userAchievements;
    }
    
    /**
     * ذخیره دستاوردها
     */
    async saveAchievements() {
        return this.storage.saveData([this.userAchievements], 'achievements');
    }
    
    /**
     * ثبت فعالیت و اعطای پاداش
     */
    async recordActivity(activity) {
        await this.loadAchievements();
        
        const rewards = {
            points: 0,
            levelUp: false,
            achievements: [],
            badges: []
        };
        
        // اعطای امتیاز
        rewards.points = this.calculatePoints(activity);
        this.userAchievements.points += rewards.points;
        this.userAchievements.dailyStats.pointsEarned += rewards.points;
        
        // بررسی ارتقاء سطح
        const newLevel = this.calculateLevel(this.userAchievements.points);
        if (newLevel > this.userAchievements.level) {
            rewards.levelUp = true;
            this.userAchievements.level = newLevel;
            rewards.levelData = this.levels.find(l => l.level === newLevel);
        }
        
        // بررسی دستاوردها
        const newAchievements = await this.checkAchievements(activity);
        if (newAchievements.length > 0) {
            rewards.achievements = newAchievements;
            this.userAchievements.unlockedAchievements.push(...newAchievements.map(a => a.id));
            this.userAchievements.dailyStats.achievementsUnlocked += newAchievements.length;
        }
        
        // بررسی مدال‌های ویژه
        const newBadges = await this.checkSpecialBadges(activity);
        if (newBadges.length > 0) {
            rewards.badges = newBadges;
            this.userAchievements.unlockedBadges.push(...newBadges.map(b => b.id));
        }
        
        // ثبت تاریخچه
        this.userAchievements.history.push({
            timestamp: new Date().toISOString(),
            activity: activity,
            rewards: rewards
        });
        
        // محدود کردن تاریخچه به 100 رکورد
        if (this.userAchievements.history.length > 100) {
            this.userAchievements.history = this.userAchievements.history.slice(-100);
        }
        
        await this.saveAchievements();
        return rewards;
    }
    
    /**
     * محاسبه امتیاز برای فعالیت
     */
    calculatePoints(activity) {
        let points = 0;
        
        // امتیاز برای هر کارت مرور شده
        points += (activity.reviewedCards || 0) * 5;
        
        // پاداش برای پاسخ‌های درست
        points += (activity.correctAnswers || 0) * 10;
        
        // پاداش استریک
        if (activity.streakBonus) {
            points += Math.round(points * activity.streakBonus);
        }
        
        // پاداش دقت بالا
        if (activity.accuracy && activity.accuracy >= 80) {
            points += Math.round(points * 0.2); // 20% پاداش
        }
        
        // پاداش زمان مطالعه
        if (activity.studyTime && activity.studyTime >= 15) {
            points += 25; // پاداش اضافی برای مطالعه طولانی
        }
        
        return Math.round(points);
    }
    
    /**
     * محاسبه سطح فعلی بر اساس امتیاز
     */
    calculateLevel(points) {
        for (let i = this.levels.length - 1; i >= 0; i--) {
            if (points >= this.levels[i].points) {
                return this.levels[i].level;
            }
        }
        return 1;
    }
    
    /**
     * بررسی دستاوردها
     */
    async checkAchievements(activity) {
        const newAchievements = [];
        
        // بارگذاری آمار کلی
        const stats = await this.getUserStats();
        
        for (const achievement of this.achievements) {
            // اگر قبلاً باز نشده باشد
            if (!this.userAchievements.unlockedAchievements.includes(achievement.id)) {
                // بررسی شرط دستاورد
                if (achievement.condition(stats)) {
                    achievement.unlocked = true;
                    achievement.unlockedAt = new Date().toISOString();
                    newAchievements.push(achievement);
                    
                    // اضافه کردن امتیاز دستاورد
                    this.userAchievements.points += achievement.points;
                }
            }
        }
        
        return newAchievements;
    }
    
    /**
     * بررسی مدال‌های ویژه
     */
    async checkSpecialBadges(activity) {
        const newBadges = [];
        const stats = await this.getUserStats();
        
        for (const badge of this.specialBadges) {
            if (!this.userAchievements.unlockedBadges.includes(badge.id)) {
                if (badge.condition(stats)) {
                    badge.unlockedAt = new Date().toISOString();
                    newBadges.push(badge);
                }
            }
        }
        
        return newBadges;
    }
    
    /**
     * دریافت آمار کاربر
     */
    async getUserStats() {
        // این تابع باید از ProgressTracker آمار بگیرد
        // فعلاً یک ساختار نمونه برمی‌گردانیم
        return {
            totalReviews: 0,
            streak: 0,
            accuracy: 0,
            masteredCards: 0,
            cardsPerDay: 0,
            reviewedAllCards: false,
            studyTime: 0
        };
    }
    
    /**
     * دریافت اطلاعات پاداش کاربر
     */
    async getUserRewards() {
        await this.loadAchievements();
        
        const currentLevel = this.levels.find(l => l.level === this.userAchievements.level);
        const nextLevel = this.levels.find(l => l.level === this.userAchievements.level + 1);
        
        return {
            points: this.userAchievements.points,
            level: this.userAchievements.level,
            currentLevel: currentLevel,
            nextLevel: nextLevel,
            progressToNextLevel: nextLevel ? 
                Math.round((this.userAchievements.points - currentLevel.points) / 
                          (nextLevel.points - currentLevel.points) * 100) : 100,
            unlockedAchievements: this.userAchievements.unlockedAchievements.length,
            totalAchievements: this.achievements.length,
            unlockedBadges: this.userAchievements.unlockedBadges.length,
            todayPoints: this.userAchievements.dailyStats.pointsEarned,
            todayAchievements: this.userAchievements.dailyStats.achievementsUnlocked
        };
    }
    
    /**
     * دریافت صفحه افتخارات
     */
    async getHallOfFame() {
        await this.loadAchievements();
        
        const unlockedAchievements = this.achievements.filter(a => 
            this.userAchievements.unlockedAchievements.includes(a.id)
        );
        
        const lockedAchievements = this.achievements.filter(a => 
            !this.userAchievements.unlockedAchievements.includes(a.id)
        );
        
        const unlockedBadges = this.specialBadges.filter(b => 
            this.userAchievements.unlockedBadges.includes(b.id)
        );
        
        return {
            unlockedAchievements: unlockedAchievements,
            lockedAchievements: lockedAchievements,
            unlockedBadges: unlockedBadges,
            levelProgress: await this.getUserRewards(),
            recentActivity: this.userAchievements.history.slice(-5).reverse()
        };
    }
    
    /**
     * ریست آمار روزانه
     */
    async resetDailyStats() {
        this.userAchievements.dailyStats = {
            pointsEarned: 0,
            achievementsUnlocked: 0
        };
        await this.saveAchievements();
    }
    
    /**
     * بررسی و ریست اتوماتیک آمار روزانه
     */
    async checkAndResetDaily() {
        const today = new Date().toLocaleDateString('fa-IR');
        const lastReset = this.userAchievements.lastReset || '';
        
        if (today !== lastReset) {
            await this.resetDailyStats();
            this.userAchievements.lastReset = today;
            await this.saveAchievements();
        }
    }
}