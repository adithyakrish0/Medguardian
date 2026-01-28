"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import VoiceAssistant from '@/components/VoiceAssistant';
import {
    LayoutDashboard,
    Pill,
    Users,
    LineChart,
    Bell,
    Plus,
    ChevronRight,
    Search
} from 'lucide-react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const navItems = [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Medications", href: "/medications", icon: Pill },
        { label: "Caregivers", href: "/caregiver", icon: Users },
        { label: "Analytics", href: "/analytics", icon: LineChart },
    ];

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside className="w-72 bg-card border-r border-card-border hidden lg:flex flex-col shadow-xl z-50">
                <div className="p-8 pb-12 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[18px] bg-primary flex items-center justify-center text-white font-black shadow-2xl shadow-primary/40 text-xl">
                        M
                    </div>
                    <div>
                        <span className="text-2xl font-black tracking-tight text-foreground block">MedGuardian</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Executive Health</span>
                    </div>
                </div>

                <nav className="mt-4 flex-1 px-6 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center justify-between px-5 py-4 rounded-[20px] font-black transition-all group ${isActive
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                                        : 'text-foreground/50 hover:bg-secondary/5 hover:text-foreground'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-primary/40 group-hover:text-primary'}`} />
                                    <span className="text-sm tracking-tight">{item.label}</span>
                                </div>
                                {isActive && <ChevronRight className="w-4 h-4 opacity-40" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-8">
                    <div className="p-6 rounded-[28px] bg-background border border-card-border shadow-sm flex items-center gap-4 relative overflow-hidden group cursor-pointer hover:border-primary/20 transition-all">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                        <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center font-black text-secondary shrink-0 overflow-hidden relative border border-card-border">
                            TS
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-black text-foreground truncate">Test Senior</p>
                            <p className="text-[10px] uppercase tracking-widest font-bold opacity-30 mt-0.5">Primary ID: #0821</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen">
                <header className="h-24 bg-card/50 backdrop-blur-xl border-b border-card-border flex items-center justify-between px-10 sticky top-0 z-40">
                    <div className="flex items-center gap-8">
                        <div className="hidden md:flex items-center gap-3 px-5 py-3 rounded-2xl bg-background border border-card-border text-foreground/30 focus-within:border-primary/20 transition-all group">
                            <Search className="w-4 h-4 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Global search..."
                                className="bg-transparent border-none outline-none text-sm font-bold placeholder:text-foreground/20 text-foreground w-48"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <button className="p-4 rounded-2xl hover:bg-background border border-transparent hover:border-card-border relative transition-all group">
                                <Bell className="w-5 h-5 text-foreground/60 transition-transform group-hover:rotate-12" />
                                <span className="absolute top-4 right-4 w-2 h-2 bg-red-500 rounded-full border-2 border-card"></span>
                            </button>
                        </div>
                        <div className="w-px h-8 bg-card-border mx-2" />
                        <Link href="/medications" className="bg-primary text-white px-8 py-3.5 rounded-[20px] text-sm font-black shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Fast Action
                        </Link>
                    </div>
                </header>

                <main className="flex-1 p-10 overflow-y-auto">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
                <VoiceAssistant />
            </div>

            {/* Global Background Glows */}
            <div className="fixed inset-0 pointer-events-none -z-10 bg-[#f8fafc] dark:bg-background">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
            </div>
        </div>
    );
}
