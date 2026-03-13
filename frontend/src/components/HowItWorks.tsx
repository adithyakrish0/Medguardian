"use client";

import { motion } from 'framer-motion';
import { Settings, RefreshCw, ShieldCheck } from 'lucide-react';

const steps = [
    {
        title: "Intelligent Setup",
        description: "Configure patient profiles and medication schedules with AI-assisted optimization.",
        icon: Settings,
    },
    {
        title: "Bio-Digital Sync",
        description: "Real-time synchronization of medication data across all authorized caregiver nodes.",
        icon: RefreshCw,
    },
    {
        title: "AI Verification",
        description: "Computer vision and voice protocols confirm adherence with zero-trust security.",
        icon: ShieldCheck,
    },
];

export default function HowItWorks() {
    return (
        <section className="py-32 bg-slate-950">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="text-center mb-24">
                    <h2 className="text-xs font-black uppercase tracking-[0.4em] text-teal-400">
                        Operational Flow
                    </h2>
                    <h3 className="mt-6 text-4xl font-black tracking-tighter text-white lg:text-6xl">
                        A seamless, secure pipeline.
                    </h3>
                </div>

                <div className="relative">
                    {/* Connecting Line (Circuit/Pipeline Style) */}
                    <div className="absolute top-12 left-[10%] right-[10%] hidden h-[2px] -translate-y-1/2 overflow-hidden lg:block">
                        <div className="h-full w-full bg-slate-800" />
                        <motion.div
                            animate={{
                                x: ['-100%', '100%'],
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            className="absolute inset-0 h-full w-1/3 bg-gradient-to-r from-transparent via-accent/30 to-transparent"
                        />
                        {/* Data Packets */}
                        {[...Array(3)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ x: '-10%' }}
                                animate={{
                                    x: ['0%', '100%'],
                                }}
                                transition={{
                                    duration: 2.5,
                                    repeat: Infinity,
                                    ease: "linear",
                                    delay: i * 0.8,
                                }}
                                className="absolute top-0 h-full w-8 bg-accent/40 blur-[4px]"
                            />
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
                        {steps.map((step, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: index * 0.2 }}
                                className="relative z-10 flex flex-col items-center text-center group"
                            >
                                <div className="mb-10 flex h-24 w-24 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 shadow-2xl transition-all duration-500 group-hover:border-accent/50 group-hover:shadow-[0_0_30px_rgba(45,212,191,0.2)]">
                                    <step.icon className="h-10 w-10 text-white transition-colors group-hover:text-accent" />
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-black tracking-[0.4em] text-accent mb-3 uppercase">
                                        Phase 0{index + 1}
                                    </span>
                                    <h4 className="text-2xl font-black tracking-tight text-white mb-4 italic">
                                        {step.title}
                                    </h4>
                                    <p className="text-sm font-medium leading-relaxed text-slate-500 max-w-xs mx-auto group-hover:text-slate-300 transition-colors">
                                        {step.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
