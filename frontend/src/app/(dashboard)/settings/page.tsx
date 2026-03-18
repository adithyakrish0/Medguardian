"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/components/ThemeProvider';
import { motion } from 'framer-motion';
import {
    User,
    Bell,
    Shield,
    Moon,
    Sun,
    Volume2,
    VolumeX,
    ChevronRight,
    LogOut,
    Smartphone,
    Download,
    Trash2,
    CheckCircle2,
    Mail,
    Lock,
    Loader2,
    ChevronLeft,
    Eye,
    EyeOff,
    MessageCircle,
    Send,
    ExternalLink,
    Unlink,
    RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/NiceToast';

export default function SettingsPage() {
    const { user, refresh: refreshUser } = useUser();
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();
    const { showToast } = useToast();

    // Profile editing state
    const [editing, setEditing] = useState(false);
    const [profileName, setProfileName] = useState('');
    const [profileEmail, setProfileEmail] = useState('');
    const [profilePhone, setProfilePhone] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);

    // Password state
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);

    // Settings state
    const [notifications, setNotifications] = useState(true);
    const [voiceAlerts, setVoiceAlerts] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('voiceAlerts') !== 'false';
        }
        return true;
    });

    const handleVoiceToggle = () => {
        const newVal = !voiceAlerts;
        setVoiceAlerts(newVal);
        if (typeof window !== 'undefined') {
            localStorage.setItem('voiceAlerts', String(newVal));
        }
    };

    // Populate profile fields from user
    useEffect(() => {
        if (user) {
            setProfileName(user.full_name || user.username || '');
            setProfileEmail(user.email || '');
            setProfilePhone(user.phone || '');
        }
    }, [user]);

    // ── Profile Save ──────────────────────────────────────
    const handleProfileSave = async () => {
        setProfileSaving(true);
        try {
            const res = await apiFetch('/auth/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    full_name: profileName,
                    email: profileEmail,
                    phone: profilePhone,
                }),
            });
            if (res.success) {
                showToast('Profile updated', 'success');
                setEditing(false);
                if (refreshUser) refreshUser();
            } else {
                showToast(res.message || 'Failed to update profile', 'error');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to update profile', 'error');
        } finally {
            setProfileSaving(false);
        }
    };

    // ── Change Password ──────────────────────────────────
    const handlePasswordChange = async () => {
        setPasswordError('');
        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return;
        }
        setPasswordSaving(true);
        try {
            const res = await apiFetch('/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    old_password: currentPassword,
                    new_password: newPassword,
                }),
            });
            if (res.success) {
                showToast('Password updated successfully', 'success');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setShowPasswordForm(false);
            } else {
                setPasswordError(res.message || 'Failed to change password');
            }
        } catch (err: any) {
            setPasswordError(err.message || 'Failed to change password');
        } finally {
            setPasswordSaving(false);
        }
    };

    const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
        <button
            onClick={onChange}
            className={`w-14 h-8 rounded-full transition-all relative ${enabled ? 'bg-primary-600 shadow-lg shadow-primary-600/30' : 'bg-gray-200 dark:bg-slate-700'}`}
        >
            <div className={`absolute top-1 w-6 h-6 bg-white dark:bg-gray-800 rounded-full shadow-md transition-all ${enabled ? 'left-7' : 'left-1'}`} />
        </button>
    );

    return (
        <div className="max-w-3xl mx-auto space-y-10 pb-20 pt-16 lg:pt-0 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-blue-400 transition-all mb-4 group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </button>
                <h1 className="text-2xl font-bold text-gray-100 mb-2">Settings</h1>
                <p className="text-gray-400 font-medium font-medium">Manage your account & preferences</p>
            </div>

            {/* Profile Card */}
            <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />

                {!editing ? (
                    /* View Mode */
                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                        <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-3xl font-bold shadow-inner">
                            {user?.username?.slice(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div className="text-center md:text-left flex-1 space-y-1">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{user?.full_name || user?.username || 'User'}</h2>
                            <div className="flex items-center justify-center md:justify-start gap-2 text-gray-500 dark:text-gray-400">
                                <Mail className="w-4 h-4" />
                                <span>{user?.email || 'No email set'}</span>
                            </div>
                            <div className="flex items-center justify-center md:justify-start gap-2 text-gray-500 dark:text-gray-400">
                                <Smartphone className="w-4 h-4" />
                                <span>{user?.phone || 'No phone set'}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setEditing(true)}
                            className="px-6 py-2.5 rounded-xl border border-gray-600 font-bold text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                        >
                            Edit Profile
                        </button>
                    </div>
                ) : (
                    /* Edit Mode */
                    <div className="relative z-10 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Edit Profile</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Full Name</label>
                                <input
                                    value={profileName}
                                    onChange={(e) => setProfileName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-gray-100 font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={profileEmail}
                                    onChange={(e) => setProfileEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-gray-100 font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={profilePhone}
                                    onChange={(e) => setProfilePhone(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-gray-100 font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setEditing(false)}
                                className="px-5 py-2.5 rounded-xl border border-gray-600 font-bold text-sm text-gray-400 hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleProfileSave}
                                disabled={profileSaving}
                                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60"
                            >
                                {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                {profileSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* Application Settings */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-200 mb-4 px-2">Application</h3>

                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden divide-y divide-gray-700">
                    {/* Dark Mode */}
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 flex items-center justify-center">
                                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-gray-100">Appearance</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark themes</p>
                            </div>
                        </div>
                        <Toggle enabled={theme === 'dark'} onChange={toggleTheme} />
                    </div>

                    {/* Notifications */}
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                <Bell className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-gray-100">Push Notifications</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Receive medication reminders</p>
                            </div>
                        </div>
                        <Toggle enabled={notifications} onChange={() => setNotifications(!notifications)} />
                    </div>

                    {/* Voice Alerts */}
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-500/10 text-pink-600 flex items-center justify-center">
                                {voiceAlerts ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-gray-100">Voice Assistant</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Spoken alerts for critical reminders</p>
                            </div>
                        </div>
                        <Toggle enabled={voiceAlerts} onChange={handleVoiceToggle} />
                    </div>
                </div>
            </section>

            {/* Telegram Notifications */}
            <section className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-lg font-semibold text-gray-200">Telegram Bot</h3>
                    {user?.telegram_chat_id && (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Connected
                        </span>
                    )}
                </div>

                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none group-hover:bg-sky-500/10 transition-colors" />
                    
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20 shadow-lg">
                            <Send className="w-7 h-7" />
                        </div>
                        
                        <div className="flex-1 space-y-1">
                            <p className="font-bold text-gray-100 text-lg">Real-time Telegram Alerts</p>
                            <p className="text-sm text-gray-400 leading-relaxed max-w-md">
                                Receive medication reminders, critical missed dose alerts, and emergency SOS notifications directly on your smartphone.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                            {!user?.telegram_chat_id ? (
                                <button
                                    onClick={async () => {
                                        try {
                                            const res = await apiFetch('/telegram/link');
                                            if (res.success && res.link_url) {
                                                window.open(res.link_url, '_blank');
                                                showToast('Opening Telegram...', 'info');
                                            }
                                        } catch (err: any) {
                                            showToast('Failed to get link', 'error');
                                        }
                                    }}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm transition-all shadow-lg shadow-sky-600/20 active:scale-95"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Connect Bot
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={async () => {
                                            try {
                                                const res = await apiFetch('/telegram/test', { method: 'POST' });
                                                if (res.success) showToast('Test ping sent!', 'success');
                                                else showToast(res.error || 'Test failed', 'error');
                                            } catch {
                                                showToast('Test failed', 'error');
                                            }
                                        }}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold text-sm transition-colors border border-gray-600"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Test Ping
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!confirm('Are you sure you want to unlink your Telegram? You will stop receiving alerts.')) return;
                                            try {
                                                const res = await apiFetch('/telegram/unlink', { method: 'POST' });
                                                if (res.success) {
                                                    showToast('Telegram unlinked', 'success');
                                                    if (refreshUser) refreshUser();
                                                }
                                            } catch {
                                                showToast('Unlink failed', 'error');
                                            }
                                        }}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm transition-colors border border-red-500/20"
                                    >
                                        <Unlink className="w-4 h-4" />
                                        Unlink
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {user?.telegram_chat_id && (
                        <div className="mt-6 pt-6 border-t border-gray-700/50 flex flex-wrap gap-4">
                            <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                Reminders Enabled
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                SOS Relay Enabled
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                Sync Status: Normal
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Security & Data */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-200 mb-4 px-2">Security & Data</h3>

                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden divide-y divide-gray-700">
                    <Link href="/governance" className="p-6 flex items-center justify-between hover:bg-gray-700/30 transition-colors group cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-100">Audit Logs</p>
                                <p className="text-sm text-gray-400">Review access history and security events</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-all group-hover:translate-x-1" />
                    </Link>

                    <button className="w-full p-6 flex items-center justify-between hover:bg-gray-700/50 transition-colors group text-left">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                                <Download className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-gray-100">Export Health Data</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Download your adherence report (CSV)</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </button>

                    {/* Change Password */}
                    <div>
                        <button
                            onClick={() => setShowPasswordForm(!showPasswordForm)}
                            className="w-full p-6 flex items-center justify-between hover:bg-gray-700/30 transition-colors group text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center border border-green-500/20">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-100">Change Password</p>
                                    <p className="text-sm text-gray-400">Update your login credentials</p>
                                </div>
                            </div>
                            <ChevronRight className={`w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-all ${showPasswordForm ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                        </button>

                        {/* Password Form (inline) */}
                        {showPasswordForm && (
                            <div className="px-6 pb-6 space-y-3">
                                {passwordError && (
                                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">
                                        {passwordError}
                                    </div>
                                )}
                                <div className="relative">
                                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showCurrentPw ? 'text' : 'password'}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-gray-100 font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all pr-12"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPw(!showCurrentPw)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                                        >
                                            {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showNewPw ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-gray-100 font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all pr-12"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPw(!showNewPw)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                                        >
                                            {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-gray-100 font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <button
                                    onClick={handlePasswordChange}
                                    disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                                    className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                                >
                                    {passwordSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {passwordSaving ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Danger Zone */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-red-400 mb-4 px-2">Danger Zone</h3>

                <div className="bg-red-900/10 rounded-xl border border-red-900/20 overflow-hidden divide-y divide-red-900/20">
                    <button className="w-full p-6 flex items-center justify-between hover:bg-red-900/20 transition-colors group text-left">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-red-900 dark:text-red-100">Delete Account</p>
                                <p className="text-sm text-red-700 dark:text-red-300/70">Permanently remove all data</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-red-300 group-hover:text-red-500 transition-colors" />
                    </button>

                    <button
                        onClick={async () => {
                            try {
                                await apiFetch('/auth/logout', { method: 'POST' });
                            } catch { }
                            router.push('/login');
                        }}
                        className="w-full p-6 flex items-center justify-between hover:bg-red-900/20 transition-colors group text-left"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center">
                                <LogOut className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-red-900 dark:text-red-100">Sign Out</p>
                                <p className="text-sm text-red-700 dark:text-red-300/70">Log out of your session</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-red-300 group-hover:text-red-500 transition-colors" />
                    </button>
                </div>
            </section>
        </div>
    );
}
