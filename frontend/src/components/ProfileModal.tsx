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
    UserCircle
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
        tabs.push({ id: 'preferences', label: 'Fleet', icon: Bell });
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 30 }}
                        className="w-full max-w-4xl bg-[#0a0c10] border border-white/10 rounded-[48px] shadow-3xl relative overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[700px]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Sidebar */}
                        <div className="w-full md:w-80 bg-white/5 p-8 flex flex-col border-r border-white/5">
                            <div className="flex items-center gap-4 mb-12">
                                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center font-black text-2xl text-primary border border-primary/20">
                                    {user?.username?.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight leading-tight">
                                        {user?.full_name || user?.username}
                                    </h2>
                                    <p className="text-xs font-bold opacity-30 uppercase tracking-widest mt-1">
                                        {user?.role} Account
                                    </p>
                                </div>
                            </div>

                            <nav className="space-y-2 flex-1">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm transition-all group ${activeTab === tab.id
                                            ? 'bg-primary text-white shadow-xl shadow-primary/20'
                                            : 'text-white/40 hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`} />
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </nav>

                            <button
                                onClick={onLogout}
                                className="mt-auto flex items-center gap-4 px-6 py-5 rounded-2xl font-black text-sm text-red-500 hover:bg-red-500/10 transition-all"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Sign Out Session</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-10 overflow-y-auto relative">
                            <button
                                onClick={onClose}
                                className="absolute top-8 right-8 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all opacity-40 hover:opacity-100"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>

                            <div className="max-w-xl mx-auto md:mx-0">
                                <header className="mb-10">
                                    <h3 className="text-4xl font-black text-white tracking-tighter capitalize italic">
                                        {tabs.find(t => t.id === activeTab)?.label || activeTab} Settings
                                    </h3>
                                    <p className="text-sm font-bold opacity-30 mt-2">
                                        Manage your {tabs.find(t => t.id === activeTab)?.label?.toLowerCase() || activeTab} information and platform preferences.
                                    </p>
                                </header>

                                {successMessage && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-8 p-4 bg-accent/20 border border-accent/20 rounded-2xl flex items-center gap-4 text-accent font-black text-sm"
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                        {successMessage}
                                    </motion.div>
                                )}

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-500 font-black text-sm"
                                    >
                                        <Shield className="w-5 h-5" />
                                        {error}
                                    </motion.div>
                                )}

                                {activeTab === 'general' && (
                                    <form onSubmit={handleProfileSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 ml-2">Full Name</label>
                                                <div className="relative group">
                                                    <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary transition-colors" />
                                                    <input
                                                        type="text"
                                                        value={profileData.full_name}
                                                        onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                                                        placeholder="Enter full name"
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 font-bold text-white outline-none focus:border-primary/40 focus:bg-primary/5 transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 ml-2">Username</label>
                                                <div className="relative group">
                                                    <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary transition-colors" />
                                                    <input
                                                        type="text"
                                                        value={profileData.username}
                                                        onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 font-bold text-white outline-none focus:border-primary/40 focus:bg-primary/5 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 ml-2">Email Address</label>
                                            <div className="relative group">
                                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary transition-colors" />
                                                <input
                                                    type="email"
                                                    value={profileData.email}
                                                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 font-bold text-white outline-none focus:border-primary/40 focus:bg-primary/5 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 ml-2">Safety Phone</label>
                                            <div className="relative group">
                                                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary transition-colors" />
                                                <input
                                                    type="tel"
                                                    value={profileData.phone}
                                                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 font-bold text-white outline-none focus:border-primary/40 focus:bg-primary/5 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 className="animate-spin w-6 h-6" /> : 'SAVE CHANGES'}
                                        </button>
                                    </form>
                                )}

                                {activeTab === 'security' && (
                                    <form onSubmit={handlePasswordSubmit} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 ml-2">Current Password</label>
                                            <div className="relative group">
                                                <input
                                                    type={showPasswords ? "text" : "password"}
                                                    value={passwordData.old_password}
                                                    onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-14 font-bold text-white outline-none focus:border-primary/40 focus:bg-primary/5 transition-all"
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords(!showPasswords)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/0 hover:bg-white/5 text-white/20 hover:text-white transition-all z-20"
                                                >
                                                    {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="w-full h-px bg-white/5 my-4" />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 ml-2">New Password</label>
                                                <div className="relative group">
                                                    <input
                                                        type={showPasswords ? "text" : "password"}
                                                        value={passwordData.new_password}
                                                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-14 font-bold text-white outline-none focus:border-primary/40 focus:bg-primary/5 transition-all"
                                                        placeholder="••••••••"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPasswords(!showPasswords)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/0 hover:bg-white/5 text-white/20 hover:text-white transition-all z-20"
                                                    >
                                                        {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 ml-2">Confirm New</label>
                                                <div className="relative group">
                                                    <input
                                                        type={showPasswords ? "text" : "password"}
                                                        value={passwordData.confirm_password}
                                                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-14 font-bold text-white outline-none focus:border-primary/40 focus:bg-primary/5 transition-all"
                                                        placeholder="••••••••"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPasswords(!showPasswords)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/0 hover:bg-white/5 text-white/20 hover:text-white transition-all z-20"
                                                    >
                                                        {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading || !passwordData.new_password}
                                            className="w-full py-5 bg-white text-black rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 className="animate-spin w-6 h-6 text-black" /> : 'UPDATE PASSWORD'}
                                        </button>
                                    </form>
                                )}

                                {activeTab === 'preferences' && (
                                    <div className="space-y-8">
                                        {user?.role === 'senior' ? (
                                            <div className="space-y-6">
                                                <div className="p-8 bg-white/5 rounded-[32px] border border-white/5 flex items-center justify-between group/toggle">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center group-hover/toggle:scale-110 transition-transform">
                                                            <Camera className="w-7 h-7 text-accent" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xl font-black text-white italic">Trust Verification</h4>
                                                            <p className="text-sm font-bold opacity-30">Auto-accept camera requests from linked caregivers.</p>
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
                                                        className={`w-14 h-8 rounded-full transition-all relative ${profileData.camera_auto_accept ? 'bg-accent shadow-lg shadow-accent/20' : 'bg-white/10'}`}
                                                    >
                                                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-500 shadow-md ${profileData.camera_auto_accept ? 'left-[calc(100%-1.75rem)]' : 'left-1'}`} />
                                                    </button>
                                                </div>

                                                <div className="p-8 bg-white/5 rounded-[32px] border border-white/5">
                                                    <div className="flex items-center gap-6 mb-6">
                                                        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                                                            <Settings className="w-7 h-7 text-primary" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xl font-black text-white italic">Active Guard</h4>
                                                            <p className="text-sm font-bold opacity-30">Who is currently monitoring your health.</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                                        <span className="text-sm font-bold opacity-60">Primary Caregiver</span>
                                                        <span className="px-3 py-1 bg-primary/20 text-primary rounded-lg text-xs font-black uppercase tracking-wider">Connected</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="p-8 bg-white/5 rounded-[32px] border border-white/5">
                                                    <div className="flex items-center gap-6 mb-6">
                                                        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                                                            <Bell className="w-7 h-7 text-primary" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xl font-black text-white italic">Fleet Alerts</h4>
                                                            <p className="text-sm font-bold opacity-30">Global notification preferences for your fleet.</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        {['Critical Missed Doses', 'Late Intake Bans', 'Senior Distress Signals'].map((item) => (
                                                            <div key={item} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                                                <span className="text-sm font-bold opacity-60">{item}</span>
                                                                <CheckCircle2 className="w-5 h-5 text-accent" />
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
