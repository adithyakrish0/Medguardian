"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { perfLog } from '@/lib/perfLogger';

/**
 * Performance-optimized dashboard hook using parallel API fetching.
 * Logs timing to browser console for diagnostics.
 */
export function useDashboardData(seniorId?: number) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboard = useCallback(async () => {
        perfLog.reset();
        perfLog.start('TOTAL_DASHBOARD_LOAD');

        try {
            setLoading(true);

            // Build URLs
            const statusUrl = seniorId ? `/medication-status?senior_id=${seniorId}` : '/medication-status';
            const userUrl = seniorId ? `/users/${seniorId}` : '/users/me';
            const analyticsUrl = seniorId ? `/analytics/adherence/${seniorId}?days=30` : '/analytics/adherence?days=30';
            const anomaliesUrl = seniorId ? `/analytics/anomalies/${seniorId}` : '/analytics/anomalies';

            // PARALLEL FETCHING - All requests fire simultaneously
            const [statusData, userData, analyticsData, anomaliesData] = await Promise.all([
                perfLog.measure('fetch-medication-status', () => apiFetch(statusUrl)),
                perfLog.measure('fetch-user-data', () => apiFetch(userUrl).catch(() => ({ data: { username: 'Senior' } }))),
                perfLog.measure('fetch-analytics', () => apiFetch(analyticsUrl)),
                perfLog.measure('fetch-anomalies', () => apiFetch(anomaliesUrl).catch(() => ({ data: { anomalies: [], forecasted_risk: 0 } })))
            ]);

            // Process results
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
                        : (analyticsData.data?.length > 0
                            ? Math.round(analyticsData.data.filter((d: any) => !d.isLocked).reduce((sum: number, d: any) => sum + (d.adherence || 0), 0) / Math.max(1, analyticsData.data.filter((d: any) => !d.isLocked).length))
                            : 0),
                    total: statusData.total_today,
                    history: analyticsData.data || [],
                    predictive: anomaliesData.data
                }
            });

            perfLog.end('TOTAL_DASHBOARD_LOAD');
            perfLog.getSummary();

        } catch (err: any) {
            console.error('Dashboard fetch error:', err);
            setError(err.message || 'Failed to fetch dashboard data');
            perfLog.end('TOTAL_DASHBOARD_LOAD');
        } finally {
            setLoading(false);
        }
    }, [seniorId]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    return { data, loading, error, refresh: fetchDashboard };
}
