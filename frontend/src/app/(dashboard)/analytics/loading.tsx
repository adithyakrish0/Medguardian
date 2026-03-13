"use client";

import { SkeletonGraph, SkeletonStat } from "@/components/ui/SkeletonLoaders";

export default function AnalyticsLoading() {
    return (
        <div className="p-8 space-y-8">
            <div className="h-8 bg-white dark:bg-gray-800/10 rounded-full w-48 animate-pulse mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
            </div>
            <SkeletonGraph />
        </div>
    );
}
