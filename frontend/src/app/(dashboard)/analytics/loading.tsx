"use client";

import { SkeletonGraph, SkeletonStat } from "@/components/SkeletonLoaders";

export default function AnalyticsLoading() {
    return (
        <div className="space-y-8 animate-in fade-in duration-300 p-6">
            <div className="h-8 bg-white/10 rounded-full w-48 animate-pulse mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
            </div>
            <SkeletonGraph />
        </div>
    );
}
