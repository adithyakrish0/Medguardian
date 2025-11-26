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
            customTimes.forEach(function (timeStr) {
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
    nextTimes.sort(function (a, b) {
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
        // Check for active snooze first
        let snoozeData = null;
        if (typeof window.activeSnooze !== 'undefined' && window.activeSnooze) {
            snoozeData = window.activeSnooze;
            console.log("Active snooze found:", snoozeData);
        }

        const now = new Date();
        console.log("Current time:", now);

        // If there's an active snooze, use that as the next event
        if (snoozeData && snoozeData.snooze_until) {
            const snoozeUntil = new Date(snoozeData.snooze_until);
            console.log("Using snooze time:", snoozeUntil);

            if (snoozeUntil > now) {
                // Update countdown display for snooze
                const timerElement = document.getElementById('countdown-timer');
                const infoElement = document.getElementById('next-medication-info');
                const progressElement = document.getElementById('countdown-progress');

                if (timerElement && infoElement && progressElement) {
                    // Update medication info with snooze details
                    const timeUntil = getTimeUntilString(snoozeUntil);
                    const medName = snoozeData.medication_name || 'Medication';
                    const dosage = snoozeData.dosage || 'Unknown dosage';

                    infoElement.innerHTML = "<p class='mb-0'><strong>⏰ Reminder Snoozed</strong></p>" +
                        "<small class='text-warning'>" + medName + " • " + dosage + "</small>" +
                        "<br><small class='text-warning'>Next reminder in " + timeUntil + "</small>";

                    // Start snooze countdown
                    updateCountdown(snoozeUntil, timerElement, infoElement, progressElement);
                    const intervalId = setInterval(function () {
                        updateCountdown(snoozeUntil, timerElement, infoElement, progressElement);
                    }, 1000);

                    // Store interval ID and snooze time for cleanup
                    window.countdownInterval = intervalId;
                    window.nextMedicationTime = snoozeUntil;

                    console.log("Snooze countdown timer started successfully!");
                    return;
                }
            } else {
                // Snooze has expired, clear it
                clearExpiredSnooze();
            }
        }

        // No active snooze, proceed with normal medication schedule
        // Get upcoming medications from page data
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

        // Parse the time string (e.g., "06:00 PM" or "18:00")
        let hour = 0, minute = 0;
        console.log("Parsing time:", nextMed.time);

        // More robust time parsing
        let nextTime = null;

        // Try 12-hour format first
        let timeMatch = nextMed.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);

        if (timeMatch) {
            hour = parseInt(timeMatch[1]);
            minute = parseInt(timeMatch[2]);
            let period = timeMatch[3].toUpperCase();

            // Convert 12-hour format to 24-hour format
            if (period === 'PM' && hour !== 12) {
                hour += 12;
            } else if (period === 'AM' && hour === 12) {
                hour = 0;
            }
        } else {
            // Try 24-hour format
            timeMatch = nextMed.time.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
                hour = parseInt(timeMatch[1]);
                minute = parseInt(timeMatch[2]);
            }
        }

        if (timeMatch) {
            console.log("Parsed time - hour:", hour, "minute:", minute);

            // Create datetime object for the next medication
            nextTime = new Date(now);
            nextTime.setHours(hour, minute, 0, 0);
            console.log("Next medication time:", nextTime);

            // If the time has passed today, schedule for tomorrow
            if (nextTime <= now) {
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(hour, minute, 0, 0);
                nextTime = tomorrow;
                console.log("Time passed, scheduling for tomorrow:", nextTime);
            }
        } else {
            console.error("Time match failed for:", nextMed.time);
            showNoMedications();
            return;
        }

        // Update countdown display
        const timerElement = document.getElementById('countdown-timer');
        const infoElement = document.getElementById('next-medication-info');
        const progressElement = document.getElementById('countdown-progress');

        if (timerElement && infoElement && progressElement && nextTime) {
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
            const intervalId = setInterval(function () {
                updateCountdown(nextTime, timerElement, infoElement, progressElement);
            }, 1000);

            // Store interval ID and nextTime for cleanup
            window.countdownInterval = intervalId;
            window.nextMedicationTime = nextTime;

            console.log("Countdown timer started successfully!");
        } else {
            console.error("One or more DOM elements not found or nextTime invalid:", {
                timer: !!timerElement,
                info: !!infoElement,
                progress: !!progressElement,
                nextTime: !!nextTime
            });
            showNoMedications();
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

        // Time's up - show alarm (no automatic refresh!)
        showTimeUpAlarm();
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

        // CRITICAL: Set the current medication ID so buttons work
        if (nextMed.id) {
            setCurrentMedication(nextMed);
        }

        const nameElement = document.getElementById('reminderMedicationName');
        const detailsElement = document.getElementById('reminderMedicationDetails');
        if (nameElement) nameElement.textContent = `Time to take ${nextMed.name}`;
        if (detailsElement) detailsElement.textContent = `${nextMed.dosage} • ${nextMed.period} • ${nextMed.time}`;

        // Speak the reminder
        speakMessage(`It's time to take your ${nextMed.name}. ${nextMed.dosage}.`);
    } else {
        speakMessage("It's time to take your medication.");
    }

    // Play alarm sound once (no looping to prevent errors)
    try {
        if (alarmSound) {
            // Reset and play sound once
            alarmSound.currentTime = 0;
            const playPromise = alarmSound.play();

            // Handle play promise properly
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log('Audio play failed:', error.message);
                    // Don't show error to user, just continue without sound
                }).then(() => {
                    // Auto-pause after 3 seconds
                    setTimeout(() => {
                        try {
                            alarmSound.pause();
                            alarmSound.currentTime = 0;
                        } catch (e) {
                            console.log('Audio cleanup error:', e);
                        }
                    }, 3000);
                });
            }
        }
    } catch (e) {
        console.log('Audio error:', e);
    }

    // Show the modal after a short delay
    setTimeout(() => {
        if (modal) {
            try {
                const modalInstance = new bootstrap.Modal(modal);
                modalInstance.show();

                // Focus on the "I've Taken It" button
                const takenButton = modal.querySelector('.btn-success');
                if (takenButton) {
                    takenButton.focus();
                }
            } catch (modalError) {
                console.log('Modal show error:', modalError);
                // If modal fails, just show a simple alert
                alert('Time to take your medication!');
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

// Global variables for tracking current medication
let currentMedicationId = null;
let currentMedicationName = null;

// New functions for modal interactions
function markMedicationTaken() {
    console.log("Marking medication as taken...");

    // Hide modal first
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

    // If we have a current medication ID, confirm it
    if (currentMedicationId) {
        confirmMedication(currentMedicationId);
    } else {
        // Fallback: get first medication from upcoming list
        if (window.upcomingMedications && window.upcomingMedications.length > 0) {
            const firstMed = window.upcomingMedications[0];
            confirmMedication(firstMed.id);
        } else {
            // Show success message and reset
            showSuccessMessage("Medication marked as taken!");
            resetTimerDisplay();
        }
    }
}

function snoozeReminder() {
    console.log("Snoozing reminder for 5 minutes...");

    // Get modal instance and hide it properly
    const modalElement = document.getElementById('medicationReminderModal');
    const modal = bootstrap.Modal.getInstance(modalElement);

    // Stop any existing alarm sound
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

    // Hide modal properly
    if (modal) {
        modal.hide();
    }

    // Clear any existing intervals
    if (window.snoozeInterval) {
        clearInterval(window.snoozeInterval);
    }
    if (window.countdownInterval) {
        clearInterval(window.countdownInterval);
    }

    // Get medication details for snooze
    const medName = currentMedicationName || 'Medication';
    const dosage = currentMedicationDosage || 'Unknown dosage';

    // Show snooze message
    const infoElement = document.getElementById('next-medication-info');
    infoElement.innerHTML = "<p class='mb-0 text-warning'><strong>⏰ Reminder snoozed for 5 minutes</strong></p>" +
        "<small class='text-muted'>We'll remind you again soon.</small>";

    // Reset timer style
    const timerElement = document.getElementById('countdown-timer');
    timerElement.className = "display-1 fw-bold text-warning mb-2 animate-pulse";
    timerElement.textContent = "00:05:00";

    // Reset progress bar
    const progressElement = document.getElementById('countdown-progress');
    if (progressElement) {
        progressElement.style.width = "0%";
    }

    // Create snooze in database
    createSnoozeRecord(medName, dosage);

    // Update snooze countdown every second
    const snoozeStartTime = new Date().getTime();
    const snoozeDuration = 5 * 60 * 1000; // 5 minutes

    window.snoozeInterval = setInterval(() => {
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
            clearInterval(window.snoozeInterval);
            delete window.snoozeInterval;

            timerElement.textContent = "00:00:00";
            timerElement.className = "display-1 fw-bold text-danger mb-2 animate-pulse";
            progressElement.style.width = "100%";

            // Show the alarm again after a short delay
            setTimeout(() => {
                showTimeUpAlarm();
            }, 1000);
        }
    }, 1000);
}

function dismissReminder() {
    console.log("Dismissing reminder...");

    try {
        // Hide modal properly
        const modalElement = document.getElementById('medicationReminderModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }

        // Stop alarm sound safely
        const alarmSound = document.getElementById('alarmSound');
        if (alarmSound) {
            try {
                alarmSound.pause();
                alarmSound.currentTime = 0;
            } catch (e) {
                console.log('Audio cleanup error:', e);
            }
        }

        // Hide alarm banner
        const alarmBanner = document.getElementById('alarmBanner');
        if (alarmBanner) {
            alarmBanner.style.display = 'none';
        }

        // Clear any existing intervals
        if (window.snoozeInterval) {
            clearInterval(window.snoozeInterval);
            delete window.snoozeInterval;
        }
        if (window.countdownInterval) {
            clearInterval(window.countdownInterval);
            delete window.countdownInterval;
        }

        // Reset timer display immediately
        resetTimerDisplay();

    } catch (error) {
        console.error('Error in dismissReminder:', error);
        // Fallback - just reload the page
        location.reload();
    }
}

function createSnoozeRecord(medicationName, dosage) {
    // Get current medication details
    const medicationId = currentMedicationId;
    const now = new Date();

    // Get the next medication time from upcoming medications
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

                nextMedicationTime = new Date(now);
                nextMedicationTime.setHours(hour, minute, 0, 0);

                // If time has passed, use tomorrow
                if (nextMedicationTime <= now) {
                    nextMedicationTime.setDate(nextMedicationTime.getDate() + 1);
                }
            }
        }
    }

    if (!nextMedicationTime) {
        // Fallback: use current time + 5 minutes
        nextMedicationTime = new Date(now.getTime() + 5 * 60 * 1000);
    }

    // Calculate snooze until time
    const snoozeUntil = new Date(nextMedicationTime.getTime() + 5 * 60 * 1000);

    // Send snooze request to server
    fetch('/snooze/create-snooze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            medication_id: medicationId,
            snooze_duration_minutes: 5,
            original_medication_time: nextMedicationTime.toISOString()
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Snooze record created successfully');
                // Store snooze data globally for page refresh persistence
                window.activeSnooze = {
                    id: data.snooze_id,
                    medication_name: medicationName,
                    dosage: dosage,
                    snooze_until: data.snooze_until,
                    original_medication_time: nextMedicationTime.toISOString()
                };
            } else {
                console.error('Failed to create snooze record:', data.message);
            }
        })
        .catch(error => {
            console.error('Error creating snooze record:', error);
        });
}

function clearExpiredSnooze() {
    if (window.activeSnooze) {
        delete window.activeSnooze;
        console.log('Expired snooze cleared');
    }
}

function confirmMedication(medicationId) {
    console.log("Confirming medication:", medicationId);

    // Use async/await instead of .then() to avoid promise issues
    (async function () {
        try {
            const response = await fetch("/medication/mark-taken/" + medicationId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ verified_by_camera: false })
            });

            const data = await response.json();

            if (data.success) {
                showSuccessMessage("Medication confirmed successfully!");
                setTimeout(() => {
                    location.reload();
                }, 1500);
            } else {
                showErrorMessage("Error confirming medication: " + data.message);
            }
        } catch (error) {
            console.error('Error confirming medication:', error);
            showErrorMessage("Failed to confirm medication");
        }
    })();
}

function showSuccessMessage(message) {
    const infoElement = document.getElementById('next-medication-info');
    infoElement.innerHTML = "<p class='mb-0 text-success'><strong>✅ " + message + "</strong></p>";
}

function showErrorMessage(message) {
    const infoElement = document.getElementById('next-medication-info');
    infoElement.innerHTML = "<p class='mb-0 text-danger'><strong>❌ " + message + "</strong></p>";
}

function resetTimerDisplay() {
    // Reinitialize the countdown timer
    if (window.countdownInterval) {
        clearInterval(window.countdownInterval);
    }
    initializeCountdownTimer();
}

// Set global variable for current medication
function setCurrentMedication(medication) {
    currentMedicationId = medication.id;
    currentMedicationName = medication.name;
    currentMedicationDosage = medication.dosage;
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

    // Use data attributes instead of template tags in JS file
    const chartData = document.getElementById('compliance-data');
    if (chartData) {
        takenCount = parseInt(chartData.getAttribute('data-taken')) || 0;
        missedCount = parseInt(chartData.getAttribute('data-missed')) || 0;
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

function confirmMedicationSubmit() {
    if (currentMedicationId) {
        // Use async/await to avoid promise issues
        (async function () {
            try {
                const response = await fetch("/medication/mark-taken/" + currentMedicationId, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ verified_by_camera: false })
                });

                const data = await response.json();

                if (data.success) {
                    location.reload();
                } else {
                    alert("Error confirming medication: " + (data.message || data.error));
                }
            } catch (error) {
                console.error('Error confirming medication:', error);
                alert("Failed to confirm medication");
            }
        })();
    }
}

// Text-to-Speech Function
function speakMessage(message) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 0.9; // Slightly slower for seniors
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        window.speechSynthesis.speak(utterance);
    } else {
        console.log("Text-to-speech not supported in this browser.");
    }
}

function showReminderSettings() {
    alert("Reminder settings coming soon!");
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM Content Loaded - Initializing dashboard...");

    // Initialize countdown timer
    setTimeout(function () {
        initializeCountdownTimer();
    }, 1000);

    // Initialize compliance chart
    setTimeout(function () {
        initializeComplianceChart();
    }, 1000);
});
