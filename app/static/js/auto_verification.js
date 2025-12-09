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

            // Setup overlay canvas if not done
            this.setupOverlayCanvas(video);

            // Capture frame
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);

            const imageData = canvas.toDataURL('image/jpeg', 0.8);

            // Show scanning status
            this.updateStatus('verifying', '🔍 Scanning...');

            // Send to server with credentials for session cookies
            const response = await fetch('/medication/verify-realtime', {
                method: 'POST',
                credentials: 'same-origin',  // IMPORTANT: Send session cookies
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imageData,
                    medication_id: this.currentMedicationId
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

            // Draw detection overlay
            if (result.detections && result.detections.length > 0) {
                this.drawDetectionOverlay(result.detections, video.videoWidth, video.videoHeight);
            } else {
                this.clearOverlay();
            }

            // Update live info panel
            this.updateLiveInfo(result);

            // Handle verification result with detailed feedback
            if (result.verified && result.correct_medication) {
                const confidence = Math.round((result.confidence || 0) * 100);
                const method = result.method || 'unknown';
                const methodLabel = this.getMethodLabel(method);

                this.updateStatus('success', `✅ VERIFIED! ${confidence}% match via ${methodLabel}`);

                // Auto-mark as taken after 2 seconds
                setTimeout(() => {
                    this.autoMarkTaken();
                }, 2000);

            } else if (result.is_correct === false && result.detection_count > 0) {
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

        // Draw each detection
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
     * Clear the overlay canvas
     */
    clearOverlay() {
        const canvas = document.getElementById('detectionOverlay');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
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
