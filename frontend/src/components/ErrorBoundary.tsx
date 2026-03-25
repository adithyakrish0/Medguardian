"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null
        };
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[400px] flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-red-50 dark:bg-red-900/10 border border-red-500/20 rounded-[32px] p-8 text-center space-y-6">
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                                {this.props.fallback || "System Malfunction"}
                            </h2>
                            <p className="text-gray-400 text-sm font-medium">
                                {this.props.fallback 
                                    ? "This section failed to load correctly. Please try again or refresh the page."
                                    : "MedGuardian encountered an unexpected UI error. Your data is safe, but this component failed to render."}
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => this.setState({ hasError: false, error: null })}
                                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-red-600 transition-all active:scale-95"
                            >
                                <RefreshCcw className="w-4 h-4" />
                                RETRY COMPONENT
                            </button>

                            <button
                                onClick={() => window.location.href = '/dashboard'}
                                className="w-full py-4 bg-white dark:bg-gray-800/5 text-white/60 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-white dark:bg-gray-800/10 transition-all"
                            >
                                <Home className="w-4 h-4" />
                                RETURN TO DASHBOARD
                            </button>
                        </div>

                        {process.env.NODE_ENV === 'development' && (
                            <div className="mt-4 p-4 bg-black/40 rounded-xl text-left overflow-auto max-h-32">
                                <p className="text-[10px] font-mono text-red-400">{this.state.error?.toString()}</p>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
