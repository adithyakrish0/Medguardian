"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Navbar() {
    return (
        <nav className="fixed top-0 z-[100] w-full border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
            <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
                <div className="flex h-20 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
                            <span className="font-black text-white">M</span>
                        </div>
                        <span className="text-xl font-black tracking-tighter text-white">MedGuardian</span>
                    </div>

                    <div className="hidden space-x-10 lg:flex">
                        {['Features', 'Dashboard', 'Analytics', 'Safety'].map((item) => (
                            <Link
                                key={item}
                                href={`/${item.toLowerCase()}`}
                                className="text-xs font-black uppercase tracking-[0.2em] text-white/50 hover:text-blue-400 transition-colors"
                            >
                                {item}
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center gap-6">
                        <Link href="/login">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="text-xs font-black uppercase tracking-widest text-white/70 hover:text-white transition-colors"
                            >
                                Systems Access
                            </motion.button>
                        </Link>
                        <Link href="/signup">
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className="rounded-full bg-blue-600 px-8 py-3 text-xs font-black uppercase tracking-widest text-white shadow-2xl shadow-blue-600/30 hover:bg-blue-500 transition-all"
                            >
                                Initialize
                            </motion.button>
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
