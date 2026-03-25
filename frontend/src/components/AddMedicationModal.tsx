"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Save, Loader2, Bell, Clock, Plus, AlertTriangle,
    ShieldAlert, AlertCircle, CheckCircle2, Sunrise, Sun,
    Sunset, Moon, Zap, Info, Lightbulb, Pill, Calendar,
    FileText, Shield, ChevronDown
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { quickCheckNewMedication, QuickCheckResult, getSeverityClasses, DrugInteraction } from '@/lib/api/interactions';

// ─── Same token system as the rest of the app ─────────────
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

interface AddMedicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (data: any) => Promise<void>;
    seniorId?: number;
}

const TIME_SLOTS = [
    { key: 'morning',   label: 'Morning',   time: '8:00 AM',  icon: Sunrise, color: T.amber,  dim: T.amberDim },
    { key: 'afternoon', label: 'Afternoon',  time: '2:00 PM',  icon: Sun,     color: T.blue,   dim: T.blueDim  },
    { key: 'evening',   label: 'Evening',    time: '6:00 PM',  icon: Sunset,  color: T.violet, dim: T.violetDim },
    { key: 'night',     label: 'Night',      time: '9:00 PM',  icon: Moon,    color: T.teal,   dim: T.tealDim  },
];

// ─── Section label ─────────────────────────────────────────
function SectionLabel({ n, label, icon: Icon, color = T.muted }: { n: string; label: string; icon?: any; color?: string }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold"
                style={{ background: T.faint, color: T.muted, border: `1px solid ${T.border}` }}>
                {n}
            </div>
            {Icon && <Icon className="w-3.5 h-3.5" style={{ color: T.muted }} />}
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: T.muted }}>{label}</p>
            <div className="flex-1 h-px" style={{ background: T.border }} />
        </div>
    );
}

// ─── Field wrapper ─────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[11px] font-medium mb-1.5" style={{ color: T.muted }}>{label}</p>
            {children}
        </div>
    );
}

// ─── Input style helper ────────────────────────────────────
const inputCls = {
    base: `w-full px-4 py-3 rounded-xl text-[14px] font-normal focus:outline-none transition-all`,
    style: { background: T.faint, color: T.text, border: `1px solid ${T.border}` },
};

export default function AddMedicationModal({ isOpen, onClose, onAdd, seniorId }: AddMedicationModalProps) {
    const [formData, setFormData] = useState({
        name: '', dosage: '', instructions: '', priority: 'normal',
        morning: false, afternoon: false, evening: false, night: false,
        custom_reminder_times: [] as string[],
        reminder_enabled: true,
        start_date: '', end_date: '',
    });
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState<string | null>(null);
    const [newCustomTime, setNewCustomTime] = useState('');
    const [interactionCheck, setInteractionCheck] = useState<QuickCheckResult | null>(null);
    const [checkingInteractions, setCheckingInteractions] = useState(false);

    const checkConflicts = async (name: string) => {
        if (!name || name.length < 3) { setInteractionCheck(null); return; }
        try {
            setCheckingInteractions(true);
            const r = await quickCheckNewMedication({ newMedication: name, seniorId });
            setInteractionCheck(r);
        } catch { setInteractionCheck(null); }
        finally { setCheckingInteractions(false); }
    };

    const toggleSlot = (slot: string) => setFormData(p => ({ ...p, [slot]: !p[slot as keyof typeof p] }));

    const addCustomTime = () => {
        if (newCustomTime && !formData.custom_reminder_times.includes(newCustomTime)) {
            setFormData(p => ({ ...p, custom_reminder_times: [...p.custom_reminder_times, newCustomTime].sort() }));
            setNewCustomTime('');
        }
    };

    const removeCustomTime = (t: string) =>
        setFormData(p => ({ ...p, custom_reminder_times: p.custom_reminder_times.filter(x => x !== t) }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError(null);
        try {
            const slotCount = [formData.morning, formData.afternoon, formData.evening, formData.night].filter(Boolean).length + formData.custom_reminder_times.length;
            const freq = slotCount === 0 ? 'as needed' : slotCount === 1 ? 'daily' : slotCount === 2 ? 'twice daily' : slotCount === 3 ? 'three times daily' : `${slotCount} times daily`;
            await onAdd({
                name: formData.name, dosage: formData.dosage, frequency: freq,
                instructions: formData.instructions || null, priority: formData.priority,
                morning: formData.morning, afternoon: formData.afternoon, evening: formData.evening, night: formData.night,
                reminder_enabled: formData.reminder_enabled,
                custom_reminder_times: formData.custom_reminder_times.length > 0 ? JSON.stringify(formData.custom_reminder_times) : null,
                start_date: formData.start_date || null, end_date: formData.end_date || null,
            });
            onClose();
            setFormData({ name: '', dosage: '', instructions: '', priority: 'normal', morning: false, afternoon: false, evening: false, night: false, custom_reminder_times: [], reminder_enabled: true, start_date: '', end_date: '' });
        } catch (err: any) { setError(err.message || 'Failed to add medication'); }
        finally { setLoading(false); }
    };

    // Interaction risk config
    const riskCfg: Record<string, { color: string; dim: string; border: string; label: string }> = {
        critical: { color: T.red,    dim: T.redDim,    border: `${T.red}30`,    label: 'Critical risk' },
        high:     { color: '#f97316', dim: '#1f0d05',   border: '#f9731625',     label: 'High risk' },
        moderate: { color: T.amber,  dim: T.amberDim,  border: `${T.amber}25`,  label: 'Moderate risk' },
        low:      { color: T.blue,   dim: T.blueDim,   border: `${T.blue}25`,   label: 'Low risk' },
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0"
                        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 12 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
                        style={{ background: T.card, border: `1px solid ${T.borderHi}`, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>

                        {/* ── Header ── */}
                        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5"
                            style={{ background: T.card, borderBottom: `1px solid ${T.border}` }}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: T.blueDim }}>
                                    <Pill className="w-5 h-5" style={{ color: T.blue }} />
                                </div>
                                <div>
                                    <h2 className="text-[18px] font-semibold" style={{ color: T.text }}>Add Medication</h2>
                                    <p className="text-[12px] mt-0.5" style={{ color: T.muted }}>Register a new medication and configure reminders</p>
                                </div>
                            </div>
                            <button onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                                style={{ color: T.muted }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.faint; (e.currentTarget as HTMLElement).style.color = T.sub; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = T.muted; }}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-7">

                            {/* ── Error ── */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="flex items-start gap-3 px-4 py-3 rounded-xl text-[13px]"
                                        style={{ background: T.redDim, border: `1px solid ${T.red}25`, color: '#fca5a5' }}>
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* ── Interaction warnings ── */}
                            <AnimatePresence>
                                {interactionCheck?.has_interactions && (() => {
                                    const cfg = riskCfg[interactionCheck.risk_level] ?? riskCfg.low;
                                    return (
                                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                            className="rounded-2xl p-5"
                                            style={{ background: cfg.dim, border: `1px solid ${cfg.border}`, borderLeft: `3px solid ${cfg.color}` }}>
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                                    style={{ background: cfg.color + '20' }}>
                                                    <ShieldAlert className="w-4 h-4" style={{ color: cfg.color }} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 flex-wrap mb-1">
                                                        <p className="text-[14px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
                                                        <span className="text-[11px] px-2 py-0.5 rounded-md font-medium"
                                                            style={{ background: cfg.color + '20', color: cfg.color }}>
                                                            Risk score: {interactionCheck.risk_score}/100
                                                        </span>
                                                    </div>
                                                    <p className="text-[13px]" style={{ color: T.sub }}>
                                                        {interactionCheck.interaction_count} potential interaction{interactionCheck.interaction_count > 1 ? 's' : ''} detected with existing medications
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-2.5">
                                                {interactionCheck.interactions.slice(0, 3).map((c: DrugInteraction, i: number) => (
                                                    <div key={i} className="rounded-xl px-4 py-3"
                                                        style={{ background: T.faint, border: `1px solid ${T.border}` }}>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md capitalize"
                                                                style={{
                                                                    background: (riskCfg[c.severity] ?? riskCfg.low).color + '18',
                                                                    color: (riskCfg[c.severity] ?? riskCfg.low).color,
                                                                }}>
                                                                {c.severity}
                                                            </span>
                                                            <p className="text-[13px] font-medium" style={{ color: T.text }}>
                                                                {c.medication1} + {c.medication2}
                                                            </p>
                                                        </div>
                                                        <p className="text-[12px] leading-relaxed" style={{ color: T.sub }}>{c.description}</p>
                                                        {c.recommendation && (
                                                            <p className="text-[12px] mt-1.5 flex items-start gap-1.5 italic" style={{ color: T.muted }}>
                                                                <Lightbulb className="w-3 h-3 mt-0.5 shrink-0" style={{ color: T.amber }} />
                                                                {c.recommendation}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                                {interactionCheck.interaction_count > 3 && (
                                                    <p className="text-[12px] text-center" style={{ color: T.muted }}>
                                                        + {interactionCheck.interaction_count - 3} more interactions
                                                    </p>
                                                )}
                                            </div>
                                            {interactionCheck.risk_level === 'critical' && (
                                                <div className="mt-3 flex items-center gap-2 px-4 py-3 rounded-xl"
                                                    style={{ background: T.redDim, border: `1px solid ${T.red}25` }}>
                                                    <AlertCircle className="w-4 h-4 shrink-0" style={{ color: T.red }} />
                                                    <span className="text-[13px] font-medium" style={{ color: '#fca5a5' }}>
                                                        Consult your doctor before adding this medication
                                                    </span>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })()}
                            </AnimatePresence>

                            {/* Safe indicator */}
                            <AnimatePresence>
                                {interactionCheck && !interactionCheck.has_interactions && (
                                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl"
                                        style={{ background: T.greenDim, border: `1px solid ${T.green}22` }}>
                                        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: T.green }} />
                                        <span className="text-[13px] font-medium" style={{ color: T.green }}>
                                            No interactions detected with current medications
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* ── Section 1: Basic Info ── */}
                            <section>
                                <SectionLabel n="1" label="Basic info" icon={Pill} />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Field label="Medication name">
                                        <div className="relative">
                                            <input type="text" value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="e.g. Aspirin"
                                                required
                                                className={inputCls.base}
                                                style={{
                                                    ...inputCls.style,
                                                    borderColor: interactionCheck?.has_interactions ? T.red + '60' : T.border,
                                                }}
                                                onFocus={e => (e.currentTarget.style.borderColor = T.blue + '60')}
                                                onBlur={e => { checkConflicts(e.currentTarget.value); e.currentTarget.style.borderColor = interactionCheck?.has_interactions ? T.red + '60' : T.border; }} />
                                            {checkingInteractions && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: T.blue }} />
                                                    <span className="text-[11px]" style={{ color: T.muted }}>Checking…</span>
                                                </div>
                                            )}
                                        </div>
                                    </Field>

                                    <Field label="Dosage">
                                        <input type="text" value={formData.dosage}
                                            onChange={e => setFormData({ ...formData, dosage: e.target.value })}
                                            placeholder="e.g. 500mg"
                                            required
                                            className={inputCls.base}
                                            style={inputCls.style}
                                            onFocus={e => (e.currentTarget.style.borderColor = T.blue + '60')}
                                            onBlur={e => (e.currentTarget.style.borderColor = T.border)} />
                                    </Field>

                                    <Field label="Priority">
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { value: 'normal', label: 'Normal', color: T.blue,  dim: T.blueDim },
                                                { value: 'high',   label: 'High',   color: T.red,   dim: T.redDim  },
                                            ].map(opt => (
                                                <button key={opt.value} type="button"
                                                    onClick={() => setFormData({ ...formData, priority: opt.value })}
                                                    className="py-3 rounded-xl text-[13px] font-semibold transition-colors"
                                                    style={{
                                                        background: formData.priority === opt.value ? opt.color : T.faint,
                                                        color: formData.priority === opt.value ? '#fff' : T.muted,
                                                        border: `1px solid ${formData.priority === opt.value ? opt.color : T.border}`,
                                                    }}>
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>
                                </div>
                            </section>

                            {/* ── Section 2: Schedule ── */}
                            <section>
                                <SectionLabel n="2" label="Reminder schedule" icon={Clock} />

                                {/* Time slot tiles */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                                    {TIME_SLOTS.map(slot => {
                                        const active = formData[slot.key as keyof typeof formData] as boolean;
                                        return (
                                            <button key={slot.key} type="button"
                                                onClick={() => toggleSlot(slot.key)}
                                                className="rounded-xl py-4 px-3 flex flex-col items-center gap-2.5 transition-all"
                                                style={{
                                                    background: active ? slot.dim : T.faint,
                                                    border: `1px solid ${active ? slot.color + '40' : T.border}`,
                                                    outline: active ? `1px solid ${slot.color}30` : 'none',
                                                }}>
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                                    style={{ background: active ? slot.color + '25' : T.border + '40' }}>
                                                    <slot.icon className="w-5 h-5" style={{ color: active ? slot.color : T.muted }} />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[13px] font-semibold leading-tight"
                                                        style={{ color: active ? slot.color : T.sub }}>{slot.label}</p>
                                                    <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>{slot.time}</p>
                                                </div>
                                                {active && (
                                                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: slot.color }} />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Custom time input */}
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <p className="text-[12px] font-medium" style={{ color: T.muted }}>Add custom time:</p>
                                        <div className="flex items-center gap-2">
                                            <input type="time" value={newCustomTime}
                                                onChange={e => setNewCustomTime(e.target.value)}
                                                className="px-3 py-2 rounded-lg text-[13px] focus:outline-none"
                                                style={{ background: T.faint, color: T.text, border: `1px solid ${T.border}` }}
                                                onFocus={e => (e.currentTarget.style.borderColor = T.blue + '60')}
                                                onBlur={e => (e.currentTarget.style.borderColor = T.border)} />
                                            <button type="button" onClick={addCustomTime} disabled={!newCustomTime}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-30"
                                                style={{ background: T.blueDim, color: T.blue, border: `1px solid ${T.blue}22` }}>
                                                <Plus className="w-3.5 h-3.5" /> Add
                                            </button>
                                        </div>
                                    </div>

                                    {/* Combined Schedule Display */}
                                    {(() => {
                                        const allActiveTimes = [
                                            ...(formData.morning ? [{ label: '8:00 AM', source: 'preset' }] : []),
                                            ...(formData.afternoon ? [{ label: '2:00 PM', source: 'preset' }] : []),
                                            ...(formData.evening ? [{ label: '6:00 PM', source: 'preset' }] : []),
                                            ...(formData.night ? [{ label: '9:00 PM', source: 'preset' }] : []),
                                            ...(formData.custom_reminder_times.map(t => ({ label: t, source: 'custom' }))),
                                        ];

                                        if (allActiveTimes.length > 0) {
                                            return (
                                                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                                                    {allActiveTimes.map((t, i) => (
                                                        <span key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                                                            t.source === 'preset'
                                                                ? 'bg-white/5 text-white/40 border border-white/5'
                                                                : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                                                        }`}>
                                                            <Clock className="w-3 h-3 opacity-50" />
                                                            {t.label}
                                                            {t.source === 'custom' && (
                                                                <button type="button" onClick={() => removeCustomTime(t.label)}
                                                                    className="transition-colors hover:text-red-400 ml-0.5"
                                                                    style={{ color: T.muted }}>
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>

                                {/* Reminder toggle */}
                                <div className="flex items-center justify-between px-5 py-3.5 rounded-xl"
                                    style={{ background: T.faint, border: `1px solid ${T.border}` }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                            style={{ background: formData.reminder_enabled ? T.tealDim : T.faint }}>
                                            <Bell className="w-4 h-4" style={{ color: formData.reminder_enabled ? T.teal : T.muted }} />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-medium" style={{ color: T.text }}>Reminders enabled</p>
                                            <p className="text-[11px]" style={{ color: T.muted }}>
                                                {formData.reminder_enabled ? 'You will receive SMS and app alerts' : 'No alerts will be sent'}
                                            </p>
                                        </div>
                                    </div>
                                    <button type="button"
                                        onClick={() => setFormData(p => ({ ...p, reminder_enabled: !p.reminder_enabled }))}
                                        className="w-12 h-6 rounded-full relative transition-colors"
                                        style={{ background: formData.reminder_enabled ? T.teal : T.border }}>
                                        <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
                                            style={{ left: formData.reminder_enabled ? '26px' : '4px' }} />
                                    </button>
                                </div>
                            </section>

                            {/* ── Section 3: Additional ── */}
                            <section>
                                <SectionLabel n="3" label="Additional details" icon={FileText} />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Field label="Start date">
                                        <input type="date" value={formData.start_date}
                                            onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                            className={inputCls.base}
                                            style={inputCls.style}
                                            onFocus={e => (e.currentTarget.style.borderColor = T.blue + '60')}
                                            onBlur={e => (e.currentTarget.style.borderColor = T.border)} />
                                    </Field>
                                    <Field label="End date">
                                        <input type="date" value={formData.end_date}
                                            onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                            className={inputCls.base}
                                            style={inputCls.style}
                                            onFocus={e => (e.currentTarget.style.borderColor = T.blue + '60')}
                                            onBlur={e => (e.currentTarget.style.borderColor = T.border)} />
                                    </Field>
                                    <Field label="Instructions">
                                        <input type="text" value={formData.instructions}
                                            onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                                            placeholder="e.g. Take with food"
                                            className={inputCls.base}
                                            style={{ ...inputCls.style }}
                                            onFocus={e => (e.currentTarget.style.borderColor = T.blue + '60')}
                                            onBlur={e => (e.currentTarget.style.borderColor = T.border)} />
                                    </Field>
                                </div>
                            </section>

                            {/* ── Footer actions ── */}
                            <div className="flex items-center justify-between pt-4"
                                style={{ borderTop: `1px solid ${T.border}` }}>
                                <p className="text-[12px]" style={{ color: T.muted }}>
                                    {[formData.morning, formData.afternoon, formData.evening, formData.night].filter(Boolean).length + formData.custom_reminder_times.length} reminder{([formData.morning, formData.afternoon, formData.evening, formData.night].filter(Boolean).length + formData.custom_reminder_times.length) !== 1 ? 's' : ''} selected
                                </p>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={onClose}
                                        className="px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
                                        style={{ background: T.faint, color: T.muted, border: `1px solid ${T.border}` }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.borderHi; (e.currentTarget as HTMLElement).style.color = T.sub; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.color = T.muted; }}>
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={loading}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                                        style={{ background: T.blue }}>
                                        {loading
                                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                                            : <><Save className="w-3.5 h-3.5" /> Add Medication</>}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
