"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Shield, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface ConnectSeniorModalProps {
    onClose: () => void;
    onConnected: () => void;
}

export default function ConnectSeniorModal({ onClose, onConnected }: ConnectSeniorModalProps) {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username) return;

        try {
            setLoading(true);
            setStatus('idle');
            const response = await apiFetch('/caregiver/add-senior', {
                method: 'POST',
                body: JSON.stringify({ username })
            });

            if (response.success) {
                setStatus('success');
                setMessage(response.message);
                setTimeout(() => {
                    onConnected();
                    onClose();
                }, 2000);
            } else {
                throw new Error(response.message || 'Failed to connect');
            }
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message || 'Connection failed. Please check the username.');
        } finally {
            setLoading(false);
        }
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
                className="relative w-full max-w-xl medical-card p-12 bg-card border border-card-border overflow-hidden rounded-[48px] shadow-3xl"
            >
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 p-3 rounded-2xl hover:bg-background transition-colors"
                >
                    <X className="w-6 h-6 opacity-30" />
                </button>

                <div className="flex flex-col items-center text-center mb-10">
                    <div className="w-20 h-20 rounded-[28px] bg-primary/10 flex items-center justify-center mb-6 text-primary border border-primary/20">
                        <UserPlus className="w-10 h-10" />
                    </div>
                    <h2 className="text-4xl font-black text-foreground tracking-tight mb-3">Attach Patient Fleet</h2>
                    <p className="text-foreground/40 font-medium">Enter the senior&apos;s username to synchronize their telemetry feed.</p>
                </div>

                <form onSubmit={handleConnect} className="space-y-6">
                    <div className="relative group">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-primary/10 group-focus-within:bg-primary transition-colors">
                            <Shield className="w-5 h-5 text-primary group-focus-within:text-white" />
                        </div>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Patient Username"
                            required
                            className="w-full !pl-20 !pr-6 py-6 bg-background/50 border-2 border-card-border focus:border-primary rounded-[28px] font-black text-xl transition-all outline-none"
                        />
                    </div>

                    <AnimatePresence mode="wait">
                        {status === 'success' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-5 bg-accent/10 border border-accent/20 rounded-[22px] flex items-center gap-4 text-accent"
                            >
                                <CheckCircle2 className="w-6 h-6 shrink-0" />
                                <p className="font-bold text-sm tracking-tight">{message}</p>
                            </motion.div>
                        )}
                        {status === 'error' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-5 bg-red-500/10 border border-red-500/20 rounded-[22px] flex items-center gap-4 text-red-500"
                            >
                                <AlertCircle className="w-6 h-6 shrink-0" />
                                <p className="font-bold text-sm tracking-tight">{message}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={loading || status === 'success'}
                        className="w-full py-6 bg-primary text-white rounded-[28px] font-black text-xl shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-3 mt-4"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="uppercase tracking-[0.2em] text-sm">Synchronizing...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-6 h-6" />
                                Initialize Connection
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-10 pt-10 border-t border-card-border/50 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">
                        Secure End-to-End Medical Telemetry Connection
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
