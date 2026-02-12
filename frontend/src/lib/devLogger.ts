/**
 * Development-only Logger
 * 
 * All logs from this utility are automatically disabled in production.
 * Use this for debug output that shouldn't appear in production console.
 * 
 * Usage:
 *   import { devLog } from '@/lib/devLogger';
 *   devLog('Some debug info:', data);
 */

const isDev = process.env.NODE_ENV === 'development';
// DEMO MODE: Set to false to disable all dev logs
const ENABLE_DEV_LOGS = false;

export const devLog = (...args: unknown[]) => {
    if (isDev && ENABLE_DEV_LOGS) console.log(...args);
};

export const devWarn = (...args: unknown[]) => {
    if (isDev && ENABLE_DEV_LOGS) console.warn(...args);
};

export const devError = (...args: unknown[]) => {
    // Errors are always logged, but with extra context in dev
    if (isDev) {
        console.error('[DEV]', ...args);
    } else {
        console.error(...args);
    }
};

export default { log: devLog, warn: devWarn, error: devError };
