"use client";

/**
 * Refills Dashboard
 * 
 * Full refill management page with predictions, alerts, and refill actions.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Pill, RefreshCw, Loader2, ChevronLeft, Check, Clock,
    TrendingDown, AlertTriangle, Calendar, Package
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    getRefillPredictions,
    getRefillAlerts,
    acknowledgeAlert,
    updateMedicationQuantity,
    triggerRefillCheck,
    PredictionsResponse,
    AlertsResponse,
    RefillPrediction,
    RefillAlert,
    getAlertLevelStyle,
    formatDaysRemaining,
    formatConfidenceInterval
} from '@/lib/api/refills';

export default function RefillsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [predictions, setPredictions] = useState<PredictionsResponse | null>(null);
    const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
    const [selectedMed, setSelectedMed] = useState<RefillPrediction | null>(null);
    const [refillQuantity, setRefillQuantity] = useState('');
    const [showRefillModal, setShowRefillModal] = useState(false);

    // Get patient ID (for demo, use 1 or current user)
    const patientId = 1;

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [predResult, alertResult] = await Promise.all([
                getRefillPredictions(patientId),
                getRefillAlerts(patientId)
            ]);

            if (predResult.success) setPredictions(predResult);
            if (alertResult.success) setAlerts(alertResult);
        } catch (err) {
            console.error('Failed to fetch refill data:', err);
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRefill = async () => {
        if (!selectedMed || !refillQuantity) return;

        try {
            const result = await updateMedicationQuantity(
                selectedMed.medication_id,
                parseInt(refillQuantity),
                'refilled'
            );

            if (result.success) {
                setShowRefillModal(false);
                setSelectedMed(null);
                setRefillQuantity('');
                fetchData();
            }
        } catch (err) {
            console.error('Failed to update quantity:', err);
        }
    };

    const handleAcknowledge = async (alertId: number) => {
        try {
            const result = await acknowledgeAlert(alertId);
            if (result.success) {
                fetchData();
            }
        } catch (err) {
            console.error('Failed to acknowledge:', err);
        }
    };

    const handleTriggerCheck = async () => {
        try {
            await triggerRefillCheck(patientId);
            fetchData();
        } catch (err) {
            console.error('Failed to trigger check:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-white mb-3"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </button>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Pill className="w-8 h-8 text-orange-400" />
                        Refill Management
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Predictive refill alerts and quantity tracking
                    </p>
                </div>

                <button
                    onClick={handleTriggerCheck}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-xl text-orange-300 font-bold text-sm transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Run Check
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-12 h-12 text-orange-400 animate-spin mb-4" />
                    <p className="text-gray-400">Loading refill data...</p>
                </div>
            ) : (
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Active Alerts */}
                    <div className="lg:col-span-1 space-y-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-400" />
                            Active Alerts ({alerts?.total_active || 0})
                        </h2>

                        {alerts?.active_alerts.map((alert) => {
                            const style = getAlertLevelStyle(alert.alert_level);
                            return (
                                <motion.div
                                    key={alert.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`p-4 rounded-2xl border ${style.border} ${style.bg}`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`font-bold ${style.text}`}>
                                            {style.icon} {alert.medication_name}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {alert.days_remaining}d left
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-sm mb-3">
                                        Runs out: {new Date(alert.predicted_depletion_date).toLocaleDateString()}
                                    </p>
                                    <button
                                        onClick={() => handleAcknowledge(alert.id)}
                                        className="w-full px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        Acknowledge
                                    </button>
                                </motion.div>
                            );
                        })}

                        {(!alerts?.active_alerts || alerts.active_alerts.length === 0) && (
                            <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-2xl text-center">
                                <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
                                <p className="text-green-300 font-bold">All Clear!</p>
                                <p className="text-green-400 text-sm">No refills needed</p>
                            </div>
                        )}
                    </div>

                    {/* Medication Predictions */}
                    <div className="lg:col-span-2 space-y-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <TrendingDown className="w-5 h-5 text-purple-400" />
                            Medication Stock ({predictions?.total_medications || 0})
                        </h2>

                        <div className="grid gap-4">
                            {predictions?.medications.map((med) => {
                                const style = getAlertLevelStyle(med.alert_level);
                                const percentage = med.initial_quantity
                                    ? Math.round((med.quantity_remaining / med.initial_quantity) * 100)
                                    : null;

                                return (
                                    <motion.div
                                        key={med.medication_id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/7 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full ${style.bg.replace('/20', '')}`} />
                                                <h3 className="text-white font-bold">{med.name}</h3>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${style.bg} ${style.text}`}>
                                                {formatDaysRemaining(med.days_remaining)}
                                            </span>
                                        </div>

                                        {/* Progress bar */}
                                        {percentage !== null && (
                                            <div className="mb-4">
                                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                                    <span>{med.quantity_remaining} pills remaining</span>
                                                    <span>{percentage}%</span>
                                                </div>
                                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${percentage > 50 ? 'bg-green-500' :
                                                                percentage > 25 ? 'bg-yellow-500' : 'bg-red-500'
                                                            }`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                                            <div>
                                                <p className="text-gray-500 text-xs">Daily Consumption</p>
                                                <p className="text-white font-medium">{med.avg_daily_consumption} pills</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">Depletion Date</p>
                                                <p className="text-white font-medium">
                                                    {new Date(med.predicted_depletion_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">Confidence</p>
                                                <p className="text-white font-medium">
                                                    ±{med.consumption_variance.toFixed(1)}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setSelectedMed(med);
                                                setRefillQuantity(String(med.initial_quantity || 90));
                                                setShowRefillModal(true);
                                            }}
                                            className="w-full px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-xl text-orange-300 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Package className="w-4 h-4" />
                                            Mark as Refilled
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {(!predictions?.medications || predictions.medications.length === 0) && (
                            <div className="p-8 bg-white/5 border border-white/10 rounded-2xl text-center">
                                <Pill className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                                <p className="text-gray-400">No medications with quantity tracking</p>
                                <p className="text-gray-500 text-sm mt-1">
                                    Add quantity information to medications to enable refill predictions
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Refill Modal */}
            {showRefillModal && selectedMed && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full"
                    >
                        <h3 className="text-xl font-bold text-white mb-4">
                            Refill {selectedMed.name}
                        </h3>

                        <div className="mb-6">
                            <label className="text-sm text-gray-400 block mb-2">
                                New Quantity (pills)
                            </label>
                            <input
                                type="number"
                                value={refillQuantity}
                                onChange={(e) => setRefillQuantity(e.target.value)}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                                min="1"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRefillModal(false)}
                                className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRefill}
                                className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl text-white font-bold transition-colors"
                            >
                                Confirm Refill
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
