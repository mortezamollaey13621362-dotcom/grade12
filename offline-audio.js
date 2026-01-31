class OfflineAudioManager {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.loadVoices();
    }

    loadVoices() {
        this.voices = this.synth.getVoices();
        if (this.voices.length === 0) {
            this.synth.addEventListener('voiceschanged', () => {
                this.voices = this.synth.getVoices();
            });
        }
    }

    async speak(text, lang = 'en-US') {
        return new Promise((resolve, reject) => {
            if (!this.synth) {
                reject(new Error('Speech Synthesis not supported'));
                return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 1;

            // انتخاب صدای مناسب
            const voice = this.voices.find(v => v.lang.startsWith(lang.split('-')[0]));
            if (voice) {
                utterance.voice = voice;
            }

            utterance.onend = () => resolve();
            utterance.onerror = (e) => reject(e);

            this.synth.cancel(); // توقف صداهای قبلی
            this.synth.speak(utterance);
        });
    }

    stop() {
        if (this.synth) {
            this.synth.cancel();
        }
    }

    async cacheAudioForOffline(url) {
        if ('caches' in window) {
            try {
                const cache = await caches.open('english-app-audio-v1.0.0');
                await cache.add(url);
                console.log('🎵 Audio cached for offline:', url);
            } catch (error) {
                console.error('❌ Failed to cache audio:', error);
            }
        }
    }
}

// نمونه سراسری
window.offlineAudio = new OfflineAudioManager();
