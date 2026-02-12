"use client";

/**
 * Refill Alerts Widget
 * 
 * Dashboard widget showing refill alert summary badges.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pill, AlertTriangle, RefreshCw, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getRefillSummary, RefillSummary, getAlertLevelStyle } from '@/lib/api/refills';

interface RefillAlertsWidgetProps {
    className?: string;
}

export default function RefillAlertsWidget({ className = '' }: RefillAlertsWidgetProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<RefillSummary | null>(null);

    useEffect(() => {
        fetchSummary();
    }, []);

    const fetchSummary = async () => {
        try {
            setLoading(true);
            const result = await getRefillSummary();
            if (result.success) {
                setData(result);
            }
        } catch (err) {
            console.error('Failed to fetch refill summary:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={`p-5 bg-white/5 border border-white/10 rounded-2xl animate-pulse ${className}`}>
                <div className="h-6 bg-white/10 rounded w-1/2 mb-4" />
                <div className="h-12 bg-white/10 rounded" />
            </div>
        );
    }

    const hasAlerts = data && data.total > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-2xl border ${hasAlerts
                    ? 'bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30'
                    : 'bg-white/5 border-white/10'
                } ${className}`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasAlerts ? 'bg-orange-500/20' : 'bg-white/10'
                        }`}>
                        <Pill className={`w-5 h-5 ${hasAlerts ? 'text-orange-400' : 'text-gray-400'}`} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold">Refill Alerts</h3>
                        <p className="text-xs text-gray-400">
                            {hasAlerts ? `${data.total} medications need attention` : 'All medications stocked'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={fetchSummary}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            {hasAlerts && data && (
                <div className="flex items-center gap-3 mb-4">
                    {data.critical > 0 && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${getAlertLevelStyle('critical').bg}`}>
                            <span className={getAlertLevelStyle('critical').text}>{getAlertLevelStyle('critical').icon}</span>
                            <span className={`text-sm font-bold ${getAlertLevelStyle('critical').text}`}>
                                {data.critical}
                            </span>
                        </div>
                    )}
                    {data.warning > 0 && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${getAlertLevelStyle('warning').bg}`}>
                            <span className={getAlertLevelStyle('warning').text}>{getAlertLevelStyle('warning').icon}</span>
                            <span className={`text-sm font-bold ${getAlertLevelStyle('warning').text}`}>
                                {data.warning}
                            </span>
                        </div>
                    )}
                    {data.info > 0 && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${getAlertLevelStyle('info').bg}`}>
                            <span className={getAlertLevelStyle('info').text}>{getAlertLevelStyle('info').icon}</span>
                            <span className={`text-sm font-bold ${getAlertLevelStyle('info').text}`}>
                                {data.info}
                            </span>
                        </div>
                    )}
                </div>
            )}

            <Link
                href="/refills"
                className="flex items-center justify-between w-full px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
            >
                <span className="text-sm font-medium text-white">View All Refills</span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </Link>
        </motion.div>
    );
}
