"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

export function useDashboardData() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true);
            // Using the medication-status endpoint for current view
            const statusData = await apiFetch('/medication-status');

            // Also get profile info
            const userData = await apiFetch('/users/me').catch(() => ({ data: { username: 'Senior' } }));

            setData({
                user: userData.data,
                schedule: {
                    taken: statusData.taken || [],
                    missed: statusData.missed || [],
                    upcoming: statusData.upcoming || []
                },
                stats: {
                    adherence: statusData.total_today > 0
                        ? Math.round((statusData.taken.length / statusData.total_today) * 100)
                        : 100,
                    total: statusData.total_today
                }
            });
        } catch (err: any) {
            setError(err.message || 'Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    return { data, loading, error, refresh: fetchDashboard };
}
