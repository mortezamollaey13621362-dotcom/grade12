// js/utils/SectionRenderer.js

export class SectionRenderer {
    constructor(app) {
        this.app = app;
        this.sections = {
            vocab: app.vocabulary,
            grammar: this.createGrammarHandler(app),
            conversation: app.conversation,
            speaking: app.speaking,
            listening: app.listening,
            review: app.review,
            quiz: app.quiz,
            games: app.games,
            flashcard: app.flashcards
        };
    }

    createGrammarHandler(app) {
        return {
            render: async () => {
                try {
                    console.log('🔄 Grammar handler: Loading...');
                    
                    // 1. دریافت lessonId
                    const lessonId = app.lessonManager?.getCurrentLessonId?.() || 1;
                    
                    // 2. لود کردن داده‌ها
                    const response = await fetch(`./lessons/lesson${lessonId}/grammar.json`);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    
                    const data = await response.json();
                    console.log('✅ Grammar data loaded');
                    
                    // 3. اگر آرایه است، اولین آیتم را بگیر
                    const grammarData = Array.isArray(data) && data.length > 0 ? data[0] : data;
                    
                    // 4. try-catch برای import
                    let GrammarClass;
                    try {
                        // اول سعی کن از مسیر اصلی import کنی
                        const module = await import('/js/modules/Grammar.js');
                        GrammarClass = module.Grammar;
                    } catch (e1) {
                        try {
                            // سپس از مسیر نسبی
                            const module = await import('../modules/Grammar.js');
                            GrammarClass = module.Grammar;
                        } catch (e2) {
                            try {
                                // سپس از مسیر دیگر
                                const module = await import('./modules/Grammar.js');
                                GrammarClass = module.Grammar;
                            } catch (e3) {
                                // اگر import نشد، از window بگیر
                                console.log('⚠️ Trying window.Grammar');
                                GrammarClass = window.Grammar || window.GrammarClass;
                            }
                        }
                    }
                    
                    if (!GrammarClass) {
                        throw new Error('Grammar class not found');
                    }
                    
                    // 5. ایجاد نمونه و رندر
                    const grammar = new GrammarClass(grammarData);
                    return grammar.render();
                    
                } catch (error) {
                    console.error('❌ Grammar error:', error);
                    
                    // HTML ساده به عنوان fallback
                    return this.createSimpleGrammarHTML();
                }
            },
            
            bindEvents: (container) => {
                // رویدادهای Grammar
                if (container) {
                    container.addEventListener('click', (e) => {
                        if (e.target.matches('.grammar-tab-btn')) {
                            const index = parseInt(e.target.dataset.index);
                            // اینجا باید event handler اصلی Grammar را فراخوانی کنی
                            const grammarInstance = window.__grammarInstance;
                            if (grammarInstance && grammarInstance.switchTab) {
                                grammarInstance.switchTab(index);
                            }
                        }
                        
                        if (e.target.closest('.btn-quiz-start')) {
                            const grammarInstance = window.__grammarInstance;
                            if (grammarInstance && grammarInstance.startPractice) {
                                grammarInstance.startPractice();
                            }
                        }
                    });
                }
            }
        };
    }

    createSimpleGrammarHTML() {
        return `
            <div class="grammar-container">
                <div class="grammar-header">
                    <h3>گرامر درس ۱</h3>
                    <span class="grammar-level">سطح: مقدماتی</span>
                    <p class="grammar-description">آموزش فعل to be و کاربرد آن</p>
                </div>
                
                <div class="grammar-tabs-container">
                    <div class="grammar-tabs">
                        <button class="grammar-tab-btn active" data-index="0">📚 مفاهیم پایه</button>
                        <button class="grammar-tab-btn" data-index="1">💡 نکات مهم</button>
                        <button class="grammar-tab-btn" data-index="2">🎯 تمرین</button>
                    </div>
                </div>
                
                <div id="grammar-dynamic-content">
                    <div class="grammar-section">
                        <h4 class="section-title">فعل To Be</h4>
                        <div class="text-content">
                            در زبان انگلیسی برای بیان حالت، شغل، محل سکونت و ... از <b>فعل To Be</b> استفاده می‌کنیم.
                        </div>
                        
                        <div class="table-container">
                            <table class="grammar-table">
                                <thead>
                                    <tr>
                                        <th>فاعل</th><th>فعل</th><th>مثال</th><th>ترجمه</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td>I</td><td>am</td><td>I am happy.</td><td>من خوشحال هستم.</td></tr>
                                    <tr><td>You</td><td>are</td><td>You are smart.</td><td>تو باهوش هستی.</td></tr>
                                    <tr><td>He/She/It</td><td>is</td><td>She is a teacher.</td><td>او معلم است.</td></tr>
                                    <tr><td>We/They</td><td>are</td><td>They are friends.</td><td>آن‌ها دوست هستند.</td></tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="quiz-section" style="margin-top: 30px;">
                            <button class="btn-quiz-start">
                                <span class="quiz-icon">🎮</span>
                                شروع آزمون تمرینی
                            </button>
                        </div>
                    </div>
                </div>
                
                <div id="grammarQuizModal" class="modal" style="display:none;">
                    <div class="modal-content">
                        <span class="modal-close">&times;</span>
                        <div id="quizModalBody">
                            <h3>آزمون گرامر</h3>
                            <p>آزمون به زودی فعال می‌شود...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async renderSection(sectionName) {
        console.log(`🎯 Rendering section: ${sectionName}`);
        
        const section = this.sections[sectionName];
        if (!section) {
            console.error(`SectionRenderer: Module not found for '${sectionName}'`);
            return '<div class="error">بخش مورد نظر یافت نشد.</div>';
        }

        try {
            const html = await section.render();
            console.log(`✅ ${sectionName} HTML generated`);
            
            // اتصال رویدادها
            if (typeof section.bindEvents === 'function') {
                setTimeout(() => {
                    this._bindSectionEvents(section, sectionName);
                }, 50);
            }

            // ثبت پیشرفت
            this._updateProgress(sectionName);
            
            return html;
        } catch (error) {
            console.error(`Error rendering section ${sectionName}:`, error);
            return `<div class="error">خطا در بارگذاری بخش ${this.getSectionName(sectionName)}</div>`;
        }
    }

    _bindSectionEvents(section, sectionName) {
        let container = document.getElementById('section-container') || 
                       document.getElementById('content') ||
                       document.querySelector('.main-content');

        if (container) {
            console.log(`✅ Binding events for ${sectionName}`);
            
            try {
                section.bindEvents(container);
                console.log(`✅ Events bound for ${sectionName}`);
            } catch (bindError) {
                console.error(`❌ Error binding events:`, bindError);
            }
        } else {
            console.warn(`⚠️ No container found for ${sectionName}`);
        }
    }

    _updateProgress(sectionName) {
        try {
            const lesson = this.app.lessonManager?.getCurrentLesson?.();
            if (lesson && this.app.progressManager) {
                this.app.progressManager.markSectionCompleted(lesson.id, sectionName);
            }
        } catch (error) {
            console.warn('⚠️ Could not update progress:', error);
        }
    }

    getSectionName(section) {
        const names = {
            vocab: 'واژگان',
            grammar: 'گرامر',
            conversation: 'مکالمه',
            speaking: 'گفتار',
            listening: 'شنیدار',
            review: 'مرور',
            quiz: 'آزمون',
            games: 'بازی‌ها',
            flashcard: 'فلش‌کارت'
        };
        return names[section] || section;
    }

    getAllSections() {
        return Object.keys(this.sections);
    }

    // تست Grammar
    testGrammar() {
        console.log('🧪 Testing Grammar...');
        if (this.sections.grammar) {
            this.sections.grammar.render()
                .then(html => {
                    console.log('✅ Grammar test successful');
                    // نمایش در یک div جداگانه برای تست
                    const testDiv = document.createElement('div');
                    testDiv.id = 'grammar-test';
                    testDiv.innerHTML = html;
                    document.body.appendChild(testDiv);
                })
                .catch(err => console.error('❌ Grammar test failed:', err));
        }
    }
}