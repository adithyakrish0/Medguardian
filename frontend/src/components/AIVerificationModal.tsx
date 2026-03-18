"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api';
import { motion } from 'framer-motion';
import { Camera, RefreshCcw, Scan as ScanIcon, Brain, CheckCircle2, AlertCircle, AlertTriangle, X, XCircle } from 'lucide-react';

interface VerificationResult {
    success: boolean;
    verified: boolean;
    message?: string;
    confidence: number;
    cognitive_emergency?: boolean;
    details?: any;
}

interface AIVerificationModalProps {
    medicationId: number;
    medicationName: string;
    onClose: () => void;
    onVerified: () => void;
}

export default function AIVerificationModal({ medicationId, medicationName, onClose, onVerified }: AIVerificationModalProps) {
    const [step, setStep] = useState<'scanning' | 'verifying' | 'result'>('scanning');
    const [result, setResult] = useState<VerificationResult | null>(null);
    const [handDetected, setHandDetected] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [autoCloseCountdown, setAutoCloseCountdown] = useState<number | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanIntervalRef = useRef<any>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Use a callback ref to handle immediate assignment when the element mounts
    const setVideoRef = (el: HTMLVideoElement | null) => {
        (videoRef as any).current = el; // update the ref object for the interval/detect logic
        const stream = streamRef.current;
        
        if (el && stream && el.srcObject !== stream) {
            console.log("[Verification Camera] Callback Ref: Video element mounted, assigning stream...");
            el.srcObject = stream;
            el.onloadedmetadata = () => {
                console.log("[Verification Camera] Callback Ref: Metadata loaded:", el.videoWidth, "x", el.videoHeight);
                el.play()
                    .then(() => console.log("[Verification Camera] Callback Ref: Playback started"))
                    .catch(e => console.error('[Verification Camera] Callback Ref: Play failed:', e));
            };
        }
    };

    // 1. Manage stream lifecycle
    useEffect(() => {
        if (step !== 'scanning') {
            if (streamRef.current) {
                console.log("[Verification Camera] Stopping stream due to step change");
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
            return;
        }

        let cancelled = false;
        const startCamera = async () => {
            try {
                console.log("[Verification Camera] Requesting stream...");
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" }
                });
                console.log("[Verification Camera] Stream received:", stream.id);
                
                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = stream;
                
                // If the video element is already in the DOM, assign it now
                if (videoRef.current) {
                    setVideoRef(videoRef.current);
                }
            } catch (err) {
                console.error("[Verification Camera] Failed:", err);
                if (!cancelled) setErrorMsg("Camera access failed. Please allow camera permission.");
            }
        };
        startCamera();
        return () => { cancelled = true; };
    }, [step]);

    // Dedicated cleanup
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Auto-close countdown when verification succeeds
    useEffect(() => {
        if (step === 'result' && result?.verified) {
            setAutoCloseCountdown(5);
        }
    }, [step, result?.verified]);

    // Separate effect to handle the actual countdown and auto-close
    useEffect(() => {
        if (autoCloseCountdown === null || autoCloseCountdown <= 0) return;

        const timer = setTimeout(() => {
            setAutoCloseCountdown(prev => {
                if (prev === null) return null;
                return prev - 1;
            });
        }, 1000);

        return () => clearTimeout(timer);
    }, [autoCloseCountdown]);

    // Trigger onVerified when countdown reaches 0
    useEffect(() => {
        if (autoCloseCountdown === 0) {
            onVerified();
        }
    }, [autoCloseCountdown, onVerified]);




    // Stage 1 & 2: YOLO-based Hand/Object Detection (backend API)
    useEffect(() => {
        if (step !== 'scanning' || medicationId === 0) return;

        const detectWithYOLO = async () => {
            if (!videoRef.current || !canvasRef.current) return;

            const video = videoRef.current;
            if (video.readyState < 2 || video.videoWidth === 0) return;

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Capture frame for detection
            canvas.width = 320;
            canvas.height = 240;
            ctx.drawImage(video, 0, 0, 320, 240);
            const base64 = canvas.toDataURL('image/jpeg', 0.6);

            try {
                const data = await apiFetch('/detect-hand', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64 })
                });

                const detected = data.hand_detected === true;
                setHandDetected(detected);

                if (detected) {
                    setScanProgress(prev => {
                        if (prev >= 100) {
                            clearInterval(scanIntervalRef.current);
                            handleAutoCapture(data.bbox);
                            return 100;
                        }
                        return prev + 8; // ~1.5 seconds to fill when hand is detected
                    });
                } else {
                    // Reset progress if hand leaves frame
                    setScanProgress(prev => Math.max(0, prev - 10));
                }
            } catch (err) {
                console.debug("Detection API error:", err);
                // Don't reset on error - keep trying
            }
        };

        // Poll every 300ms - rate limiter is exempt so this is fine
        scanIntervalRef.current = setInterval(detectWithYOLO, 300);

        return () => clearInterval(scanIntervalRef.current);
    }, [step]);

    const handleAutoCapture = async (bbox?: any) => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Stage 2: Intelligent Cropping
        if (bbox) {
            canvas.width = 448; // YOLO optimal size
            canvas.height = 448;

            // Add padding to capture the object HELD by the hand, not just the hand
            const padding = 0.5; // 50% padding
            const x = Math.max(0, bbox.x - (bbox.width * padding) / 2);
            const y = Math.max(0, bbox.y - (bbox.height * padding) / 2);
            const w = Math.min(1, bbox.width * (1 + padding));
            const h = Math.min(1, bbox.height * (1 + padding));

            ctx.drawImage(
                video,
                x * video.videoWidth,
                y * video.videoHeight,
                w * video.videoWidth,
                h * video.videoHeight,
                0, 0, 448, 448
            );
        } else {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
        }

        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        setStep('verifying');

        try {
            setErrorMsg(null);
            // Stage 3 & 4: Back-end Radar (YOLO + ORB)
            const data = await apiFetch('/verify', {
                method: 'POST',
                body: JSON.stringify({
                    image: base64,
                    medication_id: medicationId
                })
            });

            setResult(data);
            if (data.cognitive_emergency) {
                setStep('result');
            } else {
                setStep('result');
            }
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || 'Verification system offline');
            setStep('scanning');
            setScanProgress(0);
        }
    };

    // Use portal to escape dashboard layout stacking context
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative bg-gray-900 w-full max-w-2xl overflow-hidden flex flex-col rounded-2xl shadow-2xl border border-gray-700/50"
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-white">
                            {medicationId === 0 ? 'Caregiver Check-in' : 'Medication Verification'}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {medicationId === 0 ? 'Live camera session' : medicationName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                    >
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                </div>

                <div className="p-6 flex flex-col items-center">

                    {/* SCANNING STEP */}
                    {step === 'scanning' && (
                        <div className="w-full space-y-4">
                            {/* Camera Feed */}
                            <div className="relative w-full h-[400px] rounded-xl overflow-hidden bg-black border border-gray-700/50">
                                <video
                                    ref={setVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="absolute inset-0 w-full h-full object-cover"
                                    style={{ transform: 'translateZ(0)' }}
                                />

                                {/* Scan overlay */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className={`w-36 h-36 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${handDetected
                                            ? 'border-teal-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
                                            : 'border-white/30'
                                        }`}>
                                        <ScanIcon className={`w-14 h-14 transition-colors ${handDetected ? 'text-teal-400' : 'text-white/30'}`} />
                                    </div>
                                </div>

                                {/* Progress bar at bottom */}
                                {handDetected && (
                                    <div className="absolute bottom-0 left-0 right-0">
                                        <div className="h-1 bg-gray-800">
                                            <div
                                                className="h-full bg-teal-400 transition-all duration-300"
                                                style={{ width: `${scanProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Status badge top-left */}
                                <div className="absolute top-3 left-3">
                                    {handDetected ? (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-500/20 border border-teal-500/30 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                                            <span className="text-xs font-medium text-teal-300">Hand detected</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/50 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                            <span className="text-xs text-white/50">Scanning...</span>
                                        </div>
                                    )}
                                </div>

                                {/* Manual capture button bottom-right */}
                                {medicationId !== 0 && (
                                    <button
                                        onClick={() => handleAutoCapture()}
                                        className="absolute bottom-3 right-3 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-colors pointer-events-auto"
                                        title="Capture manually"
                                    >
                                        <Camera className="w-5 h-5 text-white" />
                                    </button>
                                )}

                                {/* Error */}
                                {errorMsg && (
                                    <div className="absolute top-3 right-3 px-2.5 py-1 bg-red-500/20 border border-red-500/30 rounded-lg">
                                        <p className="text-xs text-red-300">{errorMsg}</p>
                                    </div>
                                )}
                            </div>

                            {/* Instructions */}
                            <div className="text-center">
                                {medicationId === 0 ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-center gap-2 text-teal-400">
                                            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                                            <span className="text-sm font-medium">Live session active</span>
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-colors"
                                        >
                                            End Session
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-white">
                                            {handDetected ? `Locking in... ${scanProgress}%` : 'Hold your medication up to the camera'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Tap the camera button if auto-detection is slow
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* VERIFYING STEP */}
                    {step === 'verifying' && (
                        <div className="py-8 w-full space-y-6 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
                                <RefreshCcw className="w-8 h-8 text-blue-400 animate-spin" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-white">Analyzing your medication...</h3>
                                <p className="text-xs text-slate-400 mt-1">This takes just a moment</p>
                            </div>
                            <div className="space-y-2 max-w-xs mx-auto">
                                {[
                                    { label: 'Hand detected', done: true },
                                    { label: 'Identifying medication...', done: false, active: true },
                                    { label: 'Confirming match...', done: false },
                                ].map((item, i) => (
                                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${item.done ? 'bg-teal-500/10 border-teal-500/20 text-teal-300' :
                                            item.active ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' :
                                                'bg-gray-800/50 border-gray-700/30 text-slate-500'
                                        }`}>
                                        {item.done ? (
                                            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                                        ) : item.active ? (
                                            <RefreshCcw className="w-4 h-4 animate-spin shrink-0" />
                                        ) : (
                                            <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                                        )}
                                        <span className="font-medium">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* RESULT STEP */}
                    {step === 'result' && result && (
                        <div className="py-4 w-full space-y-5 text-center animate-in fade-in duration-300">
                            {result.cognitive_emergency ? (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto">
                                        <AlertTriangle className="w-8 h-8 text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-red-400">Safety Alert</h3>
                                        <p className="text-sm text-slate-300 mt-1">{result.message || 'Unusual activity detected.'}</p>
                                    </div>
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">
                                        Your caregiver has been notified. Please stay calm.
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={onClose} className="flex-1 py-3 border border-gray-700 text-slate-300 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
                                            Close
                                        </button>
                                        <button
                                            onClick={() => window.location.href = '/emergency'}
                                            className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                                        >
                                            <AlertCircle className="w-4 h-4" />
                                            Get Help
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Result icon */}
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${result.verified ? 'bg-teal-500/10 border border-teal-500/30' :
                                            result.message?.includes('PLEASE SHOW LABEL') ? 'bg-yellow-500/10 border border-yellow-500/30' :
                                                'bg-red-500/10 border border-red-500/30'
                                        }`}>
                                        {result.verified ? (
                                            <CheckCircle2 className="w-8 h-8 text-teal-400" />
                                        ) : (
                                            <AlertCircle className={`w-8 h-8 ${result.message?.includes('PLEASE SHOW LABEL') ? 'text-yellow-400' : 'text-red-400'}`} />
                                        )}
                                    </div>

                                    {/* Result text */}
                                    <div>
                                        <h3 className={`text-lg font-bold ${result.verified ? 'text-teal-400' :
                                                result.message?.includes('PLEASE SHOW LABEL') ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                            {result.verified ? 'Medication Verified' :
                                                result.message?.includes('PLEASE SHOW LABEL') ? 'Partial Match' : 'Not Matched'}
                                        </h3>
                                        <p className="text-sm text-slate-400 mt-1">{result.message}</p>
                                    </div>

                                    {/* Auto-close countdown */}
                                    {result.verified && autoCloseCountdown !== null && autoCloseCountdown > 0 && (
                                        <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl">
                                            <CheckCircle2 className="w-4 h-4 text-teal-400" />
                                            <p className="text-sm font-medium text-teal-300">
                                                Closing in {autoCloseCountdown}s...
                                            </p>
                                        </div>
                                    )}

                                    {/* Stats row */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-gray-800/60 border border-gray-700/50 rounded-xl text-left">
                                            <p className="text-xs text-slate-500 mb-1">Match Score</p>
                                            <p className={`text-xl font-bold ${result.verified ? 'text-teal-400' : 'text-red-400'}`}>
                                                {(() => {
                                                    const score = result.confidence;
                                                    if (score == null || isNaN(score)) return '0';
                                                    return Math.round(score * 100);
                                                })()}%
                                            </p>
                                        </div>
                                        <div className="p-3 bg-gray-800/60 border border-gray-700/50 rounded-xl text-left">
                                            <p className="text-xs text-slate-500 mb-2">Checks</p>
                                            <div className="space-y-1">
                                                {[
                                                    { label: 'Shape', pass: result.details?.layer1_detection },
                                                    { label: 'Texture', pass: result.details?.layer2_features },
                                                    { label: 'Color', pass: result.details?.layer3_histogram },
                                                ].map(check => (
                                                    <div key={check.label} className="flex items-center gap-1.5 text-xs">
                                                        {check.pass ? (
                                                            <CheckCircle2 className="w-3 h-3 text-teal-400" />
                                                        ) : (
                                                            <XCircle className="w-3 h-3 text-red-400" />
                                                        )}
                                                        <span className={check.pass ? 'text-teal-300' : 'text-red-300'}>{check.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex gap-3 pt-1">
                                        <button
                                            onClick={() => {
                                                setStep('scanning');
                                                setScanProgress(0);
                                                setResult(null);
                                                setHandDetected(false);
                                            }}
                                            className="flex-1 py-2.5 border border-gray-700 text-slate-300 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
                                        >
                                            Try Again
                                        </button>
                                        {result.verified && (
                                            <button
                                                onClick={onVerified}
                                                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold transition-colors"
                                            >
                                                Confirm Taken
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </motion.div>
            <canvas ref={canvasRef} className="hidden" />
        </div>,
        document.body
    );
}

