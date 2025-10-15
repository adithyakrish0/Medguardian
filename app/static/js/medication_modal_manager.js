// ==================== MODAL MANAGEMENT SYSTEM ====================

class MedicationModalManager {
    constructor() {
        this.modalInstance = null;
        this.isShowing = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.currentMedication = null;
        this.alarmSound = null;
        this.autoReminderInterval = null;
        this.snoozeInterval = null;
        this.snoozeData = null;
    }

    // Initialize modal instance (call once on page load)
    initialize() {
        try {
            const modalElement = document.getElementById('medicationReminderModal');
            if (!modalElement) {
                console.warn('Medication modal element not found');
                return false;
            }

            this.modalInstance = new bootstrap.Modal(modalElement, {
                backdrop: 'static', // Prevent closing by clicking backdrop
                keyboard: false     // Prevent closing with ESC key
            });

            // Set up event listeners for modal lifecycle
            modalElement.addEventListener('show.bs.modal', () => {
                this.isShowing = true;
                this.retryCount = 0;
                this.setupModalFocus();
            });

            modalElement.addEventListener('shown.bs.modal', () => {
                this.startAutoReminder();
            });

            modalElement.addEventListener('hide.bs.modal', () => {
                this.isShowing = false;
                this.cleanupAlarmSound();
            });

            modalElement.addEventListener('hidden.bs.modal', () => {
                this.currentMedication = null;
            });

            console.log('Modal manager initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize modal manager:', error);
            return false;
        }
    }

    // Show medication reminder modal
    async showMedicationReminder(medicationData) {
        if (!this.modalInstance) {
            console.error('Modal instance not initialized');
            return this.showFallbackNotification(medicationData);
        }

        // Prevent multiple modals
        if (this.isShowing) {
            console.log('Modal already showing, skipping duplicate');
            return;
        }

        this.currentMedication = medicationData;

        try {
            // Update modal content
            this.updateModalContent(medicationData);
            
            // Show modal with retry logic
            await this.showWithRetry();
            
            // Play alarm sound
            this.playAlarmSound();
            
            // Show additional alarm banner
            this.showAlarmBanner(medicationData);

        } catch (error) {
            console.error('Failed to show modal:', error);
            this.showFallbackNotification(medicationData);
        }
    }

    // Retry mechanism for showing modal
    async showWithRetry() {
        return new Promise((resolve, reject) => {
            const attemptShow = (attempt) => {
                try {
                    this.modalInstance.show();
                    resolve(true);
                } catch (error) {
                    if (attempt < this.maxRetries) {
                        console.warn(`Modal show attempt ${attempt + 1} failed, retrying...`);
                        setTimeout(() => attemptShow(attempt + 1), 500);
                    } else {
                        reject(new Error(`Failed to show modal after ${this.maxRetries} attempts`));
                    }
                }
            };
            attemptShow(0);
        });
    }

    // Update modal content with medication details
    updateModalContent(medication) {
        const elements = {
            name: document.getElementById('reminderMedicationName'),
            details: document.getElementById('reminderMedicationDetails'),
            time: document.getElementById('reminderMedicationTime')
        };

        const safeText = (text) => text || 'Unknown';

        if (elements.name) {
            elements.name.textContent = `Time to take ${safeText(medication.name)}`;
        }

        if (elements.details) {
            elements.details.textContent = 
                `${safeText(medication.dosage)} • ${safeText(medication.period)}`;
        }

        if (elements.time && medication.time) {
            elements.time.textContent = `Scheduled: ${medication.time}`;
        }

        // Set current medication for action handlers
        window.currentMedication = medication;
    }

    // Setup focus management for accessibility
    setupModalFocus() {
        setTimeout(() => {
            const takenButton = document.querySelector('#medicationReminderModal .btn-success');
            if (takenButton) {
                takenButton.focus();
            }
        }, 100);
    }

    // Start auto-reminder if user doesn't interact
    startAutoReminder() {
        // Remind again every 2 minutes if no action taken
        this.autoReminderInterval = setInterval(() => {
            if (this.isShowing) {
                this.playAlarmSound();
                this.pulseModalAlert();
            }
        }, 120000); // 2 minutes
    }

    // Visual alert pulse
    pulseModalAlert() {
        const modal = document.getElementById('medicationReminderModal');
        if (modal) {
            modal.classList.add('modal-pulse-alert');
            setTimeout(() => {
                modal.classList.remove('modal-pulse-alert');
            }, 1000);
        }
    }

    // Play alarm sound with better error handling
    playAlarmSound() {
        try {
            const alarmSound = document.getElementById('alarmSound');
            if (!alarmSound) {
                console.warn('Alarm sound element not found');
                return;
            }

            // Reset and play
            alarmSound.currentTime = 0;
            const playPromise = alarmSound.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        // Auto-stop after 10 seconds to prevent endless looping
                        setTimeout(() => {
                            this.cleanupAlarmSound();
                        }, 10000);
                    })
                    .catch(error => {
                        console.warn('Alarm sound play failed:', error.message);
                        // Don't show error to user
                    });
            }
        } catch (error) {
            console.warn('Alarm sound error:', error);
        }
    }

    // Cleanup alarm sound
    cleanupAlarmSound() {
        try {
            const alarmSound = document.getElementById('alarmSound');
            if (alarmSound) {
                alarmSound.pause();
                alarmSound.currentTime = 0;
            }
        } catch (error) {
            console.warn('Error cleaning up alarm sound:', error);
        }
    }

    // Show alarm banner for additional visibility
    showAlarmBanner(medication) {
        let banner = document.getElementById('alarmBanner');
        
        if (!banner) {
            banner = this.createAlarmBanner();
        }

        // Update banner content
        const medName = document.getElementById('bannerMedicationName');
        if (medName) {
            medName.textContent = medication.name || 'Medication';
        }

        banner.style.display = 'block';
        banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Create alarm banner if it doesn't exist
    createAlarmBanner() {
        const banner = document.createElement('div');
        banner.id = 'alarmBanner';
        banner.className = 'alert alert-danger alert-dismissible fade show';
        banner.innerHTML = `
            <strong>⚠️ Medication Reminder</strong>
            <span id="bannerMedicationName"></span> is due!
            <div class="btn-group ms-3">
                <button class="btn btn-sm btn-success" onclick="window.modalManager.markMedicationTaken()">
                    I've Taken It
                </button>
                <button class="btn btn-sm btn-warning" onclick="window.modalManager.snoozeReminder()">
                    Snooze 5min
                </button>
            </div>
            <button type="button" class="btn-close" onclick="window.modalManager.hideAlarmBanner()"></button>
        `;
        document.body.prepend(banner);
        return banner;
    }

    // Hide alarm banner
    hideAlarmBanner() {
        const banner = document.getElementById('alarmBanner');
        if (banner) {
            banner.style.display = 'none';
        }
    }

    // ==================== ACTION HANDLERS ====================

    async markMedicationTaken() {
        console.log('Marking medication as taken...');
        
        try {
            // Hide modal first
            await this.hideModal();
            
            // Stop all alarms
            this.cleanupAll();
            
            // Confirm medication via API
            if (window.currentMedication?.id) {
                await this.confirmMedicationApi(window.currentMedication.id);
            } else {
                this.showSuccessMessage("Medication marked as taken!");
                setTimeout(() => location.reload(), 1500);
            }

        } catch (error) {
            console.error('Error marking medication taken:', error);
            this.showErrorMessage("Failed to confirm medication");
        }
    }

    async snoozeReminder() {
        console.log('Snoozing reminder for 5 minutes...');
        
        try {
            // Stop all alarms and intervals first
            this.cleanupAll();
            
            // Hide modal
            await this.hideModal();
            
            // Create snooze record
            if (window.currentMedication) {
                await this.createSnoozeRecord(window.currentMedication);
            }
            
            // Show snooze message and start countdown
            this.showSnoozeMessage();
            this.startSnoozeCountdown();
            
            // Prevent modal from reappearing during snooze
            this.isShowing = false;

        } catch (error) {
            console.error('Error snoozing reminder:', error);
            this.showErrorMessage("Failed to snooze reminder");
        }
    }

    async dismissReminder() {
        console.log('Dismissing reminder...');
        
        try {
            await this.hideModal();
            this.cleanupAll();
            this.resetTimerDisplay();
            
        } catch (error) {
            console.error('Error dismissing reminder:', error);
            // Fallback reload
            location.reload();
        }
    }

    // ==================== SNOOZE FUNCTIONALITY ====================

    startSnoozeCountdown() {
        const timerElement = document.getElementById('countdown-timer');
        const infoElement = document.getElementById('next-medication-info');
        const progressElement = document.getElementById('countdown-progress');
        
        if (!timerElement || !infoElement || !progressElement) {
            console.error('Required timer elements not found');
            return;
        }

        // Reset timer display for snooze
        timerElement.className = "display-1 fw-bold text-warning mb-2 animate-pulse";
        timerElement.textContent = "00:05:00";
        progressElement.style.width = "0%";

        const snoozeStartTime = new Date().getTime();
        const snoozeDuration = 5 * 60 * 1000; // 5 minutes

        this.snoozeInterval = setInterval(() => {
            const currentTime = new Date().getTime();
            const elapsed = currentTime - snoozeStartTime;
            const remaining = snoozeDuration - elapsed;

            if (remaining > 0) {
                const minutes = Math.floor(remaining / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
                
                timerElement.textContent = "00:" + minutes.toString().padStart(2, '0') + ":" + 
                                         seconds.toString().padStart(2, '0');
                
                // Update progress bar
                const progress = Math.min(100, (elapsed / snoozeDuration) * 100);
                progressElement.style.width = progress + "%";
            } else {
                // Snooze time is up
                this.clearSnoozeInterval();
                timerElement.textContent = "00:00:00";
                timerElement.className = "display-1 fw-bold text-danger mb-2 animate-pulse";
                progressElement.style.width = "100%";
                
                // Show the alarm again after a short delay
                setTimeout(() => {
                    if (window.currentMedication) {
                        this.showMedicationReminder(window.currentMedication);
                    }
                }, 1000);
            }
        }, 1000);
    }

    clearSnoozeInterval() {
        if (this.snoozeInterval) {
            clearInterval(this.snoozeInterval);
            this.snoozeInterval = null;
        }
    }

    async createSnoozeRecord(medication) {
        try {
            // Get the next medication time
            let nextMedicationTime = null;
            if (window.upcomingMedications && window.upcomingMedications.length > 0) {
                const nextMed = window.upcomingMedications[0];
                if (nextMed && nextMed.time) {
                    // Parse the time string to get the original medication time
                    const timeMatch = nextMed.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                    if (timeMatch) {
                        let hour = parseInt(timeMatch[1]);
                        let minute = parseInt(timeMatch[2]);
                        let period = timeMatch[3].toUpperCase();
                        
                        if (period === 'PM' && hour !== 12) {
                            hour += 12;
                        } else if (period === 'AM' && hour === 12) {
                            hour = 0;
                        }
                        
                        nextMedicationTime = new Date();
                        nextMedicationTime.setHours(hour, minute, 0, 0);
                        
                        // If time has passed, use tomorrow
                        if (nextMedicationTime <= new Date()) {
                            nextMedicationTime.setDate(nextMedicationTime.getDate() + 1);
                        }
                    }
                }
            }

            if (!nextMedicationTime) {
                // Fallback: use current time + 5 minutes
                nextMedicationTime = new Date(new Date().getTime() + 5 * 60 * 1000);
            }

            // Calculate snooze until time
            const snoozeUntil = new Date(nextMedicationTime.getTime() + 5 * 60 * 1000);

            // Send snooze request to server
            const response = await fetch('/snooze/create-snooze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    medication_id: medication.id,
                    snooze_duration_minutes: 5,
                    original_medication_time: nextMedicationTime.toISOString()
                })
            });

            const data = await response.json();
            
            if (data.success) {
                console.log('Snooze record created successfully');
                // Store snooze data globally for page refresh persistence
                window.activeSnooze = {
                    id: data.snooze_id,
                    medication_name: medication.name,
                    dosage: medication.dosage,
                    snooze_until: data.snooze_until,
                    original_medication_time: nextMedicationTime.toISOString()
                };
                return data;
            } else {
                throw new Error(data.message || 'Failed to create snooze record');
            }
        } catch (error) {
            console.error('Error creating snooze record:', error);
            throw error;
        }
    }

    // ==================== UTILITY METHODS ====================

    async hideModal() {
        if (this.modalInstance) {
            try {
                this.modalInstance.hide();
            } catch (error) {
                console.warn('Error hiding modal:', error);
            }
        }
    }

    cleanupAll() {
        this.cleanupAlarmSound();
        this.hideAlarmBanner();
        this.clearSnoozeInterval();
        
        if (this.autoReminderInterval) {
            clearInterval(this.autoReminderInterval);
            this.autoReminderInterval = null;
        }
    }

    showSuccessMessage(message) {
        this.updateInfoElement(`✅ ${message}`, 'text-success');
    }

    showErrorMessage(message) {
        this.updateInfoElement(`❌ ${message}`, 'text-danger');
    }

    showSnoozeMessage() {
        this.updateInfoElement('⏰ Reminder snoozed for 5 minutes', 'text-warning');
    }

    updateInfoElement(message, className = '') {
        const infoElement = document.getElementById('next-medication-info');
        if (infoElement) {
            infoElement.innerHTML = `<p class="mb-0 ${className}"><strong>${message}</strong></p>`;
        }
    }

    resetTimerDisplay() {
        if (window.countdownInterval) {
            clearInterval(window.countdownInterval);
        }
        // Reinitialize the main timer
        if (typeof initializeCountdownTimer === 'function') {
            initializeCountdownTimer();
        }
    }

    // ==================== FALLBACK SYSTEM ====================

    showFallbackNotification(medication) {
        console.log('Using fallback notification system');
        
        // Try browser notifications first
        if ('Notification' in window && Notification.permission === 'granted') {
            this.showBrowserNotification(medication);
        } else if (Notification.permission === 'default') {
            // Request permission
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.showBrowserNotification(medication);
                } else {
                    this.showStickyBanner(medication);
                }
            });
        } else {
            this.showStickyBanner(medication);
        }
    }

    showBrowserNotification(medication) {
        const notification = new Notification('💊 Medication Reminder', {
            body: `Time to take ${medication.name || 'your medication'}`,
            icon: '/favicon.ico',
            requireInteraction: true,
            actions: [
                { action: 'taken', title: 'I\'ve Taken It' },
                { action: 'snooze', title: 'Snooze' }
            ]
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        notification.onshow = () => {
            // Auto-close after 30 seconds
            setTimeout(() => notification.close(), 30000);
        };

        // Handle action buttons
        notification.onaction = (event) => {
            event.preventDefault();
            notification.close();
            
            if (event.action === 'taken') {
                this.markMedicationTaken();
            } else if (event.action === 'snooze') {
                this.snoozeReminder();
            }
        };
    }

    showStickyBanner(medication) {
        // Create a persistent banner at the top of the page
        const stickyBanner = document.createElement('div');
        stickyBanner.className = 'alert alert-danger sticky-top text-center';
        stickyBanner.innerHTML = `
            <strong>💊 TIME FOR MEDICATION!</strong><br>
            ${medication.name || 'Medication'} - ${medication.dosage || ''} 
            <div class="mt-2">
                <button class="btn btn-success btn-sm" onclick="this.parentElement.parentElement.remove(); window.modalManager.markMedicationTaken()">
                    I've Taken It
                </button>
                <button class="btn btn-warning btn-sm" onclick="this.parentElement.parentElement.remove(); window.modalManager.snoozeReminder()">
                    Snooze 5min
                </button>
                <button class="btn btn-secondary btn-sm" onclick="this.parentElement.parentElement.remove(); window.modalManager.dismissReminder()">
                    Dismiss
                </button>
            </div>
        `;
        
        document.body.prepend(stickyBanner);
    }

    // API methods (simplified - you'd integrate with your actual API)
    async confirmMedicationApi(medicationId) {
        const response = await fetch(`/medication/confirm-medication/${medicationId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        if (data.success) {
            this.showSuccessMessage("Medication confirmed successfully!");
            setTimeout(() => location.reload(), 1500);
        } else {
            throw new Error(data.message || 'API error');
        }
    }
}

// ==================== INTEGRATION WITH EXISTING CODE ====================

// Replace the existing showTimeUpAlarm function
function showTimeUpAlarm() {
    // Get medication data
    const medication = window.upcomingMedications?.[0] || {
        name: 'Your medication',
        dosage: 'Unknown dosage',
        period: 'Unknown time',
        time: 'Now'
    };

    // Use the new modal manager
    if (window.modalManager) {
        window.modalManager.showMedicationReminder(medication);
    } else {
        // Fallback to original behavior
        console.error('Modal manager not available');
        originalShowTimeUpAlarm(); // Keep original as fallback
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize modal manager
    window.modalManager = new MedicationModalManager();
    const modalInitSuccess = window.modalManager.initialize();

    if (!modalInitSuccess) {
        console.warn('Modal manager initialization failed, using fallback mode');
    }

    // Your existing initialization code...
    setTimeout(initializeCountdownTimer, 1000);
    setTimeout(initializeComplianceChart, 1000);
});

// Optional: Add CSS for pulse animation
const style = document.createElement('style');
style.textContent = `
    .modal-pulse-alert {
        animation: pulse-alert 1s ease-in-out;
    }
    @keyframes pulse-alert {
        0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
        100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
    }
`;
document.head.appendChild(style);
