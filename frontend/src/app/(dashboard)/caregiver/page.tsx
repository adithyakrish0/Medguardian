
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
    Trash2,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    Calendar,
    ArrowRight,
    FileDown,
    ChevronLeft
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import ConnectSeniorModal from '@/components/ConnectSeniorModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdherenceChart from '@/components/AdherenceChart';
import { useToast } from '@/components/NiceToast';
import ContactChoiceModal from '@/components/ContactChoiceModal';
import DisconnectConfirmModal from '@/components/DisconnectConfirmModal';

import { CaregiverOnly } from '@/components/RoleGuard';

export default function CaregiverPage() {
    const router = useRouter();
    const [seniors, setSeniors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);
    const [seniorToContact, setSeniorToContact] = useState<any>(null);
    const [seniorToDisconnect, setSeniorToDisconnect] = useState<any>(null);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const { showToast } = useToast();

    const fetchSeniors = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiFetch('/caregiver/seniors');
            if (response.success) {
                setSeniors(response.data);
            }
        } catch (err) {
            // Silently handle error - loading state will show empty
        } finally {
            setLoading(false);
        }
    }, []);;

    const handleRemoveSenior = (seniorId: number, seniorName: string) => {
        setSeniorToDisconnect({ id: seniorId, name: seniorName });
        setShowDisconnectModal(true);
    };

    const confirmRemoveSenior = async () => {
        if (!seniorToDisconnect) return;

        try {
            setIsDisconnecting(true);
            const res = await apiFetch(`/caregiver/remove-senior/${seniorToDisconnect.id}`, {
                method: 'DELETE'
            });
            if (res.success) {
                setSeniors(seniors.filter(s => s.id !== seniorToDisconnect.id));
                showToast(`Disconnected ${seniorToDisconnect.name} from your fleet.`);
                setShowDisconnectModal(false);
            }
        } catch (err) {
            showToast('Failed to disconnect senior', 'error');
        } finally {
            setIsDisconnecting(false);
            setSeniorToDisconnect(null);
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
        setSeniorToContact(senior);
        setShowContactModal(true);
    };

    const handleExportSenior = (seniorId: number) => {
        window.location.href = `/export/senior/${seniorId}/pdf`;
    };

    useEffect(() => {
        fetchSeniors();
    }, [fetchSeniors]);

    return (
        <CaregiverOnly>
            <div className="max-w-6xl mx-auto space-y-6 pb-20 pt-0">
                {/* Care Dashboard Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-[26px] font-semibold text-slate-100 tracking-[-0.4px]">
                            My Patients
                        </h1>
                        <p className="text-[13px] text-slate-500 mt-1">
                            {seniors.length} patients connected · All monitored
                        </p>
                    </div>
                </div>

                {/* Global Telemetry Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { label: "Avg. Adherence", value: seniors.length > 0 ? (() => { const vals = seniors.filter((s: any) => s.adherence_history?.length > 0).map((s: any) => Math.min(100, Math.round(s.adherence_history[s.adherence_history.length - 1]?.adherence))).filter((v: any) => v != null); return vals.length > 0 ? `${Math.min(100, Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length))}%` : '---'; })() : "---", icon: Activity, color: "text-blue-400", bg: "bg-blue-500/10" },
                        { label: "Patients", value: seniors.length > 0 ? seniors.length.toString() : "0", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10" },
                        { label: "System Health", value: "Optimal", icon: ShieldCheck, color: "text-green-400", bg: "bg-green-500/10" }
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-[#0d1525] border border-[#182338] rounded-xl p-5 hover:border-[#1f2e47] transition-colors group shadow-xl"
                        >
                            <div className="flex items-center justify-between mb-3 text-[12px] font-medium text-slate-400 leading-none">
                                {stat.label}
                                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                            </div>
                            <div className="flex items-end justify-between">
                                <div>
                                    <h4 className="text-[28px] font-semibold text-slate-100 leading-none">{stat.value}</h4>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Patients Registry */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[15px] font-semibold text-slate-200">
                                Patients
                            </h2>
                            <span className="text-[11px] font-medium px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/15">
                                {seniors.length} connected
                            </span>
                        </div>
                        
                        <button
                            onClick={() => setShowConnectModal(true)}
                            className="text-[13px] font-medium px-4 py-2.5 bg-blue-600 text-white rounded-[10px] hover:bg-blue-500 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            + Add Patient
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {loading ? (
                            <div className="md:col-span-3 py-32 flex flex-col items-center justify-center">
                                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                                <p className="font-bold opacity-40 animate-pulse uppercase tracking-widest text-[10px]">Loading patient data...</p>
                            </div>
                        ) : (
                            <>
                                {seniors.map((senior, index) => (
                                    <motion.div
                                        key={senior.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-[#0d1525] border border-[#182338] rounded-xl p-5 flex flex-col gap-4 hover:border-[#1f2e47] transition-all group overflow-hidden"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-full bg-[#172038] text-blue-400 text-[13px] font-semibold flex items-center justify-center">
                                                        {senior.name?.slice(0, 2) || '??'}
                                                    </div>
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d1525] z-20 ${senior.status === 'Critical' ? 'bg-red-500 animate-pulse' : 'bg-teal-400'}`} />
                                                </div>
                                                <div>
                                                    <h3 className="text-[14px] font-medium text-slate-200 group-hover:text-blue-400 transition-colors uppercase">{senior.name}</h3>
                                                    <p className="text-[11px] text-slate-500">
                                                        {senior.connection_status === 'accepted' ? (senior.role === 'senior' ? 'Senior Patient' : senior.role) : 'Pending Link'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleRemoveSenior(senior.id, senior.name)}
                                                    className="p-2 rounded-lg text-slate-600 hover:text-red-500 transition-all z-20"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleExportSenior(senior.id);
                                                    }}
                                                    className="p-2 rounded-lg text-slate-600 hover:text-blue-400 transition-all z-20"
                                                >
                                                    <FileDown className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-4">
                                            <div className="bg-[#0a1220] border border-[#162030] rounded-lg p-3">
                                                <div className="flex justify-between items-center mb-3">
                                                    <p className="text-[11px] font-medium text-slate-500">Live Adherence</p>
                                                    <span className={`text-[12px] font-semibold ${senior.status === 'Critical' ? 'text-red-500' : 'text-teal-400'}`}>
                                                        {senior.connection_status === 'accepted' && senior.adherence_history?.length > 0
                                                            ? `${Math.min(100, Math.round(senior.adherence_history[senior.adherence_history.length - 1]?.adherence))}%`
                                                            : '0%'}
                                                    </span>
                                                </div>
                                                {senior.connection_status === 'accepted' && (
                                                    <div className="h-16 opacity-60">
                                                        <AdherenceChart data={senior.adherence_history} variant="mini" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 px-1">
                                                <div>
                                                    <p className="text-[11px] text-slate-500 font-medium mb-1">Medications</p>
                                                    <p className="text-[13px] font-medium text-white">
                                                        {senior.connection_status === 'accepted' ? `${senior.medication_count} Active` : 'Locked'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[11px] text-slate-500 font-medium mb-1">Status</p>
                                                    <p className={`text-[13px] font-medium ${senior.status === 'Critical' ? 'text-red-400' : senior.status === 'Attention' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                        {senior.connection_status === 'accepted' ? senior.status : 'Waiting'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            {senior.connection_status === 'accepted' ? (
                                                <>
                                                    <button
                                                        onClick={() => handleReport(senior.id)}
                                                        className="py-2.5 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-lg font-medium hover:bg-blue-600 hover:text-white transition-all text-[12px]"
                                                    >
                                                        View Dashboard
                                                    </button>
                                                    <button
                                                        onClick={() => handleContact(senior)}
                                                        className="py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-lg font-medium hover:text-white hover:bg-white/10 transition-all text-[12px]"
                                                    >
                                                        Contact
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="col-span-2 py-3 bg-amber-500/5 border border-amber-500/20 text-amber-400 rounded-lg font-medium flex items-center justify-center gap-3 text-[12px]">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    Awaiting acceptance
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    onClick={() => setShowConnectModal(true)}
                                    className="border-dashed border border-[#182338] flex flex-col items-center justify-center p-8 text-center group cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all rounded-xl min-h-[280px] shadow-xl"
                                >
                                    <div className="w-12 h-12 rounded-full bg-blue-500/5 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-500/10 transition-all duration-500 border border-blue-500/10">
                                        <Plus className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <h3 className="text-[14px] font-medium text-slate-500 group-hover:text-blue-400 transition-colors">Add a patient</h3>
                                    <p className="text-[12px] text-slate-600 mt-1 font-normal max-w-[180px]">Connect a senior with a share code</p>
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

                    {showContactModal && seniorToContact && (
                        <ContactChoiceModal
                            isOpen={showContactModal}
                            onClose={() => {
                                setShowContactModal(false);
                                setSeniorToContact(null);
                            }}
                            senior={seniorToContact}
                        />
                    )}

                    {showDisconnectModal && seniorToDisconnect && (
                        <DisconnectConfirmModal
                            isOpen={showDisconnectModal}
                            onClose={() => {
                                setShowDisconnectModal(false);
                                setSeniorToDisconnect(null);
                            }}
                            onConfirm={confirmRemoveSenior}
                            seniorName={seniorToDisconnect.name}
                            loading={isDisconnecting}
                        />
                    )}
                </AnimatePresence>
            </div>
        </CaregiverOnly >
    );
}
