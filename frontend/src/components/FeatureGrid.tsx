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
        title: "AI Dose Verification",
        description: "Proprietary computer vision confirms exact pill identification and dosage delivery.",
        icon: Eye,
        color: "text-primary"
    },
    {
        title: "Voice Integration",
        description: "Natural language processing for seamless reminders and health reporting.",
        icon: Mic,
        color: "text-blue-500"
    },
    {
        title: "Executive Portal",
        description: "Real-time telemetry and adherence auditing for caregivers and family.",
        icon: Users,
        color: "text-indigo-500"
    },
    {
        title: "Interaction Guard",
        description: "Automated pharmacological screening for dangerous drug-to-drug interactions.",
        icon: ShieldAlert,
        color: "text-accent"
    },
    {
        title: "Smart Chronotherapy",
        description: "Intelligent scheduling optimized for patient circadian rhythms and metabolism.",
        icon: Calendar,
        color: "text-purple-500"
    },
    {
        title: "Critical SOS",
        description: "Zero-latency emergency dispatch triggered by voice or biometric detection.",
        icon: AlertCircle,
        color: "text-red-500"
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
        <section id="features" className="py-32 bg-secondary/5 relative">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="max-w-2xl">
                    <h2 className="text-sm font-black text-primary uppercase tracking-[0.2em] mb-4">Core Capabilities</h2>
                    <h3 className="text-4xl lg:text-5xl font-black text-foreground tracking-tight mb-6">
                        Advanced health security <br /> for those who matter most.
                    </h3>
                    <p className="text-lg text-foreground/60 leading-relaxed">
                        MedGuardian integrates cutting-edge AI to provide a safety net that is both invisible and omnipresent, ensuring unparalleled medical adherence.
                    </p>
                </div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                    {features.map((feature) => (
                        <motion.div
                            key={feature.title}
                            variants={itemVariants}
                            className="medical-card p-10 bg-card/40 backdrop-blur-sm group"
                        >
                            <div className={`w-14 h-14 rounded-2xl bg-background border border-card-border shadow-sm flex items-center justify-center mb-8 transition-transform group-hover:scale-110 duration-500`}>
                                <feature.icon className={`w-7 h-7 ${feature.color}`} />
                            </div>
                            <h4 className="text-xl font-black text-foreground mb-4 tracking-tight">{feature.title}</h4>
                            <p className="text-foreground/50 text-sm leading-relaxed mb-8">
                                {feature.description}
                            </p>
                            <Link href="/features" className="inline-flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest group/link">
                                Documentation
                                <ChevronRight className="w-3 h-3 group-hover/link:translate-x-1 transition-transform" />
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
