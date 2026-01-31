// Store.js - User Progress Management
class UserStore {
    constructor() {
        this.STORAGE_KEY = 'english7_user_data_v2';
        this.data = this.loadData();
    }
    
    loadData() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Error parsing saved data:', e);
                return this.getDefaultData();
            }
        }
        return this.getDefaultData();
    }
    
    getDefaultData() {
        return {
            version: '2.0',
            created: new Date().toISOString(),
            totalProgress: 0,
            lessons: {},
            settings: {
                darkMode: false,
                audioEnabled: true,
                notifications: true
            },
            stats: {
                totalStudyTime: 0,
                wordsLearned: 0,
                quizzesCompleted: 0
            }
        };
    }
    
    save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
            return true;
        } catch (e) {
            console.error('Error saving data:', e);
            return false;
        }
    }
    
    // Lesson Management
    getLesson(lessonId) {
        return this.data.lessons[lessonId] || this.createLessonEntry(lessonId);
    }
    
    createLessonEntry(lessonId) {
        this.data.lessons[lessonId] = {
            started: false,
            progress: 0,
            completedSections: [],
            vocabulary: {
                learned: [],
                mastered: []
            },
            lastAccessed: null,
            timeSpent: 0,
            quizScores: []
        };
        this.save();
        return this.data.lessons[lessonId];
    }
    
    markSectionComplete(lessonId, section) {
        const lesson = this.getLesson(lessonId);
        if (!lesson.completedSections.includes(section)) {
            lesson.completedSections.push(section);
            this.updateLessonProgress(lessonId);
            this.save();
        }
    }
    
    updateLessonProgress(lessonId) {
        const lesson = this.getLesson(lessonId);
        const totalSections = 6; // Fixed number of sections per lesson
        const completed = lesson.completedSections.length;
        lesson.progress = Math.round((completed / totalSections) * 100);
        
        // Update overall progress
        this.updateOverallProgress();
        this.save();
    }
    
    updateOverallProgress() {
        const lessons = Object.values(this.data.lessons);
        if (lessons.length === 0) {
            this.data.totalProgress = 0;
            return;
        }
        
        const total = lessons.reduce((sum, lesson) => sum + lesson.progress, 0);
        this.data.totalProgress = Math.round(total / lessons.length);
    }
    
    // Vocabulary tracking
    markWordLearned(lessonId, wordId) {
        const lesson = this.getLesson(lessonId);
        if (!lesson.vocabulary.learned.includes(wordId)) {
            lesson.vocabulary.learned.push(wordId);
            this.data.stats.wordsLearned++;
            this.save();
        }
    }
    
    markWordMastered(lessonId, wordId) {
        const lesson = this.getLesson(lessonId);
        if (!lesson.vocabulary.mastered.includes(wordId)) {
            lesson.vocabulary.mastered.push(wordId);
            this.save();
        }
    }
    
    // Quiz results
    saveQuizResult(lessonId, score, total) {
        const lesson = this.getLesson(lessonId);
        lesson.quizScores.push({
            date: new Date().toISOString(),
            score: score,
            total: total,
            percentage: Math.round((score / total) * 100)
        });
        this.data.stats.quizzesCompleted++;
        this.save();
    }
    
    // Time tracking
    addStudyTime(lessonId, minutes) {
        const lesson = this.getLesson(lessonId);
        lesson.timeSpent += minutes;
        this.data.stats.totalStudyTime += minutes;
        this.save();
    }
    
    // Statistics
    getStats() {
        return {
            totalLessons: Object.keys(this.data.lessons).length,
            totalProgress: this.data.totalProgress,
            totalStudyTime: this.data.stats.totalStudyTime,
            wordsLearned: this.data.stats.wordsLearned,
            quizzesCompleted: this.data.stats.quizzesCompleted
        };
    }
    
    // Settings
    updateSettings(newSettings) {
        this.data.settings = { ...this.data.settings, ...newSettings };
        this.save();
    }
    
    getSettings() {
        return this.data.settings;
    }
    
    // Reset functions
    resetLesson(lessonId) {
        delete this.data.lessons[lessonId];
        this.updateOverallProgress();
        this.save();
    }
    
    resetAll() {
        this.data = this.getDefaultData();
        this.save();
    }
}

// Create global store instance
const UserProgress = new UserStore();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserProgress;
}