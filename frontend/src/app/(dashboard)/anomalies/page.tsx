"use client";

/**
 * Anomaly Detection Dashboard
 * 
 * Caregiver dashboard for viewing adherence anomalies across patients.
 * Features: summary stats, anomaly history, demo trigger controls.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle, Activity, Users, Clock, RefreshCw, Play, AlertCircle,
    Settings, ChevronDown, ChevronUp, TrendingDown, Calendar,
    Loader2, CheckCircle2, XCircle, Shield, Phone, X, ChevronLeft,
    Info, ShieldX
} from 'lucide-react';
import AnomalyAlertWidget from '@/components/AnomalyAlertWidget';
import {
    getAnomalyHistory,
    triggerDemoDetection,
    configureAnomalySensitivity,
    trainAnomalyBaseline,
    runBatchDetection,
    AnomalyAlert,
    HistoryResponse,
    Sensitivity,
    getAnomalyTypeInfo,
    getAnomalySeverity,
    formatAnomalyTime
} from '@/lib/api/anomaly';
import { apiFetch } from '@/lib/api';

interface PatientSummary {
    id: number;
    name: string;
    hasBaseline: boolean;
    lastCheck?: string;
    status: 'normal' | 'anomaly' | 'no_baseline';
    anomalyType?: string;
    anomalyScore?: number;
}

import { SkeletonDashboard } from '@/components/ui/SkeletonLoaders';
import { PageTransition } from '@/components/animations/PageTransition';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';

export default function AnomaliesPage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<PatientSummary[]>([]);
    const [activeAlerts, setActiveAlerts] = useState<AnomalyAlert[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
    const [historyData, setHistoryData] = useState<HistoryResponse | null>(null);
    const [demoRunning, setDemoRunning] = useState(false);
    const [sensitivityConfig, setSensitivityConfig] = useState<Record<number, Sensitivity>>({});
    const [error, setError] = useState<string | null>(null);

    // Contact flow state
    const [contactModal, setContactModal] = useState<{ patientId: number; patientName: string } | null>(null);
    const [contactMethod, setContactMethod] = useState<'in_app' | 'phone_noted' | 'telegram'>('in_app');
    const [contactNotes, setContactNotes] = useState('');
    const [contactLoading, setContactLoading] = useState(false);
    const [contactedPatients, setContactedPatients] = useState<Set<number>>(new Set());

    // Fetch patients under care
    const fetchPatients = useCallback(async () => {
        try {
            setLoading(true);

            // Get seniors under care
            const response = await apiFetch('/caregiver/seniors');

            if (response.success && response.data) {
                const patientSummaries: PatientSummary[] = [];

                for (const senior of response.data) {
                    try {
                        const history = await getAnomalyHistory(senior.senior_id || senior.id);

                        patientSummaries.push({
                            id: senior.senior_id || senior.id,
                            name: senior.senior_name || senior.username || `Patient ${senior.id}`,
                            hasBaseline: history.has_baseline,
                            lastCheck: history.anomalies?.[0]?.date,
                            status: !history.has_baseline
                                ? 'no_baseline'
                                : history.anomalies?.length > 0
                                    ? 'anomaly'
                                    : 'normal',
                            anomalyType: history.anomalies?.[0]?.type,
                            anomalyScore: history.anomalies?.[0]?.score
                        });

                        // Add to active alerts if anomaly detected
                        if (history.anomalies?.length > 0) {
                            setActiveAlerts(prev => {
                                const exists = prev.some(a => a.patient_id === (senior.senior_id || senior.id));
                                if (exists) return prev;

                                return [...prev, {
                                    patient_id: senior.senior_id || senior.id,
                                    patient_name: senior.senior_name || senior.username,
                                    anomaly_type: history.anomalies[0].type as any,
                                    anomaly_score: history.anomalies[0].score,
                                    alert_message: history.anomalies[0].description,
                                    details: {},
                                    detected_at: history.anomalies[0].date,
                                    action_required: true
                                }];
                            });
                        }
                    } catch (err) {
                        console.error(`Failed to get history for patient ${senior.id}:`, err);
                        patientSummaries.push({
                            id: senior.senior_id || senior.id,
                            name: senior.senior_name || senior.username || `Patient ${senior.id}`,
                            hasBaseline: false,
                            status: 'no_baseline'
                        });
                    }
                }

                setPatients(patientSummaries);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load patients');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPatients();
    }, [fetchPatients]);

    // Handle demo trigger
    const handleDemoTrigger = async (patientId: number) => {
        try {
            setDemoRunning(true);
            const result = await triggerDemoDetection(patientId);

            if (result.is_anomaly) {
                setActiveAlerts(prev => {
                    const filtered = prev.filter(a => a.patient_id !== patientId);
                    return [...filtered, {
                        patient_id: patientId,
                        patient_name: result.patient_name,
                        anomaly_type: result.anomaly_type as any,
                        anomaly_score: result.anomaly_score,
                        alert_message: result.alert,
                        details: result.details,
                        detected_at: result.detected_at,
                        action_required: true
                    }];
                });
            }

            // Refresh patients list
            await fetchPatients();
        } catch (err: any) {
            setError(err.message || 'Demo trigger failed');
        } finally {
            setDemoRunning(false);
        }
    };

    // Handle training baseline
    const handleTrainBaseline = async (patientId: number) => {
        try {
            setLoading(true);
            await trainAnomalyBaseline(patientId, sensitivityConfig[patientId] || 'medium');
            await fetchPatients();
        } catch (err: any) {
            setError(err.message || 'Training failed');
        } finally {
            setLoading(false);
        }
    };

    // Handle sensitivity change
    const handleSensitivityChange = async (patientId: number, sensitivity: Sensitivity) => {
        try {
            await configureAnomalySensitivity(patientId, sensitivity);
            setSensitivityConfig(prev => ({ ...prev, [patientId]: sensitivity }));
        } catch (err: any) {
            setError(err.message || 'Configuration failed');
        }
    };

    // Stats
    const anomalyCount = patients.filter(p => p.status === 'anomaly').length;
    const normalCount = patients.filter(p => p.status === 'normal').length;
    const noBaselineCount = patients.filter(p => p.status === 'no_baseline').length;

    if (userLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 p-6 space-y-8">
                <SkeletonDashboard />
            </div>
        );
    }

    if (user?.role !== 'caregiver') {
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

    if (loading && patients.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 p-6 space-y-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="space-y-2">
                        <div className="h-8 bg-white dark:bg-gray-800/10 rounded-full w-48 animate-pulse" />
                        <div className="h-4 bg-white dark:bg-gray-800/5 rounded-full w-64 animate-pulse" />
                    </div>
                </div>
                <SkeletonDashboard />
            </div>
        );
    }

    return (
        <PageTransition>
            <div className="max-w-6xl mx-auto space-y-8 pb-20 pt-16 lg:pt-0">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="relative">
                        <div className="absolute -left-4 top-0 w-1 h-12 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                            ANOMALY_DETECTION_CORE <span className="text-red-400 not-italic">v2.1</span>
                        </h1>
                        <p className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">
                            MONITORING_FLEET: <span className="text-amber-400">HEARTBEAT_ACTIVE</span>
                        </p>
                    </div>

                    <button
                        onClick={fetchPatients}
                        disabled={loading}
                        className="px-6 py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl font-black uppercase tracking-widest hover:bg-white hover:text-slate-950 transition-all flex items-center gap-3 text-[10px] active:scale-95"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        RESYNC_TELEMETRY
                    </button>
                </div>

                {/* Error display */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-500/30 rounded-xl flex items-center gap-3"
                    >
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <span className="text-red-300 text-sm font-black uppercase tracking-widest">{error}</span>
                        <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}

                {/* Active Alerts */}
                {activeAlerts.length > 0 && (
                    <section>
                        <h2 className="text-lg font-black text-gray-200 mb-4 flex items-center gap-3 uppercase tracking-tighter italic">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            ACTIVE_INCIDENTS ({activeAlerts.length})
                        </h2>
                        <AnomalyAlertWidget
                            alerts={activeAlerts}
                            onAcknowledge={(patientId) => {
                                setActiveAlerts(prev => prev.filter(a => a.patient_id !== patientId));
                            }}
                            onContact={(patientId, name) => {
                                setContactModal({ patientId, patientName: name });
                                setContactMethod('in_app');
                                setContactNotes('');
                            }}
                        />
                    </section>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'FLEET_TOTAL_NODES', value: patients.length, icon: Users, color: 'text-blue-400' },
                        { label: 'ACTIVE_ANOMALIES', value: anomalyCount, icon: AlertTriangle, color: 'text-red-500' },
                        { label: 'STABLE_BASELINE', value: normalCount, icon: CheckCircle2, color: 'text-teal-400' },
                        { label: 'AWAITING_TRAINING', value: noBaselineCount, icon: Shield, color: 'text-amber-500' }
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="p-5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md group hover:border-white/20 transition-all shadow-xl"
                        >
                            <div className="flex items-center justify-between mb-3 text-slate-500 uppercase text-[10px] font-black tracking-widest leading-none">
                                {stat.label}
                                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                            </div>
                            <div className="flex items-end justify-between">
                                <div>
                                    <h4 className={`text-2xl font-black leading-none ${stat.color}`}>{stat.value.toString().padStart(2, '0')}</h4>
                                    <p className="text-[9px] font-bold mt-2 text-slate-500 uppercase tracking-widest">STATUS: NOMINAL</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <section>
                    <h2 className="text-lg font-black text-gray-200 mb-6 flex items-center gap-3 uppercase tracking-tighter italic">
                        <Activity className="w-5 h-5 text-blue-500" />
                        SYSTEM_MONITORING_NODES
                    </h2>

                    {loading && patients.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    ) : patients.length === 0 ? (
                        <div className="p-8 bg-white dark:bg-gray-800/5 border border-white/10 rounded-2xl text-center">
                            <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                            <p className="text-gray-400">No patients found</p>
                            <p className="text-gray-500 text-sm mt-1">Add seniors to your care list to monitor</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {patients.map((patient, index) => {
                                const typeInfo = getAnomalyTypeInfo(patient.anomalyType as any);

                                return (
                                    <motion.div
                                        key={patient.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`p-4 rounded-xl border transition-all backdrop-blur-md ${patient.status === 'anomaly'
                                            ? 'bg-red-500/5 border-red-500/30'
                                            : patient.status === 'normal'
                                                ? 'bg-white/5 border-white/10'
                                                : 'bg-amber-500/5 border-amber-500/30'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${patient.status === 'anomaly'
                                                    ? 'bg-red-500/10 border-red-500/20'
                                                    : patient.status === 'normal'
                                                        ? 'bg-teal-500/10 border-teal-500/20'
                                                        : 'bg-amber-500/10 border-amber-500/20'
                                                    }`}>
                                                    {patient.status === 'anomaly' ? (
                                                        <AlertTriangle className="w-5 h-5 text-red-400" />
                                                    ) : patient.status === 'normal' ? (
                                                        <CheckCircle2 className="w-5 h-5 text-teal-400" />
                                                    ) : (
                                                        <Shield className="w-5 h-5 text-amber-400" />
                                                    )}
                                                </div>

                                                <div>
                                                    <h3 className="text-sm font-black text-white uppercase tracking-widest">{patient.name}</h3>
                                                    <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">
                                                        {patient.status === 'anomaly' && (
                                                            <span className="text-red-500 flex items-center gap-1">
                                                                INTERRUPT: {typeInfo.label.toUpperCase()}
                                                            </span>
                                                        )}
                                                        {patient.status === 'no_baseline' && (
                                                            <span className="text-amber-500">TRAINING_REQUIRED</span>
                                                        )}
                                                        {patient.status === 'normal' && (
                                                            <span className="text-teal-400">NOMINAL_PATTERN</span>
                                                        )}
                                                        {patient.lastCheck && (
                                                            <span>LAST_AUDIT: {formatAnomalyTime(patient.lastCheck).toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <select
                                                    value={sensitivityConfig[patient.id] || 'medium'}
                                                    onChange={(e) => handleSensitivityChange(patient.id, e.target.value as Sensitivity)}
                                                    disabled={!patient.hasBaseline}
                                                    className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-500/50 disabled:opacity-30"
                                                >
                                                    <option value="high">HIGH_SENS</option>
                                                    <option value="medium">MED_SENS</option>
                                                    <option value="low">LOW_SENS</option>
                                                </select>

                                                {!patient.hasBaseline ? (
                                                    <button
                                                        onClick={() => handleTrainBaseline(patient.id)}
                                                        disabled={loading}
                                                        className="px-4 py-1.5 bg-amber-600/10 border border-amber-500/30 text-amber-500 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all disabled:opacity-30"
                                                    >
                                                        INIT_TRAINING
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleDemoTrigger(patient.id)}
                                                        disabled={demoRunning}
                                                        className="flex items-center gap-3 px-4 py-1.5 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30"
                                                    >
                                                        {demoRunning ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Play className="w-3.5 h-3.5" />
                                                        )}
                                                        TRIGGER_ANALYSIS
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Demo Mode Banner */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 bg-slate-900/40 border-l-4 border-blue-500 rounded-r-2xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative backdrop-blur-md"
                >
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                            <Play className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-black uppercase tracking-widest text-sm">SIMULATION_OVERRIDE_ENABLED</h3>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Trigger immediate pattern analysis for demonstration purposes</p>
                        </div>
                    </div>
                    <span className="px-4 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-lg text-blue-400 text-[9px] font-black uppercase tracking-widest">
                        BYPASS_CORE_SCHEDULE: 02:00_UTC
                    </span>
                </motion.div>

                {/* Contact Modal */}
                <AnimatePresence>
                    {contactModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                onClick={() => !contactLoading && setContactModal(null)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative z-10 w-full max-w-md bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-6 backdrop-blur-xl"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                                            <Phone className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-black uppercase tracking-widest text-sm">LOG_CONTACT_CYCLE</h3>
                                            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-0.5">{contactModal.patientName}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setContactModal(null)}
                                        disabled={contactLoading}
                                        className="text-slate-500 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Contact Method */}
                                <label className="block mb-4">
                                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-2 block">SELECT_COMMS_CHANNEL</span>
                                    <select
                                        value={contactMethod}
                                        onChange={(e) => setContactMethod(e.target.value as any)}
                                        className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                    >
                                        <option value="in_app">IN_APP_SECURE_NOTIF</option>
                                        <option value="phone_noted">EXTERNAL_VOICE_CALL</option>
                                        <option value="telegram">TELEGRAM_DIRECT</option>
                                    </select>
                                </label>

                                {/* Notes */}
                                <label className="block mb-6">
                                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-2 block">ENTRY_LOG_NOTES</span>
                                    <textarea
                                        value={contactNotes}
                                        onChange={(e) => setContactNotes(e.target.value)}
                                        placeholder="Enter encounter details..."
                                        rows={3}
                                        maxLength={500}
                                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-xs placeholder:text-slate-700 placeholder:uppercase placeholder:font-black focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none font-medium"
                                    />
                                </label>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setContactModal(null)}
                                        disabled={contactLoading}
                                        className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all disabled:opacity-30"
                                    >
                                        ABORT_ENTRY
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!contactModal) return;
                                            setContactLoading(true);
                                            try {
                                                await apiFetch(`/anomalies/${contactModal.patientId}/contact`, {
                                                    method: 'POST',
                                                    body: JSON.stringify({
                                                        contact_method: contactMethod,
                                                        notes: contactNotes
                                                    }),
                                                });
                                                setContactedPatients(prev => new Set(prev).add(contactModal.patientId));
                                                setContactModal(null);
                                            } catch (err: any) {
                                                setError(err.message || 'Failed to log contact');
                                            } finally {
                                                setContactLoading(false);
                                            }
                                        }}
                                        disabled={contactLoading}
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30"
                                    >
                                        {contactLoading ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                SUBMITTING...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                COMMIT_LOG
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
}
