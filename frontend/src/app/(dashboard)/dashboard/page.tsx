"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useDashboardData } from '@/hooks/useDashboardData';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/hooks/useUser';
import { apiFetch } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import AIVerificationModal from '@/components/AIVerificationModal';
import { SkeletonDashboard, SkeletonCaregiverView } from '@/components/ui/SkeletonLoaders';
import {
    Activity,
    Clock,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    Zap,
    TrendingUp,
    Calendar,
    ChevronRight,
    Play,
    Heart,
    Smile,
    ArrowRight,
    Users,
    Bell,
    Shield,
    TrendingUp as TrendIcon,
    Calendar as CalendarIcon,
    Camera,
    Loader2,
    FlaskConical,
    Package,
    Brain,
    Pill,
    MessageCircle,
    Eye,
    Radar,
} from 'lucide-react';
import AdherenceChart from '@/components/AdherenceChart';
import PhoneSetupModal from '@/components/PhoneSetupModal';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useToast } from '@/components/NiceToast';
import BioDigitalTwin from '@/components/BioDigitalTwin';


function DashboardContent() {
    const searchParams = useSearchParams();
    const initialSeniorId = searchParams.get('seniorId');
    const [selectedSeniorId, setSelectedSeniorId] = useState<number | undefined>(
        initialSeniorId ? Number(initialSeniorId) : undefined
    );
    const { data, loading: dataLoading, error, refresh } = useDashboardData(selectedSeniorId);
    const { user, loading: userLoading, refresh: refreshUser } = useUser();
    const { showToast } = useToast();
    const [skippingId, setSkippingId] = useState<number | null>(null);
    const [verifyingMed, setVerifyingMed] = useState<{ id: number, name: string } | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || userLoading) {
        return <SkeletonDashboard />;
    }

    if (error && !dataLoading) {
        return (
            <div className="p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300">
                <AlertCircle className="w-10 h-10 mb-4 text-red-600 dark:text-red-400" />
                <h2 className="text-xl font-bold mb-2 text-foreground">Connection Issue</h2>
                <p className="font-medium">{error}</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {user?.role === 'caregiver' ? (
                <CaregiverDashboardView
                    data={data}
                    user={user}
                    onSeniorChange={(id) => setSelectedSeniorId(id)}
                    selectedSeniorId={selectedSeniorId}
                    onRefresh={refresh}
                />
            ) : (
                <SeniorDashboardView
                    data={data}
                    user={user}
                    onRefresh={refresh}
                    onRefreshUser={refreshUser}
                    skippingId={skippingId}
                    setSkippingId={setSkippingId}
                />
            )}
        </div>
    );
}

import ConnectionRequests from '@/components/ConnectionRequests';

function SeniorDashboardView({
    data,
    user,
    onRefresh,
    onRefreshUser,
    skippingId,
    setSkippingId
}: {
    data: any;
    user: any;
    onRefresh: () => void;
    onRefreshUser: () => Promise<void>;
    skippingId: number | null;
    setSkippingId: (id: number | null) => void;
}) {
    // Clear skippingId when the medication is no longer in the list after refresh
    useEffect(() => {
        if (skippingId && data?.schedule) {
            const allMeds = [
                ...(data.schedule.missed || []),
                ...(data.schedule.upcoming || []),
                ...(data.schedule.taken || []),
                ...(data.schedule.skipped || [])
            ];
            const stillInList = allMeds.some((m: any) => m.id === skippingId);
            const isPending = [
                ...(data.schedule.missed || []),
                ...(data.schedule.upcoming || [])
            ].some((m: any) => m.id === skippingId);

            if (!isPending) {
                setSkippingId(null);
            }
        }
    }, [data, skippingId, setSkippingId]);

    const nextMed = data?.schedule?.upcoming?.[0];
    const overdueMeds = data?.schedule?.missed || [];
    const takenToday = data?.schedule?.taken?.length ?? 0;
    const { showToast } = useToast();
    const [verifyingMed, setVerifyingMed] = useState<{ id: number; name: string } | null>(null);
    const [nudge, setNudge] = useState<any>(null);
    const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

    useEffect(() => {
        if (!user?.id) return;
        const socket = connectSocket(user.id);
        socket.on('medication_reminder', (payload: any) => {
            if (payload.type === 'caregiver_nudge') {
                setNudge(payload);
                onRefresh();
                setTimeout(() => setNudge(null), 30000);
            }
        });
        socket.on('camera_request', (payload: any) => {
            if (user?.camera_auto_accept) {
                setVerifyingMed({ id: 0, name: 'Caregiver Checkup' });
                showToast('Camera session starting automatically...');
            } else {
                setNudge({ ...payload, type: 'camera_request' });
                onRefresh();
                setTimeout(() => setNudge(null), 30000);
            }
        });
        return () => {
            socket.off('medication_reminder');
            socket.off('camera_request');
        };
    }, [user?.id, onRefresh, user?.camera_auto_accept]);

    const handleUpdatePhone = async (newPhone: string) => {
        try {
            await apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify({ phone: newPhone }) });
            await onRefreshUser();
            onRefresh();
        } catch (err) {
            console.error("Failed to update phone", err);
            throw err;
        }
    };

    const markAsTaken = async (medicationId: number, verified: boolean, method: string) => {
        await apiFetch(`/medications/${medicationId}/mark-taken`, {
            method: 'POST',
            body: JSON.stringify({ verified, verification_method: method })
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl mx-auto space-y-12 pb-12"
        >
            {/* Phone Setup Modal */}
            <PhoneSetupModal
                isOpen={isPhoneModalOpen}
                onClose={() => setIsPhoneModalOpen(false)}
                currentPhone={user?.phone}
                onSuccess={handleUpdatePhone}
            />

            {/* Header: Simplified & Integrated */}
            <header className="space-y-1 relative">
                <div className="absolute -left-4 top-0 w-1 h-12 bg-primary-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
                    SYSTEM_ACCESS: <span className="text-primary-400 not-italic">{user?.full_name?.split(' ')[0] || 'USER'}</span>
                </h1>
                <p className="text-xs font-black tracking-[0.3em] text-slate-500 uppercase">
                    AI_GUARDIAN_MODE: <span className="text-teal-400">ACTIVE_PROTECTION</span>
                </p>
            </header>

            {/* Safety & Status Bar: Friendly AI Prompt */}
            {!user?.phone && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md group hover:border-blue-500/40 transition-all shadow-xl"
                >
                    <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div className="text-center md:text-left">
                            <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-1">Guardian Link Required</h4>
                            <p className="text-sm text-slate-400 font-medium">Add phone number for emergency AI override capability.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsPhoneModalOpen(true)}
                        className="w-full md:w-auto px-6 py-3 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-95 whitespace-nowrap"
                    >
                        INITIALIZE LINK
                    </button>
                </motion.div>
            )}

            {/* Overdue Alert: Show ONLY if missed meds exist */}
            {overdueMeds.length > 0 && (
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-8 bg-red-950/20 border-2 border-red-500/40 rounded-3xl shadow-2xl shadow-red-900/10 relative overflow-hidden backdrop-blur-xl"
                >
                    <div className="flex flex-col gap-6 text-center md:text-left">
                        <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-red-500/10 text-red-400 rounded-full text-[10px] font-black uppercase tracking-[0.3em] self-center md:self-start border border-red-500/20">
                            <AlertCircle className="w-4 h-4" />
                            CRITICAL_OVERDUE_INTERRUPT
                        </div>

                        {overdueMeds.map((med: any) => (
                            <div key={med.id} className="space-y-6">
                                <div>
                                    <h2 className="text-4xl font-black tracking-tighter text-white mb-1 uppercase">{med.name}</h2>
                                    <p className="text-lg font-bold text-red-500 flex items-center gap-2 justify-center md:justify-start">
                                        <Clock className="w-5 h-5" />
                                        SCHEDULED_TIME: {med.scheduled_time || 'PRIOR_WINDOW'}
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={() => setVerifyingMed({ id: med.id, name: med.name })}
                                        className="h-16 flex-1 bg-red-600/20 border border-red-500/40 text-red-100 rounded-2xl text-xl font-black shadow-xl hover:bg-red-600 transition-all flex items-center justify-center gap-4 active:scale-95"
                                    >
                                        <Camera className="w-6 h-6" />
                                        EXECUTE_VERIFICATION
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Main "The Now" Focus: Massive Next Dose Card */}
            {nextMed ? (
                <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-4">Primary_Focus_Target</p>
                    <motion.div
                        initial={{ scale: 0.98, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="p-10 bg-slate-900/40 border border-white/10 rounded-[32px] shadow-2xl backdrop-blur-3xl relative overflow-hidden group"
                    >
                        <div className="flex flex-col gap-8 text-center md:text-left relative z-10">
                            <div className="space-y-2">
                                <div className="text-7xl md:text-9xl font-black tracking-tighter text-white/90 italic leading-none">
                                    {nextMed.time}
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-primary-400 uppercase">
                                        {nextMed.name}
                                    </h2>
                                    <p className="text-xl font-bold text-slate-500 tracking-wide uppercase">
                                        DOSAGE_PROTOCOL: {nextMed.dosage || 'STANDARD'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={() => setVerifyingMed({ id: nextMed.id, name: nextMed.name })}
                                    className="h-20 flex-[2] bg-teal-500 text-slate-950 rounded-2xl text-xl font-black shadow-2xl shadow-teal-500/20 hover:bg-teal-400 transition-all flex items-center justify-center gap-4 active:scale-95 group/btn uppercase tracking-widest"
                                >
                                    <Camera className="w-7 h-7 group-hover/btn:scale-110 transition-transform" />
                                    INITIALIZE_VERIFICATION
                                </button>
                                <button
                                    onClick={async () => {
                                        setSkippingId(nextMed.id);
                                        try {
                                            await apiFetch(`/medications/${nextMed.id}/skip`, { method: 'POST' });
                                            onRefresh();
                                        } catch (err) {
                                            setSkippingId(null);
                                        }
                                    }}
                                    disabled={skippingId === nextMed.id}
                                    className="h-20 flex-1 bg-white/5 border border-white/10 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                >
                                    {skippingId === nextMed.id ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Override / Skip'}
                                </button>
                            </div>
                        </div>

                        {/* Background Decoration */}
                        <div className="absolute -top-12 -right-12 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:-rotate-12 transition-all duration-1000">
                            <Pill className="w-80 h-80" />
                        </div>
                    </motion.div>
                </div>
            ) : overdueMeds.length === 0 && (
                <div className="p-12 bg-slate-900/20 text-center rounded-[32px] border border-white/5 backdrop-blur-sm">
                    <div className="w-16 h-16 bg-teal-500/10 text-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-teal-500/20 shadow-[0_0_30px_rgba(20,184,166,0.1)]">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">Fleet_Secured</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">All scheduled protocols are currently finalized.</p>
                </div>
            )}

            {/* AI Health Ring: Simplified Health Status */}
            <div className="grid md:grid-cols-2 gap-8">
                <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="p-8 bg-slate-900/40 border border-white/10 rounded-[32px] shadow-xl backdrop-blur-md"
                >
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">BIOMETRIC_STATUS_RADAR</p>
                    <BioDigitalTwin seniorMode />
                </motion.div>

                {/* AI Companion Hook & Daily Summary */}
                <div className="space-y-8">
                    <div className="p-8 bg-primary-600/5 border border-primary-500/10 rounded-[32px] shadow-xl space-y-6 backdrop-blur-sm">
                        <div className="w-12 h-12 bg-primary-500/10 text-primary-400 rounded-xl flex items-center justify-center border border-primary-500/20">
                            <MessageCircle className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">SYSTEM_INTERACT</h3>
                            <p className="text-sm font-medium text-slate-500 italic">"Voice_Interface: Active. Awaiting queries."</p>
                        </div>
                        <Link href="/chat">
                            <button className="w-full h-14 bg-primary-600/10 border border-primary-500/30 text-primary-100 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3">
                                INITIALIZE_CHAT
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </Link>
                    </div>

                    <div className="p-8 bg-teal-500/5 border border-teal-500/10 rounded-[32px] shadow-xl flex items-center gap-6 backdrop-blur-sm relative overflow-hidden group">
                        <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20 z-10">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="z-10">
                            <div className="flex items-center gap-2">
                                <p className="text-3xl font-black text-white leading-none">{takenToday}</p>
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                            </div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">Doses_Logged_Today</p>
                            <p className="text-[8px] font-bold text-teal-500/60 uppercase tracking-tighter mt-0.5">Fleet_Live_Status: Nominal</p>
                        </div>
                        {/* Subtle background glow */}
                        <div className="absolute inset-0 bg-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Verification Modal */}
            {verifyingMed && (
                <AIVerificationModal
                    medicationId={verifyingMed.id}
                    medicationName={verifyingMed.name}
                    onClose={() => setVerifyingMed(null)}
                    onVerified={async () => {
                        if (verifyingMed.id !== 0) {
                            try {
                                await markAsTaken(verifyingMed.id, true, 'vision_v2');
                            } catch (error) {
                                console.error('[Dashboard] markAsTaken error:', error);
                            }
                        }
                        setVerifyingMed(null);
                        onRefresh();
                    }}
                />
            )}
        </motion.div>
    );
}

function CaregiverDashboardView({ data, user, onSeniorChange, selectedSeniorId, onRefresh }: {
    data: any;
    user: any;
    onSeniorChange: (id: number | undefined) => void;
    selectedSeniorId?: number;
    onRefresh: () => void;
}) {
    const [seniors, setSeniors] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [sendingReminders, setSendingReminders] = useState<Record<string, boolean>>({});
    const { showToast } = useToast();

    // Mock Live Telemetry Data
    const telemetryLogs = [
        { id: 1, time: '10:42:01', event: 'YOLO-WORLD', message: 'Verified Lisinopril for John Doe', match: '99.8%', status: 'success' },
        { id: 2, time: '10:41:45', event: 'PK-SIM', message: 'Simulating Metformin clearance for Jane Smith', match: 'N/A', status: 'info' },
        { id: 3, time: '10:38:12', event: 'LSTM-CORE', message: 'Anomaly detected: Irregular intake pattern (John Doe)', match: '88.4%', status: 'warning' },
        { id: 4, time: '10:35:00', event: 'RAG-SYSTEM', message: 'Retrieving safety docs for drug-drug interaction (Warfarin)', match: '95.2%', status: 'info' },
        { id: 5, time: '10:30:22', event: 'VISION-V2', message: 'Detected hand tremors during verification (Sam Wilson)', match: '72.1%', status: 'error' },
    ];

    // Mock At-Risk Data
    const atRiskPatients = [
        { name: 'John Doe', risk: 85, insight: 'Usually misses evening doses on weekends. Behavioral drift detected.', color: 'text-amber-500' },
        { name: 'Sam Wilson', risk: 42, insight: 'Late intake 3 times this week. Reminder suggested.', color: 'text-blue-400' },
        { name: 'Jane Smith', risk: 15, insight: 'Optimal compliance. Minimal risk.', color: 'text-teal-400' },
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [seniorsRes, alertsRes, logsRes] = await Promise.all([
                    apiFetch('/caregiver/seniors'),
                    apiFetch('/caregiver/alerts'),
                    apiFetch('/caregiver/recent-logs')
                ]);
                if (seniorsRes.success) {
                    setSeniors(seniorsRes.data);
                    if (!selectedSeniorId && seniorsRes.data.length > 0) {
                        onSeniorChange(seniorsRes.data[0].id);
                    }
                }
                if (alertsRes.success) setAlerts(alertsRes.alerts);
                if (logsRes.success) setRecentLogs(logsRes.logs);
            } catch (err) {
                console.error('Failed to fetch caregiver extras:', err);
            }
        };

        fetchData();

        let socket: any;
        if (user?.id) {
            socket = connectSocket(user.id);
            socket.on('fleet_activity_update', (update: any) => {
                const newLog = {
                    id: Date.now(),
                    senior_name: update.senior_name,
                    medication_name: update.medication_name,
                    status: update.event_type === 'taken' ? 'verified' : 'skipped',
                    taken_at: update.timestamp,
                    taken_correctly: update.event_type === 'taken',
                };
                setRecentLogs(prev => [newLog, ...prev.slice(0, 14)]);
                onRefresh();
            });
        }

        return () => {
            if (socket) {
                socket.off('fleet_activity_update');
            }
        };
    }, [user?.id, onRefresh, onSeniorChange, selectedSeniorId]);

    const sendReminder = async (seniorId: number, medicationId: number) => {
        const key = `${seniorId}-${medicationId}`;
        setSendingReminders(prev => ({ ...prev, [key]: true }));
        try {
            const res = await apiFetch(`/caregiver/send-reminder/${seniorId}/${medicationId}`, { method: 'POST' });
            if (res.success) showToast(`Reminder sent!`);
        } finally {
            setSendingReminders(prev => ({ ...prev, [key]: false }));
        }
    };

    const requestCamera = async (seniorId: number) => {
        const res = await apiFetch(`/caregiver/request-camera/${seniorId}`, { method: 'POST' });
        if (res.success) showToast(res.message);
    };

    return (
        <div className="space-y-8 pb-32">
            {/* Top Row: Fleet Overview Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Active Patients Monitored', value: seniors.length, icon: Users, trend: 'Operational', color: 'text-blue-400' },
                    { label: '7-Day Adherence Average', value: '94.2%', icon: Activity, trend: '+2.1%', color: 'text-teal-400', showSpark: true },
                    { label: 'LSTM Anomaly Flags', value: '03', icon: AlertTriangle, trend: 'Needs Review', color: 'text-amber-500' },
                    { label: 'Pending YOLO Verifications', value: '0', icon: Eye, trend: 'Live Sync On', color: 'text-blue-400' },
                ].map((stat, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={stat.label}
                        className="p-5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md group hover:border-white/20 transition-all shadow-xl"
                    >
                        <div className="flex items-center justify-between mb-3 text-slate-500 uppercase text-[10px] font-black tracking-widest leading-none">
                            {stat.label}
                            <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <h4 className="text-2xl font-black text-white leading-none">{stat.value}</h4>
                                <p className={`text-[10px] font-bold mt-2 ${stat.color === 'text-amber-500' ? 'text-amber-500' : 'text-slate-400'}`}>{stat.trend}</p>
                            </div>
                            {stat.showSpark && (
                                <div className="h-8 w-16 bg-white/5 rounded-md flex items-end justify-between px-1 pb-1 gap-[2px]">
                                    {[30, 50, 40, 60, 80, 70, 90].map((h, j) => (
                                        <div key={j} className="w-full bg-teal-400/30 rounded-t-[1px]" style={{ height: `${h}%` }} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Senior Switcher (Sleeker / High-Density) */}
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-3 rounded-2xl backdrop-blur-md">
                <div className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-black tracking-widest uppercase flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    Focus Selection
                </div>
                <select
                    value={selectedSeniorId ?? ''}
                    onChange={(e) => onSeniorChange(e.target.value ? Number(e.target.value) : undefined)}
                    className="bg-transparent border-none text-gray-200 text-sm font-bold flex-1 appearance-none focus:outline-none cursor-pointer"
                >
                    <option value="" disabled className="bg-slate-900">Select Patient Profile</option>
                    {seniors.map(s => (
                        <option key={s.id} value={s.id} className="bg-slate-900">{s.name.toUpperCase()} (ID: 00{s.id})</option>
                    ))}
                </select>
                {selectedSeniorId && (
                    <button
                        onClick={() => requestCamera(selectedSeniorId)}
                        className="px-4 py-2 bg-red-600/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
                    >
                        <Camera className="w-3.5 h-3.5" />
                        INITIATE VERIFICATION
                    </button>
                )}
            </div>

            {/* Middle Grid: The "War Room" View */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Panel: Live Telemetry Stream */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-2 bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative"
                >
                    <header className="px-5 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <h3 className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase leading-none">Live Telemetry Stream</h3>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 leading-none uppercase">System.WAR_ROOM_v4.2</div>
                    </header>
                    <div className="p-4 font-mono text-[11px] space-y-2.5 max-h-[420px] overflow-y-auto custom-scrollbar bg-black/40">
                        {telemetryLogs.map(log => (
                            <div key={log.id} className="flex gap-4 group hover:bg-white/5 p-1 rounded transition-colors">
                                <span className="text-slate-600 shrink-0">[{log.time}]</span>
                                <span className={`shrink-0 font-bold ${log.status === 'error' ? 'text-red-500' : log.status === 'warning' ? 'text-amber-500' : 'text-blue-400'}`}>
                                    {log.event}:
                                </span>
                                <div className="text-slate-400 flex-1 leading-normal">
                                    {log.message}
                                    <span className="ml-2 text-slate-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        MATCH: <span className="text-teal-500">{log.match}</span>
                                    </span>
                                </div>
                            </div>
                        ))}
                        {recentLogs.map((log, i) => (
                            <div key={i} className="flex gap-4 group hover:bg-white/5 p-1 rounded transition-colors">
                                <span className="text-slate-600 shrink-0">[{new Date(log.taken_at).toLocaleTimeString([], { hour12: false })}]</span>
                                <span className={`shrink-0 font-bold ${log.status === 'verified' ? 'text-teal-400' : 'text-red-400'}`}>
                                    {log.status === 'verified' ? 'VISION-V2' : 'ALERT-CORE'}:
                                </span>
                                <div className="text-slate-300 flex-1 leading-normal uppercase text-[10px] font-black">
                                    {log.senior_name}: {log.medication_name} — {log.status}
                                </div>
                            </div>
                        ))}
                        {/* Simulation Cursor */}
                        <div className="flex gap-4 animate-pulse pt-2">
                            <span className="text-slate-600">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                            <span className="text-blue-500 font-bold">READY:</span>
                            <span className="text-slate-800 uppercase font-black">Waiting for fleet telemetry...</span>
                            <span className="w-1.5 h-3.5 bg-blue-500/50" />
                        </div>
                    </div>
                </motion.div>

                {/* Right Panel: Predictive Risk Radar */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <Radar className="w-5 h-5 text-amber-500" />
                        <h3 className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase leading-none">Predictive Risk Radar</h3>
                    </div>

                    <div className="space-y-8">
                        {atRiskPatients.map((patient, i) => (
                            <div key={i} className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <h4 className="text-xs font-black text-white tracking-widest uppercase">{patient.name}</h4>
                                    <span className={`text-[10px] font-mono font-bold ${patient.risk > 70 ? 'text-red-500' : patient.color}`}>
                                        RISK: {patient.risk}%
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${patient.risk}%` }}
                                        transition={{ duration: 1.5, delay: 0.5 + (i * 0.2) }}
                                        className={`h-full ${patient.risk > 70 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : patient.risk > 30 ? 'bg-amber-500' : 'bg-teal-400'}`}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium italic leading-[1.6]">
                                    {patient.insight}
                                </p>
                            </div>
                        ))}
                    </div>
                    {/* Radar Animation Placeholder */}
                    <div className="mt-10 flex justify-center opacity-20">
                        <div className="relative w-24 h-24 border border-slate-500 border-dashed rounded-full flex items-center justify-center animate-spin-slow">
                            <div className="w-12 h-12 border border-slate-500 border-dashed rounded-full" />
                            <div className="absolute top-0 left-1/2 -ml-px w-px h-1/2 bg-gradient-to-b from-teal-500 to-transparent origin-bottom" />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Row: Intelligence Summary */}
            <div className="grid lg:grid-cols-2 gap-8">
                {/* Llama 3.2 Terminal Output */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-[#050505] border-l-4 border-teal-500 rounded-r-2xl p-6 shadow-2xl relative group overflow-hidden"
                >
                    <div className="absolute top-4 right-4 text-[9px] font-mono text-teal-500 opacity-50 tracking-[0.2em]">LLAMA_3.2_RAG_v2.0</div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <Brain className="w-5 h-5 text-teal-400" />
                        <h3 className="text-[10px] font-black text-teal-400 tracking-[0.3em] uppercase leading-none">Intelligence Terminal</h3>
                    </div>
                    <div className="font-mono text-[13px] text-slate-300 leading-[1.8] space-y-4 relative z-10 transition-colors group-hover:text-white">
                        <p className="border-b border-white/5 pb-3">
                            <span className="text-teal-500 font-bold tracking-widest">SYSTEM_LOG:</span> Automated clinical fleet summary.
                        </p>
                        <p className="text-teal-100/90 tracking-tight">
                            Current telemetry confirms <span className="text-white font-black underline decoration-teal-500">94.2% fleet adherence</span>.
                            LSTM behavioral drift detected in <span className="text-amber-400 font-bold">John Doe</span> (Weekend Pattern Evasion).
                            RAG suggests immediate SMS nudge deployment.
                            Vision-V2 flagged hand tremors in <span className="text-red-400 font-bold">Sam Wilson</span>; updating neurological risk baseline.
                        </p>
                        <div className="flex items-center gap-6 text-[9px] uppercase font-black tracking-[0.2em] text-slate-600 pt-4 select-none">
                            <span className="hover:text-teal-500 transition-colors">Usage: 452T</span>
                            <span className="hover:text-teal-500 transition-colors">Latency: 124ms</span>
                            <span className="text-teal-500 animate-pulse underline cursor-pointer hover:text-white transition-colors">Run_Deep_Audit_v4.exe</span>
                        </div>
                    </div>
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity blur-3xl pointer-events-none" />
                </motion.div>

                {/* Patient Summary Card (Existing but Dense) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="p-6 bg-white/5 border border-white/10 rounded-2xl shadow-xl flex flex-col justify-between backdrop-blur-md"
                >
                    <div>
                        <div className="flex items-center gap-3 mb-8">
                            <Zap className="w-5 h-5 text-blue-400" />
                            <h3 className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase leading-none">Operational Summary</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 leading-none">Total Logs (24h)</p>
                                <p className="text-3xl font-black text-white leading-none">{recentLogs.length}</p>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-red-500/10 transition-colors">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 leading-none">Missed Detected</p>
                                <p className={`text-3xl font-black leading-none ${alerts.length > 0 ? 'text-red-500' : 'text-slate-700'}`}>{alerts.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4 mt-8">
                        <button
                            onClick={() => window.location.href = '/export'}
                            className="flex-1 py-3.5 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-slate-950 transition-all shadow-lg active:scale-95"
                        >
                            Generate Fleet Intelligence PDF
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-44 bg-card/20 border border-card-border rounded-[28px] animate-pulse"></div>
                    ))}
                </div>
                <div className="h-96 bg-card/20 border border-card-border rounded-[32px] animate-pulse"></div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}

