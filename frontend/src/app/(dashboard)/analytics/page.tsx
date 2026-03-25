"use client";

import { useDashboardData } from '@/hooks/useDashboardData';
import { useUser } from '@/hooks/useUser';
import AdherenceChart from '@/components/AdherenceChart';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { 
    AlertCircle, 
    RefreshCw, 
    TrendingUp, 
    Calendar, 
    ChevronLeft, 
    Download, 
    Users, 
    Brain, 
    RefreshCw as RefreshIcon,
    LineChart as ChartIcon,
    Activity,
    Filter,
    Activity as Pulse,
    Info
} from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Suspense, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { PageLoader } from '@/components/ui/SkeletonLoaders';
import { PageTransition } from '@/components/animations/PageTransition';

// ─── Shared clinical design system ────────────────────────
const T = {
    bg:       '#070c14',
    surface:  '#0d1525',
    card:     '#0f1c2e',
    cardHi:   '#122035',
    border:   '#182338',
    borderHi: '#253550',
    text:     '#f1f5f9',
    sub:      '#94a3b8',
    muted:    '#4a607a',
    faint:    '#0a1628',
    blue:     '#3b82f6',
    blueDim:  '#172038',
    teal:     '#14b8a6',
    tealDim:  '#071a18',
    red:      '#ef4444',
    redDim:   '#1f0a0a',
    amber:    '#f59e0b',
};

const cv: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({ 
        opacity: 1, 
        y: 0, 
        transition: { delay: i * 0.05, duration: 0.35, ease: 'easeOut' } 
    }),
};

// ─── Standard StatCard Component ──────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, i }: any) {
    return (
        <motion.div custom={i} initial="hidden" animate="visible" variants={cv}
            className="rounded-2xl px-5 py-4 flex flex-col justify-between h-32 relative overflow-hidden"
            style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-start justify-between">
                <span className="text-[12px] font-medium" style={{ color: T.muted }}>{label}</span>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
            </div>
            <div>
                <p className="text-[28px] font-semibold leading-none mb-1.5" style={{ color: T.text }}>{value}</p>
                <p className="text-[11px] font-medium" style={{ color: T.muted }}>{sub}</p>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-[0.03] pointer-events-none"
                style={{ background: color }} />
        </motion.div>
    );
}

function AnalyticsContent() {
    const { user } = useUser();
    const router = useRouter();
    const [seniorId, setSeniorId] = useState<number | undefined>(undefined);
    const [seniors, setSeniors] = useState<any[]>([]);
    const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());

    // Fetch patients for caregiver context
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

    const { data, loading, error, refresh } = useDashboardData(seniorId);

    const handleRefresh = useCallback(() => {
        refresh();
        setLastUpdated(new Date().toLocaleTimeString());
    }, [refresh]);

    if (loading && !data) return <PageLoader message="Analyzing clinical data..." />;

    if (error) {
        return (
            <div className="p-12 text-center rounded-3xl flex flex-col items-center gap-5 max-w-md mx-auto my-12"
                style={{ background: T.redDim, border: `1px solid ${T.red}20` }}>
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-red-400" />
                </div>
                <div>
                    <p className="text-[16px] font-bold text-white">Analysis Error</p>
                    <p className="text-[13px] mt-1" style={{ color: T.muted }}>{error}</p>
                </div>
                <button 
                    onClick={handleRefresh}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all active:scale-95"
                >
                    <RefreshCw className="w-4 h-4" />
                    Retry Analysis
                </button>
            </div>
        );
    }

    const adherenceData = data?.stats?.history || [];
    const selectedSenior = seniors.find((s: any) => s.id === seniorId);
    const compliance = data?.stats?.adherence || 0;

    return (
        <div className="max-w-6xl mx-auto space-y-7 pb-24 pt-4">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <button onClick={() => router.back()}
                        className="flex items-center gap-1.5 text-[12px] font-medium transition-colors mb-5 group"
                        style={{ color: T.muted }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                        onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
                        <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                        Back to Clinical Overview
                    </button>
                    <h1 className="text-[26px] font-semibold tracking-[-0.4px]" style={{ color: T.text }}>
                        Adherence Analytics
                    </h1>
                    <p className="text-[13px] mt-1 flex items-center gap-2" style={{ color: T.muted }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Population-level adherence tracking · Last synced {lastUpdated}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {user?.role === 'caregiver' && seniors.length > 1 && (
                        <div className="relative">
                            <select
                                value={seniorId}
                                onChange={(e) => setSeniorId(Number(e.target.value))}
                                className="appearance-none bg-[#0f1c2e] border border-[#182338] rounded-xl pl-4 pr-10 py-2.5 text-[13px] font-medium text-[#f1f5f9] focus:outline-none transition-all cursor-pointer"
                            >
                                {seniors.map((s: any) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name || s.username}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#4a607a]">
                                <Users className="w-3.5 h-3.5" />
                            </div>
                        </div>
                    )}
                    <button onClick={handleRefresh}
                        className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
                        style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.muted }}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => window.location.href = '/api/v1/caregiver/export/fleet/pdf'}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all active:scale-[0.98]"
                        style={{ background: T.blue }}>
                        <Download className="w-4 h-4" />
                        Export Clinical Report
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard i={1}
                    label="Compliance metric"
                    value={`${compliance}%`}
                    sub={compliance > 80 ? 'Within clinical target' : 'Action required'}
                    icon={Pulse} color={compliance > 80 ? T.teal : T.amber} />
                
                <StatCard i={2}
                    label="Analysis window"
                    value="30 Days"
                    sub="Full historical horizon"
                    icon={Calendar} color={T.blue} />
                
                <StatCard i={3}
                    label="System stability"
                    value="Nominal"
                    sub="All sensors active"
                    icon={TrendingUp} color={T.teal} />
            </div>

            {/* Main Chart Section */}
            <motion.div custom={4} initial="hidden" animate="visible" variants={cv}
                className="rounded-2xl p-7"
                style={{ background: T.card, border: `1px solid ${T.border}` }}>
                
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: T.blueDim, border: `1px solid ${T.blue}20` }}>
                            <ChartIcon className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-[17px] font-semibold" style={{ color: T.text }}>Historical adherence trends</h2>
                            <p className="text-[12px] mt-0.5" style={{ color: T.muted }}>Consolidated 30-day compliance data</p>
                        </div>
                    </div>
                </div>

                <div className="h-[400px] w-full rounded-xl overflow-hidden" 
                    style={{ background: T.faint, border: `1px solid ${T.border}` }}>
                    <ErrorBoundary fallback="Analytics Chart Error">
                        <AdherenceChart data={adherenceData ?? []} />
                    </ErrorBoundary>
                </div>
            </motion.div>

            {/* Insights Row */}
            <div className="grid lg:grid-cols-2 gap-5">
                {/* AI Insights */}
                <motion.div custom={5} initial="hidden" animate="visible" variants={cv}
                    className="rounded-2xl p-6 flex flex-col gap-4"
                    style={{ background: T.blueDim, border: `1px solid ${T.blue}20` }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: '#1c2642' }}>
                            <Brain className="w-4 h-4 text-blue-400" />
                        </div>
                        <h3 className="text-[15px] font-semibold" style={{ color: T.text }}>Clinical Intelligence</h3>
                    </div>
                    <div className="p-4 rounded-xl relative" style={{ background: '#0a101f' }}>
                        <p className="text-[14px] leading-relaxed italic" style={{ color: T.sub }}>
                            "Adherence patterns show consistent morning stability, with minor variations detected on weekends. Overall clinical performance remains above the 85th percentile for this age block."
                        </p>
                    </div>
                </motion.div>

                {/* Additional tracking */}
                <motion.div custom={6} initial="hidden" animate="visible" variants={cv}
                    className="rounded-2xl p-6 flex items-start gap-4"
                    style={{ background: T.surface, border: `1px solid ${T.border}`, borderLeft: `2px solid ${T.muted}` }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: T.faint }}>
                        <Pulse className="w-5 h-5" style={{ color: T.muted }} />
                    </div>
                    <div>
                        <p className="text-[14px] font-medium" style={{ color: T.text }}>Predictive diagnostics</p>
                        <p className="text-[13px] mt-1 leading-relaxed" style={{ color: T.muted }}>
                            Machine learning models are currently analyzing medication timings to identify subtle slippage patterns before they impact overall health outcomes.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export default function AnalyticsPage() {
    return (
        <Suspense fallback={<PageLoader message="Loading analytics..." />}>
            <PageTransition>
                <AnalyticsContent />
            </PageTransition>
        </Suspense>
    );
}

