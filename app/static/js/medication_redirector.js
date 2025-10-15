// ==================== MEDICATION REMINDER PAGE REDIRECTOR ====================

class MedicationReminderRedirector {
    constructor() {
        this.checkInterval = null;
        this.checkFrequency = 30000; // Check every 30 seconds
        this.redirecting = false;
    }

    // Initialize redirector (call once on page load)
    initialize() {
        try {
            // Start checking for due medications
            this.startChecking();
            
            console.log('Medication reminder redirector initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize redirector:', error);
            return false;
        }
    }

    // Start checking for due medications
    startChecking() {
        // Check immediately on load
        this.checkForDueMedications();
        
        // Then check periodically
        this.checkInterval = setInterval(() => {
            this.checkForDueMedications();
        }, this.checkFrequency);
    }

    // Stop checking (call when leaving dashboard or before redirect)
    stopChecking() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.redirecting = false;
    }

    // Check if any medication is due now
    async checkForDueMedications() {
        if (this.redirecting) {
            return; // Already in redirect process
        }

        try {
            // Get upcoming medications from the window
            const upcomingMeds = window.upcomingMedications || [];
            
            if (!upcomingMeds || upcomingMeds.length === 0) {
                return;
            }

            const now = new Date();
            
            // Check if first medication is due within 1 minute
            const dueMed = upcomingMeds[0];
            if (dueMed && dueMed.time) {
                // Parse the time string
                const dueTime = this.parseTime(dueMed.time);
                
                if (dueTime) {
                    const timeDiff = (dueTime - now) / 1000; // Convert to seconds
                    
                    // If medication is due now or within 1 minute
                    if (timeDiff >= 0 && timeDiff <= 60) {
                        console.log(`Medication "${dueMed.name}" is due in ${timeDiff} seconds`);
                        
                        // Prepare medication data for the reminder page
                        const medicationData = {
                            id: dueMed.id,
                            name: dueMed.name,
                            dosage: dueMed.dosage || 'Unknown dosage',
                            frequency: dueMed.frequency || 'Unknown frequency',
                            instructions: dueMed.instructions || 'Take as directed',
                            time: dueMed.time,
                            priority: dueMed.priority || 'medium'
                        };

                        // Check for interactions
                        const interactions = await this.checkInteractions(medicationData.id);
                        
                        // Redirect to medication reminder page
                        this.redirectToReminderPage(medicationData, interactions);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking for due medications:', error);
        }
    }

    // Parse time string (e.g., "08:00 AM") to Date object
    parseTime(timeString) {
        if (!timeString) return null;
        
        try {
            // Handle different time formats
            const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i);
            if (timeMatch) {
                let hour = parseInt(timeMatch[1]);
                const minute = parseInt(timeMatch[2]);
                const period = timeMatch[3].toUpperCase();
                
                // Convert to 24-hour format
                if (period === 'PM' && hour !== 12) {
                    hour += 12;
                } else if (period === 'AM' && hour === 12) {
                    hour = 0;
                }
                
                // Create date for today
                const today = new Date();
                const dueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute, 0);
                
                // If time has passed, use tomorrow
                if (dueDate <= new Date()) {
                    dueDate.setDate(dueDate.getDate() + 1);
                }
                
                return dueDate;
            }
            
            // Handle other formats (HH:MM)
            const colonMatch = timeString.match(/(\d{1,2}):(\d{2})/);
            if (colonMatch) {
                let hour = parseInt(colonMatch[1]);
                const minute = parseInt(colonMatch[2]);
                
                const today = new Date();
                const dueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute, 0);
                
                if (dueDate <= new Date()) {
                    dueDate.setDate(dueDate.getDate() + 1);
                }
                
                return dueDate;
            }
            
            return null;
        } catch (error) {
            console.error('Error parsing time string:', error);
            return null;
        }
    }

    // Check for medication interactions
    async checkInteractions(medicationId) {
        try {
            const response = await fetch(`/interaction/check-medication-interactions/${medicationId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            return data.interactions || [];
        } catch (error) {
            console.error('Error checking interactions:', error);
            return [];
        }
    }

    // Redirect to medication reminder page
    redirectToReminderPage(medication, interactions) {
        if (this.redirecting) {
            return;
        }
        
        this.redirecting = true;
        
        // Stop checking to prevent multiple redirects
        this.stopChecking();
        
        // Build URL with parameters
        const urlParams = new URLSearchParams({
            medication: JSON.stringify(medication),
            interactions: JSON.stringify(interactions)
        });
        
        const redirectUrl = `/medication-reminder?${urlParams.toString()}`;
        
        console.log(`Redirecting to medication reminder page: ${redirectUrl}`);
        
        // Redirect after a short delay to ensure user sees the notification
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 1000);
    }
}

// Legacy class name for backward compatibility (can be removed later)
class MedicationModalManager {
    constructor() {
        console.warn('MedicationModalManager is deprecated. Use MedicationReminderRedirector instead.');
        this.redirector = new MedicationReminderRedirector();
    }

    initialize() {
        return this.redirector.initialize();
    }
    
    // Keep old method names for backward compatibility
    showMedicationReminder() {
        console.warn('showMedicationReminder is deprecated. Redirector handles this automatically.');
    }
    
    markMedicationTaken() {
        console.warn('markMedicationTaken is deprecated. Use the new reminder page instead.');
    }
    
    snoozeReminder() {
        console.warn('snoozeReminder is deprecated. Use the new reminder page instead.');
    }
    
    dismissReminder() {
        console.warn('dismissReminder is deprecated. Use the new reminder page instead.');
    }
}

// ==================== INTEGRATION WITH EXISTING CODE ====================

// Replace the existing showTimeUpAlarm function
function showTimeUpAlarm() {
    // Deprecated - redirector now handles this automatically
    console.warn('showTimeUpAlarm is deprecated. Redirector handles medication reminders automatically.');
    
    // For backward compatibility, still log the event
    const medication = window.upcomingMedications?.[0] || {
        name: 'Your medication',
        dosage: 'Unknown dosage',
        period: 'Unknown time',
        time: 'Now'
    };
    
    console.log(`Medication reminder triggered for: ${medication.name}`);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize redirector instead of modal manager
    window.redirector = new MedicationReminderRedirector();
    const redirectorInitSuccess = window.redirector.initialize();

    if (!redirectorInitSuccess) {
        console.warn('Redirector initialization failed');
    }

    // Initialize legacy modal manager for backward compatibility (but don't use it)
    window.modalManager = new MedicationModalManager();
    
    // Your existing initialization code...
    setTimeout(initializeCountdownTimer, 1000);
    setTimeout(initializeComplianceChart, 1000);
});

// Handle page visibility changes to stop checking when tab is not active
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden, stop checking to save resources
        if (window.redirector) {
            window.redirector.stopChecking();
        }
    } else {
        // Page is visible again, restart checking
        if (window.redirector) {
            window.redirector.startChecking();
        }
    }
});

// Handle page unload to clean up intervals
window.addEventListener('beforeunload', function() {
    if (window.redirector) {
        window.redirector.stopChecking();
    }
});
