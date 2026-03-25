"use client";

import { motion } from 'framer-motion';
import { Mic, Eye, BarChart3, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const features = [
    { 
        icon: Mic, 
        label: "Neural Voice", 
        description: "Engage with seniors using natural, human-like voice synthesis.",
        color: "cyan", 
        href: "#features",
        accent: "from-cyan-500/20 to-blue-500/20",
        glow: "shadow-cyan-500/20"
    },
    { 
        icon: Eye, 
        label: "YOLO Vision", 
        description: "Precision pill verification using state-of-the-art computer vision.",
        color: "emerald", 
        href: "#features",
        accent: "from-emerald-500/20 to-teal-500/20",
        glow: "shadow-emerald-500/20"
    },
    { 
        icon: BarChart3, 
        label: "Predictive AI", 
        description: "Forecasting health trends before symptoms even appear.",
        color: "violet", 
        href: "#features",
        accent: "from-violet-500/20 to-purple-500/20",
        glow: "shadow-violet-500/20"
    },
    { 
        icon: AlertCircle, 
        label: "Critical SOS", 
        description: "Instant emergency triage for families when every second counts.",
        color: "red", 
        href: "#features",
        accent: "from-red-500/20 to-rose-500/20",
        glow: "shadow-red-500/20",
        pulse: true 
    },
];

const colorMap = {
    cyan: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    emerald: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    violet: "text-violet-400 border-violet-500/30 bg-violet-500/10",
    red: "text-red-400 border-red-500/30 bg-red-500/10",
};

export default function FloatingFeaturesBar() {
    return (
        <section className="relative z-20 -mt-20 pb-20 px-6">
            <div className="mx-auto max-w-7xl">
                <div className="text-center mb-8">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Explore Features</span>
                </div>
                
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1 }}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    {features.map((feature, index) => (
                        <Link key={index} href={feature.href} className="group block">
                            <motion.div
                                whileHover={{ y: -8 }}
                                className={`relative h-full bg-[#0f1f35]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 transition-all duration-300 group-hover:bg-[#0f1f35] group-hover:border-white/10 group-hover:shadow-2xl ${feature.glow.replace('shadow-', 'group-hover:shadow-')}`}
                            >
                                {/* Animated Gradient Background on Hover */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`} />

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`p-3 rounded-xl border ${colorMap[feature.color as keyof typeof colorMap]} transition-transform duration-300 group-hover:scale-110`}>
                                            <feature.icon className="h-5 w-5" />
                                        </div>
                                        {feature.pulse && (
                                            <div className="flex h-2 w-2 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="text-sm font-bold text-white mb-2 tracking-tight group-hover:text-cyan-50 group-transition-colors">
                                        {feature.label}
                                    </h3>
                                    
                                    <p className="text-[12px] text-slate-400 leading-relaxed mb-6 flex-1">
                                        {feature.description}
                                    </p>

                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 group-hover:text-white transition-colors uppercase tracking-widest">
                                        <span>Explore</span>
                                        <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
