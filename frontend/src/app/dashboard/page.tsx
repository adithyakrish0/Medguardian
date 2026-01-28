"use client";

import { useDashboardData } from '@/hooks/useDashboardData';
import { motion } from 'framer-motion';
import {
    Activity,
    Clock,
    CheckCircle2,
    AlertCircle,
    Zap,
    TrendingUp,
    Calendar,
    ChevronRight,
    Play
} from 'lucide-react';

export default function DashboardPage() {
    const { data, loading, error } = useDashboardData();

    if (loading) {
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

    const stats = [
        {
            label: "Adherence Precision",
            value: `${data?.stats.adherence}%`,
            trend: "Optimal Range",
            icon: Activity,
            color: "text-accent",
            bg: "bg-accent/10"
        },
        {
            label: "Sequential Dose",
            value: data?.schedule.upcoming[0]?.time || "Verified",
            trend: data?.schedule.upcoming[0]?.name || "Cycles Clear",
            icon: Clock,
            color: "text-primary",
            bg: "bg-primary/10"
        },
        {
            label: "Total Protocols",
            value: data?.stats.total.toString(),
            trend: `${data?.schedule.taken.length} Logs Finalized`,
            icon: Zap,
            color: "text-secondary",
            bg: "bg-secondary/10"
        },
    ];

    return (
        <div className="space-y-10">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, index) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={stat.label}
                        className="medical-card p-8 group relative overflow-hidden"
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
                    className="medical-card p-10 bg-card/40 backdrop-blur-md"
                >
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-6 h-6 text-primary" />
                            <h3 className="text-2xl font-black text-foreground tracking-tight">Active Schedule</h3>
                        </div>
                        <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-100 transition-opacity bg-primary/10 px-4 py-2 rounded-full">
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
                                    <p className="text-xs font-bold text-accent uppercase tracking-widest">Verified at {med.taken_at}</p>
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
                                    <p className="text-xs font-bold opacity-40 uppercase tracking-widest">Expected window: {med.time}</p>
                                </div>
                                <button className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 transition-all group-hover:rotate-90">
                                    <Play className="w-5 h-5 fill-current" />
                                </button>
                            </div>
                        ))}

                        {data?.stats.total === 0 && (
                            <div className="py-20 text-center opacity-30">
                                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                                <p className="text-lg font-black tracking-tight">No Protocols Active</p>
                                <p className="text-xs font-bold uppercase tracking-widest mt-2">Check back during next cycle</p>
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
                        <p className="text-3xl font-black leading-tight tracking-tight">
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
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
