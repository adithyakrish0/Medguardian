"use client";

import { motion } from 'framer-motion';

const techStack = [
    { name: "Next.js", logo: "https://www.vectorlogo.zone/logos/nextjs/nextjs-icon.svg" },
    { name: "Flask", logo: "https://www.vectorlogo.zone/logos/pocoo_flask/pocoo_flask-icon.svg" },
    { name: "YOLO v8", logo: "https://raw.githubusercontent.com/ultralytics/assets/main/logos/logo-ultralytics.svg" },
    { name: "ChromaDB", logo: "https://raw.githubusercontent.com/chroma-core/chroma/main/docs/static/img/chroma.png" },
    { name: "Llama 3.2", logo: "https://www.vectorlogo.zone/logos/meta/meta-icon.svg" },
    { name: "Tailwind", logo: "https://www.vectorlogo.zone/logos/tailwindcss/tailwindcss-icon.svg" },
];

export default function TechStack() {
    return (
        <section className="py-32 bg-slate-950 border-y border-white/5 overflow-hidden">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="flex flex-col items-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="mb-16 flex flex-col items-center gap-4 text-center"
                    >
                        <h2 className="text-xs font-black uppercase tracking-[0.5em] text-white/30">
                            Core Engineering Stack
                        </h2>
                        <div className="h-px w-24 bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
                    </motion.div>

                    <div className="flex flex-wrap justify-center items-center gap-16 lg:gap-32">
                        {techStack.map((tech, index) => (
                            <motion.div
                                key={tech.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                whileHover={{ scale: 1.1 }}
                                className="group relative cursor-pointer"
                            >
                                {/* Hover Glow */}
                                <div className="absolute inset-0 -m-4 bg-accent/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <div className="relative flex flex-col items-center gap-6">
                                    <div className="grayscale opacity-50 brightness-200 group-hover:grayscale-0 group-hover:opacity-100 group-hover:brightness-100 transition-all duration-700">
                                        <img
                                            src={tech.logo}
                                            alt={tech.name}
                                            className="h-10 lg:h-14 w-auto object-contain filter drop-shadow-2xl"
                                        />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 group-hover:text-accent transition-colors duration-500">
                                        {tech.name}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
