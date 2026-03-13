"use client";

import { SkeletonCard } from "@/components/ui/SkeletonLoaders";

export default function MedicationsLoading() {
    return (
        <div className="p-8">
            <div className="h-8 bg-white dark:bg-gray-800/10 rounded-full w-48 animate-pulse mb-8" />
            <SkeletonCard count={5} type="medication" />
        </div>
    );
}
