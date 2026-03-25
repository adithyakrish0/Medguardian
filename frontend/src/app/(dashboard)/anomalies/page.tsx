"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
    AlertTriangle, Activity, Users, RefreshCw, Play,
    AlertCircle, CheckCircle2, Shield, Phone, X,
    ChevronLeft, ShieldX, Loader2, Brain, Info
} from 'lucide-react';
import AnomalyAlertWidget from '@/components/AnomalyAlertWidget';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
    getAnomalyHistory, triggerDemoDetection,
    configureAnomalySensitivity, trainAnomalyBaseline,
    AnomalyAlert, HistoryResponse, Sensitivity,
    getAnomalyTypeInfo, formatAnomalyTime
} from '@/lib/api/anomaly';
import { apiFetch } from '@/lib/api';
import { PageLoader } from '@/components/ui/SkeletonLoaders';
import { PageTransition } from '@/components/animations/PageTransition';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';

// ─── Shared design tokens (same as war-room + medications) ────
const T = {
    bg:       '#070c14',
    surface:  '#0d1525',
    card:     '#0f1c2e',
    cardHi:   '#122035',
    border:   '#182338',
    borderHi: '#1f2e47',
    text:     '#e2e8f0',
    muted:    '#4a607a',
    faint:    '#0a1628',
};

const statusCfg = {
    normal:      { color: '#22c55e', bg: '#0a1f0a', border: '#22c55e22', label: 'Stable',            icon: CheckCircle2 },
    anomaly:     { color: '#ef4444', bg: '#1f0a0a', border: '#ef444422', label: 'Anomaly detected',  icon: AlertTriangle },
    no_baseline: { color: '#f59e0b', bg: '#1a1100', border: '#f59e0b22', label: 'Needs training',    icon: Shield },
};

interface PatientSummary {
    id: number;
    name: string;
    hasBaseline: boolean;
    lastCheck?: string;
    status: 'normal' | 'anomaly' | 'no_baseline';
    anomalyType?: string;
    anomalyScore?: number;
}

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({ 
        opacity: 1, 
        y: 0, 
        transition: { 
            delay: i * 0.06, 
            duration: 0.32, 
            ease: 'easeOut'
        } 
    }),
};

export default function AnomaliesPage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();

    const [loading, setLoading]           = useState(true);
    const [patients, setPatients]         = useState<PatientSummary[]>([]);
    const [activeAlerts, setActiveAlerts] = useState<AnomalyAlert[]>([]);
    const [demoRunning, setDemoRunning]   = useState<number | null>(null);
    const [trainingId, setTrainingId]     = useState<number | null>(null);
    const [sensitivityCfg, setSensitivityCfg] = useState<Record<number, Sensitivity>>({});
    const [error, setError]               = useState<string | null>(null);
    const [contactModal, setContactModal] = useState<{ patientId: number; patientName: string } | null>(null);
    const [contactMethod, setContactMethod] = useState<'in_app' | 'phone_noted' | 'telegram'>('in_app');
    const [contactNotes, setContactNotes] = useState('');
    const [contactLoading, setContactLoading] = useState(false);

    const fetchPatients = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiFetch('/caregiver/seniors');
            if (!res.success || !res.data) return;

            const summaries: PatientSummary[] = [];
            for (const senior of res.data) {
                try {
                    const hist = await getAnomalyHistory(senior.senior_id || senior.id);
                    const pid  = senior.senior_id || senior.id;
                    summaries.push({
                        id: pid,
                        name: senior.name || senior.senior_name || senior.username || `Patient ${pid}`,
                        hasBaseline: hist.has_baseline,
                        lastCheck: hist.anomalies?.[0]?.date,
                        status: !hist.has_baseline ? 'no_baseline' : hist.anomalies?.length > 0 ? 'anomaly' : 'normal',
                        anomalyType: hist.anomalies?.[0]?.type,
                        anomalyScore: hist.anomalies?.[0]?.score,
                    });
                    if (hist.anomalies?.length > 0) {
                        setActiveAlerts(prev => prev.some(a => a.patient_id === (senior.senior_id || senior.id)) ? prev : [...prev, {
                            patient_id: senior.senior_id || senior.id,
                            patient_name: senior.senior_name || senior.username,
                            anomaly_type: hist.anomalies[0].type as any,
                            anomaly_score: hist.anomalies[0].score,
                            alert_message: hist.anomalies[0].description,
                            details: {},
                            detected_at: hist.anomalies[0].date,
                            action_required: true,
                        }]);
                    }
                } catch {
                    const pid = senior.senior_id || senior.id;
                    summaries.push({ id: pid, name: senior.name || senior.senior_name || senior.username || `Patient ${pid}`, hasBaseline: false, status: 'no_baseline' });
                }
            }
            setPatients(summaries);
        } catch (e: any) { setError(e.message || 'Failed to load patients'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchPatients(); }, [fetchPatients]);

    const handleDemo = async (pid: number) => {
        try {
            setDemoRunning(pid);
            const r = await triggerDemoDetection(pid);
            if (r.is_anomaly) {
                setActiveAlerts(prev => [...prev.filter(a => a.patient_id !== pid), {
                    patient_id: pid, patient_name: r.patient_name,
                    anomaly_type: r.anomaly_type as any, anomaly_score: r.anomaly_score,
                    alert_message: r.alert, details: r.details,
                    detected_at: r.detected_at, action_required: true,
                }]);
            }
            await fetchPatients();
        } catch (e: any) { setError(e.message || 'Analysis failed'); }
        finally { setDemoRunning(null); }
    };

    const handleTrain = async (pid: number) => {
        try {
            setTrainingId(pid);
            await trainAnomalyBaseline(pid, sensitivityCfg[pid] || 'medium');
            await fetchPatients();
        } catch (e: any) { setError(e.message || 'Training failed'); }
        finally { setTrainingId(null); }
    };

    const handleSensitivity = async (pid: number, s: Sensitivity) => {
        try { await configureAnomalySensitivity(pid, s); setSensitivityCfg(p => ({ ...p, [pid]: s })); }
        catch (e: any) { setError(e.message || 'Config failed'); }
    };

    const anomalyCount    = patients.filter(p => p.status === 'anomaly').length;
    const normalCount     = patients.filter(p => p.status === 'normal').length;
    const noBaselineCount = patients.filter(p => p.status === 'no_baseline').length;

    // ── Guards ──────────────────────────────────────────
    if (userLoading) return <PageLoader message="Loading patient data..." />;

    if (user?.role !== 'caregiver') return (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#1f0a0a', border: '1px solid #ef444422' }}>
                <ShieldX className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-[16px] font-semibold" style={{ color: T.text }}>Access restricted</p>
            <p className="text-[13px]" style={{ color: T.muted }}>This page is only available to caregivers.</p>
            <button onClick={() => router.push('/dashboard')}
                className="mt-2 px-5 py-2.5 rounded-[10px] text-[13px] font-medium"
                style={{ background: T.surface, color: T.muted, border: `1px solid ${T.border}` }}>
                Back to Dashboard
            </button>
        </div>
    );

    return (
        <PageTransition>
            <div className="max-w-5xl mx-auto pb-20 space-y-6">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pt-2">
                    <div>
                        <h1 className="text-[26px] font-semibold tracking-[-0.4px]" style={{ color: T.text }}>
                            Anomaly Detection
                        </h1>
                        <p className="text-[13px] mt-1 flex items-center gap-2" style={{ color: T.muted }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            LSTM monitoring · Auto-refreshes every 30s
                        </p>
                    </div>
                    <button onClick={fetchPatients} disabled={loading}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-medium transition-colors"
                        style={{ background: T.surface, color: T.muted, border: `1px solid ${T.border}` }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.borderHi; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.color = T.muted; }}>
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* ── Error banner ── */}
                <AnimatePresence>
                    {error && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[13px]"
                            style={{ background: '#1f0a0a', border: '1px solid #ef444430', color: '#fca5a5' }}>
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span className="flex-1">{error}</span>
                            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Active alerts ── */}
                {activeAlerts.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <p className="text-[13px] font-semibold" style={{ color: '#ef4444' }}>
                                {activeAlerts.length} active alert{activeAlerts.length > 1 ? 's' : ''}
                            </p>
                        </div>
                        <AnomalyAlertWidget
                            alerts={activeAlerts}
                            onAcknowledge={pid => setActiveAlerts(p => p.filter(a => a.patient_id !== pid))}
                            onContact={(pid, name) => { setContactModal({ patientId: pid, patientName: name }); setContactMethod('in_app'); setContactNotes(''); }}
                        />
                    </section>
                )}

                {/* ── Summary strip ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Total patients',   value: patients.length,  color: '#3b82f6' },
                        { label: 'Anomalies',        value: anomalyCount,     color: '#ef4444' },
                        { label: 'Stable',           value: normalCount,      color: '#22c55e' },
                        { label: 'Needs training',   value: noBaselineCount,  color: '#f59e0b' },
                    ].map((s, i) => (
                        <motion.div key={s.label}
                            custom={i} initial="hidden" animate="visible" variants={cardVariants}
                            className="rounded-xl px-4 py-3.5 flex items-center gap-3"
                            style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                            <div>
                                <p className="text-[20px] font-semibold leading-none" style={{ color: T.text }}>{s.value}</p>
                                <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>{s.label}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* ── Patient list ── */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[15px] font-semibold" style={{ color: T.text }}>Patients</p>
                        <p className="text-[12px]" style={{ color: T.muted }}>{patients.length} monitored</p>
                    </div>

                    {loading && patients.length === 0 ? (
                        <div className="flex items-center justify-center py-16 rounded-2xl gap-3"
                            style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                            <p className="text-[13px]" style={{ color: T.muted }}>Loading…</p>
                        </div>
                    ) : patients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 rounded-2xl gap-3 text-center"
                            style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                            <Users className="w-8 h-8" style={{ color: T.muted }} />
                            <p className="text-[14px] font-medium" style={{ color: T.text }}>No patients connected</p>
                            <p className="text-[13px]" style={{ color: T.muted }}>Add seniors from the My Patients page.</p>
                        </div>
                    ) : (
                        <ErrorBoundary fallback="Patient Patterns Error">
                            <div className="space-y-2.5">
                                {patients.map((patient, i) => {
                                    const sc   = statusCfg[patient.status];
                                    const Icon = sc.icon;
                                    const tid  = trainingId === patient.id;
                                    const did  = demoRunning === patient.id;

                                    return (
                                        <motion.div key={patient.id}
                                            custom={i} initial="hidden" animate="visible" variants={cardVariants}
                                            className="rounded-xl px-5 py-4 flex items-center gap-4 transition-colors"
                                            style={{
                                                background: T.card,
                                                border: `1px solid ${T.border}`,
                                                borderLeft: `2px solid ${sc.color}`,
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = T.cardHi)}
                                            onMouseLeave={e => (e.currentTarget.style.background = T.card)}
                                        >
                                            {/* Icon */}
                                            <div className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
                                                style={{ background: sc.bg, border: `1px solid ${sc.border}` }}>
                                                <Icon className="w-4 h-4" style={{ color: sc.color }} />
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[14px] font-medium truncate" style={{ color: T.text }}>{patient.name}</p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium"
                                                        style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                                                        {sc.label}
                                                    </span>
                                                    {patient.lastCheck && (
                                                        <span className="text-[11px]" style={{ color: T.muted }}>
                                                            Last checked {formatAnomalyTime(patient.lastCheck)}
                                                        </span>
                                                    )}
                                                    {patient.anomalyType && patient.status === 'anomaly' && (
                                                        <span className="text-[11px]" style={{ color: '#fca5a5' }}>
                                                            · {getAnomalyTypeInfo(patient.anomalyType as any).label}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Controls */}
                                            <div className="flex items-center gap-2.5 shrink-0">
                                                {/* Sensitivity selector */}
                                                <div className="relative">
                                                    <select
                                                        value={sensitivityCfg[patient.id] || 'medium'}
                                                        onChange={e => handleSensitivity(patient.id, e.target.value as Sensitivity)}
                                                        disabled={!patient.hasBaseline}
                                                        className="appearance-none text-[12px] font-medium pr-6 pl-3 py-2 rounded-[8px] focus:outline-none transition-all cursor-pointer disabled:opacity-40"
                                                        style={{ background: T.faint, color: T.muted, border: `1px solid ${T.border}` }}
                                                    >
                                                        <option value="high">High</option>
                                                        <option value="medium">Medium</option>
                                                        <option value="low">Low</option>
                                                    </select>
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                                                            style={{ color: T.muted }}>
                                                            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                {/* Action buttons */}
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => router.push(`/explainability?senior_id=${patient.id}&name=${encodeURIComponent(patient.name)}`)}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 rounded-lg text-xs font-medium transition-colors"
                                                    >
                                                        <Brain className="w-3.5 h-3.5" />
                                                        View AI Explanation
                                                    </button>

                                                    {!patient.hasBaseline ? (
                                                        <button onClick={() => handleTrain(patient.id)} disabled={!!tid}
                                                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[12px] font-medium transition-colors"
                                                            style={{ background: '#1a1100', color: '#f59e0b', border: '1px solid #f59e0b22' }}
                                                            onMouseEnter={e => { if (!tid) { (e.currentTarget as HTMLElement).style.background = '#292000'; } }}
                                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#1a1100'; }}>
                                                            {tid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                                                            {tid ? 'Training…' : 'Train baseline'}
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => handleDemo(patient.id)} disabled={!!did}
                                                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[12px] font-medium transition-colors"
                                                            style={{ background: T.faint, color: '#3b82f6', border: `1px solid #3b82f622` }}
                                                            onMouseEnter={e => { if (!did) { (e.currentTarget as HTMLElement).style.background = '#172038'; } }}
                                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.faint; }}>
                                                            {did ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                                            {did ? 'Analysing…' : 'Run analysis'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </ErrorBoundary>
                    )}
                </section>

                {/* ── Demo info banner ── */}
                <div className="flex items-start gap-4 px-5 py-4 rounded-xl"
                    style={{ background: T.surface, border: `1px solid ${T.border}`, borderLeft: `2px solid #3b82f6` }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: '#172038' }}>
                        <Info className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-[13px] font-medium" style={{ color: T.text }}>Demo mode available</p>
                        <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: T.muted }}>
                            Use <strong style={{ color: '#94a3b8' }}>Run analysis</strong> to trigger an immediate LSTM pattern check
                            outside the normal 2 AM schedule. Useful for testing and demonstrations.
                        </p>
                    </div>
                </div>

                {/* ── Contact modal ── */}
                <AnimatePresence>
                    {contactModal && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/70" onClick={() => !contactLoading && setContactModal(null)} />
                            <motion.div
                                initial={{ scale: 0.96, opacity: 0, y: 8 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.96, opacity: 0 }}
                                className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl z-10"
                                style={{ background: T.card, border: `1px solid ${T.borderHi}` }}>

                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                            style={{ background: '#172038' }}>
                                            <Phone className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-semibold" style={{ color: T.text }}>Log contact</p>
                                            <p className="text-[12px]" style={{ color: T.muted }}>{contactModal.patientName}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setContactModal(null)} disabled={contactLoading}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                                        style={{ color: T.muted }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.faint; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Method */}
                                <div className="mb-4">
                                    <p className="text-[11px] font-medium mb-2" style={{ color: T.muted }}>Contact method</p>
                                    <div className="relative">
                                        <select value={contactMethod}
                                            onChange={e => setContactMethod(e.target.value as any)}
                                            className="w-full appearance-none text-[13px] font-medium px-4 py-2.5 pr-8 rounded-[9px] focus:outline-none"
                                            style={{ background: T.faint, color: T.text, border: `1px solid ${T.border}` }}>
                                            <option value="in_app">In-app notification</option>
                                            <option value="phone_noted">Phone call</option>
                                            <option value="telegram">Telegram</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                                                style={{ color: T.muted }}>
                                                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="mb-5">
                                    <p className="text-[11px] font-medium mb-2" style={{ color: T.muted }}>Notes <span style={{ color: T.border }}>(optional)</span></p>
                                    <textarea value={contactNotes}
                                        onChange={e => setContactNotes(e.target.value)}
                                        placeholder="Add any relevant notes…"
                                        rows={3}
                                        maxLength={500}
                                        className="w-full px-4 py-3 rounded-[9px] text-[13px] font-normal resize-none focus:outline-none transition-all"
                                        style={{ background: T.faint, color: T.text, border: `1px solid ${T.border}` }}
                                        onFocus={e => (e.currentTarget.style.borderColor = '#2563eb50')}
                                        onBlur={e => (e.currentTarget.style.borderColor = T.border)} />
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => setContactModal(null)} disabled={contactLoading}
                                        className="flex-1 py-2.5 rounded-[9px] text-[13px] font-medium transition-colors"
                                        style={{ background: T.faint, color: T.muted, border: `1px solid ${T.border}` }}>
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!contactModal) return;
                                            setContactLoading(true);
                                            try {
                                                await apiFetch(`/anomalies/${contactModal.patientId}/contact`, {
                                                    method: 'POST',
                                                    body: JSON.stringify({ contact_method: contactMethod, notes: contactNotes }),
                                                });
                                                setContactModal(null);
                                            } catch (e: any) { setError(e.message || 'Failed to log contact'); }
                                            finally { setContactLoading(false); }
                                        }}
                                        disabled={contactLoading}
                                        className="flex-1 py-2.5 rounded-[9px] text-[13px] font-medium text-white flex items-center justify-center gap-2 transition-colors hover:bg-blue-500"
                                        style={{ background: '#2563eb' }}>
                                        {contactLoading
                                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                                            : <><CheckCircle2 className="w-3.5 h-3.5" /> Save log</>}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
}
