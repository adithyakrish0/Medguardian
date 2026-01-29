"use client";

import { useState, useEffect } from 'react';
import { useMedications } from '@/hooks/useMedications';
import AIVerificationModal from '@/components/AIVerificationModal';
import AddMedicationModal from '@/components/AddMedicationModal';
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
    Users,
    Brain
} from 'lucide-react';
import AIFeedModal from '@/components/AIFeedModal';

export default function MedicationsPage() {
    const [selectedSeniorId, setSelectedSeniorId] = useState<number | undefined>(undefined);
    const { medications, loading: medsLoading, error, markAsTaken, refresh } = useMedications(selectedSeniorId);
    const { user, loading: userLoading } = useUser();
    const [verifyingMed, setVerifyingMed] = useState<{ id: number, name: string } | null>(null);
    const [feedingMed, setFeedingMed] = useState<any | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
        <div className="w-full">
            {user?.role === 'caregiver' ? (
                <CaregiverMedicationsView
                    medications={medications}
                    onAdd={() => setIsAddModalOpen(true)}
                    onVerify={(med: { id: number; name: string }) => setVerifyingMed(med)}
                    onSeniorChange={(id: number | undefined) => setSelectedSeniorId(id)}
                    selectedSeniorId={selectedSeniorId}
                    onFeed={setFeedingMed}
                />
            ) : (
                <SeniorMedicationsView
                    medications={medications}
                    onAdd={() => setIsAddModalOpen(true)}
                    onVerify={(med: { id: number; name: string }) => setVerifyingMed(med)}
                    onFeed={setFeedingMed}
                />
            )}

            {/* Modals */}
            <AddMedicationModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddMedication}
            />

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

function SeniorMedicationsView({ medications, onAdd, onVerify, onFeed }: any) {
    return (
        <div className="space-y-12 py-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header */}
            <div className="text-center space-y-4 mb-16">
                <h1 className="text-6xl md:text-7xl font-black text-foreground tracking-tight leading-tight">
                    My Medicines
                </h1>
                <p className="text-xl font-medium opacity-60 max-w-2xl mx-auto italic">
                    Things I need to take today to stay healthy and strong.
                </p>
            </div>

            {/* List */}
            <div className="grid gap-8">
                {medications.length === 0 ? (
                    <div className="medical-card p-24 text-center border-dashed border-4 border-primary/20 bg-primary/5 rounded-[48px]">
                        <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-10">
                            <Pill className="w-16 h-16 text-primary" />
                        </div>
                        <p className="text-4xl font-black text-foreground mb-4">No medicines yet</p>
                        <p className="text-lg opacity-60 mb-10">Tap the big blue button below to add your first pill.</p>
                        <button
                            onClick={onAdd}
                            className="px-12 py-6 bg-primary text-white rounded-[32px] text-2xl font-black shadow-2xl shadow-primary/40 hover:scale-105 transition-all flex items-center gap-4 mx-auto"
                        >
                            <Plus className="w-8 h-8" />
                            Add My First Pill
                        </button>
                    </div>
                ) : (
                    medications.map((med: any) => (
                        <div key={med.id} className="medical-card p-10 rounded-[48px] border-2 border-primary/10 bg-white dark:bg-card/50 flex flex-col md:flex-row justify-between items-center gap-10 hover:border-primary/40 hover:shadow-3xl transition-all group relative">
                            <div className="flex gap-10 items-center w-full md:w-auto">
                                <div className={`w-28 h-28 rounded-[36px] flex items-center justify-center shadow-xl relative ${med.priority === 'high' ? 'bg-red-500 text-white' : 'bg-primary/10 text-primary border-4 border-primary/5'
                                    }`}>
                                    <Pill className="w-14 h-14" />
                                    {med.priority === 'high' && (
                                        <span className="absolute -top-3 -right-3 flex h-8 w-8">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-8 w-8 bg-red-600 border-4 border-white"></span>
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter leading-none">{med.name}</h3>
                                    <div className="flex items-center gap-4 text-xl font-bold opacity-60">
                                        <span className="flex items-center gap-2">
                                            <Activity className="w-6 h-6 text-primary" />
                                            {med.dosage}
                                        </span>
                                        <span className="w-2 h-2 bg-foreground/20 rounded-full" />
                                        <span>{med.frequency}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => onVerify({ id: med.id, name: med.name })}
                                className="w-full md:w-auto px-16 py-8 bg-secondary text-white rounded-[40px] text-3xl font-black shadow-3xl shadow-secondary/30 hover:bg-primary hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-6 group/cam"
                            >
                                <Camera className="w-12 h-12 group-hover/cam:rotate-12 transition-transform" />
                                <span>Check with Camera</span>
                            </button>

                            {!med.ai_trained ? (
                                <button
                                    onClick={() => onFeed(med)}
                                    className="w-full md:w-auto px-16 py-8 bg-primary/20 text-primary rounded-[40px] text-3xl font-black border-4 border-dashed border-primary/40 hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-6"
                                >
                                    <Brain className="w-12 h-12" />
                                    <span>Neural Train</span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => onFeed(med)}
                                    className="absolute top-4 right-4 p-4 opacity-50 hover:opacity-100 hover:bg-primary/10 rounded-full transition-all group-hover:opacity-100 flex items-center gap-2 text-sm font-bold text-primary"
                                    title="Retrain AI Model"
                                >
                                    <Brain className="w-5 h-5" />
                                    <span className="sr-only md:not-sr-only">Retrain</span>
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Add Button for Elders */}
            {medications.length > 0 && (
                <div className="flex justify-center pt-8">
                    <button
                        onClick={onAdd}
                        className="px-10 py-6 bg-primary/10 text-primary border-2 border-primary/20 rounded-[32px] text-xl font-black hover:bg-primary hover:text-white transition-all flex items-center gap-3"
                    >
                        <Plus className="w-6 h-6" />
                        Add Another Medicine
                    </button>
                </div>
            )}
        </div>
    );
}

function CaregiverMedicationsView({ medications, onAdd, onVerify, onSeniorChange, selectedSeniorId, onFeed }: any) {
    const [seniors, setSeniors] = useState<any[]>([]);

    useEffect(() => {
        const fetchSeniors = async () => {
            try {
                const response = await apiFetch('/caregiver/api/seniors');
                if (response.success) {
                    setSeniors(response.data);
                }
            } catch (err) {
                console.error('Failed to fetch seniors:', err);
            }
        };
        fetchSeniors();
    }, []);

    return (
        <div className="space-y-10 py-4">
            {/* Senior Switcher */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-card/40 backdrop-blur-md p-6 rounded-[32px] border border-card-border gap-6 mb-12">
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
                    <select
                        value={selectedSeniorId ?? ''}
                        onChange={(e) => onSeniorChange(e.target.value ? Number(e.target.value) : undefined)}
                        className="bg-background border border-card-border text-foreground px-6 py-3 rounded-2xl font-bold flex-1 md:w-64 appearance-none focus:outline-none focus:border-secondary transition-colors"
                    >
                        <option value="">Local Environment</option>
                        {seniors.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name} (ID: {s.id})</option>
                        ))}
                    </select>
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
            <div className="grid gap-6">
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
                        <div key={med.id} className="medical-card p-8 flex flex-col md:flex-row justify-between items-start md:items-center group hover:border-primary/40 transition-all bg-card/60 backdrop-blur-xl border-l-[10px] border-l-primary/20">
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
                                <button className="p-4 bg-background border border-card-border text-foreground/40 hover:text-primary rounded-2xl transition-all hover:bg-primary/5 shadow-sm">
                                    <Settings className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
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
