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
        label: "Overview",
        icon: LayoutDashboard,
        items: [
            { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { label: "My Seniors", href: "/caregiver", icon: Users },
            { label: "Command Room", href: "/war-room", icon: Activity },
        ],
    },
    {
        label: "Clinical",
        icon: Brain,
        items: [
            { label: "PK Simulations", href: "/pk-simulations", icon: LineChart },
            { label: "Anomaly Detection", href: "/anomalies", icon: AlertTriangle },
            { label: "Drug Interactions", href: "/interactions", icon: FlaskConical },
        ],
    },
    {
        label: "Analytics",
        icon: SettingsIcon,
        items: [
            { label: "AI Explainability", href: "/explainability", icon: Eye },
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
        "Fleet": true,
        "Clinical": true,
        "Analytics": true,
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
        <div className="flex flex-col h-full overflow-hidden">

            {/* Logo */}
            <div className={`flex items-center gap-3 p-5 border-b border-[#1a2030] shrink-0 ${isCollapsed && !mobile ? 'justify-center px-3' : ''}`}>
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    M
                </div>
                {(!isCollapsed || mobile) && (
                    <div>
                        <p className="text-[13px] font-bold text-white leading-tight">MedGuardian</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Command Center</p>
                    </div>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-4">
                {navGroups.map((group, groupIdx) => (
                    <div key={group.label}>
                        {groupIdx > 0 && (
                            <div className="h-px bg-[#0f1624] mx-2 mt-4 mb-2" />
                        )}
                        {(!isCollapsed || mobile) && (
                            <p className="text-[10px] font-semibold text-[#1e293b] uppercase tracking-[0.08em] px-2 py-1 mb-1">
                                {group.label}
                            </p>
                        )}
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => mobile && setIsMobileOpen(false)}
                                        title={isCollapsed && !mobile ? item.label : undefined}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group relative ${isCollapsed && !mobile ? 'justify-center' : ''
                                            } ${isActive
                                                ? 'bg-[#111d35] text-[#e2e8f0]'
                                                : 'text-[#475569] hover:text-[#94a3b8] hover:bg-[#111827]'
                                            }`}
                                    >
                                        <item.icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-blue-500' : 'text-[#334155] group-hover:text-slate-300'}`} />
                                        {(!isCollapsed || mobile) && (
                                            <span className={`truncate text-[13px] ${isActive ? 'font-medium' : 'font-normal'}`}>
                                                {item.label}
                                            </span>
                                        )}
                                        {isActive && !isCollapsed && (
                                            <div className="ml-auto w-[3px] h-4 bg-blue-600 rounded-full flex-shrink-0" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Bottom */}
            <div className="p-3 border-t border-[#0f1624] shrink-0 space-y-2">
                {/* Sign out */}
                {(!isCollapsed || mobile) && (
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-[9px] w-full px-[10px] py-[7px] rounded-[7px] text-[12px] text-[#334155] hover:text-red-500 hover:bg-[#1a0a0a] transition-all group mb-2"
                    >
                        <LogOut className="w-[14px] h-[14px] text-[#1e293b] group-hover:text-red-500 transition-colors" />
                        <span>Sign Out</span>
                    </button>
                )}

                {/* Profile */}
                <Link
                    href="/settings"
                    onClick={() => mobile && setIsMobileOpen(false)}
                    className={`flex items-center gap-3 p-2.5 rounded-[9px] bg-[#0d1422] hover:bg-[#111827] border border-[#1a2336] hover:border-[#1e2d44] transition-all group ${isCollapsed && !mobile ? 'justify-center' : ''
                        }`}
                >
                    <div className="w-8 h-8 rounded-[8px] bg-[#172038] border border-[#1e2d44] flex items-center justify-center text-[12px] font-semibold tracking-[0.5px] text-blue-400 shrink-0">
                        {user?.username?.slice(0, 2).toUpperCase() || 'U'}
                    </div>
                    {(!isCollapsed || mobile) && (
                        <div className="overflow-hidden flex-1 min-w-0 flex items-center">
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-[#cbd5e1] truncate leading-tight tracking-[-0.1px]">
                                    {user?.full_name || user?.username || 'User'}
                                </p>
                                <p className="text-[11px] text-[#334155] capitalize mt-0.5">
                                    {user?.role || 'user'}
                                </p>
                            </div>
                            <div className="ml-auto flex flex-col gap-[3px] opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="w-[3px] h-[3px] rounded-full bg-[#1e293b]"></span>
                                <span className="w-[3px] h-[3px] rounded-full bg-[#1e293b]"></span>
                                <span className="w-[3px] h-[3px] rounded-full bg-[#1e293b]"></span>
                            </div>
                        </div>
                    )}
                </Link>
            </div>

            {/* Collapse toggle */}
            {!mobile && (
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center hover:bg-blue-600 transition-all z-[60]"
                >
                    {isCollapsed ? <ChevronRight className="w-3 h-3 text-slate-400" /> : <ChevronLeft className="w-3 h-3 text-slate-400" />}
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
                className="bg-[#0a0f1a] border-r border-[#1e2535] hidden lg:flex flex-col z-50 sticky top-0 h-screen overflow-hidden"
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
            <div className="flex-1 flex flex-col min-w-0 relative bg-background text-foreground overflow-hidden">
                {/* Floating Mobile Menu Trigger */}
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="fixed top-8 left-8 p-4 rounded-2xl bg-card/80 backdrop-blur-xl border border-card-border shadow-2xl lg:hidden z-[60] hover:bg-card transition-all active:scale-95 group"
                >
                    <Menu className="w-6 h-6 text-primary group-hover:rotate-12 transition-transform" />
                </button>

                <main className={`flex-1 overflow-y-auto overflow-x-hidden outline-none ${pathname === '/chat' ? '' : 'py-8 lg:py-10'}`}>
                    <div className={`${pathname === '/chat' ? 'h-full w-full' : 'max-w-7xl mx-auto px-6 lg:px-12'}`}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={pathname}
                                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.02, y: -10 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className={pathname === '/chat' ? 'h-full' : ''}
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
