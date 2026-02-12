"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Activity, Eye, FileText, ChevronRight, Search, Filter, AlertTriangle, Fingerprint } from 'lucide-react';
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
        'MEDICATION_PROTOCOL_CHANGE': Activity,
        'CAREGIVER_CONNECTION_REQUEST': ShieldCheck,
        'LOGIN': Lock,
    };

    return (
        <div className="space-y-10 pb-20">
            {/* Header section with glassmorphism */}
            <div className="relative p-10 rounded-[32px] overflow-hidden">
                <div className="absolute inset-0 bg-primary/10 backdrop-blur-3xl border border-primary/20" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Clinical Integrity</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-foreground mb-3">Governance & Privacy</h1>
                        <p className="text-foreground/50 max-w-xl font-medium leading-relaxed">
                            Immutable clinical audit trail for data transparency, medical compliance, and emergency session accountability.
                        </p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="bg-background/50 backdrop-blur-xl border border-card-border p-4 rounded-2xl flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                                <Fingerprint className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Privacy Status</p>
                                <p className="text-sm font-black text-foreground">Bank-Level Security</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative col-span-2">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20" />
                    <input
                        type="text"
                        placeholder="Search clinical audit logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-card/50 border border-card-border rounded-2xl py-4 pl-16 pr-6 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-foreground"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20" />
                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="w-full bg-card/50 border border-card-border rounded-2xl py-4 pl-16 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-black text-xs uppercase tracking-widest appearance-none text-foreground"
                    >
                        <option value="all">All Actions</option>
                        <option value="EMERGENCY_CAMERA_REQUEST">Emergency Camera</option>
                        <option value="FLEET_PDF_EXPORT">Data Exports</option>
                        <option value="MEDICATION_PROTOCOL_CHANGE">Medication Changes</option>
                    </select>
                </div>
            </div>

            {/* Audit Trail */}
            <div className="bg-card border border-card-border rounded-[32px] overflow-hidden shadow-2xl shadow-black/5">
                <div className="p-8 border-b border-card-border bg-secondary/5 flex items-center justify-between">
                    <h2 className="text-sm font-black uppercase tracking-widest text-foreground/60 flex items-center gap-3">
                        <Activity className="w-4 h-4" /> Real-time Audit Trail
                    </h2>
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">
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
                                    className="p-8 flex items-start gap-6 hover:bg-secondary/5 transition-all group"
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${isCritical
                                        ? 'bg-red-500/10 border-red-500/20 text-red-500 shadow-lg shadow-red-500/10'
                                        : 'bg-primary/10 border-primary/20 text-primary'
                                        }`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="text-base font-black text-foreground flex items-center gap-2">
                                                {log.action.replace(/_/g, ' ')}
                                                {isCritical && (
                                                    <span className="px-2 py-0.5 rounded-md bg-red-500 text-[8px] uppercase text-white font-black animate-pulse">Critical</span>
                                                )}
                                            </h3>
                                            <span className="text-xs font-bold text-foreground/30">{new Date(log.created_at).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-foreground/60 font-medium leading-relaxed mb-4">
                                            {log.details || 'No additional details provided for this event.'}
                                        </p>
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                                <span className="text-[10px] font-black uppercase text-foreground/30 tracking-widest flex items-center gap-2">
                                                    IP: <span className="text-foreground/50">{log.ip_address}</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                                <span className="text-[10px] font-black uppercase text-foreground/30 tracking-widest flex items-center gap-2 truncate max-w-[200px]">
                                                    UA: <span className="text-foreground/50">{log.user_agent}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="p-3 rounded-xl bg-white/5 opacity-0 group-hover:opacity-100 transition-all text-foreground/30 hover:text-primary">
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
            <div className="p-10 bg-yellow-500/5 border border-yellow-500/10 rounded-[32px] flex items-start gap-6">
                <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="text-foreground font-black uppercase text-xs tracking-widest mb-1">Clinical Compliance Notice</h4>
                    <p className="text-sm text-foreground/60 font-medium leading-relaxed">
                        This audit log is an immutable record of clinical operations. Deletion or modification of these records is restricted to system administrators for security and medical governance purposes. All emergency session recordings are retained for 90 days in accordance with health data regulations.
                    </p>
                </div>
            </div>
        </div>
    );
}
