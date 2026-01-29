"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

export function useDashboardData(seniorId?: number) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true);
            // Using the medication-status endpoint with optional senior_id
            const url = seniorId ? `/medication-status?senior_id=${seniorId}` : '/medication-status';
            const statusData = await apiFetch(url);
            console.log('[Dashboard] medication-status response:', statusData);

            // Also get profile info (if seniorId, get that senior's info, else get self)
            const userUrl = seniorId ? `/users/${seniorId}` : '/users/me';
            const userData = await apiFetch(userUrl).catch(() => ({ data: { username: 'Senior' } }));

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
