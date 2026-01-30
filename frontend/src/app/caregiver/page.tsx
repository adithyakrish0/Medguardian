
"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Link2,
    Activity,
    ShieldCheck,
    MessageSquare,
    ChevronRight,
    Plus,
    Clock,
    Loader2,
    Zap,
    ArrowLeft,
    Trash2,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    Calendar,
    ArrowRight,
    FileDown
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import ConnectSeniorModal from '@/components/ConnectSeniorModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdherenceChart from '@/components/AdherenceChart';
import { useToast } from '@/components/NiceToast';

export default function CaregiverPage() {
    const router = useRouter();
    const [seniors, setSeniors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const { showToast } = useToast();

    const fetchSeniors = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiFetch('/caregiver/seniors');
            if (response.success) {
                setSeniors(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch seniors:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleRemoveSenior = async (seniorId: number, seniorName: string) => {
        if (!confirm(`Are you sure you want to disconnect ${seniorName} from your fleet? You will lose access to their health telemetry.`)) {
            return;
        }

        try {
            const res = await apiFetch(`/caregiver/remove-senior/${seniorId}`, {
                method: 'DELETE'
            });
            if (res.success) {
                setSeniors(seniors.filter(s => s.id !== seniorId));
                showToast(`Disconnected ${seniorName} from your fleet.`);
            }
        } catch (err) {
            console.error('Failed to remove senior:', err);
            showToast('Failed to disconnect senior', 'error');
        }
    };

    const handleReport = (seniorId: number) => {
        router.push(`/dashboard?seniorId=${seniorId}`);
    };

    const handleContact = (senior: any) => {
        if (!senior.phone) {
            showToast(`No phone number recorded for ${senior.name}.`, 'info');
            return;
        }

        const choice = confirm(`Contact ${senior.name} at ${senior.phone}?\n\nClick OK for Direct Voice Call\nClick Cancel for WhatsApp Message`);

        if (choice) {
            window.location.href = `tel:${senior.phone}`;
        } else {
            // Remove any non-numeric chars for WhatsApp
            const cleanPhone = senior.phone.replace(/\D/g, '');
            window.open(`https://wa.me/${cleanPhone}`, '_blank');
        }
    };

    const handleExportSenior = (seniorId: number) => {
        window.location.href = `/export/senior/${seniorId}/pdf`;
    };

    useEffect(() => {
        fetchSeniors();
    }, [fetchSeniors]);

    return (
        <div className="max-w-6xl mx-auto px-12 lg:px-24 space-y-12 py-12">
            {/* Command Center Header */}
            <header className="relative py-8 px-10 medical-card bg-primary text-white overflow-hidden rounded-[40px] shadow-3xl shadow-primary/20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full -ml-32 -mb-32 blur-3xl opacity-30" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-center md:text-left space-y-2">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
                            <button
                                onClick={() => router.back()}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-white/5 transition-all group"
                            >
                                <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                                Back
                            </button>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-white/10">
                                <ShieldCheck className="w-3 h-3 text-accent" />
                                Live Surveillance System
                            </div>
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-black tracking-tighter italic leading-none">
                            Caregiver <span className="text-accent underline decoration-white/20 underline-offset-8">Command</span>
                        </h1>
                        <p className="text-lg font-medium text-white/60 max-w-xl">
                            Real-time health telemetry & compliance monitoring.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowConnectModal(true)}
                        className="group px-8 py-4 bg-white text-primary rounded-[24px] font-black shadow-2xl hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-3 text-base shrink-0"
                    >
                        <Plus className="w-5 h-5" />
                        Connect New Senior
                    </button>
                </div>
            </header>

            {/* Global Telemetry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { label: "Fleet Adherence", value: seniors.length > 0 ? "94.2%" : "---", icon: Activity, color: "text-accent", bg: "bg-accent/10" },
                    { label: "Active Sensors", value: seniors.length > 0 ? (seniors.length * 3).toString() : "0", icon: Zap, color: "text-primary", bg: "bg-primary/10" },
                    { label: "Alert Severity", value: "NOMINAL", icon: ShieldCheck, color: "text-secondary", bg: "bg-secondary/10" }
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="medical-card p-8 bg-card/40 backdrop-blur-xl border border-card-border/50 rounded-[36px] group hover:border-primary/20 transition-all"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                                <stat.icon className={`w-7 h-7 ${stat.color}`} />
                            </div>
                            <div className="h-1.5 w-12 bg-card-border rounded-full overflow-hidden">
                                <motion.div
                                    className={`h-full ${stat.color.replace('text', 'bg')}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: '70%' }}
                                    transition={{ duration: 2, delay: 0.5 }}
                                />
                            </div>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-30 mb-1">{stat.label}</p>
                        <p className="text-4xl font-black text-foreground tracking-tight">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Patients Registry */}
            <div className="space-y-8">
                <div className="flex items-center justify-between px-4">
                    <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-4">
                        Patient Fleet
                        <span className="text-xs font-black px-3 py-1 bg-primary/10 text-primary rounded-full uppercase tracking-widest">{seniors.length} Registered</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {loading ? (
                        <div className="md:col-span-3 py-32 flex flex-col items-center justify-center medical-card bg-card/20 backdrop-blur-sm rounded-[48px] border-dashed border-4 border-card-border">
                            <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
                            <p className="font-black text-foreground/40 uppercase tracking-[0.3em] text-sm">Syncing Neural Health Feed...</p>
                        </div>
                    ) : (
                        <>
                            {seniors.map((senior, index) => (
                                <motion.div
                                    key={senior.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="medical-card p-1 bg-card/30 backdrop-blur-xl rounded-[42px] group relative transition-all hover:scale-[1.02] border border-card-border/50 overflow-hidden flex flex-col"
                                >
                                    {/* Pulse Background */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    <div className="p-8 relative z-10 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-primary rounded-[20px] blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                                                    <div className={`w-14 h-14 rounded-[20px] bg-background border-2 border-primary/20 flex items-center justify-center font-black text-foreground relative z-10`}>
                                                        {senior.name?.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-accent rounded-full border-2 border-background z-20 animate-pulse" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-foreground tracking-tight group-hover:text-primary transition-colors">{senior.name}</h3>
                                                    <div className="flex items-center gap-2">
                                                        <Activity className={`w-3 h-3 ${senior.status === 'Critical' ? 'text-red-500' : senior.status === 'Attention' ? 'text-yellow-500' : 'text-accent'}`} />
                                                        <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${senior.status === 'Critical' ? 'text-red-500' : senior.status === 'Attention' ? 'text-yellow-500' : 'opacity-40'}`}>
                                                            {senior.connection_status === 'accepted' ? `${senior.status} Status` : 'System Locked'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleRemoveSenior(senior.id, senior.name)}
                                                    className="p-2 rounded-xl text-foreground/20 hover:text-red-500 hover:bg-red-500/10 transition-all z-20"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleExportSenior(senior.id);
                                                    }}
                                                    className="p-2 rounded-xl text-foreground/20 hover:text-primary hover:bg-primary/10 transition-all z-20"
                                                >
                                                    <FileDown className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-6">
                                            <div className="bg-background/40 border border-card-border/50 p-6 rounded-[32px] group-hover:bg-white/5 transition-all">
                                                <div className="flex justify-between items-center mb-4">
                                                    <p className="text-[9px] opacity-30 font-black uppercase tracking-widest flex items-center gap-2">
                                                        <TrendingUp className="w-3 h-3 text-primary" />
                                                        Daily Progress
                                                    </p>
                                                    <span className={`text-xs font-black ${senior.status === 'Critical' ? 'text-red-500' : 'text-primary'}`}>
                                                        {senior.connection_status === 'accepted' ? `${senior.adherence_history[senior.adherence_history.length - 1].adherence}%` : '---'}
                                                    </span>
                                                </div>
                                                {senior.connection_status === 'accepted' && (
                                                    <div className="h-32 opacity-80 group-hover:opacity-100 transition-opacity">
                                                        <AdherenceChart data={senior.adherence_history} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 px-2">
                                                <div>
                                                    <p className="text-[9px] opacity-30 font-black uppercase tracking-widest mb-1">Medications</p>
                                                    <p className="text-base font-black text-foreground">
                                                        {senior.connection_status === 'accepted' ? `${senior.medication_count} Active` : 'Locked'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] opacity-30 font-black uppercase tracking-widest mb-1">Health Grade</p>
                                                    <p className={`text-base font-black italic ${senior.status === 'Critical' ? 'text-red-500' : senior.status === 'Attention' ? 'text-yellow-500' : 'text-accent'}`}>
                                                        {senior.connection_status === 'accepted' ? senior.status : 'Waiting'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mt-8">
                                            {senior.connection_status === 'accepted' ? (
                                                <>
                                                    <button
                                                        onClick={() => handleReport(senior.id)}
                                                        className="py-4 bg-primary text-white rounded-[20px] font-black shadow-lg shadow-primary/20 hover:scale-[1.05] transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
                                                    >
                                                        <Activity className="w-4 h-4" />
                                                        Deep Audit
                                                    </button>
                                                    <button
                                                        onClick={() => handleContact(senior)}
                                                        className="py-4 bg-background border border-card-border text-foreground/50 rounded-[20px] font-black hover:text-foreground hover:bg-card transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                        Contact
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="col-span-2 py-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-[20px] font-black flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest animate-pulse">
                                                    <Clock className="w-4 h-4" />
                                                    Awaiting Pair
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            {/* New Connection Anchor */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                onClick={() => setShowConnectModal(true)}
                                className="medical-card border-dashed border-[3px] border-card-border/50 flex flex-col items-center justify-center p-12 text-center group cursor-pointer hover:border-primary hover:bg-primary/5 transition-all rounded-[42px] min-h-[400px]"
                            >
                                <div className="w-24 h-24 rounded-[32px] bg-primary/10 flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-500">
                                    <Plus className="w-12 h-12 text-primary" />
                                </div>
                                <h3 className="text-3xl font-black tracking-tight text-foreground/40 group-hover:text-primary transition-colors italic">Attach Fleet</h3>
                                <p className="text-[10px] mt-4 font-black uppercase tracking-[0.2em] opacity-30 max-w-[180px]">Synchronize new patient telemetry via secure token exchange</p>
                            </motion.div>
                        </>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {showConnectModal && (
                    <ConnectSeniorModal
                        onClose={() => setShowConnectModal(false)}
                        onConnected={fetchSeniors}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
