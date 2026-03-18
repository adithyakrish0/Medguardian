"use client";

import { motion } from 'framer-motion';
import { Activity, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function AnimatedHeroCard() {
    // Data for the bezier line chart
    const data = [40, 65, 45, 80, 70, 95, 85];
    const width = 300;
    const height = 80;
    
    // Create bezier path from data points
    const points = data.map((val, i) => ({
        x: (i / (data.length - 1)) * width,
        y: height - (val / 100) * height
    }));

    const d = points.reduce((acc, point, i, a) => {
        if (i === 0) return `M ${point.x},${point.y}`;
        const prev = a[i - 1];
        const cx = (prev.x + point.x) / 2;
        return `${acc} C ${cx},${prev.y} ${cx},${point.y} ${point.x},${point.y}`;
    }, "");

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
                opacity: 1, 
                scale: 1,
                y: [0, -15, 0] 
            }}
            transition={{ 
                duration: 4, 
                ease: "easeInOut", 
                repeat: Infinity,
                scale: { duration: 1, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 1 }
            }}
            className="relative group w-full max-w-[420px]"
        >
            {/* Outer Glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
            
            <div className="relative bg-[#0d1b2e]/90 backdrop-blur-xl border border-[#00d4ff]/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,212,255,0.15)]">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                            <Activity className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-white tracking-wider uppercase">Health Intelligence</h3>
                            <p className="text-[10px] text-slate-400 font-medium">Real-time analysis active</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                        </span>
                        <span className="text-[10px] font-bold text-green-400 uppercase tracking-tighter">Live Monitoring</span>
                    </div>
                </div>

                {/* Stat Pills */}
                <div className="flex gap-2 mb-8">
                    {[
                        { label: 'Adherence', value: '96.7%', color: 'text-green-400', bg: 'bg-green-500/5', border: 'border-green-500/10' },
                        { label: 'Anomalies', value: '0', color: 'text-cyan-400', bg: 'bg-cyan-500/5', border: 'border-cyan-500/10' },
                        { label: 'Verified', value: '12/12', color: 'text-blue-400', bg: 'bg-blue-500/5', border: 'border-blue-500/10' }
                    ].map((pill) => (
                        <div 
                            key={pill.label} 
                            className={`flex flex-col gap-0.5 px-3 py-2 rounded-xl border ${pill.bg} ${pill.border} flex-1`}
                        >
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{pill.label}</span>
                            <span className={`text-sm font-bold ${pill.color}`}>{pill.value}</span>
                        </div>
                    ))}
                </div>

                {/* Chart Section */}
                <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider">7-DAY ADHERENCE TREND</span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-400">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Optimal Range</span>
                        </div>
                    </div>

                    <div className="h-24 w-full flex items-end">
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                            <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#22d3ee" />
                                    <stop offset="100%" stopColor="#3b82f6" />
                                </linearGradient>
                                <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            
                            {/* Area fill */}
                            <motion.path
                                d={`${d} L ${width},${height} L 0,${height} Z`}
                                fill="url(#fillGradient)"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1.5, delay: 0.5 }}
                            />
                            
                            {/* Line path */}
                            <motion.path
                                d={d}
                                fill="none"
                                stroke="url(#chartGradient)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                            />
                            
                            {/* Data points */}
                            {points.map((p, i) => (
                                <motion.circle
                                    key={i}
                                    cx={p.x}
                                    cy={p.y}
                                    r="4"
                                    fill="#0d1b2e"
                                    stroke={i === points.length - 1 ? "#22d3ee" : "#3b82f6"}
                                    strokeWidth="2"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 1 + i * 0.1, duration: 0.3 }}
                                />
                            ))}
                        </svg>
                    </div>

                    <div className="flex justify-between mt-3">
                        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                            <span key={day} className="text-[9px] font-bold text-slate-600 tracking-tighter">{day}</span>
                        ))}
                    </div>
                </div>

                {/* Bottom Badge */}
                <div className="mt-8 pt-5 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Secured by MedGuardian AI</span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                </div>
            </div>
        </motion.div>
    );
}
