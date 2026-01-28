"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pill, Clock, AlertCircle, Save } from 'lucide-react';

interface AddMedicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (data: any) => Promise<void>;
}

export default function AddMedicationModal({ isOpen, onClose, onAdd }: AddMedicationModalProps) {
    const [name, setName] = useState('');
    const [dosage, setDosage] = useState('');
    const [frequency, setFrequency] = useState('daily');
    const [priority, setPriority] = useState('normal');
    const [times, setTimes] = useState({
        morning: false,
        afternoon: false,
        evening: false,
        night: false
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onAdd({
                name,
                dosage,
                frequency,
                priority,
                ...times,
                reminder_enabled: true
            });
            onClose();
            // Reset form
            setName('');
            setDosage('');
            setFrequency('daily');
            setTimes({ morning: false, afternoon: false, evening: false, night: false });
        } catch (error) {
            console.error('Failed to add medication:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-card border border-card-border rounded-[32px] shadow-2xl overflow-hidden"
                    >
                        <div className="p-8 border-b border-card-border flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Pill className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-foreground">Register Medication</h2>
                                    <p className="text-xs font-bold opacity-40 uppercase tracking-widest mt-0.5">Add to digital cabinet</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-secondary/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-foreground/40" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">Medication Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Atorvastatin"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-background border border-card-border rounded-2xl px-5 py-4 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">Dosage</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. 20mg"
                                            value={dosage}
                                            onChange={(e) => setDosage(e.target.value)}
                                            className="w-full bg-background border border-card-border rounded-2xl px-5 py-4 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">Frequency</label>
                                        <select
                                            value={frequency}
                                            onChange={(e) => setFrequency(e.target.value)}
                                            className="w-full bg-background border border-card-border rounded-2xl px-5 py-4 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none"
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="as_needed">As Needed</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-3">Schedule Routine</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['morning', 'afternoon', 'evening', 'night'] as const).map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setTimes(prev => ({ ...prev, [t]: !prev[t] }))}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all font-bold capitalize ${times[t]
                                                        ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                                        : 'bg-background border-card-border text-foreground/40 hover:bg-secondary/5'
                                                    }`}
                                            >
                                                <div className={`w-2 h-2 rounded-full ${times[t] ? 'bg-primary' : 'bg-foreground/20'}`} />
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">Priority Level</label>
                                    <div className="flex gap-4">
                                        {['low', 'normal', 'high'].map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setPriority(p)}
                                                className={`flex-1 py-3 rounded-2xl border font-black text-xs uppercase tracking-widest transition-all ${priority === p
                                                        ? p === 'high' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-primary/10 border-primary text-primary'
                                                        : 'bg-background border-card-border text-foreground/20'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-white py-5 rounded-[24px] font-black text-lg shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {loading ? 'Initializing...' : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Complete Registration
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
