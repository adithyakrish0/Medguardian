"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/hooks/useUser';
import {
    AlertTriangle,
    Shield,
    Activity,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Info,
    Zap,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Network
} from 'lucide-react';
import {
    checkInteractions,
    getInteractionStats,
    InteractionCheckResult,
    DrugInteraction,
    SeverityLevel,
    getSeverityClasses,
    getRiskLevelInfo
} from '@/lib/api/interactions';
import InteractionGraph from '@/components/InteractionGraph';

export default function InteractionsPage() {
    const { user, loading: userLoading } = useUser();
    const [result, setResult] = useState<InteractionCheckResult | null>(null);
    const [stats, setStats] = useState<{ total_interactions: number; categories: string[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedInteraction, setExpandedInteraction] = useState<number | null>(null);
    const [showGraph, setShowGraph] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [interactionResult, statsResult] = await Promise.all([
                checkInteractions({}),
                getInteractionStats()
            ]);
            setResult(interactionResult);
            setStats(statsResult);
        } catch (err: any) {
            setError(err.message || 'Failed to check interactions');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!userLoading) {
            fetchData();
        }
    }, [userLoading, fetchData]);

    if (userLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
                    <p className="text-lg font-bold opacity-60">Analyzing your medications...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-10 medical-card bg-red-500/5 border-red-500/20 text-red-600 rounded-3xl">
                <AlertCircle className="w-12 h-12 mb-4" />
                <h2 className="text-2xl font-black mb-2">Analysis Error</h2>
                <p>{error}</p>
                <button
                    onClick={fetchData}
                    className="mt-4 px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:scale-105 transition-all"
                >
                    Retry
                </button>
            </div>
        );
    }

    const riskInfo = result ? getRiskLevelInfo(result.risk_level) : null;

    return (
        <div className="space-y-8 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
                        Drug Interactions
                    </h1>
                    <p className="text-lg font-medium opacity-60 mt-2">
                        AI-powered medication safety analysis
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {stats && (
                        <span className="text-sm font-bold opacity-50">
                            Checking against {stats.total_interactions}+ interactions
                        </span>
                    )}
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="p-3 rounded-2xl bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            {/* Risk Score Card */}
            {result && (
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`p-8 md:p-12 rounded-[48px] relative overflow-hidden ${result.risk_level === 'critical' ? 'bg-gradient-to-r from-red-600 to-red-500 text-white' :
                            result.risk_level === 'high' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' :
                                result.risk_level === 'moderate' ? 'bg-gradient-to-r from-yellow-500 to-amber-400 text-black' :
                                    'bg-gradient-to-r from-emerald-500 to-green-400 text-white'
                        } shadow-2xl`}
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />

                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                        {/* Risk Score Gauge */}
                        <div className="text-center md:text-left">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-4 bg-white/20 rounded-2xl">
                                    {result.risk_level === 'safe' ? (
                                        <Shield className="w-10 h-10" />
                                    ) : (
                                        <AlertTriangle className="w-10 h-10" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-lg font-bold opacity-80">Risk Score</p>
                                    <h2 className="text-6xl md:text-8xl font-black tracking-tighter">
                                        {result.risk_score}
                                    </h2>
                                </div>
                            </div>
                            {riskInfo && (
                                <p className="text-xl font-bold opacity-90 flex items-center gap-2">
                                    <span>{riskInfo.emoji}</span>
                                    <span>{riskInfo.label}</span>
                                </p>
                            )}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md text-center">
                                <p className="text-3xl font-black">{result.total_interactions}</p>
                                <p className="text-sm font-bold opacity-70">Interactions Found</p>
                            </div>
                            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md text-center">
                                <p className="text-3xl font-black">{result.medications_checked.length}</p>
                                <p className="text-sm font-bold opacity-70">Medications</p>
                            </div>
                            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md text-center">
                                <p className="text-3xl font-black">{result.severity_breakdown.critical}</p>
                                <p className="text-sm font-bold opacity-70">Critical</p>
                            </div>
                            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md text-center">
                                <p className="text-3xl font-black">{result.severity_breakdown.major}</p>
                                <p className="text-sm font-bold opacity-70">Major</p>
                            </div>
                        </div>
                    </div>

                    {/* Recommendation */}
                    <div className="mt-8 p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                        <p className="font-bold whitespace-pre-line">{result.recommendation}</p>
                    </div>
                </motion.div>
            )}

            {/* Graph Visualization Toggle */}
            {result && result.graph_data.nodes.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="medical-card p-6 bg-card/40 backdrop-blur-xl border border-card-border/50 rounded-[32px]"
                >
                    <button
                        onClick={() => setShowGraph(!showGraph)}
                        className="w-full flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <Network className="w-6 h-6 text-primary" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-xl font-black">Interaction Network</h3>
                                <p className="text-sm opacity-60">Visual graph of your medication relationships</p>
                            </div>
                        </div>
                        {showGraph ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                    </button>

                    <AnimatePresence>
                        {showGraph && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-6 overflow-hidden"
                            >
                                <div className="h-[400px] bg-background/50 rounded-2xl border border-card-border/30">
                                    <InteractionGraph data={result.graph_data} />
                                </div>
                                {/* Legend */}
                                <div className="mt-4 flex flex-wrap gap-4 justify-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-red-500" />
                                        <span className="text-sm font-bold">Critical</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-orange-500" />
                                        <span className="text-sm font-bold">Major</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-yellow-500" />
                                        <span className="text-sm font-bold">Moderate</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-green-500" />
                                        <span className="text-sm font-bold">Minor</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Interactions List */}
            {result && result.interactions.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-4"
                >
                    <h3 className="text-2xl font-black">Detected Interactions</h3>

                    {result.interactions.map((interaction, index) => (
                        <InteractionCard
                            key={`${interaction.medication1}-${interaction.medication2}-${index}`}
                            interaction={interaction}
                            isExpanded={expandedInteraction === index}
                            onToggle={() => setExpandedInteraction(
                                expandedInteraction === index ? null : index
                            )}
                        />
                    ))}
                </motion.div>
            )}

            {/* Safe State */}
            {result && result.total_interactions === 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center p-16 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-[48px]"
                >
                    <CheckCircle2 className="w-20 h-20 mx-auto text-emerald-500 mb-6" />
                    <h2 className="text-3xl font-black text-emerald-600 mb-4">
                        All Clear!
                    </h2>
                    <p className="text-lg opacity-70 max-w-md mx-auto">
                        No dangerous interactions detected between your current medications.
                        Your medication regimen appears safe.
                    </p>
                </motion.div>
            )}
        </div>
    );
}

// =============================================================================
// Interaction Card Component
// =============================================================================

function InteractionCard({
    interaction,
    isExpanded,
    onToggle
}: {
    interaction: DrugInteraction;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const classes = getSeverityClasses(interaction.severity);

    return (
        <motion.div
            layout
            className={`medical-card p-6 rounded-[24px] border-2 ${classes.border} ${classes.bg} cursor-pointer hover:shadow-lg transition-shadow`}
            onClick={onToggle}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${classes.bg}`}>
                        <Zap className={`w-6 h-6 ${classes.text}`} />
                    </div>
                    <div>
                        <h4 className="text-lg font-black">
                            {interaction.medication1} + {interaction.medication2}
                        </h4>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${classes.bg} ${classes.text}`}>
                            {interaction.severity}
                        </span>
                    </div>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 pt-4 border-t border-current/10 space-y-4 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div>
                            <p className="text-sm font-bold opacity-60 uppercase tracking-wider mb-1">Description</p>
                            <p className="font-medium">{interaction.description}</p>
                        </div>

                        <div className={`p-4 rounded-xl ${classes.bg}`}>
                            <p className="text-sm font-bold opacity-60 uppercase tracking-wider mb-1">Recommendation</p>
                            <p className={`font-bold ${classes.text}`}>{interaction.recommendation}</p>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm">
                            <div>
                                <span className="font-bold opacity-60">Category:</span>{' '}
                                <span className="font-bold capitalize">{interaction.category.replace('_', ' ')}</span>
                            </div>
                            <div>
                                <span className="font-bold opacity-60">Source:</span>{' '}
                                <span className="font-bold">{interaction.source}</span>
                            </div>
                        </div>

                        {interaction.risk_factors && interaction.risk_factors.length > 0 && (
                            <div>
                                <p className="text-sm font-bold opacity-60 uppercase tracking-wider mb-2">Risk Factors</p>
                                <div className="flex flex-wrap gap-2">
                                    {interaction.risk_factors.map((factor) => (
                                        <span
                                            key={factor}
                                            className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold capitalize"
                                        >
                                            {factor.replace('_', ' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
