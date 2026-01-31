/* js/utils.js */

// انتخاب‌گر تک المان (مشابه jQuery)
export const $ = (selector) => document.querySelector(selector);

// انتخاب‌گر چند المان
export const $$ = (selector) => document.querySelectorAll(selector);

// ایجاد وقفه (Promise)
export function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// فرمت زمان
export function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
