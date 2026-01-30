"use client";

import { motion } from 'framer-motion';
import { X, Trash2, ShieldAlert, Loader2 } from 'lucide-react';

interface DisconnectConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    seniorName: string;
    loading?: boolean;
}

export default function DisconnectConfirmModal({ isOpen, onClose, onConfirm, seniorName, loading }: DisconnectConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-background/80 backdrop-blur-xl"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg medical-card p-12 bg-card border border-card-border overflow-hidden rounded-[48px] shadow-3xl"
            >
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 p-3 rounded-2xl hover:bg-background transition-colors transition-all"
                >
                    <X className="w-6 h-6 opacity-30" />
                </button>

                <div className="flex flex-col items-center text-center mb-10">
                    <div className="w-20 h-20 rounded-[28px] bg-red-500/10 flex items-center justify-center mb-6 text-red-500 border border-red-500/20">
                        <Trash2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-4xl font-black text-foreground tracking-tight mb-3 italic">Security Protocol</h2>
                    <p className="text-lg font-bold text-foreground">Disconnect {seniorName}?</p>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[28px] mb-10 flex items-start gap-4">
                    <ShieldAlert className="w-6 h-6 text-red-500 shrink-0 mt-1" />
                    <p className="text-sm font-bold text-red-500 leading-relaxed">
                        WARNING: You will lose access to all real-time health telemetry and medication compliance data for this patient.
                    </p>
                </div>

                <div className="grid gap-4">
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="w-full py-6 bg-red-600 text-white rounded-[28px] font-black text-xl shadow-2xl shadow-red-500/30 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-4 group"
                    >
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                <Trash2 className="w-6 h-6" />
                                CONFIRM DISCONNECT
                            </>
                        )}
                    </button>

                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="w-full py-5 bg-background border border-card-border text-foreground/40 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-white/5 transition-all mt-2"
                    >
                        Cancel
                    </button>
                </div>

                <div className="mt-10 pt-10 border-t border-card-border/50 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">
                        Action Required: Manual Registry Removal
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
