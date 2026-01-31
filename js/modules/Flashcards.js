// js/modules/Flashcards.js
export class Flashcards {
    constructor(lessonManager, audioManager) {
        this.lessonManager = lessonManager;
        this.audioManager = audioManager;

        this.cards = [];
        this.currentIndex = 0;
        this.isFlipped = false;
        this.useRandomMode = true;
        this.cardsPerSession = 15;

        this.userProgress = this.loadProgress();
        this.audioElements = new Map();
        this.allVocabWords = [];
        this.currentSessionId = this.generateSessionId();
    }

    async render() {
        await this.loadCards();

        if (this.cards.length === 0) {
            return '<div class="no-cards">فلش‌کارتی برای این درس یافت نشد</div>';
        }

        const currentCard = this.cards[this.currentIndex];

        const frontWord = currentCard?.front?.word ?? '';
        const frontPhonetic = currentCard?.front?.phonetic ?? '';
        const frontHint = currentCard?.front?.hint ?? '';

        const backMeaning = currentCard?.back?.meaning ?? '';
        const backSimpleDefinition = currentCard?.back?.simpleDefinition ?? '';

        const exSentence = currentCard?.back?.example?.sentence ?? '';
        const exTranslation = currentCard?.back?.example?.translation ?? '';

        const img = currentCard?.extras?.image ?? '';
        const collocation = currentCard?.extras?.collocation ?? '';
        const commonMistake = currentCard?.extras?.commonMistake ?? '';

        const level = currentCard?.learningControl?.level ?? 'A1';
        const difficulty = Number(currentCard?.learningControl?.difficulty ?? 1);

        return `
            <div class="flashcards-section">
                <div class="flashcards-header">
                    <h3 class="text-gradient"><i class="fas fa-layer-group"></i> فلش‌کارت‌ها</h3>
                    <div class="flashcards-stats">
                        <span class="card-counter">${this.currentIndex + 1}/${this.cards.length}</span>
                        <button class="btn-mode btn-gradient" onclick="app.flashcards.toggleRandomMode()" 
                                title="${this.useRandomMode ? 'حالت تصادفی فعال' : 'حالت عادی'}">
                            <i class="fas ${this.useRandomMode ? 'fa-random' : 'fa-list'}"></i>
                        </button>
                        <button class="btn-settings btn-gradient" onclick="app.flashcards.showSettings()">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                </div>

                ${this.useRandomMode ? `
                    <div class="session-info">
                        <span class="session-badge">
                            <i class="fas fa-dice"></i> جلسه تصادفی #${this.currentSessionId}
                        </span>
                        <span class="session-stats">
                            ${this.cards.length} کارت از ${this.allVocabWords.length} لغت
                        </span>
                    </div>
                ` : ''}

                <div class="flashcards-container">
                    <div class="flashcard-wrapper" onclick="app.flashcards.handleCardClick(event)">
                        <div class="flashcard ${this.isFlipped ? 'flipped' : ''}" id="main-flashcard">
                            <div class="flashcard-front">
                                <div class="card-content">
                                    ${img ? `
                                        <div class="card-image">
                                            <img src="${img}" alt="${frontWord}" onerror="this.style.display='none'">
                                        </div>
                                    ` : ''}

                                    <div class="card-main">
                                        <h2 class="card-word">${frontWord}</h2>
                                        ${frontPhonetic ? `<div class="card-phonetic">${frontPhonetic}</div>` : ''}
                                        ${frontHint ? `<div class="card-hint">${frontHint}</div>` : ''}
                                    </div>

                                    <div class="card-audio-front">
                                        <button class="audio-btn us" onclick="event.stopPropagation(); app.flashcards.playFrontAudio('us')">
                                            <i class="fas fa-volume-up"></i> 🇺🇸
                                        </button>
                                        <button class="audio-btn uk" onclick="event.stopPropagation(); app.flashcards.playFrontAudio('uk')">
                                            <i class="fas fa-volume-up"></i> 🇬🇧
                                        </button>
                                    </div>

                                    <div class="card-instruction">
                                        <i class="fas fa-hand-point-up"></i> برای دیدن معنی کلیک کنید
                                    </div>
                                </div>
                            </div>

                            <div class="flashcard-back">
                                <div class="card-content">
                                    <div class="card-main">
                                        ${backMeaning ? `<h3 class="card-meaning">${backMeaning}</h3>` : `<h3 class="card-meaning">—</h3>`}
                                        ${backSimpleDefinition ? `<div class="card-definition" style="direction: ltr; text-align: left;">${backSimpleDefinition}</div>` : ''}

                                        ${exSentence ? `
                                            <div class="card-example">
                                                <div class="card-example-header">
                                                    <h4><i class="fas fa-quote-left"></i> مثال:</h4>
                                                </div>
                                                
                                                <div class="card-audio-example">
                                                    <button class="audio-btn-example" onclick="event.stopPropagation(); app.flashcards.playExampleAudio('us')">
                                                        <i class="fas fa-volume-up"></i>
                                                        <span>🇺🇸 US</span>
                                                    </button>
                                                    <button class="audio-btn-example" onclick="event.stopPropagation(); app.flashcards.playExampleAudio('uk')">
                                                        <i class="fas fa-volume-up"></i>
                                                        <span>🇬🇧 UK</span>
                                                    </button>
                                                </div>
                                                
                                                <div class="card-example-content">
                                                    <p class="example-sentence" style="direction: ltr; text-align: left; unicode-bidi: embed;">${exSentence}</p>
                                                    ${exTranslation ? `<p class="example-translation">${exTranslation}</p>` : ''}
                                                </div>
                                            </div>
                                        ` : ''}

                                        ${collocation ? `
                                            <div class="card-collocation">
                                                <h4><i class="fas fa-link"></i> هم‌آیی:</h4>
                                                <span class="collocation-text" style="direction: ltr; display: inline-block;">${collocation}</span>
                                            </div>
                                        ` : ''}

                                        ${commonMistake ? `
                                            <div class="card-tip">
                                                <h4><i class="fas fa-lightbulb"></i> نکته:</h4>
                                                <p>${commonMistake}</p>
                                            </div>
                                        ` : ''}

                                        <div class="card-level">
                                            <span class="level-badge level-${String(level).toLowerCase()}">
                                                ${level}
                                            </span>
                                            <span class="difficulty">
                                                سختی: ${'★'.repeat(Math.max(1, Math.min(5, difficulty)))}
                                            </span>
                                        </div>
                                    </div>

                                    <div class="card-instruction back">
                                        <i class="fas fa-hand-point-up"></i> برای بازگشت کلیک کنید
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flashcards-controls">
                        <button class="control-btn prev" onclick="app.flashcards.prevCard()">
                            <i class="fas fa-chevron-right"></i> قبلی
                        </button>

                        <div class="main-controls">
                            <button class="control-btn flip" onclick="app.flashcards.flipCard()">
                                <i class="fas fa-sync-alt"></i> برگرداندن
                            </button>

                            <button class="control-btn mark" onclick="app.flashcards.markAsLearned()">
                                <i class="fas fa-check"></i> بلدم
                            </button>
                        </div>

                        <button class="control-btn next" onclick="app.flashcards.nextCard()">
                            بعدی <i class="fas fa-chevron-left"></i>
                        </button>
                    </div>

                    <div class="flashcards-extra">
                        <button class="extra-btn shuffle" onclick="app.flashcards.shuffleCards()">
                            <i class="fas fa-random"></i> تصادفی
                        </button>
                        <button class="extra-btn new-session" onclick="app.flashcards.startNewRandomSession()">
                            <i class="fas fa-plus"></i> جلسه جدید
                        </button>
                        <button class="extra-btn restart" onclick="app.flashcards.restartDeck()">
                            <i class="fas fa-redo"></i> از ابتدا
                        </button>
                    </div>
                </div>

                <div class="progress-info">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${this.getProgressPercent()}%"></div>
                    </div>
                    <div class="progress-text">
                        ${this.getMasteredCount()} از ${this.cards.length} کارت را یاد گرفته‌اید
                    </div>
                </div>
            </div>
        `;
    }

    handleCardClick(event) {
        if (!event.target.closest('button')) {
            this.flipCard();
        }
    }

    toggleRandomMode() {
        this.useRandomMode = !this.useRandomMode;
        this.currentSessionId = this.generateSessionId();
        this.loadCards().then(() => {
            this.updateDisplay();
            console.log(`حالت ${this.useRandomMode ? 'تصادفی' : 'عادی'} فعال شد`);
        });
    }

    startNewRandomSession() {
        this.currentSessionId = this.generateSessionId();
        this.loadCards().then(() => {
            this.updateDisplay();
            console.log(`جلسه تصادفی جدید شروع شد: #${this.currentSessionId}`);
        });
    }

    generateSessionId() {
        return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    }

    getRandomCards(words, count) {
        if (words.length <= count) return [...words];
        
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    async loadAllVocabWords() {
        try {
            const response = await fetch('data/lesson1/vocab.json');
            const vocabData = await response.json();
            
            let allWords = [];
            
            if (Array.isArray(vocabData)) {
                allWords = vocabData;
            } else if (vocabData.words && Array.isArray(vocabData.words)) {
                allWords = vocabData.words;
            } else if (vocabData.vocabulary && Array.isArray(vocabData.vocabulary)) {
                allWords = vocabData.vocabulary;
            }
            
            console.log(`📚 ${allWords.length} لغت از vocab.json بارگذاری شد`);
            return allWords;
            
        } catch (error) {
            console.warn('خطا در بارگذاری vocab.json، استفاده از flashcards.json:', error);
            
            try {
                const response = await fetch('data/flashcards/all-flashcards.json');
                const flashcardData = await response.json();
                
                let cards = [];
                if (Array.isArray(flashcardData)) {
                    cards = flashcardData;
                } else if (flashcardData.flashcards && Array.isArray(flashcardData.flashcards)) {
                    cards = flashcardData.flashcards;
                }
                
                console.log(`📚 ${cards.length} کارت از flashcards.json بارگذاری شد`);
                return cards.map(card => ({
                    word: card.word,
                    persian: { main: card.persianMeaning, short: card.persianMeaning },
                    phonetic: { us: card.phonetic, uk: card.phonetic },
                    meanings: [{
                        example: {
                            sentence: card.example,
                            translation: card.exampleTranslation
                        }
                    }]
                }));
                
            } catch (fallbackError) {
                console.error('❌ خطا در بارگذاری همه منابع:', fallbackError);
                return [];
            }
        }
    }

    async loadCards() {
        try {
            const lesson = this.lessonManager?.getCurrentLesson?.() ?? null;

            if (this.allVocabWords.length === 0) {
                this.allVocabWords = await this.loadAllVocabWords();
            }

            if (this.allVocabWords.length === 0) {
                this.cards = [];
                return;
            }

            let selectedWords = [];

            if (this.useRandomMode) {
                selectedWords = this.getRandomCards(this.allVocabWords, this.cardsPerSession);
                console.log(`🎲 حالت تصادفی: ${selectedWords.length} کارت انتخاب شد`);
                
                this.cards = selectedWords
                    .map((word, index) => this.normalizeCard(word, lesson, index))
                    .filter(Boolean);
                    
                if (this.cards.length > 0) {
                    this.shuffleCardsWithoutUpdate();
                }
                
            } else {
                try {
                    const response = await fetch('data/flashcards/all-flashcards.json');
                    const rawData = await response.json();

                    const rawCards = Array.isArray(rawData)
                        ? rawData
                        : (Array.isArray(rawData?.flashcards) ? rawData.flashcards : []);

                    let filtered = rawCards;
                    if (lesson && rawCards.some(c => c && typeof c === 'object' && 'lessonId' in c)) {
                        filtered = rawCards.filter(card => card.lessonId === lesson.id);
                    }

                    selectedWords = filtered.map(card => ({
                        word: card.word,
                        persian: { main: card.persianMeaning, short: card.persianMeaning },
                        phonetic: { us: card.phonetic, uk: card.phonetic },
                        meanings: [{
                            example: {
                                sentence: card.example,
                                translation: card.exampleTranslation
                            }
                        }],
                        level: this.mapDifficultyToLevel(card.difficulty)
                    }));
                    
                    console.log(`📖 حالت عادی: ${selectedWords.length} کارت از flashcards.json`);
                    
                    this.cards = selectedWords
                        .map((word, index) => this.normalizeCard(word, lesson, index))
                        .filter(Boolean);
                        
                    this.sortCardsByProgress();
                } catch (error) {
                    console.warn('خطا در بارگذاری flashcards.json، استفاده از حالت تصادفی:', error);
                    this.useRandomMode = true;
                    selectedWords = this.getRandomCards(this.allVocabWords, this.cardsPerSession);
                    this.cards = selectedWords
                        .map((word, index) => this.normalizeCard(word, lesson, index))
                        .filter(Boolean);
                    if (this.cards.length > 0) {
                        this.shuffleCardsWithoutUpdate();
                    }
                }
            }

            this.preloadCurrentAudio();

        } catch (error) {
            console.error('❌ خطا در بارگذاری فلش‌کارت‌ها:', error);
            this.cards = [];
        }
    }

    shuffleCardsWithoutUpdate() {
        if (this.cards.length === 0) return;

        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }

        this.currentIndex = 0;
        this.isFlipped = false;
    }

    normalizeCard(word, lesson, index) {
        if (!word || typeof word !== 'object') return null;

        if (word.word && word.persian) {
            const cardId = word.id || `card_${this.useRandomMode ? 'rand_' : ''}${index + 1}`;
            const firstMeaning = word.meanings?.[0] || {};
            const example = firstMeaning.example || {};

            return {
                lessonId: lesson?.id || 'lesson1',
                cardId: cardId,

                front: {
                    word: word.word,
                    phonetic: word.phonetic?.us || word.phonetic?.uk || '',
                    hint: '',
                    audio: word.audio || null
                },

                back: {
                    meaning: word.persian.main || word.persian.short || '',
                    simpleDefinition: firstMeaning.definition?.simple || '',
                    example: {
                        sentence: example.sentence || '',
                        translation: example.translation || ''
                    }
                },

                extras: {
                    image: '',
                    collocation: '',
                    commonMistake: ''
                },

                learningControl: {
                    level: word.level || 'A1',
                    difficulty: this.mapLevelToDifficulty(word.level)
                }
            };
        }

        return {
            lessonId: word.lessonId ?? lesson?.id ?? null,
            cardId: word.id || `card_${index + 1}`,

            front: {
                word: word.word ?? '',
                phonetic: word.phonetic ?? '',
                hint: word.hint ?? '',
                audio: word.audio ?? null
            },

            back: {
                meaning: word.persianMeaning ?? word.meaning ?? '',
                simpleDefinition: word.simpleDefinition ?? '',
                example: {
                    sentence: word.example ?? '',
                    translation: word.exampleTranslation ?? ''
                }
            },

            extras: {
                image: word.image ?? '',
                collocation: word.collocation ?? '',
                commonMistake: word.commonMistake ?? ''
            },

            learningControl: {
                level: word.level ?? 'A1',
                difficulty: Number(word.difficulty === 'easy' ? 1 : word.difficulty === 'medium' ? 3 : 5)
            }
        };
    }

    mapDifficultyToLevel(difficulty) {
        const map = {
            'easy': 'A1',
            'medium': 'B1',
            'hard': 'C1'
        };
        return map[difficulty] || 'A1';
    }

    mapLevelToDifficulty(level) {
        const map = {
            'A1': 1, 'A2': 1,
            'B1': 3, 'B2': 3,
            'C1': 5, 'C2': 5
        };
        return map[level] || 1;
    }

    sortCardsByProgress() {
        this.cards.sort((a, b) => {
            const progressA = this.userProgress[a.cardId]?.mastery || 0;
            const progressB = this.userProgress[b.cardId]?.mastery || 0;
            return progressA - progressB;
        });
    }

    flipCard() {
        const card = document.getElementById('main-flashcard');
        if (card) {
            this.isFlipped = !this.isFlipped;
            card.classList.toggle('flipped');
        }
    }

    nextCard() {
        if (this.cards.length === 0) return;

        this.isFlipped = false;
        this.currentIndex = (this.currentIndex + 1) % this.cards.length;
        this.updateDisplay();
        this.saveProgress();
        
        this.preloadCurrentAudio();
    }

    prevCard() {
        if (this.cards.length === 0) return;

        this.isFlipped = false;
        this.currentIndex = (this.currentIndex - 1 + this.cards.length) % this.cards.length;
        this.updateDisplay();
        this.saveProgress();
        
        this.preloadCurrentAudio();
    }

    shuffleCards() {
        if (this.cards.length === 0) return;

        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }

        this.currentIndex = 0;
        this.isFlipped = false;
        this.updateDisplay();
        
        this.preloadCurrentAudio();
    }

    restartDeck() {
        this.currentIndex = 0;
        this.isFlipped = false;
        this.updateDisplay();
        
        this.preloadCurrentAudio();
    }

    markAsLearned() {
        const currentCard = this.cards[this.currentIndex];
        if (!currentCard) return;

        if (!this.userProgress[currentCard.cardId]) {
            this.userProgress[currentCard.cardId] = {
                mastery: 100,
                lastReviewed: new Date().toISOString(),
                reviewCount: 1,
                sessionId: this.currentSessionId
            };
        } else {
            this.userProgress[currentCard.cardId].mastery = Math.min(
                (this.userProgress[currentCard.cardId].mastery || 0) + 20,
                100
            );
            this.userProgress[currentCard.cardId].lastReviewed = new Date().toISOString();
            this.userProgress[currentCard.cardId].reviewCount = (this.userProgress[currentCard.cardId].reviewCount || 0) + 1;
            this.userProgress[currentCard.cardId].sessionId = this.currentSessionId;
        }

        this.saveProgress();
        this.nextCard();
    }

    async playFrontAudio(accent = 'us') {
        const currentCard = this.cards[this.currentIndex];
        if (!currentCard || !currentCard.front?.word) {
            console.warn('❌ کارت یا کلمه‌ای برای پخش وجود ندارد');
            return;
        }

        const word = currentCard.front.word;
        console.log(`🎵 تلاش برای پخش تلفظ: ${word} (${accent})`);

        this.stopAllAudio();

        if (this.audioManager && typeof this.audioManager.playAudio === 'function') {
            try {
                const success = await this.audioManager.playAudio(word, accent);
                if (success) {
                    console.log(`✅ صدا توسط audioManager پخش شد`);
                    return;
                }
            } catch (error) {
                console.warn('⚠️ audioManager.playAudio شکست خورد:', error);
            }
        }

        if (currentCard.front.audio) {
            let audioUrl = this.extractAudioUrl(currentCard.front.audio, accent);
            
            if (audioUrl) {
                console.log(`🔊 پخش از URL مستقیم: ${audioUrl}`);
                const success = await this.playDirectAudio(audioUrl);
                if (success) return;
            }
        }

        const standardUrl = this.getStandardAudioPath(word, accent);
        if (standardUrl) {
            console.log(`🔊 تلاش پخش از مسیر استاندارد: ${standardUrl}`);
            const success = await this.playDirectAudio(standardUrl);
            if (success) return;
        }

        if ('speechSynthesis' in window) {
            console.log(`🗣️ استفاده از TTS مرورگر`);
            this.playViaTTS(word, accent);
            return;
        }

        console.error('❌ هیچ روشی برای پخش صدا کار نکرد');
        this.showAudioErrorNotification(word);
    }

    extractAudioUrl(audioData, accent) {
        if (!audioData) return null;
        
        if (typeof audioData === 'string') {
            return audioData;
        }
        
        if (typeof audioData === 'object') {
            const keyVariations = [
                accent,
                accent === 'uk' ? 'british' : 'american',
                accent === 'uk' ? 'uk' : 'us',
                'us',
                'uk',
                'american',
                'british',
                'default',
                'audio'
            ];
            
            for (const key of keyVariations) {
                if (audioData[key] && typeof audioData[key] === 'string') {
                    return audioData[key];
                }
            }
            
            const firstKey = Object.keys(audioData)[0];
            if (firstKey && typeof audioData[firstKey] === 'string') {
                return audioData[firstKey];
            }
        }
        
        return null;
    }

    getStandardAudioPath(word, accent) {
        const basePaths = ['audio', 'audio/vocab', 'audio/words', 'sounds', 'media/audio'];
        const extensions = ['.mp3', '.ogg', '.wav'];
        const accentFolder = accent === 'uk' ? 'uk' : 'us';
        
        const possiblePaths = [];
        
        for (const base of basePaths) {
            for (const ext of extensions) {
                possiblePaths.push(`/${base}/${accentFolder}/${word}${ext}`);
                possiblePaths.push(`/${base}/${word}-${accent}${ext}`);
                possiblePaths.push(`/${base}/${word}_${accent}${ext}`);
                possiblePaths.push(`/${base}/${word}${ext}`);
            }
        }
        
        return possiblePaths[0];
    }

    async playDirectAudio(audioUrl) {
        return new Promise((resolve) => {
            try {
                const cacheKey = `audio_${audioUrl}`;
                let audio = this.audioElements.get(cacheKey);
                
                if (!audio) {
                    audio = new Audio();
                    audio.src = audioUrl;
                    audio.preload = 'auto';
                    audio.load();
                    this.audioElements.set(cacheKey, audio);
                }
                
                audio.oncanplaythrough = () => {
                    audio.play()
                        .then(() => {
                            console.log('✅ صدا با موفقیت پخش شد');
                            resolve(true);
                        })
                        .catch(error => {
                            console.error('❌ خطا در پخش مستقیم:', error);
                            resolve(false);
                        });
                };
                
                audio.onerror = (error) => {
                    console.error('❌ خطای Audio element:', error);
                    this.audioElements.delete(cacheKey);
                    resolve(false);
                };
                
                if (audio.readyState >= 3) {
                    audio.play()
                        .then(() => {
                            console.log('✅ صدا از کش پخش شد');
                            resolve(true);
                        })
                        .catch(() => resolve(false));
                }
                
                setTimeout(() => {
                    if (audio.readyState < 3) {
                        console.warn('⚠️ تایم‌اوت بارگذاری صدا');
                        resolve(false);
                    }
                }, 3000);
                
            } catch (error) {
                console.error('❌ خطا در playDirectAudio:', error);
                resolve(false);
            }
        });
    }

    playViaTTS(word, accent = 'us') {
        if (!('speechSynthesis' in window)) {
            console.error('❌ TTS پشتیبانی نمی‌شود');
            return false;
        }
        
        speechSynthesis.cancel();
        
        setTimeout(() => {
            const voices = speechSynthesis.getVoices();
            
            if (voices.length === 0) {
                console.log('🕒 صبر برای بارگذاری voices...');
                setTimeout(() => this.playViaTTS(word, accent), 500);
                return;
            }
            
            const utterance = new SpeechSynthesisUtterance(word);
            
            let selectedVoice = null;
            let voiceDetails = '';
            
            if (accent === 'uk') {
                const ukVoices = voices.filter(v => 
                    v.lang === 'en-GB' ||
                    v.lang.startsWith('en-GB') ||
                    v.name.toLowerCase().includes('british') ||
                    v.name.toLowerCase().includes('united kingdom') ||
                    v.name.toLowerCase().includes('england') ||
                    v.name.includes('UK') ||
                    v.name.includes('GB')
                );
                
                if (ukVoices.length > 0) {
                    selectedVoice = ukVoices[0];
                    voiceDetails = `🇬🇧 British (${selectedVoice.name})`;
                    utterance.lang = 'en-GB';
                } else {
                    utterance.lang = 'en-GB';
                    voiceDetails = '🇬🇧 British (زبان تنظیم شد)';
                }
            } else {
                const usVoices = voices.filter(v => 
                    v.lang === 'en-US' ||
                    v.lang.startsWith('en-US') ||
                    v.name.toLowerCase().includes('american') ||
                    v.name.toLowerCase().includes('united states') ||
                    v.name.toLowerCase().includes('usa') ||
                    v.name.includes('US') ||
                    v.name.includes('America')
                );
                
                if (usVoices.length > 0) {
                    selectedVoice = usVoices[0];
                    voiceDetails = `🇺🇸 American (${selectedVoice.name})`;
                    utterance.lang = 'en-US';
                } else {
                    utterance.lang = 'en-US';
                    voiceDetails = '🇺🇸 American (زبان تنظیم شد)';
                }
            }
            
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
            
            if (accent === 'uk') {
                utterance.rate = 0.75;
                utterance.pitch = 0.9;
                utterance.volume = 1.0;
            } else {
                utterance.rate = 0.85;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
            }
            
            this.highlightPlayingButton(accent, voiceDetails);
            
            utterance.onstart = () => {
                console.log(`✅ TTS شروع شد: ${word} (${voiceDetails})`);
            };
            
            utterance.onend = () => {
                console.log(`✅ TTS پایان یافت: ${word}`);
                this.resetButtonColors();
            };
            
            utterance.onerror = (event) => {
                console.error(`❌ خطای TTS:`, event.error);
                this.resetButtonColors();
                this.showAudioErrorNotification(`خطا در پخش ${accent.toUpperCase()}`);
            };
            
            speechSynthesis.speak(utterance);
            
        }, 150);
        
        return true;
    }

    highlightPlayingButton(accent, voiceDetails = '') {
        const buttons = document.querySelectorAll('.audio-btn, .audio-btn-example');
        const icon = accent === 'uk' ? '🇬🇧' : '🇺🇸';
        const accentText = accent === 'uk' ? 'British' : 'American';
        
        buttons.forEach(btn => {
            if (btn.classList.contains(accent) || 
                (accent === 'us' && (btn.classList.contains('us') || btn.textContent.includes('🇺🇸'))) ||
                (accent === 'uk' && (btn.classList.contains('uk') || btn.textContent.includes('🇬🇧')))) {
                
                btn.style.backgroundColor = accent === 'uk' ? '#2196F3' : '#4CAF50';
                btn.style.color = 'white';
                btn.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
                btn.style.transform = 'scale(1.05)';
                btn.style.transition = 'all 0.3s ease';
                
                if (btn.classList.contains('audio-btn-example')) {
                    btn.innerHTML = `<i class="fas fa-volume-up fa-spin"></i> <span>${icon} در حال پخش...</span>`;
                } else {
                    btn.innerHTML = `<i class="fas fa-volume-up fa-spin"></i> ${icon} در حال پخش...`;
                }
                btn.title = `لهجه ${accentText} در حال پخش${voiceDetails ? ': ' + voiceDetails : ''}`;
            }
        });
    }

    resetButtonColors() {
        const buttons = document.querySelectorAll('.audio-btn, .audio-btn-example');
        buttons.forEach(btn => {
            btn.style.backgroundColor = '';
            btn.style.color = '';
            btn.style.boxShadow = '';
            btn.style.transform = '';
            btn.style.transition = '';
            
            if (btn.classList.contains('us') || btn.textContent.includes('🇺🇸')) {
                if (btn.classList.contains('audio-btn-example')) {
                    btn.innerHTML = `<i class="fas fa-volume-up"></i> <span>🇺🇸 US</span>`;
                } else {
                    btn.innerHTML = `<i class="fas fa-volume-up"></i> 🇺🇸`;
                }
                btn.title = 'تلفظ آمریکایی';
            } else if (btn.classList.contains('uk') || btn.textContent.includes('🇬🇧')) {
                if (btn.classList.contains('audio-btn-example')) {
                    btn.innerHTML = `<i class="fas fa-volume-up"></i> <span>🇬🇧 UK</span>`;
                } else {
                    btn.innerHTML = `<i class="fas fa-volume-up"></i> 🇬🇧`;
                }
                btn.title = 'تلفظ بریتیش';
            }
        });
    }

    playExampleAudio(accent = 'us') {
        const currentCard = this.cards[this.currentIndex];
        if (!currentCard || !currentCard.back?.example?.sentence) {
            console.warn('❌ هیچ مثالی برای پخش وجود ندارد');
            return;
        }

        const sentence = currentCard.back.example.sentence;
        console.log(`🎵 تلاش برای پخش مثال: ${sentence} (${accent})`);

        this.stopAllAudio();

        if (currentCard.back.example.audio) {
            const audioUrl = this.extractAudioUrl(currentCard.back.example.audio, accent);
            if (audioUrl) {
                this.playDirectAudio(audioUrl);
                return;
            }
        }

        if ('speechSynthesis' in window) {
            this.playViaTTS(sentence, accent);
            return;
        }

        console.error('❌ نتوانست مثال را پخش کند');
    }

    preloadCurrentAudio() {
        const currentCard = this.cards[this.currentIndex];
        if (!currentCard) return;

        ['us', 'uk'].forEach(accent => {
            if (currentCard.front.audio) {
                const audioUrl = this.extractAudioUrl(currentCard.front.audio, accent);
                if (audioUrl) {
                    this.preloadAudio(audioUrl);
                }
            }
        });
    }

    preloadAudio(url) {
        if (!url) return;
        
        const cacheKey = `preload_${url}`;
        if (this.audioElements.has(cacheKey)) return;
        
        try {
            const audio = new Audio();
            audio.src = url;
            audio.preload = 'auto';
            audio.load();
            
            this.audioElements.set(cacheKey, audio);
            
            audio.addEventListener('canplaythrough', () => {
                console.log(`✅ پیش‌لود صدا آماده: ${url}`);
            }, { once: true });
            
            audio.addEventListener('error', () => {
                console.warn(`⚠️ پیش‌لود صدا شکست خورد: ${url}`);
                this.audioElements.delete(cacheKey);
            }, { once: true });
            
        } catch (error) {
            console.warn('⚠️ خطا در پیش‌لود:', error);
        }
    }

    stopAllAudio() {
        this.audioElements.forEach(audio => {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (error) {}
        });
        
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
    }

    showAudioErrorNotification(word) {
        const notification = document.createElement('div');
        notification.className = 'audio-error-notification';
        notification.innerHTML = `
            <i class="fas fa-volume-mute"></i>
            <span>نتوانستم تلفظ "${word}" را پخش کنم</span>
            <button onclick="this.parentElement.remove()">✕</button>
        `;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('flashcards_progress');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    }

    saveProgress() {
        try {
            localStorage.setItem('flashcards_progress', JSON.stringify(this.userProgress));
        } catch (error) {
            console.error('خطا در ذخیره پیشرفت:', error);
        }
    }

    getProgressPercent() {
        if (this.cards.length === 0) return 0;

        const totalMastery = Object.values(this.userProgress).reduce((sum, prog) => sum + (prog.mastery || 0), 0);
        const maxMastery = this.cards.length * 100;
        return Math.round((totalMastery / maxMastery) * 100);
    }

    getMasteredCount() {
        return Object.values(this.userProgress).filter(prog => (prog.mastery || 0) >= 80).length;
    }

    updateDisplay() {
        const container = document.querySelector('.section-content');
        if (container) {
            this.render().then(html => {
                container.innerHTML = html;
            });
        }
    }

    showSettings() {
        console.log('تنظیمات فلش‌کارت');
    }

    cleanup() {
        this.stopAllAudio();
        this.audioElements.clear();
    }
}
