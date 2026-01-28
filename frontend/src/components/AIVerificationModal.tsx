"use client";

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

interface VerificationResult {
    success: boolean;
    verified: boolean;
    message?: string;
    confidence: number;
    details?: any;
}

interface AIVerificationModalProps {
    medicationId: number;
    medicationName: string;
    onClose: () => void;
    onVerified: () => void;
}

export default function AIVerificationModal({ medicationId, medicationName, onClose, onVerified }: AIVerificationModalProps) {
    const [step, setStep] = useState<'capture' | 'verifying' | 'result'>('capture');
    const [result, setResult] = useState<VerificationResult | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            setImagePreview(base64);
            setStep('verifying');

            try {
                const data = await apiFetch('/verify', {
                    method: 'POST',
                    body: JSON.stringify({
                        image: base64,
                        medication_id: medicationId
                    })
                });

                setResult(data);
                setStep('result');
            } catch (err: any) {
                setResult({
                    success: false,
                    verified: false,
                    message: err.message || 'Verification system offline',
                    confidence: 0
                });
                setStep('result');
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="medical-card w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-card-border flex justify-between items-center bg-secondary/5">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">AI Verification</h2>
                        <p className="text-sm opacity-60">Scanning for {medicationName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center min-h-[300px]">
                    {step === 'capture' && (
                        <div className="text-center space-y-6">
                            <div className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce">
                                📸
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold">Show Medication Bottle</h3>
                                <p className="text-sm opacity-70 max-w-xs">Hold the pill strip or bottle clearly in front of the camera. We'll verify the label and barcode.</p>
                            </div>

                            <label className="block">
                                <span className="sr-only">Take photo</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleCapture}
                                    className="hidden"
                                    id="camera-input"
                                />
                                <label
                                    htmlFor="camera-input"
                                    className="px-8 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl cursor-pointer hover:scale-105 transition-all flex items-center gap-3"
                                >
                                    <span>Open Camera</span>
                                    <span>→</span>
                                </label>
                            </label>
                        </div>
                    )}

                    {step === 'verifying' && (
                        <div className="text-center space-y-8 w-full">
                            <div className="relative w-48 h-48 mx-auto rounded-3xl overflow-hidden border-4 border-secondary/30">
                                {imagePreview && <img src={imagePreview} className="w-full h-full object-cover" />}
                                <div className="absolute inset-0 bg-secondary/20 animate-pulse flex items-center justify-center">
                                    <div className="w-full h-1 bg-secondary shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_2s_infinite]"></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold animate-pulse">Running Triple-Validation...</h3>
                                <div className="flex gap-2 justify-center">
                                    <span className="text-xs px-2 py-1 bg-secondary/10 rounded">Visual Match</span>
                                    <span className="text-xs px-2 py-1 bg-secondary/10 rounded">Barcode</span>
                                    <span className="text-xs px-2 py-1 bg-secondary/10 rounded">OCR</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'result' && result && (
                        <div className="text-center space-y-6 w-full animate-in fade-in zoom-in duration-300">
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto text-4xl shadow-2xl ${result.verified ? 'bg-accent text-white' : 'bg-red-500 text-white'
                                }`}>
                                {result.verified ? '✓' : '✕'}
                            </div>

                            <div className="space-y-1">
                                <h3 className={`text-2xl font-black ${result.verified ? 'text-accent' : 'text-red-500'}`}>
                                    {result.verified ? 'Verified Successfully' : 'Verification Failed'}
                                </h3>
                                <p className="opacity-70 font-medium">{result.message || (result.verified ? 'Correct medication detected.' : 'Warning: Bottle does not match!')}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full pt-4">
                                <div className="p-4 bg-background rounded-2xl border border-card-border">
                                    <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Confidence</p>
                                    <p className="text-2xl font-black text-secondary">{Math.round(result.confidence * 100)}%</p>
                                </div>
                                <div className="p-4 bg-background rounded-2xl border border-card-border">
                                    <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Method</p>
                                    <p className="text-sm font-black opacity-80 mt-1">{result.details?.method?.toUpperCase() || 'VISION_V2'}</p>
                                </div>
                            </div>

                            <div className="pt-6 w-full flex gap-3">
                                <button
                                    onClick={() => setStep('capture')}
                                    className="flex-1 py-4 border-2 border-primary/20 rounded-2xl font-bold hover:bg-black/5 transition-all"
                                >
                                    Retry
                                </button>
                                {result.verified && (
                                    <button
                                        onClick={onVerified}
                                        className="flex-1 py-4 bg-accent text-white rounded-2xl font-bold shadow-lg hover:bg-accent/80 transition-all"
                                    >
                                        Log Dose
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style jsx>{`
                @keyframes scan {
                    0% { transform: translateY(-100px); }
                    100% { transform: translateY(100px); }
                }
            `}</style>
        </div>
    );
}
