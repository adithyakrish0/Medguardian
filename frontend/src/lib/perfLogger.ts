/**
 * Performance Logger Utility
 * 
 * Usage:
 *   perfLog.start('fetch-medications');
 *   await fetch(...);
 *   perfLog.end('fetch-medications');
 * 
 * Or with measure():
 *   const data = await perfLog.measure('fetch-medications', () => fetch(...));
 * 
 * Note: Logs are only shown in development mode.
 */

const isDev = process.env.NODE_ENV === 'development';
// DEMO MODE: Set to false to disable all perf logs
const ENABLE_PERF_LOGS = false;

export const perfLog = {
    timers: {} as Record<string, number>,
    results: [] as Array<{ label: string; duration: number }>,

    start: (label: string) => {
        if (ENABLE_PERF_LOGS) console.log(`🟢 START: ${label}`);
        perfLog.timers[label] = performance.now();
    },

    end: (label: string) => {
        if (!perfLog.timers[label]) {
            if (ENABLE_PERF_LOGS) console.warn(`⚠️ No start time for: ${label}`);
            return 0;
        }
        const duration = performance.now() - perfLog.timers[label];
        const seconds = (duration / 1000).toFixed(2);
        if (ENABLE_PERF_LOGS) console.log(`🔴 END: ${label} - ${duration.toFixed(2)}ms (${seconds}s)`);

        perfLog.results.push({ label, duration });
        delete perfLog.timers[label];
        return duration;
    },

    async measure<T>(label: string, asyncFn: () => Promise<T>): Promise<T> {
        perfLog.start(label);
        try {
            const result = await asyncFn();
            perfLog.end(label);
            return result;
        } catch (error) {
            perfLog.end(label);
            throw error;
        }
    },

    getSummary: () => {
        if (ENABLE_PERF_LOGS) {
            console.log('\n📊 PERFORMANCE SUMMARY:');
            console.table(
                perfLog.results.map(r => ({
                    Label: r.label,
                    Duration: `${r.duration.toFixed(2)}ms`,
                    Seconds: `${(r.duration / 1000).toFixed(2)}s`
                }))
            );
        }
        return perfLog.results;
    },

    reset: () => {
        perfLog.timers = {};
        perfLog.results = [];
    }
};
