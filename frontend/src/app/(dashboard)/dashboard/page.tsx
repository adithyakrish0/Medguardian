"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useDashboardData } from '@/hooks/useDashboardData';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/hooks/useUser';
import { useVoiceAlert } from '@/hooks/useVoiceAlert';
import { apiFetch } from '@/lib/api';
import { useSearchParams, useRouter } from 'next/navigation';
import AIVerificationModal from '@/components/AIVerificationModal';
import RouteLoader from '@/components/RouteLoader';
import {
    Activity, Clock, CheckCircle2, AlertCircle, AlertTriangle,
    ArrowRight, Users, Shield, Camera, Loader2,
    Brain, Pill, MessageCircle, Eye, TrendingUp,
    ChevronRight, Calendar, Star, Zap, Heart, FlaskConical
} from 'lucide-react';
import AdherenceChart from '@/components/AdherenceChart';
import PhoneSetupModal from '@/components/PhoneSetupModal';
import { connectSocket } from '@/lib/socket';
import { useToast } from '@/components/NiceToast';
import { formatTimeForVoice } from '@/lib/utils';

// ─── Tokens ───────────────────────────────────────────────
const T = {
    bg:      '#070c14',
    surface: '#0d1525',
    card:    '#0f1c2e',
    cardHi:  '#122035',
    border:  '#182338',
    borderHi:'#253550',
    text:    '#f1f5f9',
    sub:     '#94a3b8',
    muted:   '#4a607a',
    faint:   '#0a1628',
    blue:    '#3b82f6',
    blueDim: '#172038',
    teal:    '#14b8a6',
    tealDim: '#071a18',
    red:     '#ef4444',
    redDim:  '#1f0a0a',
    green:   '#22c55e',
    greenDim:'#0a1f0a',
    amber:   '#f59e0b',
};

const cardV = {
    hidden:  { opacity: 0, y: 14 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.38, ease: 'easeOut' as const } }),
};

// ─── Pill icon ───────────────────────────────────────────
function MedIcon({ color, dim }: { color: string; dim: string }) {
    return (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: dim }}>
            <Pill className="w-[18px] h-[18px]" style={{ color }} />
        </div>
    );
}

// ─── Stat tile ───────────────────────────────────────────
function StatTile({ value, label, accent, i }: { value: string | number; label: string; accent: string; i: number }) {
    return (
        <motion.div custom={i} initial="hidden" animate="visible" variants={cardV}
            className="rounded-2xl px-5 py-4 text-center relative overflow-hidden"
            style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accent }} />
            <p className="text-[32px] font-semibold leading-none mb-1.5" style={{ color: T.text }}>{value}</p>
            <p className="text-[13px]" style={{ color: T.muted }}>{label}</p>
        </motion.div>
    );
}

// ─── Quick-link card ─────────────────────────────────────
function QuickCard({ icon: Icon, iconColor, iconBg, title, desc, actionLabel, href, onClick, i }: any) {
    return (
        <motion.div custom={i} initial="hidden" animate="visible" variants={cardV}
            className="rounded-2xl p-5 flex flex-col gap-4"
            style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: iconBg }}>
                    <Icon className="w-5 h-5" style={{ color: iconColor }} />
                </div>
            </div>
            <div>
                <p className="text-[16px] font-semibold mb-1" style={{ color: T.text }}>{title}</p>
                <p className="text-[13px] leading-relaxed" style={{ color: T.muted }}>{desc}</p>
            </div>
            {href ? (
                <Link href={href}>
                    <button className="w-full py-2.5 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 transition-colors hover:opacity-90"
                        style={{ background: iconBg, color: iconColor, border: `1px solid ${iconColor}22` }}>
                        {actionLabel} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </Link>
            ) : (
                <button onClick={onClick}
                    className="w-full py-2.5 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 transition-colors hover:opacity-90"
                    style={{ background: iconBg, color: iconColor, border: `1px solid ${iconColor}22` }}>
                    {actionLabel} <ArrowRight className="w-3.5 h-3.5" />
                </button>
            )}
        </motion.div>
    );
}

// ─── Adherence ring ──────────────────────────────────────
function AdherenceRing({ pct }: { pct: number }) {
    const r = 44; const circ = 2 * Math.PI * r;
    const safe = Math.min(100, Math.max(0, pct));
    const color = safe > 80 ? T.teal : safe > 60 ? T.amber : T.red;
    return (
        <div className="relative w-28 h-28 mx-auto">
            <svg className="w-full h-full -rotate-90">
                <circle cx="56" cy="56" r={r} fill="none" stroke={T.faint} strokeWidth="6" />
                <circle cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={circ * (1 - safe / 100)}
                    style={{ transition: 'stroke-dashoffset 1s ease' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[22px] font-semibold" style={{ color }}>{safe}%</p>
                <p className="text-[10px]" style={{ color: T.muted }}>adherence</p>
            </div>
        </div>
    );
}

// ─── Tip card ────────────────────────────────────────────
const tips = [
    "Taking medications at the same time each day improves adherence by up to 30%.",
    "Keeping a glass of water next to your medications makes it easier to remember.",
    "Setting a daily alarm helps build a consistent medication routine.",
    "Pairing medication with a meal can reduce stomach upset for many drugs.",
];

function DailyTip() {
    const tip = tips[new Date().getDate() % tips.length];
    return (
        <motion.div custom={8} initial="hidden" animate="visible" variants={cardV}
            className="rounded-2xl px-5 py-4 flex items-start gap-4"
            style={{ background: T.card, border: `1px solid ${T.border}`, borderLeft: `2px solid ${T.amber}` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: '#1a1100' }}>
                <Star className="w-4 h-4" style={{ color: T.amber }} />
            </div>
            <div>
                <p className="text-[12px] font-medium mb-1" style={{ color: T.amber }}>Daily tip</p>
                <p className="text-[13px] leading-relaxed" style={{ color: T.sub }}>{tip}</p>
            </div>
        </motion.div>
    );
}

// ─── Senior Dashboard ─────────────────────────────────────
function SeniorDashboardView({ data, user, onRefresh, onRefreshUser, skippingId, setSkippingId }: any) {
    const nextMed      = data?.schedule?.upcoming?.[0];
    const overdueMeds  = data?.schedule?.missed || [];
    const takenToday   = data?.schedule?.taken?.length ?? 0;
    const adherencePct = data?.adherence?.percentage ? Math.round(data.adherence.percentage) : 85;
    const totalToday   = (data?.schedule?.taken?.length || 0) + (data?.schedule?.missed?.length || 0) + (data?.schedule?.upcoming?.length || 0);

    const { showToast }                 = useToast();
    const [verifyingMed, setVerifyingMed] = useState<{ id: number; name: string } | null>(null);
    const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
    const [greeting, setGreeting]       = useState('Good morning');
    const { speak }                     = useVoiceAlert();
    const hasSpokenRef                  = useRef(false);
    const router                        = useRouter();

    const [lastMedPK, setLastMedPK]     = useState<any>(null);
    const [pkLoading, setPkLoading]     = useState(false);

    useEffect(() => {
        const fetchLastMedPK = async () => {
            const taken = data?.schedule?.taken || [];
            if (taken.length > 0) {
                const last = taken[taken.length - 1];
                setPkLoading(true);
                try {
                    const r = await apiFetch('/pk/simulate', {
                        method: 'POST',
                        body: JSON.stringify({ medication: last.name, dose_mg: last.dosage || '10mg' })
                    });
                    if (r.success) setLastMedPK(r.data);
                } catch { }
                finally { setPkLoading(false); }
            }
        };
        if (data?.schedule?.taken) fetchLastMedPK();
    }, [data?.schedule?.taken]);

    useEffect(() => {
        const h = new Date().getHours();
        setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
    }, []);

    useEffect(() => {
        if (skippingId && data?.schedule) {
            const isPending = [...(data.schedule.missed || []), ...(data.schedule.upcoming || [])].some((m: any) => m.id === skippingId);
            if (!isPending) setSkippingId(null);
        }
    }, [data, skippingId, setSkippingId]);

    useEffect(() => {
        if (data?.schedule && !hasSpokenRef.current) {
            hasSpokenRef.current = true;
            if (overdueMeds.length > 0) speak(`You have ${overdueMeds.length} overdue medication${overdueMeds.length > 1 ? 's' : ''}. ${overdueMeds[0].name} was scheduled at ${formatTimeForVoice(overdueMeds[0].scheduled_time)}.`);
            else if (nextMed) speak(`Your next dose is ${nextMed.name} at ${formatTimeForVoice(nextMed.time)}.`);
        }
    }, [data]);

    useEffect(() => {
        if (!user?.id) return;
        const socket = connectSocket(user.id);
        socket.on('medication_reminder', (p: any) => {
            if (p.type === 'caregiver_nudge') { speak('Your caregiver sent you a reminder.'); onRefresh(); }
        });
        socket.on('camera_request', (p: any) => {
            if (user?.camera_auto_accept) { setVerifyingMed({ id: 0, name: 'Caregiver Checkup' }); }
            else onRefresh();
        });
        return () => { socket.off('medication_reminder'); socket.off('camera_request'); };
    }, [user?.id]);

    const markAsTaken = async (id: number, verified: boolean, method: string) =>
        apiFetch(`/medications/${id}/mark-taken`, { method: 'POST', body: JSON.stringify({ verified, verification_method: method }) });

    const firstName = user?.full_name?.split(' ')[0] || 'there';

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
            className="max-w-2xl mx-auto pb-20 space-y-4">

            <PhoneSetupModal isOpen={isPhoneModalOpen} onClose={() => setIsPhoneModalOpen(false)}
                currentPhone={user?.phone} onSuccess={async (p) => { await apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify({ phone: p }) }); await onRefreshUser(); onRefresh(); }} />

            {verifyingMed && (
                <AIVerificationModal medicationId={verifyingMed.id} medicationName={verifyingMed.name}
                    onClose={() => setVerifyingMed(null)}
                    onVerified={async () => {
                        if (verifyingMed.id !== 0) { try { await markAsTaken(verifyingMed.id, true, 'vision_v2'); speak('Verified! Well done.'); } catch { } }
                        setVerifyingMed(null); onRefresh();
                    }} />
            )}

            {/* ── Hero header ── */}
            <motion.div custom={0} initial="hidden" animate="visible" variants={cardV}
                className="rounded-2xl px-6 py-5 flex items-start justify-between"
                style={{ background: T.card, border: `1px solid ${T.border}`, borderLeft: `2px solid ${T.blue}` }}>
                <div>
                    <p className="text-[13px] mb-1" style={{ color: T.muted }}>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                    <h1 className="text-[28px] font-semibold tracking-[-0.5px]" style={{ color: T.text }}>
                        {greeting}, <span style={{ color: T.blue }}>{firstName}</span>
                    </h1>
                    <p className="text-[13px] mt-1" style={{ color: T.muted }}>
                        {takenToday} of {totalToday} medications taken today
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{ background: `${T.teal}15`, border: `1px solid ${T.teal}30` }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: T.teal }} />
                    <span className="text-[12px] font-medium" style={{ color: T.teal }}>Active</span>
                </div>
            </motion.div>

            {/* ── Phone setup banner ── */}
            {!user?.phone && (
                <motion.div custom={0.5} initial="hidden" animate="visible" variants={cardV}
                    className="flex items-center justify-between px-5 py-4 rounded-2xl"
                    style={{ background: `${T.blue}10`, border: `1px solid ${T.blue}25` }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: T.blueDim }}>
                            <Shield className="w-4 h-4" style={{ color: T.blue }} />
                        </div>
                        <div>
                            <p className="text-[14px] font-medium" style={{ color: T.text }}>Complete your setup</p>
                            <p className="text-[12px] mt-0.5" style={{ color: T.muted }}>Add your phone number for emergency alerts</p>
                        </div>
                    </div>
                    <button onClick={() => setIsPhoneModalOpen(true)}
                        className="px-4 py-2 rounded-xl text-[13px] font-medium text-white transition-colors hover:bg-blue-500"
                        style={{ background: T.blue }}>
                        Add Number
                    </button>
                </motion.div>
            )}

            {/* ── Overdue medications ── */}
            {overdueMeds.map((med: any, i: number) => (
                <motion.div key={med.id} custom={i + 1} initial="hidden" animate="visible" variants={cardV}
                    className="px-5 py-4 rounded-2xl flex items-center justify-between gap-4"
                    style={{ background: T.redDim, border: `1px solid ${T.red}20`, borderLeft: `2px solid ${T.red}` }}>
                    <div className="flex items-center gap-4">
                        <MedIcon color={T.red} dim={`${T.red}18`} />
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <AlertCircle className="w-3.5 h-3.5" style={{ color: T.red }} />
                                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: T.red }}>Overdue</span>
                            </div>
                            <p className="text-[17px] font-semibold" style={{ color: T.text }}>{med.name}</p>
                            <p className="text-[12px] flex items-center gap-1.5 mt-0.5" style={{ color: T.muted }}>
                                <Clock className="w-3 h-3" /> Scheduled {med.scheduled_time}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setVerifyingMed({ id: med.id, name: med.name })}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white shrink-0 transition-colors hover:bg-red-500"
                        style={{ background: T.red }}>
                        <Camera className="w-3.5 h-3.5" /> Mark Taken
                    </button>
                </motion.div>
            ))}

            {/* ── Next dose ── */}
            {nextMed ? (
                <motion.div custom={overdueMeds.length + 1} initial="hidden" animate="visible" variants={cardV}
                    className="px-6 py-5 rounded-2xl"
                    style={{ background: T.card, border: `1px solid ${T.borderHi}`, borderLeft: `2px solid ${T.blue}` }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-4" style={{ color: T.muted }}>Next Dose</p>
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <MedIcon color={T.blue} dim={T.blueDim} />
                            <div>
                                <h2 className="text-[24px] font-semibold tracking-[-0.3px]" style={{ color: T.text }}>{nextMed.name}</h2>
                                <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>{nextMed.dosage || 'Standard dose'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[34px] font-semibold tracking-[-0.5px]" style={{ color: T.blue }}>{nextMed.time}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>Today</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setVerifyingMed({ id: nextMed.id, name: nextMed.name })}
                            className="flex-1 h-12 rounded-xl text-[14px] font-semibold text-white flex items-center justify-center gap-2 transition-colors hover:bg-teal-500"
                            style={{ background: T.teal }}>
                            <Camera className="w-4 h-4" /> Verify & Mark Taken
                        </button>
                        <button
                            onClick={async () => {
                                setSkippingId(nextMed.id);
                                try { await apiFetch(`/medications/${nextMed.id}/skip`, { method: 'POST' }); onRefresh(); }
                                catch { setSkippingId(null); }
                            }}
                            disabled={skippingId === nextMed.id}
                            className="h-12 px-6 rounded-xl text-[14px] font-medium transition-colors disabled:opacity-40"
                            style={{ background: T.faint, color: T.sub, border: `1px solid ${T.border}` }}>
                            {skippingId === nextMed.id ? 'Skipping…' : 'Skip'}
                        </button>
                    </div>
                </motion.div>
            ) : overdueMeds.length === 0 && (
                <motion.div custom={1} initial="hidden" animate="visible" variants={cardV}
                    className="px-6 py-10 rounded-2xl text-center"
                    style={{ background: T.card, border: `1px solid ${T.border}` }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{ background: T.tealDim }}>
                        <CheckCircle2 className="w-7 h-7" style={{ color: T.teal }} />
                    </div>
                    <h3 className="text-[20px] font-semibold mb-1" style={{ color: T.text }}>All caught up!</h3>
                    <p className="text-[14px]" style={{ color: T.muted }}>You've taken all your scheduled medications today.</p>
                </motion.div>
            )}

            {/* ── Stats row ── */}
            <div className="grid grid-cols-3 gap-3">
                <StatTile value={takenToday}   label="Taken today"  accent={T.green} i={5} />
                <StatTile value={overdueMeds.length} label="Overdue" accent={overdueMeds.length > 0 ? T.red : T.green} i={6} />
                <StatTile value={`${adherencePct}%`} label="Adherence" accent={T.blue} i={7} />
            </div>

            {/* ── Adherence + quick links ── */}
            <div className="grid grid-cols-2 gap-3">
                {/* Drug Level / PK Card */}
                <motion.div custom={8} initial="hidden" animate="visible" variants={cardV}
                    className="rounded-2xl p-5 flex flex-col gap-3"
                    style={{ background: T.card, border: `1px solid ${T.border}` }}>
                    <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: T.tealDim }}>
                            <FlaskConical className="w-[18px] h-[18px]" style={{ color: T.teal }} />
                        </div>
                        {lastMedPK && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                                style={{ background: T.tealDim, color: T.teal, border: `1px solid ${T.teal}22` }}>
                                Live
                            </span>
                        )}
                    </div>
                    <div>
                        <p className="text-[15px] font-semibold mb-0.5" style={{ color: T.text }}>
                            {pkLoading ? 'Loading PK stats...' : lastMedPK ? `${lastMedPK.medication} Level` : 'No Recent Meds'}
                        </p>
                        <p className="text-[12px] leading-relaxed" style={{ color: T.muted }}>
                            {pkLoading ? 'Calculating concentration curve...' : lastMedPK ? `Half-life: ${lastMedPK.half_life}h · Cmax: ${lastMedPK.cmax}` : 'Taken meds will show PK data here.'}
                        </p>
                    </div>
                    {lastMedPK && (
                        <button onClick={() => router.push(`/pk-simulations?medication=${encodeURIComponent(lastMedPK.medication)}`)}
                            className="w-full mt-1 py-2 rounded-xl text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5"
                            style={{ background: T.tealDim, color: T.teal, border: `1px solid ${T.teal}22` }}>
                            Full Simulation <ArrowRight className="w-3 h-3" />
                        </button>
                    )}
                </motion.div>

                {/* Adherence ring card */}
                <motion.div custom={8} initial="hidden" animate="visible" variants={cardV}
                    className="rounded-2xl p-5 flex flex-col items-center justify-center gap-3"
                    style={{ background: T.card, border: `1px solid ${T.border}` }}>
                    <p className="text-[13px] font-medium self-start" style={{ color: T.muted }}>This week</p>
                    <AdherenceRing pct={adherencePct} />
                    <p className="text-[12px] text-center" style={{ color: T.muted }}>
                        {adherencePct >= 80 ? 'Excellent — keep it up!' : adherencePct >= 60 ? 'Room to improve' : 'Needs attention'}
                    </p>
                </motion.div>

                {/* AI Assistant card */}
                <QuickCard i={9}
                    icon={MessageCircle} iconColor={T.blue} iconBg={T.blueDim}
                    title="AI Assistant"
                    desc="Ask about medications, side effects, or dosage questions anytime."
                    actionLabel="Start Chat" href="/chat" />
            </div>

            {/* ── Second quick-link row ── */}
            <div className="grid grid-cols-2 gap-3">
                <QuickCard i={10}
                    icon={Calendar} iconColor={T.teal} iconBg={T.tealDim}
                    title="Today's Schedule"
                    desc="View your full medication plan and upcoming doses for today."
                    actionLabel="View Schedule" href="/schedule" />

                <QuickCard i={11}
                    icon={Pill} iconColor="#a78bfa" iconBg="#1a1230"
                    title="My Medications"
                    desc="Manage your medication list, train AI, and update dosages."
                    actionLabel="Open List" href="/medications" />
            </div>

            {/* ── Daily tip ── */}
            <DailyTip />

            {/* ── Progress snapshot ── */}
            <motion.div custom={12} initial="hidden" animate="visible" variants={cardV}
                className="rounded-2xl px-6 py-5"
                style={{ background: T.card, border: `1px solid ${T.border}` }}>
                <div className="flex items-center justify-between mb-4">
                    <p className="text-[15px] font-semibold" style={{ color: T.text }}>Today's Progress</p>
                    <p className="text-[12px]" style={{ color: T.muted }}>{totalToday} medications total</p>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden mb-3"
                    style={{ background: T.faint }}>
                    <motion.div initial={{ width: 0 }}
                        animate={{ width: totalToday > 0 ? `${(takenToday / totalToday) * 100}%` : '0%' }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${T.teal}, ${T.blue})` }} />
                </div>
                <div className="flex items-center justify-between text-[12px]" style={{ color: T.muted }}>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: T.teal }} />
                        {takenToday} taken
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: T.red }} />
                        {overdueMeds.length} overdue
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: T.border }} />
                        {(data?.schedule?.upcoming?.length || 0)} upcoming
                    </span>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Circular progress for caregiver ─────────────────────
function CircularProgress({ value, color }: { value: number; color: string }) {
    const r = 18; const circ = 2 * Math.PI * r;
    const offset = circ - (Math.min(value, 100) / 100) * circ;
    return (
        <div className="relative flex items-center justify-center w-12 h-12">
            <svg className="w-full h-full -rotate-90">
                <circle cx="24" cy="24" r={r} fill="none" stroke={T.faint} strokeWidth="3" />
                <circle cx="24" cy="24" r={r} strokeDasharray={circ} strokeDashoffset={offset}
                    strokeLinecap="round" stroke="currentColor" fill="transparent"
                    className={color} strokeWidth="3" />
            </svg>
            <span className="absolute text-[10px] font-bold text-white">{Math.min(value, 100)}%</span>
        </div>
    );
}

// ─── Caregiver dashboard ──────────────────────────────────
function CaregiverDashboardView({ data, user, onSeniorChange, selectedSeniorId, onRefresh }: any) {
    const [seniors, setSeniors]       = useState<any[]>([]);
    const [alerts, setAlerts]         = useState<any[]>([]);
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const { showToast }               = useToast();

    const avgAdherence = seniors.length > 0
        ? Math.max(0, Math.min(100, Math.round(seniors.reduce((a, s) => a + (100 - (s.risk_score || 0)), 0) / seniors.length)))
        : 0;

    useEffect(() => {
        (async () => {
            try {
                const [sr, ar, lr] = await Promise.all([apiFetch('/caregiver/seniors'), apiFetch('/caregiver/alerts'), apiFetch('/caregiver/recent-logs')]);
                if (sr.success) { setSeniors(sr.data); if (!selectedSeniorId && sr.data.length > 0) onSeniorChange(sr.data[0].id); }
                if (ar.success) setAlerts(ar.alerts);
                if (lr.success) setRecentLogs(lr.logs);
            } catch { }
        })();
        if (user?.id) {
            const socket = connectSocket(user.id);
            socket.on('fleet_activity_update', (u: any) => {
                setRecentLogs(p => [{ id: Date.now(), senior_name: u.senior_name, medication_name: u.medication_name, status: u.event_type === 'taken' ? 'verified' : 'skipped', taken_at: u.timestamp }, ...p.slice(0, 14)]);
                onRefresh();
            });
            return () => { socket.off('fleet_activity_update'); };
        }
    }, [user?.id]);

    const requestCamera = async (id: number) => { const r = await apiFetch(`/caregiver/request-camera/${id}`, { method: 'POST' }); if (r.success) showToast(r.message); };

    const topStats = [
        { label: 'Patients',      value: seniors.length,    color: T.blue,  status: seniors.length > 0 ? 'green' : 'amber' },
        { label: 'Avg. Adherence', value: `${avgAdherence}%`, color: T.teal, status: avgAdherence > 80 ? 'green' : avgAdherence > 60 ? 'amber' : 'red' },
        { label: 'Open Alerts',    value: alerts.length,     color: alerts.length > 0 ? T.red : T.muted, status: alerts.length === 0 ? 'green' : 'red' },
    ];
    const statusDot = (s: string) => s === 'green' ? T.green : s === 'amber' ? T.amber : T.red;

    return (
        <div className="space-y-5 pb-32">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topStats.map((stat, i) => (
                    <motion.div key={stat.label} custom={i} initial="hidden" animate="visible" variants={cardV}
                        className="px-5 py-4 rounded-2xl transition-all"
                        style={{ background: T.card, border: `1px solid ${T.border}` }}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[12px] font-medium" style={{ color: T.muted }}>{stat.label}</span>
                            <div className="w-2 h-2 rounded-full" style={{ background: statusDot(stat.status) }} />
                        </div>
                        <p className="text-[32px] font-semibold leading-none" style={{ color: T.text }}>{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-[16px] font-semibold" style={{ color: T.text }}>Patients</p>
                    <p className="text-[12px]" style={{ color: T.muted }}>{seniors.length} connected</p>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                    {seniors.map(s => {
                        const adh = Math.max(0, 100 - Math.min(100, Math.round(s.risk_score || 0)));
                        const sel = selectedSeniorId === s.id;
                        return (
                            <button key={s.id} onClick={() => onSeniorChange(s.id)}
                                className="flex-shrink-0 w-44 p-4 rounded-xl border text-left transition-all"
                                style={{ background: sel ? `${T.blue}12` : T.card, border: `1px solid ${sel ? T.blue : T.border}` }}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: adh > 70 ? T.green : adh > 40 ? T.amber : T.red }} />
                                    <span className="text-[11px] font-semibold" style={{ color: sel ? T.blue : T.muted }}>{adh}%</span>
                                </div>
                                <p className="text-[14px] font-medium truncate" style={{ color: T.text }}>{s.name}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-5">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="lg:col-span-2 rounded-2xl overflow-hidden"
                    style={{ background: T.card, border: `1px solid ${T.border}` }}>
                    <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.border}` }}>
                        <div className="flex items-center gap-2">
                            <p className="text-[15px] font-semibold" style={{ color: T.text }}>Live Activity</p>
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: T.green }} />
                        </div>
                        {selectedSeniorId && (
                            <button onClick={() => requestCamera(selectedSeniorId)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:bg-red-600 hover:text-white"
                                style={{ background: `${T.red}12`, color: T.red, border: `1px solid ${T.red}22` }}>
                                <Camera className="w-3.5 h-3.5" /> Camera Check
                            </button>
                        )}
                    </div>
                    <div className="p-3 max-h-[380px] overflow-y-auto">
                        {recentLogs.length > 0 ? recentLogs.map((log, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl transition-colors"
                                style={{}} onMouseEnter={e => (e.currentTarget.style.background = T.cardHi)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full" style={{ background: log.status === 'verified' ? T.green : T.red }} />
                                    <div>
                                        <p className="text-[14px] font-medium" style={{ color: T.text }}>{log.senior_name}</p>
                                        <p className="text-[12px] mt-0.5" style={{ color: T.muted }}>{log.medication_name}</p>
                                    </div>
                                </div>
                                <span className="text-[12px]" style={{ color: T.muted }}>
                                    {new Date(log.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )) : (
                            <div className="py-20 text-center">
                                <p className="text-[14px]" style={{ color: T.muted }}>No recent activity.</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                    className="rounded-2xl p-6"
                    style={{ background: T.card, border: `1px solid ${T.border}` }}>
                    <p className="text-[15px] font-semibold mb-5" style={{ color: T.text }}>Patient Health</p>
                    <div className="space-y-5">
                        {seniors.map((s, i) => {
                            const adh = Math.max(0, 100 - Math.min(100, Math.round(s.risk_score || 0)));
                            const color = adh > 70 ? 'text-emerald-400' : adh > 40 ? 'text-amber-400' : 'text-red-400';
                            return (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0 mr-4">
                                        <p className="text-[14px] font-medium truncate" style={{ color: T.text }}>{s.name}</p>
                                        <p className="text-[12px] mt-0.5 italic" style={{ color: T.muted }}>
                                            {adh > 70 ? 'Stable' : adh > 40 ? 'Fluctuating' : 'Critical'}
                                        </p>
                                    </div>
                                    <CircularProgress value={adh} color={color} />
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-6"
                style={{ background: T.card, border: `1px solid ${T.border}` }}>
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <div className="grid grid-cols-3 gap-8 md:pr-8 w-full md:w-auto" style={{ borderRight: '1px solid ' + T.border }}>
                        {[
                            { label: 'Activity logs', value: recentLogs.length, color: T.text },
                            { label: 'Open alerts', value: alerts.length, color: alerts.length > 0 ? T.red : T.muted },
                            { label: 'Verified today', value: recentLogs.filter(l => l.status === 'verified').length, color: T.blue },
                        ].map(s => (
                            <div key={s.label}>
                                <p className="text-[12px] mb-1.5" style={{ color: T.muted }}>{s.label}</p>
                                <p className="text-[26px] font-semibold" style={{ color: s.color }}>{s.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Brain className="w-4 h-4" style={{ color: T.green }} />
                            <p className="text-[14px] font-semibold" style={{ color: T.text }}>Summary</p>
                        </div>
                        <p className="text-[13px] leading-relaxed" style={{ color: T.sub }}>
                            All systems are operating normally.
                            {seniors.some(s => s.risk_score > 40)
                                ? ' Some adherence variations detected — monitor closely.'
                                : ' No significant patterns detected across the monitored fleet.'}
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Dashboard content ────────────────────────────────────
function DashboardContent() {
    const searchParams = useSearchParams();
    const [selectedSeniorId, setSelectedSeniorId] = useState<number | undefined>(
        searchParams.get('seniorId') ? Number(searchParams.get('seniorId')) : undefined
    );
    const { data, loading: dataLoading, error, refresh } = useDashboardData(selectedSeniorId);
    const { user, loading: userLoading, refresh: refreshUser } = useUser();
    const [skippingId, setSkippingId] = useState<number | null>(null);
    const [mounted, setMounted]       = useState(false);

    useEffect(() => { setMounted(true); }, []);
    if (!mounted || userLoading) return <RouteLoader />;
    if (error && !dataLoading) return (
        <div className="p-6 rounded-2xl flex items-start gap-3" style={{ background: '#1f0a0a', border: '1px solid #ef444430' }}>
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
                <p className="text-[14px] font-semibold text-red-400">Connection Issue</p>
                <p className="text-[13px] text-slate-500 mt-1">{error}</p>
            </div>
        </div>
    );

    return (
        <div className="w-full">
            {user?.role === 'caregiver' ? (
                <CaregiverDashboardView data={data} user={user}
                    onSeniorChange={setSelectedSeniorId} selectedSeniorId={selectedSeniorId} onRefresh={refresh} />
            ) : (
                <SeniorDashboardView data={data} user={user}
                    onRefresh={refresh} onRefreshUser={refreshUser}
                    skippingId={skippingId} setSkippingId={setSkippingId} />
            )}
        </div>
    );
}

// ─── Page export ──────────────────────────────────────────
export default function DashboardPage() {
    return (
        <Suspense fallback={<RouteLoader />}>
            <DashboardContent />
        </Suspense>
    );
}
