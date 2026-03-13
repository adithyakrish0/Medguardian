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
    Mail,
    Loader2,
    ShieldCheck,
    ArrowRight,
    UserCircle,
    ShieldHalf,
    LockKeyhole,
    Activity,
    Server,
    CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignupPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState<'senior' | 'caregiver'>('senior');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = await apiFetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    role
                }),
            });

            if (data.success) {
                router.push('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-950 overflow-hidden font-sans">
            {/* Left Side: Brand & Trust (Visual Anchor) */}
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

            {/* Right Side: The Form */}
            <div className="relative flex w-full items-center justify-center px-6 py-12 md:w-1/2 md:px-16 lg:px-24">
                {/* Background Decor for Mobile */}
                <div className="absolute inset-0 z-0 bg-slate-950 md:hidden">
                    <div className="absolute top-0 h-64 w-full bg-gradient-to-b from-blue-900/20 to-transparent" />
                </div>

                <div className="relative z-10 w-full max-w-md">
                    <div className="mb-12">
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl font-black tracking-tighter text-white"
                        >
                            Initialize Profile
                        </motion.h1>
                        <p className="mt-3 text-sm font-medium text-slate-500">
                            Already part of the network?{' '}
                            <Link href="/login" className="font-bold text-blue-400 hover:text-blue-300 transition-colors">
                                Authenticate here
                            </Link>
                        </p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-8">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-400"
                            >
                                {error}
                            </motion.div>
                        )}

                        {/* Role Selector Cards */}
                        <div className="space-y-4">
                            <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Security Role</Label>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'senior', label: "I am a Senior", subtext: "Manage my meds", icon: UserCircle },
                                    { id: 'caregiver', label: "I am a Caregiver", subtext: "Monitor loved one", icon: ShieldHalf }
                                ].map((choice) => (
                                    <button
                                        key={choice.id}
                                        type="button"
                                        onClick={() => setRole(choice.id as any)}
                                        className={`group relative flex flex-col items-center gap-4 rounded-3xl border p-6 transition-all duration-300 ${role === choice.id
                                                ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50 shadow-[0_0_30px_rgba(37,99,235,0.15)]'
                                                : 'border-white/5 bg-white/5 hover:border-white/10'
                                            }`}
                                    >
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${role === choice.id ? 'bg-blue-500 text-white' : 'bg-slate-900 text-slate-500 group-hover:text-blue-400'
                                            }`}>
                                            <choice.icon className="h-6 w-6" />
                                        </div>
                                        <div className="text-center">
                                            <div className={`text-sm font-black tracking-tight ${role === choice.id ? 'text-white' : 'text-slate-400'}`}>
                                                {choice.label}
                                            </div>
                                            <div className={`text-[10px] font-bold mt-1 opacity-50 ${role === choice.id ? 'text-blue-100' : 'text-slate-500'}`}>
                                                {choice.subtext}
                                            </div>
                                        </div>
                                        {role === choice.id && (
                                            <motion.div
                                                layoutId="activeRole"
                                                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500"
                                            >
                                                <CheckCircle2 className="h-4 w-4 text-white" />
                                            </motion.div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Inputs */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Identity Name</Label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                                    <Input
                                        id="username"
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Enter your system ID"
                                        className="h-14 rounded-2xl border-white/5 bg-white/5 pl-12 text-sm font-semibold tracking-tight text-white transition-all focus:border-teal-500/50 focus:ring-teal-500/50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Secure Email</Label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Primary access vector"
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
                                        placeholder="Minimum 8 characters"
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

                        {/* Submit Button */}
                        <motion.div
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Button
                                type="submit"
                                disabled={loading}
                                className="relative h-14 w-full overflow-hidden rounded-2xl bg-blue-600 text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all hover:bg-blue-500 hover:shadow-[0_0_40px_rgba(37,99,235,0.4)]"
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
                                            Initializing...
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="idle"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex items-center gap-2"
                                        >
                                            Establish Connection <ArrowRight className="h-4 w-4" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 -translate-x-full group-hover:translate-x-full" />
                            </Button>
                        </motion.div>
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
