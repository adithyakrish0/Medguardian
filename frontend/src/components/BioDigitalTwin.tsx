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

export default function BioDigitalTwin() {
    const [data, setData] = useState<PKData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Bio-twin is under /analytics blueprint, not /api/v1
                const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5001';
                const response = await fetch(`${backendUrl}/analytics/api/bio-twin`, {
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
        const interval = setInterval(fetchData, 30000); // Update every 30s
        return () => clearInterval(interval);
    }, []);

    // Handle loading, no data, or missing forecast points
    if (loading || !data || !data.forecast?.points?.length) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-background/5 rounded-[32px] border border-card-border/50 animate-pulse">
                <Beaker className="w-8 h-8 text-primary/20" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/20">
                    {loading ? 'Syncing Bio-Twin...' : 'No PK data available'}
                </p>
            </div>
        );
    }

    // Map the forecast points to chart data
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
