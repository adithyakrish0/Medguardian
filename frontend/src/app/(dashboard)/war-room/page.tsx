"use client";

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    Activity,
    AlertTriangle,
    CheckCircle2,
    TrendingUp,
    RefreshCw,
    Search,
    Filter,
    ChevronRight,
    ArrowRight,
    ChevronLeft,
    ShieldX
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { useRouter } from 'next/navigation';

interface TelemetryPoint {
    senior_id: number;
    senior_name: string;
    risk_score: number;
    status: 'Stable' | 'Attention' | 'Critical';
    sparkline: number[];
    heatmap: Array<{
        time: string;
        hour: number;
        status: 'taken' | 'missed' | 'upcoming';
        med_name: string;
    }>;
    last_updated: string;
}

export default function WarRoomPage() {
    const { user, loading: userLoading } = useUser();
    const [data, setData] = useState<TelemetryPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    const fetchTelemetry = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiFetch('/caregiver/telemetry-fleet');
            if (res.success && res.data) {
                setData(res.data);
            } else {
                setData([]);
            }
        } catch (err) {
            console.error('Failed to fetch fleet telemetry:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTelemetry();
        const interval = setInterval(fetchTelemetry, 30000); // Auto refresh every 30s
        return () => clearInterval(interval);
    }, [fetchTelemetry]);

    const filteredData = (data || []).filter(s =>
        s.senior_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Critical': return 'text-red-500 border-red-500/30 bg-red-500/10';
            case 'Attention': return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
            default: return 'text-teal-400 border-teal-500/30 bg-teal-500/10';
        }
    };

    if (!userLoading && user?.role !== 'caregiver') {
        return (
            <div className="text-center py-24 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md shadow-2xl">
                <ShieldX className="mx-auto h-20 w-20 text-slate-700 mb-8" />
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">SECURITY_PROTOCOL_VIOLATION</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-4">Restricted access: CAREGIVER_LEVEL_REQUIRED</p>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="mt-10 px-8 py-3 bg-white/5 border border-white/10 hover:bg-white hover:text-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                >
                    ABORT_COMMAND_AND_RETURN
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 pt-16 lg:pt-0">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
                <div className="relative">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-blue-400 transition-all mb-4 group uppercase tracking-[0.2em]"
                    >
                        <ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        EXIT_WAR_ROOM
                    </button>
                    <div className="absolute -left-4 bottom-0 w-1 h-12 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                        STRATEGIC_COMMAND_WAR_ROOM <span className="text-blue-400 not-italic">v5.0</span>
                    </h1>
                    <p className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">
                        FLEET_STATUS: <span className="text-teal-400 font-black">MONITORING_ACTIVE</span>
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="SEARCH_FLEET_PATIENTS..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all min-w-[280px] backdrop-blur-md shadow-xl"
                        />
                    </div>
                    <button
                        onClick={fetchTelemetry}
                        className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white hover:text-slate-950 transition-all active:scale-95 group shadow-xl"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    </button>
                </div>
            </div>

            {loading && data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md shadow-2xl">
                    <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mt-10 animate-pulse">INITIATING_TELEMETRY_UPLINK...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <AnimatePresence mode="popLayout">
                        {filteredData.map((senior, idx) => (
                            <motion.div
                                key={senior.senior_id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl hover:bg-white/10 transition-all cursor-pointer relative overflow-hidden group border-r-[4px] border-r-blue-500/30"
                                onClick={() => router.push(`/dashboard?senior_id=${senior.senior_id}`)}
                            >
                                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full -mr-24 -mt-24 blur-[80px] pointer-events-none group-hover:bg-blue-500/10 transition-colors" />

                                <div className="flex items-start justify-between mb-10 relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-2xl text-blue-400 shadow-inner backdrop-blur-sm group-hover:scale-110 transition-transform">
                                            {senior.senior_name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white uppercase tracking-tighter italic group-hover:text-blue-400 transition-colors">{senior.senior_name}</h3>
                                            <div className={`mt-2 inline-flex items-center gap-2.5 px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest shadow-sm ${getStatusColor(senior.status)}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${senior.status === 'Critical' ? 'bg-red-500 animate-pulse' : senior.status === 'Attention' ? 'bg-amber-400' : 'bg-teal-400'}`} />
                                                {senior.status}_PRIORITY
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1.5">RISK_SCORE_INDEX</p>
                                        <div className="flex items-baseline justify-end gap-1">
                                            <p className={`text-5xl font-black italic tracking-tighter ${senior.risk_score > 100 ? 'text-red-500' : senior.risk_score > 40 ? 'text-amber-500' : 'text-blue-400'}`}>
                                                {senior.risk_score}
                                            </p>
                                            <span className="text-[10px] font-black text-slate-600 italic">vRI</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Monitoring Cluster */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/40 rounded-2xl p-6 border border-white/5 relative z-10 group-hover:bg-black/60 transition-colors shadow-inner">
                                    {/* Adherence Insight */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 flex items-center gap-2">
                                                <TrendingUp className="w-3 h-3 text-blue-500" />
                                                7D_ADHERENCE_VECTOR
                                            </p>
                                            <span className="text-[8px] font-black text-slate-700">INF_STABLE</span>
                                        </div>
                                        <div className="h-20 w-full relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={senior.sparkline.map((val, i) => ({ val, i }))}>
                                                    <YAxis hide domain={[0, 100]} />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="val"
                                                        stroke={senior.status === 'Critical' ? '#ef4444' : '#60a5fa'}
                                                        strokeWidth={4}
                                                        dot={false}
                                                        isAnimationActive={true}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Pulse Field */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 flex items-center gap-2">
                                                <Activity className="w-3 h-3 text-teal-400" />
                                                24H_DOSE_TOPOLOGY
                                            </p>
                                            <span className="text-[8px] font-black text-slate-700">T_DOMAIN_LIVE</span>
                                        </div>
                                        <div className="flex gap-1.5 h-16">
                                            {senior.heatmap.length > 0 ? (
                                                senior.heatmap.map((dose, i) => (
                                                    <div
                                                        key={i}
                                                        className={`flex-1 rounded-lg border backdrop-blur-md transition-all group/dose relative ${dose.status === 'taken' ? 'bg-teal-500/40 border-teal-500/30' :
                                                            dose.status === 'missed' ? 'bg-red-500/40 border-red-500/30' :
                                                                'bg-white/5 border-white/10'
                                                            }`}
                                                    >
                                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/dose:opacity-100 transition-opacity rounded-lg" />
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex-1 rounded-xl bg-white/5 flex items-center justify-center border border-dashed border-white/10">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-700 italic">EMPTY_SET</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10 flex items-center justify-between relative z-10 px-1">
                                    <div className="flex items-center gap-8">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-1">TELEMETRY_FEED</span>
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                <span className="text-[10px] font-black text-white italic tracking-widest uppercase">NODE_ACTIVE</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-1">LAST_SYNC_EVENT</span>
                                            <span className="text-[10px] font-black text-slate-400 italic bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                                {new Date(senior.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>

                                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {filteredData.length === 0 && !loading && (
                <div className="text-center py-40 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md shadow-2xl relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-amber-500/5 rounded-full blur-[60px]" />
                    <AlertTriangle className="w-20 h-20 text-slate-800 mx-auto mb-10" />
                    <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter italic">ZERO_NODES_FOUND</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-6 max-w-xs mx-auto leading-relaxed">
                        The current search parameter identifies no active nodes in the monitor fleet.
                    </p>
                    <button
                        onClick={() => setSearchTerm('')}
                        className="mt-10 px-6 py-2 border border-blue-500/30 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-lg shadow-blue-500/10"
                    >
                        CLEAR_FILTER_INDEX
                    </button>
                </div>
            )}
        </div>
    );
}
