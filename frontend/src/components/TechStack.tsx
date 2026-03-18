"use client";

import { motion } from 'framer-motion';
import { Code2, Brain, Database } from 'lucide-react';

const categories = [
    {
        title: "Frontend & API",
        icon: Code2,
        techs: [
            { name: "Next.js", logo: "N" },
            { name: "Flask", logo: "F" }
        ]
    },
    {
        title: "AI & Vision",
        icon: Brain,
        techs: [
            { name: "PyTorch", logo: "P" },
            { name: "YOLOv8", logo: "Y" },
            { name: "BioBERT", logo: "B" },
            { name: "Gemini AI", logo: "G" }
        ]
    },
    {
        title: "Data & Storage",
        icon: Database,
        techs: [
            { name: "PostgreSQL", logo: "P" },
            { name: "ChromaDB", logo: "C" }
        ]
    }
];

export default function TechStack() {
    return (
        <section id="tech-stack" className="relative py-32 bg-slate-950 overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {/* Grid Dot Background */}
            <div className="absolute inset-0 opacity-[0.15]" 
                style={{ 
                    backgroundImage: `radial-gradient(#1e293b 1px, transparent 1px)`, 
                    backgroundSize: '24px 24px' 
                }} 
            />
            
            <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-20"
                >
                    <h2
                        className="text-3xl sm:text-4xl font-bold text-white tracking-tight"
                        style={{ fontFamily: "'Sora', sans-serif" }}
                    >
                        What Powers MedGuardian Under the Hood
                    </h2>
                    <p className="text-slate-500 mt-4 text-[15px]">
                        Architected for resilience and extreme precision.
                    </p>
                </motion.div>

                {/* Category Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                    {categories.map((cat, i) => (
                        <motion.div
                            key={cat.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-colors group"
                        >
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10 group-hover:scale-110 group-hover:bg-blue-500/10 group-hover:border-blue-500/20 transition-all duration-300">
                                    <cat.icon className="w-5 h-5 text-blue-400" />
                                </div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{cat.title}</h3>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {cat.techs.map((tech) => (
                                    <div 
                                        key={tech.name}
                                        className="flex items-center gap-2.5 px-3 py-2 bg-white/[0.03] border border-white/[0.05] rounded-xl group/tech hover:bg-white/[0.06] hover:border-white/[0.1] transition-all"
                                    >
                                        <div className="w-6 h-6 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-blue-300 group-hover/tech:bg-blue-600 group-hover/tech:text-white transition-all">
                                            {tech.logo}
                                        </div>
                                        <span className="text-[13px] font-semibold text-slate-200">{tech.name}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Footer Link */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="text-center mt-16"
                >
                    <p className="text-[13px] italic text-slate-600">
                        Every component is production-grade, HIPAA-conscious, and battle-tested.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
