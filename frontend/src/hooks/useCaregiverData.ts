"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

/**
 * Performance-optimized caregiver data hook with logging.
 */
export function useCaregiverData() {
    const [seniors, setSeniors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        const startTime = performance.now();
        console.time('⏱️ CAREGIVER_DATA_LOAD');

        try {
            setLoading(true);
            const data = await apiFetch('/caregiver/api/seniors');
            if (data.success) {
                setSeniors(data.data);
            }

            const duration = performance.now() - startTime;
            console.log(`🚀 Caregiver data loaded in ${duration.toFixed(0)}ms`);
            console.timeEnd('⏱️ CAREGIVER_DATA_LOAD');

        } catch (err: any) {
            console.error('Caregiver fetch error:', err);
            setError(err.message || 'Failed to fetch caregiver data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { seniors, loading, error, refresh: fetchData };
}
