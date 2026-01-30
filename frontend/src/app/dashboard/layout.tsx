"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import VoiceAssistant from '@/components/VoiceAssistant';
import { useUser } from '@/hooks/useUser';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import ProfileModal from '@/components/ProfileModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Pill,
    Users,
    LineChart,
    Bell,
    Plus,
    ChevronRight,
    ChevronLeft,
    Search,
    LogOut,
    ExternalLink,
    Menu,
    X
} from 'lucide-react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, refresh: refreshUser } = useUser();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const handleLogout = async () => {
        try {
            const res = await apiFetch('/auth/logout', { method: 'POST' });
            if (res.success) {
                router.push('/login');
            }
        } catch (err) {
            console.error('Logout failed:', err);
            router.push('/login');
        }
    };

    const navItems = [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Medications", href: "/medications", icon: Pill },
    ];

    if (user?.role === 'caregiver') {
        navItems.push(
            { label: "Managed Fleet", href: "/caregiver", icon: Users },
            { label: "Analytics", href: "/analytics", icon: LineChart }
        );
    }

    const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
        <div className="flex flex-col h-full relative">
            <div className={`p-10 pb-16 flex items-center ${isCollapsed && !mobile ? 'justify-center' : 'gap-6'} shrink-0`}>
                <div className="w-12 h-12 rounded-[18px] bg-primary flex items-center justify-center text-white font-black shadow-2xl shadow-primary/40 text-xl shrink-0">
                    M
                </div>
                {(!isCollapsed || mobile) && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="whitespace-nowrap"
                    >
                        <span className="text-2xl font-black tracking-tight text-foreground block">MedGuardian</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Executive Health</span>
                    </motion.div>
                )}
            </div>

            <nav className={`mt-6 flex-1 ${isCollapsed && !mobile ? 'px-4' : 'px-8'} space-y-3 overflow-y-auto custom-scrollbar pb-10`}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => mobile && setIsMobileOpen(false)}
                            className={`flex items-center ${isCollapsed && !mobile ? 'justify-center' : 'justify-between'} px-5 py-4 rounded-[20px] font-black transition-all group ${isActive
                                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                                : 'text-foreground/50 hover:bg-secondary/5 hover:text-foreground'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 shrink-0 ${isActive ? 'text-white' : 'text-primary/40 group-hover:text-primary'}`} />
                                {(!isCollapsed || mobile) && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-sm tracking-tight whitespace-nowrap"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </div>
                            {(!isCollapsed || mobile) && isActive && (
                                <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className={`p-10 relative shrink-0 bg-card/80 backdrop-blur-md ${isCollapsed && !mobile ? 'flex justify-center' : ''}`}>
                <div
                    onClick={() => setIsProfileOpen(true)}
                    className={`rounded-[28px] bg-background border border-card-border shadow-sm flex items-center relative overflow-hidden group cursor-pointer transition-all ${isProfileOpen ? 'border-primary/40 ring-4 ring-primary/10' : 'hover:border-primary/20'} ${isCollapsed && !mobile ? 'p-3' : 'p-6 gap-4'}`}
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                    <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center font-black text-secondary shrink-0 overflow-hidden relative border border-card-border">
                        {user?.username?.slice(0, 2).toUpperCase() || 'U'}
                    </div>
                    {(!isCollapsed || mobile) && (
                        <>
                            <div className="overflow-hidden flex-1">
                                <p className="text-sm font-black text-foreground truncate">{user?.full_name || user?.username || 'User'}</p>
                                <p className="text-[10px] uppercase tracking-widest font-bold opacity-30 mt-0.5">ID: #{user?.id || '---'}</p>
                            </div>
                            <ExternalLink className={`w-4 h-4 shrink-0 transition-all ${isProfileOpen ? 'rotate-90 text-primary opacity-100' : 'opacity-20 translate-x-1 group-hover:opacity-40 group-hover:translate-x-0'}`} />
                        </>
                    )}
                </div>
            </div>

            {/* Desktop Collapse Toggle */}
            {!mobile && (
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card border border-card-border flex items-center justify-center shadow-lg hover:bg-primary hover:text-white transition-all z-[60]"
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-background flex">
            {/* Profile Modal - rendered at root level to avoid z-index issues */}
            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                user={user}
                onRefreshUser={refreshUser}
                onLogout={handleLogout}
            />

            {/* Desktop Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isCollapsed ? 100 : 288 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-card border-r border-card-border hidden lg:flex flex-col shadow-xl z-50 sticky top-0 h-screen overflow-visible"
            >
                <SidebarContent />
            </motion.aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed top-0 left-0 bottom-0 w-[320px] bg-card border-r border-card-border z-[110] lg:hidden"
                        >
                            <button
                                onClick={() => setIsMobileOpen(false)}
                                className="absolute top-8 right-6 p-2 rounded-xl bg-secondary/5 hover:bg-secondary/10 transition-colors"
                            >
                                <X className="w-6 h-6 text-foreground/40" />
                            </button>
                            <SidebarContent mobile />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen min-w-0 relative">
                {/* Floating Mobile Menu Trigger */}
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="fixed top-8 left-8 p-4 rounded-2xl bg-card/80 backdrop-blur-xl border border-card-border shadow-2xl lg:hidden z-[60] hover:bg-card transition-all active:scale-95 group"
                >
                    <Menu className="w-6 h-6 text-primary group-hover:rotate-12 transition-transform" />
                </button>

                <main className="flex-1 py-12 lg:py-24 overflow-y-auto">
                    <div className="max-w-6xl mx-auto px-12 lg:px-24 pb-24 lg:pb-0">
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
