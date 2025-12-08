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

        } catch (error) {
            console.error('Verification error:', error);
            this.showError('Network error. Please try again.');
        } finally {
            this.isVerifying = false;
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

        if (result.success && result.correct_medication) {
            // CORRECT medication
            resultIcon.innerHTML = '✅';
            resultIcon.className = 'result-icon success';
            resultTitle.textContent = 'Correct Medication!';
            resultMessage.textContent = result.message || 'This is the right medication.';

            resultDetails.innerHTML = `
                <div class="detail-item">
                    <span class="detail-label">Method:</span>
                    <span class="detail-value">${result.method}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Confidence:</span>
                    <span class="detail-value">${Math.round(result.confidence * 100)}%</span>
                </div>
            `;
        } else {
            // WRONG medication or error
            resultIcon.innerHTML = '❌';
            resultIcon.className = 'result-icon error';
            resultTitle.textContent = 'Warning!';
            resultMessage.textContent = result.message || 'This does not match the expected medication.';

            resultDetails.innerHTML = `
                <div class="warning-box">
                    ⚠️ Please double-check you have the correct medication before taking it.
                </div>
            `;
        }
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
    }
}

// Make available globally
window.MedicationVerificationModal = MedicationVerificationModal;
