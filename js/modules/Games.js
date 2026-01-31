// js/modules/Games.js - نسخه اصلاح شده کامل
export class Games {
    constructor(app) {
        console.log("🎮 Games Module Created - نسخه بهبود یافته");
        this.app = app;
        this.allVocabWords = [];
        this.generatedGames = [];
        this.availableGames = [];
        this.container = null;
        this.activeGame = null;
        this.currentGame = null;
        
        this.gameState = {
            score: 0,
            cards: [],
            flippedCards: [],
            matchedPairs: 0,
            scrambleWord: null,
            userAnswer: [],
            currentGameId: null,
            currentWordIndex: 0 // 🔥 اضافه شد
        };
        
        this.settings = {
            randomMode: true,
            maxMemoryPairs: 6, // 🔥 کاهش از 8 به 6
            maxScrambleWords: 5,
            useExamples: true
        };
    }

    async init(data) {
        console.log("✅ Games: Initializing with data:", data ? "Yes" : "No");
        
        if (data && data.games) {
            console.log("📂 Games: Using provided games data");
            this.gamesData = { games: data.games };
        } else {
            await this._loadGamesConfig();
        }
        
        await this._loadAllVocabWords();
        await this._generateRandomGames();
        this._regenerateAvailableGames();
        
        console.log(`🎲 Games: Ready! ${this.availableGames.length} games available`);
    }

    render() {
        console.log("🎨 Games: render() called");
        
        if (this.activeGame && this.currentGame) {
            console.log("🔄 Games: Rendering active game:", this.currentGame.title);
            return this._getGameHtml();
        }
        
        console.log("🏠 Games: Rendering menu");
        return this._getMenuHtml();
    }

    _getMenuHtml() {
        console.log("📋 Games: Building menu HTML");
        
        if (!this.availableGames || this.availableGames.length === 0) {
            console.warn("⚠️ Games: No games available, showing fallback");
            return `
                <div class="games-menu animate__animated animate__fadeIn">
                    <div class="game-intro">
                        <h3>اتاق بازی و سرگرمی 🎮</h3>
                        <p>در حال آماده‌سازی بازی‌ها...</p>
                        <button class="btn-retry" onclick="app.games.retryLoading()">
                            <i class="fas fa-redo"></i> تلاش مجدد
                        </button>
                    </div>
                </div>
            `;
        }
        
        const memoryGames = this.availableGames.filter(g => g.type === 'memory');
        const scrambleGames = this.availableGames.filter(g => g.type === 'scramble');
        
        console.log(`📊 Games: Menu stats - Memory: ${memoryGames.length}, Scramble: ${scrambleGames.length}`);
        
        return `
            <div class="games-menu animate__animated animate__fadeIn">
                <div class="game-intro">
                    <h3>اتاق بازی و سرگرمی 🎮</h3>
                    <p>${this.availableGames.length} بازی آماده</p>
                    <div class="mode-toggle">
                        <button class="btn-mode ${this.settings.randomMode ? 'active' : ''}" onclick="app.games.toggleRandomMode()">
                            <i class="fas ${this.settings.randomMode ? 'fa-random' : 'fa-list'}"></i>
                            ${this.settings.randomMode ? 'حالت تصادفی' : 'حالت عادی'}
                        </button>
                        <button class="btn-refresh" onclick="app.games.regenerateRandomGames()">
                            <i class="fas fa-sync-alt"></i> بازی‌های جدید
                        </button>
                    </div>
                </div>

                ${this.generatedGames.length > 0 ? `
                <div class="game-category">
                    <h4><i class="fas fa-dice"></i> بازی‌های تصادفی (هر بار جدید!)</h4>
                    <div class="games-grid">
                        ${this._renderGameCards(this.generatedGames)}
                    </div>
                </div>
                ` : ''}

                ${memoryGames.length > 0 ? `
                <div class="game-category">
                    <h4><i class="fas fa-brain"></i> بازی حافظه</h4>
                    <div class="games-grid">
                        ${this._renderGameCards(memoryGames)}
                    </div>
                </div>
                ` : ''}

                ${scrambleGames.length > 0 ? `
                <div class="game-category">
                    <h4><i class="fas fa-sort-alpha-down"></i> مرتب‌سازی</h4>
                    <div class="games-grid">
                        ${this._renderGameCards(scrambleGames)}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    _renderGameCards(games) {
        console.log(`🃏 Games: Rendering ${games.length} game cards`);
        
        return games.map((game, index) => {
            const icon = game.type === 'memory' ? '🧠' : '🔤';
            const typeText = game.type === 'memory' ? 'حافظه' : 'مرتب‌سازی';
            const isRandom = game.id && (game.id.startsWith('random_') || game.isRandom);
            const itemCount = game.type === 'memory' ? 
                (game.pairs?.length || 0) : 
                (game.items?.length || 0);
            
            return `
                <div class="game-select-card ${isRandom ? 'random-card' : ''}" 
                     data-game-id="${game.id}"
                     onclick="app.games.launchGameById('${game.id}')">
                    <div class="card-icon ${game.type === 'memory' ? 'memory-icon' : 'word-icon'}">
                        ${icon}${isRandom ? '🎲' : ''}
                    </div>
                    <div class="card-info">
                        <h4>${game.title}</h4>
                        <span>${typeText} • ${itemCount} ${game.type === 'memory' ? 'جفت' : 'کلمه'}</span>
                        ${isRandom ? '<small><i class="fas fa-sync-alt"></i> تصادفی</small>' : ''}
                    </div>
                    <div class="arrow">❮</div>
                </div>
            `;
        }).join('');
    }

    _getGameHtml() {
        if (!this.currentGame) {
            console.error("❌ Games: No current game for game HTML");
            return this._getMenuHtml();
        }
        
        console.log(`🎮 Games: Rendering game: ${this.currentGame.title}`);
        
        const isMemory = this.currentGame.type === 'memory';
        const isRandom = this.currentGame.id && (this.currentGame.id.startsWith('random_') || this.currentGame.isRandom);
        
        let content = '';
        if (isMemory) {
            content = `<div class="memory-grid" id="memory-board">آماده‌سازی...</div>`;
        } else {
            // 🔥 اضافه کردن شمارنده کلمات
            const totalWords = this.currentGame.items?.length || 0;
            const currentIndex = this.gameState.currentWordIndex + 1;
            
            content = `
                <div class="scramble-ui">
                    <div class="word-progress">
                        <span>کلمه ${currentIndex} از ${totalWords}</span>
                    </div>
                    <div class="hint-box">
                        <span class="hint-label">${isRandom ? '📚' : '💡'} معنی:</span>
                        <h3 class="hint-text" id="scramble-hint">${this.gameState.scrambleWord?.hint || '...'}</h3>
                        ${isRandom && this.gameState.scrambleWord?.sentence ? `
                            <div class="example-box">
                                <span class="example-label">📝 مثال:</span>
                                <p class="example-text">${this.gameState.scrambleWord.sentence}</p>
                            </div>
                        ` : ''}
                    </div>
                    <div class="answer-slots" id="answer-slots"></div>
                    <div class="letters-pool" id="letters-pool"></div>
                    <div class="scramble-actions">
                        <button class="btn-small-round" onclick="app.games.resetScramble()">
                            <i class="fas fa-undo"></i> پاک کردن
                        </button>
                        ${currentIndex < totalWords ? `
                            <button class="btn-small-round btn-skip" onclick="app.games.skipWord()">
                                <i class="fas fa-forward"></i> رد کردن
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        return `
            <div class="game-container animate__animated animate__fadeIn">
                <div class="game-header">
                    <button class="btn-back" onclick="app.games.exitGame()">
                        <i class="fas fa-home"></i> خروج
                    </button>
                    <div class="game-stats">
                        <span>${this.currentGame.title} ${isRandom ? '🎲' : ''}</span>
                        <span style="margin-right: 15px;">امتیاز: <b id="score-display">${this.gameState.score}</b></span>
                    </div>
                </div>
                ${content}
            </div>
        `;
    }

    bindEvents(container) {
        console.log("🎯 Games: bindEvents called");
        this.container = container;
        
        if (this.activeGame && this.currentGame) {
            setTimeout(() => {
                if (this.currentGame.type === 'memory') {
                    this._renderMemoryBoard();
                } else if (this.currentGame.type === 'scramble') {
                    this._renderScrambleLevel();
                }
            }, 100);
        }
    }

    async retryLoading() {
        console.log("🔄 Games: Retry loading requested");
        
        this.allVocabWords = [];
        this.generatedGames = [];
        this.availableGames = [];
        
        await this.init();
        this._forceRerender();
    }

    async _loadGamesConfig() {
        try {
            console.log("📂 Games: Trying to load games.json...");
            
            const possiblePaths = [
                'data/lesson1/games.json',
                'data/games.json',
                'games.json'
            ];
            
            for (const path of possiblePaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const gamesConfig = await response.json();
                        this.gamesData = gamesConfig;
                        console.log(`✅ Games: Loaded from ${path}: ${gamesConfig.games?.length || 0} games`);
                        return;
                    }
                } catch (error) {
                    console.log(`⚠️ Games: Failed to load from ${path}`);
                }
            }
            
            console.log("ℹ️ Games: Using default games");
            this.gamesData = { 
                games: this._getDefaultGames() 
            };
            
        } catch (error) {
            console.error("❌ Games: Error loading games config:", error);
            this.gamesData = { 
                games: this._getDefaultGames() 
            };
        }
    }

    _getDefaultGames() {
        return [
            {
                id: "memory_default_1",
                type: "memory",
                title: "حافظه - احوالپرسی",
                pairs: [
                    { en: "Hello", fa: "سلام" },
                    { en: "Goodbye", fa: "خداحافظ" },
                    { en: "Thank you", fa: "متشکرم" },
                    { en: "Please", fa: "لطفاً" },
                    { en: "Sorry", fa: "ببخشید" },
                    { en: "Yes", fa: "بله" }
                ]
            },
            {
                id: "scramble_default_1",
                type: "scramble",
                title: "مرتب‌سازی - کلمات پایه",
                items: [
                    { word: "HELLO", hint: "سلام" },
                    { word: "THANK", hint: "تشکر" },
                    { word: "PLEASE", hint: "لطفاً" },
                    { word: "SORRY", hint: "ببخشید" }
                ]
            }
        ];
    }

    async _loadAllVocabWords() {
        try {
            console.log("📚 Games: Loading vocab words...");
            
            const possiblePaths = [
                'data/lesson1/vocab.json',
                'data/vocab.json',
                'vocab.json'
            ];
            
            let loadedWords = [];
            
            for (const path of possiblePaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const data = await response.json();
                        
                        if (Array.isArray(data)) {
                            loadedWords = data;
                        } else if (data.words && Array.isArray(data.words)) {
                            loadedWords = data.words;
                        } else if (data.vocabulary && Array.isArray(data.vocabulary)) {
                            loadedWords = data.vocabulary;
                        }
                        
                        if (loadedWords.length > 0) {
                            console.log(`✅ Games: Loaded ${loadedWords.length} words from ${path}`);
                            break;
                        }
                    }
                } catch (error) {
                    console.log(`⚠️ Games: Failed to load from ${path}`);
                }
            }
            
            this.allVocabWords = loadedWords.filter(word => {
                return word && 
                       word.word && 
                       word.persian && 
                       (word.persian.main || word.persian.short) &&
                       typeof word.word === 'string' &&
                       word.word.trim().length > 0;
            });
            
            console.log(`✅ Games: ${this.allVocabWords.length} valid words available`);
            
            if (this.allVocabWords.length === 0) {
                console.log("⚠️ Games: No vocab words, adding fallback words");
                this.allVocabWords = this._getFallbackWords();
            }
            
        } catch (error) {
            console.error("❌ Games: Error loading vocab words:", error);
            this.allVocabWords = this._getFallbackWords();
        }
    }

    _getFallbackWords() {
        return [
            { word: "Apple", persian: { main: "سیب" } },
            { word: "Book", persian: { main: "کتاب" } },
            { word: "Cat", persian: { main: "گربه" } },
            { word: "Dog", persian: { main: "سگ" } },
            { word: "Friend", persian: { main: "دوست" } },
            { word: "Good", persian: { main: "خوب" } }
        ];
    }

    async _generateRandomGames() {
        console.log("🎲 Games: Generating random games...");
        
        this.generatedGames = [];
        
        if (this.allVocabWords.length < 4) {
            console.warn("⚠️ Games: Not enough words for random games");
            return;
        }
        
        try {
            const memoryGame = this._createRandomMemoryGame();
            if (memoryGame) {
                this.generatedGames.push(memoryGame);
                console.log("✅ Games: Random memory game created");
            }
        } catch (error) {
            console.error("❌ Games: Error creating memory game:", error);
        }
        
        try {
            const scrambleGame = this._createRandomScrambleGame();
            if (scrambleGame) {
                this.generatedGames.push(scrambleGame);
                console.log("✅ Games: Random scramble game created");
            }
        } catch (error) {
            console.error("❌ Games: Error creating scramble game:", error);
        }
        
        console.log(`🎲 Games: Generated ${this.generatedGames.length} random games`);
    }

    _createRandomMemoryGame() {
        if (this.allVocabWords.length < 4) return null;
        
        // 🔥 کاهش تعداد جفت‌ها برای موبایل (4 تا 6)
        const pairCount = Math.min(6, Math.max(4, Math.floor(this.allVocabWords.length / 2)));
        const shuffled = [...this.allVocabWords].sort(() => Math.random() - 0.5);
        const selectedWords = shuffled.slice(0, pairCount);
        
        const pairs = selectedWords.map(word => ({
            en: word.word,
            fa: word.persian?.main || word.persian?.short || "ترجمه"
        }));
        
        return {
            id: `random_memory_${Date.now()}`,
            type: 'memory',
            title: `حافظه تصادفی (${pairs.length} جفت)`,
            pairs: pairs,
            isRandom: true
        };
    }

    _createRandomScrambleGame() {
        if (this.allVocabWords.length < 3) return null;
        
        const wordCount = Math.min(5, this.allVocabWords.length);
        const shuffled = [...this.allVocabWords].sort(() => Math.random() - 0.5);
        const selectedWords = shuffled.slice(0, wordCount);
        
        const items = selectedWords.map(word => {
            const hint = word.persian?.main || word.persian?.short || "ترجمه";
            const sentence = word.meanings?.[0]?.example?.sentence;
            
            return {
                word: word.word.toUpperCase().replace(/\s/g, ''),
                hint: hint,
                sentence: sentence
            };
        });
        
        return {
            id: `random_scramble_${Date.now()}`,
            type: 'scramble',
            title: `مرتب‌سازی تصادفی (${items.length} کلمه)`,
            items: items,
            isRandom: true
        };
    }

    _regenerateAvailableGames() {
        const fileGames = this.gamesData?.games || [];
        
        if (this.settings.randomMode) {
            this.availableGames = [...this.generatedGames, ...fileGames];
        } else {
            this.availableGames = [...fileGames];
        }
        
        console.log(`📊 Games: Available games updated - ${this.availableGames.length} total`);
    }

    toggleRandomMode() {
        console.log("🎲 Games: toggleRandomMode called");
        this.settings.randomMode = !this.settings.randomMode;
        this._regenerateAvailableGames();
        this._forceRerender();
    }

    async regenerateRandomGames() {
        console.log("🔄 Games: regenerateRandomGames called");
        await this._generateRandomGames();
        this._regenerateAvailableGames();
        this._forceRerender();
    }

    launchGameById(gameId) {
        console.log(`🚀 Games: launchGameById called for ${gameId}`);
        
        const game = this.availableGames.find(g => g.id === gameId);
        if (!game) {
            console.error(`❌ Games: Game ${gameId} not found`);
            return;
        }
        
        this.currentGame = game;
        this.activeGame = game.type;
        this.gameState.score = 0;
        this.gameState.currentGameId = gameId;
        this.gameState.currentWordIndex = 0; // 🔥 ریست ایندکس
        
        console.log(`🎮 Games: Launching "${game.title}"`);
        
        if (game.type === 'memory') {
            this._setupMemoryData(game);
        } else if (game.type === 'scramble') {
            this._setupScrambleData(game);
        }
        
        this._forceRerender();
    }

    exitGame() {
        console.log("🏠 Games: exitGame called");
        this.activeGame = null;
        this.currentGame = null;
        this.gameState.score = 0;
        this.gameState.currentGameId = null;
        this.gameState.currentWordIndex = 0;
        this._forceRerender();
    }

    _forceRerender() {
        console.log("🔄 Games: forceRerender called");
        
        if (this.app && this.app.renderer) {
            console.log("🎨 Games: Using app renderer");
            this.app.renderer.renderSection('games');
        } else if (this.container) {
            console.log("🎨 Games: Direct container update");
            this.container.innerHTML = this.render();
            this.bindEvents(this.container);
        } else {
            console.error("❌ Games: No render method available");
        }
    }

    _setupMemoryData(game) {
        console.log(`🃏 Memory: Setting up "${game.title}"`);
        
        if (!game.pairs || game.pairs.length === 0) {
            console.error("❌ Memory: No pairs found");
            return;
        }
        
        const pairs = game.pairs;
        let deck = [];
        
        pairs.forEach((pair, idx) => {
            deck.push({ id: idx, content: pair.en, type: 'en' });
            deck.push({ id: idx, content: pair.fa, type: 'fa' });
        });
        
        // 🔥 استفاده از Fisher-Yates shuffle
        this._shuffleArray(deck);
        
        this.gameState.cards = deck;
        this.gameState.flippedCards = [];
        this.gameState.matchedPairs = 0;
        
        console.log(`✅ Memory: Created ${deck.length} cards`);
    }

    // 🔥 تابع shuffle بهینه
    _shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    _renderMemoryBoard() {
        const board = document.getElementById('memory-board');
        if (!board) {
            console.error("❌ Memory: Board element not found");
            return;
        }
        
        console.log(`🎨 Memory: Rendering ${this.gameState.cards.length} cards`);
        
        // 🔥 تشخیص تعداد کارت‌ها و تنظیم grid
        const cardCount = this.gameState.cards.length;
        let gridClass = 'memory-grid';
        
        if (cardCount <= 12) {
            gridClass += ' grid-small'; // 3x4
        } else if (cardCount <= 16) {
            gridClass += ' grid-medium'; // 4x4
        } else {
            gridClass += ' grid-large'; // بیشتر
        }
        
        board.className = gridClass;
        board.innerHTML = '';
        
        this.gameState.cards.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'memory-card';
            cardEl.dataset.index = index;
            cardEl.innerHTML = `
                <div class="front-face"></div>
                <div class="back-face ${card.type === 'en' ? 'en-text' : ''}">${card.content}</div>
            `;
            cardEl.onclick = (e) => {
                e.stopPropagation();
                this._handleCardFlip(cardEl, card);
            };
            board.appendChild(cardEl);
        });
    }

    _handleCardFlip(element, cardData) {
        if (this.gameState.flippedCards.length >= 2) return;
        if (element.classList.contains('flip') || element.classList.contains('matched')) return;
        
        element.classList.add('flip');
        this.gameState.flippedCards.push({ element, data: cardData });
        
        if (this.gameState.flippedCards.length === 2) {
            setTimeout(() => this._checkMemoryMatch(), 500);
        }
    }

    _checkMemoryMatch() {
        const [c1, c2] = this.gameState.flippedCards;
        
        if (c1.data.id === c2.data.id) {
            c1.element.classList.add('matched');
            c2.element.classList.add('matched');
            this.gameState.score += 10;
            this.gameState.matchedPairs++;
            this._updateScore();
            this.gameState.flippedCards = [];
            
            // 🔥 بررسی پایان بازی
            if (this.gameState.matchedPairs >= this.gameState.cards.length / 2) {
                setTimeout(() => {
                    this._showGameComplete();
                }, 800);
            }
        } else {
            setTimeout(() => {
                c1.element.classList.remove('flip');
                c2.element.classList.remove('flip');
                this.gameState.flippedCards = [];
            }, 1000);
        }
    }

    // 🔥 تابع نمایش پایان بازی با دکمه
    _showGameComplete() {
        const modal = document.createElement('div');
        modal.className = 'game-complete-modal animate__animated animate__bounceIn';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="trophy-icon">🏆</div>
                <h2>تبریک می‌گویم!</h2>
                <p>شما بازی را با موفقیت تمام کردید</p>
                <div class="final-score">
                    <span>امتیاز نهایی:</span>
                    <strong>${this.gameState.score}</strong>
                </div>
                <div class="modal-actions">
                    <button class="btn-primary" onclick="app.games.playAgain()">
                        <i class="fas fa-redo"></i> بازی دوباره
                    </button>
                    <button class="btn-secondary" onclick="app.games.exitGame()">
                        <i class="fas fa-home"></i> بازگشت به منو
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // حذف modal با کلیک روی backdrop
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
    }

    // 🔥 تابع شروع مجدد بازی
    playAgain() {
        console.log("🔄 Games: Play again requested");
        
        // حذف modal
        const modal = document.querySelector('.game-complete-modal');
        if (modal) modal.remove();
        
        // ریست و شروع دوباره همین بازی
        const currentGameId = this.gameState.currentGameId;
        this.launchGameById(currentGameId);
    }

    _setupScrambleData(game) {
        console.log(`🔤 Scramble: Setting up "${game.title}"`);
        
        if (!game.items || game.items.length === 0) {
            console.error("❌ Scramble: No items found");
            return;
        }
        
        // 🔥 ذخیره تمام آیتم‌ها
        this.gameState.allScrambleItems = game.items;
        this.gameState.currentWordIndex = 0;
        
        // شروع از اولین کلمه
        this._loadScrambleWord(0);
    }

    // 🔥 تابع بارگذاری کلمه خاص
    _loadScrambleWord(index) {
        const items = this.gameState.allScrambleItems;
        
        if (index >= items.length) {
            console.log("✅ Scramble: All words completed!");
            this._showGameComplete();
            return;
        }
        
        const selectedItem = items[index];
        
        this.gameState.scrambleWord = {
            word: selectedItem.word.toUpperCase(),
            hint: selectedItem.hint,
            sentence: selectedItem.sentence || null
        };
        
        this.gameState.userAnswer = Array(this.gameState.scrambleWord.word.length).fill(null);
        this.gameState.currentWordIndex = index;
        
        console.log(`🔤 Scramble: Loaded word ${index + 1}/${items.length}`);
    }

    _renderScrambleLevel() {
        const wordData = this.gameState.scrambleWord;
        if (!wordData) {
            console.error("❌ Scramble: No word data");
            return;
        }
        
        const correctWord = wordData.word.toUpperCase();
        
        // نمایش شماره کلمه
        const progressEl = document.querySelector('.word-progress');
        if (progressEl) {
            const total = this.gameState.allScrambleItems?.length || 1;
            const current = this.gameState.currentWordIndex + 1;
            progressEl.innerHTML = `<span>کلمه ${current} از ${total}</span>`;
        }
        
        // نمایش معنی
        const hintEl = document.getElementById('scramble-hint');
        if (hintEl) hintEl.textContent = wordData.hint;
        
        // نمایش مثال
        const exampleText = document.querySelector('.example-text');
        if (exampleText && wordData.sentence) {
            exampleText.textContent = wordData.sentence;
        }
        
        // جایگاه‌ها
        const slotsContainer = document.getElementById('answer-slots');
        if (slotsContainer) {
            slotsContainer.innerHTML = '';
            for (let i = 0; i < correctWord.length; i++) {
                const slot = document.createElement('div');
                slot.className = 'slot';
                slot.dataset.index = i;
                slot.onclick = () => this._removeLetterFromSlot(i);
                slotsContainer.appendChild(slot);
            }
        }
        
        // حروف
        const poolContainer = document.getElementById('letters-pool');
        if (poolContainer) {
            poolContainer.innerHTML = '';
            let letters = correctWord.split('');
            this._shuffleArray(letters);
            
            letters.forEach((char) => {
                const btn = document.createElement('button');
                btn.className = 'letter-btn';
                btn.dataset.letter = char;
                btn.textContent = char;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    this._handleScrambleInput(char, e.target);
                };
                poolContainer.appendChild(btn);
            });
        }
    }

    _handleScrambleInput(char, btnElement) {
        if (btnElement.classList.contains('used')) return;
        
        const emptyIndex = this.gameState.userAnswer.indexOf(null);
        if (emptyIndex === -1) return;
        
        this.gameState.userAnswer[emptyIndex] = char;
        btnElement.classList.add('used');
        btnElement.dataset.slotIndex = emptyIndex;
        this._updateSlots();
        
        if (!this.gameState.userAnswer.includes(null)) {
            setTimeout(() => this._checkScrambleAnswer(), 300);
        }
    }

    // 🔥 تابع حذف حرف از slot
    _removeLetterFromSlot(slotIndex) {
        const letter = this.gameState.userAnswer[slotIndex];
        if (!letter) return;
        
        // پیدا کردن دکمه مربوطه
        const buttons = document.querySelectorAll('.letter-btn');
        buttons.forEach(btn => {
            if (btn.dataset.letter === letter && btn.dataset.slotIndex == slotIndex) {
                btn.classList.remove('used');
                delete btn.dataset.slotIndex;
            }
        });
        
        // حذف از آرایه
        this.gameState.userAnswer[slotIndex] = null;
        this._updateSlots();
    }

    _checkScrambleAnswer() {
        const attempt = this.gameState.userAnswer.join('');
        const correct = this.gameState.scrambleWord.word;
        
        if (attempt === correct) {
            this.gameState.score += 20;
            this._updateScore();
            
            // 🔥 نمایش افکت موفقیت
            const slots = document.getElementById('answer-slots');
            if (slots) {
                slots.classList.add('success-anim');
            }
            
            setTimeout(() => {
                this._nextScrambleWord();
            }, 1000);
        } else {
            const slots = document.getElementById('answer-slots');
            if (slots) {
                slots.classList.add('shake-anim');
                setTimeout(() => slots.classList.remove('shake-anim'), 500);
            }
        }
    }

    // 🔥 تابع رفتن به کلمه بعدی
    _nextScrambleWord() {
        const nextIndex = this.gameState.currentWordIndex + 1;
        const totalWords = this.gameState.allScrambleItems?.length || 0;
        
        if (nextIndex >= totalWords) {
            console.log("✅ Scramble: All words completed!");
            this._showGameComplete();
            return;
        }
        
        this._loadScrambleWord(nextIndex);
        this._forceRerender();
    }

    // 🔥 تابع رد کردن کلمه
    skipWord() {
        console.log("⏭ Games: Skip word requested");
        this._nextScrambleWord();
    }

    // 🔥 تابع ریست کردن scramble
    resetScramble() {
        console.log("🔄 Games: Reset scramble requested");
        this.gameState.userAnswer.fill(null);
        this._updateSlots();
        
        const buttons = document.querySelectorAll('.letter-btn');
        buttons.forEach(btn => {
            btn.classList.remove('used');
            delete btn.dataset.slotIndex;
        });
    }

    _updateSlots() {
        const slots = document.querySelectorAll('.slot');
        slots.forEach((slot, index) => {
            const char = this.gameState.userAnswer[index];
            slot.textContent = char || '';
            if (char) {
                slot.classList.add('filled');
            } else {
                slot.classList.remove('filled');
            }
        });
    }

    _updateScore() {
        const el = document.getElementById('score-display');
        if (el) {
            el.textContent = this.gameState.score;
            el.style.transform = 'scale(1.2)';
            setTimeout(() => el.style.transform = 'scale(1)', 200);
        }
    }
}
