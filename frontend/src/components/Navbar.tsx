"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ShieldCheck } from 'lucide-react';

const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Tech Stack', href: '#tech-stack' },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav
            className={`fixed top-0 z-[100] w-full transition-all duration-500 ${scrolled
                    ? 'bg-slate-950/80 backdrop-blur-2xl border-b border-white/[0.06] shadow-2xl shadow-black/30'
                    : 'bg-transparent border-b border-transparent'
                }`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
            <div className="mx-auto max-w-7xl px-6 lg:px-10">
                <div className="flex h-[72px] items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
                            <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[17px] font-bold tracking-tight text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
                            MedGuardian
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden lg:flex items-center gap-9">
                        {navLinks.map(link => (
                            <a
                                key={link.label}
                                href={link.href}
                                className="text-[13px] font-semibold text-slate-400 hover:text-white transition-colors duration-200"
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>

                    {/* Desktop CTA */}
                    <div className="hidden lg:flex items-center gap-4">
                        <Link
                            href="/login"
                            className="px-5 py-2 text-[13px] font-semibold text-slate-300 border border-white/10 rounded-lg hover:border-white/25 hover:text-white transition-all duration-200"
                        >
                            Login
                        </Link>
                        <Link
                            href="/signup"
                            className="px-5 py-2.5 text-[13px] font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/25"
                        >
                            Get Started
                        </Link>
                    </div>

                    {/* Mobile Hamburger */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="lg:hidden p-2 text-white/70 hover:text-white transition-colors"
                    >
                        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="lg:hidden bg-slate-950/95 backdrop-blur-2xl border-b border-white/[0.06]"
                    >
                        <div className="px-6 py-6 space-y-4">
                            {navLinks.map(link => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="block text-sm font-semibold text-slate-300 hover:text-white py-2 transition-colors"
                                >
                                    {link.label}
                                </a>
                            ))}
                            <div className="pt-4 flex flex-col gap-3 border-t border-white/10">
                                <Link href="/login" className="block text-center py-2.5 text-sm font-semibold text-slate-300 border border-white/10 rounded-lg">
                                    Login
                                </Link>
                                <Link href="/signup" className="block text-center py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg">
                                    Get Started
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
