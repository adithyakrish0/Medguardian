"use client";

import { useState, useEffect } from 'react';
import { X, Save, Loader2, Bell, Clock, Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface EditMedicationModalProps {
    medication: {
        id: number;
        name: string;
        dosage: string;
        frequency: string;
        instructions?: string;
        priority?: string;
        morning?: boolean;
        afternoon?: boolean;
        evening?: boolean;
        night?: boolean;
        custom_reminder_times?: string;
        reminder_enabled?: boolean;
        start_date?: string;
        end_date?: string;
    };
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

const TIME_SLOTS = [
    { key: 'morning', label: 'Morning', time: '8:00 AM', icon: '🌅' },
    { key: 'afternoon', label: 'Afternoon', time: '2:00 PM', icon: '☀️' },
    { key: 'evening', label: 'Evening', time: '6:00 PM', icon: '🌆' },
    { key: 'night', label: 'Night', time: '9:00 PM', icon: '🌙' },
];

export default function EditMedicationModal({ medication, isOpen, onClose, onSaved }: EditMedicationModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        dosage: '',
        frequency: '',
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

    useEffect(() => {
        if (medication && isOpen) {
            let customTimes: string[] = [];
            if (medication.custom_reminder_times) {
                try {
                    customTimes = JSON.parse(medication.custom_reminder_times);
                } catch { customTimes = []; }
            }

            setFormData({
                name: medication.name || '',
                dosage: medication.dosage || '',
                frequency: medication.frequency || '',
                instructions: medication.instructions || '',
                priority: medication.priority || 'normal',
                morning: medication.morning || false,
                afternoon: medication.afternoon || false,
                evening: medication.evening || false,
                night: medication.night || false,
                custom_reminder_times: customTimes,
                reminder_enabled: medication.reminder_enabled !== false,
                start_date: medication.start_date || '',
                end_date: medication.end_date || ''
            });
        }
    }, [medication, isOpen]);

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

            // Build payload - convert empty strings to null for optional fields
            const payload: any = {
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

            const response = await apiFetch(`/medications/${medication.id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            if (response.success) {
                onSaved();
                onClose();
            } else {
                setError(response.message || 'Failed to update medication');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to update medication');
        } finally {
            setLoading(false);
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal - Clean dark design, minimal borders */}
            <div className="relative bg-[#0d1117] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50 animate-in zoom-in-95 fade-in duration-200">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 bg-[#0d1117] border-b border-white/5">
                    <div>
                        <h2 className="text-xl font-bold text-white">Edit Medication</h2>
                        <p className="text-sm text-white/40 mt-0.5">Update medication details and schedule</p>
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

                    {/* SECTION 1: Basic Info */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
                            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Basic Info</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-medium text-white/50 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 text-white text-sm placeholder-white/30"
                                    placeholder="Aspirin"
                                    required
                                />
                            </div>

                            {/* Dosage */}
                            <div>
                                <label className="block text-xs font-medium text-white/50 mb-2">Dosage</label>
                                <input
                                    type="text"
                                    value={formData.dosage}
                                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 text-white text-sm placeholder-white/30"
                                    placeholder="500mg"
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

                        {/* Time Slots - No border, subtle backgrounds */}
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
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
