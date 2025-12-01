/**
 * Enhanced Auto-Verification System for Medication Reminders
 * Integrates camera-based verification AND voice commands
 */

class MedicationAutoVerifier {
    constructor() {
        this.cameraStream = null;
        this.isVerifying = false;
        this.currentMedicationId = null;
        this.verificationInterval = null;
    }

    /**
     * Start camera and auto-verification when modal opens
     */
    async startAutoVerification(medicationId) {
        this.currentMedicationId = medicationId;

        try {
            // Start camera feed
            await this.startCamera();

            // Show camera section
            const cameraSection = document.getElementById('cameraSection');
            if (cameraSection) {
                cameraSection.style.display = 'block';
            }

            // Start voice listening if supported
            if (window.voiceCommandSystem && window.voiceCommandSystem.isSupported()) {
                const voiceIndicator = document.getElementById('voiceIndicator');

                window.voiceCommandSystem.startListening((command, transcript) => {
                    console.log(`Voice command: ${command} - "${transcript}"`);

                    if (command === 'taken') {
                        // Voice confirmed medication taken
                        this.updateStatus('success', `✓ Voice: "${transcript}"`);

                        // Auto-mark as taken after 1 second
                        setTimeout(() => {
                            this.autoMarkTaken();
                        }, 1000);
                    } else if (command === 'snooze') {
                        // Voice requested snooze
                        this.updateStatus('waiting', `⏰ Snoozing...`);

                        // Call snooze function
                        setTimeout(() => {
                            if (typeof snoozeReminder === 'function') {
                                snoozeReminder();
                            }
                        }, 1000);
                    }
                });

                // Show voice indicator
                if (voiceIndicator) {
                    voiceIndicator.style.display = 'inline';
                }
            }

            // Start periodic camera verification (every 3 seconds)
            this.verificationInterval = setInterval(() => {
                this.captureAndVerify();
            }, 3000);

        } catch (error) {
            console.error('Auto-verification failed to start:', error);
            const cameraSection = document.getElementById('cameraSection');
            if (cameraSection) {
                cameraSection.style.display = 'none';
            }
        }
    }

    /**
     * Start camera stream
     */
    async startCamera() {
        try {
            const video = document.getElementById('reminderCameraFeed');
            if (!video) throw new Error('Video element not found');

            this.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'environment'
                },
                audio: false
            });

            video.srcObject = this.cameraStream;
            await video.play();

            console.log('✓ Camera started for auto-verification');
        } catch (error) {
            console.error('Failed to start camera:', error);
            throw error;
        }
    }

    /**
     * Capture frame and send for verification
     */
    async captureAndVerify() {
        if (this.isVerifying) return;

        this.isVerifying = true;

        try {
            const video = document.getElementById('reminderCameraFeed');
            if (!video || !video.videoWidth) {
                this.isVerifying = false;
                return;
            }

            // Capture frame
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);

            const imageData = canvas.toDataURL('image/jpeg', 0.8);

            // Show verifying status
            this.updateStatus('verifying', 'Checking...');

            // Send to server
            const response = await fetch('/medication/verify-realtime', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imageData,
                    medication_id: this.currentMedicationId
                })
            });

            const result = await response.json();

            // Handle result
            if (result.verified && result.correct_medication) {
                this.updateStatus('success', '✓ Correct medication!');

                // Auto-mark as taken
                setTimeout(() => {
                    this.autoMarkTaken();
                }, 2000);
            } else if (result.verified && !result.correct_medication) {
                this.updateStatus('error', '✗ Wrong medication!');
            } else {
                this.updateStatus('waiting', '⏳ Show medication...');
            }

        } catch (error) {
            console.error('Verification error:', error);
            this.updateStatus('waiting', 'Show medication to camera');
        } finally {
            this.isVerifying = false;
        }
    }

    /**
     * Update verification status UI
     */
    updateStatus(type, message) {
        const resultDiv = document.getElementById('verificationResult');
        const alertDiv = document.getElementById('verificationAlert');
        const messageSpan = document.getElementById('verificationMessage');

        if (!resultDiv || !alertDiv || !messageSpan) return;

        resultDiv.style.display = 'block';

        alertDiv.className = 'alert mb-2';
        if (type === 'success') alertDiv.classList.add('alert-success');
        else if (type === 'error') alertDiv.classList.add('alert-danger');
        else if (type === 'verifying') alertDiv.classList.add('alert-info');
        else alertDiv.classList.add('alert-warning');

        messageSpan.textContent = message;
    }

    /**
     * Automatically mark medication as taken
     */
    async autoMarkTaken() {
        console.log('Auto-marking medication as taken...');

        this.stopVerification();

        if (typeof markMedicationTaken === 'function') {
            await markMedicationTaken();
        }
    }

    /**
     * Stop camera and verification
     */
    stopVerification() {
        // Stop interval
        if (this.verificationInterval) {
            clearInterval(this.verificationInterval);
            this.verificationInterval = null;
        }

        // Stop camera
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }

        // Stop voice listening
        if (window.voiceCommandSystem) {
            window.voiceCommandSystem.stopListening();
        }

        // Hide voice indicator
        const voiceIndicator = document.getElementById('voiceIndicator');
        if (voiceIndicator) {
            voiceIndicator.style.display = 'none';
        }

        this.isVerifying = false;
        this.currentMedicationId = null;
    }
}

// Create global instance
window.medicationAutoVerifier = new MedicationAutoVerifier();

// Hook into modal events
document.addEventListener('DOMContentLoaded', function () {
    const reminderModal = document.getElementById('medicationReminderModal');
    if (reminderModal) {
        // Start when modal opens
        reminderModal.addEventListener('shown.bs.modal', function () {
            if (window.currentMedicationId) {
                window.medicationAutoVerifier.startAutoVerification(window.currentMedicationId);
            }
        });

        // Stop when modal closes
        reminderModal.addEventListener('hidden.bs.modal', function () {
            window.medicationAutoVerifier.stopVerification();
        });
    }
});
