'use client';

import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { ShieldX } from 'lucide-react';
import { SkeletonDashboard } from './ui/SkeletonLoaders';

function AccessRestricted({ requiredRole }: { requiredRole: 'senior' | 'caregiver' }) {
    const router = useRouter();
    const label = requiredRole === 'caregiver' ? 'Caregiver' : 'Senior';

    return (
        <div className="text-center py-24 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md shadow-2xl">
            <ShieldX className="mx-auto h-20 w-20 text-slate-700 mb-8" />
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                ACCESS_RESTRICTED
            </h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-4">
                This section requires <span className="text-blue-400">{label}</span> access
            </p>
            <button
                onClick={() => router.push('/dashboard')}
                className="mt-10 px-8 py-3 bg-white/5 border border-white/10 hover:bg-white hover:text-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
            >
                RETURN_TO_DASHBOARD
            </button>
        </div>
    );
}

export function SeniorOnly({ children }: { children: React.ReactNode }) {
    const { user, loading } = useUser();

    if (loading) return <SkeletonDashboard />;
    if (!user || user.role !== 'senior') return <AccessRestricted requiredRole="senior" />;

    return <>{children}</>;
}

export function CaregiverOnly({ children }: { children: React.ReactNode }) {
    const { user, loading } = useUser();

    if (loading) return <SkeletonDashboard />;
    if (!user || user.role !== 'caregiver') return <AccessRestricted requiredRole="caregiver" />;

    return <>{children}</>;
}
