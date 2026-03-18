import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

const footerLinks = [
    { label: 'Dashboard', href: '/login' },
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Tech Stack', href: '#tech-stack' },
];

export default function Footer() {
    return (
        <footer className="relative bg-slate-950 border-t border-white/[0.06]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16">
                <div className="grid md:grid-cols-3 gap-10 items-start">
                    {/* Left — Logo + Tagline */}
                    <div>
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                                <ShieldCheck className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-[15px] font-bold text-white tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
                                MedGuardian
                            </span>
                        </div>
                        <p className="text-[13px] text-slate-500 leading-relaxed max-w-[240px]">
                            Protecting what matters most — intelligent medication management for elderly care.
                        </p>
                    </div>

                    {/* Middle — Links */}
                    <div className="flex flex-wrap gap-x-8 gap-y-3 md:justify-center">
                        {footerLinks.map(link => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="text-[13px] font-medium text-slate-400 hover:text-white transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Right — Project Credit */}
                    <div className="md:text-right">
                        <p className="text-[13px] text-slate-500">
                            Built with <span className="text-red-400">❤️</span> for
                        </p>
                        <p className="text-[13px] text-slate-400 font-semibold">
                            BTech Final Year Project 2026
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-white/[0.04]">
                <div className="mx-auto max-w-7xl px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-600">
                        © {new Date().getFullYear()} MedGuardian. All rights reserved.
                    </p>
                    <p className="text-[11px] text-slate-600">
                        Powered by Next.js · Flask · PyTorch
                    </p>
                </div>
            </div>
        </footer>
    );
}
