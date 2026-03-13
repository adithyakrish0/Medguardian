"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Activity, Eye, FileText, ChevronRight, Search, Filter, AlertTriangle, Fingerprint, ChevronLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function GovernancePage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('all');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await apiFetch('/users/audit-logs');
            if (res.success) {
                setLogs(res.logs);
            }
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesFilter = filterAction === 'all' || log.action === filterAction;
        return matchesSearch && matchesFilter;
    });

    const actionIcons: Record<string, any> = {
        'EMERGENCY_CAMERA_REQUEST': Eye,
        'FLEET_PDF_EXPORT': FileText,
        'DATA_EXPORT_CSV': FileText,
        'MEDICATION_PROTOCOL_CHANGE': Activity,
        'CAREGIVER_CONNECTION_REQUEST': ShieldCheck,
        'LOGIN': Lock,
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 pt-16 lg:pt-0">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-blue-400 transition-all mb-4 group"
                    >
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </button>
                    <h1 className="text-2xl font-bold text-gray-100 mb-2">
                        Governance & Privacy
                    </h1>
                    <p className="text-gray-400 font-medium max-w-xl">
                        Immutable clinical audit trail for data transparency and medical compliance
                    </p>
                </div>

                <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
                        <Fingerprint className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Security Level</p>
                        <p className="text-sm font-bold text-gray-200">Bank-Level E2EE</p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative col-span-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search clinical audit logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-12 pr-4 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-[10px] uppercase tracking-widest appearance-none text-gray-400"
                    >
                        <option value="all">All Actions</option>
                        <option value="EMERGENCY_CAMERA_REQUEST">Emergency Camera</option>
                        <option value="FLEET_PDF_EXPORT">Data Exports</option>
                        <option value="MEDICATION_PROTOCOL_CHANGE">Medication Changes</option>
                    </select>
                </div>
            </div>

            {/* Audit Trail */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-700 bg-gray-900/50 flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 flex items-center gap-3">
                        <Activity className="w-4 h-4 text-blue-500" /> Real-time Audit Trail
                    </h2>
                    <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full uppercase border border-blue-500/20">
                        {filteredLogs.length} Records
                    </span>
                </div>

                <div className="divide-y divide-card-border">
                    {loading ? (
                        <div className="p-20 flex flex-col items-center justify-center gap-4">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full"
                            />
                            <p className="text-xs font-black uppercase tracking-widest text-primary">Synchronizing Ledger...</p>
                        </div>
                    ) : filteredLogs.length > 0 ? (
                        filteredLogs.map((log, index) => {
                            const Icon = actionIcons[log.action] || Activity;
                            const isCritical = log.action === 'EMERGENCY_CAMERA_REQUEST';

                            return (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    key={log.id}
                                    className="p-6 flex items-start gap-4 hover:bg-gray-700/30 transition-all group"
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${isCritical
                                        ? 'bg-red-500/10 border-red-500/20 text-red-500 shadow-lg shadow-red-500/10'
                                        : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                        }`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                                                {log.action.replace(/_/g, ' ')}
                                                {isCritical && (
                                                    <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-[8px] uppercase text-red-400 font-bold animate-pulse border border-red-500/30">Critical Access</span>
                                                )}
                                            </h3>
                                            <span className="text-xs font-bold text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-400 font-medium leading-relaxed mb-4">
                                            {log.details || 'No additional details provided for this event.'}
                                        </p>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
                                                <span className="text-[10px] font-bold uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                                    IP: <span className="text-gray-400">{log.ip_address}</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
                                                <span className="text-[10px] font-bold uppercase text-gray-500 tracking-widest flex items-center gap-2 truncate max-w-[200px]">
                                                    UA: <span className="text-gray-400">{log.user_agent}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="p-3 rounded-xl bg-white dark:bg-gray-800/5 opacity-0 group-hover:opacity-100 transition-all text-foreground/30 hover:text-primary">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="p-20 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-[32px] bg-secondary/5 flex items-center justify-center mb-6">
                                <Search className="w-8 h-8 text-foreground/10" />
                            </div>
                            <h3 className="text-lg font-black text-foreground mb-2">No audit records found</h3>
                            <p className="text-sm text-foreground/40 font-medium max-w-xs">
                                Try adjusting your search query or filters to find specific clinical events.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Compliance Footer */}
            <div className="p-8 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 border border-amber-500/20">
                    <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-gray-200 font-bold uppercase text-[10px] tracking-widest mb-1">Clinical Compliance Notice</h4>
                    <p className="text-xs text-gray-400 font-medium leading-relaxed">
                        This audit log is an immutable record of clinical operations. Deletion or modification of these records is restricted to system administrators for security and medical governance purposes. All emergency session recordings are retained for 90 days in accordance with health data regulations.
                    </p>
                </div>
            </div>
        </div>
    );
}
