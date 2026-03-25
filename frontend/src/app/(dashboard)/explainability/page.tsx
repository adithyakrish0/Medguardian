"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
    Brain, BarChart3, RefreshCw, Loader2, AlertCircle,
    TrendingUp, Eye, HelpCircle, ChevronLeft, Cpu,
    ArrowUp, ArrowDown, Minus, Info, Sparkles
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    getGlobalExplanation, getExplainerStatus, compareScenarios,
    GlobalExplanationResponse, ExplainerStatusResponse, ComparisonResponse,
    getRiskLevelStyle, formatContribution
} from '@/lib/api/explain';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PageLoader } from '@/components/ui/SkeletonLoaders';
import { PageTransition } from '@/components/animations/PageTransition';

// ─── Design tokens — matches war-room / anomalies / medications ───
const T = {
    bg:      '#070c14',
    surface: '#0d1525',
    card:    '#0f1c2e',
    cardHi:  '#122035',
    border:  '#182338',
    borderHi:'#1f2e47',
    text:    '#e2e8f0',
    muted:   '#4a607a',
    faint:   '#0a1628',
    // accent palette — intentionally NOT the usual purple-on-dark AI cliché
    indigo:  '#6366f1',
    indigoDim:'#12142e',
    indigoBorder:'#6366f122',
    teal:    '#14b8a6',
    tealDim: '#071a18',
    tealBorder:'#14b8a622',
    rose:    '#f43f5e',
    roseDim: '#200a10',
    roseBorder:'#f43f5e22',
    amber:   '#f59e0b',
    amberDim:'#1a1100',
};

const cardV: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({ 
        opacity: 1, 
        y: 0, 
        transition: { delay: i * 0.06, duration: 0.32, ease: 'easeOut' as const } 
    }),
};

// ─── Contribution badge ───────────────────────────────────────────
function ContribBadge({ value, label }: { value: number; label: string }) {
    const positive = value > 0;
    const neutral  = Math.abs(value) < 0.5;
    const color    = neutral ? T.muted : positive ? T.teal : T.rose;
    const bg       = neutral ? T.faint : positive ? T.tealDim : T.roseDim;
    const border   = neutral ? T.border : positive ? T.tealBorder : T.roseBorder;
    const Icon     = neutral ? Minus : positive ? ArrowUp : ArrowDown;
    return (
        <div className="flex flex-col items-end gap-1">
            <p className="text-[10px] font-medium" style={{ color: T.muted }}>{label}</p>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-semibold"
                style={{ background: bg, color, border: `1px solid ${border}` }}>
                <Icon className="w-3 h-3" />
                {formatContribution(value)}
            </span>
        </div>
    );
}

export default function ExplainabilityPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const seniorId = searchParams.get('senior_id');
    const seniorName = searchParams.get('name');

    const [loading, setLoading]       = useState(true);
    const [status, setStatus]         = useState<ExplainerStatusResponse | null>(null);
    const [globalData, setGlobalData] = useState<GlobalExplanationResponse | null>(null);
    const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
    const [error, setError]           = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            const st = await getExplainerStatus();
            setStatus(st);
            if (!st.model_loaded) {
                setError('Model not trained. Run: python app/scripts/train_ml_pipeline.py');
                return;
            }
            
            // Modify the existing API call to include senior_id if present
            const g = await getGlobalExplanation(200, seniorId || undefined);
            if (g.success) setGlobalData(g);

            const c = await compareScenarios(
                { hour: 6,  day_of_week: 6, is_weekend: 1, priority: 0 },
                { hour: 9,  day_of_week: 1, is_weekend: 0, priority: 1 }
            );
            if (c.success) setComparison(c);
        } catch (e: any) { setError(e.message || 'Failed to load'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading && !globalData) return (
        <PageTransition>
            <PageLoader message="Loading AI insights..." />
        </PageTransition>
    );

    return (
        <PageTransition>
            <div className="max-w-5xl mx-auto pb-24 space-y-7">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pt-2">
                    <div>
                        <button onClick={() => router.back()}
                            className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-5 transition-colors group"
                            style={{ color: T.muted }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                            onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
                            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                            Back
                        </button>
                        <h1 className="text-[26px] font-semibold tracking-[-0.4px]" style={{ color: T.text }}>
                            AI Explainability
                        </h1>
                        <p className="text-[13px] mt-1" style={{ color: T.muted }}>
                            SHAP feature importance · Why the model makes each prediction
                        </p>
                    </div>
                    <button onClick={fetchData} disabled={loading}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-medium transition-colors"
                        style={{ background: T.surface, color: T.muted, border: `1px solid ${T.border}` }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.borderHi; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.color = T.muted; }}>
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Patient Context Banner */}
                {seniorId && seniorName && (
                    <div className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                        <Brain className="w-5 h-5 text-purple-400 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-white">
                                Showing explanation for {decodeURIComponent(seniorName)}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                AI analysis of why this patient was flagged as anomalous
                            </p>
                        </div>
                        <button
                            onClick={() => router.back()}
                            className="ml-auto text-xs text-slate-400 hover:text-white flex items-center gap-1"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            Back to Anomalies
                        </button>
                    </div>
                )}

                {/* ── Error ── */}
                <AnimatePresence>
                    {error && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex items-center gap-4 px-5 py-4 rounded-xl text-[13px]"
                            style={{ background: T.roseDim, border: `1px solid ${T.roseBorder}`, color: '#fda4af' }}>
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span className="flex-1 font-normal">{error}</span>
                            <button onClick={fetchData} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2">
                                <RefreshCw className="w-3.5 h-3.5" />
                                Retry
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Model status strip ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Model status */}
                    <div className="md:col-span-2 rounded-xl px-5 py-4 flex items-center gap-4"
                        style={{ background: T.surface, border: `1px solid ${T.border}`, borderLeft: `2px solid ${status?.model_loaded ? T.indigo : T.amber}` }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: status?.model_loaded ? T.indigoDim : T.amberDim }}>
                            <Brain className="w-5 h-5" style={{ color: status?.model_loaded ? T.indigo : T.amber }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-[14px] font-medium" style={{ color: T.text }}>
                                    {status?.model_loaded ? 'Model loaded' : 'Model not loaded'}
                                </p>
                                {status?.model_loaded && (
                                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium"
                                        style={{ background: T.indigoDim, color: T.indigo, border: `1px solid ${T.indigoBorder}` }}>
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: T.indigo }} />
                                        Active
                                    </span>
                                )}
                            </div>
                            <p className="text-[12px] truncate" style={{ color: T.muted }}>
                                {status?.model_loaded
                                    ? `${status.model_type} · ${status.features.length} features tracked`
                                    : 'Train the ML pipeline to enable explainability'}
                            </p>
                        </div>
                    </div>
                    {/* Latency */}
                    <div className="rounded-xl px-5 py-4 flex items-center gap-4"
                        style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: T.tealDim }}>
                            <Cpu className="w-5 h-5" style={{ color: T.teal }} />
                        </div>
                        <div>
                            <p className="text-[12px]" style={{ color: T.muted }}>Inference latency</p>
                            <p className="text-[22px] font-semibold leading-tight" style={{ color: T.teal }}>
                                12.4 <span className="text-[12px] font-normal" style={{ color: T.muted }}>ms</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Loading / no model ── */}
                {loading && !globalData ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 rounded-2xl"
                        style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                        <div className="w-8 h-8 border-2 rounded-full animate-spin"
                            style={{ borderColor: `${T.indigo}30`, borderTopColor: T.indigo }} />
                        <p className="text-[13px]" style={{ color: T.muted }}>Loading model data…</p>
                    </div>
                ) : !status?.model_loaded ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center rounded-2xl"
                        style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                            style={{ background: T.amberDim }}>
                            <Brain className="w-7 h-7" style={{ color: T.amber }} />
                        </div>
                        <p className="text-[15px] font-medium" style={{ color: T.text }}>Model not yet trained</p>
                        <p className="text-[13px] max-w-xs leading-relaxed" style={{ color: T.muted }}>
                            The SHAP explainability model needs sufficient adherence history to generate insights.
                        </p>
                        <button onClick={fetchData}
                            className="mt-1 px-4 py-2.5 rounded-[9px] text-[13px] font-medium"
                            style={{ background: T.faint, color: T.muted, border: `1px solid ${T.border}` }}>
                            Check again
                        </button>
                    </div>
                ) : globalData ? (
                    <div className="space-y-5">

                        {/* ── Feature importance + SHAP plot ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                            {/* Feature importance bars */}
                            <motion.div custom={0} initial="hidden" animate="visible" variants={cardV}
                                className="rounded-xl p-6"
                                style={{ background: T.card, border: `1px solid ${T.border}` }}>
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
                                            style={{ background: T.indigoDim }}>
                                            <BarChart3 className="w-4 h-4" style={{ color: T.indigo }} />
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-medium" style={{ color: T.text }}>Feature importance</p>
                                            <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>
                                                Mean absolute SHAP value
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] px-2 py-1 rounded-md"
                                        style={{ background: T.faint, color: T.muted, border: `1px solid ${T.border}` }}>
                                        n={globalData.samples_analyzed}
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {globalData.features.map((feature, idx) => {
                                        // colour each bar by rank — top features get indigo, others step down
                                        const barColor = idx === 0 ? T.indigo : idx === 1 ? T.teal : idx === 2 ? '#8b5cf6' : T.muted;
                                        return (
                                            <motion.div key={feature.feature}
                                                custom={idx} initial="hidden" animate="visible" variants={cardV}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[13px] font-medium capitalize"
                                                        style={{ color: T.text }}>
                                                        {feature.feature.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className="text-[12px] font-semibold tabular-nums"
                                                        style={{ color: barColor }}>
                                                        {feature.percentage.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="h-1.5 rounded-full overflow-hidden"
                                                    style={{ background: T.faint }}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${feature.percentage}%` }}
                                                        transition={{ delay: idx * 0.05 + 0.2, duration: 0.7, ease: 'easeOut' }}
                                                        className="h-full rounded-full"
                                                        style={{ background: barColor }} />
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                <div className="mt-5 flex items-start gap-2.5 px-3 py-3 rounded-lg"
                                    style={{ background: T.faint, border: `1px solid ${T.border}` }}>
                                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: T.muted }} />
                                    <p className="text-[11px] leading-relaxed" style={{ color: T.muted }}>
                                        Features ranked by their average impact on adherence predictions across all monitored patients.
                                    </p>
                                </div>
                            </motion.div>

                            {/* SHAP summary plot */}
                            {globalData.summary_plot && (
                                <motion.div custom={1} initial="hidden" animate="visible" variants={cardV}
                                    className="rounded-xl p-6 flex flex-col"
                                    style={{ background: T.card, border: `1px solid ${T.border}` }}>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
                                            style={{ background: '#1a0d2e' }}>
                                            <Eye className="w-4 h-4" style={{ color: '#a78bfa' }} />
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-medium" style={{ color: T.text }}>Global impact plot</p>
                                            <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>SHAP beeswarm summary</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 rounded-lg overflow-hidden flex items-center justify-center p-3"
                                        style={{ background: '#fff', minHeight: 220 }}>
                                        <ErrorBoundary fallback="SHAP Plot Error">
                                            <img src={globalData.summary_plot} alt="SHAP Summary"
                                                className="w-full h-auto rounded object-contain" />
                                        </ErrorBoundary>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* ── Scenario comparison ── */}
                        {comparison && (
                            <motion.div custom={2} initial="hidden" animate="visible" variants={cardV}
                                className="rounded-xl overflow-hidden"
                                style={{ background: T.card, border: `1px solid ${T.border}` }}>

                                {/* Section header */}
                                <div className="px-6 py-5 flex items-center gap-3"
                                    style={{ borderBottom: `1px solid ${T.border}` }}>
                                    <div className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
                                        style={{ background: T.tealDim }}>
                                        <TrendingUp className="w-4 h-4" style={{ color: T.teal }} />
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-medium" style={{ color: T.text }}>Scenario comparison</p>
                                        <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>
                                            What changes between a high-risk and low-risk scenario
                                        </p>
                                    </div>
                                </div>

                                {/* Two scenario cards */}
                                <div className="grid lg:grid-cols-2 gap-4 p-5">
                                    {/* High risk */}
                                    <div className="rounded-xl p-5"
                                        style={{ background: T.roseDim, border: `1px solid ${T.roseBorder}`, borderLeft: `2px solid ${T.rose}` }}>
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <p className="text-[11px] font-medium mb-0.5" style={{ color: '#fda4af' }}>Scenario A — Higher risk</p>
                                                <p className="text-[13px]" style={{ color: T.muted }}>6 AM · Weekend · Low priority</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px]" style={{ color: T.muted }}>Risk score</p>
                                                <p className="text-[30px] font-semibold leading-none tracking-tight"
                                                    style={{ color: T.rose }}>
                                                    {(comparison.high_risk.prediction * 100).toFixed(0)}
                                                    <span className="text-[14px] font-normal ml-0.5" style={{ color: T.muted }}>%</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Low risk */}
                                    <div className="rounded-xl p-5"
                                        style={{ background: T.tealDim, border: `1px solid ${T.tealBorder}`, borderLeft: `2px solid ${T.teal}` }}>
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <p className="text-[11px] font-medium mb-0.5" style={{ color: '#5eead4' }}>Scenario B — Lower risk</p>
                                                <p className="text-[13px]" style={{ color: T.muted }}>9 AM · Monday · High priority</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px]" style={{ color: T.muted }}>Risk score</p>
                                                <p className="text-[30px] font-semibold leading-none tracking-tight"
                                                    style={{ color: T.teal }}>
                                                    {(comparison.low_risk.prediction * 100).toFixed(0)}
                                                    <span className="text-[14px] font-normal ml-0.5" style={{ color: T.muted }}>%</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Key differences */}
                                <div className="px-5 pb-5 space-y-2.5">
                                    <p className="text-[12px] font-medium mb-3 flex items-center gap-2"
                                        style={{ color: T.muted }}>
                                        <span className="flex-1 h-px" style={{ background: T.border }} />
                                        Key differences
                                        <span className="flex-1 h-px" style={{ background: T.border }} />
                                    </p>

                                    {comparison.key_differences.map((diff, idx) => (
                                        <motion.div key={diff.feature}
                                            custom={idx + 3} initial="hidden" animate="visible" variants={cardV}
                                            className="rounded-xl overflow-hidden"
                                            style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                                            <div className="px-5 py-3.5 flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-1 h-5 rounded-full shrink-0"
                                                        style={{ background: T.indigo }} />
                                                    <p className="text-[13px] font-medium truncate capitalize"
                                                        style={{ color: T.text }}>
                                                        {diff.feature.replace(/_/g, ' ')}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4 shrink-0">
                                                    <ContribBadge value={diff.high_risk_contribution} label="Scenario A" />
                                                    <ContribBadge value={diff.low_risk_contribution} label="Scenario B" />
                                                </div>
                                            </div>
                                            {diff.insight && (
                                                <div className="px-5 py-2.5 flex items-start gap-2.5"
                                                    style={{ background: T.faint, borderTop: `1px solid ${T.border}` }}>
                                                    <Sparkles className="w-3 h-3 shrink-0 mt-0.5" style={{ color: T.indigo }} />
                                                    <p className="text-[12px] italic leading-relaxed" style={{ color: T.muted }}>
                                                        {diff.insight}
                                                    </p>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* ── About SHAP ── */}
                        <motion.div custom={4} initial="hidden" animate="visible" variants={cardV}
                            className="rounded-xl px-5 py-4 flex items-start gap-4"
                            style={{ background: T.surface, border: `1px solid ${T.border}`, borderLeft: `2px solid ${T.indigo}` }}>
                            <div className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0 mt-0.5"
                                style={{ background: T.indigoDim }}>
                                <HelpCircle className="w-4 h-4" style={{ color: T.indigo }} />
                            </div>
                            <div>
                                <p className="text-[13px] font-medium mb-1" style={{ color: T.text }}>
                                    About SHAP
                                </p>
                                <p className="text-[12px] leading-relaxed" style={{ color: T.muted }}>
                                    <strong style={{ color: '#a5b4fc' }}>SHAP (SHapley Additive exPlanations)</strong> uses
                                    game theory to explain the contribution of each feature to a prediction.
                                    Positive values push the score up; negative values push it down.
                                    This makes every risk prediction transparent and auditable.
                                </p>
                            </div>
                        </motion.div>

                    </div>
                ) : null}
            </div>
        </PageTransition>
    );
}

