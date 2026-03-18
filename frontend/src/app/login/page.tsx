"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { DM_Sans } from 'next/font/google';
import { apiFetch } from '@/lib/api';
import {
    Eye,
    EyeOff,
    Lock,
    User,
    Loader2,
    ArrowRight,
    UserCircle,
    ShieldHalf
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700', '800'] });

export default function LoginPage() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);

    const handleLogin = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
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
    }, [identifier, password, router]);

    const triggerDemo = (type: 'senior' | 'caregiver') => {
        const ident = type === 'senior' ? 'testsenior' : 'testcaregiver';
        const pass = 'MedGuardian123';
        setIdentifier(ident);
        setPassword(pass);
        
        // Use a small timeout to ensure state has updated before submission
        setTimeout(() => {
            if (formRef.current) {
                formRef.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        }, 50);
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
                    className="w-full max-w-[380px]"
                >
                    <div className="mb-10">
                        <h1 className="text-4xl font-black text-white tracking-tight">Welcome back</h1>
                        <p className="text-slate-400 mt-2 font-medium">Sign in to continue</p>
                    </div>

                    <form ref={formRef} onSubmit={handleLogin} className="space-y-5">
                        {error && (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs font-bold text-red-400">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="identifier" className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1">Username or Email</Label>
                            <div className="relative group">
                                <User className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                <Input
                                    id="identifier"
                                    type="text"
                                    required
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    placeholder="yourname@domain.com"
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
                                    placeholder="••••••••"
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

                        <div className="flex items-center justify-between text-xs font-bold py-1">
                            <label className="flex items-center gap-2 group cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-[#111827] text-blue-600 focus:ring-offset-0 focus:ring-blue-500/50" defaultChecked />
                                <span className="text-slate-500 group-hover:text-slate-300 transition-colors">Remember me</span>
                            </label>
                            <Link href="#" className="text-blue-500 hover:text-blue-400 transition-colors">
                                Forgot password?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-11 w-full bg-blue-600 text-sm font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-500 hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign In <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>}
                        </Button>

                        {/* Demo Access Section */}
                        <div className="pt-6">
                            <div className="relative flex items-center justify-center mb-5">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/5"></div>
                                </div>
                                <div className="relative px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                                    Quick Demo Access
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div
                                    onClick={() => triggerDemo('senior')}
                                    className="group flex flex-col items-center gap-2.5 rounded-xl border border-white/10 bg-[#111827] p-3 transition-all hover:border-blue-500/50 cursor-pointer"
                                >
                                    <UserCircle className="h-5 w-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                                    <div className="text-center">
                                        <span className="text-xs font-bold text-slate-400 group-hover:text-white block">Senior</span>
                                        <span className="text-[10px] font-medium text-slate-500 block mt-0.5">testsenior · MedGuardian123</span>
                                    </div>
                                </div>

                                <div
                                    onClick={() => triggerDemo('caregiver')}
                                    className="group flex flex-col items-center gap-2.5 rounded-xl border border-white/10 bg-[#111827] p-3 transition-all hover:border-blue-500/50 cursor-pointer"
                                >
                                    <ShieldHalf className="h-5 w-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                                    <div className="text-center">
                                        <span className="text-xs font-bold text-slate-400 group-hover:text-white block">Caregiver</span>
                                        <span className="text-[10px] font-medium text-slate-500 block mt-0.5">testcaregiver · MedGuardian123</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>

                    <div className="mt-10 text-center text-sm text-slate-500">
                        Don't have an account?{' '}
                        <Link href="/signup" className="font-bold text-blue-400 hover:text-blue-300 transition-colors">
                            Sign up
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
