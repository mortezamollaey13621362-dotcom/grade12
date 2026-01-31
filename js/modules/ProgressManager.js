// js/modules/ProgressManager.js
export class ProgressManager {
    constructor(lessonManager) {
        this.lessonManager = lessonManager;
    }

    updateLessonProgress(lessonId) {
        const lessonData = this.lessonManager.userData.lessons[lessonId];
        if (!lessonData) return 0;

        const totalSections = 9; // 9 قابلیت
        const completed = lessonData.completedSections?.length || 0;
        const progress = Math.round((completed / totalSections) * 100);
        
        lessonData.progress = progress;
        this.lessonManager.saveUserData();
        
        this.updateOverallProgress();
        return progress;
    }

    updateOverallProgress() {
        const lessons = Object.values(this.lessonManager.userData.lessons);
        if (lessons.length === 0) {
            this.lessonManager.userData.totalProgress = 0;
            return;
        }

        const total = lessons.reduce((sum, lesson) => sum + (lesson.progress || 0), 0);
        this.lessonManager.userData.totalProgress = Math.round(total / lessons.length);
        this.lessonManager.saveUserData();
    }

    markSectionCompleted(lessonId, section) {
        let lessonData = this.lessonManager.userData.lessons[lessonId];
        if (!lessonData) {
            lessonData = this.lessonManager.createLessonData();
            this.lessonManager.userData.lessons[lessonId] = lessonData;
        }

        if (!lessonData.completedSections) {
            lessonData.completedSections = [];
        }

        if (!lessonData.completedSections.includes(section)) {
            lessonData.completedSections.push(section);
            this.lessonManager.saveUserData();
            this.updateLessonProgress(lessonId);
        }
    }

    getLessonProgress(lessonId) {
        const lessonData = this.lessonManager.userData.lessons[lessonId];
        return lessonData?.progress || 0;
    }

    getOverallProgress() {
        return this.lessonManager.userData.totalProgress || 0;
    }

    resetProgress(lessonId = null) {
        if (lessonId) {
            delete this.lessonManager.userData.lessons[lessonId];
        } else {
            this.lessonManager.userData.lessons = {};
            this.lessonManager.userData.totalProgress = 0;
        }
        this.lessonManager.saveUserData();
    }
}