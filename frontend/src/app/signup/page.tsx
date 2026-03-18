"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { DM_Sans } from 'next/font/google';
import { apiFetch } from '@/lib/api';
import {
    Eye,
    EyeOff,
    Lock,
    User,
    Mail,
    Loader2,
    ArrowRight,
    UserCircle,
    ShieldHalf,
    CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700', '800'] });

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
        <div className={`flex h-screen w-full overflow-hidden ${dmSans.className}`} style={{ background: '#070d1a' }}>
            {/* LEFT PANEL (Decorative, 45%) */}
            <div className="relative hidden lg:flex w-[45%] h-full flex-col justify-between p-12">
                
                {/* Enhanced Gradient orbs - Seamless implementation */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '20%', 
                    transform: 'translate(-50%, -50%)',
                    width: '600px',
                    height: '600px',
                    borderRadius: '50%',
                    filter: 'blur(140px)',
                    background: 'radial-gradient(circle, rgba(37,99,235,0.45) 0%, rgba(6,182,212,0.2) 40%, transparent 70%)',
                    pointerEvents: 'none'
                }} />

                <div style={{
                    position: 'absolute',
                    bottom: '10%',
                    left: '10%',
                    width: '300px',
                    height: '300px', 
                    borderRadius: '50%',
                    filter: 'blur(100px)',
                    background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)',
                    pointerEvents: 'none'
                }} />
                
                {/* Top: Logo */}
                <Link href="/" className="relative z-10 flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <span className="text-white font-black text-lg">M</span>
                    </div>
                    <span className="text-white font-bold text-xl tracking-tight">MedGuardian</span>
                </Link>
                
                {/* Middle: Headline */}
                <div className="relative z-10">
                    <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-4">AI-Powered Care</p>
                    <h2 className="text-white font-black text-5xl leading-tight tracking-tight">
                        Protecting seniors.<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                            Empowering caregivers.
                        </span>
                    </h2>
                    <p className="text-slate-400 mt-6 text-base leading-relaxed max-w-sm">
                        Advanced AI monitors medication adherence 24/7, detects anomalies, and keeps your loved ones safe.
                    </p>
                </div>
                
                {/* Bottom: Feature pills */}
                <div className="relative z-10 flex flex-col gap-4">
                    {['LSTM Anomaly Detection', 'YOLO Vision Verification', 'Real-time Caregiver Alerts'].map(feat => (
                        <div key={feat} className="flex items-center gap-3 group">
                            <div className="w-2 h-2 rounded-full bg-blue-400 group-hover:scale-125 transition-transform" />
                            <span className="text-slate-300 text-sm font-medium group-hover:text-white transition-colors">{feat}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT PANEL (Form, 55%) */}
            <div className="relative flex flex-1 h-full items-center justify-center p-8">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-[400px]"
                >
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-white tracking-tight">Create account</h1>
                        <p className="text-slate-400 mt-2 font-medium">
                            Already have an account?{' '}
                            <Link href="/login" className="font-bold text-blue-400 hover:text-blue-300 transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-4">
                        {error && (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs font-bold text-red-400">
                                {error}
                            </div>
                        )}

                        {/* Role Selector (Horizontal, Compact) */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {[
                                { id: 'senior', label: "Senior", subtext: "Manage meds", icon: UserCircle },
                                { id: 'caregiver', label: "Caregiver", subtext: "Monitor patients", icon: ShieldHalf }
                            ].map((choice) => (
                                <button
                                    key={choice.id}
                                    type="button"
                                    onClick={() => setRole(choice.id as any)}
                                    className={`group relative flex items-center h-[72px] gap-3 rounded-xl border px-4 transition-all duration-300 ${role === choice.id
                                        ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(37,99,235,0.1)]'
                                        : 'border-white/10 bg-[#111827] hover:border-white/20'
                                        }`}
                                >
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${role === choice.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-900 text-slate-500 group-hover:text-blue-400'
                                        }`}>
                                        <choice.icon className="h-6 w-6" />
                                    </div>
                                    <div className="text-left overflow-hidden">
                                        <div className={`text-sm font-black tracking-tight ${role === choice.id ? 'text-white' : 'text-slate-400'}`}>
                                            {choice.label}
                                        </div>
                                        <div className={`text-[10px] font-bold mt-0.5 whitespace-nowrap opacity-50 ${role === choice.id ? 'text-blue-200' : 'text-slate-600'}`}>
                                            {choice.subtext}
                                        </div>
                                    </div>
                                    {role === choice.id && (
                                        <motion.div
                                            layoutId="activeRoleSplit"
                                            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 border-2 border-[#070d1a]"
                                        >
                                            <CheckCircle2 className="h-3 w-3 text-white" />
                                        </motion.div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="username" className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1">Username</Label>
                                <div className="relative group">
                                    <User className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                    <Input
                                        id="username"
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Choose a username"
                                        className="h-11 rounded-xl border-white/10 bg-[#111827] pl-11 text-sm font-medium text-white transition-all focus:border-blue-500/50 focus:ring-blue-500/50 placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1">Email Address</Label>
                                <div className="relative group">
                                    <Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="h-11 rounded-xl border-white/10 bg-[#111827] pl-11 text-sm font-medium text-white transition-all focus:border-blue-500/50 focus:ring-blue-500/50 placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="password" className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1">Password</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Minimum 8 characters"
                                        className="h-11 rounded-xl border-white/10 bg-[#111827] pl-11 pr-11 text-sm font-medium text-white transition-all focus:border-blue-500/50 focus:ring-blue-500/50 placeholder:text-slate-600"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-11 w-full bg-blue-600 text-sm font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-500 hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 mt-6"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create Account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>}
                        </Button>
                    </form>

                    <div className="mt-10 text-center text-sm text-slate-500">
                        Already have an account?{' '}
                        <Link href="/login" className="font-bold text-blue-400 hover:text-blue-300 transition-colors">
                            Sign in
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
