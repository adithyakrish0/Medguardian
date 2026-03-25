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
    TrendingDown, AlertTriangle, Calendar, Package, ShieldX
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
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

import { apiFetch } from '@/lib/api';
import { PageLoader } from '@/components/ui/SkeletonLoaders';
import { PageTransition } from '@/components/animations/PageTransition';

export default function RefillsPage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [predictions, setPredictions] = useState<PredictionsResponse | null>(null);
    const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [selectedMed, setSelectedMed] = useState<RefillPrediction | null>(null);
    const [refillQuantity, setRefillQuantity] = useState('');
    const [showRefillModal, setShowRefillModal] = useState(false);

    const fetchData = useCallback(async (targetId?: number) => {
        const id = targetId || selectedId;
        if (!id) return;
        
        try {
            setLoading(true);
            const [predResult, alertResult] = await Promise.all([
                getRefillPredictions(id),
                getRefillAlerts(id)
            ]);

            if (predResult.success) setPredictions(predResult);
            if (alertResult.success) setAlerts(alertResult);
        } catch (err) {
            console.error('Failed to fetch refill data:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedId]);

    const fetchPatients = useCallback(async () => {
        try {
            const res = await apiFetch('/caregiver/seniors');
            if (res.success && res.data) {
                setPatients(res.data);
                if (res.data.length > 0 && !selectedId) {
                    const firstId = res.data[0].senior_id || res.data[0].id;
                    setSelectedId(firstId);
                    fetchData(firstId);
                }
            }
        } catch (e) {
            console.error('Failed to load patients', e);
        }
    }, [selectedId, fetchData]);

    useEffect(() => {
        if (!userLoading && user) {
            if (user.role === 'caregiver') {
                fetchPatients();
            } else {
                // If somehow a senior gets here (though restricted)
                setSelectedId(user.id);
                fetchData(user.id);
            }
        }
    }, [userLoading, user, fetchPatients, fetchData]);

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
        if (!selectedId) return;
        try {
            await triggerRefillCheck(selectedId);
            fetchData();
        } catch (err) {
            console.error('Failed to trigger check:', err);
        }
    };

    if (!userLoading && user?.role !== 'caregiver') {
        return (
            <div className="text-center py-24 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md shadow-2xl">
                <ShieldX className="mx-auto h-20 w-20 text-slate-700 mb-8" />
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">ACCESS_RESTRICTED</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-4">
                    This section requires <span className="text-blue-400">Caregiver</span> access
                </p>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="mt-10 px-8 py-3 bg-white/5 border border-white/10 hover:bg-white hover:text-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                >
                    RETURN_TO_DASHBOARD
                </button>
            </div>
        );
    }

    if (loading && !predictions) {
        return (
            <PageTransition>
                <PageLoader message="Loading refill data..." />
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen bg-gray-900 p-6 space-y-8 pt-16 lg:pt-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-blue-400 transition-all mb-4 group"
                        >
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Back to Dashboard
                        </button>
                        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
                            Refill <span className="text-primary italic font-medium">Management</span>
                        </h1>
                        <p className="text-gray-400 mt-2 font-medium">
                            Predictive refill alerts and quantity tracking
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {user?.role === 'caregiver' && patients.length > 0 && (
                            <div className="relative flex flex-col items-end">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 mr-1">MONITORING_SUBJECT</span>
                                <select 
                                    value={selectedId || ''} 
                                    onChange={(e) => {
                                        const id = parseInt(e.target.value);
                                        setSelectedId(id);
                                        fetchData(id);
                                    }}
                                    className="appearance-none bg-white/5 border border-white/10 text-white text-xs font-bold px-4 py-2 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer min-w-[160px]"
                                >
                                    {patients.map(p => (
                                        <option key={p.senior_id || p.id} value={p.senior_id || p.id}>
                                            {p.senior_name || p.username}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <button
                            onClick={handleTriggerCheck}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-500/10"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Run Refill Check
                        </button>
                    </div>
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
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-warning" />
                                Active Alerts ({alerts?.total_active || 0})
                            </h2>

                            {alerts?.active_alerts.map((alert) => {
                                const style = getAlertLevelStyle(alert.alert_level);
                                return (
                                    <motion.div
                                        key={alert.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="p-4 rounded-xl border border-gray-700 bg-gray-800 group hover:border-gray-600 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-bold text-gray-100 flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${alert.alert_level === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} />
                                                {alert.medication_name}
                                            </span>
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                {alert.days_remaining}d Left
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-xs mb-4">
                                            Expected Depletion: <span className="text-gray-300 font-medium">{new Date(alert.predicted_depletion_date).toLocaleDateString()}</span>
                                        </p>
                                        <button
                                            onClick={() => handleAcknowledge(alert.id)}
                                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 hover:border-gray-600 hover:bg-gray-800 rounded-lg text-gray-300 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                            Acknowledge
                                        </button>
                                    </motion.div>
                                );
                            })}

                            <div className="p-8 bg-gray-800 border border-emerald-500/20 rounded-xl text-center group cursor-default">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                    <Check className="w-6 h-6 text-emerald-400" />
                                </div>
                                <p className="text-gray-100 font-bold">Refills Synchronized</p>
                                <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-bold">All Clear</p>
                            </div>
                        </div>

                        {/* Medication Predictions */}
                        <div className="lg:col-span-2 space-y-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <TrendingDown className="w-5 h-5 text-primary-600" />
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
                                            className="p-6 bg-gray-800 border border-gray-700 rounded-xl hover:border-gray-600 transition-all group"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-full ${style.bg.replace('/10', '/50').replace('/20', '')}`} />
                                                    <h3 className="text-gray-900 dark:text-gray-100 font-bold">{med.name}</h3>
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
                                                    <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 ${percentage > 50 ? 'bg-emerald-500' :
                                                                percentage > 25 ? 'bg-amber-500' : 'bg-red-500'
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
                                                className="w-full px-4 py-2.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 hover:border-blue-500 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 group/btn"
                                            >
                                                <Package className="w-4 h-4 group-hover/btn:-translate-y-0.5 transition-transform" />
                                                Update Stock Level
                                            </button>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {(!predictions?.medications || predictions.medications.length === 0) && (
                                <div className="p-12 bg-gray-800 border border-gray-700 border-dashed rounded-xl text-center">
                                    <Pill className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400 font-bold">No Meds Tracked</p>
                                    <p className="text-gray-500 text-sm mt-1">
                                        Add quantity information to start refill predictions.
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
                            className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-2xl rounded-[32px] p-8 max-w-md w-full"
                        >
                            <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-6">
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
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 font-bold"
                                    min="1"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowRefillModal(false)}
                                    className="flex-1 px-4 py-3 bg-white dark:bg-gray-800/10 hover:bg-white dark:bg-gray-800/20 rounded-xl text-white font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRefill}
                                    className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 rounded-xl text-white font-black transition-all shadow-lg shadow-primary-500/20 active:scale-95"
                                >
                                    Confirm Refill
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </PageTransition>
    );
}
