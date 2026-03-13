"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import SOSButton from '@/components/SOSButton';
import {
    LayoutDashboard,
    Pill,
    Users,
    LineChart,
    Bell,
    ChevronRight,
    ChevronLeft,
    ChevronDown,
    LogOut,
    Menu,
    X,
    Shield,
    Settings as SettingsIcon,
    Calendar,
    MessageCircle,
    FlaskConical,
    Brain,
    AlertTriangle,
    Package,
    Activity,
    Radar,
    Eye,
    ScanLine,
    Download
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
interface NavItem {
    label: string;
    href: string;
    icon: any;
    badge?: string;
}

interface NavGroup {
    label: string;
    icon: any;
    items: NavItem[];
}

// ─── Navigation Config ──────────────────────────────────────────────────────
const seniorNav: NavGroup[] = [
    {
        label: "Main",
        icon: LayoutDashboard,
        items: [
            { label: "Home", href: "/dashboard", icon: LayoutDashboard },
            { label: "Today's Meds", href: "/schedule", icon: Calendar },
            { label: "Guardian AI Chat", href: "/chat", icon: MessageCircle },
        ],
    },
    {
        label: "My Profile",
        icon: Shield,
        items: [
            { label: "My Medications", href: "/medications", icon: Pill },
            { label: "Settings", href: "/settings", icon: SettingsIcon },
        ],
    },
];

const caregiverNav: NavGroup[] = [
    {
        label: "FLEET TELEMETRY",
        icon: LayoutDashboard,
        items: [
            { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { label: "My Seniors", href: "/caregiver", icon: Users },
            { label: "War Room", href: "/war-room", icon: Activity },
        ],
    },
    {
        label: "CLINICAL INTELLIGENCE",
        icon: Brain,
        items: [
            { label: "PK Simulations", href: "/pk-simulations", icon: LineChart },
            { label: "Anomaly Detection", href: "/anomalies", icon: AlertTriangle },
            { label: "Drug Interactions", href: "/interactions", icon: FlaskConical },
        ],
    },
    {
        label: "SYSTEM ANALYTICS",
        icon: SettingsIcon,
        items: [
            { label: "Explainability (SHAP)", href: "/explainability", icon: Eye },
            { label: "Export Data", href: "/export", icon: Download },
            { label: "Settings", href: "/settings", icon: SettingsIcon },
        ],
    },
];

// ─── Layout Component ───────────────────────────────────────────────────────
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, refresh: refreshUser } = useUser();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        "Main": true,
        "My Profile": true,
        "FLEET TELEMETRY": true,
        "CLINICAL INTELLIGENCE": true,
        "SYSTEM ANALYTICS": true,
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogout = async () => {
        try {
            await apiFetch('/auth/logout', { method: 'POST' });
        } catch { }
        router.push('/login');
    };

    if (!mounted) {
        return <div className="min-h-screen bg-slate-950" />;
    }

    const navGroups = user?.role === 'caregiver' ? caregiverNav : seniorNav;

    const toggleGroup = (label: string) => {
        setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
    };

    // Check if any item in a group is active
    const isGroupActive = (group: NavGroup) =>
        group.items.some(item => pathname === item.href);

    // ─── Sidebar Content ────────────────────────────────────────────────────
    const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
        <div className="flex flex-col h-full bg-slate-950/80 backdrop-blur-xl border-r border-white/5 overflow-hidden">
            {/* Logo */}
            <div className={`p-6 flex items-center ${isCollapsed && !mobile ? 'justify-center' : 'gap-4'} shrink-0 border-b border-white/5`}>
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)] text-lg shrink-0">
                    M
                </div>
                {(!isCollapsed || mobile) && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="whitespace-nowrap"
                    >
                        <span className="text-lg font-black tracking-tighter text-white block leading-tight">MEDGUARDIAN</span>
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-500/80">Command Center</span>
                    </motion.div>
                )}
            </div>

            {/* Navigation Groups */}
            <nav className="flex-1 overflow-y-auto px-3 py-6 custom-scrollbar space-y-8">
                {navGroups.map((group) => {
                    const groupActive = isGroupActive(group);

                    return (
                        <div key={group.label} className="space-y-1">
                            {/* Group Header */}
                            {(!isCollapsed || mobile) && (
                                <div className="px-3 mb-2">
                                    <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold">
                                        {group.label}
                                    </span>
                                </div>
                            )}

                            {isCollapsed && !mobile && (
                                <div className="flex justify-center mb-4">
                                    <div className={`w-1 h-1 rounded-full ${groupActive ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-800'}`} />
                                </div>
                            )}

                            {/* Group Items */}
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => mobile && setIsMobileOpen(false)}
                                            className={`flex items-center ${isCollapsed && !mobile ? 'justify-center' : 'justify-between'} px-3 py-2 rounded-lg font-medium transition-all group relative ${isActive
                                                ? 'text-blue-400 bg-blue-500/5'
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                                }`}
                                            title={isCollapsed && !mobile ? item.label : undefined}
                                        >
                                            {/* Active Indicator Border */}
                                            {isActive && (
                                                <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                            )}

                                            <div className="flex items-center gap-3">
                                                <item.icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                                {(!isCollapsed || mobile) && (
                                                    <span className="text-[13px] tracking-tight whitespace-nowrap">
                                                        {item.label}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Bottom Section */}
            <div className="p-4 shrink-0 border-t border-white/5 space-y-4 bg-slate-950/40">
                {/* Sign Out Link */}
                {(!isCollapsed || mobile) && (
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-red-400 transition-colors group"
                    >
                        <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                        <span>Sign Out System</span>
                    </button>
                )}

                {/* Profile Card */}
                <Link
                    href="/settings"
                    onClick={() => mobile && setIsMobileOpen(false)}
                    className={`flex items-center bg-white/5 border border-white/10 rounded-xl transition-all hover:bg-white/10 hover:border-white/20 group relative overflow-hidden ${isCollapsed && !mobile ? 'p-2 justify-center' : 'p-3 gap-3'}`}
                >
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center font-bold text-blue-400 shrink-0 text-xs">
                        {user?.username?.slice(0, 2).toUpperCase() || 'U'}
                    </div>
                    {(!isCollapsed || mobile) && (
                        <div className="overflow-hidden flex-1">
                            <p className="text-[13px] font-bold text-slate-200 truncate">{user?.full_name || user?.username || 'User'}</p>
                            <p className="text-[9px] uppercase tracking-widest font-black text-slate-500 mt-0.5">{user?.role || 'operator'}</p>
                        </div>
                    )}
                    {isCollapsed && !mobile && (
                        <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors" />
                    )}
                </Link>
            </div>
            {/* Desktop Collapse Toggle */}
            {!mobile && (
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center shadow-lg hover:bg-blue-600 hover:text-white transition-all z-[60]"
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            )}
        </div>
    );

    return (
        <div className="h-screen bg-background flex overflow-hidden">

            {/* Desktop Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isCollapsed ? 80 : 280 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-gray-50 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 hidden lg:flex flex-col z-50 sticky top-0 h-screen overflow-visible"
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
            <div className="flex-1 flex flex-col min-w-0 relative bg-gray-100 dark:bg-slate-950 overflow-hidden">
                {/* Floating Mobile Menu Trigger */}
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="fixed top-8 left-8 p-4 rounded-2xl bg-card/80 backdrop-blur-xl border border-card-border shadow-2xl lg:hidden z-[60] hover:bg-card transition-all active:scale-95 group"
                >
                    <Menu className="w-6 h-6 text-primary group-hover:rotate-12 transition-transform" />
                </button>

                <main className="flex-1 py-8 lg:py-12 overflow-y-auto">
                    <div className="max-w-7xl mx-auto px-6 lg:px-12 pb-4 lg:pb-0">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={pathname}
                                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.02, y: -10 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
                <SOSButton />
            </div>

            {/* Global Background Glows */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
            </div>
        </div>
    );
}
