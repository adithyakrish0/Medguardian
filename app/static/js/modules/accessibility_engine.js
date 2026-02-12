/**
 * Accessibility Engine (Frontend)
 * Manages Elder-friendly interactions like Text-to-Speech (TTS)
 */

class AccessibilityEngine {
    constructor() {
        this.synth = window.speechSynthesis;
        this.isVoiceEnabled = true; // Can be toggled in settings 
        this.voices = [];

        // Load voices
        window.speechSynthesis.onvoiceschanged = () => {
            this.voices = this.synth.getVoices();
        };
    }

    /**
     * Speak a message clearly
     * @param {string} text - Message to announce
     * @param {number} rate - Speed of speech (lower for seniors)
     */
    speak(text, rate = 0.85) {
        if (!this.isVoiceEnabled || !this.synth) return;

        // Cancel ongoing speech to avoid overlap
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;

        // Try to find a warm, clear voice (prefer Google/Apple system voices)
        const preferredVoice = this.voices.find(v => v.name.includes('Google') || v.name.includes('Female')) || this.voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;

        this.synth.speak(utterance);
    }

    /**
     * Set voice preference
     */
    /**
     * Detects if the camera feed is stable (for Auto-Snap)
     * Useful for elders with Parkinson's/Tremors.
     */
    monitorStability(video, onStableCallback, threshold = 15) {
        if (this.stabilityInterval) clearInterval(this.stabilityInterval);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        let prevData = null;
        let stableFrames = 0;
        const REQUIRED_STABLE_FRAMES = 5; // ~1 second of stability

        this.stabilityInterval = setInterval(() => {
            if (video.paused || video.ended) return;

            canvas.width = 64; // Low res for speed
            canvas.height = 48;
            ctx.drawImage(video, 0, 0, 64, 48);

            const currentData = ctx.getImageData(0, 0, 64, 48).data;

            if (prevData) {
                let diff = 0;
                // Compare every 4th pixel (R channel) for efficiency
                for (let i = 0; i < currentData.length; i += 16) {
                    diff += Math.abs(currentData[i] - prevData[i]);
                }

                const avgDiff = diff / (currentData.length / 16);

                if (avgDiff < threshold) {
                    stableFrames++;
                    if (stableFrames >= REQUIRED_STABLE_FRAMES) {
                        clearInterval(this.stabilityInterval);
                        this.stabilityInterval = null;
                        console.log("🎯 Frame Stable - Triggering Auto-Snap");
                        onStableCallback();
                    }
                } else {
                    stableFrames = 0;
                }
            }
            prevData = currentData;
        }, 200); // Check every 200ms
    }

    stopStabilityMonitor() {
        if (this.stabilityInterval) {
            clearInterval(this.stabilityInterval);
            this.stabilityInterval = null;
        }
    }
}

// Global instance
window.accessibility = new AccessibilityEngine();
