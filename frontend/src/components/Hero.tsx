"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldCheck, Activity, Eye, ArrowRight } from 'lucide-react';
import AnimatedHeroCard from './AnimatedHeroCard';

const trustBadges = [
    { icon: Activity, label: 'LSTM Anomaly Detection' },
    { icon: Eye, label: 'YOLO Vision AI' },
    { icon: ShieldCheck, label: 'HIPAA-Grade Security' },
];

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-mesh" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {/* Subtle radial glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-blue-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-teal-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10 pt-28 pb-20">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left — Copy */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        className="max-w-xl"
                    >
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/[0.06] mb-8">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                            <span className="text-[11px] font-semibold text-blue-300 tracking-wide">AI-Powered Health Monitoring</span>
                        </div>

                        <h1
                            className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold leading-[1.1] tracking-tight text-white mb-6"
                            style={{ fontFamily: "'Sora', sans-serif" }}
                        >
                            AI-Powered Medication Management for{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400">
                                Elderly Care
                            </span>
                        </h1>

                        <p className="text-[16px] leading-[1.75] text-slate-400 mb-10 max-w-md">
                            MedGuardian combines computer vision, anomaly detection, and intelligent reminders to ensure seniors never miss a critical dose.
                        </p>

                        {/* Buttons */}
                        <div className="flex flex-wrap gap-4 mb-12">
                            <Link
                                href="/signup"
                                className="group inline-flex items-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-xl shadow-blue-600/20 hover:shadow-blue-500/30 transition-all"
                            >
                                Start Monitoring
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-slate-300 border border-white/10 rounded-xl hover:border-white/25 hover:text-white transition-all"
                            >
                                View Dashboard Demo
                            </Link>
                        </div>

                        {/* Trust Badges */}
                        <div className="flex flex-wrap gap-5">
                            {trustBadges.map((badge, i) => (
                                <motion.div
                                    key={badge.label}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 + i * 0.1 }}
                                    className="flex items-center gap-2 text-slate-500"
                                >
                                    <badge.icon className="w-3.5 h-3.5 text-blue-400" />
                                    <span className="text-[11px] font-semibold tracking-wide">{badge.label}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Right — Mock Dashboard Card */}
                    <div className="hidden lg:flex justify-end items-center perspective-1000">
                        <AnimatedHeroCard />
                    </div>
                </div>
            </div>
        </section>
    );
}
