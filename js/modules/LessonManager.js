// js/modules/LessonManager.js

export class LessonManager {
    constructor(app = null) {
        this.app = app;
        this.config = null;
        this.currentLesson = null;
        this.userData = null;
    }

    async loadConfig() {
        this.config = {
            grade: 12,
            totalLessons: 3,
lessons: [
    {
        id: "1",
        title: "Sense of Appreciation",
        subtitle: "حس قدردانی و احترام",
        icon: "🙏",
        path: "data/lesson1"
    },
    {
        id: "2",
        title: "Look it Up!",
        subtitle: "استفاده از فرهنگ لغت",
        icon: "📘",
        path: "data/lesson2"
    },
    {
        id: "3",
        title: "Renewable Energy",
        subtitle: "انرژی‌های تجدیدپذیر",
        icon: "🔋",
        path: "data/lesson3"
    }
]


        };
        return this.config;
    }

    async loadLessonData(lessonId) {
        const lessonConfig = this.getLessonById(lessonId);
        if (!lessonConfig) {
            console.error(`Lesson configuration for ID ${lessonId} not found.`);
            return null;
        }

        const basePath = lessonConfig.path;
        console.log(`Loading lesson data from: ${basePath}`);

        const fetchJson = async (filename) => {
            try {
                const response = await fetch(`${basePath}/${filename}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                // فایل‌های اختیاری (مثل games.json) ممکن است وجود نداشته باشند
                return null; 
            }
        };

        try {
            // دانلود همزمان تمام فایل‌ها
            const [vocab, grammar, conversation, speaking, listening, review, quiz, games] = await Promise.all([
                fetchJson('vocab.json'),
                fetchJson('grammar.json'),
                fetchJson('conversation.json'),
                fetchJson('speaking.json'),
                fetchJson('listening.json'),
                fetchJson('review.json'),
                fetchJson('quiz.json'),
                fetchJson('games.json')
            ]);

            const lessonData = {
                id: lessonId,
                vocab,
                grammar,
                conversation,
                speaking,
                listening,
                review,
                quiz,
                games
            };

            // تزریق داده‌ها به ماژول‌ها (به صورت امن)
            if (this.app) {
                // 1. Vocabulary (با فرمت آبجکت برای هماهنگی با متد init جدید)
                if (this.app.vocabulary && typeof this.app.vocabulary.init === 'function') {
                    // Vocabulary.js انتظار دارد: { vocabulary: [...] }
                    this.app.vocabulary.init({ vocabulary: vocab });
                }

                // 2. Grammar
                if (this.app.grammar && typeof this.app.grammar.init === 'function') {
                    this.app.grammar.init(grammar);
                }

                // 3. Conversation
                if (this.app.conversation && typeof this.app.conversation.init === 'function') {
                    this.app.conversation.init(conversation);
                }

                // ... سایر ماژول‌ها در صورت نیاز ...

                // 4. Games (مهم برای مشکل جاری)
                if (this.app.games && typeof this.app.games.init === 'function') {
                    // حتی اگر games نال باشد، init صدا زده می‌شود تا وضعیت بازی ریست شود
                    this.app.games.init(games);
                }
            }

            return lessonData;

        } catch (error) {
            console.error("Critical error loading lesson data:", error);
            throw error;
        }
    }

    loadUserData() {
        const saved = localStorage.getItem('english7_user_data');
        this.userData = saved ? JSON.parse(saved) : this.createNewUserData();
        this.saveUserData();
        return this.userData;
    }

    createNewUserData() {
        return {
            version: '2.0',
            totalProgress: 0,
            lessons: {},
            stats: {totalTime: 0, wordsLearned: 0, quizzesCompleted: 0, streak: 0}
        };
    }

    createLessonData() {
        return {
            progress: 0,
            completedSections: [],
            vocabulary: {learned: [], mastered: []},
            quizScore: null,
            timeSpent: 0
        };
    }

    saveUserData() {
        localStorage.setItem('english7_user_data', JSON.stringify(this.userData));
    }

    setCurrentLesson(lessonId) {
        this.currentLesson = this.config.lessons.find(l => l.id === lessonId);
        return this.currentLesson;
    }

    getCurrentLesson() { return this.currentLesson; }
    getLessonById(lessonId) { return this.config.lessons.find(l => l.id === lessonId); }
    getAllLessons() { return this.config.lessons; }
}
