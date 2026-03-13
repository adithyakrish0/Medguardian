"use client";

import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import { Activity, Shield, Brain, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';

const ComparisonDashboard = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchComparison = async () => {
            try {
                setLoading(true);
                const response = await apiFetch('/anomaly/comparison', {
                    method: 'POST',
                    body: JSON.stringify({}) // Backend uses current_user.id if patient_id is missing or 0
                });

                if (response.success) {
                    setData(response);
                } else {
                    console.error('Failed to fetch comparison data:', response.error);
                }
            } catch (err) {
                console.error('Error fetching comparison:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchComparison();
    }, []);

    if (loading || !data) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white">
                <Brain className="w-12 h-12 animate-pulse text-blue-500 mb-4" />
                <p className="text-xl font-medium">{loading ? 'Analyzing Model Performance...' : 'Preparing Intelligence...'}</p>
            </div>
        );
    }

    return (
        <div className="p-8 min-h-screen bg-slate-950 text-slate-100 font-sans">
            <header className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                    <Brain className="w-8 h-8 text-blue-400" />
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                        Anomaly Detection Intelligence
                    </h1>
                </div>
                <p className="text-slate-400 max-w-2xl">
                    Deep Learning (LSTM Autoencoder) vs. Statistical Baseline (Z-Score).
                    Reviewing how recurrent neural networks identify subtle temporal shifts in medication adherence.
                </p>
            </header>

            {/* Hero Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Brain className="w-6 h-6 text-blue-400" />
                        </div>
                        <span className="text-xs font-mono text-blue-400 px-2 py-1 bg-blue-400/10 rounded">SOTA MODEL</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-1">LSTM Autoencoder</h3>
                    <p className="text-sm text-slate-400 mb-4">Uses 7-day sliding window & hidden state recurrence.</p>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Current MSE Score</span>
                            <span className="font-mono text-green-400">
                                {data?.currentScore?.lstm?.score ? data.currentScore.lstm.score.toFixed(4) : "0.0000"}
                            </span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                                className="bg-blue-500 h-full"
                                style={{ width: `${((data?.currentScore?.lstm?.score || 0) / (data?.currentScore?.lstm?.threshold || 1)) * 50}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Stable</span>
                            <span>Threshold: {data?.currentScore?.lstm?.threshold ? data.currentScore.lstm.threshold.toFixed(4) : "0.0000"}</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-slate-500/10 rounded-lg">
                            <Activity className="w-6 h-6 text-slate-400" />
                        </div>
                        <span className="text-xs font-mono text-slate-400 px-2 py-1 bg-slate-400/10 rounded">BASELINE</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-1">Z-Score Stats</h3>
                    <p className="text-sm text-slate-400 mb-4">Standard deviation analysis of isolated events.</p>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Current Z-Score</span>
                            <span className="font-mono text-blue-400">
                                {data?.currentScore?.zscore?.score ? data.currentScore.zscore.score.toFixed(2) : "0.00"}
                            </span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                                className="bg-blue-500 h-full"
                                style={{ width: `${((data?.currentScore?.zscore?.score || 0) / (data?.currentScore?.zscore?.threshold || 1)) * 50}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Standard</span>
                            <span>Limit: {data?.currentScore?.zscore?.threshold ? data.currentScore.zscore.threshold.toFixed(1) : "0.0"}σ</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                <div className="bg-slate-900/30 border border-slate-800/50 p-6 rounded-2xl">
                    <h4 className="text-lg font-medium mb-6 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ROC Curve (Sensitivity)
                    </h4>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data?.rocData || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="x" label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -5, fill: '#64748b' }} stroke="#64748b" />
                                <YAxis label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', fill: '#64748b' }} stroke="#64748b" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="lstm" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="LSTM Autoencoder" />
                                <Line type="monotone" dataKey="zscore" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Z-Score Baseline" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-slate-900/30 border border-slate-800/50 p-6 rounded-2xl">
                    <h4 className="text-lg font-medium mb-6 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        Precision-Recall Benchmarks
                    </h4>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.prData || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="x" label={{ value: 'Recall', position: 'insideBottom', offset: -5, fill: '#64748b' }} stroke="#64748b" />
                                <YAxis label={{ value: 'Precision', angle: -90, position: 'insideLeft', fill: '#64748b' }} stroke="#64748b" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                />
                                <Area type="monotone" dataKey="lstm" stroke="#3b82f6" fill="#3b82f620" name="LSTM Precision" />
                                <Area type="monotone" dataKey="zscore" stroke="#94a3b8" fill="#94a3b810" name="Z-Score Precision" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Explanation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20">
                    <div className="flex items-center gap-2 text-blue-400 mb-2 font-semibold">
                        <Shield className="w-4 h-4" />
                        Context Awareness
                    </div>
                    <p className="text-xs text-slate-400">
                        Unlike Z-score which sees events in isolation, LSTM understands the *order* of events.
                        It catches "drift" where a patient starts staying up later over weeks—patterns Z-score ignores as "one-offs".
                    </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20">
                    <div className="flex items-center gap-2 text-indigo-400 mb-2 font-semibold">
                        <AlertTriangle className="w-4 h-4" />
                        Subtle Multi-Factor
                    </div>
                    <p className="text-xs text-slate-400">
                        LSTM combines hour, day-of-week, and streak simultaneously.
                        It detects anomalies that are "normal" in timing but "anomalous" given the current compliance streak.
                    </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20">
                    <div className="flex items-center gap-2 text-green-400 mb-2 font-semibold">
                        <Activity className="w-4 h-4" />
                        Lower False Alarms
                    </div>
                    <p className="text-xs text-slate-400">
                        By learning the "normal" reconstruction error, the LSTM ignores expected variations,
                        significantily reducing notification fatigue for caregivers.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ComparisonDashboard;
