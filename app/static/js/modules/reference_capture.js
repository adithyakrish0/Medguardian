/**
 * Reference Image Capture - UI for capturing medication reference photos
 * Integrates with CameraCapture module
 */

class ReferenceImageCapture {
    constructor(medicationId, medicationName) {
        this.medicationId = medicationId;
        this.medicationName = medicationName;
        this.camera = null;
        this.capturedImage = null;
        this.modalElement = null;
    }

    /**
     * Show the capture modal
     */
    show() {
        this.createModal();
        this.modalElement.style.display = 'flex';

        // Initialize camera
        this.camera = new CameraCapture('referenceVideo', 'referenceCanvas');
        this.startCamera();
    }

    /**
     * Create modal HTML
     */
    createModal() {
        // Remove existing modal if any
        const existing = document.getElementById('referenceImageModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'referenceImageModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content reference-capture-modal">
                <div class="modal-header">
                    <h2>📸 Add Reference Photo</h2>
                    <p>Take a clear photo of <strong>${this.medicationName}</strong></p>
                    <button class="close-btn" onclick="referenceCapture.close()">×</button>
                </div>

                <div class="modal-body">
                    <!-- Camera Preview -->
                    <div id="cameraSection" class="camera-section">
                        <div class="camera-container">
                            <video id="referenceVideo" autoplay playsinline></video>
                            <canvas id="referenceCanvas" style="display: none;"></canvas>
                            
                            <div class="camera-controls">
                                <button id="switchCameraBtn" class="btn-icon" title="Switch Camera">
                                    🔄
                                </button>
                            </div>
                        </div>

                        <div class="capture-controls">
                            <button id="captureBtn" class="btn btn-primary btn-lg">
                                📷 Capture Photo
                            </button>
                            <button id="uploadBtn" class="btn btn-secondary">
                                📁 Upload Instead
                            </button>
                        </div>

                        <div class="tips">
                            <h4>💡 Multi-Angle Training (AI Robustness):</h4>
                            <ul>
                                <li>📸 Take 3-5 photos from different sides</li>
                                <li>✓ Front (Label), Back (Text), and Sides</li>
                                <li>✓ This helps the AI identify the bottle even if turned around</li>
                                <li>✓ Avoid shadows and reflections</li>
                            </ul>
                        </div>
                    </div>

                    <!-- Preview Section (hidden initially) -->
                    <div id="previewSection" class="preview-section" style="display: none;">
                        <img id="previewImage" alt="Preview">
                        
                        <div class="preview-controls">
                            <button id="retakeBtn" class="btn btn-secondary">
                                🔄 Retake Photo
                            </button>
                            <button id="saveBtn" class="btn btn-primary btn-lg">
                                ✅ Save & Continue
                            </button>
                        </div>
                    </div>

                    <!-- Upload Input (hidden) -->
                    <input type="file" id="uploadInput" accept="image/*" style="display: none;">

                    <!-- Loading State -->
                    <div id="loadingSection" class="loading-section" style="display: none;">
                        <div class="spinner"></div>
                        <p>Processing image...</p>
                    </div>

                    <!-- Error Message -->
                    <div id="errorSection" class="error-section" style="display: none;">
                        <p class="error-message"></p>
                        <button class="btn btn-secondary" onclick="location.reload()">
                            Try Again
                        </button>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-ghost" onclick="referenceCapture.skip()">
                        Skip for Now
                    </button>
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
        // Capture button
        document.getElementById('captureBtn').addEventListener('click', () => {
            this.capture();
        });

        // Switch camera
        document.getElementById('switchCameraBtn').addEventListener('click', async () => {
            await this.camera.switchCamera();
        });

        // Upload button
        document.getElementById('uploadBtn').addEventListener('click', () => {
            document.getElementById('uploadInput').click();
        });

        // File upload
        document.getElementById('uploadInput').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });

        // Retake button
        document.getElementById('retakeBtn').addEventListener('click', () => {
            this.retake();
        });

        // Save button
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.save();
        });
    }

    /**
     * Capture photo from camera
     */
    capture() {
        try {
            this.capturedImage = this.camera.captureFrame();
            this.showPreview();
        } catch (error) {
            this.showError('Failed to capture image: ' + error.message);
        }
    }

    /**
     * Handle file upload
     */
    handleFileUpload(file) {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showError('Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.capturedImage = e.target.result;
            this.showPreview();
        };
        reader.readAsDataURL(file);
    }

    /**
     * Show preview of captured image
     */
    showPreview() {
        // Stop camera
        if (this.camera) {
            this.camera.stop();
        }

        // Hide camera section
        document.getElementById('cameraSection').style.display = 'none';

        // Show preview section
        const previewSection = document.getElementById('previewSection');
        previewSection.style.display = 'block';

        const previewImage = document.getElementById('previewImage');
        previewImage.src = this.capturedImage;
    }

    /**
     * Retake photo
     */
    retake() {
        this.capturedImage = null;

        // Hide preview
        document.getElementById('previewSection').style.display = 'none';

        // Show camera
        document.getElementById('cameraSection').style.display = 'block';

        // Restart camera
        this.startCamera();
    }

    /**
     * Save reference image
     */
    async save() {
        if (!this.capturedImage) {
            this.showError('No image captured');
            return;
        }

        // Show loading
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('loadingSection').style.display = 'block';

        try {
            const response = await fetch(`/api/v1/medications/${this.medicationId}/reference-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: this.capturedImage
                })
            });

            const data = await response.json();

            if (data.success) {
                const totalAngles = data.total_angles || 1;
                this.showSuccess(`
                    Angle ${totalAngles} saved! 
                    <br><small>Take 2-3 more from different sides for best results.</small>
                    <div class="mt-3">
                        <button class="btn btn-secondary" onclick="referenceCapture.retake()">Add Another Angle</button>
                        <button class="btn btn-primary" onclick="location.reload()">Finish Training</button>
                    </div>
                `);
            } else {
                this.showError(data.error || 'Failed to save image');
            }

        } catch (error) {
            this.showError('Network error: ' + error.message);
        }
    }

    /**
     * Skip reference image
     */
    skip() {
        if (confirm('Skip adding reference photo? You can add it later from the medication details.')) {
            this.close();
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

    /**
     * Show error message
     */
    showError(message) {
        document.getElementById('cameraSection').style.display = 'none';
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('loadingSection').style.display = 'none';

        const errorSection = document.getElementById('errorSection');
        errorSection.style.display = 'block';
        errorSection.querySelector('.error-message').textContent = message;
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        document.getElementById('loadingSection').style.display = 'none';

        const successDiv = document.createElement('div');
        successDiv.className = 'success-section';
        successDiv.innerHTML = `
            <div class="success-icon">✅</div>
            <p>${message}</p>
        `;

        const modalBody = this.modalElement.querySelector('.modal-body');
        modalBody.innerHTML = '';
        modalBody.appendChild(successDiv);
    }
}

// Make available globally
window.ReferenceImageCapture = ReferenceImageCapture;
