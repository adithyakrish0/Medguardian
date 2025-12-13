/**
 * Accessibility Settings Manager
 * MedGuardian - For elderly-friendly accessibility
 */

class AccessibilityManager {
    constructor() {
        this.settings = this.loadSettings();
        this.init();
    }

    getDefaults() {
        return {
            fontSize: 'medium',      // small, medium, large, xlarge
            highContrast: false,
            reduceMotion: false,
            largeButtons: false,
            lineSpacing: 'normal',   // normal, relaxed, loose
            cursorSize: 'normal'     // normal, large
        };
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('accessibility');
            return saved ? { ...this.getDefaults(), ...JSON.parse(saved) } : this.getDefaults();
        } catch (e) {
            return this.getDefaults();
        }
    }

    saveSettings() {
        localStorage.setItem('accessibility', JSON.stringify(this.settings));
    }

    init() {
        this.applyAll();
    }

    applyAll() {
        this.applyFontSize(this.settings.fontSize);
        this.applyHighContrast(this.settings.highContrast);
        this.applyReduceMotion(this.settings.reduceMotion);
        this.applyLargeButtons(this.settings.largeButtons);
        this.applyLineSpacing(this.settings.lineSpacing);
        this.applyCursorSize(this.settings.cursorSize);
    }

    // Font Size
    applyFontSize(size) {
        document.body.classList.remove('font-small', 'font-medium', 'font-large', 'font-xlarge');
        document.body.classList.add(`font-${size}`);
        this.settings.fontSize = size;
        this.saveSettings();
    }

    // High Contrast
    applyHighContrast(enabled) {
        document.body.classList.toggle('high-contrast', enabled);
        this.settings.highContrast = enabled;
        this.saveSettings();
    }

    // Reduce Motion
    applyReduceMotion(enabled) {
        document.body.classList.toggle('reduce-motion', enabled);
        this.settings.reduceMotion = enabled;
        this.saveSettings();
    }

    // Large Buttons
    applyLargeButtons(enabled) {
        document.body.classList.toggle('large-buttons', enabled);
        this.settings.largeButtons = enabled;
        this.saveSettings();
    }

    // Line Spacing
    applyLineSpacing(spacing) {
        document.body.classList.remove('line-spacing-normal', 'line-spacing-relaxed', 'line-spacing-loose');
        document.body.classList.add(`line-spacing-${spacing}`);
        this.settings.lineSpacing = spacing;
        this.saveSettings();
    }

    // Cursor Size
    applyCursorSize(size) {
        document.body.classList.toggle('large-cursor', size === 'large');
        this.settings.cursorSize = size;
        this.saveSettings();
    }

    // Reset to defaults
    resetAll() {
        this.settings = this.getDefaults();
        this.saveSettings();
        this.applyAll();
    }

    // Open accessibility modal
    openModal() {
        // Remove existing modal if any
        const existing = document.getElementById('accessibilityModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'accessibilityModal';
        modal.className = 'accessibility-modal-overlay';
        modal.innerHTML = `
            <div class="accessibility-modal">
                <div class="accessibility-modal-header">
                    <h4><i class="fas fa-universal-access me-2"></i>Accessibility Settings</h4>
                    <button class="accessibility-close-btn" onclick="accessibilityManager.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="accessibility-modal-body">
                    <!-- Font Size -->
                    <div class="accessibility-option">
                        <label><i class="fas fa-text-height me-2"></i>Text Size</label>
                        <div class="btn-group w-100" role="group">
                            <button class="btn ${this.settings.fontSize === 'small' ? 'btn-primary' : 'btn-outline-primary'}" 
                                    onclick="accessibilityManager.applyFontSize('small')">A</button>
                            <button class="btn ${this.settings.fontSize === 'medium' ? 'btn-primary' : 'btn-outline-primary'}" 
                                    onclick="accessibilityManager.applyFontSize('medium')">A</button>
                            <button class="btn ${this.settings.fontSize === 'large' ? 'btn-primary' : 'btn-outline-primary'}" 
                                    onclick="accessibilityManager.applyFontSize('large')" style="font-size: 1.2rem;">A</button>
                            <button class="btn ${this.settings.fontSize === 'xlarge' ? 'btn-primary' : 'btn-outline-primary'}" 
                                    onclick="accessibilityManager.applyFontSize('xlarge')" style="font-size: 1.4rem;">A</button>
                        </div>
                    </div>

                    <!-- High Contrast -->
                    <div class="accessibility-option">
                        <label><i class="fas fa-adjust me-2"></i>High Contrast</label>
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="highContrastToggle" 
                                   ${this.settings.highContrast ? 'checked' : ''}
                                   onchange="accessibilityManager.applyHighContrast(this.checked)">
                            <label class="form-check-label" for="highContrastToggle">
                                ${this.settings.highContrast ? 'On' : 'Off'}
                            </label>
                        </div>
                    </div>

                    <!-- Large Buttons -->
                    <div class="accessibility-option">
                        <label><i class="fas fa-hand-pointer me-2"></i>Large Buttons</label>
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="largeButtonsToggle" 
                                   ${this.settings.largeButtons ? 'checked' : ''}
                                   onchange="accessibilityManager.applyLargeButtons(this.checked)">
                            <label class="form-check-label" for="largeButtonsToggle">
                                ${this.settings.largeButtons ? 'On' : 'Off'}
                            </label>
                        </div>
                    </div>

                    <!-- Reduce Motion -->
                    <div class="accessibility-option">
                        <label><i class="fas fa-running me-2"></i>Reduce Motion</label>
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="reduceMotionToggle" 
                                   ${this.settings.reduceMotion ? 'checked' : ''}
                                   onchange="accessibilityManager.applyReduceMotion(this.checked)">
                            <label class="form-check-label" for="reduceMotionToggle">
                                ${this.settings.reduceMotion ? 'On' : 'Off'}
                            </label>
                        </div>
                    </div>

                    <!-- Line Spacing -->
                    <div class="accessibility-option">
                        <label><i class="fas fa-align-left me-2"></i>Line Spacing</label>
                        <select class="form-select" onchange="accessibilityManager.applyLineSpacing(this.value)">
                            <option value="normal" ${this.settings.lineSpacing === 'normal' ? 'selected' : ''}>Normal</option>
                            <option value="relaxed" ${this.settings.lineSpacing === 'relaxed' ? 'selected' : ''}>Relaxed</option>
                            <option value="loose" ${this.settings.lineSpacing === 'loose' ? 'selected' : ''}>Loose</option>
                        </select>
                    </div>

                    <!-- Large Cursor -->
                    <div class="accessibility-option">
                        <label><i class="fas fa-mouse-pointer me-2"></i>Large Cursor</label>
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="largeCursorToggle" 
                                   ${this.settings.cursorSize === 'large' ? 'checked' : ''}
                                   onchange="accessibilityManager.applyCursorSize(this.checked ? 'large' : 'normal')">
                            <label class="form-check-label" for="largeCursorToggle">
                                ${this.settings.cursorSize === 'large' ? 'On' : 'Off'}
                            </label>
                        </div>
                    </div>
                </div>
                <div class="accessibility-modal-footer">
                    <button class="btn btn-outline-secondary" onclick="accessibilityManager.resetAll(); accessibilityManager.closeModal(); accessibilityManager.openModal();">
                        <i class="fas fa-undo me-1"></i>Reset to Default
                    </button>
                    <button class="btn btn-primary" onclick="accessibilityManager.closeModal()">
                        <i class="fas fa-check me-1"></i>Done
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
    }

    closeModal() {
        const modal = document.getElementById('accessibilityModal');
        if (modal) modal.remove();
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.accessibilityManager = new AccessibilityManager();
});
