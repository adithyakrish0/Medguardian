"use client";

import React, { useEffect, useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    ReferenceArea
} from 'recharts';
import { apiFetch } from '@/lib/api';
import { Activity, Beaker, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface PKPoint {
    time: string;
    concentration: number;
    is_future: boolean;
}

interface PKData {
    current_status: {
        current_cp: number;
        plasma_concentration: number;
        status: string;
        last_dose: string;
    };
    forecast: {
        points: PKPoint[];
        windows: {
            min: number;
            max: number;
            toxic: number;
        };
    };
}

export default function BioDigitalTwin({ seniorMode = false }: { seniorMode?: boolean }) {
    const [data, setData] = useState<PKData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
                const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, '');

                const response = await fetch(`${baseUrl}/analytics/api/bio-twin`, {
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                setData(data);
            } catch (err) {
                console.error('Failed to fetch PK data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !data || !data.forecast?.points?.length) {
        return (
            <div className={`w-full h-full flex flex-col items-center justify-center gap-4 bg-background/5 rounded-[32px] border border-card-border/50 animate-pulse ${seniorMode ? 'min-h-[200px]' : ''}`}>
                <Activity className="w-8 h-8 text-primary/20" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/20">
                    {loading ? 'Initializing AI Safeguards...' : 'No Health Data Sync'}
                </p>
            </div>
        );
    }

    if (seniorMode) {
        const isOptimal = data.current_status?.status === 'Therapeutic';

        return (
            <div className="flex flex-col items-center text-center py-6 space-y-8">
                <div className="relative">
                    {/* Glowing AI Health Ring */}
                    <div className={`w-48 h-48 rounded-full border-8 flex items-center justify-center transition-all duration-1000 ${isOptimal
                            ? 'border-teal-500 shadow-[0_0_40px_rgba(20,184,166,0.3)]'
                            : 'border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.3)]'
                        }`}>
                        <div className="text-center">
                            <span className={`block text-5xl font-black tracking-tighter ${isOptimal ? 'text-teal-400' : 'text-amber-400'}`}>
                                {isOptimal ? '98%' : '85%'}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Protection</span>
                        </div>
                    </div>
                    {/* Orbital Decoration */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border border-dashed border-white/10 rounded-full"
                    />
                </div>

                <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tight text-white">
                        AI Status: <span className={isOptimal ? 'text-teal-400' : 'text-amber-400'}>
                            {isOptimal ? 'Protection Optimal' : 'Active Monitoring'}
                        </span>
                    </h3>
                    <p className="text-lg font-medium text-slate-400">
                        The MedGuardian AI is currently securing your health protocols.
                    </p>
                </div>
            </div>
        );
    }

    const chartData = data.forecast.points.map((point) => ({
        time: point.time,
        concentration: point.concentration
    }));

    const statusColor = {
        'Therapeutic': 'text-emerald-400',
        'Sub-therapeutic': 'text-amber-400',
        'High': 'text-orange-400',
        'Toxicity Risk': 'text-red-400'
    }[data.current_status?.status] || 'text-primary';

    return (
        <div className="flex flex-col h-full gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black tracking-tight text-foreground">Bio-Digital <span className="text-primary italic">Twin</span></h3>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-30">PK Modeling & Simulation</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-xl font-black tracking-tighter ${statusColor}`}>
                        {data.current_status.status}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Current State</p>
                </div>
            </div>

            <div className="flex-1 min-h-[180px] w-full relative">
                <ResponsiveContainer width="100%" height="100%" minHeight={180}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorCp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2D60FF" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#2D60FF" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                        <XAxis
                            dataKey="time"
                            hide
                        />
                        <YAxis
                            hide
                            domain={[0, 25]}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-slate-900/95 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">T + {payload[0].payload.time}h</p>
                                            <p className="text-sm font-black text-primary">
                                                {payload[0].value?.toFixed(2)} mg/L
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />

                        {/* Therapeutic Window Overlay */}
                        <ReferenceArea y1={5} y2={15} fill="#10b981" fillOpacity={0.05} />
                        <ReferenceArea y1={15} y2={25} fill="#ef4444" fillOpacity={0.05} />

                        <Area
                            type="monotone"
                            dataKey="concentration"
                            stroke="#2D60FF"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorCp)"
                            isAnimationActive={true}
                        />
                    </AreaChart>
                </ResponsiveContainer>

                {/* Labels for graph zones */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 pointer-events-none">
                    <span className="text-[8px] font-black uppercase tracking-widest text-red-500/40">Toxicity</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500/40">Therapeutic</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/20 p-4 rounded-3xl border border-card-border/50">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-30 mb-1">Plasma Cp</p>
                    <p className="text-xl font-black text-foreground">{data.current_status.current_cp} <span className="text-[10px] opacity-40">mg/L</span></p>
                </div>
                <div className="bg-background/20 p-4 rounded-3xl border border-card-border/50">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-30 mb-1">Metabolic Rate</p>
                    <p className="text-xl font-black text-foreground">0.15 <span className="text-[10px] opacity-40">ke</span></p>
                </div>
            </div>
        </div>
    );
}
