"use client";

import { useState, useEffect } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { motion } from 'framer-motion';
import { useUser } from '@/hooks/useUser';
import { apiFetch } from '@/lib/api';
import AIVerificationModal from '@/components/AIVerificationModal';
import {
    Activity,
    Clock,
    CheckCircle2,
    AlertCircle,
    Zap,
    TrendingUp,
    Calendar,
    ChevronRight,
    Play,
    Heart,
    Smile,
    ArrowRight,
    Users
} from 'lucide-react';

export default function DashboardPage() {
    const [selectedSeniorId, setSelectedSeniorId] = useState<number | undefined>(undefined);
    const { data, loading: dataLoading, error, refresh } = useDashboardData(selectedSeniorId);
    const { user, loading: userLoading } = useUser();

    if (dataLoading || userLoading) {
        return (
            <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-44 bg-card/20 border border-card-border rounded-[28px] animate-pulse"></div>
                    ))}
                </div>
                <div className="h-96 bg-card/20 border border-card-border rounded-[32px] animate-pulse"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-10 medical-card bg-red-500/5 border-red-500/20 text-red-600">
                <AlertCircle className="w-12 h-12 mb-4" />
                <h2 className="text-2xl font-black mb-2">Connection Issue</h2>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {user?.role === 'caregiver' ? (
                <CaregiverDashboardView
                    data={data}
                    onSeniorChange={(id) => setSelectedSeniorId(id)}
                    selectedSeniorId={selectedSeniorId}
                />
            ) : (
                <SeniorDashboardView data={data} onRefresh={refresh} />
            )}
        </div>
    );
}

function SeniorDashboardView({ data, onRefresh }: { data: any; onRefresh: () => void }) {
    const nextMed = data?.schedule?.upcoming?.[0];
    const takenToday = data?.schedule?.taken?.length ?? 0;
    const [verifyingMed, setVerifyingMed] = useState<{ id: number; name: string } | null>(null);

    const markAsTaken = async (medicationId: number, verified: boolean, method: string) => {
        const endpoint = `/medications/${medicationId}/mark-taken`;
        console.log('[Dashboard] markAsTaken calling:', endpoint);
        await apiFetch(endpoint, {
            method: 'POST',
            body: JSON.stringify({ verified, verification_method: method })
        });
    };

    return (
        <div className="space-y-12 py-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Greeting */}
            <header className="mb-16">
                <h1 className="text-6xl md:text-7xl font-black text-foreground tracking-tighter mb-4 italic">
                    Hello!
                </h1>
                <p className="text-2xl font-medium opacity-60">
                    Here is how your day is going.
                </p>
            </header>

            <div className="grid gap-10">
                {/* Missed Medications Alert - Show FIRST if overdue */}
                {data?.schedule?.missed?.length > 0 && (
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="medical-card p-10 bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-3xl shadow-red-500/40 rounded-[48px] relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />

                        <div className="flex flex-col gap-6 relative z-10">
                            <div className="flex items-center justify-between">
                                <div className="inline-flex items-center gap-3 px-5 py-2 bg-white/20 rounded-full text-sm font-black uppercase tracking-widest">
                                    <AlertCircle className="w-5 h-5 animate-pulse" />
                                    Overdue Medication
                                </div>
                                <span className="text-white/70 font-bold">
                                    {data.schedule.missed.length} medication{data.schedule.missed.length > 1 ? 's' : ''} late
                                </span>
                            </div>

                            {data.schedule.missed.map((med: any) => (
                                <div key={med.id} className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white/10 rounded-3xl p-6">
                                    <div className="text-center md:text-left">
                                        <h3 className="text-4xl md:text-5xl font-black tracking-tight">{med.name}</h3>
                                        <p className="text-lg font-bold opacity-80">
                                            Was due at {med.scheduled_time || 'earlier today'} • {med.dosage}
                                        </p>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setVerifyingMed({ id: med.id, name: med.name })}
                                            className="px-8 py-4 bg-white text-red-600 rounded-2xl text-lg font-black shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                                        >
                                            <Play className="w-5 h-5 fill-current" />
                                            Take Now
                                        </button>
                                        <button
                                            onClick={async () => {
                                                await apiFetch(`/medications/${med.id}/skip`, { method: 'POST' });
                                                onRefresh();
                                            }}
                                            className="px-6 py-4 bg-white/20 text-white rounded-2xl text-lg font-bold hover:bg-white/30 transition-all"
                                        >
                                            Skip Today
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Big Next Dose Card */}
                {nextMed ? (
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="medical-card p-12 bg-primary text-white shadow-3xl shadow-primary/40 rounded-[60px] relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />

                        <div className="flex flex-col md:flex-row justify-between items-center gap-10 relative z-10">
                            <div className="space-y-6 text-center md:text-left">
                                <div className="inline-flex items-center gap-3 px-6 py-2 bg-white/20 rounded-full text-sm font-black uppercase tracking-widest">
                                    <Clock className="w-5 h-5" />
                                    Next Medicine
                                </div>
                                <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">
                                    {nextMed.name}
                                </h2>
                                <p className="text-2xl font-bold opacity-80 italic">
                                    Expected around {nextMed.time}
                                </p>
                            </div>

                            <button
                                onClick={() => setVerifyingMed({ id: nextMed.id, name: nextMed.name })}
                                className="px-16 py-8 bg-white text-primary rounded-[40px] text-3xl font-black shadow-2xl hover:scale-105 transition-all flex items-center gap-4 group-hover:rotate-1"
                            >
                                <Play className="w-10 h-10 fill-current" />
                                Start Now
                            </button>


                        </div>
                    </motion.div>
                ) : data?.schedule?.missed?.length === 0 && (
                    <div className="medical-card p-16 bg-accent/20 text-accent text-center rounded-[60px] border-4 border-accent/10">
                        <Smile className="w-20 h-10 mx-auto mb-6 scale-[2]" />
                        <h2 className="text-4xl font-black mb-4">You are all caught up!</h2>
                        <p className="text-xl font-bold opacity-70 italic">No more medicines scheduled for right now.</p>
                    </div>
                )}


                {/* Progress Card */}
                <div className="grid md:grid-cols-2 gap-10">
                    <div className="medical-card p-10 bg-white dark:bg-card/50 rounded-[48px] border-2 border-primary/5 flex items-center gap-8">
                        <div className="w-24 h-24 rounded-[32px] bg-secondary/10 flex items-center justify-center text-secondary">
                            <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <div>
                            <p className="text-5xl font-black text-foreground">{takenToday}</p>
                            <p className="text-xl font-bold opacity-50 italic">Medicines Taken Today</p>
                        </div>
                    </div>

                    <div className="medical-card p-10 bg-white dark:bg-card/50 rounded-[48px] border-2 border-primary/5 flex items-center gap-8">
                        <div className="w-24 h-24 rounded-[32px] bg-red-500/10 flex items-center justify-center text-red-500">
                            <Heart className="w-12 h-12 fill-current" />
                        </div>
                        <div>
                            <p className="text-5xl font-black text-foreground">{data?.stats?.adherence ?? 100}%</p>
                            <p className="text-xl font-bold opacity-50 italic">Health Score</p>
                        </div>
                    </div>
                </div>

                {/* Encouraging Message */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="p-12 text-center"
                >
                    <p className="text-3xl md:text-4xl font-black opacity-30 italic leading-tight">
                        &quot;You are doing a great job taking care of yourself today.&quot;
                    </p>
                </motion.div>
            </div>

            {/* Verification Modal */}
            {verifyingMed && (
                <AIVerificationModal
                    medicationId={verifyingMed.id}
                    medicationName={verifyingMed.name}
                    onClose={() => setVerifyingMed(null)}
                    onVerified={async () => {
                        console.log('[Dashboard] onVerified called, marking as taken:', verifyingMed.id);
                        try {
                            await markAsTaken(verifyingMed.id, true, 'vision_v2');
                            console.log('[Dashboard] markAsTaken success');
                        } catch (error) {
                            console.error('[Dashboard] markAsTaken error:', error);
                        }
                        setVerifyingMed(null);
                        onRefresh();
                    }}
                />
            )}

        </div>
    );
}

function CaregiverDashboardView({ data, onSeniorChange, selectedSeniorId }: { data: any, onSeniorChange: (id: number | undefined) => void, selectedSeniorId?: number }) {
    const [seniors, setSeniors] = useState<any[]>([]);

    useEffect(() => {
        const fetchSeniors = async () => {
            try {
                const response = await apiFetch('/caregiver/api/seniors');
                if (response.success) {
                    setSeniors(response.data);
                }
            } catch (err) {
                console.error('Failed to fetch seniors:', err);
            }
        };
        fetchSeniors();
    }, []);

    const stats = [
        {
            label: "Adherence Precision",
            value: `${data?.stats?.adherence ?? 100}%`,
            trend: "Optimal Range",
            icon: Activity,
            color: "text-accent",
            bg: "bg-accent/10"
        },
        {
            label: "Sequential Dose",
            value: data?.schedule?.upcoming?.[0]?.time || "Verified",
            trend: data?.schedule?.upcoming?.[0]?.name || "Cycles Clear",
            icon: Clock,
            color: "text-primary",
            bg: "bg-primary/10"
        },
        {
            label: "Total Protocols",
            value: (data?.stats?.total ?? 0).toString(),
            trend: `${data?.schedule?.taken?.length ?? 0} Logs Finalized`,
            icon: Zap,
            color: "text-secondary",
            bg: "bg-secondary/10"
        },
    ];

    return (
        <div className="space-y-10">
            {/* Senior Switcher */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-card/40 backdrop-blur-md p-6 rounded-[32px] border border-card-border gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black tracking-tight">Active Surveillance</h3>
                        <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">Linked Senior Accounts</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <select
                        value={selectedSeniorId ?? ''}
                        onChange={(e) => onSeniorChange(e.target.value ? Number(e.target.value) : undefined)}
                        className="bg-background border border-card-border text-foreground px-6 py-3 rounded-2xl font-bold flex-1 md:w-64 appearance-none focus:outline-none focus:border-primary transition-colors"
                    >
                        <option value="">My Personal View</option>
                        {seniors.map(s => (
                            <option key={s.id} value={s.id}>{s.name} (ID: {s.id})</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, index) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={stat.label}
                        className="medical-card p-8 group relative overflow-hidden bg-card/40 backdrop-blur-md"
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} -mr-8 -mt-8 rounded-full blur-3xl opacity-50 transition-opacity group-hover:opacity-100`} />
                        <div className="flex items-center justify-between mb-6">
                            <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <TrendingUp className="w-4 h-4 opacity-20" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-1">{stat.label}</p>
                        <p className="text-4xl font-black text-foreground tracking-tight leading-none mb-4">{stat.value}</p>
                        <p className={`text-xs font-black uppercase tracking-widest ${stat.color} opacity-80 flex items-center gap-2`}>
                            {stat.trend}
                        </p>
                    </motion.div>
                ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Schedule Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="medical-card p-10 bg-card/60 backdrop-blur-xl border-l-[12px] border-l-primary/30"
                >
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-6 h-6 text-primary" />
                            <h3 className="text-2xl font-black text-foreground tracking-tight underline decoration-primary/20 decoration-4 underline-offset-4">Active Schedule</h3>
                        </div>
                        <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-100 transition-opacity bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                            Full Timeline
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Taken Meds */}
                        {data?.schedule.taken.map((med: any) => (
                            <div key={med.id} className="flex items-center gap-5 p-5 rounded-[24px] border border-accent/10 bg-accent/5 group transition-all hover:bg-accent/10">
                                <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center text-accent">
                                    <CheckCircle2 className="w-7 h-7" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-foreground tracking-tight text-lg">{med.name}</p>
                                    <p className="text-[10px] font-black text-accent uppercase tracking-[0.2em] opacity-60">Verified at {med.taken_at}</p>
                                </div>
                                <div className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Logged</div>
                            </div>
                        ))}

                        {/* Upcoming Meds */}
                        {data?.schedule.upcoming.map((med: any) => (
                            <div key={med.id} className="flex items-center gap-5 p-5 rounded-[24px] border border-card-border bg-background/50 hover:bg-card hover:border-primary/20 transition-all group">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <Clock className="w-7 h-7" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-foreground tracking-tight text-lg">{med.name}</p>
                                    <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] italic">Window: {med.time}</p>
                                </div>
                                <button className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 transition-all group-hover:rotate-90">
                                    <Play className="w-5 h-5 fill-current" />
                                </button>
                            </div>
                        ))}

                        {data?.stats.total === 0 && (
                            <div className="py-20 text-center opacity-30">
                                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                                <p className="text-lg font-black tracking-tight">System Idle</p>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2">Awaiting next operational cycle</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Health Insights */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="medical-card p-10 bg-primary/95 text-white shadow-2xl shadow-primary/40 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

                    <header className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-3">
                            <Activity className="w-6 h-6 text-accent" />
                            <h3 className="text-2xl font-black tracking-tight">AI Diagnostic Feedback</h3>
                        </div>
                        <span className="px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/10">
                            Neural Engine V2
                        </span>
                    </header>

                    <div className="space-y-8">
                        <p className="text-3xl font-black leading-tight tracking-tight italic">
                            &quot;{data?.stats.adherence === 100
                                ? "Critical path secured. Maintain current dosing logic for continued metabolic stability."
                                : "Adherence deviation detected. Recalibrating upcoming reminder sensitivity."}&quot;
                        </p>

                        <div className="pt-8 border-t border-white/10">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-6">Recent System Logs</h4>
                            <div className="space-y-6">
                                {[
                                    { msg: "Voice synthesis calibrated", time: "2m ago" },
                                    { msg: "Biometric verification successful", time: "14m ago" },
                                    { msg: "Peripheral sensor sync complete", time: "1h ago" }
                                ].map((log, i) => (
                                    <div key={i} className="flex items-center justify-between group cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <div className="w-2 h-2 rounded-full bg-accent" />
                                            <p className="text-sm font-bold group-hover:translate-x-1 transition-transform">{log.msg}</p>
                                        </div>
                                        <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">{log.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button className="w-full py-4 mt-4 bg-white text-primary rounded-[20px] font-black text-sm uppercase tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                            Download Compliance Report
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
