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

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-white mb-3"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </button>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Brain className="w-8 h-8 text-purple-400" />
                        Model Explainability
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        SHAP analysis of adherence predictions
                    </p>
                </div>

                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Status */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status?.model_loaded ? 'bg-green-500/20' : 'bg-yellow-500/20'
                    }`}>
                    <Zap className={`w-6 h-6 ${status?.model_loaded ? 'text-green-400' : 'text-yellow-400'}`} />
                </div>
                <div>
                    <h3 className="text-white font-bold">Status</h3>
                    <p className="text-sm text-gray-400">
                        {status?.model_loaded
                            ? `${status.model_type} with ${status.features.length} features`
                            : 'Model not loaded'}
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-300 text-sm">{error}</span>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
                    <p className="text-gray-400">Calculating SHAP values...</p>
                </div>
            ) : globalData ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Feature Importance */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-purple-400" />
                                Feature Importance
                            </h2>
                            <span className="text-xs text-gray-500">{globalData.samples_analyzed} samples</span>
                        </div>

                        <div className="space-y-4">
                            {globalData.features.map((feature, index) => (
                                <motion.div
                                    key={feature.feature}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-white font-medium">{feature.feature}</span>
                                        <span className="text-gray-400 text-sm">{feature.percentage}%</span>
                                    </div>
                                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${feature.percentage}%` }}
                                            transition={{ delay: index * 0.1, duration: 0.5 }}
                                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                                        />
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="mt-6 p-4 bg-white/5 rounded-xl">
                            <p className="text-xs text-gray-500 flex items-start gap-2">
                                <HelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                Ranked by mean absolute SHAP value
                            </p>
                        </div>
                    </div>

                    {/* Summary Plot */}
                    {globalData.summary_plot && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                                <Eye className="w-5 h-5 text-purple-400" />
                                SHAP Summary
                            </h2>
                            <img
                                src={globalData.summary_plot}
                                alt="SHAP Summary"
                                className="w-full rounded-lg bg-white"
                            />
                        </div>
                    )}

                    {/* Comparison */}
                    {comparison && (
                        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                                <TrendingUp className="w-5 h-5 text-purple-400" />
                                Scenario Comparison
                            </h2>

                            <div className="grid lg:grid-cols-2 gap-6 mb-6">
                                <div className={`p-5 rounded-2xl border ${getRiskLevelStyle('High').border} ${getRiskLevelStyle('High').bg}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-red-400 font-bold">🔴 High Risk</span>
                                        <span className="text-2xl font-black text-white">
                                            {(comparison.high_risk.prediction * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-sm">6 AM, Weekend, Low Priority</p>
                                </div>

                                <div className={`p-5 rounded-2xl border ${getRiskLevelStyle('Low').border} ${getRiskLevelStyle('Low').bg}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-green-400 font-bold">🟢 Low Risk</span>
                                        <span className="text-2xl font-black text-white">
                                            {(comparison.low_risk.prediction * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-sm">9 AM, Monday, High Priority</p>
                                </div>
                            </div>

                            <h3 className="text-white font-bold mb-4">Key Differences</h3>
                            <div className="space-y-3">
                                {comparison.key_differences.map((diff, index) => (
                                    <div
                                        key={diff.feature}
                                        className="p-4 bg-white/5 rounded-xl border border-white/10"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-white font-medium">{diff.feature}</span>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className={diff.high_risk_contribution < 0 ? 'text-red-400' : 'text-blue-400'}>
                                                    High: {formatContribution(diff.high_risk_contribution)}
                                                </span>
                                                <span className={diff.low_risk_contribution < 0 ? 'text-red-400' : 'text-blue-400'}>
                                                    Low: {formatContribution(diff.low_risk_contribution)}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-gray-500 text-xs">{diff.insight}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {/* Info */}
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center gap-3">
                <Brain className="w-5 h-5 text-purple-400" />
                <p className="text-purple-300 text-xs">
                    <strong>SHAP</strong> uses game theory to explain predictions.
                    Each feature gets a score showing how much it pushed the prediction up or down.
                </p>
            </div>
        </div>
    );
}
