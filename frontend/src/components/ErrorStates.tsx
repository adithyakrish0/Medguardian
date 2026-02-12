"use client";

import { motion } from 'framer-motion';
import { AlertTriangle, WifiOff, ServerOff, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorStateProps {
    title?: string;
    message: string;
    onRetry?: () => void;
    showHomeButton?: boolean;
}

// Generic error state with retry
export function ErrorState({ title = "Something went wrong", message, onRetry, showHomeButton = false }: ErrorStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
        >
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
            <p className="text-foreground/60 max-w-sm mb-6">{message}</p>
            <div className="flex gap-3">
                {onRetry && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onRetry}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </motion.button>
                )}
                {showHomeButton && (
                    <Link href="/dashboard">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-2 px-6 py-3 border-2 border-foreground/20 text-foreground rounded-xl font-semibold transition-all hover:bg-foreground/5"
                        >
                            <Home className="w-4 h-4" />
                            Go Home
                        </motion.button>
                    </Link>
                )}
            </div>
        </motion.div>
    );
}

// Network/Connection error
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
        >
            <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-6">
                <WifiOff className="w-10 h-10 text-orange-500" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Connection Lost</h3>
            <p className="text-foreground/60 max-w-sm mb-6">
                Please check your internet connection and try again.
            </p>
            {onRetry && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onRetry}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                </motion.button>
            )}
        </motion.div>
    );
}

// Server error
export function ServerError({ onRetry }: { onRetry?: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
        >
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
                <ServerOff className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Server Unavailable</h3>
            <p className="text-foreground/60 max-w-sm mb-6">
                Our servers are taking a break. Please try again in a moment.
            </p>
            {onRetry && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onRetry}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                </motion.button>
            )}
        </motion.div>
    );
}

// Access denied
export function AccessDenied() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
        >
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
                <span className="text-4xl">🔒</span>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Access Denied</h3>
            <p className="text-foreground/60 max-w-sm mb-6">
                You don't have permission to view this page.
            </p>
            <Link href="/dashboard">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                    <Home className="w-4 h-4" />
                    Return to Dashboard
                </motion.button>
            </Link>
        </motion.div>
    );
}
