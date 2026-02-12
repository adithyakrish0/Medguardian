"use client";

/**
 * Anomaly Alert Widget
 * 
 * Red banner widget for main caregiver dashboard showing active anomaly alerts.
 * Features: timestamp, patient info, anomaly type, pattern comparison, action buttons.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Check, Phone, Clock, User, TrendingDown, Calendar, Eye } from 'lucide-react';
import { AnomalyAlert, getAnomalyTypeInfo, getAnomalySeverity, formatAnomalyTime } from '@/lib/api/anomaly';

interface AnomalyAlertWidgetProps {
    alerts: AnomalyAlert[];
    onAcknowledge: (patientId: number) => void;
    onContact: (patientId: number, patientName: string) => void;
    onViewDetails?: (patientId: number) => void;
}

export default function AnomalyAlertWidget({
    alerts,
    onAcknowledge,
    onContact,
    onViewDetails
}: AnomalyAlertWidgetProps) {
    const [expandedAlert, setExpandedAlert] = useState<number | null>(null);
    const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set());

    // Filter out dismissed alerts
    const activeAlerts = alerts.filter(a => !dismissedAlerts.has(a.patient_id));

    if (activeAlerts.length === 0) {
        return null;
    }

    const handleDismiss = (patientId: number) => {
        setDismissedAlerts(prev => new Set(prev).add(patientId));
        onAcknowledge(patientId);
    };

    return (
        <div className="space-y-3">
            <AnimatePresence mode="popLayout">
                {activeAlerts.map((alert) => {
                    const typeInfo = getAnomalyTypeInfo(alert.anomaly_type);
                    const severity = getAnomalySeverity(alert.anomaly_score);
                    const isExpanded = expandedAlert === alert.patient_id;

                    return (
                        <motion.div
                            key={alert.patient_id}
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                scale: 1,
                            }}
                            exit={{ opacity: 0, x: 100, scale: 0.9 }}
                            transition={{ duration: 0.3 }}
                            className={`relative overflow-hidden rounded-2xl border-2 shadow-2xl ${severity.level === 'critical'
                                    ? 'bg-red-600 border-red-400/50 shadow-red-500/30'
                                    : severity.level === 'high'
                                        ? 'bg-orange-600 border-orange-400/50 shadow-orange-500/30'
                                        : 'bg-yellow-600 border-yellow-400/50 shadow-yellow-500/30'
                                }`}
                        >
                            {/* Pulse animation for critical */}
                            {severity.level === 'critical' && (
                                <motion.div
                                    className="absolute inset-0 bg-white/10"
                                    animate={{ opacity: [0, 0.2, 0] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            )}

                            {/* Main content */}
                            <div className="relative z-10 p-5">
                                {/* Header row */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                            <AlertTriangle className="w-7 h-7 text-white" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-black text-sm uppercase tracking-wider">
                                                    {typeInfo.icon} {typeInfo.label}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-white uppercase">
                                                    {severity.level}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-white/80 text-xs mt-0.5">
                                                <User className="w-3 h-3" />
                                                <span className="font-bold">{alert.patient_name}</span>
                                                <span>•</span>
                                                <Clock className="w-3 h-3" />
                                                <span>{formatAnomalyTime(alert.detected_at)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1.5 bg-white/20 rounded-full text-sm font-black text-white">
                                            Score: {alert.anomaly_score.toFixed(1)}
                                        </span>
                                        <button
                                            onClick={() => handleDismiss(alert.patient_id)}
                                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                        >
                                            <X className="w-5 h-5 text-white/80" />
                                        </button>
                                    </div>
                                </div>

                                {/* Alert message */}
                                <p className="text-white/90 text-sm font-medium mb-4">
                                    {alert.alert_message}
                                </p>

                                {/* Pattern comparison (if available) */}
                                {alert.details?.primary_anomaly?.details && (
                                    <div
                                        className="bg-white/10 rounded-xl p-3 mb-4 cursor-pointer"
                                        onClick={() => setExpandedAlert(isExpanded ? null : alert.patient_id)}
                                    >
                                        <div className="flex items-center justify-between text-xs text-white/70 mb-2">
                                            <span className="font-bold uppercase">Pattern Analysis</span>
                                            <Eye className="w-4 h-4" />
                                        </div>

                                        {alert.anomaly_type === 'unusual_timing' && (
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                <div>
                                                    <span className="text-white/60">Normal Pattern:</span>
                                                    <p className="text-white font-bold">
                                                        {alert.details.primary_anomaly.details.expected_time || '9:00 AM'} ± 30min
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-white/60">Detected:</span>
                                                    <p className="text-white font-bold">
                                                        {alert.details.primary_anomaly.details.observed_hours?.slice(-1)[0]?.toFixed(0) || '3'}:00 AM
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {alert.anomaly_type === 'adherence_drop' && (
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                <div>
                                                    <span className="text-white/60">Baseline:</span>
                                                    <p className="text-white font-bold">
                                                        {alert.details.primary_anomaly.details.baseline_adherence}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-white/60">Recent:</span>
                                                    <p className="text-white font-bold">
                                                        {alert.details.primary_anomaly.details.recent_adherence}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {alert.anomaly_type === 'skipping_pattern' && (
                                            <div className="text-xs">
                                                <span className="text-white/60">Skipped Days: </span>
                                                <span className="text-white font-bold">
                                                    {alert.details.primary_anomaly.details.skipped_days?.join(', ')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleDismiss(alert.patient_id)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-white font-bold text-sm transition-colors"
                                    >
                                        <Check className="w-4 h-4" />
                                        Acknowledge
                                    </button>
                                    <button
                                        onClick={() => onContact(alert.patient_id, alert.patient_name)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-white/90 rounded-xl text-gray-900 font-bold text-sm transition-colors"
                                    >
                                        <Phone className="w-4 h-4" />
                                        Contact Patient
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
