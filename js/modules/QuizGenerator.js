// js/modules/QuizGenerator.js

export class QuizGenerator {
    constructor() {
        this.questionBank = [];
        this.categories = new Set();
    }
    
    loadQuestionBank(questions) {
        this.questionBank = questions.map((q, index) => ({
            ...q,
            id: q.id || index + 1,
            tags: q.tags || [q.category.toLowerCase()]
        }));
        
        // استخراج دسته‌بندی‌ها
        this.categories = new Set(this.questionBank.map(q => q.category));
    }
    
    getAvailableCategories() {
        return Array.from(this.categories);
    }
    
    getCategoryStats() {
        const stats = {};
        this.questionBank.forEach(q => {
            stats[q.category] = (stats[q.category] || 0) + 1;
        });
        return stats;
    }
    
    getTotalQuestions() {
        return this.questionBank.length;
    }
    
    getQuestionsByCategories(categories) {
        if (!categories || categories.length === 0) {
            return this.questionBank;
        }
        return this.questionBank.filter(q => categories.includes(q.category));
    }
    
    generateQuiz(options = {}) {
        const {
            categories = [],
            count = 10,
            randomize = true,
            difficulty = 'all'
        } = options;
        
        let pool = this.getQuestionsByCategories(categories);
        
        if (difficulty !== 'all') {
            pool = pool.filter(q => q.difficulty === difficulty);
        }
        
        if (pool.length === 0) {
            return [];
        }
        
        // اگر تعداد سوالات درخواستی بیشتر از موجود باشد
        const actualCount = Math.min(count, pool.length);
        
        let selectedQuestions;
        if (randomize) {
            // انتخاب تصادفی
            selectedQuestions = this.shuffleArray([...pool]).slice(0, actualCount);
        } else {
            // انتخاب متوازن از هر دسته
            selectedQuestions = this.getBalancedSelection(pool, actualCount);
        }
        
        return selectedQuestions;
    }
    
    getBalancedSelection(pool, count) {
        // گروه‌بندی سوالات بر اساس دسته
        const byCategory = {};
        pool.forEach(q => {
            if (!byCategory[q.category]) {
                byCategory[q.category] = [];
            }
            byCategory[q.category].push(q);
        });
        
        const categories = Object.keys(byCategory);
        const selected = [];
        let index = 0;
        
        while (selected.length < count && selected.length < pool.length) {
            const category = categories[index % categories.length];
            const categoryQuestions = byCategory[category];
            
            if (categoryQuestions && categoryQuestions.length > 0) {
                const randomIndex = Math.floor(Math.random() * categoryQuestions.length);
                selected.push(categoryQuestions[randomIndex]);
                categoryQuestions.splice(randomIndex, 1);
            }
            
            index++;
        }
        
        return selected;
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    getQuestionById(id) {
        return this.questionBank.find(q => q.id === id);
    }
    
    getQuestionsByTag(tag) {
        return this.questionBank.filter(q => q.tags && q.tags.includes(tag));
    }
}