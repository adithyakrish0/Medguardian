"use client";

import { motion } from 'framer-motion';
import { UserPlus, Cpu, ShieldCheck } from 'lucide-react';

const steps = [
    {
        number: '01',
        icon: UserPlus,
        title: 'Set Up Profile',
        description: 'Add medications, schedule timings, and register emergency contacts in minutes.',
    },
    {
        number: '02',
        icon: Cpu,
        title: 'AI Monitors 24/7',
        description: 'LSTM anomaly detection, YOLO vision verification, and smart reminders work continuously.',
    },
    {
        number: '03',
        icon: ShieldCheck,
        title: 'Stay Safe',
        description: 'Caregivers get instant alerts. Seniors get timely reminders. Everyone stays informed.',
    },
];

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="relative py-28 bg-slate-950" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

            <div className="mx-auto max-w-7xl px-6 lg:px-10">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <span className="text-[11px] font-semibold text-teal-400 tracking-[0.15em] uppercase">Simple Process</span>
                    <h2
                        className="text-3xl sm:text-4xl font-bold text-white mt-3 tracking-tight"
                        style={{ fontFamily: "'Sora', sans-serif" }}
                    >
                        How It Works
                    </h2>
                    <p className="text-slate-400 mt-4 max-w-md mx-auto text-[15px] leading-relaxed">
                        Three simple steps to complete medication safety.
                    </p>
                </motion.div>

                {/* Steps */}
                <div className="relative grid md:grid-cols-3 gap-8 lg:gap-12">
                    {/* Connecting line (desktop only) */}
                    <div className="hidden md:block absolute top-[60px] left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-blue-500/30 via-teal-500/30 to-blue-500/30" />

                    {steps.map((step, i) => (
                        <motion.div
                            key={step.number}
                            initial={{ opacity: 0, y: 25 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.15, duration: 0.5 }}
                            className="relative text-center"
                        >
                            {/* Number circle */}
                            <div className="relative z-10 w-[120px] h-[120px] mx-auto mb-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center group hover:border-blue-500/30 transition-all duration-500">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/10 to-teal-500/10 flex items-center justify-center">
                                    <step.icon className="w-7 h-7 text-blue-400" />
                                </div>
                                <span className="absolute -top-2 -right-1 text-[11px] font-bold text-slate-600 bg-slate-950 px-2 py-0.5 rounded-full border border-white/[0.06]">
                                    {step.number}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-2 tracking-tight">{step.title}</h3>
                            <p className="text-[13px] text-slate-400 leading-[1.7] max-w-[260px] mx-auto">{step.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
