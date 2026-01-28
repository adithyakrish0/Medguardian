"use client";

import { useState } from 'react';
import { useMedications } from '@/hooks/useMedications';
import AIVerificationModal from '@/components/AIVerificationModal';
import AddMedicationModal from '@/components/AddMedicationModal';
import { apiFetch } from '@/lib/api';
import {
    Pill,
    Plus,
    Camera,
    Settings,
    AlertTriangle,
    Clock,
    CheckCircle2
} from 'lucide-react';

export default function MedicationsPage() {
    const { medications, loading, error, markAsTaken, refresh } = useMedications();
    const [verifyingMed, setVerifyingMed] = useState<{ id: number, name: string } | null>(null);
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="font-bold opacity-40 animate-pulse uppercase tracking-widest text-[10px]">Synchronizing prescriptions...</p>
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
        <div className="space-y-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2 text-secondary font-black text-[10px] uppercase tracking-[0.2em]">
                        <Clock className="w-3 h-3" />
                        Live Prescription Radar
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black text-foreground tracking-tight">Active Medications</h1>
                    <p className="opacity-60 mt-3 max-w-lg">
                        Manage your treatment protocols and digital prescriptions. Our AI oversight ensures dosage precision.
                    </p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="group px-8 py-4 bg-primary text-white rounded-[24px] font-black shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    Register New Protocol
                </button>
            </div>

            {/* List Section */}
            <div className="grid gap-6">
                {medications.length === 0 ? (
                    <div className="medical-card p-20 text-center group border-dashed border-[3px] border-card-border/50">
                        <div className="w-20 h-20 rounded-3xl bg-secondary/10 flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-500">
                            <Pill className="w-10 h-10 text-secondary" />
                        </div>
                        <p className="text-2xl font-black text-foreground tracking-tight">Digital Cabinet Empty</p>
                        <p className="text-xs font-bold opacity-30 mt-3 uppercase tracking-widest">Awaiting first prescription entry</p>
                    </div>
                ) : (
                    medications.map((med) => (
                        <div key={med.id} className="medical-card p-8 flex flex-col md:flex-row justify-between items-start md:items-center group hover:border-primary/30 transition-all bg-card/50 backdrop-blur-md">
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
                                    <div className="flex items-center gap-4 text-xs font-bold opacity-40 uppercase tracking-widest">
                                        <span className="flex items-center gap-1.5">
                                            <Activity className="w-3.5 h-3.5" />
                                            {med.dosage}
                                        </span>
                                        <span className="w-1 h-1 bg-foreground/20 rounded-full" />
                                        <span>{med.frequency}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 md:mt-0 flex gap-4 w-full md:w-auto">
                                <button
                                    onClick={() => setVerifyingMed({ id: med.id, name: med.name })}
                                    className="flex-1 md:flex-none px-10 py-4 bg-secondary text-white rounded-2xl font-black hover:bg-primary transition-all shadow-xl shadow-secondary/20 flex items-center justify-center gap-3 group/btn"
                                >
                                    <Camera className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                    <span>AI Verification</span>
                                </button>
                                <button className="p-4 bg-background border border-card-border text-foreground/40 hover:text-primary rounded-2xl transition-all hover:bg-primary/5">
                                    <Settings className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

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
