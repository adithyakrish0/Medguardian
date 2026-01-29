"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function LoginPage() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
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
                <div className="flex justify-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-medical-primary flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-xl">M</span>
                    </div>
                </div>
                <h2 className="text-center text-3xl font-extrabold text-foreground">
                    Welcome back
                </h2>
                <p className="mt-2 text-center text-sm text-foreground/70">
                    Or{' '}
                    <Link href="/signup" className="font-medium text-primary hover:underline">
                        create a new account
                    </Link>
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
                            <label htmlFor="identifier" className="block text-sm font-semibold text-foreground">
                                Username or Email address
                            </label>
                            <div className="mt-1">
                                <input
                                    id="identifier"
                                    name="identifier"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-medical-secondary focus:border-medical-secondary transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-foreground">
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-medical-secondary focus:border-medical-secondary transition-all"
                                />
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
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-foreground/80">
                                    Remember me
                                </label>
                            </div>

                            <div className="text-sm">
                                <a href="#" className="font-medium text-primary hover:underline">
                                    Forgot your password?
                                </a>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-xl text-sm font-bold text-white bg-primary hover:scale-[1.02] transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Authenticating...' : 'Sign In'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
