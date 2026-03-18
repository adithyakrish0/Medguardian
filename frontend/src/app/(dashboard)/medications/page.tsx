"use client";

import { useState, useEffect } from 'react';
import { useMedications } from '@/hooks/useMedications';
import AIVerificationModal from '@/components/AIVerificationModal';
import AddMedicationModal from '@/components/AddMedicationModal';
import EditMedicationModal from '@/components/EditMedicationModal';
import { apiFetch } from '@/lib/api';
import { useUser } from '@/hooks/useUser';
import {
    Pill, Plus, Camera, AlertTriangle, Clock,
    CheckCircle2, Calendar, Users, Brain,
    MoreVertical, Pencil, Trash2, RefreshCw,
    Loader2, ChevronLeft, Shield, Zap,
    Activity, TrendingUp, Info, Star, Heart
} from 'lucide-react';
import AIFeedModal from '@/components/AIFeedModal';
import { useToast } from '@/components/NiceToast';
import { SeniorOnly } from '@/components/RoleGuard';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Tokens ───────────────────────────────────────────────
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
        transition: { delay: i * 0.06, duration: 0.36, ease: 'easeOut' as const }
    }),
};

// ─── Shared MenuBtn ───────────────────────────────────────
function MenuBtn({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
    return (
        <button onClick={onClick}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-left transition-colors"
            style={{ color }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.faint; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <span style={{ color }}>{icon}</span>{label}
        </button>
    );
}

// ─── Med card row ─────────────────────────────────────────
function MedRow({ med, i, onVerify, onFeed, onEdit, onDelete, onMenuOpen, isMenuOpen }: any) {
    const high = med.priority === 'high';
    return (
        <motion.div key={med.id} custom={i} initial="hidden" animate="visible" variants={cv}
            className="rounded-2xl transition-colors group"
            style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderLeft: `3px solid ${high ? T.red : T.blue}`,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = T.cardHi)}
            onMouseLeave={e => (e.currentTarget.style.background = T.card)}>

            {/* Top row */}
            <div className="px-5 py-4 flex items-center gap-4">
                {/* Icon */}
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: high ? T.redDim : T.blueDim }}>
                    <Pill className="w-5 h-5" style={{ color: high ? T.red : T.blue }} />
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                    <p className="text-[17px] font-semibold truncate" style={{ color: T.text }}>{med.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[13px]" style={{ color: T.muted }}>{med.dosage}</span>
                        <span className="w-[3px] h-[3px] rounded-full" style={{ background: T.faint }} />
                        <span className="text-[13px]" style={{ color: T.muted }}>{med.frequency}</span>
                        {med.ai_trained ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg font-medium"
                                style={{ background: T.greenDim, color: T.green, border: `1px solid ${T.green}22` }}>
                                <CheckCircle2 className="w-[10px] h-[10px]" /> AI ready
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg font-medium"
                                style={{ background: T.amberDim, color: T.amber, border: `1px solid ${T.amber}22` }}>
                                <AlertTriangle className="w-[10px] h-[10px]" /> Needs training
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => onVerify({ id: med.id, name: med.name })}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors hover:bg-blue-500"
                        style={{ background: T.blue }}>
                        <Camera className="w-3.5 h-3.5" /> Verify
                    </button>
                    {!med.ai_trained && (
                        <button onClick={() => onFeed(med)}
                            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
                            style={{ background: T.greenDim, color: T.green, border: `1px solid ${T.green}25` }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0d2b0d'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.greenDim; }}>
                            <Brain className="w-3.5 h-3.5" /> Train AI
                        </button>
                    )}
                    <button onClick={e => onMenuOpen(med.id, e)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
                        style={{ color: T.muted }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.faint; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Subtle bottom meta strip */}
            <div className="px-5 pb-3 flex items-center gap-4"
                style={{ borderTop: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-1.5 mt-2">
                    <Clock className="w-3 h-3" style={{ color: T.muted }} />
                    <span className="text-[11px]" style={{ color: T.muted }}>
                        {med.scheduled_times?.join(', ') || 'No schedule set'}
                    </span>
                </div>
                {med.notes && (
                    <div className="flex items-center gap-1.5 mt-2 min-w-0">
                        <Info className="w-3 h-3 shrink-0" style={{ color: T.muted }} />
                        <span className="text-[11px] truncate" style={{ color: T.muted }}>{med.notes}</span>
                    </div>
                )}
                <div className="ml-auto mt-2">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                        style={{
                            background: med.priority === 'high' ? T.redDim : T.faint,
                            color: med.priority === 'high' ? T.red : T.muted,
                            border: `1px solid ${med.priority === 'high' ? T.red + '22' : T.border}`,
                        }}>
                        {med.priority === 'high' ? 'High priority' : 'Standard'}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Insight banner ───────────────────────────────────────
function InsightBanner({ medications }: { medications: any[] }) {
    const trained   = medications.filter(m => m.ai_trained).length;
    const high      = medications.filter(m => m.priority === 'high').length;
    const pct       = medications.length > 0 ? Math.round((trained / medications.length) * 100) : 0;

    let msg = '';
    let color = T.blue;
    let Icon  = Star;

    if (high > 0) {
        msg   = `You have ${high} high-priority medication${high > 1 ? 's' : ''}. Verify these first every day.`;
        color = T.red; Icon = AlertTriangle;
    } else if (pct === 100) {
        msg   = 'All medications are AI-trained. Camera verification will be most accurate.';
        color = T.green; Icon = CheckCircle2;
    } else if (trained === 0) {
        msg   = 'Train your medications so the AI can verify them accurately through the camera.';
        color = T.amber; Icon = Brain;
    } else {
        msg   = `${trained} of ${medications.length} medications are AI-trained. Train the rest for better accuracy.`;
        color = T.blue; Icon = TrendingUp;
    }

    return (
        <motion.div custom={1} initial="hidden" animate="visible" variants={cv}
            className="rounded-2xl px-5 py-4 flex items-start gap-4"
            style={{ background: T.card, border: `1px solid ${T.border}`, borderLeft: `3px solid ${color}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: color + '18' }}>
                <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
                <p className="text-[13px] font-semibold mb-0.5" style={{ color }}>AI training status</p>
                <p className="text-[13px] leading-relaxed" style={{ color: T.sub }}>{msg}</p>
            </div>
            <div className="shrink-0 text-right ml-4">
                <p className="text-[28px] font-semibold leading-none" style={{ color }}>{pct}%</p>
                <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>trained</p>
            </div>
        </motion.div>
    );
}

// ─── Adherence tip ────────────────────────────────────────
const tips = [
    { title: 'Best time to take statins', body: 'Medications like Atorvastatin work best when taken in the evening, as cholesterol production peaks at night.' },
    { title: 'Food interactions matter', body: 'Some medications absorb better with food, while others need an empty stomach. Check with your pharmacist.' },
    { title: 'Never skip a dose', body: 'Missing doses can reduce effectiveness or cause withdrawal effects. Set alarms to stay consistent.' },
    { title: 'Store correctly', body: 'Most medications should be stored away from heat, light, and moisture. Bathroom cabinets are often not ideal.' },
];

function MedicationTip({ i }: { i: number }) {
    const tip = tips[i % tips.length];
    return (
        <motion.div custom={99} initial="hidden" animate="visible" variants={cv}
            className="rounded-2xl px-5 py-4 flex items-start gap-4"
            style={{ background: T.card, border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.violet}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: T.violetDim }}>
                <Heart className="w-5 h-5" style={{ color: T.violet }} />
            </div>
            <div>
                <p className="text-[12px] font-semibold mb-1" style={{ color: T.violet }}>Health tip</p>
                <p className="text-[14px] font-semibold mb-1" style={{ color: T.text }}>{tip.title}</p>
                <p className="text-[13px] leading-relaxed" style={{ color: T.sub }}>{tip.body}</p>
            </div>
        </motion.div>
    );
}

// ─── Quick action row ─────────────────────────────────────
function QuickActions({ onAdd, medications, onVerify }: any) {
    const nextUntrained = medications.find((m: any) => !m.ai_trained);
    return (
        <motion.div custom={50} initial="hidden" animate="visible" variants={cv}
            className="rounded-2xl p-5"
            style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-[13px] font-semibold mb-4" style={{ color: T.muted }}>Quick actions</p>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={onAdd}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors"
                    style={{ background: T.blueDim, border: `1px solid ${T.blue}22` }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e2f4a'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.blueDim; }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: T.blue + '25' }}>
                        <Plus className="w-4 h-4" style={{ color: T.blue }} />
                    </div>
                    <div>
                        <p className="text-[13px] font-semibold" style={{ color: T.text }}>Add medication</p>
                        <p className="text-[11px]" style={{ color: T.muted }}>Register a new drug</p>
                    </div>
                </button>

                {nextUntrained ? (
                    <button onClick={() => onVerify({ id: nextUntrained.id, name: nextUntrained.name })}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors"
                        style={{ background: T.greenDim, border: `1px solid ${T.green}22` }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0d2b0d'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.greenDim; }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: T.green + '25' }}>
                            <Camera className="w-4 h-4" style={{ color: T.green }} />
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold" style={{ color: T.text }}>Verify next dose</p>
                            <p className="text-[11px] truncate max-w-[100px]" style={{ color: T.muted }}>{nextUntrained.name}</p>
                        </div>
                    </button>
                ) : (
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
                        style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: T.greenDim }}>
                            <CheckCircle2 className="w-4 h-4" style={{ color: T.green }} />
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold" style={{ color: T.text }}>All verified</p>
                            <p className="text-[11px]" style={{ color: T.muted }}>Nothing pending</p>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ─── Main Page ────────────────────────────────────────────
export default function MedicationsPage() {
    const [selectedSeniorId, setSelectedSeniorId] = useState<number | undefined>(undefined);
    const { medications, loading: medsLoading, error, markAsTaken, refresh } = useMedications(selectedSeniorId);
    const { user, loading: userLoading } = useUser();
    const { showToast } = useToast();
    const [verifyingMed, setVerifyingMed] = useState<{ id: number; name: string } | null>(null);
    const [feedingMed, setFeedingMed]     = useState<any | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingMed, setEditingMed]     = useState<any | null>(null);
    const [deletingMed, setDeletingMed]   = useState<any | null>(null);
    const [isDeleting, setIsDeleting]     = useState(false);
    const [openMenuId, setOpenMenuId]     = useState<number | null>(null);
    const [menuPos, setMenuPos]           = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!openMenuId) return;
        const h = () => setOpenMenuId(null);
        window.addEventListener('scroll', h, true);
        return () => window.removeEventListener('scroll', h, true);
    }, [openMenuId]);

    const handleOpenMenu = (id: number, e: React.MouseEvent) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const below = window.innerHeight - r.bottom;
        setMenuPos({ x: r.right - 180, y: below < 160 ? r.top - 170 : r.bottom + 6 });
        setOpenMenuId(openMenuId === id ? null : id);
    };

    const handleAdd    = async (data: any) => { try { const r = await apiFetch('/medications', { method: 'POST', body: JSON.stringify(data) }); if (r.success) refresh(); } catch { } };
    const handleDelete = async (id: number) => {
        setIsDeleting(true);
        try {
            const r = await apiFetch(`/medications/${id}`, { method: 'DELETE' });
            if (r.success) { showToast('Medication removed', 'success'); refresh(); setDeletingMed(null); }
            else showToast(r.error || 'Failed', 'error');
        } catch { showToast('Network error', 'error'); }
        finally { setIsDeleting(false); }
    };

    if (medsLoading || userLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: T.blue }} />
            <p className="text-[13px]" style={{ color: T.muted }}>Loading medications…</p>
        </div>
    );
    if (error) return (
        <div className="flex items-start gap-3 px-5 py-4 rounded-2xl"
            style={{ background: T.redDim, border: `1px solid ${T.red}25` }}>
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div>
                <p className="text-[14px] font-semibold text-red-400">Couldn't load medications</p>
                <p className="text-[13px] mt-1" style={{ color: T.muted }}>{error}</p>
            </div>
        </div>
    );

    const trained   = medications.filter(m => m.ai_trained).length;
    const untrained = medications.filter(m => !m.ai_trained).length;

    return (
        <SeniorOnly>
            <div className="w-full max-w-3xl mx-auto px-5 py-8 space-y-5">

                {/* ── Header ── */}
                <div>
                    <a href="/dashboard"
                        className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-5 transition-colors"
                        style={{ color: T.muted }}
                        onMouseEnter={e => (e.currentTarget.style.color = T.sub)}
                        onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
                        <ChevronLeft className="w-3.5 h-3.5" /> Back to Dashboard
                    </a>
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <h1 className="text-[30px] font-semibold tracking-[-0.6px]" style={{ color: T.text }}>
                                My Medications
                            </h1>
                            <p className="text-[14px] mt-1" style={{ color: T.muted }}>
                                {medications.length} active &nbsp;·&nbsp;
                                <span style={{ color: T.green }}>{trained} trained</span>
                                {untrained > 0 && <>, &nbsp;<span style={{ color: T.amber }}>{untrained} need training</span></>}
                            </p>
                        </div>
                        <button onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl text-[14px] font-semibold text-white transition-colors hover:bg-blue-500"
                            style={{ background: T.blue }}>
                            <Plus className="w-4 h-4" /> Add Medication
                        </button>
                    </div>
                </div>

                {/* ── Stat strip ── */}
                {medications.length > 0 && (
                    <motion.div custom={0} initial="hidden" animate="visible" variants={cv}
                        className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Total medications', value: medications.length, color: T.blue,  icon: Pill },
                            { label: 'AI ready',          value: trained,            color: T.green, icon: Shield },
                            { label: 'Need training',     value: untrained,          color: T.amber, icon: Brain },
                        ].map(s => (
                            <div key={s.label} className="rounded-2xl px-5 py-4 relative overflow-hidden"
                                style={{ background: T.card, border: `1px solid ${T.border}` }}>
                                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: s.color }} />
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 rounded-md flex items-center justify-center"
                                        style={{ background: s.color + '18' }}>
                                        <s.icon className="w-3 h-3" style={{ color: s.color }} />
                                    </div>
                                </div>
                                <p className="text-[30px] font-semibold leading-none" style={{ color: T.text }}>{s.value}</p>
                                <p className="text-[12px] mt-1.5" style={{ color: T.muted }}>{s.label}</p>
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* ── Insight banner ── */}
                {medications.length > 0 && <InsightBanner medications={medications} />}

                {/* ── Med list ── */}
                {medications.length === 0 ? (
                    <motion.div custom={2} initial="hidden" animate="visible" variants={cv}
                        className="flex flex-col items-center justify-center py-24 rounded-2xl gap-4 text-center"
                        style={{ background: T.card, border: `1px dashed ${T.border}` }}>
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                            style={{ background: T.blueDim }}>
                            <Pill className="w-7 h-7" style={{ color: T.blue }} />
                        </div>
                        <div>
                            <p className="text-[18px] font-semibold mb-1" style={{ color: T.text }}>No medications yet</p>
                            <p className="text-[14px]" style={{ color: T.muted }}>Add your first medication to get started.</p>
                        </div>
                        <button onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white mt-2"
                            style={{ background: T.blue }}>
                            <Plus className="w-4 h-4" /> Add Medication
                        </button>
                    </motion.div>
                ) : (
                    <div className="space-y-3">
                        {medications.map((med: any, i: number) => (
                            <MedRow key={med.id} med={med} i={i + 2}
                                onVerify={setVerifyingMed}
                                onFeed={setFeedingMed}
                                onEdit={setEditingMed}
                                onDelete={setDeletingMed}
                                onMenuOpen={handleOpenMenu}
                                isMenuOpen={openMenuId === med.id} />
                        ))}
                    </div>
                )}

                {/* ── Quick actions ── */}
                {medications.length > 0 && (
                    <QuickActions onAdd={() => setIsAddModalOpen(true)} medications={medications} onVerify={setVerifyingMed} />
                )}

                {/* ── Add another button ── */}
                {medications.length > 0 && (
                    <div className="flex justify-center">
                        <button onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
                            style={{ background: T.surface, color: T.blue, border: `1px solid ${T.border}` }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.blue + '50'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; }}>
                            <Plus className="w-3.5 h-3.5" /> Add Another Medication
                        </button>
                    </div>
                )}

                {/* ── Health tip ── */}
                {medications.length > 0 && <MedicationTip i={new Date().getDate()} />}

                {/* ── Dropdown menu ── */}
                <AnimatePresence>
                    {openMenuId && (
                        <>
                            <div className="fixed inset-0 z-[100]" onClick={() => setOpenMenuId(null)} />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ duration: 0.12 }}
                                className="fixed z-[101] rounded-xl py-1.5 min-w-[180px]"
                                style={{ top: menuPos.y, left: menuPos.x, background: T.card, border: `1px solid ${T.borderHi}`, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
                                {medications.filter((m: any) => m.id === openMenuId).map((med: any) => (
                                    <div key={med.id}>
                                        <MenuBtn icon={<Pencil className="w-3.5 h-3.5" />} label="Edit details" color={T.sub} onClick={() => { setEditingMed(med); setOpenMenuId(null); }} />
                                        {med.ai_trained && <MenuBtn icon={<RefreshCw className="w-3.5 h-3.5" />} label="Retrain AI" color={T.green} onClick={() => { setFeedingMed(med); setOpenMenuId(null); }} />}
                                        <div className="my-1 mx-3 h-px" style={{ background: T.border }} />
                                        <MenuBtn icon={<Trash2 className="w-3.5 h-3.5" />} label="Delete" color={T.red} onClick={() => { setDeletingMed(med); setOpenMenuId(null); }} />
                                    </div>
                                ))}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* ── Modals ── */}
                <AddMedicationModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={handleAdd} />
                {editingMed && <EditMedicationModal medication={editingMed} isOpen={!!editingMed} onClose={() => setEditingMed(null)} onSaved={() => { setEditingMed(null); refresh(); }} />}

                <AnimatePresence>
                    {deletingMed && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/75" onClick={() => setDeletingMed(null)} />
                            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
                                className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
                                style={{ background: T.card, border: `1px solid ${T.border}` }}>
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: T.redDim }}>
                                    <Trash2 className="w-5 h-5" style={{ color: T.red }} />
                                </div>
                                <h2 className="text-[17px] font-semibold text-center mb-1" style={{ color: T.text }}>Remove medication?</h2>
                                <p className="text-[13px] text-center mb-6" style={{ color: T.muted }}>
                                    <strong style={{ color: T.sub }}>{deletingMed.name}</strong> will be permanently deleted.
                                </p>
                                <div className="flex gap-2.5">
                                    <button onClick={() => setDeletingMed(null)}
                                        className="flex-1 py-3 rounded-xl text-[13px] font-medium transition-colors"
                                        style={{ background: T.faint, color: T.muted, border: `1px solid ${T.border}` }}>
                                        Cancel
                                    </button>
                                    <button disabled={isDeleting} onClick={() => handleDelete(deletingMed.id)}
                                        className="flex-1 py-3 rounded-xl text-[13px] font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                                        {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Delete
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {verifyingMed && (
                    <AIVerificationModal medicationId={verifyingMed.id} medicationName={verifyingMed.name}
                        onClose={() => setVerifyingMed(null)}
                        onVerified={async () => { await markAsTaken(verifyingMed.id, true, 'vision_v2'); setVerifyingMed(null); refresh(); }} />
                )}
                {feedingMed && (
                    <AIFeedModal medicationId={feedingMed.id} medicationName={feedingMed.name}
                        onClose={() => setFeedingMed(null)}
                        onComplete={() => { setFeedingMed(null); refresh(); }} />
                )}
            </div>
        </SeniorOnly>
    );
}
