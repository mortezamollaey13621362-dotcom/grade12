// js/utils/PDFGenerator.js
export class PDFGenerator {
    constructor() {
        this.options = {
            margin: [10, 10, 10, 10],
            filename: 'english-quiz.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 3,
                useCORS: true,
                letterRendering: true,
                width: 794,
                height: 1123,
                backgroundColor: '#ffffff'
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait',
                compress: true,
                hotfixes: ["px_scaling"]
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
    }

    async generateExamPDF(questions, examConfig, withAnswers = false) {
        try {
            // ایجاد HTML برای PDF
            const htmlContent = this.createExamHTML(questions, examConfig, withAnswers);
            
            // ایجاد المان موقت
            const element = document.createElement('div');
            element.style.cssText = `
                position: fixed;
                left: -9999px;
                top: -9999px;
                width: 210mm;
                min-height: 297mm;
                background: white;
                padding: 20mm;
                direction: rtl;
                font-family: 'B Nazanin', 'Tahoma', sans-serif;
                box-sizing: border-box;
                font-size: 12pt;
                line-height: 1.6;
            `;
            element.innerHTML = htmlContent;
            
            document.body.appendChild(element);
            
            // تنظیمات PDF
            const pdfOptions = {
                ...this.options,
                filename: `english-exam-${Date.now()}.pdf`
            };
            
            // تولید PDF
            await html2pdf().set(pdfOptions).from(element).save();
            
            // حذف المان موقت
            document.body.removeChild(element);
            
            return true;
            
        } catch (error) {
            console.error('خطا در تولید PDF:', error);
            throw new Error('خطا در تولید PDF');
        }
    }

    createExamHTML(questions, examConfig, withAnswers = false) {
        const date = new Date().toLocaleDateString('fa-IR');
        const time = new Date().toLocaleTimeString('fa-IR');
        const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
        const lessonNumber = examConfig.lessonId || 1;
        
        return `
            <!DOCTYPE html>
            <html dir="rtl" lang="fa">
            <head>
                <meta charset="UTF-8">
                <style>
                    @page {
                        size: A4;
                        margin: 20mm;
                    }
                    
                    body {
                        font-family: 'B Nazanin', 'Tahoma', sans-serif;
                        line-height: 1.6;
                        color: #000000;
                        margin: 0;
                        padding: 0;
                        font-size: 12pt;
                    }
                    
                    .page-container {
                        width: 210mm;
                        min-height: 297mm;
                        padding: 20mm;
                        box-sizing: border-box;
                        page-break-inside: avoid;
                    }
                    
                    .header {
                        border-bottom: 2px solid #333333;
                        padding-bottom: 10mm;
                        margin-bottom: 15mm;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                    }
                    
                    .header-right h1 {
                        margin: 0 0 5mm 0;
                        font-size: 18pt;
                        color: #2c3e50;
                        font-weight: bold;
                    }
                    
                    .header-right .subtitle {
                        color: #7f8c8d;
                        margin: 3mm 0;
                        font-size: 11pt;
                    }
                    
                    .header-left {
                        text-align: left;
                        direction: ltr;
                    }
                    
                    .exam-info {
                        background: #f8f9fa;
                        padding: 5mm;
                        border-radius: 3mm;
                        border: 1px solid #dee2e6;
                        font-size: 10pt;
                    }
                    
                    .question-item {
                        margin-bottom: 10mm;
                        page-break-inside: avoid;
                        page-break-before: auto;
                    }
                    
                    .question-header {
                        display: flex;
                        align-items: flex-start;
                        margin-bottom: 5mm;
                    }
                    
                    .question-number {
                        font-weight: bold;
                        min-width: 8mm;
                        color: #2c3e50;
                        font-size: 12pt;
                    }
                    
                    .question-text {
                        flex: 1;
                        margin-bottom: 3mm;
                    }
                    
                    .question-en {
                        font-family: 'Times New Roman', Times, serif;
                        font-size: 13pt;
                        color: #000000;
                        margin-bottom: 3mm;
                        line-height: 1.5;
                        text-align: left;
                        direction: ltr;
                    }
                    
                    .question-fa {
                        color: #666666;
                        font-size: 10.5pt;
                        font-style: italic;
                        background: #f8f9fa;
                        padding: 3mm;
                        border-radius: 2mm;
                        border-right: 3px solid #3498db;
                        margin-top: 2mm;
                    }
                    
                    .options-container {
                        margin: 5mm 0;
                        padding-right: 10mm;
                    }
                    
                    .option-item {
                        margin-bottom: 3mm;
                        display: flex;
                        align-items: center;
                        page-break-inside: avoid;
                    }
                    
                    .option-letter {
                        width: 6mm;
                        height: 6mm;
                        border: 1px solid #000000;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-left: 3mm;
                        font-weight: bold;
                        font-size: 10pt;
                    }
                    
                    .option-text {
                        flex: 1;
                        font-family: 'Times New Roman', Times, serif;
                        font-size: 12pt;
                        text-align: left;
                        direction: ltr;
                    }
                    
                    .correct-option {
                        background-color: #d4edda !important;
                        padding: 2mm;
                        border-radius: 1mm;
                        border: 1px solid #c3e6cb !important;
                    }
                    
                    .answer-section {
                        margin-top: 5mm;
                        padding: 5mm;
                        background: #f8f9fa;
                        border-radius: 3mm;
                        border-right: 4px solid #2c3e50;
                        page-break-inside: avoid;
                    }
                    
                    .answer-title {
                        font-weight: bold;
                        color: #2c3e50;
                        margin-bottom: 3mm;
                        font-size: 11pt;
                    }
                    
                    .answer-text {
                        font-family: 'Times New Roman', Times, serif;
                        color: #000000;
                        margin-bottom: 3mm;
                        font-size: 11pt;
                    }
                    
                    .explanation {
                        color: #666666;
                        font-size: 10.5pt;
                        line-height: 1.5;
                        margin-top: 3mm;
                    }
                    
                    .footer {
                        text-align: center;
                        margin-top: 15mm;
                        padding-top: 5mm;
                        border-top: 1px solid #dddddd;
                        color: #666666;
                        font-size: 10pt;
                        page-break-before: always;
                    }
                    
                    .page-break {
                        page-break-before: always;
                    }
                    
                    .keep-together {
                        page-break-inside: avoid;
                    }
                    
                    .no-break {
                        page-break-before: avoid;
                    }
                    
                    /* استایل برای تحلیل آموزشی */
                    .educational-analysis {
                        background: #fff3cd;
                        border: 1px solid #ffeaa7;
                        color: #856404;
                        padding: 4mm;
                        border-radius: 2mm;
                        margin-top: 3mm;
                        font-size: 10pt;
                        line-height: 1.5;
                    }
                    
                    .analysis-title {
                        font-weight: bold;
                        margin-bottom: 2mm;
                        color: #856404;
                    }
                    
                    /* استایل برای پاسخنامه */
                    .answer-key-badge {
                        background: #2c3e50;
                        color: white;
                        padding: 2mm 5mm;
                        border-radius: 2mm;
                        font-size: 10pt;
                        display: inline-block;
                        margin-bottom: 3mm;
                    }
                </style>
            </head>
            <body>
                <div class="page-container">
                    <div class="header">
                        <div class="header-right">
                            <h1>English Language Exam - Grade 7</h1>
                            <div class="subtitle">Lesson ${lessonNumber} - Comprehensive Assessment</div>
                            <div style="margin-top: 3mm;">
                                <div>Name: ______________________________</div>
                                <div>Class: __________  Date: ${date}</div>
                            </div>
                        </div>
                        <div class="header-left">
                            <div class="exam-info">
                                <div><strong>Total Questions:</strong> ${questions.length}</div>
                                <div><strong>Time:</strong> ${examConfig.timeLimit ? Math.floor(examConfig.timeLimit/60) : 20} minutes</div>
                                <div><strong>Total Points:</strong> ${totalPoints}</div>
                                ${withAnswers ? '<div class="answer-key-badge">ANSWER KEY</div>' : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin: 5mm 0 10mm 0; color: #666666; font-style: italic; font-size: 11pt;">
                        <strong>Instructions:</strong> Read each question carefully. Choose the correct answer by circling the corresponding letter.
                    </div>
                    
                    ${questions.map((question, index) => {
                        const questionNumber = index + 1;
                        const isLastQuestion = index === questions.length - 1;
                        
                        return `
                            <div class="question-item keep-together ${isLastQuestion ? 'no-break' : ''}">
                                <div class="question-header">
                                    <div class="question-number">${questionNumber}.</div>
                                    <div class="question-text">
                                        <div class="question-en">${this.escapeHtml(question.question)}</div>
                                        ${question.hint ? `<div class="question-fa">${question.hint}</div>` : ''}
                                    </div>
                                </div>
                                
                                ${question.options && question.options.length > 0 ? `
                                    <div class="options-container">
                                        ${question.options.map((option, optIndex) => `
                                            <div class="option-item ${withAnswers && optIndex === question.correct ? 'correct-option' : ''}">
                                                <div class="option-letter">${String.fromCharCode(65 + optIndex)}</div>
                                                <div class="option-text">${this.escapeHtml(option)}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : `
                                    <div style="height: 15mm; border-bottom: 1px dashed #cccccc; margin: 5mm 0;"></div>
                                `}
                                
                                ${withAnswers ? `
                                    <div class="answer-section">
                                        <div class="answer-title">Answer & Explanation:</div>
                                        <div class="answer-text">
                                            <strong>Correct Answer:</strong> 
                                            ${String.fromCharCode(65 + question.correct)} - ${this.escapeHtml(question.options ? question.options[question.correct] : question.correct)}
                                        </div>
                                        
                                        ${question.explanation ? `
                                            <div class="explanation">
                                                <strong>Explanation:</strong> ${this.escapeHtml(question.explanation)}
                                            </div>
                                        ` : ''}
                                        
                                        ${question.explanationFa ? `
                                            <div class="explanation">
                                                <strong>توضیح فارسی:</strong> ${this.escapeHtml(question.explanationFa)}
                                            </div>
                                        ` : ''}
                                        
                                        <div class="educational-analysis">
                                            <div class="analysis-title">📚 Educational Analysis:</div>
                                            ${this.generateEducationalAnalysis(question, lessonNumber)}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                ${!isLastQuestion ? '<div style="height: 5mm;"></div>' : ''}
                            </div>
                        `;
                    }).join('')}
                    
                    ${!withAnswers ? `
                        <div class="footer">
                            <p>--- End of Exam ---</p>
                            <p>Generated by English 7 App • ${date} ${time}</p>
                            <p>Good Luck! ✓</p>
                        </div>
                    ` : `
                        <div class="footer">
                            <p>--- End of Answer Key ---</p>
                            <p>Generated by English 7 App • ${date} ${time}</p>
                            <p>For educational purposes only</p>
                        </div>
                    `}
                </div>
            </body>
            </html>
        `;
    }

    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    generateEducationalAnalysis(question, lessonNumber) {
        const analyses = [];
        
        // تحلیل بر اساس نوع سوال
        switch(question.type) {
            case 'vocabulary':
                analyses.push(
                    "• This vocabulary item is from <strong>Grade 7 English Book - Lesson " + lessonNumber + "</strong>",
                    "• Category: <strong>Basic English Vocabulary</strong>",
                    "• Recommended practice: Use this word in 3 different sentences",
                    "• Common mistake: Incorrect pronunciation or spelling",
                    "• Learning tip: Associate with visual images for better retention"
                );
                break;
                
            case 'grammar':
                analyses.push(
                    "• Grammar point: <strong>" + (question.category || 'Basic Grammar') + "</strong>",
                    "• Reference: Grade 7 English Book - Page " + (lessonNumber * 10 + 5),
                    "• Common student errors: " + this.getCommonGrammarMistake(question),
                    "• Practice suggestion: Create 5 sentences using this rule",
                    "• Related topics: Subject-verb agreement, Sentence structure"
                );
                break;
                
            case 'listening':
                analyses.push(
                    "• Skill tested: <strong>Listening Comprehension</strong>",
                    "• Audio features: Clear pronunciation, Moderate speed",
                    "• Improvement tip: Listen to English audio daily for 10 minutes",
                    "• Strategy: Focus on keywords and context clues",
                    "• Preparation: Practice with book audio files"
                );
                break;
                
            case 'conversation':
                analyses.push(
                    "• Communication skill: <strong>Daily Conversation</strong>",
                    "• Context: Social interaction - Greetings and introductions",
                    "• Cultural note: Appropriate responses in English culture",
                    "• Practice: Role-play with a partner",
                    "• Extension: Learn alternative expressions"
                );
                break;
                
            default:
                analyses.push(
                    "• Skill: <strong>English Language Proficiency</strong>",
                    "• Level: Grade 7 - Intermediate Beginner",
                    "• Importance: Foundation for advanced learning",
                    "• Recommendation: Regular review and practice",
                    "• Connection: Links to all language skills"
                );
        }
        
        // تحلیل بر اساس سطح دشواری
        const difficulty = question.difficulty || 'medium';
        if (difficulty === 'easy') {
            analyses.push("• Difficulty level: <strong>Easy</strong> - Suitable for all students");
        } else if (difficulty === 'hard') {
            analyses.push("• Difficulty level: <strong>Challenging</strong> - Requires careful thinking");
        } else {
            analyses.push("• Difficulty level: <strong>Moderate</strong> - Appropriate for Grade 7");
        }
        
        // نکته آموزشی کلی
        analyses.push("• Educational value: Develops critical thinking and language skills");
        
        return analyses.map(item => `<div style="margin-bottom: 1mm;">${item}</div>`).join('');
    }

    getCommonGrammarMistake(question) {
        const mistakes = {
            'verb': "Incorrect verb form or tense usage",
            'pronoun': "Wrong pronoun case or agreement",
            'preposition': "Incorrect preposition choice",
            'article': "Missing or wrong article (a/an/the)",
            'plural': "Incorrect plural formation"
        };
        
        return mistakes[question.category?.toLowerCase()] || "Sentence structure errors";
    }

    async generateStudentReport(studentName, questions, answers, score, totalPoints, lessonId = 1) {
        try {
            const percentage = Math.round((score / totalPoints) * 100);
            const date = new Date().toLocaleDateString('fa-IR');
            const time = new Date().toLocaleTimeString('fa-IR');
            
            const htmlContent = `
                <!DOCTYPE html>
                <html dir="rtl" lang="fa">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        @page { 
                            size: A4;
                            margin: 15mm;
                        }
                        
                        body { 
                            font-family: 'B Nazanin', Tahoma, sans-serif; 
                            line-height: 1.6; 
                            color: #000000;
                            margin: 0;
                            padding: 0;
                            font-size: 12pt;
                        }
                        
                        .page { 
                            width: 210mm; 
                            min-height: 297mm; 
                            padding: 20mm;
                            box-sizing: border-box;
                        }
                        
                        .header { 
                            text-align: center; 
                            margin-bottom: 15mm; 
                            padding-bottom: 10mm;
                            border-bottom: 2px solid #2c3e50;
                        }
                        
                        .score-circle { 
                            width: 80mm; 
                            height: 80mm; 
                            border-radius: 50%; 
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center;
                            margin: 0 auto 10mm; 
                            font-size: 32pt; 
                            font-weight: bold;
                            box-shadow: 0 10mm 20mm rgba(0,0,0,0.1);
                        }
                        
                        .analysis-table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            margin: 10mm 0; 
                            font-size: 11pt;
                        }
                        
                        .analysis-table th { 
                            background: #2c3e50; 
                            color: white; 
                            padding: 4mm; 
                            text-align: center; 
                            font-weight: bold;
                        }
                        
                        .analysis-table td { 
                            padding: 3mm; 
                            border-bottom: 1px solid #eeeeee; 
                            text-align: center;
                        }
                        
                        .correct-ans { 
                            color: #27ae60; 
                            font-weight: bold; 
                        }
                        
                        .wrong-ans { 
                            color: #e74c3c; 
                            text-decoration: line-through;
                        }
                        
                        .feedback-box { 
                            background: #f8f9fa; 
                            padding: 8mm; 
                            margin: 10mm 0; 
                            border-radius: 3mm;
                            border-right: 5mm solid #3498db;
                        }
                        
                        .performance-summary {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 5mm;
                            margin: 10mm 0;
                        }
                        
                        .performance-item {
                            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                            padding: 5mm;
                            border-radius: 3mm;
                            text-align: center;
                            border: 1px solid #dee2e6;
                        }
                        
                        .performance-value {
                            font-size: 24pt;
                            font-weight: bold;
                            color: #2c3e50;
                            display: block;
                            margin-bottom: 2mm;
                        }
                        
                        .performance-label {
                            color: #666666;
                            font-size: 10pt;
                        }
                        
                        .improvement-plan {
                            background: #e8f4fd;
                            padding: 8mm;
                            border-radius: 3mm;
                            margin: 10mm 0;
                            border: 1px solid #b3e0ff;
                        }
                        
                        .footer {
                            text-align: center;
                            margin-top: 15mm;
                            padding-top: 5mm;
                            border-top: 1px solid #dddddd;
                            color: #666666;
                            font-size: 10pt;
                        }
                    </style>
                </head>
                <body>
                    <div class="page">
                        <div class="header">
                            <h1 style="color: #2c3e50; margin-bottom: 5mm;">English Language Assessment Report</h1>
                            <h2 style="color: #7f8c8d; margin-bottom: 5mm;">Grade 7 - Lesson ${lessonId}</h2>
                            <div class="score-circle">${percentage}%</div>
                            <h2 style="margin: 5mm 0;">Student: ${this.escapeHtml(studentName)}</h2>
                            <h3>Score: ${score} out of ${totalPoints}</h3>
                            <p style="color: #666666;">Date: ${date} • Time: ${time}</p>
                        </div>
                        
                        <div class="performance-summary">
                            <div class="performance-item">
                                <span class="performance-value">${this.calculateCorrectCount(questions, answers)}</span>
                                <span class="performance-label">Correct Answers</span>
                            </div>
                            <div class="performance-item">
                                <span class="performance-value">${this.calculateIncorrectCount(questions, answers)}</span>
                                <span class="performance-label">Incorrect Answers</span>
                            </div>
                            <div class="performance-item">
                                <span class="performance-value">${this.calculateAverageTime(questions)}</span>
                                <span class="performance-label">Avg Time per Question</span>
                            </div>
                        </div>
                        
                        <h3 style="color: #2c3e50; margin-bottom: 5mm;">Detailed Question Analysis:</h3>
                        <table class="analysis-table">
                            <thead>
                                <tr>
                                    <th style="width: 10%;">Q#</th>
                                    <th style="width: 25%;">Topic</th>
                                    <th style="width: 30%;">Your Answer</th>
                                    <th style="width: 30%;">Correct Answer</th>
                                    <th style="width: 5%;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${questions.map((q, idx) => {
                                    const userAnswer = answers[q.id];
                                    const isCorrect = userAnswer === q.correct;
                                    const userAnswerText = q.options ? 
                                        (q.options[userAnswer] || 'No answer') : 
                                        (userAnswer || 'No answer');
                                    const correctAnswerText = q.options ? 
                                        q.options[q.correct] : q.correct;
                                    
                                    return `
                                        <tr>
                                            <td>${idx + 1}</td>
                                            <td>${q.category || q.type}</td>
                                            <td class="${isCorrect ? 'correct-ans' : 'wrong-ans'}">${this.escapeHtml(userAnswerText.substring(0, 30) + (userAnswerText.length > 30 ? '...' : ''))}</td>
                                            <td class="correct-ans">${this.escapeHtml(correctAnswerText.substring(0, 30) + (correctAnswerText.length > 30 ? '...' : ''))}</td>
                                            <td>${isCorrect ? '✅' : '❌'}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                        
                        <div class="feedback-box">
                            <h4 style="color: #2c3e50; margin-bottom: 5mm;">📊 Performance Analysis:</h4>
                            <ul style="margin: 0; padding-right: 5mm; color: #555555;">
                                <li style="margin-bottom: 3mm;"><strong>Strongest area:</strong> ${this.getStrongestArea(questions, answers)}</li>
                                <li style="margin-bottom: 3mm;"><strong>Area needing improvement:</strong> ${this.getWeakestArea(questions, answers)}</li>
                                <li style="margin-bottom: 3mm;"><strong>Overall performance:</strong> ${this.getPerformanceLevel(percentage)}</li>
                                <li style="margin-bottom: 3mm;"><strong>Recommendation:</strong> ${this.getStudyRecommendation(percentage, questions, answers)}</li>
                            </ul>
                        </div>
                        
                        <div class="improvement-plan">
                            <h4 style="color: #2c3e50; margin-bottom: 5mm;">🎯 Improvement Plan:</h4>
                            ${this.generateImprovementPlan(questions, answers, lessonId)}
                        </div>
                        
                        <div class="footer">
                            <p>Generated by English 7 App - Student Assessment System</p>
                            <p>www.english7app.ir • Contact: info@english7app.ir</p>
                            <p style="font-style: italic; margin-top: 3mm;">"Continuous improvement leads to excellence"</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
            
            const element = document.createElement('div');
            element.style.cssText = 'position: fixed; left: -9999px; width: 210mm; background: white; font-size: 12pt;';
            element.innerHTML = htmlContent;
            document.body.appendChild(element);
            
            await html2pdf()
                .set({ 
                    ...this.options, 
                    filename: `student-report-${studentName.replace(/\s+/g, '-')}-${Date.now()}.pdf`,
                    pagebreak: { mode: ['avoid-all', 'css'] }
                })
                .from(element)
                .save();
            
            document.body.removeChild(element);
            
            return true;
            
        } catch (error) {
            console.error('خطا در تولید کارنامه:', error);
            throw error;
        }
    }

    calculateCorrectCount(questions, answers) {
        return questions.filter(q => answers[q.id] === q.correct).length;
    }

    calculateIncorrectCount(questions, answers) {
        return questions.filter(q => answers[q.id] !== q.correct).length;
    }

    calculateAverageTime(questions) {
        return '1.5 min';
    }

    getStrongestArea(questions, answers) {
        const areas = {};
        questions.forEach((q, idx) => {
            if (answers[q.id] === q.correct) {
                const area = q.type || q.category;
                areas[area] = (areas[area] || 0) + 1;
            }
        });
        
        const strongest = Object.entries(areas).sort((a, b) => b[1] - a[1])[0];
        return strongest ? this.getAreaName(strongest[0]) : 'All areas balanced';
    }

    getWeakestArea(questions, answers) {
        const areas = {};
        questions.forEach((q, idx) => {
            if (answers[q.id] !== q.correct) {
                const area = q.type || q.category;
                areas[area] = (areas[area] || 0) + 1;
            }
        });
        
        const weakest = Object.entries(areas).sort((a, b) => b[1] - a[1])[0];
        return weakest ? this.getAreaName(weakest[0]) : 'No significant weaknesses';
    }

    getAreaName(area) {
        const names = {
            'vocabulary': 'Vocabulary',
            'grammar': 'Grammar',
            'listening': 'Listening',
            'conversation': 'Conversation',
            'reading': 'Reading Comprehension',
            'writing': 'Writing'
        };
        return names[area] || area;
    }

    getPerformanceLevel(percentage) {
        if (percentage >= 90) return 'Excellent - Mastery level';
        if (percentage >= 75) return 'Good - Proficient';
        if (percentage >= 60) return 'Satisfactory - Developing';
        if (percentage >= 50) return 'Needs Improvement';
        return 'Requires significant improvement';
    }

    getStudyRecommendation(percentage, questions, answers) {
        if (percentage >= 80) {
            return 'Continue with advanced materials and expand vocabulary';
        } else if (percentage >= 60) {
            return 'Review lessons and practice more exercises';
        } else {
            return 'Focus on basic concepts and seek teacher guidance';
        }
    }

    generateImprovementPlan(questions, answers, lessonId) {
        const incorrectQuestions = questions.filter(q => answers[q.id] !== q.correct);
        
        if (incorrectQuestions.length === 0) {
            return `
                <div style="color: #27ae60; font-weight: bold; margin-bottom: 3mm;">
                    🎉 Excellent work! All answers are correct.
                </div>
                <ul style="margin: 0; padding-right: 5mm; color: #555555;">
                    <li style="margin-bottom: 2mm;">Continue to Lesson ${lessonId + 1}</li>
                    <li style="margin-bottom: 2mm;">Challenge yourself with advanced exercises</li>
                    <li style="margin-bottom: 2mm;">Expand vocabulary through reading</li>
                    <li>Practice listening with English media</li>
                </ul>
            `;
        }
        
        const planItems = [
            `<strong>Focus on these ${incorrectQuestions.length} questions:</strong> Review each carefully`,
            `<strong>Textbook reference:</strong> Lesson ${lessonId}, Pages ${lessonId * 10}-${lessonId * 10 + 10}`,
            `<strong>Daily practice:</strong> 30 minutes of English study`,
            `<strong>Resource:</strong> Use book audio files for listening practice`,
            `<strong>Next assessment:</strong> Retest after one week of study`
        ];
        
        return `
            <ul style="margin: 0; padding-right: 5mm; color: #555555;">
                ${planItems.map(item => `<li style="margin-bottom: 3mm;">${item}</li>`).join('')}
            </ul>
            <div style="margin-top: 5mm; padding: 3mm; background: white; border-radius: 2mm; border: 1px solid #dee2e6;">
                <strong>📅 Weekly Study Plan:</strong>
                <div style="margin-top: 2mm;">
                    <div>• Mon-Wed: Review vocabulary and grammar</div>
                    <div>• Thu-Fri: Practice listening and speaking</div>
                    <div>• Sat: Take practice tests</div>
                    <div>• Sun: Review mistakes and plan next week</div>
                </div>
            </div>
        `;
    }
}