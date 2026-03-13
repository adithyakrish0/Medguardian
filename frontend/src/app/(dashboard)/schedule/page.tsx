"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { apiFetch } from '@/lib/api';
import { motion } from 'framer-motion';
import {
    Calendar,
    Clock,
    Pill,
    CheckCircle2,
    AlertCircle,
    Sun,
    Sunrise,
    Moon
} from 'lucide-react';

interface ScheduleItem {
    id: number;
    medication_name: string;
    dosage: string;
    scheduled_time: string;
    status: 'pending' | 'verified' | 'missed';
}

function getTimeOfDay(hour: number) {
    if (hour < 12) return { label: 'Morning', icon: Sunrise, color: 'text-amber-500' };
    if (hour < 17) return { label: 'Afternoon', icon: Sun, color: 'text-orange-500' };
    return { label: 'Evening', icon: Moon, color: 'text-indigo-500' };
}

export default function SchedulePage() {
    const { user } = useUser();
    const [medications, setMedications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMedications() {
            try {
                const data = await apiFetch('/medications');
                setMedications(data.medications || []);
            } catch (err) {
                console.error('Failed to load medications:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchMedications();
    }, []);

    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Group medications by time of day
    const grouped = { Morning: [] as any[], Afternoon: [] as any[], Evening: [] as any[] };
    medications.forEach((med) => {
        const hour = med.schedule_time ? parseInt(med.schedule_time.split(':')[0]) : 8;
        const tod = getTimeOfDay(hour);
        (grouped as any)[tod.label]?.push(med);
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto" />
                    <p className="text-gray-400 font-medium">Loading your schedule...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-sm text-gray-400 font-medium mb-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>{dayName}</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-100 mb-1">Today's Schedule</h1>
                <p className="text-gray-400">{dateStr}</p>
            </div>

            {/* Summary Card */}
            <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl flex items-center gap-6 shadow-sm">
                <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Pill className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                    <p className="text-3xl font-bold text-gray-100">{medications.length}</p>
                    <p className="text-sm text-gray-400 font-medium">medications scheduled today</p>
                </div>
            </div>

            {/* Time-of-Day Groups */}
            {Object.entries(grouped).map(([period, meds]) => {
                if (meds.length === 0) return null;
                const info = period === 'Morning'
                    ? { icon: Sunrise, color: 'text-amber-400', bg: 'bg-amber-400/10' }
                    : period === 'Afternoon'
                        ? { icon: Sun, color: 'text-orange-400', bg: 'bg-orange-400/10' }
                        : { icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-400/10' };
                const Icon = info.icon;

                return (
                    <section key={period} className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${info.bg} flex items-center justify-center`}>
                                <Icon className={`w-4 h-4 ${info.color}`} />
                            </div>
                            <h2 className="text-lg font-bold text-gray-100">{period}</h2>
                            <span className="text-xs text-gray-500 font-medium">{meds.length} dose{meds.length !== 1 ? 's' : ''}</span>
                        </div>

                        <div className="space-y-3">
                            {meds.map((med: any) => (
                                <motion.div
                                    key={med.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-gray-800 border border-gray-700 p-4 rounded-xl flex items-center justify-between shadow-sm hover:bg-gray-700/50 transition-all group cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                            <Pill className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-100">{med.name}</p>
                                            <p className="text-sm text-gray-400 font-medium">{med.dosage} • {med.schedule_time || '08:00'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 group-hover:text-blue-400 transition-colors">
                                        <Clock className="w-4 h-4" />
                                        <span>{med.schedule_time || '08:00'}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                );
            })}

            {medications.length === 0 && (
                <div className="text-center py-24 bg-gray-800/50 border border-gray-700 border-dashed rounded-xl space-y-4">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-10 h-10 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-100">All Clear!</h3>
                    <p className="text-gray-400 font-medium">No medications scheduled for today.</p>
                </div>
            )}
        </div>
    );
}
