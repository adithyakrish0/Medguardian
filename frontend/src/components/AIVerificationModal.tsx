"use client";

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useMediaPipe } from '@/hooks/useMediaPipe';
import { Camera, RefreshCcw, Scan as ScanIcon, Brain, CheckCircle2, AlertCircle } from 'lucide-react';

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
    const [step, setStep] = useState<'scanning' | 'verifying' | 'result'>('scanning');
    const [result, setResult] = useState<VerificationResult | null>(null);
    const [handDetected, setHandDetected] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const { detectHand, isLoading: isLoadingML } = useMediaPipe();
    const scanIntervalRef = useRef<any>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Start Camera
    useEffect(() => {
        if (step === 'scanning' && !streamRef.current) {
            const startCamera = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: "environment" }
                    });
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (err) {
                    console.error("Camera failed:", err);
                }
            };
            startCamera();
        }

        return () => {
            // Keep stream alive during processing
        };
    }, [step]);

    // Dedicated cleanup
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Stage 1 & 2: Real-time Hand Gatekeeping
    useEffect(() => {
        if (step !== 'scanning') return;

        scanIntervalRef.current = setInterval(() => {
            if (videoRef.current && !isLoadingML) {
                const handInfo = detectHand(videoRef.current);
                setHandDetected(!!handInfo?.isPresent);

                // If hand is steady, increase progress
                if (handInfo?.isPresent) {
                    setScanProgress(prev => {
                        if (prev >= 100) {
                            clearInterval(scanIntervalRef.current);
                            handleAutoCapture(handInfo.bbox);
                            return 100;
                        }
                        return prev + 5;
                    });
                } else {
                    setScanProgress(0);
                }
            }
        }, 100);

        return () => clearInterval(scanIntervalRef.current);
    }, [step, isLoadingML]);

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
            setStep('result');
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || 'Verification system offline');
            setStep('scanning');
            setScanProgress(0);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="medical-card w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-card-border flex justify-between items-center bg-secondary/5">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">AI Verification</h2>
                        <p className="text-sm opacity-60">Zero-Trash Layer-4 Radar • {medicationName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors font-bold">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center min-h-[400px]">
                    {step === 'scanning' && (
                        <div className="text-center space-y-6 w-full">
                            <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-4 border-card-border bg-black group">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover scale-x-[-1]"
                                />

                                {/* Scanning Overlay */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <div className={`w-32 h-32 border-2 rounded-full flex items-center justify-center transition-all duration-300 ${handDetected ? 'border-primary scale-110 shadow-[0_0_30px_rgba(59,130,246,0.5)]' : 'border-white/50 animate-pulse'
                                        }`}>
                                        <ScanIcon className={`w-12 h-12 ${handDetected ? 'text-primary' : 'text-white/50'}`} />
                                    </div>

                                    {/* Progress Ring */}
                                    {handDetected && (
                                        <div className="mt-8 px-6 py-2 bg-primary text-white rounded-full font-bold shadow-xl animate-bounce">
                                            Locking: {scanProgress}%
                                        </div>
                                    )}
                                </div>

                                {/* Layer Indicators */}
                                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <div className={`text-[10px] px-2 py-1 rounded font-bold transition-all ${handDetected ? 'bg-primary text-white' : 'bg-black/50 text-white/50'}`}>
                                                STAGE 1: HAND-GATE
                                            </div>
                                            <div className={`text-[10px] px-2 py-1 rounded font-bold transition-all ${handDetected ? 'bg-primary text-white' : 'bg-black/50 text-white/50'}`}>
                                                STAGE 2: AUTO-CROP
                                            </div>
                                        </div>
                                        {errorMsg && (
                                            <div className="bg-red-500/80 backdrop-blur px-2 py-1 rounded text-[10px] text-white font-bold border border-red-500/20">
                                                ERROR: {errorMsg}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleAutoCapture()}
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all hover:scale-110 active:scale-95 pointer-events-auto ${handDetected ? 'bg-primary/20 border-primary text-primary' : 'bg-black/40 border-white/10 text-white/20'
                                            }`}
                                        title="Manual Capture Fallback"
                                    >
                                        <Camera className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-center gap-3 text-sm font-bold">
                                    {handDetected ? (
                                        <div className="text-primary flex items-center gap-2 animate-pulse">
                                            <span className="w-2 h-2 bg-primary rounded-full" />
                                            Human Hand Detected
                                        </div>
                                    ) : (
                                        <div className="text-foreground/40 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-foreground/20 rounded-full" />
                                            Hold bottle in your hand or click icons
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs opacity-50 max-w-xs mx-auto">
                                    Zero-Trash system prevents false positives.
                                    <br />Tip: If detection is slow, click the camera icon.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 'verifying' && (
                        <div className="text-center space-y-8 w-full">
                            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-4xl animate-spin">
                                <RefreshCcw className="w-12 h-12 text-primary" />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold">Triple-Validation Protocol</h3>
                                <div className="grid grid-cols-1 gap-3 max-w-xs mx-auto">
                                    <div className="flex items-center gap-3 p-3 bg-secondary/5 rounded-2xl border border-card-border animate-in slide-in-from-left duration-300">
                                        <CheckCircle2 className="w-5 h-5 text-primary" />
                                        <span className="text-sm font-bold">Hand-Gatekeeper Pass</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-secondary/5 rounded-2xl border border-card-border animate-in slide-in-from-left delay-150 duration-300">
                                        <RefreshCcw className="w-5 h-5 text-primary animate-spin" />
                                        <span className="text-sm font-bold">YOLO Context Search...</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-secondary/5 rounded-2xl border border-card-border animate-in slide-in-from-left delay-300 duration-300 opacity-50">
                                        <Brain className="w-5 h-5 text-primary" />
                                        <span className="text-sm font-bold">DNA Texture Lock...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'result' && result && (
                        <div className="text-center space-y-6 w-full animate-in fade-in zoom-in duration-300">
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-2xl ${result.verified ? 'bg-primary text-white' :
                                result.message?.includes('PLEASE SHOW LABEL') ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
                                }`}>
                                {result.verified ? <CheckCircle2 className="w-12 h-12" /> :
                                    result.message?.includes('PLEASE SHOW LABEL') ? <AlertCircle className="w-12 h-12 animate-pulse" /> : <AlertCircle className="w-12 h-12" />}
                            </div>

                            <div className="space-y-1">
                                <h3 className={`text-2xl font-black ${result.verified ? 'text-primary' :
                                    result.message?.includes('PLEASE SHOW LABEL') ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {result.verified ? 'Verification Confirmed' :
                                        result.message?.includes('PLEASE SHOW LABEL') ? 'Visual Match Only' : 'Mismatch Detected!'}
                                </h3>
                                <p className="opacity-70 font-medium">{result.message}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full pt-4">
                                <div className={`p-4 rounded-2xl border transition-all ${result.verified ? 'bg-primary/5 border-primary/20' : 'bg-red-500/5 border-red-500/20'
                                    }`}>
                                    <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">DNA Match</p>
                                    <p className={`text-2xl font-black ${result.verified ? 'text-primary' : 'text-red-500'}`}>
                                        {Math.round(result.confidence * 100)}%
                                    </p>
                                </div>
                                <div className="p-4 bg-background rounded-2xl border border-card-border">
                                    <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Stage 4 Lock</p>
                                    <div className="flex flex-col gap-1 mt-1">
                                        <div className="flex items-center gap-2 text-xs font-bold">
                                            <span className={result.details?.layer1_detection ? "text-green-500" : "text-red-500"}>
                                                {result.details?.layer1_detection ? "✅" : "❌"} Shape
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold">
                                            <span className={result.details?.layer2_features ? "text-green-500" : "text-red-500"}>
                                                {result.details?.layer2_features ? "✅" : "❌"} Texture
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold">
                                            <span className={result.details?.layer3_histogram ? "text-green-500" : "text-red-500"}>
                                                {result.details?.layer3_histogram ? "✅" : "❌"} Color
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 w-full flex gap-3">
                                <button
                                    onClick={() => {
                                        setStep('scanning');
                                        setScanProgress(0);
                                        setResult(null);
                                        setHandDetected(false); // Reset hand detection state
                                    }}
                                    className="flex-1 py-4 border-2 border-primary/20 rounded-2xl font-bold hover:bg-black/5 transition-all"
                                >
                                    Retry Radar
                                </button>
                                {result.verified && (
                                    <button
                                        onClick={onVerified}
                                        className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg hover:bg-primary/80 transition-all"
                                    >
                                        Seal Dose
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
