"use client";

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Camera, Scan, Brain, CheckCircle2, ChevronRight, X, Sparkles, Eye, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIFeedModalProps {
    medicationId: number;
    medicationName: string;
    onClose: () => void;
    onComplete: () => void;
}

const steps = [
    {
        icon: Eye,
        title: 'Hand detection',
        desc: 'Confirms you\'re holding the medication',
        color: '#3b82f6',
        dim: '#172038',
    },
    {
        icon: Scan,
        title: 'Visual fingerprint',
        desc: 'Captures unique shape & texture markers',
        color: '#8b5cf6',
        dim: '#1a1230',
    },
    {
        icon: Palette,
        title: 'Colour profile',
        desc: 'Records the exact colour signature',
        color: '#06b6d4',
        dim: '#071820',
    },
];

export default function AIFeedModal({ medicationId, medicationName, onClose, onComplete }: AIFeedModalProps) {
    const [step, setStep] = useState<'intro' | 'scanning' | 'processing' | 'success'>('intro');
    const [handDetected, setHandDetected] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [statusMsg, setStatusMsg] = useState('Position the bottle in your palm');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanIntervalRef = useRef<any>(null);

    // Use a callback ref to handle immediate assignment when the element mounts
    const setVideoRef = (el: HTMLVideoElement | null) => {
        (videoRef as any).current = el; // update the ref object for the interval/detect logic
        const stream = streamRef.current;
        
        if (el && stream && el.srcObject !== stream) {
            console.log("[Camera] Callback Ref: Video element mounted, assigning stream...");
            el.srcObject = stream;
            el.onloadedmetadata = () => {
                console.log("[Camera] Callback Ref: Metadata loaded:", el.videoWidth, "x", el.videoHeight);
                el.play()
                    .then(() => console.log("[Camera] Callback Ref: Playback started"))
                    .catch(e => console.error('[Camera] Callback Ref: Play failed:', e));
            };
        }
    };

    // Manage stream lifecycle
    useEffect(() => {
        if (step !== 'scanning') {
            if (streamRef.current) {
                console.log("[Camera] Stopping stream due to step change");
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                console.log("[Camera] Requesting stream...");
                if (!navigator.mediaDevices) {
                    setErrorMsg('Camera restricted on network IP. Use "localhost" or HTTPS.');
                    return;
                }
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                console.log("[Camera] Stream received:", stream.id);
                
                if (cancelled) { 
                    stream.getTracks().forEach(t => t.stop()); 
                    return; 
                }
                
                streamRef.current = stream;
                
                // If the video element is already in the DOM, assign it now
                if (videoRef.current) {
                    setVideoRef(videoRef.current);
                }
            } catch (err: any) { 
                console.error('[Camera] Error:', err);
                if (!cancelled) setErrorMsg(err.message || 'Camera access denied.');
            }
        })();
        return () => { cancelled = true; };
    }, [step]);

    // Cleanup on unmount
    useEffect(() => () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        clearInterval(scanIntervalRef.current);
    }, []);

    // YOLO polling
    useEffect(() => {
        if (step !== 'scanning') return;
        const detect = async () => {
            if (!videoRef.current || !canvasRef.current) return;
            const v = videoRef.current;
            if (v.readyState < 2 || v.videoWidth === 0) return;
            const c = canvasRef.current;
            const ctx = c.getContext('2d');
            if (!ctx) return;
            c.width = 320; c.height = 240;
            ctx.drawImage(v, 0, 0, 320, 240);
            const b64 = c.toDataURL('image/jpeg', 0.6);
            try {
                const data = await apiFetch('/detect-hand', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: b64 }),
                });
                const detected = data.hand_detected === true;
                setHandDetected(detected);
                if (detected) {
                    setStatusMsg('Hold steady — capturing…');
                    setScanProgress(prev => {
                        const next = prev + 8;
                        if (next >= 100) { clearInterval(scanIntervalRef.current); handleFeed(data.bbox); return 100; }
                        return next;
                    });
                } else {
                    setStatusMsg('Position the bottle in your palm');
                    setScanProgress(prev => Math.max(0, prev - 10));
                }
            } catch { /* keep trying */ }
        };
        scanIntervalRef.current = setInterval(detect, 300);
        return () => clearInterval(scanIntervalRef.current);
    }, [step]);

    const handleFeed = async (bbox?: any) => {
        if (!videoRef.current || !canvasRef.current) return;
        const v = videoRef.current;
        const c = canvasRef.current;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        c.width = 448; c.height = 448;
        if (bbox) {
            ctx.drawImage(v, bbox.x * v.videoWidth, bbox.y * v.videoHeight, bbox.width * v.videoWidth, bbox.height * v.videoHeight, 0, 0, 448, 448);
        } else {
            ctx.drawImage(v, 0, 0, 448, 448);
        }
        const b64 = c.toDataURL('image/jpeg', 0.9);
        setStep('processing');
        try {
            setErrorMsg(null);
            await apiFetch(`/medications/${medicationId}/feed`, { method: 'POST', body: JSON.stringify({ image: b64 }) });
            setStep('success');
        } catch (err: any) {
            setErrorMsg(err.message || 'Capture failed. Try again.');
            setStep('scanning');
            setScanProgress(0);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>

            <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="w-full max-w-md overflow-hidden flex flex-col"
                style={{
                    background: '#0a1628',
                    border: '1px solid #1a2d48',
                    borderRadius: '20px',
                    maxHeight: '92vh',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
                }}
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-5"
                    style={{ borderBottom: '1px solid #12243a' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: '#172038' }}>
                            <Brain className="w-4 h-4" style={{ color: '#3b82f6' }} />
                        </div>
                        <div>
                            <p className="text-[15px] font-semibold" style={{ color: '#e2e8f0' }}>Train AI</p>
                            <p className="text-[12px]" style={{ color: '#3a5270' }}>
                                Teaching the system to recognise <span style={{ color: '#5b8ab8' }}>{medicationName}</span>
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                        style={{ color: '#3a5270' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#12243a'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#3a5270'; }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto">
                    <AnimatePresence mode="wait">

                        {/* INTRO */}
                        {step === 'intro' && (
                            <motion.div key="intro"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="p-6 space-y-6">

                                {/* Illustration strip */}
                                <div className="rounded-2xl px-6 py-5 flex items-center justify-center gap-5"
                                    style={{ background: '#0d1e33', border: '1px solid #162b44' }}>
                                    {steps.map((s, i) => (
                                        <div key={i} className="flex flex-col items-center gap-2 flex-1 relative">
                                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                                                style={{ background: s.dim, border: `1px solid ${s.color}22` }}>
                                                <s.icon className="w-5 h-5" style={{ color: s.color }} />
                                            </div>
                                            <p className="text-[10px] text-center leading-tight font-medium"
                                                style={{ color: '#4a607a' }}>{s.title}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Step list */}
                                <div className="space-y-3">
                                    {steps.map((s, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.08 }}
                                            className="flex items-center gap-4 rounded-xl px-4 py-3.5"
                                            style={{ background: '#0d1e33', border: '1px solid #162b44' }}>
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                style={{ background: s.dim }}>
                                                <s.icon className="w-4 h-4" style={{ color: s.color }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-medium" style={{ color: '#c8d8e8' }}>{s.title}</p>
                                                <p className="text-[11px] mt-0.5" style={{ color: '#3a5270' }}>{s.desc}</p>
                                            </div>
                                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
                                                style={{ background: s.color + '22', color: s.color }}>
                                                {i + 1}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                <p className="text-[12px] text-center leading-relaxed"
                                    style={{ color: '#3a5270' }}>
                                    This takes about 5 seconds. Hold your medication clearly in view of the camera.
                                </p>

                                <button
                                    onClick={() => setStep('scanning')}
                                    className="w-full py-3.5 rounded-[12px] text-[14px] font-semibold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.99]"
                                    style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 4px 20px rgba(37,99,235,0.3)' }}>
                                    <Camera className="w-4 h-4" />
                                    Start camera training
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </motion.div>
                        )}

                        {/* SCANNING */}
                        {step === 'scanning' && (
                            <motion.div key="scanning"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="p-6 space-y-5">

                                {/* Camera frame */}
                                <div className="relative rounded-2xl overflow-hidden w-full h-72"
                                    style={{
                                        background: '#000',
                                        border: `2px solid ${handDetected ? '#3b82f6' : '#162b44'}`,
                                        transition: 'border-color 0.3s',
                                        boxShadow: handDetected ? '0 0 30px rgba(59,130,246,0.2)' : 'none',
                                    }}>
                                    <video 
                                        ref={setVideoRef} 
                                        autoPlay 
                                        playsInline 
                                        muted
                                        className="absolute inset-0 w-full h-full object-cover"
                                        style={{ transform: 'translateZ(0)', opacity: 1, display: 'block' }} 
                                    />

                                    {/* Corner brackets */}
                                    {['tl', 'tr', 'bl', 'br'].map(pos => (
                                        <div key={pos} className="absolute w-6 h-6"
                                            style={{
                                                top: pos.startsWith('t') ? 12 : 'auto',
                                                bottom: pos.startsWith('b') ? 12 : 'auto',
                                                left: pos.endsWith('l') ? 12 : 'auto',
                                                right: pos.endsWith('r') ? 12 : 'auto',
                                                borderTop: pos.startsWith('t') ? `2px solid ${handDetected ? '#3b82f6' : '#2a4a6a'}` : 'none',
                                                borderBottom: pos.startsWith('b') ? `2px solid ${handDetected ? '#3b82f6' : '#2a4a6a'}` : 'none',
                                                borderLeft: pos.endsWith('l') ? `2px solid ${handDetected ? '#3b82f6' : '#2a4a6a'}` : 'none',
                                                borderRight: pos.endsWith('r') ? `2px solid ${handDetected ? '#3b82f6' : '#2a4a6a'}` : 'none',
                                                borderRadius: pos === 'tl' ? '4px 0 0 0' : pos === 'tr' ? '0 4px 0 0' : pos === 'bl' ? '0 0 0 4px' : '0 0 4px 0',
                                                transition: 'border-color 0.3s',
                                            }} />
                                    ))}

                                    {/* Center target ring */}
                                    {!handDetected && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="w-24 h-24 rounded-full flex items-center justify-center"
                                                style={{ border: '1.5px solid #2a4a6a' }}>
                                                <div className="w-3 h-3 rounded-full" style={{ background: '#2a4a6a' }} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Progress ring when scanning */}
                                    {handDetected && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <svg className="w-20 h-20 -rotate-90">
                                                <circle cx="40" cy="40" r="34" fill="none" stroke="#172038" strokeWidth="3" />
                                                <circle cx="40" cy="40" r="34" fill="none" stroke="#3b82f6" strokeWidth="3"
                                                    strokeLinecap="round"
                                                    strokeDasharray={`${2 * Math.PI * 34}`}
                                                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - scanProgress / 100)}`}
                                                    style={{ transition: 'stroke-dashoffset 0.2s' }} />
                                            </svg>
                                            <div className="absolute text-[13px] font-semibold" style={{ color: '#3b82f6' }}>
                                                {scanProgress}%
                                            </div>
                                        </div>
                                    )}

                                    {/* Bottom bar */}
                                    <div className="absolute bottom-0 inset-x-0 px-4 py-3 flex items-center justify-between"
                                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)' }}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full"
                                                style={{ background: handDetected ? '#3b82f6' : '#2a4a6a', boxShadow: handDetected ? '0 0 6px #3b82f6' : 'none' }} />
                                            <span className="text-[11px] font-medium"
                                                style={{ color: handDetected ? '#93c5fd' : '#4a6a8a' }}>{statusMsg}</span>
                                        </div>
                                        <button onClick={() => handleFeed()}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                                            style={{ background: '#172038', color: '#5b8ab8', border: '1px solid #1e3554' }}>
                                            <Camera className="w-3 h-3" /> Capture
                                        </button>
                                    </div>

                                    {/* Error overlay */}
                                    {errorMsg && (
                                        <div className="absolute top-3 inset-x-3 px-3 py-2 rounded-lg text-[11px]"
                                            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                                            {errorMsg}
                                        </div>
                                    )}
                                </div>

                                {/* Progress track */}
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-[11px] font-medium" style={{ color: '#3a5270' }}>Scan progress</span>
                                        <span className="text-[11px] font-medium" style={{ color: handDetected ? '#3b82f6' : '#3a5270' }}>{scanProgress}%</span>
                                    </div>
                                    <div className="h-1 rounded-full overflow-hidden" style={{ background: '#0d1e33' }}>
                                        <div className="h-full rounded-full transition-all duration-200"
                                            style={{
                                                width: `${scanProgress}%`,
                                                background: handDetected ? '#3b82f6' : '#1e3554',
                                                boxShadow: handDetected ? '0 0 8px rgba(59,130,246,0.5)' : 'none',
                                            }} />
                                    </div>
                                </div>

                                <p className="text-[12px] text-center leading-relaxed" style={{ color: '#3a5270' }}>
                                    Hold your medication clearly in the center of frame. The system confirms your hand before scanning.
                                </p>
                            </motion.div>
                        )}

                        {/* PROCESSING */}
                        {step === 'processing' && (
                            <motion.div key="processing"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="p-8 flex flex-col items-center text-center gap-6">
                                <div className="relative w-20 h-20">
                                    <svg className="w-full h-full -rotate-90 absolute inset-0">
                                        <circle cx="40" cy="40" r="34" fill="none" stroke="#162b44" strokeWidth="2.5" />
                                        <circle cx="40" cy="40" r="34" fill="none" stroke="#3b82f6" strokeWidth="2.5"
                                            strokeLinecap="round" strokeDasharray="60 154"
                                            style={{ animation: 'spin 1.2s linear infinite', transformOrigin: '40px 40px' }} />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Brain className="w-7 h-7" style={{ color: '#3b82f6' }} />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[17px] font-semibold mb-1" style={{ color: '#e2e8f0' }}>Processing image</p>
                                    <p className="text-[13px]" style={{ color: '#3a5270' }}>
                                        Mapping keypoints and saving the visual fingerprint…
                                    </p>
                                </div>
                                {[
                                    { label: 'Extracting features', delay: 0 },
                                    { label: 'Building colour map', delay: 0.4 },
                                    { label: 'Saving to profile', delay: 0.8 },
                                ].map((item, i) => (
                                    <motion.div key={i}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: item.delay }}
                                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl"
                                        style={{ background: '#0d1e33', border: '1px solid #162b44' }}>
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#3b82f6' }} />
                                        <span className="text-[13px]" style={{ color: '#5b8ab8' }}>{item.label}</span>
                                        <div className="ml-auto">
                                            <div className="w-3 h-3 rounded-full border border-blue-500 border-t-transparent animate-spin" />
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}

                        {/* SUCCESS */}
                        {step === 'success' && (
                            <motion.div key="success"
                                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                                className="p-8 flex flex-col items-center text-center gap-6">
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                                    className="w-20 h-20 rounded-full flex items-center justify-center"
                                    style={{ background: '#0a2a0a', border: '2px solid #22c55e22', boxShadow: '0 0 40px rgba(34,197,94,0.15)' }}>
                                    <CheckCircle2 className="w-9 h-9" style={{ color: '#22c55e' }} />
                                </motion.div>

                                <div>
                                    <p className="text-[18px] font-semibold mb-1.5" style={{ color: '#e2e8f0' }}>
                                        Training complete
                                    </p>
                                    <p className="text-[13px] leading-relaxed" style={{ color: '#3a5270' }}>
                                        <span style={{ color: '#5b8ab8' }}>{medicationName}</span> has been visually registered.
                                        The AI will now recognise it during verification.
                                    </p>
                                </div>

                                {[
                                    { label: 'Hand detection', color: '#3b82f6' },
                                    { label: 'Visual fingerprint', color: '#8b5cf6' },
                                    { label: 'Colour profile', color: '#06b6d4' },
                                ].map((item, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 + i * 0.1 }}
                                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl"
                                        style={{ background: '#0d1e33', border: '1px solid #162b44' }}>
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }} />
                                        <span className="text-[13px]" style={{ color: '#5b8ab8' }}>{item.label}</span>
                                        <div className="ml-auto flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
                                            <span className="text-[11px]" style={{ color: '#22c55e' }}>Saved</span>
                                        </div>
                                    </motion.div>
                                ))}

                                <button
                                    onClick={onComplete}
                                    className="w-full py-3.5 rounded-[12px] text-[14px] font-semibold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110"
                                    style={{ background: '#1a3a1a', border: '1px solid #22c55e30', color: '#22c55e' }}>
                                    <Sparkles className="w-4 h-4" />
                                    Done — back to medications
                                </button>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>

                {/* Spinning ring keyframe */}
                <style>{`
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                `}</style>
            </motion.div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
