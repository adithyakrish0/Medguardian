/**
 * Voice Commands - Web Speech API
 * MedGuardian - Chat Interface Version
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

        // Add welcome message
        setTimeout(() => {
            // Only add if chat is opened for the first time
            // this.addMessage("Hi! I'm MedGuardian Assistant. How can I help?", 'system');
        }, 1000);
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

        // Create Chat Interface
        const chatContainer = document.createElement('div');
        chatContainer.id = 'voiceChatContainer';
        chatContainer.className = 'voice-chat-container';
        chatContainer.innerHTML = `
            <div class="voice-chat-header">
                <div class="voice-chat-title">
                    <i class="fas fa-robot"></i> MedGuardian AI
                </div>
                <div class="voice-chat-controls" style="display:flex; gap:10px;">
                    <button class="voice-chat-max" onclick="voiceAssistant.toggleMaximize()" title="Maximize" style="background:none; border:none; color:white; cursor:pointer;">
                        <i class="fas fa-expand-alt"></i>
                    </button>
                    <button class="voice-chat-close" onclick="voiceAssistant.close()" title="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="voice-chat-messages" id="voiceChatMessages">
                <div class="chat-message system">
                    Hello! I'm listening. Try saying "Dashboard" or "Next medication".
                </div>
            </div>
            <div class="voice-chat-status" id="voiceChatStatus" onclick="voiceAssistant.toggleMic()">
                <div class="status-left">
                    <div class="inner-mic-btn" id="innerMicBtn">
                        <i class="fas fa-microphone"></i>
                    </div>
                    <div class="status-info">
                        <div class="status-dots">
                            <div class="status-dot"></div>
                            <div class="status-dot"></div>
                            <div class="status-dot"></div>
                        </div>
                        <span class="status-text" id="statusText">Tap mic to speak</span>
                    </div>
                </div>
                <button class="voice-chat-menu" onclick="event.stopPropagation(); voiceAssistant.showAllActions()" title="All Actions">
                    <i class="fas fa-th-large"></i>
                </button>
            </div>
        `;
        document.body.appendChild(chatContainer);
    }

    handleQuickAction(command) {
        // Stop listening if clicked (since user is interacting manually)
        if (this.isListening) {
            this.stopListeningOnly();
        }

        // Simulate voice command
        this.addMessage(command, 'user');
        this.processCommand(command.toLowerCase());
    }

    // Toggle entire UI visibility
    toggle() {
        const container = document.getElementById('voiceChatContainer');
        if (container.classList.contains('active')) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        const container = document.getElementById('voiceChatContainer');
        const btn = document.getElementById('voiceAssistantBtn');
        container.classList.add('active');
        // Start listening automatically when opened
        this.start();
    }

    close() {
        const container = document.getElementById('voiceChatContainer');
        const btn = document.getElementById('voiceAssistantBtn');
        container.classList.remove('active');
        this.stop(); // Full stop incl. UI cleanup
    }

    // Stop recognition but keep UI open (for when user clicks buttons)
    stopListeningOnly() {
        this.isListening = false;
        const btn = document.getElementById('voiceAssistantBtn');
        btn.classList.remove('listening');
        document.getElementById('statusText').textContent = "Tap mic to speak";
        document.querySelector('.status-dots').style.opacity = '0';
        try { this.recognition.stop(); } catch (e) { }
    }

    start() {
        if (!this.supported) {
            this.addMessage("Voice commands are not supported in this browser", 'system');
            return;
        }

        this.isListening = true;
        const container = document.getElementById('voiceChatContainer');
        const btn = document.getElementById('voiceAssistantBtn');
        const statusText = document.getElementById('statusText');

        container.classList.add('active');
        btn.classList.add('listening');
        statusText.textContent = "Listening...";

        // Show dots animation
        document.querySelector('.status-dots').style.opacity = '1';

        try {
            this.recognition.start();
        } catch (e) {
            console.log("Recognition already started");
        }
    }

    stop() {
        this.isListening = false;
        const container = document.getElementById('voiceChatContainer');
        const btn = document.getElementById('voiceAssistantBtn');

        // Don't hide container immediately so user can read
        // container.classList.remove('active'); 

        btn.classList.remove('listening');
        document.getElementById('statusText').textContent = "Tap mic to speak";
        document.querySelector('.status-dots').style.opacity = '0';

        this.recognition.stop();
    }

    onEnd() {
        if (this.isListening) {
            this.stop();
        }
    }

    handleResult(event) {
        const transcript = event.results[0][0].transcript;
        console.log('Voice command:', transcript);

        // Add User Message
        this.addMessage(transcript, 'user');

        setTimeout(() => this.processCommand(transcript.toLowerCase()), 500);
    }

    handleError(event) {
        console.error('Voice error:', event.error);
        if (event.error === 'no-speech') {
            this.addMessage("I didn't hear anything.", 'system');
        } else {
            this.addMessage("Sorry, there was an error. Please try again.", 'system');
        }
        this.stop();
    }

    addMessage(text, type) {
        const messagesContainer = document.getElementById('voiceChatMessages');
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${type}`;
        msgDiv.textContent = text;

        messagesContainer.appendChild(msgDiv);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async processCommand(command) {
        // Navigation commands
        if (command.includes('dashboard') || command.includes('home')) {
            this.speak("Opening dashboard...");
            setTimeout(() => window.location.href = '/dashboard', 1500);
            return;
        }

        if (command.includes('medications') || command.includes('medicine list')) {
            this.speak("Opening medications list...");
            setTimeout(() => window.location.href = '/medication/', 1500);
            return;
        }

        if (command.includes('add medication') || command.includes('new medication')) {
            this.speak("Opening add medication page...");
            setTimeout(() => window.location.href = '/medication/add', 1500);
            return;
        }

        if (command.includes('analytics') || command.includes('statistics') || command.includes('charts')) {
            this.speak("Opening analytics dashboard...");
            setTimeout(() => window.location.href = '/analytics/', 1500);
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
            this.speak("Please use the dashboard buttons to mark medications as taken.");
            return;
        }

        if (command.includes('emergency') || command.includes('sos')) {
            this.speak("Activating emergency SOS now!");
            document.getElementById('emergencySosBtn')?.click();
            return;
        }

        // Toggle dark mode
        if (command.includes('dark mode') || command.includes('light mode') || command.includes('toggle theme')) {
            const newMode = window.themeManager?.theme === 'dark' ? 'light' : 'dark';
            this.speak(`Switching to ${newMode} mode.`);
            window.themeManager?.toggle();
            return;
        }

        // Help
        if (command.includes('help') || command.includes('commands')) {
            this.speak("You can say: Dashboard, Medications, Next medication, Dark mode, or Emergency SOS.");
            return;
        }

        // Default response
        this.speak("I didn't quite get that. Try saying 'Help' for commands.");
    }

    async getNextMedication() {
        try {
            const response = await fetch('/api/next-medication');
            const data = await response.json();

            if (data.medication) {
                this.speak(`Your next medication is ${data.medication.name}, ${data.medication.dosage}, at ${data.medication.time}.`);
            } else {
                this.speak("You have no upcoming medications scheduled for today.");
            }
        } catch (error) {
            this.speak("I'm having trouble checking your schedule right now.");
        }
    }

    async getMedicationCount() {
        try {
            const response = await fetch('/api/medication-count');
            const data = await response.json();
            this.speak(`You have ${data.count} medications registered.`);
        } catch (error) {
            this.speak("I couldn't count your medications.");
        }
    }

    speak(text) {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }

        // Add System Message
        this.addMessage(text, 'system');

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;

        // Optional: Select a specific voice if available
        // const voices = this.synthesis.getVoices();
        // utterance.voice = voices.find(v => v.lang.includes('en-US')) || voices[0];

        this.synthesis.speak(utterance);
    }

    toggleMaximize() {
        const container = document.getElementById('voiceChatContainer');
        const icon = document.querySelector('.voice-chat-max i');

        container.classList.toggle('maximized');

        if (container.classList.contains('maximized')) {
            icon.className = 'fas fa-compress-alt';
            // if(!this.isListening) this.start(); 
        } else {
            icon.className = 'fas fa-expand-alt';
        }
    }

    showAllActions() {
        if (this.isListening) this.stopListeningOnly();

        const helpMessage = `
            <div style="font-weight:600; margin-bottom:12px; font-size:1rem;">Here is everything I can do:</div>
            <div class="voice-chat-actions-grid" style="border:none; padding:0; background:transparent;">
                <button class="action-card" onclick="voiceAssistant.handleQuickAction('Dashboard')">
                     <div class="action-icon"><i class="fas fa-home"></i></div>
                     <div class="action-label">Dashboard</div>
                </button>
                <button class="action-card" onclick="voiceAssistant.handleQuickAction('Medications')">
                     <div class="action-icon"><i class="fas fa-pills"></i></div>
                     <div class="action-label">Medications</div>
                </button>
                <button class="action-card" onclick="voiceAssistant.handleQuickAction('Add Medication')">
                     <div class="action-icon"><i class="fas fa-plus-circle"></i></div>
                     <div class="action-label">Add New</div>
                </button>
                <button class="action-card" onclick="voiceAssistant.handleQuickAction('Next Medication')">
                     <div class="action-icon"><i class="fas fa-clock"></i></div>
                     <div class="action-label">Next Dose</div>
                </button>
                <button class="action-card" onclick="voiceAssistant.handleQuickAction('Analytics')">
                     <div class="action-icon"><i class="fas fa-chart-line"></i></div>
                     <div class="action-label">Analytics</div>
                </button>
                <button class="action-card" onclick="voiceAssistant.handleQuickAction('Dark Mode')">
                     <div class="action-icon"><i class="fas ${document.body.classList.contains('dark-mode') ? 'fa-sun' : 'fa-moon'}"></i></div>
                     <div class="action-label">${document.body.classList.contains('dark-mode') ? 'Light Mode' : 'Dark Mode'}</div>
                </button>
                <button class="action-card" style="grid-column: 1 / -1; background:#fee2e2; border-color:#fca5a5; color:#b91c1c;" onclick="voiceAssistant.handleQuickAction('Emergency')">
                     <div class="action-icon" style="color:#b91c1c;"><i class="fas fa-exclamation-triangle"></i></div>
                     <div class="action-label">Emergency SOS</div>
                </button>
            </div>
        `;


        this.addMessage("Showing full capabilities...", 'user');

        setTimeout(() => {
            const messagesContainer = document.getElementById('voiceChatMessages');
            const msgDiv = document.createElement('div');
            msgDiv.className = `chat-message system`;
            msgDiv.style.background = "transparent";
            msgDiv.style.boxShadow = "none";
            msgDiv.style.padding = "0";
            msgDiv.style.maxWidth = "100%";
            msgDiv.innerHTML = helpMessage;
            messagesContainer.appendChild(msgDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 300);
    }


}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.voiceAssistant = new VoiceAssistant();
});
