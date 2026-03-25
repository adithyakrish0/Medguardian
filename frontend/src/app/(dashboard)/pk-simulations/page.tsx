"use client";

import { useSearchParams } from 'next/navigation';

import { useState, useEffect, useCallback } from 'react';
import {
    Activity, Brain, Clock, Zap, TrendingUp, FlaskConical,
    Search, AlertCircle, CheckCircle2, ChevronRight,
    Loader2, BarChart3, Pill, ArrowRight, Info
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ReferenceArea, ReferenceLine, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { apiFetch } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Tokens ────────────────────────────────────────────────────
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
    violet:   '#8b5cf6',
    violetDim:'#1a1230',
};

const cv = {
    hidden:  { opacity: 0, y: 14 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.07, duration: 0.36, ease: 'easeOut' as const }
    }),
};

interface Medication { id: number; name: string; dosage: string; }
interface PKData {
    medication: string; dose_mg: number;
    timepoints: number[]; concentrations: number[];
    cmax: number; tmax: number; half_life: number;
    bioavailability: number; vd: number;
    therapeutic_range: { min: number; max: number; unit: string; };
}

// ─── Custom tooltip ────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl px-4 py-3 shadow-2xl"
            style={{ background: T.card, border: `1px solid ${T.borderHi}` }}>
            <p className="text-[11px] mb-1.5" style={{ color: T.muted }}>Hour {label}</p>
            <p className="text-[15px] font-semibold" style={{ color: T.blue }}>
                {payload[0].value?.toFixed(2)}
                <span className="text-[12px] font-normal ml-1" style={{ color: T.muted }}>ng/mL</span>
            </p>
        </div>
    );
}

// ─── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, unit, icon: Icon, color, dim, i }: any) {
    return (
        <motion.div custom={i} initial="hidden" animate="visible" variants={cv}
            className="rounded-2xl px-5 py-4 relative overflow-hidden"
            style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: color }} />
            <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-medium" style={{ color: T.muted }}>{label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: dim }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
            </div>
            <div className="flex items-baseline gap-1.5">
                <span className="text-[26px] font-semibold leading-none" style={{ color: T.text }}>{value}</span>
                <span className="text-[12px]" style={{ color: T.muted }}>{unit}</span>
            </div>
        </motion.div>
    );
}

export default function PKSimulationsPage() {
    const [medications, setMedications]   = useState<Medication[]>([]);
    const [selectedMed, setSelectedMed]   = useState<Medication | null>(null);
    const [doseOverride, setDoseOverride] = useState('');
    const [loadingMeds, setLoadingMeds]   = useState(true);
    const [simulating, setSimulating]     = useState(false);
    const [pkData, setPkData]             = useState<PKData | null>(null);
    const [error, setError]               = useState<string | null>(null);

    const searchParams = useSearchParams();
    const preselectedMed = searchParams.get('medication');

    useEffect(() => {
        (async () => {
            setLoadingMeds(true);
            try {
                const r = await apiFetch('/pk/medications');
                if (r.success) {
                    setMedications(r.data);
                    
                    // Auto-select and run if param exists
                    if (preselectedMed) {
                        const found = r.data.find((m: any) => m.name.toLowerCase() === preselectedMed.toLowerCase());
                        if (found) {
                            setSelectedMed(found);
                            // We need to trigger simulation after state update, but here we can just call the API directly or wait for another effect
                        }
                    }
                }
            } catch { }
            finally { setLoadingMeds(false); }
        })();
    }, [preselectedMed]);

    // Secondary effect to run simulation once medication is selected via URL
    useEffect(() => {
        if (preselectedMed && selectedMed && selectedMed.name.toLowerCase() === preselectedMed.toLowerCase() && !pkData && !simulating) {
            runSimulation();
        }
    }, [selectedMed, pkData, simulating, preselectedMed]);

    const runSimulation = async () => {
        if (!selectedMed) return;
        setSimulating(true); setError(null);
        try {
            const r = await apiFetch('/pk/simulate', {
                method: 'POST',
                body: JSON.stringify({ medication: selectedMed.name, dose_mg: doseOverride || selectedMed.dosage })
            });
            if (r.success) setPkData(r.data);
            else setError(r.message || 'Simulation failed');
        } catch (e: any) { setError(e.message || 'Simulation failed'); }
        finally { setSimulating(false); }
    };

    const chartData = pkData?.timepoints?.map((t, i) => ({
        time: t, concentration: pkData.concentrations?.[i] ?? 0
    })) ?? [];

    const inRange = pkData && pkData.cmax >= pkData.therapeutic_range.min && pkData.cmax <= pkData.therapeutic_range.max;

    return (
        <div className="max-w-6xl mx-auto pb-20 space-y-6">

            {/* ── Page header ── */}
            <div className="flex items-end justify-between gap-4 pt-2">
                <div>
                    <h1 className="text-[26px] font-semibold tracking-[-0.4px]" style={{ color: T.text }}>
                        PK Simulations
                    </h1>
                    <p className="text-[13px] mt-1 flex items-center gap-2" style={{ color: T.muted }}>
                        <FlaskConical className="w-3.5 h-3.5" />
                        Pharmacokinetic concentration modeling over 24 hours
                    </p>
                </div>
                {pkData && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                        style={{ background: inRange ? `${T.green}15` : `${T.amber}15`, border: `1px solid ${inRange ? T.green : T.amber}30` }}>
                        {inRange
                            ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: T.green }} />
                            : <AlertCircle className="w-3.5 h-3.5" style={{ color: T.amber }} />}
                        <span className="text-[12px] font-medium" style={{ color: inRange ? T.green : T.amber }}>
                            {inRange ? 'Within therapeutic range' : 'Review required'}
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">

                {/* ── Sidebar ── */}
                <aside className="space-y-4">
                    {/* Medication list */}
                    <div className="rounded-2xl overflow-hidden"
                        style={{ background: T.card, border: `1px solid ${T.border}` }}>
                        <div className="px-5 py-4 flex items-center gap-2"
                            style={{ borderBottom: `1px solid ${T.border}` }}>
                            <Search className="w-3.5 h-3.5" style={{ color: T.muted }} />
                            <p className="text-[13px] font-semibold" style={{ color: T.text }}>Select medication</p>
                        </div>

                        <div className="p-3 max-h-[380px] overflow-y-auto space-y-1.5 custom-scrollbar">
                            {loadingMeds ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-3">
                                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.blue }} />
                                    <p className="text-[12px]" style={{ color: T.muted }}>Loading…</p>
                                </div>
                            ) : medications.length === 0 ? (
                                <div className="py-10 text-center">
                                    <Pill className="w-7 h-7 mx-auto mb-2" style={{ color: T.muted }} />
                                    <p className="text-[13px]" style={{ color: T.muted }}>No medications found</p>
                                    <p className="text-[11px] mt-1" style={{ color: T.muted }}>Add medications to patient profiles first.</p>
                                </div>
                            ) : (
                                medications.map(med => {
                                    const sel = selectedMed?.id === med.id;
                                    return (
                                        <button key={med.id}
                                            onClick={() => { setSelectedMed(med); setDoseOverride(''); }}
                                            className="w-full px-4 py-3 rounded-xl text-left transition-all"
                                            style={{
                                                background: sel ? `${T.blue}12` : 'transparent',
                                                border: `1px solid ${sel ? T.blue : T.border}`,
                                            }}
                                            onMouseEnter={e => { if (!sel) (e.currentTarget.style.background = T.cardHi); }}
                                            onMouseLeave={e => { if (!sel) (e.currentTarget.style.background = 'transparent'); }}>
                                            <p className="text-[14px] font-medium" style={{ color: sel ? T.blue : T.text }}>{med.name}</p>
                                            <p className="text-[12px] mt-0.5" style={{ color: T.muted }}>{med.dosage}</p>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Dose input + run button */}
                    <AnimatePresence>
                        {selectedMed && (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="rounded-2xl p-5 space-y-4"
                                style={{ background: T.card, border: `1px solid ${T.border}` }}>
                                <div>
                                    <p className="text-[11px] font-medium mb-2" style={{ color: T.muted }}>Dose override (mg)</p>
                                    <input type="text" value={doseOverride}
                                        onChange={e => setDoseOverride(e.target.value)}
                                        placeholder={selectedMed.dosage}
                                        className="w-full px-4 py-3 rounded-xl text-[14px] font-normal focus:outline-none transition-all"
                                        style={{ background: T.faint, color: T.text, border: `1px solid ${T.border}` }}
                                        onFocus={e => (e.currentTarget.style.borderColor = T.blue + '60')}
                                        onBlur={e => (e.currentTarget.style.borderColor = T.border)} />
                                    <p className="text-[11px] mt-1.5" style={{ color: T.muted }}>
                                        Leave empty to use {selectedMed.dosage}
                                    </p>
                                </div>

                                <button onClick={runSimulation} disabled={simulating}
                                    className="w-full py-3.5 rounded-xl text-[14px] font-semibold text-white flex items-center justify-center gap-2 transition-colors hover:bg-blue-500 disabled:opacity-50"
                                    style={{ background: T.blue }}>
                                    {simulating
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
                                        : <><Zap className="w-4 h-4" /> Run Simulation</>}
                                </button>

                                {error && (
                                    <p className="text-[12px] flex items-start gap-1.5" style={{ color: T.red }}>
                                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {error}
                                    </p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Info card */}
                    <div className="rounded-2xl px-5 py-4 flex items-start gap-3"
                        style={{ background: T.violetDim, border: `1px solid ${T.violet}22` }}>
                        <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: T.violet }} />
                        <p className="text-[12px] leading-relaxed" style={{ color: T.sub }}>
                            PK simulations model how a drug moves through the body over 24 hours using one-compartment pharmacokinetic equations.
                        </p>
                    </div>
                </aside>

                {/* ── Main content ── */}
                <main className="space-y-5 min-w-0">
                    <AnimatePresence mode="wait">
                        {!pkData ? (
                            <motion.div key="empty"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center rounded-2xl"
                                style={{ height: 560, background: T.card, border: `1px dashed ${T.border}` }}>
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                                    style={{ background: T.blueDim }}>
                                    <BarChart3 className="w-7 h-7" style={{ color: T.blue }} />
                                </div>
                                <p className="text-[17px] font-semibold mb-2" style={{ color: T.text }}>Ready to simulate</p>
                                <p className="text-[13px] text-center max-w-xs leading-relaxed" style={{ color: T.muted }}>
                                    Select a medication from the list and click Run Simulation to generate the concentration-time curve.
                                </p>
                                {selectedMed && (
                                    <button onClick={runSimulation} disabled={simulating}
                                        className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors hover:bg-blue-500"
                                        style={{ background: T.blue }}>
                                        <Zap className="w-4 h-4" /> Simulate {selectedMed.name}
                                    </button>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div key="results"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="space-y-5">

                                {/* ── Stat strip ── */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <StatCard i={0} label="Peak concentration" value={pkData.cmax} unit="ng/mL"
                                        icon={TrendingUp} color={T.blue}   dim={T.blueDim}   />
                                    <StatCard i={1} label="Time to peak"       value={pkData.tmax}         unit="hours"
                                        icon={Clock}      color={T.amber}  dim={T.amberDim}  />
                                    <StatCard i={2} label="Half-life"          value={pkData.half_life}     unit="hours"
                                        icon={Activity}   color={T.violet} dim={T.violetDim} />
                                    <StatCard i={3} label="Bioavailability"    value={`${pkData.bioavailability}`} unit="%"
                                        icon={Zap}        color={T.teal}   dim={T.tealDim}   />
                                </div>

                                {/* ── Chart ── */}
                                <motion.div custom={4} initial="hidden" animate="visible" variants={cv}
                                    className="rounded-2xl overflow-hidden"
                                    style={{ background: T.card, border: `1px solid ${T.border}` }}>

                                    {/* Chart header */}
                                    <div className="px-6 py-5 flex items-center justify-between"
                                        style={{ borderBottom: `1px solid ${T.border}` }}>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <p className="text-[16px] font-semibold" style={{ color: T.text }}>
                                                    Concentration profile
                                                </p>
                                                <span className="text-[11px] px-2.5 py-1 rounded-lg font-medium"
                                                    style={{ background: T.blueDim, color: T.blue, border: `1px solid ${T.blue}22` }}>
                                                    {pkData.medication}
                                                </span>
                                                <span className="text-[11px] px-2.5 py-1 rounded-lg font-medium"
                                                    style={{ background: T.faint, color: T.muted, border: `1px solid ${T.border}` }}>
                                                    ng/mL
                                                </span>
                                            </div>
                                            <p className="text-[12px]" style={{ color: T.muted }}>
                                                24-hour simulation · Therapeutic range shaded in green
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 text-[12px]">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-8 h-0.5 rounded-full" style={{ background: T.blue }} />
                                                <span style={{ color: T.muted }}>Concentration</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded-sm opacity-40" style={{ background: T.green }} />
                                                <span style={{ color: T.muted }}>Therapeutic</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chart */}
                                    <div className="px-4 py-6 h-[360px]">
                                        <ErrorBoundary fallback="Simulation Chart Error">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
                                                    <defs>
                                                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%"   stopColor={T.blue} stopOpacity={0.25} />
                                                            <stop offset="100%" stopColor={T.blue} stopOpacity={0.02} />
                                                        </linearGradient>
                                                    </defs>

                                                    <CartesianGrid stroke={T.border} strokeDasharray="0" vertical={false} />

                                                    <XAxis dataKey="time" stroke="transparent" tick={{ fill: T.muted, fontSize: 11 }}
                                                        tickLine={false} axisLine={false}
                                                        label={{ value: 'Hours post dose', position: 'bottom', offset: 10, fill: T.muted, fontSize: 12 }} />
                                                    <YAxis stroke="transparent" tick={{ fill: T.muted, fontSize: 11 }}
                                                        tickLine={false} axisLine={false}
                                                        label={{ value: 'ng/mL', angle: -90, position: 'insideLeft', offset: 10, fill: T.muted, fontSize: 12 }} />

                                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: T.borderHi, strokeWidth: 1 }} />

                                                    {/* Therapeutic range fill */}
                                                    <ReferenceArea y1={pkData.therapeutic_range.min} y2={pkData.therapeutic_range.max}
                                                        fill={T.green} fillOpacity={0.06} />

                                                    {/* Min / max lines */}
                                                    <ReferenceLine y={pkData.therapeutic_range.min} stroke={T.green} strokeOpacity={0.4}
                                                        strokeDasharray="5 4"
                                                        label={{ value: 'Min', position: 'right', fill: T.green, fontSize: 11 }} />
                                                    <ReferenceLine y={pkData.therapeutic_range.max} stroke={T.green} strokeOpacity={0.4}
                                                        strokeDasharray="5 4"
                                                        label={{ value: 'Max', position: 'right', fill: T.green, fontSize: 11 }} />

                                                    <Area type="monotone" dataKey="concentration"
                                                        stroke={T.blue} strokeWidth={2.5}
                                                        fill="url(#grad)"
                                                        dot={false}
                                                        activeDot={{ r: 5, fill: T.blue, stroke: T.card, strokeWidth: 2 }}
                                                        animationDuration={1600} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </ErrorBoundary>
                                    </div>
                                </motion.div>

                                {/* ── Interpretation ── */}
                                <motion.div custom={5} initial="hidden" animate="visible" variants={cv}
                                    className="rounded-2xl overflow-hidden"
                                    style={{ background: T.card, border: `1px solid ${T.border}` }}>

                                    <div className="px-6 py-4 flex items-center justify-between"
                                        style={{ borderBottom: `1px solid ${T.border}` }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                                style={{ background: T.blueDim }}>
                                                <Brain className="w-4 h-4" style={{ color: T.blue }} />
                                            </div>
                                            <p className="text-[15px] font-semibold" style={{ color: T.text }}>Clinical interpretation</p>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium"
                                            style={{
                                                background: inRange ? T.greenDim : T.amberDim,
                                                color: inRange ? T.green : T.amber,
                                                border: `1px solid ${inRange ? T.green : T.amber}25`,
                                            }}>
                                            {inRange
                                                ? <><CheckCircle2 className="w-3.5 h-3.5" /> Within therapeutic range</>
                                                : <><AlertCircle className="w-3.5 h-3.5" /> Review recommended</>}
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-0">
                                        {/* Elimination dynamics */}
                                        <div className="px-6 py-5"
                                            style={{ borderRight: `1px solid ${T.border}` }}>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: T.muted }}>
                                                Elimination dynamics
                                            </p>
                                            <p className="text-[14px] leading-relaxed" style={{ color: T.sub }}>
                                                Peak of{' '}
                                                <strong style={{ color: T.text }}>{pkData.cmax} {pkData.therapeutic_range.unit}</strong>{' '}
                                                reached at{' '}
                                                <strong style={{ color: T.text }}>{pkData.tmax} hours</strong>. With a half-life of{' '}
                                                <strong style={{ color: T.text }}>{pkData.half_life} hours</strong>, the drug will be substantially cleared by{' '}
                                                <strong style={{ color: T.text }}>{Math.round(pkData.half_life * 5)} hours</strong>.
                                            </p>
                                        </div>

                                        {/* Distribution */}
                                        <div className="px-6 py-5">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: T.muted }}>
                                                Steady state impact
                                            </p>
                                            <p className="text-[14px] leading-relaxed" style={{ color: T.sub }}>
                                                Volume of distribution{' '}
                                                <strong style={{ color: T.text }}>{pkData.vd} L</strong>{' '}
                                                indicates tissue vs. plasma affinity.{' '}
                                                <strong style={{ color: T.text }}>{pkData.bioavailability}%</strong>{' '}
                                                absorption estimated across the metabolic barrier.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Metric summary row */}
                                    <div className="grid grid-cols-4 gap-0"
                                        style={{ borderTop: `1px solid ${T.border}` }}>
                                        {[
                                            { label: 'Therapeutic min', value: `${pkData.therapeutic_range.min}`, unit: pkData.therapeutic_range.unit, color: T.green },
                                            { label: 'Therapeutic max', value: `${pkData.therapeutic_range.max}`, unit: pkData.therapeutic_range.unit, color: T.green },
                                            { label: 'Peak / Cmax',     value: `${pkData.cmax}`,                 unit: pkData.therapeutic_range.unit, color: inRange ? T.blue : T.amber },
                                            { label: 'Volume of dist.', value: `${pkData.vd}`,                  unit: 'L',                           color: T.violet },
                                        ].map((m, i) => (
                                            <div key={i} className="px-5 py-4"
                                                style={{ borderRight: i < 3 ? `1px solid ${T.border}` : 'none' }}>
                                                <p className="text-[11px] mb-1" style={{ color: T.muted }}>{m.label}</p>
                                                <p className="text-[18px] font-semibold" style={{ color: m.color }}>
                                                    {m.value}
                                                    <span className="text-[12px] font-normal ml-1" style={{ color: T.muted }}>{m.unit}</span>
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>

                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
            `}</style>
        </div>
    );
}
