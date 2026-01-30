"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Eye, EyeOff, Lock, User, Mail } from 'lucide-react';

export default function SignupPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState('senior');
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
        <div className="min-h-screen bg-medical-light flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center mb-10">
                    <div className="w-16 h-16 rounded-2xl medical-gradient flex items-center justify-center shadow-2xl shadow-primary/20 ring-4 ring-primary/10">
                        <span className="text-white font-black text-2xl tracking-tighter">MG</span>
                    </div>
                </div>
                <h2 className="text-center text-4xl font-black text-foreground tracking-tight">
                    Create Account
                </h2>
                <p className="mt-4 text-center text-sm text-foreground/50 font-medium uppercase tracking-[0.2em]">
                    Already have an account? <Link href="/login" className="text-primary hover:text-primary/80 transition-colors">Sign In Instead</Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="medical-card py-10 px-4 sm:px-10">
                    <form className="space-y-6" onSubmit={handleSignup}>
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="username" className="block text-sm font-semibold text-foreground">
                                Username
                            </label>
                            <div className="mt-1 relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-foreground/30 group-focus-within:text-primary transition-colors">
                                    <User className="w-4 h-4" />
                                </div>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="appearance-none block w-full !pl-14 !pr-4 py-3 border border-white/20 rounded-xl shadow-inner placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white/10 hover:bg-white/[0.15] hover:border-white/30"
                                    placeholder="Pick a username"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-bold text-foreground">
                                Email Address
                            </label>
                            <div className="mt-1 relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-foreground/30 group-focus-within:text-primary transition-colors">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full !pl-14 !pr-4 py-3 border border-white/20 rounded-xl shadow-inner placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white/10 hover:bg-white/[0.15] hover:border-white/30"
                                    placeholder="Enter your email"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="role" className="block text-sm font-bold text-foreground">
                                Select Your Role
                            </label>
                            <div className="mt-2 p-1 bg-white/5 border border-white/10 rounded-2xl grid grid-cols-2 gap-1">
                                <button
                                    type="button"
                                    onClick={() => setRole('senior')}
                                    className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${role === 'senior'
                                        ? 'bg-primary text-white shadow-lg'
                                        : 'text-foreground/40 hover:text-foreground/60 hover:bg-white/5'
                                        }`}
                                >
                                    Senior
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('caregiver')}
                                    className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${role === 'caregiver'
                                        ? 'bg-primary text-white shadow-lg'
                                        : 'text-foreground/40 hover:text-foreground/60 hover:bg-white/5'
                                        }`}
                                >
                                    Caregiver
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-bold text-foreground">
                                Choose Password
                            </label>
                            <div className="mt-1 relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-foreground/30 group-focus-within:text-primary transition-colors">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full !pl-14 !pr-12 py-3.5 border border-white/20 rounded-xl shadow-inner placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white/10 hover:bg-white/[0.15] hover:border-white/30"
                                    placeholder="Min. 8 characters"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-foreground/30 hover:text-primary transition-colors focus:outline-none"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex justify-center py-5 px-4 rounded-2xl shadow-2xl shadow-primary/30 text-sm font-black uppercase tracking-[0.15em] text-white medical-gradient hover:scale-[1.02] active:scale-[0.98] transition-all focus:outline-none focus:ring-4 focus:ring-primary/20 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Finalizing Setup...' : 'Launch Your Account'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
