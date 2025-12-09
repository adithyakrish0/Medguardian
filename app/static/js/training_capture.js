/**
 * Training Capture System for MedGuardian
 * 2-Phase approach: Background capture first, then medication capture
 * This prevents overfitting to background features
 */

class TrainingCaptureSystem {
    constructor() {
        this.stream = null;
        this.backgroundFrame = null;  // Single background capture
        this.medicationFrames = [];   // Medication images
        this.isCapturing = false;
        this.phase = 1;  // 1 = background, 2 = medication
        this.medicationStep = 0;
        this.totalMedicationSteps = 3;
        this.onComplete = null;
        this.onCancel = null;
        this.detectionInterval = null;
    }

    /**
     * Open training camera modal
     */
    async openModal(onComplete, onCancel) {
        this.onComplete = onComplete;
        this.onCancel = onCancel;
        this.backgroundFrame = null;
        this.medicationFrames = [];
        this.phase = 1;
        this.medicationStep = 0;
        this.isCapturing = false;

        // Create modal HTML
        const modalHtml = `
            <div id="trainingModal" class="training-modal">
                <div class="training-content">
                    <div class="training-header">
                        <h3>🤖 Train AI Recognition</h3>
                        <button type="button" class="btn-close-training" onclick="window.trainingCapture.close()">✕</button>
                    </div>
                    
                    <!-- Phase indicator -->
                    <div class="phase-indicator">
                        <div class="phase-box" id="phase1Box">
                            <span class="phase-num">1</span>
                            <span class="phase-text">Background</span>
                        </div>
                        <div class="phase-arrow">→</div>
                        <div class="phase-box" id="phase2Box">
                            <span class="phase-num">2</span>
                            <span class="phase-text">Medication</span>
                        </div>
                    </div>
                    
                    <div class="training-camera-container">
                        <video id="trainingVideo" autoplay playsinline muted></video>
                        <canvas id="trainingOverlay"></canvas>
                        
                        <!-- Big center prompt -->
                        <div id="centerPrompt" class="center-prompt">
                            <div id="promptIcon">🏠</div>
                            <div id="promptText">Step 1: Capture Background</div>
                            <div id="promptSubtext">Point camera where you'll show medication (without the bottle!)</div>
                        </div>
                        
                        <!-- Countdown -->
                        <div id="countdown" class="countdown" style="display: none;">3</div>
                    </div>
                    
                    <!-- Captured previews -->
                    <div class="preview-section">
                        <div class="preview-row">
                            <div class="preview-label">Background:</div>
                            <div id="bgPreview" class="bg-preview">
                                <span class="empty-preview">Not captured</span>
                            </div>
                        </div>
                        <div class="preview-row">
                            <div class="preview-label">Medication:</div>
                            <div id="medPreview" class="med-preview"></div>
                        </div>
                    </div>
                    
                    <div class="training-actions">
                        <button type="button" id="btnCapture" class="btn-capture" onclick="window.trainingCapture.captureCurrentStep()">
                            📸 Capture Background
                        </button>
                        <button type="button" id="btnDone" class="btn-done" style="display:none" onclick="window.trainingCapture.useCaptured()">
                            ✅ Done - Save Training
                        </button>
                        <button type="button" class="btn-cancel" onclick="window.trainingCapture.close()">
                            Cancel
                        </button>
                    </div>
                    
                    <p class="training-tip" id="trainingTip">
                        💡 Tip: This helps the AI focus on the medication, not your room!
                    </p>
                </div>
            </div>
        `;

        // Add styles
        if (!document.getElementById('trainingStyles')) {
            const styles = document.createElement('style');
            styles.id = 'trainingStyles';
            styles.textContent = `
                .training-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.95);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 10px;
                }
                .training-content {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 20px;
                    max-width: 450px;
                    width: 100%;
                    max-height: 95vh;
                    overflow-y: auto;
                    padding: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                }
                .training-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }
                .training-header h3 {
                    color: #00d4ff;
                    margin: 0;
                    font-size: 20px;
                }
                .btn-close-training {
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    font-size: 18px;
                    cursor: pointer;
                }
                .phase-indicator {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    margin-bottom: 15px;
                }
                .phase-box {
                    padding: 8px 16px;
                    border-radius: 8px;
                    background: rgba(255,255,255,0.1);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #888;
                }
                .phase-box.active {
                    background: #00d4ff;
                    color: #000;
                }
                .phase-box.done {
                    background: #00c853;
                    color: white;
                }
                .phase-num {
                    font-weight: bold;
                    font-size: 16px;
                }
                .phase-arrow {
                    color: #555;
                    font-size: 20px;
                }
                .training-camera-container {
                    position: relative;
                    border-radius: 16px;
                    overflow: hidden;
                    background: #000;
                    margin-bottom: 15px;
                    aspect-ratio: 4/3;
                }
                .training-camera-container video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .training-camera-container canvas {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                }
                .center-prompt {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                    color: white;
                    pointer-events: none;
                    background: rgba(0,0,0,0.7);
                    padding: 20px;
                    border-radius: 16px;
                }
                .center-prompt #promptIcon {
                    font-size: 48px;
                    margin-bottom: 10px;
                }
                .center-prompt #promptText {
                    font-size: 18px;
                    font-weight: bold;
                }
                .center-prompt #promptSubtext {
                    font-size: 13px;
                    color: #aaa;
                    margin-top: 8px;
                    max-width: 250px;
                }
                .countdown {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 100px;
                    font-weight: bold;
                    color: #00d4ff;
                    text-shadow: 0 0 30px rgba(0,212,255,0.5);
                }
                .preview-section {
                    margin-bottom: 15px;
                }
                .preview-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 8px;
                }
                .preview-label {
                    color: #888;
                    font-size: 13px;
                    min-width: 90px;
                }
                .bg-preview, .med-preview {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                }
                .bg-preview img, .med-preview img {
                    width: 50px;
                    height: 50px;
                    object-fit: cover;
                    border-radius: 8px;
                    border: 2px solid #00c853;
                }
                .empty-preview {
                    color: #555;
                    font-size: 12px;
                    font-style: italic;
                }
                .training-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .btn-capture {
                    background: linear-gradient(135deg, #00d4ff, #0099cc);
                    color: white;
                    border: none;
                    padding: 14px;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                }
                .btn-capture.phase2 {
                    background: linear-gradient(135deg, #ff9800, #f57c00);
                }
                .btn-capture:disabled {
                    background: #555;
                    cursor: not-allowed;
                }
                .btn-done {
                    background: linear-gradient(135deg, #00c853, #009624);
                    color: white;
                    border: none;
                    padding: 14px;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                }
                .btn-cancel {
                    background: transparent;
                    color: #888;
                    border: 1px solid #444;
                    padding: 10px;
                    border-radius: 12px;
                    font-size: 13px;
                    cursor: pointer;
                }
                .training-tip {
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                    margin: 10px 0 0;
                }
            `;
            document.head.appendChild(styles);
        }

        // Insert modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Start camera
        await this.startCamera();

        // Update UI
        this.updateUI();
    }

    /**
     * Start camera stream
     */
    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });

            const video = document.getElementById('trainingVideo');
            video.srcObject = this.stream;
            await video.play();

        } catch (err) {
            console.error('Camera error:', err);
        }
    }

    /**
     * Update UI based on current phase
     */
    updateUI() {
        const phase1Box = document.getElementById('phase1Box');
        const phase2Box = document.getElementById('phase2Box');
        const promptIcon = document.getElementById('promptIcon');
        const promptText = document.getElementById('promptText');
        const promptSubtext = document.getElementById('promptSubtext');
        const btnCapture = document.getElementById('btnCapture');
        const btnDone = document.getElementById('btnDone');
        const tip = document.getElementById('trainingTip');

        // Update phase indicators
        phase1Box.classList.remove('active', 'done');
        phase2Box.classList.remove('active', 'done');

        if (this.phase === 1) {
            phase1Box.classList.add('active');
            promptIcon.textContent = '🏠';
            promptText.textContent = 'Step 1: Capture Background';
            promptSubtext.textContent = 'Point camera where you\'ll show medication (WITHOUT the bottle!)';
            btnCapture.textContent = '📸 Capture Background';
            btnCapture.classList.remove('phase2');
            tip.textContent = '💡 This helps the AI ignore your room and focus on the medication!';
        } else if (this.phase === 2) {
            phase1Box.classList.add('done');
            phase2Box.classList.add('active');

            const angles = ['Front view', 'Side view', 'Label view'];
            const icons = ['📦', '👈', '🏷️'];

            promptIcon.textContent = icons[this.medicationStep] || '📦';
            promptText.textContent = `Step 2: Capture Medication (${this.medicationStep + 1}/3)`;
            promptSubtext.textContent = `Show your medication - ${angles[this.medicationStep] || 'any angle'}`;
            btnCapture.textContent = `📸 Capture ${angles[this.medicationStep] || 'Medication'}`;
            btnCapture.classList.add('phase2');
            tip.textContent = '💡 Hold the medication steady in the same spot as the background capture!';
        }

        // Show/hide done button
        if (this.medicationFrames.length >= 2) {
            btnDone.style.display = 'block';
        } else {
            btnDone.style.display = 'none';
        }
    }

    /**
     * Capture current step
     */
    async captureCurrentStep() {
        if (this.isCapturing) return;
        this.isCapturing = true;

        const btnCapture = document.getElementById('btnCapture');
        const countdownEl = document.getElementById('countdown');
        const centerPrompt = document.getElementById('centerPrompt');

        if (btnCapture) btnCapture.disabled = true;
        if (centerPrompt) centerPrompt.style.display = 'none';

        // Countdown 3, 2, 1
        for (let i = 3; i >= 1; i--) {
            if (countdownEl) {
                countdownEl.style.display = 'block';
                countdownEl.textContent = i;
            }
            await this.delay(800);
        }

        // Flash
        if (countdownEl) countdownEl.textContent = '📸';

        // Capture frame
        const frame = this.captureFrame();

        if (frame) {
            if (this.phase === 1) {
                // Background capture
                this.backgroundFrame = frame;
                this.addBackgroundPreview(frame);
                this.phase = 2;  // Move to medication phase
            } else {
                // Medication capture
                this.medicationFrames.push(frame);
                this.addMedicationPreview(frame);
                this.medicationStep++;
            }
        }

        await this.delay(500);

        // Reset
        if (countdownEl) countdownEl.style.display = 'none';
        if (centerPrompt) centerPrompt.style.display = 'block';
        if (btnCapture) btnCapture.disabled = false;

        this.isCapturing = false;
        this.updateUI();
    }

    /**
     * Helper delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Capture single frame
     */
    captureFrame() {
        const video = document.getElementById('trainingVideo');
        if (!video || !video.videoWidth) return null;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        return canvas.toDataURL('image/jpeg', 0.7);
    }

    /**
     * Add background preview
     */
    addBackgroundPreview(base64) {
        const preview = document.getElementById('bgPreview');
        preview.innerHTML = '';
        const img = document.createElement('img');
        img.src = base64;
        preview.appendChild(img);
    }

    /**
     * Add medication preview
     */
    addMedicationPreview(base64) {
        const preview = document.getElementById('medPreview');
        const img = document.createElement('img');
        img.src = base64;
        preview.appendChild(img);
    }

    /**
     * Use captured images and close
     */
    useCaptured() {
        if (this.onComplete && this.medicationFrames.length > 0) {
            // Return both background and medication frames
            this.onComplete({
                background: this.backgroundFrame,
                medications: this.medicationFrames
            });
        }
        this.close();
    }

    /**
     * Close modal and cleanup
     */
    close() {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        const modal = document.getElementById('trainingModal');
        if (modal) modal.remove();

        if (this.onCancel && this.medicationFrames.length === 0) {
            this.onCancel();
        }
    }
}

// Global instance
window.trainingCapture = new TrainingCaptureSystem();
