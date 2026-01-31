// ====================================
// 🎨 Modern UI Controller for Lessons
// ====================================

class LessonUI {
    constructor() {
        this.lessonId = this.getLessonIdFromURL();
        this.vocabData = null;
        
        // تعریف متادیتای بخش‌ها
        this.sections = {
            vocabulary: {
                title: 'واژگان',
                icon: '📖',
                description: 'یادگیری لغات جدید',
                class: 'section-vocabulary'
            },
            games: {
                title: 'بازی‌ها',
                icon: '🎯',
                description: 'تمرین با بازی',
                class: 'section-games'
            },
            flashcards: {
                title: 'فلش‌کارت',
                icon: '🎴',
                description: 'مرور سریع لغات',
                class: 'section-flashcards'
            },
            review: {
                title: 'مرور',
                icon: '♻️',
                description: 'سیستم لایتنر',
                class: 'section-review'
            },
            grammar: {
                title: 'گرامر',
                icon: '📝',
                description: 'قواعد زبان',
                class: 'section-grammar'
            },
            speaking: {
                title: 'مکالمه',
                icon: '🎙️',
                description: 'تمرین تلفظ',
                class: 'section-speaking'
            },
            conversation: {
                title: 'گفتگو',
                icon: '💭',
                description: 'دیالوگ‌های کاربردی',
                class: 'section-conversation'
            },
            listening: {
                title: 'شنیداری',
                icon: '🎧',
                description: 'تقویت گوش',
                class: 'section-listening'
            },
            quiz: {
                title: 'آزمون',
                icon: '✍️',
                description: 'ارزیابی نهایی',
                class: 'section-quiz'
            }
        };
    }
    
    // دریافت ID درس از URL
    getLessonIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('lesson') || '1';
    }
    
    // بارگذاری داده‌های درس
    async loadLessonData() {
        try {
            const response = await fetch(`data/lesson${this.lessonId}/vocab.json`);
            if (!response.ok) throw new Error('خطا در بارگذاری داده‌ها');
            
            this.vocabData = await response.json();
            this.renderLessonHeader();
            this.renderSections();
            this.updateProgress();
            
        } catch (error) {
            console.error('Error loading lesson:', error);
            this.showError();
        }
    }
    
    // نمایش هدر درس
    renderLessonHeader() {
        const metadata = this.vocabData.metadata;
        document.getElementById('lessonTitle').textContent = metadata.title;
        document.getElementById('lessonDescription').textContent = metadata.description;
    }
    
    // نمایش بخش‌ها
    renderSections() {
        const grid = document.getElementById('sectionsGrid');
        grid.innerHTML = '';
        
        // ترتیب نمایش بخش‌ها
        const order = [
            'vocabulary', 'grammar', 'flashcards', 
            'games', 'review', 'speaking', 
            'conversation', 'listening', 'quiz'
        ];
        
        order.forEach(sectionKey => {
            const section = this.sections[sectionKey];
            const count = this.getSectionCount(sectionKey);
            
            const card = document.createElement('button');
            card.className = `section-card ${section.class}`;
            card.onclick = () => this.openSection(sectionKey);
            
            card.innerHTML = `
                <span class="section-badge">${count} مورد</span>
                <div class="section-icon">${section.icon}</div>
                <h3 class="section-title">${section.title}</h3>
                <p class="section-description">${section.description}</p>
            `;
            
            grid.appendChild(card);
        });
    }
    
    // محاسبه تعداد آیتم‌های هر بخش
    getSectionCount(sectionKey) {
        if (!this.vocabData) return 0;
        
        switch(sectionKey) {
            case 'vocabulary':
                return this.vocabData.vocabulary?.words?.length || 0;
            case 'grammar':
                return this.vocabData.grammar?.topics?.length || 0;
            case 'flashcards':
                return this.vocabData.flashcards?.cards?.length || 0;
            case 'games':
                return this.vocabData.games?.activities?.length || 0;
            case 'review':
                return this.vocabData.review?.items?.length || 0;
            case 'speaking':
                return this.vocabData.speaking?.exercises?.length || 0;
            case 'conversation':
                return this.vocabData.conversation?.dialogues?.length || 0;
            case 'listening':
                return this.vocabData.listening?.exercises?.length || 0;
            case 'quiz':
                return this.vocabData.quiz?.questions?.length || 0;
            default:
                return 0;
        }
    }
    
    // باز کردن بخش
    openSection(sectionKey) {
        // ذخیره lessonId در localStorage
        localStorage.setItem('currentLessonId', this.lessonId);
        
        // انتقال به صفحه بخش
        window.location.href = `${sectionKey}.html?lesson=${this.lessonId}`;
    }
    
    // به‌روزرسانی نوار پیشرفت
    updateProgress() {
        // محاسبه پیشرفت از localStorage
        const progress = this.calculateProgress();
        const progressBar = document.getElementById('lessonProgress');
        const progressText = document.getElementById('progressText');
        
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${progress}% تکمیل شده`;
    }
    
    // محاسبه درصد پیشرفت
    calculateProgress() {
        const completedSections = JSON.parse(localStorage.getItem(`lesson${this.lessonId}_completed`) || '[]');
        const totalSections = Object.keys(this.sections).length;
        return Math.round((completedSections.length / totalSections) * 100);
    }
    
    // نمایش خطا
    showError() {
        const grid = document.getElementById('sectionsGrid');
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <h2 style="color: #e74c3c;">⚠️ خطا در بارگذاری درس</h2>
                <p>لطفاً اتصال اینترنت خود را بررسی کنید</p>
                <button onclick="location.reload()" class="back-button" style="margin-top: 20px;">
                    تلاش مجدد
                </button>
            </div>
        `;
    }
    
    // شروع
    init() {
        this.loadLessonData();
    }
}

// راه‌اندازی UI هنگام بارگذاری صفحه
document.addEventListener('DOMContentLoaded', () => {
    const ui = new LessonUI();
    ui.init();
});

// تابع بازگشت
function goBack() {
    window.location.href = 'index.html';
}
