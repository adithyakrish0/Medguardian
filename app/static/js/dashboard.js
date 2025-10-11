// Dashboard JavaScript for MedGuardian

function getNextMedicationTime(med, now) {
    const nextTimes = [];
    
    // Function to add a specific time
    function addTime(hour, minute) {
        const time = new Date(now);
        time.setHours(hour, minute, 0, 0);
        if (time < now) {
            // If time has passed today, schedule for tomorrow
            time.setDate(time.getDate() + 1);
        }
        nextTimes.push({
            time: time,
            medication: med,
            period: getPeriodName(hour)
        });
    }
    
    // Check custom times first
    if (med.custom_times) {
        try {
            const customTimes = JSON.parse(med.custom_times);
            customTimes.forEach(function(timeStr) {
                const timeParts = timeStr.split(':');
                if (timeParts.length === 2) {
                    const hours = parseInt(timeParts[0]);
                    const minutes = parseInt(timeParts[1]);
                    addTime(hours, minutes);
                }
            });
        } catch (e) {
            console.error("Error parsing custom times for " + med.name + ":", e);
        }
    }
    
    // Check scheduled periods
    const currentHour = now.getHours();
    
    // Morning (6-11 AM)
    if (med.morning && !(currentHour >= 6 && currentHour < 11)) {
        addTime(8, 0); // Default morning time
    }
    
    // Afternoon (12-3 PM)
    if (med.afternoon && !(currentHour >= 12 && currentHour < 15)) {
        addTime(14, 0); // Default afternoon time
    }
    
    // Evening (4-8 PM)
    if (med.evening && !(currentHour >= 16 && currentHour < 20)) {
        addTime(18, 0); // Default evening time
    }
    
    // Night (9 PM - 5 AM)
    if (med.night) {
        if (currentHour >= 5 && currentHour < 21) {
            // Before night period, schedule for 9 PM today
            addTime(21, 0);
        } else {
            // During night period, schedule for 9 PM tomorrow
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(21, 0, 0, 0);
            nextTimes.push({
                time: tomorrow,
                medication: med,
                period: 'Night'
            });
        }
    }
    
    // Sort by time and return the next one
    nextTimes.sort(function(a, b) {
        return a.time - b.time;
    });
    return nextTimes.length > 0 ? nextTimes[0] : null;
}

function getPeriodName(hour) {
    if (hour >= 6 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 16) return 'Afternoon';
    if (hour >= 16 && hour < 21) return 'Evening';
    return 'Night';
}

function initializeCountdownTimer() {
    console.log("Initializing countdown timer...");
    
    try {
        // Get upcoming medications from page data - safer approach
        let upcomingMeds = [];
        
        // Try to get data from global variable first (set by template)
        if (typeof window.upcomingMedications !== 'undefined' && window.upcomingMedications) {
            upcomingMeds = window.upcomingMedications;
            console.log("Using global upcoming medications:", upcomingMeds);
        } else {
            // Fallback to template variable
            const upcomingMedsJson = document.getElementById('upcoming-medications-data')?.getAttribute('data-medications');
            if (upcomingMedsJson && upcomingMedsJson !== 'null' && upcomingMedsJson !== 'undefined') {
                try {
                    upcomingMeds = JSON.parse(upcomingMedsJson);
                    console.log("Parsed upcoming medications from data attribute:", upcomingMeds);
                } catch (e) {
                    console.error("Error parsing upcoming medications from data attribute:", e);
                }
            }
        }
        
        const now = new Date();
        console.log("Current time:", now);
        
        // Check if upcoming medications data exists
        if (!upcomingMeds || upcomingMeds.length === 0) {
            console.log("No upcoming medications found");
            showNoMedications();
            return;
        }
        
        // Use the first medication from the sorted list
        const nextMed = upcomingMeds[0];
        console.log("Next medication:", nextMed);
        
        if (!nextMed || !nextMed.time) {
            console.log("No valid next medication found");
            showNoMedications();
            return;
        }
        
        // Parse the time string (e.g., "06:00 PM") to get hours and minutes
        let hour = 0, minute = 0;
        console.log("Parsing time:", nextMed.time);
        
        // More robust time parsing
        const timeMatch = nextMed.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
            hour = parseInt(timeMatch[1]);
            minute = parseInt(timeMatch[2]);
            const period = timeMatch[3].toUpperCase();
            
            // Convert 12-hour format to 24-hour format
            if (period === 'PM' && hour !== 12) {
                hour += 12;
            } else if (period === 'AM' && hour === 12) {
                hour = 0;
            }
            console.log("Parsed time - hour:", hour, "minute:", minute, "period:", period);
        } else {
            console.error("Time match failed for:", nextMed.time);
            showNoMedications();
            return;
        }
        
        // Create datetime object for the next medication
        const nextTime = new Date(now);
        nextTime.setHours(hour, minute, 0, 0);
        console.log("Next medication time:", nextTime);
        
        // If the time has passed today, schedule for tomorrow
        if (nextTime <= now) {
            nextTime.setDate(nextTime.getDate() + 1);
            console.log("Time passed, scheduling for tomorrow:", nextTime);
        }
        
        // Update countdown display
        const timerElement = document.getElementById('countdown-timer');
        const infoElement = document.getElementById('next-medication-info');
        const progressElement = document.getElementById('countdown-progress');
        
        if (timerElement && infoElement && progressElement) {
            // Update medication info with details
            const timeUntil = getTimeUntilString(nextTime);
            const isToday = nextTime.toDateString() === now.toDateString();
            const dayText = isToday ? "today" : "tomorrow";
            
            // Ensure we have all required fields
            const medName = nextMed.name || 'Unknown Medication';
            const medDosage = nextMed.dosage || 'Unknown dosage';
            const medPeriod = nextMed.period || 'Unknown time';
            
            infoElement.innerHTML = "<p class='mb-0'><strong>" + medName + "</strong></p>" +
                                   "<small class='text-muted'>" + medDosage + " • " + 
                                   medPeriod + " (" + nextMed.time + ")</small>" +
                                   "<br><small class='text-info'>Next dose " + dayText + " in " + timeUntil + "</small>";
            
            // Start countdown
            updateCountdown(nextTime, timerElement, infoElement, progressElement);
            const intervalId = setInterval(function() {
                updateCountdown(nextTime, timerElement, infoElement, progressElement);
            }, 1000);
            
            // Store interval ID for cleanup
            window.countdownInterval = intervalId;
            
            console.log("Countdown timer started successfully!");
        } else {
            console.error("One or more DOM elements not found:", {
                timer: !!timerElement,
                info: !!infoElement,
                progress: !!progressElement
            });
        }
        
    } catch (error) {
        console.error("Error in initializeCountdownTimer:", error);
        showNoMedications();
    }
}

function getTimeUntilString(targetDate) {
    const now = new Date();
    const diff = targetDate - now;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
        return hours + " hour" + (hours !== 1 ? "s" : "") + " and " + minutes + " minute" + (minutes !== 1 ? "s" : "");
    } else {
        return minutes + " minute" + (minutes !== 1 ? "s" : "");
    }
}

function updateCountdown(targetTime, timerElement, infoElement, progressElement) {
    const now = new Date().getTime();
    const target = new Date(targetTime).getTime();
    const difference = target - now;
    
    if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        timerElement.textContent = hours.toString().padStart(2, '0') + ":" + 
                                 minutes.toString().padStart(2, '0') + ":" + 
                                 seconds.toString().padStart(2, '0');
        
        // Update progress bar based on time until next medication (max 24 hours)
        const maxTime = 24 * 60 * 60 * 1000;
        const timeSinceMidnight = now % maxTime;
        const progress = Math.min(100, (timeSinceMidnight / maxTime) * 100);
        progressElement.style.width = progress + "%";
        
        // Update info with time remaining
        const timeUntil = getTimeUntilString(targetTime);
        const periodInfo = infoElement.querySelector('.text-muted');
        if (periodInfo) {
            const periodText = periodInfo.textContent;
            periodInfo.innerHTML = periodText.replace(/Next dose in.*/, "Next dose in " + timeUntil);
        }
    } else {
        timerElement.textContent = "00:00:00";
        progressElement.style.width = "100%";
        
        // Time's up - show alarm
        showTimeUpAlarm();
        
        // Refresh the page to update medication states
        setTimeout(function() {
            location.reload();
        }, 5000);
    }
}

function showNoMedications() {
    const timerElement = document.getElementById('countdown-timer');
    const infoElement = document.getElementById('next-medication-info');
    const progressElement = document.getElementById('countdown-progress');
    
    timerElement.textContent = "--:--:--";
    infoElement.innerHTML = "<p class='mb-0 text-success'>✅ No medications scheduled for the rest of today</p>";
    progressElement.style.width = "0%";
}

function showTimeUpAlarm() {
    const timerElement = document.getElementById('countdown-timer');
    const infoElement = document.getElementById('next-medication-info');
    const modal = document.getElementById('medicationReminderModal');
    const alarmSound = document.getElementById('alarmSound');
    
    // Update countdown display
    timerElement.className = "display-1 fw-bold text-danger mb-2 animate-pulse";
    infoElement.innerHTML = "<p class='mb-0 text-danger'><strong>⚠️ Time to take your medication!</strong></p>" +
                           "<small class='text-muted'>Modal will appear shortly...</small>";
    
    // Set medication details in modal if available
    if (window.upcomingMedications && window.upcomingMedications.length > 0) {
        const nextMed = window.upcomingMedications[0];
        document.getElementById('reminderMedicationName').textContent = `Time to take ${nextMed.name}`;
        document.getElementById('reminderMedicationDetails').textContent = `${nextMed.dosage} • ${nextMed.period} • ${nextMed.time}`;
    }
    
    // Play alarm sound
    try {
        if (alarmSound) {
            // Reset and play sound
            alarmSound.currentTime = 0;
            alarmSound.play().catch(e => console.log('Audio play failed:', e));
            
            // Loop sound for 10 seconds
            let playCount = 0;
            const maxPlays = 20; // 10 seconds (20 * 500ms)
            const playInterval = setInterval(() => {
                if (playCount < maxPlays) {
                    alarmSound.currentTime = 0;
                    alarmSound.play().catch(e => console.log('Audio play failed:', e));
                    playCount++;
                } else {
                    clearInterval(playInterval);
                }
            }, 500);
        }
    } catch (e) {
        console.log('Audio error:', e);
    }
    
    // Show the modal after a short delay
    setTimeout(() => {
        if (modal) {
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
            
            // Focus on the "I've Taken It" button
            const takenButton = modal.querySelector('.btn-success');
            if (takenButton) {
                takenButton.focus();
            }
        }
    }, 1000);
    
    // Also show alarm banner for additional visibility
    const alarmBanner = document.getElementById('alarmBanner');
    if (alarmBanner) {
        alarmBanner.style.display = 'block';
        alarmBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// New functions for modal interactions
function markMedicationTaken() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('medicationReminderModal'));
    modal.hide();
    
    // Get the first medication ID from upcoming medications
    if (window.upcomingMedications && window.upcomingMedications.length > 0) {
        const firstMedId = window.upcomingMedications[0].id;
        confirmMedication(firstMedId);
    }
}

function snoozeReminder() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('medicationReminderModal'));
    modal.hide();
    
    // Stop alarm sound
    const alarmSound = document.getElementById('alarmSound');
    if (alarmSound) {
        alarmSound.pause();
        alarmSound.currentTime = 0;
    }
    
    // Hide alarm banner
    const alarmBanner = document.getElementById('alarmBanner');
    if (alarmBanner) {
        alarmBanner.style.display = 'none';
    }
    
    // Show snooze message
    const infoElement = document.getElementById('next-medication-info');
    infoElement.innerHTML = "<p class='mb-0 text-warning'><strong>⏰ Reminder snoozed for 5 minutes</strong></p>" +
                           "<small class='text-muted'>We'll remind you again soon.</small>";
    
    // Reset timer to snooze time (5 minutes from now)
    const now = new Date().getTime();
    const snoozeTime = now + (5 * 60 * 1000); // 5 minutes
    const timerElement = document.getElementById('countdown-timer');
    const progressElement = document.getElementById('countdown-progress');
    
    // Update countdown every second
    const snoozeInterval = setInterval(() => {
        const currentTime = new Date().getTime();
        const difference = snoozeTime - currentTime;
        
        if (difference > 0) {
            const hours = Math.floor(difference / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);
            
            timerElement.textContent = hours.toString().padStart(2, '0') + ":" + 
                                     minutes.toString().padStart(2, '0') + ":" + 
                                     seconds.toString().padStart(2, '0');
            
            // Update progress bar
            const snoozeProgress = Math.min(100, ((5 * 60 * 1000 - difference) / (5 * 60 * 1000)) * 100);
            progressElement.style.width = snoozeProgress + "%";
        } else {
            // Snooze time is up
            clearInterval(snoozeInterval);
            timerElement.textContent = "00:00:00";
            progressElement.style.width = "100%";
            showTimeUpAlarm(); // Show the alarm again
        }
    }, 1000);
}

function dismissReminder() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('medicationReminderModal'));
    modal.hide();
    
    // Stop alarm sound
    const alarmSound = document.getElementById('alarmSound');
    if (alarmSound) {
        alarmSound.pause();
        alarmSound.currentTime = 0;
    }
    
    // Hide alarm banner
    const alarmBanner = document.getElementById('alarmBanner');
    if (alarmBanner) {
        alarmBanner.style.display = 'none';
    }
    
    // Show dismissed message
    const infoElement = document.getElementById('next-medication-info');
    infoElement.innerHTML = "<p class='mb-0 text-muted'>⏰ Reminder dismissed</p>" +
                           "<small class='text-muted'>You'll be reminded at the next scheduled time.</small>";
    
    // Reset to normal state
    setTimeout(() => {
        showNoMedications();
    }, 3000);
}

function initializeComplianceChart() {
    const ctx = document.getElementById('complianceChart');
    if (!ctx) {
        console.log("❌ Compliance chart canvas not found");
        return;
    }
    
    // Parse the template variables safely
    let takenCount = 0;
    let missedCount = 0;
    
    try {
        takenCount = parseInt('{{ taken_count }}') || 0;
        missedCount = parseInt('{{ missed_count }}') || 0;
    } catch (e) {
        console.error("Error parsing compliance data:", e);
    }
    
    new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Taken', 'Missed'],
            datasets: [{
                data: [takenCount, missedCount],
                backgroundColor: ['#28a745', '#ffc107'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function confirmMedication(medicationId) {
    currentMedicationId = medicationId;
    const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    modal.show();
}

function confirmMedicationSubmit() {
    if (currentMedicationId) {
        fetch("/medication/confirm-medication/" + currentMedicationId, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (data.success) {
                location.reload();
            } else {
                alert("Error confirming medication");
            }
        });
    }
    bootstrap.Modal.getInstance(document.getElementById('confirmationModal')).hide();
}

function showReminderSettings() {
    alert("Reminder settings coming soon!");
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded - Initializing dashboard...");
    
    // Initialize countdown timer
    setTimeout(function() {
        initializeCountdownTimer();
    }, 1000);
    
    // Initialize compliance chart
    setTimeout(function() {
        initializeComplianceChart();
    }, 1000);
});
