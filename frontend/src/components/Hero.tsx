"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShieldCheck, Activity, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import MagnetLines from './animations/MagnetLines';
import { Button } from '@/components/ui/button';

export default function Hero() {
    return (
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 pt-20">
            {/* AI Neural Background Effect */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,1),rgba(2,6,23,1))]" />

                {/* Neural Lines */}
                <div className="absolute inset-0 opacity-20">
                    <MagnetLines
                        rows={20}
                        columns={40}
                        lineColor="rgba(45, 212, 191, 0.4)"
                        lineHeight="15px"
                        lineWidth="1px"
                    />
                </div>

                {/* Animated Neural Nodes */}
                <NeuralNodes count={6} />

                {/* Large Background Glows */}
                <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-600/5 blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-teal-500/5 blur-[120px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 mx-auto max-w-[1440px] px-6 lg:px-12">
                <div className="flex flex-col items-center text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="mb-10 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 p-1 px-5 backdrop-blur-2xl"
                    >
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20">
                            <ShieldCheck className="h-3 w-3 text-blue-400" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/80">
                            Authorized AI Health Protocol V2.1
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="max-w-5xl text-6xl font-black leading-[1.05] tracking-tighter text-white lg:text-[8rem]"
                    >
                        Smart Medication <br />
                        <span className="text-gradient-primary">Management.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="mt-12 max-w-2xl text-lg font-medium leading-relaxed text-slate-400 lg:text-2xl"
                    >
                        The world's first medical-grade AI companion for seniors.
                        Experience <span className="text-blue-400">zero-latency verification</span> and
                        <span className="text-accent"> predictive health diagnostics</span> on a secure platform.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="relative z-20 mt-16 flex flex-col items-center gap-8 pointer-events-auto sm:flex-row"
                    >
                        <Link href="/signup">
                            <Button size="lg" className="px-12 py-8 h-auto text-sm group">
                                Deploy Monitor
                                <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </Link>

                        <Button
                            variant="outline"
                            size="lg"
                            className="px-12 py-8 h-auto text-sm"
                            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            View Architecture
                        </Button>
                    </motion.div>

                    {/* Trust Indicators */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 1.2 }}
                        className="mt-24 flex items-center gap-6 opacity-40 hover:opacity-100 transition-opacity"
                    >
                        <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-white/20" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white">
                            Secured by Neural-Shield Technology
                        </span>
                        <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-white/20" />
                    </motion.div>
                </div>
            </div>

            {/* Bottom Gradient Fade */}
            <div className="absolute bottom-0 left-0 h-64 w-full bg-gradient-to-t from-slate-950 to-transparent z-10" />
        </section>
    );
}

function NeuralNodes({ count }: { count: number }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <>
            {[...Array(count)].map((_, i) => (
                <NeuralNode key={i} index={i} />
            ))}
        </>
    );
}

function NeuralNode({ index }: { index: number }) {
    const [pos] = useState(() => ({
        top: `${20 + Math.random() * 60}%`,
        left: `${10 + Math.random() * 80}%`,
    }));

    return (
        <motion.div
            animate={{
                opacity: [0.1, 0.3, 0.1],
                scale: [1, 1.2, 1],
            }}
            transition={{
                duration: 4 + index,
                repeat: Infinity,
                ease: "easeInOut",
            }}
            className="absolute h-1 w-1 rounded-full bg-accent glow-accent"
            style={pos}
        />
    );
}
