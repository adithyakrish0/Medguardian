"use client";

import { SkeletonCard } from "@/components/SkeletonLoaders";

export default function MedicationsLoading() {
    return (
        <div className="space-y-6 animate-in fade-in duration-300 p-6">
            <div className="h-8 bg-white/10 rounded-full w-48 animate-pulse mb-8" />
            <SkeletonCard count={5} type="medication" />
        </div>
    );
}
