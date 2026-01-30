
"use client";

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { UserPlus, Check, X, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ConnectionRequests() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            const res = await apiFetch('/senior/connection-requests');
            if (res.success) {
                setRequests(res.requests);
            }
        } catch (err) {
            console.error('Failed to fetch requests:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleRespond = async (id: number, action: 'accept' | 'reject') => {
        try {
            const res = await apiFetch(`/senior/connection-requests/${id}/respond`, {
                method: 'POST',
                body: JSON.stringify({ action })
            });
            if (res.success) {
                setRequests(requests.filter(r => r.id !== id));
                // Optional: show a toast or alert
                if (action === 'accept') {
                    window.location.reload(); // Refresh to update fleet status if needed
                }
            }
        } catch (err) {
            console.error('Failed to respond:', err);
        }
    };

    if (loading || requests.length === 0) return null;

    return (
        <AnimatePresence>
            {requests.map((req) => (
                <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    className="mb-8 medical-card p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 shadow-xl relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg">
                                <UserPlus className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-foreground tracking-tight">
                                    Caregiver Connection Request
                                </h3>
                                <p className="text-sm font-bold opacity-70">
                                    <span className="text-primary font-black">{req.caregiver_name}</span> wants to help monitor your health.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => handleRespond(req.id, 'accept')}
                                className="px-6 py-3 bg-primary text-white rounded-xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Approve
                            </button>
                            <button
                                onClick={() => handleRespond(req.id, 'reject')}
                                className="px-6 py-3 bg-background border border-card-border text-foreground rounded-xl font-bold hover:bg-red-500/5 hover:text-red-500 hover:border-red-500/20 transition-all flex items-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Decline
                            </button>
                        </div>
                    </div>
                </motion.div>
            ))}
        </AnimatePresence>
    );
}
