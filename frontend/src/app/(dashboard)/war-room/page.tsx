"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
    Shield, Activity, AlertTriangle, CheckCircle2,
    TrendingUp, RefreshCw, Search, ChevronLeft,
    ArrowRight, ShieldX, Users, Clock
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { useRouter } from 'next/navigation';

// ─── Design tokens ────────────────────────────────────────
const T = {
    bg:       '#070c14',
    surface:  '#0d1525',
    card:     '#0f1c2e',
    cardHi:   '#122035',
    border:   '#182338',
    borderHi: '#1f2e47',
    text:     '#e2e8f0',
    muted:    '#4a607a',
    faint:    '#0a1628',
};

interface TelemetryPoint {
    senior_id: number;
    senior_name: string;
    risk_score: number;
    status: 'Stable' | 'Attention' | 'Critical';
    sparkline: number[];
    heatmap: Array<{ time: string; hour: number; status: 'taken' | 'missed' | 'upcoming'; med_name: string }>;
    last_updated: string;
}

const statusConfig = {
    Stable:    { color: '#22c55e', bg: '#0a1f0a', border: '#22c55e22', label: 'Stable' },
    Attention: { color: '#f59e0b', bg: '#1a1100', border: '#f59e0b22', label: 'Needs attention' },
    Critical:  { color: '#ef4444', bg: '#1f0a0a', border: '#ef444422', label: 'Critical' },
};

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.06,
            duration: 0.32,
            ease: 'easeOut'
        }
    }),
};

export default function WarRoomPage() {
    const { user, loading: userLoading } = useUser();
    const [data, setData]           = useState<TelemetryPoint[]>([]);
    const [loading, setLoading]     = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const router = useRouter();

    const fetchTelemetry = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiFetch('/caregiver/telemetry-fleet');
            if (res.success && res.data) { setData(res.data); setLastRefresh(new Date()); }
            else setData([]);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchTelemetry();
        const t = setInterval(fetchTelemetry, 30000);
        return () => clearInterval(t);
    }, [fetchTelemetry]);

    const filtered = (data || []).filter(s =>
        s.senior_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stable   = filtered.filter(s => s.status === 'Stable').length;
    const attn     = filtered.filter(s => s.status === 'Attention').length;
    const critical = filtered.filter(s => s.status === 'Critical').length;

    // Access guard
    if (!userLoading && user?.role !== 'caregiver') return (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2"
                style={{ background: '#1f0a0a', border: '1px solid #ef444422' }}>
                <ShieldX className="w-6 h-6" style={{ color: '#ef4444' }} />
            </div>
            <p className="text-[16px] font-semibold" style={{ color: T.text }}>Access restricted</p>
            <p className="text-[13px]" style={{ color: T.muted }}>This page is only available to caregivers.</p>
            <button onClick={() => router.push('/dashboard')}
                className="mt-2 px-5 py-2.5 rounded-[10px] text-[13px] font-medium transition-colors"
                style={{ background: T.surface, color: T.muted, border: `1px solid ${T.border}` }}>
                Back to Dashboard
            </button>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto pb-20 space-y-7">

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
                        Patient Monitor
                    </h1>
                    <p className="text-[13px] mt-1 flex items-center gap-2" style={{ color: T.muted }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        Live · Updates every 30s · Last synced {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: T.muted }} />
                        <input
                            type="text"
                            placeholder="Search patients…"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2.5 rounded-[10px] text-[13px] font-normal focus:outline-none transition-all w-56"
                            style={{
                                background: T.surface,
                                border: `1px solid ${T.border}`,
                                color: T.text,
                            }}
                            onFocus={e => (e.currentTarget.style.borderColor = '#2563eb50')}
                            onBlur={e => (e.currentTarget.style.borderColor = T.border)}
                        />
                    </div>
                    {/* Refresh */}
                    <button onClick={fetchTelemetry}
                        className="w-10 h-10 flex items-center justify-center rounded-[10px] transition-colors"
                        style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.muted }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.borderHi; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.color = T.muted; }}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ── Summary strip ── */}
            {!loading && filtered.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Stable',          value: stable,   color: '#22c55e', bg: '#0a1f0a' },
                        { label: 'Needs attention', value: attn,     color: '#f59e0b', bg: '#1a1100' },
                        { label: 'Critical',        value: critical, color: '#ef4444', bg: '#1f0a0a' },
                    ].map(s => (
                        <div key={s.label} className="rounded-xl px-4 py-3.5 flex items-center gap-3"
                            style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                            <div>
                                <p className="text-[20px] font-semibold leading-none" style={{ color: T.text }}>{s.value}</p>
                                <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Loading ── */}
            {loading && data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 rounded-2xl gap-4"
                    style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-[13px]" style={{ color: T.muted }}>Loading patient data…</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <AnimatePresence mode="popLayout">
                        {filtered.map((senior, idx) => {
                            const sc = statusConfig[senior.status] ?? statusConfig.Stable;
                            const safeRisk = Math.min(100, Math.max(0, senior.risk_score));

                            return (
                                <motion.div
                                    key={senior.senior_id}
                                    custom={idx}
                                    initial="hidden"
                                    animate="visible"
                                    variants={cardVariants}
                                    onClick={() => router.push(`/dashboard?senior_id=${senior.senior_id}`)}
                                    className="rounded-xl flex flex-col gap-5 p-5 cursor-pointer group transition-colors"
                                    style={{
                                        background: T.card,
                                        border: `1px solid ${T.border}`,
                                        borderLeft: `2px solid ${sc.color}`,
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = T.cardHi)}
                                    onMouseLeave={e => (e.currentTarget.style.background = T.card)}
                                >
                                    {/* ── Card header ── */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            {/* Avatar */}
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0"
                                                style={{ background: T.faint, color: '#3b82f6', border: `1px solid ${T.borderHi}` }}>
                                                {senior.senior_name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-[15px] font-medium" style={{ color: T.text }}>{senior.senior_name}</p>
                                                {/* Status badge */}
                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md mt-1"
                                                    style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                                                    <span className="w-1.5 h-1.5 rounded-full"
                                                        style={{ background: sc.color, animation: senior.status === 'Critical' ? 'pulse 1.5s infinite' : 'none' }} />
                                                    {sc.label}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Risk score */}
                                        <div className="text-right">
                                            <p className="text-[11px] mb-1" style={{ color: T.muted }}>Risk score</p>
                                            <p className="text-[28px] font-semibold leading-none tracking-[-0.5px]"
                                                style={{ color: safeRisk > 70 ? '#ef4444' : safeRisk > 40 ? '#f59e0b' : '#22c55e' }}>
                                                {safeRisk}
                                            </p>
                                        </div>
                                    </div>

                                    {/* ── Charts row ── */}
                                    <div className="grid grid-cols-2 gap-3">

                                        {/* Sparkline */}
                                        <div className="rounded-xl p-3"
                                            style={{ background: T.faint, border: `1px solid ${T.border}` }}>
                                            <p className="text-[11px] font-medium mb-2 flex items-center gap-1.5"
                                                style={{ color: T.muted }}>
                                                <TrendingUp className="w-3 h-3" /> 7-day adherence
                                            </p>
                                            <div className="h-14">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={senior.sparkline.map((v, i) => ({ v, i }))}>
                                                        <YAxis hide domain={[0, 100]} />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="v"
                                                            stroke={senior.status === 'Critical' ? '#ef4444' : '#3b82f6'}
                                                            strokeWidth={2}
                                                            dot={false}
                                                            isAnimationActive
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Dose heatmap */}
                                        <div className="rounded-xl p-3"
                                            style={{ background: T.faint, border: `1px solid ${T.border}` }}>
                                            <p className="text-[11px] font-medium mb-2 flex items-center gap-1.5"
                                                style={{ color: T.muted }}>
                                                <Activity className="w-3 h-3" /> Today's doses
                                            </p>
                                            <div className="flex gap-1 h-14 items-end">
                                                {senior.heatmap.length > 0 ? (
                                                    senior.heatmap.map((dose, i) => (
                                                        <div key={i} title={`${dose.med_name} · ${dose.time}`}
                                                            className="flex-1 rounded-sm transition-opacity hover:opacity-80"
                                                            style={{
                                                                height: '100%',
                                                                background:
                                                                    dose.status === 'taken'    ? '#22c55e30' :
                                                                    dose.status === 'missed'   ? '#ef444430' :
                                                                    '#1e2d3d',
                                                                border: `1px solid ${
                                                                    dose.status === 'taken'    ? '#22c55e20' :
                                                                    dose.status === 'missed'   ? '#ef444420' :
                                                                    T.border
                                                                }`,
                                                            }} />
                                                    ))
                                                ) : (
                                                    <div className="flex-1 flex items-center justify-center rounded-lg"
                                                        style={{ border: `1px dashed ${T.border}` }}>
                                                        <span className="text-[11px]" style={{ color: T.muted }}>No data</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Card footer ── */}
                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <span className="text-[11px]" style={{ color: T.muted }}>
                                                Updated {new Date(senior.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[12px] font-medium transition-colors"
                                            style={{ color: T.muted }}
                                            onMouseEnter={e => (e.currentTarget.style.color = '#3b82f6')}
                                            onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
                                            View details
                                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* ── Empty state ── */}
            {filtered.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-24 rounded-2xl gap-3 text-center"
                    style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1"
                        style={{ background: T.faint, border: `1px solid ${T.border}` }}>
                        <Users className="w-5 h-5" style={{ color: T.muted }} />
                    </div>
                    <p className="text-[15px] font-medium" style={{ color: T.text }}>
                        {searchTerm ? 'No patients match your search' : 'No patients connected yet'}
                    </p>
                    <p className="text-[13px]" style={{ color: T.muted }}>
                        {searchTerm ? 'Try a different name.' : 'Connect a patient from the My Patients page.'}
                    </p>
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')}
                            className="mt-2 px-4 py-2 rounded-[9px] text-[13px] font-medium transition-colors"
                            style={{ background: T.faint, color: '#3b82f6', border: `1px solid ${T.border}` }}>
                            Clear search
                        </button>
                    )}
                </div>
            )}

            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </div>
    );
}
