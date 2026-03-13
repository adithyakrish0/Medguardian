"use client";

/**
 * Model Explainability Dashboard
 * 
 * SHAP-based global feature importance and scenario comparison.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Brain, BarChart3, RefreshCw, Loader2, AlertCircle,
    TrendingUp, Eye, Zap, HelpCircle, ChevronLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    getGlobalExplanation,
    getExplainerStatus,
    compareScenarios,
    GlobalExplanationResponse,
    ExplainerStatusResponse,
    ComparisonResponse,
    getRiskLevelStyle,
    formatContribution
} from '@/lib/api/explain';

import { SkeletonDashboard } from '@/components/ui/SkeletonLoaders';
import { PageTransition } from '@/components/animations/PageTransition';

export default function ExplainabilityPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<ExplainerStatusResponse | null>(null);
    const [globalData, setGlobalData] = useState<GlobalExplanationResponse | null>(null);
    const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const statusResult = await getExplainerStatus();
            setStatus(statusResult);

            if (!statusResult.model_loaded) {
                setError('Adherence model not trained. Run: python app/scripts/train_ml_pipeline.py');
                return;
            }

            const globalResult = await getGlobalExplanation(200);
            if (globalResult.success) {
                setGlobalData(globalResult);
            }

            const comparisonResult = await compareScenarios(
                { hour: 6, day_of_week: 6, is_weekend: 1, priority: 0 },
                { hour: 9, day_of_week: 1, is_weekend: 0, priority: 1 }
            );
            if (comparisonResult.success) {
                setComparison(comparisonResult);
            }

        } catch (err: any) {
            setError(err.message || 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading && !globalData) {
        return (
            <PageTransition>
                <div className="min-h-screen bg-gray-900 p-6 space-y-8 pt-16 lg:pt-4">
                    <header className="space-y-4">
                        <div className="h-4 bg-white dark:bg-gray-800/5 rounded-full w-24 animate-pulse" />
                        <div className="h-10 bg-white dark:bg-gray-800/10 rounded-full w-64 animate-pulse" />
                    </header>
                    <SkeletonDashboard />
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="max-w-6xl mx-auto space-y-8 pb-20 pt-16 lg:pt-0">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
                    <div className="relative">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-blue-400 transition-all mb-4 group uppercase tracking-[0.2em]"
                        >
                            <ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                            RETURN_TO_COMMAND_CENTER
                        </button>
                        <div className="absolute -left-4 bottom-0 w-1 h-12 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                            NEURAL_EXPLAINER_ENGINE <span className="text-purple-400 not-italic">v4.2</span>
                        </h1>
                        <p className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">
                            CORE_ANALYSIS: <span className="text-teal-400 font-black">ACTIVE_INFERENCE</span>
                        </p>
                    </div>

                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-3 px-6 py-3.5 bg-white/5 border border-white/10 hover:bg-white hover:text-slate-950 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 group"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                        RESYNC_NEURAL_WEIGHTS
                    </button>
                </div>

                {/* Status Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-6 backdrop-blur-md relative overflow-hidden group shadow-xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent pointer-events-none" />
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border backdrop-blur-md shadow-inner transition-all ${status?.model_loaded ? 'bg-purple-500/10 border-purple-500/30' : 'bg-amber-500/10 border-amber-500/30'
                            }`}>
                            <Brain className={`w-7 h-7 ${status?.model_loaded ? 'text-purple-400' : 'text-amber-400'}`} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">INFERENCE_SYNC_STATUS</p>
                            <h3 className="text-white font-black text-lg uppercase tracking-tight">
                                {status?.model_loaded ? 'CORE_SYNCHRONIZED' : 'WEIGHT_MISMATCH_DETECTED'}
                            </h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1.5 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                                {status?.model_loaded
                                    ? `${status.model_type} • ${status.features.length}_FEATURE_MATRIX_STABLE`
                                    : 'AWAITING_MODEL_INITIALIZATION'}
                            </p>
                        </div>
                    </div>

                    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-xl flex flex-col justify-center">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">LATENCY_VAL</p>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-black italic text-teal-400 leading-none">12.4</span>
                            <span className="text-[10px] font-black text-slate-600 mb-1">ms/INF</span>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center gap-4 backdrop-blur-md animate-pulse">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em] mb-0.5">PROTOCOL_ERROR</p>
                            <p className="text-red-200 text-xs font-bold tracking-tight">{error}</p>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md shadow-2xl">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                            <Brain className="w-8 h-8 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.4em] mt-8 animate-pulse">DECONSTRUCTING_NEURAL_PATHS...</p>
                    </div>
                ) : status?.model_loaded === false ? (
                    <div className="text-center py-24 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md shadow-2xl relative overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px]" />
                        <div className="relative z-10">
                            <Brain className="mx-auto h-20 w-20 text-slate-700 mb-8" />
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">NEURAL_STUB_INACTIVE</h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-4 max-w-md mx-auto leading-relaxed">
                                The SHAP explainability model requires sufficient adherence history to establish weights.
                                Log more telemetry and resync later.
                            </p>
                            <button
                                onClick={fetchData}
                                className="mt-10 px-8 py-3 bg-white/5 border border-white/10 hover:bg-white hover:text-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                            >
                                FORCE_RESCAN
                            </button>
                        </div>
                    </div>
                ) : globalData ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Feature Importance */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4">
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">N={globalData.samples_analyzed}</span>
                            </div>
                            <div className="flex items-center gap-4 mb-10">
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                    <BarChart3 className="w-5 h-5 text-blue-400" />
                                </div>
                                <h2 className="text-lg font-black text-white uppercase tracking-tighter italic">SHAP_VALUE_DISTRIBUTION</h2>
                            </div>

                            <div className="space-y-6">
                                {globalData.features.map((feature, index) => (
                                    <motion.div
                                        key={feature.feature}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{feature.feature}</span>
                                            <span className="text-[10px] font-black text-blue-400 italic">{(feature.percentage).toFixed(1)}%_VAR</span>
                                        </div>
                                        <div className="h-2.5 bg-black/40 rounded-full border border-white/5 p-0.5 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${feature.percentage}%` }}
                                                transition={{ delay: index * 0.05 + 0.2, duration: 0.8, ease: "easeOut" }}
                                                className="h-full bg-gradient-to-r from-blue-600 to-teal-400 rounded-full relative"
                                            >
                                                <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="mt-10 p-5 bg-black/40 border border-white/10 rounded-2xl">
                                <div className="flex items-start gap-4">
                                    <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                                        Analysis prioritized by mean absolute SHAP value impact across active patient nodes.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Summary Plot */}
                        {globalData.summary_plot && (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-xl relative overflow-hidden flex flex-col">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                        <Eye className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <h2 className="text-lg font-black text-white uppercase tracking-tighter italic">NEURAL_DECODER_VISUAL</h2>
                                </div>
                                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 flex-1 flex items-center justify-center group overflow-hidden relative shadow-inner">
                                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] bg-[size:10px_10px]" />
                                    <img
                                        src={globalData.summary_plot}
                                        alt="SHAP Summary"
                                        className="w-full h-auto rounded-lg group-hover:scale-105 transition-transform duration-700 relative z-10 mix-blend-screen"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Comparison */}
                        {comparison && (
                            <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-10 backdrop-blur-md shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

                                <div className="flex items-center gap-4 mb-12">
                                    <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl">
                                        <TrendingUp className="w-5 h-5 text-teal-400" />
                                    </div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">RISK_VECTOR_COMPARISON_MATRIX</h2>
                                </div>

                                <div className="grid lg:grid-cols-2 gap-6 mb-12">
                                    <div className="p-8 rounded-2xl border border-red-500/20 bg-red-500/5 backdrop-blur-sm group relative overflow-hidden shadow-lg">
                                        <div className="absolute top-0 right-0 p-4">
                                            <span className="text-[8px] font-black text-red-900 group-hover:text-red-500 transition-colors uppercase tracking-widest">VECTOR_ALPHA</span>
                                        </div>
                                        <div className="flex items-center justify-between mb-6">
                                            <span className="text-red-400 font-black uppercase tracking-[0.2em] text-[10px]">HIGHEST_FATIGUE_NODE</span>
                                            <span className="text-4xl font-black text-white italic tracking-tighter">
                                                {(comparison.high_risk.prediction * 100).toFixed(0)}<span className="text-xs opacity-40 ml-1">%_RISK</span>
                                            </span>
                                        </div>
                                        <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none">6 AM • WEEKEND • LOW_PRIORITY_PROFILE</p>
                                        </div>
                                    </div>

                                    <div className="p-8 rounded-2xl border border-teal-500/20 bg-teal-500/5 backdrop-blur-sm group relative overflow-hidden shadow-lg">
                                        <div className="absolute top-0 right-0 p-4">
                                            <span className="text-[8px] font-black text-teal-900 group-hover:text-teal-500 transition-colors uppercase tracking-widest">VECTOR_BETA</span>
                                        </div>
                                        <div className="flex items-center justify-between mb-6">
                                            <span className="text-teal-400 font-black uppercase tracking-[0.2em] text-[10px]">OPTIMAL_STABILITY_NODE</span>
                                            <span className="text-4xl font-black text-white italic tracking-tighter">
                                                {(comparison.low_risk.prediction * 100).toFixed(0)}<span className="text-xs opacity-40 ml-1">%_RISK</span>
                                            </span>
                                        </div>
                                        <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none">9 AM • MONDAY • HIGH_PRIORITY_PROFILE</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="h-[1px] flex-1 bg-white/10" />
                                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">DELTA_VARIANCE_INSIGHTS</h3>
                                        <div className="h-[1px] flex-1 bg-white/10" />
                                    </div>

                                    {comparison.key_differences.map((diff, index) => (
                                        <div
                                            key={diff.feature}
                                            className="p-6 bg-white/5 border border-white/5 hover:border-white/20 rounded-2xl transition-all group/item shadow-lg"
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-1.5 h-6 bg-purple-500/50 rounded-full" />
                                                    <span className="text-sm font-black text-white uppercase tracking-widest">{diff.feature}</span>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">ALPHA_CONTRIB</p>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${diff.high_risk_contribution < 0 ? 'text-red-400' : 'text-teal-400'}`}>
                                                            {formatContribution(diff.high_risk_contribution)}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">BETA_CONTRIB</p>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${diff.low_risk_contribution < 0 ? 'text-red-400' : 'text-teal-400'}`}>
                                                            {formatContribution(diff.low_risk_contribution)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-black/40 rounded-xl border border-white/5 relative">
                                                <div className="absolute top-4 left-4">
                                                    <Zap className="w-3 h-3 text-purple-500 opacity-30" />
                                                </div>
                                                <p className="text-xs font-bold text-slate-400 pl-8 italic">&quot;{diff.insight}&quot;</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}

                {/* Info Footer */}
                <div className="p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md shadow-2xl relative overflow-hidden group">
                    <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px]" />
                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center shrink-0 border border-white/10 shadow-xl group-hover:scale-110 transition-transform duration-500">
                            <Brain className="w-10 h-10 text-purple-400" />
                        </div>
                        <div>
                            <h4 className="text-white font-black text-sm uppercase tracking-widest mb-3">SHAP_METHODOLOGY_CORE</h4>
                            <p className="text-slate-400 text-xs font-bold leading-relaxed tracking-tight max-w-3xl">
                                <strong className="text-purple-400 italic">SHapley Additive exPlanations</strong> uses game-theoretic modeling to objectively quantify vector weights across predictive nodes. This ensures that every adherence anomaly is backed by transparent, explainable data assets, maintaining full protocol integrity.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
