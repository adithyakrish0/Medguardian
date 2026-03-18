"use client";

import React from 'react';

/**
 * Unified MedGuardian loading spinner.
 * Replaces all grey-rectangle skeleton loaders with a consistent branded spinner.
 */
export function PageLoader({ message = "Loading..." }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-transparent border-t-blue-500 border-r-blue-500/30 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/20 animate-pulse" />
                </div>
            </div>
            <p className="text-sm text-slate-400 animate-pulse">{message}</p>
        </div>
    );
}

/* ── Backward-compatible named exports ── */

export function SkeletonDashboard() {
    return <PageLoader message="Loading your health data..." />;
}

export function SkeletonCaregiverView() {
    return <PageLoader message="Loading patient overview..." />;
}

export function SkeletonCard({ count = 3, type = 'medication' }: { count?: number; type?: string }) {
    return <PageLoader message="Loading medications..." />;
}

export function SkeletonStat() {
    return <PageLoader message="Loading stats..." />;
}

export function SkeletonGraph() {
    return <PageLoader message="Loading chart..." />;
}

export function SkeletonPatientCard() {
    return <PageLoader message="Loading patient data..." />;
}

export function SkeletonWaterfall() {
    return <PageLoader message="Loading timeline..." />;
}

export function SkeletonChat() {
    return <PageLoader message="Loading conversations..." />;
}
