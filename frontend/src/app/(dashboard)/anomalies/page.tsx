"use client";

/**
 * Anomaly Detection Dashboard
 * 
 * Caregiver dashboard for viewing adherence anomalies across patients.
 * Features: summary stats, anomaly history, demo trigger controls.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    AlertTriangle, Activity, Users, Clock, RefreshCw, Play,
    Settings, ChevronDown, ChevronUp, TrendingDown, Calendar,
    Loader2, CheckCircle2, XCircle, Shield
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

export default function AnomaliesPage() {
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<PatientSummary[]>([]);
    const [activeAlerts, setActiveAlerts] = useState<AnomalyAlert[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
    const [historyData, setHistoryData] = useState<HistoryResponse | null>(null);
    const [demoRunning, setDemoRunning] = useState(false);
    const [sensitivityConfig, setSensitivityConfig] = useState<Record<number, Sensitivity>>({});
    const [error, setError] = useState<string | null>(null);

    // Fetch patients under care
    const fetchPatients = useCallback(async () => {
        try {
            setLoading(true);

            // Get seniors under care
            const response = await apiFetch('/caregiver/seniors');

            if (response.success && response.seniors) {
                const patientSummaries: PatientSummary[] = [];

                for (const senior of response.seniors) {
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">
                        Anomaly Detection
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        AI-powered adherence pattern monitoring
                    </p>
                </div>

                <button
                    onClick={fetchPatients}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Error display */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3"
                >
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-300 text-sm">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-white">
                        <XCircle className="w-4 h-4" />
                    </button>
                </motion.div>
            )}

            {/* Active Alerts */}
            {activeAlerts.length > 0 && (
                <section>
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        Active Alerts ({activeAlerts.length})
                    </h2>
                    <AnomalyAlertWidget
                        alerts={activeAlerts}
                        onAcknowledge={(patientId) => {
                            setActiveAlerts(prev => prev.filter(a => a.patient_id !== patientId));
                        }}
                        onContact={(patientId, name) => {
                            console.log('Contact patient:', patientId, name);
                            // TODO: Implement contact flow
                        }}
                    />
                </section>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-white/5 border border-white/10 rounded-2xl"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-gray-400 text-sm font-medium">Total Patients</span>
                    </div>
                    <p className="text-3xl font-black text-white">{patients.length}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-5 bg-white/5 border border-white/10 rounded-2xl"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                        <span className="text-gray-400 text-sm font-medium">Anomalies</span>
                    </div>
                    <p className="text-3xl font-black text-red-400">{anomalyCount}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-5 bg-white/5 border border-white/10 rounded-2xl"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                        </div>
                        <span className="text-gray-400 text-sm font-medium">Normal</span>
                    </div>
                    <p className="text-3xl font-black text-green-400">{normalCount}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-5 bg-white/5 border border-white/10 rounded-2xl"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                            <Shield className="w-5 h-5 text-yellow-400" />
                        </div>
                        <span className="text-gray-400 text-sm font-medium">Need Training</span>
                    </div>
                    <p className="text-3xl font-black text-yellow-400">{noBaselineCount}</p>
                </motion.div>
            </div>

            {/* Patients List */}
            <section>
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Patient Monitoring
                </h2>

                {loading && patients.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : patients.length === 0 ? (
                    <div className="p-8 bg-white/5 border border-white/10 rounded-2xl text-center">
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
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`p-5 rounded-2xl border transition-all ${patient.status === 'anomaly'
                                            ? 'bg-red-500/10 border-red-500/30'
                                            : patient.status === 'normal'
                                                ? 'bg-white/5 border-white/10'
                                                : 'bg-yellow-500/10 border-yellow-500/30'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${patient.status === 'anomaly'
                                                    ? 'bg-red-500/20'
                                                    : patient.status === 'normal'
                                                        ? 'bg-green-500/20'
                                                        : 'bg-yellow-500/20'
                                                }`}>
                                                {patient.status === 'anomaly' ? (
                                                    <AlertTriangle className="w-6 h-6 text-red-400" />
                                                ) : patient.status === 'normal' ? (
                                                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                                                ) : (
                                                    <Shield className="w-6 h-6 text-yellow-400" />
                                                )}
                                            </div>

                                            <div>
                                                <h3 className="text-white font-bold">{patient.name}</h3>
                                                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                                    {patient.status === 'anomaly' && (
                                                        <span className={`px-2 py-0.5 rounded ${typeInfo.bgColor} ${typeInfo.color}`}>
                                                            {typeInfo.icon} {typeInfo.label}
                                                        </span>
                                                    )}
                                                    {patient.status === 'no_baseline' && (
                                                        <span className="text-yellow-400">No baseline trained</span>
                                                    )}
                                                    {patient.status === 'normal' && (
                                                        <span className="text-green-400">✓ Normal patterns</span>
                                                    )}
                                                    {patient.lastCheck && (
                                                        <span>Last check: {formatAnomalyTime(patient.lastCheck)}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Sensitivity select */}
                                            <select
                                                value={sensitivityConfig[patient.id] || 'medium'}
                                                onChange={(e) => handleSensitivityChange(patient.id, e.target.value as Sensitivity)}
                                                disabled={!patient.hasBaseline}
                                                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                                            >
                                                <option value="high">High Sensitivity</option>
                                                <option value="medium">Medium</option>
                                                <option value="low">Low Sensitivity</option>
                                            </select>

                                            {!patient.hasBaseline ? (
                                                <button
                                                    onClick={() => handleTrainBaseline(patient.id)}
                                                    disabled={loading}
                                                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 rounded-lg text-gray-900 font-bold text-xs transition-colors disabled:opacity-50"
                                                >
                                                    Train Baseline
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleDemoTrigger(patient.id)}
                                                    disabled={demoRunning}
                                                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 rounded-lg text-white font-bold text-xs transition-colors disabled:opacity-50"
                                                >
                                                    {demoRunning ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Play className="w-4 h-4" />
                                                    )}
                                                    Run Detection
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
                className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center justify-between"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                        <Play className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">Demo Mode</h3>
                        <p className="text-purple-300 text-xs">Click "Run Detection" to trigger immediate analysis</p>
                    </div>
                </div>
                <span className="px-3 py-1 bg-purple-500/20 rounded-full text-purple-300 text-xs font-bold">
                    Bypasses 2 AM Schedule
                </span>
            </motion.div>
        </div>
    );
}
