"use client";

import { motion } from 'framer-motion';
import { Mic, Eye, BarChart3, AlertCircle } from 'lucide-react';

const features = [
    { icon: Mic, label: "Neural Voice", color: "text-blue-400" },
    { icon: Eye, label: "YOLO Vision", color: "text-teal-400" },
    { icon: BarChart3, label: "Predictive AI", color: "text-indigo-400" },
    { icon: AlertCircle, label: "Critical SOS", color: "text-red-500", pulse: true },
];

export default function FloatingFeaturesBar() {
    return (
        <div className="relative z-20 -mt-16 px-6">
            <div className="mx-auto max-w-5xl">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="glass-morphism flex flex-wrap items-center justify-around gap-10 rounded-[2.5rem] p-10 px-12"
                >
                    {features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-4 group cursor-default">
                            <div className="relative">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/5 transition-all duration-300 group-hover:border-white/20 group-hover:bg-white/10`}>
                                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                                </div>
                                {feature.pulse && (
                                    <div className="absolute -right-1 -top-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-white/80 transition-colors">
                                    {feature.label}
                                </span>
                                <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-0.5">
                                    System Active
                                </span>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
