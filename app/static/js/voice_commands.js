/**
 * Voice Commands - Web Speech API
 * MedGuardian
 */

class VoiceAssistant {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

        if (this.supported) {
            this.init();
        }
    }

    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => this.handleResult(event);
        this.recognition.onerror = (event) => this.handleError(event);
        this.recognition.onend = () => this.onEnd();

        this.createUI();
    }

    createUI() {
        // Create floating microphone button
        const btn = document.createElement('button');
        btn.id = 'voiceAssistantBtn';
        btn.className = 'voice-assistant-btn';
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
        btn.title = 'Voice Commands';
        btn.onclick = () => this.toggle();

        document.body.appendChild(btn);

        // Create feedback overlay
        const overlay = document.createElement('div');
        overlay.id = 'voiceFeedback';
        overlay.className = 'voice-feedback';
        overlay.innerHTML = `
            <div class="voice-feedback-content">
                <div class="voice-wave">
                    <span></span><span></span><span></span><span></span><span></span>
                </div>
                <p id="voiceText">Listening...</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    toggle() {
        if (this.isListening) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        if (!this.supported) {
            this.speak("Voice commands are not supported in this browser");
            return;
        }

        this.isListening = true;
        document.getElementById('voiceAssistantBtn').classList.add('listening');
        document.getElementById('voiceFeedback').classList.add('active');
        document.getElementById('voiceText').textContent = 'Listening...';

        this.recognition.start();
    }

    stop() {
        this.isListening = false;
        document.getElementById('voiceAssistantBtn').classList.remove('listening');
        document.getElementById('voiceFeedback').classList.remove('active');
        this.recognition.stop();
    }

    onEnd() {
        this.isListening = false;
        document.getElementById('voiceAssistantBtn').classList.remove('listening');
        document.getElementById('voiceFeedback').classList.remove('active');
    }

    handleResult(event) {
        const transcript = event.results[0][0].transcript.toLowerCase();
        console.log('Voice command:', transcript);
        document.getElementById('voiceText').textContent = `"${transcript}"`;

        setTimeout(() => this.processCommand(transcript), 500);
    }

    handleError(event) {
        console.error('Voice error:', event.error);
        this.speak("Sorry, I didn't catch that. Please try again.");
        this.stop();
    }

    async processCommand(command) {
        // Navigation commands
        if (command.includes('dashboard') || command.includes('home')) {
            this.speak("Opening dashboard");
            window.location.href = '/dashboard';
            return;
        }

        if (command.includes('medications') || command.includes('medicine list')) {
            this.speak("Opening medications list");
            window.location.href = '/medication/';
            return;
        }

        if (command.includes('add medication') || command.includes('new medication')) {
            this.speak("Opening add medication page");
            window.location.href = '/medication/add';
            return;
        }

        if (command.includes('analytics') || command.includes('statistics') || command.includes('charts')) {
            this.speak("Opening analytics dashboard");
            window.location.href = '/analytics/';
            return;
        }

        // Info commands
        if (command.includes('next medication') || command.includes('what\'s next')) {
            await this.getNextMedication();
            return;
        }

        if (command.includes('how many') || command.includes('medication count')) {
            await this.getMedicationCount();
            return;
        }

        // Action commands
        if (command.includes('mark') && command.includes('taken')) {
            this.speak("Please use the dashboard to mark medications as taken");
            return;
        }

        if (command.includes('emergency') || command.includes('sos') || command.includes('help')) {
            this.speak("Activating emergency SOS");
            document.getElementById('emergencySosBtn')?.click();
            return;
        }

        // Toggle dark mode
        if (command.includes('dark mode') || command.includes('light mode') || command.includes('toggle theme')) {
            this.speak(`Switching to ${window.themeManager?.theme === 'dark' ? 'light' : 'dark'} mode`);
            window.themeManager?.toggle();
            return;
        }

        // Help
        if (command.includes('help') || command.includes('commands')) {
            this.speak("Available commands: Dashboard, Medications, Add medication, Analytics, Next medication, Dark mode, Emergency SOS");
            return;
        }

        // Default response
        this.speak("I didn't understand that command. Say 'help' for available commands.");
    }

    async getNextMedication() {
        try {
            const response = await fetch('/api/next-medication');
            const data = await response.json();

            if (data.medication) {
                this.speak(`Your next medication is ${data.medication.name}, ${data.medication.dosage}, at ${data.medication.time}`);
            } else {
                this.speak("You have no upcoming medications scheduled");
            }
        } catch (error) {
            this.speak("Unable to fetch medication information");
        }
    }

    async getMedicationCount() {
        try {
            const response = await fetch('/api/medication-count');
            const data = await response.json();
            this.speak(`You have ${data.count} medications registered`);
        } catch (error) {
            this.speak("Unable to fetch medication count");
        }
    }

    speak(text) {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        this.synthesis.speak(utterance);

        // Show text feedback
        document.getElementById('voiceText').textContent = text;
        document.getElementById('voiceFeedback').classList.add('active');

        utterance.onend = () => {
            setTimeout(() => {
                document.getElementById('voiceFeedback').classList.remove('active');
            }, 1000);
        };
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.voiceAssistant = new VoiceAssistant();
});
