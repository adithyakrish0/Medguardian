/**
 * MEDICATION REMINDER SYSTEM WITH FULL FORENSIC LOGGING
 * Every event logged to both console AND backend terminal
 */

class MedicationReminderSystem {
    constructor() {
        this.socket = null;
        this.notificationPermission = 'default';
        this.activeReminders = new Map();
        this.isConnected = false;
        this.pollingInterval = null;
        this.pollingEnabled = true;
        this.lastHeartbeat = Date.now();
    }

    /**
     * Send debug log to backend terminal
     */
    debugLog(component, event, status, data = '') {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
        const logMsg = `[FRONTEND | ${component} | ${event} | ${timestamp} | ${status} | ${data}]`;

        // Console log only (backend logging disabled to reduce noise)
        console.log(logMsg);

        // Backend logging disabled - was causing 400 errors
        // If needed later, add CSRF token and proper endpoint
        // Backend debug logging disabled to reduce 400 error noise
        // fetch('/debug-log', { ... }).catch(...);
    }

    /**
     * Initialize the reminder system
     */
    init() {
        this.debugLog('ReminderSystem', 'init', 'START', 'Initializing...');

        // Request notification permission (non-blocking)
        this.requestNotificationPermission();

        // Connect to SocketIO
        this.connectSocket();

        // Start polling as fallback
        this.startPolling();

        // Start heartbeat
        this.startHeartbeat();

        this.debugLog('ReminderSystem', 'init', 'COMPLETE', 'Initialization done');
    }

    /**
     * Heartbeat to confirm frontend is alive
     */
    startHeartbeat() {
        setInterval(() => {
            this.lastHeartbeat = Date.now();
            this.debugLog('ReminderSystem', 'heartbeat', 'ALIVE',
                `connected=${this.isConnected}, polling=${this.pollingEnabled}`);
        }, 30000);
    }

    /**
     * Request notification permission safely
     */
    requestNotificationPermission() {
        this.debugLog('ReminderSystem', 'requestNotificationPermission', 'START', '');
        try {
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    this.notificationPermission = permission;
                    this.debugLog('ReminderSystem', 'requestNotificationPermission', 'RESULT', permission);
                }).catch(err => {
                    this.debugLog('ReminderSystem', 'requestNotificationPermission', 'ERROR', err.message);
                });
            } else {
                this.debugLog('ReminderSystem', 'requestNotificationPermission', 'SKIPPED',
                    `permission_already=${Notification?.permission}`);
            }
        } catch (err) {
            this.debugLog('ReminderSystem', 'requestNotificationPermission', 'EXCEPTION', err.message);
        }
    }

    /**
     * Connect to SocketIO server
     */
    connectSocket() {
        this.debugLog('ReminderSystem', 'connectSocket', 'START', '');

        // Check if SocketIO is loaded
        if (typeof io === 'undefined') {
            this.debugLog('ReminderSystem', 'connectSocket', 'FAILED', 'io is undefined');
            return;
        }

        // Check if currentUserId is set
        if (!window.currentUserId) {
            this.debugLog('ReminderSystem', 'connectSocket', 'FAILED', 'currentUserId not set');
            return;
        }

        this.debugLog('ReminderSystem', 'connectSocket', 'CONNECTING', `userId=${window.currentUserId}`);

        try {
            this.socket = io({
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000
            });

            // Listen for medication reminders
            this.socket.on('medication_reminder', (data) => {
                this.debugLog('ReminderSystem', 'socket.on.medication_reminder', 'RECEIVED', JSON.stringify(data));
                this.handleReminder(data, 'socketio');
            });

            // Connection events
            this.socket.on('connect', () => {
                this.isConnected = true;
                this.debugLog('ReminderSystem', 'socket.on.connect', 'CONNECTED', `sid=${this.socket.id}`);

                // Join user room
                const room = `user_${window.currentUserId}`;
                this.debugLog('ReminderSystem', 'socket.emit.join', 'JOINING', room);
                this.socket.emit('join', { room: room });
            });

            this.socket.on('joined', (data) => {
                this.debugLog('ReminderSystem', 'socket.on.joined', 'SUCCESS', JSON.stringify(data));
            });

            this.socket.on('disconnect', () => {
                this.isConnected = false;
                this.debugLog('ReminderSystem', 'socket.on.disconnect', 'DISCONNECTED', '');
            });

            this.socket.on('connect_error', (error) => {
                this.debugLog('ReminderSystem', 'socket.on.connect_error', 'ERROR', error.message);
            });

            this.socket.on('error', (error) => {
                this.debugLog('ReminderSystem', 'socket.on.error', 'ERROR', JSON.stringify(error));
            });

        } catch (err) {
            this.debugLog('ReminderSystem', 'connectSocket', 'EXCEPTION', err.message);
        }
    }

    /**
     * Start polling for due reminders (fallback mechanism)
     */
    startPolling() {
        if (!this.pollingEnabled) {
            this.debugLog('ReminderSystem', 'startPolling', 'DISABLED', '');
            return;
        }

        this.debugLog('ReminderSystem', 'startPolling', 'START', 'interval=10s');

        // Poll immediately once
        this.checkDueReminders();

        // Then poll every 10 seconds
        this.pollingInterval = setInterval(() => {
            this.checkDueReminders();
        }, 10000);
    }

    /**
     * Check for due reminders via API
     */
    async checkDueReminders() {
        this.debugLog('ReminderSystem', 'checkDueReminders', 'POLLING', '');

        try {
            const response = await fetch('/medication/api/check-due-reminders', {
                credentials: 'same-origin'
            });

            if (!response.ok) {
                this.debugLog('ReminderSystem', 'checkDueReminders', 'HTTP_ERROR', `status=${response.status}`);
                return;
            }

            const data = await response.json();

            if (data.due) {
                this.debugLog('ReminderSystem', 'checkDueReminders', 'DUE_FOUND', JSON.stringify(data));
                this.handleReminder(data, 'polling');
            } else {
                this.debugLog('ReminderSystem', 'checkDueReminders', 'NO_DUE', '');
            }
        } catch (err) {
            this.debugLog('ReminderSystem', 'checkDueReminders', 'EXCEPTION', err.message);
        }
    }

    /**
     * Handle incoming medication reminder
     * REDIRECT to dedicated page
     */
    handleReminder(data, source) {
        const {
            medication_id,
            medication_name,
            scheduled_time,
            redirect_url
        } = data;

        this.debugLog('ReminderSystem', 'handleReminder', 'TRIGGERED',
            `source=${source}, med_id=${medication_id}, name=${medication_name}`);

        // Stop polling to prevent multiple redirects
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.debugLog('ReminderSystem', 'handleReminder', 'POLLING_STOPPED', '');
        }

        // Store active reminder
        this.activeReminders.set(medication_id, data);

        // Build redirect URL
        const url = redirect_url || `/medication/medication-reminder/${medication_id}?time=${encodeURIComponent(scheduled_time)}`;

        this.debugLog('ReminderSystem', 'handleReminder', 'REDIRECTING', url);

        // Check if already on the page (prevent loop)
        if (window.location.pathname === new URL(url, window.location.origin).pathname &&
            window.location.search === new URL(url, window.location.origin).search) {
            this.debugLog('ReminderSystem', 'handleReminder', 'ALREADY_ON_PAGE', 'Skipping redirect');
            return;
        }

        // Also simpler check for path
        if (window.location.href.includes(url) || (window.location.pathname.includes('/medication-reminder/') && url.includes(medication_id))) {
            this.debugLog('ReminderSystem', 'handleReminder', 'ALREADY_ON_PAGE_V2', 'Skipping redirect');
            return;
        }

        // Check if page is visible
        const isVisible = document.visibilityState === 'visible';
        this.debugLog('ReminderSystem', 'handleReminder', 'VISIBILITY_CHECK', `visible=${isVisible}`);

        // Perform redirect
        try {
            this.debugLog('ReminderSystem', 'handleReminder', 'REDIRECT_ATTEMPT', 'window.location.href');
            window.location.href = url;
            this.debugLog('ReminderSystem', 'handleReminder', 'REDIRECT_SET', 'success');
        } catch (err) {
            this.debugLog('ReminderSystem', 'handleReminder', 'REDIRECT_FAILED', err.message);
        }

        // Fallback check after 500ms
        setTimeout(() => {
            if (window.location.pathname.includes('/dashboard')) {
                this.debugLog('ReminderSystem', 'handleReminder', 'REDIRECT_FAILED_FALLBACK',
                    `still_on_dashboard after 500ms, current_path=${window.location.pathname}`);

                // Dump state
                this.dumpState();
            }
        }, 500);
    }

    /**
     * Dump full system state for debugging
     */
    dumpState() {
        const state = {
            currentPath: window.location.pathname,
            socketConnected: this.isConnected,
            socketId: this.socket?.id,
            pollingInterval: !!this.pollingInterval,
            activeReminders: Array.from(this.activeReminders.keys()),
            lastHeartbeat: new Date(this.lastHeartbeat).toISOString(),
            visibilityState: document.visibilityState,
            userAgent: navigator.userAgent.slice(0, 50)
        };

        this.debugLog('ReminderSystem', 'dumpState', 'FULL_STATE', JSON.stringify(state));
    }
}

// Initialize globally
const reminderSystem = new MedicationReminderSystem();

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[FRONTEND | DOM | DOMContentLoaded | FIRED]');
        reminderSystem.init();
    });
} else {
    console.log('[FRONTEND | DOM | already_ready | INIT_NOW]');
    reminderSystem.init();
}

window.reminderSystem = reminderSystem;
