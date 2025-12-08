/**
 * Camera Capture Module - WebRTC camera access and image capture
 * Handles both reference image capture and real-time verification
 */

class CameraCapture {
    constructor(videoElementId, canvasElementId) {
        this.video = document.getElementById(videoElementId);
        this.canvas = document.getElementById(canvasElementId);
        this.stream = null;
        this.isActive = false;
    }

    /**
     * Start camera stream
     * @param {Object} constraints - MediaStream constraints
     */
    async start(constraints = { video: { facingMode: 'environment' }, audio: false }) {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            this.video.play();
            this.isActive = true;

            console.log('✓ Camera started');
            return { success: true };

        } catch (error) {
            console.error('Camera error:', error);

            let errorMessage = 'Camera access denied';
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Please allow camera access in your browser settings';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No camera found on this device';
            }

            return { success: false, error: errorMessage };
        }
    }

    /**
     * Stop camera stream
     */
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
            this.isActive = false;
            console.log('✓ Camera stopped');
        }
    }

    /**
     * Capture current frame as base64 image
     */
    captureFrame(format = 'jpeg', quality = 0.92) {
        if (!this.isActive) {
            throw new Error('Camera is not active');
        }

        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;

        const ctx = this.canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        const imageDataURL = this.canvas.toDataURL(`image/${format}`, quality);

        console.log('✓ Frame captured');
        return imageDataURL;
    }

    async switchCamera() {
        const currentFacingMode = this.stream?.getVideoTracks()[0]?.getSettings()?.facingMode;
        const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

        this.stop();
        return await this.start({ video: { facingMode: newFacingMode }, audio: false });
    }

    static isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }
}

window.CameraCapture = CameraCapture;
