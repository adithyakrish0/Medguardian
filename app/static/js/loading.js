/**
 * MedGuardian Loading States
 * Provides visual feedback during AJAX operations
 * Senior-friendly design with large, clear UI elements
 */

class LoadingOverlay {
    constructor() {
        this.overlay = null;
        this.createOverlay();
    }

    createOverlay() {
        // Create overlay element
        this.overlay = document.createElement('div');
        this.overlay.id = 'loading-overlay';
        this.overlay.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 9999;
            justify-content: center;
            align-items: center;
            flex-direction: column;
        `;

        // Create spinner container
        const spinnerContainer = document.createElement('div');
        spinnerContainer.style.cssText = `
            background: white;
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            min-width: 300px;
        `;

        // Create spinner
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.style.cssText = `
            border: 8px solid #f3f3f3;
            border-top: 8px solid #4CAF50;
            border-radius: 50%;
            width: 80px;
            height: 80px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        `;

        // Create message element
        const message = document.createElement('p');
        message.id = 'loading-message';
        message.style.cssText = `
            font-size: 22px;
            font-weight: 600;
            color: #333;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;
        message.textContent = 'Processing...';

        // Assemble the overlay
        spinnerContainer.appendChild(spinner);
        spinnerContainer.appendChild(message);
        this.overlay.appendChild(spinnerContainer);

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        // Add to body
        document.body.appendChild(this.overlay);
    }

    show(message = 'Processing...') {
        const messageEl = document.getElementById('loading-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
        if (this.overlay) {
            this.overlay.style.display = 'flex';
        }
    }

    hide() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
    }

    updateMessage(message) {
        const messageEl = document.getElementById('loading-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
    }
}

// Global loading instance
let loadingOverlay;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    loadingOverlay = new LoadingOverlay();
});

// Convenience functions
function showLoading(message = 'Processing...') {
    if (!loadingOverlay) {
        loadingOverlay = new LoadingOverlay();
    }
    loadingOverlay.show(message);
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.hide();
    }
}

function updateLoadingMessage(message) {
    if (loadingOverlay) {
        loadingOverlay.updateMessage(message);
    }
}

// Button loading state helper
function setButtonLoading(buttonElement, isLoading, originalText = null) {
    if (isLoading) {
        buttonElement.dataset.originalText = buttonElement.textContent;
        buttonElement.disabled = true;
        buttonElement.innerHTML = `
            <span style="display: inline-flex; align-items: center; gap: 10px;">
                <span style="
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    border: 3px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                "></span>
                Processing...
            </span>
        `;
        buttonElement.style.cursor = 'not-allowed';
        buttonElement.style.opacity = '0.7';
    } else {
        buttonElement.disabled = false;
        buttonElement.textContent = buttonElement.dataset.originalText || originalText || 'Submit';
        buttonElement.style.cursor = 'pointer';
        buttonElement.style.opacity = '1';
    }
}

// Export for use in other scripts
window.LoadingOverlay = LoadingOverlay;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.updateLoadingMessage = updateLoadingMessage;
window.setButtonLoading = setButtonLoading;
