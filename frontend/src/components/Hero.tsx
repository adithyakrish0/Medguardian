"use client";

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShieldCheck, Activity, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Hero() {
    return (
        <section className="relative pt-32 pb-24 overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-8">
                            <ShieldCheck className="w-4 h-4" />
                            Next-Generation Patient Safety
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-black text-foreground tracking-tight leading-[1.1] mb-8">
                            Critical Care, <br />
                            <span className="text-primary">Precision</span> Intelligence.
                        </h1>

                        <p className="text-xl text-foreground/60 leading-relaxed mb-10 max-w-xl">
                            MedGuardian pioneers AI-driven medication adherence. Using real-time computer vision and voice-assistant technology to secure senior health with executive-grade monitoring.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-5">
                            <Link href="/signup" className="group px-8 py-4 bg-primary text-white rounded-2xl font-black shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                Initialize Monitor
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <button
                                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                                className="px-8 py-4 border-2 border-secondary/20 text-foreground rounded-2xl font-black hover:bg-secondary/5 transition-all"
                            >
                                Platform Overview
                            </button>
                        </div>

                        <div className="mt-12 pt-12 border-t border-card-border flex items-center gap-8">
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-secondary/20 overflow-hidden" />
                                ))}
                            </div>
                            <p className="text-sm font-bold opacity-40">
                                Trusted by <span className="text-foreground">2,500+</span> healthcare professionals globally.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="relative lg:mt-0"
                    >
                        <div className="relative z-10 rounded-[32px] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/10">
                            <Image
                                src="/hero-premium.png"
                                alt="MedGuardian Dashboard"
                                width={800}
                                height={600}
                                className="w-full object-cover"
                                priority
                            />

                            {/* Floating Stats UI */}
                            <div className="absolute bottom-6 left-6 right-6 glass p-6 rounded-2xl flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">System Status</p>
                                        <p className="text-lg font-black">Active Monitoring</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Adherence</p>
                                    <p className="text-lg font-black text-accent">99.8%</p>
                                </div>
                            </div>
                        </div>

                        {/* Decorative Background Glows */}
                        <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
                        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-accent/10 rounded-full blur-[80px] pointer-events-none" />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
