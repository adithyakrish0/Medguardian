"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/hooks/useUser';
import { Phone, X, Loader2, AlertTriangle, Bell } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/NiceToast';

export default function SOSButton() {
    const [showModal, setShowModal] = useState(false);
    const [sending, setSending] = useState(false);
    const { showToast } = useToast();
    const { user } = useUser();

    const handleSOS = async () => {
        setSending(true);
        try {
            const res = await apiFetch('/emergency/sos', { method: 'POST' });
            if (res.success) {
                showToast('Emergency alert sent!', 'success');
            } else {
                showToast(res.error || 'Failed to send alert', 'error');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to send alert', 'error');
        } finally {
            setSending(false);
            setShowModal(false);
        }
    };

    if (user?.role === 'caregiver') {
        return (
            <button
                className="fixed bottom-8 right-8 z-50 bg-slate-900 border border-white/10 hover:border-red-500/50 text-white rounded-full w-20 h-20 flex flex-col items-center justify-center shadow-2xl backdrop-blur-xl transition-all active:scale-95 group"
                onClick={() => showToast("Alert Inbox: No active emergencies.", "info")}
            >
                <div className="relative">
                    <Bell className="w-8 h-8 text-slate-400 group-hover:text-red-500 transition-colors" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-2 border-slate-900 animate-pulse" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest mt-1 text-slate-500 group-hover:text-red-500 transition-colors">ALERTS</span>
            </button>
        );
    }

    return (
        <>
            {/* SOS Button — fixed bottom-right */}
            <button
                onClick={() => setShowModal(true)}
                className="fixed bottom-8 right-8 z-50 bg-red-600 hover:bg-red-700 text-white rounded-full w-24 h-24 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(220,38,38,0.5)] hover:shadow-red-500/60 transition-all active:scale-90 group"
            >
                {/* Dramatic Radar Pulse Rings */}
                <span className="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-40" />
                <span className="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-20 [animation-delay:0.5s]" />

                <div className="relative z-10 flex flex-col items-center gap-1">
                    <Phone className="w-8 h-8 fill-current" />
                    <span className="text-sm font-black uppercase tracking-[0.2em]">SOS</span>
                </div>
            </button>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => !sending && setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-gray-800 border border-red-500 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                </div>
                                <h3 className="text-lg font-black text-gray-100">Emergency SOS</h3>
                            </div>

                            <p className="text-sm text-gray-400 mb-6">
                                Send emergency alert to your caregivers? They will be notified immediately.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    disabled={sending}
                                    className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-300 font-bold text-sm hover:bg-gray-700 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSOS}
                                    disabled={sending}
                                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {sending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Phone className="w-4 h-4" />
                                    )}
                                    {sending ? 'Sending...' : 'Send SOS'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
