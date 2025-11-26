/**
 * MedGuardian Confirmation Dialogs
 * Provides user-friendly confirmation prompts for critical actions
 * Senior-friendly design with large, clear buttons
 */

class ConfirmDialog {
    constructor() {
        this.dialog = null;
        this.createDialog();
    }

    createDialog() {
        // Create dialog overlay
        this.dialog = document.createElement('div');
        this.dialog.id = 'confirm-dialog';
        this.dialog.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 10000;
            justify-content: center;
            align-items: center;
        `;

        // Create dialog box
        const dialogBox = document.createElement('div');
        dialogBox.style.cssText = `
            background: white;
            padding: 40px;
            border-radius: 20px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 10px 50px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;

        // Create icon
        const icon = document.createElement('div');
        icon.id = 'confirm-icon';
        icon.style.cssText = `
            font-size: 60px;
            text-align: center;
            margin-bottom: 20px;
        `;
        icon.textContent = '⚠️';

        // Create title
        const title = document.createElement('h2');
        title.id = 'confirm-title';
        title.style.cssText = `
            font-size: 28px;
            font-weight: 700;
            color: #333;
            margin: 0 0 15px 0;
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;
        title.textContent = 'Confirm Action';

        // Create message
        const message = document.createElement('p');
        message.id = 'confirm-message';
        message.style.cssText = `
            font-size: 20px;
            color: #666;
            margin: 0 0 30px 0;
            text-align: center;
            line-height: 1.5;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;
        message.textContent = 'Are you sure?';

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        `;

        // Create cancel button
        const cancelButton = document.createElement('button');
        cancelButton.id = 'confirm-cancel';
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = `
            padding: 18px 40px;
            font-size: 20px;
            font-weight: 600;
            border: 2px solid #ddd;
            background: white;
            color: #666;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            min-width: 140px;
        `;
        cancelButton.onmouseover = () => {
            cancelButton.style.background = '#f5f5f5';
            cancelButton.style.borderColor = '#999';
        };
        cancelButton.onmouseout = () => {
            cancelButton.style.background = 'white';
            cancelButton.style.borderColor = '#ddd';
        };

        // Create confirm button
        const confirmButton = document.createElement('button');
        confirmButton.id = 'confirm-yes';
        confirmButton.textContent = 'Confirm';
        confirmButton.style.cssText = `
            padding: 18px 40px;
            font-size: 20px;
            font-weight: 600;
            border: none;
            background: #d32f2f;
            color: white;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            min-width: 140px;
        `;
        confirmButton.onmouseover = () => {
            confirmButton.style.background = '#b71c1c';
            confirmButton.style.transform = 'scale(1.02)';
        };
        confirmButton.onmouseout = () => {
            confirmButton.style.background = '#d32f2f';
            confirmButton.style.transform = 'scale(1)';
        };

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-50px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);

        // Assemble dialog
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);
        dialogBox.appendChild(icon);
        dialogBox.appendChild(title);
        dialogBox.appendChild(message);
        dialogBox.appendChild(buttonContainer);
        this.dialog.appendChild(dialogBox);

        // Add to body
        document.body.appendChild(this.dialog);
    }

    show(options = {}) {
        const {
            title = 'Confirm Action',
            message = 'Are you sure you want to proceed?',
            icon = '⚠️',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            confirmColor = '#d32f2f',
            onConfirm = () => { },
            onCancel = () => { }
        } = options;

        return new Promise((resolve) => {
            const titleEl = document.getElementById('confirm-title');
            const messageEl = document.getElementById('confirm-message');
            const iconEl = document.getElementById('confirm-icon');
            const confirmBtn = document.getElementById('confirm-yes');
            const cancelBtn = document.getElementById('confirm-cancel');

            if (titleEl) titleEl.textContent = title;
            if (messageEl) messageEl.textContent = message;
            if (iconEl) iconEl.textContent = icon;
            if (confirmBtn) {
                confirmBtn.textContent = confirmText;
                confirmBtn.style.background = confirmColor;
            }
            if (cancelBtn) cancelBtn.textContent = cancelText;

            const handleConfirm = () => {
                this.hide();
                onConfirm();
                resolve(true);
                cleanup();
            };

            const handleCancel = () => {
                this.hide();
                onCancel();
                resolve(false);
                cleanup();
            };

            const cleanup = () => {
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
            };

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);

            this.dialog.style.display = 'flex';
        });
    }

    hide() {
        if (this.dialog) {
            this.dialog.style.display = 'none';
        }
    }
}

// Global confirm dialog instance
let confirmDialog;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    confirmDialog = new ConfirmDialog();
});

// Convenience functions
async function confirmDelete(itemName, callback) {
    if (!confirmDialog) {
        confirmDialog = new ConfirmDialog();
    }

    const confirmed = await confirmDialog.show({
        title: 'Delete Confirmation',
        message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
        icon: '🗑️',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmColor: '#d32f2f'
    });

    if (confirmed && callback) {
        callback();
    }

    return confirmed;
}

async function confirmAction(message, callback, options = {}) {
    if (!confirmDialog) {
        confirmDialog = new ConfirmDialog();
    }

    const confirmed = await confirmDialog.show({
        message,
        ...options
    });

    if (confirmed && callback) {
        callback();
    }

    return confirmed;
}

async function confirmMarkAsTaken(medicationName) {
    if (!confirmDialog) {
        confirmDialog = new ConfirmDialog();
    }

    return await confirmDialog.show({
        title: 'Mark as Taken',
        message: `Confirm that you have taken "${medicationName}"?`,
        icon: '💊',
        confirmText: 'Yes, I took it',
        cancelText: 'Cancel',
        confirmColor: '#4CAF50'
    });
}

// Export for use in other scripts
window.ConfirmDialog = ConfirmDialog;
window.confirmDelete = confirmDelete;
window.confirmAction = confirmAction;
window.confirmMarkAsTaken = confirmMarkAsTaken;
