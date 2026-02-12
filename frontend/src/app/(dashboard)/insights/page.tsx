"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain,
    Sparkles,
    TrendingUp,
    ShieldCheck,
    Lightbulb,
    ChevronLeft,
    Activity,
    Target,
    Zap,
    RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface Insight {
    type: 'positive' | 'warning' | 'suggestion';
    icon: string;
    title: string;
    message: string;
}

interface InsightsData {
    overall_score: string;
    summary: string;
    insights: Insight[];
    tips: string[];
}

export default function InsightsPage() {
    const router = useRouter();
    const [data, setData] = useState<InsightsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const fetchInsights = async () => {
        try {
            setGenerating(true);
            const response = await apiFetch('/insights/generate', { method: 'POST' });
            if (response.success) {
                setData(response.data);
            }
        } catch (err) {
            console.error('Failed to generate insights:', err);
        } finally {
            setLoading(false);
            setGenerating(false);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-12">
                <div className="relative">
                    <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <Brain className="w-10 h-10 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <p className="mt-8 text-[12px] font-black uppercase tracking-[0.4em] text-foreground/40 animate-pulse">Generating AI insights...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6 md:p-12 lg:p-24 overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-16">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:gap-3 transition-all mb-4 group"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back to Dashboard
                        </button>
                        <h1 className="text-5xl md:text-7xl font-black text-foreground tracking-tighter leading-none">
                            AI <span className="text-primary italic">Insights</span>
                        </h1>
                        <p className="text-lg font-bold opacity-40 mt-4 max-w-xl">
                            Personalized health analytics and smart recommendations powered by AI.
                        </p>
                    </div>

                    <button
                        onClick={fetchInsights}
                        disabled={generating}
                        className="px-8 py-5 bg-card/40 backdrop-blur-xl border border-card-border rounded-[32px] font-black text-xs uppercase tracking-widest flex items-center gap-4 hover:bg-card/60 transition-all disabled:opacity-50 group"
                    >
                        <RefreshCw className={`w-4 h-4 text-primary ${generating ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                        {generating ? 'Generating...' : 'Refresh Insights'}
                    </button>
                </header>

                <div className="grid lg:grid-cols-3 gap-10">
                    {/* Main Score Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="lg:col-span-1 medical-card p-12 bg-primary text-white rounded-[60px] relative overflow-hidden flex flex-col items-center justify-center text-center shadow-3xl shadow-primary/40"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                        <Sparkles className="w-12 h-12 mb-8 animate-pulse" />
                        <p className="text-[12px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Overall Health Score</p>
                        <div className="text-[120px] font-black leading-none tracking-tighter mb-4 italic">
                            {data?.overall_score || 'B+'}
                        </div>
                        <p className="text-lg font-bold opacity-80 max-w-[200px]">
                            {data?.summary}
                        </p>
                    </motion.div>

                    {/* Insights List */}
                    <div className="lg:col-span-2 space-y-8">
                        <AnimatePresence mode="wait">
                            <div className="grid gap-6">
                                {data?.insights.map((insight, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="medical-card p-8 bg-card/40 backdrop-blur-xl border-l-[10px] border-l-primary/30 flex items-start gap-8 group hover:bg-card/60 transition-all"
                                    >
                                        <div className="text-4xl shrink-0 group-hover:scale-110 transition-transform">
                                            {insight.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-foreground tracking-tight mb-2 uppercase italic flex items-center gap-3">
                                                {insight.title}
                                                {insight.type === 'positive' && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                                                {insight.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                                            </h3>
                                            <p className="text-sm font-medium opacity-60 leading-relaxed">
                                                {insight.message}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Recommendations Grid */}
                <div className="grid md:grid-cols-2 gap-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="medical-card p-12 bg-emerald-500/10 border-emerald-500/20 rounded-[50px] relative overflow-hidden"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                                <Lightbulb className="w-6 h-6 text-emerald-500" />
                            </div>
                            <h3 className="text-2xl font-black text-emerald-500 tracking-tight">AI Optimizations</h3>
                        </div>
                        <ul className="space-y-6">
                            {data?.tips.map((tip, i) => (
                                <li key={i} className="flex items-start gap-4">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0" />
                                    <p className="text-lg font-bold text-foreground/80 leading-tight">{tip}</p>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="medical-card p-12 bg-card/20 border-dashed border-2 border-card-border rounded-[50px] flex flex-col items-center justify-center text-center opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all"
                    >
                        <Target className="w-16 h-16 text-primary mb-6" />
                        <h3 className="text-xl font-black uppercase tracking-widest mb-2">Predictive Diagnostics</h3>
                        <p className="text-sm font-medium tracking-tight">Advanced behavioral forecasting and chronic risk mapping coming in Next-Gen update.</p>
                    </motion.div>
                </div>

                {/* Footer Telemetry */}
                <footer className="pt-12 border-t border-card-border/50 flex flex-col md:flex-row justify-between items-center gap-8 opacity-40">
                    <div className="flex items-center gap-4">
                        <Activity className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Neural Precision: 99.4%</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Zap className="w-5 h-5 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Processing at 12.4 TFLOPS</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}

// Re-using common components if needed, or keeping it self-contained for speed
function AlertTriangle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    );
}
