/**
 * Medication Verification Modal
 * Used when user needs to verify they're taking the correct medication
 * Different from ReferenceImageCapture (which saves initial photos)
 */

class MedicationVerificationModal {
    constructor(medicationId, medicationName) {
        this.medicationId = medicationId;
        this.medicationName = medicationName;
        this.camera = null;
        this.modalElement = null;
        this.isVerifying = false;
    }

    /**
     * Show the verification modal
     */
    show() {
        this.createModal();
        this.modalElement.style.display = 'flex';

        // Initialize camera
        this.camera = new CameraCapture('verifyVideo', 'verifyCanvas');
        this.startCamera();

        // Accessibility: Voice Guide & Auto-Snap
        if (window.accessibility) {
            window.accessibility.speak(`Please point your camera at the ${this.medicationName} bottle.`);

            // Start stability monitor for Parkinson's/Tremor support
            setTimeout(() => {
                const video = document.getElementById('verifyVideo');
                if (video) {
                    window.accessibility.monitorStability(video, () => {
                        if (!this.isVerifying) {
                            window.accessibility.speak("Perfect! Holding steady. Scanning now.");
                            this.captureAndVerify();
                        }
                    });
                }
            }, 1000);
        }
    }

    /**
     * Create modal HTML
     */
    createModal() {
        // Remove existing modal if any
        const existing = document.getElementById('verificationModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'verificationModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content verification-modal">
                <div class="modal-header">
                    <h2>🔍 Verify Medication</h2>
                    <p>Confirm you're taking: <strong>${this.medicationName}</strong></p>
                    <button class="close-btn" onclick="verificationModal.close()">×</button>
                </div>

                <div class="modal-body">
                    <!-- Camera Section -->
                    <div id="cameraVerifySection" class="camera-section">
                        <div class="camera-container">
                            <video id="verifyVideo" autoplay playsinline></video>
                            <canvas id="verifyCanvas" style="display: none;"></canvas>
                            
                            <div class="camera-overlay">
                                <div class="scan-frame"></div>
                                <p class="scan-instruction">Point camera at medication</p>
                            </div>
                        </div>

                        <div class="verification-controls">
                            <button id="captureVerifyBtn" class="btn btn-primary btn-lg">
                                📸 Capture & Verify
                            </button>
                            <button id="skipVerifyBtn" class="btn btn-secondary">
                                Skip Verification
                            </button>
                        </div>
                    </div>

                    <!-- Loading Section -->
                    <div id="verifyLoadingSection" class="loading-section" style="display: none;">
                        <div class="spinner"></div>
                        <p>Verifying medication...</p>
                        <small>Comparing with reference image</small>
                    </div>

                    <!-- Result Section -->
                    <div id="verifyResultSection" class="result-section" style="display: none;">
                        <div id="resultIcon" class="result-icon"></div>
                        <h3 id="resultTitle"></h3>
                        <p id="resultMessage"></p>
                        <div id="resultDetails" class="result-details"></div>
                        
                        <div class="result-actions">
                            <button id="confirmTakenBtn" class="btn btn-primary btn-lg">
                                ✅ Confirm Taken
                            </button>
                            <button id="retryVerifyBtn" class="btn btn-secondary">
                                🔄 Try Again
                            </button>
                        </div>
                    </div>

                    <!-- Error Section -->
                    <div id="verifyErrorSection" class="error-section" style="display: none;">
                        <div class="error-icon">⚠️</div>
                        <p class="error-message"></p>
                        <button class="btn btn-secondary" onclick="verificationModal.retry()">
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modalElement = modal;
        this.attachEventListeners();
    }

    /**
     * Start camera
     */
    async startCamera() {
        const result = await this.camera.start();

        if (!result.success) {
            this.showError(result.error);
        }
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Capture & verify button
        document.getElementById('captureVerifyBtn').addEventListener('click', () => {
            this.captureAndVerify();
        });

        // Skip verification
        document.getElementById('skipVerifyBtn').addEventListener('click', () => {
            if (confirm('Mark as taken without verification?')) {
                this.markAsTaken(false);
            }
        });

        // Retry button
        document.getElementById('retryVerifyBtn')?.addEventListener('click', () => {
            this.retry();
        });

        // Confirm taken button
        document.getElementById('confirmTakenBtn')?.addEventListener('click', () => {
            this.markAsTaken(true);
        });
    }

    /**
     * Capture image and verify
     */
    async captureAndVerify() {
        if (this.isVerifying) return;

        this.isVerifying = true;

        try {
            // Capture frame
            const imageData = this.camera.captureFrame();

            // Show loading
            document.getElementById('cameraVerifySection').style.display = 'none';
            document.getElementById('verifyLoadingSection').style.display = 'block';

            // Call verification API
            const response = await fetch('/api/v1/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    medication_id: this.medicationId,
                    image: imageData
                })
            });

            const result = await response.json();

            // Stop camera
            if (this.camera) {
                this.camera.stop();
            }

            // Show result
            this.showResult(result);

            // Accessibility: Voice Feedback & Visual Flash
            if (window.accessibility) {
                if (result.success && result.is_verified) {
                    window.accessibility.speak("Medication verified. You can now take your dose.");
                    window.accessibility.visualFlash('success');
                } else if (result.cognitive_emergency) {
                    window.accessibility.speak("Security lockdown active. Please wait for help.");
                    window.accessibility.visualFlash('error');
                } else {
                    window.accessibility.speak("This does not match. Please check the bottle or try another side.");
                    window.accessibility.visualFlash('warning');
                }
            }

        } catch (error) {
            console.error('Verification error:', error);
            this.showError('Network error. Please try again.');
        } finally {
            this.isVerifying = false;
            // Stop stability monitor if we captured successfully
            if (window.accessibility) window.accessibility.stopStabilityMonitor();
        }
    }

    /**
     * Show verification result
     */
    showResult(result) {
        document.getElementById('verifyLoadingSection').style.display = 'none';
        document.getElementById('verifyResultSection').style.display = 'block';

        const resultIcon = document.getElementById('resultIcon');
        const resultTitle = document.getElementById('resultTitle');
        const resultMessage = document.getElementById('resultMessage');
        const resultDetails = document.getElementById('resultDetails');

        if (result.success && result.is_verified) {
            // CORRECT medication
            resultIcon.innerHTML = '✅';
            resultIcon.className = 'result-icon success';
            resultTitle.textContent = 'Correct Medication!';
            resultMessage.textContent = result.detection_message || 'This is the right medication.';

            resultDetails.innerHTML = `
                <div class="detail-item">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value text-success">Verified</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Confidence:</span>
                    <span class="detail-value">${Math.max(85, Math.round(result.match_score * 2))}%</span>
                </div>
            `;
        } else if (result.cognitive_emergency) {
            this.showSafetyLockdown(result.message);
        } else {
            // WRONG medication or error
            resultIcon.innerHTML = '❌';
            resultIcon.className = 'result-icon error';
            resultTitle.textContent = 'Verification Failed';
            resultMessage.textContent = result.detection_message || 'This does not match the expected medication.';

            resultDetails.innerHTML = `
                <div class="warning-box">
                    ⚠️ <strong>Safety Check:</strong> This bottle doesn't look like your ${this.medicationName}. 
                    Please check the label or ask for help.
                </div>
            `;
        }
    }

    /**
     * Display a high-priority safety lockdown UI (for Alzheimer's/Confusion)
     */
    showSafetyLockdown(message) {
        document.getElementById('cameraVerifySection').style.display = 'none';
        document.getElementById('verifyResultSection').style.display = 'none';

        const lockdownDiv = document.createElement('div');
        lockdownDiv.className = 'lockdown-alert animate-pulse';
        lockdownDiv.innerHTML = `
            <div class="lockdown-icon">🚨</div>
            <h3>SAFETY LOCKDOWN</h3>
            <p>${message}</p>
            <div class="lockdown-actions mt-4">
                <button class="btn btn-danger btn-lg w-100" onclick="window.location.href='/emergency/sos'">
                    🚨 Call Emergency / Caregiver
                </button>
                <button class="btn btn-ghost mt-3 w-100" onclick="location.reload()">
                    Close & Reset
                </button>
            </div>
        `;

        const modalBody = this.modalElement.querySelector('.modal-body');
        modalBody.innerHTML = '';
        modalBody.appendChild(lockdownDiv);

        // Play alert sound if available
        try { new Audio('/static/sounds/alert.mp3').play(); } catch (e) { }
    }

    /**
     * Show error
     */
    showError(message) {
        document.getElementById('cameraVerifySection').style.display = 'none';
        document.getElementById('verifyErrorSection').style.display = 'block';
        document.querySelector('#verifyErrorSection .error-message').textContent = message;
    }

    /**
     * Retry verification
     */
    retry() {
        document.getElementById('verifyResultSection').style.display = 'none';
        document.getElementById('verifyErrorSection').style.display = 'none';
        document.getElementById('cameraVerifySection').style.display = 'block';

        this.startCamera();

        if (window.accessibility) {
            window.accessibility.speak("Retrying. Please hold the bottle steady.");

            // Restart stability monitor
            setTimeout(() => {
                const video = document.getElementById('verifyVideo');
                if (video) {
                    window.accessibility.monitorStability(video, () => {
                        if (!this.isVerifying) {
                            this.captureAndVerify();
                        }
                    });
                }
            }, 500);
        }
    }

    /**
     * Mark medication as taken
     */
    async markAsTaken(verified) {
        try {
            const response = await fetch(`/medication/mark-taken/${this.medicationId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    verified_by_camera: verified
                })
            });

            const data = await response.json();

            if (data.success) {
                // Show success
                if (window.reminderSystem) {
                    window.reminderSystem.showToast('✅ Medication marked as taken', 'success');
                }

                // Close modal
                this.close();

                // Reload page to update status
                setTimeout(() => {
                    if (window.location.pathname.includes('medication')) {
                        window.location.reload();
                    }
                }, 1000);
            } else {
                alert('Failed to mark as taken: ' + (data.error || 'Unknown error'));
            }

        } catch (error) {
            console.error('Mark taken error:', error);
            alert('Network error. Please try again.');
        }
    }

    /**
     * Close modal
     */
    close() {
        if (this.camera) {
            this.camera.stop();
        }

        if (this.modalElement) {
            this.modalElement.remove();
        }

        // Accessibility: Stop stability monitor
        if (window.accessibility) window.accessibility.stopStabilityMonitor();
    }
}

// Make available globally
window.MedicationVerificationModal = MedicationVerificationModal;
