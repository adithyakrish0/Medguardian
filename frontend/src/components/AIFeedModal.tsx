"use client";

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useMediaPipe } from '@/hooks/useMediaPipe';
import { Camera, Scan, Brain, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';

interface AIFeedModalProps {
    medicationId: number;
    medicationName: string;
    onClose: () => void;
    onComplete: () => void;
}

export default function AIFeedModal({ medicationId, medicationName, onClose, onComplete }: AIFeedModalProps) {
    const [step, setStep] = useState<'intro' | 'scanning' | 'processing' | 'success'>('intro');
    const [handDetected, setHandDetected] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [statusMsg, setStatusMsg] = useState('Position bottle in your palm');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const { detectHand, isLoading: isLoadingML } = useMediaPipe();
    const scanIntervalRef = useRef<any>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const stages = [
        { name: 'Layer 1: Hand-Gate', icon: Camera, desc: 'Verifying human presence' },
        { name: 'Layer 2: Neural DNA', icon: Scan, desc: 'Extracting ORB descriptors' },
        { name: 'Layer 3: Color Sync', icon: Brain, desc: 'Mapping chromatic profile' }
    ];

    // Camera Management
    useEffect(() => {
        if (step === 'scanning' && !streamRef.current) {
            const startCamera = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    streamRef.current = stream;
                    if (videoRef.current) videoRef.current.srcObject = stream;
                } catch (err) { console.error("Camera fail:", err); }
            };
            startCamera();
        }

        return () => {
            // Only stop tracks if we are totally closing the modal (onComplete/onClose)
            // But here we want to keep it if step just changes.
            // So we'll put the cleanup in a dedicated place if possible, or just let it be.
        };
    }, [step]);

    // Dedicated cleanup for when the component unmounts
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    // Hand-Gated Capture Logic
    useEffect(() => {
        if (step !== 'scanning' || isLoadingML) return;

        scanIntervalRef.current = setInterval(() => {
            if (videoRef.current) {
                const handInfo = detectHand(videoRef.current);
                setHandDetected(!!handInfo?.isPresent);

                if (handInfo?.isPresent) {
                    setStatusMsg("Hold steady... extracting DNA");
                    setScanProgress(prev => {
                        if (prev >= 100) {
                            clearInterval(scanIntervalRef.current);
                            handleFeed(handInfo.bbox);
                            return 100;
                        }
                        return prev + 4;
                    });
                } else {
                    setStatusMsg("Hand not detected—Zero-Trash Active");
                    setScanProgress(0);
                }
            }
        }, 100);

        return () => clearInterval(scanIntervalRef.current);
    }, [step, isLoadingML]);

    const handleFeed = async (bbox?: any) => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Stage 2: Intelligent Cropping
        canvas.width = 448;
        canvas.height = 448;
        if (bbox) {
            ctx.drawImage(video,
                bbox.x * video.videoWidth, bbox.y * video.videoHeight,
                bbox.width * video.videoWidth, bbox.height * video.videoHeight,
                0, 0, 448, 448);
        } else {
            ctx.drawImage(video, 0, 0, 448, 448);
        }

        const base64 = canvas.toDataURL('image/jpeg', 0.9);
        setStep('processing');

        try {
            setErrorMsg(null);
            await apiFetch(`/medications/${medicationId}/feed`, {
                method: 'POST',
                body: JSON.stringify({ image: base64 })
            });
            setStep('success');
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || 'Verification failed. Please try again.');
            setStep('scanning');
            setScanProgress(0);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="medical-card w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-card-border flex justify-between items-center bg-secondary/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                            <Brain className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Neural Training</h2>
                            <p className="text-sm opacity-60">Sealing {medicationName} DNA</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    {step === 'intro' && (
                        <div className="space-y-8">
                            <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Scan className="w-5 h-5 text-primary" />
                                    The 3-Layer Protocol
                                </h3>
                                <div className="space-y-4">
                                    {stages.map((s, i) => (
                                        <div key={i} className="flex gap-4">
                                            <div className="w-12 h-12 bg-background rounded-2xl flex items-center justify-center shadow-sm border border-card-border flex-shrink-0">
                                                <s.icon className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{s.name}</p>
                                                <p className="text-xs opacity-60">{s.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={() => setStep('scanning')}
                                className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                            >
                                Start Neural Calibration
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>
                    )}

                    {step === 'scanning' && (
                        <div className="space-y-6">
                            <div className="relative aspect-video rounded-3xl overflow-hidden border-4 border-card-border bg-black shadow-2xl">
                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />

                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <div className={`w-32 h-32 border-4 rounded-full flex items-center justify-center transition-all duration-500 ${handDetected ? 'border-primary scale-110 shadow-[0_0_50px_rgba(59,130,246,0.6)]' : 'border-white/20'
                                        }`}>
                                        <Scan className={`w-12 h-12 ${handDetected ? 'text-primary' : 'text-white/30'}`} />
                                    </div>

                                    {handDetected && (
                                        <div className="mt-8 bg-primary/90 backdrop-blur px-6 py-2 rounded-full text-white font-black text-sm animate-pulse">
                                            SEALING DATA: {scanProgress}%
                                        </div>
                                    )}
                                </div>

                                <div className="absolute bottom-4 inset-x-4 flex justify-between items-end">
                                    <div className="flex flex-col gap-2">
                                        <div className="bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10">
                                            <p className="text-[10px] font-black text-white/50 tracking-widest uppercase mb-1">Status</p>
                                            <p className="text-xs text-white font-bold">{statusMsg}</p>
                                        </div>
                                        {errorMsg && (
                                            <div className="bg-red-500/80 backdrop-blur px-3 py-1.5 rounded-lg border border-red-500/20">
                                                <p className="text-[10px] font-black text-white/50 tracking-widest uppercase mb-1">Error</p>
                                                <p className="text-[10px] text-white font-bold">{errorMsg}</p>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleFeed()}
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all hover:scale-110 active:scale-95 ${handDetected ? 'bg-primary/20 border-primary text-primary' : 'bg-black/40 border-white/10 text-white/20'
                                            }`}
                                        title="Manual Capture"
                                    >
                                        <Camera className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-center text-xs opacity-50 font-medium">
                                Hold the medication container in the center of your palm.
                                <br />Hand-Gatekeeper ensures zero background noise interference.
                            </p>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="text-center py-12 space-y-8">
                            <div className="relative w-24 h-24 mx-auto">
                                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                                <Brain className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-8 h-8 mx-auto text-primary" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black mb-2">Deep Feature Linking</h3>
                                <p className="opacity-60">Mapping ORB keypoints to local secure storage...</p>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-8 space-y-8 animate-in zoom-in duration-500">
                            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-primary/40">
                                <CheckCircle2 className="w-12 h-12 text-white" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black mb-2 text-primary">Neural Bond Active</h3>
                                <p className="opacity-60 max-w-xs mx-auto">
                                    {medicationName} has been successfully fingerprinted with Zero-Trash context.
                                </p>
                            </div>
                            <button
                                onClick={onComplete}
                                className="w-full py-5 bg-foreground text-background rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] transition-all"
                            >
                                Continue To Dashboard
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
