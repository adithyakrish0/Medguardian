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
                <div className="flex justify-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-medical-primary flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-xl">M</span>
                    </div>
                </div>
                <h2 className="text-center text-3xl font-extrabold text-foreground">
                    Create your account
                </h2>
                <p className="mt-2 text-center text-sm text-foreground/70">
                    Already have an account?{' '}
                    <Link href="/login" className="font-medium text-primary hover:underline">
                        Sign in instead
                    </Link>
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
                            <label htmlFor="email" className="block text-sm font-semibold text-foreground">
                                Email address
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
                            <label htmlFor="role" className="block text-sm font-semibold text-foreground">
                                I am a...
                            </label>
                            <div className="mt-1 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole('senior')}
                                    className={`py-3 px-4 border rounded-xl text-sm font-medium transition-all ${role === 'senior'
                                        ? 'bg-primary text-white border-primary shadow-md'
                                        : 'bg-card text-foreground border-card-border hover:bg-primary/10'
                                        }`}
                                >
                                    Senior Citizen
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('caregiver')}
                                    className={`py-3 px-4 border rounded-xl text-sm font-medium transition-all ${role === 'caregiver'
                                        ? 'bg-primary text-white border-primary shadow-md'
                                        : 'bg-card text-foreground border-card-border hover:bg-primary/10'
                                        }`}
                                >
                                    Caregiver
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-foreground">
                                Create Password
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
                                className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-xl text-sm font-bold text-white bg-primary hover:scale-[1.02] transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Creating account...' : 'Create Account'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
