"use client";

import { useDashboardData } from '@/hooks/useDashboardData';
import AdherenceChart from '@/components/AdherenceChart';
import { motion } from 'framer-motion';
import {
    LineChart,
    TrendingUp,
    Calendar,
    Activity,
    ChevronLeft,
    Download,
    Filter
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';

function AnalyticsContent() {
    const { data, loading, error } = useDashboardData();
    const router = useRouter();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/30">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-10 text-center">
                <p className="text-red-500 font-black">Error: {error}</p>
            </div>
        );
    }

    const adherenceData = data?.stats?.history || [];

    return (
        <div className="space-y-12">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:gap-3 transition-all mb-4"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Dashboard
                    </button>
                    <h1 className="text-5xl font-black text-foreground tracking-tighter">
                        Analytics <span className="text-primary italic">Report</span>
                    </h1>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => window.location.href = '/api/v1/caregiver/export/fleet/pdf'}
                        className="px-8 py-4 bg-primary text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/40 hover:scale-[1.02] transition-all flex items-center gap-2"
                    >
                        <Download className="w-5 h-5" />
                        Export Report
                    </button>
                </div>
            </header>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { label: "Avg Compliance", value: `${data?.stats?.adherence || 0}%`, icon: Activity, color: "primary" },
                    { label: "Active Tracking", value: "30 Days", icon: Calendar, color: "accent" },
                    { label: "Health Status", value: data?.stats?.adherence > 80 ? "Good" : "Needs Attention", icon: TrendingUp, color: "emerald" }
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="medical-card p-10 bg-card/40 border-l-[10px] border-l-primary/20"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <stat.icon className="w-6 h-6 text-primary/40" />
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-30">{stat.label}</span>
                        </div>
                        <p className="text-4xl font-black text-foreground tracking-tight">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Main Chart Section */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="medical-card p-12 bg-card/60 backdrop-blur-xl group relative overflow-hidden"
            >
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <LineChart className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-foreground">Historical Adherence</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Full Spectrum Telemetry</p>
                        </div>
                    </div>
                    <div className="bg-primary/5 px-6 py-2 rounded-full border border-primary/10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">30-Day Resolution</span>
                    </div>
                </div>

                <div className="h-[450px] w-full">
                    <AdherenceChart data={adherenceData} />
                </div>
            </motion.div>

            {/* Detail Section Placeholder */}
            <div className="grid lg:grid-cols-2 gap-8">
                <div className="medical-card p-10 bg-background/20 border border-card-border border-dashed flex flex-col items-center justify-center text-center">
                    <Filter className="w-12 h-12 text-primary/20 mb-6" />
                    <p className="text-sm font-bold opacity-30 uppercase tracking-widest">More Analytics Modules coming soon</p>
                    <p className="text-[10px] font-medium opacity-20 uppercase tracking-[0.2em] mt-2 italic">Neural Predictors & Interaction Maps</p>
                </div>
                <div className="medical-card p-10 bg-primary/95 text-white">
                    <h3 className="text-xl font-black mb-6 uppercase tracking-widest">AI Summary</h3>
                    <p className="text-2xl font-black italic tracking-tight leading-snug">
                        &quot;Historical performance shows a 12% improvement in dose consistency over the last fortnight. Synchronization stability is at nominal levels.&quot;
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function AnalyticsPage() {
    return (
        <div className="min-h-screen bg-background p-12 lg:p-24 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                <Suspense fallback={<div className="animate-pulse">Loading Intelligence...</div>}>
                    <AnalyticsContent />
                </Suspense>
            </div>
        </div>
    );
}
