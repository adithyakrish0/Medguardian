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
            <div className="fixed bottom-8 right-8 z-50 group">
                <button
                    className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 hover:border-red-500/40 flex items-center justify-center shadow-lg transition-all active:scale-95 group"
                    onClick={() => showToast("Alert Inbox: No active emergencies.", "info")}
                >
                    <div className="relative">
                        <Bell className={`w-5 h-5 text-slate-400 group-hover:text-red-400 transition-colors`} />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-slate-800 rounded-full" />
                    </div>
                </button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 group">
            {/* SOS Label - Hover Only */}
            <span className="text-[10px] font-medium text-slate-400 bg-slate-900/80 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                Emergency
            </span>

            {/* Senior SOS Button */}
            <button
                onClick={() => setShowModal(true)}
                className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-[0_4px_20px_rgba(239,68,68,0.3)] transition-all hover:bg-red-600 group/btn active:scale-95"
            >
                <Phone className="w-5 h-5 text-red-600 group-hover/btn:text-white transition-colors" />
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
                            className="bg-slate-900 border border-slate-700/60 border-t-2 border-t-red-600 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-semibold text-white">Emergency SOS</h3>
                            </div>

                            <p className="text-sm text-slate-400 font-normal leading-relaxed mb-6">
                                Send emergency alert to your caregivers? They will be notified immediately.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    disabled={sending}
                                    className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 font-medium text-sm hover:bg-slate-800 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSOS}
                                    disabled={sending}
                                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
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
        </div>
    );
}
