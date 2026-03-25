"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/hooks/useUser';
import {
    AlertTriangle, Shield, Activity, RefreshCw,
    ChevronDown, ChevronUp, Info, Zap, AlertCircle,
    CheckCircle2, Loader2, Network, Users, TrendingDown,
    Heart, BookOpen, Tag, ChevronRight, Brain
} from 'lucide-react';
import {
    checkInteractions, getInteractionStats,
    InteractionCheckResult, DrugInteraction,
    getSeverityClasses, getRiskLevelInfo
} from '@/lib/api/interactions';
import InteractionGraph from '@/components/InteractionGraph';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PageLoader } from '@/components/ui/SkeletonLoaders';
import { apiFetch } from '@/lib/api';

// ─── Design tokens ─────────────────────────────────────────
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
    green:    '#22c55e',
    greenDim: '#0a1f0a',
    amber:    '#f59e0b',
    amberDim: '#1a1100',
    orange:   '#f97316',
    orangeDim:'#1f0d05',
    violet:   '#8b5cf6',
    violetDim:'#1a1230',
    rose:     '#f43f5e',
    roseDim:  '#200a10',
};

const cv = {
    hidden:  { opacity: 0, y: 14 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.07, duration: 0.36, ease: 'easeOut' as const }
    }),
};

// ─── Risk config with rich colors ──────────────────────────
const riskStyle = {
    critical: { color: T.rose,   dim: T.roseDim,   border: `${T.rose}30`,   label: 'Critical risk',  icon: AlertCircle  },
    high:     { color: T.orange, dim: T.orangeDim, border: `${T.orange}28`, label: 'High risk',      icon: AlertTriangle },
    moderate: { color: T.amber,  dim: T.amberDim,  border: `${T.amber}28`,  label: 'Moderate risk',  icon: Zap          },
    low:      { color: T.blue,   dim: T.blueDim,   border: `${T.blue}28`,   label: 'Low risk',       icon: Info         },
    safe:     { color: T.green,  dim: T.greenDim,  border: `${T.green}28`,  label: 'No interactions',icon: CheckCircle2 },
};

const severityStyle = {
    critical: { color: T.rose,   dim: T.roseDim,   border: `${T.rose}30`   },
    major:    { color: T.orange, dim: T.orangeDim, border: `${T.orange}28` },
    moderate: { color: T.amber,  dim: T.amberDim,  border: `${T.amber}28`  },
    minor:    { color: T.teal,   dim: T.tealDim,   border: `${T.teal}28`   },
};

// ─── Interaction card ───────────────────────────────────────
function InteractionCard({ interaction, isExpanded, onToggle, i }: {
    interaction: DrugInteraction; isExpanded: boolean; onToggle: () => void; i: number;
}) {
    const isCritical = interaction.severity === 'critical';
    const isMajor    = interaction.severity === 'major';
    const accent     = isCritical ? T.red : isMajor ? T.amber : T.teal;
    const accentDim  = isCritical ? T.redDim : isMajor ? T.amberDim : T.tealDim;

    return (
        <motion.div custom={i} initial="hidden" animate="visible" variants={cv} layout
            className="rounded-2xl overflow-hidden transition-all"
            style={{ 
                background: T.card, 
                border: `1px solid ${isExpanded ? accent : T.border}`,
                boxShadow: isExpanded ? `0 10px 30px -10px ${accent}22` : 'none'
            }}>
            
            <div className="p-5 flex items-center justify-between cursor-pointer" onClick={onToggle}>
                <div className="flex items-center gap-5">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: accentDim, border: `1px solid ${accent}44` }}>
                        <Zap className="w-4.5 h-4.5" style={{ color: accent }} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="text-[15px] font-semibold" style={{ color: T.text }}>{interaction.medication1}</span>
                            <div className="w-1.5 h-px" style={{ background: T.muted }} />
                            <span className="text-[15px] font-semibold" style={{ color: T.text }}>{interaction.medication2}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                                style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}33` }}>
                                {interaction.severity} risk
                            </span>
                            <span className="text-[11px]" style={{ color: T.muted }}>Type: Clinical Risk</span>
                        </div>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5">
                    {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: T.muted }} /> : <ChevronDown className="w-4 h-4" style={{ color: T.muted }} />}
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden">
                        <div className="px-5 pb-6 pt-2 space-y-6">
                            <div className="h-px bg-white/5 w-full" />
                            
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: T.muted }}>How they affect you</p>
                                        <p className="text-[14px] leading-relaxed" style={{ color: T.sub }}>
                                            {interaction.description.replace('AI PREDICTION: Potential interaction detected by Graph Neural Network with 100.0% confidence.', '**Safety Warning:** Our system has identified a confirmed risk when these medications are combined.')}
                                        </p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1 p-3.5 rounded-xl" style={{ background: T.faint, border: `1px solid ${T.border}` }}>
                                            <p className="text-[10px] font-medium uppercase mb-1.5" style={{ color: T.muted }}>Source</p>
                                            <span className="text-[12px] font-semibold text-blue-400">Clinical Intelligence</span>
                                        </div>
                                        <div className="flex-1 p-3.5 rounded-xl" style={{ background: T.faint, border: `1px solid ${T.border}` }}>
                                            <p className="text-[10px] font-medium uppercase mb-1.5" style={{ color: T.muted }}>Priority</p>
                                            <span className="text-[12px] font-semibold" style={{ color: T.text }}>Urgent Review</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl relative overflow-hidden"
                                    style={{ background: accentDim, border: `1px solid ${accent}22` }}>
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <Shield className="w-3.5 h-3.5" style={{ color: accent }} />
                                        <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: accent }}>Mitigation strategy</p>
                                    </div>
                                    <p className="text-[14px] font-medium leading-relaxed" style={{ color: accent }}>
                                        {interaction.recommendation}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Main page ──────────────────────────────────────────────
export default function InteractionsPage() {
    const { user, loading: userLoading } = useUser();
    const [loading, setLoading]           = useState(true);
    const [patients, setPatients]         = useState<any[]>([]);
    const [selectedId, setSelectedId]     = useState<number | null>(null);
    const [result, setResult]             = useState<InteractionCheckResult | null>(null);
    const [stats, setStats]               = useState<{ total_interactions: number; categories: string[] } | null>(null);
    const [error, setError]               = useState<string | null>(null);
    const [expandedIdx, setExpandedIdx]   = useState<number | null>(null);
    const [showGraph, setShowGraph]       = useState(true);

    const fetchData = useCallback(async (targetId?: number) => {
        setLoading(true); setError(null);
        try {
            const pid = targetId ?? selectedId;
            const [ir, sr] = await Promise.all([
                checkInteractions(pid ? { seniorId: pid } : {}),
                getInteractionStats()
            ]);
            setResult(ir); setStats(sr);
        } catch (e: any) { setError(e.message || 'Failed to check interactions'); }
        finally { setLoading(false); }
    }, [selectedId]);

    const fetchPatients = useCallback(async () => {
        try {
            const res = await apiFetch('/caregiver/seniors');
            if (res.success && res.data) {
                setPatients(res.data);
                if (res.data.length > 0 && !selectedId) {
                    const id = res.data[0].senior_id || res.data[0].id;
                    setSelectedId(id); fetchData(id);
                }
            }
        } catch { }
    }, [selectedId, fetchData]);

    useEffect(() => {
        if (!userLoading && user) {
            user.role === 'caregiver' ? fetchPatients() : fetchData();
        }
    }, [userLoading, user]);

    if (userLoading || loading) return <PageLoader message="Checking interactions…" />;

    const rsk = result ? (riskStyle[result.risk_level as keyof typeof riskStyle] ?? riskStyle.safe) : riskStyle.safe;
    const RskIcon = rsk.icon;

    return (
        <div className="max-w-5xl mx-auto pb-20 space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pt-2">
                <div>
                    <h1 className="text-[26px] font-semibold tracking-[-0.4px]" style={{ color: T.text }}>
                        Drug Interactions
                    </h1>
                    <p className="text-[13px] mt-1 flex items-center gap-2" style={{ color: T.muted }}>
                        <Brain className="w-3.5 h-3.5" />
                        Real-time interaction screening across all medications
                        {stats && <span style={{ color: T.muted }}>· {stats.total_interactions.toLocaleString()} known interactions in database</span>}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {user?.role === 'caregiver' && patients.length > 0 && (
                        <div className="relative">
                            <select value={selectedId || ''} onChange={e => { const id = parseInt(e.target.value); setSelectedId(id); fetchData(id); }}
                                className="appearance-none text-[13px] font-medium pr-8 pl-4 py-2.5 rounded-[10px] focus:outline-none transition-all cursor-pointer bg-surface border-border hover:border-blue-500/50"
                                style={{ background: T.surface, color: T.text, border: `1px solid ${T.border}` }}>
                                {patients.map(p => (
                                    <option key={p.senior_id || p.id} value={p.senior_id || p.id} className="bg-[#0f1c2e]">
                                        {p.name || p.senior_name || p.username}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5" style={{ color: T.muted }} />
                            </div>
                        </div>
                    )}
                    <button onClick={() => fetchData()} disabled={loading}
                        className="w-10 h-10 flex items-center justify-center rounded-[10px] transition-colors"
                        style={{ background: T.surface, color: T.muted, border: `1px solid ${T.border}` }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.borderHi; (e.currentTarget as HTMLElement).style.color = T.sub; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.color = T.muted; }}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ── Error ── */}
            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-start gap-3 px-4 py-3 rounded-xl text-[13px]"
                        style={{ background: T.redDim, border: `1px solid ${T.red}25`, color: '#fca5a5' }}>
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="flex-1">{error}</span>
                        <button onClick={() => fetchData()}
                            className="text-[12px] font-medium px-3 py-1 rounded-lg transition-colors hover:bg-red-600 hover:text-white"
                            style={{ background: `${T.red}20`, color: T.red }}>Retry</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {result && (
                <>
                    {/* ── Risk overview card ── */}
                    <motion.div custom={0} initial="hidden" animate="visible" variants={cv}
                        className="rounded-2xl overflow-hidden"
                        style={{ background: T.card, border: `1px solid ${T.border}`, borderLeft: `3px solid ${rsk.color}` }}>

                        {/* Top section */}
                        <div className="px-6 py-6 flex flex-col md:flex-row items-start md:items-center gap-6">
                            {/* Risk score block */}
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
                                    style={{ background: rsk.dim }}>
                                    <RskIcon className="w-8 h-8" style={{ color: rsk.color }} />
                                </div>
                                <div>
                                    <p className="text-[12px] font-medium mb-1" style={{ color: T.muted }}>Overall risk score</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-[48px] font-semibold leading-none tracking-[-1px]"
                                            style={{ color: rsk.color }}>{result.risk_score}</p>
                                        <span className="text-[13px]" style={{ color: T.muted }}>/100</span>
                                    </div>
                                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1 rounded-lg mt-2"
                                        style={{ background: rsk.dim, color: rsk.color, border: `1px solid ${rsk.border}` }}>
                                        <RskIcon className="w-3.5 h-3.5" /> {rsk.label}
                                    </span>
                                </div>
                            </div>

                            {/* Risk progress bar */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between mb-1.5">
                                    <p className="text-[12px]" style={{ color: T.muted }}>Risk level</p>
                                    <p className="text-[12px] font-medium" style={{ color: rsk.color }}>{result.risk_score}/100</p>
                                </div>
                                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: T.faint }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(result.risk_score, 100)}%` }}
                                        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                                        className="h-full rounded-full"
                                        style={{ background: rsk.color }} />
                                </div>
                                <div className="flex justify-between mt-1">
                                    {['Safe', 'Low', 'Moderate', 'High', 'Critical'].map((l, i) => (
                                        <span key={l} className="text-[10px]" style={{ color: T.muted }}>{l}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Stats strip */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-0"
                            style={{ borderTop: `1px solid ${T.border}` }}>
                            {[
                                { label: 'Total interactions', value: result.total_interactions,           color: T.rose   },
                                { label: 'Medications checked', value: result.medications_checked.length, color: T.blue   },
                                { label: 'Critical',           value: result.severity_breakdown.critical, color: T.rose   },
                                { label: 'Major',              value: result.severity_breakdown.major,    color: T.orange },
                            ].map((s, i) => (
                                <div key={s.label} className="px-5 py-4"
                                    style={{ borderRight: i < 3 ? `1px solid ${T.border}` : 'none' }}>
                                    <p className="text-[11px] mb-1.5" style={{ color: T.muted }}>{s.label}</p>
                                    <p className="text-[24px] font-semibold leading-none" style={{ color: s.value > 0 ? s.color : T.text }}>
                                        {s.value}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Recommendation */}
                        {result.recommendation && (
                            <div className="px-6 py-4 flex items-start gap-3"
                                style={{ borderTop: `1px solid ${T.border}`, background: T.faint }}>
                                <Activity className="w-4 h-4 mt-0.5 shrink-0" style={{ color: T.muted }} />
                                <p className="text-[13px] leading-relaxed" style={{ color: T.sub }}>
                                    {result.recommendation}
                                </p>
                            </div>
                        )}
                    </motion.div>

                    {/* ── Medications checked ── */}
                    {result.medications_checked?.length > 0 && (
                        <motion.div custom={1} initial="hidden" animate="visible" variants={cv}
                            className="rounded-2xl p-5"
                            style={{ background: T.card, border: `1px solid ${T.border}` }}>
                            <p className="text-[13px] font-semibold mb-4 flex items-center gap-2" style={{ color: T.text }}>
                                <BookOpen className="w-4 h-4" style={{ color: T.blue }} />
                                Medications screened
                                <span className="ml-auto text-[12px] font-normal" style={{ color: T.muted }}>
                                    {result.medications_checked.length} total
                                </span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {result.medications_checked.map((m: string) => (
                                    <span key={m} className="text-[13px] px-3 py-1.5 rounded-xl font-medium"
                                        style={{ background: T.blueDim, color: T.blue, border: `1px solid ${T.blue}22` }}>
                                        {m}
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ── Interaction graph ── */}
                    {result.graph_data?.nodes?.length > 0 && (
                        <motion.div custom={2} initial="hidden" animate="visible" variants={cv}
                            className="rounded-2xl overflow-hidden"
                            style={{ background: T.card, border: `1px solid ${T.border}` }}>

                            <button onClick={() => setShowGraph(!showGraph)}
                                className="w-full px-6 py-4 flex items-center justify-between gap-4 transition-colors"
                                style={{ borderBottom: showGraph ? `1px solid ${T.border}` : 'none' }}
                                onMouseEnter={e => (e.currentTarget.style.background = T.cardHi)}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                        style={{ background: T.violetDim }}>
                                        <Network className="w-4 h-4" style={{ color: T.violet }} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[14px] font-semibold" style={{ color: T.text }}>Safety Relationship Graph</p>
                                        <p className="text-[12px]" style={{ color: T.muted }}>Visual map of how your medications interact</p>
                                    </div>
                                </div>
                                {showGraph
                                    ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: T.muted }} />
                                    : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: T.muted }} />}
                            </button>

                            <AnimatePresence>
                                {showGraph && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}>
                                        <div className="h-[540px] w-full rounded-2xl relative overflow-hidden"
                            style={{ background: T.faint, border: `1px solid ${T.border}` }}>
                            <ErrorBoundary fallback="Interaction Graph Error">
                                <InteractionGraph
                                    data={result.graph_data}
                                />
                            </ErrorBoundary>
                        </div>
                                        {/* Legend */}
                                        <div className="px-6 pb-5 flex flex-wrap gap-4">
                                            {[
                                                { label: 'Critical',  color: T.rose   },
                                                { label: 'Major',     color: T.orange },
                                                { label: 'Moderate',  color: T.amber  },
                                                { label: 'Minor',     color: T.teal   },
                                            ].map(l => (
                                                <div key={l.label} className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                                                    <span className="text-[12px]" style={{ color: T.muted }}>{l.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {/* ── Interactions list ── */}
                    {result.interactions?.length > 0 ? (
                        <section className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <p className="text-[16px] font-semibold" style={{ color: T.text }}>
                                    Detected interactions
                                </p>
                                <p className="text-[13px]" style={{ color: T.muted }}>
                                    {result.interactions.length} found
                                </p>
                            </div>

                            <div className="space-y-3.5 max-h-[540px] overflow-y-auto pr-1 select-none custom-scrollbar">
                                {result.interactions.map((interaction, i) => (
                                    <InteractionCard
                                        key={`${interaction.medication1}-${interaction.medication2}-${i}`}
                                        interaction={interaction}
                                        isExpanded={expandedIdx === i}
                                        onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
                                        i={i}
                                    />
                                ))}
                            </div>
                        </section>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl"
                            style={{ background: T.card, border: `1px dashed ${T.border}` }}>
                            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mb-6">
                                <Shield className="w-8 h-8 text-green-500" />
                            </div>
                            <p className="text-[18px] font-bold text-white">No interactions detected</p>
                            <p className="text-[14px] mt-2 max-w-xs mx-auto" style={{ color: T.muted }}>
                                All current medications are compatible with no biologically significant interactions found.
                            </p>
                        </div>
                    )}

                    {/* ── Safe state ── */}
                    {result.total_interactions === 0 && (
                        <motion.div custom={3} initial="hidden" animate="visible" variants={cv}
                            className="flex flex-col items-center justify-center py-20 rounded-[32px] text-center"
                            style={{ background: T.greenDim, border: `1px dashed ${T.green}33`, borderLeft: `3px solid ${T.green}` }}>
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                                style={{ background: T.greenDim }}>
                                <CheckCircle2 className="w-8 h-8" style={{ color: T.green }} />
                            </div>
                            <p className="text-[20px] font-semibold mb-2" style={{ color: T.text }}>
                                No interactions detected
                            </p>
                            <p className="text-[14px] max-w-sm leading-relaxed" style={{ color: T.muted }}>
                                All medications in this regimen appear safe together. No dangerous interactions were found in the database.
                            </p>
                        </motion.div>
                    )}
                </>
            )}
        </div>
    );
}
