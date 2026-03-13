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
    RefreshCw,
    Loader2
} from 'lucide-react';
import AIFeedModal from '@/components/AIFeedModal';
import { useToast } from '@/components/NiceToast';
import { SeniorOnly } from '@/components/RoleGuard';

export default function MedicationsPage() {
    const [selectedSeniorId, setSelectedSeniorId] = useState<number | undefined>(undefined);
    const { medications, loading: medsLoading, error, markAsTaken, refresh } = useMedications(selectedSeniorId);
    const { user, loading: userLoading } = useUser();
    const { showToast } = useToast();
    const [verifyingMed, setVerifyingMed] = useState<{ id: number, name: string } | null>(null);
    const [feedingMed, setFeedingMed] = useState<any | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingMed, setEditingMed] = useState<any | null>(null);
    const [deletingMed, setDeletingMed] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
        setIsDeleting(true);
        try {
            const response = await apiFetch(`/medications/${medId}`, {
                method: 'DELETE'
            });
            if (response.success) {
                showToast('Medication deleted successfully', 'success');
                refresh();
                setDeletingMed(null);
            } else {
                showToast(response.error || 'Failed to delete medication', 'error');
            }
        } catch (err) {
            console.error('Error deleting medication:', err);
            showToast('A network error occurred while deleting', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    if (medsLoading || userLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                <p className="font-bold text-gray-500 uppercase tracking-widest text-xs animate-pulse">Synchronizing Inventory...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 p-8 rounded-r-3xl text-red-700 dark:text-red-400">
                <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="w-6 h-6" />
                    <p className="font-black text-xl">System Synchronization Error</p>
                </div>
                <p className="font-medium opacity-80">{error}</p>
            </div>
        );
    }

    return (
        <SeniorOnly>
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
                                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/10 flex items-center justify-center mx-auto mb-4">
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
                                        disabled={isDeleting}
                                        onClick={() => handleDeleteMedication(deletingMed.id)}
                                        className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
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
        </SeniorOnly>
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
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all text-sm font-medium mb-8"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Dashboard</span>
                </a>

                {/* Title */}
                <h1 className="text-4xl md:text-5xl font-bold text-gray-100 tracking-tight text-center">
                    My Medicines
                </h1>
                <p className="text-lg font-medium text-gray-400 max-w-xl mx-auto text-center mt-3">
                    Your daily medications to stay healthy and strong.
                </p>
            </div>

            {/* List */}
            <div className="grid gap-4 overflow-visible">
                {medications.length === 0 ? (
                    <div className="text-center py-24 bg-gray-800/50 border border-gray-700 border-dashed rounded-xl">
                        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Pill className="h-10 w-10 text-blue-400" />
                        </div>
                        <p className="text-gray-200 text-xl font-bold">No medicines yet</p>
                        <p className="text-gray-500 text-sm mt-2 mb-8">Add your first medication to get started.</p>
                        <button
                            onClick={onAdd}
                            className="px-8 py-4 bg-blue-600 text-white rounded-xl text-lg font-bold shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all flex items-center gap-3 mx-auto cursor-pointer"
                        >
                            <Plus className="w-5 h-5" />
                            Add Medicine
                        </button>
                    </div>
                ) : (
                    medications.map((med: any) => (
                        <div
                            key={med.id}
                            className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-gray-700/50 transition-all group relative overflow-visible"
                        >
                            {/* Left: Icon + Info */}
                            <div className="flex gap-5 items-center flex-1">
                                <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-lg relative shrink-0 ${med.priority === 'high'
                                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    }`}>
                                    <Pill className="w-7 h-7" />
                                    {med.priority === 'high' && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-gray-800"></span>
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-2xl font-bold text-gray-100 truncate">{med.name}</h3>
                                    <div className="flex items-center gap-3 text-sm font-medium text-gray-400 mt-1 flex-wrap">
                                        <span className="flex items-center gap-1.5">
                                            <Activity className="w-4 h-4 text-blue-400" />
                                            {med.dosage}
                                        </span>
                                        <span className="w-1 h-1 bg-gray-600 rounded-full hidden md:block" />
                                        <span>{med.frequency}</span>
                                        {!med.ai_trained && (
                                            <>
                                                <span className="w-1 h-1 bg-gray-600 rounded-full hidden md:block" />
                                                <span className="text-amber-400 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Needs Training
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                                {/* Check with Camera - Primary Action */}
                                <button
                                    onClick={() => onVerify({ id: med.id, name: med.name })}
                                    className="flex-1 md:flex-none px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Camera className="w-5 h-5" />
                                    <span>Check with Camera</span>
                                </button>

                                {/* Neural Train (if not trained) */}
                                {!med.ai_trained && (
                                    <button
                                        onClick={() => onFeed(med)}
                                        className="px-4 py-3 bg-amber-500/10 text-amber-400 rounded-xl font-bold border border-amber-500/30 hover:bg-amber-500 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
                                    >
                                        <Brain className="w-5 h-5" />
                                        <span className="hidden lg:inline">Train AI</span>
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
                                        className="w-full px-4 py-2.5 text-left hover:bg-red-50 dark:bg-red-900/10 transition-colors flex items-center gap-3 text-red-500"
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
                <div className="flex justify-center pt-8">
                    <button
                        onClick={onAdd}
                        className="px-8 py-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl font-bold hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
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
            <div className="flex justify-center mb-8">
                <a
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Dashboard</span>
                </a>
            </div>

            {/* Senior Switcher */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-gray-800 border border-gray-700 p-8 rounded-xl gap-10 mb-12 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-100">Identity Management</h3>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">Switch between patient records</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <select
                            value={selectedSeniorId ?? ''}
                            onChange={(e) => onSeniorChange(e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-6 py-3 pr-12 rounded-xl font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                        >
                            <option value="" disabled className="bg-gray-900 text-white">Select a Patient</option>
                            {seniors.map((s: any) => (
                                <option key={s.id} value={s.id} className="bg-gray-900 text-white">{s.name} (ID: {s.id})</option>
                            ))}
                        </select>
                        {/* Dropdown Arrow */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold text-xs uppercase tracking-widest">
                        <Clock className="w-3.5 h-3.5" />
                        Live Prescription Radar
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-100 tracking-tight">Active Protocols</h1>
                    <p className="text-gray-400 mt-4 max-w-lg font-medium text-sm leading-relaxed">
                        Precision monitoring system for patient adherence. AI vision fingerprints ensure verification accuracy across all dispensing cycles.
                    </p>
                </div>
                <button
                    onClick={onAdd}
                    className="group px-8 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all flex items-center gap-3 cursor-pointer"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    Register New Protocol
                </button>
            </div>

            {/* List Section */}
            <div className="grid gap-8 overflow-visible">
                {medications.length === 0 ? (
                    <div className="text-center py-12">
                        <Pill className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                        <p className="text-gray-400 text-lg font-medium">System Inventory Empty</p>
                        <p className="text-gray-500 text-sm mt-1">Awaiting initial serialized prescription data</p>
                    </div>
                ) : (
                    medications.map((med: any) => (
                        <div key={med.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center group hover:bg-gray-700/50 transition-all overflow-visible shadow-sm">
                            <div className="flex gap-6 items-center">
                                <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-inner relative ${med.priority === 'high' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    }`}>
                                    <Pill className="w-8 h-8" />
                                    {med.priority === 'high' && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-gray-800"></span>
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-100 tracking-tight mb-1">{med.name}</h3>
                                    <div className="flex items-center gap-4 text-xs font-medium text-gray-400 uppercase tracking-widest">
                                        <span className="flex items-center gap-1.5 bg-gray-900 px-2 py-0.5 rounded-lg border border-gray-700">
                                            <Activity className="w-3.5 h-3.5" />
                                            {med.dosage}
                                        </span>
                                        <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                                            {med.frequency}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 md:mt-0 flex gap-4 w-full md:w-auto">
                                <button
                                    onClick={() => onVerify({ id: med.id, name: med.name })}
                                    className="flex-1 md:flex-none px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-3 group/btn cursor-pointer"
                                >
                                    <Camera className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                    <span>Radar Verification</span>
                                    <ArrowRight className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                                </button>
                                {!med.ai_trained && (
                                    <button
                                        onClick={() => onFeed(med)}
                                        className="px-6 py-3 bg-blue-500/10 text-blue-400 rounded-xl font-bold border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                                        title="Neural Training Required"
                                    >
                                        <Brain className="w-5 h-5" />
                                        <span>Feed AI</span>
                                    </button>
                                )}
                                <div className="relative">
                                    <button
                                        onClick={(e) => handleOpenMenu(med.id, e)}
                                        className="p-3 bg-gray-900 border border-gray-700 text-gray-400 hover:text-blue-400 rounded-xl transition-all hover:bg-gray-700 shadow-sm cursor-pointer"
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
                                        className="w-full px-4 py-2.5 text-left hover:bg-red-50 dark:bg-red-900/10 transition-colors flex items-center gap-3 text-red-500"
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
