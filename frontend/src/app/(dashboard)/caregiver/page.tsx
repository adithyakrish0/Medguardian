
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
            <div className="max-w-6xl mx-auto space-y-10 pb-20 pt-16 lg:pt-0">
                {/* Care Dashboard Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="relative">
                        <div className="absolute -left-4 top-0 w-1 h-12 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                            CAREGIVER_DASHBOARD <span className="text-blue-400 not-italic">v4.2</span>
                        </h1>
                        <p className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">
                            FLEET_STATUS: <span className="text-teal-400">NOMINAL_OPERATIONS</span>
                        </p>
                    </div>

                    <button
                        onClick={() => setShowConnectModal(true)}
                        className="px-6 py-3 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-xl font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-500/5 flex items-center gap-3 text-[10px] shrink-0 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        ESTABLISH_NEW_LINK
                    </button>
                </div>

                {/* Global Telemetry Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { label: "Patient Adherence", value: seniors.length > 0 ? (() => { const vals = seniors.filter((s: any) => s.adherence_history?.length > 0).map((s: any) => s.adherence_history[s.adherence_history.length - 1]?.adherence).filter((v: any) => v != null); return vals.length > 0 ? `${Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length)}%` : '---'; })() : "---", icon: Activity, color: "text-blue-400", bg: "bg-blue-500/10" },
                        { label: "Active Patients", value: seniors.length > 0 ? seniors.length.toString() : "0", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10" },
                        { label: "System Status", value: "Optimal", icon: ShieldCheck, color: "text-green-400", bg: "bg-green-500/10" }
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
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
                                    <h4 className="text-2xl font-black text-white leading-none">{stat.value}</h4>
                                    <p className={`text-[10px] font-bold mt-2 ${stat.color === 'text-amber-400' ? 'text-amber-500' : 'text-slate-400'}`}>STATUS: NOMINAL</p>
                                </div>
                                <div className="h-8 w-16 bg-white/5 rounded-md flex items-end justify-between px-1 pb-1 gap-[2px]">
                                    {[30, 50, 40, 60, 80, 70, 90].map((h, j) => (
                                        <div key={j} className={`w-full ${stat.color.replace('text', 'bg')}/30 rounded-t-[1px]`} style={{ height: `${h}%` }} />
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Patients Registry */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-lg font-black text-gray-200 flex items-center gap-3 uppercase tracking-tighter italic">
                            <Users className="w-5 h-5 text-blue-500" />
                            PATIENT_REGISTRY
                            <span className="text-[9px] font-black px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md uppercase tracking-[0.2em] border border-blue-500/20">{seniors.length} NODES_ACTIVE</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
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
                                        className="bg-white/5 border border-white/10 rounded-2xl group relative transition-all hover:bg-white/[0.08] overflow-hidden flex flex-col shadow-2xl backdrop-blur-md"
                                    >
                                        <div className="p-5 relative z-10 flex flex-col h-full">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center font-black text-white relative z-10 text-sm uppercase">
                                                            {senior.name?.slice(0, 2) || '??'}
                                                        </div>
                                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 z-20 ${senior.status === 'Critical' ? 'bg-red-500 animate-pulse' : 'bg-teal-400'}`} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black text-white tracking-widest uppercase group-hover:text-blue-400 transition-colors uppercase">{senior.name}</h3>
                                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">ID_NODE: 00{senior.id}</p>
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
                                                <div className="bg-black/20 border border-white/5 p-3 rounded-xl">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Live_Adherence</p>
                                                        <span className={`text-[10px] font-mono font-black ${senior.status === 'Critical' ? 'text-red-500' : 'text-teal-400'}`}>
                                                            {senior.connection_status === 'accepted' && senior.adherence_history?.length > 0
                                                                ? `${Math.round(senior.adherence_history[senior.adherence_history.length - 1]?.adherence)}%`
                                                                : '00%'}
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
                                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">PROTOCOLS</p>
                                                        <p className="text-xs font-black text-white">
                                                            {senior.connection_status === 'accepted' ? `${senior.medication_count} ACTIVE` : 'LOCKED'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">THRESHOLD</p>
                                                        <p className={`text-xs font-black uppercase ${senior.status === 'Critical' ? 'text-red-500' : senior.status === 'Attention' ? 'text-amber-500' : 'text-teal-400'}`}>
                                                            {senior.connection_status === 'accepted' ? senior.status : 'WAITING'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mt-6">
                                                {senior.connection_status === 'accepted' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleReport(senior.id)}
                                                            className="py-2.5 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-lg font-black hover:bg-blue-600 hover:text-white transition-all text-[9px] uppercase tracking-widest"
                                                        >
                                                            ACCESS_INTEL
                                                        </button>
                                                        <button
                                                            onClick={() => handleContact(senior)}
                                                            className="py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-lg font-black hover:text-white hover:bg-white/10 transition-all text-[9px] uppercase tracking-widest"
                                                        >
                                                            COMMS_INIT
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="col-span-2 py-3 bg-amber-500/5 border border-amber-500/20 text-amber-500 rounded-lg font-black flex items-center justify-center gap-3 text-[9px] uppercase tracking-widest animate-pulse">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        AWAITING_PAIR_CIPHER
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    onClick={() => setShowConnectModal(true)}
                                    className="border-dashed border-2 border-white/10 flex flex-col items-center justify-center p-8 text-center group cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all rounded-2xl min-h-[340px] shadow-xl"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-blue-500/5 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-500/10 transition-all duration-500 border border-blue-500/10">
                                        <Plus className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <h3 className="text-sm font-black tracking-[0.2em] text-slate-500 uppercase group-hover:text-blue-400 transition-colors">Integrate_New_Node</h3>
                                    <p className="text-[9px] mt-2 font-black uppercase tracking-widest text-slate-600 max-w-[140px]">Establish biometric link via secure share code</p>
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
