// js/modules/Vocabulary.js - نسخه نهایی کامل با اصلاح جستجو
export class Vocabulary {
    constructor(lessonManager) {
        this.lessonManager = lessonManager;
        this.words = [];
        this.filteredWords = [];
        
        this.searchTerm = '';
        this.searchLanguage = 'both';
        this.isSearching = false;
        this.searchTimeout = null;
        this.lastSearchValue = '';
        
        // کش برای صداهای پخش شده
        this.audioCache = new Map();
        this.sentenceCache = new Map();
        
        // توقف‌دهنده‌های صدا
        this.activeAudio = null;
        this.activeTTS = null;
        this.audioContext = null;
        
        // بارگذاری voiceها برای Web Speech API
        this._initVoices();
    }

    /* ================= INITIALIZATION ================= */
    
    _initVoices() {
        if ('speechSynthesis' in window) {
            // بارگذاری اولیه voiceها
            speechSynthesis.getVoices();
            
            // گوش دادن به تغییرات voiceها
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = () => {
                    console.log('✅ Voices loaded:', speechSynthesis.getVoices().length);
                };
            }
        }
    }
    
    init(lessonData) {
        console.log('📦 Initializing vocabulary with lessonData:', lessonData);
        
        if (lessonData && Array.isArray(lessonData)) {
            // اگر داده‌ها مستقیم آرایه باشند (مثل vocab.json)
            this.words = lessonData.map((w, i) => ({
                ...w,
                __vid: i + 1
            }));
            console.log(`✅ Vocabulary loaded directly: ${this.words.length} words`);
        } else if (lessonData && lessonData.vocabulary) {
            // اگر داده‌ها در property باشد
            this.words = lessonData.vocabulary.map((w, i) => ({
                ...w,
                __vid: i + 1
            }));
            console.log(`✅ Vocabulary loaded from .vocabulary: ${this.words.length} words`);
        } else {
            this.words = [];
            console.warn('⚠️ No vocabulary data found');
        }
        
        this.filteredWords = [...this.words];
        return this;
    }

    /* ================= RENDER METHOD ================= */
    
    render() {
        console.log('🎯 Rendering vocabulary section...');
        
        return `
            <div class="vocab-section-container">
                ${this.createSearchUI()}
                <div class="vocab-grid-container" id="vocab-grid-container">
                    ${this.createVocabularyGrid(this.filteredWords)}
                </div>
            </div>
        `;
    }
    
    afterRender() {
        console.log('🔧 Vocabulary afterRender called');
        this._attachSearchListeners();
        return this;
    }

    /* ================= SEARCH UI & FUNCTIONALITY ================= */
    
    createSearchUI() {
        return `
            <div class="vocab-search-container glass-effect fade-in">
                <div class="search-header">
                    <h3><i class="fas fa-search"></i> جستجوی واژگان</h3>
                    <div class="search-stats">
                        <span class="total-words">${this.words.length} کلمه</span>
                        ${this.isSearching ? 
                            `<span class="filtered-words">${this.filteredWords.length} نتیجه</span>` : 
                            ''}
                    </div>
                </div>
                
                <div class="search-controls">
                    <div class="search-input-wrapper">
                        <i class="fas fa-search search-icon"></i>
                        <input type="text" 
                               id="vocab-search-input"
                               class="search-input" 
                               placeholder="جستجوی کلمه انگلیسی یا فارسی..."
                               value="${this.searchTerm}"
                               autocomplete="off">
                        ${this.searchTerm ? 
                            `<button class="clear-search-btn" id="clear-search-btn">
                                <i class="fas fa-times"></i>
                             </button>` : 
                            ''}
                    </div>
                    
                    <div class="search-language-tabs">
                        <button class="lang-tab ${this.searchLanguage === 'both' ? 'active' : ''}" 
                                data-lang="both">
                            <i class="fas fa-globe"></i> هر دو
                        </button>
                        <button class="lang-tab ${this.searchLanguage === 'en' ? 'active' : ''}" 
                                data-lang="en">
                            <i class="fas fa-language"></i> انگلیسی
                        </button>
                        <button class="lang-tab ${this.searchLanguage === 'fa' ? 'active' : ''}" 
                                data-lang="fa">
                            <i class="fas fa-font"></i> فارسی
                        </button>
                    </div>
                </div>
                
                <div class="search-actions">
                    <button class="btn-gradient" id="start-practice-btn">
                        <i class="fas fa-play-circle"></i> شروع تمرین
                    </button>
                    <button class="btn-outline" id="clear-cache-btn">
                        <i class="fas fa-broom"></i> پاک کردن کش
                    </button>
                </div>
            </div>
        `;
    }
    
    _attachSearchListeners() {
        console.log('🔌 Attaching search listeners...');
        
        // اتصال event listener به input جستجو
        const searchInput = document.getElementById('vocab-search-input');
        if (searchInput) {
            // حذف event listeners قبلی
            const newInput = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newInput, searchInput);
            
            // اتصال event listener جدید
            newInput.addEventListener('input', (e) => {
                console.log('📝 Input event triggered');
                this.handleSearchInput(e.target.value);
            });
            
            newInput.addEventListener('keydown', (e) => {
                this.handleSearchKeydown(e);
            });
            
            console.log('✅ Search input listener attached');
        } else {
            console.error('❌ Search input not found!');
        }
        
        // اتصال event listener به دکمه پاک کردن با event delegation
        document.addEventListener('click', (e) => {
            if (e.target.closest('#clear-search-btn')) {
                console.log('🧹 Clear button clicked via delegation');
                this.clearSearch();
            }
        });
        
        // اتصال event listener به تب‌های زبان با event delegation
        document.addEventListener('click', (e) => {
            const langTab = e.target.closest('.lang-tab');
            if (langTab) {
                const lang = langTab.getAttribute('data-lang');
                console.log('🌐 Language tab clicked via delegation:', lang);
                this.setSearchLanguage(lang);
            }
        });
        
        // اتصال event listener به دکمه‌های اکشن
        const practiceBtn = document.getElementById('start-practice-btn');
        if (practiceBtn) {
            practiceBtn.addEventListener('click', () => {
                this.startPractice();
            });
        }
        
        const cacheBtn = document.getElementById('clear-cache-btn');
        if (cacheBtn) {
            cacheBtn.addEventListener('click', () => {
                this.clearCache();
            });
        }
        
        console.log('✅ All search listeners attached');
    }
    
    handleSearchInput(value) {
        console.log('⌨️ Handle search input:', value);
        this.searchTerm = value;
        clearTimeout(this.searchTimeout);
        
        if (value.trim() === '') {
            this.clearSearch();
            return;
        }
        
        this.searchTimeout = setTimeout(() => {
            this.performSearch();
        }, 300);
    }
    
    handleSearchKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.performSearch();
        } else if (event.key === 'Escape') {
            this.clearSearch();
        }
    }
    
    performSearch() {
        const trimmedTerm = this.searchTerm.trim();
        console.log('🔍 Perform search for:', trimmedTerm, 'last:', this.lastSearchValue);
        
        if (trimmedTerm === this.lastSearchValue) return;
        
        this.lastSearchValue = trimmedTerm;
        this.isSearching = trimmedTerm !== '';
        
        if (this.isSearching) {
            this.filteredWords = this.searchByLanguage(trimmedTerm, this.searchLanguage);
        } else {
            this.filteredWords = [...this.words];
        }
        
        console.log('🔍 Search results:', this.filteredWords.length);
        this.updateSearchUI();
        this.updateSearchResults();
    }
    
    _getStringValue(field, subKey = 'main') {
        if (!field) return '';
        
        // اگر رشته است
        if (typeof field === 'string') {
            return field;
        }
        
        // اگر آبجکت است
        if (typeof field === 'object' && field !== null) {
            // برای phonetic
            if (subKey === 'phonetic') {
                return field.us || field.uk || '';
            }
            
            // برای persian
            if (subKey === 'main' && typeof field === 'object') {
                return field.main || field.short || '';
            }
            
            // برای موارد دیگر
            return field[subKey] || field.main || field.us || field.uk || '';
        }
        
        // سایر موارد
        return String(field);
    }
    
    searchVocabulary(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        console.log('🔍 Searching for:', term, 'in', this.words.length, 'words');
        
        if (!term) return this.words;
        
        return this.words.filter(word => {
            const wordStr = this._getStringValue(word.word).toLowerCase();
            const persianStr = this._getStringValue(word.persian).toLowerCase();
            const phoneticStr = this._getStringValue(word.phonetic, 'us').toLowerCase();
            
            // جستجوی پیشرفته‌تر
            return wordStr.includes(term) || 
                   persianStr.includes(term) || 
                   phoneticStr.includes(term) ||
                   (word.meanings && 
                    word.meanings.some(m => 
                        (m.persianDefinition && m.persianDefinition.toLowerCase().includes(term)) ||
                        (m.definition && m.definition.simple && m.definition.simple.toLowerCase().includes(term))
                    ));
        });
    }
    
    searchByLanguage(term, language = 'both') {
        const searchResults = this.searchVocabulary(term);
        console.log('🌐 Search by language:', language, 'found:', searchResults.length);
        
        if (language === 'both') {
            return searchResults;
        }
        
        return searchResults.filter(word => {
            if (language === 'en') {
                const wordStr = this._getStringValue(word.word).toLowerCase();
                const phoneticStr = this._getStringValue(word.phonetic, 'us').toLowerCase();
                return wordStr.includes(term.toLowerCase()) || 
                       phoneticStr.includes(term.toLowerCase());
            } else if (language === 'fa') {
                const persianStr = this._getStringValue(word.persian).toLowerCase();
                return persianStr.includes(term.toLowerCase());
            }
            return true;
        });
    }
    
    setSearchLanguage(language) {
        console.log('🌐 Setting search language to:', language);
        this.searchLanguage = language;
        
        if (this.isSearching) {
            this.filteredWords = this.searchByLanguage(this.lastSearchValue, language);
            this.updateSearchResults();
        }
        
        this.updateSearchUI();
    }
    
    clearSearch() {
        console.log('🧹 Clearing search');
        this.searchTerm = '';
        this.lastSearchValue = '';
        this.isSearching = false;
        this.filteredWords = [...this.words];
        
        const searchInput = document.getElementById('vocab-search-input');
        if (searchInput) searchInput.value = '';
        
        this.updateSearchUI();
        this.updateSearchResults();
    }
    
    updateSearchUI() {
        console.log('🔄 Updating search UI');
        
        const searchInput = document.getElementById('vocab-search-input');
        const searchWrapper = document.querySelector('.search-input-wrapper');
        const langTabs = document.querySelectorAll('.lang-tab');
        const searchStats = document.querySelector('.search-stats');
        
        if (searchInput) {
            searchInput.value = this.searchTerm;
        }
        
        // به‌روزرسانی دکمه پاک کردن
        if (searchWrapper) {
            const existingClearBtn = searchWrapper.querySelector('.clear-search-btn');
            
            if (this.searchTerm && !existingClearBtn) {
                // اضافه کردن دکمه پاک کردن
                const clearBtn = document.createElement('button');
                clearBtn.className = 'clear-search-btn';
                clearBtn.id = 'clear-search-btn';
                clearBtn.innerHTML = '<i class="fas fa-times"></i>';
                clearBtn.title = 'پاک کردن جستجو';
                searchWrapper.appendChild(clearBtn);
            } else if (!this.searchTerm && existingClearBtn) {
                // حذف دکمه پاک کردن
                existingClearBtn.remove();
            }
        }
        
        // به‌روزرسانی تب‌های زبان
        if (langTabs) {
            langTabs.forEach(tab => {
                const lang = tab.getAttribute('data-lang');
                if (this.searchLanguage === lang) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
        }
        
        // به‌روزرسانی آمار
        if (searchStats) {
            searchStats.innerHTML = `
                <span class="total-words">${this.words.length} کلمه</span>
                ${this.isSearching ? 
                    `<span class="filtered-words">${this.filteredWords.length} نتیجه</span>` : 
                    ''}
            `;
        }
    }
    
    updateSearchResults() {
        console.log('🔄 Updating search results');
        console.log('📊 Filtered words to display:', this.filteredWords.length);
        
        const gridContainer = document.getElementById('vocab-grid-container');
        if (gridContainer) {
            const newGridHTML = this.createVocabularyGrid(this.filteredWords);
            gridContainer.innerHTML = newGridHTML;
            console.log('✅ Grid updated successfully');
        } else {
            console.error('❌ Grid container not found!');
            // تلاش برای پیدا کردن container با روش دیگر
            const altContainer = document.querySelector('.vocab-grid-container');
            if (altContainer) {
                altContainer.innerHTML = this.createVocabularyGrid(this.filteredWords);
                console.log('✅ Grid updated via alternative selector');
            }
        }
    }

    /* ================= GRID ================= */
    
    createVocabularyGrid(words) {
        if (!words || words.length === 0) {
            return `
                <div class="no-words-message">
                    <i class="fas fa-book-open"></i>
                    <p>${this.isSearching ? 'هیچ لغتی یافت نشد.' : 'لغتی برای نمایش نیست.'}</p>
                </div>
            `;
        }

        let html = '';

        words.forEach((word, index) => {
            const isLearned = this.isWordLearned(word.__vid);

            const wordString = this._getStringValue(word.word);
            const persianString = this._getStringValue(word.persian, 'main');
            const phoneticString = this._getStringValue(word.phonetic, 'us');

            html += `
                <div class="vocab-card zoom fade-in-delay"
                     data-word-id="${word.__vid}"
                     style="animation-delay:${index * 0.1}s">

                    <div class="vocab-header">
                        <div class="vocab-word-section">
                            <div class="vocab-word-with-btn">
                                <div class="vocab-word">${wordString}</div>
                                <button class="pronunciation-btn-card" data-word-id="${word.__vid}" title="پخش تلفظ">
                                    <i class="fas fa-volume-up"></i>
                                </button>
                            </div>
                            <div class="vocab-phonetic">${phoneticString}</div>
                        </div>
                        <div class="word-status">
                            ${isLearned ? '<span class="badge learned">✓ یادگرفته</span>' : ''}
                            <span class="badge level level-${(word.level || 'A1').toLowerCase()}">${word.level || 'A1'}</span>
                        </div>
                    </div>

                    <div class="vocab-meaning">${persianString}</div>

                    <div class="vocab-actions">
                        <button class="details-btn btn-gradient"
                            data-word-id="${word.__vid}">
                            جزییات
                        </button>
                        <button class="mark-btn btn-gradient"
                            data-word-id="${word.__vid}"
                            data-action="toggle">
                            ${isLearned ? 'تسلط یافتم' : 'یاد گرفتم'}
                        </button>
                    </div>
                </div>
            `;
        });

        // اتصال event listenerها بعد از render
        setTimeout(() => {
            this._attachCardListeners();
        }, 100);

        return html;
    }
    
    _attachCardListeners() {
        console.log('🔗 Attaching card listeners...');
        
        // دکمه‌های جزییات
        const detailsBtns = document.querySelectorAll('.details-btn');
        detailsBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const vid = btn.getAttribute('data-word-id');
                this.showWordDetails(vid);
            });
        });
        
        // دکمه‌های علامت‌گذاری
        const markBtns = document.querySelectorAll('.mark-btn[data-action="toggle"]');
        markBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const vid = btn.getAttribute('data-word-id');
                this.toggleWord(vid);
            });
        });
        
        // دکمه‌های تلفظ در کارت
        const pronunciationBtns = document.querySelectorAll('.pronunciation-btn-card');
        pronunciationBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const vid = btn.getAttribute('data-word-id');
                const word = this.words.find(w => w.__vid === Number(vid));
                if (word) {
                    this._showPronunciationMenu(word, btn);
                }
            });
        });
        
        console.log(`✅ ${detailsBtns.length} card listeners attached`);
    }

    /* ================= PRONUNCIATION MENU IN CARD ================= */

    _showPronunciationMenu(word, buttonElement) {
        // حذف منوی قبلی اگر وجود داشت
        const existingMenu = document.querySelector('.pronunciation-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const wordString = this._getStringValue(word.word);

        // ساخت منوی تلفظ با ۲ گزینه
        const menu = document.createElement('div');
        menu.className = 'pronunciation-menu';
        menu.innerHTML = `
            <div class="pronunciation-menu-header">
                <i class="fas fa-volume-up"></i>
                <span>تلفظ ${this._escapeHTML(wordString)}</span>
            </div>
            <div class="pronunciation-options">
    <button class="pronunciation-option" data-accent="us">
        امریکن
    </button>
    <button class="pronunciation-option" data-accent="uk">
        بریتیش
    </button>
            </div>
        `;

        // محاسبه موقعیت
        const buttonRect = buttonElement.getBoundingClientRect();
        menu.style.top = `${buttonRect.bottom + window.scrollY + 8}px`;
        menu.style.left = `${buttonRect.left + window.scrollX - 80}px`;

        document.body.appendChild(menu);

        // انیمیشن ظاهر شدن
        setTimeout(() => {
            menu.classList.add('show');
        }, 10);

        // Event listeners برای گزینه‌ها
        const options = menu.querySelectorAll('.pronunciation-option');
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const accent = option.getAttribute('data-accent');
                
                // افکت بصری
                option.classList.add('playing');
                setTimeout(() => option.classList.remove('playing'), 1000);
                
                // پخش صدا با سرعت عادی
                this.playWordAudio(wordString, accent, 'normal');
                
                // بستن منو بعد از پخش
                setTimeout(() => {
                    menu.classList.remove('show');
                    setTimeout(() => menu.remove(), 300);
                }, 500);
            });
        });

        // بستن منو با کلیک خارج از آن
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== buttonElement) {
                menu.classList.remove('show');
                setTimeout(() => menu.remove(), 300);
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);

        // بستن با ESC
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                menu.classList.remove('show');
                setTimeout(() => menu.remove(), 300);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    /* ================= DETAILS MODAL ================= */
    
    getWordDetails(vid) {
        const details = this.words.find(w => w.__vid === Number(vid));
        if (!details) {
            console.warn(`⚠️ vocab vid ${vid} not found`);
            return { __vid: vid, word: 'Unknown', persian: 'یافت نشد', meanings: [] };
        }
        return details;
    }
    
    showWordDetails(vid) {
        const details = this.getWordDetails(vid);
        const modal = document.createElement('div');
        modal.className = 'word-modal';
        modal.innerHTML = this.createModalHTML(details);
        document.body.appendChild(modal);
        
        // اتصال event listenerها
        this._attachModalListeners(modal, details);
    }
    
    createModalHTML(details) {
        const wordString = this._escapeHTML(this._getStringValue(details.word));
        const persianString = this._escapeHTML(this._getStringValue(details.persian, 'main'));
        const phoneticUS = this._escapeHTML(this._getStringValue(details.phonetic, 'us'));
        const phoneticUK = this._escapeHTML(this._getStringValue(details.phonetic, 'uk'));
        const partOfSpeech = Array.isArray(details.partOfSpeech) ? 
            details.partOfSpeech.join('، ') : details.partOfSpeech || '';
        
        let meaningsHTML = '';
        if (details.meanings && Array.isArray(details.meanings)) {
            meaningsHTML = details.meanings.map((meaning, index) => {
                // ⭐ بخش جدید برای مترادف‌ها
                const synonymsHTML = meaning.synonyms && meaning.synonyms.length > 0 ? 
                    `<div class="synonyms-antonyms-section">
                        <div class="section-header synonyms-header">
                            <i class="fas fa-equals"></i>
                            <strong>مترادف‌ها</strong>
                            <span class="count-badge">${meaning.synonyms.length}</span>
                        </div>
                        <div class="tags-container">
                            ${meaning.synonyms.map(syn => 
                                `<span class="synonym-tag">
                                    <i class="fas fa-tag"></i>
                                    ${syn}
                                </span>`
                            ).join('')}
                        </div>
                    </div>` : 
                    `<div class="synonyms-antonyms-section empty-section">
                        <div class="section-header synonyms-header">
                            <i class="fas fa-equals"></i>
                            <strong>مترادف‌ها</strong>
                        </div>
                        <div class="empty-list">
                            <i class="fas fa-inbox"></i>
                            <span>مترادفی وجود ندارد</span>
                        </div>
                    </div>`;
                
                // ⭐ بخش جدید برای متضادها
                const antonymsHTML = meaning.antonyms && meaning.antonyms.length > 0 ? 
                    `<div class="synonyms-antonyms-section">
                        <div class="section-header antonyms-header">
                            <i class="fas fa-not-equal"></i>
                            <strong>متضادها</strong>
                            <span class="count-badge">${meaning.antonyms.length}</span>
                        </div>
                        <div class="tags-container">
                            ${meaning.antonyms.map(ant => 
                                `<span class="antonym-tag">
                                    <i class="fas fa-tag"></i>
                                    ${ant}
                                </span>`
                            ).join('')}
                        </div>
                    </div>` : 
                    `<div class="synonyms-antonyms-section empty-section">
                        <div class="section-header antonyms-header">
                            <i class="fas fa-not-equal"></i>
                            <strong>متضادها</strong>
                        </div>
                        <div class="empty-list">
                            <i class="fas fa-inbox"></i>
                            <span>متضادی وجود ندارد</span>
                        </div>
                    </div>`;
                
                return `
                    <div class="meaning-item">
                        <div class="meaning-number">${index + 1}</div>
                        <div class="meaning-content">
                            <div class="meaning-definition">
                                <p class="en-def">${meaning.definition?.simple || ''}</p>
                                <p class="fa-def">${meaning.persianDefinition || ''}</p>
                            </div>
                            
                            ${meaning.example?.sentence ? `
                            <div class="meaning-example">
                                <div class="example-header">
                                    <i class="fas fa-quote-right"></i>
                                    <span>مثال:</span>
                                    <div class="example-audio-controls">
                                        <div class="audio-btn-wrapper">
                                            <button class="audio-btn slow" 
                                                    data-text="${this._escapeHTML(meaning.example.sentence)}"
                                                    data-accent="us"
                                                    data-speed="slow"
                                                    data-type="sentence"
                                                    title="پخش آهسته امریکن">
                                                <i class="fas fa-turtle"></i>
                                            </button>
                                            <span class="audio-btn-label">آهسته</span>
                                        </div>
                                        <div class="audio-btn-wrapper">
                                            <button class="audio-btn normal" 
                                                    data-text="${this._escapeHTML(meaning.example.sentence)}"
                                                    data-accent="us"
                                                    data-speed="normal"
                                                    data-type="sentence"
                                                    title="پخش معمولی امریکن">
                                                <i class="fas fa-volume-up"></i>
                                            </button>
                                            <span class="audio-btn-label">عادی</span>
                                        </div>
                                    </div>
                                </div>
                                <p class="example-en">${meaning.example.sentence || ''}</p>
                                <p class="example-fa">${meaning.example.translation || ''}</p>
                            </div>
                            ` : ''}
                            
                            ${synonymsHTML}
                            ${antonymsHTML}
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        const isLearned = this.isWordLearned(details.__vid);
        
        return `
            <div class="modal-overlay">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <div class="word-title">
                            <h2>${wordString}</h2>
                            <div class="word-info">
                                <span class="level-badge level-${(details.level || 'A1').toLowerCase()}">
                                    ${details.level || 'A1'}
                                </span>
                                <button class="mark-modal-btn ${isLearned ? 'learned' : ''}" 
                                        data-word-id="${details.__vid}">
                                    <i class="fas ${isLearned ? 'fa-check-circle' : 'fa-bookmark'}"></i>
                                    ${isLearned ? 'یادگرفته شده' : 'یاد بگیرم'}
                                </button>
                            </div>
                        </div>
                        <button class="close-modal" title="بستن">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="pronunciation-section">
                            <div class="pronunciation-item">
                                <span class="pron-label">🇺🇸 امریکن:</span>
                                <span class="phonetic">${phoneticUS}</span>
                                <div class="audio-controls">
                                    <div class="audio-btn-wrapper">
                                        <button class="audio-btn normal" 
                                                data-text="${wordString}"
                                                data-accent="us"
                                                data-speed="normal"
                                                data-type="word"
                                                title="تلفظ امریکن">
                                            <i class="fas fa-volume-up"></i>
                                        </button>
                                        <span class="audio-btn-label">عادی</span>
                                    </div>
                                    <div class="audio-btn-wrapper">
                                        <button class="audio-btn slow" 
                                                data-text="${wordString}"
                                                data-accent="us"
                                                data-speed="slow"
                                                data-type="word"
                                                title="تلفظ آهسته امریکن">
                                            <i class="fas fa-volume-down"></i>
                                        </button>
                                        <span class="audio-btn-label">آهسته</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="pronunciation-item">
                                <span class="pron-label">🇬🇧 بریتیش:</span>
                                <span class="phonetic">${phoneticUK}</span>
                                <div class="audio-controls">
                                    <div class="audio-btn-wrapper">
                                        <button class="audio-btn normal" 
                                                data-text="${wordString}"
                                                data-accent="uk"
                                                data-speed="normal"
                                                data-type="word"
                                                title="تلفظ بریتیش">
                                            <i class="fas fa-volume-up"></i>
                                        </button>
                                        <span class="audio-btn-label">عادی</span>
                                    </div>
                                    <div class="audio-btn-wrapper">
                                        <button class="audio-btn slow" 
                                                data-text="${wordString}"
                                                data-accent="uk"
                                                data-speed="slow"
                                                data-type="word"
                                                title="تلفظ آهسته بریتیش">
                                            <i class="fas fa-volume-down"></i>
                                        </button>
                                        <span class="audio-btn-label">آهسته</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="basic-info">
                            <div class="info-item">
                                <span class="info-label">معنی فارسی:</span>
                                <span class="info-value">${persianString}</span>
                            </div>
                            
                            ${partOfSpeech ? `
                            <div class="info-item">
                                <span class="info-label">نوع کلمه:</span>
                                <span class="info-value">${partOfSpeech}</span>
                            </div>
                            ` : ''}
                        </div>
                        
                        ${meaningsHTML ? `
                        <div class="meanings-section">
                            <h3><i class="fas fa-layer-group"></i> معانی و کاربردها</h3>
                            <div class="meanings-list">
                                ${meaningsHTML}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="modal-footer">
                        <button class="btn-close">
                            <i class="fas fa-times-circle"></i>
                            بستن
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    _attachModalListeners(modal, details) {
        // ✅ دکمه‌های بستن - با addEventListener به جای onclick
        const closeButtons = modal.querySelectorAll('.close-modal, .btn-close');
        const overlay = modal.querySelector('.modal-overlay');
        
        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                modal.remove();
            });
        });
        
        // بستن با کلیک روی overlay
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    modal.remove();
                }
            });
        }
        
        // بستن با کلید ESC
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        // دکمه علامت‌گذاری
        const markBtn = modal.querySelector('.mark-modal-btn');
        if (markBtn) {
            markBtn.addEventListener('click', () => {
                this.toggleWord(details.__vid);
                this.updateWordInGrid(details.__vid);
                
                // به‌روزرسانی دکمه در modal
                const isLearned = this.isWordLearned(details.__vid);
                markBtn.className = `mark-modal-btn ${isLearned ? 'learned' : ''}`;
                markBtn.innerHTML = `
                    <i class="fas ${isLearned ? 'fa-check-circle' : 'fa-bookmark'}"></i>
                    ${isLearned ? 'یادگرفته شده' : 'یاد بگیرم'}
                `;
            });
        }
        
        // دکمه‌های صوتی
        const audioBtns = modal.querySelectorAll('.audio-btn');
        audioBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.getAttribute('data-text');
                const accent = btn.getAttribute('data-accent');
                const speed = btn.getAttribute('data-speed');
                const type = btn.getAttribute('data-type');
                
                if (type === 'word') {
                    this.playWordAudio(text, accent, speed);
                } else {
                    this.playSentenceAudio(text, accent, speed);
                }
            });
        });
    }
    
    _escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br>');
    }
    
    updateWordInGrid(vid) {
        const card = document.querySelector(`[data-word-id="${vid}"]`);
        if (!card) return;
        
        const isLearned = this.isWordLearned(vid);
        const badge = card.querySelector('.badge.learned');
        const markBtn = card.querySelector('.mark-btn');
        
        if (isLearned) {
            if (!badge) {
                const statusDiv = card.querySelector('.word-status');
                const learnedBadge = document.createElement('span');
                learnedBadge.className = 'badge learned';
                learnedBadge.textContent = '✓ یادگرفته';
                statusDiv.prepend(learnedBadge);
            }
            if (markBtn) markBtn.textContent = 'تسلط یافتم';
        } else {
            if (badge) badge.remove();
            if (markBtn) markBtn.textContent = 'یاد گرفتم';
        }
    }

    /* ================= AUDIO PLAYBACK - سیستم ۶ لایه‌ای بهبود یافته ================= */
    
    playWordAudio(word, accent = 'us', speed = 'normal') {
        try {
            if (!word || typeof word !== 'string') {
                console.error('Invalid word for audio playback');
                return;
            }
            
            console.log(`🔊 Playing word: "${word}" (${accent}, ${speed})`);
            
            // متوقف کردن صداهای قبلی
            this._stopAllAudio();
            
            // استفاده از Web Speech API مستقیم
            this._playWithWebSpeech(word, accent, speed);
            
        } catch (error) {
            console.error('Error playing word audio:', error);
            this._showNotification('خطا در پخش صدا', 'error');
        }
    }
    
    playSentenceAudio(sentence, accent = 'us', speed = 'normal') {
        try {
            if (!sentence || typeof sentence !== 'string') {
                console.error('Invalid sentence for audio playback');
                return;
            }
            
            console.log(`🔊 Playing sentence: "${sentence}" (${accent}, ${speed})`);
            
            // متوقف کردن صداهای قبلی
            this._stopAllAudio();
            
            // استفاده از Web Speech API مستقیم
            this._playWithWebSpeech(sentence, accent, speed);
            
        } catch (error) {
            console.error('Error playing sentence audio:', error);
            this._showNotification('خطا در پخش صدا', 'error');
        }
    }
    
    /* ================= Web Speech API - روش اصلاح شده ================= */
    
    _playWithWebSpeech(text, accent, speed) {
        try {
            if (!('speechSynthesis' in window)) {
                console.error('Web Speech API not supported');
                this._showNotification('مرورگر شما از پخش صدا پشتیبانی نمی‌کند', 'error');
                return;
            }
            
            // توقف کامل speechSynthesis قبلی
            window.speechSynthesis.cancel();
            
            // تنظیم سرعت
            const speedRates = {
                'slow': 0.6,
                'normal': 1.0,
                'fast': 1.3
            };
            const rate = speedRates[speed] || 1.0;
            
            // ایجاد utterance جدید
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
            utterance.rate = rate;
            utterance.volume = 1.0;
            utterance.pitch = 1.0;
            
            // انتخاب voice مناسب
            const voices = window.speechSynthesis.getVoices();
            console.log(`📢 Available voices: ${voices.length}`);
            
            if (voices.length > 0) {
                let selectedVoice = null;
                
                // جستجوی voice بر اساس accent
                if (accent === 'uk') {
                    selectedVoice = voices.find(v => 
                        v.lang === 'en-GB' || v.lang.startsWith('en-GB')
                    );
                } else {
                    selectedVoice = voices.find(v => 
                        v.lang === 'en-US' || v.lang.startsWith('en-US')
                    );
                }
                
                // اگر voice خاصی پیدا نشد، اولین voice انگلیسی را انتخاب کن
                if (!selectedVoice) {
                    selectedVoice = voices.find(v => 
                        v.lang.startsWith('en')
                    );
                }
                
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                    console.log(`✅ Selected voice: ${selectedVoice.name} (${selectedVoice.lang})`);
                } else {
                    console.warn('⚠️ No suitable voice found, using default');
                }
            } else {
                console.warn('⚠️ No voices available yet, loading...');
                
                // تلاش برای بارگذاری voiceها
                window.speechSynthesis.getVoices();
                
                // صبر کمی و تلاش مجدد
                setTimeout(() => {
                    const voicesRetry = window.speechSynthesis.getVoices();
                    if (voicesRetry.length > 0) {
                        console.log(`✅ Voices loaded: ${voicesRetry.length}`);
                        // تلاش مجدد برای پخش
                        this._playWithWebSpeech(text, accent, speed);
                        return;
                    }
                }, 100);
            }
            
            // Event listeners
            utterance.onstart = () => {
                console.log('✅ Speech started');
                this.activeTTS = utterance;
                this._showAudioVisualizer(text);
            };
            
            utterance.onend = () => {
                console.log('✅ Speech ended');
                this.activeTTS = null;
                this._hideAudioVisualizer();
            };
            
            utterance.onerror = (event) => {
                console.error('❌ Speech error:', event.error);
                this.activeTTS = null;
                this._hideAudioVisualizer();
                
                // اگر خطای not-allowed بود، به کاربر اطلاع بده
                if (event.error === 'not-allowed') {
                    this._showNotification('لطفاً اجازه پخش صدا را به مرورگر بدهید', 'warning');
                } else if (event.error === 'network') {
                    this._showNotification('خطای شبکه در پخش صدا', 'error');
                } else {
                    this._showNotification('خطا در پخش صدا', 'error');
                }
            };
            
            // شروع پخش
            window.speechSynthesis.speak(utterance);
            
        } catch (error) {
            console.error('Error in _playWithWebSpeech:', error);
            this._showNotification('خطا در پخش صدا', 'error');
        }
    }
    
    /* ================= Audio Visualizer ================= */
    
    _showAudioVisualizer(text) {
        // حذف visualizer قبلی
        this._hideAudioVisualizer();
        
        const visualizer = document.createElement('div');
        visualizer.className = 'audio-visualizer active';
        visualizer.id = 'audio-visualizer';
        visualizer.innerHTML = `
            <div class="sound-wave">
                <div class="wave-bar"></div>
                <div class="wave-bar"></div>
                <div class="wave-bar"></div>
                <div class="wave-bar"></div>
                <div class="wave-bar"></div>
            </div>
            <div class="playing-text">
                <i class="fas fa-volume-up"></i>
                                <span>در حال پخش: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"</span>
            </div>
        `;
        
        document.body.appendChild(visualizer);
        
        // انیمیشن ظاهر شدن
        setTimeout(() => {
            visualizer.style.opacity = '1';
            visualizer.style.transform = 'translateY(0)';
        }, 10);
    }
    
    _hideAudioVisualizer() {
        const visualizer = document.getElementById('audio-visualizer');
        if (visualizer) {
            visualizer.style.opacity = '0';
            visualizer.style.transform = 'translateY(20px)';
            setTimeout(() => visualizer.remove(), 300);
        }
    }
    
    /* ================= Stop All Audio ================= */
    
    _stopAllAudio() {
        // توقف HTML Audio
        if (this.activeAudio) {
            try {
                this.activeAudio.pause();
                this.activeAudio.currentTime = 0;
            } catch (e) {
                console.warn('Error stopping audio:', e);
            }
            this.activeAudio = null;
        }
        
        // توقف Web Speech API
        if (this.activeTTS || window.speechSynthesis.speaking) {
            try {
                window.speechSynthesis.cancel();
            } catch (e) {
                console.warn('Error canceling speech:', e);
            }
            this.activeTTS = null;
        }
        
        // توقف AudioContext
        if (this.audioContext) {
            try {
                this.audioContext.close();
            } catch (e) {
                console.warn('Error closing audio context:', e);
            }
            this.audioContext = null;
        }
        
        // پاک کردن visualizer
        this._hideAudioVisualizer();
    }

    /* ================= LEARNING STATE ================= */
    
    isWordLearned(vid) {
        const lesson = this.lessonManager.getCurrentLesson();
        if (!lesson) return false;
        return this.lessonManager.userData
            ?.lessons?.[lesson.id]
            ?.vocabulary?.learned
            ?.includes(Number(vid)) || false;
    }
    
    toggleWord(vid) {
        const lesson = this.lessonManager.getCurrentLesson();
        if (!lesson) return;

        const lessonId = lesson.id;
        const data = this.lessonManager.userData;

        if (!data.lessons[lessonId]) {
            data.lessons[lessonId] = this.lessonManager.createLessonData();
        }

        const learned = data.lessons[lessonId].vocabulary.learned || [];
        const nVid = Number(vid);

        const i = learned.indexOf(nVid);
        i >= 0 ? learned.splice(i, 1) : learned.push(nVid);

        data.lessons[lessonId].vocabulary.learned = learned;
        this.lessonManager.saveUserData();
        
        // نمایش notification
        this._showNotification(
            i >= 0 ? 'کلمه از لیست یادگرفته‌ها حذف شد' : 'کلمه به لیست یادگرفته‌ها اضافه شد',
            i >= 0 ? 'info' : 'success'
        );
    }
    
    _showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `vocab-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }, 100);
    }

    /* ================= UTILITY METHODS ================= */
    
    startPractice() {
        const unlearnedWords = this.filteredWords.filter(word => 
            !this.isWordLearned(word.__vid)
        );
        
        if (unlearnedWords.length === 0) {
            this._showNotification('همه کلمات این بخش را یاد گرفته‌اید!', 'success');
            return;
        }
        
        console.log(`🎯 Starting practice with ${unlearnedWords.length} words`);
        
        // باز کردن modal تمرین
        const practiceModal = document.createElement('div');
        practiceModal.className = 'practice-modal';
        practiceModal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2><i class="fas fa-brain"></i> تمرین واژگان</h2>
                        <button class="close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="practice-info">
                            <p><i class="fas fa-info-circle"></i> ${unlearnedWords.length} کلمه برای تمرین موجود است</p>
                            <div class="practice-options">
                                <button class="practice-option" data-practice="flashcards">
                                    <i class="fas fa-layer-group"></i>
                                    <span>فلش کارت</span>
                                    <small>تمرین سریع با فلش کارت</small>
                                </button>
                                <button class="practice-option" data-practice="quiz">
                                    <i class="fas fa-question-circle"></i>
                                    <span>آزمون</span>
                                    <small>آزمون چهارگزینه‌ای</small>
                                </button>
                                <button class="practice-option" data-practice="spelling">
                                    <i class="fas fa-spell-check"></i>
                                    <span>املاء</span>
                                    <small>تمرین نوشتن کلمات</small>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(practiceModal);
        
        // اتصال event listeners
        const closeBtn = practiceModal.querySelector('.close-modal');
        const overlay = practiceModal.querySelector('.modal-overlay');
        
        closeBtn.addEventListener('click', () => practiceModal.remove());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) practiceModal.remove();
        });
        
        const practiceOptions = practiceModal.querySelectorAll('.practice-option');
        practiceOptions.forEach(option => {
            option.addEventListener('click', () => {
                const practiceType = option.getAttribute('data-practice');
                practiceModal.remove();
                
                switch (practiceType) {
                    case 'flashcards':
                        this._startFlashcards();
                        break;
                    case 'quiz':
                        this._startQuiz();
                        break;
                    case 'spelling':
                        this._startSpelling();
                        break;
                }
            });
        });
    }
    
    _startFlashcards() {
        console.log('🃏 Starting flashcards practice');
        this._showNotification('فلش کارت به زودی...', 'info');
    }
    
    _startQuiz() {
        console.log('📝 Starting quiz practice');
        this._showNotification('آزمون به زودی...', 'info');
    }
    
    _startSpelling() {
        console.log('✏️ Starting spelling practice');
        this._showNotification('تمرین املاء به زودی...', 'info');
    }
    
    clearCache() {
        this.audioCache.clear();
        this.sentenceCache.clear();
        console.log('🧹 Audio cache cleared');
        this._showNotification('کش صداها پاک شد', 'success');
    }
    
    // متدهای کمکی
    getLearnedCount() {
        const lesson = this.lessonManager.getCurrentLesson();
        if (!lesson || !this.lessonManager.userData) return 0;
        
        return this.lessonManager.userData
            ?.lessons?.[lesson.id]
            ?.vocabulary?.learned?.length || 0;
    }
    
    getTotalCount() {
        return this.words.length;
    }
    
    destroy() {
        console.log('🧹 Vocabulary module cleaned up');
        this._stopAllAudio();
        this.audioCache.clear();
        this.sentenceCache.clear();
    }
}