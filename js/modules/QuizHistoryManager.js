// js/modules/QuizHistoryManager.js

export class QuizHistoryManager {
    constructor(userId = 'default') {
        this.userId = userId;
        this.studentKey = `english7_quiz_history_${userId}`;
        this.teacherKey = `english7_teacher_history_${userId}`;
        this.maxStudentHistory = 20; // افزایش ظرفیت
        this.maxTeacherHistory = 30;
    }
    
    // ===== دانش‌آموز =====
    saveQuiz(quizData) {
        const history = this.getHistory();
        const existingIndex = history.findIndex(h => h.id === quizData.id);
        
        if (existingIndex >= 0) {
            history[existingIndex] = quizData;
        } else {
            history.unshift(quizData);
            if (history.length > this.maxStudentHistory) {
                history.pop();
            }
        }
        
        localStorage.setItem(this.studentKey, JSON.stringify(history));
        return quizData.id;
    }
    
    getHistory(filters = {}) {
        const data = localStorage.getItem(this.studentKey);
        let history = data ? JSON.parse(data) : [];
        
        // اعمال فیلترها
        if (filters.mode) {
            history = history.filter(h => h.mode === filters.mode);
        }
        
        if (filters.completed !== undefined) {
            history = history.filter(h => h.isCompleted === filters.completed);
        }
        
        if (filters.date) {
            const targetDate = new Date(filters.date).toDateString();
            history = history.filter(h => {
                const quizDate = new Date(h.completedAt || h.timestamp).toDateString();
                return quizDate === targetDate;
            });
        }
        
        return history;
    }
    
    getIncompleteQuiz() {
        const history = this.getHistory();
        return history.find(h => !h.isCompleted);
    }
    
    deleteQuiz(quizId) {
        let history = this.getHistory();
        history = history.filter(h => h.id !== quizId);
        localStorage.setItem(this.studentKey, JSON.stringify(history));
        return true;
    }
    
    getQuizStats() {
        const history = this.getHistory();
        const completed = history.filter(h => h.isCompleted);
        const incomplete = history.filter(h => !h.isCompleted);
        
        const totalScore = completed.reduce((sum, quiz) => sum + quiz.score, 0);
        const totalQuestions = completed.reduce((sum, quiz) => sum + quiz.totalQuestions, 0);
        
        return {
            totalQuizzes: history.length,
            completed: completed.length,
            incomplete: incomplete.length,
            averageScore: completed.length > 0 ? (totalScore / totalQuestions * 100).toFixed(1) : 0,
            totalQuestionsAnswered: totalQuestions
        };
    }
    
    // ===== معلم =====
    saveTeacherExam(examData) {
        const history = this.getTeacherHistory();
        history.unshift(examData);
        
        if (history.length > this.maxTeacherHistory) {
            history.pop();
        }
        
        localStorage.setItem(this.teacherKey, JSON.stringify(history));
        return examData.id;
    }
    
    getTeacherHistory() {
        const data = localStorage.getItem(this.teacherKey);
        return data ? JSON.parse(data) : [];
    }
    
    deleteTeacherExam(examId) {
        let history = this.getTeacherHistory();
        history = history.filter(h => h.id !== examId);
        localStorage.setItem(this.teacherKey, JSON.stringify(history));
        return true;
    }
    
    getTeacherStats() {
        const history = this.getTeacherHistory();
        const byMode = {};
        
        history.forEach(exam => {
            byMode[exam.mode] = (byMode[exam.mode] || 0) + 1;
        });
        
        return {
            totalExams: history.length,
            byMode: byMode,
            totalQuestions: history.reduce((sum, exam) => sum + exam.questionCount, 0),
            lastGenerated: history.length > 0 ? history[0].timestamp : 'هیچ'
        };
    }
    
    // ===== یوتیلیتی =====
    generateQuizId() {
        return `quiz_${this.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    generateExamId() {
        return `exam_${this.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    getCurrentTimestamp() {
        const now = new Date();
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        };
        return now.toLocaleDateString('fa-IR', options) + ' ' + 
               now.toLocaleTimeString('fa-IR', {hour: '2-digit', minute: '2-digit'});
    }
    
    // پاک‌سازی تاریخچه قدیمی (بیش از 30 روز)
    cleanupOldRecords() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // دانش‌آموز
        let studentHistory = this.getHistory();
        studentHistory = studentHistory.filter(quiz => {
            const quizDate = new Date(quiz.completedAt || quiz.timestamp);
            return quizDate > thirtyDaysAgo;
        });
        localStorage.setItem(this.studentKey, JSON.stringify(studentHistory));
        
        // معلم
        let teacherHistory = this.getTeacherHistory();
        teacherHistory = teacherHistory.filter(exam => {
            const examDate = new Date(exam.timestamp);
            return examDate > thirtyDaysAgo;
        });
        localStorage.setItem(this.teacherKey, JSON.stringify(teacherHistory));
        
        return {
            studentRemoved: studentHistory.length,
            teacherRemoved: teacherHistory.length
        };
    }
}