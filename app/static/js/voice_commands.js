/**
 * Voice Command System for Medication Reminders
 * Uses Web Speech API for hands-free medication confirmation
 */

class VoiceCommandSystem {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.onCommandDetected = null;

        // Initialize if browser supports it
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.setupRecognition();
        } else {
            console.warn('Speech recognition not supported in this browser');
        }
    }

    setupRecognition() {
        // Configure recognition
        this.recognition.continuous = true;  // Keep listening
        this.recognition.interimResults = false;  // Only final results
        this.recognition.lang = 'en-US';  // English
        this.recognition.maxAlternatives = 3;  // Get top 3 interpretations

        // Handle results
        this.recognition.onresult = (event) => {
            const results = event.results[event.results.length - 1];
            const transcript = results[0].transcript.toLowerCase().trim();

            console.log('Voice detected:', transcript);

            // Check if it matches our commands
            if (this.isCommandPhrase(transcript)) {
                console.log('✓ Command recognized!');
                if (this.onCommandDetected) {
                    this.onCommandDetected('taken', transcript);
                }
            } else if (this.isSnoozePhrase(transcript)) {
                console.log('✓ Snooze command recognized!');
                if (this.onCommandDetected) {
                    this.onCommandDetected('snooze', transcript);
                }
            }
        };

        // Handle errors
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                // Restart automatically after no speech
                setTimeout(() => {
                    if (this.isListening) {
                        try {
                            this.recognition.start();
                        } catch (e) {
                            // Already started, ignore
                        }
                    }
                }, 1000);
            }
        };

        // Handle end
        this.recognition.onend = () => {
            // Auto-restart if still supposed to be listening
            if (this.isListening) {
                try {
                    this.recognition.start();
                } catch (e) {
                    // Already started, ignore
                }
            }
        };
    }

    /**
     * Check if transcript matches "I took it" commands
     */
    isCommandPhrase(transcript) {
        const phrases = [
            'i took it',
            'i took the medication',
            'i took my medication',
            'i ate it',
            'i ate the medication',
            'i ate my medication',
            'i had it',
            'i had the medication',
            'i had my medication',
            'taken',
            'done',
            'finished',
            'i took my medicine',
            'i ate my medicine',
            'medicine taken'
        ];

        return phrases.some(phrase => transcript.includes(phrase));
    }

    /**
     * Check if transcript matches snooze commands
     */
    isSnoozePhrase(transcript) {
        const phrases = [
            'snooze',
            'later',
            'remind me later',
            'not now',
            'wait',
            'five minutes'
        ];

        return phrases.some(phrase => transcript.includes(phrase));
    }

    /**
     * Start listening for voice commands
     */
    startListening(callback) {
        if (!this.recognition) {
            console.warn('Voice recognition not available');
            return false;
        }

        this.isListening = true;
        this.onCommandDetected = callback;

        try {
            this.recognition.start();
            console.log('🎤 Voice listening started');
            return true;
        } catch (e) {
            console.error('Failed to start voice recognition:', e);
            return false;
        }
    }

    /**
     * Stop listening
     */
    stopListening() {
        if (!this.recognition) return;

        this.isListening = false;
        this.onCommandDetected = null;

        try {
            this.recognition.stop();
            console.log('🎤 Voice listening stopped');
        } catch (e) {
            // Already stopped, ignore
        }
    }

    /**
     * Check if voice recognition is supported
     */
    isSupported() {
        return this.recognition !== null;
    }
}

// Create global instance
window.voiceCommandSystem = new VoiceCommandSystem();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceCommandSystem;
}
