import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-slate-950 border-t border-white/5 py-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-16 lg:grid-cols-4">
                    <div className="lg:col-span-2">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-black text-white">
                                M
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-white">MedGuardian</span>
                        </div>
                        <p className="max-w-sm text-sm font-medium leading-relaxed text-slate-500">
                            The definitive medical-grade AI companion for senior health.
                            Implementing sovereign healthcare protocols for a secure and dignified future.
                        </p>
                    </div>

                    <div>
                        <h4 className="mb-8 text-xs font-black uppercase tracking-[0.2em] text-blue-500">Infrastructure</h4>
                        <ul className="space-y-4 text-sm font-bold text-slate-600">
                            <li><Link href="/features" className="hover:text-white transition-colors">AI Core</Link></li>
                            <li><Link href="/security" className="hover:text-white transition-colors">Sovereign Encryption</Link></li>
                            <li><Link href="/api" className="hover:text-white transition-colors">API Docs</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="mb-8 text-xs font-black uppercase tracking-[0.2em] text-blue-500">Organization</h4>
                        <ul className="space-y-4 text-sm font-bold text-slate-600">
                            <li><Link href="/about" className="hover:text-white transition-colors">Mission</Link></li>
                            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/contact" className="hover:text-white transition-colors">Secure Contact</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-24 flex flex-col items-center justify-between gap-8 border-t border-white/5 pt-8 md:flex-row">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">
                        &copy; {new Date().getFullYear()} MedGuardian Intelligence Systems. Part of the Sovereign Health Network.
                    </p>
                    <div className="flex gap-8">
                        <Link href="/terms" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 hover:text-white transition-colors">
                            Compliance
                        </Link>
                        <Link href="/security" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 hover:text-white transition-colors">
                            Security
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
