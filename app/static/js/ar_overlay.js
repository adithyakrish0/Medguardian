/**
 * AR-Style Medication Verification Overlay System
 * 
 * Lightweight AR overlay that visualizes YOLO detection + verification results
 * on the live camera feed. Backend sends data, frontend renders.
 * 
 * Features:
 * - Smooth bounding box interpolation (no jitter)
 * - Confidence-based colors (green/yellow/red)
 * - Frame stability (3/5 frames before showing result)
 * - Lock-on behavior after acceptance
 * - "Verifying..." neutral state before confirmation
 */

class MedicationAROverlay {
    constructor(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');

        // Scanning zone configuration (center of frame)
        // This is where user should place medication
        this.scanZone = {
            // Zone size as percentage of frame (40% width, 50% height)
            widthPercent: 0.45,
            heightPercent: 0.55,
            // Visual styling
            borderColor: 'rgba(0, 212, 255, 0.8)',  // Cyan
            borderWidth: 3,
            cornerLength: 30,
            pulseSpeed: 1500  // ms for one pulse cycle
        };

        // Interpolation state
        this.currentBox = null;
        this.targetBox = null;
        this.interpolationSpeed = 0.3; // 0.0-1.0, higher = faster tracking

        // Verification state
        this.verificationHistory = [];
        this.STABILITY_WINDOW = 5;
        this.STABILITY_THRESHOLD = 3;

        // Display state
        this.displayState = 'scanning'; // scanning, verifying, correct, wrong
        this.lockedResult = null;
        this.lockTimer = null;

        // Styling
        this.colors = {
            scanning: 'rgba(0, 212, 255, 0.8)',     // Cyan
            verifying: 'rgba(255, 193, 7, 0.8)',    // Yellow
            correct: 'rgba(40, 167, 69, 0.9)',      // Green
            wrong: 'rgba(220, 53, 69, 0.9)'         // Red
        };

        this.boxLineWidth = 3;
        this.cornerRadius = 8;
        this.labelPadding = 8;

        // Animation frame
        this._animationFrame = null;
        this._renderBound = this._render.bind(this);
    }

    /**
     * Start the overlay rendering loop
     */
    start() {
        console.log('🎯 AR Overlay starting...');
        console.log('   Video element:', this.video?.id || 'none');
        console.log('   Canvas element:', this.canvas?.id || 'none');

        this._resizeCanvas();
        this._animationFrame = requestAnimationFrame(this._renderBound);

        // Show scanning frame while no detection
        this.displayState = 'detecting';

        console.log('✅ AR Overlay started - animation loop running');

        // Handle window resize
        window.addEventListener('resize', () => this._resizeCanvas());
    }

    /**
     * Stop the overlay
     */
    stop() {
        if (this._animationFrame) {
            cancelAnimationFrame(this._animationFrame);
            this._animationFrame = null;
        }
        this._clearCanvas();
    }

    /**
     * Update with new detection results from backend
     * @param {Object} data - Backend response with bbox, is_correct, confidence, etc.
     */
    updateDetection(data) {
        // If locked, ignore new detections briefly
        if (this.lockedResult) return;

        if (data.detections && data.detections.length > 0) {
            // Use first detection (primary target)
            const det = data.detections[0];
            this.targetBox = {
                x1: det.bbox[0],
                y1: det.bbox[1],
                x2: det.bbox[2],
                y2: det.bbox[3],
                confidence: det.confidence,
                label: det.label
            };

            // Initialize current box if first detection
            if (!this.currentBox) {
                this.currentBox = { ...this.targetBox };
            }

            // Update verification history for stability
            this.verificationHistory.push({
                isCorrect: data.correct_medication || data.is_correct,
                confidence: data.weighted_confidence || data.confidence || det.confidence,
                stable: data.stable,
                timestamp: Date.now()
            });

            // Keep only recent history
            if (this.verificationHistory.length > this.STABILITY_WINDOW) {
                this.verificationHistory.shift();
            }

            // Determine display state based on stability
            this._updateDisplayState(data);

        } else {
            // No detection - fade out
            this.targetBox = null;
            this.verificationHistory = [];
            this.displayState = 'idle';
        }
    }

    /**
     * Update display state based on frame stability
     */
    _updateDisplayState(data) {
        const positiveCount = this.verificationHistory.filter(h => h.isCorrect).length;
        const totalCount = this.verificationHistory.length;

        // Check if we're stable yet
        const isStable = data.stable || (positiveCount >= this.STABILITY_THRESHOLD);

        if (totalCount < this.STABILITY_THRESHOLD) {
            // Not enough frames yet - show "verifying"
            this.displayState = 'verifying';
        } else if (isStable && positiveCount >= this.STABILITY_THRESHOLD) {
            // Stable and correct - lock on
            this.displayState = 'correct';
            this._lockResult('correct');
        } else if (totalCount >= this.STABILITY_WINDOW && positiveCount < 2) {
            // Consistently wrong
            this.displayState = 'wrong';
        } else {
            // Still verifying
            this.displayState = 'verifying';
        }
    }

    /**
     * Lock the result for visual feedback
     */
    _lockResult(state) {
        if (this.lockedResult) return;

        this.lockedResult = {
            state: state,
            box: { ...this.currentBox },
            timestamp: Date.now()
        };

        // Unlock after 1.5 seconds
        this.lockTimer = setTimeout(() => {
            this.lockedResult = null;
            this.verificationHistory = [];
            this.displayState = 'idle';
        }, 1500);
    }

    /**
     * Resize canvas to match video
     */
    _resizeCanvas() {
        const rect = this.video.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        // Store scale factors for coordinate mapping
        this.scaleX = rect.width / (this.video.videoWidth || rect.width);
        this.scaleY = rect.height / (this.video.videoHeight || rect.height);
    }

    /**
     * Get the scanning zone coordinates (for cropping)
     * Returns coordinates in VIDEO space (not canvas space)
     */
    getScanZoneCoords() {
        const videoW = this.video.videoWidth || 640;
        const videoH = this.video.videoHeight || 480;

        const zoneW = videoW * this.scanZone.widthPercent;
        const zoneH = videoH * this.scanZone.heightPercent;
        const zoneX = (videoW - zoneW) / 2;
        const zoneY = (videoH - zoneH) / 2;

        return {
            x: Math.floor(zoneX),
            y: Math.floor(zoneY),
            width: Math.floor(zoneW),
            height: Math.floor(zoneH)
        };
    }

    /**
     * Main render loop
     */
    _render() {
        this._clearCanvas();

        // ALWAYS draw the scanning zone
        this._drawScanZone();

        // If we have verification results, draw the result overlay
        if (this.displayState === 'correct' || this.displayState === 'wrong' || this.displayState === 'verifying') {
            this._drawResultOverlay();
        }

        // Continue animation loop
        this._animationFrame = requestAnimationFrame(this._renderBound);
    }

    /**
     * Draw the "place medication here" scanning zone
     */
    _drawScanZone() {
        const ctx = this.ctx;
        const zone = this.scanZone;

        // Calculate zone position in canvas space
        const zoneW = this.canvas.width * zone.widthPercent;
        const zoneH = this.canvas.height * zone.heightPercent;
        const x = (this.canvas.width - zoneW) / 2;
        const y = (this.canvas.height - zoneH) / 2;

        // Pulsing effect based on state
        const pulse = (Math.sin(Date.now() / zone.pulseSpeed * Math.PI * 2) + 1) / 2;
        const color = this.colors[this.displayState] || this.colors.scanning;

        // Draw semi-transparent overlay outside the zone (darkens edges)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        // Top
        ctx.fillRect(0, 0, this.canvas.width, y);
        // Bottom
        ctx.fillRect(0, y + zoneH, this.canvas.width, this.canvas.height - y - zoneH);
        // Left
        ctx.fillRect(0, y, x, zoneH);
        // Right
        ctx.fillRect(x + zoneW, y, this.canvas.width - x - zoneW, zoneH);

        // Draw corner brackets (scanning effect)
        ctx.strokeStyle = color;
        ctx.lineWidth = zone.borderWidth;
        ctx.lineCap = 'round';

        const cLen = zone.cornerLength + (pulse * 10);  // Pulsing corners

        // Top-left
        ctx.beginPath();
        ctx.moveTo(x, y + cLen);
        ctx.lineTo(x, y);
        ctx.lineTo(x + cLen, y);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(x + zoneW - cLen, y);
        ctx.lineTo(x + zoneW, y);
        ctx.lineTo(x + zoneW, y + cLen);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(x + zoneW, y + zoneH - cLen);
        ctx.lineTo(x + zoneW, y + zoneH);
        ctx.lineTo(x + zoneW - cLen, y + zoneH);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(x + cLen, y + zoneH);
        ctx.lineTo(x, y + zoneH);
        ctx.lineTo(x, y + zoneH - cLen);
        ctx.stroke();

        // Draw instruction text at bottom of zone
        const label = this._getZoneLabel();
        ctx.font = 'bold 16px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Text shadow for readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillText(label, this.canvas.width / 2 + 1, y + zoneH + 11);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, this.canvas.width / 2, y + zoneH + 10);
    }

    /**
     * Get instruction label based on current state
     */
    _getZoneLabel() {
        switch (this.displayState) {
            case 'scanning':
                return '📦 Place medication here';
            case 'verifying':
                return '🔍 Verifying...';
            case 'correct':
                return '✅ Correct medication!';
            case 'wrong':
                return '❌ Wrong medication';
            default:
                return '📦 Place medication here';
        }
    }

    /**
     * Draw verification result feedback
     */
    _drawResultOverlay() {
        const ctx = this.ctx;
        const color = this.colors[this.displayState];

        // Calculate zone for highlighting
        const zoneW = this.canvas.width * this.scanZone.widthPercent;
        const zoneH = this.canvas.height * this.scanZone.heightPercent;
        const x = (this.canvas.width - zoneW) / 2;
        const y = (this.canvas.height - zoneH) / 2;

        // Draw colored border around zone
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.strokeRect(x, y, zoneW, zoneH);

        // For correct state, draw checkmark in center
        if (this.displayState === 'correct' && this.lockedResult) {
            const elapsed = Date.now() - this.lockedResult.timestamp;
            const progress = Math.min(elapsed / 300, 1);
            this._drawCheckmark(ctx, x + zoneW / 2, y + zoneH / 2, 50 * progress, color);
        }
    }

    /**
     * Draw the AR overlay
     */
    _drawOverlay(box, state) {
        const ctx = this.ctx;
        const color = this.colors[state];

        // Scale coordinates from backend (usually 416x416 or original resolution)
        const scaledBox = {
            x1: box.x1 * this.scaleX,
            y1: box.y1 * this.scaleY,
            x2: box.x2 * this.scaleX,
            y2: box.y2 * this.scaleY
        };

        const x = scaledBox.x1;
        const y = scaledBox.y1;
        const w = scaledBox.x2 - scaledBox.x1;
        const h = scaledBox.y2 - scaledBox.y1;

        // Draw rounded rectangle border
        ctx.strokeStyle = color;
        ctx.lineWidth = this.boxLineWidth;
        ctx.beginPath();
        this._roundedRect(ctx, x, y, w, h, this.cornerRadius);
        ctx.stroke();

        // Draw corner accents (thicker lines at corners)
        ctx.lineWidth = this.boxLineWidth * 2;
        const cornerLength = Math.min(w, h) * 0.15;
        this._drawCornerAccents(ctx, x, y, w, h, cornerLength, color);

        // Draw label background
        const label = this._getLabel(state, box.confidence);
        ctx.font = 'bold 14px Inter, system-ui, sans-serif';
        const textMetrics = ctx.measureText(label);
        const labelWidth = textMetrics.width + this.labelPadding * 2;
        const labelHeight = 24;

        // Position label above box
        const labelX = x;
        const labelY = y - labelHeight - 4;

        // Label background
        ctx.fillStyle = color;
        ctx.beginPath();
        this._roundedRect(ctx, labelX, labelY, labelWidth, labelHeight, 4);
        ctx.fill();

        // Label text
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, labelX + this.labelPadding, labelY + labelHeight / 2);

        // Draw pulsing effect for "verifying" state
        if (state === 'verifying') {
            const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
            ctx.strokeStyle = `rgba(255, 193, 7, ${pulse})`;
            ctx.lineWidth = this.boxLineWidth + 2;
            ctx.beginPath();
            this._roundedRect(ctx, x - 3, y - 3, w + 6, h + 6, this.cornerRadius + 2);
            ctx.stroke();
        }

        // Draw success animation for "correct" state
        if (state === 'correct' && this.lockedResult) {
            const elapsed = Date.now() - this.lockedResult.timestamp;
            const progress = Math.min(elapsed / 300, 1); // 300ms animation

            // Checkmark animation
            this._drawCheckmark(ctx, x + w / 2, y + h / 2, Math.min(w, h) * 0.3 * progress, color);
        }
    }

    /**
     * Get label text based on state
     */
    _getLabel(state, confidence) {
        const confPercent = Math.round((confidence || 0) * 100);

        switch (state) {
            case 'detecting':
                return 'Detecting...';
            case 'verifying':
                return `Verifying... ${confPercent}%`;
            case 'correct':
                return `✓ Correct Medicine`;
            case 'wrong':
                return `✗ Wrong Medicine`;
            default:
                return '';
        }
    }

    /**
     * Draw rounded rectangle path
     */
    _roundedRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
    }

    /**
     * Draw corner accent lines
     */
    _drawCornerAccents(ctx, x, y, w, h, len, color) {
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';

        // Top-left
        ctx.beginPath();
        ctx.moveTo(x, y + len);
        ctx.lineTo(x, y);
        ctx.lineTo(x + len, y);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(x + w - len, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + len);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(x + w, y + h - len);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w - len, y + h);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(x + len, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + h - len);
        ctx.stroke();
    }

    /**
     * Draw animated checkmark
     */
    _drawCheckmark(ctx, cx, cy, size, color) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(cx - size * 0.5, cy);
        ctx.lineTo(cx - size * 0.1, cy + size * 0.4);
        ctx.lineTo(cx + size * 0.5, cy - size * 0.3);
        ctx.stroke();
    }

    /**
     * Clear the canvas
     */
    _clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Reset all state
     */
    reset() {
        this.currentBox = null;
        this.targetBox = null;
        this.verificationHistory = [];
        this.displayState = 'idle';
        this.lockedResult = null;
        if (this.lockTimer) {
            clearTimeout(this.lockTimer);
            this.lockTimer = null;
        }
        this._clearCanvas();
    }
}

// Export for use in other scripts
window.MedicationAROverlay = MedicationAROverlay;
