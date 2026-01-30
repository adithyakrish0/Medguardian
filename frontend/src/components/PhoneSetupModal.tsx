"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, X, Shield, CheckCircle2, Loader2 } from 'lucide-react';

interface PhoneSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPhone?: string;
    onSuccess: (newPhone: string) => Promise<void>;
}

export default function PhoneSetupModal({ isOpen, onClose, currentPhone, onSuccess }: PhoneSetupModalProps) {
    const [phone, setPhone] = useState(() => {
        if (currentPhone?.startsWith('+91')) {
            return currentPhone.slice(3).trim();
        }
        return currentPhone || "";
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanPhone = phone.trim();
        if (!cleanPhone) return;

        setLoading(true);
        try {
            // Prepend India prefix for backend
            const fullPhone = `+91 ${cleanPhone}`;
            await onSuccess(fullPhone);
            setStatus('success');
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            console.error("Failed to update phone", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="w-full max-w-lg bg-card border border-white/10 rounded-[40px] shadow-3xl relative overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32" />

                        <div className="p-10 relative z-10">
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all opacity-40 hover:opacity-100"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center mb-8">
                                    <Phone className="w-10 h-10 text-primary animate-pulse" />
                                </div>

                                <h3 className="text-3xl font-black text-foreground tracking-tighter mb-4">
                                    {status === 'success' ? 'Profile Secured!' : 'Safety Contact Setup'}
                                </h3>

                                <p className="text-sm opacity-50 font-bold mb-10 max-w-xs leading-relaxed">
                                    {status === 'success'
                                        ? 'Your caregivers can now reach you instantly for health updates.'
                                        : 'Please enter your primary phone number so caregivers can contact you during critical health events.'}
                                </p>

                                {status === 'idle' ? (
                                    <form onSubmit={handleSubmit} className="w-full space-y-6">
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none opacity-30 group-focus-within:opacity-100 transition-opacity">
                                                <Shield className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="absolute inset-y-0 left-16 flex items-center pointer-events-none">
                                                <span className="text-lg font-black text-primary/60 pr-2 border-r border-white/10">+91</span>
                                            </div>
                                            <input
                                                autoFocus
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="98765 43210"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-32 pr-6 font-black text-foreground placeholder:opacity-20 focus:border-primary focus:bg-white/10 outline-none transition-all text-lg"
                                            />
                                        </div>

                                        <button
                                            disabled={loading || !phone.trim()}
                                            type="submit"
                                            className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
                                        >
                                            {loading ? (
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                            ) : (
                                                'ENABLE EMERGENCY SYNC'
                                            )}
                                        </button>
                                    </form>
                                ) : (
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="py-10"
                                    >
                                        <CheckCircle2 className="w-16 h-16 text-accent mx-auto" />
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
