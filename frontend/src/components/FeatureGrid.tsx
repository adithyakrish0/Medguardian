"use client";

import { motion } from 'framer-motion';
import {
    Eye,
    Mic,
    Users,
    ShieldAlert,
    Calendar,
    AlertCircle,
    ChevronRight
} from 'lucide-react';
import Link from 'next/link';

const features = [
    {
        title: "Pill Verification",
        description: "YOLO-World object detection confirms exact medication identification and safety.",
        icon: Eye,
        accent: "from-blue-500/20 to-blue-600/20",
        border: "group-hover:border-blue-500/50"
    },
    {
        title: "Voice Protocol",
        description: "Zero-latency Neuro-Symbolic Voice UI for natural healthcare interaction.",
        icon: Mic,
        accent: "from-teal-500/20 to-teal-600/20",
        border: "group-hover:border-teal-500/50"
    },
    {
        title: "Executive Portal",
        description: "Real-time biometric telemetry and adherence auditing for caregivers.",
        icon: Users,
        accent: "from-indigo-500/20 to-indigo-600/20",
        border: "group-hover:border-indigo-500/50"
    },
    {
        title: "Interaction Guard",
        description: "GNN-powered screening for dangerous drug-to-drug interactions.",
        icon: ShieldAlert,
        accent: "from-purple-500/20 to-purple-600/20",
        border: "group-hover:border-purple-500/50"
    },
    {
        title: "Predictive AI",
        description: "SHAP-based behavioral analytics forecasting adherence anomalies before they occur.",
        icon: Calendar,
        accent: "from-cyan-500/20 to-cyan-600/20",
        border: "group-hover:border-cyan-500/50"
    },
    {
        title: "Sovereign SOS",
        description: "Encrypted emergency dispatch triggered by voice or biometric detection.",
        icon: AlertCircle,
        accent: "from-red-500/20 to-red-600/20",
        border: "group-hover:border-red-500/50"
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

export default function FeatureGrid() {
    return (
        <section id="features" className="relative py-32 bg-slate-950">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="max-w-3xl">
                    <h2 className="text-xs font-black uppercase tracking-[0.4em] text-blue-500">
                        Operational Intelligence
                    </h2>
                    <h3 className="mt-6 text-4xl font-black tracking-tighter text-white lg:text-6xl">
                        Medical-grade security <br /> for those who matter most.
                    </h3>
                    <p className="mt-8 text-lg font-medium leading-relaxed text-slate-400">
                        MedGuardian integrates cutting-edge AI to provide a safety net that is
                        both invisible and omnipresent, ensuring unparalleled medical adherence
                        through sovereign engineering.
                    </p>
                </div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="mt-24 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
                >
                    {features.map((feature) => (
                        <motion.div
                            key={feature.title}
                            variants={itemVariants}
                            whileHover={{ y: -5 }}
                            className="group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 p-10 transition-all duration-500 hover:border-accent/50 hover:bg-white/[0.07] shadow-2xl"
                        >
                            {/* Hover Glow Effect */}
                            <div className="absolute -inset-px bg-gradient-to-br from-accent/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                            <div className="relative z-10">
                                <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 shadow-2xl transition-all duration-500 group-hover:border-accent/30 group-hover:shadow-[0_0_20px_rgba(45,212,191,0.2)]"
                                >
                                    <feature.icon className="h-8 w-8 text-white transition-colors group-hover:text-accent" />
                                </motion.div>
                                <h4 className="text-xl font-black tracking-tight text-white mb-4">
                                    {feature.title}
                                </h4>
                                <p className="text-sm font-medium leading-relaxed text-slate-500 group-hover:text-slate-300 transition-colors">
                                    {feature.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
