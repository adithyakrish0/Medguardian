"use client";

import { motion } from 'framer-motion';
import { X, Phone, MessageSquare, ShieldCheck } from 'lucide-react';

interface ContactChoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    senior: {
        name: string;
        phone: string;
    };
}

export default function ContactChoiceModal({ isOpen, onClose, senior }: ContactChoiceModalProps) {
    if (!isOpen) return null;

    const handleCall = () => {
        window.location.href = `tel:${senior.phone}`;
        onClose();
    };

    const handleWhatsApp = () => {
        const cleanPhone = senior.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
        onClose();
    };

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
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 p-3 rounded-2xl hover:bg-background transition-colors transition-all"
                >
                    <X className="w-6 h-6 opacity-30" />
                </button>

                <div className="flex flex-col items-center text-center mb-10">
                    <div className="w-20 h-20 rounded-[28px] bg-accent/10 flex items-center justify-center mb-6 text-accent border border-accent/20">
                        <Phone className="w-10 h-10" />
                    </div>
                    <h2 className="text-4xl font-black text-foreground tracking-tight mb-3 italic">Establish Contact</h2>
                    <p className="text-foreground/40 font-bold uppercase tracking-widest text-[10px] mb-2">Verifying Channel for {senior.name}</p>
                    <p className="text-xl font-black text-foreground">{senior.phone}</p>
                </div>

                <div className="grid gap-4">
                    <button
                        onClick={handleCall}
                        className="w-full py-6 bg-primary text-white rounded-[28px] font-black text-xl shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group"
                    >
                        <Phone className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                        DIRECT VOICE CALL
                    </button>

                    <button
                        onClick={handleWhatsApp}
                        className="w-full py-6 bg-accent text-white rounded-[28px] font-black text-xl shadow-2xl shadow-accent/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group"
                    >
                        <MessageSquare className="w-6 h-6 group-hover:-rotate-12 transition-transform" />
                        WHATSAPP MESSAGE
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-5 bg-background border border-card-border text-foreground/40 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-white/5 transition-all mt-2"
                    >
                        Cancel
                    </button>
                </div>

                <div className="mt-10 pt-10 border-t border-card-border/50 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-30">
                        <ShieldCheck className="w-3 h-3" />
                        <p className="text-[9px] font-black uppercase tracking-[0.2em]">
                            Encrypted Communication Link
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
