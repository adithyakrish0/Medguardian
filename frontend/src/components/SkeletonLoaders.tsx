"use client";

import React from 'react';

interface SkeletonCardProps {
    count?: number;
    type?: 'medication' | 'alert' | 'stat' | 'graph';
}

/**
 * Skeleton loader components for perceived instant loading.
 * Users see structure immediately even if data takes seconds.
 */

export function SkeletonCard({ count = 3, type = 'medication' }: SkeletonCardProps) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="animate-pulse bg-card/40 border border-card-border rounded-[24px] p-6 mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl" />
                        <div className="flex-1 space-y-3">
                            <div className="h-4 bg-white/10 rounded-full w-3/4" />
                            <div className="h-3 bg-white/5 rounded-full w-1/2" />
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}

export function SkeletonStat() {
    return (
        <div className="animate-pulse bg-card/40 border border-card-border rounded-[28px] p-8">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white/10 rounded-2xl" />
                <div className="flex-1 space-y-3">
                    <div className="h-8 bg-white/10 rounded-full w-16" />
                    <div className="h-3 bg-white/5 rounded-full w-24" />
                </div>
            </div>
        </div>
    );
}

export function SkeletonGraph() {
    return (
        <div className="animate-pulse bg-card/40 border border-card-border rounded-[32px] p-10 h-[400px]">
            <div className="flex items-center justify-between mb-8">
                <div className="space-y-3">
                    <div className="h-6 bg-white/10 rounded-full w-48" />
                    <div className="h-3 bg-white/5 rounded-full w-32" />
                </div>
                <div className="w-24 h-8 bg-white/10 rounded-2xl" />
            </div>
            <div className="flex items-end gap-1 h-[280px]">
                {Array.from({ length: 30 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-white/10 to-transparent rounded-t"
                        style={{ height: `${20 + Math.random() * 60}%` }}
                    />
                ))}
            </div>
        </div>
    );
}

export function SkeletonPatientCard() {
    return (
        <div className="animate-pulse bg-card/40 border border-card-border rounded-[32px] p-8">
            <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-white/10 rounded-[24px]" />
                <div className="flex-1 space-y-4">
                    <div className="h-6 bg-white/10 rounded-full w-40" />
                    <div className="flex gap-4">
                        <div className="h-4 bg-white/5 rounded-full w-24" />
                        <div className="h-4 bg-white/5 rounded-full w-16" />
                    </div>
                </div>
                <div className="w-20 h-10 bg-white/10 rounded-2xl" />
            </div>
        </div>
    );
}

export function SkeletonDashboard() {
    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <SkeletonGraph />
                </div>
                <div className="space-y-4">
                    <SkeletonCard count={3} />
                </div>
            </div>
        </div>
    );
}

export function SkeletonCaregiverView() {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <SkeletonPatientCard />
            <SkeletonPatientCard />
            <SkeletonPatientCard />
        </div>
    );
}
