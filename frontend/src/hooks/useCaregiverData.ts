"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

export function useCaregiverData() {
    const [seniors, setSeniors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/caregiver/api/seniors');
            if (data.success) {
                setSeniors(data.data);
            }
        } catch (err: any) {
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
