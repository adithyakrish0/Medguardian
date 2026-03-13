"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User as UserIcon,
    X,
    Shield,
    CheckCircle2,
    Loader2,
    Key,
    Settings,
    LogOut,
    Mail,
    Phone,
    Eye,
    EyeOff,
    Camera,
    Bell,
    UserCircle,
    Zap
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { User } from '@/hooks/useUser';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onRefreshUser: () => Promise<void>;
    onLogout: () => void;
}

type TabType = 'general' | 'security' | 'preferences';

export default function ProfileModal({ isOpen, onClose, user, onRefreshUser, onLogout }: ProfileModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Profile State
    const [profileData, setProfileData] = useState({
        full_name: user?.full_name || '',
        username: user?.username || '',
        email: user?.email || '',
        phone: user?.phone || '',
        camera_auto_accept: user?.camera_auto_accept || false
    });

    // Password State
    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [showPasswords, setShowPasswords] = useState(false);

    useEffect(() => {
        if (user) {
            setProfileData({
                full_name: user.full_name || '',
                username: user.username || '',
                email: user.email || '',
                phone: user.phone || '',
                camera_auto_accept: user.camera_auto_accept || false
            });
        }
    }, [user, isOpen]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            await apiFetch('/auth/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });
            await onRefreshUser();
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.new_password !== passwordData.confirm_password) {
            setError("Passwords don't match");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            await apiFetch('/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    old_password: passwordData.old_password,
                    new_password: passwordData.new_password
                })
            });
            setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
            setSuccessMessage('Password changed successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const tabs: { id: TabType; label: string; icon: any }[] = [
        { id: 'general', label: 'General', icon: UserIcon },
        { id: 'security', label: 'Security', icon: Key },
    ];

    if (user?.role === 'senior') {
        tabs.push({ id: 'preferences', label: 'Safety', icon: Shield });
    } else {
        tabs.push({ id: 'preferences', label: 'Alerts', icon: Bell });
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0"
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 30 }}
                        className="w-full max-w-4xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-2xl relative flex flex-col md:flex-row max-h-[90vh] overflow-hidden my-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Sidebar */}
                        <div className="w-full md:w-80 bg-gray-50 dark:bg-zinc-900 p-8 flex flex-col border-r border-gray-200 dark:border-gray-700 shrink-0">
                            <div className="flex items-center gap-4 mb-12">
                                <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-2xl text-primary-600 shadow-sm">
                                    {user?.username?.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
                                        {user?.full_name || user?.username}
                                    </h2>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">
                                        {user?.role} Account
                                    </p>
                                </div>
                            </div>

                            <nav className="space-y-2 flex-1">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl font-medium text-sm transition-all group ${activeTab === tab.id
                                            ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-md shadow-gray-200/50 ring-1 ring-gray-100'
                                            : 'text-gray-500 hover:bg-white dark:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-100'
                                            }`}
                                    >
                                        <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`} />
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </nav>

                            <button
                                onClick={onLogout}
                                className="mt-auto flex items-center gap-4 px-6 py-5 rounded-xl font-bold text-sm text-red-600 hover:bg-red-50 dark:bg-red-900/20 transition-all"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Sign Out</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-10 overflow-y-auto bg-white dark:bg-gray-800 relative">
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 dark:text-gray-400 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="max-w-xl mx-auto md:mx-0">
                                <header className="mb-10">
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                                        {tabs.find(t => t.id === activeTab)?.label || activeTab} Settings
                                    </h3>
                                    <p className="text-sm font-medium text-gray-500 mt-2">
                                        Manage your {tabs.find(t => t.id === activeTab)?.label?.toLowerCase() || activeTab} information and platform preferences.
                                    </p>
                                </header>

                                {successMessage && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-4 text-green-700 dark:text-green-400 font-bold text-sm"
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                        {successMessage}
                                    </motion.div>
                                )}

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-4 text-red-700 dark:text-red-400 font-bold text-sm"
                                    >
                                        <Shield className="w-5 h-5" />
                                        {error}
                                    </motion.div>
                                )}

                                {activeTab === 'general' && (
                                    <form onSubmit={handleProfileSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
                                                <div className="relative group">
                                                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-600 transition-colors" />
                                                    <input
                                                        type="text"
                                                        value={profileData.full_name}
                                                        onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                                                        placeholder="Enter full name"
                                                        className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-12 pr-4 font-medium text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Username</label>
                                                <div className="relative group">
                                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-600 transition-colors" />
                                                    <input
                                                        type="text"
                                                        value={profileData.username}
                                                        onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                                                        className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-12 pr-4 font-medium text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-600 transition-colors" />
                                                <input
                                                    type="email"
                                                    value={profileData.email}
                                                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-12 pr-4 font-medium text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Safety Phone</label>
                                            <div className="relative group">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-600 transition-colors" />
                                                <input
                                                    type="tel"
                                                    value={profileData.phone}
                                                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-12 pr-4 font-medium text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-4 bg-primary-600 text-white rounded-xl font-bold text-base shadow-lg hover:bg-primary-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Save Changes'}
                                        </button>
                                    </form>
                                )}

                                {activeTab === 'security' && (
                                    <form onSubmit={handlePasswordSubmit} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Current Password</label>
                                            <div className="relative group">
                                                <input
                                                    type={showPasswords ? "text" : "password"}
                                                    value={passwordData.old_password}
                                                    onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-6 pr-14 font-medium text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords(!showPasswords)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 dark:text-gray-400 transition-all z-20"
                                                >
                                                    {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="w-full h-px bg-gray-100 dark:bg-gray-800 my-4" />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">New Password</label>
                                                <div className="relative group">
                                                    <input
                                                        type={showPasswords ? "text" : "password"}
                                                        value={passwordData.new_password}
                                                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                                        className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-6 pr-14 font-medium text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                                                        placeholder="••••••••"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPasswords(!showPasswords)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 dark:text-gray-400 transition-all z-20"
                                                    >
                                                        {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Confirm New</label>
                                                <div className="relative group">
                                                    <input
                                                        type={showPasswords ? "text" : "password"}
                                                        value={passwordData.confirm_password}
                                                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                                        className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-6 pr-14 font-medium text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                                                        placeholder="••••••••"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPasswords(!showPasswords)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 dark:text-gray-400 transition-all z-20"
                                                    >
                                                        {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading || !passwordData.new_password}
                                            className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-base shadow-lg hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? <Loader2 className="animate-spin w-5 h-5 text-white" /> : 'Update Password'}
                                        </button>
                                    </form>
                                )}

                                {activeTab === 'preferences' && (
                                    <div className="space-y-8">
                                        {user?.role === 'senior' ? (
                                            <div className="space-y-6">
                                                <div className="p-8 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between group/toggle">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center group-hover/toggle:scale-110 transition-transform">
                                                            <Camera className="w-7 h-7 text-primary-600" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">Trust Verification</h4>
                                                            <p className="text-sm font-medium text-gray-500">Auto-accept camera requests from linked caregivers.</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const newVal = !profileData.camera_auto_accept;
                                                            setProfileData({ ...profileData, camera_auto_accept: newVal });
                                                            apiFetch('/auth/profile', {
                                                                method: 'PUT',
                                                                body: JSON.stringify({ camera_auto_accept: newVal })
                                                            }).then(() => onRefreshUser());
                                                        }}
                                                        className={`w-14 h-8 rounded-full transition-all relative ${profileData.camera_auto_accept ? 'bg-primary-600 shadow-md shadow-primary-600/20' : 'bg-gray-200 dark:bg-gray-700'}`}
                                                    >
                                                        <div className={`absolute top-1 w-6 h-6 bg-white dark:bg-gray-800 rounded-full transition-all duration-500 shadow-md ${profileData.camera_auto_accept ? 'left-[calc(100%-1.75rem)]' : 'left-1'}`} />
                                                    </button>
                                                </div>

                                                <div className="p-8 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-gray-700">
                                                    <div className="flex items-center gap-6 mb-6">
                                                        <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
                                                            <Settings className="w-7 h-7 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">Active Guard</h4>
                                                            <p className="text-sm font-medium text-gray-500">Who is currently monitoring your health.</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                                        <span className="text-sm font-bold text-gray-500">Primary Caregiver</span>
                                                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-bold uppercase tracking-wider">Connected</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {/* Accessibility Controls */}
                                                <div className="p-8 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-gray-700">
                                                    <div className="flex items-center gap-6 mb-8">
                                                        <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center">
                                                            <Eye className="w-7 h-7 text-indigo-600" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">Visual Accessibility</h4>
                                                            <p className="text-sm font-medium text-gray-500">Tailor the platform to your visual needs.</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                                            <div>
                                                                <p className="text-gray-900 dark:text-gray-100 font-bold">High Contrast Mode</p>
                                                                <p className="text-xs text-gray-500">Increases visibility of borders and text</p>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    const html = document.documentElement;
                                                                    html.classList.toggle('high-contrast');
                                                                }}
                                                                className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded-full relative hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                                            >
                                                                <div className="absolute top-1 left-1 w-4 h-4 bg-white dark:bg-gray-800 rounded-full transition-all shadow-sm" />
                                                            </button>
                                                        </div>

                                                        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                                            <div>
                                                                <p className="text-gray-900 dark:text-gray-100 font-bold">Large Text</p>
                                                                <p className="text-xs text-gray-500">Increase base font size for better legibility</p>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    const html = document.documentElement;
                                                                    const isLarge = html.style.fontSize === '115%';
                                                                    html.style.fontSize = isLarge ? '100%' : '115%';
                                                                }}
                                                                className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded-full relative hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                                            >
                                                                <div className="absolute top-1 left-1 w-4 h-4 bg-white dark:bg-gray-800 rounded-full transition-all shadow-sm" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-8 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-gray-700">
                                                    <div className="flex items-center gap-6 mb-6">
                                                        <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center">
                                                            <Bell className="w-7 h-7 text-orange-600" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">Patient Alerts</h4>
                                                            <p className="text-sm font-medium text-gray-500">Notification preferences for your patients.</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        {['Critical Missed Doses', 'Late Intake Bans', 'Senior Distress Signals'].map((item) => (
                                                            <div key={item} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                                                <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{item}</span>
                                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
