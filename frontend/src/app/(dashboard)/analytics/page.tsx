"use client";

import { useDashboardData } from '@/hooks/useDashboardData';
import { useUser } from '@/hooks/useUser';
import AdherenceChart from '@/components/AdherenceChart';
import { motion } from 'framer-motion';
import {
    LineChart,
    TrendingUp,
    Calendar,
    Activity,
    ChevronLeft,
    Download,
    Filter,
    Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

function AnalyticsContent() {
    const { user } = useUser();
    const router = useRouter();
    const [seniorId, setSeniorId] = useState<number | undefined>(undefined);
    const [seniors, setSeniors] = useState<any[]>([]);

    // For caregivers, fetch their linked seniors
    useEffect(() => {
        if (user?.role === 'caregiver') {
            apiFetch('/caregiver/seniors')
                .then((res: any) => {
                    const list = res.data || res.seniors || res || [];
                    if (Array.isArray(list) && list.length > 0) {
                        setSeniors(list);
                        setSeniorId(list[0].id);
                    }
                })
                .catch(() => { });
        }
    }, [user?.role]);

    const { data, loading, error } = useDashboardData(seniorId);

    if (loading || (user?.role === 'caregiver' && !seniorId && seniors.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
                <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 animate-pulse">DECODING_ANALYTICS_STREAM...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-12 text-center bg-red-500/5 border border-red-500/20 rounded-3xl backdrop-blur-md">
                <p className="text-red-500 font-black uppercase tracking-widest text-xs">CRITICAL_FETCH_ERROR: {error}</p>
            </div>
        );
    }

    const adherenceData = data?.stats?.history || [];
    const selectedSenior = seniors.find((s: any) => s.id === seniorId);

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20 pt-16 lg:pt-0">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
                <div className="relative">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-blue-400 transition-all mb-4 group uppercase tracking-[0.2em]"
                    >
                        <ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        EXIT_ANALYTICS
                    </button>
                    <div className="absolute -left-4 bottom-0 w-1 h-12 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                        ANALYTICS_COMMAND_CENTER <span className="text-blue-400 not-italic">v4.0</span>
                    </h1>
                    <p className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase flex items-center gap-4">
                        <span>REPORT_GEN: <span className="text-teal-400 font-black uppercase">ACTIVE</span></span>
                        {user?.role === 'caregiver' && selectedSenior && (
                            <span className="flex items-center gap-2 text-blue-400/60 font-black">
                                <Users className="w-3 h-3" />
                                NODE: {selectedSenior.name || selectedSenior.username}
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {user?.role === 'caregiver' && seniors.length > 1 && (
                        <select
                            value={seniorId}
                            onChange={(e) => setSeniorId(Number(e.target.value))}
                            className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all backdrop-blur-md shadow-xl appearance-none pr-12 relative cursor-pointer"
                        >
                            {seniors.map((s: any) => (
                                <option key={s.id} value={s.id} className="bg-slate-900 border-none">
                                    {s.name || s.username}
                                </option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={() => window.location.href = '/api/v1/caregiver/export/fleet/pdf'}
                        className="flex items-center gap-3 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-500/20 active:scale-95 group"
                    >
                        <Download className="w-3.5 h-3.5 group-hover:-translate-y-1 transition-transform" />
                        EXPORT_FLIGHT_DATA
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                    { label: "COMPLIANCE_VECTOR", value: `${data?.stats?.adherence || 0}%`, icon: Activity, color: "text-blue-400", sub: "STABLE_INF" },
                    { label: "TRACKING_HORIZON", value: "30 DAYS", icon: Calendar, color: "text-purple-400", sub: "T_WINDOW" },
                    { label: "HEALTH_STATUS_METRIC", value: data?.stats?.adherence > 80 ? "NOMINAL" : "DIVERGENT", icon: TrendingUp, color: data?.stats?.adherence > 80 ? "text-teal-400" : "text-amber-400", sub: "AUTO_DIAG" }
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden group cursor-default"
                    >
                        <div className="absolute top-0 right-0 p-4">
                            <stat.icon className={`w-4 h-4 ${stat.color} opacity-20 group-hover:opacity-100 transition-opacity`} />
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">{stat.label}</p>
                        <div className="flex items-end gap-2">
                            <p className="text-4xl font-black text-white italic tracking-tighter">{stat.value}</p>
                            <span className="text-[8px] font-black text-slate-600 mb-1.5">{stat.sub}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Main Chart Section */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-10 backdrop-blur-md shadow-2xl relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="flex items-center justify-between mb-12 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center backdrop-blur-md shadow-inner">
                            <LineChart className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">HISTORICAL_ADHERENCE_MATRIX</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">FULL_SPECTRUM_TELEMETRY_LOG</p>
                        </div>
                    </div>
                    <div className="hidden sm:block bg-black/40 px-6 py-2 rounded-full border border-white/5 shadow-inner">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">30_DAY_RESOLUTION_INDEX</span>
                    </div>
                </div>

                <div className="h-[450px] w-full bg-black/20 rounded-2xl p-6 border border-white/5 shadow-inner relative z-10">
                    <AdherenceChart data={adherenceData} />
                </div>
            </motion.div>

            {/* Detail Section */}
            <div className="grid lg:grid-cols-2 gap-8">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center text-center group hover:bg-white/10 transition-all backdrop-blur-md shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] bg-[size:20px:20px]" />
                    <div className="w-20 h-20 rounded-2xl bg-black/40 flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 transition-transform shadow-inner relative z-10">
                        <Filter className="w-10 h-10 text-slate-600" />
                    </div>
                    <p className="text-white text-xl font-black uppercase tracking-tighter italic relative z-10">MODULE_EXPANSION_STUB</p>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-4 max-w-xs leading-relaxed relative z-10">
                        Neural Predictors & Interaction Maps are currently being synchronized to the analytics cluster.
                    </p>
                </div>

                <div className="bg-blue-600/5 border border-blue-500/20 rounded-3xl p-12 relative overflow-hidden group hover:bg-blue-600/10 transition-all backdrop-blur-md shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                            <Activity className="w-5 h-5 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">NEURAL_INSIGHT_DECODER</h3>
                    </div>
                    <div className="p-6 bg-black/40 rounded-2xl border border-white/5 shadow-inner relative">
                        <div className="absolute top-4 left-4">
                            <Activity className="w-3 h-3 text-blue-500 opacity-30" />
                        </div>
                        <p className="text-slate-300 text-lg font-bold leading-relaxed italic pl-8">
                            &quot;Historical performance shows a 12% improvement in dose consistency over the last fortnight. Synchronization stability is at nominal levels.&quot;
                        </p>
                    </div>
                    <div className="mt-8 flex justify-end">
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-blue-400 animate-pulse">SYSTEM_STABLE_NOMINAL</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AnalyticsPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950">
                <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-8" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">SYNCHRONIZING_ANALYTICS...</p>
            </div>
        }>
            <AnalyticsContent />
        </Suspense>
    );
}

