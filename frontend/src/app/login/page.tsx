"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Eye, EyeOff, Lock, User, Mail, Loader2 } from 'lucide-react';

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
            console.log("LOGIN_DEBUG: Starting fetch...");
            const data = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    username: identifier, // The backend login handles both username and email
                    password: password,
                    remember: true
                }),
            });
            console.log("LOGIN_DEBUG: Response data:", data);

            if (data.success) {
                router.push('/dashboard');
            }
        } catch (err: any) {
            console.error("LOGIN_DEBUG: Caught error:", err);
            setError(err.message || 'Login failed. Please try again.');
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
                    Welcome Back
                </h2>
                <p className="mt-4 text-center text-sm text-foreground/50 font-medium uppercase tracking-[0.2em]">
                    Or <Link href="/signup" className="text-primary hover:text-primary/80 transition-colors">Create a New Account</Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="medical-card py-10 px-4 sm:px-10 shadow-2xl">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">
                                {error}
                            </div>
                        )}
                        <div>
                            <label htmlFor="identifier" className="block text-sm font-bold text-foreground">
                                Username or Email
                            </label>
                            <div className="mt-1 relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-foreground/30 group-focus-within:text-primary transition-colors">
                                    <User className="w-4 h-4" />
                                </div>
                                <input
                                    id="identifier"
                                    name="identifier"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    className="appearance-none block w-full !pl-14 !pr-4 py-3 border border-white/20 rounded-xl shadow-inner placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white/10 hover:bg-white/[0.15] hover:border-white/30"
                                    placeholder="Enter username or email"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-foreground">
                                Password
                            </label>
                            <div className="mt-1 relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-foreground/30 group-focus-within:text-primary transition-colors">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full !pl-14 !pr-12 py-3.5 border border-white/20 rounded-xl shadow-inner placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white/10 hover:bg-white/[0.15] hover:border-white/30"
                                    placeholder="Enter secure password"
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

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-medical-secondary focus:ring-medical-secondary border-gray-300 rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-foreground/60 font-medium">
                                    Remember Me
                                </label>
                            </div>

                            <div className="text-sm">
                                <a href="#" className="font-bold text-primary/80 hover:text-primary transition-colors">
                                    Forgot Password?
                                </a>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex items-center justify-center py-5 px-4 rounded-2xl shadow-2xl shadow-primary/30 text-sm font-black uppercase tracking-[0.15em] text-white medical-gradient hover:scale-[1.02] active:scale-[0.98] transition-all focus:outline-none focus:ring-4 focus:ring-primary/20 ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
                            >
                                {loading ? (
                                    <span className="flex items-center gap-3">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Authenticating...</span>
                                    </span>
                                ) : (
                                    'Sign In To MedGuardian'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
