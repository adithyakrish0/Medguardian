"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';
import { useState, useEffect, createContext, useContext } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: ToastType = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-8 right-8 z-[10000] flex flex-col gap-4 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                            className={`pointer-events-auto flex items-center gap-4 p-5 rounded-3xl shadow-2xl min-w-[320px] backdrop-blur-xl border ${toast.type === 'success'
                                    ? 'bg-accent/90 border-accent/20 text-white'
                                    : toast.type === 'error'
                                        ? 'bg-red-600/90 border-red-500/20 text-white'
                                        : 'bg-primary/90 border-primary/20 text-white'
                                }`}
                        >
                            <div className="p-2 bg-white/20 rounded-xl">
                                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                                {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                                {toast.type === 'info' && <Info className="w-5 h-5" />}
                            </div>
                            <p className="flex-1 font-black tracking-tight">{toast.message}</p>
                            <button
                                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4 opacity-50" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};
