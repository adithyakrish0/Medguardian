"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import {
    Eye,
    EyeOff,
    Lock,
    User,
    Loader2,
    ShieldCheck,
    ArrowRight,
    UserCircle,
    ShieldHalf,
    LockKeyhole,
    Server,
    FlaskConical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    username: identifier,
                    password: password,
                    remember: true
                }),
            });

            if (data.success) {
                router.push('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-950 overflow-hidden font-sans">
            {/* Left Side: Brand & Trust (Visual Anchor - Parity with Signup) */}
            <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-blue-900/20 px-16 py-16 md:flex">
                {/* Neural Mesh Background */}
                <div className="absolute inset-0 z-0">
                    <NeuralMesh count={40} />
                </div>

                <div className="relative z-10">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4"
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-2xl shadow-blue-500/20">
                            <span className="text-xl font-black text-white">M</span>
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-white">MedGuardian</span>
                    </motion.div>

                    <div className="mt-32 max-w-lg">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-6xl font-black leading-[1.1] tracking-tighter text-white"
                        >
                            Secure. <br />
                            <span className="text-blue-500">Intelligent.</span> <br />
                            Care.
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mt-8 text-xl font-medium leading-relaxed text-slate-400"
                        >
                            Deploying the world's most advanced AI protocols for elderly medication safety.
                        </motion.p>
                    </div>
                </div>

                {/* Trust Badges */}
                <div className="relative z-10">
                    <div className="h-px w-full bg-white/5 mb-8" />
                    <div className="grid grid-cols-3 gap-8">
                        {[
                            { icon: LockKeyhole, label: "End-to-End Encrypted" },
                            { icon: Server, label: "Zero-Trust Protocol" },
                            { icon: ShieldCheck, label: "HIPAA Ready" }
                        ].map((badge, i) => (
                            <motion.div
                                key={badge.label}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + i * 0.1 }}
                                className="flex flex-col items-center gap-3 text-center"
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-blue-400">
                                    <badge.icon className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{badge.label}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side: Authentication Gateway */}
            <div className="relative flex w-full items-center justify-center px-6 py-12 md:w-1/2 md:px-16 lg:px-24">
                {/* Background Decor for Mobile */}
                <div className="absolute inset-0 z-0 bg-slate-950 md:hidden">
                    <div className="absolute top-0 h-64 w-full bg-gradient-to-b from-blue-900/20 to-transparent" />
                </div>

                <div className="relative z-10 w-full max-w-md">
                    <div className="mb-12 text-center md:text-left">
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl font-black tracking-tighter text-white"
                        >
                            Authentication Gateway
                        </motion.h1>
                        <p className="mt-3 text-sm font-medium text-slate-500">
                            Or{' '}
                            <Link href="/signup" className="font-bold text-blue-400 hover:text-blue-300 transition-colors">
                                initialize a new node
                            </Link>
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-400"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="identifier" className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">System Identity</Label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                                    <Input
                                        id="identifier"
                                        type="text"
                                        required
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        placeholder="Username or Email"
                                        className="h-14 rounded-2xl border-white/5 bg-white/5 pl-12 text-sm font-semibold tracking-tight text-white transition-all focus:border-teal-500/50 focus:ring-teal-500/50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Access Key</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="h-14 rounded-2xl border-white/5 bg-white/5 pl-12 pr-12 text-sm font-semibold tracking-tight text-white transition-all focus:border-teal-500/50 focus:ring-teal-500/50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs font-bold">
                            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => { }}>
                                <div className="h-5 w-5 rounded-md border border-white/10 bg-white/5 flex items-center justify-center transition-colors group-hover:border-blue-500">
                                    <div className="h-2 w-2 rounded-sm bg-blue-500 opacity-0 transition-opacity group-hover:opacity-100" />
                                </div>
                                <span className="text-slate-500 group-hover:text-slate-300 transition-colors">Remember Node</span>
                            </div>
                            <Link href="#" className="text-blue-500 hover:text-blue-400 transition-colors">
                                Recovery Protocol?
                            </Link>
                        </div>

                        <motion.div
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Button
                                type="submit"
                                disabled={loading}
                                className="relative h-14 w-full overflow-hidden rounded-2xl bg-blue-600 text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(37,99,235,0.4)]"
                            >
                                <AnimatePresence mode="wait">
                                    {loading ? (
                                        <motion.div
                                            key="loading"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex items-center gap-3"
                                        >
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Authenticating...
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="idle"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex items-center gap-2"
                                        >
                                            Establish Access <ArrowRight className="h-4 w-4" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Button>
                        </motion.div>

                        {/* Enhanced Demo Access Section */}
                        {process.env.NODE_ENV === 'development' && (
                            <div className="pt-8">
                                <div className="relative flex items-center justify-center mb-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-white/10"></div>
                                    </div>
                                    <div className="relative px-4 bg-slate-950 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                                        Quick Demo Access
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIdentifier('demo_senior');
                                            setPassword('demo123');
                                        }}
                                        className="group relative flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:border-teal-500/50 hover:bg-teal-500/5 hover:shadow-[0_0_20px_rgba(20,184,166,0.15)]"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 group-hover:text-teal-400 transition-colors">
                                            <UserCircle className="h-6 w-6" />
                                        </div>
                                        <span className="text-xs font-black tracking-tight text-slate-400 group-hover:text-white">Senior Node</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIdentifier('demo_caregiver');
                                            setPassword('demo123');
                                        }}
                                        className="group relative flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:border-teal-500/50 hover:bg-teal-500/5 hover:shadow-[0_0_20px_rgba(20,184,166,0.15)]"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 group-hover:text-teal-400 transition-colors">
                                            <ShieldHalf className="h-6 w-6" />
                                        </div>
                                        <span className="text-xs font-black tracking-tight text-slate-400 group-hover:text-white">Caregiver Terminal</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}

// Sub-component for Neural Background
function NeuralMesh({ count }: { count: number }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    return (
        <div className="absolute inset-0 opacity-30">
            {[...Array(count)].map((_, i) => (
                <div
                    key={i}
                    className="absolute h-px w-px bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                    style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        animation: `pulse ${2 + Math.random() * 4}s infinite ease-in-out`,
                        animationDelay: `${Math.random() * 5}s`
                    }}
                />
            ))}
        </div>
    );
}
