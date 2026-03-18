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

import { PageLoader } from '@/components/ui/SkeletonLoaders';

import { SeniorOnly } from '@/components/RoleGuard';

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
        return <PageLoader message="Loading drug data..." />;
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-10 rounded-xl text-center flex flex-col items-center">
                <AlertCircle className="w-12 h-12 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Analysis Error</h2>
                <p className="text-red-300">{error}</p>
                <button
                    onClick={fetchData}
                    className="mt-6 px-6 py-3 bg-red-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-red-600 transition-all"
                >
                    Retry
                </button>
            </div>
        );
    }

    const riskInfo = result ? getRiskLevelInfo(result.risk_level) : null;

    return (
        <SeniorOnly>
            <div className="max-w-6xl mx-auto space-y-8 pb-20 pt-16 lg:pt-0">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative">
                    <div className="relative">
                        <div className="absolute -left-4 top-0 w-1 h-12 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                            DRUG_INTERACTION_ANALYSIS <span className="text-blue-400 not-italic">v3.0</span>
                        </h1>
                        <p className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">
                            ENGINE_STATUS: <span className="text-teal-400 font-black">MONITORING_ACTIVE</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {stats && (
                            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">DB_INTEGRITY</p>
                                <p className="text-xs font-black text-blue-400 uppercase tracking-widest">
                                    {stats.total_interactions.toLocaleString()}+_SIGNATURES
                                </p>
                            </div>
                        )}
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white hover:text-slate-950 transition-all active:scale-95 group shadow-xl"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                        </button>
                    </div>
                </header>

                {/* Risk Score Card */}
                {result && (
                    <motion.div
                        initial={{ scale: 0.98, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`p-8 md:p-12 rounded-2xl relative overflow-hidden backdrop-blur-xl border-l-[6px] shadow-2xl ${result.risk_level === 'critical' ? 'bg-red-500/5 border-red-500' :
                                result.risk_level === 'high' ? 'bg-amber-500/5 border-amber-500' :
                                    result.risk_level === 'moderate' ? 'bg-orange-500/5 border-orange-500' :
                                        'bg-teal-500/5 border-teal-500'
                            } border-y border-r border-white/10 shadow-xl transition-all`}
                    >
                        {/* Decorative scan lines */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none opacity-20" />

                        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
                            {/* Risk Score Gauge */}
                            <div className="text-center lg:text-left">
                                <div className="flex items-center gap-6 mb-6">
                                    <div className={`p-5 rounded-2xl border backdrop-blur-md shadow-inner ${result.risk_level === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                            result.risk_level === 'high' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                                result.risk_level === 'moderate' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                                                    'bg-teal-500/10 border-teal-500/30 text-teal-400'
                                        }`}>
                                        {result.risk_level === 'safe' ? (
                                            <Shield className="w-12 h-12" />
                                        ) : (
                                            <AlertTriangle className="w-12 h-12" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">AGGREGATED_RISK_INDEX</p>
                                        <h2 className={`text-7xl lg:text-8xl font-black tracking-tighter leading-none italic ${result.risk_level === 'critical' ? 'text-red-500' :
                                                result.risk_level === 'high' ? 'text-amber-500' :
                                                    result.risk_level === 'moderate' ? 'text-orange-500' :
                                                        'text-teal-400'
                                            }`}>
                                            {result.risk_score}<span className="text-xl italic opacity-50 ml-1">v.RI</span>
                                        </h2>
                                    </div>
                                </div>

                                {riskInfo && (
                                    <div className={`px-6 py-2.5 rounded-full border backdrop-blur-md inline-flex items-center gap-3 shadow-lg ${result.risk_level === 'critical' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                                            result.risk_level === 'high' ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' :
                                                result.risk_level === 'moderate' ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' :
                                                    'bg-teal-500/20 border-teal-500/30 text-teal-400'
                                        }`}>
                                        {(() => {
                                            const IconMap: Record<string, any> = {
                                                'AlertCircle': AlertCircle,
                                                'AlertTriangle': AlertTriangle,
                                                'Zap': Zap,
                                                'Info': Info,
                                                'CheckCircle': CheckCircle2
                                            };
                                            const RiskIcon = IconMap[riskInfo.icon] || Info;
                                            return <RiskIcon className="w-5 h-5" />;
                                        })()}
                                        <span className="text-sm font-black uppercase tracking-widest">{riskInfo.label}</span>
                                    </div>
                                )}
                            </div>

                            {/* Telemetry Multi-Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-4 w-full lg:w-auto">
                                {[
                                    { label: 'DATA_POINTS_SCANNED', value: result.total_interactions, color: 'text-blue-400' },
                                    { label: 'NODES_UNDER_REVIEW', value: result.medications_checked.length, color: 'text-teal-400' },
                                    { label: 'CRITICAL_INTERRUPTS', value: result.severity_breakdown.critical, color: 'text-red-500' },
                                    { label: 'MAJOR_ANOMALIES', value: result.severity_breakdown.major, color: 'text-amber-500' }
                                ].map((stat) => (
                                    <div key={stat.label} className="p-4 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm min-w-[140px] shadow-lg">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 leading-none">{stat.label}</p>
                                        <p className={`text-3xl font-black italic leading-none ${stat.color}`}>
                                            {stat.value.toString().padStart(2, '0')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Analysis Output */}
                        <div className="mt-10 p-6 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-md relative">
                            <div className="absolute top-4 right-6 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">REALTIME_SAFETY_ADVISORY</p>
                            </div>
                            <Activity className="w-5 h-5 text-slate-700 mb-4" />
                            <p className="font-bold text-slate-200 text-sm leading-relaxed whitespace-pre-line tracking-tight">
                                {result.recommendation}
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Graph Visualization */}
                {result && result.graph_data.nodes.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl"
                    >
                        <button
                            onClick={() => setShowGraph(!showGraph)}
                            className="w-full flex items-center justify-between group cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                    <Network className="w-6 h-6 text-blue-400" />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">INTERACTION_TOPOLOGY_MAP</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Spatial relationship diagram of detected risk paths</p>
                                </div>
                            </div>
                            <div className="p-2 bg-white/5 group-hover:bg-white/10 rounded-lg transition-all border border-white/5">
                                {showGraph ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                            </div>
                        </button>

                        <AnimatePresence>
                            {showGraph && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mt-8 overflow-hidden"
                                >
                                    <div className="h-[450px] bg-black/40 rounded-2xl border border-white/10 shadow-inner relative overflow-hidden">
                                        {/* Decorative grid for graph background */}
                                        <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] bg-[size:20px_20px]" />
                                        <InteractionGraph data={result.graph_data} />
                                    </div>

                                    {/* Legend */}
                                    <div className="mt-6 flex flex-wrap gap-6 justify-center bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-sm">
                                        {[
                                            { label: 'CRITICAL', color: 'bg-red-500Shadow' },
                                            { label: 'MAJOR_RISK', color: 'bg-amber-500Shadow' },
                                            { label: 'MODERATE', color: 'bg-orange-500Shadow' },
                                            { label: 'NOMINAL', color: 'bg-teal-500Shadow' }
                                        ].map((item) => (
                                            <div key={item.label} className="flex items-center gap-2.5">
                                                <div className={`w-3 h-3 rounded-full ${item.label === 'CRITICAL' ? 'bg-red-500' : item.label === 'MAJOR_RISK' ? 'bg-amber-500' : item.label === 'MODERATE' ? 'bg-orange-500' : 'bg-teal-400'} shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.label}</span>
                                            </div>
                                        ))}
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
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-4">
                            <Activity className="w-5 h-5 text-blue-500" />
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">DETECTED_INTERRUPT_VECTOR_LIST</h3>
                        </div>

                        <div className="space-y-3">
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
                        </div>
                    </motion.div>
                )}

                {/* Safe State */}
                {result && result.total_interactions === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center p-20 bg-teal-500/5 border border-teal-500/10 rounded-3xl backdrop-blur-md relative overflow-hidden shadow-2xl"
                    >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
                        <CheckCircle2 className="w-24 h-24 mx-auto text-teal-400 mb-8 drop-shadow-[0_0_15px_rgba(45,212,191,0.5)]" />
                        <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter italic">
                            NODE_CONFIGURATION_NOMINAL
                        </h2>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm max-w-md mx-auto">
                            No dangerous interactions detected. Medication regimen protocols verified for safety.
                        </p>
                    </motion.div>
                )}
            </div>
        </SeniorOnly>
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
            className={`group rounded-2xl border-l-[4px] backdrop-blur-md transition-all shadow-xl overflow-hidden cursor-pointer ${interaction.severity === 'critical' ? 'bg-red-500/5 border-red-500/40 hover:bg-red-500/10' :
                    interaction.severity === 'major' ? 'bg-amber-500/5 border-amber-500/40 hover:bg-amber-500/10' :
                        interaction.severity === 'moderate' ? 'bg-orange-500/5 border-orange-500/40 hover:bg-orange-500/10' :
                            'bg-white/5 border-white/20 hover:bg-white/10'
                } border-y border-r border-white/5`}
            onClick={onToggle}
        >
            <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className={`p-3.5 rounded-xl border backdrop-blur-md shadow-inner ${interaction.severity === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                            interaction.severity === 'major' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                interaction.severity === 'moderate' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                                    'bg-teal-500/10 border-teal-500/30 text-teal-400'
                        }`}>
                        <Zap className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            {interaction.medication1}
                            <span className="text-slate-600 text-[10px] tracking-normal">+</span>
                            {interaction.medication2}
                        </h4>
                        <div className="flex items-center gap-3 mt-1.5">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${interaction.severity === 'critical' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                                    interaction.severity === 'major' ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' :
                                        interaction.severity === 'moderate' ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' :
                                            'bg-teal-500/20 border-teal-500/30 text-teal-400'
                                }`}>
                                {interaction.severity}_LEVEL
                            </span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">ID_{Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
                        </div>
                    </div>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-5 pb-6 overflow-hidden"
                    >
                        <div className="pt-4 border-t border-white/5 space-y-6">
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2.5">INCIDENT_DESCRIPTION</p>
                                <p className="text-xs font-bold text-slate-200 leading-relaxed tracking-tight">{interaction.description}</p>
                            </div>

                            <div className={`p-4 rounded-xl border backdrop-blur-md relative overflow-hidden ${interaction.severity === 'critical' ? 'bg-red-500/10 border-red-500/20 shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]' :
                                    interaction.severity === 'major' ? 'bg-amber-500/10 border-amber-500/20' :
                                        interaction.severity === 'moderate' ? 'bg-orange-500/10 border-orange-500/20' :
                                            'bg-teal-500/10 border-teal-500/20'
                                }`}>
                                <div className="absolute top-3 right-4">
                                    <Activity className={`w-4 h-4 opacity-20 ${interaction.severity === 'critical' ? 'text-red-500' :
                                            interaction.severity === 'major' ? 'text-amber-500' :
                                                'text-slate-400'
                                        }`} />
                                </div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">MITIGATION_STRATEGY</p>
                                <p className={`text-xs font-black tracking-tight leading-relaxed ${interaction.severity === 'critical' ? 'text-red-400' :
                                        interaction.severity === 'major' ? 'text-amber-400' :
                                            interaction.severity === 'moderate' ? 'text-orange-400' :
                                                'text-teal-400'
                                    }`}>{interaction.recommendation}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1.5">TAXONOMY_CATEGORY</p>
                                    <p className="text-[10px] font-black text-white uppercase tracking-widest">{interaction.category.replace('_', ' ')}</p>
                                </div>
                                <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1.5">VALIDATED_SOURCE</p>
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded inline-block">
                                        {interaction.source}
                                    </p>
                                </div>
                            </div>

                            {interaction.risk_factors && interaction.risk_factors.length > 0 && (
                                <div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">CONCATENATED_RISK_FACTORS</p>
                                    <div className="flex flex-wrap gap-2">
                                        {interaction.risk_factors.map((factor) => (
                                            <span
                                                key={factor}
                                                className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest hover:border-white/20 hover:text-white transition-all"
                                            >
                                                {factor.replace('_', ' ')}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
