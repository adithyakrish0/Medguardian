"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

export interface Medication {
    id: number;
    name: string;
    dosage: string;
    frequency: string;
    instructions: string;
    priority: 'low' | 'normal' | 'high';
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
    night: boolean;
    last_taken?: string;
}

export function useMedications(seniorId?: number) {
    const [medications, setMedications] = useState<Medication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMedications = useCallback(async () => {
        try {
            setLoading(true);
            const url = seniorId ? `/medications?senior_id=${seniorId}` : '/medications';
            const data = await apiFetch(url);
            if (data.success) {
                setMedications(data.data);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch medications');
            console.error('Error fetching medications:', err);
        } finally {
            setLoading(false);
        }
    }, [seniorId]);

    const markAsTaken = async (id: number, verified: boolean = true, method: string = 'manual') => {
        try {
            const data = await apiFetch(`/medications/${id}/mark-taken`, {
                method: 'POST',
                body: JSON.stringify({ verified, verification_method: method })
            });
            if (data.success) {
                // Refresh local state or re-fetch
                fetchMedications();
            }
            return data;
        } catch (err: any) {
            console.error('Error marking medication as taken:', err);
            throw err;
        }
    };

    useEffect(() => {
        fetchMedications();
    }, [fetchMedications]);

    return { medications, loading, error, refresh: fetchMedications, markAsTaken };
}
