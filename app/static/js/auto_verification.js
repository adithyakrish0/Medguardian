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

            // Initialize AR overlay
            this.initAROverlay();

            // Start periodic camera verification (every 2 seconds for smoother AR)
            this.verificationInterval = setInterval(() => {
                this.captureAndVerify();
            }, 2000);  // Reduced from 3s to 2s for smoother overlay updates

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
     * NOW: Captures only the scanning zone (center crop) for shape-agnostic verification
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

            // Setup overlay canvas if not done
            this.setupOverlayCanvas(video);

            // Get scanning zone coordinates from AR overlay
            let zoneCoords = null;
            if (this.arOverlay && this.arOverlay.getScanZoneCoords) {
                zoneCoords = this.arOverlay.getScanZoneCoords();
            } else {
                // Fallback: center 45% x 55% of frame
                const zoneW = video.videoWidth * 0.45;
                const zoneH = video.videoHeight * 0.55;
                zoneCoords = {
                    x: Math.floor((video.videoWidth - zoneW) / 2),
                    y: Math.floor((video.videoHeight - zoneH) / 2),
                    width: Math.floor(zoneW),
                    height: Math.floor(zoneH)
                };
            }

            // Capture FULL frame first
            const fullCanvas = document.createElement('canvas');
            fullCanvas.width = video.videoWidth;
            fullCanvas.height = video.videoHeight;
            fullCanvas.getContext('2d').drawImage(video, 0, 0);

            // Crop the scanning zone
            const zoneCanvas = document.createElement('canvas');
            zoneCanvas.width = zoneCoords.width;
            zoneCanvas.height = zoneCoords.height;
            zoneCanvas.getContext('2d').drawImage(
                fullCanvas,
                zoneCoords.x, zoneCoords.y, zoneCoords.width, zoneCoords.height,  // Source
                0, 0, zoneCoords.width, zoneCoords.height  // Destination
            );

            const zoneImageData = zoneCanvas.toDataURL('image/jpeg', 0.85);
            const fullImageData = fullCanvas.toDataURL('image/jpeg', 0.7);

            // Update AR overlay state to "verifying"
            if (this.arOverlay) {
                this.arOverlay.displayState = 'verifying';
            }
            this.updateStatus('verifying', '🔍 Scanning...');

            // Send BOTH full frame and zone crop to server
            // Backend will use zone for AI matching, full for optional YOLO
            const response = await fetch('/medication/verify-realtime', {
                method: 'POST',
                credentials: 'same-origin',  // IMPORTANT: Send session cookies
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: fullImageData,
                    zone_image: zoneImageData,  // NEW: cropped zone for AI matching
                    medication_id: this.currentMedicationId,
                    zone_only: true  // NEW: flag to prioritize zone-based verification
                })
            });

            // Check if response is JSON (might get HTML error page)
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error('Non-JSON response:', response.status, contentType);
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Verification result:', result);

            // Update AR overlay STATE based on verification result
            if (this.arOverlay) {
                if (result.verified && result.correct_medication) {
                    // CORRECT - lock the result
                    this.arOverlay.displayState = 'correct';
                    this.arOverlay._lockResult('correct');
                } else if (result.is_correct === false && result.confidence > 0) {
                    // WRONG - show error state
                    this.arOverlay.displayState = 'wrong';
                } else {
                    // STILL SCANNING - waiting for better match
                    this.arOverlay.displayState = 'scanning';
                }
            }

            // Update live info panel
            this.updateLiveInfo(result);

            // Handle verification result with detailed feedback
            if (result.verified && result.correct_medication) {
                const confidence = Math.round((result.confidence || 0) * 100);
                const method = result.method || 'ai_training';
                const methodLabel = this.getMethodLabel(method);

                this.updateStatus('success', `✅ VERIFIED! ${confidence}% match via ${methodLabel}`);

                // STOP further verification to keep green state visible
                if (this.verificationInterval) {
                    clearInterval(this.verificationInterval);
                    this.verificationInterval = null;
                }

                // Auto-mark as taken after 4 seconds (increased for better UX)
                setTimeout(() => {
                    this.autoMarkTaken();
                }, 4000);

            } else if (result.is_correct === false && result.confidence > 0) {
                // Wrong medication detected
                this.updateStatus('error', `❌ Wrong medication! Expected: ${result.expected_medication || 'this medication'}`);

            } else if (result.detection_count > 0) {
                // Objects detected but not verified yet
                const bestDet = result.detections?.[0];
                const detInfo = bestDet ? `${bestDet.label} (${Math.round(bestDet.confidence * 100)}%)` : '';

                // Check AI training confidence if available
                if (result.confidence && result.confidence > 0) {
                    const aiConf = Math.round(result.confidence * 100);
                    this.updateStatus('waiting', `📦 Detected: ${detInfo} | AI Match: ${aiConf}%`);
                } else {
                    this.updateStatus('waiting', `📦 ${result.detection_count} object(s): ${detInfo}`);
                }

            } else {
                // Nothing detected
                this.updateStatus('waiting', '👀 Point camera at medication bottle/strip...');
            }

        } catch (error) {
            console.error('Verification error:', error);
            this.updateStatus('error', '⚠️ Connection error - retrying...');
            this.clearOverlay();
        } finally {
            this.isVerifying = false;
        }
    }

    /**
     * Get human-readable method label
     */
    getMethodLabel(method) {
        const labels = {
            'ai_training': '🤖 AI Training',
            'barcode': '📊 Barcode',
            'visual': '👁️ Visual',
            'ocr': '📝 Label Text',
            'multiple': '🔄 Combined'
        };
        return labels[method] || method;
    }

    /**
     * Update live info panel with detection details
     */
    updateLiveInfo(result) {
        // Create or update live info panel
        let infoPanel = document.getElementById('liveDetectionInfo');
        if (!infoPanel) {
            const cameraSection = document.getElementById('cameraSection');
            if (cameraSection) {
                infoPanel = document.createElement('div');
                infoPanel.id = 'liveDetectionInfo';
                infoPanel.className = 'live-detection-info';
                infoPanel.style.cssText = 'margin-top: 10px; padding: 10px; background: #1a1a2e; border-radius: 8px; font-size: 12px; font-family: monospace;';
                cameraSection.appendChild(infoPanel);
            }
        }

        if (infoPanel) {
            let html = '<div style="color: #00d4ff; margin-bottom: 5px;"><strong>📊 Live Detection</strong></div>';

            // Detection count
            html += `<div style="color: #aaa;">Objects detected: <span style="color: ${result.detection_count > 0 ? '#0f0' : '#f00'}">${result.detection_count || 0}</span></div>`;

            // List detections
            if (result.detections && result.detections.length > 0) {
                result.detections.forEach((det, i) => {
                    const conf = Math.round(det.confidence * 100);
                    const color = conf > 70 ? '#0f0' : conf > 40 ? '#ff0' : '#f00';
                    html += `<div style="color: #888; padding-left: 10px;">• ${det.label}: <span style="color: ${color}">${conf}%</span></div>`;
                });
            }

            // AI match confidence
            if (result.confidence !== undefined && result.confidence > 0) {
                const aiConf = Math.round(result.confidence * 100);
                const aiColor = aiConf > 85 ? '#0f0' : aiConf > 60 ? '#ff0' : '#f00';
                html += `<div style="color: #aaa; margin-top: 5px;">AI Match: <span style="color: ${aiColor}; font-weight: bold;">${aiConf}%</span></div>`;
            }

            // Verification method
            if (result.method) {
                html += `<div style="color: #888;">Method: ${this.getMethodLabel(result.method)}</div>`;
            }

            // Verification status
            if (result.is_correct !== undefined) {
                const statusColor = result.is_correct ? '#0f0' : '#f00';
                const statusText = result.is_correct ? '✓ MATCH' : '✗ NO MATCH';
                html += `<div style="color: ${statusColor}; font-weight: bold; margin-top: 5px;">${statusText}</div>`;
            }

            infoPanel.innerHTML = html;
        }
    }


    /**
     * Setup overlay canvas to match video dimensions
     */
    setupOverlayCanvas(video) {
        const canvas = document.getElementById('detectionOverlay');
        if (!canvas) return;

        const container = canvas.parentElement;
        if (!container) return;

        // Match canvas to video display size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
    }

    /**
     * Draw detection bounding boxes on overlay canvas
     */
    drawDetectionOverlay(detections, imgWidth, imgHeight) {
        const canvas = document.getElementById('detectionOverlay');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const video = document.getElementById('reminderCameraFeed');

        // Get display scale factor
        const scaleX = canvas.width / imgWidth;
        const scaleY = canvas.height / imgHeight;

        // Clear previous drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Use AR overlay if available, otherwise fall back to basic rendering
        if (this.arOverlay) {
            // AR overlay handles its own rendering via animation loop
            return;
        }

        // Fallback: Basic detection overlay (if AR not loaded)
        for (const det of detections) {
            const [x1, y1, x2, y2] = det.bbox;
            const confidence = det.confidence;
            const label = det.label || 'object';

            // Scale coordinates
            const sx1 = x1 * scaleX;
            const sy1 = y1 * scaleY;
            const sx2 = x2 * scaleX;
            const sy2 = y2 * scaleY;
            const width = sx2 - sx1;
            const height = sy2 - sy1;

            // Draw bounding box
            ctx.strokeStyle = '#00FF00';  // Bright green
            ctx.lineWidth = 3;
            ctx.strokeRect(sx1, sy1, width, height);

            // Draw label background
            const labelText = `${label}: ${(confidence * 100).toFixed(0)}%`;
            ctx.font = 'bold 14px Arial';
            const textMetrics = ctx.measureText(labelText);
            const textHeight = 20;

            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.fillRect(sx1, sy1 - textHeight - 4, textMetrics.width + 10, textHeight + 4);

            // Draw label text
            ctx.fillStyle = '#000000';
            ctx.fillText(labelText, sx1 + 5, sy1 - 8);
        }

        console.log(`Drew ${detections.length} detection overlay(s)`);
    }

    /**
     * Initialize AR overlay system (call once when camera starts)
     */
    initAROverlay() {
        console.log('🎯 Attempting to initialize AR overlay...');

        // Check if AR overlay class is available
        if (typeof MedicationAROverlay === 'undefined') {
            console.warn('❌ AR overlay class not loaded! Check if ar_overlay.js is included.');
            return;
        }
        console.log('✓ MedicationAROverlay class found');

        const video = document.getElementById('reminderCameraFeed');
        const canvas = document.getElementById('detectionOverlay');

        console.log('   Video element:', video ? 'found' : 'NOT FOUND');
        console.log('   Canvas element:', canvas ? 'found' : 'NOT FOUND');

        if (video && canvas) {
            this.arOverlay = new MedicationAROverlay(video, canvas);
            this.arOverlay.start();
            console.log('✅ AR overlay initialized and started!');
        } else {
            console.error('❌ Cannot initialize AR overlay - missing video or canvas element');
        }
    }

    /**
     * Update AR overlay with verification results
     */
    updateAROverlay(result) {
        if (!this.arOverlay) return;

        this.arOverlay.updateDetection(result);
    }

    /**
     * Clear the overlay canvas
     */
    clearOverlay() {
        const canvas = document.getElementById('detectionOverlay');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Also reset AR overlay if present
        if (this.arOverlay) {
            this.arOverlay.reset();
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

        // Call the markTaken function from reminder_page.html
        // Falls back to direct redirect if not available
        if (typeof markTaken === 'function') {
            await markTaken();
        } else if (typeof window.markTaken === 'function') {
            await window.markTaken();
        } else {
            // Fallback: redirect directly to dashboard
            console.log('markTaken not found, redirecting to dashboard...');
            window.location.href = '/dashboard';
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
