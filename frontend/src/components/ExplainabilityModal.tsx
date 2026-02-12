"use client";

/**
 * Explainability Modal
 * 
 * Shows SHAP waterfall plot and feature contributions for a prediction.
 * "Why this score?" modal for transparency.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Loader2, TrendingUp, TrendingDown, HelpCircle, Info } from 'lucide-react';
import {
    explainPatientPrediction,
    ExplainPredictionResponse,
    getContributionColor,
    formatContribution,
    getRiskLevelStyle,
    formatFeatureValue
} from '@/lib/api/explain';

interface ExplainabilityModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientId: number;
    patientName?: string;
}

export default function ExplainabilityModal({
    isOpen,
    onClose,
    patientId,
    patientName
}: ExplainabilityModalProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ExplainPredictionResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && patientId) {
            fetchExplanation();
        }
    }, [isOpen, patientId]);

    const fetchExplanation = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await explainPatientPrediction(patientId);

            if (result.success) {
                setData(result);
            } else {
                setError(result.error || 'Failed to generate explanation');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load explanation');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const riskStyle = data ? getRiskLevelStyle(data.risk_level) : null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-gray-900 border border-white/10 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                <Brain className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    Why This Prediction?
                                </h2>
                                <p className="text-sm text-gray-400">
                                    AI Explainability for {patientName || `Patient ${patientId}`}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-4" />
                                <p className="text-gray-400">Calculating SHAP values...</p>
                            </div>
                        ) : error ? (
                            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                                <p className="text-red-400">{error}</p>
                                <button
                                    onClick={fetchExplanation}
                                    className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-300"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : data ? (
                            <div className="space-y-6">
                                {/* Prediction Summary */}
                                <div className={`p-5 rounded-2xl border ${riskStyle?.border} ${riskStyle?.bg}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-gray-400 text-sm font-medium">Adherence Probability</span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${riskStyle?.bg} ${riskStyle?.text}`}>
                                            {data.risk_level} Risk
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-white">
                                            {(data.prediction * 100).toFixed(0)}%
                                        </span>
                                        <span className="text-gray-400">chance of taking medication</span>
                                    </div>
                                </div>

                                {/* SHAP Waterfall Plot */}
                                {data.waterfall_plot && (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Info className="w-4 h-4 text-purple-400" />
                                            <span className="text-sm font-bold text-white">SHAP Waterfall Plot</span>
                                        </div>
                                        <img
                                            src={data.waterfall_plot}
                                            alt="SHAP Waterfall Plot"
                                            className="w-full rounded-lg"
                                        />
                                    </div>
                                )}

                                {/* Feature Contributions */}
                                <div>
                                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                        <HelpCircle className="w-4 h-4 text-gray-400" />
                                        Feature Contributions
                                    </h3>
                                    <div className="space-y-3">
                                        {data.contributions.map((contrib, index) => {
                                            const colors = getContributionColor(contrib.contribution);
                                            return (
                                                <motion.div
                                                    key={contrib.name}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.1 }}
                                                    className={`p-4 rounded-xl border ${colors.bg} border-white/10`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            {contrib.contribution > 0 ? (
                                                                <TrendingUp className="w-5 h-5 text-blue-400" />
                                                            ) : (
                                                                <TrendingDown className="w-5 h-5 text-red-400" />
                                                            )}
                                                            <div>
                                                                <p className="text-white font-medium">{contrib.name}</p>
                                                                <p className="text-gray-400 text-sm">
                                                                    Value: {formatFeatureValue(contrib.name, contrib.value)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className={`text-lg font-bold ${colors.text}`}>
                                                            {formatContribution(contrib.contribution)}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 text-xs text-gray-500">
                                                        {contrib.direction === 'increases_adherence'
                                                            ? '↑ Increases likelihood of taking medication'
                                                            : '↓ Decreases likelihood of taking medication'}
                                                    </p>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Base Value Info */}
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                    <p className="text-xs text-gray-500">
                                        <strong>Base value:</strong> {(data.base_value * 100).toFixed(1)}% —
                                        This is the average prediction across all patients.
                                        Each feature pushes this value up (blue) or down (red).
                                    </p>
                                </div>

                                {/* Features Used */}
                                <div className="text-xs text-gray-500">
                                    <strong>Input Features:</strong> Hour: {data.features_used.hour}:00,
                                    Day: {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][data.features_used.day_of_week]},
                                    Weekend: {data.features_used.is_weekend ? 'Yes' : 'No'},
                                    Priority: {data.features_used.priority ? 'High' : 'Normal'}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
