"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, Bell, Clock, Plus, AlertTriangle, ShieldAlert } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface AddMedicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (data: any) => Promise<void>;
    seniorId?: number;
}

const TIME_SLOTS = [
    { key: 'morning', label: 'Morning', time: '8:00 AM', icon: '🌅' },
    { key: 'afternoon', label: 'Afternoon', time: '2:00 PM', icon: '☀️' },
    { key: 'evening', label: 'Evening', time: '6:00 PM', icon: '🌆' },
    { key: 'night', label: 'Night', time: '9:00 PM', icon: '🌙' },
];

export default function AddMedicationModal({ isOpen, onClose, onAdd, seniorId }: AddMedicationModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        dosage: '',
        instructions: '',
        priority: 'normal',
        morning: false,
        afternoon: false,
        evening: false,
        night: false,
        custom_reminder_times: [] as string[],
        reminder_enabled: true,
        start_date: '',
        end_date: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newCustomTime, setNewCustomTime] = useState('');
    const [conflicts, setConflicts] = useState<any[]>([]);
    const [checkingInteractions, setCheckingInteractions] = useState(false);

    const checkConflicts = async (name: string) => {
        if (!name || name.length < 3) {
            setConflicts([]);
            return;
        }

        try {
            setCheckingInteractions(true);
            const res = await apiFetch('/medications/check-interactions', {
                method: 'POST',
                body: JSON.stringify({ name, senior_id: seniorId })
            });
            if (res.success) {
                setConflicts(res.conflicts);
            }
        } catch (err) {
            console.error('Interaction check failed:', err);
        } finally {
            setCheckingInteractions(false);
        }
    };

    const toggleTimeSlot = (slot: string) => {
        setFormData(prev => ({ ...prev, [slot]: !prev[slot as keyof typeof prev] }));
    };

    const addCustomTime = () => {
        if (newCustomTime && !formData.custom_reminder_times.includes(newCustomTime)) {
            setFormData(prev => ({
                ...prev,
                custom_reminder_times: [...prev.custom_reminder_times, newCustomTime].sort()
            }));
            setNewCustomTime('');
        }
    };

    const removeCustomTime = (time: string) => {
        setFormData(prev => ({
            ...prev,
            custom_reminder_times: prev.custom_reminder_times.filter(t => t !== time)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Auto-calculate frequency from selected time slots
            const slotCount = [formData.morning, formData.afternoon, formData.evening, formData.night].filter(Boolean).length
                + formData.custom_reminder_times.length;

            let calculatedFrequency = 'daily';
            if (slotCount === 0) calculatedFrequency = 'as needed';
            else if (slotCount === 1) calculatedFrequency = 'daily';
            else if (slotCount === 2) calculatedFrequency = 'twice daily';
            else if (slotCount === 3) calculatedFrequency = 'three times daily';
            else if (slotCount >= 4) calculatedFrequency = `${slotCount} times daily`;

            const payload = {
                name: formData.name,
                dosage: formData.dosage,
                frequency: calculatedFrequency,
                instructions: formData.instructions || null,
                priority: formData.priority,
                morning: formData.morning,
                afternoon: formData.afternoon,
                evening: formData.evening,
                night: formData.night,
                reminder_enabled: formData.reminder_enabled,
                custom_reminder_times: formData.custom_reminder_times.length > 0
                    ? JSON.stringify(formData.custom_reminder_times)
                    : null,
                start_date: formData.start_date || null,
                end_date: formData.end_date || null
            };

            await onAdd(payload);
            onClose();
            // Reset form
            setFormData({
                name: '', dosage: '', instructions: '', priority: 'normal',
                morning: false, afternoon: false, evening: false, night: false,
                custom_reminder_times: [], reminder_enabled: true, start_date: '', end_date: ''
            });
        } catch (err: any) {
            setError(err.message || 'Failed to add medication');
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
                        className="absolute inset-0 bg-black/70 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-[#0d1117] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50"
                    >
                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 bg-[#0d1117] border-b border-white/5">
                            <div>
                                <h2 className="text-xl font-bold text-white">Add New Medication</h2>
                                <p className="text-sm text-white/40 mt-0.5">Register a medication and set reminders</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-8">
                            {error && (
                                <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-lg text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            {conflicts.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-600 p-6 rounded-2xl border border-red-500/50 shadow-2xl shadow-red-500/20 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <ShieldAlert className="w-12 h-12" />
                                    </div>
                                    <div className="flex items-start gap-4 relative z-10">
                                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                                            <AlertTriangle className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-black uppercase text-xs tracking-widest mb-1">Critical Interaction Warning</h4>
                                            <p className="text-white/90 text-sm font-bold leading-relaxed">
                                                Potential hazard detected with existing fleet protocol:
                                            </p>
                                            <ul className="mt-3 space-y-2">
                                                {conflicts.map((c, i) => (
                                                    <li key={i} className="text-xs font-black bg-white/10 p-3 rounded-xl border border-white/5">
                                                        <span className="text-white underline">{c.med_a}</span> conflicts with <span className="text-white underline">{c.med_b}</span>:
                                                        <p className="mt-1 font-bold opacity-80 normal-case">{c.message}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* SECTION 1: Basic Info */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
                                    <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Basic Info</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Name */}
                                    <div>
                                        <label className="block text-xs font-medium text-white/50 mb-2">Medication Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            onBlur={(e) => checkConflicts(e.target.value)}
                                            className={`w-full px-4 py-3 bg-white/5 rounded-lg focus:outline-none focus:ring-1 text-white text-sm placeholder-white/30 transition-all ${conflicts.length > 0 ? 'ring-2 ring-red-500/50' : 'focus:ring-primary/50'
                                                }`}
                                            placeholder="e.g., Aspirin"
                                            required
                                        />
                                        {checkingInteractions && (
                                            <div className="absolute right-3 top-[38px] flex items-center gap-2">
                                                <Loader2 className="w-3 h-3 text-primary animate-spin" />
                                                <span className="text-[10px] font-black text-primary uppercase">Safety Check...</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Dosage */}
                                    <div>
                                        <label className="block text-xs font-medium text-white/50 mb-2">Dosage</label>
                                        <input
                                            type="text"
                                            value={formData.dosage}
                                            onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 text-white text-sm placeholder-white/30"
                                            placeholder="e.g., 500mg"
                                            required
                                        />
                                    </div>

                                    {/* Priority */}
                                    <div>
                                        <label className="block text-xs font-medium text-white/50 mb-2">Priority</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, priority: 'normal' })}
                                                className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all ${formData.priority === 'normal'
                                                    ? 'bg-primary text-white'
                                                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                                                    }`}
                                            >
                                                Normal
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, priority: 'high' })}
                                                className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all ${formData.priority === 'high'
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                                                    }`}
                                            >
                                                High
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: Schedule */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">2</span>
                                    <Clock className="w-4 h-4 text-white/40" />
                                    <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Reminder Schedule</h3>
                                </div>

                                {/* Time Slots */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                                    {TIME_SLOTS.map(slot => (
                                        <button
                                            key={slot.key}
                                            type="button"
                                            onClick={() => toggleTimeSlot(slot.key)}
                                            className={`p-4 rounded-xl transition-all text-center ${formData[slot.key as keyof typeof formData]
                                                ? 'bg-primary/20 ring-1 ring-primary/50'
                                                : 'bg-white/5 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className="text-2xl mb-1">{slot.icon}</div>
                                            <div className={`font-medium text-sm ${formData[slot.key as keyof typeof formData] ? 'text-primary' : 'text-white/70'}`}>
                                                {slot.label}
                                            </div>
                                            <div className="text-xs text-white/40">{slot.time}</div>
                                        </button>
                                    ))}
                                </div>

                                {/* Custom Times */}
                                <div className="flex flex-wrap items-center gap-3 mb-5">
                                    <span className="text-xs text-white/40">Custom:</span>
                                    <input
                                        type="time"
                                        value={newCustomTime}
                                        onChange={(e) => setNewCustomTime(e.target.value)}
                                        className="px-3 py-2 bg-white/5 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/50"
                                    />
                                    <button
                                        type="button"
                                        onClick={addCustomTime}
                                        disabled={!newCustomTime}
                                        className="px-3 py-2 bg-primary/20 text-primary rounded-lg font-medium text-sm hover:bg-primary/30 transition-all disabled:opacity-30 flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" /> Add
                                    </button>
                                    {formData.custom_reminder_times.map(time => (
                                        <span
                                            key={time}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full text-sm text-white/70"
                                        >
                                            {time}
                                            <button
                                                type="button"
                                                onClick={() => removeCustomTime(time)}
                                                className="text-white/30 hover:text-red-400 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>

                                {/* Reminder Toggle */}
                                <div className="flex items-center justify-between py-3 px-4 bg-white/5 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Bell className="w-4 h-4 text-white/40" />
                                        <span className="text-sm text-white/70">Enable Reminders</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, reminder_enabled: !formData.reminder_enabled })}
                                        className={`w-11 h-6 rounded-full transition-all relative ${formData.reminder_enabled ? 'bg-primary' : 'bg-white/20'
                                            }`}
                                    >
                                        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.reminder_enabled ? 'translate-x-5' : ''
                                            }`} />
                                    </button>
                                </div>
                            </div>

                            {/* SECTION 3: Additional */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold">3</span>
                                    <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Additional Details</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Start Date */}
                                    <div>
                                        <label className="block text-xs font-medium text-white/50 mb-2">Start Date</label>
                                        <input
                                            type="date"
                                            value={formData.start_date}
                                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 text-white text-sm"
                                        />
                                    </div>

                                    {/* End Date */}
                                    <div>
                                        <label className="block text-xs font-medium text-white/50 mb-2">End Date</label>
                                        <input
                                            type="date"
                                            value={formData.end_date}
                                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 text-white text-sm"
                                        />
                                    </div>

                                    {/* Instructions */}
                                    <div>
                                        <label className="block text-xs font-medium text-white/50 mb-2">Instructions</label>
                                        <input
                                            type="text"
                                            value={formData.instructions}
                                            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 text-white text-sm placeholder-white/30"
                                            placeholder="Take with food"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 bg-white/5 text-white/70 rounded-lg font-medium hover:bg-white/10 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50 text-sm"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Add Medication
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
