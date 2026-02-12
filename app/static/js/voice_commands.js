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

        // --- SEAMLESS MODE: ENABLED ---
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => this.handleResult(event);
        this.recognition.onerror = (event) => this.handleError(event);
        this.recognition.onend = () => this.onEnd();

        this.createUI();

        // Auto-start listening on page load for true hands-free
        // (Note: Browsers might block this until first interaction, but we try)
        setTimeout(() => this.start(), 1000);
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


    // --- LOCAL INTENT PARSER (Neuro-Symbolic Engine) ---

    levenshtein(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    fuzzyMatch(input, targets, threshold = 3) {
        let bestMatch = null;
        let minDistance = Infinity;

        targets.forEach(target => {
            const dist = this.levenshtein(input.toLowerCase(), target.toLowerCase());
            if (dist < minDistance && dist <= threshold) {
                minDistance = dist;
                bestMatch = target;
            }
        });
        return bestMatch;
    }

    // "Neuro-Symbolic" Router: Weights fuzzy keywords to determine intent
    determineIntent(transcript) {
        const tokens = transcript.toLowerCase().split(' ');

        const intents = {
            'NAVIGATION': { keywords: ['open', 'go', 'show', 'navigate', 'dashboard', 'home', 'page'], score: 0 },
            'QUERY': { keywords: ['what', 'when', 'how', 'next', 'count', 'many', 'status', 'have', 'did'], score: 0 },
            'ACTION': { keywords: ['scan', 'verify', 'check', 'record', 'log', 'call', 'contact', 'emergency'], score: 0 }
        };

        // Scoring loop
        tokens.forEach(token => {
            for (const [intent, data] of Object.entries(intents)) {
                if (this.fuzzyMatch(token, data.keywords, 1)) {
                    data.score += 1;
                }
            }
        });

        // Heuristics for specific commands
        if (transcript.includes('medication') || transcript.includes('pill') || transcript.includes('drug')) {
            if (intents['QUERY'].score > 0) return 'MED_QUERY';
            if (intents['ACTION'].score > 0) return 'MED_ACTION';
            if (intents['NAVIGATION'].score > 0) return 'MED_NAV';
        }

        if (transcript.includes('dashboard')) return 'NAV_DASHBOARD';
        if (transcript.includes('emergency') || transcript.includes('help') || transcript.includes('sos')) return 'EMERGENCY';
        if (transcript.includes('scan') || transcript.includes('verify')) return 'SCANNER';
        if (transcript.includes('call') || transcript.includes('caregiver')) return 'CONTACT';

        // Tie-breaker or default
        const maxScore = Math.max(...Object.values(intents).map(i => i.score));
        if (maxScore === 0) return 'UNKNOWN';

        return Object.keys(intents).find(key => intents[key].score === maxScore);
    }

    async processCommand(transcript) {
        // 1. Pre-processing
        const cleanText = transcript.toLowerCase().trim();
        console.log(`🧠 Processing via Local Neuro-Symbolic Engine: "${cleanText}"`);

        // 2. Intent Classification
        const intent = this.determineIntent(cleanText);
        console.log(`🏷️ Classified Intent: ${intent}`);

        // 3. Execution Router
        switch (intent) {
            case 'NAV_DASHBOARD':
            case 'NAVIGATION':
                this.speak("Navigating to dashboard.");
                window.location.href = '/dashboard';
                break;

            case 'MED_NAV':
                this.speak("Opening medical records.");
                window.location.href = '/medication/';
                break;

            case 'MED_QUERY':
                if (cleanText.includes('next') || cleanText.includes('when')) {
                    await this.getNextMedication();
                } else if (cleanText.includes('have') || cleanText.includes('did') || cleanText.includes('taken')) {
                    await this.checkMedicationStatus();
                } else {
                    await this.getMedicationCount();
                }
                break;

            case 'SCANNER':
            case 'MED_ACTION':
                if (cleanText.includes('scan') || cleanText.includes('verify')) {
                    this.speak("Initializing AR Scanner.");
                    window.location.href = '/medication/verification';
                } else {
                    this.speak("Please stick to scanning or verifying for safety.");
                }
                break;

            case 'CONTACT':
                await this.contactCaregiver();
                break;

            case 'EMERGENCY':
                this.speak("Emergency protocol initiated.");
                document.getElementById('emergencySosBtn')?.click();
                break;

            default:
                // FALLBACK: Only now do we even consider cloud, or just ask for clarity.
                // For this "Local First" demo, we will admit defeat gracefully to prove we aren't faking it.
                this.speak("I didn't capture that command locally. Try 'Scan medication' or 'Check status'.");
        }
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

    // NEW: Check if user has taken their medications today
    async checkMedicationStatus() {
        try {
            const response = await fetch('/api/v1/medication-status');
            const data = await response.json();

            if (data.error) {
                this.speak("I couldn't check your medication status right now.");
                return;
            }

            const missed = data.missed || [];
            const taken = data.taken || [];
            const upcoming = data.upcoming || [];

            if (missed.length === 0 && upcoming.length === 0) {
                this.speak("Great job! You've taken all your medications for today.");
            } else if (missed.length > 0) {
                const missedNames = missed.slice(0, 3).map(m => m.name).join(', ');
                const message = `You missed ${missed.length} medication${missed.length > 1 ? 's' : ''}: ${missedNames}.`;
                this.speak(message + " Would you like me to open the scanner?");

                // Auto-redirect after message
                setTimeout(() => {
                    this.speak("Opening scanner now.");
                    setTimeout(() => window.location.href = '/medication/verification', 1500);
                }, 4000);
            } else if (upcoming.length > 0) {
                const next = upcoming[0];
                this.speak(`Your next medication is ${next.name} at ${next.time}. You've taken ${taken.length} medications so far today.`);
            } else {
                this.speak(`You've taken ${taken.length} medications today.`);
            }
        } catch (error) {
            console.error('Medication status error:', error);
            this.speak("I'm having trouble checking your medication status.");
        }
    }

    // NEW: Contact linked caregiver
    async contactCaregiver() {
        try {
            const response = await fetch('/api/v1/notify-caregiver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();

            if (data.success) {
                this.speak(`I've notified your caregiver${data.caregiver_name ? ', ' + data.caregiver_name : ''}. They'll be in touch soon.`);
            } else {
                this.speak("You don't have a linked caregiver yet. You can add one from the caregiver settings page.");
            }
        } catch (error) {
            this.speak("I couldn't contact your caregiver right now. Please try the emergency SOS button if urgent.");
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
