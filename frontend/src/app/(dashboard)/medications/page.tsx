"use client";

import { useState, useEffect, useRef } from 'react';
import { useMedications } from '@/hooks/useMedications';
import AIVerificationModal from '@/components/AIVerificationModal';
import AddMedicationModal from '@/components/AddMedicationModal';
import EditMedicationModal from '@/components/EditMedicationModal';
import { apiFetch } from '@/lib/api';
import { useUser } from '@/hooks/useUser';
import {
    Pill,
    Plus,
    Camera,
    Settings,
    AlertTriangle,
    Clock,
    CheckCircle2,
    Calendar,
    ArrowRight,
    ArrowLeft,
    Users,
    Brain,
    MoreVertical,
    Pencil,
    Trash2,
    RefreshCw
} from 'lucide-react';
import AIFeedModal from '@/components/AIFeedModal';

export default function MedicationsPage() {
    const [selectedSeniorId, setSelectedSeniorId] = useState<number | undefined>(undefined);
    const { medications, loading: medsLoading, error, markAsTaken, refresh } = useMedications(selectedSeniorId);
    const { user, loading: userLoading } = useUser();
    const [verifyingMed, setVerifyingMed] = useState<{ id: number, name: string } | null>(null);
    const [feedingMed, setFeedingMed] = useState<any | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingMed, setEditingMed] = useState<any | null>(null);
    const [deletingMed, setDeletingMed] = useState<any | null>(null);

    const handleAddMedication = async (data: any) => {
        try {
            const response = await apiFetch('/medications', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            if (response.success) {
                refresh();
            }
        } catch (err) {
            console.error('Error adding medication:', err);
        }
    };

    const handleDeleteMedication = async (medId: number) => {
        try {
            const response = await apiFetch(`/medications/${medId}`, {
                method: 'DELETE'
            });
            if (response.success) {
                refresh();
                setDeletingMed(null);
            }
        } catch (err) {
            console.error('Error deleting medication:', err);
        }
    };

    if (medsLoading || userLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="font-bold opacity-40 animate-pulse uppercase tracking-widest text-[10px]">Loading your medicines...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border-l-4 border-red-500 p-8 rounded-r-3xl text-red-700">
                <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="w-6 h-6" />
                    <p className="font-black text-xl">System Synchronization Error</p>
                </div>
                <p className="font-medium opacity-80">{error}</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto px-12 lg:px-24 py-12">
            {user?.role === 'caregiver' ? (
                <CaregiverMedicationsView
                    medications={medications}
                    onAdd={() => setIsAddModalOpen(true)}
                    onVerify={(med: { id: number; name: string }) => setVerifyingMed(med)}
                    onSeniorChange={(id: number | undefined) => setSelectedSeniorId(id)}
                    selectedSeniorId={selectedSeniorId}
                    onFeed={setFeedingMed}
                    onEdit={setEditingMed}
                    onDelete={setDeletingMed}
                />
            ) : (
                <SeniorMedicationsView
                    medications={medications}
                    onAdd={() => setIsAddModalOpen(true)}
                    onVerify={(med: { id: number; name: string }) => setVerifyingMed(med)}
                    onFeed={setFeedingMed}
                    onEdit={setEditingMed}
                    onDelete={setDeletingMed}
                />
            )}

            {/* Modals */}
            <AddMedicationModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddMedication}
            />

            {editingMed && (
                <EditMedicationModal
                    medication={editingMed}
                    isOpen={!!editingMed}
                    onClose={() => setEditingMed(null)}
                    onSaved={() => {
                        setEditingMed(null);
                        refresh();
                    }}
                />
            )}

            {deletingMed && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeletingMed(null)} />
                    <div className="relative bg-card border border-card-border rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-8 h-8 text-red-500" />
                            </div>
                            <h2 className="text-2xl font-black text-foreground mb-2">Delete Medication?</h2>
                            <p className="text-foreground/60 mb-6">
                                Are you sure you want to delete <strong>{deletingMed.name}</strong>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeletingMed(null)}
                                    className="flex-1 py-3 px-4 bg-foreground/10 text-foreground rounded-xl font-bold hover:bg-foreground/20 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteMedication(deletingMed.id)}
                                    className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {verifyingMed && (
                <AIVerificationModal
                    medicationId={verifyingMed.id}
                    medicationName={verifyingMed.name}
                    onClose={() => setVerifyingMed(null)}
                    onVerified={async () => {
                        await markAsTaken(verifyingMed.id, true, 'vision_v2');
                        setVerifyingMed(null);
                        refresh();
                    }}
                />
            )}

            {feedingMed && (
                <AIFeedModal
                    medicationId={feedingMed.id}
                    medicationName={feedingMed.name}
                    onClose={() => setFeedingMed(null)}
                    onComplete={() => {
                        setFeedingMed(null);
                        refresh();
                    }}
                />
            )}
        </div>
    );
}

function SeniorMedicationsView({ medications, onAdd, onVerify, onFeed, onEdit, onDelete }: any) {
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Close menu on scroll (standard UX for fixed position dropdowns)
    useEffect(() => {
        if (!openMenuId) return;
        const handleScroll = () => setOpenMenuId(null);
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [openMenuId]);

    const handleOpenMenu = (medId: number, event: React.MouseEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const menuHeight = 160; // Approximate menu height
        const spaceBelow = window.innerHeight - rect.bottom;

        // If not enough space below, position above the button
        const y = spaceBelow < menuHeight
            ? rect.top - menuHeight - 8
            : rect.bottom + 8;

        setMenuPosition({ x: rect.right - 180, y });
        setOpenMenuId(openMenuId === medId ? null : medId);
    };


    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header with Back Button */}
            <div className="flex flex-col items-center">
                {/* Back Button - styled pill */}
                <a
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-white/60 hover:text-primary hover:bg-primary/10 transition-all text-sm font-medium mb-8"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Dashboard</span>
                </a>

                {/* Title */}
                <h1 className="text-5xl md:text-6xl font-black text-foreground tracking-tight text-center">
                    My Medicines
                </h1>
                <p className="text-lg font-medium opacity-60 max-w-xl mx-auto text-center mt-3">
                    Your daily medications to stay healthy and strong.
                </p>
            </div>

            {/* List */}
            <div className="grid gap-4 overflow-visible">
                {medications.length === 0 ? (
                    <div className="bg-card/50 border-2 border-dashed border-primary/20 p-16 text-center rounded-3xl">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                            <Pill className="w-10 h-10 text-primary" />
                        </div>
                        <p className="text-2xl font-black text-foreground mb-2">No medicines yet</p>
                        <p className="text-foreground/60 mb-8">Add your first medication to get started.</p>
                        <button
                            onClick={onAdd}
                            className="px-8 py-4 bg-primary text-white rounded-2xl text-lg font-bold shadow-xl shadow-primary/30 hover:scale-105 transition-all flex items-center gap-3 mx-auto"
                        >
                            <Plus className="w-5 h-5" />
                            Add Medicine
                        </button>
                    </div>
                ) : (
                    medications.map((med: any) => (
                        <div
                            key={med.id}
                            className="bg-white/[0.03] p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-white/[0.06] transition-all group relative overflow-visible"
                        >
                            {/* Left: Icon + Info */}
                            <div className="flex gap-5 items-center flex-1">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg relative shrink-0 ${med.priority === 'high'
                                    ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                                    : 'bg-gradient-to-br from-primary/20 to-primary/10 text-primary border border-primary/20'
                                    }`}>
                                    <Pill className="w-7 h-7" />
                                    {med.priority === 'high' && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-2xl font-black text-foreground truncate">{med.name}</h3>
                                    <div className="flex items-center gap-3 text-sm font-medium text-foreground/60 mt-1 flex-wrap">
                                        <span className="flex items-center gap-1.5">
                                            <Activity className="w-4 h-4 text-primary" />
                                            {med.dosage}
                                        </span>
                                        <span className="w-1 h-1 bg-foreground/30 rounded-full hidden md:block" />
                                        <span>{med.frequency}</span>
                                        {!med.ai_trained && (
                                            <>
                                                <span className="w-1 h-1 bg-foreground/30 rounded-full hidden md:block" />
                                                <span className="text-amber-500 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Needs Training
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                {/* Check with Camera - Primary Action */}
                                <button
                                    onClick={() => onVerify({ id: med.id, name: med.name })}
                                    className="flex-1 md:flex-none px-6 py-3 bg-secondary text-white rounded-xl font-bold shadow-lg shadow-secondary/20 hover:bg-primary hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Camera className="w-5 h-5" />
                                    <span>Check with Camera</span>
                                </button>

                                {/* Neural Train (if not trained) */}
                                {!med.ai_trained && (
                                    <button
                                        onClick={() => onFeed(med)}
                                        className="px-4 py-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl font-bold border border-amber-500/30 hover:bg-amber-500 hover:text-white transition-all flex items-center gap-2"
                                    >
                                        <Brain className="w-5 h-5" />
                                        <span className="hidden md:inline">Train AI</span>
                                    </button>
                                )}

                                {/* Action Menu (3-dot) */}
                                <div className="relative">
                                    <button
                                        onClick={(e) => handleOpenMenu(med.id, e)}
                                        className="p-3 hover:bg-foreground/10 rounded-xl transition-all"
                                    >
                                        <MoreVertical className="w-5 h-5 text-foreground/60" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {/* Fixed Position Dropdown Menu - rendered outside the card */}
                {openMenuId && (
                    <>
                        <div
                            className="fixed inset-0 z-[100]"
                            onClick={() => setOpenMenuId(null)}
                        />
                        <div
                            className="fixed z-[101] bg-card border border-card-border rounded-xl shadow-2xl py-2 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
                            style={{ top: menuPosition.y, left: menuPosition.x }}
                        >
                            {medications.filter((m: any) => m.id === openMenuId).map((med: any) => (
                                <div key={med.id}>
                                    <button
                                        onClick={() => { onEdit(med); setOpenMenuId(null); }}
                                        className="w-full px-4 py-2.5 text-left hover:bg-foreground/5 transition-colors flex items-center gap-3 text-foreground"
                                    >
                                        <Pencil className="w-4 h-4 text-primary" />
                                        <span className="font-medium">Edit Details</span>
                                    </button>
                                    {med.ai_trained && (
                                        <button
                                            onClick={() => { onFeed(med); setOpenMenuId(null); }}
                                            className="w-full px-4 py-2.5 text-left hover:bg-foreground/5 transition-colors flex items-center gap-3 text-foreground"
                                        >
                                            <RefreshCw className="w-4 h-4 text-amber-500" />
                                            <span className="font-medium">Retrain AI</span>
                                        </button>
                                    )}
                                    <hr className="my-2 border-card-border" />
                                    <button
                                        onClick={() => { onDelete(med); setOpenMenuId(null); }}
                                        className="w-full px-4 py-2.5 text-left hover:bg-red-500/10 transition-colors flex items-center gap-3 text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="font-medium">Delete</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Bottom Add Button */}
            {medications.length > 0 && (
                <div className="flex justify-center pt-4">
                    <button
                        onClick={onAdd}
                        className="px-6 py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl font-bold hover:bg-primary hover:text-white transition-all flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Add Another Medicine
                    </button>
                </div>
            )}
        </div>
    );
}

function CaregiverMedicationsView({ medications, onAdd, onVerify, onSeniorChange, selectedSeniorId, onFeed, onEdit, onDelete }: any) {
    const [seniors, setSeniors] = useState<any[]>([]);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Close menu on scroll (standard UX for fixed position dropdowns)
    useEffect(() => {
        if (!openMenuId) return;
        const handleScroll = () => setOpenMenuId(null);
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [openMenuId]);

    const handleOpenMenu = (medId: number, event: React.MouseEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const menuHeight = 160; // Approximate menu height
        const spaceBelow = window.innerHeight - rect.bottom;

        // If not enough space below, position above the button
        const y = spaceBelow < menuHeight
            ? rect.top - menuHeight - 8
            : rect.bottom + 8;

        setMenuPosition({ x: rect.right - 180, y });
        setOpenMenuId(openMenuId === medId ? null : medId);
    };

    useEffect(() => {
        const fetchSeniors = async () => {
            try {
                const response = await apiFetch('/caregiver/seniors');
                if (response.success) {
                    setSeniors(response.data);
                    if (!selectedSeniorId && response.data.length > 0) {
                        onSeniorChange(response.data[0].id);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch seniors:', err);
            }
        };
        fetchSeniors();
    }, []);

    return (
        <div className="space-y-16">
            {/* Back Button */}
            <div className="flex justify-center">
                <a
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-white/60 hover:text-primary hover:bg-primary/10 transition-all text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Dashboard</span>
                </a>
            </div>

            {/* Senior Switcher */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-card/40 backdrop-blur-md p-12 rounded-[48px] border border-card-border gap-10 mb-20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black tracking-tight">Identity Management</h3>
                        <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">Switch between patient records</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <select
                            value={selectedSeniorId ?? ''}
                            onChange={(e) => onSeniorChange(e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full bg-white/10 border border-white/20 text-white px-6 py-3 pr-12 rounded-2xl font-bold appearance-none focus:outline-none focus:border-secondary transition-colors cursor-pointer"
                        >
                            <option value="" disabled className="bg-gray-900 text-white">Select a Patient</option>
                            {seniors.map((s: any) => (
                                <option key={s.id} value={s.id} className="bg-gray-900 text-white">{s.name} (ID: {s.id})</option>
                            ))}
                        </select>
                        {/* Dropdown Arrow */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2 text-secondary font-black text-[10px] uppercase tracking-[0.2em]">
                        <Clock className="w-3 h-3 text-primary" />
                        Live Prescription Radar
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black text-foreground tracking-tight underline decoration-primary/30 decoration-8 underline-offset-8">Active Protocols</h1>
                    <p className="opacity-60 mt-6 max-w-lg font-medium text-sm leading-relaxed">
                        Precision monitoring system for patient adherence. AI vision fingerprints ensure 99.8% verification accuracy across all dispensing cycles.
                    </p>
                </div>
                <button
                    onClick={onAdd}
                    className="group px-8 py-4 bg-primary text-white rounded-[24px] font-black shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    Register New Protocol
                </button>
            </div>

            {/* List Section */}
            <div className="grid gap-8 overflow-visible">
                {medications.length === 0 ? (
                    <div className="medical-card p-20 text-center group border-dashed border-[3px] border-card-border/50 bg-card/10">
                        <div className="w-20 h-20 rounded-3xl bg-secondary/10 flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-500">
                            <Pill className="w-10 h-10 text-secondary" />
                        </div>
                        <p className="text-2xl font-black text-foreground tracking-tight">System Inventory Empty</p>
                        <p className="text-[10px] font-black opacity-30 mt-3 uppercase tracking-[0.2em]">Awaiting initial serialized prescription data</p>
                    </div>
                ) : (
                    medications.map((med: any) => (
                        <div key={med.id} className="medical-card p-10 flex flex-col md:flex-row justify-between items-center group hover:border-primary/40 transition-all bg-card/60 backdrop-blur-xl border-l-[10px] border-l-primary/20 overflow-visible">
                            <div className="flex gap-6 items-center">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner relative ${med.priority === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-primary/5 text-primary'
                                    }`}>
                                    <Pill className="w-8 h-8" />
                                    {med.priority === 'high' && (
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-foreground tracking-tight mb-1">{med.name}</h3>
                                    <div className="flex items-center gap-4 text-[10px] font-black opacity-40 uppercase tracking-[0.2em]">
                                        <span className="flex items-center gap-1.5 bg-background px-2 py-0.5 rounded-md border border-card-border">
                                            <Activity className="w-3 h-3" />
                                            {med.dosage}
                                        </span>
                                        <span className="w-1 h-1 bg-foreground/20 rounded-full" />
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3" />
                                            {med.frequency}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 md:mt-0 flex gap-4 w-full md:w-auto">
                                <button
                                    onClick={() => onVerify({ id: med.id, name: med.name })}
                                    className="flex-1 md:flex-none px-10 py-4 bg-secondary text-white rounded-2xl font-black hover:bg-primary transition-all shadow-xl shadow-secondary/20 flex items-center justify-center gap-3 group/btn hover:-translate-y-1"
                                >
                                    <Camera className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                    <span>Radar Verification</span>
                                    <ArrowRight className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                                </button>
                                {!med.ai_trained && (
                                    <button
                                        onClick={() => onFeed(med)}
                                        className="px-6 py-4 bg-primary/10 text-primary rounded-2xl font-black border-2 border-dashed border-primary/30 hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
                                        title="Neural Training Required"
                                    >
                                        <Brain className="w-5 h-5" />
                                        <span>Feed AI</span>
                                    </button>
                                )}
                                <div className="relative">
                                    <button
                                        onClick={(e) => handleOpenMenu(med.id, e)}
                                        className="p-4 bg-background border border-card-border text-foreground/40 hover:text-primary rounded-2xl transition-all hover:bg-primary/5 shadow-sm"
                                    >
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {/* Fixed Position Dropdown Menu - rendered outside the card */}
                {openMenuId && (
                    <>
                        <div
                            className="fixed inset-0 z-[100]"
                            onClick={() => setOpenMenuId(null)}
                        />
                        <div
                            className="fixed z-[101] bg-card border border-card-border rounded-xl shadow-2xl py-2 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
                            style={{ top: menuPosition.y, left: menuPosition.x }}
                        >
                            {medications.filter((m: any) => m.id === openMenuId).map((med: any) => (
                                <div key={med.id}>
                                    <button
                                        onClick={() => { onEdit(med); setOpenMenuId(null); }}
                                        className="w-full px-4 py-2.5 text-left hover:bg-foreground/5 transition-colors flex items-center gap-3 text-foreground"
                                    >
                                        <Pencil className="w-4 h-4 text-primary" />
                                        <span className="font-medium">Edit Details</span>
                                    </button>
                                    {med.ai_trained && (
                                        <button
                                            onClick={() => { onFeed(med); setOpenMenuId(null); }}
                                            className="w-full px-4 py-2.5 text-left hover:bg-foreground/5 transition-colors flex items-center gap-3 text-foreground"
                                        >
                                            <RefreshCw className="w-4 h-4 text-amber-500" />
                                            <span className="font-medium">Retrain AI</span>
                                        </button>
                                    )}
                                    <hr className="my-2 border-card-border" />
                                    <button
                                        onClick={() => { onDelete(med); setOpenMenuId(null); }}
                                        className="w-full px-4 py-2.5 text-left hover:bg-red-500/10 transition-colors flex items-center gap-3 text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="font-medium">Delete</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Sub-component for icons that aren't imported or for better organization
function Activity(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    );
}
