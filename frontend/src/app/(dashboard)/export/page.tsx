"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Table, Download, Loader2, CheckCircle2, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ExportPage() {
    const router = useRouter();
    const [pdfLoading, setPdfLoading] = useState(false);
    const [csvLoading, setCsvLoading] = useState(false);
    const [pdfDone, setPdfDone] = useState(false);
    const [csvDone, setCsvDone] = useState(false);

    const downloadFile = async (
        url: string,
        filename: string,
        setLoading: (v: boolean) => void,
        setDone: (v: boolean) => void,
    ) => {
        setLoading(true);
        setDone(false);
        try {
            const response = await fetch(url, { credentials: 'include' });
            if (!response.ok) throw new Error('Export failed');
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
            setDone(true);
            setTimeout(() => setDone(false), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const cards = [
        {
            title: 'Full Medication Report',
            description: 'Complete medication list + 30-day adherence history exported as a formatted PDF document.',
            icon: FileText,
            color: 'blue',
            buttonLabel: 'Download PDF',
            loading: pdfLoading,
            done: pdfDone,
            onClick: () =>
                downloadFile(
                    '/api/v1/export/medications/pdf',
                    'medications_report.pdf',
                    setPdfLoading,
                    setPdfDone,
                ),
        },
        {
            title: 'Adherence Data (CSV)',
            description: 'Raw adherence logs for the last 30 days. Import into Excel, Google Sheets, or any analytics tool.',
            icon: Table,
            color: 'emerald',
            buttonLabel: 'Download CSV',
            loading: csvLoading,
            done: csvDone,
            onClick: () =>
                downloadFile(
                    '/api/v1/export/medications/csv',
                    'medications.csv',
                    setCsvLoading,
                    setCsvDone,
                ),
        },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-20 pt-16 lg:pt-0 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-blue-400 transition-all mb-4 group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </button>
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
                        Data <span className="text-primary italic font-medium">Export</span>
                    </h1>
                </div>
                <p className="text-gray-400 mt-2 font-medium">
                    Download your records in PDF or CSV format
                </p>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cards.map((card) => {
                    const Icon = card.icon;
                    const isBlue = card.color === 'blue';

                    return (
                        <motion.div
                            key={card.title}
                            whileHover={{ y: -4 }}
                            className="relative bg-gray-800 border border-gray-700 rounded-xl p-6 overflow-hidden group hover:bg-gray-700/50 transition-all"
                        >
                            {/* Glow */}
                            <div
                                className={`absolute top-0 right-0 w-48 h-48 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none ${isBlue
                                    ? 'bg-blue-500/10'
                                    : 'bg-emerald-500/10'
                                    }`}
                            />

                            <div className="relative z-10 space-y-6">
                                <div
                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isBlue
                                        ? 'bg-blue-500/10 text-blue-500'
                                        : 'bg-emerald-500/10 text-emerald-500'
                                        }`}
                                >
                                    <Icon className="w-7 h-7" />
                                </div>

                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {card.title}
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                                        {card.description}
                                    </p>
                                </div>

                                <button
                                    onClick={card.onClick}
                                    disabled={card.loading}
                                    className={`w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] ${isBlue
                                        ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20'
                                        }`}
                                >
                                    {card.loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Preparing...
                                        </>
                                    ) : card.done ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            Downloaded!
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" />
                                            {card.buttonLabel}
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Info */}
            <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl">
                <p className="text-sm text-gray-400 leading-relaxed">
                    <strong className="text-gray-200">Privacy Note:</strong>{' '}
                    Exports include your medication list and adherence history from the last 30 days.
                    Files are generated on-demand and are not stored on our servers. All data remains
                    within your device after download.
                </p>
            </div>
        </div>
    );
}
