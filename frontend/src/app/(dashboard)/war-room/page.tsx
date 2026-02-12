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
    ArrowRight
} from 'lucide-react';
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
            case 'Critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'Attention': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        }
    };

    return (
        <div className="space-y-12">
            {/* Header Area */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Patient Monitoring</span>
                    </div>
                    <h1 className="text-5xl font-black text-foreground tracking-tighter">
                        Care <span className="text-primary italic">Overview</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search Patients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-card/40 border border-card-border rounded-[20px] pl-12 pr-6 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/20 transition-all min-w-[280px]"
                        />
                    </div>
                    <button
                        onClick={fetchTelemetry}
                        className={`p-4 rounded-2xl bg-card border border-card-border hover:bg-secondary/5 transition-all ${loading ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw className="w-5 h-5 opacity-40" />
                    </button>
                </div>
            </header>

            {loading && data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Loading patient data...</p>
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
                                className="medical-card p-8 bg-card/60 backdrop-blur-xl group hover:shadow-2xl hover:shadow-primary/10 transition-all cursor-pointer"
                                onClick={() => router.push(`/dashboard?senior_id=${senior.senior_id}`)}
                            >
                                <div className="flex items-start justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center font-black text-xl text-primary border border-card-border overflow-hidden">
                                            {senior.senior_name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black tracking-tight text-foreground">{senior.senior_name}</h3>
                                            <div className={`mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${getStatusColor(senior.status)}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${senior.status === 'Critical' ? 'bg-red-500 animate-pulse' : senior.status === 'Attention' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                {senior.status}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">Risk Score</p>
                                        <p className={`text-3xl font-black tracking-tighter ${senior.risk_score > 100 ? 'text-red-500' : senior.risk_score > 40 ? 'text-amber-500' : 'text-primary'}`}>
                                            {senior.risk_score}
                                        </p>
                                    </div>
                                </div>

                                {/* Sparkline & Heatmap Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-background/40 rounded-3xl p-6 border border-card-border">
                                    {/* Adherence Sparkline */}
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-4 flex items-center gap-2">
                                            <TrendingUp className="w-3 h-3" />
                                            7D Adherence
                                        </p>
                                        <div className="h-16 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={senior.sparkline.map((val, i) => ({ val, i }))}>
                                                    <YAxis hide domain={[0, 100]} />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="val"
                                                        stroke={senior.status === 'Critical' ? '#ef4444' : '#2D60FF'}
                                                        strokeWidth={3}
                                                        dot={false}
                                                        isAnimationActive={true}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* 24HR Heatmap */}
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-4 flex items-center gap-2">
                                            <Activity className="w-3 h-3" />
                                            24H Heatmap
                                        </p>
                                        <div className="flex gap-1 h-12">
                                            {senior.heatmap.length > 0 ? (
                                                senior.heatmap.map((dose, i) => (
                                                    <div
                                                        key={i}
                                                        className={`flex-1 rounded-[6px] border transition-all hover:scale-110 hover:z-10 ${dose.status === 'taken' ? 'bg-emerald-500 border-emerald-600/20 shadow-lg shadow-emerald-500/20' :
                                                            dose.status === 'missed' ? 'bg-red-500 border-red-600/20 shadow-lg shadow-red-500/20' :
                                                                'bg-slate-200 dark:bg-slate-800 border-card-border opacity-50'
                                                            }`}
                                                        title={`${dose.time} - ${dose.med_name} (${dose.status})`}
                                                    />
                                                ))
                                            ) : (
                                                <div className="flex-1 rounded-[6px] bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center border border-dashed border-card-border">
                                                    <span className="text-[8px] font-black uppercase opacity-20">No Doses Logged</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-30">Telemetry</span>
                                            <span className="text-xs font-bold text-foreground/60 italic">Live Stream Active</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-30">Last Sync</span>
                                            <span className="text-xs font-bold text-foreground/60 whitespace-nowrap">
                                                {new Date(senior.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-primary opacity-20 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {filteredData.length === 0 && !loading && (
                <div className="text-center py-32 medical-card bg-card/60">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-6 opacity-30" />
                    <h3 className="text-2xl font-black tracking-tight text-foreground/40">No Patients Found</h3>
                    <p className="text-sm font-bold opacity-30 uppercase tracking-widest mt-2 px-12">Your search returned no matching patients</p>
                </div>
            )}
        </div>
    );
}
