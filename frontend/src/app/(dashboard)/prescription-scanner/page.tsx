"use client";

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ScanLine,
    Upload,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Plus,
    RotateCcw,
    FileImage,
    X,
    Sparkles,
    Pill,
    ArrowLeft,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/NiceToast';
import { useRouter } from 'next/navigation';
import { SeniorOnly } from '@/components/RoleGuard';

// ── Types ──────────────────────────────────────────────────
interface ScannedMedication {
    name: string;
    dosage: string;
    frequency: string;
    raw_text?: string;
}

interface ScanResult {
    medications: ScannedMedication[];
    confidence: number;
    method: string;
}

// ── Component ──────────────────────────────────────────────
export default function PrescriptionScannerPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Upload state
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    // Scan state
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Per-medication state
    const [expandedRaw, setExpandedRaw] = useState<Record<number, boolean>>({});
    const [addingIdx, setAddingIdx] = useState<number | null>(null);
    const [addedIdxs, setAddedIdxs] = useState<Set<number>>(new Set());

    // ── File handling ──────────────────────────────────────
    const handleFile = useCallback((f: File) => {
        setFile(f);
        setResult(null);
        setError(null);
        setAddedIdxs(new Set());

        if (f.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result as string);
            reader.readAsDataURL(f);
        } else {
            // PDF or other — show icon instead
            setPreview(null);
        }
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    }, [handleFile]);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const onDragLeave = useCallback(() => setIsDragOver(false), []);

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) handleFile(f);
    };

    const removeFile = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setError(null);
        setAddedIdxs(new Set());
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Scan ───────────────────────────────────────────────
    const handleScan = async () => {
        if (!file) return;
        setScanning(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('image', file);

            // Use native fetch for multipart — apiFetch hardcodes Content-Type: application/json
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
            const res = await fetch(`${API_URL}/prescriptions/scan`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
                // No Content-Type header — browser sets multipart boundary automatically
            });

            if (!res.ok) {
                let msg = `Scan failed (${res.status})`;
                try {
                    const errData = await res.json();
                    msg = errData.error || errData.message || msg;
                } catch { }
                throw new Error(msg);
            }

            const data = await res.json();
            if (data.success && data.data) {
                setResult(data.data);
            } else {
                throw new Error(data.error || 'Scan returned no results');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to scan prescription');
        } finally {
            setScanning(false);
        }
    };

    // ── Add medication ─────────────────────────────────────
    const handleAddMedication = async (med: ScannedMedication, idx: number) => {
        setAddingIdx(idx);
        try {
            const response = await apiFetch('/medications', {
                method: 'POST',
                body: JSON.stringify({
                    name: med.name,
                    dosage: med.dosage,
                    frequency: med.frequency,
                    notes: 'Added from prescription scan',
                }),
            });
            if (response.success) {
                setAddedIdxs(prev => new Set(prev).add(idx));
                showToast(`${med.name} added to your medications`, 'success');
            } else {
                showToast(response.error || 'Failed to add medication', 'error');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to add medication', 'error');
        } finally {
            setAddingIdx(null);
        }
    };

    // ── Reset ──────────────────────────────────────────────
    const handleReset = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setError(null);
        setExpandedRaw({});
        setAddedIdxs(new Set());
        setAddingIdx(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Confidence badge ───────────────────────────────────
    const confidenceBadge = (confidence: number) => {
        const pct = Math.round(confidence * 100);
        const cls = confidence >= 0.8
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            : confidence >= 0.5
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-red-500/15 text-red-400 border-red-500/30';
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cls}`}>
                <Sparkles className="w-3 h-3" />
                {pct}% Confidence
            </span>
        );
    };

    // ── Render ──────────────────────────────────────────────
    return (
        <SeniorOnly>
            <div className="max-w-3xl mx-auto space-y-8 pt-16 lg:pt-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header */}
                <div className="space-y-1">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-blue-400 transition-all mb-4 group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </button>
                    <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
                        Prescription <span className="text-primary italic font-medium">Scanner</span>
                    </h1>
                    <p className="text-gray-400 mt-2 font-medium">
                        Upload a prescription image and let AI extract your medications.
                    </p>
                </div>

                {/* Upload Zone */}
                {!result && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <div
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onClick={() => !file && fileInputRef.current?.click()}
                            className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer group ${isDragOver
                                ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                                : file
                                    ? 'border-gray-600 bg-gray-800/50'
                                    : 'border-gray-700 bg-gray-800/30 hover:border-blue-500/50'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={onFileSelect}
                                className="hidden"
                            />

                            {!file ? (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 mx-auto rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-blue-500/20">
                                        <Upload className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-gray-200">
                                            Drop your prescription here
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            or click to browse • JPG, PNG, PDF supported
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* File remove button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFile(); }}
                                        className="absolute top-4 right-4 p-2 rounded-xl bg-gray-700/50 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>

                                    {/* Preview */}
                                    {preview ? (
                                        <div className="flex justify-center">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={preview}
                                                alt="Prescription preview"
                                                className="max-h-[300px] rounded-xl object-contain border border-gray-700 shadow-lg"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                                <FileImage className="w-8 h-8 text-blue-500" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-300">{file.name}</p>
                                        </div>
                                    )}

                                    <p className="text-xs text-gray-500">
                                        {file.name} • {(file.size / 1024).toFixed(0)} KB
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Scan Button */}
                        <button
                            onClick={handleScan}
                            disabled={!file || scanning}
                            className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/10 active:scale-[0.98] cursor-pointer"
                        >
                            {scanning ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Analyzing Prescription...
                                </>
                            ) : (
                                <>
                                    <ScanLine className="w-5 h-5" />
                                    Process Scanned Image
                                </>
                            )}
                        </button>
                    </motion.div>
                )}

                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-4"
                        >
                            <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-bold text-red-300">Scan Failed</p>
                                <p className="text-sm text-red-400/80 mt-1">{error}</p>
                            </div>
                            <button
                                onClick={() => setError(null)}
                                className="p-1 text-red-400/60 hover:text-red-300 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Results */}
                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            {/* Results header */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-xl bg-gray-800/60 border border-gray-700">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-gray-100">
                                            {result.medications.length} Medication{result.medications.length !== 1 ? 's' : ''} Found
                                        </h2>
                                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                            {confidenceBadge(result.confidence)}
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-700/60 text-gray-400 border border-gray-600/50">
                                                {result.method}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleReset}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-all font-bold text-sm border border-gray-600/50"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Scan Another
                                </button>
                            </div>

                            {/* Medication cards */}
                            <div className="space-y-3">
                                {result.medications.map((med, idx) => {
                                    const isExpanded = expandedRaw[idx] ?? false;
                                    const isAdded = addedIdxs.has(idx);
                                    const isAdding = addingIdx === idx;

                                    return (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.08 }}
                                            className="p-5 rounded-xl bg-gray-800 border border-gray-700 hover:border-gray-600 transition-all group"
                                        >
                                            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                                                <div className="flex items-start gap-4 flex-1">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                                        <Pill className="w-5 h-5 text-blue-500" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="text-lg font-semibold text-blue-400 truncate">
                                                            {med.name}
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-400">
                                                            {med.dosage && <span>{med.dosage}</span>}
                                                            {med.dosage && med.frequency && <span className="w-1 h-1 bg-gray-600 rounded-full" />}
                                                            {med.frequency && <span>{med.frequency}</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Add button */}
                                                <button
                                                    onClick={() => handleAddMedication(med, idx)}
                                                    disabled={isAdded || isAdding}
                                                    className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isAdded
                                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-default'
                                                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white active:scale-95'
                                                        } disabled:opacity-60`}
                                                >
                                                    {isAdding ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : isAdded ? (
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    ) : (
                                                        <Plus className="w-4 h-4" />
                                                    )}
                                                    {isAdded ? 'Added' : 'Add to My Medications'}
                                                </button>
                                            </div>

                                            {/* Raw text (collapsible) */}
                                            {med.raw_text && (
                                                <div className="mt-3 pt-3 border-t border-gray-700/30">
                                                    <button
                                                        onClick={() => setExpandedRaw(prev => ({ ...prev, [idx]: !isExpanded }))}
                                                        className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-wider"
                                                    >
                                                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                        Raw extracted text
                                                    </button>
                                                    <AnimatePresence>
                                                        {isExpanded && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <pre className="mt-2 p-3 rounded-xl bg-gray-900/80 text-xs text-gray-400 whitespace-pre-wrap font-mono border border-gray-700/30">
                                                                    {med.raw_text}
                                                                </pre>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Empty state */}
                            {result.medications.length === 0 && (
                                <div className="p-12 text-center rounded-3xl bg-gray-800/30 border-2 border-dashed border-gray-700/50">
                                    <ScanLine className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                    <p className="text-lg font-bold text-gray-400">No medications detected</p>
                                    <p className="text-sm text-gray-500 mt-1">Try uploading a clearer image of your prescription.</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </SeniorOnly>
    );
}
