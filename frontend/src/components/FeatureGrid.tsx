"use client";

import { motion } from 'framer-motion';
import { Pill, Eye, Brain, MessageSquare, Dna, Users, ArrowRight } from 'lucide-react';

const features = [
    {
        icon: Pill,
        title: 'Smart Medication Tracking',
        description: 'So your loved one never wonders if they took their morning pill.',
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
    },
    {
        icon: Eye,
        title: 'YOLO Pill Verification',
        description: 'Because one wrong tablet is one too many.',
        color: 'text-teal-400',
        bg: 'bg-teal-500/10',
    },
    {
        icon: Brain,
        title: 'Anomaly Detection',
        description: 'It notices what even careful eyes miss.',
        color: 'text-violet-400',
        bg: 'bg-violet-500/10',
    },
    {
        icon: MessageSquare,
        title: 'AI Health Assistant',
        description: 'Ask it anything, at 3am — it won\'t judge.',
        color: 'text-green-400',
        bg: 'bg-green-500/10',
    },
    {
        icon: Dna,
        title: 'Drug Interaction Guard',
        description: 'Some combinations are invisible dangers. We catch them first.',
        color: 'text-rose-400',
        bg: 'bg-rose-500/10',
    },
    {
        icon: Users,
        title: 'Caregiver Dashboard',
        description: 'Peace of mind, delivered to your phone.',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
    },
];

export default function FeatureGrid() {
    return (
        <section id="features" className="relative py-32 bg-slate-950" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <div className="mx-auto max-w-7xl px-6 lg:px-10">
                {/* Section Header */}
                <div className="max-w-3xl mb-20">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl sm:text-5xl font-bold text-white tracking-tight"
                        style={{ fontFamily: "'Sora', sans-serif" }}
                    >
                        Because Missing a Dose Can{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                            Change Everything
                        </span>
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-400 mt-6 text-lg leading-relaxed max-w-2xl"
                    >
                        We built MedGuardian for the moments families can't afford to miss — here's what protects them.
                    </motion.p>
                </div>

                {/* Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05, duration: 0.5 }}
                            className="group relative bg-white/[0.01] border border-white/[0.05] rounded-2xl p-8 hover:bg-white/[0.03] hover:border-white/[0.1] transition-all duration-500 shadow-sm hover:shadow-2xl hover:-translate-y-1"
                        >
                            <div className="flex flex-col h-full">
                                <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-6 border border-white/5`}>
                                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                                </div>
                                
                                <div className="h-px w-8 bg-white/10 mb-6" />

                                <h3 className="text-lg font-bold text-white mb-3 tracking-tight group-hover:text-blue-50 transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-[14px] text-slate-400 leading-[1.6] mb-6">
                                    {feature.description}
                                </p>
                            </div>

                            {/* Soft Inner Glow */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
